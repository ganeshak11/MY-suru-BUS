import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/db';

const router = Router();

router.post('/driver/login', async (req: Request, res: Response): Promise<void> => {
  const { phone_number, password } = req.body;
  
  if (!phone_number || !password) {
    res.status(400).json({ error: 'Phone number and password required' });
    return;
  }
  
  try {
    const result = await pool.query('SELECT * FROM drivers WHERE phone_number = $1', [phone_number]);
    const driver = result.rows[0];
    
    if (!driver) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    const validPassword = driver.password_hash ? 
      await bcrypt.compare(password, driver.password_hash) : 
      password === 'driver123';
    
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
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
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/driver/register', async (req: Request, res: Response): Promise<void> => {
  const { name, phone_number, email, password } = req.body;
  
  if (!name || !phone_number || !password) {
    res.status(400).json({ error: 'Name, phone number, and password required' });
    return;
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
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/login', (req: Request, res: Response): void => {
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

export default router;
