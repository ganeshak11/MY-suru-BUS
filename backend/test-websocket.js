// WebSocket Test
const io = require('socket.io-client');

const socket = io('http://localhost:3001');

console.log('🔌 Testing WebSocket Connection...\n');

socket.on('connect', () => {
  console.log('✅ Connected to server!');
  console.log('   Socket ID:', socket.id);
  
  // Test 1: Join a trip
  console.log('\n📍 Test 1: Joining trip 123...');
  socket.emit('join-trip', 123);
  
  // Test 2: Send location update
  setTimeout(() => {
    console.log('\n📡 Test 2: Sending location update...');
    socket.emit('location-update', {
      tripId: 123,
      latitude: 12.2958,
      longitude: 76.6394,
      speed: 45,
      timestamp: new Date().toISOString()
    });
    console.log('   Location sent!');
  }, 1000);
  
  // Test 3: Listen for location updates
  socket.on('bus-location', (data) => {
    console.log('\n📥 Test 3: Received location update:');
    console.log('   ', data);
  });
  
  // Disconnect after 3 seconds
  setTimeout(() => {
    console.log('\n✅ All WebSocket tests completed!');
    console.log('   Disconnecting...\n');
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});
