# 🚧 MY(suru) BUS - Development Roadmap

## Current Status: MVP Complete + Custom Backend In Progress

This document tracks the development progress and planned enhancements for the MY(suru) BUS system.

---

## ✅ Phase 1: MVP - COMPLETED

### Core Infrastructure
- [x] Supabase database schema with RLS policies
- [x] Real-time subscriptions for live tracking
- [x] PostgreSQL with PostGIS for geospatial queries
- [x] Row-Level Security implementation

### Admin Dashboard (Web)
- [x] Fleet management (buses, drivers)
- [x] Route and stop management
- [x] Trip monitoring and control
- [x] Interactive map visualization (Leaflet)
- [x] Real-time location tracking
- [x] Announcement system

### Driver App (Mobile)
- [x] Authentication and session management
- [x] Trip assignment and execution
- [x] Real-time GPS tracking (foreground & background)
- [x] Geofence-based stop detection
- [x] Offline location queue with auto-sync
- [x] Trip controls (start, pause, resume, complete)
- [x] Stop arrival recording

### Passenger App (Mobile)
- [x] Route search by source and destination
- [x] Bus number search
- [x] Live bus tracking on maps
- [x] Stop timeline with ETAs
- [x] Recent searches
- [x] Service announcements
- [x] Report submission

---

## 🔄 Phase 2: Custom Backend - IN PROGRESS (dev branch)

### Backend Infrastructure ✅ COMPLETED
- [x] Node.js + Express server setup
- [x] SQLite database with schema migration
- [x] Socket.io for real-time WebSocket communication
- [x] CORS configuration for cross-origin requests
- [x] Environment configuration (.env)

### API Endpoints ✅ COMPLETED
- [x] **Routes API**
  - GET /api/routes - List all routes
  - GET /api/routes/:id - Route details with stops
  - GET /api/routes/search/:source/:destination - Route search
- [x] **Trips API**
  - GET /api/trips - List all trips
  - GET /api/trips/:id - Trip details
  - POST /api/trips/:id/start - Start trip
  - PATCH /api/trips/:id/pause - Pause trip
  - PATCH /api/trips/:id/resume - Resume trip
  - POST /api/trips/:id/complete - Complete trip
  - POST /api/trips/:id/stops/:stopId/arrive - Record stop arrival
  - GET /api/trips/:id/stops - Get trip stops with times
- [x] **Buses API**
  - GET /api/buses - List all buses
  - GET /api/buses/:id - Bus details
  - POST /api/buses/:id/location - Update bus location
- [x] **Stops API**
  - GET /api/stops - List all stops
  - GET /api/stops/search/:query - Search stops
- [x] **Auth API**
  - POST /api/auth/driver/login - Driver authentication
  - POST /api/auth/driver/register - Driver registration
  - POST /api/auth/admin/login - Admin authentication
- [x] **Reports API** - Passenger report submission
- [x] **Announcements API** - Service announcements

### Real-Time Features ✅ COMPLETED
- [x] WebSocket connection handling
- [x] Trip room management (join-trip)
- [x] Live location broadcasting (location-update, bus-location)
- [x] Client connection/disconnection handling

### Database Schema ✅ COMPLETED
- [x] Routes, stops, route_stops tables
- [x] Buses, drivers, trips tables
- [x] Schedules, trip_stop_times tables
- [x] Announcements, passenger_reports tables
- [x] Sample data seeding

### Testing & Documentation ✅ COMPLETED
- [x] API documentation (API_DOCS.md)
- [x] Integration testing guide (TEST_INTEGRATION.md)
- [x] Test scripts (test-api.js, test-websocket.js)
- [x] Database inspection tools

### Next Steps for Backend
- [ ] **JWT Authentication Middleware** - Protect routes with auth
- [ ] **Input Validation** - Add request validation middleware
- [ ] **Error Handling** - Centralized error handling
- [ ] **Database Connection Pooling** - Optimize database connections
- [ ] **API Rate Limiting** - Prevent abuse
- [ ] **Logging System** - Structured logging (Winston/Morgan)

---

## 🎯 Phase 3: Production Hardening - PLANNED

### 1. Event-Driven Trip Execution (High Priority)

**Problem:** Mutable trip state makes it difficult to audit, reconcile, and recover from failures.

**Solution:** Implement immutable event log for trip execution.

#### Proposed Schema
```sql
CREATE TABLE trip_events (
  event_id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(trip_id),
  event_type TEXT NOT NULL, -- trip_started, stop_arrived, trip_paused, etc.
  source TEXT NOT NULL, -- driver_app, admin, server
  payload JSONB,
  occurred_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT UNIQUE,
  sequence_number INTEGER
);
```

#### Benefits
- ✅ Enables replay and recovery
- ✅ Supports audit trails
- ✅ Allows conflict resolution
- ✅ Decouples raw facts from derived state

#### Implementation Tasks
- [ ] Create trip_events table
- [ ] Implement event sourcing pattern
- [ ] Build event replay mechanism
- [ ] Migrate trip state updates to events
- [ ] Add idempotency handling

---

### 2. Server-Side Geofence Validation (High Priority)

**Problem:** Client-side stop detection leads to false positives and inconsistencies.

**Solution:** Hybrid geofencing with server-side validation.

#### Implementation Tasks
- [ ] Server validates arrival against stop geometry
- [ ] Enforce stop sequence rules
- [ ] Implement speed-based filtering
- [ ] Add adaptive geofence radius per stop
- [ ] Optional GPS smoothing (Kalman filter)

#### Benefits
- ✅ Prevents false arrivals
- ✅ Consistent behavior across devices
- ✅ Authoritative arrival records

---

### 3. Stop Sequence Enforcement (High Priority)

**Problem:** Stops can be marked out of order, breaking timeline integrity.

**Solution:** Database-level sequence enforcement.

#### Implementation Tasks
- [ ] Add sequence validation trigger
- [ ] Prevent arrival at stop N+1 before N
- [ ] Allow admin override with event logging
- [ ] Add sequence validation to API

---

### 4. Arrival Queue Reliability & Backoff (High Priority)

**Problem:** Offline queues can grow unbounded and fail silently.

**Solution:** Retry limits with exponential backoff.

#### Implementation Tasks
- [ ] Implement retry counter in queue
- [ ] Add exponential backoff algorithm
- [ ] Mark arrivals as FAILED after max retries
- [ ] Notify driver of unsynced arrivals
- [ ] Admin dashboard for failed events

---

### 5. Real-Time Subscription Recovery (Medium Priority)

**Problem:** Missed updates during network disconnects.

**Solution:** Version-based update recovery.

#### Implementation Tasks
- [ ] Add version/sequence numbers to updates
- [ ] Implement reconnection recovery logic
- [ ] Query missed updates on reconnect
- [ ] Ensure dashboard state convergence

---

### 6. Traffic-Aware ETA Calculation (Medium Priority)

**Problem:** Fixed-speed ETA assumptions are inaccurate.

**Solution:** Dynamic ETA calculation.

#### Options
- [ ] Integrate Google Maps Traffic API
- [ ] Learn from historical trip data
- [ ] Display ETA ranges instead of exact times
- [ ] Add confidence intervals

---

### 7. Authentication & Access Control Hardening (Medium Priority)

#### Implementation Tasks
- [ ] Driver onboarding approval workflow
- [ ] Phone/OTP verification
- [ ] Device binding for driver accounts
- [ ] Enhanced RBAC with permissions
- [ ] Session management improvements
- [ ] Refresh token implementation

---

### 8. Passenger Experience Enhancements (Low Priority)

- [ ] Push notifications for bus arrivals
- [ ] Offline announcement caching
- [ ] Saved routes and preferences
- [ ] Notification opt-in controls
- [ ] Accessibility improvements (audio cues)
- [ ] Multi-language support
- [ ] Dark mode refinements

---

### 9. Scalability & Operations (Low Priority)

- [ ] Table partitioning (trip_stop_times, trip_events)
- [ ] Read replicas for analytics
- [ ] Background job workers
- [ ] Structured monitoring (Prometheus/Grafana)
- [ ] Alerting system
- [ ] Performance profiling
- [ ] Database backup automation

---

### 10. Analytics & Reporting (Low Priority)

- [ ] Admin analytics dashboard
- [ ] Route performance metrics
- [ ] Driver performance tracking
- [ ] Passenger usage statistics
- [ ] On-time performance reports
- [ ] Fleet utilization analysis

---

## 🚫 Explicit Non-Goals (For Now)

The following are intentionally out of scope for the current system:

- ❌ Ticketing and payment processing
- ❌ Dynamic route optimization
- ❌ ML-based demand prediction
- ❌ Multi-operator, multi-city federation
- ❌ Advanced analytics and BI tools

These belong to a future product phase, not the current engineering objective.

---

## 📊 Progress Tracking

### Overall Completion
- **Phase 1 (MVP):** ✅ 100% Complete
- **Phase 2 (Custom Backend):** 🔄 85% Complete
- **Phase 3 (Production Hardening):** ⏳ 0% Complete

### Current Sprint Focus
1. Complete backend authentication middleware
2. Add input validation and error handling
3. Integrate backend with mobile apps
4. Test end-to-end flows

### Next Sprint
1. Begin event-driven architecture implementation
2. Server-side geofence validation
3. Stop sequence enforcement

---

## 🤝 Contributing

This is an academic/portfolio project. Contributions are welcome via:
- Bug reports and feature requests (GitHub Issues)
- Pull requests with improvements
- Documentation enhancements

---

## 📝 Notes

- This roadmap is a living document and will be updated as development progresses
- Priorities may shift based on testing feedback and real-world usage
- MVP is production-ready for pilot deployments
- Custom backend enables greater control and future scalability

---

**Last Updated:** January 2025  
**Current Branch:** `dev` (backend development)  
**Stable Branch:** `main` (MVP with Supabase)
