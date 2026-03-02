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
const OSRM_BASE = (process.env.OSRM_BASE_URL ?? 'http://router.project-osrm.org').replace(/\/$/, '');

// ─── Helper ───────────────────────────────────────────────────────────────────

async function osrmFetch(url: string): Promise<Response | { status: number; json: () => Promise<unknown> }> {
    const res = await fetch(url);
    return res;
}

// ─── GET /api/osm/route ───────────────────────────────────────────────────────

router.get('/route', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { start_lat, start_lon, end_lat, end_lon } = req.query as Record<string, string>;

        if (!start_lat || !start_lon || !end_lat || !end_lon) {
            res.status(400).json({
                error: 'Missing required query params: start_lat, start_lon, end_lat, end_lon',
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
            res.status(502).json({ error: 'Upstream OSRM error', detail: body });
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
        const { lat, lon } = req.query as Record<string, string>;

        if (!lat || !lon) {
            res.status(400).json({ error: 'Missing required query params: lat, lon' });
            return;
        }

        const osrmUrl = `${OSRM_BASE}/nearest/v1/driving/${lon},${lat}?number=1`;

        logger.debug({ osrmUrl }, 'OSM proxy: nearest request');
        const upstream = await fetch(osrmUrl);

        if (!upstream.ok) {
            const body = await upstream.text();
            res.status(502).json({ error: 'Upstream OSRM error', detail: body });
            return;
        }

        const data = await upstream.json();
        res.json(data);
    } catch (err) {
        next(err);
    }
});

export default router;
