# MY(suru) BUS - Complete Project Documentation

**Real-Time Bus Tracking & Fleet Management System**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React Native](https://img.shields.io/badge/React_Native-Expo-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Development Phases](#development-phases)
4. [Tech Stack](#tech-stack)
5. [Current Status](#current-status)
6. [Setup & Installation](#setup--installation)
7. [API Documentation](#api-documentation)
8. [Future Enhancements](#future-enhancements)

---

## 🎯 Project Overview

MY(suru) BUS is a **production-ready real-time public transportation management platform** designed for city-scale bus networks. Built completely from scratch as a full-stack system with three integrated applications.

### Key Features

**Fleet Operations**
- Real-time GPS tracking (foreground & background)
- Live trip monitoring and control
- Geofence-based stop detection
- Offline location queue with auto-sync

**Route Management**
- Interactive route visualization
- Stop and schedule management
- Automated trip generation
- Real-time ETA calculation

**Passenger Services**
- Route search by source/destination
- Live bus tracking on maps
- Stop timelines with ETAs
- Service announcements and reporting

**Security & Access**
- Role-based access control (Admin/Driver/Passenger)
- JWT authentication
- PostgreSQL Row-Level Security
- Secure session handling

---

## 🏗️ System Architecture

### Three-Tier Application Structure

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
├─────────────────────────────────────────────────────────┤
│  Admin Dashboard (Web)  │  Driver App    │  Passenger  │
│  Next.js + TypeScript   │  React Native  │  App        │
│  Leaflet Maps           │  Expo          │  RN Expo    │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   BACKEND LAYER                         │
├─────────────────────────────────────────────────────────┤
│  Custom Node.js API     │  Socket.io WebSocket          │
│  Express.js             │  Real-time Updates            │
│  JWT Authentication     │  Location Broadcasting        │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                        │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL (Supabase)  │  PostGIS Extensions           │
│  Connection Pooling     │  Row-Level Security           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Mobile Apps** → REST API → PostgreSQL
2. **Real-time Updates** → WebSocket → All Connected Clients
3. **Location Updates** → Backend → Database → WebSocket Broadcast

---

## 📈 Development Phases

### ✅ Phase 1: MVP (COMPLETED - 100%)

**Timeline:** Initial Development  
**Branch:** `main`  
**Status:** Production-ready for pilot deployments

#### Deliverables

**Infrastructure**
- ✅ Supabase PostgreSQL database with PostGIS
- ✅ Row-Level Security (RLS) policies
- ✅ Real-time subscriptions
- ✅ Authentication system

**Admin Dashboard (Web)**
- ✅ Fleet management (buses, drivers)
- ✅ Route and stop management
- ✅ Trip monitoring dashboard
- ✅ Interactive Leaflet maps
- ✅ Real-time location tracking
- ✅ Announcement system

**Driver App (Mobile)**
- ✅ Authentication & session management
- ✅ Trip assignment and execution
- ✅ Real-time GPS tracking (foreground & background)
- ✅ Geofence-based stop detection
- ✅ Offline location queue with auto-sync
- ✅ Trip controls (start, pause, resume, complete)

**Passenger App (Mobile)**
- ✅ Route search (source to destination)
- ✅ Bus number search
- ✅ Live bus tracking on maps
- ✅ Stop timeline with ETAs
- ✅ Recent searches
- ✅ Service announcements
- ✅ Report submission

---

### 🔄 Phase 2: Custom Backend (IN PROGRESS - 95%)

**Timeline:** Current Development  
**Branch:** `dev`  
**Status:** Backend complete, app migration ongoing

#### Objectives

Replace Supabase client-side SDK with custom Node.js backend for:
- Server-side business logic
- Enhanced security and validation
- Custom authentication flow
- WebSocket real-time updates
- Foundation for event-driven architecture

#### Completed

**Backend Infrastructure (100%)**
- ✅ Node.js + Express server
- ✅ PostgreSQL connection (Supabase)
- ✅ Socket.io WebSocket server
- ✅ JWT authentication
- ✅ CORS configuration
- ✅ Environment management

**API Endpoints (100%)**
- ✅ Routes API (list, details, search)
- ✅ Stops API (list, search)
- ✅ Buses API (list, details, location updates)
- ✅ Trips API (CRUD, start/pause/resume/complete, stop arrivals)
- ✅ Auth API (driver login/register, admin login)
- ✅ Reports API (create, list, update status)
- ✅ Announcements API (create, list)

**Database Migration (100%)**
- ✅ Converted all routes from SQLite to PostgreSQL
- ✅ Connection pooling implemented
- ✅ Data imported from Supabase:
  - 14 routes, 29 stops, 56 route_stops
  - 7 buses, 7 drivers
  - 44 schedules, 50 trips
  - 36 trip_stop_times
  - 9 announcements, 1 report

**App Migration (33%)**
- ✅ **Passenger App** - Fully migrated, Supabase removed
- ⏳ **Driver App** - Pending
- ⏳ **Admin Dashboard** - Pending

#### In Progress

- 🔄 Driver app Supabase removal
- 🔄 Admin dashboard Supabase removal

#### Pending

- ⏳ JWT middleware implementation
- ⏳ Input validation middleware
- ⏳ Centralized error handling
- ⏳ API rate limiting
- ⏳ Structured logging (Winston/Morgan)

---

### 🎯 Phase 3: Production Hardening (PLANNED - 0%)

**Timeline:** Future Development  
**Status:** Design phase

#### High Priority Enhancements

**1. Event-Driven Trip Execution**

*Problem:* Mutable trip state makes auditing and recovery difficult.

*Solution:* Immutable event log for all trip operations.

```sql
CREATE TABLE trip_events (
  event_id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(trip_id),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB,
  occurred_at TIMESTAMP NOT NULL,
  idempotency_key TEXT UNIQUE
);
```

*Benefits:*
- Audit trail for all operations
- Event replay for recovery
- Conflict resolution
- State reconstruction

*Tasks:*
- [ ] Create trip_events table
- [ ] Implement event sourcing pattern
- [ ] Build event replay mechanism
- [ ] Migrate trip updates to events

---

**2. Server-Side Geofence Validation**

*Problem:* Client-side detection causes false positives.

*Solution:* Hybrid geofencing with server validation.

*Implementation:*
- [ ] Server validates arrival against stop geometry
- [ ] Enforce stop sequence rules
- [ ] Speed-based filtering
- [ ] Adaptive geofence radius
- [ ] GPS smoothing (Kalman filter)

*Benefits:*
- Prevents false arrivals
- Consistent behavior
- Authoritative records

---

**3. Stop Sequence Enforcement**

*Problem:* Stops can be marked out of order.

*Solution:* Database-level sequence validation.

*Tasks:*
- [ ] Add sequence validation trigger
- [ ] Prevent out-of-order arrivals
- [ ] Admin override with logging
- [ ] API validation layer

---

**4. Arrival Queue Reliability**

*Problem:* Offline queues can fail silently.

*Solution:* Retry limits with exponential backoff.

*Tasks:*
- [ ] Implement retry counter
- [ ] Exponential backoff algorithm
- [ ] Mark failed arrivals
- [ ] Driver notifications
- [ ] Admin dashboard for failures

---

#### Medium Priority Enhancements

**5. Real-Time Subscription Recovery**
- Version-based update recovery
- Reconnection logic
- State convergence

**6. Traffic-Aware ETA**
- Google Maps Traffic API integration
- Historical data learning
- ETA ranges with confidence intervals

**7. Authentication Hardening**
- Driver onboarding workflow
- Phone/OTP verification
- Device binding
- Enhanced RBAC
- Refresh tokens

---

#### Low Priority Enhancements

**8. Passenger Experience**
- Push notifications
- Offline caching
- Saved preferences
- Multi-language support
- Accessibility improvements

**9. Scalability & Operations**
- Table partitioning
- Read replicas
- Background workers
- Monitoring (Prometheus/Grafana)
- Automated backups

**10. Analytics & Reporting**
- Performance metrics
- Driver tracking
- Usage statistics
- On-time performance reports

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase)
- **Real-time:** Socket.io
- **Authentication:** JWT (jsonwebtoken)
- **Database Client:** pg (node-postgres)

### Frontend - Web
- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Maps:** Leaflet
- **State:** React Hooks

### Frontend - Mobile
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Maps:** React Native Maps
- **Navigation:** Expo Router
- **Storage:** AsyncStorage

### Database
- **DBMS:** PostgreSQL 15+
- **Extensions:** PostGIS (geospatial)
- **Hosting:** Supabase
- **Features:** RLS, Real-time subscriptions

### DevOps
- **Version Control:** Git/GitHub
- **Web Hosting:** Vercel
- **Mobile Build:** Expo EAS
- **Backend:** Node.js server

---

## 📊 Current Status

### Overall Progress

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: MVP | ✅ Complete | 100% |
| Phase 2: Custom Backend | 🔄 In Progress | 95% |
| Phase 3: Production Hardening | ⏳ Planned | 0% |

### Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| Backend API | ✅ Complete | All endpoints operational |
| PostgreSQL Migration | ✅ Complete | Data imported |
| Passenger App | ✅ Complete | Fully migrated |
| Driver App | ⏳ Pending | Migration needed |
| Admin Dashboard | ⏳ Pending | Migration needed |
| WebSocket Server | ✅ Complete | Ready for clients |

### Current Sprint

1. ✅ Backend PostgreSQL migration
2. ✅ Passenger app migration
3. ✅ Data import from Supabase
4. 🔄 Driver app migration
5. ⏳ Admin dashboard migration

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database)
- Expo CLI (for mobile apps)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start server
npm run dev
```

Server runs at: `http://localhost:3001`

### Passenger App Setup

```bash
# Navigate to passenger app
cd passenger-app

# Install dependencies
npm install

# Update API URL in lib/apiClient.ts
# For Android: http://10.0.2.2:3001/api
# For iOS: http://localhost:3001/api
# For device: http://YOUR_IP:3001/api

# Start app
npm start
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
JWT_SECRET=your-secret-key
```

**Mobile Apps (.env)**
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP:3001/api
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication

**Driver Login**
```http
POST /api/auth/driver/login
Content-Type: application/json

{
  "phone_number": "+91-9876543210",
  "password": "driver123"
}

Response: { "token": "jwt_token", "driver": {...} }
```

### Routes

**Get All Routes**
```http
GET /api/routes
Response: [{ route_id, route_name, route_no }]
```

**Get Route Details**
```http
GET /api/routes/:id
Response: { route_id, route_name, stops: [...] }
```

**Search Routes**
```http
GET /api/routes/search/:source/:destination
Response: [{ route_id, route_name, ... }]
```

### Trips

**Get All Trips**
```http
GET /api/trips
Response: [{ trip_id, bus_no, driver_name, status, ... }]
```

**Start Trip**
```http
POST /api/trips/:id/start
Response: { message: "Trip started" }
```

**Mark Stop Arrival**
```http
POST /api/trips/:id/stops/:stopId/arrive
Response: { message: "Stop arrival recorded" }
```

### WebSocket Events

**Connect**
```javascript
const socket = io('http://localhost:3001');
```

**Join Trip Room**
```javascript
socket.emit('join-trip', tripId);
```

**Send Location Update**
```javascript
socket.emit('location-update', {
  tripId: 123,
  latitude: 12.2958,
  longitude: 76.6394,
  speed: 45
});
```

**Receive Location Updates**
```javascript
socket.on('bus-location', (data) => {
  console.log(data); // { tripId, latitude, longitude, speed }
});
```

---

## 🔮 Future Enhancements

### Immediate Next Steps (Phase 2 Completion)

1. **Driver App Migration** (2-3 days)
   - Remove Supabase SDK
   - Integrate with backend API
   - Implement WebSocket for real-time

2. **Admin Dashboard Migration** (3-4 days)
   - Remove Supabase SDK
   - Integrate with backend API
   - Real-time monitoring via WebSocket

3. **Backend Hardening** (1-2 days)
   - JWT middleware
   - Input validation
   - Error handling
   - Rate limiting

### Phase 3 Priorities

**Q1 2025**
- Event-driven trip execution
- Server-side geofence validation
- Stop sequence enforcement

**Q2 2025**
- Arrival queue reliability
- Real-time subscription recovery
- Traffic-aware ETA

**Q3 2025**
- Authentication hardening
- Passenger experience enhancements
- Analytics dashboard

---

## 🚫 Explicit Non-Goals

The following are intentionally out of scope:

- ❌ Ticketing and payment processing
- ❌ Dynamic route optimization
- ❌ ML-based demand prediction
- ❌ Multi-operator federation
- ❌ Advanced BI tools

These belong to future product phases.

---

## 📝 Project Information

**Type:** Academic/Portfolio Project (Mini Project)  
**Developer:** Ganesh  
**Repository:** https://github.com/ganeshak11/MY-suru-BUS  
**Email:** ganeshangadi13012006@gmail.com

**Branches:**
- `main` - MVP with Supabase (stable)
- `dev` - Custom backend development (active)

**License:** Academic/Portfolio Use

---

**Last Updated:** January 2025  
**Version:** 2.0 (Custom Backend)  
**Status:** 🟢 Active Development
