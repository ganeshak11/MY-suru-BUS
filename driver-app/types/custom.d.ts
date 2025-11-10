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
export type Trip = {
  trip_id: number;
  schedule_id: number;
  bus_id: number;
  driver_id: number;
  trip_date: string;
  status: 'Scheduled' | 'En Route' | 'Completed' | 'Cancelled';
  schedules: {
    route_id: number;
    start_time: string; // <-- Add this line
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