const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get all stops
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stops');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search stops by name
router.get('/search/:query', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM stops WHERE stop_name ILIKE $1',
      [`%${req.params.query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;