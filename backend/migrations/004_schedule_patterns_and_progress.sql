-- ============================================================
-- Migration 004 — Daily trip generation + server-side trip progress
-- Idempotent.
-- ============================================================

-- Which days a schedule runs (ISO: 1 = Monday … 7 = Sunday) and who usually runs it.
-- The server creates each day's trips from these, so nobody has to add them by hand.
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS days_of_week smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  ADD COLUMN IF NOT EXISTS default_bus_id bigint REFERENCES public.buses(bus_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_driver_id bigint REFERENCES public.drivers(driver_id) ON DELETE SET NULL;

-- A stop the bus was seen *beyond* without a GPS fix inside its circle is still
-- passed; mark those so reports can tell measured arrivals from inferred ones.
ALTER TABLE public.trip_stop_times
  ADD COLUMN IF NOT EXISTS inferred boolean NOT NULL DEFAULT false;
