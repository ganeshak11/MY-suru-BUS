# Driver App

React Native mobile app for bus drivers to manage trips and track locations.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Update app.json with your Supabase credentials in `expo.extra`

4. Run the app:
```bash
npm start
```

## Features

- Driver authentication
- View assigned trips
- Real-time GPS tracking (foreground + background)
- Automatic stop detection via geofencing
- Offline queue for location updates
- Light/dark theme support

## Permissions Required

- Location (foreground + background)
- Foreground service (Android)

## Tech Stack

- React Native + Expo
- TypeScript
- Supabase (auth + database)
- Expo Location + Task Manager
- React Native Maps
