import { Slot } from 'expo-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import SplashScreen from './SplashScreen';

// Configure notification handler for when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// TODO: Implement WebSocket-based announcement listener
// This component will listen for new announcements via WebSocket
function AnnouncementListener() {
  useEffect(() => {
    // TODO: Connect to WebSocket for real-time announcements
    // const socket = io('http://localhost:3001');
    // socket.on('new-announcement', (announcement) => {
    //   Notifications.scheduleNotificationAsync({ ... });
    // });
  }, []);

  return null;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    try {
      const timer = setTimeout(() => setShowSplash(false), 1200);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error in splash screen timer:', error);
      setShowSplash(false);
    }
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <>
      <AnnouncementListener />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
