import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// HIGH-S02: Each limiter instance gets its OWN Map so auth and general limits
// don't share state and corrupt each other's counters.
export const rateLimiter = (maxRequests: number = 100, windowMs: number = 60_000) => {
  // Store is local to each factory call — isolated per limiter instance
  const store = new Map<string, RateLimitRecord>();

  // Cleanup old entries every 5 minutes for this instance's store
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) store.delete(key);
    }
  }, 300_000).unref(); // .unref() so this timer doesn't prevent Node process from exiting

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = store.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      store.set(ip, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSecs = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSecs);

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', resetSecs);
      logger.warn({ ip, path: req.path }, 'Rate limit exceeded');
      res.status(429).json({
        error: 'Too many requests — please try again later',
        retryAfterSeconds: resetSecs,
      });
      return;
    }

    next();
  };
};

// Stricter limiter for auth routes (10 req/min) — has its own isolated store
export const authRateLimiter = rateLimiter(10, 60_000);
