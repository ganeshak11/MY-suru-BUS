// Database Inspection Tool
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 MY(suru) BUS Database Inspector\n');
console.log('='.repeat(60));

const tables = ['routes', 'stops', 'route_stops', 'buses', 'drivers', 'schedules', 'trips', 'trip_stop_times'];

function inspectTable(tableName) {
  return new Promise((resolve) => {
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.log(`\n❌ Error reading ${tableName}:`, err.message);
        resolve();
        return;
      }
      
      console.log(`\n📊 Table: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(60));
      
      if (rows.length === 0) {
        console.log('   (empty)');
      } else {
        console.log(`   Records: ${rows.length}`);
        console.log('   Sample data:');
        rows.slice(0, 3).forEach((row, idx) => {
          console.log(`   ${idx + 1}.`, JSON.stringify(row, null, 2).replace(/\n/g, '\n      '));
        });
        if (rows.length > 3) {
          console.log(`   ... and ${rows.length - 3} more records`);
        }
      }
      
      resolve();
    });
  });
}

async function inspectAll() {
  for (const table of tables) {
    await inspectTable(table);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Database inspection complete!\n');
  db.close();
}

inspectAll();
