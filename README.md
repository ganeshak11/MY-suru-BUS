# MY(suru) BUS 

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Platform](https://img.shields.io/badge/Platform-Web%20%2B%20Mobile-blue)]()

## Real-Time Bus Tracking & Fleet Management System

MY(suru) BUS is a **real-time public transportation management platform** built to handle live bus tracking, route management, and passenger information for a city-scale bus network.  
The system is designed with real-world constraints such as live GPS updates, unreliable networks, and role-based access control.

This project was **built completely from scratch** as a full-stack, multi-application system.

---

## System Architecture

The platform consists of three tightly integrated applications sharing a common backend:

- **Admin Dashboard (Web)**  
  Centralized fleet, route, and operations management

- **Driver App (Mobile)**  
  Live GPS tracking and trip execution

- **Passenger App (Mobile)**  
  Route discovery and real-time bus tracking

All applications use **Supabase real-time subscriptions** to maintain live synchronization.

---

## Core Features

### Fleet & Operations
- Bus and driver management
- Real-time GPS tracking (foreground & background)
- Live trip monitoring
- Geofence-based stop detection
- Offline location queue with auto-sync

### Routes & Schedules
- Interactive route visualization
- Stop and schedule management
- Automated trip generation
- Real-time ETA calculation

### Passenger Experience
- Route search by source and destination
- Live bus tracking on maps
- Stop timelines with ETAs
- Service announcements and alerts

### Security
- Role-based access (Admin / Driver / Passenger)
- Supabase Row-Level Security (RLS)
- Secure authentication and session handling

---

## Tech Stack

### Frontend
- **Web:** Next.js 14, React, TypeScript, Tailwind CSS
- **Mobile:** React Native (Expo), TypeScript
- **Maps:** Leaflet, React Native Maps

### Backend
- **Supabase**
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions

### Deployment
- **Web:** Vercel
- **Mobile:** Expo EAS Build
- **Version Control:** GitHub

---

## Project Structure

```
MY-suru-BUS/
├── admin-dashboard/        # Next.js web dashboard
├── driver-app/             # Driver mobile app (Expo)
├── passenger-app/          # Passenger mobile app (Expo)
├── supabase/               # Database schema & backend config
└── README.md
```

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Expo CLI (`npm install -g expo-cli`)

---

##  Quick Start (Development)

### 1. Database Setup
```bash
# Create a Supabase project at https://supabase.com
# Run supabase/schema.sql in SQL Editor
# Copy Project URL and Anon Key
```

### 2. Clone & Install
```bash
git clone https://github.com/ganeshak11/MY-suru-BUS.git
cd MY-suru-BUS

# Install all dependencies 
cd admin-dashboard && npm install 
cd driver-app && npm install 
cd passenger-app && npm install 
```

### 3. Configure Environment
Create `.env.local` / `.env` files in each app (see below)

---

### Environment Variables

#### Admin Dashboard (`admin-dashboard/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

#### Mobile Apps (`driver-app/.env`, `passenger-app/.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## Running the Project

### Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
```
Runs at http://localhost:3000

### Driver App
```bash
cd driver-app
npm install
npm start/ npx expo start
```

### Passenger App
```bash
cd passenger-app
npm install
npm start/ npx expo start
```

---

##  Database Schema Overview

**Core Tables:**
- `buses` - Fleet information
- `drivers` - Driver profiles
- `routes` - Route definitions with stops
- `trips` - Active/scheduled trips
- `locations` - Real-time GPS data
- `users` - Passenger accounts

**Key Features:**
- Row-Level Security (RLS) for all tables
- Real-time subscriptions on `locations` and `trips`
- PostGIS for geospatial queries
- Automated triggers for trip status updates

---

##  Common Issues

**Supabase keys not loading**
- Verify `.env` files exist in each app directory
- Restart dev server after adding env vars

**Location permissions denied (Mobile)**
- Check `app.json` permissions for iOS/Android
- Grant location access in device settings

**Maps not rendering**
- Ensure Google Maps API key is valid (if using)
- Check network connectivity

**Real-time updates not working**
- Verify Supabase Realtime is enabled in dashboard
- Check RLS policies allow subscriptions

---

## Key Design Decisions

- Real-time, data-centric architecture using Supabase
- Geofencing for automated stop detection
- Offline-first GPS updates for unreliable networks
- Minimal backend logic with strong database constraints

---

##  Current Status

-  Core system fully implemented
-  Real-time tracking stable
-  Suitable for demos, evaluation, and further scaling
-  Production deployment pending

---

##  Roadmap

- [ ] Push notifications for passengers
- [ ] Offline mode for driver app
- [ ] Analytics dashboard for admins
- [ ] Multi-language support
- [ ] Payment integration

---

##  Contributing

Contributions are welcome via issues or pull requests.

---

##  License

This project is currently for academic and portfolio use(Mini Project).

---

##  Contact

- **GitHub Issues:** For bugs and feature requests
- **Email:** ganeshangadi13012006@gmail.com
