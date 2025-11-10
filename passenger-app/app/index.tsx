import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ScrollView, FlatList } from 'react-native';
import { Icon, Input } from 'react-native-elements';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import SplashScreen from './SplashScreen';
import { useTheme } from '../contexts/ThemeContext';

interface BusResult {
  bus_id: string;
  bus_no: string;
  route_id: string;
  driver_id?: string;
  routes: { route_id: string; route_name: string; }[] | null;
}

const App: React.FC = () => {
  // (systemTheme below) removed direct `theme` to allow local override
  const [activeTab, setActiveTab] = useState<'Route Search' | 'Bus Number Search'>('Route Search');
  const [recentRouteSearches, setRecentRouteSearches] = useState<string[]>([]);
  const [recentBusNumberSearches, setRecentBusNumberSearches] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [busNumber, setBusNumber] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [isSourceFocused, setIsSourceFocused] = useState(false);
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [allBusDetails, setAllBusDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const { theme, isDark, toggleTheme, colors: currentColors } = useTheme();

  useEffect(() => {
    // simple splash delay
    const t = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // fetch all buses when opening Bus Number tab
    if (activeTab === 'Bus Number Search') {
      (async () => {
        try {
          // With the new schema, we get route info via the bus's current trip.
          const { data, error } = await supabase.from('buses').select(`
            bus_id,
            bus_no,
            current_trip:trips!current_trip_id (
              trip_id,
              driver_id,
              schedule:schedules (
                route:routes (
                  route_id,
                  route_name
                )
              )
            )
          `);
          if (error) {
            console.error('Error fetching all bus details:', error);
            setAllBusDetails([]);
          } else {
            try {
              const busData = data || [];
              // The data structure is now different, so we adapt.
              // We no longer need to manually fetch stops as we can get the route_name directly.
              const augmented = busData.map((b: any) => {
                const route = b.current_trip?.schedule?.route;
                return {
                  bus_id: b.bus_id,
                  bus_no: b.bus_no,
                  driver_id: b.current_trip?.driver_id,
                  route_id: route?.route_id,
                  routes: route ? [{
                    route_id: route.route_id,
                    route_name: route.route_name,
                  }] : []
                };
              });

              setAllBusDetails(augmented || []);
            } catch (e) {
              console.error('Error augmenting all bus details with stop names', e);
              setAllBusDetails(data || []);
            }
          }
        } catch (e) {
          console.error(e);
          setAllBusDetails([]);
        }
      })();
    }
  }, [activeTab]);

  // toggleTheme comes from ThemeContext

  const fetchSuggestions = async (query: string, type: 'source' | 'destination', setSuggestions: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stops')
        .select('stop_name')
        .ilike('stop_name', `%${query}%`);

      if (error) {
        console.error('Suggestion fetch error', error);
        setSuggestions([]);
        return;
      }

      const unique = Array.from(new Set((data || []).map((d: any) => d.stop_name))).filter(Boolean);
      setSuggestions(type === 'destination' && source ? unique.filter(s => s !== source) : unique);
    } catch (e) {
      console.error(e);
      setSuggestions([]);
    }
  };

  const handleFindRoutes = () => {
    if (!source || !destination) return;
    const newSearch = `${source} to ${destination}`;
    setRecentRouteSearches(prev => [newSearch, ...prev.filter(s => s !== newSearch)].slice(0, 5));
    setSource('');
    setDestination('');
    router.push({ pathname: '/SearchResults', params: { query: newSearch, type: 'route' } });
  };


  const handleSwapLocations = () => {
    // swap source and destination
    const s = source;
    const d = destination;
    setSource(d);
    setDestination(s);
  };

  // Filter all buses by the current busNumber input (case-insensitive).
  const filteredBusDetails = useMemo(() => {
    if (!busNumber) return allBusDetails;
    const q = busNumber.toString().toLowerCase();
    return (allBusDetails || []).filter((b: BusResult) => {
      if (!b || !b.bus_no) return false;
      return b.bus_no.toLowerCase().includes(q);
    });
  }, [allBusDetails, busNumber]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: currentColors.mainBackground, paddingHorizontal: 20, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 8 },
    iconBtn: { padding: 8, marginTop: 6 },
    title: { fontSize: 24, fontWeight: 'bold', color: currentColors.primaryText },
    subtitle: { fontSize: 16, color: currentColors.secondaryText, textAlign: 'center', marginTop: 5 },
    navigation: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, backgroundColor: currentColors.cardBackground, borderRadius: 50, padding: 5 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 50, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    activeTab: { backgroundColor: currentColors.activeTabBackground },
    tabText: { color: currentColors.secondaryText, fontWeight: 'bold' },
  activeTabText: { color: isDark ? currentColors.primaryText : currentColors.buttonText },
    mainCard: { backgroundColor: currentColors.cardBackground, borderRadius: 15, padding: 20, marginBottom: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: currentColors.primaryText, marginLeft: 10 },
    inputContainer: { marginBottom: 15 },
    inputLabel: { color: currentColors.secondaryText, marginBottom: 5 },
    input: { backgroundColor: currentColors.mainBackground, borderRadius: 10, padding: 10, color: currentColors.primaryText },
    button: { backgroundColor: currentColors.primaryAccent, borderRadius: 10, padding: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  buttonText: { color: isDark ? currentColors.primaryText : currentColors.buttonText, fontWeight: 'bold', marginLeft: 10 },
    suggestionsContainer: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: currentColors.cardBackground, borderRadius: 10, zIndex: 1, maxHeight: 200, overflow: 'hidden', elevation: 3 },
    suggestionItem: { padding: 12 },
    suggestionText: { color: currentColors.primaryText, fontSize: 16 },
    recentSearchesContainer: { marginTop: 20, backgroundColor: currentColors.cardBackground, borderRadius: 15, padding: 20 },
    recentSearchesTitle: { fontSize: 18, fontWeight: 'bold', color: currentColors.primaryText, marginBottom: 10 },
    recentSearchItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: currentColors.secondaryText, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recentSearchText: { color: currentColors.primaryText, fontSize: 16 },
    clearButton: { color: currentColors.primaryAccent, fontWeight: 'bold' },
    busCard: { backgroundColor: currentColors.cardBackground, padding: 15, borderRadius: 10, marginBottom: 10 },
  busNumber: { fontSize: 22, fontWeight: '900', marginBottom: 6, color: currentColors.primaryAccent },
    routeName: { fontSize: 16, marginBottom: 5, color: currentColors.primaryText },
    routePoints: { fontSize: 14, color: currentColors.secondaryText, marginBottom: 5 },
    location: { fontSize: 14, color: currentColors.secondaryText },
    noResultsText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: currentColors.secondaryText },
    listContent: { paddingBottom: 20 },
    searchBox: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
  borderWidth: 1,
  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    busListBox: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.06,
      shadowRadius: 4,
      elevation: 3,
      maxHeight: 320,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: currentColors.primaryText, marginBottom: 8 },
  });

  if (isLoading) return <SplashScreen />;

  const renderRecentSearches = (searches: string[], type: 'route' | 'bus') => {
    if (searches.length === 0) return null;

    const handleClear = () => {
      if (type === 'route') setRecentRouteSearches([]);
      else setRecentBusNumberSearches([]);
    };

    return (
      <View style={styles.recentSearchesContainer}>
        <Text style={styles.recentSearchesTitle}>Recent {type === 'route' ? 'Route' : 'Bus Number'} Searches</Text>
        {searches.map((search, index) => (
          <TouchableOpacity key={index} style={styles.recentSearchItem} onPress={() => {
            if (type === 'route') {
              router.push({ pathname: '/SearchResults', params: { query: search, type: 'route' } });
            } else {
              router.push({ pathname: '/SearchResults', params: { query: search, type: 'bus' } });
            }
          }}>
            <Text style={styles.recentSearchText}>{search}</Text>
            <Icon name="arrow-forward" type="material" color={currentColors.secondaryText} size={20} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={handleClear} style={{ marginTop: 10, alignItems: 'center' }}>
          <Text style={styles.clearButton}>Clear All</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRouteSearch = () => (
    <View>
      <View style={styles.cardHeader}>
        <Icon name="location-pin" type="material" color={currentColors.primaryAccent} />
        <Text style={styles.cardTitle}>Search by Source and Destination</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Source</Text>
        <Input
          placeholder="Enter source location"
          inputStyle={styles.input}
          placeholderTextColor={currentColors.secondaryText}
          value={source}
          onChangeText={(text) => {
            setSource(text);
            fetchSuggestions(text, 'source', setSourceSuggestions);
          }}
          onFocus={() => setIsSourceFocused(true)}
          onBlur={() => setTimeout(() => setIsSourceFocused(false), 500) } // Delay to allow click on suggestion
        />
        {source.length > 0 && isSourceFocused && (
          <View style={styles.suggestionsContainer}>
            <ScrollView keyboardShouldPersistTaps="always">
            {sourceSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setSource(suggestion);
                  setSourceSuggestions([]);
                  setIsSourceFocused(false);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={handleSwapLocations} style={{ marginVertical: 1, alignSelf: 'center' }}>
        <Icon name="swap-vert" type="material" color={currentColors.activeTabBackground} size={30} />
      </TouchableOpacity>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Destination</Text>
        <Input
          placeholder="Enter destination location"
          inputStyle={styles.input}
          placeholderTextColor={currentColors.secondaryText}
          value={destination}
          onChangeText={(text) => {
            setDestination(text);
            fetchSuggestions(text, 'destination', setDestinationSuggestions);
          }}
          onFocus={() => setIsDestinationFocused(true)}
          onBlur={() => setTimeout(() => setIsDestinationFocused(false), 500) } // Delay to allow click on suggestion
        />
        {destination.length > 0 && isDestinationFocused && (
          <View style={styles.suggestionsContainer}>
            <ScrollView keyboardShouldPersistTaps="always">
            {destinationSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => {
                  setDestination(suggestion);
                  setDestinationSuggestions([]);
                  setIsDestinationFocused(false);
                }}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleFindRoutes}>
        <Text>Find Routes</Text>
      </TouchableOpacity>

      {/* show recent route searches immediately below the search box */}
      {renderRecentSearches(recentRouteSearches, 'route')}
    </View>
  );

  const renderBusNumberSearch = () => (
    <View>
      <View style={styles.searchBox}>
        <View style={styles.cardHeader}>
          <Icon name="directions-bus" type="material" color={currentColors.primaryAccent} />
          <Text style={styles.cardTitle}>Search by Bus Number</Text>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bus Number</Text>
          <Input
            placeholder="Enter bus number (e.g., 150A, 201)"
            inputStyle={styles.input}
            placeholderTextColor={currentColors.secondaryText}
            value={busNumber}
            onChangeText={setBusNumber}
          />
        </View>
      </View>

      <View style={styles.busListBox}>
        <Text style={styles.sectionTitle}>All Buses</Text>
        {renderAllBusDetails()}
      </View>
    </View>
  );

  const renderAllBusDetails = () => {
    if (!filteredBusDetails || filteredBusDetails.length === 0) {
      return <Text style={styles.noResultsText}>No buses found.</Text>;
    }

    const renderBusItem = ({ item }: { item: BusResult }) => {
      const targetRouteId = item.routes?.[0]?.route_id ?? item.route_id;
      return (
    <TouchableOpacity onPress={() => { if (targetRouteId != null) router.push({ pathname: '/RouteDetails/[route_id]', params: { route_id: String(targetRouteId) } }); }}>
          <View style={styles.busCard}>
            <Text style={styles.busNumber}>{item.bus_no}</Text>
            <Text style={styles.routeName}>Route: {item.routes?.[0]?.route_name ?? 'Not on a trip'}</Text>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <FlatList
        data={filteredBusDetails}
        keyExtractor={(item) => String(item.bus_id)}
        renderItem={renderBusItem}
        contentContainerStyle={styles.listContent}
      />
    );
  };
  

  return (
    <SafeAreaView style={styles.container}>
  <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/report')} style={styles.iconBtn}>
          <Icon name={'alert-circle-outline'} type="ionicon" color={currentColors.primaryText} />
        </TouchableOpacity>
        <View style={{flex: 1, alignItems: 'center'}}>
            <Text style={styles.title}>MY(suru) BUS</Text>
            <Text style={styles.subtitle}>Stop waiting... Start tracking</Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          <Icon name={isDark ? 'moon' : 'sunny'} type="ionicon" color={currentColors.primaryText} />
        </TouchableOpacity>
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Route Search' && styles.activeTab]}
          onPress={() => setActiveTab('Route Search')}
        >
          <Icon name="shuffle" type="ionicon" color={activeTab === 'Route Search' ? (isDark ? currentColors.primaryText : currentColors.buttonText) : currentColors.secondaryText} />
          <Text style={[styles.tabText, activeTab === 'Route Search' && styles.activeTabText]}>Route Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Bus Number Search' && styles.activeTab]}
          onPress={() => setActiveTab('Bus Number Search')}
        >
          <Icon name="bus" type="ionicon" color={activeTab === 'Bus Number Search' ? (isDark ? currentColors.primaryText : currentColors.buttonText) : currentColors.secondaryText} />
          <Text style={[styles.tabText, activeTab === 'Bus Number Search' && styles.activeTabText]}>Bus Number Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainCard}>
        {activeTab === 'Route Search' ? renderRouteSearch() : renderBusNumberSearch()}
      </View>
    </SafeAreaView>
  );
};

export default App;
