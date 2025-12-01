const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Get all trips
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all(`
    SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name
    FROM trips t
    LEFT JOIN buses b ON t.bus_id = b.bus_id
    LEFT JOIN drivers d ON t.driver_id = d.driver_id
    LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
    LEFT JOIN routes r ON s.route_id = r.route_id
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
  
  db.close();
});

// Get trip by ID
router.get('/:id', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.get(`
    SELECT t.*, b.bus_no, d.name as driver_name, s.start_time, r.route_name, r.route_id
    FROM trips t
    LEFT JOIN buses b ON t.bus_id = b.bus_id
    LEFT JOIN drivers d ON t.driver_id = d.driver_id
    LEFT JOIN schedules s ON t.schedule_id = s.schedule_id
    LEFT JOIN routes r ON s.route_id = r.route_id
    WHERE t.trip_id = ?
  `, [req.params.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  });
  
  db.close();
});

// Update trip status
router.patch('/:id/status', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { status } = req.body;
  
  db.run(
    'UPDATE trips SET status = ? WHERE trip_id = ?',
    [status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Status updated', changes: this.changes });
    }
  );
  
  db.close();
});

module.exports = router;