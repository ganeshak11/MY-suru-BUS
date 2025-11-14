import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const BusCardSkeleton = () => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
    },
    line: {
      height: 20,
      backgroundColor: colors.secondaryText + '30',
      borderRadius: 4,
      marginBottom: 8,
    },
  });

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={[styles.line, { width: '40%' }]} />
      <View style={[styles.line, { width: '70%' }]} />
      <View style={[styles.line, { width: '50%' }]} />
    </Animated.View>
  );
};
