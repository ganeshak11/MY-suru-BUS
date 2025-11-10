import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabaseClient';
import { Icon } from 'react-native-elements';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import MapView, { Marker } from 'react-native-maps';

const RouteDetailsPage: React.FC = () => {
  const { route_id } = useLocalSearchParams() as { route_id?: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<{ route_id: number; route_name: string } | null>(null);
  const [stops, setStops] = useState<Array<{
    stop_sequence: number;
    stop: {
      stop_id: number;
      stop_name: string;
      latitude: number;
      longitude: number;
    }
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [timings, setTimings] = useState<Array<{ start_time: string }>>([]);
  const [busLocations, setBusLocations] = useState<any[]>([]);

  // Helper to format time from "HH:mm:ss" to "hh:mm AM/PM"
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(0, 0, 0, parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  useEffect(() => {
    const load = async () => {
      if (!route_id) {
        setError('No route specified');
        setLoading(false);
        return;
      }

      try {
        const rid = Number(route_id);

        // 1. Fetch route details (name)
        const { data: routeData, error: routeErr } = await supabase.from('routes').select('route_id, route_name').eq('route_id', rid).single();
        if (routeErr || !routeData) {
          console.error('Error fetching route:', routeErr || 'No route data');
          setError('Error fetching route');
          setLoading(false);
          return;
        }
        setRoute(routeData);

        // 2. Fetch stops for the route
        const { data: stopsData, error: stopsErr } = await supabase
          .from('route_stops')
          .select('stop_sequence, stop:stops(stop_id, stop_name, latitude, longitude)')
          .eq('route_id', rid)
          .order('stop_sequence', { ascending: true });

        if (stopsErr) {
          console.error('Error fetching stops:', stopsErr);
          // Continue, maybe show route info without stops
        } else {
          setStops(stopsData || []);
        }

        // 3. Fetch timings for the route
        const { data: timingsData, error: timingsErr } = await supabase
          .from('schedules')
          .select('start_time')
          .eq('route_id', rid)
          .order('start_time');

        if (!timingsErr) setTimings(timingsData || []);

        // 4. Fetch initial bus locations
        const { data: busesData, error: busesErr } = await supabase
          .from('buses')
          .select('*')
          .eq('current_trip_id.schedule_id.route_id', rid);

        if (!busesErr) setBusLocations(busesData || []);

      } catch (e) {
        console.error(e);
        setError('Unexpected error');
      }
      setLoading(false);
    };

    load();

    const subscription = supabase
      .channel('public:buses')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'buses' }, (payload) => {
        setBusLocations((prev) =>
          prev.map((bus) =>
            bus.bus_id === payload.new.bus_id ? payload.new : bus
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [route_id]);

  const windowH = Dimensions.get('window').height;

  const { theme, isDark, toggleTheme, colors: currentColors } = useTheme();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: currentColors.mainBackground },
  header: { height: 80, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
    iconBtn: { padding: 8, marginTop: 6 },
    routeTitle: { color: currentColors.primaryText, fontSize: 28, fontWeight: '800', marginTop: 6 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  routeInfoRow: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between' },
    infoBlock: { flex: 1, marginRight: 12 },
    infoLabel: { color: currentColors.secondaryText, fontSize: 12, letterSpacing: 0.6, marginBottom: 6 },
    infoValue: { color: currentColors.primaryText, fontSize: 16, fontWeight: '700' },
    timingsSection: { marginTop: 18 },
    sectionLabel: { color: currentColors.secondaryText, fontSize: 12, marginBottom: 8 },
    timingsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    timingPill: { backgroundColor: currentColors.primaryAccent, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
    timingText: { color: currentColors.primaryText, fontWeight: '700' },
  stopsCard: { marginTop: 20, borderRadius: 14, backgroundColor: currentColors.cardBackground, padding: 16, overflow: 'hidden' },
    stopsHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#333646', marginBottom: 8 },
    stopsHeaderText: { flex: 1, color: currentColors.secondaryText, fontSize: 12, fontWeight: '600' },
    stopRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
    markerColumn: { width: 48, alignItems: 'center' },
    markerWrapper: { position: 'relative', alignItems: 'center', width: 48 },
    markerCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: currentColors.primaryAccent, alignItems: 'center', justifyContent: 'center' },
    markerNumber: { color: currentColors.primaryText, fontWeight: '700' },
    svgLine: { position: 'absolute', left: 0, top: 36, height: '100%' },
    stopInfo: { flex: 1, paddingRight: 8 },
    stopName: { color: currentColors.primaryText, fontSize: 16, fontWeight: '600' },
    stopMeta: { color: currentColors.secondaryText, fontSize: 12, marginTop: 4 },
    stopRight: { width: 84, alignItems: 'flex-end' },
    stopTime: { color: currentColors.primaryText, fontWeight: '700' },
    map: { height: 300, borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  });

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator style={{marginTop:40}} color={currentColors.primaryAccent} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ height: 20 }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="arrow-back" type="material" color={currentColors.primaryAccent} />
        </TouchableOpacity>
        <Text style={styles.routeTitle}>{route?.route_name ?? `Route ${route_id}`}</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          <Icon name={isDark ? 'moon' : 'sunny'} type="ionicon" color={currentColors.primaryAccent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={stops}
        keyExtractor={(s) => String(s.stop.stop_id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={() => (
          <>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: stops[0]?.stop.latitude ?? 12.2958,
                longitude: stops[0]?.stop.longitude ?? 76.6394,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              {stops.map((stop) => (
                <Marker
                  key={stop.stop.stop_id}
                  coordinate={{
                    latitude: stop.stop.latitude,
                    longitude: stop.stop.longitude,
                  }}
                  title={stop.stop.stop_name}
                />
              ))}
              {busLocations.map((bus) => (
                <Marker
                  key={bus.bus_id}
                  coordinate={{
                    latitude: bus.current_latitude,
                    longitude: bus.current_longitude,
                  }}
                  title={bus.bus_no}
                  pinColor="blue"
                />
              ))}
            </MapView>

            <View style={styles.routeInfoRow}>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>ROUTE</Text>
                <Text style={styles.infoValue}>{route?.route_name ?? route_id}</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>TOTAL STOPS</Text>
                <Text style={styles.infoValue}>{stops.length}</Text>
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>TOTAL DISTANCE</Text>
                <Text style={styles.infoValue}>—</Text>
              </View>
            </View>

            <View style={styles.timingsSection}>
              <Text style={styles.sectionLabel}>BUS TIMINGS</Text>
              <View style={styles.timingsRow}>
                {(timings.length > 0 ? timings.slice(0, 6) : []).map((t, i) => (
                  <TouchableOpacity key={i} style={styles.timingPill} activeOpacity={0.85}>
                    <Text style={styles.timingText}>{formatTime(t.start_.time)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.stopsCard}>
              <View style={styles.stopsHeader}>
                <Text style={styles.stopsHeaderText}>#/ {stops.length}</Text>
                <Text style={styles.stopsHeaderText}>STOP NAME</Text>
                <Text style={styles.stopsHeaderText}>DISTANCE (KM)</Text>
                <Text style={styles.stopsHeaderText}>TIMINGS</Text>
              </View>
            </View>
          </>
        )}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.stopRow} accessibilityLabel={`Stop ${index + 1}: ${item.stop.stop_name}`}>
            <View style={styles.markerColumn}>
              <View style={styles.markerWrapper}>
                <View style={styles.markerCircle}>
                  <Text style={styles.markerNumber}>{String(index + 1)}</Text>
                </View>
                {index < stops.length - 1 && (
                  <Svg height="100%" width="24" style={styles.svgLine}>
                    <Line x1="12" x2="12" y1="36" y2={1200} stroke={currentColors.secondaryText} strokeWidth={1} strokeDasharray="3,6" />
                  </Svg>
                )}
              </View>
            </View>

            <View style={styles.stopInfo}>
              <Text style={styles.stopName}>{item.stop.stop_name}</Text>
              <Text style={styles.stopMeta}>{/* extra meta if needed */}</Text>
            </View>

            <View style={styles.stopRight}>
              <Text style={styles.stopTime}>—</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </SafeAreaView>
  );
};

export default RouteDetailsPage;