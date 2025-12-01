# Integration Testing Guide

## Prerequisites
1. Backend server running: `cd backend && npm run dev`
2. Backend accessible at: `http://localhost:3001`

---

## Passenger App Testing

### Test 1: Home Page - Route Listing
1. Open passenger app
2. Switch to "Route Number Search" tab
3. **Expected:** See list of routes (150A, 201B)
4. **Status:** ⬜ Pass / ⬜ Fail

### Test 2: Stop Suggestions
1. Go to "Route Search" tab
2. Type "City" in Source field
3. **Expected:** See "City Center" suggestion
4. **Status:** ⬜ Pass / ⬜ Fail

### Test 3: Route Search
1. Enter Source: "City Center"
2. Enter Destination: "Airport"
3. Click "Find Routes"
4. **Expected:** Navigate to search results
5. **Status:** ⬜ Pass / ⬜ Fail

---

## Driver App Testing

### Test 1: Login
1. Open driver app
2. Enter phone: `+91-9876543210`
3. Enter password: `driver123`
4. Click Login
5. **Expected:** Successfully logged in
6. **Status:** ⬜ Pass / ⬜ Fail

### Test 2: Trip Management
1. View assigned trip
2. Start trip
3. **Expected:** Trip status changes to "In Progress"
4. **Status:** ⬜ Pass / ⬜ Fail

---

## Common Issues & Solutions

### Issue: "Network request failed"
**Solution:** 
- Check backend is running
- For Android emulator, use `http://10.0.2.2:3001/api`
- For iOS simulator, use `http://localhost:3001/api`
- For physical device, use your computer's IP: `http://192.168.x.x:3001/api`

### Issue: "Cannot connect to backend"
**Solution:**
- Update API_BASE_URL in apiClient.ts
- Check firewall settings
- Ensure backend and app are on same network

### Issue: "Empty data returned"
**Solution:**
- Run `npm run reset-db` in backend
- Verify sample data exists

---

## Quick Backend URL Update

### For Android Emulator:
```typescript
// passenger-app/lib/apiClient.ts
const API_BASE_URL = 'http://10.0.2.2:3001/api';
```

### For Physical Device (same WiFi):
```typescript
// Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
const API_BASE_URL = 'http://192.168.1.XXX:3001/api';
```

---

## Next Steps After Testing

1. ✅ All tests pass → Proceed to deployment
2. ❌ Some tests fail → Debug and fix issues
3. 🔄 Need changes → Update code and retest
