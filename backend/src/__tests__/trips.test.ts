import request from 'supertest';
import { app } from '../app';
import { mockQuery } from './__mocks__/db';
import jwt from 'jsonwebtoken';

jest.mock('../database/db');
jest.mock('../instrument', () => ({}));

const JWT_SECRET = process.env.JWT_SECRET!;

const adminToken = jwt.sign({ admin_id: 1, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const driverToken = jwt.sign({ driver_id: 1, role: 'driver' }, JWT_SECRET, { expiresIn: '1h' });

describe('POST /api/trips \u2014 authorization', () => {
    it('returns 401 without token', async () => {
        const res = await request(app).post('/api/trips').send({});
        expect(res.status).toBe(401);
    });

    it('returns 403 when driver tries to create a trip', async () => {
        const res = await request(app)
            .post('/api/trips')
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ schedule_id: 1, bus_id: 1, driver_id: 1, trip_date: '2025-01-01' });
        expect(res.status).toBe(403);
    });

    it('returns 200 when admin creates a trip', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ trip_id: 99 }] });
        const res = await request(app)
            .post('/api/trips')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ schedule_id: 1, bus_id: 1, driver_id: 1, trip_date: '2025-01-01' });
        expect(res.status).toBe(200);
    });
});

describe('PATCH /api/trips/:id/status \u2014 validation', () => {
    it('returns 400 with invalid status enum', async () => {
        const res = await request(app)
            .patch('/api/trips/1/status')
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ status: 'Flying' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Invalid status/);
    });

    it('returns 200 with valid status', async () => {
        // First query: ownership check (SELECT driver_id FROM trips WHERE trip_id = 1)
        mockQuery.mockResolvedValueOnce({ rows: [{ driver_id: 1 }] });
        // Second query: the actual UPDATE
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .patch('/api/trips/1/status')
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ status: 'En Route' });
        expect(res.status).toBe(200);
    });
});
