import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
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
