import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
export type { AuthRequest }; // re-export for convenience

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start.');
}
export { JWT_SECRET };

/** Driver sessions last 7 days and are renewed while in use (see authenticateToken). */
export const signDriverToken = (driverId: number): string =>
  jwt.sign({ driver_id: driverId, role: 'driver' }, JWT_SECRET!, { expiresIn: '7d' });

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET!, (err, user) => {
    if (err) {
      // 401: the session itself is bad (clients should sign in again).
      // 403 is reserved for "valid session, not allowed".
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = user as AuthRequest['user'];
    // Sliding session for drivers: once a token is a day old, hand back a fresh
    // 7-day one (the app saves it). A driver who keeps using the app is never
    // signed out mid-shift; an unused session (e.g. a lost phone) still expires.
    const claims = user as jwt.JwtPayload;
    if (claims.role === 'driver' && claims.iat && Date.now() / 1000 - claims.iat > 24 * 3600) {
      res.setHeader('X-Refreshed-Token', signDriverToken(claims.driver_id));
    }
    next();
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const requireDriver = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'driver') {
    res.status(403).json({ error: 'Driver access required' });
    return;
  }
  next();
};
