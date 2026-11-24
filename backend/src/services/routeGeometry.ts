// Road geometry for a route: the path along real roads through its stops.
//
// Fetched from the routing service (OSRM) once per set of stops and stored on the
// route, so maps draw real roads without calling OSRM on every view (the public
// OSRM server is a fair-use demo with no uptime guarantee). If OSRM is slow or
// down, callers get null and draw straight lines; the next request tries again.
import crypto from 'crypto';
import pool from '../database/db';
import { logger } from '../logger';

/** [lat, lon] pairs along the road. */
export type Path = [number, number][];

export interface StopPoint {
  latitude: number;
  longitude: number;
}

const OSRM_BASE = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const FETCH_TIMEOUT_MS = 10_000;

/** Identifies the stops a stored path was built from (order and position). */
export const geometryKey = (stops: StopPoint[]): string =>
  crypto
    .createHash('sha1')
    .update(stops.map((s) => `${s.latitude.toFixed(6)},${s.longitude.toFixed(6)}`).join(';'))
    .digest('hex');

/** Ask OSRM for the driving path through the stops in order. */
export const fetchRoadPath = async (stops: StopPoint[]): Promise<Path> => {
  const coords = stops.map((s) => `${s.longitude},${s.latitude}`).join(';');
  const res = await fetch(`${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'MY(suru) BUS backend (route geometry, cached per route)' },
  });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data: any = await res.json();
  const line: [number, number][] | undefined = data?.routes?.[0]?.geometry?.coordinates;
  if (data?.code !== 'Ok' || !line || line.length < 2) throw new Error(`OSRM: ${data?.code ?? 'no route'}`);
  return line.map(([lon, lat]) => [lat, lon]);
};

// One fetch per route at a time, even if many requests arrive together.
const inFlight = new Map<number, Promise<Path | null>>();

/**
 * The stored road path for a route, fetching and storing it first if the route's
 * stops changed since it was built (or it was never built). Null when there are
 * fewer than two stops or OSRM can't be reached; callers then draw straight lines.
 */
export const getRoutePath = async (
  routeId: number,
  stops: StopPoint[],
  stored: { geometry: Path | null; geometry_key: string | null }
): Promise<Path | null> => {
  if (stops.length < 2) return null;
  const key = geometryKey(stops);
  if (stored.geometry && stored.geometry_key === key) return stored.geometry;

  const running = inFlight.get(routeId);
  if (running) return running;
  const job = (async () => {
    try {
      const path = await fetchRoadPath(stops);
      await pool.query('UPDATE routes SET geometry = $1, geometry_key = $2 WHERE route_id = $3', [
        JSON.stringify(path), key, routeId,
      ]);
      logger.info({ route_id: routeId, points: path.length }, 'Stored road geometry for route');
      return path;
    } catch (err) {
      logger.warn({ err, route_id: routeId }, 'Could not fetch road geometry; drawing straight lines for now');
      return null;
    } finally {
      inFlight.delete(routeId);
    }
  })();
  inFlight.set(routeId, job);
  return job;
};

/** Like getRoutePath, but never waits longer than `ms`; the fetch carries on and is stored for next time. */
export const getRoutePathWithin = async (
  ms: number,
  ...args: Parameters<typeof getRoutePath>
): Promise<Path | null> =>
  Promise.race([getRoutePath(...args), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
