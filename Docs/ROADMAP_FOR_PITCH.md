# Roadmap for Pitch — MY(suru) BUS

## Current State (March 2026)
✅ Backend live on Render
✅ Admin dashboard live on Vercel (login works)
✅ Both apps use custom backend, EAS build configs ready
✅ 10 drivers, 10 buses, 15 schedules seeded in prod DB

---

## 🔴 Phase 1 — Verify the Full System Works (2-3 days)

### Admin Dashboard Testing
- [ ] All CRUD pages work (routes, stops, buses, drivers, schedules, trips)
- [ ] Monitoring page shows buses on map
- [ ] Announcements create + display

### Build APKs
```bash
cd driver-app && eas build --profile preview --platform android
cd passenger-app && eas build --profile preview --platform android
```
- [ ] Driver APK installs and logs in
- [ ] Passenger APK installs and shows routes

### End-to-End Test
- [ ] Admin creates trip → Driver app receives notification
- [ ] Driver starts trip → Passenger sees bus live
- [ ] Driver completes trip → Admin sees Completed status

### Fix Any Bugs Found
- [ ] Document all bugs found during testing
- [ ] Fix critical ones before moving forward

---

## 🟡 Phase 2 — Quick Hardening (1-2 days)

| Task | Why | Action |
|---|---|---|
| Render cold start | First request takes 30s | Add UptimeRobot free ping |
| Driver JWT 24h expiry | Could expire mid-shift | Extend to 7 days |
| Admin passwords | `Admin@123` too guessable | Change before any demo |

---

## 🟢 Phase 3 — Marketing Website (after Phase 1)

Finish the website in `/website` folder. Must have:
- [ ] Live demo link to Vercel admin dashboard
- [ ] Screenshots of all 3 apps
- [ ] Problem → Solution narrative
- [ ] Simple architecture diagram
- [ ] Contact form

---

## 🎯 Phase 4 — Pitch to Mysuru Transport Authority

Prepare:
- [ ] 1-page PDF summary of the system
- [ ] Live demo walkthrough (admin + driver + passenger all running)
- [ ] Cost comparison: custom development vs licensing commercial software
- [ ] Scalability plan (AWS when funded)

---

## After Funding
- Custom domain (`mysurubus.com`)
- Move backend to AWS (ECS + RDS)
- Redis for rate limiting + caching
- Automated tests
- OTA push notifications (instead of polling)

---

**Last Updated:** March 2026