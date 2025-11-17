-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.announcements (
  announcement_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT announcements_pkey PRIMARY KEY (announcement_id)
);
CREATE TABLE public.buses (
  bus_id bigint NOT NULL DEFAULT nextval('buses_bus_id_seq'::regclass),
  bus_no character varying NOT NULL UNIQUE,
  current_latitude numeric,
  current_longitude numeric,
  last_updated timestamp with time zone,
  current_trip_id bigint,
  CONSTRAINT buses_pkey PRIMARY KEY (bus_id),
  CONSTRAINT fk_buses_trip FOREIGN KEY (current_trip_id) REFERENCES public.trips(trip_id)
);
CREATE TABLE public.drivers (
  driver_id bigint NOT NULL DEFAULT nextval('drivers_driver_id_seq'::regclass),
  name character varying NOT NULL,
  email character varying UNIQUE,
  phone_number character varying NOT NULL UNIQUE,
  auth_user_id uuid,
  CONSTRAINT drivers_pkey PRIMARY KEY (driver_id),
  CONSTRAINT drivers_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.passenger_reports (
  report_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  report_type character varying NOT NULL,
  message text NOT NULL,
  status character varying NOT NULL DEFAULT 'New'::character varying,
  trip_id bigint,
  bus_id bigint,
  driver_id bigint,
  route_id bigint,
  CONSTRAINT passenger_reports_pkey PRIMARY KEY (report_id),
  CONSTRAINT passenger_reports_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(trip_id),
  CONSTRAINT passenger_reports_bus_id_fkey FOREIGN KEY (bus_id) REFERENCES public.buses(bus_id),
  CONSTRAINT passenger_reports_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(driver_id),
  CONSTRAINT passenger_reports_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(route_id)
);
CREATE TABLE public.route_stops (
  route_stop_id bigint NOT NULL DEFAULT nextval('route_stops_route_stop_id_seq'::regclass),
  route_id bigint NOT NULL,
  stop_id bigint NOT NULL,
  stop_sequence integer NOT NULL,
  time_offset_from_start time without time zone,
  CONSTRAINT route_stops_pkey PRIMARY KEY (route_stop_id),
  CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id) REFERENCES public.routes(route_id),
  CONSTRAINT fk_route_stops_stop FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id)
);
CREATE TABLE public.routes (
  route_id bigint NOT NULL DEFAULT nextval('routes_route_id_seq'::regclass),
  route_name character varying NOT NULL,
  CONSTRAINT routes_pkey PRIMARY KEY (route_id)
);
CREATE TABLE public.schedules (
  schedule_id bigint NOT NULL DEFAULT nextval('schedules_schedule_id_seq'::regclass),
  route_id bigint NOT NULL,
  start_time time without time zone NOT NULL,
  CONSTRAINT schedules_pkey PRIMARY KEY (schedule_id),
  CONSTRAINT fk_schedules_route FOREIGN KEY (route_id) REFERENCES public.routes(route_id)
);
CREATE TABLE public.stops (
  stop_id bigint NOT NULL DEFAULT nextval('stops_stop_id_seq'::regclass),
  stop_name character varying NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  geofence_radius_meters integer NOT NULL DEFAULT 50,
  CONSTRAINT stops_pkey PRIMARY KEY (stop_id)
);
CREATE TABLE public.trip_stop_times (
  trip_stop_id bigint NOT NULL DEFAULT nextval('trip_stop_times_trip_stop_id_seq'::regclass),
  trip_id bigint NOT NULL,
  stop_id bigint NOT NULL,
  actual_arrival_time timestamp with time zone,
  actual_departure_time timestamp with time zone,
  predicted_arrival_time timestamp with time zone,
  CONSTRAINT trip_stop_times_pkey PRIMARY KEY (trip_stop_id),
  CONSTRAINT fk_trip_times_trip FOREIGN KEY (trip_id) REFERENCES public.trips(trip_id),
  CONSTRAINT fk_trip_times_stop FOREIGN KEY (stop_id) REFERENCES public.stops(stop_id)
);
CREATE TABLE public.trips (
  trip_id bigint NOT NULL DEFAULT nextval('trips_trip_id_seq'::regclass),
  schedule_id bigint NOT NULL,
  bus_id bigint NOT NULL,
  driver_id bigint NOT NULL,
  trip_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Scheduled'::trip_status,
  CONSTRAINT trips_pkey PRIMARY KEY (trip_id),
  CONSTRAINT fk_trips_schedule FOREIGN KEY (schedule_id) REFERENCES public.schedules(schedule_id),
  CONSTRAINT fk_trips_bus FOREIGN KEY (bus_id) REFERENCES public.buses(bus_id),
  CONSTRAINT fk_trips_driver FOREIGN KEY (driver_id) REFERENCES public.drivers(driver_id)
);