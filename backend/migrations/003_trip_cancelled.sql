-- ============================================================
-- Migration 003 — 'Cancelled' trip status
-- The admin dashboard lets admins cancel a trip; the enum had no such value,
-- so saving failed. Idempotent; kept alone in its file because a new enum value
-- can't be used in the same transaction that adds it.
-- ============================================================
ALTER TYPE trip_status ADD VALUE IF NOT EXISTS 'Cancelled';
