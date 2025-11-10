// app/index.tsx
import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabaseClient';
// We no longer import 'router' here
import { themeTokens, useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';

export default function LoginScreen() {
  // --- HOOKS ---
  const { colors } = useTheme();
  // We still use these to show the loading spinner
  const { session, isLoading: isSessionLoading } = useSession();

  // --- STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- STYLES ---
  const styles = createStyles(colors);

  // --- THE REDIRECT useEffect HAS BEEN REMOVED ---
  // The RootLayout now handles all navigation.

  // --- HANDLERS ---
  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      Keyboard.dismiss();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
      }
      // No redirect needed. The RootLayout will see the
      // 'session' change and trigger the redirect automatically.
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---

  // Show spinner if session is loading OR if user is logged in
  // (because _layout is about to redirect them away from this screen)
  if (isSessionLoading || session) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  // Only render form if not loading and no session
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient
        colors={['#8b5cf6', '#C8B6E2', '#f3f4f6']}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="bus" size={60} color="#fff" />
            </View>
            <Text style={styles.title}>MY(suru) BUS</Text>
            <Text style={styles.subtitle}>Driver Portal</Text>
          </View>

          <View style={styles.formContainer}>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.secondaryText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.secondaryText}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.secondaryText} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.secondaryText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.primaryAccent}
                style={{ marginTop: 20 }}
              />
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

// --- DYNAMIC STYLESHEET ---
const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 50,
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(139, 92, 246, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 8,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    subtitle: {
      fontSize: 18,
      color: '#fff',
      fontWeight: '500',
    },
    formContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 20,
      padding: 24,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.mainBackground,
      borderRadius: 12,
      marginBottom: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      height: 50,
      color: colors.primaryText,
      fontSize: 16,
    },
    button: {
      backgroundColor: '#8b5cf6',
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#8b5cf6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    errorText: {
      color: '#dc3545',
      textAlign: 'center',
      marginTop: 10,
      fontSize: 14,
    },
  });