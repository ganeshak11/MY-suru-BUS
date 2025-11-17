'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ActiveTripsList from './ActiveTripsList';
import type { Trip, Bus } from './types'; // Import from shared types file

const LiveMap = dynamic(
  () => import('./LiveMap'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full z-0"><p>Loading map...</p></div>
  }
);

export default function MonitoringDashboard() {
  const supabase = createClientComponentClient();

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
    // 1. Process trip data (moved from ActiveTripsList)
    const processTripData = (rawTrips: any[]): Trip[] => {
      return rawTrips.map(trip => {
        const latestStopTime = trip.trip_stop_times
          .filter((tst: any) => tst.actual_arrival_time)
          .sort((a: any, b: any) => new Date(b.actual_arrival_time).getTime() - new Date(a.actual_arrival_time).getTime());
        
        const latest_stop = latestStopTime.length > 0 && latestStopTime[0].stops 
          ? `At ${latestStopTime[0].stops.stop_name}` 
          : 'Trip Started';

        return { ...trip, latest_stop };
      });
    };

    // 2. Fetch all active trips (for the list)
    const fetchActiveTrips = async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          trip_id,
          buses:bus_id ( bus_no ),
          drivers:driver_id ( name ),
          schedules:schedule_id ( 
            start_time, 
            routes:route_id ( route_name ) 
          ),
          trip_stop_times ( actual_arrival_time, stops ( stop_name ) )
        `)
        .eq('status', 'En Route');
      
      if (data) {
        setAllTrips(processTripData(data));
      } else if (error) {
        console.error("Error fetching trips:", error);
      }
      setLoading(false); // Set loading to false after first fetch
    };

    // 3. Fetch all bus locations (for the map)
    const fetchBusLocations = async () => {
      const { data } = await supabase.from('buses').select('*').not('current_trip_id', 'is', null);
      if (data) setAllBuses(data as Bus[]);
    };
    
    // 4. Initial fetch
    fetchActiveTrips();
    fetchBusLocations();

    // 5. Set up Supabase real-time channels
    const channel = supabase.channel('monitoring-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchActiveTrips())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_stop_times' }, () => fetchActiveTrips())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'buses' }, (payload) => {
          const updatedBus = payload.new as Bus;
          setAllBuses(current => current.map(b => b.bus_id === updatedBus.bus_id ? updatedBus : b));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
        <div className="lg:col-span-2 h-[calc(100vh-130px)] rounded-2xl border border-border/50 overflow-hidden shadow-sm">
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