// Import data from Supabase to SQLite backend
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function importTable(tableName, columns) {
  console.log(`\n📥 Importing ${tableName}...`);
  
  const { data, error } = await supabase.from(tableName).select('*');
  
  if (error) {
    console.error(`❌ Error fetching ${tableName}:`, error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️  No data in ${tableName}`);
    return;
  }
  
  console.log(`   Found ${data.length} rows`);
  
  // Clear existing data
  db.run(`DELETE FROM ${tableName}`);
  
  // Insert data
  const placeholders = columns.map(() => '?').join(',');
  const stmt = db.prepare(`INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);
  
  data.forEach(row => {
    const values = columns.map(col => row[col]);
    stmt.run(values);
  });
  
  stmt.finalize();
  console.log(`✅ Imported ${data.length} rows into ${tableName}`);
}

async function main() {
  console.log('🚀 Starting Supabase to SQLite import...\n');
  
  try {
    // Import in order (respecting foreign keys)
    await importTable('routes', ['route_id', 'route_name', 'route_no']);
    await importTable('stops', ['stop_id', 'stop_name', 'latitude', 'longitude', 'geofence_radius_meters']);
    await importTable('route_stops', ['route_stop_id', 'route_id', 'stop_id', 'stop_sequence', 'time_offset_from_start']);
    await importTable('buses', ['bus_id', 'bus_no', 'current_latitude', 'current_longitude', 'last_updated', 'current_trip_id', 'current_speed_kmh']);
    await importTable('drivers', ['driver_id', 'name', 'email', 'phone_number', 'profile_photo_url']);
    await importTable('schedules', ['schedule_id', 'route_id', 'start_time']);
    await importTable('trips', ['trip_id', 'schedule_id', 'bus_id', 'driver_id', 'trip_date', 'status']);
    await importTable('trip_stop_times', ['trip_stop_id', 'trip_id', 'stop_id', 'actual_arrival_time', 'actual_departure_time', 'predicted_arrival_time']);
    await importTable('announcements', ['announcement_id', 'title', 'message', 'created_at']);
    await importTable('passenger_reports', ['report_id', 'report_type', 'message', 'status', 'trip_id', 'bus_id', 'driver_id', 'route_id', 'created_at']);
    
    console.log('\n✅ Import completed successfully!');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
  } finally {
    db.close();
  }
}

main();
