import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "../contexts/SessionContext";
import { StyledButton } from "../components/StyledButton";
import { useNotifications } from "../hooks/useNotifications";
import { apiClient } from "../lib/apiClient";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { ThemeToggleButton } from "../components/ThemeToggleButton";

const formatTripTime = (time: string) => {
  try {
    if (!time || typeof time !== 'string') return 'N/A';
    const parts = time.split(':');
    if (parts.length < 2) return 'N/A';
    const [hours, minutes] = parts;
    const hour = parseInt(hours);
    if (isNaN(hour)) return 'N/A';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (e) {
    return 'N/A';
  }
};

export default function Home() {
  const { colors } = useTheme();
  const styles = createStyles(colors); 
  const router = useRouter();
  const { driver, signOut } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nextTrip, setNextTrip] = useState<any | null>(null);

  useNotifications(driver?.driver_id);

  const fetchDriverAndTrip = useCallback(async (isRefresh = false) => {
    if (!driver) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError(null);
    setNextTrip(null);

    try {
      const trips = await apiClient.getTrips();
      
      const todayTrips = trips.filter((trip: any) => {
        const tripDate = new Date(trip.trip_date || trip.created_at);
        const today = new Date();
        return tripDate.toDateString() === today.toDateString() &&
               (trip.status === 'Scheduled' || trip.status === 'In Progress');
      });

      const sortedTrips = todayTrips.sort((a: any, b: any) => {
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      let nextTripData = sortedTrips.find((t: any) => t.status === 'In Progress');
      if (!nextTripData) {
        nextTripData = sortedTrips.find((t: any) => t.status === 'Scheduled');
      }

      if (nextTripData) {
        setNextTrip({
          trip_id: nextTripData.trip_id,
          status: nextTripData.status,
          schedules: {
            start_time: nextTripData.start_time,
            routes: {
              route_name: nextTripData.route_name
            }
          },
          buses: {
            bus_no: nextTripData.bus_no
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
  }, [driver]);

  useEffect(() => {
    fetchDriverAndTrip();
  }, [fetchDriverAndTrip]);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out?",
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

  if (!driver) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.appBar}>
        <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
          <MaterialIcons name="logout" size={22} color={colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.appBarCenter}>
          <Text style={styles.appBarTitle}>MY(suru) BUS</Text>
        </View>
        <View style={styles.appBarRight}>
          <TouchableOpacity onPress={() => router.push("/profile")} style={styles.iconButton}>
            <Ionicons name="person-circle-outline" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <ThemeToggleButton />
        </View>
      </View>

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
          <View style={styles.welcomeSection}>
            <Ionicons name="bus" size={18} color={colors.primaryAccent} style={styles.welcomeIcon} />
            <Text style={styles.welcomeText}>Welcome back, {driver?.name || 'Driver'}</Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => router.push("/history")}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={26} color={colors.primaryText} />
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => router.push("/announcements")}
              activeOpacity={0.7}
            >
              <Ionicons name="megaphone" size={26} color={colors.primaryText} />
              <Text style={styles.actionLabel}>Announcements</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => router.push("/report")}
              activeOpacity={0.7}
            >
              <Ionicons name="flag" size={26} color={colors.primaryText} />
              <Text style={styles.actionLabel}>Report</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripTitle}>Your Next Trip</Text>
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
                    <Ionicons name="pricetag" size={14} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Trip ID</Text>
                  </View>
                  <Text style={styles.tripValue}>{nextTrip.trip_id || 'N/A'}</Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="map" size={14} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Route</Text>
                  </View>
                  <Text style={styles.tripValue}>{nextTrip?.schedules?.routes?.route_name || 'Unknown'}</Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="bus" size={14} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Bus</Text>
                  </View>
                  <Text style={styles.tripValue}>{nextTrip?.buses?.bus_no || 'N/A'}</Text>
                </View>
                
                <View style={styles.tripDetailRow}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="time" size={14} color={colors.primaryAccent} />
                    <Text style={[styles.tripLabel, { color: colors.primaryAccent, fontWeight: '600' }]}>Time</Text>
                  </View>
                  <Text style={styles.tripValueTime}>
                    {formatTripTime(nextTrip?.schedules?.start_time)}
                  </Text>
                </View>
                
                <View style={[styles.tripDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View style={styles.tripLabelContainer}>
                    <Ionicons name="information-circle" size={14} color={colors.secondaryText} />
                    <Text style={styles.tripLabel}>Status</Text>
                  </View>
                  <View style={[styles.statusBadge, nextTrip.status === "En Route" ? styles.statusActive : styles.statusScheduled]}>
                    <Text style={styles.statusText}>{nextTrip.status || 'Unknown'}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.startTripButton}
                  onPress={() => router.push(`/trip?trip_id=${nextTrip.trip_id}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.startTripButtonText}>
                    {nextTrip.status === "En Route" ? "Continue Trip" : "Start Trip"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color={colors.accentMint} />
                <Text style={styles.emptyStateText}>
                  No scheduled trips today
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  You're all caught up!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainBackground,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.tableBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  appBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  appBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.tableBackground,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  welcomeIcon: {
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.tableBackground,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
  },
  tripCard: {
    backgroundColor: colors.tableBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tripHeader: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '30',
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  txt: {
    color: colors.secondaryText,
    marginBottom: 10,
  },
  tripDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border + '15',
    alignItems: 'center',
  },
  tripLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripLabel: {
    fontWeight: '500',
    color: colors.secondaryText,
    fontSize: 14,
  },
  tripValue: {
    color: colors.primaryText,
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
  },
  tripValueTime: {
    color: colors.primaryAccent,
    fontWeight: '700',
    fontSize: 15,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusScheduled: {
    backgroundColor: colors.primaryAccent + '20',
  },
  statusActive: {
    backgroundColor: colors.accentMint + '25',
  },
  statusText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.secondaryText,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor:'#fee',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondaryText,
    marginTop: 10,
  },
  skeleton: {
    opacity: 0.6,
  },
  skeletonBox: {
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  startTripButton: {
    backgroundColor: colors.primaryAccent,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryAccent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  startTripButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
