import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";
import { StyledButton } from "../components/StyledButton";
import { useRouter } from "expo-router";

export default function Report() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const [reportType, setReportType] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const buttonScale = new Animated.Value(1);

  const handleSubmit = async () => {
    if (!reportType.trim() || !message.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const insertPromise = supabase.from("passenger_reports").insert({
        report_type: reportType,
        message: message,
        status: "New",
      });

      const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message || 'Failed to submit report');
      }

      Alert.alert(
        "Success",
        "Report submitted successfully",
        [{ text: "OK", onPress: () => router.back() }],
        { cancelable: false }
      );
      setReportType("");
      setMessage("");
    } catch (e: any) {
      console.error('Report submission error:', e);
      Alert.alert("Error", e?.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const charCount = message.length;
  const maxChars = 300;

  return (
    <View style={styles.container}>
      

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Ionicons name="pricetag-outline" size={18} color={colors.primaryAccent} />
                <Text style={styles.label}>Report Type</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g., Bus Issue, Route Problem"
                placeholderTextColor={colors.secondaryText}
                value={reportType}
                onChangeText={setReportType}
              />
            </View>

            <View style={styles.fieldContainer}>
              <View style={styles.labelRow}>
                <Ionicons name="chatbox-outline" size={18} color={colors.primaryAccent} />
                <Text style={styles.label}>Message</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the issue..."
                placeholderTextColor={colors.secondaryText}
                value={message}
                onChangeText={(text) => text.length <= maxChars && setMessage(text)}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.charCounter}>
                {charCount}/{maxChars}
              </Text>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={submitting}
                activeOpacity={0.9}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? "Submitting..." : "Submit Report"}
                </Text>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.mainBackground },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      paddingTop: Platform.OS === 'ios' ? 44 : 0,
      paddingHorizontal: 16,
      backgroundColor: colors.tableBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 1 },
      }),
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primaryText,
      flex: 1,
      textAlign: 'center',
    },
    scrollContent: {
      padding: 16,
      paddingTop: 20,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.tableBackground,
      borderRadius: 16,
      padding: 20,
      minHeight: 480,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
      }),
    },
    fieldContainer: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    input: {
      backgroundColor: colors.mainBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.primaryText,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 48,
    },
    textArea: {
      minHeight: 160,
      maxHeight: 240,
      paddingTop: 14,
    },
    charCounter: {
      fontSize: 12,
      color: colors.secondaryText,
      textAlign: 'right',
      marginTop: 6,
      opacity: 0.7,
    },
    submitButton: {
      backgroundColor: colors.primaryAccent,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
        android: { elevation: 3 },
      }),
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
  });
