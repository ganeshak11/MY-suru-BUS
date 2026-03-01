# Passenger App — MY(suru) BUS

[![Expo](https://img.shields.io/badge/Expo-SDK51-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-TypeScript-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)

Mobile app for MY(suru) BUS passengers. Search routes by source and destination, view live bus locations on a map, track stops in real-time, and stay updated with service announcements.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 51) |
| Language | TypeScript |
| Navigation | Expo Router |
| Real-time | Socket.io-client |
| Maps | Leaflet (via WebView) |
| API | REST (`/api/*` — custom Node.js backend) |
| State | React Context + Hooks |

---

## Quick Start

```bash
cd passenger-app
npm install

# Leave blank for development — auto-detects backend host
touch .env

npx expo start
```

Scan with **Expo Go** on your phone, or press `a`/`i` for emulator.

---

## Environment Variables

```env
# passenger-app/.env
# Leave blank for development (auto-detects via Expo Constants).
# Set for production:
EXPO_PUBLIC_API_BASE_URL=https://your-backend.com/api
```

---

## Key Screens

| Screen | Description |
|---|---|
| Home | Route search (source → destination), recent searches |
| Search Results | Matching routes with schedule info |
| Map View | Live bus tracking via Socket.io, stop timeline, ETA |
| Route Details | All stops, schedule, active trip info |
| Report | Submit passenger feedback or delay reports |
| Announcements | Service alerts from admin |
| Support | Help and FAQ |

---

## Live Bus Tracking Architecture

```
1. MapView fetches active trips: GET /api/routes/:id/active-trips
   → Returns { trip_id, bus: { bus_id, bus_no, lat, lon, speed } }

2. Socket connects → emits join-bus(bus_id) for each active bus

3. Backend broadcasts: io.to('bus-{id}').emit('bus-location', data)
   → MapView updates pin position in real time

4. On reconnect / data load → automatically rejoins all bus rooms
```

No login required — passengers connect anonymously.

---

## Route Search

Search calls `GET /api/routes/search/:source/:destination` — backed by a **GIN trigram index** on `stops.stop_name` for fast `ILIKE` matching.

---

## Project Structure

```
passenger-app/
├── app/                        # Expo Router screens
│   ├── _layout.tsx
│   ├── index.tsx               # Home / search
│   ├── MapView.tsx             # Live bus map + socket
│   ├── SearchResults.tsx       # Route search results
│   ├── RouteDetails/
│   │   └── [route_id].tsx      # Route detail view
│   ├── report.tsx
│   ├── about.tsx
│   └── support.tsx
├── components/
│   ├── RouteLeafletMap.tsx     # Map display
│   ├── StopsTimeline.tsx       # Stop progress list
│   └── Header.tsx
├── contexts/
│   └── ThemeContext.tsx        # Light/Dark theme
├── lib/
│   ├── apiClient.ts            # REST + search API calls
│   ├── etaCalculator.ts        # ETA logic
│   └── haversine.ts            # Distance util
├── app.json
└── package.json
```

---

## Build for Production

```bash
npm install -g eas-cli
eas login

eas build --platform android
eas build --platform ios
```

---

## Troubleshooting

**Map shows no buses** — Ensure the backend is running and there are active `En Route` trips with GPS data.

**Socket not connecting** — Check `EXPO_PUBLIC_API_BASE_URL` / device is on the same network as the dev backend.

**Search returns no results** — Verify backend DB has stops loaded and `pg_trgm` GIN index applied (`001_production_hardening.sql`).

**Build cache issues** — `rm -rf node_modules && npm install && npx expo start --clear`

---

## Contact

- **Email:** ganeshangadi13012006@gmail.com
- **GitHub Issues:** [MY-suru-BUS](https://github.com/ganeshak11/MY-suru-BUS/issues)
