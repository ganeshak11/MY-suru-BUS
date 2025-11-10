'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { useEffect, useState, useCallback, useContext } from 'react'; // <--- 'useContext' is no longer needed
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Bus } from './types'; 
// --- FIX 1: Import useTheme from next-themes ---
import { useTheme } from 'next-themes'; 

// --- Icon Definitions (No change) ---
const busIcon = L.icon({
  iconUrl: '/leaflet/images/bus-icon.png',
  iconSize: [20, 30],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35]
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// --- Prop Interface (No change) ---
interface LiveMapProps {
  buses: Bus[]; 
  selectedTripId: number | null;
  setSelectedTripId: (id: number | null) => void;
}

// --- Helper Component (No change) ---
function MapEffects({ selectedBus }: { selectedBus: Bus | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBus && selectedBus.current_latitude && selectedBus.current_longitude) {
      map.flyTo([selectedBus.current_latitude, selectedBus.current_longitude], 15);
    }
  }, [selectedBus, map]);
  return null;
}

// --- Main Component ---
export default function LiveMap({ buses, selectedTripId, setSelectedTripId }: LiveMapProps) {
  const [routePolyline, setRoutePolyline] = useState<L.LatLngExpression[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  
  // --- FIX 1 (cont.): Use the correct theme hook ---
  const { theme } = useTheme();

  const selectedBus = buses.find(b => b.current_trip_id === selectedTripId) ?? null;

  // --- OSRM Fetch (No change) ---
  const fetchOSRMRoute = useCallback(async (waypoints: L.LatLng[]) => {
    if (waypoints.length < 2) return;
    const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
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
        setError(null);
      } else {
        console.error('OSRM routing error:', data.message);
        setError('Failed to calculate route path.');
        setRoutePolyline([]);
      }
    } catch (err) {
      console.error('Error fetching OSRM route:', err);
      setError('Failed to connect to public routing service.');
      setRoutePolyline([]);
    }
  }, []);

  // --- FIX 2: Correct the Supabase queries ---
  useEffect(() => {
    const fetchRoutePath = async () => {
      setRoutePolyline([]);
      setError(null);
      if (!selectedTripId) return;
      
      const { data: tripData } = await supabase
        .from('trips')
        .select('schedules:schedule_id(route_id)') // <-- Corrected query
        .eq('trip_id', selectedTripId)
        .single();
      
      if (!tripData?.schedules?.route_id) return;
      const routeId = tripData.schedules.route_id;

      const { data: stopsData } = await supabase
        .from('route_stops')
        .select('stops:stop_id(latitude, longitude)') // <-- Corrected query
        .eq('route_id', routeId)
        .order('stop_sequence');

      if (stopsData && stopsData.length > 0) {
        const waypoints = stopsData
          .map(rs => (rs.stops ? L.latLng(rs.stops.latitude, rs.stops.longitude) : null))
          .filter((wp): wp is L.LatLng => wp !== null);
        
        if (waypoints.length > 1) {
          await fetchOSRMRoute(waypoints);
        }
      }
    };
    fetchRoutePath();
  }, [selectedTripId, supabase, fetchOSRMRoute]);
  // --- End of fixes ---

  return (
    <MapContainer center={[12.2958, 76.6394]} zoom={13} style={{ height: '100%', width: '100%' }} className="z-10">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      <MapEffects selectedBus={selectedBus} />
      
      {/* "Show All" Button */}
      {selectedTripId && (
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            onClick={() => setSelectedTripId(null)}
            // This button uses your tailwind.config.js classes, so it's theme-aware
            className={`
              p-2 rounded-lg shadow-lg border font-semibold cursor-pointer
              bg-card text-foreground border-secondary 
              hover:bg-background
            `}
          >
            Show All Buses
          </button>
        </div>
      )}

      {/* Render the Polyline (No change) */}
      {routePolyline.length > 0 && (
        <Polyline positions={routePolyline} color="#0ea5e9" weight={5} opacity={0.8} />
      )}

      {/* Render buses prop (No change) */}
      {buses.map((bus) => (
        bus.current_latitude && bus.current_longitude && (
          <Marker
            key={bus.bus_id}
            position={[bus.current_latitude, bus.current_longitude]}
            icon={bus.current_trip_id === selectedTripId ? selectedIcon : busIcon}
            zIndexOffset={bus.current_trip_id === selectedTripId ? 1000 : 0}
            eventHandlers={{
              click: () => {
                setSelectedTripId(bus.current_trip_id);
              },
            }}
          >
            <Popup>
              <b>Bus No: {bus.bus_no}</b> <br />
              Last Updated: {bus.last_updated ? new Date(bus.last_updated).toLocaleString() : 'N/A'}
            </Popup>
          </Marker>
        )
      ))}

      {/* Error display (No change) */}
      {error && (
        <div style={{ position: 'absolute', top: 10, left: 50, zIndex: 1000, background: 'white', padding: '10px', borderRadius: '5px', color: 'red' }}>
          {error}
        </div>
      )}
    </MapContainer>
  );
}