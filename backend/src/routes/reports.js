const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get all reports
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM passenger_reports ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create report
router.post('/', async (req, res) => {
  try {
    const { report_type, message, trip_id, bus_id, driver_id, route_id } = req.body;
    const result = await pool.query(
      `INSERT INTO passenger_reports (report_type, message, trip_id, bus_id, driver_id, route_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING report_id`,
      [report_type, message, trip_id, bus_id, driver_id, route_id]
    );
    res.status(201).json({ message: 'Report created', report_id: result.rows[0].report_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update report status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE passenger_reports SET status = $1 WHERE report_id = $2', [status, req.params.id]);
    res.json({ message: 'Report status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;