import { server, io } from './app';
import pool from './database/db';
import { logger } from './logger';

// ─── Startup Cleanup ──────────────────────────────────────────────────────────
// Edge case: If the server crashed mid-trip, the DB still has trips marked
// 'En Route' and buses with current_trip_id set. No socket rooms exist for
// them. On the next start, mark stale trips as 'Paused' and clear bus FKs
// so the UI doesn't show phantom active buses.
const cleanupOrphanedTrips = async (): Promise<void> => {
    const client = await pool.connect();
    try {
        // Only runs if the server restarts — safe to call every time.
        // Trips that are 'En Route' but the server just started = orphaned.
        const result = await client.query(`
      UPDATE trips
      SET status = 'Paused'
      WHERE status = 'En Route'
      RETURNING trip_id, bus_id
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
                '⚠️  Server restarted mid-trip — paused orphaned En Route trips. Drivers must resume manually.'
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
