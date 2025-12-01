# MY(suru) BUS API Documentation

Base URL: `http://localhost:3001`

## Endpoints

### Health Check
```
GET /health
Response: { status: 'OK', message: 'MY(suru) BUS Backend is running!' }
```

### Routes
```
GET /api/routes
Response: Array of all routes

GET /api/routes/:id
Response: Route with stops

GET /api/routes/search/:source/:destination
Response: Routes matching source and destination
```

### Buses
```
GET /api/buses
Response: Array of all buses

GET /api/buses/:id
Response: Single bus details

POST /api/buses/:id/location
Body: { latitude, longitude, speed }
Response: { message: 'Location updated' }
```

### Trips
```
GET /api/trips
Response: Array of all trips with details

GET /api/trips/:id
Response: Single trip with full details

PATCH /api/trips/:id/status
Body: { status: 'In Progress' | 'Completed' | 'Scheduled' }
Response: { message: 'Status updated' }
```

### Stops
```
GET /api/stops
Response: Array of all stops

GET /api/stops/search/:query
Response: Stops matching search query
```

## WebSocket Events

Connect to: `ws://localhost:3001`

### Events to Emit
- `join-trip` - Join a trip room: `{ tripId: 123 }`
- `location-update` - Send location: `{ tripId: 123, latitude, longitude, speed }`

### Events to Listen
- `bus-location` - Receive location updates: `{ tripId, latitude, longitude, speed }`

## Example Usage

### JavaScript/React Native
```javascript
// HTTP Request
const response = await fetch('http://localhost:3001/api/routes');
const routes = await response.json();

// WebSocket
import io from 'socket.io-client';
const socket = io('http://localhost:3001');
socket.emit('join-trip', 123);
socket.on('bus-location', (data) => console.log(data));
```
