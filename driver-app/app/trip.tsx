import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LeafletMap } from "../components/LeafletMap";
import { LocationDebug } from "../components/LocationDebug";
import { supabase } from "../lib/supabaseClient";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { themeTokens, useTheme } from "../contexts/ThemeContext";
import { Card } from "../components/Card";
import { DangerButton } from "../components/StyledButton";
import { getDistance } from "../lib/helpers";
import { Trip } from "../types/custom";
import { processArrivalQueue, queueArrival } from "../lib/queue";
import { StopsTimeline } from "../components/StopsTimeline";

type StopDetails = {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  stop_sequence: number;
  status: "Pending" | "Completed";
  time_offset_from_start?: number;
};

export default function TripScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { trip_id } = useLocalSearchParams<{ trip_id: string }>();
  const {
    location,
    startLocationTracking,
    stopLocationTracking,
    watchForegroundLocation,
  } = useDriverLocation();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<StopDetails[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayReason, setDelayReason] = useState("");
  const [eta, setEta] = useState<string | null>(null);

  // start foreground watcher on mount
  useEffect(() => {
    watchForegroundLocation().catch((e) => {
      console.error("[Trip] Foreground location watch error:", e);
      // Don't crash if foreground watch fails - background tracking continues
    });

    // Process queue on mount
    processArrivalQueue().catch((e) =>
      console.error("Queue processing error:", e)
    );

    // Set up a timer to process the queue periodically
    const queueProcessor = setInterval(() => {
      processArrivalQueue().catch((e) =>
        console.error("Queue processing error:", e)
      );
    }, 30000); // every 30 seconds

    return () => {
      clearInterval(queueProcessor);
    };
  }, []);

  useEffect(() => {
    if (!trip_id) {
      Alert.alert("Error", "No trip ID provided.", [{
        text: "Go Home",
        onPress: () => router.replace("/home"),
      }]);
      return;
    }
    fetchTripAndStops(Number(trip_id));
  }, [trip_id]);

  // Listen to app state changes to prevent background task event errors
  useEffect(() => {
    const appStateListener = AppState.addEventListener(
      "change",
      async (state) => {
        if (state === "background" || state === "inactive") {
          console.log(
            "[AppState] App went to background, ensuring background tracking is clean",
          );
          // Background tracking should continue via background task
          // The foreground watcher will stop automatically
        }
      },
    );

    return () => {
      appStateListener.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !location || stops.length === 0 || currentStopIndex >= stops.length ||
      isPaused
    ) return;
    const nextStop = stops[currentStopIndex];
    if (nextStop.status === "Completed") return;
    const d = getDistance(location.coords, {
      latitude: Number(nextStop.latitude),
      longitude: Number(nextStop.longitude),
    });

    // Calculate ETA using actual speed or fallback to 50 km/h
    const currentSpeedMps = location.coords.speed || 0;
    const currentSpeedKmh = currentSpeedMps * 3.6;
    const speedKmh = currentSpeedKmh > 5 ? currentSpeedKmh : 50; // Use actual speed if moving, else default
    const distanceKm = d / 1000;
    const timeHours = distanceKm / speedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    setEta(timeMinutes > 0 ? `${timeMinutes} min` : "Arriving");

    if (d < nextStop.geofence_radius_meters) {
      handleStopArrival(nextStop, currentStopIndex);
    }
  }, [location, stops, currentStopIndex, isPaused]);

  const fetchTripAndStops = async (id: number) => {
    setLoading(true);
    try {
      const { data: tripData, error: tripError } = await supabase.from("trips")
        .select("*, schedules(route_id, start_time, routes(route_name)), buses!fk_trips_bus(bus_id, bus_no)")
        .eq("trip_id", id).single();
      if (tripError) throw tripError;
      setTrip(tripData as Trip);
      console.log("Trip data:", tripData);

      const { data: stopsData, error: stopsError } = await supabase
        .from("route_stops")
        .select(
          "stop_sequence, time_offset_from_start, stops (stop_id, stop_name, latitude, longitude, geofence_radius_meters)",
        )
        .eq("route_id", tripData.schedules.route_id)
        .order("stop_sequence", { ascending: true });

      if (stopsError) throw stopsError;
      
      const formattedStops: StopDetails[] = stopsData.map((item: any) => {
        // Convert time string (HH:MM:SS) to minutes
        let offsetMinutes = 0;
        if (item.time_offset_from_start) {
          const [hours, minutes] = item.time_offset_from_start.split(':').map(Number);
          offsetMinutes = (hours * 60) + minutes;
        }
        
        return {
          ...item.stops,
          latitude: parseFloat(item.stops.latitude),
          longitude: parseFloat(item.stops.longitude),
          geofence_radius_meters: item.stops.geofence_radius_meters || 50,
          stop_sequence: item.stop_sequence,
          status: "Pending",
          time_offset_from_start: offsetMinutes
        };
      });

      setStops(formattedStops);

      // Update trip status to En Route if it's Scheduled
      if (tripData.status === "Scheduled") {
        const { error: statusError } = await supabase
          .from("trips")
          .update({ status: "En Route" })
          .eq("trip_id", id);

        if (statusError) {
          console.error("Failed to update trip status:", statusError);
        } else {
          console.log("Trip status updated to En Route");
          tripData.status = "En Route";
        }
      }

      // Update bus with current trip
      const { error: busUpdateError } = await supabase
        .from("buses")
        .update({ current_trip_id: id })
        .eq("bus_id", tripData.bus_id);

      if (busUpdateError) {
        console.error("Failed to update bus trip:", busUpdateError);
      }

      // Start background tracking
      if (tripData.bus_id) {
        const trackingStarted = await startLocationTracking(tripData.bus_id);
        if (!trackingStarted) {
          Alert.alert(
            "Warning",
            "Location tracking failed to start. Your location may not be updated.",
          );
        }
      }
    } catch (error: any) {
      Alert.alert("Error fetching trip data", error.message);
      router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  const handleStopArrival = async (stop: StopDetails, index: number) => {
    // Immediately update the UI
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status: "Completed" } : s))
    );
    setCurrentStopIndex((i) => i + 1);

    // Queue the arrival for background processing
    await queueArrival({
      trip_id: Number(trip_id),
      stop_id: stop.stop_id,
      actual_arrival_time: new Date().toISOString(),
    });
  };

  const handleReportDelay = async () => {
    if (!delayReason.trim()) {
      Alert.alert("Error", "Please enter a reason for the delay");
      return;
    }

    try {
      const { error } = await supabase.from("passenger_reports").insert({
        report_type: "Delay",
        message: `Trip ${trip_id}: ${delayReason}`,
        trip_id: Number(trip_id),
        bus_id: trip?.bus_id,
        status: "New",
      });

      if (error) throw error;

      Alert.alert("Success", "Delay reported successfully");
      setShowDelayModal(false);
      setDelayReason("");
    } catch (e: any) {
      Alert.alert(
        "Error",
        `Failed to report delay: ${e?.message || "Unknown error"}`,
      );
    }
  };

  const handlePauseTrip = async () => {
    if (isPaused) {
      setIsPaused(false);
      if (trip?.bus_id) {
        await startLocationTracking(trip.bus_id);
      }
      Alert.alert("Trip Resumed", "Location tracking resumed");
    } else {
      setIsPaused(true);
      await stopLocationTracking();
      Alert.alert(
        "Trip Paused",
        "Location tracking paused. Resume when ready.",
      );
    }
  };

  const handleStopTrip = async () => {
    if (!trip) return;
    Alert.alert(
      "Stop Trip",
      "Are you sure you want to end this trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop Trip",
          style: "destructive",
          onPress: async () => {
            try {
              try {
                await processArrivalQueue();
              } catch (queueError) {
                console.error(
                  "Queue processing failed during trip stop:",
                  queueError,
                );
              }
              const { error: tripError } = await supabase.from("trips").update({
                status: "Completed",
              }).eq("trip_id", trip.trip_id);
              if (tripError) throw tripError;
              const { error: busError } = await supabase.from("buses").update({
                current_trip_id: null,
                current_latitude: null,
                current_longitude: null,
              }).eq("bus_id", trip.bus_id);
              if (busError) throw busError;
              try {
                await stopLocationTracking();
              } catch (locationError) {
                console.error(
                  "Failed to stop location tracking:",
                  locationError,
                );
              }
              router.replace("/home");
            } catch (e: any) {
              Alert.alert(
                "Error",
                `Failed to stop trip: ${e?.message || "Unknown error"}`,
              );
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.container, {
          justifyContent: "center",
          alignItems: "center",
        }]}
      >
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.primaryAccent + "30", colors.mainBackground]}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
         <LocationDebug location={location} isTracking={true} />
         <Card style={styles.mapCard}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="location"
              size={22}
              color={colors.primaryAccent}
            />
            <Text style={styles.cardTitle}>Live Map</Text>
          </View>
          {location
            ? <LeafletMap location={location} stops={stops} />
            : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="small"
                  color={colors.primaryAccent}
                />
                <Text style={styles.cardText}>Acquiring location...</Text>
              </View>
            )}
        </Card>

        <Card style={styles.stopsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={22} color={colors.primaryAccent} />
            <Text style={styles.cardTitle}>Route Stops</Text>
            {trip?.schedules?.start_time && stops.length > 0 && currentStopIndex < stops.length && stops[currentStopIndex]?.time_offset_from_start !== undefined && (() => {
              const currentStop = stops[currentStopIndex];
              const now = new Date();
              const today = now.toISOString().split('T')[0];
              const tripStart = new Date(`${today}T${trip.schedules.start_time}`);
              const elapsedMinutes = Math.round((now.getTime() - tripStart.getTime()) / 60000);
              const delayMinutes = elapsedMinutes - currentStop.time_offset_from_start;
              const isDelayed = delayMinutes > 0;
              const isEarly = delayMinutes < -2;
              
              return (
                <View style={[styles.delayBadge, isDelayed ? styles.delayBadgeDelayed : isEarly ? styles.delayBadgeEarly : styles.delayBadgeOnTime]}>
                  <Ionicons name={isDelayed ? "alert-circle" : isEarly ? "time" : "checkmark-circle"} size={12} color="#fff" />
                  <Text style={styles.delayText}>
                    {(() => {
                      const absMinutes = Math.abs(delayMinutes);
                      const hours = Math.floor(absMinutes / 60);
                      const mins = absMinutes % 60;
                      const sign = isDelayed ? '+' : '';
                      return hours > 0 ? `${sign}${hours}:${mins.toString().padStart(2, '0')}` : `${sign}${mins} min`;
                    })()}
                  </Text>
                </View>
              );
            })()}
            {stops.length > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>
                  {currentStopIndex + 1}/{stops.length}
                </Text>
              </View>
            )}
          </View>
          <StopsTimeline
            stops={stops}
            currentStopIndex={currentStopIndex}
            eta={eta || undefined}
            tripStartTime={trip?.schedules?.start_time}
            distanceToStop={
              location && currentStopIndex < stops.length
                ? getDistance(location.coords, {
                    latitude: Number(stops[currentStopIndex].latitude),
                    longitude: Number(stops[currentStopIndex].longitude),
                  })
                : 0
            }
            currentLocation={location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : undefined}
          />
        </Card>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.delayButton}
            onPress={() => setShowDelayModal(true)}
          >
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.delayButtonText}>Delay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
            onPress={handlePauseTrip}
          >
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={20}
              color="#fff"
            />
            <Text style={styles.pauseButtonText}>
              {isPaused ? "Resume" : "Pause"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopTrip}
          >
            <Ionicons name="stop-circle" size={20} color="#fff" />
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showDelayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, {
              backgroundColor: colors.cardBackground,
            }]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={28} color="#f59e0b" />
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>
                Report Delay
              </Text>
            </View>
            <TextInput
              style={[styles.modalInput, {
                backgroundColor: colors.mainBackground,
                color: colors.primaryText,
                borderColor: colors.border,
              }]}
              placeholder="Enter reason for delay..."
              placeholderTextColor={colors.secondaryText}
              value={delayReason}
              onChangeText={setDelayReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDelayModal(false);
                  setDelayReason("");
                }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, {
                  backgroundColor: colors.primaryAccent,
                }]}
                onPress={handleReportDelay}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    backButton: {
      position: "absolute",
      top: 16,
      left: 16,
      zIndex: 10,
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 14,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: { elevation: 8 },
      }),
    },
    mapCard: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        android: { elevation: 12 },
      }),
    },
    stopsCard: {
      marginBottom: 16,
      borderRadius: 20,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        android: { elevation: 12 },
      }),
    },
    scrollContent: {
      paddingTop: 60,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      paddingBottom: 14,
      paddingHorizontal: 20,
      paddingTop: 20,
      borderBottomWidth: 2,
      borderBottomColor: colors.primaryAccent + "30",
      backgroundColor: colors.primaryAccent + "08",
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primaryText,
      marginLeft: 8,
      flex: 1,
    },
    cardText: { fontSize: 14, color: colors.secondaryText, marginLeft: 8 },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
    },
    delayBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 4,
      zIndex: 1002,
      ...Platform.select({
        ios: {
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: { elevation: 1002 },
      }),
    },
    delayBadgeOnTime: {
      backgroundColor: "#10b981",
      ...Platform.select({
        ios: { shadowColor: "#10b981" },
      }),
    },
    delayBadgeEarly: {
      backgroundColor: "#3b82f6",
      ...Platform.select({
        ios: { shadowColor: "#3b82f6" },
      }),
    },
    delayBadgeDelayed: {
      backgroundColor: "#ef4444",
      ...Platform.select({
        ios: { shadowColor: "#ef4444" },
      }),
    },
    delayText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    etaBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#3b82f6",
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      gap: 4,
      marginRight: 8,
      ...Platform.select({
        ios: {
          shadowColor: "#3b82f6",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: { elevation: 4 },
      }),
    },
    etaText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    progressBadge: {
      backgroundColor: colors.primaryAccent,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryAccent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: { elevation: 4 },
      }),
    },
    progressText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    buttonContainer: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
    delayButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fef3c7",
      padding: 16,
      borderRadius: 16,
      gap: 8,
      borderWidth: 2,
      borderColor: "#fbbf24",
      ...Platform.select({
        ios: {
          shadowColor: "#f59e0b",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
      }),
    },
    delayButtonText: { color: "#d97706", fontWeight: "700", fontSize: 15 },
    pauseButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#3b82f6",
      padding: 16,
      borderRadius: 16,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: "#3b82f6",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
      }),
    },
    pauseButtonActive: {
      backgroundColor: "#10b981",
      ...Platform.select({
        ios: {
          shadowColor: "#10b981",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
      }),
    },
    pauseButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    stopButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ef4444",
      padding: 16,
      borderRadius: 16,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: "#ef4444",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
      }),
    },
    stopButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      padding: 20,
    },
    modalContent: {
      borderRadius: 24,
      padding: 28,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        },
        android: { elevation: 20 },
      }),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
      gap: 14,
    },
    modalTitle: { fontSize: 24, fontWeight: "700" },
    modalInput: {
      borderRadius: 16,
      padding: 18,
      borderWidth: 2,
      marginBottom: 24,
      textAlignVertical: "top",
      fontSize: 16,
      minHeight: 120,
    },
    modalButtons: { flexDirection: "row", gap: 12 },
    modalButton: {
      flex: 1,
      padding: 18,
      borderRadius: 16,
      alignItems: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        android: { elevation: 4 },
      }),
    },
    cancelButton: {
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.border,
    },

  });
