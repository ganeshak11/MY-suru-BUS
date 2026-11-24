import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';

// In production: set EXPO_PUBLIC_API_BASE_URL in your .env
// In development: Metro provides hostUri (e.g. "192.168.x.x:8081").
// On Android, 'localhost' refers to the device itself — use 10.0.2.2 to reach the host machine.
const rawHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
const devHost = Platform.OS === 'android' && rawHost === 'localhost' ? '10.0.2.2' : rawHost;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${devHost}:3001/api`;
if (__DEV__) console.log('[apiClient] API_BASE_URL resolved to:', API_BASE_URL);

class ApiClient {
  private token: string | null = null;

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('auth_token');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    if (__DEV__) console.log(`[apiClient] --> ${options.method ?? 'GET'} ${fullUrl}`);
    if (__DEV__ && options.body) {
      // Log body but mask password
      try {
        const parsed = JSON.parse(options.body as string);
        for (const k of ['password', 'current_password', 'new_password']) if (parsed[k]) parsed[k] = '***';
        console.log('[apiClient] body:', JSON.stringify(parsed));
      } catch { /* ignore */ }
    }

    let response: Response;
    try {
      response = await fetch(fullUrl, { ...options, headers });
    } catch (networkErr: any) {
      console.error('[apiClient] NETWORK ERROR:', networkErr?.message ?? networkErr);
      throw new Error(`Network error: ${networkErr?.message ?? 'Cannot reach server'}`);
    }

    // The server renews a driver's session while it's in use; keep the new token.
    const renewed = response.headers.get('X-Refreshed-Token');
    if (renewed) await this.setToken(renewed);

    if (__DEV__) console.log(`[apiClient] <-- ${response.status} ${response.statusText} from ${endpoint}`);

    // MOB-04: Detect token expiry / revocation.
    // On 401 or 403, clear the stored token and redirect to login.
    // This prevents the driver getting stuck in a broken authenticated state.
    // Only 401 means the session is gone. 403 ("not your trip") and the 401 from a
    // wrong current password on change-password must not log the driver out.
    if (response.status === 401 && endpoint !== '/drivers/me/change-password') {
      const body = await response.json().catch(() => ({}));
      console.warn('[apiClient] 401/403 — body:', JSON.stringify(body), '| endpoint:', endpoint);
      // Only redirect & clear token for authenticated requests (not the login call itself)
      if (endpoint !== '/auth/driver/login') {
        await this.clearToken();
        // In the background (location task) nobody would notice: tell the driver
        // their bus has stopped being tracked.
        if (AppState.currentState !== 'active') {
          import('expo-notifications')
            .then((N) => N.scheduleNotificationAsync({
              content: {
                title: 'Bus location sharing stopped',
                body: 'Your session ended. Open the app and sign in to keep sharing your location.',
              },
              trigger: null,
            }))
            .catch(() => undefined);
        }
        try {
          router.replace('/');
        } catch {
          // router may not be available in background contexts (e.g. BG task)
        }
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(body.error || `HTTP ${response.status}`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`[apiClient] Error response from ${endpoint}:`, JSON.stringify(error));
      throw Object.assign(new Error(error.error || `HTTP ${response.status}`), { status: response.status });
    }

    return response.json();
  }

  // Auth
  async login(phone_number: string, password: string) {
    const data = await this.request('/auth/driver/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number, password }),
    });
    await this.setToken(data.token);
    return data;
  }

  async logout() {
    await this.clearToken();
  }

  // Profile (driver self-service)
  async getProfile() {
    return this.request('/drivers/me');
  }

  async updateProfile(data: { name?: string; phone_number?: string; profile_photo_url?: string }) {
    return this.request('/drivers/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(current_password: string, new_password: string) {
    return this.request('/drivers/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  }

  // Trips — MOB-03: use driver-scoped endpoint (/drivers/me/trips) instead of
  // GET /api/trips which returns ALL trips in the DB.
  // Falls back to client-side filtered /trips only if the scoped endpoint fails.
  async getTrips() {
    return this.request('/drivers/me/trips');
  }

  async getTrip(tripId: number) {
    return this.request(`/trips/${tripId}`);
  }

  async getRouteStops(routeId: number) {
    return this.request(`/routes/${routeId}/stops`);
  }

  async updateTripStatus(tripId: number, status: string) {
    return this.request(`/trips/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async startTrip(tripId: string) {
    return this.request(`/trips/${tripId}/start`, { method: 'POST' });
  }

  async pauseTrip(tripId: string) {
    return this.request(`/trips/${tripId}/pause`, { method: 'PATCH' });
  }

  async resumeTrip(tripId: string) {
    return this.request(`/trips/${tripId}/resume`, { method: 'PATCH' });
  }

  async completeTrip(tripId: string) {
    return this.request(`/trips/${tripId}/complete`, { method: 'POST' });
  }

  async markStopArrival(tripId: string, stopId: string, actualArrivalTime?: string) {
    return this.request(`/trips/${tripId}/stops/${stopId}/arrive`, {
      method: 'POST',
      body: JSON.stringify({ actual_arrival_time: actualArrivalTime }),
    });
  }

  // Server's view of the trip: stops passed, delay and ETAs.
  async getTripProgress(tripId: number) {
    return this.request(`/trips/${tripId}/progress`);
  }

  async getTripStops(tripId: string) {
    return this.request(`/trips/${tripId}/stops`);
  }

  // Buses
  async updateBusLocation(busId: number, latitude: number, longitude: number, speed?: number, gps_timestamp?: string) {
    return this.request(`/buses/${busId}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, speed, gps_timestamp }),
    });
  }

  // Announcements
  async getAnnouncements() {
    return this.request('/announcements');
  }

  // Reports
  async submitReport(data: {
    report_type: string;
    message: string;
    trip_id?: number;
    bus_id?: number;
  }) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
