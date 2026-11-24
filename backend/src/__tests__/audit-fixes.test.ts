import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { mockQuery } from './__mocks__/db';
import { escapeLike, todayInIndia } from '../middleware/params';

jest.mock('../database/db');
jest.mock('../instrument', () => ({}));

const sign = (p: object) => `Bearer ${jwt.sign(p, process.env.JWT_SECRET!, { expiresIn: '1h' })}`;
const admin = sign({ admin_id: 1, role: 'admin' });
const driver = sign({ driver_id: 1, role: 'driver' });
const trip = (status: string) => ({ trip_id: 42, driver_id: 1, bus_id: 5, route_id: 2, status });

beforeEach(() => mockQuery.mockReset());

describe('sessions', () => {
  it('an invalid token is 401 (sign in again), not 403', async () => {
    const res = await request(app).get('/api/trips').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});

describe('trip lifecycle (M4)', () => {
  it('a completed trip cannot be restarted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [trip('Completed')] });
    const res = await request(app).post('/api/trips/42/start').set('Authorization', driver);
    expect(res.status).toBe(409);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('a trip cannot start while its bus runs another trip', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [trip('Scheduled')] });
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 7 }] });
    const res = await request(app).post('/api/trips/42/start').set('Authorization', driver);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/trip 7/);
  });

  it('repeating the current status is a harmless no-op (offline retries)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [trip('En Route')] });
    const res = await request(app).post('/api/trips/42/start').set('Authorization', driver);
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('starting sets the bus’s current trip', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [trip('Scheduled')] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 42 }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/trips/42/start').set('Authorization', driver);
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[3][0]).toMatch(/UPDATE buses SET current_trip_id = \$1/);
    expect(mockQuery.mock.calls[3][1]).toEqual([42, 5]);
  });

  it('admin can cancel a trip; unknown statuses are rejected', async () => {
    const put = (status: string) => request(app).put('/api/trips/42').set('Authorization', admin)
      .send({ bus_id: 5, driver_id: 1, trip_date: '2026-11-24', status });
    expect((await put('Flying')).status).toBe(400);
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 42, status: 'Cancelled' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect((await put('Cancelled')).status).toBe(200);
  });
});

describe('stop arrivals', () => {
  it('uses the arrival time the driver app recorded', async () => {
    const at = new Date(Date.now() - 10 * 60_000).toISOString();
    mockQuery.mockResolvedValueOnce({ rows: [trip('En Route')] });
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_stop_id: 9 }] });
    const res = await request(app).post('/api/trips/42/stops/3/arrive').set('Authorization', driver)
      .send({ actual_arrival_time: at });
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1][2] as Date).toISOString()).toBe(at);
  });
});

describe('bus location ordering (H5)', () => {
  const post = (gps_timestamp?: string) => request(app).post('/api/buses/5/location')
    .set('Authorization', driver).send({ latitude: 12.3, longitude: 76.6, gps_timestamp });

  it('only moves the bus forward in time', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ x: 1 }] }); // active trip
    mockQuery.mockResolvedValueOnce({ rows: [] });          // UPDATE matched nothing: point is older
    const res = await post(new Date(Date.now() - 600_000).toISOString());
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(mockQuery.mock.calls[1][0]).toMatch(/last_updated IS NULL OR last_updated <= \$4/);
  });

  it('a timestamp in the future is replaced by now (H6 safety net)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ x: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ bus_id: 5 }] });
    await post(new Date(Date.now() + 5.5 * 3_600_000).toISOString());
    const stored = mockQuery.mock.calls[1][1][3] as Date;
    expect(Math.abs(stored.getTime() - Date.now())).toBeLessThan(5_000);
  });
});

describe('route stops (H8)', () => {
  it('admin can add a stop to a route', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });                         // sequence free
    mockQuery.mockResolvedValueOnce({ rows: [{ route_stop_id: 13 }] });
    const res = await request(app).post('/api/routes/1/stops').set('Authorization', admin)
      .send({ stop_id: 4, stop_sequence: 6, time_offset_from_start: '01:05:00' });
    expect(res.status).toBe(201);
  });

  it('rejects a duplicate sequence, bad input and non-admins', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ x: 1 }] });
    const dup = await request(app).post('/api/routes/1/stops').set('Authorization', admin)
      .send({ stop_id: 4, stop_sequence: 2, time_offset_from_start: '00:20' });
    expect(dup.status).toBe(409);
    const bad = await request(app).post('/api/routes/1/stops').set('Authorization', admin)
      .send({ stop_id: 'x', stop_sequence: 0 });
    expect(bad.status).toBe(400);
    const drv = await request(app).delete('/api/routes/1/stops/3').set('Authorization', driver);
    expect(drv.status).toBe(403);
  });

  it('the stop list includes route_stop_id for editing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/routes/1/stops');
    expect(mockQuery.mock.calls[0][0]).toMatch(/rs\.route_stop_id/);
  });
});

describe('public active trips (H9)', () => {
  it('needs no login and exposes no driver details', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/trips/active');
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).not.toMatch(/driver/);
  });
});

describe('errors and validation', () => {
  it('database constraint errors become 409 without SQL details', async () => {
    mockQuery.mockRejectedValueOnce(Object.assign(new Error('update or delete on table "stops" violates foreign key'), { code: '23503' }));
    const res = await request(app).put('/api/announcements/1').set('Authorization', admin).send({ title: 't', message: 'm' });
    expect(res.status).toBe(409);
    expect(res.body.error).not.toMatch(/violates/);
  });

  it('report status must be a known value', async () => {
    const res = await request(app).patch('/api/reports/1/status').set('Authorization', admin).send({ status: 'Deleted' });
    expect(res.status).toBe(400);
  });

  it('routing proxy rejects bad coordinates', async () => {
    const res = await request(app).get('/api/osm/nearest?lat=abc&lon=1');
    expect(res.status).toBe(400);
  });

  it('driver phone numbers are validated and normalised', async () => {
    const bad = await request(app).post('/api/drivers').set('Authorization', admin).send({ name: 'Ravi', phone_number: '12345' });
    expect(bad.status).toBe(400);
    mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: 4 }] });
    await request(app).post('/api/drivers').set('Authorization', admin).send({ name: 'Ravi', phone_number: '98765 00000' });
    expect(mockQuery.mock.calls[0][1][1]).toBe('+919876500000');
  });

  it('search input is matched literally', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('“today” is India’s date', () => {
    expect(todayInIndia()).toBe(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()));
  });
});

describe('driver password reset', () => {
  it('admin gets a new one-time password; drivers cannot reset others', async () => {
    expect((await request(app).post('/api/drivers/2/reset-password').set('Authorization', driver)).status).toBe(403);
    mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: 2, name: 'Suresh', phone_number: '+919876543211' }] });
    const res = await request(app).post('/api/drivers/2/reset-password').set('Authorization', admin);
    expect(res.status).toBe(200);
    expect(res.body.initial_password).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(mockQuery.mock.calls[0][1][0]).toMatch(/^\$2[aby]\$12\$/); // stored as a bcrypt hash
  });
});
