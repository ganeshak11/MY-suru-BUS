'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.MapContainer })), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.TileLayer })), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Marker })), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Popup })), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Polyline })), { ssr: false });

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



export default function RouteMap({ routeId, stops }: RouteMapProps) {
  const [routePolyline, setRoutePolyline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<any>(null);
  const [MapMarkers, setMapMarkers] = useState<any>(null);
  const mapRef = useRef<any>(null);

  const defaultCenter: [number, number] = [12.2958, 76.6552];
  const defaultZoom = 13;

  useEffect(() => {
    // Initialize Leaflet on client side only
    const initLeaflet = async () => {
      const leaflet = await import('leaflet');
      const mapMarkers = await import('../../../components/MapMarkersClient');
      
      // Fix for default Leaflet icons
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
        iconUrl: '/leaflet/images/marker-icon.png',
        shadowUrl: '/leaflet/images/marker-shadow.png',
      });
      
      setL(leaflet.default);
      setMapMarkers(mapMarkers.MapMarkersClient);
      setIsClient(true);
    };
    
    initLeaflet();
  }, []);

  const fetchOSRMRoute = async () => {
    if (stops.length < 2 || !L) {
      setRoutePolyline([]);
      return;
    }
    setLoading(true);

    const coordinates = stops.map(stop => `${stop.longitude},${stop.latitude}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const routeGeoJSON = data.routes[0].geometry;
        const polylineCoords = routeGeoJSON.coordinates.map((coord: [number, number]) => [
          coord[1],
          coord[0],
        ]);
        setRoutePolyline(polylineCoords);

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
    if (isClient && L) {
      fetchOSRMRoute();

      if (mapRef.current && stops.length > 0 && stops.length < 2) {
        const allLatLngs = stops.map(stop => [stop.latitude, stop.longitude]);
        const bounds = L.latLngBounds(allLatLngs);
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: defaultZoom });
      }
    }
  }, [stops, isClient, L]);

  if (!isClient) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-secondary">Loading map...</div>;
  }

  if (loading) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-secondary">Calculating road path...</div>;
  }

  if (error) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-danger">Error: {error}</div>;
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
      {MapMarkers && stops.map((stop, index) => {
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