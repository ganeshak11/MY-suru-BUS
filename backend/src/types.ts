import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    driver_id?: number;
    admin_id?: number;
    role: 'driver' | 'admin';
  };
}

export interface Driver {
  driver_id: number;
  name: string;
  phone_number: string;
  email?: string;
  password_hash?: string;
}

export interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude?: number;
  current_longitude?: number;
  current_speed_kmh?: number;
  last_updated?: Date;
}

export interface Route {
  route_id: number;
  route_name: string;
  route_no: string;
}

export interface Stop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
}

export interface Trip {
  trip_id: number;
  schedule_id: number;
  bus_id: number;
  driver_id: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Paused';
}
