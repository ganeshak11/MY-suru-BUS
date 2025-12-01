const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Get all stops
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM stops', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
  
  db.close();
});

// Search stops by name
router.get('/search/:query', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all(
    'SELECT * FROM stops WHERE stop_name LIKE ?',
    [`%${req.params.query}%`],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
  
  db.close();
});

module.exports = router;