import { useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { supabase } from "../lib/supabaseClient";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LocationUpdatePayload = {
  bus_id: number;
  current_latitude: number;
  current_longitude: number;
  last_updated: string;
};

const LOCATION_TASK_NAME = "background-location-task";
const ASYNC_STORAGE_BUS_ID_KEY = "current_bus_id";
const LOCATION_QUEUE_KEY = "offline_location_queue";

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

const processLocationQueue = async () => {
  try {
    const rawQueue = await AsyncStorage.getItem(LOCATION_QUEUE_KEY);
    const queue: LocationUpdatePayload[] = JSON.parse(rawQueue || "[]");

    if (queue.length === 0) return;

    const oldestUpdate = queue[0];
    const { error } = await supabase
      .from("buses")
      .update(oldestUpdate)
      .eq("bus_id", oldestUpdate.bus_id);

    if (!error) {
      queue.shift();
      await AsyncStorage.setItem(LOCATION_QUEUE_KEY, JSON.stringify(queue));
      console.log(`Synced 1 offline update. ${queue.length} remaining.`);
    } else {
      console.log("Failed to sync offline queue. Network still down?");
    }
  } catch (e) {
    console.error("Failed to process offline queue", e);
  }
};

export const useDriverLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Request Foreground + Background permissions
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
          timeInterval: 3000, // 3s
          distanceInterval: 5, // 5m
        },
        (loc) => {
          setLocation(loc);
        }
      );
    } catch (e) {
      console.error("[FOREGROUND] watchPositionAsync error:", e);
    }
  };

  // ------------------ BACKGROUND TRACKING ------------------
  const startLocationTracking = async (busId: number): Promise<boolean> => {
    console.log("[START TRACKING] Bus ID:", busId);
    await processLocationQueue();

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.log("[START TRACKING] Permissions denied");
      return false;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert("GPS Disabled", "Please enable GPS to continue.");
      return false;
    }

    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_BUS_ID_KEY, String(busId));
      console.log("[START TRACKING] Bus ID stored in AsyncStorage");
    } catch (e) {
      console.error("[START TRACKING] Error storing busId:", e);
      return false;
    }

    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      console.log("[START TRACKING] Task defined:", isTaskDefined);
      
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        console.log("[START TRACKING] Task already registered, stopping first");
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20, // Increased from 10m to 20m
        timeInterval: 15000, // Increased from 10s to 15s
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        mayShowUserSettingsDialog: false,
        foregroundService: {
          notificationTitle: "MY(suru) BUS",
          notificationBody: "Tracking your bus location.",
        },
      });

      setIsTracking(true);
      console.log("[START TRACKING] ✓ Background tracking started successfully");
      return true;
    } catch (e: any) {
      console.error("[START TRACKING] Failed:", e?.message || e);
      await AsyncStorage.removeItem(ASYNC_STORAGE_BUS_ID_KEY);
      Alert.alert("Error", `Failed to start tracking: ${e?.message || 'Unknown error'}`);
      return false;
    }
  };

  const stopLocationTracking = async () => {
    setIsTracking(false);

    try {
      await AsyncStorage.removeItem(ASYNC_STORAGE_BUS_ID_KEY);
      await AsyncStorage.removeItem(LOCATION_QUEUE_KEY);
    } catch (e) {
      console.error("Error clearing AsyncStorage:", e);
    }

    const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (hasTask) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log("Background location tracking stopped.");
    }
  };

  // ------------------ EXPORT ------------------
  return {
    location,
    isTracking,
    startLocationTracking,
    stopLocationTracking,
    watchForegroundLocation,
  };
};

// CRITICAL: This must be defined at module level, outside React
// DO NOT use any Expo modules that emit events to JS in this task
TaskManager.defineTask(LOCATION_TASK_NAME, async (task: any) => {
  try {
    // Extract data safely
    if (!task || !task.data) {
      return;
    }

    const { locations, error } = task.data;
    
    // Handle errors silently
    if (error || !locations || !Array.isArray(locations) || locations.length === 0) {
      return;
    }

    const location = locations[0];
    if (!location || !location.coords) {
      return;
    }

    // Get busId
    const busIdStr = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
    if (!busIdStr) {
      return;
    }

    const busId = Number(busIdStr);
    if (isNaN(busId)) {
      return;
    }

    // Build update payload
    const payload: LocationUpdatePayload = {
      bus_id: busId,
      current_latitude: location.coords.latitude,
      current_longitude: location.coords.longitude,
      last_updated: (() => {
        const now = new Date();
        return now.getFullYear() + '-' + 
          String(now.getMonth() + 1).padStart(2, '0') + '-' + 
          String(now.getDate()).padStart(2, '0') + 'T' + 
          String(now.getHours()).padStart(2, '0') + ':' + 
          String(now.getMinutes()).padStart(2, '0') + ':' + 
          String(now.getSeconds()).padStart(2, '0');
      })(),
    };

    // Try to update database
    try {
      const { error: supabaseError } = await supabase
        .from("buses")
        .update(payload)
        .eq("bus_id", busId);

      if (supabaseError) {
        // Queue for later
        await addUpdateToQueue(payload);
      } else {
        // Try to process queue if we have network
        await processLocationQueue();
      }
    } catch (dbError) {
      // Queue for later if database call fails
      await addUpdateToQueue(payload);
    }
  } catch (e) {
    // Silently catch all errors - the background task MUST NOT crash
    console.error("[BG TASK] Unexpected error:", e);
  }
});
