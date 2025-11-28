import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, Modal } from "react-native";
import { WebView } from "react-native-webview";
import { LocationObject } from "expo-location";
import { Ionicons } from "@expo/vector-icons";

type Stop = {
  latitude: number;
  longitude: number;
  stop_name: string;
};

type LeafletMapProps = {
  location: LocationObject;
  stops?: Stop[];
};

export const LeafletMap: React.FC<LeafletMapProps> = ({ location, stops = [] }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { latitude, longitude } = location.coords;

  const html = React.useMemo(() => {
    const stopsJson = JSON.stringify(stops);
    return `
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
          const map = L.map('map').setView([${latitude}, ${longitude}], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          
          const busIcon = L.divIcon({
            html: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>',
            className: 'bus-marker',
            iconSize: [10, 10],
            iconAnchor: [20, 20]
          });
          
          L.marker([${latitude}, ${longitude}], { icon: busIcon }).addTo(map);
          
          const stops = ${stopsJson};
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
              L.marker([stop.latitude, stop.longitude], { icon }).addTo(map)
                .bindPopup(stop.stop_name);
            });
          }
        </script>
      </body>
    </html>
  `;
  }, [latitude, longitude, stops]);

  const renderMapContent = () => (
    <>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
      />
      <TouchableOpacity 
        style={styles.enlargeButton} 
        onPress={() => setIsFullscreen(!isFullscreen)}
      >
        <Ionicons name={isFullscreen ? "contract" : "expand"} size={20} color="#333" />
      </TouchableOpacity>
    </>
  );

  return (
    <>
      <View style={styles.container}>
        {renderMapContent()}
      </View>
      <Modal visible={isFullscreen} animationType="slide">
        <View style={styles.fullscreenContainer}>
          {renderMapContent()}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  enlargeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fullscreenContainer: {
    flex: 1,
  },
});
