import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { mockQuery } from './__mocks__/db';

jest.mock('../database/db');
jest.mock('../instrument', () => ({}));

const JWT_SECRET = process.env.JWT_SECRET!;
// In production both ids are strings (node-postgres returns bigint as string);
// using strings here exercises the same comparison path.
const sign = (payload: object) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
const admin = `Bearer ${sign({ admin_id: '1', role: 'admin' })}`;
const driverA = `Bearer ${sign({ driver_id: '1', role: 'driver' })}`;
const driverB = `Bearer ${sign({ driver_id: '2', role: 'driver' })}`;

beforeEach(() => mockQuery.mockReset());

// ─── H1: trip ownership ───────────────────────────────────────────────────────
describe('trip actions require the assigned driver', () => {
  const ownedByA = () => mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: '1' }] });

  it.each([
    ['post', '/api/trips/42/start'],
    ['patch', '/api/trips/42/pause'],
    ['patch', '/api/trips/42/resume'],
    ['post', '/api/trips/42/complete'],
    ['post', '/api/trips/42/stops/3/arrive'],
  ])('%s %s → 403 for another driver, and changes nothing', async (method, url) => {
    ownedByA();
    const res = await (request(app) as any)[method](url).set('Authorization', driverB);
    expect(res.status).toBe(403);
    expect(mockQuery).toHaveBeenCalledTimes(1); // only the ownership lookup ran
  });

  it('PATCH status → 403 for another driver', async () => {
    ownedByA();
    const res = await request(app).patch('/api/trips/42/status')
      .set('Authorization', driverB).send({ status: 'Completed' });
    expect(res.status).toBe(403);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('owner can complete their trip', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 42, driver_id: '1', bus_id: 5, route_id: 2, status: 'En Route' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 42 }] }); // conditional UPDATE trips
    mockQuery.mockResolvedValueOnce({ rows: [] });                // UPDATE buses
    const res = await request(app).post('/api/trips/42/complete').set('Authorization', driverA);
    expect(res.status).toBe(200);
  });

  it('unknown trip → 404, non-numeric id → 400', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect((await request(app).post('/api/trips/999/start').set('Authorization', driverA)).status).toBe(404);
    expect((await request(app).post('/api/trips/abc/start').set('Authorization', driverA)).status).toBe(400);
  });
});

// ─── M6: trip and driver reads ────────────────────────────────────────────────
describe('trip and driver reads are scoped', () => {
  it('GET /api/trips (all trips) is admin only', async () => {
    expect((await request(app).get('/api/trips').set('Authorization', driverA)).status).toBe(403);
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect((await request(app).get('/api/trips').set('Authorization', admin)).status).toBe(200);
  });

  it("GET /api/trips/:id → 403 for another driver's trip, 200 for own", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: '1' }] });
    expect((await request(app).get('/api/trips/42').set('Authorization', driverB)).status).toBe(403);

    mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: '1' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: '42' }] });
    expect((await request(app).get('/api/trips/42').set('Authorization', driverA)).status).toBe(200);
  });

  it('GET /api/drivers/:id is admin only', async () => {
    expect((await request(app).get('/api/drivers/1').set('Authorization', driverB)).status).toBe(403);
  });
});

// ─── H2: bus location ─────────────────────────────────────────────────────────
describe('POST /api/buses/:id/location', () => {
  const body = { latitude: 12.3, longitude: 76.6, speed: 20 };

  it('rejects anonymous and admin callers', async () => {
    expect((await request(app).post('/api/buses/5/location').send(body)).status).toBe(401);
    expect((await request(app).post('/api/buses/5/location').set('Authorization', admin).send(body)).status).toBe(403);
  });

  it('409 when the driver has no live trip on that bus, and the bus is not updated', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/buses/5/location').set('Authorization', driverB).send(body);
    expect(res.status).toBe(409);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][1]).toEqual(['5', '2']);
  });

  it('200 for the driver running a trip on that bus', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ bus_id: '5' }] });
    const res = await request(app).post('/api/buses/5/location').set('Authorization', driverA).send(body);
    expect(res.status).toBe(200);
  });

  it('400 for a non-numeric bus id', async () => {
    expect((await request(app).post('/api/buses/x/location').set('Authorization', driverA).send(body)).status).toBe(400);
  });
});

// ─── H3: reports ──────────────────────────────────────────────────────────────
describe('passenger reports', () => {
  it('GET is admin only', async () => {
    expect((await request(app).get('/api/reports')).status).toBe(401);
    expect((await request(app).get('/api/reports').set('Authorization', driverA)).status).toBe(403);
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect((await request(app).get('/api/reports').set('Authorization', admin)).status).toBe(200);
  });

  it('driver comes from the trip, not from the client', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: '7', bus_id: '5', route_id: '2' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ report_id: '1' }] });
    const res = await request(app).post('/api/reports').send({
      report_type: 'Driver Behavior', message: 'Rash driving', trip_id: 42, driver_id: 99,
    });
    expect(res.status).toBe(201);
    const insertParams = mockQuery.mock.calls[1][1];
    expect(insertParams).toEqual(['Driver Behavior', 'Rash driving', '42', '5', '7', '2']);
  });

  it('client driver_id is ignored when no trip is given', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ report_id: '1' }] });
    await request(app).post('/api/reports').send({ report_type: 'Other', message: 'x', driver_id: 99 });
    expect(mockQuery.mock.calls[0][1][4]).toBeNull();
  });

  it('validates type, message length and ids', async () => {
    const post = (b: object) => request(app).post('/api/reports').send(b);
    expect((await post({ message: 'x' })).status).toBe(400);
    expect((await post({ report_type: 'Other', message: 'x'.repeat(1001) })).status).toBe(400);
    expect((await post({ report_type: 'Other', message: 'x', bus_id: '1; drop' })).status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ─── M7: generated driver passwords ───────────────────────────────────────────
describe('POST /api/drivers', () => {
  it('generates a 12-character random initial password', async () => {
    mockQuery.mockResolvedValue({ rows: [{ driver_id: 3, name: 'Ravi', phone_number: '+919876500000', email: null }] });
    const res = await request(app).post('/api/drivers').set('Authorization', admin)
      .send({ name: 'Ravi', phone_number: '9876500000' });
    expect(res.status).toBe(201);
    expect(res.body.initial_password).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});

// ─── H4: rate limit is per client, behind a proxy ─────────────────────────────
describe('auth rate limit uses the client IP from X-Forwarded-For', () => {
  it('one client hitting the limit does not block another', async () => {
    const login = (ip: string) =>
      request(app).post('/api/auth/admin/login').set('X-Forwarded-For', ip).send({});
    for (let i = 0; i < 10; i++) expect((await login('203.0.113.1')).status).toBe(400);
    expect((await login('203.0.113.1')).status).toBe(429);
    expect((await login('203.0.113.2')).status).toBe(400);
  });
});
