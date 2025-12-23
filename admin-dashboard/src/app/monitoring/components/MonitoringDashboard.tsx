'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import ActiveTripsList from './ActiveTripsList';
import type { Trip, Bus } from './types';

const LiveMap = dynamic(
  () => import('./LiveMap'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full z-0"><p>Loading map...</p></div>
  }
);

export default function MonitoringDashboard() {
  

  // --- All state now lives here ---
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allBuses, setAllBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  
  // Selection state (this was already here and correct)
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  // --- Data Fetching & Real-time ---
  useEffect(() => {
    const processTripData = (rawTrips: any[]): Trip[] => {
      return rawTrips.map(trip => {
        const latestStopTime = trip.trip_stop_times
          ?.filter((tst: any) => tst.actual_arrival_time)
          .sort((a: any, b: any) => new Date(b.actual_arrival_time).getTime() - new Date(a.actual_arrival_time).getTime());
        
        const latest_stop = latestStopTime?.length > 0 && latestStopTime[0].stops 
          ? `At ${latestStopTime[0].stops.stop_name}` 
          : 'Trip Started';

        return { ...trip, latest_stop };
      });
    };

    const fetchActiveTrips = async () => {
      try {
        const data = await apiClient.getTrips();
        const activeTrips = data.filter((t: any) => t.status === 'En Route');
        setAllTrips(processTripData(activeTrips));
      } catch (error) {
        console.error("Error fetching trips:", error);
      }
      setLoading(false);
    };

    const fetchBusLocations = async () => {
      try {
        const data = await apiClient.getBuses();
        const activeBuses = data.filter((b: any) => b.current_trip_id !== null);
        setAllBuses(activeBuses);
      } catch (error) {
        console.error("Error fetching buses:", error);
      }
    };
    
    fetchActiveTrips();
    fetchBusLocations();

    const interval = setInterval(() => {
      fetchActiveTrips();
      fetchBusLocations();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // --- Derived State (Auto-updates when state changes) ---

  // 1. Calculate filtered trips for the list
  const filteredTrips = useMemo(() => {
    return allTrips.filter(trip => {
      const routeMatch = selectedRoute === 'all' || trip.schedules?.routes?.route_name === selectedRoute;
      const driverMatch = selectedDriver === 'all' || trip.drivers?.name === selectedDriver;
      return routeMatch && driverMatch;
    });
  }, [allTrips, selectedRoute, selectedDriver]);

  // 2. Calculate buses to show on the map (THE KEY LOGIC)
  const busesToDisplay = useMemo(() => {
    // If a bus is selected, only show that one
    if (selectedTripId) {
      return allBuses.filter(b => b.current_trip_id === selectedTripId);
    }
    
    // Otherwise, show all buses that match the list filters
    const filteredTripIds = new Set(filteredTrips.map(t => t.trip_id));
    return allBuses.filter(b => b.current_trip_id && filteredTripIds.has(b.current_trip_id));
  }, [allBuses, filteredTrips, selectedTripId]);

  // Handle loading state for the whole dashboard
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading Monitoring Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Live Monitoring</h1>
        <p className="text-secondary text-base">Real-time bus locations and trip status</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <div className="lg:col-span-2 h-[350px] sm:h-[450px] lg:h-[calc(100vh-130px)] rounded-2xl border border-border/50 overflow-hidden shadow-sm" style={{touchAction: 'pan-x pan-y'}}>
          <Suspense fallback={<div className="flex items-center justify-center h-full"><p>Loading map...</p></div>}>
            <LiveMap 
              buses={busesToDisplay} // Pass the final filtered buses
              selectedTripId={selectedTripId} 
              setSelectedTripId={setSelectedTripId} 
            />
          </Suspense>
        </div>
        <div className="lg:col-span-1">
          <ActiveTripsList
            allTrips={allTrips} // Pass all trips for filter dropdowns
            filteredTrips={filteredTrips} // Pass pre-filtered trips
            selectedTripId={selectedTripId}
            setSelectedTripId={setSelectedTripId}
            selectedRoute={selectedRoute}
            setSelectedRoute={setSelectedRoute}
            selectedDriver={selectedDriver}
            setSelectedDriver={setSelectedDriver}
          />
        </div>
      </div>
    </div>
  );
}
