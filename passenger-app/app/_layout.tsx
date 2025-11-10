import { Slot } from 'expo-router';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import * as Notifications from 'expo-notifications';

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
        console.log('Notification permissions were not granted.');
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
            
            // 3. Schedule a notification
            Notifications.scheduleNotificationAsync({
              content: {
                title: newAnnouncement.title,
                body: newAnnouncement.message,
                data: { screen: 'announcements' }, // Example data
              },
              trigger: null, // Show immediately
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to announcements channel.');
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

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AnnouncementListener />
      <Slot />
    </ThemeProvider>
  );
}
