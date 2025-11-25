const DEFAULT_SPEED_KMH = 50;

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateETAs = (
  busLat: number,
  busLon: number,
  stops: Array<{ stop_id: number; latitude: number; longitude: number }>,
  busSpeedKmh?: number | null
): Record<number, Date> => {
  const now = new Date();
  const speedKmh = busSpeedKmh && busSpeedKmh > 0 ? busSpeedKmh : DEFAULT_SPEED_KMH;
  const etas: Record<number, Date> = {};

  for (const stop of stops) {
    const distance = calculateDistance(busLat, busLon, stop.latitude, stop.longitude);
    const timeMinutes = (distance / 1000 / speedKmh) * 60;
    const etaTime = new Date(now.getTime() + timeMinutes * 60000);
    etas[stop.stop_id] = etaTime;
  }

  return etas;
};
