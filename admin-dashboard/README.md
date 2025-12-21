# Admin Dashboard - MY(suru) BUS

A comprehensive Next.js web application for managing a bus transportation system. Administrators use this dashboard to oversee and manage buses, drivers, routes, schedules, and live operations.

## Overview

The Admin Dashboard provides a centralized control center for transit operators to:
- Manage bus fleet and driver information
- Plan and optimize routes
- Create and manage schedules
- Monitor live bus operations
- Handle passenger feedback
- Send system announcements
- Generate reports and analytics

## Features

### 🚌 Fleet Management
- **Buses:** Add, edit, delete, and track bus information
  - Bus number, model, capacity
  - Current status and assignments
  - Maintenance history tracking
- **Drivers:** Manage driver profiles and assignments
  - Contact information
  - License details
  - Trip assignments and history
  - Performance metrics

### 🗺️ Route Management
- **Route Planner:** Visual interactive map tool
  - Drag-and-drop stop placement
  - Route optimization suggestions
  - Distance and time calculations
  - Real-time route validation
- **Routes:** Create and manage bus routes
  - Route naming and numbering
  - Stop sequencing
  - Distance calculations
  - Route status tracking
- **Stops:** Manage individual bus stops
  - Coordinates (manual entry or map picker)
  - Stop names and descriptions
  - Geofence radius configuration
  - Accessibility information

### ⏰ Schedule Management
- **Schedules:** Define trip schedules
  - Route assignment
  - Departure time configuration
  - Day of week selection
  - Recurring vs. one-time schedules
  - Schedule templates for quick creation
- **Trips:** Create and manage individual trips
  - Bus and driver assignment
  - Schedule linking
  - Status tracking (Scheduled, En Route, Completed, Cancelled)
  - Bulk trip generation from templates
  - Trip history and archives

### 📊 Operations & Monitoring
- **Live Fleet Dashboard:** Real-time bus monitoring
  - Interactive map with all active buses
  - Live location updates
  - Speed and direction indicators
  - Trip status overview
  - Driver information display
- **Announcements:** Broadcast service updates
  - Create and publish announcements
  - Target specific routes or system-wide
  - Scheduled announcements
  - Announcement history
- **Passenger Reports:** Manage customer feedback
  - View reported issues
  - Categorize and prioritize reports
  - Track resolution status
  - Generate feedback reports

### 👥 System Features
- **Authentication:** Secure login system
  - Role-based access control
  - Session management
  - Admin user management
  - Activity logging
- **Analytics & Reports:** Business intelligence
  - Trip statistics and metrics
  - Fleet utilization reports
  - Driver performance metrics
  - Passenger feedback analytics
  - Revenue and cost reports
- **Theme & Customization:** UI preferences
  - Light/Dark theme toggle
  - Persistent theme preference
  - Custom branding options

## Tech Stack

- **Framework:** Next.js 14 (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Headless UI, Heroicons
- **Database & Auth:** Supabase (PostgreSQL)
- **Maps:** Leaflet, React Leaflet
- **State Management:** React Hooks + Context
- **API Client:** Supabase JS Client
- **Build & Deploy:** Vercel

## Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Supabase account with project setup
- Vercel account (for deployment)
- Modern web browser

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd admin-dashboard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project:
1. Go to your Supabase project
2. Settings → API
3. Copy Project URL and Anon Key

## Development

### Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser

### Development Features
```bash
# Hot reload with file changes
npm run dev

# Build for production testing
npm run build

# Run production build locally
npm run start

# Lint TypeScript
npm run lint

# Format code
npm run format
```

## Building for Production

### Build Locally
```bash
# Create optimized build
npm run build

# Test production build
npm run start

# Check for build errors
npm run lint
```

### Deploy to Vercel

#### Option 1: GitHub Integration (Recommended)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your repository
5. Configure project:
   - Root Directory: `admin-dashboard`
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
7. Click Deploy

#### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Project Structure

```
admin-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   ├── login/
│   │   │   └── page.tsx            # Login page
│   │   ├── buses/
│   │   │   └── page.tsx            # Bus management
│   │   ├── drivers/
│   │   │   └── page.tsx            # Driver management
│   │   ├── routes/
│   │   │   └── page.tsx            # Route management
│   │   ├── route-planner/
│   │   │   └── page.tsx            # Interactive route planner
│   │   ├── stops/
│   │   │   └── page.tsx            # Stop management
│   │   ├── schedules/
│   │   │   └── page.tsx            # Schedule management
│   │   ├── trips/
│   │   │   └── page.tsx            # Trip management
│   │   ├── monitoring/
│   │   │   └── page.tsx            # Live fleet monitoring
│   │   ├── announcements/
│   │   │   └── page.tsx            # Announcements
│   │   ├── reports/
│   │   │   └── page.tsx            # Passenger reports
│   │   ├── globals.css             # Global styles
│   │   └── middleware.ts           # Auth middleware
│   │
│   ├── components/                 # Reusable components
│   │   ├── Header.tsx              # Page header
│   │   ├── Navigation.tsx          # Sidebar navigation
│   │   ├── ThemeToggle.tsx         # Theme switcher
│   │   └── ...other components
│   │
│   └── lib/
│       ├── supabaseClient.ts       # Supabase config
│       ├── database.types.ts       # Generated types
│       └── helpers.ts              # Utility functions
│
├── public/
│   ├── leaflet/                    # Leaflet assets
│   └── ...static files
│
├── supabase/
│   ├── functions/                  # Edge functions
│   ├── migrations/                 # Database migrations
│   └── schema.sql                  # Database schema
│
├── next.config.js                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

## Key Pages

### Dashboard (Home)
- Live fleet overview
- Active trips summary
- Quick stats and KPIs
- Recent announcements
- System health status

### Bus Management
- List all buses with status
- Add/edit/delete buses
- Bus details and history
- Maintenance tracking
- Current assignment status

### Driver Management
- Driver profiles and contact info
- Assignment history
- Performance ratings
- License information
- Trip statistics

### Route Management
- Create and edit routes
- Interactive route planner
- Stop sequencing
- Distance and time calculations
- Route validation

### Route Planner
- Visual map-based interface
- Drag-and-drop stop placement
- Real-time distance updates
- Route optimization
- Save as new route

### Stop Management
- List all stops
- Add/edit/delete stops
- Geofence radius configuration
- Accessibility details
- Location mapping

### Schedule Management
- Create recurring schedules
- Schedule templates
- Route and time assignment
- Weekly schedule view
- Schedule conflict checking

### Trip Management
- Create individual trips
- Bulk trip generation
- Trip status tracking
- Bus and driver assignment
- Trip history and archives
- Delete completed trips

### Live Monitoring
- Real-time map view
- Active buses display
- Live location updates
- Speed indicators
- Trip information panels
- Driver details

### Announcements
- Create announcements
- Target specific routes
- Schedule announcements
- Announcement history
- View in passenger app

### Passenger Reports
- View all reports
- Filter by status
- Report details
- Mark resolved/acknowledged
- Response tracking

## Database Schema

The app uses Supabase with these main tables:
- `buses` - Bus information and status
- `drivers` - Driver profiles
- `routes` - Bus route definitions
- `route_stops` - Stops on each route
- `schedules` - Trip schedules
- `trips` - Individual trip instances
- `stops` - Stop locations
- `announcements` - System announcements
- `passenger_reports` - Customer feedback
- `trip_stop_times` - Arrival records

## API Integration

### Supabase Real-Time
- Live trip status updates
- Bus location streaming
- Announcement subscriptions
- Report notifications

### Authentication
- Supabase Auth integration
- Session-based access control
- Admin user management

## Authentication & Security

### Login Flow
1. Navigate to `/login`
2. Enter credentials
3. Supabase auth verification
4. Session stored in cookies
5. Middleware checks for protected routes

### Security Features
- Row-Level Security (RLS) policies
- Environment variable protection
- HTTPS-only in production
- Session timeout (default: 24 hours)
- Admin-only access to sensitive operations

## Troubleshooting

### Build Issues

**Error: Module not found**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

**Error: Supabase connection failed**
- Verify `.env.local` configuration
- Check Supabase project is active
- Verify network connectivity

### Runtime Issues

**Map not loading**
1. Check internet connection
2. Verify Leaflet assets in public folder
3. Clear browser cache
4. Check browser console for errors

**Database connection errors**
1. Verify Supabase credentials in `.env.local`
2. Check Supabase project status
3. Verify RLS policies are configured
4. Check network policies

**Authentication issues**
- Clear browser cookies
- Check session timeout
- Verify Supabase auth configuration
- Check user permissions in Supabase

## Performance Optimization

- Image optimization with Next.js Image component
- Code splitting via dynamic imports
- CSS minification with Tailwind
- Database query optimization
- Caching strategies
- Real-time updates via Supabase subscriptions

## Testing

### Manual Testing Checklist
- [ ] Login/logout flow
- [ ] All CRUD operations for buses, drivers, routes
- [ ] Route planner functionality
- [ ] Map loading and interaction
- [ ] Real-time updates
- [ ] Announcements delivery
- [ ] Report management
- [ ] Theme toggle
- [ ] Session timeout
- [ ] Error handling

### Testing Commands
```bash
# Run linter
npm run lint

# Build test
npm run build

# Type checking
npm run type-check
```

## Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Build passes without errors
- [ ] All pages tested
- [ ] Maps and real-time features working
- [ ] Authentication flow verified
- [ ] Error pages configured
- [ ] Analytics configured
- [ ] Backup strategy in place

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional
- `NEXT_PUBLIC_API_TIMEOUT` - API timeout in ms (default: 10000)
- `NEXT_PUBLIC_MAP_TILE_URL` - Custom map tiles
- `NEXT_PUBLIC_LOG_LEVEL` - Logging level (debug, info, warn, error)

## Future Enhancements

- [ ] Advanced analytics dashboard
- [ ] Predictive maintenance alerts
- [ ] AI-powered route optimization
- [ ] Mobile responsive improvements
- [ ] Multi-language support
- [ ] Export reports (PDF, Excel)
- [ ] SMS notifications
- [ ] Integration with payment systems
- [ ] Driver performance analytics
- [ ] Passenger satisfaction surveys

## Support & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Leaflet Documentation](https://leafletjs.com)
- [React Documentation](https://react.dev)

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Submit pull request
5. Await review and merge

## Contact

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue](https://github.com/ganeskak11/MY-suru-BUS/issues)
- Email: ganeshangadi13012006@gmail.com

