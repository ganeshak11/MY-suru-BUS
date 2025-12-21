# MY(suru) BUS - Code Snippets Documentation

## 4.3.1 Overall System Control Flow

**Conceptual Overview (No code)**

The MY(suru) BUS system operates through the following high-level flow:

1. **Driver Initiates Trip** → Trip status changes from "Scheduled" to "En Route"
2. **Background Location Task Activates** → GPS coordinates captured every 15 seconds
3. **Geofencing Logic Engages** → Distance calculations against stop boundaries
4. **Stop Arrival Detected** → Arrival data queued or pushed directly
5. **Real-Time Propagation** → Passengers notified via Supabase subscriptions
6. **Trip Completion** → Final queue processing, then trip marked "Completed"

This is an async, event-driven architecture with graceful offline fallback through persistent queuing.

---

## 4.3.2 Driver Trip Execution Control Flow

### A. Trip Start and Status Transition

**File:** `driver-app/app/trip.tsx` (lines 220-242)

Updating trip status + initializing location tracking:

```tsx
// Update trip status to En Route if it's Scheduled
if (tripData.status === "Scheduled") {
  const { error: statusError } = await supabase
    .from("trips")
    .update({ status: "En Route" })
    .eq("trip_id", id);

  if (statusError) {
    const errorMsg = statusError?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
    console.error("Failed to update trip status:", errorMsg);
  }
}

// Update bus with current trip
const { error: busUpdateError } = await supabase
  .from("buses")
  .update({ current_trip_id: id })
  .eq("bus_id", tripData.bus_id);

if (busUpdateError) {
  const errorMsg = busUpdateError?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
  console.error("Failed to update bus trip:", errorMsg);
}

// Start background tracking with trip stops
if (tripData.bus_id) {
  const trackingStarted = await startLocationTracking(tripData.bus_id, id, formattedStops);
  if (!trackingStarted) {
    Alert.alert("Warning", "Location tracking failed to start.");
  }
}
```

### B. Background Location Task with GPS Capture & Geofence Detection

**File:** `driver-app/hooks/useDriverLocation.ts` (lines 220-360)

Core background task definition executed every 15 seconds. The task captures GPS coordinates and evaluates geofences, with automatic fallback to offline queue on network failure:

```tsx
TaskManager.defineTask(LOCATION_TASK_NAME, async (task: any) => {
  try {
    if (!task?.data?.locations?.length) return;

    const location = task.data.locations[task.data.locations.length - 1];
    const busIdStr = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
    const tripId = await AsyncStorage.getItem(CURRENT_TRIP_ID_KEY);

    if (!busIdStr) return;

    const payload: LocationUpdatePayload = {
      bus_id: parseInt(busIdStr, 10),
      current_latitude: location.coords.latitude,
      current_longitude: location.coords.longitude,
      last_updated: new Date().toISOString(),
      current_speed_kmh: location.coords.speed ? location.coords.speed * 3.6 : null,
    };

    // Attempt database update with 10-second timeout; fall back to queue on failure
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      const updatePromise = supabase.from('buses').update(payload).eq('bus_id', payload.bus_id);

      const { error: supabaseError } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (supabaseError) {
        await addUpdateToQueue(payload);
      } else {
        await processLocationQueue();
      }
    } catch (dbError: any) {
      await addUpdateToQueue(payload);
    }

    // --- GEOFENCING: Check if bus entered any stop geofence ---
    if (tripId) {
      try {
        const tripsStopsStr = await AsyncStorage.getItem(TRIP_STOPS_KEY);
        if (!tripsStopsStr) return;
        
        const tripStops = JSON.parse(tripsStopsStr);
        const busLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude };

        for (const stop of tripStops) {
          if (stop.completed) continue;

          const distance = getDistance(busLocation, {
            latitude: stop.latitude,
            longitude: stop.longitude,
          });

          if (distance < stop.geofence_radius_meters) {
            const updatedStops = tripStops.map((s: any) =>
              s.stop_id === stop.stop_id ? { ...s, completed: true } : s
            );
            await AsyncStorage.setItem(TRIP_STOPS_KEY, JSON.stringify(updatedStops));

            // Queue arrival for batch insert
            await queueArrival({
              trip_id: parseInt(tripId, 10),
              stop_id: stop.stop_id,
              actual_arrival_time: formatTimestamp(),
            });
            break;
          }
        }
      } catch (geoError) {
        console.error("[BG TASK] Geofencing error:", geoError);
      }
    }
  } catch (e) {
    console.error("[BG TASK] Unexpected error:", e);
  }
});
```

### C. Offline Queue: Persistence and Batch Processing

**File:** `driver-app/lib/queue.ts` (complete file)

All location updates and stop arrivals are queued locally and retried on network recovery. Duplicate arrivals (unique constraint violations) are silently cleared:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const ARRIVAL_QUEUE_KEY = "arrival_queue";

export type QueuedArrival = {
  trip_id: number;
  stop_id: number;
  actual_arrival_time: string;
};

// Add an arrival to the queue
export const queueArrival = async (arrival: QueuedArrival) => {
  try {
    if (!arrival || typeof arrival.trip_id !== 'number' || typeof arrival.stop_id !== 'number') {
      throw new Error('Invalid arrival data');
    }
    
    const existingQueue = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    const queue: QueuedArrival[] = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push(arrival);
    await AsyncStorage.setItem(ARRIVAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (e: any) {
    const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
    console.error("Failed to queue arrival:", errorMsg);
  }
};

// Process the queue: attempt batch insert with timeout fallback
export const processArrivalQueue = async () => {
  try {
    const existingQueue = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    if (!existingQueue) return;

    const queue: QueuedArrival[] = JSON.parse(existingQueue);
    if (queue.length === 0) return;

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    
    const insertPromise = supabase.from("trip_stop_times").insert(queue);
    const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;

    if (error) {
      // Code 23505 = unique constraint violation (duplicate arrival already recorded)
      if (error.code === '23505') {
        await AsyncStorage.removeItem(ARRIVAL_QUEUE_KEY);
        return;
      }
      throw new Error(error.message || 'Queue insert failed');
    }

    await AsyncStorage.removeItem(ARRIVAL_QUEUE_KEY);
  } catch (e: any) {
    const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
    console.error("Failed to process arrival queue:", errorMsg);
    // Queue persists for next retry attempt
  }
};
```

### D. Periodic Queue Retry & Foreground Geofencing

**Trip Screen Implementation** (`driver-app/app/trip.tsx`):

- **Periodic processing**: Queue retry runs every 30 seconds via `setInterval`, ensuring offline data eventually reaches the server
- **Foreground geofencing**: Redundant client-side geofence detection with 5-second debounce prevents duplicate stop arrivals in case background task misses the boundary crossing
- **Real-time feedback**: Foreground location watcher provides immediate UI updates while background task persists data independently

This dual-layer approach ensures reliability: the background task is the source of truth, while the foreground layer provides responsiveness to the driver.

---

## 4.3.3 Real-Time Update Propagation Flow

### A. Passenger-Side Bus Location Subscription

**File:** `passenger-app/app/RouteDetails/[route_id].tsx` (lines 200–212)

Real-time bus location updates via Supabase PostgreSQL Change notifications:

```tsx
const busSubscription = supabase
  .channel('public:buses')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'buses' }, (payload) => {
    setBusLocations((prev) => {
      const exists = prev.find(b => b.bus_id === payload.new.bus_id);
      if (exists) {
        return prev.map((bus) => bus.bus_id === payload.new.bus_id ? payload.new : bus);
      }
      return prev;
    });
  })
  .subscribe();
```

### B. Passenger-Side Trip Stop Arrival Subscription

**File:** `passenger-app/app/RouteDetails/[route_id].tsx` (lines 214–230)

Subscribing to arrival insertions with trip-level filtering to update stop statuses in real-time:

```tsx
const tripStopSubscription = activeTripId ? supabase
  .channel(`trip_stop_times:${activeTripId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_stop_times', filter: `trip_id=eq.${activeTripId}` }, (payload) => {
    const arrivedStopId = payload.new.stop_id;
    const actualArrivalTime = payload.new.actual_arrival_time;
    setStops((prev) => {
      const updatedStops = prev.map((s) => 
        s.stop_id === arrivedStopId 
          ? { ...s, status: 'Completed' as const, actual_arrival_time: actualArrivalTime } 
          : s
      );
      const nextIndex = updatedStops.findIndex((s) => s.status === 'Pending');
      if (nextIndex !== -1) {
        setCurrentStopIndex(nextIndex);
      }
      return updatedStops;
    });
  })
  .subscribe() : null;
```

**Subscription cleanup on component unmount:**

```tsx
return () => {
  supabase.removeChannel(busSubscription);
  if (tripStopSubscription) {
    supabase.removeChannel(tripStopSubscription);
  }
};
```

---

## 4.3.4 Passenger Application Control Flow

Passenger app subscribes to two real-time channels:
1. **Bus updates**: Receives location changes every 15 seconds
2. **Trip stop times**: Receives arrival insertions as they are recorded

The app also implements local geofencing to show immediate visual feedback before server-confirmed arrival is received, providing responsive UX while maintaining single source of truth on the backend.

---

## 4.3.5 Error and Exception Handling Flow

### A. GPS Permission Denied & Graceful Fallback

**File:** `driver-app/hooks/useDriverLocation.ts` (lines 100–130)

Permission checks before attempting location tracking; non-critical failures (e.g., background permission) do not crash the app:

```tsx
const requestPermissions = async () => {
  try {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
      Alert.alert("Permission Denied", "Location permission is required to use the driver app.");
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') {
      Alert.alert("Background Permission", "Background location is recommended for best tracking.");
      // Don't fail here - allow app to continue
    }

    return true;
  } catch (e: any) {
    Alert.alert("Error", `Permission request failed: ${e?.message}`);
    return false;
  }
};
```

### B. Network Failure → Offline Queue Fallback

**File:** `driver-app/hooks/useDriverLocation.ts` (background task) & `driver-app/lib/queue.ts`

10-second timeout on database writes; if Supabase is unreachable, data is queued locally:

```tsx
try {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), 10000)
  );

  const updatePromise = supabase.from('buses').update(payload).eq('bus_id', busId);

  const { error: supabaseError } = await Promise.race([updatePromise, timeoutPromise]) as any;

  if (supabaseError) {
    // Network down or timeout — queue the update
    await addUpdateToQueue(payload);
  } else {
    // Success — attempt to drain the queue
    await processLocationQueue();
  }
} catch (dbError: any) {
  console.error("[BG TASK] DB error:", dbError?.message || dbError);
  await addUpdateToQueue(payload);
}
```

### C. Duplicate Arrival Prevention (Database Constraints)

**File:** `driver-app/lib/queue.ts`

Unique constraint on `(trip_id, stop_id)` prevents duplicate arrivals. If the queue processor receives a 23505 error (constraint violation), the queue is cleared without crashing:

```tsx
const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;

if (error) {
  // 23505 = unique constraint violation (arrival already recorded)
  if (error.code === '23505') {
    await AsyncStorage.removeItem(ARRIVAL_QUEUE_KEY);
    return;  // Silently succeed
  }
  throw new Error(error.message || 'Failed to insert queue items');
}
```

### D. Non-Critical Startup Failure

When background location tracking fails to start after trip status update, a non-blocking warning alert is displayed. The driver can proceed with the trip using foreground tracking, demonstrating graceful degradation.

### E. Periodic Queue Retry with Persistent Storage

Queue processing runs every 30 seconds in the foreground. If a retry fails due to network conditions, the queue persists in AsyncStorage and the next interval will attempt again. This ensures eventual delivery without requiring exponential backoff during the trip duration.

### F. Trip Completion Error Recovery

When the driver stops the trip, the app attempts to process any queued arrivals, update trip status, and clear bus metadata. Non-critical errors (e.g., queue processing failure during trip stop) are logged but do not prevent trip completion, ensuring the driver can exit cleanly regardless of network state.

---

## Summary: Resilience Patterns

1. **Offline-First Queue**: All location & arrival data persisted locally before upload
2. **Timeout Fallback**: 10–15 second timeouts trigger queue insertion instead of blocking
3. **Graceful Degradation**: Non-critical failures (tracking startup, notifications) do not crash the app
4. **Duplicate Prevention**: Unique database constraints silently clear duplicate queue items
5. **Periodic Retry**: 30-second background queue processor ensures eventual delivery
6. **Debouncing**: Foreground geofencing includes 5-second debounce to prevent spurious triggers
7. **Defensive Logging**: All errors captured and logged without exposing sensitive information

