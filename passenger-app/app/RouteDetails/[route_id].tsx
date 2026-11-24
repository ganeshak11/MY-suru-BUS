import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BusAPI } from '../../lib/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteLeafletMap } from '../../components/RouteLeafletMap';
import { StopsTimeline } from '../../components/StopsTimeline';
import { Header } from '../../components/Header';
import { useLiveRoute, freshness, stopTimes } from '../../lib/useLiveRoute';
import { haversineDistance } from '../../lib/haversine';

type StopDetails = {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_sequence: number;
  geofence_radius_meters: number;
  status: 'Pending' | 'Completed';
  time_offset_from_start?: number;
  actual_arrival_time?: string;
};

const RouteDetailsPage: React.FC = () => {
  const { route_id } = useLocalSearchParams() as { route_id?: string };
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<{ route_id: number; route_name: string; start_time?: string } | null>(null);
  const [stops, setStops] = useState<StopDetails[]>([]);
  const [schedules, setSchedules] = useState<{ schedule_id: number; start_time: string; isActive: boolean; trip_id?: number }[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  // Live trips on this route with the server's progress (stops passed, ETAs).
  const { trips: liveTrips, loaded: liveLoaded, now } = useLiveRoute(route_id ? Number(route_id) : null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);


  useEffect(() => {
    const load = async () => {
      if (!route_id) {
        setLoading(false);
        return;
      }

      try {
        const rid = Number(route_id);
        if (isNaN(rid)) {
          console.error('Invalid route_id');
          setLoading(false);
          return;
        }

        const routeData = await BusAPI.getRoute(rid);
        
        if (!routeData) {
          console.error('Error fetching route');
          setLoading(false);
          return;
        }

        // Get stops from route data (already included in getRoute response)
        if (routeData.stops && Array.isArray(routeData.stops)) {
          const formattedStops: StopDetails[] = routeData.stops.map((stop: any) => ({
            stop_id: stop.stop_id,
            stop_name: stop.stop_name,
            latitude: parseFloat(stop.latitude),
            longitude: parseFloat(stop.longitude),
            geofence_radius_meters: stop.geofence_radius_meters || 50,
            stop_sequence: stop.stop_sequence,
            status: 'Pending' as const,
            time_offset_from_start: stop.time_offset_from_start || 0,
          }));
          setStops(formattedStops);
        }

        // Set route without schedules for now
        setRoute(routeData);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    load();
    // Real-time updates will be added later with WebSocket
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
      marginHorizontal: -4,
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
      justifyContent: 'space-between',
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

  const live = liveTrips.find((t) => t.trip_id === selectedTripId) ?? liveTrips[0] ?? null;
  const { times, passed } = stopTimes(live?.progress ?? null);
  const shownStops = stops.map((st) => ({ ...st, status: passed.has(st.stop_id) ? ('Completed' as const) : ('Pending' as const) }));
  const firstPending = shownStops.findIndex((st) => st.status !== 'Completed');
  const shownIndex = firstPending === -1 ? shownStops.length : firstPending;
  const fresh = live ? freshness(live, now) : null;
  const freshColor = { live: '#047857', stale: '#b45309', lost: '#b91c1c', paused: colors.secondaryText };
  const busLocation = live
    ? { latitude: live.bus.current_latitude, longitude: live.bus.current_longitude }
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
            <Text style={styles.cardTitle}>{liveTrips.length > 0 ? liveTrips.map(t => t.bus.bus_no).join(', ') : 'Bus Details'}</Text>
          </View>
          <View style={styles.detailsRow}>
            <View style={styles.detailsLeft}>
              <View style={styles.detailItem}>
                <Ionicons name="navigate-circle" size={18} color={colors.primaryAccent} />
                <Text style={styles.detailLabel}>Route: </Text>
                <Text style={styles.detailValue}>{route?.route_name || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location" size={18} color={colors.primaryAccent} />
                <Text style={styles.detailLabel}>Stops: </Text>
                <Text style={styles.detailValue}>{stops.length}</Text>
              </View>
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
              <View style={styles.detailItem}>
                <Ionicons name="time" size={18} color={colors.primaryAccent} />
                <Text style={styles.detailLabel}>Trips: </Text>
                <Text style={styles.detailValue}>{schedules.length}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.mapButton} onPress={() => router.push({ pathname: '/MapView', params: { route_id: route_id } })}>
              <Ionicons name="map" size={24} color="#fff" />
              <Text style={styles.mapButtonText}>View Map</Text>
            </TouchableOpacity>
          </View>
          {schedules.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <Ionicons name="time" size={18} color={colors.primaryAccent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primaryText }}>Trip Times</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.schedulesContainer}>
                {schedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.schedule_id}
                    style={[
                      styles.scheduleChip, 
                      schedule.isActive && styles.scheduleChipActive,
                      selectedStartTime === schedule.start_time && styles.scheduleChipSelected
                    ]}
                    onPress={() => {
                      setSelectedStartTime(schedule.start_time);
                      setRoute(prev => prev ? { ...prev, start_time: schedule.start_time } : null);
                    }}
                  >
                    <Text style={[
                      styles.scheduleTime, 
                      schedule.isActive && styles.scheduleTimeActive,
                      selectedStartTime === schedule.start_time && styles.scheduleTimeSelected
                    ]}>
                      {schedule.start_time.substring(0, 5)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Live status: which bus, how fresh its position is, how late it runs */}
        <View style={[styles.stopsCard, { padding: 16, gap: 10 }]}>
          {liveTrips.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {liveTrips.map((t) => {
                const on = t.trip_id === live?.trip_id;
                return (
                  <TouchableOpacity
                    key={t.trip_id}
                    onPress={() => setSelectedTripId(t.trip_id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Show bus ${t.bus.bus_no}, ${t.start_time.slice(0, 5)} departure`}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.primaryAccent, backgroundColor: on ? colors.primaryAccent : 'transparent' }}
                  >
                    <Text style={{ color: on ? '#fff' : colors.primaryText, fontWeight: '700', fontSize: 13 }}>
                      {t.bus.bus_no} · {t.start_time.slice(0, 5)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {live && fresh ? (
            <View accessible accessibilityLabel={`Bus ${live.bus.bus_no}. ${fresh.label}.`}>
              <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: 15 }}>
                Bus {live.bus.bus_no} · {live.start_time.slice(0, 5)} departure
              </Text>
              <Text style={{ color: freshColor[fresh.level], fontWeight: '600', marginTop: 4 }}>{fresh.label}</Text>
              {live.progress && live.progress.delay_min !== 0 && fresh.level !== 'paused' && (
                <Text style={{ color: live.progress.delay_min > 0 ? '#b91c1c' : '#047857', marginTop: 2 }}>
                  {live.progress.delay_min > 0 ? `Running ${live.progress.delay_min} min late` : `Running ${-live.progress.delay_min} min early`}
                </Text>
              )}
            </View>
          ) : liveLoaded ? (
            <Text style={{ color: colors.secondaryText }}>No bus is running on this route right now.</Text>
          ) : (
            <ActivityIndicator color={colors.primaryAccent} />
          )}
        </View>

        <View style={styles.stopsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Route Stops</Text>
            {stops.length > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>{Math.min(shownIndex + 1, stops.length)}/{stops.length}</Text>
              </View>
            )}
          </View>
          <StopsTimeline
            stops={shownStops}
            currentStopIndex={shownIndex}
            currentLocation={busLocation}
            tripId={live?.trip_id}
            busSpeed={live?.bus.current_speed_kmh}
            times={live?.progress ? times : undefined}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default RouteDetailsPage;
