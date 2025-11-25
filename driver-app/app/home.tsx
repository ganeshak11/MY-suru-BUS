import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../contexts/SessionContext";
import { Card } from "../components/Card";
import { StyledButton } from "../components/StyledButton";
import { useNotifications } from "../hooks/useNotifications";
import { supabase } from "../lib/supabaseClient";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { ThemeToggleButton } from "../components/ThemeToggleButton";
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";

const formatTripTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export default function Home() {
  const { colors } = useTheme();
  const styles = createStyles(colors); 
  const router = useRouter();
  const { user, signOut } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nextTrip, setNextTrip] = useState<any | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);

  useNotifications(driverId);

  const fetchDriverAndTrip = useCallback(async (isRefresh = false) => {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError(null);
    setNextTrip(null);

    try {
      const { data: driverRow, error: driverError } = await supabase
        .from("drivers")
        .select("driver_id, name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (driverError) throw new Error(driverError.message);
      
      const driverIdValue = driverRow?.driver_id;
      setDriverId(driverIdValue);
      setDriverName(driverRow?.name || user.email); 

      if (!driverIdValue) {
        setFetchError("Driver profile not found.");
        return;
      }

      const now = new Date();
      const today = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          trip_id, status, bus_id,
          schedules!inner(start_time, routes!inner(route_name))
        `)
        .eq('driver_id', driverIdValue)
        .eq('trip_date', today)
        .in('status', ['Scheduled', 'En Route']);
      
      if (tripsError) throw new Error(tripsError.message);

      // Flatten schedules array and sort by start_time
      const flatTrips = trips?.map((trip: any) => ({
        ...trip,
        schedules: Array.isArray(trip.schedules) ? trip.schedules[0] : trip.schedules,
      }));

      const sortedTrips = flatTrips?.sort((a: any, b: any) => {
        return a.schedules.start_time.localeCompare(b.schedules.start_time);
      });

      // Find active trip first (En Route), then scheduled
      let nextTripData = sortedTrips?.find((t: any) => t.status === 'En Route');
      if (!nextTripData) {
        nextTripData = sortedTrips?.find((t: any) => t.status === 'Scheduled');
      }

      if (nextTripData) {
        const { data: busData } = await supabase
          .from('buses')
          .select('bus_no')
          .eq('bus_id', nextTripData.bus_id)
          .single();

        const schedules = nextTripData.schedules;
        const routes = Array.isArray(schedules.routes) ? schedules.routes[0] : schedules.routes;
        
        setNextTrip({
          trip_id: nextTripData.trip_id,
          status: nextTripData.status,
          schedules: {
            start_time: schedules.start_time,
            routes: {
              route_name: routes.route_name
            }
          },
          buses: {
            bus_no: busData?.bus_no
          }
        });
      } else {
        setNextTrip(null);
      }

    } catch (e: any) {
      console.error("Fetch error:", e);
      setFetchError(`Failed to load data: ${e.message || 'Unknown error'}`);
      if (!isRefresh) {
        Alert.alert("Error", `Could not load data. Please try again. (${e.message})`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDriverAndTrip();
  }, [fetchDriverAndTrip]);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of the Driver Portal?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert("Error", `Failed to sign out: ${e?.message || 'Unknown error'}`);
          }
        }},
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDriverAndTrip(true)}
              tintColor={colors.primaryAccent}
              colors={[colors.primaryAccent]}
            />
          }
        >
          <View style={styles.headerContainer}>
            <ThemeToggleButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>MY(suru) BUS</Text>
              <Text style={styles.headerSubtitle}>Driver Portal</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/profile")} style={styles.profileButton}>
              <Ionicons name="person-circle" size={28} color={colors.primaryAccent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={24} color={colors.primaryText} />
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeContainer}>
            <Ionicons name="bus" size={40} color="#050505ff" />
            <Text style={styles.welcomeText}>Welcome, {driverName || 'Driver'}</Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/history")}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryAccent + '20' }]}>
                <Ionicons name="time" size={24} color={colors.primaryAccent} />
              </View>
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/announcements")}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryAccent + '20' }]}>
                <Ionicons name="megaphone" size={24} color={colors.primaryAccent} />
              </View>
              <Text style={styles.actionText}>Announcements</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/report")}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryAccent + '20' }]}>
                <Ionicons name="flag" size={24} color={colors.primaryAccent} />
              </View>
              <Text style={styles.actionText}>Report</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.cardShadow}>
            <View style={styles.titleContainer}>
              <Ionicons name="navigate-circle" size={24} color={colors.primaryAccent} />
              <Text style={styles.title}>Your Next Trip</Text>
            </View>
        
            {loading ? (
              <View>
                <View style={[styles.tripDetailRow, styles.skeleton]}>
                  <View style={[styles.skeletonBox, { width: 80, height: 16 }]} />
                  <View style={[styles.skeletonBox, { width: 60, height: 16 }]} />
                </View>
                <View style={[styles.tripDetailRow, styles.skeleton]}>
                  <View style={[styles.skeletonBox, { width: 100, height: 16 }]} />
                  <View style={[styles.skeletonBox, { width: 120, height: 16 }]} />
                </View>
                <View style={[styles.tripDetailRow, styles.skeleton]}>
                  <View style={[styles.skeletonBox, { width: 70, height: 16 }]} />
                  <View style={[styles.skeletonBox, { width: 80, height: 16 }]} />
                </View>
                <View style={[styles.tripDetailRow, styles.skeleton]}>
                  <View style={[styles.skeletonBox, { width: 90, height: 16 }]} />
                  <View style={[styles.skeletonBox, { width: 100, height: 16 }]} />
                </View>
              </View>
            ) : fetchError ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={20} color={colors.primaryText} />
                <Text style={[styles.txt, { color: colors.primaryText, marginLeft: 8 }]}>
                  {fetchError}
                </Text>
                <StyledButton title="Retry" onPress={() => fetchDriverAndTrip()} style={{ marginTop: 10 }} />
              </View>
            ) : nextTrip ? (
              <View>
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="pricetag" size={16} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Trip ID</Text>
                  </View>
                  <Text style={styles.tripValue}>{nextTrip.trip_id}</Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="map" size={16} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Route</Text>
                  </View>
                  <Text style={styles.tripValue}>{nextTrip.schedules.routes.route_name}</Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="bus" size={16} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Bus</Text>
                  </View>
                  <Text style={styles.tripValue}>{nextTrip.buses.bus_no}</Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="time" size={16} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Time</Text>
                  </View>
                  <Text style={styles.tripValueTime}>
                    {nextTrip.schedules.start_time ? formatTripTime(nextTrip.schedules.start_time) : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="information-circle" size={16} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Status</Text>
                  </View>
                  <View style={[styles.statusBadge, nextTrip.status === "En Route" ? styles.statusActive : styles.statusScheduled]}>
                    <Text style={styles.statusText}>{nextTrip.status}</Text>
                  </View>
                </View>
                
                <StyledButton 
                  title={nextTrip.status === "En Route" ? "Continue Trip" : "Start Trip"} 
                  onPress={() => router.push(`/trip?trip_id=${nextTrip.trip_id}`)} 
                  style={{ marginTop: 20 }}
                />
              </View>
            ) : (
              <View style={styles.noTripContainer}>
                <Ionicons name="checkmark-circle" size={50} color={colors.primaryAccent} />
                <Text style={[styles.txt, { textAlign: 'center', marginTop: 12 }]}>
                  You have no scheduled or en route trips.
                </Text>
              </View>
            )}
          </Card>
        </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainBackground,
  },
  scrollContent: {
    padding: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primaryText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
    marginLeft: 8,
  },
  logoutButton: {
    padding: 8,
    marginLeft: 4,
  },
  welcomeContainer: {
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: colors.primaryAccent,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000ff',
    marginTop: 8,
  },
  cardShadow: {
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryAccent + '30',
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primaryText,
    marginLeft: 8,
  },
  txt: {
    color: colors.secondaryText,
    marginBottom: 10,
  },
  tripDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    alignItems: 'center',
  },
  tripLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripLabel: {
    fontWeight: '600',
    color: colors.secondaryText,
    fontSize: 15,
  },
  tripValue: {
    color: colors.primaryText,
    fontWeight: '600',
    fontSize: 16,
    flexShrink: 1,
    textAlign: 'right',
  },
  tripValueTime: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 17,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusScheduled: {
    backgroundColor: colors.infoBackground,
  },
  statusActive: {
    backgroundColor: colors.successBackground,
  },
  statusText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 13,
  },
  noTripContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorBox: {
    backgroundColor: colors.dangerBackground || '#fee',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondaryText,
    marginTop: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryText,
  },
  skeleton: {
    opacity: 0.6,
  },
  skeletonBox: {
    backgroundColor: colors.border,
    borderRadius: 8,
  },
});
