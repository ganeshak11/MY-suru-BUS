'use client';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

// Fix for default Leaflet icons not appearing
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

interface StopLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

function MapClickEventHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function StopLocationPicker({ latitude, longitude, onLocationChange }: StopLocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const defaultCenter: L.LatLngExpression = [12.2958, 76.6552]; // Center of Mysore
  const defaultZoom = 13;

  const currentPosition: L.LatLngExpression | null = (latitude && longitude) ? [latitude, longitude] : null;

  useEffect(() => {
    if (mapRef.current) {
      if (currentPosition) {
        mapRef.current.setView(currentPosition, 16); // Zoom in closer if a point is set
      } else {
        mapRef.current.setView(defaultCenter, defaultZoom);
      }
    }
  }, [currentPosition, defaultZoom]);

  return (
    <MapContainer
      center={currentPosition || defaultCenter}
      zoom={currentPosition ? 16 : defaultZoom}
      scrollWheelZoom={true}
      style={{ height: '300px', width: '100%' }}
      className="rounded-lg shadow-md z-0" // Added z-0 for stacking context
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickEventHandler onLocationChange={onLocationChange} />
      {currentPosition && (
        <Marker position={currentPosition}>
          <Popup>
            Lat: {latitude?.toFixed(4)}, Lng: {longitude?.toFixed(4)}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}