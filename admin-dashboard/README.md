# Admin Dashboard — MY(suru) BUS

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

Web dashboard for transit operators to manage the entire MY(suru) BUS fleet — buses, drivers, routes, schedules, trips, live monitoring, and passenger reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Maps | Leaflet + React Leaflet |
| Auth | JWT via custom backend API |
| API | REST (`/api/*` — custom Node.js backend) |
| State | React Hooks + Context |

---

## Quick Start

```bash
cd admin-dashboard
npm install
# create .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
npm run dev    # http://localhost:3000
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

In production, point this to your deployed backend URL.

---

## Key Pages

| Page | Route | Description |
|---|---|---|
| Login | `/login` | JWT-based admin login |
| Dashboard | `/` | Live fleet overview, active trips |
| Buses | `/buses` | Fleet management (add/edit/delete) |
| Drivers | `/drivers` | Driver profiles and assignments |
| Routes | `/routes` | Route definitions and stop sequencing |
| Route Planner | `/route-planner` | Interactive map-based route builder |
| Stops | `/stops` | Stop management with geofence config |
| Schedules | `/schedules` | Schedule creation and templates |
| Trips | `/trips` | Trip management, bulk generation |
| Monitoring | `/monitoring` | Real-time live map of all active buses |
| Announcements | `/announcements` | Broadcast service alerts |
| Reports | `/reports` | Passenger feedback and issue tracking |

---

## Authentication

Login hits `POST /api/auth/admin/login` → receives a 24-hour JWT → stored in cookies → middleware protects all routes except `/login`.

---

## Development Commands

```bash
npm run dev        # development server (hot reload)
npm run build      # production build
npm run start      # serve production build
npm run lint       # TypeScript + ESLint check
```

---

## Project Structure

```
admin-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── middleware.ts         # JWT auth guard
│   │   ├── login/page.tsx
│   │   ├── buses/page.tsx
│   │   ├── drivers/page.tsx
│   │   ├── routes/page.tsx
│   │   ├── route-planner/page.tsx
│   │   ├── stops/page.tsx
│   │   ├── schedules/page.tsx
│   │   ├── trips/page.tsx
│   │   ├── monitoring/page.tsx
│   │   ├── announcements/page.tsx
│   │   └── reports/page.tsx
│   └── components/              # Shared UI components
├── public/
│   └── leaflet/                 # Leaflet map assets
├── .env.local                   # API URL config
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Troubleshooting

**Login fails with 500** — Check backend is running and `NEXT_PUBLIC_API_URL` is correct.

**Map not loading** — Verify Leaflet assets exist in `public/leaflet/`. Clear browser cache.

**Build errors** — Run `rm -rf node_modules && npm install`, then `npm run build`.

---

## Contact

- **Email:** ganeshangadi13012006@gmail.com
- **GitHub Issues:** [MY-suru-BUS](https://github.com/ganeshak11/MY-suru-BUS/issues)
