const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken() {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
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
  async login(email: string, password: string) {
    const data = await this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    if (typeof document !== 'undefined') {
      document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
    }
    return data;
  }

  async logout() {
    this.clearToken();
  }

  // Buses
  async getBuses() {
    return this.request('/buses');
  }

  async createBus(data: any) {
    return this.request('/buses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBus(busId: number, data: any) {
    return this.request(`/buses/${busId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBus(busId: number) {
    return this.request(`/buses/${busId}`, {
      method: 'DELETE',
    });
  }

  // Drivers
  async getDrivers() {
    return this.request('/drivers');
  }

  async createDriver(data: any) {
    return this.request('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDriver(driverId: number, data: any) {
    return this.request(`/drivers/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDriver(driverId: number) {
    return this.request(`/drivers/${driverId}`, {
      method: 'DELETE',
    });
  }

  // Routes
  async getRoutes() {
    return this.request('/routes');
  }

  async getRoute(routeId: number) {
    return this.request(`/routes/${routeId}`);
  }

  async createRoute(data: any) {
    return this.request('/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRoute(routeId: number, data: any) {
    return this.request(`/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRoute(routeId: number) {
    return this.request(`/routes/${routeId}`, {
      method: 'DELETE',
    });
  }

  // Stops
  async getStops() {
    return this.request('/stops');
  }

  async createStop(data: any) {
    return this.request('/stops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStop(stopId: number, data: any) {
    return this.request(`/stops/${stopId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStop(stopId: number) {
    return this.request(`/stops/${stopId}`, {
      method: 'DELETE',
    });
  }

  // Trips
  async getTrips() {
    return this.request('/trips');
  }

  async getTrip(tripId: number) {
    return this.request(`/trips/${tripId}`);
  }

  async createTrip(data: any) {
    return this.request('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTrip(tripId: number, data: any) {
    return this.request(`/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTrip(tripId: number) {
    return this.request(`/trips/${tripId}`, {
      method: 'DELETE',
    });
  }

  async getSchedules() {
    return this.request('/schedules');
  }

  async getBusesWithLocations() {
    return this.request('/buses?with_location=true');
  }

  async getActiveTrips() {
    return this.request('/trips?status=En Route');
  }

  // Announcements
  async getAnnouncements() {
    return this.request('/announcements');
  }

  async createAnnouncement(data: any) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(announcementId: number, data: any) {
    return this.request(`/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(announcementId: number) {
    return this.request(`/announcements/${announcementId}`, {
      method: 'DELETE',
    });
  }

  // Reports
  async getReports() {
    return this.request('/reports');
  }

  async updateReportStatus(reportId: number, status: string) {
    return this.request(`/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiClient = new ApiClient();
