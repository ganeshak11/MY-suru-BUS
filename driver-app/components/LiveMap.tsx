import React, { useRef, useEffect, useState } from "react";
import MapView, { Marker, Region, UrlTile } from "react-native-maps";
import { StyleSheet, View, Text } from "react-native";
import { LocationObject } from "expo-location";

type LiveMapProps = {
  location: LocationObject;
};

export const LiveMap: React.FC<LiveMapProps> = ({ location }) => {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const { latitude, longitude } = location.coords;

  const region: Region = React.useMemo(() => ({
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }), [latitude, longitude]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [location]);

  return (
    <View style={styles.map}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType="none"
        initialRegion={region}
        showsUserLocation={false}
        onMapReady={() => setMapReady(true)}
        legalLabelInsets={{ top: 0, left: 0, bottom: -100, right: -100 }}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* OpenStreetMap tile layer for map rendering */}
        <UrlTile
          // Tile URL pattern: {z}=zoom level, {x}=tile column, {y}=tile row
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          minimumZ={1}
          shouldReplaceMapContent={true}
          zIndex={-1}
        />
        <Marker coordinate={{ latitude, longitude }}>
          <View style={styles.markerContainer}>
            <Text style={styles.markerEmoji}>🚌</Text>
          </View>
        </Marker>
      </MapView>
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
  },
  markerContainer: {
    padding: 5,
  },
  markerEmoji: {
    fontSize: 26,
  },
  stopMarker: {
    padding: 3,
  },
  stopEmoji: {
    fontSize: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
