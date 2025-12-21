const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get all buses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buses');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get bus by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buses WHERE bus_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update bus location
router.post('/:id/location', async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;