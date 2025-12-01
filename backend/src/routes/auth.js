const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../../database.sqlite');

// Driver Login
router.post('/driver/login', (req, res) => {
  const { phone_number, password } = req.body;
  
  if (!phone_number || !password) {
    return res.status(400).json({ error: 'Phone number and password required' });
  }
  
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT * FROM drivers WHERE phone_number = ?', [phone_number], async (err, driver) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!driver) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = driver.password_hash ? 
      await bcrypt.compare(password, driver.password_hash) : 
      password === 'driver123'; // Default password for demo
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { driver_id: driver.driver_id, role: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      driver: {
        driver_id: driver.driver_id,
        name: driver.name,
        phone_number: driver.phone_number,
        email: driver.email
      }
    });
  });
  
  db.close();
});

// Driver Register
router.post('/driver/register', async (req, res) => {
  const { name, phone_number, email, password } = req.body;
  
  if (!name || !phone_number || !password) {
    return res.status(400).json({ error: 'Name, phone number, and password required' });
  }
  
  const db = new sqlite3.Database(dbPath);
  
  // Hash password
  const password_hash = await bcrypt.hash(password, 10);
  
  db.run(
    'INSERT INTO drivers (name, phone_number, email, password_hash) VALUES (?, ?, ?, ?)',
    [name, phone_number, email, password_hash],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Phone number already registered' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      // Generate JWT
      const token = jwt.sign(
        { driver_id: this.lastID, role: 'driver' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      res.status(201).json({
        token,
        driver: {
          driver_id: this.lastID,
          name,
          phone_number,
          email
        }
      });
    }
  );
  
  db.close();
});

// Admin Login (simple for demo)
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple admin check (in production, use database)
  if (email === 'admin@mysurubus.com' && password === 'admin123') {
    const token = jwt.sign(
      { admin_id: 1, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      admin: { admin_id: 1, email }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;