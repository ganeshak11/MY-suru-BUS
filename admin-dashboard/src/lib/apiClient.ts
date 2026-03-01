const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      // Clear any old localStorage tokens
      localStorage.removeItem('auth_token');
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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async adminLogin(email: string, password: string) {
    const data = await this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    this.clearToken();
  }

  // Buses
  async getBuses() {
    return this.request('/buses');
  }

  async getBus(id: number) {
    return this.request(`/buses/${id}`);
  }

  async createBus(data: any) {
    return this.request('/buses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBus(id: number, data: any) {
    return this.request(`/buses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBus(id: number) {
    return this.request(`/buses/${id}`, { method: 'DELETE' });
  }

  // Drivers
  async getDrivers() {
    return this.request('/drivers');
  }

  async getDriver(id: number) {
    return this.request(`/drivers/${id}`);
  }

  async createDriver(data: any) {
    return this.request('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDriver(id: number, data: any) {
    return this.request(`/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDriver(id: number) {
    return this.request(`/drivers/${id}`, { method: 'DELETE' });
  }

  // Routes
  async getRoutes() {
    return this.request('/routes');
  }

  async getRoute(id: number) {
    return this.request(`/routes/${id}`);
  }

  async createRoute(data: any) {
    return this.request('/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRoute(id: number, data: any) {
    return this.request(`/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRoute(id: number) {
    return this.request(`/routes/${id}`, { method: 'DELETE' });
  }

  async getRouteStops(routeId: number) {
    return this.request(`/routes/${routeId}/stops`);
  }

  // Stops
  async getStops() {
    return this.request('/stops');
  }

  async getStop(id: number) {
    return this.request(`/stops/${id}`);
  }

  async createStop(data: any) {
    return this.request('/stops', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStop(id: number, data: any) {
    return this.request(`/stops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStop(id: number) {
    return this.request(`/stops/${id}`, { method: 'DELETE' });
  }

  async getStopRoutes(stopId: number) {
    return this.request(`/stops/${stopId}/routes`);
  }

  // Trips
  async getTrips() {
    return this.request('/trips');
  }

  async getTrip(id: number) {
    return this.request(`/trips/${id}`);
  }

  async createTrip(data: any) {
    return this.request('/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTrip(id: number, data: any) {
    return this.request(`/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTrip(id: number) {
    return this.request(`/trips/${id}`, { method: 'DELETE' });
  }

  async getTripStops(tripId: number) {
    return this.request(`/trips/${tripId}/stops`);
  }

  // Schedules
  async getSchedules() {
    return this.request('/schedules');
  }

  async createSchedule(data: any) {
    return this.request('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedule(id: number, data: any) {
    return this.request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSchedule(id: number) {
    return this.request(`/schedules/${id}`, { method: 'DELETE' });
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

  async updateAnnouncement(id: number, data: any) {
    return this.request(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(id: number) {
    return this.request(`/announcements/${id}`, { method: 'DELETE' });
  }

  // Reports
  async getReports() {
    return this.request('/reports');
  }

  async updateReportStatus(id: number, status: string) {
    return this.request(`/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiClient = new ApiClient();
