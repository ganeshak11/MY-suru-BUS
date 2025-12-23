import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import routesRoutes from './routes/routes';
import busesRoutes from './routes/buses';
import driversRoutes from './routes/drivers';
import tripsRoutes from './routes/trips';
import stopsRoutes from './routes/stops';
import reportsRoutes from './routes/reports';
import announcementsRoutes from './routes/announcements';
import schedulesRoutes from './routes/schedules';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/buses', busesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/stops', stopsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/schedules', schedulesRoutes);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-trip', (tripId: number) => {
    socket.join(`trip-${tripId}`);
    console.log(`Client joined trip ${tripId}`);
  });
  
  socket.on('location-update', (data: { tripId: number; latitude: number; longitude: number; speed?: number }) => {
    socket.to(`trip-${data.tripId}`).emit('bus-location', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MY(suru) BUS Backend is running!' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚌 MY(suru) BUS Backend running on port ${PORT}`);
});

export { app, io };
