'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import { useTheme } from 'next-themes';
import type { LiveData } from './types';
import { ROUTE_COLORS, freshness, FRESH_COLOR } from './types';

const MYSURU: [number, number] = [12.3051, 76.6551];

// Fit the map to every stop once, when the network first loads.
function FitToNetwork({ points }: { points: [number, number][] }) {
  const map = useMap();
  // Leaflet measures its container once; re-measure after layout settles so the
  // tiles fill the whole area (otherwise a grey band can remain on one side).
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [map]);
  useEffect(() => {
    map.invalidateSize();
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length > 0]);
  return null;
}

// Pan to the selected bus.
function FollowBus({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true });
  }, [map, position]);
  return null;
}

export default function LiveNetworkMap({
  data, now, selectedTripId, onSelect,
}: {
  data: LiveData | null;
  now: number;
  selectedTripId: number | null;
  onSelect: (tripId: number) => void;
}) {
  const { resolvedTheme } = useTheme();
  const routeColor = useMemo(() => {
    const m = new Map<number, string>();
    data?.routes.forEach((r, i) => m.set(r.route_id, ROUTE_COLORS[i % ROUTE_COLORS.length]));
    return m;
  }, [data?.routes]);
  const allPoints = useMemo(
    () => (data?.routes ?? []).flatMap((r) => r.stops.map((s) => [s.latitude, s.longitude] as [number, number])),
    [data?.routes]
  );
  const selected = data?.trips.find((t) => t.trip_id === selectedTripId);
  const selectedPos: [number, number] | null =
    selected?.bus.latitude != null && selected.bus.longitude != null ? [selected.bus.latitude, selected.bus.longitude] : null;

  // Standard OpenStreetMap tiles (fine for a light-traffic page, with attribution);
  // in dark mode they're inverted with a CSS filter rather than a second provider.
  const dark = resolvedTheme === 'dark';

  return (
    <MapContainer center={MYSURU} zoom={13} className="h-full w-full" zoomControl={false}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        className={dark ? 'osm-dark' : undefined}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FitToNetwork points={allPoints} />
      <FollowBus position={selectedPos} />

      {data?.routes.map((r) => (
        <Polyline
          key={r.route_id}
          positions={r.stops.map((s) => [s.latitude, s.longitude])}
          pathOptions={{ color: routeColor.get(r.route_id), weight: 4, opacity: 0.7, dashArray: r.route_no === 'D' ? '8 8' : undefined }}
        />
      ))}

      {data?.routes.flatMap((r) => r.stops.map((s) => (
        <CircleMarker
          key={`${r.route_id}-${s.stop_id}`}
          center={[s.latitude, s.longitude]}
          radius={5}
          pathOptions={{ color: routeColor.get(r.route_id), fillColor: '#fff', fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top">{s.stop_name}</Tooltip>
        </CircleMarker>
      )))}

      {data?.trips.filter((t) => t.bus.latitude != null && t.bus.longitude != null).map((t) => {
        const route = data.routes.find((r) => r.route_id === t.route_id);
        const f = freshness(t, now);
        const icon = L.divIcon({
          className: '',
          iconSize: [0, 0],
          html: `<div style="transform:translate(-50%,-50%);display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;
            background:${routeColor.get(t.route_id)};color:#fff;font:700 12px system-ui;white-space:nowrap;
            border:3px solid ${FRESH_COLOR[f.level]};box-shadow:0 2px 8px rgba(0,0,0,.35);
            ${t.trip_id === selectedTripId ? 'outline:3px solid #fff;' : ''}">🚌 ${route?.route_no ?? ''}</div>`,
        });
        return (
          <Marker
            key={t.trip_id}
            position={[t.bus.latitude!, t.bus.longitude!]}
            icon={icon}
            eventHandlers={{ click: () => onSelect(t.trip_id) }}
            keyboard
            title={`Bus ${t.bus.bus_no}, route ${route?.route_no}`}
          />
        );
      })}
    </MapContainer>
  );
}
