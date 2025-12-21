const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get all routes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM routes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get route by ID with stops
router.get('/:id', async (req, res) => {
  try {
    const routeId = req.params.id;
    
    const routeResult = await pool.query('SELECT * FROM routes WHERE route_id = $1', [routeId]);
    
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
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
    res.status(500).json({ error: err.message });
  }
});

// Search routes by source and destination
router.get('/search/:source/:destination', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;