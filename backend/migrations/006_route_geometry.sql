-- ============================================================
-- Migration 006 — Road geometry per route
-- The road path through a route's stops, fetched once from the routing service
-- (OSRM) and stored, so maps draw real roads without calling OSRM on every
-- view. geometry_key identifies the stops it was built from; when the stops
-- change, the key no longer matches and the path is fetched again.
-- ============================================================
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS geometry jsonb,
  ADD COLUMN IF NOT EXISTS geometry_key text;
