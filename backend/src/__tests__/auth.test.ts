import request from 'supertest';
import { app } from '../app';
import { mockQuery } from './__mocks__/db';
import bcrypt from 'bcryptjs';

jest.mock('../database/db');
jest.mock('../instrument', () => ({})); // Sentry no-op in tests

describe('POST /api/auth/admin/login', () => {
    it('returns 200 + token with correct credentials', async () => {
        const hash = await bcrypt.hash('adminpass', 1);
        mockQuery.mockResolvedValueOnce({
            rows: [{ admin_id: 1, email: 'admin@test.com', password_hash: hash, role: 'admin' }],
        });

        const res = await request(app)
            .post('/api/auth/admin/login')
            .send({ email: 'admin@test.com', password: 'adminpass' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('returns 401 with wrong password', async () => {
        const hash = await bcrypt.hash('rightpass', 1);
        mockQuery.mockResolvedValueOnce({
            rows: [{ admin_id: 1, email: 'admin@test.com', password_hash: hash, role: 'admin' }],
        });

        const res = await request(app)
            .post('/api/auth/admin/login')
            .send({ email: 'admin@test.com', password: 'wrongpass' });

        expect(res.status).toBe(401);
    });

    it('returns 401 if admin not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .post('/api/auth/admin/login')
            .send({ email: 'nobody@test.com', password: 'anything' });

        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/driver/login', () => {
    it('returns 200 + token with correct credentials', async () => {
        const hash = await bcrypt.hash('driverpass', 1);
        mockQuery.mockResolvedValueOnce({
            rows: [{ driver_id: 1, phone_number: '1234567890', password_hash: hash }],
        });

        const res = await request(app)
            .post('/api/auth/driver/login')
            .send({ phone_number: '1234567890', password: 'driverpass' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('returns 401 with wrong password', async () => {
        const hash = await bcrypt.hash('rightpass', 1);
        mockQuery.mockResolvedValueOnce({
            rows: [{ driver_id: 1, phone_number: '1234567890', password_hash: hash }],
        });

        const res = await request(app)
            .post('/api/auth/driver/login')
            .send({ phone_number: '1234567890', password: 'wrongpass' });

        expect(res.status).toBe(401);
    });

    it('returns 401 when account not activated (null hash)', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ driver_id: 1, phone_number: '1234567890', password_hash: null }],
        });

        const res = await request(app)
            .post('/api/auth/driver/login')
            .send({ phone_number: '1234567890', password: 'anything' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/not activated/i);
    });
});
