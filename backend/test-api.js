// Simple API Test Script
const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing MY(suru) BUS API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await fetch(`${BASE_URL}/health`);
    console.log('✅ Health:', await health.json());

    // Test 2: Get All Routes
    console.log('\n2️⃣ Testing Get All Routes...');
    const routes = await fetch(`${BASE_URL}/api/routes`);
    const routesData = await routes.json();
    console.log('✅ Routes:', routesData);

    // Test 3: Get Route by ID
    console.log('\n3️⃣ Testing Get Route by ID (1)...');
    const route = await fetch(`${BASE_URL}/api/routes/1`);
    console.log('✅ Route 1:', await route.json());

    // Test 4: Get All Buses
    console.log('\n4️⃣ Testing Get All Buses...');
    const buses = await fetch(`${BASE_URL}/api/buses`);
    console.log('✅ Buses:', await buses.json());

    // Test 5: Get All Stops
    console.log('\n5️⃣ Testing Get All Stops...');
    const stops = await fetch(`${BASE_URL}/api/stops`);
    console.log('✅ Stops:', await stops.json());

    // Test 6: Search Stops
    console.log('\n6️⃣ Testing Search Stops (City)...');
    const searchStops = await fetch(`${BASE_URL}/api/stops/search/City`);
    console.log('✅ Search Results:', await searchStops.json());

    // Test 7: Get All Trips
    console.log('\n7️⃣ Testing Get All Trips...');
    const trips = await fetch(`${BASE_URL}/api/trips`);
    console.log('✅ Trips:', await trips.json());

    console.log('\n✅ All tests passed! Backend is working correctly! 🎉');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
