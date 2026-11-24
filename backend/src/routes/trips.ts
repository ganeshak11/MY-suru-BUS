import { Router, Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import pool from '../database/db';
import { authenticateToken, requireAdmin, requireDriver, AuthRequest } from '../middleware/auth';
import { validateTrip } from '../middleware/validate';
import { isId, todayInIndia } from '../middleware/params';
import { io } from '../app';
import { generateTripsFor } from '../services/dailyTrips';
import { getTripProgress, publishProgress } from '../services/tripProgress';

const router = Router();

type TripStatus = 'Scheduled' | 'En Route' | 'Paused' | 'Completed' | 'Cancelled';
const ALL_STATUSES: TripStatus[] = ['Scheduled', 'En Route', 'Paused', 'Completed', 'Cancelled'];

interface TripRow {
  trip_id: number;
  driver_id: number;
  bus_id: number;
  route_id: number;
  status: TripStatus;
}

// ─── Ownership ────────────────────────────────────────────────────────────────
// Drivers may only act on trips assigned to them; admins on any trip.
// Responds and returns null when the request must stop.
const loadOwnTrip = async (req: AuthRequest, res: Response): Promise<TripRow | null> => {
  if (!isId(req.params.id)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return null;
  }
  const result = await pool.query(
    `SELECT t.trip_id, t.driver_id, t.bus_id, t.status, s.route_id
     FROM trips t JOIN schedules s ON s.schedule_id = t.schedule_id
     WHERE t.trip_id = $1`,
    [req.params.id]
  );
  const trip: TripRow | undefined = result.rows[0];
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return null;
  }
  if (req.user?.role !== 'admin' && String(trip.driver_id) !== String(req.user?.driver_id)) {
    res.status(403).json({ error: 'You are not assigned to this trip' });
    return null;
  }
  return trip;
};

// Tell passengers watching this trip, this bus or this route.
const announce = (event: string, trip: TripRow): void => {
  const payload = { trip_id: trip.trip_id, bus_id: trip.bus_id, route_id: trip.route_id };
  io.to([`trip-${trip.trip_id}`, `bus-${trip.bus_id}`, `route-${trip.route_id}`]).emit(event, payload);
};

const EVENT_FOR: Partial<Record<TripStatus, string>> = {
  'En Route': 'trip-started',
  Paused: 'trip-paused',
  Completed: 'trip-completed',
  Cancelled: 'trip-completed',
};

// Allowed driver transitions: target status ← statuses it may come from.
const DRIVER_TRANSITIONS: Record<string, TripStatus[]> = {
  'En Route': ['Scheduled', 'Paused'],
  Paused: ['En Route'],
  Completed: ['En Route', 'Paused'],
};

// Move a trip to `target`, keeping buses.current_trip_id in sync. Repeating the
// current status is a no-op success, so offline retries are safe.
const changeStatus = async (req: AuthRequest, res: Response, target: TripStatus): Promise<void> => {
  const trip = await loadOwnTrip(req, res);
  if (!trip) return;

  if (trip.status === target) {
    res.json({ message: `Trip already ${target}`, trip_id: trip.trip_id, status: target });
    return;
  }
  const allowedFrom = DRIVER_TRANSITIONS[target] ?? [];
  if (!allowedFrom.includes(trip.status)) {
    res.status(409).json({ error: `Cannot change a ${trip.status} trip to ${target}` });
    return;
  }
  if (target === 'En Route') {
    const busy = await pool.query(
      `SELECT trip_id FROM trips WHERE bus_id = $1 AND status = 'En Route' AND trip_id <> $2 LIMIT 1`,
      [trip.bus_id, trip.trip_id]
    );
    if (busy.rows.length > 0) {
      res.status(409).json({ error: `This bus is already running trip ${busy.rows[0].trip_id}` });
      return;
    }
  }

  // Conditional on the status we read, so two concurrent changes can't both win.
  const updated = await pool.query(
    'UPDATE trips SET status = $1 WHERE trip_id = $2 AND status = $3 RETURNING trip_id',
    [target, trip.trip_id, trip.status]
  );
  if (updated.rows.length === 0) {
    res.status(409).json({ error: 'The trip changed meanwhile; reload and try again' });
    return;
  }
  if (target === 'En Route') {
    await pool.query('UPDATE buses SET current_trip_id = $1 WHERE bus_id = $2', [trip.trip_id, trip.bus_id]);
  } else if (target === 'Completed') {
    await pool.query('UPDATE buses SET current_trip_id = NULL WHERE bus_id = $1 AND current_trip_id = $2', [trip.bus_id, trip.trip_id]);
  }

  const event = EVENT_FOR[target];
  if (event) announce(event, { ...trip, status: target });
  await publishProgress(trip.trip_id);
  res.json({ message: `Trip ${target}`, trip_id: trip.trip_id, status: target });
};

// ─── Admin: list / create / edit / delete ─────────────────────────────────────

// CRIT-S02: Auth guarded. DB-06: Pagination via ?limit=&offset=
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      ORDER BY t.trip_date DESC, s.start_time DESC, t.trip_id DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Public: today's running trips, with nothing personal. Used by the passenger
// app's report form so a report can be tied to a trip.
router.get('/active', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT t.trip_id, t.bus_id, b.bus_no, s.start_time, r.route_id, r.route_no, r.route_name
      FROM trips t
      JOIN buses b ON b.bus_id = t.bus_id
      JOIN schedules s ON s.schedule_id = t.schedule_id
      JOIN routes r ON r.route_id = s.route_id
      WHERE t.status IN ('En Route', 'Paused')
      ORDER BY r.route_no, s.start_time
    `);
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
    if (statuses.some((s) => !ALL_STATUSES.includes(s as TripStatus))) {
      res.status(400).json({ error: `status must be one of: ${ALL_STATUSES.join(', ')}` });
      return;
    }

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
  const { bus_id, driver_id, trip_date, status } = req.body ?? {};
  if (!isId(bus_id) || !isId(driver_id) || !trip_date || !ALL_STATUSES.includes(status)) {
    res.status(400).json({ error: `bus_id, driver_id, trip_date and a status (${ALL_STATUSES.join(', ')}) are required` });
    return;
  }
  try {
    const result = await pool.query(
      'UPDATE trips SET bus_id = $1, driver_id = $2, trip_date = $3, status = $4 WHERE trip_id = $5 RETURNING *',
      [bus_id, driver_id, trip_date, status, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    // Keep the bus pointer consistent with what the admin set.
    if (status === 'En Route') {
      await pool.query('UPDATE buses SET current_trip_id = $1 WHERE bus_id = $2', [req.params.id, bus_id]);
    } else {
      await pool.query('UPDATE buses SET current_trip_id = NULL WHERE current_trip_id = $1', [req.params.id]);
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
    await client.query('DELETE FROM trip_stop_times WHERE trip_id = $1', [req.params.id]);
    await client.query('UPDATE passenger_reports SET trip_id = NULL WHERE trip_id = $1', [req.params.id]);
    const deleted = await client.query('DELETE FROM trips WHERE trip_id = $1 RETURNING trip_id', [req.params.id]);
    await client.query('COMMIT');
    if (deleted.rows.length === 0) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json({ message: 'Trip deleted' });
  } catch (err) {
    await client?.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client?.release();
  }
});

// CRIT-S02: trip detail is for its driver or an admin.
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await loadOwnTrip(req, res))) return;
    const result = await pool.query(`
      SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name, r.route_id
      FROM trips t
      LEFT JOIN buses b ON t.bus_id = b.bus_id
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      WHERE t.trip_id = $1
    `, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── Driver: trip lifecycle ───────────────────────────────────────────────────

const VALID_TRIP_STATUSES = ['Scheduled', 'En Route', 'Paused', 'Completed'] as const;

router.patch('/:id/status', authenticateToken, requireDriver, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body ?? {};
    if (!status || !VALID_TRIP_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_TRIP_STATUSES.join(', ')}` });
      return;
    }
    await changeStatus(req, res, status);
  } catch (err) {
    next(err);
  }
});

const lifecycle = (target: TripStatus) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await changeStatus(req, res, target);
    } catch (err) {
      next(err);
    }
  };

router.post('/:id/start', authenticateToken, requireDriver, lifecycle('En Route'));
router.patch('/:id/pause', authenticateToken, requireDriver, lifecycle('Paused'));
router.patch('/:id/resume', authenticateToken, requireDriver, lifecycle('En Route'));
router.post('/:id/complete', authenticateToken, requireDriver, lifecycle('Completed'));

// Record arrival at a stop. The driver app may send the time it actually arrived
// (from its offline queue); accept it if it's plausible, otherwise use now.
router.post('/:id/stops/:stopId/arrive', authenticateToken, requireDriver, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isId(req.params.stopId)) {
      res.status(400).json({ error: 'Invalid stop id' });
      return;
    }
    const trip = await loadOwnTrip(req, res);
    if (!trip) return;

    let arrivedAt = new Date();
    const sent = req.body?.actual_arrival_time ? new Date(req.body.actual_arrival_time) : null;
    if (sent && !isNaN(sent.getTime())) {
      const age = Date.now() - sent.getTime();
      if (age > -5 * 60_000 && age < 24 * 3_600_000) arrivedAt = sent;
    }

    const result = await pool.query(
      `INSERT INTO trip_stop_times (trip_id, stop_id, actual_arrival_time)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id, stop_id) DO UPDATE SET actual_arrival_time = EXCLUDED.actual_arrival_time, inferred = false
       RETURNING trip_stop_id`,
      [trip.trip_id, req.params.stopId, arrivedAt]
    );
    await publishProgress(trip.trip_id);
    io.to([`trip-${trip.trip_id}`, `bus-${trip.bus_id}`]).emit('stop-arrival', {
      trip_id: trip.trip_id, bus_id: trip.bus_id, stop_id: Number(req.params.stopId), arrived_at: arrivedAt.toISOString(),
    });
    res.json({ message: 'Stop arrival recorded', trip_stop_id: result.rows[0].trip_stop_id });
  } catch (err) {
    next(err);
  }
});

// Public: where a trip is, how late, and ETAs for the remaining stops. Nothing personal.
router.get('/:id/progress', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!isId(req.params.id)) {
    res.status(400).json({ error: 'Invalid trip id' });
    return;
  }
  try {
    const p = await getTripProgress(Number(req.params.id));
    if (!p) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(p);
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

// POST /api/trips/generate { date?: 'YYYY-MM-DD' } — create a day's trips from the
// schedules (default: today in India). The server also does this by itself every
// 30 minutes for today and tomorrow; this is for running it on demand.
// /reset-daily is kept as an alias for older clients.
const generateHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const date = req.body?.date ?? todayInIndia();
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'date must look like YYYY-MM-DD' });
    return;
  }
  try {
    const r = await generateTripsFor(date);
    res.json({
      success: true,
      message: `Created ${r.created} trip(s) for ${r.date}` +
        (r.missing_defaults.length ? `; ${r.missing_defaults.length} schedule(s) need a default bus and driver` : ''),
      ...r,
    });
  } catch (err) {
    next(err);
  }
};
router.post('/generate', authenticateToken, requireAdmin, generateHandler);
router.post('/reset-daily', authenticateToken, requireAdmin, generateHandler);

export default router;
