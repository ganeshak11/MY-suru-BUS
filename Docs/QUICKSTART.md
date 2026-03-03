# Quick Start Guide — MY(suru) BUS

## Prerequisites
- Node.js 20+
- PostgreSQL running locally
- Expo Go app on your phone (for mobile testing)
- `eas-cli` installed globally (`npm install -g eas-cli`)

---

## 1. Backend (Local Dev)

```bash
cd backend
npm install

# .env is already configured for local PostgreSQL
# If fresh: update DATABASE_URL to point to your local DB

# Run migrations (creates all tables)
npm run migrate

# Seed sample data
npm run seed

# Create admin user
npx ts-node src/create-admin.ts

# Start dev server
npm run dev
```

**Runs at:** `http://localhost:3001`
**Health check:** `curl http://localhost:3001/health`

---

## 2. Admin Dashboard (Local Dev)

```bash
cd admin-dashboard
npm install

# .env.local should have:
# NEXT_PUBLIC_API_URL=http://localhost:3001/api

npm run dev
```

**Runs at:** `http://localhost:3000`

**Login:**
- Email: `admin@mybus.com`
- Password: `Admin@123`

---

## 3. Driver App (Expo Go)

```bash
cd driver-app
npm install
npx expo start
```

Scan QR code with Expo Go. The app auto-detects `http://localhost:3001/api`.

**Login:**
- Phone: `9876543210` (or any phone from seed data: `987654321X`)
- Password: `Driver@123`

---

## 4. Passenger App (Expo Go)

```bash
cd passenger-app
npm install
npx expo start
```

No login required — open and explore.

---

## Building APKs (EAS Preview Build)

```bash
# Driver app APK (uses Render backend automatically)
cd driver-app
eas build --profile preview --platform android

# Passenger app APK
cd passenger-app
eas build --profile preview --platform android
```

EAS builds in the cloud (~10-15 min). Download link provided on completion.

---

## Production URLs

| Service | URL |
|---|---|
| Backend API | https://mysurubus-backend.onrender.com |
| Admin Dashboard | https://my-suru-bus.vercel.app |
| Health Check | https://mysurubus-backend.onrender.com/health |

---

## Branch → Environment Mapping

| Git Branch | Backend | DB | Admin |
|---|---|---|---|
| `main` | Supabase (legacy) | Supabase | — |
| `dev` | Render (live) | Render PostgreSQL | Vercel |

---

## Common Issues

| Problem | Fix |
|---|---|
| Backend won't start | Check `DATABASE_URL` in `.env`, ensure PostgreSQL is running |
| Admin dashboard can't connect | Ensure backend is running, check `NEXT_PUBLIC_API_URL` in `.env.local` |
| Mobile app can't connect | On physical device use your computer's local IP, not `localhost` |
| Render is slow on first request | Free tier sleeps after 15min — first request takes ~30s to wake up |
| Migration fails on re-run | All migrations are idempotent — re-running is safe |

---

**Last Updated:** March 2026
