const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');

const router = express.Router();

// Driver Login
router.post('/driver/login', async (req, res) => {
  const { phone_number, password } = req.body;
  
  if (!phone_number || !password) {
    return res.status(400).json({ error: 'Phone number and password required' });
  }
  
  try {
    const result = await pool.query('SELECT * FROM drivers WHERE phone_number = $1', [phone_number]);
    const driver = result.rows[0];
    
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
      process.env.JWT_SECRET || 'default-secret',
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Register
router.post('/driver/register', async (req, res) => {
  const { name, phone_number, email, password } = req.body;
  
  if (!name || !phone_number || !password) {
    return res.status(400).json({ error: 'Name, phone number, and password required' });
  }
  
  try {
    const password_hash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO drivers (name, phone_number, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING driver_id',
      [name, phone_number, email, password_hash]
    );
    
    const driver_id = result.rows[0].driver_id;
    
    const token = jwt.sign(
      { driver_id, role: 'driver' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      driver: { driver_id, name, phone_number, email }
    });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin Login
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@mysurubus.com' && password === 'admin123') {
    const token = jwt.sign(
      { admin_id: 1, role: 'admin' },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );
    
    res.json({ token, admin: { admin_id: 1, email } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;