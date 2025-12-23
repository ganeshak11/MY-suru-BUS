import pool from './database/db';

async function setupAdminsTable() {
  try {
    // Check if password column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' AND column_name = 'password'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Adding password column to admins table...');
      await pool.query('ALTER TABLE admins ADD COLUMN password VARCHAR(255)');
      console.log('Password column added');
    } else {
      console.log('Password column already exists');
    }
    
    // Check if email column exists
    const checkEmail = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' AND column_name = 'email'
    `);
    
    if (checkEmail.rows.length === 0) {
      console.log('Adding email column to admins table...');
      await pool.query('ALTER TABLE admins ADD COLUMN email VARCHAR(255) UNIQUE');
      console.log('Email column added');
    } else {
      console.log('Email column already exists');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupAdminsTable();
