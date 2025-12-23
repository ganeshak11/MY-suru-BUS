import pool from './database/db';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    const email = 'admin@mysurubus.com';
    const password = 'admin123';
    const name = 'Admin User';
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const existing = await pool.query('SELECT admin_id FROM admins WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      await pool.query('UPDATE admins SET password = $1, name = $2 WHERE email = $3', [hashedPassword, name, email]);
      console.log('Admin user updated!');
    } else {
      await pool.query('ALTER TABLE admins ALTER COLUMN auth_user_id DROP NOT NULL');
      const result = await pool.query(
        'INSERT INTO admins (email, password, name, auth_user_id) VALUES ($1, $2, $3, NULL) RETURNING admin_id',
        [email, hashedPassword, name]
      );
      console.log('Admin user created!');
      console.log('Admin ID:', result.rows[0].admin_id);
    }
    
    console.log('Email:', email);
    console.log('Password:', password);
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
