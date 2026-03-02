import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';

// In production: set EXPO_PUBLIC_API_BASE_URL in your .env
// In development: automatically uses the Metro bundler host IP (works on any machine/device)
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${devHost}:3001/api`;

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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // MOB-04: Detect token expiry / revocation.
    // On 401 or 403, clear the stored token and redirect to login.
    // This prevents the driver getting stuck in a broken authenticated state.
    if (response.status === 401 || response.status === 403) {
      await this.clearToken();
      // Navigate to login — expo-router's router is available globally in RN
      try {
        router.replace('/login');
      } catch {
        // router may not be available in background contexts (e.g. BG task)
        // In that case, the next foreground request will also 401 and retry redirect
      }
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
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

  async markStopArrival(tripId: string, stopId: string) {
    return this.request(`/trips/${tripId}/stops/${stopId}/arrive`, { method: 'POST' });
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
