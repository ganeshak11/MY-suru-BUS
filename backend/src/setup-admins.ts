/**
 * Setup script: ensures `admins` table has a `password_hash` column and seeds
 * a seed admin from ADMIN_EMAIL / ADMIN_PASSWORD env vars if none exists.
 *
 * Usage:  npx ts-node src/setup-admins.ts
 */
import pool from './database/db';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function setupAdmins() {
  try {
    // 1. Add password_hash column if missing
    const colCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admins' AND column_name = 'password_hash'
    `);
    if (colCheck.rows.length === 0) {
      console.log('Adding password_hash column to admins table...');
      await pool.query('ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');
      console.log('password_hash column added.');
    } else {
      console.log('password_hash column already exists.');
    }

    // 2. Seed a default admin if the table is empty
    const existing = await pool.query('SELECT COUNT(*) FROM admins');
    if (parseInt(existing.rows[0].count, 10) === 0) {
      const email = process.env.ADMIN_EMAIL;
      const password = process.env.ADMIN_PASSWORD;
      const name = process.env.ADMIN_NAME || 'System Admin';

      if (!email || !password) {
        console.warn(
          'No admins found in DB. Set ADMIN_EMAIL and ADMIN_PASSWORD env vars to seed the first admin.'
        );
        process.exit(0);
      }

      const password_hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO admins (name, email, password_hash, auth_user_id)
         VALUES ($1, $2, $3, gen_random_uuid())
         ON CONFLICT (email) DO NOTHING`,
        [name, email, password_hash]
      );
      console.log(`Seeded admin: ${email}`);
    } else {
      console.log('Admin(s) already exist in DB — skipping seed.');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('Error during admin setup:', error.message);
    process.exit(1);
  }
}

setupAdmins();
