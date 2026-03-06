# MY(suru) BUS — Complete Project Memory
> This document is a complete brain dump of the entire MY(suru) BUS project — intended to be given to any AI agent as a context/memory file so they understand the project from day one to current state, without any prior knowledge.

---

## 1. Project Identity

**Name:** MY(suru) BUS (stylised with parentheses — "MY(suru)" plays on Mysuru city name)
**Purpose:** A real-time public bus fleet management and tracking system for Mysuru, Karnataka, India.
**Target users:** Three distinct roles:
- **Admin** — Transport authority staff who manage the fleet
- **Driver** — Bus drivers who execute trips
- **Passenger** — General public who track buses

**Developer:** Ganesh A K | ganeshangadi13012006@gmail.com | GitHub: ganeshak11
**Repo:** https://github.com/ganeshak11/MY-suru-BUS
**Current Deployment:**
- Backend API: https://mysurubus-backend.onrender.com
- Admin Dashboard: https://my-suru-bus.vercel.app

---

## 2. Evolution — From Supabase to Custom Backend

### Phase 1: `main` branch — Supabase era
The original system was built entirely on **Supabase**:
- **Database:** Supabase PostgreSQL with PostGIS + Row Level Security (RLS)
- **Auth:** Supabase Auth (magic links + phone OTP)
- **Realtime:** Supabase Realtime subscriptions for live bus tracking
- **Edge Functions:** Supabase Deno edge functions for business logic:
  - `update-location` — driver GPS updates
  - `driver-auth` — driver authentication
  - `trip-control` — start/pause/resume/complete trip
  - `stop-arrival` — geofence-triggered stop detection
- **Admin Dashboard:** Next.js using `@supabase/supabase-js` directly
- **Driver App:** React Native Expo using Supabase SDK
- **Passenger App:** React Native Expo using Supabase SDK

**Why migrated away from Supabase:**
- Edge function cold starts
- Supabase auth dependency for every feature
- Vendor lock-in
- Less control over business logic
- Wanted a fully owned, portable system

### Phase 2: `dev` branch — Custom Backend (CURRENT)
All Supabase dependencies removed. Replaced with:
- **Backend:** Custom Node.js + Express + TypeScript API server
- **Database:** PostgreSQL (local for dev, Render managed for prod)
- **Auth:** Custom JWT with bcrypt password hashing
- **Realtime:** Socket.io WebSocket server
- **Edge functions:** All migrated to Express route handlers
- **Admin Dashboard:** Migrated from Supabase SDK to custom apiClient
- **Driver App:** Migrated from Supabase SDK to REST API + 30s polling
- **Passenger App:** Migrated from Supabase realtime to WebSocket

---

## 3. Monorepo Structure

```
MY-suru-BUS/                 ← root (git repo)
├── backend/                 ← Node.js/Express API
├── admin-dashboard/         ← Next.js 14 web app
├── driver-app/              ← React Native Expo (driver)
├── passenger-app/           ← React Native Expo (passenger)
├── website/                 ← Marketing website (50% done)
├── Docs/                    ← Project documentation
├── push.sh                  ← Smart git commit/push script
├── render.yaml              ← Render Blueprint (infra as code)
└── .git/hooks/post-checkout ← Auto env switcher on branch change
```

---

## 4. Smart DevOps Tooling

### 4.1 push.sh — Smart Git Push Script
Located at root. Run as `./push.sh` from repo root.

**What it does:**
1. Detects current branch (`git rev-parse --abbrev-ref HEAD`)
2. **Guards `main` branch** — asks "Type YES to confirm" before pushing to main
3. Shows `git status` so you see what's changed
4. Prompts for a commit message
5. Forces conventional commit type selection: `feat / fix / refactor / docs / chore`
6. Formats as `type: message` (e.g. `fix: driver login infinite spinner`)
7. Runs `git add .` → `git commit` → `git push origin <branch>`
8. Exits immediately on any failure (`set -e`)

**Why it's smart:** Enforces consistent commit history discipline across a solo project. Protects main from accidental pushes. Zero-config — just run it.

### 4.2 .git/hooks/post-checkout — Auto Env Switcher
A git hook that fires every time you switch branches.

**What it does:** For each module (backend, admin-dashboard, driver-app, passenger-app), it copies the branch-appropriate `.env` file to the active `.env`:
- Switch to `main` → copies `.env.main` to `.env`
- Switch to `dev` → copies `.env.dev` to `.env`

**Why it's smart:** No manual env switching when changing branches. Prevents accidentally running the dev app against prod credentials or vice versa.

### 4.3 render.yaml — Infrastructure as Code
Defines the entire Render deployment in code:
- Web service: `mysurubus-backend` (Docker, free tier, Singapore region)
- Database: `mysurubus-prod-db` (PostgreSQL free tier, Singapore region)
- `JWT_SECRET` uses `generateValue: true` — Render auto-generates a cryptographically strong secret, never touches git
- `DATABASE_URL` injected from the database service's `connectionString` property
- `ALLOWED_ORIGINS` locked to `https://my-suru-bus.vercel.app`
- `healthCheckPath: /health` for Render's readiness check

---

## 5. Environment Management Strategy

### Per-module env files
Each module has 4 `.env` files:
```
.env              ← active (managed by post-checkout + never committed)
.env.example      ← template (committed)
.env.dev          ← dev branch PROD config (Render/Vercel URLs — committed)
.env.main         ← main branch Supabase config (committed)
```

### Two environments within `dev` branch
- **DEV** (local development): localhost backend, local PostgreSQL, Expo Go
- **PROD** (deployed): Render backend, Render PostgreSQL, Vercel admin, EAS APKs

### Mobile app env via EAS profiles
The `.env` files for driver-app and passenger-app are **empty** (no API URL) during local dev — Expo Go auto-detects Metro bundler. For EAS builds, the env is baked in per profile inside `eas.json`:
- `development` profile → `EXPO_PUBLIC_API_BASE_URL: ""`
- `preview` profile → `EXPO_PUBLIC_API_BASE_URL: "https://mysurubus-backend.onrender.com/api"`
- `production` profile → same as preview

**Why this is the right approach:** No manual env file switching before builds. The correct backend URL is baked in automatically based on which build profile you choose.

---

## 6. Backend — Node.js / Express / TypeScript

### Location: `backend/`
### Stack:
- Node.js 20 + Express 4 + TypeScript
- PostgreSQL via `pg` (node-postgres) — raw SQL, no ORM
- Socket.io for WebSocket
- JWT (jsonwebtoken) for auth
- bcryptjs (rounds=12) for password hashing
- Pino for structured JSON logging
- Sentry for error tracking
- express-rate-limit for rate limiting
- Docker multi-stage build (builder + runner)

### Key Files:
- `src/app.ts` — Express app setup, CORS, middleware, route mounting
- `src/server.ts` — HTTP server start, `process.env.PORT || 3001`
- `src/database/db.ts` — PostgreSQL connection pool (max:20, idle:30s, connect:5s)
- `src/middleware/auth.ts` — `authenticateToken` (JWT decode), `requireAdmin`, `requireDriver`
- `src/routes/auth.ts` — Driver login, admin login
- `src/routes/buses.ts` — Bus CRUD, location update
- `src/routes/drivers.ts` — Driver CRUD, profile, own trips
- `src/routes/routes.ts` — Route CRUD, stops, search
- `src/routes/trips.ts` — Trip CRUD, start/pause/resume/complete, stop arrivals
- `src/routes/schedules.ts` — Schedule CRUD
- `src/routes/stops.ts` — Stop CRUD
- `src/routes/announcements.ts` — Announcement CRUD
- `src/routes/reports.ts` — Passenger report CRUD
- `src/sockets/locationSocket.ts` — Socket.io event handlers
- `src/create-admin.ts` — One-time admin creation script using env vars
- `migrations/000_clean_schema.sql` — Full idempotent schema
- `scripts/migrate.js` — Migration runner (reads all .sql files, runs in order)
- `scripts/seed.sql` — Sample data seed

### CORS Configuration
`ALLOWED_ORIGINS` env var (comma-separated). In production: `https://my-suru-bus.vercel.app`. Parsed and used as `origin` array in Express CORS config.

### Rate Limiting
Three separate limiters applied per route type:
1. Auth endpoints: `5 requests / 15 min` (strict)
2. GPS location update: `120 requests / min` (per bus)
3. General API: `100 requests / 15 min`

In-memory only (resets on restart, not multi-instance safe — known limitation).

### Graceful Shutdown
SIGTERM and SIGINT handlers close HTTP server then DB pool cleanly. This runs before Render kills the container on redeploy.

### Health Check
`GET /health` returns `{ status: "OK", message: "...", timestamp: "..." }`. Used by Render for readiness checks and UptimeRobot for uptime monitoring.

### Dockerfile
Multi-stage build:
1. `builder` stage — installs all deps, runs `tsc` to compile TypeScript
2. `runner` stage — copies only `dist/`, `node_modules/`, `migrations/`, `scripts/` from builder (no source .ts files in production image)

CMD: `sh -c "node scripts/migrate.js && node dist/server.js"` — runs migrations THEN starts server on every deploy. Safe because all migrations are idempotent.

EXPOSE uses `${PORT:-10000}` — Render assigns a dynamic port (usually 10000 on free tier). Health check also uses dynamic port.

---

## 7. Database Schema

### Database: PostgreSQL (prod: Render managed, dev: local)
### All tables are in `public` schema

### Tables:

#### `admins`
- `admin_id` BIGINT IDENTITY PK
- `name` VARCHAR NOT NULL
- `email` VARCHAR UNIQUE NOT NULL
- `password_hash` TEXT (bcrypt, set by create-admin.ts script)
- `created_at` TIMESTAMPTZ DEFAULT now()

#### `stops`
- `stop_id` BIGINT IDENTITY PK
- `stop_name` VARCHAR NOT NULL
- `latitude` NUMERIC NOT NULL
- `longitude` NUMERIC NOT NULL
- `geofence_radius_meters` INTEGER DEFAULT 50

#### `routes`
- `route_id` BIGINT IDENTITY PK
- `route_name` VARCHAR NOT NULL
- `route_no` VARCHAR (e.g. "1A", "2B")

#### `route_stops` (junction table — ordered stops on a route)
- `route_stop_id` BIGINT IDENTITY PK
- `route_id` FK → routes
- `stop_id` FK → stops
- `stop_sequence` INTEGER (1, 2, 3...)
- `time_offset_from_start` TIME (estimated travel time from route start)

#### `schedules` (a route at a given departure time)
- `schedule_id` BIGINT IDENTITY PK
- `route_id` FK → routes
- `start_time` TIME NOT NULL (e.g. '06:00:00')

#### `drivers`
- `driver_id` BIGINT IDENTITY PK
- `name` VARCHAR NOT NULL
- `email` VARCHAR UNIQUE
- `phone_number` VARCHAR UNIQUE NOT NULL (login identifier)
- `password_hash` TEXT (bcrypt)
- `profile_photo_url` TEXT

#### `buses`
- `bus_id` BIGINT IDENTITY PK
- `bus_no` VARCHAR UNIQUE NOT NULL (e.g. "KA-09-F-1001")
- `current_latitude` NUMERIC
- `current_longitude` NUMERIC
- `last_updated` TIMESTAMPTZ
- `current_trip_id` BIGINT (FK → trips — circular FK, added after trips table)
- `current_speed_kmh` NUMERIC

#### `trips`
- `trip_id` BIGINT IDENTITY PK
- `schedule_id` FK → schedules (ON DELETE RESTRICT)
- `bus_id` FK → buses (ON DELETE RESTRICT)
- `driver_id` FK → drivers (ON DELETE RESTRICT)
- `trip_date` DATE NOT NULL
- `status` ENUM `trip_status` ('Scheduled', 'En Route', 'Paused', 'Completed')
- **UNIQUE** on `(schedule_id, trip_date)` — prevents duplicate trips for same schedule on same day

#### `trip_stop_times`
- `trip_stop_id` BIGINT IDENTITY PK
- `trip_id` FK → trips (ON DELETE CASCADE)
- `stop_id` FK → stops (ON DELETE CASCADE)
- `actual_arrival_time` TIMESTAMPTZ
- `actual_departure_time` TIMESTAMPTZ
- `predicted_arrival_time` TIMESTAMPTZ
- **UNIQUE** on `(trip_id, stop_id)`

#### `passenger_reports`
- `report_id` BIGINT IDENTITY PK
- `created_at` TIMESTAMPTZ DEFAULT now()
- `report_type` VARCHAR NOT NULL
- `message` TEXT NOT NULL
- `status` VARCHAR DEFAULT 'New'
- `trip_id` FK → trips (ON DELETE SET NULL)
- `bus_id` FK → buses (ON DELETE SET NULL)
- `driver_id` FK → drivers (ON DELETE SET NULL)
- `route_id` FK → routes (ON DELETE SET NULL)

#### `announcements`
- `announcement_id` BIGINT IDENTITY PK
- `title` VARCHAR NOT NULL
- `message` TEXT NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()

### Circular FK Design Decision
`buses.current_trip_id` references `trips`, but `trips.bus_id` also references `buses`. To handle this circular dependency, `buses` is created first WITHOUT the FK, then `trips` is created, then the FK is added to `buses` via an idempotent `DO $$ IF NOT EXISTS` block.

### Idempotent Migration Design
Every DDL statement uses safe patterns:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`
- `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...') THEN ALTER TABLE ... ADD CONSTRAINT ... END $$`

This means migrations are re-run on every Render deploy with zero risk of failure.

### Key Indexes
```sql
idx_route_stops_route_id       ON route_stops(route_id)
idx_trips_driver_id            ON trips(driver_id)
idx_trips_bus_id               ON trips(bus_id)
idx_trips_status               ON trips(status)
idx_trips_schedule_date        ON trips(schedule_id, trip_date)
idx_trip_stop_times_trip_id    ON trip_stop_times(trip_id)
idx_passenger_reports_bus_id   ON passenger_reports(bus_id)
idx_passenger_reports_driver_id ON passenger_reports(driver_id)
```

---

## 8. API Endpoints

Base URL (prod): `https://mysurubus-backend.onrender.com/api`
Base URL (dev): `http://localhost:3001/api`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/driver/login | — | `{phone_number, password}` → `{token, driver}` |
| POST | /auth/admin/login | — | `{email, password}` → `{token, admin}` |

### Routes & Stops
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /routes | — | All routes |
| GET | /routes/:id | — | Route with stops |
| GET | /routes/:id/stops | — | Stops on a route |
| POST | /routes | admin | Create route |
| PUT | /routes/:id | admin | Update route |
| DELETE | /routes/:id | admin | Delete route |
| GET | /stops | — | All stops |
| POST | /stops | admin | Create stop |
| PUT | /stops/:id | admin | Update stop |
| DELETE | /stops/:id | admin | Delete stop |

### Schedules
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /schedules | — | All schedules (flat, with route_name joined) |
| POST | /schedules | admin | Create schedule |
| PUT | /schedules/:id | admin | Update schedule |
| DELETE | /schedules/:id | admin | Deletes schedule + associated trips |

**Important:** `GET /schedules` returns `route_name` as a flat field (not nested `routes.route_name`). Admin dashboard pages must read `schedule.route_name` not `schedule.routes?.route_name`.

### Buses
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /buses | admin | All buses with aggregated json |
| POST | /buses | admin | Create bus |
| PUT | /buses/:id | admin | Update bus |
| DELETE | /buses/:id | admin | Delete bus |
| PATCH | /buses/:id/location | driver | `{latitude, longitude, speed, tripId}` → updates bus GPS + broadcasts socket event |

### Drivers
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /drivers | admin | All drivers |
| POST | /drivers | admin | Create driver (returns initial_password) |
| PUT | /drivers/:id | admin | Update driver info |
| DELETE | /drivers/:id | admin | Delete driver |
| GET | /drivers/me | driver | Own profile |
| PATCH | /drivers/me | driver | Update own profile |
| GET | /drivers/me/trips | driver | Today's scheduled + in-progress trips |

### Trips
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /trips | admin | All trips (huge JOIN — bus_no, driver_name, route_name, start_time) |
| POST | /trips | admin | Create trip |
| DELETE | /trips/:id | admin | Delete trip |
| PATCH | /trips/:id/status | driver/admin | `{status}` — 'En Route', 'Paused', 'Completed' (also updates bus.current_trip_id) |
| POST | /trips/:id/stops/:stopId/arrive | driver | Record stop arrival time |

### Announcements
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /announcements | — | All announcements (public) |
| POST | /announcements | admin | Create announcement |
| DELETE | /announcements/:id | admin | Delete announcement |

### Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /reports | admin | All reports |
| POST | /reports | — | Submit report (public) |
| PATCH | /reports/:id/status | admin | Update report status |

---

## 9. WebSocket / Socket.io

Server runs on same port as HTTP (using `http.createServer` with Express).

### Events:
```
Client → emit('join-trip', tripId)     → joins room `trip-${tripId}`
Client → emit('join-bus', busId)       → joins room `bus-${busId}`
Server → emit('bus-location', data)    → GPS update broadcast to all in bus room
```

### Location update flow:
1. Driver app calls `PATCH /api/buses/:id/location` with JWT
2. Backend updates `buses.current_latitude/longitude/speed/last_updated` in DB
3. Backend emits `bus-location` to all sockets in `bus-${busId}` room
4. Passenger app receives the update and re-renders bus marker on map

**Authentication:** Passengers connect unauthenticated (no token needed for joining rooms). Drivers use the REST API for location updates (not socket emit directly). The socket authentication middleware allows unauthenticated connections specifically for passenger read-only access.

---

## 10. Admin Dashboard — Next.js 14

### Location: `admin-dashboard/`
### Stack: Next.js 14 (App Router) + TypeScript + Leaflet + next-themes

### Key lib files:
- `src/lib/apiClient.ts` — Singleton ApiClient class wrapping all API calls. Has a private `request()` method and public named methods for each endpoint. Components must use public methods only.

### Pages:
| Path | Description |
|---|---|
| `/login` | Admin login form → JWT stored in localStorage as `adminToken`. If already logged in, redirects to `/`. |
| `/` (dashboard) | Stats overview — total buses, drivers, active trips, announcements. Links to all sections. |
| `/buses` | List all buses with GPS status, current trip, speed. CRUD modals for create/edit/delete. |
| `/drivers` | List all drivers. CRUD modals. Create driver returns initial password. |
| `/routes` | List all routes. Click a route → opens `/routes/[route_id]` detail page. |
| `/routes/[route_id]` | Route detail with interactive Leaflet map showing all stops in order. RouteStopManager component for adding/removing/reordering stops. |
| `/schedules` | Groups schedules by route. Shows each route's departure times. Add/edit/delete schedules. **route_name comes from flat `schedule.route_name` field, not nested.** |
| `/trips` | All trips table with status, bus, driver, route, date. Create trip modal (select schedule + bus + driver). |
| `/monitoring` | LiveMap component — Leaflet map showing all buses with GPS. Real-time WebSocket updates. |
| `/announcements` | List all announcements. Create (title + message). Delete. |
| `/reports` | All passenger reports with type, message, status. Update status (New → In Progress → Resolved). |

### Auth flow in admin dashboard:
- `src/middleware.ts` — Next.js middleware checks for `adminToken` in cookies. If not present on protected routes, redirects to `/login`.
- Token stored in both `localStorage` (for JS use) and `document.cookie` (for middleware).

---

## 11. Driver App — React Native Expo

### Location: `driver-app/`
### Stack: Expo SDK 52 + React Native + TypeScript + Expo Router

### Key Context Files:
- `contexts/SessionContext.tsx` — Provides `driver`, `isLoading`, `login(phone, password)`, `signOut()`. Does NOT have a `session` field — only `driver`. This is critical: `_layout.tsx` must use `driver`, not `session`.
- `contexts/ThemeContext.tsx` — Light/dark theme tokens. `useTheme()` provides `colors` object.

### App structure (Expo Router file-based):
| File | Screen |
|---|---|
| `app/index.tsx` | Login screen. Phone number + password. Calls `login()` from SessionContext. Shows spinner while `isSessionLoading || driver`. If driver is set but not yet navigated, shows spinner. |
| `app/_layout.tsx` | Root layout. SessionProvider + ThemeProvider. AuthLayout checks `driver` (NOT `session`) and redirects: if logged in → `/home`, if not logged in → `/`. CRITICAL BUG FIXED: originally used `session` which doesn't exist in context, causing infinite spinner after login. |
| `app/home.tsx` | Main dashboard. Fetches `GET /drivers/me/trips` via `apiClient.getTrips()`. Filters for today's trips. Shows "next trip" card with Trip ID, Route, Bus, Time, Status badge. Start Trip / Continue Trip button. Quick action cards: History, Announcements, Report. Pull-to-refresh. |
| `app/trip.tsx` | Active trip screen. Receives `trip_id` via URL query param. Shows route stops in order, marks arrived stops. Foreground GPS tracking via expo-location. Background GPS via expo-task-manager. Geofence detection for stop arrivals. Trip controls: Start, Pause, Resume, Complete. |
| `app/profile.tsx` | Driver profile. Shows name, phone, email. Edit profile. |
| `app/history.tsx` | Past completed trips list. |
| `app/announcements.tsx` | Admin announcements (public endpoint, no auth needed). |
| `app/report.tsx` | Report submission form. Type picker + message. |

### Notifications:
- `hooks/useNotifications.ts` — Polls `GET /drivers/me/trips` every 30 seconds. If a new trip appears with status 'Scheduled', shows a local push notification via `expo-notifications`.

### Offline Queue:
- `lib/queue.ts` — AsyncStorage-based queue for GPS updates when offline. Flushes when connectivity returns.

### JWT Storage:
- Token stored in `expo-secure-store`. Automatically included in all requests via apiClient.

### EAS Build:
- `eas.json` has `development`, `preview`, `production` profiles all outputting APK
- `preview` and `production` have `EXPO_PUBLIC_API_BASE_URL: "https://mysurubus-backend.onrender.com/api"` baked in
- `development` has empty URL (auto-detects localhost via Metro)

---

## 12. Passenger App — React Native Expo

### Location: `passenger-app/`
### Stack: Expo SDK 52 + React Native + TypeScript + Expo Router

### Features:
- No authentication required (passengers are anonymous)
- Route search by source + destination stops
- Bus number search
- Live tracking of buses on a map (React Native Maps / Leaflet)
- Stop timeline with ETA calculation
- Announcements (public endpoint)
- Report submission (public endpoint)

### Real-time:
- Connects to Socket.io server
- Joins `bus-${busId}` rooms for buses on the searched route
- Receives `bus-location` events and updates map markers in real-time

### API Base URL:
- Empty during Expo Go local dev (auto-detected)
- Baked-in Render URL in preview/production EAS builds via `eas.json`

---

## 13. Known Issues Fixed During Development

### Issue: Infinite spinner after driver login
- **Cause:** `_layout.tsx` destructured `session` from `useSession()` but `SessionContext` only exports `driver`. `session` was always `undefined`, so `router.replace('/home')` never fired.
- **Fix:** Changed all 3 occurrences in `_layout.tsx` from `session` → `driver`.

### Issue: Schedule page shows `—` instead of route name
- **Cause:** Frontend read `schedule.routes?.route_name` (nested) but backend returns `route_name` as a flat column from SQL JOIN.
- **Fix:** Changed to `schedule.route_name ?? schedule.routes?.route_name ?? ''`.

### Issue: Render deployment fails with "constraint already exists"
- **Cause:** `ALTER TABLE buses ADD CONSTRAINT fk_buses_current_trip ...` ran on every deploy without checking if it exists.
- **Fix:** Wrapped in idempotent `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_buses_current_trip') THEN ... END $$`.

### Issue: "Route not found" on Render backend
- **Cause 1:** Hardcoded `PORT=3001` in `render.yaml` — Render assigns its own dynamic port (~10000), so all traffic was hitting the wrong port.
- **Fix:** Removed `PORT` env var from `render.yaml`. App now reads `process.env.PORT || 3001`.
- **Cause 2:** Migrations didn't run on prod DB — no tables existed.
- **Fix:** Changed Dockerfile CMD from `node dist/server.js` to `node scripts/migrate.js && node dist/server.js`.

### Issue: Driver login returning "Invalid credentials" on prod
- **Cause:** Seed SQL used a hardcoded bcrypt hash from old dev seed that corresponded to a different password.
- **Fix:** Generated correct hash for `Driver@123` using node bcryptjs, updated all 10 drivers in prod DB, and fixed `seed.sql`.

### Issue: RouteStopManager TypeScript error
- **Cause:** Directly calling private `apiClient.request()` method from component.
- **Fix:** Added public methods `getRouteStops`, `addRouteStop`, `updateRouteStop`, `deleteRouteStop` to ApiClient class.

---

## 14. Production Setup (Current State)

### Admin credentials on prod DB:
- `admin@mysurubus.com` / `MysuruBus@2025`
- `admin@mybus.com` / `Admin@123`

### Driver credentials on prod DB:
- Phone: `9876543210` through `9876543219`
- Password: `Driver@123` (all 10 drivers)

### Prod DB connection string:
```
postgresql://mysurubus:qxnjsfNuYtWZ4QYhpvRL5dKuafupd0iV@dpg-d6iu2mua2pns73e6ds50-a.singapore-postgres.render.com/mysurubus_prod?sslmode=require
```

### Seeded data (prod):
- 15 stops (real Mysuru locations)
- 5 routes (1A, 2B, 3C, 4D, 5E)
- 25 route_stops
- 15 schedules (3 per route)
- 10 drivers
- 10 buses (KA-09-F-1001 through 1010)
- 13 trips (10 Scheduled today, 3 Completed yesterday)
- 5 announcements
- 5 passenger reports

---

## 15. Remaining Issues / Known Limitations

| Issue | Severity | Status |
|---|---|---|
| Render free tier cold start (~30s) | High — user-visible | Fix: UptimeRobot ping |
| Driver JWT 24h expiry (no refresh token) | Medium — mid-shift logout | Quick fix: extend to 7d |
| In-memory rate limiter | Low | Sufficient for POC |
| No automated tests | Medium | Deferred |
| Render free DB expires 90 days | High — data loss | Upgrade before expiry |
| Render free tier sleeps after 15min | High — user-visible | Fix: UptimeRobot |

---

## 16. Architecture Rating & Design Justification

**Overall rating: 7.5/10 for a solo project**

**Why this architecture is well-designed:**
1. **TypeScript everywhere** — full type safety across all 4 modules
2. **Raw SQL with pg pool** — no ORM overhead, full query control, connection pooling
3. **Custom JWT** — no third-party auth vendor dependency
4. **Idempotent migrations** — run on every deploy with zero risk
5. **Multi-stage Docker build** — production image contains no TypeScript source
6. **Infrastructure as code** — entire Render setup in `render.yaml`
7. **Circular FK handled correctly** — buses ↔ trips circular dependency properly managed
8. **Graceful shutdown** — SIGTERM/SIGINT handlers for clean deploys
9. **Sentry + Pino** — observability from day one
10. **Role-separated auth** — `requireAdmin` and `requireDriver` middleware
11. **Smart DevOps** — `push.sh` enforces commit conventions, post-checkout hook eliminates env friction
12. **EAS build profiles** — API URL baked in per build type, no manual switching

---

## 17. Future Roadmap (When Funded)

1. **Infrastructure:** Move to AWS (ECS + RDS) with custom domain `mysurubus.com`
2. **Auth:** JWT refresh tokens, driver phone OTP verification
3. **Notifications:** WebSocket push instead of 30s polling
4. **Rate limiting:** Redis-backed (Upstash) for multi-instance safety
5. **Testing:** Jest/Supertest for auth + trip flow endpoints
6. **Geofencing:** Server-side validation (currently client-side only)
7. **Event sourcing:** Immutable `trip_events` table for audit trail
8. **Traffic ETA:** OSRM integration for real-world routing ETAs

---

*Last updated: March 2026 | Branch: dev | Status: Live on Render + Vercel*
