import { Router, Request, Response } from 'express';
import pool from '../database/db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT s.schedule_id, s.start_time, s.route_id, r.route_name
      FROM schedules s
      LEFT JOIN routes r ON s.route_id = r.route_id
      ORDER BY r.route_name, s.start_time
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
