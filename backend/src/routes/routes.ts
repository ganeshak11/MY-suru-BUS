import { Router, Request, Response } from 'express';
import pool from '../database/db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM routes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
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

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
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

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const routeId = req.params.id;
    const schedulesResult = await pool.query('SELECT schedule_id FROM schedules WHERE route_id = $1', [routeId]);
    const scheduleIds = schedulesResult.rows.map(s => s.schedule_id);
    
    if (scheduleIds.length > 0) {
      await pool.query('DELETE FROM trips WHERE schedule_id = ANY($1)', [scheduleIds]);
    }
    
    await pool.query('DELETE FROM schedules WHERE route_id = $1', [routeId]);
    await pool.query('DELETE FROM route_stops WHERE route_id = $1', [routeId]);
    await pool.query('DELETE FROM routes WHERE route_id = $1', [routeId]);
    
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const routeId = req.params.id;
    
    const routeResult = await pool.query('SELECT * FROM routes WHERE route_id = $1', [routeId]);
    
    if (routeResult.rows.length === 0) {
      res.status(404).json({ error: 'Route not found' });
      return;
    }
    
    const stopsResult = await pool.query(`
      SELECT s.*, rs.stop_sequence, rs.time_offset_from_start
      FROM stops s
      JOIN route_stops rs ON s.stop_id = rs.stop_id
      WHERE rs.route_id = $1
      ORDER BY rs.stop_sequence
    `, [routeId]);
    
    res.json({
      ...routeResult.rows[0],
      stops: stopsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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

export default router;
