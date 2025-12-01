const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/buses', require('./routes/buses'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/stops', require('./routes/stops'));

// Socket.io for real-time tracking
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-trip', (tripId) => {
    socket.join(`trip-${tripId}`);
    console.log(`Client joined trip ${tripId}`);
  });
  
  socket.on('location-update', (data) => {
    socket.to(`trip-${data.tripId}`).emit('bus-location', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'MY(suru) BUS Backend is running!' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚌 MY(suru) BUS Backend running on port ${PORT}`);
});

module.exports = { app, io };