'use client';

import { useState } from 'react';
import type { Trip } from './types'; // Import from shared types file

// --- NEW Prop Interface ---
interface ActiveTripsListProps {
  allTrips: Trip[];
  filteredTrips: Trip[];
  selectedTripId: number | null;
  setSelectedTripId: (id: number | null) => void;
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  selectedDriver: string;
  setSelectedDriver: (driver: string) => void;
}

export default function ActiveTripsList({
  allTrips,
  filteredTrips,
  selectedTripId,
  setSelectedTripId,
  selectedRoute,
  setSelectedRoute,
  selectedDriver,
  setSelectedDriver
}: ActiveTripsListProps) {

  // --- REMOVED ---: All data fetching (useEffect, etc.) is GONE
  // --- REMOVED ---: `loading`, `trips` state is GONE
  // --- REMOVED ---: `processTripData` is GONE (moved to parent)

  // --- Filter logic now uses 'allTrips' to build the dropdowns ---
  const availableRoutes = Array.from(new Set(allTrips.map(t => t.schedules?.routes?.route_name).filter(Boolean) as string[])).sort();
  const availableDrivers = Array.from(new Set(allTrips.map(t => t.drivers?.name).filter(Boolean) as string[])).sort();

  // --- REMOVED ---: `filteredTrips` calculation (moved to parent)

  // --- UPDATED: No loading state, just render ---
  return (
    <div className="h-[80vh] bg-card p-6 rounded-2xl border border-border/50 flex flex-col shadow-sm">
      <h2 className="text-2xl font-bold text-foreground mb-4">Active Trips <span className="text-primary">({filteredTrips.length})</span></h2>
      
      {/* Filter UI */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="route-filter" className="block text-sm font-medium text-secondary mb-1.5">
            Route
          </label>
          <select
            id="route-filter"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl bg-background text-foreground border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="all">All Routes</option>
            {availableRoutes.map(route => (
              <option key={route} value={route}>{route}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="driver-filter" className="block text-sm font-medium text-secondary mb-1.5">
            Driver
          </label>
          <select
            id="driver-filter"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl bg-background text-foreground border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="all">All Drivers</option>
            {availableDrivers.map(driver => (
              <option key={driver} value={driver}>{driver}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* List */}
      {filteredTrips.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-secondary/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-secondary">
              {allTrips.length > 0 ? 'No trips match your filters' : 'No active trips'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pr-2">
          {filteredTrips.map(trip => (
            <div 
              key={trip.trip_id} 
              onClick={() => setSelectedTripId(trip.trip_id)}
              className={`p-4 rounded-xl bg-background border-2 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                selectedTripId === trip.trip_id ? 'border-primary shadow-md' : 'border-border/30 hover:border-primary/50'
              }`}
            >
              <div className="font-bold text-base text-foreground mb-1">{trip.schedules?.routes?.route_name}</div>
              <div className="text-sm text-secondary mb-2">
                {trip.buses?.bus_no} • {trip.drivers?.name}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {trip.latest_stop}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}