import { Router, Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { isId } from '../middleware/params';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface ScheduleInput {
  route_id: number;
  start_time: string;
  days_of_week: number[];
  default_bus_id: number | null;
  default_driver_id: number | null;
}

// Validates and normalises the schedule body. Responds 400 and returns null when invalid.
// days_of_week: ISO weekdays (1 = Monday … 7 = Sunday); defaults to every day.
// default_bus_id / default_driver_id: who runs it unless the admin changes that day's trip;
// both are needed for the trip to be created automatically.
const readSchedule = (req: Request, res: Response): ScheduleInput | null => {
  const { route_id, start_time, days_of_week, default_bus_id, default_driver_id } = req.body ?? {};
  if (!isId(route_id)) {
    res.status(400).json({ error: 'route_id is required' });
    return null;
  }
  if (typeof start_time !== 'string' || !TIME_RE.test(start_time)) {
    res.status(400).json({ error: 'start_time must look like HH:MM' });
    return null;
  }
  const days = days_of_week === undefined ? ALL_DAYS : days_of_week;
  if (!Array.isArray(days) || days.length === 0 || !days.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)) {
    res.status(400).json({ error: 'days_of_week must list weekdays from 1 (Monday) to 7 (Sunday)' });
    return null;
  }
  for (const [name, v] of [['default_bus_id', default_bus_id], ['default_driver_id', default_driver_id]] as const) {
    if (v !== undefined && v !== null && v !== '' && !isId(v)) {
      res.status(400).json({ error: `${name} must be an id or empty` });
      return null;
    }
  }
  return {
    route_id: Number(route_id),
    start_time,
    days_of_week: [...new Set(days as number[])].sort(),
    default_bus_id: default_bus_id ? Number(default_bus_id) : null,
    default_driver_id: default_driver_id ? Number(default_driver_id) : null,
  };
};

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT s.schedule_id, s.start_time, s.route_id, r.route_name,
             s.days_of_week, s.default_bus_id, b.bus_no AS default_bus_no,
             s.default_driver_id, d.name AS default_driver_name
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN buses b ON b.bus_id = s.default_bus_id
      LEFT JOIN drivers d ON d.driver_id = s.default_driver_id
      ORDER BY r.route_name, s.start_time
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const s = readSchedule(req, res);
  if (!s) return;
  try {
    const result = await pool.query(
      `INSERT INTO schedules (route_id, start_time, days_of_week, default_bus_id, default_driver_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [s.route_id, s.start_time, s.days_of_week, s.default_bus_id, s.default_driver_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const s = readSchedule(req, res);
  if (!s) return;
  try {
    const result = await pool.query(
      `UPDATE schedules
       SET route_id = $1, start_time = $2, days_of_week = $3, default_bus_id = $4, default_driver_id = $5
       WHERE schedule_id = $6 RETURNING *`,
      [s.route_id, s.start_time, s.days_of_week, s.default_bus_id, s.default_driver_id, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM trips WHERE schedule_id = $1', [req.params.id]);
    const deleted = await client.query('DELETE FROM schedules WHERE schedule_id = $1 RETURNING schedule_id', [req.params.id]);
    await client.query('COMMIT');
    if (deleted.rows.length === 0) {
      res.status(404).json({ error: 'Schedule not found' });
      return;
    }
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    await client?.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client?.release();
  }
});

export default router;
