import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";
import dayjs from "dayjs";

export default function History() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useSession();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
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
      <FlatList
        data={trips}
        keyExtractor={(item) => item.trip_id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.routeName}>{item.schedules.routes.route_name}</Text>
            <Text style={styles.detail}>Bus: {item.buses.bus_no}</Text>
            <Text style={styles.detail}>Date: {dayjs(item.trip_date).format("MMM D, YYYY")}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No completed trips yet</Text>
        }
      />
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mainBackground, padding: 16 },
    center: { justifyContent: "center", alignItems: "center" },
    card: { marginBottom: 12 },
    routeName: { fontSize: 18, fontWeight: "600", color: colors.primaryText, marginBottom: 8 },
    detail: { fontSize: 14, color: colors.secondaryText, marginBottom: 4 },
    empty: { textAlign: "center", color: colors.secondaryText, marginTop: 20 },
  });
