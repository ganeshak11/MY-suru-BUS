# Backend — MY(suru) BUS

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)](https://supabase.com/)

The REST API and real-time server powering the MY(suru) BUS platform. Handles authentication, fleet management, GPS tracking, and live socket broadcasts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL (Supabase hosted) |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Logging | Pino |
| Error Tracking | Sentry |
| Testing | Jest + Supertest |

---

## Quick Start

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
npm run dev            # starts nodemon on port 3001
```

---

## Environment Variables

See `.env.example` for the full list. Required:

```env
DATABASE_URL=postgresql://user:password@host:5432/postgres
DATABASE_SSL=true
JWT_SECRET=your_strong_secret
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,exp://localhost:19000
LOG_LEVEL=debug
SENTRY_DSN=                  # leave blank to disable
```

---

## API Overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/admin/login`, `POST /api/auth/driver/login` |
| Buses | `GET/POST/PUT/DELETE /api/buses`, `POST /api/buses/:id/location` |
| Drivers | `GET/POST/PUT/DELETE /api/drivers`, `GET /api/drivers/me/trips` |
| Trips | `GET/POST /api/trips`, `PATCH /api/trips/:id/status`, `POST /api/trips/:id/start` |
| Routes | `GET/POST/PUT/DELETE /api/routes`, `GET /api/routes/:id/active-trips` |
| Stops | `GET/POST/PUT/DELETE /api/stops`, `GET /api/stops/search/:query` |
| Schedules | `GET/POST/DELETE /api/schedules` |
| Announcements | `GET/POST/DELETE /api/announcements` |
| Reports | `GET/POST /api/reports` |
| Health | `GET /health` |

---

## Real-Time (Socket.io)

Passengers and drivers connect via WebSocket. GPS updates flow through REST:

```
Driver → POST /api/buses/:id/location
       → Database updated
       → io.to('bus-{id}').emit('bus-location', data)
       → Passenger MapView receives update
```

Trip events (`trip-started`, `trip-completed`) are scoped to `trip-{id}` rooms only — no global broadcasts.

---

## Database Migrations

Located in `migrations/`:

| File | Purpose |
|---|---|
| `000_clean_schema.sql` | Full fresh schema — run on a new Supabase project |
| `001_production_hardening.sql` | Constraints, indexes, GIN search indexes — run on existing project |
| `002_data_export_queries.sql` | Data migration helpers — export from old project |

---

## Testing

```bash
npm test              # run all tests
npm test -- --watch   # watch mode
```

14 tests across `auth`, `buses`, and `trips` — all mocked at the DB pool level.

---

## Project Structure

```
backend/
├── src/
│   ├── routes/         # Express routers (auth, buses, drivers, trips, routes, stops, ...)
│   ├── middleware/      # auth, errorHandler, rateLimiter, validate
│   ├── database/        # pg Pool config
│   ├── __tests__/       # Jest test suites
│   ├── app.ts           # Express + Socket.io setup
│   ├── server.ts        # Entry point, graceful shutdown, startup cleanup
│   ├── logger.ts        # Pino logger
│   └── instrument.ts    # Sentry init
├── migrations/          # SQL migration files
├── .env.example
└── package.json
```

---

## Contact

- **Email:** ganeshangadi13012006@gmail.com
- **GitHub Issues:** [MY-suru-BUS](https://github.com/ganeshak11/MY-suru-BUS/issues)
