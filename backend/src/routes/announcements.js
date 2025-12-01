const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Get all announcements
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM announcements ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
  
  db.close();
});

// Create announcement (admin only)
router.post('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { title, message } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message required' });
  }
  
  db.run(
    'INSERT INTO announcements (title, message) VALUES (?, ?)',
    [title, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ 
        message: 'Announcement created', 
        announcement_id: this.lastID 
      });
    }
  );
  
  db.close();
});

module.exports = router;