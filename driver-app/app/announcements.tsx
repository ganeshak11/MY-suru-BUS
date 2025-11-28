import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, RefreshControl } from "react-native";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";

interface Announcement {
  announcement_id: number;
  title: string;
  message: string;
  created_at: string;
}

export default function Announcements() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const fetchPromise = supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message || 'Failed to fetch announcements');
      }

      setAnnouncements(data || []);
    } catch (e: any) {
      console.error('Fetch announcements error:', e);
      setAnnouncements([]);
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
        <Ionicons name="megaphone" size={28} color={colors.primaryAccent} />
        <Text style={styles.headerTitle}>Announcements</Text>
      </View>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.announcement_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAnnouncements(true)}
            tintColor={colors.primaryAccent}
            colors={[colors.primaryAccent]}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryAccent + "20" }]}>
                <Ionicons name="notifications" size={24} color={colors.primaryAccent} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={14} color={colors.secondaryText} />
                  <Text style={styles.date}>{dayjs(item.created_at).format("MMM D, YYYY h:mm A")}</Text>
                </View>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.message}>{item.message}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={64} color={colors.secondaryText} />
            <Text style={styles.empty}>No announcements</Text>
            <Text style={styles.emptySubtext}>Check back later for updates</Text>
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
      alignItems: "flex-start",
      marginBottom: 12,
      gap: 12,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    cardHeaderText: {
      flex: 1,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.primaryText,
      marginBottom: 6,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    date: {
      fontSize: 12,
      color: colors.secondaryText,
      fontWeight: "500",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border + "40",
      marginBottom: 12,
    },
    message: {
      fontSize: 15,
      color: colors.primaryText,
      lineHeight: 22,
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
