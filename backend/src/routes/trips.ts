import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin, requireDriver, AuthRequest } from '../middleware/auth';
import { validateTrip } from '../middleware/validate';
import { io } from '../app';

const router = Router();

// CRIT-S02: Auth guarded. DB-06: Pagination via ?limit=&offset=
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const result = await pool.query(`
      SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name, r.route_id
      FROM trips t
      LEFT JOIN buses b ON t.bus_id = b.bus_id
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      ORDER BY t.trip_date DESC, t.trip_id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateToken, requireAdmin, validateTrip, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trips = Array.isArray(req.body) ? req.body : [req.body];

    const scheduleIds = trips.map((t: any) => parseInt(t.schedule_id, 10));
    const busIds = trips.map((t: any) => parseInt(t.bus_id, 10));
    const driverIds = trips.map((t: any) => parseInt(t.driver_id, 10));
    const tripDates = trips.map((t: any) => String(t.trip_date));
    const statuses = trips.map((t: any) => String(t.status || 'Scheduled'));

    const result = await pool.query(
      `INSERT INTO trips (schedule_id, bus_id, driver_id, trip_date, status)
       SELECT * FROM unnest(
         $1::int[], $2::int[], $3::int[], $4::date[], $5::trip_status[]
       )
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [scheduleIds, busIds, driverIds, tripDates, statuses]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bus_id, driver_id, trip_date, status } = req.body;
    const result = await pool.query(
      'UPDATE trips SET bus_id = $1, driver_id = $2, trip_date = $3, status = $4 WHERE trip_id = $5 RETURNING *',
      [bus_id, driver_id, trip_date, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM trip_stop_times WHERE trip_id = $1', [req.params.id]);
    await client.query('UPDATE passenger_reports SET trip_id = NULL WHERE trip_id = $1', [req.params.id]);
    await client.query('DELETE FROM trips WHERE trip_id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// CRIT-S02: Added authenticateToken — trip detail is no longer public.
router.get('/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name, r.route_id
      FROM trips t
      LEFT JOIN buses b ON t.bus_id = b.bus_id
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      WHERE t.trip_id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

const VALID_TRIP_STATUSES = ['Scheduled', 'En Route', 'Paused', 'Completed'] as const;

// MED-S03: Added ownership check — drivers can only update their OWN trip status.
router.patch('/:id/status', authenticateToken, requireDriver, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status || !VALID_TRIP_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_TRIP_STATUSES.join(', ')}` });
      return;
    }

    // MED-S03: Verify the driver owns this trip
    const ownership = await pool.query(
      'SELECT driver_id FROM trips WHERE trip_id = $1',
      [req.params.id]
    );
    if (ownership.rows.length === 0) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    if (ownership.rows[0].driver_id !== req.user?.driver_id) {
      res.status(403).json({ error: 'You are not assigned to this trip' });
      return;
    }

    await pool.query('UPDATE trips SET status = $1 WHERE trip_id = $2', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', authenticateToken, requireDriver, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trip = await pool.query(
      "UPDATE trips SET status = 'En Route' WHERE trip_id = $1 RETURNING bus_id",
      [req.params.id]
    );
    if (trip.rows[0]?.bus_id) {
      await pool.query('UPDATE buses SET current_trip_id = $1 WHERE bus_id = $2', [req.params.id, trip.rows[0].bus_id]);
    }
    // CRIT-S05: Use targeted room emit instead of global io.emit()
    io.to(`trip-${req.params.id}`).emit('trip-started', { trip_id: Number(req.params.id) });
    res.json({ message: 'Trip started', trip_id: req.params.id });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/pause', authenticateToken, requireDriver, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pool.query("UPDATE trips SET status = 'Paused' WHERE trip_id = $1", [req.params.id]);
    res.json({ message: 'Trip paused' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/resume', authenticateToken, requireDriver, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pool.query("UPDATE trips SET status = 'En Route' WHERE trip_id = $1", [req.params.id]);
    res.json({ message: 'Trip resumed' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', authenticateToken, requireDriver, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trip = await pool.query(
      "UPDATE trips SET status = 'Completed' WHERE trip_id = $1 RETURNING bus_id",
      [req.params.id]
    );
    if (trip.rows[0]?.bus_id) {
      await pool.query('UPDATE buses SET current_trip_id = NULL WHERE bus_id = $1', [trip.rows[0].bus_id]);
    }
    // CRIT-S05: Use targeted room emit instead of global io.emit()
    io.to(`trip-${req.params.id}`).emit('trip-completed', { trip_id: Number(req.params.id) });
    res.json({ message: 'Trip completed' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/stops/:stopId/arrive', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: tripId, stopId } = req.params;
    const result = await pool.query(
      `INSERT INTO trip_stop_times (trip_id, stop_id, actual_arrival_time)
       VALUES ($1, $2, NOW())
       ON CONFLICT (trip_id, stop_id) DO UPDATE SET actual_arrival_time = NOW()
       RETURNING trip_stop_id`,
      [tripId, stopId]
    );
    res.json({ message: 'Stop arrival recorded', trip_stop_id: result.rows[0].trip_stop_id });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stops', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT s.*, rs.stop_sequence, rs.time_offset_from_start,
             tst.actual_arrival_time, tst.actual_departure_time
      FROM stops s
      JOIN route_stops rs ON s.stop_id = rs.stop_id
      JOIN schedules sch ON rs.route_id = sch.route_id
      JOIN trips t ON sch.schedule_id = t.schedule_id
      LEFT JOIN trip_stop_times tst ON tst.trip_id = t.trip_id AND tst.stop_id = s.stop_id
      WHERE t.trip_id = $1
      ORDER BY rs.stop_sequence
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/trips/reset-daily
// Ported from the former Supabase edge function "reset-daily-trips".
// For each schedule, looks up yesterday's trip assignment (bus + driver)
// and creates today's trip if it doesn't already exist.
// Intended to be called once per day by a cron job or the admin dashboard.
router.post('/reset-daily', authenticateToken, requireAdmin, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Compute today and yesterday as ISO date strings (YYYY-MM-DD)
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = toDateStr(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toDateStr(yesterday);

    // Single batch INSERT using a CTE:
    // 1. Find all schedules that had a trip yesterday.
    // 2. Filter out any that already have a trip today.
    // 3. Insert the missing trips as "Scheduled".
    const result = await client.query<{ trip_id: number }>(
      `WITH yesterday_trips AS (
         SELECT schedule_id, bus_id, driver_id
         FROM   trips
         WHERE  trip_date = $1::date
       ),
       today_existing AS (
         SELECT schedule_id
         FROM   trips
         WHERE  trip_date = $2::date
       )
       INSERT INTO trips (schedule_id, bus_id, driver_id, trip_date, status)
       SELECT yt.schedule_id, yt.bus_id, yt.driver_id, $2::date, 'Scheduled'
       FROM   yesterday_trips yt
       WHERE  yt.schedule_id NOT IN (SELECT schedule_id FROM today_existing)
       RETURNING trip_id`,
      [yesterdayStr, today]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Created ${result.rowCount} trip(s) for ${today}`,
      date: today,
      created: result.rowCount,
      trip_ids: result.rows.map((r) => r.trip_id),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;

