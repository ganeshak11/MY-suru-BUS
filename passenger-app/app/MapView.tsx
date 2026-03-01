import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BusAPI } from '../lib/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useTheme } from '../contexts/ThemeContext';
import { RouteLeafletMap } from '../components/RouteLeafletMap';
import { StopsTimeline } from '../components/StopsTimeline';
import { Header } from '../components/Header';
import { io, Socket } from 'socket.io-client';
import { haversineDistance } from '../lib/haversine';

type StopDetails = {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_sequence: number;
  geofence_radius_meters: number;
  status: 'Pending' | 'Completed';
  time_offset_from_start?: number;
};

const MapViewScreen: React.FC = () => {
  const { route_id } = useLocalSearchParams() as { route_id?: string };
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<{ route_id: number; route_name: string; start_time?: string } | null>(null);
  const [stops, setStops] = useState<StopDetails[]>([]);
  const [busLocations, setBusLocations] = useState<any[]>([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [schedules, setSchedules] = useState<{ schedule_id: number; start_time: string; isActive: boolean; trip_id?: number }[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<number | null>(null);
  const [activeTripId, setActiveTripId] = useState<number | null>(null);

  const busLocationsRef = useRef<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Keep busLocationsRef in sync so reconnect handler can access latest state
  useEffect(() => {
    busLocationsRef.current = busLocations;
  }, [busLocations]);

  // RT-04: Whenever busLocations changes (initial load OR any update), (re)join bus rooms.
  // This handles both: initial load after socket connects, AND reconnect-before-data-loads.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || busLocations.length === 0) return;
    busLocations.forEach((b: any) => {
      if (b?.bus_id) socket.emit('join-bus', b.bus_id);
    });
  }, [busLocations]);

  // getDistance removed in favor of shared haversineDistance

  useEffect(() => {
    try {
      if (busLocations.length > 0 && stops.length > 0) {
        const bus = busLocations[0];
        if (bus?.current_latitude && bus?.current_longitude) {
          const busLocation = { latitude: bus.current_latitude, longitude: bus.current_longitude };

          for (let i = 0; i < stops.length; i++) {
            if (stops[i].status === 'Completed') continue;
            const d = haversineDistance(busLocation, { latitude: stops[i].latitude, longitude: stops[i].longitude });
            if (d < stops[i].geofence_radius_meters) {
              setStops(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'Completed' } : s));
              setCurrentStopIndex(i + 1);
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error updating stop status:', error);
    }
  }, [busLocations, stops]);

  useEffect(() => {
    const load = async () => {
      if (!route_id) {
        setLoading(false);
        return;
      }

      try {
        const rid = Number(route_id);

        // Fetch route with stops from backend
        const routeData = await BusAPI.getRoute(rid);

        if (!routeData) {
          console.error('Error fetching route');
          setLoading(false);
          return;
        }

        // Format stops from backend response
        if (routeData.stops) {
          const formattedStops: StopDetails[] = routeData.stops.map((stop: any) => ({
            stop_id: stop.stop_id,
            stop_name: stop.stop_name,
            latitude: parseFloat(stop.latitude),
            longitude: parseFloat(stop.longitude),
            geofence_radius_meters: stop.geofence_radius_meters || 50,
            stop_sequence: stop.stop_sequence,
            status: 'Pending',
            time_offset_from_start: stop.time_offset_from_start || 0,
          }));
          setStops(formattedStops);
        }

        setRoute({ route_id: routeData.route_id, route_name: routeData.route_name });

        // Fetch only active trips for this specific route (CRIT-10 fix)
        // This single endpoint replaces the N+1 `getAllTrips` + `getAllBuses` logic
        const activeTrips = await BusAPI.getActiveTripsForRoute(rid);

        if (activeTrips.length > 0) {
          // The new endpoint embeds bus payload directly in the trip object
          const routeBuses = activeTrips.map((t: any) => t.bus).filter(Boolean);
          setBusLocations(routeBuses);


        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    load();

    // CRIT-09: Real-time bus location via Socket.io (was commented-out TODO)
    const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '')
      ?? `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:3001`;
    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      // Rejoin rooms if socket reconnects after data is already loaded.
      // If data hasn't loaded yet, the busLocations useEffect above handles joining
      // once load() completes and setBusLocations fires.
      busLocationsRef.current.forEach((b: any) => {
        if (b?.bus_id) socket.emit('join-bus', b.bus_id);
      });
    });

    // When bus locations are loaded, join each bus's room
    socket.on('bus-location', (data: { busId: number; latitude: number; longitude: number; speed?: number; timestamp?: string }) => {
      setBusLocations(prev =>
        prev.map(b =>
          b.bus_id === data.busId
            ? { ...b, current_latitude: data.latitude, current_longitude: data.longitude, current_speed_kmh: data.speed }
            : b
        )
      );
    });

    socket.on('trip-completed', (data: { trip_id: number }) => {
      // Remove bus from live display when trip ends
      setBusLocations(prev => prev.filter(b => b.current_trip_id !== data.trip_id));
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected, will reconnect...');
    });

    return () => {
      socket.disconnect();
    };
  }, [route_id]);

  const styles = React.useMemo(() => StyleSheet.create({
    container: { flex: 1, padding: 16 },
    scrollContent: { paddingTop: 16 },
    mapCard: {
      marginBottom: 16,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        android: { elevation: 12 },
      }),
    },
    detailsRow: {
      flexDirection: 'row',
      padding: 20,
      gap: 16,
      alignItems: 'center',
    },
    detailsLeft: {
      flex: 1,
      gap: 12,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.secondaryText,
      fontWeight: '600',
    },
    detailValue: {
      fontSize: 14,
      color: colors.primaryText,
      fontWeight: '700',
    },
    mapButton: {
      backgroundColor: colors.primaryAccent,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minWidth: 80,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryAccent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: { elevation: 6 },
      }),
    },
    mapButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    stopsCard: {
      marginBottom: 16,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        android: { elevation: 12 },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingBottom: 14,
      paddingHorizontal: 20,
      paddingTop: 20,
      borderBottomWidth: 2,
      borderBottomColor: colors.primaryAccent + '30',
      backgroundColor: colors.primaryAccent + '08',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primaryText,
      marginLeft: 8,
      flex: 1,
    },

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
    progressText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    schedulesContainer: { flexDirection: 'row', gap: 10, paddingRight: 20 },
    scheduleChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.mainBackground,
      borderWidth: 1,
      borderColor: colors.secondaryText + '30',
    },
    scheduleChipActive: {
      backgroundColor: colors.primaryAccent + '20',
      borderWidth: 2,
      borderColor: colors.primaryAccent,
    },
    scheduleChipSelected: {
      backgroundColor: colors.primaryAccent,
      borderWidth: 2,
    },
    scheduleTime: { fontSize: 14, fontWeight: '600', color: colors.primaryText },
    scheduleTimeActive: { color: '#10b981', fontWeight: '700' },
    scheduleTimeSelected: { color: '#fff', fontWeight: '700' },
  }), [colors]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  const busLocation = busLocations[0] && busLocations[0].current_latitude && busLocations[0].current_longitude
    ? { latitude: busLocations[0].current_latitude, longitude: busLocations[0].current_longitude }
    : undefined;

  return (
    <LinearGradient
      colors={[colors.primaryAccent + '30', colors.mainBackground]}
      style={styles.container}
    >
      <Header showBackButton showReportButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={22} color={colors.primaryAccent} />
            <Text style={styles.cardTitle}>{busLocations.length > 0 ? busLocations.map(b => b.bus_no).join(', ') : 'Bus Details'}</Text>
          </View>
          <View style={{ padding: 20, gap: 8 }}>
            <View style={styles.detailItem}>
              <Ionicons name="navigate-circle" size={18} color={colors.primaryAccent} />
              <Text style={styles.detailLabel}>Route: </Text>
              <Text style={styles.detailValue}>{route?.route_name || 'N/A'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.secondaryText + '30' }} />
            <View style={styles.detailItem}>
              <Ionicons name="location" size={18} color={colors.primaryAccent} />
              <Text style={styles.detailLabel}>Stops: </Text>
              <Text style={styles.detailValue}>{stops.length}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.secondaryText + '30' }} />
            <View style={styles.detailItem}>
              <Ionicons name="navigate" size={18} color={colors.primaryAccent} />
              <Text style={styles.detailLabel}>Distance: </Text>
              <Text style={styles.detailValue}>{stops.length > 0 ? `${(stops.reduce((acc, stop, idx) => {
                if (idx === 0) return 0;
                return acc + haversineDistance(
                  { latitude: stops[idx - 1].latitude, longitude: stops[idx - 1].longitude },
                  { latitude: stop.latitude, longitude: stop.longitude }
                );
              }, 0) / 1000).toFixed(1)} km` : 'N/A'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: colors.secondaryText + '30' }} />
            <View style={styles.detailItem}>
              <Ionicons name="time" size={18} color={colors.primaryAccent} />
              <Text style={styles.detailLabel}>Trips: </Text>
              <Text style={styles.detailValue}>{schedules.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.stopsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="map" size={22} color={colors.primaryAccent} />
            <Text style={styles.cardTitle}>Live Map</Text>
          </View>
          <View style={{ height: 500, borderRadius: 20, overflow: 'hidden' }}>
            <RouteLeafletMap stops={stops} buses={busLocations} />
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default MapViewScreen;
