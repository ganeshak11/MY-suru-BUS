import { Router, Request, Response, NextFunction } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateStop } from '../middleware/validate';

const router = Router();

// Public reads
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        s.*,
        COALESCE(json_agg(json_build_object('count', route_count.cnt)) FILTER (WHERE route_count.cnt IS NOT NULL), '[]') as route_stops
      FROM stops s
      LEFT JOIN (
        SELECT stop_id, COUNT(*)::int as cnt
        FROM route_stops
        GROUP BY stop_id
      ) route_count ON s.stop_id = route_count.stop_id
      GROUP BY s.stop_id
      ORDER BY s.stop_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CRIT-02: single stop by ID (was missing)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM stops WHERE stop_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/search/:query', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM stops WHERE stop_name ILIKE $1',
      [`%${req.params.query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/routes', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT r.route_id, r.route_name, r.route_no
      FROM routes r
      JOIN route_stops rs ON r.route_id = rs.route_id
      WHERE rs.stop_id = $1
      ORDER BY r.route_no
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CRIT-01: Admin-protected create / update / delete (were all missing)
router.post('/', authenticateToken, requireAdmin, validateStop, async (req: Request, res: Response): Promise<void> => {
  try {
    const { stop_name, latitude, longitude, geofence_radius_meters } = req.body;
    const result = await pool.query(
      `INSERT INTO stops (stop_name, latitude, longitude, geofence_radius_meters)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [stop_name.trim(), parseFloat(latitude), parseFloat(longitude), geofence_radius_meters || 50]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, validateStop, async (req: Request, res: Response): Promise<void> => {
  try {
    const { stop_name, latitude, longitude, geofence_radius_meters } = req.body;
    const result = await pool.query(
      `UPDATE stops
       SET stop_name = $1, latitude = $2, longitude = $3, geofence_radius_meters = $4
       WHERE stop_id = $5 RETURNING *`,
      [stop_name.trim(), parseFloat(latitude), parseFloat(longitude), geofence_radius_meters || 50, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Stop not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Remove stop from route_stops first (FK constraint)
    await client.query('DELETE FROM route_stops WHERE stop_id = $1', [req.params.id]);
    await client.query('DELETE FROM stops WHERE stop_id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Stop deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

export default router;
