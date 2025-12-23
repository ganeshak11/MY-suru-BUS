import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:3001/api'; // Android emulator
// For iOS simulator: http://localhost:3001/api
// For physical device: http://YOUR_IP:3001/api

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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

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

  // Trips
  async getTrips() {
    return this.request('/trips');
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
  async updateBusLocation(busId: number, latitude: number, longitude: number, speed?: number) {
    return this.request(`/buses/${busId}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, speed }),
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
