import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";
import dayjs from "dayjs";

export default function Announcements() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      setAnnouncements(data || []);
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
        data={announcements}
        keyExtractor={(item) => item.announcement_id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{dayjs(item.created_at).format("MMM D, YYYY h:mm A")}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No announcements</Text>
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
    title: { fontSize: 18, fontWeight: "600", color: colors.primaryText, marginBottom: 8 },
    message: { fontSize: 14, color: colors.primaryText, marginBottom: 8 },
    date: { fontSize: 12, color: colors.secondaryText },
    empty: { textAlign: "center", color: colors.secondaryText, marginTop: 20 },
  });
