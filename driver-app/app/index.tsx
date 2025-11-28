// app/index.tsx
import { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  ScrollView,
  Animated,
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
  
  // --- ANIMATION ---
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  // --- STYLES ---
  const styles = createStyles(colors);
  
  // --- EFFECTS ---
  useEffect(() => {
    // Logo scale-in animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    
    // Logo glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.mainBackground }}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  // Only render form if not loading and no session
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <LinearGradient
          colors={[
            colors.primaryAccent + 'E6',
            colors.primaryAccent + '99',
            colors.mainBackground + 'CC',
            colors.mainBackground
          ]}
          locations={[0, 0.3, 0.6, 1]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    transform: [{ scale: glowAnim }],
                  },
                ]}
              >
                <Ionicons name="bus" size={54} color="#fff" />
              </Animated.View>
              <Text style={styles.title}>MY(suru) BUS</Text>
              <Text style={styles.subtitle}>Driver Portal</Text>
            </Animated.View>

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
          </ScrollView>
        </LinearGradient>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// --- DYNAMIC STYLESHEET ---
const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 60,
    },
    iconCircle: {
      width: 108,
      height: 108,
      borderRadius: 54,
      backgroundColor: colors.primaryAccent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryAccent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.primaryText,
      marginBottom: 8,
      textShadowColor: 'rgba(0, 0, 0, 0.15)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    subtitle: {
      fontSize: 18,
      color: colors.secondaryText,
      fontWeight: '500',
    },
    formContainer: {
      backgroundColor: colors.tableBackground,
      borderRadius: 20,
      padding: 24,
      marginTop: -28,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
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
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: 12,
      alignSelf: 'center',
    },
    input: {
      flex: 1,
      height: 52,
      color: colors.primaryText,
      fontSize: 16,
    },
    button: {
      backgroundColor: colors.primaryAccent,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },
        android: {
          elevation: 5,
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