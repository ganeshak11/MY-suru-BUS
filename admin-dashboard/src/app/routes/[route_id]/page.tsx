'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import RouteMap from './components/RouteMap';
import RouteStopManager from './components/RouteStopManager';

interface Route {
  route_id: number;
  route_name: string;
}

interface Stop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
}

interface RouteStop extends Stop {
  route_stop_id: number;
  stop_sequence: number;
  time_offset_from_start: string; // HH:MM:SS
}

export default function RouteDetailPage() {
  const { route_id } = useParams();
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRouteStops, setCurrentRouteStops] = useState<RouteStop[]>([]);

  // --- ADDED: Unified Fetch Function for Route Details ---
  const fetchRouteDetails = async () => {
    if (!route_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('route_id', route_id)
      .single();

    if (error) {
      console.error('Error fetching route details:', error);
      setError('Failed to load route details.');
    } else {
      setRoute(data);
    }
    setLoading(false);
  };
  // --- END ADDED ---

  useEffect(() => {
    if (route_id) {
      fetchRouteDetails();
    }
  }, [route_id]);

  if (loading) {
    return <p className="p-8 text-secondary">Loading route details...</p>;
  }

  if (error) {
    return <p className="p-8 text-danger">{error}</p>; // --- THEME COLOR
  }

  if (!route) {
    return <p className="p-8 text-secondary">Route not found.</p>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-foreground">{route.route_name}</h1>
      <p className="mt-2 text-secondary">Manage stops and view the route map.</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- MAP SIDE --- */}
        <div className="bg-card p-4 rounded-lg shadow-xl border h-[600px] overflow-hidden"> 
          <h2 className="text-xl font-semibold text-foreground mb-4">Route Map</h2>
          {/* Ensure the map occupies the remaining height */}
          <div className="h-[calc(100%-40px)]"> 
            <RouteMap routeId={Number(route_id)} stops={currentRouteStops} />
          </div>
        </div>
        {/* --- MANAGER SIDE --- */}
        <div className="lg:col-span-1">
          <RouteStopManager 
            routeId={Number(route_id)} 
            onStopsUpdated={setCurrentRouteStops} 
          />
        </div>
      </div>
    </div>
  );
}