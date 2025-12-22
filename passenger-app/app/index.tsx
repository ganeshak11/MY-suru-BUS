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

interface Stop {
  stop_id: string;
  stop_name: string;
  latitude: number;
  longitude: number;
}

// Constants
const BLUR_DELAY = 300;
const MAX_RECENT_SEARCHES = 5;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Route Search' | 'Bus Number Search'>('Route Search');

  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [routeNumber, setRouteNumber] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [allRouteDetails, setAllRouteDetails] = useState<RouteResult[]>([]);
  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);

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

  const fetchStops = async () => {
    try {
      const { data, error } = await supabase
        .from('stops')
        .select('stop_id, stop_name, latitude, longitude');

      if (error) {
        console.error('Error fetching stops:', error);
        setAllStops([]);
        return;
      }

      setAllStops(data || []);
    } catch (e) {
      console.error(e);
      setAllStops([]);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Download MY(suru) BUS app to track buses in real-time! https://drive.google.com/file/d/1tgUTN6-jLV-QY2oiXFSV7TFE9CdovUuo/view?usp=drivesdk',
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
      fetchStops();
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

  const filteredSourceSuggestions = useMemo(() => {
    if (!source) return [];
    const q = source.toLowerCase();
    return (allStops || []).filter((stop: Stop) => {
      if (!stop || !stop.stop_name) return false;
      return stop.stop_name.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [allStops, source]);

  const filteredDestinationSuggestions = useMemo(() => {
    if (!destination) return [];
    const q = destination.toLowerCase();
    return (allStops || []).filter((stop: Stop) => {
      if (!stop || !stop.stop_name) return false;
      return stop.stop_name.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [allStops, destination]);

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
    suggestionsContainer: {
      backgroundColor: currentColors.cardBackground,
      borderRadius: 12,
      marginBottom: 12,
      marginTop: -28,
      maxHeight: 280,
      borderWidth: 1.5,
      borderColor: currentColors.primaryAccent + '40',
      overflow: 'hidden',
      shadowColor: currentColors.primaryAccent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 9999,
    },
    suggestionItem: {
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 9999,
    },
    suggestionItemActive: {
      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)',
      zIndex: 9999,
    },
    suggestionText: {
      color: currentColors.primaryText,
      fontSize: 15,
      fontWeight: '500',
      marginLeft: 12,
      flex: 1,
      zIndex: 9999,
    },
    suggestionIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: currentColors.primaryAccent + '20',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
  });

  const renderSourceSuggestions = () => {
    if (!showSourceSuggestions || filteredSourceSuggestions.length === 0) return null;
    
    return (
      <View style={styles.suggestionsContainer}>
        <ScrollView
          scrollEnabled={filteredSourceSuggestions.length > 5}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {filteredSourceSuggestions.map((item, index) => (
            <TouchableOpacity
              key={String(item.stop_id)}
              style={[styles.suggestionItem, index === filteredSourceSuggestions.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => {
                setSource(item.stop_name);
                setShowSourceSuggestions(false);
                Keyboard.dismiss();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionIcon}>
                <Icon name="location-on" type="material" color={currentColors.primaryAccent} size={18} />
              </View>
              <Text style={styles.suggestionText}>{item.stop_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderDestinationSuggestions = () => {
    if (!showDestinationSuggestions || filteredDestinationSuggestions.length === 0) return null;
    
    return (
      <View style={styles.suggestionsContainer}>
        <ScrollView
          scrollEnabled={filteredDestinationSuggestions.length > 5}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
        >
          {filteredDestinationSuggestions.map((item, index) => (
            <TouchableOpacity
              key={String(item.stop_id)}
              style={[styles.suggestionItem, index === filteredDestinationSuggestions.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => {
                setDestination(item.stop_name);
                setShowDestinationSuggestions(false);
                Keyboard.dismiss();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionIcon}>
                <Icon name="location-on" type="material" color={currentColors.primaryAccent} size={18} />
              </View>
              <Text style={styles.suggestionText}>{item.stop_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderStaticSearchHeader = () => (
    <View style={[styles.mainCard, { zIndex: 99999, overflow: 'visible' }]}>
      <View style={styles.cardHeader}>
        <Icon name="location-pin" type="material" color={currentColors.primaryAccent} />
        <Text style={styles.cardTitle}>Search by Source and Destination</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Source</Text>
        <Input
          placeholder="Enter source location"
          inputStyle={styles.input}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          containerStyle={{ paddingHorizontal: 0 }}
          placeholderTextColor={currentColors.secondaryText}
          value={source}
          onChangeText={setSource}
          onFocus={() => setShowSourceSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSourceSuggestions(false), BLUR_DELAY)}
          rightIcon={
            source.length > 0 ? (
              <TouchableOpacity onPress={() => setSource('')}>
                <Icon name="close-circle" type="material-community" size={20} color={currentColors.secondaryText} />
              </TouchableOpacity>
            ) : undefined
          }
          rightIconContainerStyle={{ position: 'absolute',zIndex: 1 ,right: 10 }}
        />
        {renderSourceSuggestions()}
      </View>

      <TouchableOpacity onPress={handleSwapLocations} style={styles.swapButton}>
        <Icon name="swap-vert" type="material" color={currentColors.activeTabBackground} size={30} />
      </TouchableOpacity>

      <View style={styles.inputContainerDest}>
        <Text style={styles.inputLabel}>Destination</Text>
        <Input
          placeholder="Enter destination location"
          inputStyle={styles.input}
          placeholderTextColor={currentColors.secondaryText}
          value={destination}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          containerStyle={{ paddingHorizontal: 0 }}
          onChangeText={setDestination}
          onFocus={() => setShowDestinationSuggestions(true)}
          onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), BLUR_DELAY)}
          rightIcon={
            destination.length > 0 ? (
              <TouchableOpacity onPress={() => setDestination('')}>
                <Icon name="close-circle" type="material-community" size={20} color={currentColors.secondaryText} />
              </TouchableOpacity>
            ) : undefined
          }
          rightIconContainerStyle={{ position: 'absolute', zIndex: 1, right: 10 }}
        />
        {renderDestinationSuggestions()}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFindRoutes}>
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
            rightIcon={
              routeNumber.length > 0 ? (
                <TouchableOpacity onPress={() => setRouteNumber('')}>
                  <Icon name="close-circle" type="material-community" size={20} color={currentColors.secondaryText} />
                </TouchableOpacity>
              ) : undefined
            }
            rightIconContainerStyle={{ position: 'absolute', zIndex: 1,  right: 10 }}
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
            <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { opacity: 1 }]}>
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

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled
        >
          {activeTab === 'Route Search' ? (
            <View style={{ flex: 1 }}>
              <View style={{ zIndex: 10 }}>
                {renderStaticSearchHeader()}
              </View>
              
              {renderRecentSearches()}
            </View>
          ) : (
            renderRouteNumberSearch()
          )}
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;