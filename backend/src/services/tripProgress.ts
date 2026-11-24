// Server-side trip progress and ETAs.
//
// Phones only report positions; the server decides which stops a trip has passed,
// how late it is, and when it will reach each remaining stop. Both apps show this
// one answer, so the driver screen, the passenger map and the dashboard agree, and
// a passenger who opens the map mid-trip sees the real position in the trip.
import pool from '../database/db';
import { io } from '../app';
import { logger } from '../logger';

export interface StopProgress {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
  latitude: number;
  longitude: number;
  scheduled_at: string | null;
  arrived_at: string | null;
  inferred: boolean;
  /** Predicted arrival for stops not yet passed; null once passed. */
  eta: string | null;
}

export interface TripProgress {
  trip_id: number;
  bus_id: number;
  route_id: number;
  status: string;
  /** Sequence of the last stop passed; 0 before the first stop. */
  last_stop_seq: number;
  /** Minutes behind (positive) or ahead (negative) of schedule. */
  delay_min: number;
  /** When the bus last reported a position. */
  last_seen: string | null;
  stops: StopProgress[];
}

interface StopRow {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
  latitude: number;
  longitude: number;
  radius: number;
  scheduled_at: Date | null;
  arrived_at: Date | null;
  inferred: boolean | null;
}

const toRad = (d: number) => (d * Math.PI) / 180;
export const distanceM = (aLat: number, aLon: number, bLat: number, bLon: number): number => {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};

// Ordered stops of a trip's route with schedule times (India) and what's been recorded.
const loadStops = async (tripId: number): Promise<StopRow[]> => {
  const r = await pool.query(
    `SELECT st.stop_id, st.stop_name, rs.stop_sequence, st.latitude, st.longitude,
            st.geofence_radius_meters AS radius,
            ((t.trip_date + s.start_time) AT TIME ZONE 'Asia/Kolkata')
              + (COALESCE(rs.time_offset_from_start, '00:00'::time) - '00:00'::time) AS scheduled_at,
            tst.actual_arrival_time AS arrived_at, tst.inferred
     FROM trips t
     JOIN schedules s ON s.schedule_id = t.schedule_id
     JOIN route_stops rs ON rs.route_id = s.route_id
     JOIN stops st ON st.stop_id = rs.stop_id
     LEFT JOIN trip_stop_times tst ON tst.trip_id = t.trip_id AND tst.stop_id = st.stop_id
     WHERE t.trip_id = $1
     ORDER BY rs.stop_sequence`,
    [tripId]
  );
  return r.rows;
};

/** Index (into `stops`) of the last passed stop, or -1. Passed = a recorded arrival. */
const lastPassedIndex = (stops: StopRow[]): number => {
  let last = -1;
  stops.forEach((s, i) => { if (s.arrived_at) last = i; });
  return last;
};

// Distance (m) from point p to the segment a→b, and how far along it p projects
// (t: 0 at a, 1 at b). A flat local projection is plenty at city scale.
const toSegment = (
  p: { lat: number; lon: number },
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): { dist: number; t: number } => {
  const k = Math.cos(toRad(a.lat));
  const ax = 0, ay = 0;
  const bx = (b.lon - a.lon) * k, by = b.lat - a.lat;
  const px = (p.lon - a.lon) * k, py = p.lat - a.lat;
  const len2 = bx * bx + by * by;
  const tRaw = len2 === 0 ? 0 : ((px - ax) * bx + (py - ay) * by) / len2;
  const t = Math.max(0, Math.min(1, tRaw));
  const cx = bx * t, cy = by * t;
  const degDist = Math.hypot(px - cx, py - cy);
  return { dist: degDist * 111_320, t: tRaw };
};

/**
 * Decide which stops a position means the trip has now passed.
 * Pure, so it can be tested without a database.
 *  - Inside a later stop's circle → that stop is reached (measured); any stops
 *    between it and the last passed one were passed without a fix (inferred).
 *  - Otherwise, the next stop counts as passed (inferred) when the bus is clearly
 *    on the road *after* it: outside its circle (by 2× the radius), nearer to the
 *    segment next→after than to the segment leading into the next stop, and
 *    actually along that segment. Comparing segments, not distances to stops,
 *    keeps this right on bending routes and loops.
 * Returns the indexes to record, each with whether it was inferred.
 */
export const stopsPassedAt = (
  stops: Pick<StopRow, 'latitude' | 'longitude' | 'radius'>[],
  lastIdx: number,
  lat: number,
  lon: number
): { index: number; inferred: boolean }[] => {
  const d = stops.map((s) => distanceM(lat, lon, s.latitude, s.longitude));
  let reached = -1;
  for (let i = stops.length - 1; i > lastIdx; i--) {
    if (d[i] <= stops[i].radius) { reached = i; break; }
  }
  if (reached >= 0) {
    const out = [];
    for (let i = lastIdx + 1; i < reached; i++) out.push({ index: i, inferred: true });
    out.push({ index: reached, inferred: false });
    return out;
  }

  const next = lastIdx + 1;
  const after = next + 1;
  if (after >= stops.length || d[next] <= 2 * stops[next].radius) return [];
  const pt = { lat, lon };
  const at = (i: number) => ({ lat: stops[i].latitude, lon: stops[i].longitude });
  const outward = toSegment(pt, at(next), at(after));
  const inward = lastIdx >= 0 ? toSegment(pt, at(lastIdx), at(next)) : null;
  const onOutward = outward.t > 0.05 && outward.dist < 400;
  if (onOutward && (!inward || outward.dist < inward.dist)) {
    return [{ index: next, inferred: true }];
  }
  return [];
};

/** Record stops passed at this position. Returns true if anything changed. */
export const advanceTrip = async (tripId: number, lat: number, lon: number, at: Date): Promise<boolean> => {
  const stops = await loadStops(tripId);
  if (stops.length === 0) return false;
  const passed = stopsPassedAt(stops, lastPassedIndex(stops), lat, lon);
  if (passed.length === 0) return false;
  await pool.query(
    `INSERT INTO trip_stop_times (trip_id, stop_id, actual_arrival_time, inferred)
     SELECT $1, unnest($2::bigint[]), $3, unnest($4::boolean[])
     ON CONFLICT (trip_id, stop_id) DO NOTHING`,
    [tripId, passed.map((p) => stops[p.index].stop_id), at, passed.map((p) => p.inferred)]
  );
  return true;
};

/**
 * The trip's current progress and an ETA for each remaining stop:
 * ETA = scheduled time + current delay, never earlier than now. The delay is how
 * late the last passed stop was reached; before the first stop, how long past the
 * scheduled departure the bus still hasn't left.
 */
export const getTripProgress = async (tripId: number): Promise<TripProgress | null> => {
  const head = await pool.query(
    `SELECT t.trip_id, t.bus_id, t.status, s.route_id, b.last_updated
     FROM trips t JOIN schedules s ON s.schedule_id = t.schedule_id JOIN buses b ON b.bus_id = t.bus_id
     WHERE t.trip_id = $1`,
    [tripId]
  );
  const trip = head.rows[0];
  if (!trip) return null;
  const stops = await loadStops(tripId);
  const lastIdx = lastPassedIndex(stops);
  const now = Date.now();

  let delayMs = 0;
  if (lastIdx >= 0) {
    const last = stops[lastIdx];
    if (last.scheduled_at && last.arrived_at) delayMs = last.arrived_at.getTime() - last.scheduled_at.getTime();
  } else if (stops[0]?.scheduled_at && ['En Route', 'Paused'].includes(trip.status)) {
    delayMs = Math.max(0, now - stops[0].scheduled_at.getTime());
  }

  return {
    trip_id: trip.trip_id,
    bus_id: trip.bus_id,
    route_id: trip.route_id,
    status: trip.status,
    last_stop_seq: lastIdx >= 0 ? stops[lastIdx].stop_sequence : 0,
    delay_min: Math.round(delayMs / 60_000),
    last_seen: trip.last_updated ? new Date(trip.last_updated).toISOString() : null,
    stops: stops.map((s, i) => ({
      stop_id: s.stop_id,
      stop_name: s.stop_name,
      stop_sequence: s.stop_sequence,
      latitude: s.latitude,
      longitude: s.longitude,
      scheduled_at: s.scheduled_at ? s.scheduled_at.toISOString() : null,
      arrived_at: s.arrived_at ? s.arrived_at.toISOString() : null,
      inferred: !!s.inferred,
      eta: i <= lastIdx || !s.scheduled_at || ['Completed', 'Cancelled'].includes(trip.status)
        ? null
        : new Date(Math.max(now, s.scheduled_at.getTime() + delayMs)).toISOString(),
    })),
  };
};

/**
 * Send the trip's progress to everyone watching the trip, its bus or its route.
 * Best effort: a failure here is logged and never fails the request that caused it.
 */
export const publishProgress = async (tripId: number): Promise<void> => {
  try {
    const p = await getTripProgress(tripId);
    if (p) io.to([`trip-${p.trip_id}`, `bus-${p.bus_id}`, `route-${p.route_id}`]).emit('trip-progress', p);
  } catch (err) {
    logger.error({ err, trip_id: tripId }, 'Publishing trip progress failed');
  }
};
