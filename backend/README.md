# MY(suru) BUS Backend

Manual backend implementation for the MY(suru) BUS tracking system.

## Tech Stack
- Node.js + Express
- SQLite Database
- Socket.io for real-time updates
- JWT Authentication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Initialize database:
```bash
npm run init-db
```

3. Start development server:
```bash
npm run dev
```

## API Endpoints

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route with stops
- `GET /api/routes/search/:source/:destination` - Search routes

### Buses
- `GET /api/buses` - Get all buses
- `POST /api/buses/:id/location` - Update bus location

### Real-time
- WebSocket connection on same port
- Events: `join-trip`, `location-update`, `bus-location`

## Database Schema
- routes, stops, route_stops
- buses, drivers, trips
- schedules, trip_stop_times