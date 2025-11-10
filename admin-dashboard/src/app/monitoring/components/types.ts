// components/types.ts

export interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_updated: string | null;
  current_trip_id: number | null;
}

export interface Trip {
  trip_id: number;
  buses: { bus_no: string } | null;
  drivers: { name: string } | null;
  schedules: {
    start_time: string;
    routes: { route_name: string } | null;
  } | null;
  trip_stop_times: {
    actual_arrival_time: string | null;
    stops: { stop_name: string } | null;
  }[];
  latest_stop: string;
}