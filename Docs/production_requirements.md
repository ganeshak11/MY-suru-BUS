# Production Requirements — MY(suru) BUS

Last reviewed: March 2026 | Current deployment: Render (backend) + Vercel (admin)

---

## ✅ P0 — Must-have (Already Done)

| Requirement | Status | Notes |
|---|---|---|
| HTTPS / TLS | ✅ | Provided by Render + Vercel |
| JWT authentication | ✅ | Admin + Driver roles, bcrypt passwords |
| Parameterized SQL queries | ✅ | No string interpolation in queries |
| CORS locked to prod domain | ✅ | `https://my-suru-bus.vercel.app` |
| Rate limiting | ✅ | In-memory (sufficient for POC) |
| Graceful shutdown | ✅ | SIGTERM/SIGINT handlers |
| Health check endpoint | ✅ | `GET /health` |
| Structured logging | ✅ | Pino (JSON in prod) |
| Error tracking | ✅ | Sentry (needs `SENTRY_DSN` to activate) |
| DB connection pooling | ✅ | max:20, idle/connect timeouts |
| Idempotent migrations | ✅ | Safe to re-run on every deploy |
| .env not in git | ✅ | Gitignored in all modules |
| Admin user on prod DB | ✅ | admin@mybus.com |
| Sample data seeded | ✅ | 10 drivers, 10 buses, 15 schedules |

---

## ⚠️ P1 — Should Fix Before Real Users

### 1. Render Cold Start
**Problem:** Free tier sleeps after 15 min inactivity. First request takes ~30s.
**Fix:** Add UptimeRobot (free) to ping `https://mysurubus-backend.onrender.com/health` every 5 min.

### 2. Driver JWT Expires Mid-Shift
**Problem:** 24h expiry. A driver starting a shift at night could get logged out mid-trip.
**Fix (quick):** Extend to 7 days in `auth.ts`:
```typescript
{ expiresIn: '7d' }
```
**Fix (proper):** Implement refresh token endpoint.

### 3. Sentry DSN
**Problem:** Sentry is integrated but `SENTRY_DSN` is blank — errors are not tracked.
**Fix:** Create account at sentry.io → get DSN → add to Render env vars.

### 4. Change Admin Default Passwords
**Problem:** `Admin@123` and `Driver@123` are predictable.
**Fix:** Change before any public/authority demo.

---

## 📋 P2 — Before Scaling (Future)

| Item | Priority | Notes |
|---|---|---|
| Custom domain (`api.mysurubus.com`) | High | Needed for production credibility |
| JWT refresh tokens | High | Drivers must not get logged out mid-trip |
| Redis-backed rate limiter | Medium | In-memory rate limiter resets on restart |
| Automated tests (auth + trip flows) | Medium | No tests exist today |
| API versioning (`/api/v1/`) | Low | Future-proofs breaking changes |
| Move off Render free tier | Critical before scale | 90-day DB expiry, sleeps, 0.5 CPU |
| Server-side geofence validation | Medium | Currently client-side only |
| Arrival queue reliability (retry + backoff) | Medium | Silent failures possible offline |

---

## Scaling Expectations

| Scale | Status |
|---|---|
| 10 buses, 50 passengers | ✅ Fully functional |
| 50 buses, 200 passengers | ⚠️ Works but some queries need pagination |
| 100+ buses | 🔴 Requires Redis, paid infra, read replicas |

---

**Last Updated:** March 2026