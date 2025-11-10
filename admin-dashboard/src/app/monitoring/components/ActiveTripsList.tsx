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
    <div className="h-[80vh] bg-card p-4 rounded-lg border flex flex-col">
      <h2 className="text-2xl font-semibold tracking-tight mb-4">Active Trips ({filteredTrips.length})</h2>
      
      {/* Filter UI (now just controls parent state) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label htmlFor="route-filter" className="block text-sm font-medium text-muted-foreground">
            Filter by Route
          </label>
          <select
            id="route-filter"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full p-2 border rounded-md bg-background text-foreground border-secondary"
          >
            <option value="all">All Routes</option>
            {availableRoutes.map(route => (
              <option key={route} value={route}>{route}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="driver-filter" className="block text-sm font-medium text-muted-foreground">
            Filter by Driver
          </label>
          <select
            id="driver-filter"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="w-full p-2 border rounded-md bg-background text-foreground border-secondary"
          >
            <option value="all">All Drivers</option>
            {availableDrivers.map(driver => (
              <option key={driver} value={driver}>{driver}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* List (renders the pre-filtered 'filteredTrips' prop) */}
      {filteredTrips.length === 0 ? (
        <p className="text-muted-foreground">
          {allTrips.length > 0 ? 'No active trips match your filters.' : 'No active trips at the moment.'}
        </p>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto min-h-0">
          {filteredTrips.map(trip => (
            <div 
              key={trip.trip_id} 
              onClick={() => setSelectedTripId(trip.trip_id)}
              className={`p-3 rounded-lg bg-background border-2 cursor-pointer transition-colors ${
                selectedTripId === trip.trip_id ? 'border-primary' : 'border-transparent'
              }`}
            >
              <div className="font-bold text-lg">{trip.schedules?.routes?.route_name}</div>
              <div className="text-sm text-muted-foreground">
                {trip.buses?.bus_no} - {trip.drivers?.name}
              </div>
              <div className="text-sm text-green-500 font-semibold mt-2">
                {trip.latest_stop}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}