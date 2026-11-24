import './instrument'; // Sentry must be imported before anything else
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { logger } from './logger';
import authRoutes from './routes/auth';
import routesRoutes from './routes/routes';
import busesRoutes from './routes/buses';
import driversRoutes from './routes/drivers';
import tripsRoutes from './routes/trips';
import stopsRoutes from './routes/stops';
import reportsRoutes from './routes/reports';
import announcementsRoutes from './routes/announcements';
import schedulesRoutes from './routes/schedules';
import osmRoutes from './routes/osm';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiter, authRateLimiter } from './middleware/rateLimiter';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:3000,exp://localhost:19000'
).split(',').map((o) => o.trim());

export const app = express();
// Render (and most hosts) sit behind one reverse proxy. Without this, req.ip is the
// proxy's address and every client shares a single rate-limit bucket.
// Override with TRUST_PROXY_HOPS if the deployment adds more proxy layers.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Auth routes get a stricter rate limit (10 req/min)
app.use('/api/auth', authRateLimiter, authRoutes);

// General rate limit for all other routes (100 req/min)
app.use(rateLimiter(100, 60_000));

app.use('/api/routes', routesRoutes);
app.use('/api/buses', busesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/stops', stopsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/osm', osmRoutes);

// CRIT-S04: Socket authentication middleware.
// Passengers are anonymous (no token) — they can connect and join rooms to watch buses.
// Drivers must provide a valid JWT to emit location data.
// We use "optional auth": always allow the connection, but tag authenticated sockets.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        socket.data.user = decoded; // attach user payload for driver checks below
      }
      // Even if token is invalid, we allow the connection (passenger use case)
      next();
    });
  } else {
    next(); // Unauthenticated — passenger
  }
});

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id, user: socket.data.user?.role }, 'Socket client connected');

  // Rooms are named by numeric id; ignore anything else a client sends.
  const joiner = (prefix: string) => (id: unknown) => {
    if (/^[1-9]\d{0,15}$/.test(String(id))) socket.join(`${prefix}-${id}`);
  };
  socket.on('join-trip', joiner('trip'));
  socket.on('join-bus', joiner('bus'));
  // Passengers viewing a route get trip-started / trip-completed for any bus on it.
  socket.on('join-route', joiner('route'));
  socket.on('leave-route', (id: unknown) => socket.leave(`route-${id}`));

  // Note: GPS location updates come via REST (POST /api/buses/:id/location → buses.ts)
  // which emits to bus-${busId} room. The passenger app listens on that room.
  // There is no socket-based location injection path — by design, for security.

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Socket client disconnected');
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'MY(suru) BUS Backend is running!', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);
