import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BusAPI } from '../lib/apiClient';
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
      
      try {
        if (type === 'route' && query) {
          const parts = String(query).split(' to ');
          if (parts.length === 2) {
            const src = parts[0].trim();
            const dest = parts[1].trim();
            
            // Use API to search routes by source and destination
            const routeData = await BusAPI.searchRoutes(src, dest);
            setBusResults(routeData || []);
          } else {
            setError('Invalid route query format.');
          }
        } else {
          // For bus number search or general search, get all buses
          const busData = await BusAPI.getAllBuses();
          setBusResults(busData || []);
        }
      } catch (error) {
        console.error('Error fetching bus data:', error);
        setError('Error fetching bus information.');
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
        onPress={() => {
          if (targetRouteId != null) {
            router.push({ pathname: '/RouteDetails/[route_id]', params: { route_id: String(targetRouteId) } });
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