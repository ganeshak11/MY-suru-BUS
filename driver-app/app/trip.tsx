import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Alert, Modal, TextInput, TouchableOpacity, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LeafletMap } from "../components/LeafletMap";
import { LocationDebug } from "../components/LocationDebug";
import { supabase } from "../lib/supabaseClient";
import { useDriverLocation } from "../hooks/useDriverLocation";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { Card } from "../components/Card";
import { DangerButton } from "../components/StyledButton";
import { getDistance } from "../lib/helpers";
import { Trip } from "../types/custom";
import { queueArrival, processArrivalQueue } from "../lib/queue";

type StopDetails = {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  stop_sequence: number;
  status: "Pending" | "Completed";
};

export default function TripScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { trip_id } = useLocalSearchParams<{ trip_id: string }>();
  const { location, startLocationTracking, stopLocationTracking, watchForegroundLocation } = useDriverLocation();

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
    watchForegroundLocation();
    // Process queue on mount
    processArrivalQueue().catch(e => console.error("Queue processing error:", e));

    // Set up a timer to process the queue periodically
    const queueProcessor = setInterval(() => {
      processArrivalQueue().catch(e => console.error("Queue processing error:", e));
    }, 30000); // every 30 seconds

    return () => {
      clearInterval(queueProcessor);
    };
  }, []);

  useEffect(() => {
    if (!trip_id) {
      Alert.alert("Error", "No trip ID provided.", [{ text: "Go Home", onPress: () => router.replace("/home") }]);
      return;
    }
    fetchTripAndStops(Number(trip_id));
  }, [trip_id]);

  useEffect(() => {
    if (!location || stops.length === 0 || currentStopIndex >= stops.length || isPaused) return;
    const nextStop = stops[currentStopIndex];
    if (nextStop.status === "Completed") return;
    const d = getDistance(location.coords, { latitude: Number(nextStop.latitude), longitude: Number(nextStop.longitude) });
    
    // Calculate ETA using actual speed or fallback to 30 km/h
    const currentSpeedMps = location.coords.speed || 0;
    const currentSpeedKmh = currentSpeedMps * 3.6;
    const speedKmh = currentSpeedKmh > 5 ? currentSpeedKmh : 30; // Use actual speed if moving, else default
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
      const { data: tripData, error: tripError } = await supabase.from("trips").select("*, schedules(route_id), buses!fk_trips_bus(bus_id, bus_no)").eq("trip_id", id).single();
      if (tripError) throw tripError;
      setTrip(tripData as Trip);
      console.log("Trip data:", tripData);

      const { data: stopsData, error: stopsError } = await supabase
        .from("route_stops")
        .select("stop_sequence, stops (stop_id, stop_name, latitude, longitude, geofence_radius_meters)")
        .eq("route_id", tripData.schedules.route_id)
        .order("stop_sequence", { ascending: true });

      if (stopsError) throw stopsError;
      const formattedStops: StopDetails[] = stopsData.map((item: any) => ({
        ...item.stops,
        latitude: parseFloat(item.stops.latitude),
        longitude: parseFloat(item.stops.longitude),
        geofence_radius_meters: item.stops.geofence_radius_meters || 50,
        stop_sequence: item.stop_sequence,
        status: "Pending"
      }));
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
          Alert.alert("Warning", "Location tracking failed to start. Your location may not be updated.");
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
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, status: "Completed" } : s)));
    setCurrentStopIndex((i) => i + 1);

    // Queue the arrival for background processing
    await queueArrival({
      trip_id: Number(trip_id),
      stop_id: stop.stop_id,
      actual_arrival_time: new Date().toISOString()
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
      Alert.alert("Error", `Failed to report delay: ${e?.message || 'Unknown error'}`);
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
      Alert.alert("Trip Paused", "Location tracking paused. Resume when ready.");
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
                console.error("Queue processing failed during trip stop:", queueError);
              }
              const { error: tripError } = await supabase.from("trips").update({ status: "Completed" }).eq("trip_id", trip.trip_id);
              if (tripError) throw tripError;
              const { error: busError } = await supabase.from("buses").update({ current_trip_id: null, current_latitude: null, current_longitude: null }).eq("bus_id", trip.bus_id);
              if (busError) throw busError;
              try {
                await stopLocationTracking();
              } catch (locationError) {
                console.error("Failed to stop location tracking:", locationError);
              }
              router.replace("/home");
            } catch (e: any) {
              Alert.alert("Error", `Failed to stop trip: ${e?.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primaryAccent} />
    </View>
  );

  return (
    <LinearGradient colors={[colors.primaryAccent + '30', colors.mainBackground]} style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
      </TouchableOpacity>
      
      <LocationDebug location={location} isTracking={true} />
      
      <Card style={styles.mapCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="location" size={22} color={colors.primaryAccent} />
          <Text style={styles.cardTitle}>Live Map</Text>
          {location?.coords.speed !== null && location?.coords.speed !== undefined && (
            <View style={styles.speedBadge}>
              <Ionicons name="speedometer" size={12} color="#fff" />
              <Text style={styles.speedText}>{Math.round((location.coords.speed || 0) * 3.6)} km/h</Text>
            </View>
          )}
        </View>
        {location ? <LeafletMap location={location} stops={stops} /> : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primaryAccent} />
            <Text style={styles.cardText}>Acquiring location...</Text>
          </View>
        )}
      </Card>

      <Card style={styles.stopsCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={22} color={colors.primaryAccent} />
          <Text style={styles.cardTitle}>Route Stops</Text>
          {eta && currentStopIndex < stops.length && (
            <View style={styles.etaBadge}>
              <Ionicons name="time" size={12} color="#fff" />
              <Text style={styles.etaText}>{eta}</Text>
            </View>
          )}
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{currentStopIndex}/{stops.length}</Text>
          </View>
        </View>
        <FlatList
          data={stops}
          keyExtractor={(item) => `${item.stop_id}-${item.stop_sequence}`}
          renderItem={({ item, index }) => (
            <View style={[styles.stopRow, index === currentStopIndex && styles.stopRowNext]}>
              <View style={[styles.stopNumber, item.status === "Completed" && styles.stopNumberCompleted]}>
                <Text style={[styles.stopSequence, item.status === "Completed" && styles.stopTextCompleted]}>
                  {item.status === "Completed" ? "✓" : item.stop_sequence}
                </Text>
              </View>
              <Text style={[styles.stopName, item.status === "Completed" && styles.stopNameCompleted]}>{item.stop_name}</Text>
              {index === currentStopIndex && item.status !== "Completed" && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentText}>Current</Text>
                </View>
              )}
            </View>
          )}
        />
      </Card>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.delayButton} onPress={() => setShowDelayModal(true)}>
          <Ionicons name="warning" size={20} color="#f59e0b" />
          <Text style={styles.delayButtonText}>Delay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pauseButton, isPaused && styles.pauseButtonActive]} onPress={handlePauseTrip}>
          <Ionicons name={isPaused ? "play" : "pause"} size={20} color="#fff" />
          <Text style={styles.pauseButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stopButton} onPress={handleStopTrip}>
          <Ionicons name="stop-circle" size={20} color="#fff" />
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDelayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={28} color="#f59e0b" />
              <Text style={[styles.modalTitle, { color: colors.primaryText }]}>Report Delay</Text>
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.mainBackground, color: colors.primaryText, borderColor: colors.border }]}
              placeholder="Enter reason for delay..."
              placeholderTextColor={colors.secondaryText}
              value={delayReason}
              onChangeText={setDelayReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowDelayModal(false); setDelayReason(""); }}>
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primaryAccent }]} onPress={handleReportDelay}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text>
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
    backButton: { position: 'absolute', top: 16, left: 16, zIndex: 10, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 6 } }) },
    mapCard: {
      marginBottom: 16,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
        android: { elevation: 8 },
      }),
    },
    stopsCard: {
      flex: 1,
      marginBottom: 16,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
        android: { elevation: 8 },
      }),
    },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: colors.primaryAccent + '30' },
    cardTitle: { fontSize: 18, fontWeight: "700", color: colors.primaryText, marginLeft: 8, flex: 1 },
    cardText: { fontSize: 14, color: colors.secondaryText, marginLeft: 8 },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    speedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4, marginRight: 8 },
    speedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    etaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, gap: 4, marginRight: 8 },
    etaText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    progressBadge: { backgroundColor: colors.primaryAccent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    progressText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    stopRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + '40' },
    stopRowNext: { backgroundColor: colors.primaryAccent + "15", marginHorizontal: -16, paddingHorizontal: 16, borderLeftWidth: 4, borderLeftColor: colors.primaryAccent },
    stopNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryAccent + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    stopNumberCompleted: { backgroundColor: '#10b981' + '30' },
    stopSequence: { fontSize: 16, color: colors.primaryAccent, fontWeight: '700' },
    stopName: { fontSize: 16, color: colors.primaryText, fontWeight: "600", flex: 1 },
    stopNameCompleted: { color: colors.secondaryText },
    stopTextCompleted: { color: '#10b981' },
    currentBadge: { backgroundColor: colors.primaryAccent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    currentText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    buttonContainer: { flexDirection: "row", gap: 8 },
    delayButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: 'center', backgroundColor: "#fef3c7", padding: 14, borderRadius: 12, gap: 6, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 4 } }) },
    delayButtonText: { color: "#f59e0b", fontWeight: "700", fontSize: 14 },
    pauseButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: 'center', backgroundColor: "#3b82f6", padding: 14, borderRadius: 12, gap: 6, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 4 } }) },
    pauseButtonActive: { backgroundColor: "#10b981" },
    pauseButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    stopButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: 'center', backgroundColor: "#ef4444", padding: 14, borderRadius: 12, gap: 6, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 4 } }) },
    stopButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
    modalContent: { borderRadius: 20, padding: 24, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 }, android: { elevation: 16 } }) },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
    modalTitle: { fontSize: 22, fontWeight: "700" },
    modalInput: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 20, textAlignVertical: "top", fontSize: 15 },
    modalButtons: { flexDirection: "row", gap: 12 },
    modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
    cancelButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.border },
  });
