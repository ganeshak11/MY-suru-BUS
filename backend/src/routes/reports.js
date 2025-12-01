const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Get all reports
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  
  db.all('SELECT * FROM passenger_reports ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
  
  db.close();
});

// Create report
router.post('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { report_type, message, trip_id, bus_id, driver_id, route_id } = req.body;
  
  db.run(
    `INSERT INTO passenger_reports (report_type, message, trip_id, bus_id, driver_id, route_id) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [report_type, message, trip_id, bus_id, driver_id, route_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ 
        message: 'Report created', 
        report_id: this.lastID 
      });
    }
  );
  
  db.close();
});

// Update report status
router.patch('/:id/status', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { status } = req.body;
  
  db.run(
    'UPDATE passenger_reports SET status = ? WHERE report_id = ?',
    [status, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Report status updated' });
    }
  );
  
  db.close();
});

module.exports = router;