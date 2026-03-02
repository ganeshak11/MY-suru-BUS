-- ============================================================
-- Schema for MY(suru) BUS — Standalone PostgreSQL / Supabase
-- This is a CLEAN schema with no Supabase auth dependencies.
-- Run this on a fresh Supabase/Postgres project.
-- ============================================================

-- Custom enum for trip status (idempotent — safe to re-run)
DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('Scheduled', 'En Route', 'Paused', 'Completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- Admins
CREATE TABLE IF NOT EXISTS public.admins (
  admin_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       character varying NOT NULL,
  email      character varying NOT NULL UNIQUE,
  password_hash text,                          -- bcrypt hash, set by backend
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Stops (bus stops with geofence)
CREATE TABLE IF NOT EXISTS public.stops (
  stop_id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stop_name             character varying NOT NULL,
  latitude              numeric NOT NULL,
  longitude             numeric NOT NULL,
  geofence_radius_meters integer NOT NULL DEFAULT 50
);

-- Routes
CREATE TABLE IF NOT EXISTS public.routes (
  route_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_name character varying NOT NULL,
  route_no   character varying
);

-- Route stops (ordered stops on a route)
CREATE TABLE IF NOT EXISTS public.route_stops (
  route_stop_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id              bigint NOT NULL REFERENCES public.routes(route_id) ON DELETE CASCADE,
  stop_id               bigint NOT NULL REFERENCES public.stops(stop_id) ON DELETE CASCADE,
  stop_sequence         integer NOT NULL,
  time_offset_from_start time without time zone
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON public.route_stops(route_id);

-- Schedules (a route at a given start time)
CREATE TABLE IF NOT EXISTS public.schedules (
  schedule_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id    bigint NOT NULL REFERENCES public.routes(route_id) ON DELETE CASCADE,
  start_time  time without time zone NOT NULL
);

-- Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  driver_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              character varying NOT NULL,
  email             character varying UNIQUE,
  phone_number      character varying NOT NULL UNIQUE,
  password_hash     text,                        -- bcrypt hash, set when admin creates driver
  profile_photo_url text
);

-- Buses
CREATE TABLE IF NOT EXISTS public.buses (
  bus_id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bus_no              character varying NOT NULL UNIQUE,
  current_latitude    numeric,
  current_longitude   numeric,
  last_updated        timestamp with time zone,
  current_trip_id     bigint,
  current_speed_kmh   numeric
);

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  trip_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_id bigint NOT NULL REFERENCES public.schedules(schedule_id) ON DELETE RESTRICT,
  bus_id      bigint NOT NULL REFERENCES public.buses(bus_id) ON DELETE RESTRICT,
  driver_id   bigint NOT NULL REFERENCES public.drivers(driver_id) ON DELETE RESTRICT,
  trip_date   date NOT NULL,
  status      trip_status NOT NULL DEFAULT 'Scheduled',
  CONSTRAINT uq_trips_schedule_date UNIQUE (schedule_id, trip_date)  -- prevents duplicates
);

-- Add circular FK after trips table exists (idempotent — safe to re-run)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_buses_current_trip'
  ) THEN
    ALTER TABLE public.buses
      ADD CONSTRAINT fk_buses_current_trip FOREIGN KEY (current_trip_id)
      REFERENCES public.trips(trip_id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for high-traffic query paths (DB-04)
CREATE INDEX IF NOT EXISTS idx_trips_driver_id     ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_bus_id        ON public.trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_status        ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_schedule_date ON public.trips(schedule_id, trip_date);

-- Trip stop arrival times
CREATE TABLE IF NOT EXISTS public.trip_stop_times (
  trip_stop_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id               bigint NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  stop_id               bigint NOT NULL REFERENCES public.stops(stop_id) ON DELETE CASCADE,
  actual_arrival_time   timestamp with time zone,
  actual_departure_time timestamp with time zone,
  predicted_arrival_time timestamp with time zone,
  CONSTRAINT uq_trip_stop_times_trip_stop UNIQUE (trip_id, stop_id)  -- needed for ON CONFLICT
);

CREATE INDEX IF NOT EXISTS idx_trip_stop_times_trip_id ON public.trip_stop_times(trip_id);

-- Passenger reports
CREATE TABLE IF NOT EXISTS public.passenger_reports (
  report_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  report_type character varying NOT NULL,
  message     text NOT NULL,
  status      character varying NOT NULL DEFAULT 'New',
  trip_id     bigint REFERENCES public.trips(trip_id) ON DELETE SET NULL,
  bus_id      bigint REFERENCES public.buses(bus_id) ON DELETE SET NULL,
  driver_id   bigint REFERENCES public.drivers(driver_id) ON DELETE SET NULL,
  route_id    bigint REFERENCES public.routes(route_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_passenger_reports_bus_id    ON public.passenger_reports(bus_id);
CREATE INDEX IF NOT EXISTS idx_passenger_reports_driver_id ON public.passenger_reports(driver_id);

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  announcement_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title           character varying NOT NULL,
  message         text NOT NULL,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- Seed: create your first admin account
-- Replace with your actual email and a strong password hash.
-- Generate hash: node -e "const b=require('bcryptjs'); b.hash('YourPassword',12).then(console.log)"
-- Then paste the hash below and run:
-- ============================================================
-- INSERT INTO public.admins (name, email, password_hash)
-- VALUES ('Admin', 'admin@mybus.com', '$2a$12$..your_bcrypt_hash_here..');
