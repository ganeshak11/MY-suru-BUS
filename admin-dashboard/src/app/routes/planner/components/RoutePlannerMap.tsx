'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Stop } from '../../../../lib/database.types';
import { useState, useEffect, useCallback } from 'react'; // --- ADDED

// --- Marker icon setup (No change) ---
const defaultIcon = new L.Icon({
  iconUrl: '/leaflet/images/marker-icon.png',
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Props {
  allStops: Stop[];
  selectedStops: Stop[];
  onAddStopToRoute: (stop: Stop) => void;
}

export default function RoutePlannerMap({ allStops, selectedStops, onAddStopToRoute }: Props) {
  const mapCenter: [number, number] = [12.2958, 76.6394]; // Mysore, India
  
  // --- ADDED: State for OSRM route ---
  const [routePolyline, setRoutePolyline] = useState<L.LatLngExpression[]>([]);
  const selectedStopIds = new Set(selectedStops.map(s => s.stop_id));

  // --- ADDED: OSRM Fetch Logic ---
  const fetchOSRMRoute = useCallback(async () => {
    if (selectedStops.length < 2) {
      setRoutePolyline([]); // Clear route if not enough stops
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
      // Don't clear the polyline, just log error, maybe it's a temp network issue
    }
  }, [selectedStops]);

  // --- ADDED: Effect to fetch route when stops change ---
  useEffect(() => {
    fetchOSRMRoute();
  }, [fetchOSRMRoute]);

  return (
    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} className="z-10">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* --- UPDATED: Draw the *real* OSRM route --- */}
      {routePolyline.length > 1 && <Polyline positions={routePolyline} color="#0ea5e9" weight={5} opacity={0.8} />}

      {/* Display all available stops */}
      {allStops.map(stop => {
        const isSelected = selectedStopIds.has(stop.stop_id);
        return (
          <Marker 
            key={stop.stop_id} 
            position={[stop.latitude, stop.longitude]} 
            icon={isSelected ? selectedIcon : defaultIcon}
            // --- ADDED: Make unselected stops semi-transparent ---
            opacity={isSelected ? 1.0 : 0.6}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup>
              <b>{stop.stop_name}</b>
              <br />
              {!isSelected && (
                // --- UPDATED: Use theme colors for button ---
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