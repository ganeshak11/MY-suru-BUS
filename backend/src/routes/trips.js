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

// Start trip
router.post('/:id/start', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.run(
    "UPDATE trips SET status = 'In Progress' WHERE trip_id = ?",
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Trip started', trip_id: req.params.id });
    }
  );
  
  db.close();
});

// Pause trip
router.patch('/:id/pause', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.run(
    "UPDATE trips SET status = 'Paused' WHERE trip_id = ?",
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Trip paused' });
    }
  );
  
  db.close();
});

// Resume trip
router.patch('/:id/resume', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.run(
    "UPDATE trips SET status = 'In Progress' WHERE trip_id = ?",
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Trip resumed' });
    }
  );
  
  db.close();
});

// Complete trip
router.post('/:id/complete', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.run(
    "UPDATE trips SET status = 'Completed' WHERE trip_id = ?",
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Trip completed' });
    }
  );
  
  db.close();
});

// Mark stop arrival
router.post('/:id/stops/:stopId/arrive', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { tripId, stopId } = { tripId: req.params.id, stopId: req.params.stopId };
  
  db.run(
    `INSERT OR REPLACE INTO trip_stop_times (trip_id, stop_id, actual_arrival_time) 
     VALUES (?, ?, datetime('now'))`,
    [tripId, stopId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Stop arrival recorded', trip_stop_id: this.lastID });
    }
  );
  
  db.close();
});

// Get trip stops with times
router.get('/:id/stops', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all(`
    SELECT s.*, rs.stop_sequence, rs.time_offset_from_start, 
           tst.actual_arrival_time, tst.actual_departure_time
    FROM stops s
    JOIN route_stops rs ON s.stop_id = rs.stop_id
    JOIN schedules sch ON rs.route_id = sch.route_id
    JOIN trips t ON sch.schedule_id = t.schedule_id
    LEFT JOIN trip_stop_times tst ON tst.trip_id = t.trip_id AND tst.stop_id = s.stop_id
    WHERE t.trip_id = ?
    ORDER BY rs.stop_sequence
  `, [req.params.id], (err, stops) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(stops);
  });
  
  db.close();
});

module.exports = router;