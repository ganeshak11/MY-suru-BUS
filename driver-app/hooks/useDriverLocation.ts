import { useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { supabase } from "../lib/supabaseClient";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ------------------ TYPES ------------------
type LocationUpdatePayload = {
  bus_id: number;
  current_latitude: number;
  current_longitude: number;
  last_updated: string;
};

// ------------------ CONSTANTS ------------------
const LOCATION_TASK_NAME = "background-location-task";
const ASYNC_STORAGE_BUS_ID_KEY = "current_bus_id";
const LOCATION_QUEUE_KEY = "offline_location_queue";

// ------------------ QUEUE HELPERS ------------------
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

// ------------------ MAIN HOOK ------------------
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

  // ------------------ FOREGROUND WATCHER ------------------
  const watchForegroundLocation = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert("GPS Disabled", "Please enable GPS to continue.");
      return;
    }

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
        distanceInterval: 10,
        timeInterval: 10000,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
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

// ------------------ BACKGROUND TASK DEFINITION ------------------
TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody) => {
    if (error) {
      console.error("[BG TASK] Error:", error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      const newLocation = locations[0];

      if (newLocation) {
        console.log("[BG TASK] New location:", newLocation.coords.latitude, newLocation.coords.longitude);
        
        try {
          const busId = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
          if (!busId) {
            console.log("[BG TASK] No busId found in storage");
            return;
          }

          console.log("[BG TASK] Updating bus_id:", busId);

          const payload: LocationUpdatePayload = {
            bus_id: Number(busId),
            current_latitude: newLocation.coords.latitude,
            current_longitude: newLocation.coords.longitude,
            last_updated: new Date().toISOString(),
          };

          const { error: supabaseError } = await supabase
            .from("buses")
            .update(payload)
            .eq("bus_id", payload.bus_id);

          if (supabaseError) {
            console.error("[BG TASK] Supabase error:", supabaseError.message);
            await addUpdateToQueue(payload);
          } else {
            console.log("[BG TASK] ✓ Location updated successfully");
            await processLocationQueue();
          }
        } catch (e) {
          console.error("[BG TASK] Exception:", e);
        }
      }
    }
  }
);
