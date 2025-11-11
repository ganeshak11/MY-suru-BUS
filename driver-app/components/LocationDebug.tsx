import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  location: any;
  isTracking: boolean;
};

export const LocationDebug: React.FC<Props> = ({ location, isTracking }) => {
  const { colors } = useTheme();

  if (!__DEV__) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.title, { color: colors.primaryText }]}>Debug Info</Text>
      <Text style={[styles.text, { color: colors.secondaryText }]}>
        Tracking: {isTracking ? '✓ Active' : '✗ Inactive'}
      </Text>
      {location && (
        <>
          <Text style={[styles.text, { color: colors.secondaryText }]}>
            Lat: {location.coords.latitude.toFixed(6)}
          </Text>
          <Text style={[styles.text, { color: colors.secondaryText }]}>
            Lng: {location.coords.longitude.toFixed(6)}
          </Text>
          <Text style={[styles.text, { color: colors.secondaryText }]}>
            Accuracy: {location.coords.accuracy?.toFixed(1)}m
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
