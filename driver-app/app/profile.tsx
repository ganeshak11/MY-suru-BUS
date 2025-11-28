import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Platform, KeyboardAvoidingView, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from 'expo-image-picker';
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
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("name, phone_number, profile_photo_url")
        .eq("auth_user_id", user.id)
        .single();
      
      if (error) throw error;
      setName(data?.name || "");
      setPhone(data?.phone_number || "");
      setProfilePhoto(data?.profile_photo_url || null);
      setEmail(user.email || "");
    } catch (e: any) {
      Alert.alert("Error", `Failed to load profile: ${e.message}`);
    }
  };

  const pickImage = async () => {
    Alert.alert(
      "Upload Photo",
      "Choose an option",
      [
        {
          text: "Camera",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled) {
              uploadPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Gallery permission is required');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled) {
              uploadPhoto(result.assets[0].uri);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const uploadPhoto = async (uri: string) => {
    if (!user) return;
    setPhotoUploading(true);
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `driver-profiles/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message.includes('not found')) {
          throw new Error('Storage bucket not configured. Please create "profile-photos" bucket in Supabase Dashboard.');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('drivers')
        .update({ profile_photo_url: publicUrl })
        .eq('auth_user_id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      setProfilePhoto(publicUrl);
      Alert.alert('Success', 'Profile photo updated');
    } catch (e: any) {
      console.error('Upload photo error:', e);
      Alert.alert('Upload Failed', e.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setProfileLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const updatePromise = supabase
        .from("drivers")
        .update({ name: name.trim(), phone_number: phone.trim() })
        .eq("auth_user_id", user?.id);

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message || 'Failed to update profile');
      }
      
      Alert.alert("Success", "Profile updated successfully");
    } catch (e: any) {
      console.error('Profile update error:', e);
      Alert.alert("Error", e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setProfileLoading(false);
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

    setPasswordLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      
      const updatePromise = supabase.auth.updateUser({ password: newPassword });
      
      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;
      
      if (error) {
        throw new Error(error.message || 'Failed to update password');
      }
      
      Alert.alert("Success", "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      console.error('Password change error:', e);
      Alert.alert("Error", e?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            <View style={[styles.avatarCircle, profilePhoto ? styles.avatarCircleWithPhoto : null]}>
              {photoUploading ? (
                <ActivityIndicator size="large" color={colors.primaryAccent} />
              ) : profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={60} color={colors.secondaryText} />
              )}
            </View>
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{name || 'Driver'}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
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
            style={[styles.button, profileLoading && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={profileLoading}
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
            style={[styles.button, passwordLoading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={passwordLoading}
          >
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.mainBackground },
    header: { flexDirection: 'row', alignItems: 'center', height: 100, paddingTop: Platform.OS === 'ios' ? 44 : 30, paddingHorizontal: 16, backgroundColor: colors.tableBackground, borderBottomWidth: 1, borderBottomColor: colors.border, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 1 } }) },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '600', color: colors.primaryText, flex: 1, paddingLeft: 12},
    scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    profileSection: { alignItems: 'center', paddingVertical: 28, marginBottom: 20, backgroundColor: colors.tableBackground, borderRadius: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 1 } }) },
    avatarContainer: { position: 'relative', marginBottom: 20 },
    avatarCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primaryAccent + '10', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: colors.primaryAccent + '30' },
    avatarCircleWithPhoto: { borderColor: colors.primaryAccent,overflow: 'hidden', ...Platform.select({ ios: { shadowColor: colors.primaryAccent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }, android: { elevation: 4 } }) as any },
    avatarImage: { width: 120, height: 120, borderRadius: 60,overflow: 'hidden' },
    cameraIconContainer: { position: 'absolute', bottom: 2, right: 2, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.tableBackground, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 }, android: { elevation: 4 } }) },
    profileName: { fontSize: 20, fontWeight: '700', color: colors.primaryText, marginTop: 0 },
    profileEmail: { fontSize: 14, color: colors.secondaryText, marginTop: 6 },
    card: { marginBottom: 20, backgroundColor: colors.tableBackground, borderRadius: 16, padding: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 1 } }) },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '20' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryText, marginLeft: 10 },
    label: { fontSize: 13, fontWeight: '600', color: colors.secondaryText, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: colors.mainBackground, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, color: colors.primaryText, height: 48 },
    disabledInput: { opacity: 0.5, backgroundColor: colors.mainBackground },
    button: { backgroundColor: colors.primaryAccent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20, ...Platform.select({ ios: { shadowColor: colors.primaryAccent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }, android: { elevation: 4 } }) },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  }
);

