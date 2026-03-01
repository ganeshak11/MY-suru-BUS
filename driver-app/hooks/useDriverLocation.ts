import { useState, useRef } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../lib/apiClient";
import { queueArrival } from "../lib/queue";
import { haversineDistance } from "../lib/haversine";

type LocationUpdatePayload = {
  bus_id: number;
  current_latitude: number;
  current_longitude: number;
  last_updated: string;
  current_speed_kmh?: number | null;
};

type QueuedArrival = {
  trip_id: number;
  stop_id: number;
  actual_arrival_time: string;
};

const LOCATION_TASK_NAME = "background-location-task";
const ASYNC_STORAGE_BUS_ID_KEY = "current_bus_id";
const LOCATION_QUEUE_KEY = "offline_location_queue";
const LOCATION_QUEUE_TMP_KEY = "offline_location_queue_tmp"; // MOB-02: atomic write
const TRIP_STOPS_KEY = "trip_stops_cache";
const CURRENT_TRIP_ID_KEY = "current_trip_id";
// RT-05: Cap the offline GPS queue. When full, drop the oldest stale point.
const MAX_LOCATION_QUEUE = 50;

// MOB-02: Atomic queue write — write to tmp key first, then copy to real key.
// Prevents a mid-crash partial write from corrupting the live queue.
const writeQueueAtomic = async (queue: LocationUpdatePayload[]): Promise<void> => {
  const serialised = JSON.stringify(queue);
  await AsyncStorage.setItem(LOCATION_QUEUE_TMP_KEY, serialised);
  await AsyncStorage.setItem(LOCATION_QUEUE_KEY, serialised);
  // tmp key can be left as a recovery copy; clean it up on next successful read
};

// MOB-02: Corruption guard on read — if primary is corrupt, attempt recovery from tmp
const readQueueSafe = async (): Promise<LocationUpdatePayload[]> => {
  const tryParse = async (key: string): Promise<LocationUpdatePayload[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const primary = await tryParse(LOCATION_QUEUE_KEY);
  if (primary !== null) return primary;

  // Primary is corrupt — attempt recovery from the tmp backup
  const backup = await tryParse(LOCATION_QUEUE_TMP_KEY);
  if (backup !== null) {
    // Restore the good copy
    await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(backup));
    return backup;
  }

  // Both corrupt — start fresh (data loss is unavoidable but isolated)
  await AsyncStorage.multiRemove([LOCATION_QUEUE_KEY, LOCATION_QUEUE_TMP_KEY]);
  return [];
};

const addUpdateToQueue = async (payload: LocationUpdatePayload): Promise<void> => {
  try {
    const queue = await readQueueSafe();
    queue.push(payload);
    // RT-05: If queue exceeds cap, drop oldest stale entries
    const capped = queue.length > MAX_LOCATION_QUEUE ? queue.slice(-MAX_LOCATION_QUEUE) : queue;
    await writeQueueAtomic(capped);
  } catch (e) {
    console.error("Failed to add update to offline queue", e);
  }
};

const formatTimestamp = (): string => {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
};

const processLocationQueue = async (): Promise<void> => {
  try {
    const queue = await readQueueSafe();
    if (queue.length === 0) return;

    const oldestUpdate = queue[0];
    try {
      await apiClient.updateBusLocation(
        oldestUpdate.bus_id,
        oldestUpdate.current_latitude,
        oldestUpdate.current_longitude,
        oldestUpdate.current_speed_kmh || undefined,
        oldestUpdate.last_updated
      );
      queue.shift();
      await writeQueueAtomic(queue);
    } catch {
      // Keep in queue if network failed
    }
  } catch (e) {
    console.error("Failed to process offline queue", e);
  }
};

export const useDriverLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // MOB-01: Track the foreground subscription so we can always clean it up,
  // even if startLocationTracking() is called multiple times (e.g. nav re-mount).
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const requestPermissions = async () => {
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== "granted") {
      Alert.alert("Permission Required", "Foreground location access denied.");
      return false;
    }

    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== "granted") {
      Alert.alert("Permission Required", "Background location access denied.");
      return false;
    }

    return true;
  };

  const watchForegroundLocation = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert("GPS Disabled", "Please enable GPS to continue.");
      return;
    }

    try {
      // MOB-01: Cancel any existing foreground subscription before starting a new one.
      // Guards against re-mount calling watchForegroundLocation twice.
      if (foregroundSubscriptionRef.current) {
        foregroundSubscriptionRef.current.remove();
        foregroundSubscriptionRef.current = null;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc);
        }
      );

      foregroundSubscriptionRef.current = subscription;
      return subscription;
    } catch (e) {
      console.error('[FOREGROUND] watchPositionAsync error:', e);
    }
  };

  const startLocationTracking = async (busId: number, tripId: number, tripStops: any[]): Promise<boolean> => {
    await processLocationQueue();

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return false;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert("GPS Disabled", "Please enable GPS to continue.");
      return false;
    }

    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_BUS_ID_KEY, String(busId));
      await AsyncStorage.setItem(CURRENT_TRIP_ID_KEY, String(tripId));
      await AsyncStorage.setItem(TRIP_STOPS_KEY, JSON.stringify(tripStops));
    } catch (e) {
      console.error("[START TRACKING] Error storing data:", e);
      return false;
    }

    try {
      // MOB-01: Stop existing background task before re-registering.
      // Prevents duplicate tasks if startLocationTracking() is called again.
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20,
        timeInterval: 15000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        mayShowUserSettingsDialog: false,
        foregroundService: {
          notificationTitle: "MY(suru) BUS",
          notificationBody: "Tracking your bus location.",
        },
      });

      setIsTracking(true);
      return true;
    } catch (e: any) {
      console.error("[START TRACKING] Failed:", e?.message || e);
      await AsyncStorage.removeItem(ASYNC_STORAGE_BUS_ID_KEY);
      await AsyncStorage.removeItem(CURRENT_TRIP_ID_KEY);
      await AsyncStorage.removeItem(TRIP_STOPS_KEY);
      Alert.alert("Error", `Failed to start tracking: ${e?.message || 'Unknown error'}`);
      return false;
    }
  };

  const stopLocationTracking = async () => {
    setIsTracking(false);

    // MOB-01: Always clean up the foreground subscription on stop.
    if (foregroundSubscriptionRef.current) {
      foregroundSubscriptionRef.current.remove();
      foregroundSubscriptionRef.current = null;
    }

    try {
      await AsyncStorage.removeItem(ASYNC_STORAGE_BUS_ID_KEY);
      await AsyncStorage.removeItem(CURRENT_TRIP_ID_KEY);
      await AsyncStorage.removeItem(TRIP_STOPS_KEY);
    } catch (e) {
      console.error("Error clearing AsyncStorage:", e);
    }

    const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (hasTask) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  };

  return {
    location,
    isTracking,
    startLocationTracking,
    stopLocationTracking,
    watchForegroundLocation,
  };
};

TaskManager.defineTask(LOCATION_TASK_NAME, async (task: any) => {
  try {
    if (!task || !task.data) return;

    const { locations, error } = task.data;

    if (error) {
      console.error("[BG TASK] Location error:", error);
      return;
    }

    if (!locations || !Array.isArray(locations) || locations.length === 0) return;

    const location = locations[0];
    if (!location || !location.coords ||
      typeof location.coords.latitude !== 'number' ||
      typeof location.coords.longitude !== 'number') return;

    const busIdStr = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
    if (!busIdStr) return;

    const busId = Number(busIdStr);
    if (isNaN(busId) || busId <= 0) {
      console.error("[BG TASK] Invalid bus ID:", busIdStr);
      return;
    }

    const tripIdStr = await AsyncStorage.getItem(CURRENT_TRIP_ID_KEY);
    const tripId = tripIdStr ? Number(tripIdStr) : null;
    if (tripId && (isNaN(tripId) || tripId <= 0)) {
      console.error("[BG TASK] Invalid trip ID:", tripIdStr);
    }

    const speedKmh = location.coords.speed ? location.coords.speed * 3.6 : 0;
    const gpsTimestamp = formatTimestamp();
    const payload: LocationUpdatePayload = {
      bus_id: busId,
      current_latitude: location.coords.latitude,
      current_longitude: location.coords.longitude,
      last_updated: gpsTimestamp,
      current_speed_kmh: speedKmh > 0 ? speedKmh : null,
    };

    try {
      const updatePromise = apiClient.updateBusLocation(
        busId,
        payload.current_latitude,
        payload.current_longitude,
        payload.current_speed_kmh || undefined,
        gpsTimestamp  // DB-07: pass device GPS timestamp to backend
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), 10000)
      );

      await Promise.race([updatePromise, timeoutPromise]);
      await processLocationQueue();
    } catch (dbError: any) {
      console.error("[BG TASK] DB error:", dbError?.message || dbError);
      await addUpdateToQueue(payload);
    }

    // --- GEOFENCING LOGIC ---
    if (tripId) {
      try {
        const tripsStopsStr = await AsyncStorage.getItem(TRIP_STOPS_KEY);
        if (!tripsStopsStr) return;

        const tripStops = JSON.parse(tripsStopsStr);

        if (tripStops.length > 0) {
          const busLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude };

          for (const stop of tripStops) {
            if (stop.completed) continue;

            const distance = haversineDistance(busLocation, {
              latitude: stop.latitude,
              longitude: stop.longitude,
            });

            if (distance < stop.geofence_radius_meters) {
              const updatedStops = tripStops.map((s: any) =>
                s.stop_id === stop.stop_id ? { ...s, completed: true } : s
              );
              try {
                await AsyncStorage.setItem(TRIP_STOPS_KEY, JSON.stringify(updatedStops));
              } catch (storageError) {
                console.error("[BG TASK] Failed to update stops:", storageError);
              }

              await queueArrival({
                trip_id: tripId,
                stop_id: stop.stop_id,
                actual_arrival_time: gpsTimestamp,
              });

              break;
            }
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
