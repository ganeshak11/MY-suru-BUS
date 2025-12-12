# MY(suru) BUS - Real-Time Bus Fleet Management System

A comprehensive, production-ready bus tracking and management platform with three integrated applications. MY(suru) BUS provides real-time GPS tracking, intelligent route management, and seamless passenger experience for bus transportation systems.

## System Overview

The platform consists of three interconnected applications:

- **Admin Dashboard** (Next.js Web) - Central control center for fleet operators
- **Driver App** (React Native Mobile) - GPS tracking and trip management for drivers  
- **Passenger App** (React Native Mobile) - Route discovery and live bus tracking for passengers

All components share a unified Supabase backend for real-time data synchronization and live updates.

## Key Features

### 🚌 Fleet Management
- Complete bus and driver inventory
- Real-time bus location tracking (GPS)
- Maintenance and status monitoring
- Performance analytics and reporting

### 🗺️ Route & Schedule Management
- Interactive visual route planner
- Flexible schedule management
- Geofence-based stop detection
- Automated trip generation from templates

### 📍 Live Operations
- Real-time fleet monitoring dashboard
- Active trip status tracking
- Automatic stop arrival detection via geofencing
- Live passenger notifications

### 📱 Passenger Experience
- Advanced route search and discovery
- Real-time bus location tracking on maps
- Live ETA calculations with delay indicators
- Service announcements and alerts

### 🔔 Communication
- System-wide announcements and alerts
- Push notifications to drivers and passengers
- Passenger report and feedback system
- Real-time status updates

## Tech Stack

### Frontend
- **Admin Dashboard:** Next.js 14, React, TypeScript, Tailwind CSS
- **Mobile Apps:** React Native (Expo), TypeScript, React Native Maps
- **Mapping:** Leaflet.js, React Leaflet, React Native Maps

### Backend & Infrastructure
- **Database & Auth:** Supabase (PostgreSQL + Real-time Subscriptions)
- **API:** RESTful with Supabase JS Client
- **Real-time:** Supabase Postgres Changes (websockets)
- **Storage:** PostgreSQL (via Supabase)

### DevOps & Deployment
- **Web Deployment:** Vercel
- **Mobile Builds:** Expo EAS Build
- **Version Control:** Git/GitHub
- **Database:** Managed Supabase

## Prerequisites

### Universal
- Git
- Supabase account and project
- Node.js 18+ and npm/yarn

### For Admin Dashboard
- Modern web browser

### For Mobile Development
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Vercel account (for web deployment)
- iOS: Xcode (macOS only)
- Android: Android Studio or SDK

## Quick Start Guide

### 1. Database Setup

```bash
# Create a new Supabase project
# Navigate to: https://supabase.com

# Run schema in SQL Editor
# Copy contents from schema.sql and execute
```

### 2. Get API Credentials

From your Supabase project:
1. Settings → API
2. Copy `Project URL` and `Anon Key`
3. Save for environment setup

### 3. Setup Environment Variables

#### Admin Dashboard
```bash
cd admin-dashboard

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EOF
```

#### Driver App
```bash
cd driver-app

# Create .env
cat > .env << EOF
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EOF
```

#### Passenger App
```bash
cd passenger-app

# Create .env
cat > .env << EOF
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EOF
```

### 4. Install Dependencies

```bash
# Admin Dashboard
cd admin-dashboard && npm install && cd ..

# Driver App
cd driver-app && npm install && cd ..

# Passenger App
cd passenger-app && npm install && cd ..
```

### 5. Start Development

#### Admin Dashboard
```bash
cd admin-dashboard
npm run dev
# Opens http://localhost:3000
```

#### Driver App
```bash
cd driver-app
npm start
# Scan QR code with Expo Go
```

#### Passenger App
```bash
cd passenger-app
npm start
# Scan QR code with Expo Go
```

## Component Documentation

### 📊 Admin Dashboard

**Purpose:** Central management system for transit operators

**Key Capabilities:**
- Fleet management (buses, drivers, vehicles)
- Route planning with interactive map tools
- Schedule and trip creation/management
- Live fleet monitoring with real-time tracking
- Passenger feedback and report management
- Service announcements broadcasting
- Analytics and reporting

**Tech:** Next.js 14, TypeScript, Tailwind CSS, Leaflet

**Location:** `/admin-dashboard`

👉 [Admin Dashboard README](./admin-dashboard/README.md)

### 🚗 Driver App

**Purpose:** Real-time GPS tracking and trip management for drivers

**Key Capabilities:**
- Real-time GPS location tracking (foreground + background)
- Automatic stop detection via geofencing
- Trip management with pause/resume
- Offline location queue with auto-sync
- Delay reporting and incident management
- Real-time notifications
- Trip history and statistics

**Tech:** React Native (Expo), TypeScript, Expo Location + Task Manager

**Location:** `/driver-app`

👉 [Driver App README](./driver-app/README.md)

### 🚌 Passenger App

**Purpose:** Route discovery and live bus tracking for passengers

**Key Capabilities:**
- Advanced route search by source/destination
- Real-time bus location tracking on maps
- Live ETA calculations with delays
- Stop timelines and progress indicators
- Service announcements and alerts
- Issue reporting and feedback
- Dark/Light theme support

**Tech:** React Native (Expo), TypeScript, React Native Maps

**Location:** `/passenger-app`

👉 [Passenger App README](./passenger-app/README.md)

## Project Directory Structure

```
MY-suru-BUS/
├── admin-dashboard/              # Next.js web application
│   ├── src/
│   │   ├── app/                 # Pages and routes
│   │   ├── components/          # Reusable UI components
│   │   └── lib/                 # Utilities and Supabase client
│   ├── public/                  # Static assets
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── driver-app/                   # React Native app (Expo)
│   ├── app/                     # Expo Router screens
│   ├── components/              # Reusable components
│   ├── contexts/                # React Context providers
│   ├── hooks/                   # Custom hooks
│   ├── lib/                     # Utilities
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # EAS build config
│   └── package.json
│
├── passenger-app/                # React Native app (Expo)
│   ├── app/                     # Expo Router screens
│   ├── components/              # Reusable components
│   ├── contexts/                # React Context providers
│   ├── lib/                     # Utilities
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # EAS build config
│   └── package.json
│
├── supabase/                     # Backend configuration
│   ├── schema.sql               # Database schema
│   ├── functions/               # Edge functions
│   ├── migrations/              # Database migrations
│   └── import_map.json
│
├── website/                      # Marketing website (Optional)
│   ├── index.html
│   ├── css/
│   └── js/
│
├── backend/                      # Backend services (If needed)
│   └── ...
│
├── schema.sql                    # Main database schema file
└── README.md                     # This file
```

## Database Schema

The system uses PostgreSQL (via Supabase) with the following main tables:

```
Core Tables:
├── buses                  # Bus fleet information
├── drivers                # Driver profiles and details
├── routes                 # Bus route definitions
├── route_stops            # Stops on each route
├── stops                  # Individual stop locations
├── schedules              # Route schedules (recurring)
├── trips                  # Trip instances
├── trip_stop_times        # Actual arrival records

Communication:
├── announcements          # System announcements
└── passenger_reports      # Passenger feedback
```

See [schema.sql](./schema.sql) for complete schema definition.

## Deployment Guides

### Admin Dashboard (Vercel)

```bash
# Prerequisites: GitHub repo, Vercel account

# 1. Push code to GitHub
git push origin main

# 2. Go to https://vercel.com
# 3. New Project → Select Repository
# 4. Configure:
#    - Root Directory: admin-dashboard
#    - Build Command: npm run build
# 5. Add Environment Variables:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
# 6. Deploy
```

### Driver App (EAS Build)

```bash
# Install and configure
npm install -g eas-cli
eas login

# Build for Android
cd driver-app
eas build --platform android --local

# Build for iOS (requires Apple Developer account)
eas build --platform ios --local

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

### Passenger App (EAS Build)

```bash
# Same as Driver App
cd passenger-app
eas build --platform android --local
eas build --platform ios --local
eas submit --platform android
eas submit --platform ios
```

## Authentication & Security

### User Roles
- **Admin:** Full access to dashboard management
- **Driver:** Trip tracking and reporting
- **Passenger:** Public route discovery and tracking

### Security Features
- Row-Level Security (RLS) policies in Supabase
- Environment variables for sensitive keys
- HTTPS-only in production
- Session-based authentication
- API key rotation support

### Data Privacy
- User location data encrypted in transit
- No sensitive data in logs
- Compliant with data protection regulations
- Optional anonymous tracking for passengers

## Performance Optimization

- **Frontend:** Code splitting, lazy loading, memoization
- **Maps:** Clustering, efficient zooming, tile caching
- **Location Tracking:** Batched updates, offline queuing
- **Database:** Indexed queries, real-time subscriptions
- **Caching:** Supabase caching, browser caching

## Monitoring & Logging

### Key Metrics to Monitor
- API response times
- Database query performance
- Real-time subscription health
- Location tracking accuracy
- User engagement and activity

### Logging
- Application error logs
- API request/response logs
- Database activity logs
- Location tracking logs

### Alerting
- Setup alerts in Vercel for deployment failures
- Monitor Supabase for database issues
- EAS build notifications
- Custom webhook integrations

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Verify credentials
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Check Supabase project status
# Verify RLS policies are not blocking queries
```

**Location Tracking Not Working**
```bash
# Grant location permissions in device settings
# Enable GPS/Location services
# Restart app and device
# Check background location permission
```

**Map Rendering Issues**
```bash
# Clear browser/app cache
# Verify Leaflet assets are loaded
# Check CORS policies
# Restart development server
```

**Build Failures**
```bash
# Clear dependencies
rm -rf node_modules
npm install

# Clear cache
npm run build -- --no-cache

# Check EAS logs
eas build --platform android --local --verbose
```

## Testing Checklist

### Admin Dashboard
- [ ] All CRUD operations work
- [ ] Maps render correctly
- [ ] Real-time updates work
- [ ] Authentication flow correct
- [ ] Responsive design works
- [ ] Theme toggle works

### Driver App
- [ ] GPS tracking works (foreground)
- [ ] Background tracking continues
- [ ] Geofence triggers correctly
- [ ] Offline queue works
- [ ] Notifications display
- [ ] Maps render correctly

### Passenger App
- [ ] Route search works
- [ ] Maps display buses
- [ ] Real-time tracking works
- [ ] ETA calculations correct
- [ ] Notifications work
- [ ] Theme toggle works

## Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes with descriptive commits
3. Test thoroughly on target platforms
4. Submit pull request with description
5. Code review and merge approval

### Code Standards
- TypeScript for type safety
- ESLint configuration compliance
- Meaningful variable names
- Comprehensive error handling
- Clear code comments

### Commit Message Format
```
[type]: [description]

Examples:
feat: Add geofence detection for stops
fix: Correct ETA calculation bug
docs: Update installation guide
refactor: Optimize location tracking
```

## Future Enhancements

### Planned Features
- [ ] Advanced analytics dashboard
- [ ] Machine learning route optimization
- [ ] Integration with payment systems
- [ ] Multi-language support
- [ ] Offline mode for passengers
- [ ] Voice commands for drivers
- [ ] Vehicle diagnostics integration
- [ ] Predictive maintenance alerts
- [ ] SMS notifications fallback
- [ ] Integration with smart card systems

### Scalability Improvements
- [ ] Database replication for redundancy
- [ ] CDN for static assets
- [ ] Caching layer optimization
- [ ] API rate limiting
- [ ] Load balancing
- [ ] Mobile offline-first architecture

## Useful Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Leaflet Documentation](https://leafletjs.com)
- [Vercel Documentation](https://vercel.com/docs)

### Tools & Services
- [Supabase Console](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [EAS Dashboard](https://expo.dev/eas)
- [GitHub Actions](https://github.com/features/actions)

### Community
- [Expo Community Forums](https://forums.expo.dev)
- [Supabase Community](https://discord.supabase.com)
- [React Native Community](https://react-native.community)

## Support & Contact

For questions, issues, or feature requests:

- **GitHub Issues:** [Create an issue](https://github.com/ganeshak11/MY-suru-BUS/issues)
- **Email:** ganeshangadi13012006@gmail.com
- **Documentation Wiki:** [Project Wiki](https://github.com/ganeshak11/MY-suru-BUS/wiki)
- **Bug Reports:** [Report a bug](https://github.com/ganeshak11/MY-suru-BUS/issues/new?template=bug_report.md)
- **Feature Requests:** [Request feature](https://github.com/ganeshak11/MY-suru-BUS/issues/new?template=feature_request.md)

## Changelog

### Version 1.0.0 (Current)
- ✅ Complete fleet management system
- ✅ Real-time GPS tracking for drivers
- ✅ Passenger route discovery and tracking
- ✅ Admin dashboard with live monitoring
- ✅ Geofence-based stop detection
- ✅ Offline queue for location updates
- ✅ Real-time notifications system

### Version 1.1.0 (Upcoming)
- 📋 Advanced analytics dashboard
- 📋 Payment integration
- 📋 Multi-language support
- 📋 Enhanced reporting features

---

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

