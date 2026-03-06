import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, RefreshControl } from "react-native";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { apiClient } from "../lib/apiClient";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

interface Trip {
  trip_id: number;
  trip_date: string;
  status: string;
  driver_id: number;
  route_name?: string;
  bus_no?: string;
  start_time?: string;
}

export default function History() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { driver } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory().catch((e) => {
      console.error("Initial fetch error:", e);
      setLoading(false);
    });
  }, []);

  const fetchHistory = async (isRefresh = false) => {
    if (!driver) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // GET /api/drivers/me/trips returns all trips for the logged-in driver.
      // Filter to Completed ones client-side (backend returns latest 50).
      const data: Trip[] = await apiClient.getTrips();
      const completed = (data ?? [])
        .filter((t) => t.status === "Completed")
        .slice(0, 20);
      setTrips(completed);
    } catch (e: any) {
      console.error("Fetch history error:", e);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={28} color={colors.primaryAccent} />
        <Text style={styles.headerTitle}>Trip History</Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.trip_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchHistory(true)}
            tintColor={colors.primaryAccent}
            colors={[colors.primaryAccent]}
          />
        }
        renderItem={({ item }) => {
          const routeName = item.route_name || "Unknown Route";
          const busNo = item.bus_no || "N/A";
          const startTime = item.start_time ? item.start_time.slice(0, 5) : "N/A";

          return (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.routeName}>{routeName}</Text>
                  <Text style={styles.tripId}>Trip #{item.trip_id}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Ionicons name="bus" size={16} color={colors.secondaryText} />
                <Text style={styles.detailLabel}>Bus:</Text>
                <Text style={styles.detailValue}>{busNo}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={16} color={colors.secondaryText} />
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{dayjs(item.trip_date).format("MMM D, YYYY")}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time" size={16} color={colors.secondaryText} />
                <Text style={styles.detailLabel}>Time:</Text>
                <Text style={styles.detailValue}>{startTime}</Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={colors.secondaryText} />
            <Text style={styles.empty}>No completed trips yet</Text>
            <Text style={styles.emptySubtext}>Your trip history will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mainBackground },
    center: { justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
      paddingBottom: 16,
      gap: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.primaryText,
    },
    listContent: {
      padding: 20,
      paddingTop: 0,
    },
    card: {
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      gap: 12,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#10b98120",
      alignItems: "center",
      justifyContent: "center",
    },
    cardHeaderText: {
      flex: 1,
    },
    routeName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.primaryText,
      marginBottom: 2,
    },
    tripId: {
      fontSize: 13,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border + "40",
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    detailValue: {
      fontSize: 14,
      color: colors.primaryText,
      fontWeight: "600",
      flex: 1,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    empty: {
      textAlign: "center",
      color: colors.primaryText,
      fontSize: 18,
      fontWeight: "600",
      marginTop: 16,
    },
    emptySubtext: {
      textAlign: "center",
      color: colors.secondaryText,
      fontSize: 14,
      marginTop: 8,
    },
  });
