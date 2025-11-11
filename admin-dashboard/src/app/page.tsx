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
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-secondary text-lg">Welcome back! Here's what's happening with your bus fleet.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Active Trips</p>
              <p className="text-4xl font-bold">{stats.activeTrips}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <MapIcon className="h-8 w-8" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Total Buses</p>
              <p className="text-4xl font-bold">{stats.totalBuses}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <BusIcon className="h-8 w-8" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Total Drivers</p>
              <p className="text-4xl font-bold">{stats.totalDrivers}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <UsersIcon className="h-8 w-8" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">New Reports</p>
              <p className="text-4xl font-bold">{stats.newReports}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <UsersIcon className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link
            href={feature.href}
            key={feature.name}
            className="group relative bg-card rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border/50 hover:border-primary/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">
                {feature.icon}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {feature.name}
            </h3>
            <p className="text-sm text-secondary leading-relaxed">
              {feature.description}
            </p>
            
            <div className="mt-4 flex items-center text-primary text-sm font-medium">
              <span>Open</span>
              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}