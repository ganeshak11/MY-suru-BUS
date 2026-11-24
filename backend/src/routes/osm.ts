/**
 * OSM / OSRM Routing Proxy
 * ─────────────────────────────────────────────────────────────────
 * Proxies routing requests to the OSRM demo server (or a self-hosted
 * instance set via OSRM_BASE_URL env var) so that:
 *   • Mobile apps avoid CORS restrictions calling OSRM directly.
 *   • You can add caching / auth in one place without touching the apps.
 *   • Swapping to a self-hosted OSRM is a single env-var change.
 *
 * Endpoints:
 *   GET /api/osm/route?start_lat=&start_lon=&end_lat=&end_lon=
 *     → Returns OSRM route GeoJSON (overview=full, geometries=geojson)
 *
 *   GET /api/osm/nearest?lat=&lon=
 *     → Snaps a coordinate to the nearest road node (useful for routing)
 * ─────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

const router = Router();

// Default to the public OSRM demo server.
// Override with OSRM_BASE_URL in production to use a self-hosted instance.
// `||`, not `??`: render.yaml sets OSRM_BASE_URL to "" to mean "use the default".
const OSRM_BASE = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

// Parse a coordinate query param; null if missing or out of range.
const coord = (v: unknown, max: number): number | null => {
    const n = Number(v);
    return v !== undefined && v !== '' && Number.isFinite(n) && Math.abs(n) <= max ? n : null;
};

// ─── GET /api/osm/route ───────────────────────────────────────────────────────

router.get('/route', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const q = req.query as Record<string, string>;
        const start_lat = coord(q.start_lat, 90), start_lon = coord(q.start_lon, 180);
        const end_lat = coord(q.end_lat, 90), end_lon = coord(q.end_lon, 180);

        if (start_lat === null || start_lon === null || end_lat === null || end_lon === null) {
            res.status(400).json({
                error: 'start_lat, start_lon, end_lat and end_lon must be valid coordinates',
            });
            return;
        }

        const coords = `${start_lon},${start_lat};${end_lon},${end_lat}`;
        const osrmUrl = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

        logger.debug({ osrmUrl }, 'OSM proxy: route request');
        const upstream = await fetch(osrmUrl);

        if (!upstream.ok) {
            const body = await upstream.text();
            logger.warn({ status: upstream.status, body }, 'OSM proxy: upstream error');
            res.status(502).json({ error: 'Routing service error' });
            return;
        }

        const data = await upstream.json();
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// ─── GET /api/osm/nearest ─────────────────────────────────────────────────────

router.get('/nearest', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lat = coord(req.query.lat, 90), lon = coord(req.query.lon, 180);

        if (lat === null || lon === null) {
            res.status(400).json({ error: 'lat and lon must be valid coordinates' });
            return;
        }

        const osrmUrl = `${OSRM_BASE}/nearest/v1/driving/${lon},${lat}?number=1`;

        logger.debug({ osrmUrl }, 'OSM proxy: nearest request');
        const upstream = await fetch(osrmUrl);

        if (!upstream.ok) {
            const body = await upstream.text();
            res.status(502).json({ error: 'Routing service error' });
            return;
        }

        const data = await upstream.json();
        res.json(data);
    } catch (err) {
        next(err);
    }
});

export default router;
