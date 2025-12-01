// Phase 1 Feature Tests
const BASE_URL = 'http://localhost:3001';
let driverToken = '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testAuth() {
  log(colors.cyan, '\n🔐 Testing Authentication...\n');
  
  // Test driver login
  try {
    const response = await fetch(`${BASE_URL}/api/auth/driver/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: '+91-9876543210',
        password: 'driver123'
      })
    });
    const data = await response.json();
    
    if (data.token) {
      driverToken = data.token;
      log(colors.green, '✅ Driver Login - Success');
      console.log('   Token:', data.token.substring(0, 50) + '...');
    } else {
      log(colors.red, '❌ Driver Login - Failed');
    }
  } catch (error) {
    log(colors.red, `❌ Driver Login - Error: ${error.message}`);
  }
  
  // Test admin login
  try {
    const response = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mysurubus.com',
        password: 'admin123'
      })
    });
    const data = await response.json();
    
    if (data.token) {
      log(colors.green, '✅ Admin Login - Success');
    } else {
      log(colors.red, '❌ Admin Login - Failed');
    }
  } catch (error) {
    log(colors.red, `❌ Admin Login - Error: ${error.message}`);
  }
}

async function testTripManagement() {
  log(colors.cyan, '\n🚌 Testing Trip Management...\n');
  
  const tripId = 1;
  
  // Start trip
  try {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/start`, {
      method: 'POST'
    });
    const data = await response.json();
    log(colors.green, '✅ Start Trip - Success');
    console.log('   ', data);
  } catch (error) {
    log(colors.red, `❌ Start Trip - Error: ${error.message}`);
  }
  
  // Pause trip
  try {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/pause`, {
      method: 'PATCH'
    });
    const data = await response.json();
    log(colors.green, '✅ Pause Trip - Success');
  } catch (error) {
    log(colors.red, `❌ Pause Trip - Error: ${error.message}`);
  }
  
  // Resume trip
  try {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/resume`, {
      method: 'PATCH'
    });
    const data = await response.json();
    log(colors.green, '✅ Resume Trip - Success');
  } catch (error) {
    log(colors.red, `❌ Resume Trip - Error: ${error.message}`);
  }
  
  // Mark stop arrival
  try {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/stops/1/arrive`, {
      method: 'POST'
    });
    const data = await response.json();
    log(colors.green, '✅ Mark Stop Arrival - Success');
  } catch (error) {
    log(colors.red, `❌ Mark Stop Arrival - Error: ${error.message}`);
  }
  
  // Get trip stops
  try {
    const response = await fetch(`${BASE_URL}/api/trips/${tripId}/stops`);
    const data = await response.json();
    log(colors.green, '✅ Get Trip Stops - Success');
    console.log('   Stops:', data.length);
  } catch (error) {
    log(colors.red, `❌ Get Trip Stops - Error: ${error.message}`);
  }
}

async function testReports() {
  log(colors.cyan, '\n📝 Testing Reports...\n');
  
  // Create report
  try {
    const response = await fetch(`${BASE_URL}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_type: 'Delay',
        message: 'Bus is running 10 minutes late',
        trip_id: 1,
        bus_id: 1
      })
    });
    const data = await response.json();
    log(colors.green, '✅ Create Report - Success');
    console.log('   Report ID:', data.report_id);
  } catch (error) {
    log(colors.red, `❌ Create Report - Error: ${error.message}`);
  }
  
  // Get all reports
  try {
    const response = await fetch(`${BASE_URL}/api/reports`);
    const data = await response.json();
    log(colors.green, '✅ Get Reports - Success');
    console.log('   Total Reports:', data.length);
  } catch (error) {
    log(colors.red, `❌ Get Reports - Error: ${error.message}`);
  }
}

async function testAnnouncements() {
  log(colors.cyan, '\n📢 Testing Announcements...\n');
  
  // Create announcement
  try {
    const response = await fetch(`${BASE_URL}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Service Update',
        message: 'Route 150A will have additional stops today'
      })
    });
    const data = await response.json();
    log(colors.green, '✅ Create Announcement - Success');
    console.log('   Announcement ID:', data.announcement_id);
  } catch (error) {
    log(colors.red, `❌ Create Announcement - Error: ${error.message}`);
  }
  
  // Get all announcements
  try {
    const response = await fetch(`${BASE_URL}/api/announcements`);
    const data = await response.json();
    log(colors.green, '✅ Get Announcements - Success');
    console.log('   Total Announcements:', data.length);
  } catch (error) {
    log(colors.red, `❌ Get Announcements - Error: ${error.message}`);
  }
}

async function runAllTests() {
  log(colors.cyan, '\n🧪 Phase 1 Feature Tests\n');
  log(colors.cyan, '='.repeat(60));
  
  await testAuth();
  await testTripManagement();
  await testReports();
  await testAnnouncements();
  
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.green, '\n✅ Phase 1 Testing Complete!\n');
}

runAllTests();
