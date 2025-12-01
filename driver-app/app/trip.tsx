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
import * as Notifications from 'expo-notifications';
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
    let locationSubscription: any = null;
    
    const startWatching = async () => {
      try {
        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permissions not granted');
        }
        
        // Set up notification handler
        const subscription = Notifications.addNotificationResponseReceivedListener(response => {
          const data = response.notification.request.content.data;
          if (data.action === 'END_TRIP' && data.trip_id === trip_id) {
            handleStopTrip();
          }
        });
        
        locationSubscription = await watchForegroundLocation();
      } catch (e: any) {
        const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
        console.error("[Trip] Foreground location watch error:", errorMsg);
        // Don't crash if foreground watch fails - background tracking continues
      }
    };
    
    startWatching();

    // Process queue on mount
    processArrivalQueue().catch((e: any) => {
      const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
      console.error("Queue processing error:", errorMsg);
    });

    // Set up a timer to process the queue periodically
    const queueProcessor = setInterval(() => {
      processArrivalQueue().catch((e: any) => {
        const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
        console.error("Queue processing error:", errorMsg);
      });
    }, 30000); // every 30 seconds

    return () => {
      clearInterval(queueProcessor);
      if (locationSubscription && locationSubscription.remove) {
        locationSubscription.remove();
      }
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

  const [lastTriggerTime, setLastTriggerTime] = useState<number>(0);
  const [previousDistance, setPreviousDistance] = useState<number | null>(null);

  useEffect(() => {
    if (
      !location || stops.length === 0 || currentStopIndex >= stops.length ||
      isPaused
    ) return;
    const nextStop = stops[currentStopIndex];
    if (nextStop.status === "Completed") return;
    
    let d: number;
    try {
      d = getDistance(location.coords, {
        latitude: Number(nextStop.latitude),
        longitude: Number(nextStop.longitude),
      });
    } catch (e: any) {
      const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
      console.error("Distance calculation error:", errorMsg);
      return;
    }

    // Calculate ETA using actual speed or fallback to 50 km/h
    const currentSpeedMps = location.coords.speed || 0;
    const currentSpeedKmh = currentSpeedMps * 3.6;
    const speedKmh = currentSpeedKmh > 5 ? currentSpeedKmh : 50;
    const distanceKm = d / 1000;
    const timeHours = distanceKm / speedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    setEta(timeMinutes > 0 ? `${timeMinutes} min` : "Arriving");

    // Geofence trigger with debounce and direction check
    if (d < nextStop.geofence_radius_meters) {
      const now = Date.now();
      const isApproaching = previousDistance === null || d < previousDistance;
      const debounceTime = 5000; // 5 seconds
      
      if (isApproaching && (now - lastTriggerTime) > debounceTime) {
        setLastTriggerTime(now);
        handleStopArrival(nextStop, currentStopIndex);
      }
    }
    
    setPreviousDistance(d);
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
          const errorMsg = statusError?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
          console.error("Failed to update trip status:", errorMsg);
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
        const errorMsg = busUpdateError?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
        console.error("Failed to update bus trip:", errorMsg);
      }

      // Start background tracking with trip stops
      if (tripData.bus_id) {
        const trackingStarted = await startLocationTracking(
          tripData.bus_id,
          id,
          formattedStops.map(s => ({
            stop_id: s.stop_id,
            latitude: s.latitude,
            longitude: s.longitude,
            geofence_radius_meters: s.geofence_radius_meters,
            completed: false
          }))
        );
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

  // amazonq-ignore-next-line
  const handleStopArrival = async (stop: StopDetails, index: number) => {
    // Immediately update the UI
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status: "Completed" } : s))
    );
    setCurrentStopIndex((i) => i + 1);

    // Check if this is the last stop
    const isLastStop = index === stops.length - 1;

    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isLastStop ? "Final Stop Reached! 🎯" : "Stop Reached! 🚏",
        body: isLastStop 
          ? `Arrived at ${stop.stop_name}. Tap to end trip.`
          : `Arrived at ${stop.stop_name}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { 
          action: isLastStop ? 'END_TRIP' : 'STOP_REACHED',
          trip_id: trip_id,
          stop_name: stop.stop_name
        },
      },
      trigger: null,
    });

    // Queue the arrival for background processing
    await queueArrival({
      trip_id: Number(trip_id),
      stop_id: stop.stop_id,
      actual_arrival_time: (() => {
        const now = new Date();
        return now.getFullYear() + '-' + 
          String(now.getMonth() + 1).padStart(2, '0') + '-' + 
          String(now.getDate()).padStart(2, '0') + 'T' + 
          String(now.getHours()).padStart(2, '0') + ':' + 
          String(now.getMinutes()).padStart(2, '0') + ':' + 
          String(now.getSeconds()).padStart(2, '0');
      })(),
    });
  };

  const handleReportDelay = async () => {
    if (!delayReason.trim()) {
      Alert.alert("Error", "Please enter a reason for the delay");
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const insertPromise = supabase.from("passenger_reports").insert({
        report_type: "Delay",
        message: `Trip ${trip_id}: ${delayReason}`,
        trip_id: Number(trip_id),
        bus_id: trip?.bus_id,
        status: "New",
      });

      const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message || 'Failed to report delay');
      }

      Alert.alert("Success", "Delay reported successfully");
      setShowDelayModal(false);
      setDelayReason("");
    } catch (e: any) {
      console.error('Report delay error:', e);
      Alert.alert(
        "Error",
        e?.message || "Failed to report delay. Please try again.",
      );
    }
  };

  const handlePauseTrip = async () => {
    if (isPaused) {
      setIsPaused(false);
      if (trip?.bus_id && trip_id) {
        const success = await startLocationTracking(
          trip.bus_id,
          Number(trip_id),
          stops.map(s => ({
            stop_id: s.stop_id,
            latitude: s.latitude,
            longitude: s.longitude,
            geofence_radius_meters: s.geofence_radius_meters,
            completed: s.status === "Completed"
          }))
        );
        if (!success) {
          Alert.alert("Error", "Failed to resume tracking");
          setIsPaused(true);
          return;
        }
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
              } catch (queueError: any) {
                const errorMsg = queueError?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
                console.error(
                  "Queue processing failed during trip stop:",
                  errorMsg,
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
              } catch (locationError: any) {
                const errorMsg = locationError?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
                console.error(
                  "Failed to stop location tracking:",
                  errorMsg,
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Trip</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* GPS Status */}
        <LocationDebug location={location} isTracking={true} />
        
        {/* Map Card */}
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

        {/* Route Stops Card */}
        <Card style={styles.stopsCard}>
          <View style={styles.stopsHeader}>
            <View style={styles.stopsHeaderLeft}>
              <Ionicons name="list" size={20} color={colors.primaryAccent} />
              <Text style={styles.stopsTitle}>Route Stops</Text>
            </View>
            <View style={styles.stopsHeaderRight}>
              {trip?.schedule?.start_time && stops.length > 0 && currentStopIndex < stops.length && stops[currentStopIndex]?.time_offset_from_start !== undefined && (() => {
                const currentStop = stops[currentStopIndex];
                const now = new Date();
                const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
                const tripStart = new Date(`${today}T${trip.schedule.start_time}`);
                const elapsedMinutes = Math.round((now.getTime() - tripStart.getTime()) / 60000);
                const delayMinutes = elapsedMinutes - (currentStop.time_offset_from_start || 0);
                const isDelayed = delayMinutes > 0;
                const isEarly = delayMinutes < -2;
                
                return (
                  <View style={[styles.delayBadge, isDelayed ? styles.delayBadgeDelayed : isEarly ? styles.delayBadgeEarly : styles.delayBadgeOnTime]}>
                    <Ionicons name={isDelayed ? "alert-circle" : isEarly ? "time" : "checkmark-circle"} size={11} color="#FFFFFF" />
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
          </View>
          <StopsTimeline
            stops={stops}
            currentStopIndex={currentStopIndex}
            eta={eta || undefined}
            tripStartTime={trip?.schedule?.start_time}
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

        {/* Bottom spacing for button bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowDelayModal(true)}
        >
          <Ionicons name="warning" size={18} color="#ea580c" />
          <Text style={styles.actionButtonTextDelay}>Delay</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary, isPaused && styles.actionButtonSuccess]}
          onPress={handlePauseTrip}
        >
          <Ionicons
            name={isPaused ? "play" : "pause"}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.actionButtonTextWhite}>
            {isPaused ? "Resume" : "Pause"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleStopTrip}
        >
          <Ionicons name="stop-circle" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonTextWhite}>Stop</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDelayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, {
              backgroundColor: colors.cardBackground,
            }]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={28} color={colors.secondaryText} />
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
                <Text style={{ color: colors.cardBackground, fontWeight: "700" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.mainBackground 
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 86,
      paddingTop: Platform.OS === 'ios' ? 44 : 26,
      paddingHorizontal: 16,
      backgroundColor: colors.tableBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 10,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 1 },
      }),
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      marginLeft: 12,
    },
    mapCard: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 1 },
      }),
    },
    stopsCard: {
      marginBottom: 16,
      borderRadius: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 1 },
      }),
    },
    scrollContent: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '20',
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.primaryText,
      marginLeft: 8,
      flex: 1,
    },
    stopsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "20",
    },
    stopsHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stopsHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stopsTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.primaryText,
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
      paddingVertical: 5,
      gap: 4,
    },
    delayBadgeOnTime: {
      backgroundColor: "#10b981",
    },
    delayBadgeEarly: {
      backgroundColor: "#06b6d4",
    },
    delayBadgeDelayed: {
      backgroundColor: "#f97316",
    },
    delayText: { 
      color: "#FFFFFF", 
      fontSize: 11, 
      fontWeight: "700" 
    },
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
    etaText: { color: colors.cardBackground, fontSize: 12, fontWeight: "700" },
    progressBadge: {
      backgroundColor: colors.primaryAccent,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    progressText: { 
      color: "#FFFFFF", 
      fontSize: 12, 
      fontWeight: "700" 
    },

    // Bottom Action Bar
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
      backgroundColor: colors.tableBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border + "20",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: { elevation: 4 },
      }),
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.tableBackground,
      height: 48,
      paddingHorizontal: 12,
      borderRadius: 14,
      gap: 6,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    actionButtonPrimary: {
      backgroundColor: colors.primaryAccent,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryAccent,
          shadowOpacity: 0.25,
        },
      }),
    },
    actionButtonSuccess: {
      backgroundColor: "#10b981",
      ...Platform.select({
        ios: {
          shadowColor: "#10b981",
          shadowOpacity: 0.25,
        },
      }),
    },
    actionButtonDanger: {
      backgroundColor: "#dc2626",
      ...Platform.select({
        ios: {
          shadowColor: "#dc2626",
          shadowOpacity: 0.25,
        },
      }),
    },
    actionButtonTextDelay: { 
      color: "#ea580c", 
      fontWeight: "600", 
      fontSize: 14 
    },
    actionButtonTextWhite: { 
      color: "#FFFFFF", 
      fontWeight: "600", 
      fontSize: 14 
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      padding: 20,
    },
    modalContent: {
      borderRadius: 16,
      padding: 24,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryText,
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
          shadowColor: colors.primaryText,
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
