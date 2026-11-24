// Live trips on one route: positions, the server's progress (stops passed, delay,
// ETAs) and freshness. Shared by the route and map screens so they always agree.
import { useCallback, useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';
import { BusAPI } from './apiClient';

export interface StopProgress {
  stop_id: number;
  stop_sequence: number;
  scheduled_at: string | null;
  arrived_at: string | null;
  inferred: boolean;
  eta: string | null;
}

export interface TripProgress {
  trip_id: number;
  bus_id: number;
  route_id: number;
  status: string;
  last_stop_seq: number;
  delay_min: number;
  last_seen: string | null;
  stops: StopProgress[];
}

export interface LiveTrip {
  trip_id: number;
  status: string;
  start_time: string;
  bus: {
    bus_id: number;
    bus_no: string;
    current_latitude: number;
    current_longitude: number;
    current_speed_kmh: number | null;
    last_updated: string | null;
    current_trip_id: number;
  };
  progress: TripProgress | null;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, '')
  ?? `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:3001`;

export const useLiveRoute = (routeId: number | null) => {
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(async () => {
    if (!routeId) return;
    try {
      const data: LiveTrip[] = await BusAPI.getActiveTripsForRoute(routeId);
      setTrips(data ?? []);
    } catch {
      // Keep what we have; the next event or reconnect will try again.
    } finally {
      setLoaded(true);
    }
  }, [routeId]);

  // Clock for "updated N min ago" and signal-loss detection.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!routeId) return;
    refresh();
    const socket = io(BACKEND_URL, { transports: ['websocket'], reconnection: true, reconnectionDelay: 2000 });
    socketRef.current = socket;

    // On every (re)connect: join the route room and catch up on anything missed.
    socket.on('connect', () => {
      socket.emit('join-route', routeId);
      refresh();
    });
    socket.on('bus-location', (d: { busId: number; latitude: number; longitude: number; speed?: number | null; timestamp?: string }) => {
      setTrips((prev) => prev.map((t) => t.bus.bus_id !== d.busId ? t : {
        ...t,
        bus: { ...t.bus, current_latitude: d.latitude, current_longitude: d.longitude, current_speed_kmh: d.speed ?? null, last_updated: d.timestamp ?? new Date().toISOString() },
      }));
    });
    socket.on('trip-progress', (p: TripProgress) => {
      setTrips((prev) => {
        if (!prev.some((t) => t.trip_id === p.trip_id)) {
          if (p.status === 'En Route' || p.status === 'Paused') refresh();
          return prev;
        }
        if (p.status === 'Completed' || p.status === 'Cancelled') return prev.filter((t) => t.trip_id !== p.trip_id);
        return prev.map((t) => (t.trip_id === p.trip_id ? { ...t, status: p.status, progress: p } : t));
      });
    });
    for (const e of ['trip-started', 'trip-paused', 'trip-completed']) socket.on(e, refresh);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [routeId, refresh]);

  // Bus positions are sent to per-bus rooms; follow every live bus.
  useEffect(() => {
    const s = socketRef.current;
    if (s?.connected) trips.forEach((t) => s.emit('join-bus', t.bus.bus_id));
  }, [trips]);

  return { trips, loaded, now, refresh };
};

export type Freshness = { level: 'live' | 'stale' | 'lost' | 'paused'; label: string };

/** How much to trust the bus position shown. */
export const freshness = (trip: LiveTrip, now: number): Freshness => {
  if (trip.status === 'Paused') return { level: 'paused', label: 'Paused by the driver' };
  const seen = trip.bus.last_updated ? new Date(trip.bus.last_updated).getTime() : NaN;
  if (isNaN(seen)) return { level: 'lost', label: 'Waiting for the bus location' };
  const mins = Math.floor((now - seen) / 60_000);
  if (mins < 1) return { level: 'live', label: 'Live · updated just now' };
  if (mins < 2) return { level: 'live', label: 'Live · updated 1 min ago' };
  if (mins < 5) return { level: 'stale', label: `Updated ${mins} min ago` };
  return { level: 'lost', label: `No signal for ${mins} min · position may be out of date` };
};

/** Per-stop server times and which stops are passed, keyed by stop_id. */
export const stopTimes = (p: TripProgress | null) => {
  const times: Record<number, { scheduled: string | null; eta: string | null; arrived: string | null }> = {};
  const passed = new Set<number>();
  for (const s of p?.stops ?? []) {
    times[s.stop_id] = { scheduled: s.scheduled_at, eta: s.eta, arrived: s.arrived_at };
    if (s.arrived_at || s.stop_sequence <= (p?.last_stop_seq ?? 0)) passed.add(s.stop_id);
  }
  return { times, passed };
};
