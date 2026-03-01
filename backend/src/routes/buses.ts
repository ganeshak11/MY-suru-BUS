import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/db';
import { validateBus } from '../middleware/validate';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { io } from '../app';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // DB-06: Pagination — buses are bounded but paginate for safety
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const offset = parseInt(req.query.offset as string) || 0;
  try {
    const result = await pool.query(`
      SELECT
        b.*,
        COALESCE(json_agg(json_build_object('count', report_count.cnt)) FILTER (WHERE report_count.cnt IS NOT NULL), '[]') as passenger_reports
      FROM buses b
      LEFT JOIN (
        SELECT bus_id, COUNT(*)::int as cnt
        FROM passenger_reports
        GROUP BY bus_id
      ) report_count ON b.bus_id = report_count.bus_id
      GROUP BY b.bus_id
      ORDER BY b.bus_no
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM buses WHERE bus_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticateToken, requireAdmin, validateBus, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bus_no } = req.body;
    const result = await pool.query(
      'INSERT INTO buses (bus_no) VALUES ($1) RETURNING *',
      [bus_no]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticateToken, requireAdmin, validateBus, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bus_no } = req.body;
    const result = await pool.query(
      'UPDATE buses SET bus_no = $1 WHERE bus_id = $2 RETURNING *',
      [bus_no, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// MED-S02: Catch FK constraint violation gracefully instead of leaking Postgres error
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pool.query('DELETE FROM buses WHERE bus_id = $1', [req.params.id]);
    res.json({ message: 'Bus deleted' });
  } catch (err: any) {
    // Postgres FK violation error code
    if (err.code === '23503') {
      res.status(409).json({ error: 'Cannot delete bus: it is assigned to one or more trips. Remove the trip assignments first.' });
      return;
    }
    next(err);
  }
});

router.post('/:id/location', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // HIGH-S03: Validate GPS bounds — reject malicious or corrupt coordinates
  const { latitude, longitude, speed, gps_timestamp } = req.body;
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const spd = speed !== undefined ? parseFloat(speed) : null;

  if (isNaN(lat) || lat < -90 || lat > 90) {
    res.status(400).json({ error: 'Invalid latitude: must be between -90 and 90' });
    return;
  }
  if (isNaN(lon) || lon < -180 || lon > 180) {
    res.status(400).json({ error: 'Invalid longitude: must be between -180 and 180' });
    return;
  }
  if (spd !== null && (isNaN(spd) || spd < 0 || spd > 300)) {
    res.status(400).json({ error: 'Invalid speed: must be between 0 and 300 km/h' });
    return;
  }

  // DB-07: Use device GPS timestamp if provided (preserves actual fix time across connectivity gaps).
  // Fall back to NOW() if not provided or invalid.
  let lastUpdated: Date | string = 'NOW()';
  if (gps_timestamp) {
    const parsed = new Date(gps_timestamp);
    if (!isNaN(parsed.getTime())) lastUpdated = parsed;
  }

  const busId = req.params.id;
  try {
    const result = await pool.query(
      `UPDATE buses SET
        current_latitude = $1,
        current_longitude = $2,
        current_speed_kmh = $3,
        last_updated = $4
      WHERE bus_id = $5
      RETURNING *`,
      [lat, lon, spd, lastUpdated === 'NOW()' ? new Date() : lastUpdated, busId]
    );
    try {
      io.to(`bus-${busId}`).emit('bus-location', {
        busId: Number(busId),
        latitude: lat,
        longitude: lon,
        speed: spd,
        timestamp: lastUpdated === 'NOW()' ? new Date().toISOString() : (lastUpdated as Date).toISOString(),
      });
    } catch (_e) { /* socket emit is non-critical */ }
    res.json({ message: 'Location updated', bus: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
