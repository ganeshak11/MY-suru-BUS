import { Router } from 'express';
import pool from '../database/db';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireAdmin, requireDriver, AuthRequest } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

// Explicit safe column list — never expose password_hash
// NOTE: no table alias prefix so this works in both SELECT and UPDATE...RETURNING
const DRIVER_SAFE_COLS = `
  driver_id, name, email, phone_number, profile_photo_url
`;

// CRIT-S01 + MED-S01: Auth guarded, explicit columns (no password_hash)
// DB-06: Pagination via ?limit=&offset=
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const result = await pool.query(`
      SELECT
        ${DRIVER_SAFE_COLS},
        COALESCE(json_agg(json_build_object('trip_id', t.trip_id, 'status', t.status)) FILTER (WHERE t.trip_id IS NOT NULL AND t.status = 'En Route'), '[]') as trips,
        COALESCE(json_agg(json_build_object('count', report_count.cnt)) FILTER (WHERE report_count.cnt IS NOT NULL), '[]') as passenger_reports
      FROM drivers d
      LEFT JOIN trips t ON d.driver_id = t.driver_id
      LEFT JOIN (
        SELECT driver_id, COUNT(*)::int as cnt
        FROM passenger_reports
        GROUP BY driver_id
      ) report_count ON d.driver_id = report_count.driver_id
      GROUP BY d.driver_id, d.name, d.email, d.phone_number, d.profile_photo_url
      ORDER BY d.driver_id
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (error) {
    logger.error({ error }, 'Error fetching drivers');
    next(error);
  }
});

// MOB-03: Driver-scoped trips — reads driver_id from JWT, returns only this driver's trips.
// MUST be before /:id so 'me' isn't treated as a numeric driver ID.
router.get('/me/trips', authenticateToken, async (req: any, res: any, next: any) => {
  const driverId = req.user?.driver_id;
  if (!driverId) {
    return res.status(403).json({ error: 'Only drivers may access this endpoint' });
  }
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const result = await pool.query(`
      SELECT
        t.trip_id, t.status, t.trip_date,
        b.bus_id, b.bus_no,
        s.start_time, r.route_id, r.route_name, r.route_no
      FROM trips t
      JOIN buses b ON t.bus_id = b.bus_id
      JOIN schedules s ON t.schedule_id = s.schedule_id
      JOIN routes r ON s.route_id = r.route_id
      WHERE t.driver_id = $1
      ORDER BY t.trip_date DESC, t.trip_id DESC
      LIMIT $2 OFFSET $3
    `, [driverId, limit, offset]);
    res.json(result.rows);
  } catch (error) {
    logger.error({ error }, 'Error fetching driver trips');
    next(error);
  }
});

// GET /drivers/me — own profile (driver reads their own row)
router.get('/me', authenticateToken, requireDriver, async (req: AuthRequest, res: any, next: any) => {
  const driverId = req.user?.driver_id;
  try {
    const result = await pool.query(
      `SELECT ${DRIVER_SAFE_COLS} FROM drivers d WHERE d.driver_id = $1`,
      [driverId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, 'Error fetching own profile');
    next(error);
  }
});

// PATCH /drivers/me — update own name and phone (driver self-service)
router.patch('/me', authenticateToken, requireDriver, async (req: AuthRequest, res: any, next: any) => {
  const driverId = req.user?.driver_id;
  const { name, phone_number } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `UPDATE drivers SET name = $1, phone_number = $2
       WHERE driver_id = $3
       RETURNING ${DRIVER_SAFE_COLS}`,
      [name.trim(), phone_number?.trim() ?? null, driverId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, 'Error updating own profile');
    next(error);
  }
});



// CRIT-S01 + MED-S01: Auth guarded, explicit columns (no password_hash)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${DRIVER_SAFE_COLS} FROM drivers d WHERE d.driver_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, 'Error fetching driver');
    next(error);
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  const { name, phone_number, email, password } = req.body;
  if (!name || !phone_number) {
    return res.status(400).json({ error: 'Name and phone_number are required' });
  }
  try {
    const rawPassword = password || Math.random().toString(36).slice(-10);
    const password_hash = await bcrypt.hash(rawPassword, 12);
    const result = await pool.query(
      'INSERT INTO drivers (name, phone_number, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING driver_id, name, phone_number, email',
      [name, phone_number, email || null, password_hash]
    );
    res.status(201).json({ ...result.rows[0], initial_password: rawPassword });
  } catch (error) {
    logger.error({ error }, 'Error creating driver');
    next(error);
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  const { name, phone_number, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE drivers SET name = $1, phone_number = $2, email = $3 WHERE driver_id = $4 RETURNING driver_id, name, phone_number, email, profile_photo_url',
      [name, phone_number, email, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ error }, 'Error updating driver');
    next(error);
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM drivers WHERE driver_id = $1 RETURNING driver_id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    logger.error({ error }, 'Error deleting driver');
    next(error);
  }
});

// Drivers change their own password
router.post('/me/change-password', authenticateToken, requireDriver, async (req: AuthRequest, res, next) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (typeof new_password !== 'string' || new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const driverId = req.user?.driver_id;
    const row = await pool.query('SELECT password_hash FROM drivers WHERE driver_id = $1', [driverId]);
    if (row.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    const { password_hash } = row.rows[0];
    if (!password_hash) return res.status(401).json({ error: 'Account not activated. Contact admin.' });
    const valid = await bcrypt.compare(current_password, password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE drivers SET password_hash = $1 WHERE driver_id = $2', [newHash, driverId]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
