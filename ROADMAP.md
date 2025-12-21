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
- [x] PostgreSQL database connection (Supabase)
- [x] Socket.io for real-time WebSocket communication
- [x] CORS configuration for cross-origin requests
- [x] Environment configuration (.env)
- [x] Database migration from SQLite to PostgreSQL
- [x] Supabase data import completed

### API Endpoints ✅ COMPLETED
- [x] **Routes API** - Converted to PostgreSQL
- [x] **Trips API** - Converted to PostgreSQL
- [x] **Buses API** - Converted to PostgreSQL
- [x] **Stops API** - Converted to PostgreSQL
- [x] **Auth API** - Converted to PostgreSQL
- [x] **Reports API** - Converted to PostgreSQL
- [x] **Announcements API** - Converted to PostgreSQL

### Real-Time Features ✅ COMPLETED
- [x] WebSocket connection handling
- [x] Trip room management (join-trip)
- [x] Live location broadcasting (location-update, bus-location)
- [x] Client connection/disconnection handling

### Database ✅ COMPLETED
- [x] PostgreSQL connection pool setup
- [x] All routes converted from SQLite to PostgreSQL
- [x] Supabase PostgreSQL integration
- [x] Data import from Supabase (14 routes, 29 stops, 7 buses, 7 drivers, 50 trips)

### Mobile App Migration ✅ COMPLETED
- [x] **Passenger App** - Supabase removed, using custom backend API
- [x] API client implementation
- [x] All screens updated to use backend
- [x] Package dependencies cleaned

### Testing & Documentation ✅ COMPLETED
- [x] API documentation (API_DOCS.md)
- [x] Integration testing guide (TEST_INTEGRATION.md)
- [x] Migration documentation (MIGRATION_PASSENGER_APP.md)
- [x] Test scripts available

### Next Steps for Backend
- [ ] **Driver App Migration** - Remove Supabase, integrate with backend
- [ ] **Admin Dashboard Migration** - Remove Supabase, integrate with backend
- [ ] **JWT Authentication Middleware** - Protect routes with auth
- [ ] **Input Validation** - Add request validation middleware
- [ ] **Error Handling** - Centralized error handling
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
- **Phase 2 (Custom Backend):** 🔄 95% Complete
- **Phase 3 (Production Hardening):** ⏳ 0% Complete

### Current Sprint Focus
1. ✅ Backend PostgreSQL migration - DONE
2. ✅ Passenger app Supabase removal - DONE
3. ✅ Data import from Supabase - DONE
4. Driver app migration - IN PROGRESS
5. Admin dashboard migration - PENDING

### Next Sprint
1. Complete driver app migration
2. Complete admin dashboard migration
3. Add authentication middleware
4. Begin event-driven architecture implementation

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
