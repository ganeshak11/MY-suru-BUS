# MY(suru) BUS Backend

Custom Node.js backend for the MY(suru) BUS tracking system.

## Tech Stack
- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **Database:** PostgreSQL (Supabase)
- **Real-time:** Socket.io for WebSocket communication
- **Authentication:** JWT (JSON Web Tokens)
- **ORM:** Native pg (PostgreSQL client)

## Features

✅ RESTful API for all bus operations
✅ Real-time location updates via WebSocket
✅ PostgreSQL database with connection pooling
✅ JWT-based authentication
✅ CORS enabled for cross-origin requests
✅ Complete CRUD operations for routes, stops, buses, trips

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file (see `.env.example`):
```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
JWT_SECRET=your-secret-key
```

### 3. Build TypeScript
```bash
npm run build
```

### 4. Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:3001`

## API Endpoints

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route with stops
- `GET /api/routes/search/:source/:destination` - Search routes

### Buses
- `GET /api/buses` - Get all buses
- `GET /api/buses/:id` - Get bus details
- `POST /api/buses/:id/location` - Update bus location

### Trips
- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get trip details
- `POST /api/trips/:id/start` - Start trip
- `PATCH /api/trips/:id/pause` - Pause trip
- `POST /api/trips/:id/complete` - Complete trip
- `POST /api/trips/:id/stops/:stopId/arrive` - Mark stop arrival

### Stops
- `GET /api/stops` - Get all stops
- `GET /api/stops/search/:query` - Search stops

### Authentication
- `POST /api/auth/driver/login` - Driver login
- `POST /api/auth/driver/register` - Driver registration
- `POST /api/auth/admin/login` - Admin login

### Reports & Announcements
- `GET /api/reports` - Get all reports
- `POST /api/reports` - Create report
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement

## Real-Time WebSocket

Connect to: `ws://localhost:3001`

### Events
- **Emit:** `join-trip` - Join a trip room
- **Emit:** `location-update` - Send location update
- **Listen:** `bus-location` - Receive location updates

## Database

**Provider:** Supabase PostgreSQL

**Tables:**
- routes, stops, route_stops
- buses, drivers, trips
- schedules, trip_stop_times
- announcements, passenger_reports

## Scripts

```bash
npm run build        # Build TypeScript to JavaScript
npm run dev          # Start development server with ts-node
npm start            # Start production server (requires build)
npm run init-db      # Initialize database
npm run clean-db     # Clean database
npm run reset-db     # Reset database
```

## Migration Status

✅ **Backend API:** Complete (TypeScript)
✅ **PostgreSQL Integration:** Complete
✅ **TypeScript Conversion:** Complete
✅ **Passenger App:** Migrated
⏳ **Driver App:** Pending
⏳ **Admin Dashboard:** Pending

## Documentation

- [API Documentation](./API_DOCS.md)
- [Integration Testing](../TEST_INTEGRATION.md)
- [Migration Guide](../MIGRATION_PASSENGER_APP.md)

---

**Status:** Production Ready
**Branch:** `dev`
**Last Updated:** January 2025