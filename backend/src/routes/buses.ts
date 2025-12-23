import { Router, Request, Response } from 'express';
import pool from '../database/db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM buses');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM buses WHERE bus_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Bus not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:id/location', async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, speed } = req.body;
    const result = await pool.query(
      `UPDATE buses SET 
        current_latitude = $1, 
        current_longitude = $2, 
        current_speed_kmh = $3,
        last_updated = NOW()
      WHERE bus_id = $4
      RETURNING *`,
      [latitude, longitude, speed, req.params.id]
    );
    res.json({ message: 'Location updated', bus: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
