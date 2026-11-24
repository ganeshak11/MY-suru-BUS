import { Router, Request, Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRoute } from '../middleware/validate';
import { escapeLike, isId } from '../middleware/params';
import { getTripProgress } from '../services/tripProgress';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // DB-06: Pagination — ?limit=50&offset=0 (defaults: limit 100, offset 0)
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        COALESCE(json_agg(json_build_object('count', stop_count.cnt)) FILTER (WHERE stop_count.cnt IS NOT NULL), '[]') as route_stops,
        COALESCE(json_agg(json_build_object('count', schedule_count.cnt)) FILTER (WHERE schedule_count.cnt IS NOT NULL), '[]') as schedules
      FROM routes r
      LEFT JOIN (
        SELECT route_id, COUNT(*)::int as cnt
        FROM route_stops
        GROUP BY route_id
      ) stop_count ON r.route_id = stop_count.route_id
      LEFT JOIN (
        SELECT route_id, COUNT(*)::int as cnt
        FROM schedules
        GROUP BY route_id
      ) schedule_count ON r.route_id = schedule_count.route_id
      GROUP BY r.route_id
      ORDER BY r.route_no
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateToken, requireAdmin, validateRoute, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { route_name, route_no } = req.body;
    const result = await pool.query(
      'INSERT INTO routes (route_name, route_no) VALUES ($1, $2) RETURNING *',
      [route_name.trim(), route_no.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticateToken, requireAdmin, validateRoute, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { route_name, route_no } = req.body;
    const result = await pool.query(
      'UPDATE routes SET route_name = $1, route_no = $2 WHERE route_id = $3 RETURNING *',
      [route_name.trim(), route_no.trim(), req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Route not found' });
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
    const routeId = req.params.id;

    // Edge case guard: block deletion if any trip on this route is currently active.
    // Without this, a driver's active trip is silently deleted from under them.
    const activeTripsCheck = await client.query(`
      SELECT COUNT(*)::int as count
      FROM trips t
      JOIN schedules s ON t.schedule_id = s.schedule_id
      WHERE s.route_id = $1 AND t.status = 'En Route'
    `, [routeId]);

    const activeCount = activeTripsCheck.rows[0].count;
    if (activeCount > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({
        error: `Cannot delete route: ${activeCount} trip(s) are currently En Route on this route. Complete or cancel them first.`,
      });
      return;
    }

    const schedulesResult = await client.query('SELECT schedule_id FROM schedules WHERE route_id = $1', [routeId]);
    const scheduleIds = schedulesResult.rows.map((s: any) => s.schedule_id);

    if (scheduleIds.length > 0) {
      const tripsResult = await client.query('SELECT trip_id FROM trips WHERE schedule_id = ANY($1)', [scheduleIds]);
      const tripIds = tripsResult.rows.map((t: any) => t.trip_id);
      if (tripIds.length > 0) {
        await client.query('DELETE FROM trip_stop_times WHERE trip_id = ANY($1)', [tripIds]);
        await client.query('UPDATE passenger_reports SET trip_id = NULL WHERE trip_id = ANY($1)', [tripIds]);
        await client.query('DELETE FROM trips WHERE trip_id = ANY($1)', [tripIds]);
      }
    }

    await client.query('DELETE FROM schedules WHERE route_id = $1', [routeId]);
    await client.query('DELETE FROM route_stops WHERE route_id = $1', [routeId]);
    const deleted = await client.query('DELETE FROM routes WHERE route_id = $1 RETURNING route_id', [routeId]);
    await client.query('COMMIT');
    if (deleted.rows.length === 0) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }
    res.json({ message: 'Route deleted' });
  } catch (err) {
    await client?.query('ROLLBACK').catch(() => undefined);
    next(err);
  } finally {
    client?.release();
  }
});

// ─── Route stops ──────────────────────────────────────────────────────────────

router.get('/:id/stops', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT s.*, rs.route_stop_id, rs.stop_sequence, rs.time_offset_from_start
      FROM stops s
      JOIN route_stops rs ON s.stop_id = rs.stop_id
      WHERE rs.route_id = $1
      ORDER BY rs.stop_sequence
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// Validates the body shared by add/update. Responds and returns null when invalid.
const readRouteStopBody = (req: Request, res: Response) => {
  const { stop_id, stop_sequence, time_offset_from_start } = req.body ?? {};
  const seq = Number(stop_sequence);
  if (!isId(stop_id)) {
    res.status(400).json({ error: 'stop_id must be a stop id' });
    return null;
  }
  if (!Number.isInteger(seq) || seq < 1) {
    res.status(400).json({ error: 'stop_sequence must be a whole number from 1' });
    return null;
  }
  if (time_offset_from_start != null && !TIME_RE.test(String(time_offset_from_start))) {
    res.status(400).json({ error: 'time_offset_from_start must look like HH:MM or HH:MM:SS' });
    return null;
  }
  return { stopId: Number(stop_id), seq, offset: time_offset_from_start ?? null };
};

router.post('/:id/stops', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = readRouteStopBody(req, res);
  if (!body) return;
  try {
    const clash = await pool.query(
      'SELECT 1 FROM route_stops WHERE route_id = $1 AND stop_sequence = $2',
      [req.params.id, body.seq]
    );
    if (clash.rows.length > 0) {
      res.status(409).json({ error: `Sequence ${body.seq} is already used on this route` });
      return;
    }
    const result = await pool.query(
      `INSERT INTO route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, body.stopId, body.seq, body.offset]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/stops/:routeStopId', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = readRouteStopBody(req, res);
  if (!body) return;
  try {
    const clash = await pool.query(
      'SELECT 1 FROM route_stops WHERE route_id = $1 AND stop_sequence = $2 AND route_stop_id <> $3',
      [req.params.id, body.seq, req.params.routeStopId]
    );
    if (clash.rows.length > 0) {
      res.status(409).json({ error: `Sequence ${body.seq} is already used on this route` });
      return;
    }
    const result = await pool.query(
      `UPDATE route_stops SET stop_id = $1, stop_sequence = $2, time_offset_from_start = $3
       WHERE route_stop_id = $4 AND route_id = $5 RETURNING *`,
      [body.stopId, body.seq, body.offset, req.params.routeStopId, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Route stop not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/stops/:routeStopId', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM route_stops WHERE route_stop_id = $1 AND route_id = $2 RETURNING route_stop_id',
      [req.params.routeStopId, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Route stop not found' });
      return;
    }
    res.json({ message: 'Stop removed from route' });
  } catch (err) {
    next(err);
  }
});

// DB-05: Single JOIN query replacing two sequential round-trips
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const routeId = req.params.id;
    const result = await pool.query(`
      SELECT
        r.route_id, r.route_name, r.route_no,
        COALESCE(
          json_agg(
            json_build_object(
              'stop_id', s.stop_id,
              'stop_name', s.stop_name,
              'latitude', s.latitude,
              'longitude', s.longitude,
              'geofence_radius_meters', s.geofence_radius_meters,
              'stop_sequence', rs.stop_sequence,
              'time_offset_from_start', rs.time_offset_from_start
            ) ORDER BY rs.stop_sequence
          ) FILTER (WHERE s.stop_id IS NOT NULL),
          '[]'
        ) AS stops
      FROM routes r
      LEFT JOIN route_stops rs ON r.route_id = rs.route_id
      LEFT JOIN stops s ON rs.stop_id = s.stop_id
      WHERE r.route_id = $1
      GROUP BY r.route_id
    `, [routeId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get('/search/:source/:destination', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { source, destination } = req.params;

    const result = await pool.query(`
      SELECT DISTINCT r.*,
             src_stop.stop_name as source_stop,
             dest_stop.stop_name as destination_stop
      FROM routes r
      JOIN route_stops rs1 ON r.route_id = rs1.route_id
      JOIN stops src_stop ON rs1.stop_id = src_stop.stop_id
      JOIN route_stops rs2 ON r.route_id = rs2.route_id
      JOIN stops dest_stop ON rs2.stop_id = dest_stop.stop_id
      WHERE src_stop.stop_name ILIKE $1
      AND dest_stop.stop_name ILIKE $2
      AND rs1.stop_sequence < rs2.stop_sequence
    `, [`%${escapeLike(source)}%`, `%${escapeLike(destination)}%`]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Live trips on a route (running or paused), each with its bus position and the
// server's progress (stops passed, delay, ETAs). Passengers render this as is.
router.get('/:id/active-trips', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        t.trip_id,
        t.status,
        t.trip_date,
        s.start_time,
        json_build_object(
          'bus_id',            b.bus_id,
          'bus_no',            b.bus_no,
          'current_latitude',  b.current_latitude,
          'current_longitude', b.current_longitude,
          'current_speed_kmh', b.current_speed_kmh,
          'last_updated',      b.last_updated,
          'current_trip_id',   t.trip_id
        ) AS bus
      FROM trips t
      JOIN schedules s ON t.schedule_id = s.schedule_id
      JOIN buses b ON t.bus_id = b.bus_id
      WHERE s.route_id = $1
        AND t.status IN ('En Route', 'Paused')
        AND b.current_latitude IS NOT NULL
        AND b.current_longitude IS NOT NULL
      ORDER BY s.start_time
    `, [req.params.id]);
    const trips = await Promise.all(result.rows.map(async (t) => ({ ...t, progress: await getTripProgress(t.trip_id) })));
    res.json(trips);
  } catch (err) {
    next(err);
  }
});

export default router;
