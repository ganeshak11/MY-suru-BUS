-- ============================================================
-- Migration 001 — Production Hardening: Constraints & Indexes
-- Run this in your PostgreSQL SQL editor
-- Each statement is idempotent (safe to re-run)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- DB-01: Remove unused auth_user_id columns
-- The backend uses its own password-based auth — these are orphaned.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.admins
  DROP COLUMN IF EXISTS auth_user_id;

ALTER TABLE public.drivers
  DROP COLUMN IF EXISTS auth_user_id;

-- Also add password_hash to admins if not already present (MIN-S01 fix)
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS password_hash text;

-- ──────────────────────────────────────────────────────────────
-- DB-02: Add UNIQUE constraint on trips(schedule_id, trip_date)
-- This makes ON CONFLICT DO NOTHING in the bulk insert actually work.
-- Without this, duplicate trips can be created freely.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_trips_schedule_date'
  ) THEN
    ALTER TABLE public.trips
      ADD CONSTRAINT uq_trips_schedule_date UNIQUE (schedule_id, trip_date);
  END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────
-- DB-03: Add UNIQUE constraint on trip_stop_times(trip_id, stop_id)
-- Required for: ON CONFLICT (trip_id, stop_id) DO UPDATE in trips.ts
-- Without this, the ON CONFLICT clause has no matching constraint
-- and the insert will always INSERT (creating duplicates) or error.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_trip_stop_times_trip_stop'
  ) THEN
    ALTER TABLE public.trip_stop_times
      ADD CONSTRAINT uq_trip_stop_times_trip_stop UNIQUE (trip_id, stop_id);
  END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────
-- DB-04: Add missing indexes on high-traffic columns
-- Without these, every JOIN involving these columns is a full seq scan.
-- At 500 trips these queries take seconds. At 5000 they time out.
-- ──────────────────────────────────────────────────────────────

-- trips.driver_id — used in GET /api/drivers query (JOIN trips ON d.driver_id = t.driver_id)
CREATE INDEX IF NOT EXISTS idx_trips_driver_id
  ON public.trips(driver_id);

-- trips.bus_id — used in bus location update JOIN and active-trips query
CREATE INDEX IF NOT EXISTS idx_trips_bus_id
  ON public.trips(bus_id);

-- trips.status — used in GET /api/routes/:id/active-trips (WHERE status = 'En Route')
CREATE INDEX IF NOT EXISTS idx_trips_status
  ON public.trips(status);

-- trips combined: schedule_id + trip_date — supports the UNIQUE constraint lookup
CREATE INDEX IF NOT EXISTS idx_trips_schedule_date
  ON public.trips(schedule_id, trip_date);

-- route_stops.route_id — used in every route stops fetch (WHERE route_id = $1)
CREATE INDEX IF NOT EXISTS idx_route_stops_route_id
  ON public.route_stops(route_id);

-- passenger_reports.bus_id — used in GET /api/buses dashboard aggregation
CREATE INDEX IF NOT EXISTS idx_passenger_reports_bus_id
  ON public.passenger_reports(bus_id);

-- passenger_reports.driver_id — used in GET /api/drivers dashboard aggregation
CREATE INDEX IF NOT EXISTS idx_passenger_reports_driver_id
  ON public.passenger_reports(driver_id);

-- trip_stop_times.trip_id — used in arrival recording and stop listing
CREATE INDEX IF NOT EXISTS idx_trip_stop_times_trip_id
  ON public.trip_stop_times(trip_id);

-- ──────────────────────────────────────────────────────────────
-- DB-08: Notes on trip_status enum
-- The status column uses a Postgres enum type (trip_status).
-- If you ever need to add a new status, run:
--   ALTER TYPE trip_status ADD VALUE 'YourNewStatus';
-- Then update VALID_TRIP_STATUSES in backend/src/routes/trips.ts.
-- You cannot remove or rename enum values without a full type rebuild.
-- ──────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────
-- PERF-01: GIN trigram index for stop name / route search
-- The passenger app has a live stop/route search feature that uses:
--   WHERE stop_name ILIKE '%query%'
-- Without this, Postgres does a full sequential scan of stops on every
-- keystroke. The GIN index turns this into a fast index scan.
-- Requires the pg_trgm extension.
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_stops_stop_name_trgm
  ON public.stops USING gin (stop_name gin_trgm_ops);

-- Also index route_name for the route search endpoint
CREATE INDEX IF NOT EXISTS idx_routes_route_name_trgm
  ON public.routes USING gin (route_name gin_trgm_ops);

-- ──────────────────────────────────────────────────────────────
-- Verification: check all constraints and indexes were created
-- ──────────────────────────────────────────────────────────────
SELECT indexname, tablename FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('trips', 'route_stops', 'passenger_reports', 'trip_stop_times', 'stops', 'routes')
  ORDER BY tablename, indexname;

