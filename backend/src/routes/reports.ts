import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Admin only: reports contain complaint text and driver names.
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.*,
        CASE WHEN b.bus_id IS NULL THEN NULL ELSE json_build_object('bus_no', b.bus_no) END as buses,
        CASE WHEN d.driver_id IS NULL THEN NULL ELSE json_build_object('name', d.name) END as drivers,
        CASE WHEN r.route_id IS NULL THEN NULL ELSE json_build_object('route_name', r.route_name) END as routes
      FROM passenger_reports pr
      LEFT JOIN buses b ON pr.bus_id = b.bus_id
      LEFT JOIN drivers d ON pr.driver_id = d.driver_id
      LEFT JOIN routes r ON pr.route_id = r.route_id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

const REPORT_STATUSES = ['New', 'In Progress', 'Resolved', 'Archived'];
const MAX_TYPE_LEN = 50;
const MAX_MESSAGE_LEN = 1000;
const toId = (v: unknown): string | null =>
  v === undefined || v === null || v === '' ? null : /^\d+$/.test(String(v)) ? String(v) : 'invalid';

// Anyone (passengers are anonymous) can file a report. The driver it concerns is
// derived from the trip on the server; a client-supplied driver_id is ignored so
// reports can't be pinned on an arbitrary driver.
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { report_type, message } = req.body ?? {};
  if (typeof report_type !== 'string' || !report_type.trim() || report_type.trim().length > MAX_TYPE_LEN) {
    res.status(400).json({ error: `report_type is required (max ${MAX_TYPE_LEN} characters)` });
    return;
  }
  if (typeof message !== 'string' || !message.trim() || message.trim().length > MAX_MESSAGE_LEN) {
    res.status(400).json({ error: `message is required (max ${MAX_MESSAGE_LEN} characters)` });
    return;
  }
  const tripId = toId(req.body.trip_id);
  let busId = toId(req.body.bus_id);
  let routeId = toId(req.body.route_id);
  if ([tripId, busId, routeId].includes('invalid')) {
    res.status(400).json({ error: 'trip_id, bus_id and route_id must be numeric ids' });
    return;
  }

  try {
    let driverId: string | null = null;
    if (tripId) {
      const trip = await pool.query(
        `SELECT t.driver_id, t.bus_id, s.route_id
         FROM trips t JOIN schedules s ON t.schedule_id = s.schedule_id
         WHERE t.trip_id = $1`,
        [tripId]
      );
      if (trip.rows.length === 0) {
        res.status(400).json({ error: 'Unknown trip_id' });
        return;
      }
      ({ driver_id: driverId } = trip.rows[0]);
      busId = trip.rows[0].bus_id;
      routeId = trip.rows[0].route_id;
    }

    const result = await pool.query(
      `INSERT INTO passenger_reports (report_type, message, trip_id, bus_id, driver_id, route_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING report_id`,
      [report_type.trim(), message.trim(), tripId, busId, driverId, routeId]
    );
    res.status(201).json({ message: 'Report created', report_id: result.rows[0].report_id });
  } catch (err: any) {
    if (err.code === '23503') {
      res.status(400).json({ error: 'Unknown bus_id or route_id' });
      return;
    }
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Only admins can update report status
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { status } = req.body ?? {};
  if (!REPORT_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${REPORT_STATUSES.join(', ')}` });
    return;
  }
  try {
    const result = await pool.query(
      'UPDATE passenger_reports SET status = $1 WHERE report_id = $2 RETURNING report_id',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json({ message: 'Report status updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
