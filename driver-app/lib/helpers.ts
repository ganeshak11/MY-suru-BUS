// lib/helpers.ts

/**
 * Calculates the distance between two GPS coordinates in meters.
 * Uses the Haversine formula.
 */
export function getDistance(
  coords1: { latitude: number; longitude: number },
  coords2: { latitude: number; longitude: number }
): number {
  try {
    if (!coords1 || !coords2 || 
        typeof coords1.latitude !== 'number' || typeof coords1.longitude !== 'number' ||
        typeof coords2.latitude !== 'number' || typeof coords2.longitude !== 'number' ||
        isNaN(coords1.latitude) || isNaN(coords1.longitude) ||
        isNaN(coords2.latitude) || isNaN(coords2.longitude)) {
      return 0;
    }

    const R = 6371e3; // Earth's radius in meters
    const lat1 = (coords1.latitude * Math.PI) / 180;
    const lat2 = (coords2.latitude * Math.PI) / 180;
    const deltaLat = ((coords2.latitude - coords1.latitude) * Math.PI) / 180;
    const deltaLon = ((coords2.longitude - coords1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return isNaN(distance) || !isFinite(distance) ? 0 : distance;
  } catch (error) {
    return 0;
  }
}