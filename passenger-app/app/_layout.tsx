import { Slot } from 'expo-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
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

// This component listens for new announcements and triggers notifications
function AnnouncementListener() {
  useEffect(() => {
    async function setupAndListen() {
      // 1. Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
        // In a real app, you might want to show a message to the user
        // log removed for production
        return;
      }

      // 2. Set up Supabase real-time listener
      const channel = supabase
        .channel('public-announcements')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'announcements' },
          (payload) => {
            const newAnnouncement = payload.new as { title: string; message: string };
            
            // Sanitize input to prevent XSS
            const sanitizedTitle = String(newAnnouncement.title || '').replace(/[<>"']/g, '');
            const sanitizedMessage = String(newAnnouncement.message || '').replace(/[<>"']/g, '');
            
            // 3. Schedule a notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: sanitizedTitle,
                body: sanitizedMessage,
                data: { screen: 'announcements' }, // Example data
              },
              trigger: null, // Show immediately
            });
          }
        )
          .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            // log removed for production
          }
          if (err) {
            console.error('Supabase subscription error:', err);
          }
        });

      // Cleanup on unmount
      return () => {
        supabase.removeChannel(channel);
      };
    }

    setupAndListen();
  }, []);

  return null; // This component doesn't render any UI
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
