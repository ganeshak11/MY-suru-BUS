import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = (driverId: number | null) => {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const permissionsRegistered = useRef(false);

  useEffect(() => {
    if (!driverId) return;

    if (!permissionsRegistered.current) {
      registerForPushNotifications();
      permissionsRegistered.current = true;
    }

    const channelName = `trips-${driverId}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trips',
          filter: `driver_id=eq.${driverId}`,
        },
        async (payload) => {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Trip Assignment',
                body: 'You have been assigned a new trip',
                data: { trip_id: payload.new.trip_id },
              },
              trigger: null,
            });
          } catch (error: any) {
            console.error('Notification schedule error:', error?.message || error);
          }
        }
      )
      .subscribe();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      try {
        console.log('Notification received:', notification);
      } catch (error: any) {
        console.error('Notification listener error:', error?.message || error);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        console.log('Notification response:', response);
      } catch (error: any) {
        console.error('Notification response error:', error?.message || error);
      }
    });

    return () => {
      subscription.unsubscribe();
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [driverId]);
};

async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C8B6E2',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
  } catch (error: any) {
    console.error('Push notification registration error:', error?.message || error);
  }
}
