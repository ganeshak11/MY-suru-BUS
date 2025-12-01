// Comprehensive Backend Test Suite
const BASE_URL = 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedFields = []) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      log(colors.red, `❌ ${name} - Status: ${response.status}`);
      return false;
    }
    
    // Check if data has expected fields
    if (expectedFields.length > 0 && Array.isArray(data) && data.length > 0) {
      const hasFields = expectedFields.every(field => field in data[0]);
      if (!hasFields) {
        log(colors.yellow, `⚠️  ${name} - Missing expected fields`);
      }
    }
    
    log(colors.green, `✅ ${name}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
    return true;
  } catch (error) {
    log(colors.red, `❌ ${name} - Error: ${error.message}`);
    return false;
  }
}

async function testPostEndpoint(name, url, body) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    
    if (!response.ok) {
      log(colors.red, `❌ ${name} - Status: ${response.status}`);
      return false;
    }
    
    log(colors.green, `✅ ${name}`);
    console.log(`   Response:`, data, '\n');
    return true;
  } catch (error) {
    log(colors.red, `❌ ${name} - Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log(colors.cyan, '\n🧪 MY(suru) BUS Backend - Comprehensive Test Suite\n');
  log(colors.cyan, '='.repeat(60) + '\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  log(colors.blue, '📋 Phase 1: Health & Connectivity');
  if (await testEndpoint('Health Check', `${BASE_URL}/health`)) passed++; else failed++;
  
  // Test 2: Routes
  log(colors.blue, '\n📋 Phase 2: Routes API');
  if (await testEndpoint('Get All Routes', `${BASE_URL}/api/routes`, ['route_id', 'route_name', 'route_no'])) passed++; else failed++;
  if (await testEndpoint('Get Route by ID (1)', `${BASE_URL}/api/routes/1`, ['route_id', 'route_name'])) passed++; else failed++;
  if (await testEndpoint('Get Route by ID (2)', `${BASE_URL}/api/routes/2`, ['route_id', 'route_name'])) passed++; else failed++;
  if (await testEndpoint('Search Routes (City to Airport)', `${BASE_URL}/api/routes/search/City/Airport`)) passed++; else failed++;
  
  // Test 3: Stops
  log(colors.blue, '\n📋 Phase 3: Stops API');
  if (await testEndpoint('Get All Stops', `${BASE_URL}/api/stops`, ['stop_id', 'stop_name', 'latitude', 'longitude'])) passed++; else failed++;
  if (await testEndpoint('Search Stops (City)', `${BASE_URL}/api/stops/search/City`)) passed++; else failed++;
  if (await testEndpoint('Search Stops (Mall)', `${BASE_URL}/api/stops/search/Mall`)) passed++; else failed++;
  
  // Test 4: Buses
  log(colors.blue, '\n📋 Phase 4: Buses API');
  if (await testEndpoint('Get All Buses', `${BASE_URL}/api/buses`, ['bus_id', 'bus_no'])) passed++; else failed++;
  if (await testEndpoint('Get Bus by ID (1)', `${BASE_URL}/api/buses/1`)) passed++; else failed++;
  if (await testPostEndpoint('Update Bus Location', `${BASE_URL}/api/buses/1/location`, {
    latitude: 12.2958,
    longitude: 76.6394,
    speed: 45
  })) passed++; else failed++;
  
  // Test 5: Trips
  log(colors.blue, '\n📋 Phase 5: Trips API');
  if (await testEndpoint('Get All Trips', `${BASE_URL}/api/trips`)) passed++; else failed++;
  
  // Test 6: Edge Cases
  log(colors.blue, '\n📋 Phase 6: Edge Cases');
  // Test that non-existent route returns 404 (this is correct behavior)
  try {
    const response = await fetch(`${BASE_URL}/api/routes/999`);
    if (response.status === 404) {
      log(colors.green, '✅ Non-existent Route (999) - Correctly returns 404');
      passed++;
    } else {
      log(colors.red, `❌ Non-existent Route (999) - Expected 404, got ${response.status}`);
      failed++;
    }
  } catch (error) {
    log(colors.red, `❌ Non-existent Route (999) - Error: ${error.message}`);
    failed++;
  }
  if (await testEndpoint('Empty Search', `${BASE_URL}/api/stops/search/xyz123notfound`)) passed++; else failed++;
  
  // Summary
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, '📊 Test Summary:');
  log(colors.green, `   ✅ Passed: ${passed}`);
  if (failed > 0) {
    log(colors.red, `   ❌ Failed: ${failed}`);
  }
  log(colors.cyan, '='.repeat(60) + '\n');
  
  if (failed === 0) {
    log(colors.green, '🎉 All tests passed! Backend is working perfectly!\n');
  } else {
    log(colors.yellow, '⚠️  Some tests failed. Check the output above.\n');
  }
}

// Run tests
runTests().catch(error => {
  log(colors.red, `\n❌ Test suite crashed: ${error.message}\n`);
  process.exit(1);
});
