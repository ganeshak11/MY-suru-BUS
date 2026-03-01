import request from 'supertest';
import { app } from '../app';
import { mockQuery } from './__mocks__/db';
import jwt from 'jsonwebtoken';

jest.mock('../database/db');
jest.mock('../instrument', () => ({}));

const JWT_SECRET = process.env.JWT_SECRET!;
const driverToken = jwt.sign({ driver_id: 1, role: 'driver' }, JWT_SECRET, { expiresIn: '1h' });

describe('POST /api/buses/:id/location', () => {
    it('returns 401 without token', async () => {
        const res = await request(app)
            .post('/api/buses/1/location')
            .send({ latitude: 12.9716, longitude: 77.5946 });
        expect(res.status).toBe(401);
    });

    it('returns 200 with valid driver token', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ bus_id: 1, current_latitude: 12.9716, current_longitude: 77.5946 }],
        });

        const res = await request(app)
            .post('/api/buses/1/location')
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ latitude: 12.9716, longitude: 77.5946, speed: 35 });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Location updated');
    });
});

describe('GET /api/buses', () => {
    it('returns bus list without auth (public read)', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ bus_id: 1, bus_no: 'KA-01-X-0001' }] });
        const res = await request(app).get('/api/buses');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
