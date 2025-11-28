import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteLeafletMap } from '../../components/RouteLeafletMap';
import { StopsTimeline } from '../../components/StopsTimeline';
import { Header } from '../../components/Header';

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

const RouteDetailsPage: React.FC = () => {
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

  const getDistance = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number => {
    const R = 6371e3;
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    try {
      if (busLocations.length > 0 && stops.length > 0) {
        const bus = busLocations[0];
        if (bus?.current_latitude && bus?.current_longitude) {
          const busLocation = { latitude: bus.current_latitude, longitude: bus.current_longitude };

          for (let i = 0; i < stops.length; i++) {
            if (stops[i].status === 'Completed') continue;
            const d = getDistance(busLocation, { latitude: stops[i].latitude, longitude: stops[i].longitude });
            if (d < stops[i].geofence_radius_meters) {
              setStops(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'Completed' } : s));
              setCurrentStopIndex(i + 1);
            }
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error tracking stop status:', error);
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
        if (isNaN(rid)) {
          console.error('Invalid route_id');
          setLoading(false);
          return;
        }

        const { data: routeData, error: routeErr } = await supabase
          .from('routes')
          .select('route_id, route_name')
          .eq('route_id', rid)
          .single();
        
        if (routeErr || !routeData) {
          console.error('Error fetching route:', routeErr);
          setLoading(false);
          return;
        }

        const { data: stopsData, error: stopsErr } = await supabase
          .from('route_stops')
          .select('stop_sequence, time_offset_from_start, stops(stop_id, stop_name, latitude, longitude, geofence_radius_meters)')
          .eq('route_id', rid)
          .order('stop_sequence', { ascending: true });

        if (stopsErr) {
          console.error('Error fetching stops:', stopsErr);
        } else if (stopsData) {
          const formattedStops: StopDetails[] = stopsData.map((item: any) => {
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
              status: 'Pending',
              time_offset_from_start: offsetMinutes,
            };
          });
          setStops(formattedStops);
        }

        const { data: scheduleData, error: schedErr } = await supabase
          .from('schedules')
          .select('schedule_id, start_time')
          .eq('route_id', rid)
          .order('start_time', { ascending: true });
        
        if (!schedErr && scheduleData) {
          const { data: activeTrips } = await supabase
            .from('trips')
            .select('schedule_id, trip_id')
            .in('schedule_id', scheduleData.map(s => s.schedule_id))
            .eq('status', 'En Route');
          
          const activeScheduleIds = new Set(activeTrips?.map(t => t.schedule_id) || []);
          const firstActiveScheduleId = activeTrips?.[0]?.schedule_id || null;
          const firstActiveTripId = activeTrips?.[0]?.trip_id || null;
          
          setSchedules(scheduleData.map(s => {
            const trip = activeTrips?.find(t => t.schedule_id === s.schedule_id);
            return {
              schedule_id: s.schedule_id,
              start_time: s.start_time,
              isActive: activeScheduleIds.has(s.schedule_id),
              trip_id: trip?.trip_id
            };
          }));
          
          setActiveScheduleId(firstActiveScheduleId);
          setActiveTripId(firstActiveTripId);
          
          const initialStartTime = firstActiveScheduleId 
            ? scheduleData.find(s => s.schedule_id === firstActiveScheduleId)?.start_time || scheduleData[0]?.start_time
            : scheduleData[0]?.start_time;
          setSelectedStartTime(initialStartTime);
          setRoute({ ...routeData, start_time: initialStartTime });
        } else {
          setRoute(routeData);
        }

        const { data: tripsData, error: tripsErr } = await supabase
          .from('trips')
          .select('bus_id, schedules!inner(route_id)')
          .eq('schedules.route_id', rid);

        if (!tripsErr && tripsData) {
          const busIds = Array.from(new Set(tripsData.map(t => t.bus_id)));
          if (busIds.length > 0) {
            const { data: busesData, error: busesErr } = await supabase
              .from('buses')
              .select('*')
              .in('bus_id', busIds);
            if (!busesErr) setBusLocations(busesData || []);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    load();

    const busSubscription = supabase
      .channel('public:buses')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'buses' }, (payload) => {
        setBusLocations((prev) => {
          const exists = prev.find(b => b.bus_id === payload.new.bus_id);
          if (exists) {
            return prev.map((bus) => bus.bus_id === payload.new.bus_id ? payload.new : bus);
          }
          return prev;
        });
      })
      .subscribe();

    const tripStopSubscription = activeTripId ? supabase
      .channel(`trip_stop_times:${activeTripId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_stop_times', filter: `trip_id=eq.${activeTripId}` }, (payload) => {
        const arrivedStopId = payload.new.stop_id;
        setStops((prev) => {
          const updatedStops = prev.map((s) => s.stop_id === arrivedStopId ? { ...s, status: 'Completed' } : s);
          const nextIndex = updatedStops.findIndex((s) => s.status === 'Pending');
          if (nextIndex !== -1) {
            setCurrentStopIndex(nextIndex);
          }
          return updatedStops;
        });
      })
      .subscribe() : null;

    return () => {
      supabase.removeChannel(busSubscription);
      if (tripStopSubscription) {
        supabase.removeChannel(tripStopSubscription);
      }
    };
  }, [route_id, activeTripId]);

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
                  return acc + getDistance(
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

        <View style={styles.stopsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Route Stops</Text>
            {stops.length > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>{currentStopIndex + 1}/{stops.length}</Text>
              </View>
            )}
          </View>
          <StopsTimeline 
            stops={stops} 
            currentStopIndex={currentStopIndex}
            tripStartTime={route?.start_time} 
            currentLocation={activeScheduleId && selectedStartTime === schedules.find(s => s.schedule_id === activeScheduleId)?.start_time ? busLocation : undefined}
            tripId={activeScheduleId && selectedStartTime === schedules.find(s => s.schedule_id === activeScheduleId)?.start_time ? activeTripId || undefined : undefined}
            busSpeed={busLocations[0]?.current_speed_kmh}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default RouteDetailsPage;
