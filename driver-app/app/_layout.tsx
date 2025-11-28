// app/_layout.tsx
import { Stack, router, useSegments } from 'expo-router';
import { SessionProvider, useSession } from '../contexts/SessionContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useMemo } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

function AuthLayout() {
  const { session, isLoading } = useSession();
  const { colors } = useTheme();
  const segments = useSegments(); // Gets the current URL path

  const segmentsKey = useMemo(() => segments.join('/'), [segments]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    // Check if we are at the root login screen. segments.length is 0 for '/'
    const atLogin = segments.length === 0;

    // Check if we are in any "app" screen (e.g., /home or /trip)
    const inApp = segments.length > 0;

    // If user is NOT logged in and is trying to access an app screen
    if (!session && inApp) {
      router.replace('/'); // Force redirect to login
    }
    
    // If user IS logged in and is on the login screen
    if (session && atLogin) {
      router.replace('/home'); // Force redirect to dashboard
    }
  }, [session, isLoading, segmentsKey]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.mainBackground }]}>
        <ActivityIndicator size="large" color={colors.primaryAccent} />
      </View>
    );
  }

  // Render the navigator
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTintColor: colors.primaryText,
        contentStyle: { backgroundColor: colors.mainBackground },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ title: 'Trip History' }} />
      <Stack.Screen name="announcements" options={{ title: 'Announcements' }} />
      <Stack.Screen name="report" options={{ title: 'Report to Admin' }} />
      <Stack.Screen
        name="trip"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

// The root layout just provides the contexts
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ThemeProvider>
          <AuthLayout />
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});