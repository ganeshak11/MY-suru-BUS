const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Get all routes
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM routes', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
  
  db.close();
});

// Get route by ID with stops
router.get('/:id', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const routeId = req.params.id;
  
  // Get route details
  db.get('SELECT * FROM routes WHERE route_id = ?', [routeId], (err, route) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Get route stops
    db.all(`
      SELECT s.*, rs.stop_sequence, rs.time_offset_from_start
      FROM stops s
      JOIN route_stops rs ON s.stop_id = rs.stop_id
      WHERE rs.route_id = ?
      ORDER BY rs.stop_sequence
    `, [routeId], (err, stops) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        ...route,
        stops: stops
      });
    });
  });
  
  db.close();
});

// Search routes by source and destination
router.get('/search/:source/:destination', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { source, destination } = req.params;
  
  db.all(`
    SELECT DISTINCT r.*, 
           src_stop.stop_name as source_stop,
           dest_stop.stop_name as destination_stop
    FROM routes r
    JOIN route_stops rs1 ON r.route_id = rs1.route_id
    JOIN stops src_stop ON rs1.stop_id = src_stop.stop_id
    JOIN route_stops rs2 ON r.route_id = rs2.route_id
    JOIN stops dest_stop ON rs2.stop_id = dest_stop.stop_id
    WHERE src_stop.stop_name LIKE ? 
    AND dest_stop.stop_name LIKE ?
    AND rs1.stop_sequence < rs2.stop_sequence
  `, [`%${source}%`, `%${destination}%`], (err, routes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(routes);
  });
  
  db.close();
});

module.exports = router;