import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  Share,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Icon, Input } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';

interface RouteResult {
  route_id: string;
  route_no: string;
  route_name: string;
}

// Constants
const BLUR_DELAY = 300;
const SUGGESTIONS_HEIGHT = 220;
const MAX_SUGGESTIONS = 10;
const MAX_RECENT_SEARCHES = 5;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Route Search' | 'Bus Number Search'>('Route Search');

  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [isSourceFocused, setIsSourceFocused] = useState(false);
  const [isDestinationFocused, setIsDestinationFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [allRouteDetails, setAllRouteDetails] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { theme, isDark, toggleTheme, colors: currentColors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchRouteData = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('route_id, route_no, route_name');

      if (error) {
        console.error('Error fetching route details:', error);
        setAllRouteDetails([]);
        return;
      }

      setAllRouteDetails(data || []);
    } catch (e) {
      console.error(e);
      setAllRouteDetails([]);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Download MY(suru) BUS app to track buses in real-time! https://mysurubus.com/download',
        title: 'MY(suru) BUS App',
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === 'Bus Number Search') {
      setLoading(true);
      fetchRouteData().finally(() => setLoading(false));
    } else if (activeTab === 'Route Search') {
      loadRecentSearches();
    }
  }, [activeTab]);



  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem('recentSearches');
      if (searches) setRecentSearches(JSON.parse(searches));
    } catch (e) {
      console.error(e);
    }
  };

  const saveRecentSearch = async (search: string) => {
    try {
      const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, MAX_RECENT_SEARCHES);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const removeRecentSearch = async (search: string) => {
    try {
      const updated = recentSearches.filter(s => s !== search);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSuggestions = React.useCallback(
    async (
      query: string,
      type: 'source' | 'destination',
      setSuggestions: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
      if (!query) {
        setSuggestions([]);
        return;
      }

      try {
        const { data, error } = await supabase.from('stops').select('stop_name');

        if (error) {
          console.error('Suggestion fetch error', error);
          setSuggestions([]);
          return;
        }

        const queryWords = query.toLowerCase().split(/\s+/);
        const filtered = (data || []).filter((d: any) => {
          const stopName = d.stop_name.toLowerCase();
          return queryWords.every(word => stopName.includes(word));
        });

        const unique = Array.from(new Set(filtered.map((d: any) => d.stop_name))).filter(Boolean);
        setSuggestions(unique.slice(0, MAX_SUGGESTIONS));
      } catch (e) {
        console.error(e);
        setSuggestions([]);
      }
    },
    []
  );

  const handleFindRoutes = async () => {
    if (!source || !destination) return;
    const newSearch = `${source} to ${destination}`;
    await saveRecentSearch(newSearch);
    setSource('');
    setDestination('');
    Keyboard.dismiss();
    router.push({ pathname: '/SearchResults', params: { query: newSearch, type: 'route' } });
  };

  const handleSwapLocations = () => {
    const s = source;
    const d = destination;
    setSource(d);
    setDestination(s);
  };

  const filteredRouteDetails = useMemo(() => {
    if (!routeNumber) return allRouteDetails;
    const q = routeNumber.toString().toLowerCase();
    return (allRouteDetails || []).filter((r: RouteResult) => {
      if (!r || !r.route_no) return false;
      return r.route_no.toLowerCase().includes(q);
    });
  }, [allRouteDetails, routeNumber]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentColors.mainBackground,
      paddingHorizontal: 20,
      paddingTop: 10,
      zIndex: 1,
    },
    headerCard: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 15,
      padding: 12,
      marginTop: 40,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1,
    },
    iconBtn: { padding: 8, zIndex: 1 },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: currentColors.primaryText,
      zIndex: 1,
    },
    subtitle: {
      fontSize: 14,
      color: currentColors.secondaryText,
      marginTop: 4,
      textAlign: 'center',
      zIndex: 1,
    },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 16,
      backgroundColor: currentColors.cardBackground,
      borderRadius: 50,
      padding: 5,
      zIndex: 1,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      zIndex: 1,
    },
    activeTab: {
      backgroundColor: currentColors.activeTabBackground,
      zIndex: 1,
    },
    tabText: {
      color: currentColors.secondaryText,
      fontWeight: 'bold',
      zIndex: 1,
    },
    activeTabText: {
      color: isDark ? currentColors.primaryText : currentColors.buttonText,
      zIndex: 1,
    },
   
    mainCard: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 15,
      padding: 20,
      marginBottom: 16,
      zIndex: 1,
      overflow: 'visible',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      gap: 12,
      zIndex: 1,
    },
    cardHeaderCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
      zIndex: 1,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: currentColors.primaryText,
      zIndex: 1,
    },
    inputContainer: {
      marginBottom: 0,
      zIndex: 99999,
      overflow: 'visible',
    },
    inputContainerDest: {
      marginBottom: 20,
      zIndex: 99999,
      overflow: 'visible',
    },
    inputContainerCompact: {
      marginBottom: 0,
      position: 'relative',
      zIndex: 1,
    },
    inputLabel: {
      color: currentColors.primaryText,
      opacity: 0.85,
      marginBottom: 7,
      fontSize: 14,
      fontWeight: '600',
      zIndex: 1,
    },
    input: {
      backgroundColor: currentColors.mainBackground,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      color: currentColors.primaryText,
      fontSize: 15,
      zIndex: 1,
    },
    button: {
      backgroundColor: currentColors.primaryAccent,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      zIndex: 1,
    },
    swapButton: {
      marginVertical: 4,
      alignSelf: 'center',
      zIndex: 1,
    },
    buttonText: {
      color: isDark ? currentColors.primaryText : currentColors.buttonText,
      fontWeight: 'bold',
      marginLeft: 10,
      zIndex: 1,
    },
    suggestionsContainer: {
      position: 'absolute',
      top: '70%',
      left: 0,
      right: 0,
      marginTop: 8,
      backgroundColor: currentColors.cardBackground,
      borderRadius: 10,
      zIndex: 99999,
      elevation: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      maxHeight: SUGGESTIONS_HEIGHT,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    suggestionItem: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 0.8,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      zIndex: 99999,
    },
    suggestionText: {
      color: currentColors.primaryText,
      fontSize: 16,
      zIndex: 99999,
    },
    busCard: {
      backgroundColor: currentColors.cardBackground,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 1,
    },
    routeNumber: {
      fontSize: 20,
      fontWeight: '900',
      marginBottom: 10,
      color: currentColors.primaryAccent,
      zIndex: 1,
    },
    routeName: {
      fontSize: 15,
      marginBottom: 1,
      color: currentColors.primaryText,
      zIndex: 1,
    },
    noResultsText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      color: currentColors.secondaryText,
      zIndex: 1,
    },
    searchBox: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentColors.primaryText,
      marginBottom: 8,
      marginTop: 10,
      zIndex: 1,
    },
    recentBox: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginTop: 0,
      zIndex: 1,
    },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      zIndex: 1,
    },
    recentText: {
      flex: 1,
      color: currentColors.primaryText,
      fontSize: 15,
      marginLeft: 12,
      zIndex: 1,
    },
  });

  const renderSuggestions = (
    suggestions: string[],
    isFocused: boolean,
    inputValue: string,
    onSelect: (value: string) => void,
    keyPrefix: string
  ) => {
    if (inputValue.length === 0 || !isFocused || suggestions.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer} pointerEvents="box-none">
        <FlatList
          data={suggestions}
          keyExtractor={(item, index) => `${keyPrefix}-${index}`}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={true}
          bounces={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionItem}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderStaticSearchHeader = () => (
    <View style={[styles.mainCard, { zIndex: 99999, overflow: 'visible' }]}>
      <View style={styles.cardHeader}>
        <Icon name="location-pin" type="material" color={currentColors.primaryAccent} />
        <Text style={styles.cardTitle}>Search by Source and Destination</Text>
      </View>

      {/* SOURCE - HIGH Z-INDEX */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Source</Text>
        <Input
          placeholder="Enter source location"
          inputStyle={styles.input}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          containerStyle={{ paddingHorizontal: 0 }}
          placeholderTextColor={currentColors.secondaryText}
          value={source}
          onChangeText={text => {
            setSource(text);
            fetchSuggestions(text, 'source', setSourceSuggestions);
          }}
          onFocus={() => {
            setIsSourceFocused(true);
            setIsDestinationFocused(false);
          }}
          onBlur={() => setTimeout(() => setIsSourceFocused(false), BLUR_DELAY)}
          rightIcon={
            source.length > 0 ? (
              <TouchableOpacity onPress={() => setSource('')}>
                <Icon name="close-circle" type="material-community" size={20} color={currentColors.secondaryText} />
              </TouchableOpacity>
            ) : undefined
          }
          rightIconContainerStyle={{ position: 'absolute', right: 10 }}
        />
        {/* Suggestions render HERE, but because parent View has zIndex: 100, they float over everything below */}
        {renderSuggestions(
          sourceSuggestions,
          isSourceFocused,
          source,
          (item) => {
            setSource(item);
            setSourceSuggestions([]);
            setIsSourceFocused(false);
          },
          'source'
        )}
      </View>

      <TouchableOpacity onPress={handleSwapLocations} style={[styles.swapButton, (isSourceFocused && sourceSuggestions.length > 0) && { opacity: 0, pointerEvents: 'none' }]}>
        <Icon name="swap-vert" type="material" color={currentColors.activeTabBackground} size={30} />
      </TouchableOpacity>

      {/* DESTINATION - LOWER Z-INDEX than Source but higher than content */}
      <View style={[styles.inputContainerDest, (isSourceFocused && sourceSuggestions.length > 0) && { opacity: 0, pointerEvents: 'none' }]}>
        <Text style={styles.inputLabel}>Destination</Text>
        <Input
          placeholder="Enter destination location"
          inputStyle={styles.input}
          placeholderTextColor={currentColors.secondaryText}
          value={destination}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          containerStyle={{ paddingHorizontal: 0 }}
          onChangeText={text => {
            setDestination(text);
            fetchSuggestions(text, 'destination', setDestinationSuggestions);
          }}
          onFocus={() => {
            setIsDestinationFocused(true);
            setIsSourceFocused(false);
          }}
          onBlur={() => setTimeout(() => setIsDestinationFocused(false), BLUR_DELAY)}
          rightIcon={
            destination.length > 0 ? (
              <TouchableOpacity onPress={() => setDestination('')}>
                <Icon name="close-circle" type="material-community" size={20} color={currentColors.secondaryText} />
              </TouchableOpacity>
            ) : undefined
          }
          rightIconContainerStyle={{ position: 'absolute', right: 10 }}
        />
        {renderSuggestions(
          destinationSuggestions,
          isDestinationFocused,
          destination,
          (item) => {
            setDestination(item);
            setDestinationSuggestions([]);
            setIsDestinationFocused(false);
          },
          'dest'
        )}
      </View>

      <TouchableOpacity style={[styles.button, ((isSourceFocused && sourceSuggestions.length > 0) || (isDestinationFocused && destinationSuggestions.length > 0)) && { opacity: 0, pointerEvents: 'none' }]} onPress={handleFindRoutes}>
        <Text style={styles.buttonText}>Find Routes</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentSearches = () => (
    <View style={{ flex: 1, paddingBottom: 20 }}>
      {recentSearches.length > 0 && (
        <View style={styles.recentBox}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((search, index) => (
            <View key={index} style={styles.recentItem}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => {
                  const [src, dest] = search.split(' to ');
                  setSource(src);
                  setDestination(dest);
                }}
              >
                <Icon name="history" type="material" size={20} color={currentColors.secondaryText} />
                <Text style={styles.recentText}>{search}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeRecentSearch(search)} style={{ padding: 4 }}>
                <Icon name="close" type="material" size={18} color={currentColors.secondaryText} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderRouteNumberSearch = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBox}>
        <View style={styles.cardHeaderCompact}>
          <Icon name="route" type="material" color={currentColors.primaryAccent} size={20} />
          <Text style={styles.cardTitle}>Search by Bus Number</Text>
        </View>
        <View style={styles.inputContainerCompact}>
          <Input
            placeholder="Bus number (e.g., 150A, 201)"
            inputStyle={styles.input}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            containerStyle={{ paddingHorizontal: 0 }}
            placeholderTextColor={currentColors.secondaryText}
            value={routeNumber}
            underlineColorAndroid="transparent"
            onChangeText={setRouteNumber}
          />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderAllRouteDetails()}
      </ScrollView>
    </View>
  );

  const renderAllRouteDetails = () => {
    if (loading) {
      return (
        <View>
          <Text style={styles.sectionTitle}>All Buses</Text>
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.busCard, { opacity: 0.5 }]}>
              <View style={{ width: 80, height: 20, backgroundColor: currentColors.secondaryText + '30', borderRadius: 4, marginBottom: 6 }}/>
              <View style={{ width: 150, height: 16, backgroundColor: currentColors.secondaryText + '20', borderRadius: 4 }}/>
            </View>
          ))}
        </View>
      );
    }

    if (!filteredRouteDetails || filteredRouteDetails.length === 0) {
      return <Text style={styles.noResultsText}>No routes found.</Text>;
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>All Buses</Text>
        {filteredRouteDetails.map(item => (
          <TouchableOpacity
            key={String(item.route_id)}
            onPress={() => {
              router.push({
                pathname: '/RouteDetails/[route_id]',
                params: { route_id: String(item.route_id) },
              });
            }}
          >
            <View style={styles.busCard}>
              <Text style={styles.routeNumber}>{item.route_no}</Text>
              <Text style={styles.routeName}>{item.route_name}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header and Theme Toggle - Always Visible */}
      <View style={styles.headerCard}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
            <Icon name={isDark ? 'moon' : 'sunny'} type="ionicon" color={currentColors.primaryText} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>MY(suru) BUS</Text>
            <Text style={styles.subtitle}>Stop Waiting, Start Tracking...</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { opacity: 0.3 }]} disabled>
              <Icon name="share-social" type="ionicon" color={currentColors.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/menu')} style={styles.iconBtn}>
              <Icon name="menu" type="ionicon" color={currentColors.primaryText} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Route Search' && styles.activeTab]}
          onPress={() => setActiveTab('Route Search')}
        >
          <Icon
            name="shuffle"
            type="ionicon"
            color={activeTab === 'Route Search' ? (isDark ? currentColors.primaryText : currentColors.buttonText) : currentColors.secondaryText}
          />
          <Text style={[styles.tabText, activeTab === 'Route Search' && styles.activeTabText]}>
            Route Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Bus Number Search' && styles.activeTab]}
          onPress={() => setActiveTab('Bus Number Search')}
        >
          <Icon
            name="bus"
            type="ionicon"
            color={activeTab === 'Bus Number Search' ? (isDark ? currentColors.primaryText : currentColors.buttonText) : currentColors.secondaryText}
          />
          <Text style={[styles.tabText, activeTab === 'Bus Number Search' && styles.activeTabText]}>
            Bus Number Search
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled
      >
        {activeTab === 'Route Search' ? (
          <View style={{ flex: 1 }}>
            {/* ARCHITECTURE FIX: 
              1. Static Header Container (zIndex 10) -> Holds Inputs & Absolute Suggestions
              2. ScrollView (zIndex 0) -> Holds Content (Recent Searches)
              
              This structure ensures Suggestions are NOT inside the ScrollView, 
              eliminating the gesture conflict.
            */}
            <View style={{ zIndex: 10 }}>
              {renderStaticSearchHeader()}
            </View>
            
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ zIndex: 0 }}
            >
              {renderRecentSearches()}
            </ScrollView>
          </View>
        ) : (
          renderRouteNumberSearch()
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default App;