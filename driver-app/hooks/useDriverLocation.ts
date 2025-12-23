import { useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { supabase } from "../lib/supabaseClient";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../lib/apiClient";

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
const ARRIVAL_QUEUE_KEY = "arrival_queue";
const TRIP_STOPS_KEY = "trip_stops_cache";
const CURRENT_TRIP_ID_KEY = "current_trip_id";

const addUpdateToQueue = async (payload: LocationUpdatePayload) => {
  try {
    const rawQueue = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
    const queue: LocationUpdatePayload[] = JSON.parse(rawQueue || "[]");
    queue.push(payload);
    await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to add update to offline queue", e);
  }
};

const queueArrival = async (arrival: QueuedArrival) => {
  try {
    const existingQueue = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    const queue: QueuedArrival[] = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push(arrival);
    await AsyncStorage.setItem(ARRIVAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to queue arrival:", e);
  }
};

const getDistance = (coords1: { latitude: number; longitude: number }, coords2: { latitude: number; longitude: number }): number => {
  const R = 6371e3;
  const lat1 = (coords1.latitude * Math.PI) / 180;
  const lat2 = (coords2.latitude * Math.PI) / 180;
  const deltaLat = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
  const deltaLon = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

const processLocationQueue = async () => {
  try {
    const rawQueue = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
    const queue: LocationUpdatePayload[] = JSON.parse(rawQueue || "[]");

    if (queue.length === 0) return;

    const oldestUpdate = queue[0];
    try {
      await apiClient.updateBusLocation(
        oldestUpdate.bus_id,
        oldestUpdate.current_latitude,
        oldestUpdate.current_longitude,
        oldestUpdate.current_speed_kmh || undefined
      );
      queue.shift();
      await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      // Keep in queue if failed
    }
  } catch (e) {
    console.error("Failed to process offline queue", e);
  }
};

export const useDriverLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);

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
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc);
        }
      );
    } catch (e) {
      console.error("[FOREGROUND] watchPositionAsync error:", e);
    }
  };

  const startLocationTracking = async (busId: number, tripId: number, tripStops: any[]): Promise<boolean> => {
    // log removed for production
    await processLocationQueue();

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      // log removed for production
      return false;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert("GPS Disabled", "Please enable GPS to continue.");
      return false;
    }

    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_BUS_ID_KEY, String(busId));
      await AsyncStorage.setItem(CURRENT_TRIP_ID_KEY, String(tripId));
      await AsyncStorage.setItem(TRIP_STOPS_KEY, JSON.stringify(tripStops));
      // log removed for production
    } catch (e) {
      console.error("[START TRACKING] Error storing data:", e);
      return false;
    }

    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      // log removed for production
      
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        // log removed for production
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
      // log removed for production
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
      // log removed for production
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
    if (!task || !task.data) {
      // log removed for production
      return;
    }

    const { locations, error } = task.data;
    
    if (error) {
      console.error("[BG TASK] Location error:", error);
      return;
    }
    
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      // log removed for production
      return;
    }

    const location = locations[0];
    if (!location || !location.coords || 
        typeof location.coords.latitude !== 'number' || 
        typeof location.coords.longitude !== 'number') {
      // log removed for production
      return;
    }

    const busIdStr = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
    if (!busIdStr) {
      // log removed for production
      return;
    }

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
    const payload: LocationUpdatePayload = {
      bus_id: busId,
      current_latitude: location.coords.latitude,
      current_longitude: location.coords.longitude,
      last_updated: formatTimestamp(),
      current_speed_kmh: speedKmh > 0 ? speedKmh : null,
    };

    try {
      const updatePromise = apiClient.updateBusLocation(
        busId,
        payload.current_latitude,
        payload.current_longitude,
        payload.current_speed_kmh || undefined
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
        if (!tripsStopsStr) {
          // log removed for production
          return;
        }
        const tripStops = JSON.parse(tripsStopsStr);

        if (tripStops.length > 0) {
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
              try {
                await AsyncStorage.setItem(TRIP_STOPS_KEY, JSON.stringify(updatedStops));
              } catch (storageError) {
                console.error("[BG TASK] Failed to update stops:", storageError);
              }

              await queueArrival({
                trip_id: tripId,
                stop_id: stop.stop_id,
                actual_arrival_time: formatTimestamp(),
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
