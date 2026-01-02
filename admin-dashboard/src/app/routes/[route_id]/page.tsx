'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import RouteStopManager from './components/RouteStopManager';

const RouteMap = dynamic(() => import('./components/RouteMapClient'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-card flex items-center justify-center text-secondary">Loading map...</div>
});

interface Route {
  route_id: number;
  route_name: string;
  route_no: string;
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

  const fetchRouteDetails = async () => {
    if (!route_id) return;
    setLoading(true);
    try {
      const data = await apiClient.getRoute(Number(route_id));
      setRoute(data);
    } catch (error) {
      console.error('Error fetching route details:', error);
      setError('Failed to load route details.');
    }
    setLoading(false);
  };

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
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-lg">
          {route.route_no}
        </span>
        <h1 className="text-3xl font-bold text-foreground">{route.route_name}</h1>
      </div>
      <p className="mt-2 text-secondary">Manage stops and view the route map.</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- MAP SIDE --- */}
        <div className="bg-card p-4 rounded-lg shadow-xl border h-[350px] sm:h-[450px] lg:h-[calc(100vh-130px)] overflow-hidden"> 
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