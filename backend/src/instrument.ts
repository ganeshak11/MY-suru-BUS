/**
 * Sentry must be initialized before any other imports.
 * This file is imported as the very first line of app.ts.
 * If SENTRY_DSN is not set, this is a safe no-op.
 */
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    console.log('[Sentry] Initialized');
}
