# Passenger App - MY(suru) BUS

A React Native mobile application for bus passengers to search routes, track buses in real-time, and manage their journey experience.

## Overview

The Passenger App provides a seamless experience for bus passengers to:
- Search and discover bus routes
- View live bus tracking on interactive maps
- Check real-time ETAs and delays
- See detailed stop information
- Report issues and provide feedback
- Customize app theme (light/dark mode)

## Features

### 🗺️ Route Discovery
- Advanced route search by source and destination
- Browse available schedules
- View route stops and timings
- Filter by date and time

### 📍 Live Tracking
- Real-time bus location on interactive map
- Live ETA calculations
- Stop timeline with progress indicators
- Delay status indicators (on-time, early, delayed)

### 📱 User Experience
- Intuitive mobile-first interface
- Dark/Light theme support
- Responsive design for various screen sizes
- Smooth animations and transitions

### 🔔 Notifications
- Announcements from transit authority
- Service alerts and updates
- Real-time push notifications

### 📋 Reporting
- Report delays or issues
- Provide passenger feedback
- Track report status

## Tech Stack

- **Framework:** React Native with Expo
- **Language:** TypeScript
- **State Management:** React Context API
- **Database:** Supabase
- **Maps:** Leaflet.js, React Leaflet
- **Styling:** React Native StyleSheet, Tailwind CSS utilities
- **Build Tool:** Expo EAS Build
- **Notifications:** Expo Notifications

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Supabase account with project setup
- EAS account (for production builds)
- iOS: Xcode (macOS only)
- Android: Android Studio or compatible SDK

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd passenger-app
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
The `app.json` file contains Expo configuration. Ensure these plugins are present:
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-location",
      "expo-notifications",
      "react-native-webview"
    ]
  }
}
```

## Development

### Start Development Server
```bash
npm start
```

This will display a QR code. You can:
- **Scan with Expo Go** (iOS/Android): Download Expo Go from app store and scan
- **Run on Simulator:** Press `i` for iOS or `a` for Android
- **Custom Build:** Use EAS

### Common Commands
```bash
# View logs
npm start -- --clear

# Run on specific platform
npm start -- --ios
npm start -- --android

## Building for Production

### Prerequisites
- EAS CLI: `npm install -g eas-cli`
- EAS account with project configured
- Appropriate certificates for your platform

### Build Android APK
```bash
eas build --platform android --local

# For release build
eas build --platform android --local --release
```

### Build iOS
```bash
eas build --platform ios --local
```

### Submit to App Stores
```bash
# Android Play Store
eas submit --platform android

# iOS App Store
eas submit --platform ios
```

## Project Structure

```
passenger-app/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with theme provider
│   ├── index.tsx                # Home/search screen
│   ├── MapView.tsx              # Live bus map view
│   ├── SearchResults.tsx        # Route search results
│   ├── RouteDetails/
│   │   └── [route_id].tsx       # Route details screen
│   ├── report.tsx               # Issue reporting screen
│   ├── about.tsx                # About page
│   ├── support.tsx              # Support page
│   └── ...other pages
│
├── components/                   # Reusable components
│   ├── Header.tsx               # App header
│   ├── LiveTripMap.tsx          # Live trip map
│   ├── RouteLeafletMap.tsx      # Route planning map
│   ├── StopsTimeline.tsx        # Stop timeline display
│   └── ...other components
│
├── contexts/                     # React Context
│   └── ThemeContext.tsx         # Theme management
│
├── lib/                          # Utilities
│   ├── supabaseClient.ts        # Supabase configuration
│   ├── etaCalculator.ts         # ETA calculation logic
│   └── helpers.ts               # Helper functions
│
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Key Screens

### Home/Search Screen
- Main entry point
- Route search functionality
- Recent searches
- Featured routes

### Search Results
- Filtered route listings
- Schedule information
- Real-time availability
- Quick route details

### Live Trip Map
- Real-time bus location tracking
- Stop timeline
- ETA display
- Trip progress indicator

### Route Details
- Full route information
- All stops with coordinates
- Schedule details
- Delay information

## Database Schema Integration

The app connects to Supabase tables:
- `routes` - Bus route information
- `stops` - Bus stop locations and details
- `schedules` - Route schedules
- `trips` - Active trip instances
- `buses` - Bus information
- `announcements` - System announcements
- `passenger_reports` - User feedback

## API Integration

### Supabase Real-Time
- Real-time announcement subscriptions
- Live bus location updates
- Status change notifications

### Authentication
- Anonymous auth for initial access
- Future: Email/phone authentication

## Permissions Required

### Android
- `ACCESS_FINE_LOCATION` - GPS tracking
- `ACCESS_COARSE_LOCATION` - Approximate location
- `INTERNET` - Network access
- `READ_EXTERNAL_STORAGE` - Media access

### iOS
- `NSLocationWhenInUseUsageDescription` - Location while using app
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Location in background
- `NSCameraUsageDescription` - Optional: Camera access

## Troubleshooting

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --clear
```

### Location Not Working
- Check app permissions in device settings
- Ensure GPS is enabled
- Verify location permission is granted in app
- Check Supabase network policies

### Map Not Loading
- Verify Supabase connection
- Check internet connectivity
- Ensure Leaflet resources are available
- Check console for CORS errors

### Performance Issues
- Clear app cache: Settings → App → Storage → Clear Cache
- Reduce map zoom level for large areas
- Close other apps
- Update to latest Expo version

## Theme Customization

The app supports light and dark themes. Theme tokens are defined in `contexts/ThemeContext.tsx`:

```typescript
const themeTokens = {
  light: {
    primaryText: '#000000',
    primaryAccent: '#C8B6E2',
    // ... more colors
  },
  dark: {
    primaryText: '#FFFFFF',
    primaryAccent: '#C8B6E2',
    // ... more colors
  }
}
```

## Performance Optimization

- Lazy loading of screens
- Memoized components to prevent unnecessary re-renders
- Efficient location tracking (batched updates)
- Optimized map rendering with clustering
- Asset compression

## Testing

### Unit Tests
```bash
npm test
```

### E2E Testing (Future)
```bash
# Detox setup coming soon
```

## Deployment Checklist

- [ ] All console logs removed (development logs only)
- [ ] Environment variables configured
- [ ] App version bumped in `app.json`
- [ ] All screens tested on target devices
- [ ] Location permissions verified
- [ ] Map functionality tested
- [ ] Network connectivity verified
- [ ] Dark/Light theme tested
- [ ] App icons and splash screens configured
- [ ] EAS build validation passed

## Security Considerations

- API keys stored in `.env` (never commit)
- Supabase RLS policies enforced
- User location data handled securely
- Anonymous authentication for public features
- HTTPS-only connections

## Future Enhancements

- [ ] User authentication and saved preferences
- [ ] Favorite routes bookmarking
- [ ] Push notification preferences
- [ ] Accessibility improvements
- [ ] Offline mode
- [ ] Multiple language support
- [ ] Advanced trip planning

## Support & Documentation

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Leaflet Documentation](https://leafletjs.com)

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
