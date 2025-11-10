// src/app/page.tsx
'use client'; 

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types'; // Import your generated types

// Import your icons
import MapIcon from './components/icons/MapIcon';
import BusIcon from './components/icons/BusIcon';
import UsersIcon from './components/icons/UsersIcon';
import MapPinIcon from './components/icons/MapPinIcon';
import ClockIcon from './components/icons/ClockIcon';
// --- ADDED: Import for Announcement Icon ---
import HomeIcon from './components/icons/HomeIcon'; // Using HomeIcon temporarily if no dedicated icon exists

// 1. Define Stats state
interface DashboardStats {
  activeTrips: number;
  totalBuses: number;
  totalDrivers: number;
  newReports: number;
}

export default function DashboardPage() {
  const supabase = createClientComponentClient<Database>();
  const [stats, setStats] = useState<DashboardStats>({
    activeTrips: 0,
    totalBuses: 0,
    totalDrivers: 0,
    newReports: 0,
  });

  // 2. Fetch stats on page load
  useEffect(() => {
    const fetchStats = async () => {
      // Fetch active trips (count)
      const { count: activeTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'En Route');

      // Fetch total buses (count)
      const { count: totalBuses } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true });
        
      // Fetch total drivers (count)
      const { count: totalDrivers } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true });

      // Fetch new reports (count)
      const { count: newReports } = await supabase
        .from('passenger_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'New');

      setStats({
        activeTrips: activeTrips ?? 0,
        totalBuses: totalBuses ?? 0,
        totalDrivers: totalDrivers ?? 0,
        newReports: newReports ?? 0,
      });
    };

    fetchStats();
  }, [supabase]);

  // 3. Define all your features with icons and stats
  const features = [
    {
      name: 'Live Monitoring',
      description: 'Track all active buses in real-time on a map.',
      href: '/monitoring',
      stat: stats.activeTrips, 
      statLabel: 'Active Trips',
      icon: <MapIcon className="h-8 w-8 text-primary" />,
    },
    {
      name: 'Passenger Reports',
      description: 'View and manage all new passenger reports.',
      href: '/reports',
      stat: stats.newReports, 
      statLabel: 'New Reports',
      icon: <UsersIcon className="h-8 w-8 text-danger" />, 
    },
    {
      name: 'Manage Buses',
      description: 'Add, edit, and track all buses in your fleet.',
      href: '/buses',
      stat: stats.totalBuses,
      statLabel: 'Total Buses',
      icon: <BusIcon className="h-8 w-8 text-primary" />,
    },
    {
      name: 'Manage Drivers',
      description: 'View and manage all registered drivers.',
      href: '/drivers',
      stat: stats.totalDrivers,
      statLabel: 'Total Drivers',
      icon: <UsersIcon className="h-8 w-8 text-primary" />,
    },
    // --- ADDED ANNOUNCEMENTS TILE ---
    {
      name: 'Announcements',
      description: 'Send real-time service alerts to the passenger app.',
      href: '/announcements',
      // stat: undefined, // No stat requested
      // statLabel: '',
      icon: <ClockIcon className="h-8 w-8 text-primary" />, // Using ClockIcon for timing/alerts
    },
    // --- END ADDED ---
    {
      name: 'Route Planner',
      description: 'Create and manage all bus routes and stops.',
      href: '/routes',
      icon: <MapPinIcon className="h-8 w-8 text-primary" />,
    },
    {
      name: 'Schedules',
      description: 'Set and manage schedules for all your routes.',
      href: '/schedules',
      icon: <ClockIcon className="h-8 w-8 text-primary" />,
    },
  ];

  return (
    <div className="pl-14">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
      <p className="mt-2 text-lg text-secondary">
        Welcome to the MY(suru) BUS management panel.
      </p>

      {/* 4. Render the new, dynamic grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          // Make the whole card a clickable link
          <Link
            href={feature.href}
            key={feature.name}
            className="group flex flex-col justify-between overflow-hidden rounded-lg bg-card p-6 shadow-md transition-all duration-200 ease-in-out hover:shadow-xl hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between">
                {/* Icon */}
                <div className="flex-shrink-0">{feature.icon}</div>
                
                {/* Stat (if it exists) */}
                {feature.stat !== undefined && (
                  <div className="text-right">
                    <p className="text-4xl font-bold text-foreground">
                      {feature.stat}
                    </p>
                    <p className="text-sm font-medium text-secondary">
                      {feature.statLabel}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Text content */}
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {feature.name}
                </h2>
                <p className="mt-2 text-sm text-secondary-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}