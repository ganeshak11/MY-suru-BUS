// API Client for Manual Backend - Driver App
const API_BASE_URL = 'http://localhost:3001/api';

export class DriverAPI {
  // Authentication
  static async login(phone_number: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/driver/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number, password })
      });
      if (!response.ok) throw new Error('Login failed');
      return await response.json();
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  static async register(name: string, phone_number: string, email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/driver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone_number, email, password })
      });
      if (!response.ok) throw new Error('Registration failed');
      return await response.json();
    } catch (error) {
      console.error('Error registering:', error);
      throw error;
    }
  }

  // Trips
  static async getTrip(tripId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch trip');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trip:', error);
      throw error;
    }
  }

  static async startTrip(tripId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to start trip');
      return await response.json();
    } catch (error) {
      console.error('Error starting trip:', error);
      throw error;
    }
  }

  static async pauseTrip(tripId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/pause`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to pause trip');
      return await response.json();
    } catch (error) {
      console.error('Error pausing trip:', error);
      throw error;
    }
  }

  static async resumeTrip(tripId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/resume`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to resume trip');
      return await response.json();
    } catch (error) {
      console.error('Error resuming trip:', error);
      throw error;
    }
  }

  static async completeTrip(tripId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to complete trip');
      return await response.json();
    } catch (error) {
      console.error('Error completing trip:', error);
      throw error;
    }
  }

  static async markStopArrival(tripId: number, stopId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/stops/${stopId}/arrive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to mark stop arrival');
      return await response.json();
    } catch (error) {
      console.error('Error marking stop arrival:', error);
      throw error;
    }
  }

  static async getTripStops(tripId: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/trips/${tripId}/stops`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch trip stops');
      return await response.json();
    } catch (error) {
      console.error('Error fetching trip stops:', error);
      throw error;
    }
  }

  // Location Updates
  static async updateBusLocation(busId: number, latitude: number, longitude: number, speed: number, token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/buses/${busId}/location`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ latitude, longitude, speed })
      });
      if (!response.ok) throw new Error('Failed to update location');
      return await response.json();
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  // Announcements
  static async getAnnouncements(token: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return await response.json();
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  }
}
