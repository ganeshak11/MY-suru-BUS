# Quick Start Guide - MY(suru) BUS

## Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)
- npm or yarn

## 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
EOF

# Start backend server
npm run dev
```

Backend runs at: **http://localhost:3001**

Test health: `curl http://localhost:3001/health`

## 2. Admin Dashboard Setup

```bash
cd admin-dashboard

# Install dependencies (removes Supabase)
npm install

# Update .env.local (already configured)
# NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Start dashboard
npm run dev
```

Dashboard runs at: **http://localhost:3000**

**Login Credentials:**
- Email: `admin@example.com`
- Password: `admin123`

## 3. Driver App Setup

```bash
cd driver-app

# Install dependencies
npm install

# Update API URL in lib/apiClient.ts if needed
# For Android emulator: http://10.0.2.2:3001/api
# For iOS simulator: http://localhost:3001/api
# For physical device: http://YOUR_IP:3001/api

# Start app
npm start
```

**Login Credentials:**
- Phone: `+91-9876543210`
- Password: `driver123`

## 4. Passenger App Setup

```bash
cd passenger-app

# Install dependencies
npm install

# Update API URL in lib/apiClient.ts if needed

# Start app
npm start
```

## Testing the System

### 1. Test Backend
```bash
# Health check
curl http://localhost:3001/health

# Get routes (public)
curl http://localhost:3001/api/routes

# Admin login
curl -X POST http://localhost:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### 2. Test Admin Dashboard
1. Open http://localhost:3000
2. Login with admin credentials
3. Check dashboard stats
4. Try creating a bus
5. View live monitoring

### 3. Test Driver App
1. Open driver app on emulator/device
2. Login with driver credentials
3. View assigned trips
4. Start a trip
5. Check location tracking

### 4. Test Passenger App
1. Open passenger app
2. Search for routes
3. Track live buses
4. View announcements

## Common Issues

### Backend won't start
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check port 3001 is available

### Admin dashboard can't connect
- Ensure backend is running
- Check NEXT_PUBLIC_API_URL in .env.local
- Check browser console for errors

### Mobile apps can't connect
- Update API URL in apiClient.ts
- For Android emulator use: `http://10.0.2.2:3001/api`
- For physical device use your computer's IP
- Ensure backend is accessible from device

### Authentication fails
- Check JWT_SECRET is set in backend .env
- Clear localStorage/AsyncStorage
- Check backend logs for errors

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  Admin Dashboard (Next.js)              │
│  http://localhost:3000                  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┼───────────────────────┐
│  Driver App     │  Passenger App        │
│  (React Native) │  (React Native)       │
└─────────────────┴───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Backend API (Node.js + Express)        │
│  http://localhost:3001                  │
│  - REST API                             │
│  - WebSocket (Socket.io)                │
│  - JWT Authentication                   │
│  - Rate Limiting                        │
│  - Input Validation                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Database (Supabase)         │
│  - Routes, Stops, Buses                 │
│  - Drivers, Trips, Schedules            │
│  - Locations, Reports                   │
└─────────────────────────────────────────┘
```

## Features Working

✅ Admin authentication with JWT
✅ Driver authentication with JWT
✅ Bus fleet management
✅ Driver management
✅ Route and stop management
✅ Trip scheduling and management
✅ Real-time GPS tracking
✅ Live bus monitoring
✅ Route search for passengers
✅ Service announcements
✅ Passenger reports
✅ Rate limiting and security
✅ Input validation
✅ Error handling

## Next Steps

1. **Test all features** thoroughly
2. **Deploy to production**:
   - Backend: Railway, Render, or AWS
   - Admin Dashboard: Vercel
   - Mobile Apps: Expo EAS Build
3. **Set up monitoring** and logging
4. **Configure backups** for database
5. **Enable HTTPS** for production

## Support

For issues or questions:
- Check logs in terminal
- Review error messages
- Check PHASE2_COMPLETE.md for details
- Email: ganeshangadi13012006@gmail.com

---

**System Status:** ✅ Production Ready
**Last Updated:** January 2025
