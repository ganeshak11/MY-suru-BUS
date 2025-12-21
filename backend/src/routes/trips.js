const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get all trips
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name, r.route_id
      FROM trips t
      LEFT JOIN buses b ON t.bus_id = b.bus_id
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trip by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name, r.route_id
      FROM trips t
      LEFT JOIN buses b ON t.bus_id = b.bus_id
      LEFT JOIN drivers d ON t.driver_id = d.driver_id
      LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
      LEFT JOIN routes r ON s.route_id = r.route_id
      WHERE t.trip_id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update trip status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE trips SET status = $1 WHERE trip_id = $2', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start trip
router.post('/:id/start', async (req, res) => {
  try {
    await pool.query("UPDATE trips SET status = 'In Progress' WHERE trip_id = $1", [req.params.id]);
    res.json({ message: 'Trip started', trip_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause trip
router.patch('/:id/pause', async (req, res) => {
  try {
    await pool.query("UPDATE trips SET status = 'Paused' WHERE trip_id = $1", [req.params.id]);
    res.json({ message: 'Trip paused' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resume trip
router.patch('/:id/resume', async (req, res) => {
  try {
    await pool.query("UPDATE trips SET status = 'In Progress' WHERE trip_id = $1", [req.params.id]);
    res.json({ message: 'Trip resumed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete trip
router.post('/:id/complete', async (req, res) => {
  try {
    await pool.query("UPDATE trips SET status = 'Completed' WHERE trip_id = $1", [req.params.id]);
    res.json({ message: 'Trip completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark stop arrival
router.post('/:id/stops/:stopId/arrive', async (req, res) => {
  try {
    const { id: tripId, stopId } = req.params;
    const result = await pool.query(
      `INSERT INTO trip_stop_times (trip_id, stop_id, actual_arrival_time) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (trip_id, stop_id) DO UPDATE SET actual_arrival_time = NOW()
       RETURNING trip_stop_id`,
      [tripId, stopId]
    );
    res.json({ message: 'Stop arrival recorded', trip_stop_id: result.rows[0].trip_stop_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trip stops with times
router.get('/:id/stops', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, rs.stop_sequence, rs.time_offset_from_start, 
             tst.actual_arrival_time, tst.actual_departure_time
      FROM stops s
      JOIN route_stops rs ON s.stop_id = rs.stop_id
      JOIN schedules sch ON rs.route_id = sch.route_id
      JOIN trips t ON sch.schedule_id = t.schedule_id
      LEFT JOIN trip_stop_times tst ON tst.trip_id = t.trip_id AND tst.stop_id = s.stop_id
      WHERE t.trip_id = $1
      ORDER BY rs.stop_sequence
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;