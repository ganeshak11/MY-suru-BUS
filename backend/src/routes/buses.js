const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Get all buses
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM buses', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
  
  db.close();
});

// Get bus by ID
router.get('/:id', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT * FROM buses WHERE bus_id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    res.json(row);
  });
  
  db.close();
});

// Update bus location
router.post('/:id/location', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { latitude, longitude, speed } = req.body;
  
  db.run(
    `UPDATE buses SET 
      current_latitude = ?, 
      current_longitude = ?, 
      current_speed_kmh = ?,
      last_updated = datetime('now')
    WHERE bus_id = ?`,
    [latitude, longitude, speed, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Location updated', changes: this.changes });
    }
  );
  
  db.close();
});

module.exports = router;