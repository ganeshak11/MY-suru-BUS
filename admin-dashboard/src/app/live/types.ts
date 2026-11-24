export interface LiveStop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_sequence: number;
}

export interface LiveRoute {
  route_id: number;
  route_no: string;
  route_name: string;
  stops: LiveStop[];
  /** Road path through the stops as [lat, lon]; null until the server has it (draw straight lines). */
  path: [number, number][] | null;
}

export interface StopProgress {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
  scheduled_at: string | null;
  arrived_at: string | null;
  inferred: boolean;
  eta: string | null;
}

export interface LiveTrip {
  trip_id: number;
  status: string;
  route_id: number;
  start_time: string;
  bus: {
    bus_id: number;
    bus_no: string;
    latitude: number | null;
    longitude: number | null;
    speed_kmh: number | null;
    last_updated: string | null;
  };
  progress: {
    last_stop_seq: number;
    delay_min: number;
    stops: StopProgress[];
  } | null;
}

export interface LiveData {
  generated_at: string;
  routes: LiveRoute[];
  trips: LiveTrip[];
}

export const ROUTE_COLORS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04'];

export type Freshness = 'live' | 'stale' | 'lost' | 'paused';

export const freshness = (trip: LiveTrip, now: number): { level: Freshness; label: string } => {
  if (trip.status === 'Paused') return { level: 'paused', label: 'Paused by the driver' };
  if (!trip.bus.last_updated) return { level: 'lost', label: 'Waiting for location' };
  const mins = Math.floor((now - new Date(trip.bus.last_updated).getTime()) / 60_000);
  if (mins < 2) return { level: 'live', label: mins < 1 ? 'Live · just now' : 'Live · 1 min ago' };
  if (mins < 5) return { level: 'stale', label: `Updated ${mins} min ago` };
  return { level: 'lost', label: `No signal for ${mins} min` };
};

export const FRESH_COLOR: Record<Freshness, string> = {
  live: '#16a34a',
  stale: '#d97706',
  lost: '#dc2626',
  paused: '#64748b',
};

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
