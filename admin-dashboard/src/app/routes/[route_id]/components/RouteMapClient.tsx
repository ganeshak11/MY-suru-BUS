'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState, useRef } from 'react';
import { MapMarkersClient } from '../../../components/MapMarkersClient';

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

interface Stop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
}

interface RouteStop extends Stop {
  route_stop_id: number;
  stop_sequence: number;
  time_offset_from_start: string;
}

interface RouteMapClientProps {
  routeId: number;
  stops: RouteStop[];
}

export default function RouteMapClient({ routeId, stops }: RouteMapClientProps) {
  const [routePolyline, setRoutePolyline] = useState<L.LatLngExpression[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const defaultCenter: L.LatLngExpression = [12.2958, 76.6552];
  const defaultZoom = 13;

  const fetchOSRMRoute = async () => {
    if (stops.length < 2) {
      setRoutePolyline([]);
      return;
    }
    setLoading(true);

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
    fetchOSRMRoute();
  }, [stops]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        if (stops.length > 0 && stops.length < 2) {
          const allLatLngs = stops.map(stop => [stop.latitude, stop.longitude]) as L.LatLngExpression[];
          const bounds = L.latLngBounds(allLatLngs);
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: defaultZoom });
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [stops, defaultZoom]);

  if (loading) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-secondary">Calculating road path...</div>;
  }

  if (error) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-danger">Error: {error}</div>;
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg shadow-md z-0"
        ref={mapRef}
      >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {stops.map((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === stops.length - 1 && stops.length > 1;
        let icon = MapMarkersClient.intermediateStop;
        
        if (isStart) icon = MapMarkersClient.startStop;
        else if (isEnd) icon = MapMarkersClient.endStop;
        
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
    </div>
  );
}