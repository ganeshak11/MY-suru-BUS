// Example API Client for Mobile Apps
// Copy this to your mobile app's lib folder and modify as needed

const API_BASE_URL = 'http://localhost:3001/api';

class BusAPI {
  // Routes
  static async getAllRoutes() {
    const response = await fetch(`${API_BASE_URL}/routes`);
    return response.json();
  }

  static async getRoute(routeId) {
    const response = await fetch(`${API_BASE_URL}/routes/${routeId}`);
    return response.json();
  }

  static async searchRoutes(source, destination) {
    const response = await fetch(`${API_BASE_URL}/routes/search/${source}/${destination}`);
    return response.json();
  }

  // Buses
  static async getAllBuses() {
    const response = await fetch(`${API_BASE_URL}/buses`);
    return response.json();
  }

  static async getBus(busId) {
    const response = await fetch(`${API_BASE_URL}/buses/${busId}`);
    return response.json();
  }

  static async updateBusLocation(busId, latitude, longitude, speed) {
    const response = await fetch(`${API_BASE_URL}/buses/${busId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, speed })
    });
    return response.json();
  }

  // Trips
  static async getAllTrips() {
    const response = await fetch(`${API_BASE_URL}/trips`);
    return response.json();
  }

  static async getTrip(tripId) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);
    return response.json();
  }

  static async updateTripStatus(tripId, status) {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return response.json();
  }

  // Stops
  static async getAllStops() {
    const response = await fetch(`${API_BASE_URL}/stops`);
    return response.json();
  }

  static async searchStops(query) {
    const response = await fetch(`${API_BASE_URL}/stops/search/${query}`);
    return response.json();
  }
}

// WebSocket Helper
class BusSocket {
  constructor(url = 'http://localhost:3001') {
    this.socket = require('socket.io-client')(url);
  }

  joinTrip(tripId) {
    this.socket.emit('join-trip', tripId);
  }

  sendLocation(tripId, latitude, longitude, speed) {
    this.socket.emit('location-update', { tripId, latitude, longitude, speed });
  }

  onLocationUpdate(callback) {
    this.socket.on('bus-location', callback);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

module.exports = { BusAPI, BusSocket };
