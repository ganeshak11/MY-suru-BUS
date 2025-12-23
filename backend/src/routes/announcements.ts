import { Router, Request, Response } from 'express';
import pool from '../database/db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message required' });
      return;
    }
    
    const result = await pool.query(
      'INSERT INTO announcements (title, message) VALUES ($1, $2) RETURNING announcement_id',
      [title, message]
    );
    res.status(201).json({ message: 'Announcement created', announcement_id: result.rows[0].announcement_id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
