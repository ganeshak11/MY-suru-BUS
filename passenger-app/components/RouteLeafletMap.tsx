import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

type Stop = {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
};

type Bus = {
  bus_id: number;
  bus_no: string;
  current_latitude: number;
  current_longitude: number;
};

type Props = {
  stops: Stop[];
  buses?: Bus[];
};

export const RouteLeafletMap = ({ stops, buses = [] }: Props) => {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (webViewRef.current && buses.length > 0) {
      const busesJson = JSON.stringify(buses);
      webViewRef.current.injectJavaScript(`updateBuses(${busesJson}); true;`);
    }
  }, [buses]);

  const centerLat = stops.length > 0 ? stops[0].latitude : 12.2958;
  const centerLng = stops.length > 0 ? stops[0].longitude : 76.6394;

  const stopsJson = JSON.stringify(stops);
  const busesJson = JSON.stringify(buses);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    .leaflet-routing-container { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const stops = ${stopsJson};
    const initialBuses = ${busesJson};
    let busMarkers = {};

    if (stops.length > 0) {
      const waypoints = stops.map(s => L.latLng(s.latitude, s.longitude));
      
      L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: '#3b82f6', weight: 4, opacity: 0.8 }]
        },
        createMarker: () => null
      }).addTo(map);
      
      stops.forEach((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;
        const color = isFirst ? '#10b981' : isLast ? '#ef4444' : '#8b5cf6';
        const icon = L.divIcon({
          html: '<svg width="32" height="32" viewBox="0 0 24 24" fill="' + color + '" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
          className: 'stop-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });
        L.marker([stop.latitude, stop.longitude], { icon }).addTo(map).bindPopup(stop.stop_name);
      });
    }

    function updateBuses(buses) {
      Object.values(busMarkers).forEach(m => map.removeLayer(m));
      busMarkers = {};
      
      buses.forEach(bus => {
        if (bus.current_latitude && bus.current_longitude) {
          const busIcon = L.divIcon({
            html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>',
            className: 'bus-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });
          const marker = L.marker([bus.current_latitude, bus.current_longitude], { icon: busIcon })
            .addTo(map)
            .bindPopup(\`<b>Bus \${bus.bus_no}</b>\`);
          busMarkers[bus.bus_id] = marker;
        }
      });
    }

    updateBuses(initialBuses);
  </script>
</body>
</html>
  `;

  return (
    <WebView
      ref={webViewRef}
      originWhitelist={["*"]}
      source={{ html }}
      style={{ flex: 1 }}
      javaScriptEnabled
      domStorageEnabled
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
