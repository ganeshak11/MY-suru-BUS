// API Client for Manual Backend
// This replaces Supabase calls with our custom backend

// Change this to your backend URL
// For local testing: http://localhost:3001/api
// For production: https://your-backend-url.com/api
const API_BASE_URL = 'http://10.51.226.123:3001/api';

export class BusAPI {
  // Routes
  static async getAllRoutes() {
    try {
      const response = await fetch(`${API_BASE_URL}/routes`);
      if (!response.ok) throw new Error('Failed to fetch routes');
      return await response.json();
    } catch (error) {
      console.error('Error fetching routes:', error);
      throw error;
    }
  }

  static async getRoute(routeId: string | number) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/${routeId}`);
      if (!response.ok) throw new Error('Failed to fetch route');
      return await response.json();
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  static async searchRoutes(source: string, destination: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/routes/search/${encodeURIComponent(source)}/${encodeURIComponent(destination)}`);
      if (!response.ok) throw new Error('Failed to search routes');
      return await response.json();
    } catch (error) {
      console.error('Error searching routes:', error);
      throw error;
    }
  }

  // Buses
  static async getAllBuses() {
    try {
      const response = await fetch(`${API_BASE_URL}/buses`);
      if (!response.ok) throw new Error('Failed to fetch buses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching buses:', error);
      throw error;
    }
  }

  static async getBus(busId: string | number) {
    try {
      const response = await fetch(`${API_BASE_URL}/buses/${busId}`);
      if (!response.ok) throw new Error('Failed to fetch bus');
      return await response.json();
    } catch (error) {
      console.error('Error fetching bus:', error);
      throw error;
    }
  }

  // Stops
  static async getAllStops() {
    try {
      const response = await fetch(`${API_BASE_URL}/stops`);
      if (!response.ok) throw new Error('Failed to fetch stops');
      return await response.json();
    } catch (error) {
      console.error('Error fetching stops:', error);
      throw error;
    }
  }

  static async searchStops(query: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/stops/search/${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search stops');
      return await response.json();
    } catch (error) {
      console.error('Error searching stops:', error);
      throw error;
    }
  }

  // Trips
  static async getAllTrips() {
    try {
      const response = await fetch(`${API_BASE_URL}/trips`);
      if (!response.ok) throw new Error('Failed to fetch trips');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trips:', error);
      throw error;
    }
  }

  static async getTrip(tripId: string | number) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);
      if (!response.ok) throw new Error('Failed to fetch trip');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trip:', error);
      throw error;
    }
  }

  static async getTripStops(tripId: string | number) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/stops`);
      if (!response.ok) throw new Error('Failed to fetch trip stops');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trip stops:', error);
      throw error;
    }
  }

  // Reports
  static async createReport(reportData: {
    report_type: string;
    message: string;
    trip_id?: number;
    bus_id?: number;
    driver_id?: number;
    route_id?: number;
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      if (!response.ok) throw new Error('Failed to create report');
      return await response.json();
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  static async getAllReports() {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      return await response.json();
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  // Announcements
  static async getAnnouncements() {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements`);
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return await response.json();
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }
}
