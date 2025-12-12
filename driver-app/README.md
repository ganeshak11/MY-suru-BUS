# Driver App - MY(suru) BUS

A React Native mobile application for bus drivers to manage assigned trips, track locations in real-time, and report issues.

## Overview

The Driver App enables bus drivers to:
- View assigned trips and schedules
- Track real-time GPS location (foreground + background)
- Detect stops automatically via geofencing
- Manage trip status and delays
- Report incidents and delays
- Access offline functionality
- Customize app theme

## Features

### 🚌 Trip Management
- View assigned trips with details
- Real-time trip status tracking
- Automatic trip assignments via notifications
- Trip history and statistics
- Pause/resume trip tracking

### 📍 Location Tracking
- **Foreground Tracking:** Active location updates while app is open
- **Background Tracking:** Continuous location tracking even when app is closed
- **Geofencing:** Automatic stop detection within defined radius
- **Offline Queue:** Location updates queued when offline, synced when reconnected
- **Battery Optimization:** Efficient location polling to minimize battery drain

### 🛑 Stop Detection
- Automatic arrival detection at each stop
- Geofence radius customization (default 50m)
- Sequential stop tracking
- Manual stop confirmation capability
- Arrival time logging

### ⚠️ Incident Reporting
- Report delays with reasons
- Submit incident reports
- Real-time notification system
- Report history tracking

### 🎨 User Experience
- Light/Dark theme support
- Responsive mobile interface
- Offline-first architecture
- Smooth transitions and animations
- Error handling and recovery

## Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **State Management:** React Context API + Hooks
- **Location Services:** Expo Location, Expo Task Manager
- **Database & Auth:** Supabase
- **Maps:** React Native Maps, Leaflet.js
- **Local Storage:** AsyncStorage
- **Notifications:** Expo Notifications
- **Build Tool:** Expo EAS Build
- **Styling:** React Native StyleSheet

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Supabase account with project setup
- Android: Android Studio or SDK
- iOS: Xcode (macOS only)
- GPS-enabled test device or emulator

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd driver-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project:
- Go to Settings → API → Project URL and Anon Key

### 4. Configure app.json
Ensure the following Expo configuration is present:
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-location",
      "expo-notifications",
      "expo-task-manager"
    ],
    "android": {
      "permissions": [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.FOREGROUND_SERVICE"
      ]
    }
  }
}
```

## Development

### Start Development Server
```bash
npm start
```

Options:
- **Scan QR Code:** Use Expo Go app
- **iOS Simulator:** Press `i`
- **Android Emulator:** Press `a`
- **Custom Build:** Use EAS

### Development Features
```bash
# Clear cache
npm start -- --clear

# Run with logging
npm start -- --verbose

# Run on specific platform
npm start -- --ios
npm start -- --android
```

### Testing Location Tracking
1. Enable location services on device
2. Grant location permissions (foreground + background)
3. Open app and navigate to trip screen
4. Verify GPS indicator shows active tracking
5. Check `LocationDebug` component for coordinates
6. Move device to test geofencing

## Building for Production

### Android Build

```bash
# Development APK (unsigned)
eas build --platform android --local

# Release APK (signed)
eas build --platform android --local --release
```

### iOS Build
```bash
# Development build
eas build --platform ios --local

# Release build
eas build --platform ios --local --release
```

### Pre-Build Checklist
- [ ] All console logs removed
- [ ] Environment variables set
- [ ] App version updated in `app.json`
- [ ] Build configuration validated: `node validate-build.js`
- [ ] All screens tested on real devices
- [ ] Location tracking tested
- [ ] Background task tested
- [ ] Notifications tested
- [ ] Offline functionality tested
- [ ] Theme switching tested
- [ ] Error handling verified

## Project Structure

```
driver-app/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Home/dashboard
│   ├── home.tsx                 # Main screen
│   ├── trip.tsx                 # Active trip management
│   ├── history.tsx              # Trip history
│   ├── profile.tsx              # Driver profile
│   ├── announcements.tsx        # Service announcements
│   └── report.tsx               # Report interface
│
├── components/                   # Reusable components
│   ├── Card.tsx                 # Card container
│   ├── LeafletMap.tsx           # Interactive map
│   ├── LiveMap.tsx              # Live trip map
│   ├── LocationDebug.tsx        # Debug location display
│   ├── StopsTimeline.tsx        # Stop list timeline
│   ├── ThemeToggleButton.tsx    # Theme switcher
│   ├── StyledButton.tsx         # Button components
│   ├── ErrorBoundary.tsx        # Error handling
│   └── icons/                   # Custom icons
│
├── contexts/                     # React Context
│   ├── SessionContext.tsx       # Session management
│   └── ThemeContext.tsx         # Theme provider
│
├── hooks/                        # Custom hooks
│   ├── useDriverLocation.ts     # Location tracking logic
│   ├── useNotifications.ts      # Notification handler
│   └── useDeviceOrientation.ts  # Orientation detection
│
├── lib/                          # Utilities
│   ├── supabaseClient.ts        # Supabase initialization
│   ├── helpers.ts               # Helper functions
│   ├── queue.ts                 # Offline queue management
│   └── types/
│       └── custom.d.ts          # Type definitions
│
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── eas.json                      # EAS build config
```

## Key Screens

### Home/Dashboard
- Welcome message
- Trip summary
- Quick actions
- Status indicator

### Trip Management
- Active trip details
- Live map with stops
- Stop timeline
- Trip controls (pause, resume, end)
- Delay reporting
- ETA display

### Trip History
- Completed trips list
- Trip statistics
- Search and filter
- Trip details view

### Profile
- Driver information
- Contact details
- Settings
- Theme preference

### Announcements
- Service updates
- Route changes
- Emergency alerts
- Real-time notifications

## Location Tracking System

### Foreground Tracking
- Active when app is in foreground
- High accuracy GPS
- 3-second update interval
- Distance threshold: 5 meters

### Background Tracking
- Continues when app is closed
- Uses Expo Task Manager
- 15-second update interval
- 20-meter distance threshold
- Battery-efficient polling

### Geofencing
- Circular geofences around stops
- Configurable radius (default 50m)
- Automatic arrival detection
- Sequential stop processing

### Offline Queue
```
Location Update Flow:
1. Get location
2. Try send to Supabase
3. If failed → Queue locally
4. Retry when network available
5. Sync oldest update first
```

## Notifications System

### Types
- **Trip Assignment:** New trip assigned
- **Stop Reached:** Automatic at geofence
- **System Alerts:** Important updates

### Configuration
```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

## Database Schema Integration

The app connects to Supabase tables:
- `drivers` - Driver accounts
- `trips` - Trip instances
- `buses` - Vehicle information
- `routes` - Route definitions
- `route_stops` - Stop information
- `schedules` - Trip schedules
- `trip_stop_times` - Arrival records
- `announcements` - Service alerts
- `passenger_reports` - Issue reports

## API Integration

### Real-Time Features
- Real-time trip assignments (Postgres changes)
- Announcement subscriptions
- Status updates

### Authentication
- Phone/Email verification (future)
- Driver verification by admin

## Permissions Required

### Android
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />
```

### iOS
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track your bus position</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need background location access for trip tracking</string>

<key>NSMotionUsageDescription</key>
<string>Motion data helps optimize location tracking</string>
```

## Troubleshooting

### Location Not Updating

**Issue:** GPS coordinates not changing

**Solutions:**
1. Check location permissions in device settings
2. Enable location services globally
3. Grant foreground + background permissions
4. Restart app and device
5. Check `LocationDebug` component for coordinates

### Background Tracking Not Working

**Issue:** Location stops updating when app is closed

**Solutions:**
1. Ensure background location permission granted
2. Check Supabase connection
3. Verify battery saver not limiting background tasks
4. Check AsyncStorage for data
5. Review EAS build logs

### Map Not Displaying

**Issue:** Map shows blank or errors

**Solutions:**
1. Verify internet connectivity
2. Check Supabase credentials
3. Clear app cache
4. Restart location services
5. Check for JavaScript errors in console

### Geofencing Not Triggering

**Issue:** Stops not detected even near geofence

**Solutions:**
1. Verify geofence radius is appropriate (50m default)
2. Check stop coordinates accuracy
3. Ensure location accuracy is high
4. Test with wider radius first
5. Check AsyncStorage for stops cache

### Build Failures

```bash
# Clear cache
rm -rf node_modules .expo
npm install

# Validate build
node validate-build.js

# Check logs
eas build --platform android --local --verbose
```

### Performance Issues

1. **Reduce map clustering zoom level**
2. **Increase location update interval**
3. **Clear AsyncStorage cache**
4. **Disable debug components in production**
5. **Profile with React DevTools**

## Performance Optimization

- Efficient location batching
- Memoized components to prevent re-renders
- AsyncStorage for offline capability
- Background task optimization
- Image compression
- Code splitting via Expo Router

## Testing Checklist

- [ ] GPS tracking works in foreground
- [ ] Background tracking continues when minimized
- [ ] Geofence triggers near stops
- [ ] Offline queue captures updates
- [ ] Offline updates sync when online
- [ ] Notifications display correctly
- [ ] Theme switching works
- [ ] All screens load properly
- [ ] Error messages display
- [ ] Network errors handled gracefully

## Security Considerations

- API keys in `.env` (never commit)
- Supabase RLS policies enforced
- HTTPS-only connections
- Location data encrypted in transit
- No sensitive data in logs
- AsyncStorage encryption (if available)

## Future Enhancements

- [ ] Multi-trip management
- [ ] Real-time route updates
- [ ] Advanced analytics dashboard
- [ ] Biometric authentication
- [ ] Voice commands for trip management
- [ ] Integration with vehicle diagnostics
- [ ] Predictive maintenance alerts
- [ ] Multi-language support

## Support & Documentation

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Location API](https://docs.expo.dev/versions/latest/sdk/location)
- [Expo Task Manager](https://docs.expo.dev/versions/latest/sdk/task-manager)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Submit pull request
5. Await review and merge

## Contact

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue](https://github.com/ganeshak11/MY-suru-BUS/issues)
- Email: ganeshangadi13012006@gmail.com
