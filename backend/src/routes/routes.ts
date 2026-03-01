import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';

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

router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_name, route_no } = req.body;
    const result = await pool.query(
      'INSERT INTO routes (route_name, route_no) VALUES ($1, $2) RETURNING *',
      [route_name, route_no]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_name, route_no } = req.body;
    const result = await pool.query(
      'UPDATE routes SET route_name = $1, route_no = $2 WHERE route_id = $3 RETURNING *',
      [route_name, route_no, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const client = await pool.connect();
  try {
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
    await client.query('DELETE FROM routes WHERE route_id = $1', [routeId]);
    await client.query('COMMIT');
    res.json({ message: 'Route deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.get('/:id/stops', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT s.*, rs.stop_sequence, rs.time_offset_from_start
      FROM stops s
      JOIN route_stops rs ON s.stop_id = rs.stop_id
      WHERE rs.route_id = $1
      ORDER BY rs.stop_sequence
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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

router.get('/search/:source/:destination', async (req: Request, res: Response): Promise<void> => {
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
    `, [`%${source}%`, `%${destination}%`]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CRIT-10: Efficient single-query endpoint — replaces N+1 passenger getAllTrips+getAllBuses
router.get('/:id/active-trips', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        t.trip_id,
        t.status,
        t.trip_date,
        -- Nest bus data so frontend can access it as t.bus
        json_build_object(
          'bus_id',            b.bus_id,
          'bus_no',            b.bus_no,
          'current_latitude',  b.current_latitude,
          'current_longitude', b.current_longitude,
          'current_speed_kmh', b.current_speed_kmh,
          'last_updated',      b.last_updated
        ) AS bus
      FROM trips t
      JOIN schedules s ON t.schedule_id = s.schedule_id
      JOIN buses b ON t.bus_id = b.bus_id
      WHERE s.route_id = $1
        AND t.status = 'En Route'
        AND b.current_latitude IS NOT NULL
        AND b.current_longitude IS NOT NULL
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
