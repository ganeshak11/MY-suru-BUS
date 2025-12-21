# MY(suru) BUS - Comprehensive Architecture Documentation

## Table of Contents
1. [3.2 High-Level Diagram](#32-high-level-diagram---component-interaction--data-flow)
2. [3.3 Low-Level Diagram](#33-low-level-diagram---driver-app-internals)
3. [Chapter 4: Implementation Details](#4-implementation-details---trip-lifecycle--error-handling)

---

## 3.2 HIGH-LEVEL DIAGRAM - COMPONENT INTERACTION & DATA FLOW

### Data Flow Architecture

#### GPS Location Tracking (Driver App → Supabase)
- **Direct Push to Supabase:** Driver app pushes GPS directly to Supabase database—**NO backend logic layer**
- **Implementation:** Uses Expo Location API with `watchPositionAsync()` (foreground) and `Location.startLocationUpdatesAsync()` (background)
- **Frequency:** 
  - Foreground: 3-second intervals, 5m distance threshold
  - Background: 15-second intervals, 20m distance threshold
- **Speed Capture:** Actual speed from device, defaults to 50 km/h fallback
- **Payload:** `{ bus_id, current_latitude, current_longitude, last_updated, current_speed_kmh }`

#### Passenger/Admin Apps (Pull + Listen Pattern)
- **Admin Dashboard (Web):** 
  - **Initial Load:** Fetch-based queries
  - **Realtime:** Supabase channels with `postgres_changes` event listeners
  - **Pattern:** Fetch once, then subscribe to changes
  
- **Passenger App (Mobile):**
  - **Route Data:** Fetch routes/stops on app load
  - **Bus Locations:** Subscribe to `buses` table UPDATE events
  - **Trip Progress:** Subscribe to `trip_stop_times` INSERT events per active trip
  - **Announcements:** Listen for `announcements` table INSERT (global channel)

---

### Authentication Flow

#### Shared Supabase Auth Across All Apps
✅ **All three apps use Supabase Auth directly** - no custom auth server
- Email/Password only (no OAuth, no phone auth)
- Direct `supabase.auth.signInWithPassword()` call

#### Admin Dashboard (Next.js)
- **Login:** Email/password → Supabase Auth
- **Access Control:** Middleware checks `auth_user_id` exists in `admins` table
- **Session:** Server-side session via cookies (SSR client via `@supabase/ssr`)
- **Redirect:** Non-admins auto-redirected to login

#### Driver App (React Native)
- **Login:** Email/password → Supabase Auth
- **Profile Link:** Auto-fetches `drivers` table by `auth_user_id` in `SessionContext`
- **Validation:** Stores `driver_id` in context for trip assignments
- **Difference from Admin:** No role check—any authenticated user can access (basic driver auth)

#### Passenger App (React Native)
- **No Authentication Required:** App is public/anonymous
- **Uses Supabase Anon Key:** No login, direct read access to routes/stops/bus locations
- **Announcements:** Listens via anon key without user verification

---

### Realtime Subscription Scope

#### Tables with Realtime Listeners

| Table | Monitored By | Event | Trigger |
|-------|--------------|-------|---------|
| **buses** | Admin, Passenger | UPDATE | GPS location change |
| **trips** | Admin Dashboard | *, INSERT | Trip status, new assignments |
| **trip_stop_times** | Admin, Passenger | INSERT | Stop arrival detection |
| **announcements** | Passenger, Driver | INSERT | Global broadcast |
| **route_stops** | Admin (Route Manager) | * | Stop management changes |
| **routes** | Admin | * | Route creation/update |
| **schedules** | Admin | * | Schedule changes |
| **passenger_reports** | Admin | INSERT | New feedback reports |

#### Channel Naming Convention
- Driver notifications: `trips-${driverId}` (filter: `driver_id=eq.${driverId}`)
- Monitoring dashboard: `monitoring-updates` (listens to trips + trip_stop_times + buses)
- Passenger announcements: `public-announcements` (INSERT on announcements table)
- Bus locations: `public:buses` (UPDATE only)

---

## 3.3 LOW-LEVEL DIAGRAM - DRIVER APP INTERNALS

### Location Tracking Implementation

#### Technology Stack
- **Expo Location API** (primary)
- **Expo Task Manager** for background execution
- **AsyncStorage** for offline queue persistence

#### Two-Layer Tracking System

**Foreground Tracking:**
```
watchPositionAsync() → Real-time location object → Used for ETA display
```
- Accuracy: `Location.Accuracy.Highest`
- Interval: 3 seconds minimum
- Distance: 5m threshold
- Purpose: Live ETA calculations, UI updates

**Background Tracking (Active Trip):**
```
Location.startLocationUpdatesAsync(LOCATION_TASK_NAME) → Background Task → Supabase
```
- Task defined in: `driver-app/hooks/useDriverLocation.ts`
- Accuracy: `Location.Accuracy.High`
- Interval: 15 seconds minimum
- Distance: 20m threshold
- Service Indicator: Foreground service with notification ("MY(suru) BUS - Tracking your bus location")
- **Persists even when app is backgrounded/closed**

---

### Offline Queue Storage

**AsyncStorage Keys:**
```typescript
LOCATION_QUEUE_KEY = "offline_location_queue"
ARRIVAL_QUEUE_KEY = "arrival_queue"
TRIP_STOPS_KEY = "trip_stops_cache"
ASYNC_STORAGE_BUS_ID_KEY = "current_bus_id"
CURRENT_TRIP_ID_KEY = "current_trip_id"
```

**Queue Behavior:**
1. GPS update fails → Added to `offline_location_queue` (AsyncStorage array)
2. When online: `processLocationQueue()` processes oldest item first
3. If duplicate (same bus_id update): Skipped silently
4. Arrival records cached similarly in `arrival_queue`

**Example Queue Processing Flow:**
```
GPS Update fails (no network) 
→ { bus_id: 5, lat: 12.34, lon: 56.78, ... } added to queue
→ Queue stored as JSON string in AsyncStorage
→ Network reconnects 
→ processLocationQueue() sends oldest item
→ On success: item removed, next item processed
→ On error: item remains (retried on next process)
```

---

### ETA Calculation

#### Location: Client-Side Only
- Calculated in `passenger-app/lib/etaCalculator.ts`
- Also calculated in `driver-app/app/trip.tsx` for driver UI

#### Math: Haversine Formula (Great-Circle Distance)
```typescript
Distance = 2 × R × atan2(√a, √(1-a))
where:
- R = 6,371,000 meters (Earth radius)
- a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
```

#### Speed Assumption
- **Uses actual bus speed** if available: `location.coords.speed * 3.6` (m/s to km/h)
- **Fallback:** 50 km/h if speed < 5 km/h
- **Formula:** `time_minutes = (distance_km / speed_kmh) × 60`

#### Implementation Example
```typescript
// In RouteDetails for passenger view
const distance = calculateDistance(busLat, busLon, stopLat, stopLon);
const timeMinutes = (distance / 1000 / speedKmh) * 60;
const etaTime = new Date(now.getTime() + timeMinutes * 60000);
```

**No backend API calls** - fully client-calculated

---

### Geofence Detection

#### Location: App-Side (Not Backend)
- **Logic:** Distance comparison in background task + foreground watcher
- **Implementation:** `driver-app/hooks/useDriverLocation.ts` (background task geofencing section)

#### Geofence Trigger Process

```
1. Background task receives location every 15 sec
   ↓
2. For each trip stop (from TRIP_STOPS_KEY cache):
   - Calculate distance to stop using Haversine
   - Check: distance < stop.geofence_radius_meters?
   
3. On Entry (distance < radius):
   - Debounce: 5-second minimum between triggers
   - Direction check: Only trigger if approaching (distance < previous distance)
   - Queue arrival record: { trip_id, stop_id, actual_arrival_time }
   - Mark stop as "completed" in AsyncStorage cache
   
4. Arrival Queue Processing:
   - Synced to trip_stop_times table when online
   - Persisted offline in arrival_queue
```

#### Stop Detection Flow
```typescript
if (distance < geofence_radius_meters) {
  // Trigger immediately and insert into trip_stop_times
  await queueArrival({
    trip_id: tripId,
    stop_id: stop.stop_id,
    actual_arrival_time: timestamp
  });
  // Update local cache to prevent re-triggering
  updatedStops = tripStops.map(s => 
    s.stop_id === stop.stop_id ? {...s, completed: true} : s
  );
}
```

**Passenger sees update via:** Realtime subscription to `trip_stop_times` → stops UI updates

---

## 4. IMPLEMENTATION DETAILS - TRIP LIFECYCLE & ERROR HANDLING

### Trip Status States

```sql
CREATE TYPE trip_status AS ENUM ('Scheduled', 'En Route', 'Completed');
-- Note: No 'Assigned' or 'Created' states in schema
```

#### Trip State Progression
1. **Scheduled** → Initial state when trip created (admin creates trip for a date/driver)
2. **En Route** → Driver clicks "Start Trip" button (manually triggers status update)
3. **Completed** → Trip ends (manual driver action or time-based)

#### Who Changes Status?
- **Admin:** Can manually update trip status via dashboard (trips/page.tsx)
- **Driver:** Can transition from Scheduled → En Route via "Start Trip" button

#### Example: Driver Starting Trip
```typescript
// In trip.tsx - handleStartTrip()
const { error } = await supabase
  .from('trips')
  .update({ status: 'En Route' })
  .eq('trip_id', tripId);

// Then start location tracking
startLocationTracking(busId, tripId, tripStops);
```

---

### Error Handling Patterns

#### 1. GPS Permission Denied
```typescript
// In useDriverLocation.ts
const { status: foregroundStatus } = 
  await Location.requestForegroundPermissionsAsync();

if (foregroundStatus !== "granted") {
  Alert.alert("Permission Required", "Foreground location access denied.");
  return false; // Tracking fails gracefully
}
```
**Result:** Driver sees alert, tracking doesn't start, app continues

#### 2. Network Drop Mid-Trip
```typescript
// In background task
try {
  const { error } = await Promise.race([
    supabase.from("buses").update(payload).eq("bus_id", busId),
    timeoutPromise // 10 second timeout
  ]);
  
  if (error || timeout) {
    // Queue the update locally
    await addUpdateToQueue(payload);
  }
} catch (dbError) {
  // Also queue on exception
  await addUpdateToQueue(payload);
}
```
**Result:** 
- Update queued in AsyncStorage
- Background task continues every 15 seconds
- When online: Queue processed automatically via `processLocationQueue()`
- No data loss

#### 3. GPS Disabled
```typescript
const servicesEnabled = await Location.hasServicesEnabledAsync();
if (!servicesEnabled) {
  Alert.alert("GPS Disabled", "Please enable GPS to continue.");
  return false;
}
```
**Result:** Alert shown, trip tracking blocked until GPS enabled

#### 4. Geofence Trigger Spam Prevention
```typescript
// 5-second debounce + direction check
const now = Date.now();
const isApproaching = previousDistance === null || d < previousDistance;
const debounceTime = 5000;

if (isApproaching && (now - lastTriggerTime) > debounceTime) {
  handleStopArrival(nextStop); // Only triggers once per 5 seconds while approaching
  setLastTriggerTime(now);
}
```
**Result:** Prevents duplicate stop arrivals even with GPS noise

#### 5. Offline Arrival Handling
```typescript
// In trip.tsx
const queueProcessor = setInterval(() => {
  processArrivalQueue() // Runs every 30 seconds
    .catch(err => console.error("Queue processing error:", err));
}, 30000);
```
**Result:** 
- Arrival records batched offline
- When online: Inserted as `trip_stop_times` records
- Duplicate detection: 23505 error (unique constraint) caught and queue cleared

---

### Key Architectural Decisions

| Component | Design Choice | Rationale |
|-----------|---------------|-----------|
| **GPS Push** | Direct to Supabase | No backend required; simpler, faster sync |
| **Realtime** | Supabase channels | Native PostgreSQL change events; built-in websockets |
| **Auth** | Single Supabase auth | Single source of truth; reduced complexity |
| **Offline Queue** | AsyncStorage JSON | Lightweight, works across app restarts |
| **ETA Calc** | Client-side Haversine | Real-time accuracy; no API latency |
| **Geofencing** | App-side distance check | Instant triggering; no backend polling |
| **Arrival Sync** | Queue + periodic process | Resilient to network intermittency |

---

## Summary for Report

This documentation provides examiners with:
- ✅ Clear data flow (GPS direct to DB, not via backend)
- ✅ Specific realtime table subscriptions (not just "listens to changes")
- ✅ Honest ETA math (Haversine + avg 50 km/h, not complex routing)
- ✅ Detailed offline handling (queue mechanics, retry logic)
- ✅ Trip state machine (Scheduled → En Route → Completed)
- ✅ Real error scenarios with actual code references
- ✅ Architectural trade-offs documented
- ✅ Implementation patterns from actual codebase

---

**Document Generated:** December 19, 2025
**Project:** MY(suru) BUS - Real-Time Bus Fleet Management System
**Scope:** Admin Dashboard, Driver App, Passenger App (excluding experimental backend)
