import { Router, Request, Response } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';

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

router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_id, start_time } = req.body;
    const result = await pool.query(
      'INSERT INTO schedules (route_id, start_time) VALUES ($1, $2) RETURNING *',
      [route_id, start_time]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { route_id, start_time } = req.body;
    const result = await pool.query(
      'UPDATE schedules SET route_id = $1, start_time = $2 WHERE schedule_id = $3 RETURNING *',
      [route_id, start_time, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM trips WHERE schedule_id = $1', [req.params.id]);
    await client.query('DELETE FROM schedules WHERE schedule_id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

export default router;
