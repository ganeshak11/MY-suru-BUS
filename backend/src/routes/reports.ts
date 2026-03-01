import { Router, Request, Response } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        pr.*,
        json_build_object('bus_no', b.bus_no) as buses,
        json_build_object('name', d.name) as drivers,
        json_build_object('route_name', r.route_name) as routes
      FROM passenger_reports pr
      LEFT JOIN buses b ON pr.bus_id = b.bus_id
      LEFT JOIN drivers d ON pr.driver_id = d.driver_id
      LEFT JOIN routes r ON pr.route_id = r.route_id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Passengers can POST reports anonymously; driver_id attached from JWT if available
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { report_type, message, trip_id, bus_id, driver_id, route_id } = req.body;
    const result = await pool.query(
      `INSERT INTO passenger_reports (report_type, message, trip_id, bus_id, driver_id, route_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING report_id`,
      [report_type, message, trip_id || null, bus_id || null, driver_id || null, route_id || null]
    );
    res.status(201).json({ message: 'Report created', report_id: result.rows[0].report_id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Only admins can update report status
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE passenger_reports SET status = $1 WHERE report_id = $2', [status, req.params.id]);
    res.json({ message: 'Report status updated' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
