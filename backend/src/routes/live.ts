// Public, read-only overview of the whole network for the /live page: every route
// with its stops in order and its road path, and every running or paused trip with its bus position
// and the server's progress (stops passed, delay, ETAs). Nothing personal.
import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/db';
import { getTripProgress } from '../services/tripProgress';
import { getRoutePathWithin } from '../services/routeGeometry';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const routes = await pool.query(`
      SELECT r.route_id, r.route_no, r.route_name, r.geometry, r.geometry_key,
             COALESCE(json_agg(json_build_object(
               'stop_id', st.stop_id, 'stop_name', st.stop_name,
               'latitude', st.latitude, 'longitude', st.longitude,
               'stop_sequence', rs.stop_sequence
             ) ORDER BY rs.stop_sequence) FILTER (WHERE st.stop_id IS NOT NULL), '[]') AS stops
      FROM routes r
      LEFT JOIN route_stops rs ON rs.route_id = r.route_id
      LEFT JOIN stops st ON st.stop_id = rs.stop_id
      GROUP BY r.route_id
      ORDER BY r.route_no
    `);
    // Road path per route (stored; fetched from OSRM only when the stops change).
    // Never hold the page up for more than a few seconds on a first fetch.
    const routesOut = await Promise.all(routes.rows.map(async ({ geometry, geometry_key, ...r }) => ({
      ...r,
      path: await getRoutePathWithin(4000, r.route_id, r.stops, { geometry, geometry_key }),
    })));

    const trips = await pool.query(`
      SELECT t.trip_id, t.status, s.route_id, s.start_time,
             json_build_object(
               'bus_id', b.bus_id, 'bus_no', b.bus_no,
               'latitude', b.current_latitude, 'longitude', b.current_longitude,
               'speed_kmh', b.current_speed_kmh, 'last_updated', b.last_updated
             ) AS bus
      FROM trips t
      JOIN schedules s ON s.schedule_id = t.schedule_id
      JOIN buses b ON b.bus_id = t.bus_id
      WHERE t.status IN ('En Route', 'Paused')
      ORDER BY s.start_time
    `);
    const withProgress = await Promise.all(
      trips.rows.map(async (t) => ({ ...t, progress: await getTripProgress(t.trip_id) }))
    );
    // Small and changes every few seconds; let browsers poll without caching it.
    res.setHeader('Cache-Control', 'no-store');
    res.json({ generated_at: new Date().toISOString(), routes: routesOut, trips: withProgress });
  } catch (err) {
    next(err);
  }
});

export default router;
