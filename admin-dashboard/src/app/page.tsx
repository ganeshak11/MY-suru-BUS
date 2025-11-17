// src/app/page.tsx
'use client'; 

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
      <div className="mb-10">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-secondary text-lg font-medium">Welcome back! Here's what's happening with your bus fleet.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold mb-2 uppercase tracking-wide">Active Trips</p>
              <p className="text-5xl font-bold">{stats.activeTrips}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <MapIcon className="h-9 w-9" />
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-semibold mb-2 uppercase tracking-wide">Total Buses</p>
              <p className="text-5xl font-bold">{stats.totalBuses}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <BusIcon className="h-9 w-9" />
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm font-semibold mb-2 uppercase tracking-wide">Total Drivers</p>
              <p className="text-5xl font-bold">{stats.totalDrivers}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <UsersIcon className="h-9 w-9" />
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-rose-100 text-sm font-semibold mb-2 uppercase tracking-wide">New Reports</p>
              <p className="text-5xl font-bold">{stats.newReports}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl group-hover:scale-110 transition-transform">
              <UsersIcon className="h-9 w-9" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-1">Quick Actions</h2>
        <p className="text-secondary">Access key features and management tools</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link
            href={feature.href}
            key={feature.name}
            className="group relative bg-card rounded-2xl p-7 shadow-soft hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 border-border/50 hover:border-primary/50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="relative">
              <div className="flex items-start justify-between mb-5">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-2xl group-hover:from-primary/20 group-hover:to-primary/10 transition-all group-hover:scale-110 shadow-sm">
                  {feature.icon}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {feature.name}
              </h3>
              <p className="text-sm text-secondary leading-relaxed mb-4">
                {feature.description}
              </p>
              
              <div className="flex items-center text-primary text-sm font-semibold group-hover:gap-2 transition-all">
                <span>Open</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}