import { Router, Request, Response } from 'express';
import pool from '../database/db';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      res.status(400).json({ error: 'Title and message required' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO announcements (title, message) VALUES ($1, $2) RETURNING *',
      [title, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// CRIT-01: these two routes were completely missing
router.put('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message } = req.body;

    if (!title || !message) {
      res.status(400).json({ error: 'Title and message required' });
      return;
    }

    const result = await pool.query(
      'UPDATE announcements SET title = $1, message = $2 WHERE announcement_id = $3 RETURNING *',
      [title, message, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM announcements WHERE announcement_id = $1 RETURNING announcement_id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
