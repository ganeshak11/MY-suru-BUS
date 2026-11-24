import { server, io } from './app';
import pool from './database/db';
import { logger } from './logger';
import { startDailyTripScheduler } from './services/dailyTrips';

// ─── Startup Cleanup ──────────────────────────────────────────────────────────
// Edge case: If the server crashed mid-trip, the DB still has trips marked
// 'En Route' and buses with current_trip_id set. No socket rooms exist for
// them. On the next start, mark stale trips as 'Paused' and clear bus FKs
// so the UI doesn't show phantom active buses.
const cleanupOrphanedTrips = async (): Promise<void> => {
    const client = await pool.connect();
    try {
        // A restart alone doesn't mean a trip is dead: drivers keep sending GPS and
        // the app reconnects. Only pause trips whose bus has gone silent for a while,
        // otherwise every deploy would hide all live buses from passengers.
        const result = await client.query(`
      UPDATE trips t
      SET status = 'Paused'
      FROM buses b
      WHERE t.status = 'En Route'
        AND b.bus_id = t.bus_id
        AND (b.last_updated IS NULL OR b.last_updated < now() - interval '30 minutes')
      RETURNING t.trip_id, t.bus_id
    `);

        if (result.rows.length > 0) {
            const busIds = [...new Set(result.rows.map((r: any) => r.bus_id).filter(Boolean))];
            if (busIds.length > 0) {
                await client.query(
                    'UPDATE buses SET current_trip_id = NULL WHERE bus_id = ANY($1)',
                    [busIds]
                );
            }
            logger.warn(
                { count: result.rows.length, tripIds: result.rows.map((r: any) => r.trip_id) },
                'Paused En Route trips whose bus has sent no location for 30+ minutes'
            );
        }
    } catch (err) {
        // Non-fatal: log and continue. Don't prevent server startup.
        logger.error({ err }, 'Failed to cleanup orphaned trips on startup');
    } finally {
        client.release();
    }
};

// ─── Server Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
    logger.info(`🚌 MY(suru) BUS Backend running on port ${PORT}`);
    // Run orphan cleanup after server is listening
    await cleanupOrphanedTrips();
    // Create today's and tomorrow's trips from the schedules (and keep doing so).
    startDailyTripScheduler();
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
        logger.info('HTTP server closed');
        await pool.end();
        logger.info('DB pool closed — bye!');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
