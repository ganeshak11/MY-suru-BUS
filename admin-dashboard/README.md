# MySuru Bus - Admin Dashboard

## Overview

The MySuru Bus Admin Dashboard is a comprehensive web application for managing a bus transportation system. It provides administrators with the tools to oversee and manage buses, drivers, routes, schedules, and live operations.

## Features

### 1. Dashboard
- **Announcements:** A central place to view and create announcements for passengers.
- **Live Fleet Monitoring:** A real-time map view of all active buses.

### 2. Fleet Management
- **Buses:** Add, edit, and delete buses from the fleet.
- **Drivers:** Manage driver information, including their contact details.

### 3. Route & Schedule Management
- **Routes:**
    - Create, edit, and delete bus routes.
    - An interactive **Route Planner** to visually create routes by placing stops on a map.
- **Stops:**
    - Manage individual bus stops.
    - Add stops by manually entering coordinates or by picking a location from a map.
- **Schedules:**
    - Define schedules for routes, specifying the start time and day of the week.
- **Trips:**
    - Assign a bus, driver, and schedule to create a trip for a specific date.
    - Track the status of each trip (Scheduled, En Route, Completed, Cancelled).

### 4. Operations
- **Live Monitoring:** A dedicated page to monitor the real-time location of all active buses on a map.
- **Announcements:** Create and broadcast service alerts and announcements that appear as notifications in the passenger app.
- **Passenger Reports:** View and manage feedback and issues submitted by passengers through the passenger app. Administrators can acknowledge and resolve reports.

### 5. System
- **Authentication:** A secure login page for administrators.
- **Theme Customization:** Toggle between light and dark mode for the user interface.

## Getting Started

### Prerequisites

- Node.js and npm (or yarn/pnpm) installed.
- A Supabase project set up with the required database schema.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```
2.  **Navigate to the admin-dashboard directory:**
    ```bash
    cd admin-dashboard
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Set up environment variables:**
    - Create a `.env.local` file in the root of the `admin-dashboard` directory.
    - Add your Supabase project URL and anon key to the `.env.local` file:
      ```
      NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
      ```

### Running the Development Server

1.  **Start the development server:**
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:3000` to see the application.

## Technologies Used

- **Framework:** Next.js
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase
- **Mapping:** Leaflet, React Leaflet
- **UI:** Headless UI, Heroicons
- **Language:** TypeScript
