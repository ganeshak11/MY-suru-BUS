// types/custom.d.ts

// Based on your 'drivers' table schema
export type Driver = {
  driver_id: number;
  name: string;
  email: string | null;
  phone_number: string;
  auth_user_id: string;
};

// Based on your 'trips' table schema
// The backend returns a flat JOIN row, not nested objects.
export type Trip = {
  trip_id: number;
  schedule_id: number;
  bus_id: number;
  driver_id: number;
  trip_date: string;
  status: 'Scheduled' | 'En Route' | 'Completed' | 'Paused' | 'Cancelled';
  // Flat columns from JOINs (returned by GET /api/trips/:id)
  start_time: string;       // from schedules
  route_id: number;         // from routes via schedules  
  route_name: string;       // from routes
  bus_no?: string;          // from buses
  driver_name?: string;     // from drivers
  // Legacy nested shape (kept for optional-chaining safety)
  schedule?: {
    route_id: number;
    start_time: string;
    routes?: { route_name: string };
  };
  buses?: {
    bus_id: number;
    bus_no: string;
  };
};

// Based on your 'route_stops' table schema
export type RouteStopWithDetails = {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_sequence: number;
  status: 'Pending' | 'Completed';
};