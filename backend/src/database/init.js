const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Create tables
const createTables = () => {
  db.serialize(() => {
    // Routes table
    db.run(`CREATE TABLE IF NOT EXISTS routes (
      route_id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_name TEXT NOT NULL,
      route_no TEXT
    )`);

    // Stops table
    db.run(`CREATE TABLE IF NOT EXISTS stops (
      stop_id INTEGER PRIMARY KEY AUTOINCREMENT,
      stop_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      geofence_radius_meters INTEGER DEFAULT 50
    )`);

    // Route stops table
    db.run(`CREATE TABLE IF NOT EXISTS route_stops (
      route_stop_id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      stop_id INTEGER NOT NULL,
      stop_sequence INTEGER NOT NULL,
      time_offset_from_start INTEGER,
      FOREIGN KEY (route_id) REFERENCES routes(route_id),
      FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
    )`);

    // Buses table
    db.run(`CREATE TABLE IF NOT EXISTS buses (
      bus_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bus_no TEXT NOT NULL UNIQUE,
      current_latitude REAL,
      current_longitude REAL,
      last_updated DATETIME,
      current_trip_id INTEGER,
      current_speed_kmh REAL
    )`);

    // Drivers table
    db.run(`CREATE TABLE IF NOT EXISTS drivers (
      driver_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone_number TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      profile_photo_url TEXT
    )`);

    // Schedules table
    db.run(`CREATE TABLE IF NOT EXISTS schedules (
      schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      FOREIGN KEY (route_id) REFERENCES routes(route_id)
    )`);

    // Trips table
    db.run(`CREATE TABLE IF NOT EXISTS trips (
      trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      bus_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      trip_date DATE NOT NULL,
      status TEXT DEFAULT 'Scheduled',
      FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id),
      FOREIGN KEY (bus_id) REFERENCES buses(bus_id),
      FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
    )`);

    // Trip stop times table
    db.run(`CREATE TABLE IF NOT EXISTS trip_stop_times (
      trip_stop_id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      stop_id INTEGER NOT NULL,
      actual_arrival_time DATETIME,
      actual_departure_time DATETIME,
      predicted_arrival_time DATETIME,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
      FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
    )`);

    console.log('✅ Database tables created successfully!');
  });
};

// Insert sample data
const insertSampleData = () => {
  db.serialize(() => {
    // Sample routes
    db.run(`INSERT OR IGNORE INTO routes (route_id, route_name, route_no) VALUES 
      (1, 'City Center to Airport', '150A'),
      (2, 'University to Mall', '201B')`);

    // Sample stops
    db.run(`INSERT OR IGNORE INTO stops (stop_id, stop_name, latitude, longitude) VALUES 
      (1, 'City Center', 12.2958, 76.6394),
      (2, 'Main Street', 12.3000, 76.6450),
      (3, 'Airport', 12.3200, 76.6800),
      (4, 'University Gate', 12.2800, 76.6200),
      (5, 'Shopping Mall', 12.2900, 76.6300)`);

    // Sample route stops
    db.run(`INSERT OR IGNORE INTO route_stops (route_id, stop_id, stop_sequence, time_offset_from_start) VALUES 
      (1, 1, 1, 0),
      (1, 2, 2, 15),
      (1, 3, 3, 45),
      (2, 4, 1, 0),
      (2, 5, 2, 20)`);

    // Sample buses
    db.run(`INSERT OR IGNORE INTO buses (bus_id, bus_no) VALUES 
      (1, '150A-01'),
      (2, '201B-01')`);

    // Sample drivers
    db.run(`INSERT OR IGNORE INTO drivers (driver_id, name, phone_number) VALUES 
      (1, 'John Driver', '+91-9876543210'),
      (2, 'Jane Driver', '+91-9876543211')`);

    console.log('✅ Sample data inserted successfully!');
  });
};

if (require.main === module) {
  createTables();
  insertSampleData();
  db.close();
}

module.exports = { db, createTables, insertSampleData };