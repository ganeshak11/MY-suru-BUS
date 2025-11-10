import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";
import { StyledButton } from "../components/StyledButton";
import { useRouter } from "expo-router";

export default function Report() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useSession();
  const router = useRouter();
  const [reportType, setReportType] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("passenger_reports").insert({
        report_type: reportType,
        message: message,
        status: "New",
      });

      if (error) throw error;

      Alert.alert("Success", "Report submitted successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
      setReportType("");
      setMessage("");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.flex} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container}>
      <Card>
        <Text style={styles.label}>Report Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Bus Issue, Route Problem"
          placeholderTextColor={colors.secondaryText}
          value={reportType}
          onChangeText={setReportType}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the issue..."
          placeholderTextColor={colors.secondaryText}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
        />

        <StyledButton
          title={submitting ? "Submitting..." : "Submit Report"}
          onPress={handleSubmit}
          disabled={submitting}
        />
      </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.mainBackground, padding: 16 },
    label: { fontSize: 16, fontWeight: "600", color: colors.primaryText, marginBottom: 8 },
    input: {
      backgroundColor: colors.mainBackground,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.primaryText,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: { height: 120, textAlignVertical: "top" },
  });
