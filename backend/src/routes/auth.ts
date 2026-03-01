import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/db';
import { JWT_SECRET } from '../middleware/auth';
import { logger } from '../logger';

const router = Router();

// CRIT-S03: POST /driver/register REMOVED — drivers are created by admins via POST /api/drivers.
// An open self-registration endpoint allowed anyone to create a driver account and get a valid JWT.

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

    if (!driver.password_hash) {
      res.status(401).json({ error: 'Account not activated. Contact your admin for credentials.' });
      return;
    }

    const validPassword = await bcrypt.compare(password, driver.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // HIGH-S04: Reduced from 7d to 24h. For long-lived sessions, implement refresh tokens.
    const token = jwt.sign(
      { driver_id: driver.driver_id, role: 'driver' },
      JWT_SECRET!,
      { expiresIn: '24h' }
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
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];

    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // MIN-S01: admins table must have a password_hash column.
    // Run in Supabase SQL editor:
    //   ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash text;
    // Then set a password for your admin row:
    //   UPDATE admins SET password_hash = crypt('YourPassword', gen_salt('bf')) WHERE email = 'admin@mybus.com';
    // OR use the /api/admin/setup-password endpoint below (one-time use).
    const validPassword = admin.password_hash
      ? await bcrypt.compare(password, admin.password_hash)
      : false;

    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // HIGH-S04: Reduced from 7d to 24h.
    const token = jwt.sign(
      { admin_id: admin.admin_id, role: 'admin' },
      JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({ token, admin: { admin_id: admin.admin_id, email: admin.email, name: admin.name } });
  } catch (err: any) {
    logger.error({ err }, 'Admin login error');
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Login failed' : err.message,
    });
  }
});

export default router;
