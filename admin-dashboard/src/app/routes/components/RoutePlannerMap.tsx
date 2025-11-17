'use client';

import { useState, useEffect, useCallback } from 'react';
import { Stop } from '../../../lib/database.types';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.MapContainer })), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.TileLayer })), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Marker })), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Popup })), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => ({ default: mod.Polyline })), { ssr: false });

interface Props {
  allStops: Stop[];
  selectedStops: Stop[];
  onAddStopToRoute: (stop: Stop) => void;
}

export default function RoutePlannerMap({ allStops, selectedStops, onAddStopToRoute }: Props) {
  const mapCenter: [number, number] = [12.2958, 76.6394];
  const [routePolyline, setRoutePolyline] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [MapMarkers, setMapMarkers] = useState<any>(null);
  const selectedStopIds = new Set(selectedStops.map(s => s.stop_id));

  useEffect(() => {
    const initClient = async () => {
      const mapMarkers = await import('../../components/MapMarkersClient');
      setMapMarkers(mapMarkers.MapMarkersClient);
      setIsClient(true);
    };
    initClient();
  }, []);

  const fetchOSRMRoute = useCallback(async () => {
    if (selectedStops.length < 2) {
      setRoutePolyline([]);
      return;
    }
    
    const coordinates = selectedStops.map(wp => `${wp.longitude},${wp.latitude}`).join(';');
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
      }
    } catch (err) {
      console.error('Error fetching OSRM route:', err);
    }
  }, [selectedStops]);

  useEffect(() => {
    if (isClient) {
      fetchOSRMRoute();
    }
  }, [fetchOSRMRoute, isClient]);

  if (!isClient) {
    return <div className="h-full w-full bg-card flex items-center justify-center text-secondary">Loading map...</div>;
  }

  return (
    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} className="z-10">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {routePolyline.length > 1 && <Polyline positions={routePolyline} color="#0ea5e9" weight={5} opacity={0.8} />}

      {MapMarkers && allStops.map((stop, index) => {
        const isSelected = selectedStopIds.has(stop.stop_id);
        const isStart = isSelected && index === 0;
        const isEnd = isSelected && index === selectedStops.length - 1 && selectedStops.length > 1;
        
        let icon = MapMarkers.intermediateStop;
        if (isSelected) {
          if (isStart) icon = MapMarkers.startStop;
          else if (isEnd) icon = MapMarkers.endStop;
          else icon = MapMarkers.selectedStop;
        }
        
        return (
          <Marker 
            key={stop.stop_id} 
            position={[stop.latitude, stop.longitude]} 
            icon={icon}
            opacity={isSelected ? 1.0 : 0.6}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <b>{stop.stop_name}</b>
              <br />
              {!isSelected && (
                <button 
                  onClick={() => onAddStopToRoute(stop)}
                  className="mt-2 px-3 py-1 text-primary-foreground bg-primary rounded-md hover:bg-primary/80 text-sm"
                >
                  Add to Route
                </button>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}