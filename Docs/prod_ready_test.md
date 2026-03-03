# Production Readiness Test Checklist — MY(suru) BUS

Run this checklist before demos or pitches to verify the full system is working.

---

## 1. Backend Health

```bash
curl https://mysurubus-backend.onrender.com/health
# Expected: {"status":"OK","message":"MY(suru) BUS Backend is running!",...}
```

- [ ] Health check returns 200 OK
- [ ] Response time under 5s (if >5s, Render was sleeping — wait and retry)

---

## 2. Admin Dashboard

Open: `https://my-suru-bus.vercel.app`

- [ ] Login page loads
- [ ] Login with `admin@mybus.com` / `Admin@123` works
- [ ] Dashboard shows correct stats (buses, trips, drivers counts)

### Routes & Stops
- [ ] Routes page loads — shows 5 routes
- [ ] Can open a route and see stops on map

### Schedules
- [ ] Schedules page loads — route names show (not `—`)
- [ ] Can add a new schedule
- [ ] Can delete a schedule

### Buses & Drivers
- [ ] Buses page loads — shows 10 buses
- [ ] Drivers page loads — shows 10 drivers
- [ ] Can create a new driver
- [ ] Can edit a driver

### Trips
- [ ] Trips page loads — shows scheduled trips for today
- [ ] Can create a new trip (select schedule, bus, driver)
- [ ] Trip status shows as `Scheduled`

### Monitoring
- [ ] Live monitoring map loads
- [ ] Buses with GPS coordinates show as markers

### Announcements
- [ ] Announcements page loads
- [ ] Can create a new announcement

---

## 3. Driver App (Preview APK)

Login with phone `9876543210`, password `Driver@123`

- [ ] App opens without crash
- [ ] Login succeeds
- [ ] Today's trips appear in the home screen
- [ ] Trip can be started
- [ ] GPS location starts updating (check admin monitoring map)
- [ ] Stop detection triggers at correct stops
- [ ] Trip can be completed
- [ ] Completed trip appears in history

---

## 4. Passenger App (Preview APK)

- [ ] App opens without crash
- [ ] Route search works (e.g. "City Stand" to "Infosys")
- [ ] Live bus markers appear on map for active trips
- [ ] Announcements tab loads

---

## 5. End-to-End Flow Test

Run this in sequence:

1. **Admin:** Create a trip → Route 1A, any bus + driver, today's date
2. **Driver:** Open driver app → see the new trip in list
3. **Driver:** Start the trip → status changes to `En Route`
4. **Admin:** Check monitoring map → bus marker moves
5. **Passenger:** Search Route 1A → see bus live on map
6. **Driver:** Complete the trip → status changes to `Completed`
7. **Admin:** Check trips page → trip shows as `Completed`

- [ ] All 7 steps pass ✅

---

## Known Acceptable Issues (Not Bugs)

- First request after inactivity takes 30s (Render free tier cold start) — add UptimeRobot
- Driver notification for new trips may take up to 30 seconds (polling interval)
- Render free DB expires 90 days from creation — upgrade before then

---

**Last Updated:** March 2026