'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { useEffect, useState, useCallback, useContext } from 'react'; // <--- 'useContext' is no longer needed
import { supabase } from '@/lib/supabaseClient';
import type { Bus } from './types'; 
// --- FIX 1: Import useTheme from next-themes ---
import { useTheme } from 'next-themes'; 
import { MapMarkersClient as MapMarkers } from '../../components/MapMarkersClient';

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
  const [routeStops, setRouteStops] = useState<{lat: number, lng: number, name: string, isStart: boolean, isEnd: boolean}[]>([]);
  const [error, setError] = useState<string | null>(null);

  
  // --- FIX 1 (cont.): Use the correct theme hook ---
  const { theme } = useTheme();

  const selectedBus = buses.find(b => b.current_trip_id === selectedTripId) ?? null;

  // --- OSRM Fetch (No change) ---
  const fetchOSRMRoute = useCallback(async (waypoints: L.LatLng[]) => {
    if (waypoints.length < 2) return;
    const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
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

  useEffect(() => {
    const fetchRoutePath = async () => {
      setRoutePolyline([]);
      setRouteStops([]);
      setError(null);
      if (!selectedTripId) return;
      
      const { data: tripData } = await supabase
        .from('trips')
        .select('schedules!inner(route_id)')
        .eq('trip_id', selectedTripId)
        .single();
      
      if (!tripData?.schedules) return;
      const schedules = Array.isArray(tripData.schedules) ? tripData.schedules[0] : tripData.schedules;
      if (!schedules?.route_id) return;
      const routeId = schedules.route_id;

      const { data: stopsData } = await supabase
        .from('route_stops')
        .select('stops!inner(stop_name, latitude, longitude)')
        .eq('route_id', routeId)
        .order('stop_sequence');

      if (stopsData && stopsData.length > 0) {
        const waypoints = stopsData
          .map(rs => {
            const stop = Array.isArray(rs.stops) ? rs.stops[0] : rs.stops;
            if (!stop || !stop.latitude || !stop.longitude) return null;
            return L.latLng(parseFloat(stop.latitude), parseFloat(stop.longitude));
          })
          .filter((wp): wp is L.LatLng => wp !== null && !isNaN(wp.lat) && !isNaN(wp.lng));
        
        // Set all route stops with start/end flags
        const allStops = stopsData.map((rs, index) => {
          const stop = Array.isArray(rs.stops) ? rs.stops[0] : rs.stops;
          return {
            lat: parseFloat(stop.latitude),
            lng: parseFloat(stop.longitude),
            name: stop.stop_name,
            isStart: index === 0,
            isEnd: index === stopsData.length - 1 && stopsData.length > 1
          };
        });
        setRouteStops(allStops);
        
        if (waypoints.length > 1) {
          await fetchOSRMRoute(waypoints);
        }
      }
    };
    fetchRoutePath();
  }, [selectedTripId, supabase, fetchOSRMRoute]);
  // --- End of fixes ---

  return (
    <MapContainer center={[12.2958, 76.6394]} zoom={13} style={{ height: '100%', width: '100%', touchAction: 'pan-x pan-y' }} className="z-10 touch-pan-x touch-pan-y">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
      <MapEffects selectedBus={selectedBus} />
      
      {/* "Show All" Button */}
      {selectedTripId && (
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            onClick={() => setSelectedTripId(null)}
            className="px-4 py-2 rounded-xl shadow-lg border font-medium cursor-pointer bg-card text-foreground border-border/50 hover:bg-primary hover:text-white hover:border-primary transition-all"
          >
            Show All Buses
          </button>
        </div>
      )}

      {/* Render the Polyline */}
      {routePolyline.length > 0 && (
        <Polyline positions={routePolyline} color="#3b82f6" weight={4} opacity={0.7} />
      )}

      {/* Render all route stop markers */}
      {routeStops.map((stop, index) => {
        let icon = MapMarkers.intermediateStop;
        let label = 'Stop';
        
        if (stop.isStart) {
          icon = MapMarkers.startStop;
          label = 'Start Stop';
        } else if (stop.isEnd) {
          icon = MapMarkers.endStop;
          label = 'End Stop';
        }
        
        return (
          <Marker 
            key={index} 
            position={[stop.lat, stop.lng]} 
            icon={icon} 
            zIndexOffset={500}
          >
            <Popup>
              <b>{label}</b><br />
              {stop.name}
            </Popup>
          </Marker>
        );
      })}

      {/* Render buses */}
      {buses.map((bus) => (
        bus.current_latitude && bus.current_longitude && (
          <Marker
            key={bus.bus_id}
            position={[bus.current_latitude, bus.current_longitude]}
            icon={bus.current_trip_id === selectedTripId ? MapMarkers.selectedBus : MapMarkers.bus}
            zIndexOffset={bus.current_trip_id === selectedTripId ? 1000 : 0}
            eventHandlers={{
              click: () => {
                setSelectedTripId(bus.current_trip_id);
              },
            }}
          >
            <Popup>
              <b>Bus No: {bus.bus_no}</b> <br />
              Last Updated: {bus.last_updated ? new Date(bus.last_updated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : 'N/A'}
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