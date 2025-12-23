'use client'; 

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [trips, buses, drivers, reports] = await Promise.all([
          apiClient.getTrips(),
          apiClient.getBuses(),
          apiClient.getDrivers(),
          apiClient.getReports()
        ]);

        setStats({
          activeTrips: trips.filter((t: any) => t.status === 'En Route').length,
          totalBuses: buses.length,
          totalDrivers: drivers.length,
          newReports: reports.filter((r: any) => r.status === 'New').length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

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
      name: 'Trips',
      description: 'Manage and track all bus trips and assignments.',
      href: '/trips',
      icon: <BusIcon className="h-8 w-8 text-primary" />,
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
      name: 'Routes',
      description: 'Create and manage all bus routes and stops.',
      href: '/routes',
      icon: <MapPinIcon className="h-8 w-8 text-primary" />,
    },
    {
      name: 'Stops',
      description: 'Manage individual bus stops and locations.',
      href: '/stops',
      icon: <MapPinIcon className="h-8 w-8 text-secondary" />,
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
      <div className="mb-6 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-secondary text-sm sm:text-base lg:text-lg font-medium">Welcome back! Here's what's happening with your bus fleet.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white/10 rounded-full -mr-10 -mt-10 sm:-mr-12 sm:-mt-12 lg:-mr-16 lg:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-[10px] sm:text-xs lg:text-sm font-semibold mb-1 uppercase tracking-wide">Active Trips</p>
              <p className="text-xl sm:text-2xl lg:text-5xl font-bold">{stats.activeTrips}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl group-hover:scale-110 transition-transform">
              <MapIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-9 lg:w-9" />
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Total Buses</p>
              <p className="text-2xl sm:text-3xl lg:text-5xl font-bold">{stats.totalBuses}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform">
              <BusIcon className="h-5 w-5 sm:h-7 sm:w-7 lg:h-9 lg:w-9" />
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">Total Drivers</p>
              <p className="text-2xl sm:text-3xl lg:text-5xl font-bold">{stats.totalDrivers}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform">
              <UsersIcon className="h-5 w-5 sm:h-7 sm:w-7 lg:h-9 lg:w-9" />
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-rose-100 text-xs sm:text-sm font-semibold mb-1 sm:mb-2 uppercase tracking-wide">New Reports</p>
              <p className="text-2xl sm:text-3xl lg:text-5xl font-bold">{stats.newReports}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform">
              <UsersIcon className="h-5 w-5 sm:h-7 sm:w-7 lg:h-9 lg:w-9" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Quick Actions</h2>
        <p className="text-sm sm:text-base text-secondary">Access key features and management tools</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {features.map((feature) => (
          <Link
            href={feature.href}
            key={feature.name}
            className="group relative bg-card rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-5 lg:p-7 shadow-soft hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 border-border/50 hover:border-primary/50 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-primary/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 lg:-mr-20 lg:-mt-20 group-hover:scale-150 transition-transform duration-500"></div>
            
            <div className="relative">
              <div className="flex items-start justify-between mb-3 sm:mb-4 lg:mb-5">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-2 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl group-hover:from-primary/20 group-hover:to-primary/10 transition-all group-hover:scale-110 shadow-sm">
                  {feature.icon}
                </div>
              </div>
              
              <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-foreground mb-1 sm:mb-2 group-hover:text-primary transition-colors">
                {feature.name}
              </h3>
              <p className="text-[10px] sm:text-xs lg:text-sm text-secondary leading-relaxed mb-2 sm:mb-3 lg:mb-4">
                {feature.description}
              </p>
              
              <div className="flex items-center text-primary text-xs sm:text-sm font-semibold group-hover:gap-2 transition-all">
                <span>Open</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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