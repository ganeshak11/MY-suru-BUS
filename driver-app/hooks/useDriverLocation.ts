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
    await processLocationQueue(); // Try to sync any old data

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return false;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert("GPS Disabled", "Please enable GPS to continue.");
      return false;
    }

    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_BUS_ID_KEY, String(busId));
    } catch (e) {
      console.error("Error storing busId in AsyncStorage:", e);
      return false;
    }

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 10, // meters
        timeInterval: 10000, // every 10s
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "MY(suru) BUS",
          notificationBody: "Tracking your bus location.",
        },
      });

      setIsTracking(true);
      console.log("Background location tracking started.");
      return true;
    } catch (e) {
      console.error("Failed to start background tracking:", e);
      await AsyncStorage.removeItem(ASYNC_STORAGE_BUS_ID_KEY);
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
      console.error("TaskManager error:", error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      const newLocation = locations[0];

      if (newLocation) {
        try {
          const busId = await AsyncStorage.getItem(ASYNC_STORAGE_BUS_ID_KEY);
          if (!busId) {
            console.log("Background task ran but no busId found.");
            return;
          }

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
            console.error(
              "Background Supabase update error (likely offline):",
              supabaseError.message
            );
            await addUpdateToQueue(payload);
          } else {
            console.log("Background update sent successfully.");
            await processLocationQueue();
          }
        } catch (e) {
          console.error("Error in background task:", e);
        }
      }
    }
  }
);
