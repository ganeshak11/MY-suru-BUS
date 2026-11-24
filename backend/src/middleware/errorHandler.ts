import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../logger';

// Postgres errors that are the client's fault, mapped to a status and a message
// that doesn't leak SQL details.
const PG_CLIENT_ERRORS: Record<string, [number, string]> = {
  '23503': [409, 'This record is still referenced by other records, or refers to one that does not exist'],
  '23505': [409, 'A record with these details already exists'],
  '22P02': [400, 'Invalid value in request'],
  '22007': [400, 'Invalid date or time'],
  '22008': [400, 'Date or time out of range'],
  '23502': [400, 'A required field is missing'],
};

export const errorHandler = (err: Error & { code?: string }, req: Request, res: Response, _next: NextFunction): void => {
  const known = err.code ? PG_CLIENT_ERRORS[err.code] : undefined;
  if (known) {
    logger.warn({ code: err.code, method: req.method, url: req.url, detail: err.message }, 'Rejected request');
    res.status(known[0]).json({ error: known[1] });
    return;
  }

  logger.error(
    { err, method: req.method, url: req.url },
    'Unhandled error'
  );

  // Capture to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.debug({ method: req.method, url: req.url }, 'Route not found');
  res.status(404).json({ error: 'Route not found' });
};
