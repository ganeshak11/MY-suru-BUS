import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { Icon } from 'react-native-elements';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/Header';

interface BusResult {
  bus_id: string;
  bus_no: string;
  route_id?: string;
  route_no: string;
  driver_id?: string | null;
  routes?: { route_id: string; route_no: string; route_name: string; }[] | null;
  current_trip: {
    trip_id: number;
    schedule: {
      route: {
        route_id: number;
        route_name: string;
        route_no: string;
      }
    }
  } | null;
}


const SearchResults = () => {
  const { query, type } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [busResults, setBusResults] = useState<BusResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { isDark, colors: currentColors } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: currentColors.mainBackground,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      color: currentColors.primaryText,
    },
    busCard: {
      backgroundColor: currentColors.cardBackground,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
  shadowColor: isDark ? '#000' : '#ccc',
      shadowOffset: { width: 0, height: 2 },
  shadowOpacity: isDark ? 0.5 : 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    busNumber: {
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 6,
      color: currentColors.primaryAccent,
    },
    routeName: {
      fontSize: 16,
      marginBottom: 5,
      color: currentColors.primaryText,
    },
    routePoints: {
      fontSize: 14,
      color: currentColors.secondaryText,
      marginBottom: 5,
    },
    location: {
      fontSize: 14,
      color: currentColors.secondaryText,
    },
    errorText: {
      color: 'red',
      textAlign: 'center',
      marginTop: 20,
    },
    noResultsText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: currentColors.secondaryText,
    },
    listContent: {
      paddingBottom: 20,
    },
  }), [isDark, currentColors]);

  useEffect(() => {
    const fetchBusData = async () => {
      setLoading(true);
      setError(null);
      let busQuery = supabase.from('buses').select(`
        bus_id,
        bus_no,
        current_trip:trips!current_trip_id(
          schedule:schedules(
            route:routes(route_id, route_name, route_no)
          )
        )
      `);

      if (type === 'route' && query) {
        // query is expected like "Source to Destination" from the main screen
        const parts = String(query).split(' to ');
        if (parts.length === 2) {
          const src = parts[0].trim();
          const dest = parts[1].trim();

          // 1. Find stop_ids for source and destination
          const { data: srcStops, error: srcErr } = await supabase.from('stops').select('stop_id').ilike('stop_name', `%${src}%`).limit(10);
          const { data: destStops, error: destErr } = await supabase.from('stops').select('stop_id').ilike('stop_name', `%${dest}%`);

          if (srcErr || destErr) {
            console.error('Error fetching stops for route search:', srcErr || destErr);
            setError('Error fetching route information.');
            setLoading(false);
            return;
          }

          const srcIds = (srcStops || []).map(s => s.stop_id);
          const destIds = (destStops || []).map(s => s.stop_id);

          if (srcIds.length === 0 || destIds.length === 0) {
            setError(`Could not find stops for "${src}" or "${dest}".`);
            setLoading(false);
            return;
          }

          // 2. Find routes that contain both stops
          const { data: routeStopsData, error: routeErr } = await supabase
            .from('route_stops')
            .select('route_id, stop_id, stop_sequence')
            .in('stop_id', [...srcIds, ...destIds]);

          if (routeErr) {
            console.error('Error fetching route stops for search:', routeErr);
            setError('Error fetching route information.');
            setLoading(false);
            return;
          }

          // 3. Filter routes to find those that have both a source and destination stop, in the correct order.
          const routeCandidates = new Map<number, { src_seq: number, dest_seq: number }>();
          for (const rs of routeStopsData || []) {
            const isSrc = srcIds.includes(rs.stop_id);
            const isDest = destIds.includes(rs.stop_id);
            if (!isSrc && !isDest) continue;
            const entry = routeCandidates.get(rs.route_id) || { src_seq: Infinity, dest_seq: -1 };
            if (isSrc) entry.src_seq = Math.min(entry.src_seq, rs.stop_sequence);
            if (isDest) entry.dest_seq = Math.max(entry.dest_seq, rs.stop_sequence);
            routeCandidates.set(rs.route_id, entry);
          }

          const validRouteIds = Array.from(routeCandidates.entries())
            .filter(([_, seqs]) => seqs.src_seq < seqs.dest_seq)
            .map(([route_id, _]) => route_id);

          // 4. Find trips (and their buses) on those routes for today
          // First, get the schedule_ids for the valid routes
          const { data: scheduleData, error: scheduleError } = await supabase
            .from('schedules')
            .select('schedule_id')
            .in('route_id', validRouteIds);

          if (scheduleError || !scheduleData) {
            console.error('Error fetching schedules for route search:', scheduleError);
            setError('Error fetching schedule information.');
            setLoading(false);
            return;
          }
          const scheduleIds = scheduleData.map(s => s.schedule_id);

          // Get all buses assigned to trips on valid schedules
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('bus_id')
            .in('schedule_id', scheduleIds);

          if (tripError) {
            console.error('Error fetching trips:', tripError);
            setError('Error fetching bus information.');
            setLoading(false);
            return;
          }

          const busIds = Array.from(new Set((tripData || []).map(t => t.bus_id).filter(Boolean)));
          if (busIds.length > 0) {
            busQuery = busQuery.in('bus_id', busIds);
          } else {
            setBusResults([]);
            setLoading(false);
            return;
          }

          /* Old logic based on old schema */
          /*
          if (routeData && routeData.length > 0) {
            const routeIds = routeData.map((r: any) => r.route_id);
            busQuery = busQuery.in('route_id', routeIds);
          } else {
            setError('No routes found matching your search.');
            setLoading(false);
            return;
          }
          */
        } else {
          setError('Invalid route query format.');
          setLoading(false);
          return;
        }
      } else if (type === 'bus' && query) {
        busQuery = busQuery.ilike('bus_no', `%${query}%`);
      }

      const { data: busData, error: busError } = await busQuery;

      if (busError) {
        console.error('Error fetching buses:', busError);
        setError('Error fetching bus data.');
      } else {
        const augmented = await Promise.all((busData || []).map(async (b: any) => {
          const route = b.current_trip?.schedule?.route;
          
          if (route) {
            return {
              bus_id: b.bus_id,
              bus_no: b.bus_no,
              route_no: route.route_no,
              driver_id: b.current_trip?.driver_id,
              route_id: route.route_id,
              routes: [{
                route_id: route.route_id,
                route_name: route.route_name,
                route_no: route.route_no,
              }],
              current_trip: b.current_trip
            };
          }
          
          const { data: tripData } = await supabase
            .from('trips')
            .select('schedules(route_id, routes(route_id, route_name, route_no))')
            .eq('bus_id', b.bus_id)
            .limit(1)
            .single();
          
          const schedules = tripData?.schedules as any;
          const tripRoute = schedules?.routes;
          return {
            bus_id: b.bus_id,
            bus_no: b.bus_no,
            route_no: tripRoute?.route_no,
            driver_id: null,
            route_id: tripRoute?.route_id,
            routes: tripRoute ? [{
              route_id: tripRoute.route_id,
              route_name: tripRoute.route_name,
              route_no: tripRoute.route_no,
            }] : null,
            current_trip: b.current_trip
          };
        }));
        setBusResults(augmented || []);
      }
      setLoading(false);
    };

    fetchBusData();
  }, [query, type]);

  const renderBusItem = ({ item }: { item: BusResult }) => {
    const targetRouteId = item.routes?.[0]?.route_id ?? item.route_id;
    const hasRoute = item.routes && item.routes.length > 0;

    return (
      <TouchableOpacity
        onPress={async () => {
          try {
            if (targetRouteId != null) {
              router.push({ pathname: '/RouteDetails/[route_id]', params: { route_id: String(targetRouteId) } });
            } else {
              const { data, error } = await supabase.from('trips').select('schedules(route_id)').eq('bus_id', item.bus_id).limit(1).single();
              if (error) {
                console.error('Error fetching route for bus:', error);
                return;
              }
              const schedules = data?.schedules as any;
              if (schedules?.route_id) {
                router.push({ pathname: '/RouteDetails/[route_id]', params: { route_id: String(schedules.route_id) } });
              }
            }
          } catch (error) {
            console.error('Error navigating to route details:', error);
          }
        }}
      >
        <View style={styles.busCard}>
          <Text style={styles.busNumber}>{item.routes?.[0]?.route_no || item.route_no || 'N/A'}</Text>
          {hasRoute && item.routes?.[0] && <Text style={styles.routeName}>Route: {item.routes[0].route_name}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
  <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header showBackButton />
      <Text style={styles.title}>Available Buses for "{query}"</Text>

      {loading && <ActivityIndicator size="large" color={currentColors.primaryAccent} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && busResults.length === 0 && (
        <Text style={styles.noResultsText}>No buses found for your search.</Text>
      )}

      <FlatList
        data={busResults}
        keyExtractor={(item) => String(item.bus_id)}
        renderItem={renderBusItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

export default SearchResults;