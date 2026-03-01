# Driver App — MY(suru) BUS

[![Expo](https://img.shields.io/badge/Expo-SDK51-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-TypeScript-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)

Mobile app for MY(suru) BUS drivers. Manages assigned trips, tracks live GPS in foreground and background, detects bus stops automatically via geofencing, and syncs location updates when offline.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 51) |
| Language | TypeScript |
| Navigation | Expo Router |
| Location | Expo Location + Expo Task Manager |
| Auth | JWT via custom backend API |
| Offline storage | AsyncStorage |
| Maps | Leaflet (via WebView) |

---

## Quick Start

```bash
cd driver-app
npm install

# create .env (leave blank to auto-detect dev machine IP via Expo)
touch .env

npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a`/`i` for emulator.

---

## Environment Variables

```env
# driver-app/.env
# Leave blank for development — the app auto-detects the backend
# host from Expo's Metro bundler (works on any device on the same network).
# Set this for production:
EXPO_PUBLIC_API_BASE_URL=https://your-backend.com/api
```

---

## Key Screens

| Screen | Description |
|---|---|
| Login | Phone number + password login → JWT stored |
| Home | Assigned trips list (driver-scoped, from `/api/drivers/me/trips`) |
| Active Trip | Live map, stop timeline, pause/resume/end trip |
| History | Completed trip history |
| Profile | Driver info and settings |
| Announcements | Service alerts from admin |
| Report | Submit incident/delay reports |

---

## GPS Tracking Architecture

```
Foreground (app open):
  watchPositionAsync → every 3s / 5m → REST POST /api/buses/:id/location

Background (app closed):
  Expo TaskManager BG task → every 15s / 20m → REST POST /api/buses/:id/location
  If offline → queued in AsyncStorage (max 50 entries, FIFO drop)
  On reconnect → flush queue sequentially
```

Stop detection uses client-side **haversine geofencing** (default radius: 50m). On arrival, the stop is queued via `lib/queue.ts` to `POST /api/trips/:id/stops/:stop_id/arrive`.

---

## Authentication

- Login → `POST /api/auth/driver/login` → JWT (24h) stored in AsyncStorage
- All API calls include `Authorization: Bearer <token>`
- 401/403 responses → token cleared → auto-redirect to `/login`

---

## Permissions Required

**Android:** `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`

**iOS:** `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`

---

## Project Structure

```
driver-app/
├── app/                     # Expo Router screens
│   ├── _layout.tsx
│   ├── index.tsx            # Home / trip list
│   ├── trip.tsx             # Active trip screen
│   ├── history.tsx
│   ├── profile.tsx
│   ├── announcements.tsx
│   └── report.tsx
├── components/              # Reusable UI components
├── contexts/
│   ├── SessionContext.tsx   # Auth state
│   └── ThemeContext.tsx
├── hooks/
│   └── useDriverLocation.ts # GPS + BG task + offline queue
├── lib/
│   ├── apiClient.ts         # REST client with JWT + 401 handling
│   ├── queue.ts             # Offline stop arrival queue
│   └── haversine.ts         # Distance calculation
├── app.json
└── package.json
```

---

## Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Android APK
eas build --platform android

# iOS
eas build --platform ios
```

---

## Troubleshooting

**Location not updating** — Grant foreground + background location permissions. Disable battery saver.

**Background tracking stops** — Check Android battery optimisation settings. Ensure `FOREGROUND_SERVICE` permission is granted.

**Login fails** — Check backend is running and device is on the same network as dev machine.

**Offline queue not syncing** — Check `AsyncStorage` for `offline_location_queue` key. Queue flushes automatically on next successful GPS send.

---

## Contact

- **Email:** ganeshangadi13012006@gmail.com
- **GitHub Issues:** [MY-suru-BUS](https://github.com/ganeshak11/MY-suru-BUS/issues)
