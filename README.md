# MY(suru) BUS - Real-Time Bus Fleet Management System

A comprehensive bus tracking and management platform with three integrated applications:
- **Admin Dashboard** (Web) - Fleet management and monitoring
- **Driver App** (Mobile) - GPS tracking and trip management  
- **Passenger App** (Mobile) - Route search and live tracking

## Tech Stack

- **Frontend:** Next.js 14, React Native (Expo), TypeScript
- **Backend:** Supabase (PostgreSQL + Real-time)
- **Maps:** Leaflet.js, React-Native-Maps
- **Deployment:** Vercel (Web), EAS (Mobile)

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase account
- Vercel account (for admin dashboard)

## Setup Instructions

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase/schema.sql` in the SQL Editor
3. Get your Project URL and `anon` key from Settings → API

### 2. Environment Variables

Create `.env.local` in `admin-dashboard/`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `.env` in `driver-app/` and `passenger-app/`:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install Dependencies

```bash
# Admin Dashboard
cd admin-dashboard
npm install

# Driver App
cd ../driver-app
npm install

# Passenger App
cd ../passenger-app
npm install
```

## Running Locally

### Admin Dashboard
```bash
cd admin-dashboard
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Driver App
```bash
cd driver-app
npm start
```
Scan QR code with Expo Go app or run on simulator

### Passenger App
```bash
cd passenger-app
npm start
```
Scan QR code with Expo Go app or run on simulator

## Building for Production

### Admin Dashboard (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set root directory to `admin-dashboard`
4. Add environment variables
5. Deploy

### Mobile Apps (EAS Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for Android
cd driver-app
eas build --platform android

cd ../passenger-app
eas build --platform android

# Build for iOS (requires Apple Developer account)
eas build --platform ios
```

### Submit to Stores
```bash
eas submit --platform android
eas submit --platform ios
```

## Project Structure

```
MY-suru-BUS/
├── admin-dashboard/     # Next.js web app
│   ├── src/
│   │   ├── app/        # Pages
│   │   └── components/ # UI components
│   └── package.json
│
├── driver-app/         # React Native app
│   ├── app/           # Expo Router pages
│   ├── components/    # UI components
│   ├── hooks/         # Custom hooks
│   └── lib/           # Utilities
│
├── passenger-app/     # React Native app
│   ├── app/          # Expo Router pages
│   ├── components/   # UI components
│   └── lib/          # Utilities
│
└── supabase/
    └── schema.sql    # Database schema
```

## Key Features

### Admin Dashboard
- Fleet management (buses & drivers)
- Interactive route planner with map
- Schedule and trip management
- Live monitoring dashboard
- Passenger reports handling
- Announcements system

### Driver App
- Real-time GPS tracking (foreground + background)
- Automatic stop detection via geofencing
- Trip management with pause/resume
- Delay reporting
- Offline queue for location updates
- Trip history

### Passenger App
- Route search and discovery
- Live bus tracking on map
- Real-time ETA calculations
- Stop timeline with delays
- Report issues
- Dark/Light theme

## Troubleshooting

### Location Tracking Issues
- Ensure location permissions are granted
- Check background location permission (Android)
- Verify Supabase connection

### Build Errors
- Clear cache: `npm start -- --clear`
- Delete `node_modules` and reinstall
- Check EAS build logs

### Database Connection
- Verify environment variables
- Check Supabase project status
- Ensure RLS policies are configured

## Support

For issues or questions, check:
- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

## License

MIT
