import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { mockQuery } from './__mocks__/db';
import { stopsPassedAt, distanceM, getTripProgress } from '../services/tripProgress';
import { generateTripsFor } from '../services/dailyTrips';

jest.mock('../database/db');
jest.mock('../instrument', () => ({}));

const SECRET = process.env.JWT_SECRET!;
beforeEach(() => mockQuery.mockReset());

// Three stops ~1 km apart going north, 75 m radius.
const STOPS = [
  { latitude: 12.300, longitude: 76.650, radius: 75 },
  { latitude: 12.309, longitude: 76.650, radius: 75 },
  { latitude: 12.318, longitude: 76.650, radius: 75 },
];

describe('which stops a position passes', () => {
  it('a fix inside the next stop’s circle passes it (measured)', () => {
    expect(stopsPassedAt(STOPS, -1, 12.3002, 76.650)).toEqual([{ index: 0, inferred: false }]);
  });

  it('a fix at a later stop passes the skipped ones as inferred', () => {
    expect(stopsPassedAt(STOPS, -1, 12.309, 76.6501)).toEqual([
      { index: 0, inferred: true },
      { index: 1, inferred: false },
    ]);
  });

  it('clearly beyond the next stop, on the way to the one after → inferred', () => {
    // last passed = stop 0; bus is 300 m past stop 1, heading to stop 2
    expect(stopsPassedAt(STOPS, 0, 12.3117, 76.650)).toEqual([{ index: 1, inferred: true }]);
  });

  it('between stops, before the next one → nothing yet', () => {
    expect(stopsPassedAt(STOPS, 0, 12.305, 76.650)).toEqual([]);
  });

  it('progress never goes backwards', () => {
    expect(stopsPassedAt(STOPS, 1, 12.3001, 76.650)).toEqual([]);
  });

  it('distance helper is sane (~1 km per 0.009°)', () => {
    expect(Math.round(distanceM(12.3, 76.65, 12.309, 76.65) / 10) * 10).toBe(1000);
  });
});

describe('ETAs come from the schedule plus the current delay', () => {
  it('a bus 7 min late at stop 1 is expected 7 min late at the rest', async () => {
    const base = Date.now() - 20 * 60_000; // trip scheduled to start 20 min ago
    const at = (min: number) => new Date(base + min * 60_000);
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 1, bus_id: 5, status: 'En Route', route_id: 2, last_updated: new Date() }] });
    mockQuery.mockResolvedValueOnce({ rows: [
      { stop_id: 10, stop_name: 'A', stop_sequence: 1, latitude: 0, longitude: 0, radius: 75, scheduled_at: at(0),  arrived_at: at(2),  inferred: false },
      { stop_id: 11, stop_name: 'B', stop_sequence: 2, latitude: 0, longitude: 0, radius: 75, scheduled_at: at(10), arrived_at: at(17), inferred: false },
      { stop_id: 12, stop_name: 'C', stop_sequence: 3, latitude: 0, longitude: 0, radius: 75, scheduled_at: at(25), arrived_at: null, inferred: null },
      { stop_id: 13, stop_name: 'D', stop_sequence: 4, latitude: 0, longitude: 0, radius: 75, scheduled_at: at(40), arrived_at: null, inferred: null },
    ] });
    const p = (await getTripProgress(1))!;
    expect(p.last_stop_seq).toBe(2);
    expect(p.delay_min).toBe(7);
    expect(p.stops[1].eta).toBeNull(); // passed
    expect(new Date(p.stops[2].eta!).getTime()).toBe(at(32).getTime());
    expect(new Date(p.stops[3].eta!).getTime()).toBe(at(47).getTime());
  });

  it('an ETA is never in the past', async () => {
    const long = new Date(Date.now() - 3 * 3_600_000);
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 1, bus_id: 5, status: 'En Route', route_id: 2, last_updated: null }] });
    mockQuery.mockResolvedValueOnce({ rows: [
      { stop_id: 10, stop_name: 'A', stop_sequence: 1, latitude: 0, longitude: 0, radius: 75, scheduled_at: long, arrived_at: long, inferred: false },
      { stop_id: 11, stop_name: 'B', stop_sequence: 2, latitude: 0, longitude: 0, radius: 75, scheduled_at: long, arrived_at: null, inferred: null },
    ] });
    const p = (await getTripProgress(1))!;
    expect(new Date(p.stops[1].eta!).getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
  });
});

describe('daily trips', () => {
  it('generates from schedules for the weekday and reports schedules missing defaults', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 2, rows: [{ trip_id: 31 }, { trip_id: 32 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ schedule_id: 7, route_name: '3C', start_time: '09:00:00' }] });
    const r = await generateTripsFor('2026-11-24');
    expect(r.created).toBe(2);
    expect(r.missing_defaults).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ISODOW FROM \$1::date\)::smallint = ANY \(s\.days_of_week\)/);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ON CONFLICT \(schedule_id, trip_date\) DO NOTHING/);
  });

  it('POST /api/trips/generate is admin only and validates the date', async () => {
    const admin = `Bearer ${jwt.sign({ admin_id: 1, role: 'admin' }, SECRET)}`;
    const driver = `Bearer ${jwt.sign({ driver_id: 1, role: 'driver' }, SECRET)}`;
    expect((await request(app).post('/api/trips/generate').set('Authorization', driver)).status).toBe(403);
    expect((await request(app).post('/api/trips/generate').set('Authorization', admin).send({ date: 'tomorrow' })).status).toBe(400);
  });

  it('schedules validate weekdays', async () => {
    const admin = `Bearer ${jwt.sign({ admin_id: 1, role: 'admin' }, SECRET)}`;
    const res = await request(app).post('/api/schedules').set('Authorization', admin)
      .send({ route_id: 1, start_time: '06:00', days_of_week: [0, 8] });
    expect(res.status).toBe(400);
  });
});

describe('driver sessions renew while in use', () => {
  it('a day-old driver token gets a fresh one back; a new one does not', async () => {
    const old = jwt.sign({ driver_id: 1, role: 'driver', iat: Math.floor(Date.now() / 1000) - 26 * 3600 }, SECRET, { expiresIn: '7d' });
    const fresh = jwt.sign({ driver_id: 1, role: 'driver' }, SECRET, { expiresIn: '7d' });
    mockQuery.mockResolvedValue({ rows: [] });
    const a = await request(app).get('/api/drivers/me/trips').set('Authorization', `Bearer ${old}`);
    const renewed = a.headers['x-refreshed-token'];
    expect(renewed).toBeTruthy();
    expect((jwt.verify(renewed, SECRET) as jwt.JwtPayload).driver_id).toBe(1);
    const b = await request(app).get('/api/drivers/me/trips').set('Authorization', `Bearer ${fresh}`);
    expect(b.headers['x-refreshed-token']).toBeUndefined();
  });
});
