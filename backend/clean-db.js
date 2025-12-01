// Clean and Reset Database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');

console.log('🗑️  Cleaning database...\n');

// Delete existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Old database deleted');
} else {
  console.log('ℹ️  No existing database found');
}

console.log('✅ Database cleaned!\n');
console.log('Now run: npm run init-db');
