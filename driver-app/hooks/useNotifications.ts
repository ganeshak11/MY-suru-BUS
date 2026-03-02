/**
 * useNotifications — driver trip assignment notifications
 *
 * Replaced Supabase Realtime with a polling loop that calls
 * GET /api/drivers/me/trips every 30 seconds.
 * When a NEW trip (status=Scheduled) appears that wasn't there before,
 * it fires a local push notification — identical UX, no Supabase needed.
 *
 * For production, consider switching to Socket.IO events emitted by the
 * backend when a new trip row is inserted (the io instance is already exported).
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '../lib/apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

export const useNotifications = (driverId: number | null) => {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const permissionsRegistered = useRef(false);
  const knownTripIds = useRef<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!driverId) return;

    if (!permissionsRegistered.current) {
      registerForPushNotifications();
      permissionsRegistered.current = true;
    }

    // Seed the known trips set on first load so we don't notify for existing ones
    apiClient.getTrips().then((trips: any[]) => {
      trips.forEach((t) => knownTripIds.current.add(t.trip_id));
    }).catch(() => { });

    // Poll for new Scheduled trips
    intervalRef.current = setInterval(async () => {
      try {
        const trips: any[] = await apiClient.getTrips();
        const newTrips = trips.filter(
          (t) => t.status === 'Scheduled' && !knownTripIds.current.has(t.trip_id)
        );

        for (const trip of newTrips) {
          knownTripIds.current.add(trip.trip_id);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'New Trip Assignment',
              body: `You have been assigned: ${trip.route_name ?? 'a new trip'} on ${trip.trip_date}`,
              data: { trip_id: trip.trip_id },
            },
            trigger: null,
          }).catch((err: any) =>
            console.error('Notification schedule error:', err?.message || err)
          );
        }
      } catch (err: any) {
        // Silent fail — polling errors are non-critical
        console.warn('Notification poll error:', err?.message || err);
      }
    }, POLL_INTERVAL_MS);

    notificationListener.current = Notifications.addNotificationReceivedListener(() => { });
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => { });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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

    if (finalStatus !== 'granted') return;
  } catch (error: any) {
    console.error('Push notification registration error:', error?.message || error);
  }
}
