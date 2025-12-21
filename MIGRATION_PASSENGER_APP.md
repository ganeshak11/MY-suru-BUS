# Supabase to Custom Backend Migration - Passenger App

## Summary

Successfully removed all Supabase dependencies from the passenger app and migrated to custom backend API.

## Changes Made

### Files Modified

1. **passenger-app/app/index.tsx**
   - Removed `supabase` import
   - Replaced `supabase.from('routes').select()` with `BusAPI.getAllRoutes()`
   - Replaced `supabase.from('stops').select()` with `BusAPI.getAllStops()`
   - Fixed `saveRecentSearch()` function (was broken with Supabase code)
   - Added `removeRecentSearch()` function

2. **passenger-app/app/MapView.tsx**
   - Removed `supabase` import
   - Replaced route fetching with `BusAPI.getRoute()`
   - Replaced trips/buses fetching with `BusAPI.getAllTrips()` and `BusAPI.getAllBuses()`
   - Removed Supabase real-time subscription
   - Removed schedule-related UI (not yet implemented in backend)
   - Added TODO comment for WebSocket implementation

3. **passenger-app/app/report.tsx**
   - Removed `supabase` import
   - Replaced `supabase.from('trips').select()` with `BusAPI.getAllTrips()`
   - Replaced `supabase.from('passenger_reports').insert()` with `BusAPI.createReport()`
   - Fixed trip data structure to match backend response

4. **passenger-app/app/_layout.tsx**
   - Removed `supabase` import
   - Removed Supabase real-time announcement listener
   - Added TODO comment for WebSocket-based announcements

5. **passenger-app/package.json**
   - Removed `@supabase/auth-js` dependency
   - Removed `@supabase/supabase-js` dependency

6. **passenger-app/lib/supabaseClient.ts**
   - **DELETED** - No longer needed

## Backend API Usage

The passenger app now uses the `BusAPI` class from `lib/apiClient.ts`:

- `BusAPI.getAllRoutes()` - Get all routes
- `BusAPI.getRoute(id)` - Get route with stops
- `BusAPI.getAllStops()` - Get all stops
- `BusAPI.getAllTrips()` - Get all trips
- `BusAPI.getAllBuses()` - Get all buses
- `BusAPI.createReport(data)` - Submit passenger report

## Next Steps

### 1. Install Dependencies
```bash
cd passenger-app
npm install
```

### 2. Update API Base URL
Edit `passenger-app/lib/apiClient.ts` and set your backend URL:
```typescript
const API_BASE_URL = 'http://YOUR_IP:3001/api';
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
```

### 4. Test Passenger App
```bash
cd passenger-app
npm start
```

## TODO: Real-Time Features

The following features need WebSocket implementation:

1. **Live Bus Location Updates**
   - Currently: No real-time updates
   - Needed: WebSocket connection to receive bus location broadcasts
   - File: `passenger-app/app/MapView.tsx`

2. **Announcement Notifications**
   - Currently: Disabled
   - Needed: WebSocket listener for new announcements
   - File: `passenger-app/app/_layout.tsx`

### WebSocket Implementation Example

```typescript
import io from 'socket.io-client';

// In MapView.tsx
useEffect(() => {
  const socket = io('http://localhost:3001');
  
  socket.on('bus-location', (data) => {
    setBusLocations(prev => {
      const exists = prev.find(b => b.bus_id === data.bus_id);
      if (exists) {
        return prev.map(b => b.bus_id === data.bus_id ? data : b);
      }
      return prev;
    });
  });
  
  return () => socket.disconnect();
}, []);
```

## Testing Checklist

- [ ] Route listing loads correctly
- [ ] Stop suggestions work
- [ ] Route search navigates properly
- [ ] Map view displays route and stops
- [ ] Report submission works
- [ ] No Supabase errors in console
- [ ] App runs without crashes

## Known Limitations

1. **No Real-Time Updates**: Bus locations don't update live (WebSocket needed)
2. **No Schedules**: Schedule/trip times not displayed (backend doesn't support yet)
3. **No Announcements**: Real-time announcements disabled (WebSocket needed)

## Migration Status

✅ **Passenger App**: Complete  
⏳ **Driver App**: Pending  
⏳ **Admin Dashboard**: Pending

---

**Commit**: `refactor: Remove Supabase dependencies from passenger app, migrate to custom backend API`  
**Branch**: `dev`  
**Date**: January 2025
