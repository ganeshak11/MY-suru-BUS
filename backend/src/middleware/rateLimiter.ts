import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = {
        count: 1,
        resetTime: now + windowMs
      };
      next();
      return;
    }
    
    store[ip].count++;
    
    if (store[ip].count > maxRequests) {
      res.status(429).json({ 
        error: 'Too many requests, please try again later' 
      });
      return;
    }
    
    next();
  };
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (now > store[key].resetTime) {
      delete store[key];
    }
  });
}, 300000);
