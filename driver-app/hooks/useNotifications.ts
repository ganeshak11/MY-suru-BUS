/**
 * useNotifications — driver trip assignment notifications
 *
 * Polls GET /api/drivers/me/trips every 30 seconds.
 * When a NEW trip (status=Scheduled) appears, fires a local push notification.
 *
 * NOTE: expo-notifications remote push was removed from Expo Go in SDK 53+.
 * In Expo Go, polling still runs but no OS notification is shown.
 * Notifications work fully in preview/production APK builds.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from '../lib/apiClient';

// Detect if running inside Expo Go (not a standalone/dev-client build)
const IS_EXPO_GO = Constants.appOwnership === 'expo';

const POLL_INTERVAL_MS = 30_000;

export const useNotifications = (driverId: number | null) => {
  // React 19 requires useRef to have an initial value
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const permissionsRegistered = useRef(false);
  const knownTripIds = useRef<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!driverId) return;

    // Register for notifications only in real builds (not Expo Go)
    if (!IS_EXPO_GO && !permissionsRegistered.current) {
      registerForPushNotifications().then((Notifications) => {
        if (!Notifications) return;
        // SDK 54: addNotificationReceivedListener returns a Subscription with .remove()
        notificationListener.current = Notifications.addNotificationReceivedListener(() => { });
        responseListener.current = Notifications.addNotificationResponseReceivedListener(() => { });
      });
      permissionsRegistered.current = true;
    }

    // Seed the known trips set on first load so we don't notify for existing ones
    apiClient.getTrips().then((trips: any[]) => {
      trips.forEach((t) => knownTripIds.current.add(t.trip_id));
    }).catch(() => { });

    // Poll for new Scheduled trips regardless of build type
    intervalRef.current = setInterval(async () => {
      try {
        const trips: any[] = await apiClient.getTrips();
        const newTrips = trips.filter(
          (t) => t.status === 'Scheduled' && !knownTripIds.current.has(t.trip_id)
        );

        for (const trip of newTrips) {
          knownTripIds.current.add(trip.trip_id);

          // Only show local notification in real builds
          if (!IS_EXPO_GO) {
            const Notifications = await import('expo-notifications');
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
        }
      } catch (err: any) {
        console.warn('Notification poll error:', err?.message || err);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // SDK 54: subscriptions have a .remove() method
      if (notificationListener.current?.remove) notificationListener.current.remove();
      if (responseListener.current?.remove) responseListener.current.remove();
    };
  }, [driverId]);
};

async function registerForPushNotifications() {
  try {
    const Notifications = await import('expo-notifications');

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

    if (finalStatus !== 'granted') return null;

    // SDK 54: NotificationBehavior now requires shouldShowBanner + shouldShowList
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    return Notifications;
  } catch (error: any) {
    console.error('Push notification registration error:', error?.message || error);
    return null;
  }
}
