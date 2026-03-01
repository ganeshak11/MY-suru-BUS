/**
 * One-time admin setup script.
 * Usage: npx ts-node -r dotenv/config src/create-admin.ts
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD as env vars or edit below.
 */
import pool from './database/db';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@mybus.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
  const name = process.env.ADMIN_NAME || 'Admin';

  try {
    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO admins (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name          = EXCLUDED.name
       RETURNING admin_id, name, email`,
      [name, email, password_hash]
    );

    console.log('✅ Admin upserted:');
    console.log('   Admin ID :', result.rows[0].admin_id);
    console.log('   Email    :', result.rows[0].email);
    console.log('   Name     :', result.rows[0].name);
    console.log('   Password :', password, ' ← change this after first login!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
