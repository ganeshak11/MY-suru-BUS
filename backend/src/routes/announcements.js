const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get all announcements
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create announcement (admin only)
router.post('/', async (req, res) => {
  try {
    const { title, message } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }
    
    const result = await pool.query(
      'INSERT INTO announcements (title, message) VALUES ($1, $2) RETURNING announcement_id',
      [title, message]
    );
    res.status(201).json({ message: 'Announcement created', announcement_id: result.rows[0].announcement_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;