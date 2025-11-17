'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
import { MapMarkers } from '../../../components/MapMarkers';
// import { supabase } from '@/lib/supabaseClient';

// Fix for default Leaflet icons not appearing (assuming this is needed)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

// ... (Interfaces - moved to page.tsx, but kept here for self-containment)

interface Stop {
    stop_id: number;
    stop_name: string;
    latitude: number;
    longitude: number;
}

interface RouteStop extends Stop {
    route_stop_id: number;
    stop_sequence: number;
    time_offset_from_start: string; // Assuming HH:MM:SS format
}

interface RouteMapProps {
  routeId: number;
  stops: RouteStop[]; 
}

// Custom hook to update map view when props change
function MapUpdater({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function RouteMap({ routeId, stops }: RouteMapProps) {
  const [routePolyline, setRoutePolyline] = useState<L.LatLngExpression[]>([]);
  const [loading, setLoading] = useState(false); // Loading is controlled by parent now
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const defaultCenter: L.LatLngExpression = [12.2958, 76.6552]; // Center of Mysore
  const defaultZoom = 13;

  const fetchOSRMRoute = async () => {
    if (stops.length < 2) {
      setRoutePolyline([]);
      return;
    }
    setLoading(true);

    // 1. Format coordinates: lng,lat;lng,lat
    const coordinates = stops.map(stop => `${stop.longitude},${stop.latitude}`).join(';');
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const routeGeoJSON = data.routes[0].geometry;
        const polylineCoords = routeGeoJSON.coordinates.map((coord: [number, number]) => [
          coord[1],
          coord[0],
        ]); // OSRM [lon, lat] -> Leaflet [lat, lon]
        setRoutePolyline(polylineCoords);

        // Fit map to bounds of the route after OSRM call
        if (mapRef.current && polylineCoords.length > 0) {
          const bounds = L.latLngBounds(polylineCoords);
          mapRef.current.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
        }
      } else {
        console.error('OSRM routing error:', data.message);
        setError('Failed to calculate route path. Check stop coordinates.');
        setRoutePolyline([]);
      }
    } catch (err) {
      console.error('Error fetching OSRM route:', err);
      setError('Failed to connect to routing service.');
      setRoutePolyline([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Clear old route and try fetching the new one whenever stops array changes
    fetchOSRMRoute();

    // 2. Fallback: If OSRM fails or has <2 stops, just center the map on the stops
    if (mapRef.current && stops.length > 0 && stops.length < 2) {
      const allLatLngs = stops.map(stop => [stop.latitude, stop.longitude]) as L.LatLngExpression[];
      const bounds = L.latLngBounds(allLatLngs);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: defaultZoom });
    }
  }, [stops]);

  if (loading) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-secondary">Calculating road path...</div>;
  }

  if (error) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-danger">Error: {error}</div>; // --- THEME COLOR
  }

  // ... inside RouteMap.tsx return
  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }} // This is correct
      className="rounded-lg shadow-md z-0"
      ref={mapRef}
    >
      
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // <-- Ensure this is correct
      />
      {stops.map((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === stops.length - 1 && stops.length > 1;
        let icon = MapMarkers.intermediateStop;
        
        if (isStart) icon = MapMarkers.startStop;
        else if (isEnd) icon = MapMarkers.endStop;
        
        return (
          <Marker
            key={stop.stop_id}
            position={[stop.latitude, stop.longitude]}
            icon={icon}
          >
            <Popup>
              <b>{stop.stop_name}</b><br />
              Stop #{stop.stop_sequence}<br />
              Offset: {stop.time_offset_from_start}
            </Popup>
          </Marker>
        );
      })}

      {routePolyline.length > 0 && (
        <Polyline positions={routePolyline} color="#5E548E" weight={6} opacity={0.8} /> 
      )}
    </MapContainer>
  );
}