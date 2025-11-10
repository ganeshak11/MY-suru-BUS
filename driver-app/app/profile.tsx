import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "../contexts/SessionContext";
import { useTheme, themeTokens } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Card";

export default function Profile() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useSession();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("name, phone_number")
        .eq("auth_user_id", user.id)
        .single();
      
      if (error) throw error;
      setName(data?.name || "");
      setPhone(data?.phone_number || "");
      setEmail(user.email || "");
    } catch (e: any) {
      Alert.alert("Error", `Failed to load profile: ${e.message}`);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({ name: name.trim(), phone_number: phone.trim() })
        .eq("auth_user_id", user?.id);

      if (error) throw error;
      Alert.alert("Success", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", `Failed to update profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      Alert.alert("Success", "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      Alert.alert("Error", `Failed to change password: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={[colors.primaryAccent + '30', colors.mainBackground]} style={styles.flex}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={50} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={22} color={colors.primaryAccent} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={colors.secondaryText}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor={colors.secondaryText}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={email}
            editable={false}
            placeholderTextColor={colors.secondaryText}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Update Profile</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed" size={22} color={colors.primaryAccent} />
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>

          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={colors.secondaryText}
            secureTextEntry
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor={colors.secondaryText}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.secondaryText}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>
        </Card>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: { flex: 1 },
    flex: { flex: 1 },
    backButton: { position: 'absolute', top: 16, left: 16, zIndex: 10, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 6 } }) },
    scrollContent: { padding: 16, paddingTop: 70 },
    header: { alignItems: 'center', marginBottom: 24 },
    avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }, android: { elevation: 8 } }) },
    headerTitle: { fontSize: 24, fontWeight: '700', color: colors.primaryText },
    card: { marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }, android: { elevation: 8 } }) },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: colors.primaryAccent + '30' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryText, marginLeft: 8 },
    label: { fontSize: 14, fontWeight: '600', color: colors.secondaryText, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: colors.mainBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.primaryText, marginBottom: 8 },
    disabledInput: { opacity: 0.6 },
    button: { backgroundColor: colors.primaryAccent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 4 } }) },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
