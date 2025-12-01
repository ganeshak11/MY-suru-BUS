# Migration Guide: Supabase to Manual Backend

## Overview
This guide helps you migrate from Supabase to the manual backend.

---

## Backend Setup (Already Done ✅)

- Express.js REST API
- SQLite database
- WebSocket for real-time
- JWT authentication

---

## Mobile Apps Migration

### Passenger App

**Files to Update:**

1. **Replace Supabase imports:**
```typescript
// OLD
import { supabase } from '../lib/supabaseClient';

// NEW
import { BusAPI } from '../lib/apiClient';
```

2. **Update data fetching:**
```typescript
// OLD
const { data } = await supabase.from('routes').select('*');

// NEW
const data = await BusAPI.getAllRoutes();
```

3. **Key replacements:**
- `supabase.from('routes').select()` → `BusAPI.getAllRoutes()`
- `supabase.from('buses').select()` → `BusAPI.getAllBuses()`
- `supabase.from('stops').select()` → `BusAPI.getAllStops()`

---

### Driver App

**Files to Update:**

1. **Authentication:**
```typescript
// OLD
const { data, error } = await supabase.auth.signInWithPassword({
  phone: phone_number,
  password: password
});

// NEW
const { token, driver } = await DriverAPI.login(phone_number, password);
// Store token in AsyncStorage
```

2. **Trip Management:**
```typescript
// OLD
await supabase.from('trips').update({ status: 'In Progress' }).eq('trip_id', tripId);

// NEW
await DriverAPI.startTrip(tripId, token);
```

3. **Location Updates:**
```typescript
// OLD
await supabase.from('buses').update({
  current_latitude: lat,
  current_longitude: lng
}).eq('bus_id', busId);

// NEW
await DriverAPI.updateBusLocation(busId, lat, lng, speed, token);
```

---

## Environment Configuration

### Development (Local)
```
API_BASE_URL=http://localhost:3001/api
```

### Production (After Deployment)
```
API_BASE_URL=https://your-backend-url.com/api
```

---

## Testing Checklist

### Passenger App
- [ ] Route search works
- [ ] Bus listing works
- [ ] Live tracking works
- [ ] Report submission works

### Driver App
- [ ] Login works
- [ ] Trip start/pause/resume works
- [ ] Location tracking works
- [ ] Stop marking works

---

## Rollback Plan

If issues occur, switch back to Supabase:
1. Keep old Supabase client files
2. Use environment variable to toggle backends
3. Test thoroughly before removing Supabase

---

## Next Steps

1. Test locally with backend running
2. Fix any integration issues
3. Deploy backend to cloud
4. Update API_BASE_URL in apps
5. Build and test production apps
