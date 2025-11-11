import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, RefreshControl } from "react-native";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

export default function History() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useSession();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data: driverRow } = await supabase
        .from("drivers")
        .select("driver_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!driverRow) return;

      const { data } = await supabase
        .from("trips")
        .select("*, schedules(start_time, routes(route_name)), buses!fk_trips_bus(bus_no)")
        .eq("driver_id", driverRow.driver_id)
        .eq("status", "Completed")
        .order("trip_date", { ascending: false })
        .limit(20);

      setTrips(data || []);
    } catch (e) {
      console.error(e);
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
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.routeName}>{item.schedules.routes.route_name}</Text>
                <Text style={styles.tripId}>Trip #{item.trip_id}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Ionicons name="bus" size={16} color={colors.secondaryText} />
              <Text style={styles.detailLabel}>Bus:</Text>
              <Text style={styles.detailValue}>{item.buses.bus_no}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={16} color={colors.secondaryText} />
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{dayjs(item.trip_date).format("MMM D, YYYY")}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={16} color={colors.secondaryText} />
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{item.schedules.start_time ? item.schedules.start_time.slice(0, 5) : 'N/A'}</Text>
            </View>
          </Card>
        )}
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
      padding: 16,
      paddingTop: 0,
    },
    card: {
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: { elevation: 8 },
      }),
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
