import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, themeTokens } from '../contexts/ThemeContext';
import { getDistance } from '../lib/helpers';

type Stop = {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  status: string;
  cumulativeDistance?: number;
  time_offset_from_start?: number;
  scheduledArrivalTime?: string;
};

interface StopsTimelineProps {
  stops: Stop[];
  currentStopIndex: number;
  eta?: string;
  tripStartTime?: string;
  distanceToStop?: number;
  currentLocation?: { latitude: number; longitude: number };
}

export const StopsTimeline: React.FC<StopsTimelineProps> = ({
  stops,
  currentStopIndex,
  eta,
  tripStartTime,
  distanceToStop = 0,
  currentLocation,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const busPositionAnim = useRef(new Animated.Value(0)).current;

  // Calculate bus position between stops
  const calculateBusPosition = (): number => {
    if (!currentLocation) return 0;
    
    // If all stops completed, stay at last stop
    if (currentStopIndex >= stops.length) {
      return (stops.length - 1) * 64;
    }
    
    if (currentStopIndex === 0) return 0;

    const prevStop = stops[currentStopIndex - 1];
    const nextStop = stops[currentStopIndex];

    const totalDistance = getDistance(
      { latitude: prevStop.latitude, longitude: prevStop.longitude },
      { latitude: nextStop.latitude, longitude: nextStop.longitude }
    );

    const distanceFromPrev = getDistance(
      { latitude: prevStop.latitude, longitude: prevStop.longitude },
      currentLocation
    );

    const progress = Math.min(Math.max(distanceFromPrev / totalDistance, 0), 1);
    const position = (currentStopIndex - 1 + progress) * 64;
    
    // Limit position to last stop
    const maxPosition = (stops.length - 1) * 64;
    return Math.min(position, maxPosition);
  };

  useEffect(() => {
    const targetPosition = calculateBusPosition();
    Animated.spring(busPositionAnim, {
      toValue: targetPosition,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [currentLocation, currentStopIndex]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getScheduledAndDelayStatus = (stop: Stop): { scheduledTime: string; isDelayed: boolean } | null => {
    if (!stop.scheduledArrivalTime || !eta) {
      return null;
    }

    try {
      // Parse scheduled arrival time
      const scheduledTime = new Date(stop.scheduledArrivalTime);
      if (isNaN(scheduledTime.getTime())) {
        return null;
      }
      const scheduledTimeStr = formatTime(stop.scheduledArrivalTime);

      // Parse ETA: extract minutes from "X min" or "Arriving" format
      let etaMinutes = 0;
      const etaMatch = eta.match(/\d+/);
      if (etaMatch) {
        etaMinutes = parseInt(etaMatch[0]);
      } else if (eta.toLowerCase() === 'arriving') {
        etaMinutes = 0; // Already arriving
      }

      if (etaMinutes < 0) {
        return null;
      }

      const now = new Date();
      const estimatedArrivalTime = new Date(now.getTime() + etaMinutes * 60000);

      // Check if delayed: estimated > scheduled (with 5 minute grace period)
      const delayThreshold = 5 * 60000; // 5 minutes in ms
      const isDelayed = (estimatedArrivalTime.getTime() - scheduledTime.getTime()) > delayThreshold;

      return { scheduledTime: scheduledTimeStr, isDelayed };
    } catch (e) {
      console.warn('Error calculating delay status:', e);
      return null;
    }
  };

  const isCompleted = (index: number) => stops[index]?.status === 'Completed';
  const isCurrent = (index: number) => index === currentStopIndex;

  return (
    <View style={styles.container}>
      {/* Vertical Timeline Line */}
      <View style={styles.timelineLineContainer}>
        {stops.map((_, index) => {
          if (index === stops.length - 1) return null;
          const isCompleted = index < currentStopIndex;
          return (
            <View
              key={`line-${index}`}
              style={[
                styles.timelineLine,
                isCompleted ? styles.timelineLineSolid : styles.timelineLineDotted,
              ]}
            />
          );
        })}
      </View>

      {/* Animated Bus Icon */}
      <Animated.View
        style={[
          styles.animatedBusIcon,
          {
            transform: [{ translateY: busPositionAnim }],
          },
        ]}
      >
        <View style={[styles.busIconMoving, { backgroundColor: colors.primaryAccent }]}>
          <Ionicons name="bus" size={18} color="#fff" />
        </View>
      </Animated.View>

      {/* Stops */}
      {stops.map((stop, index) => {
        const completed = isCompleted(index);
        const current = isCurrent(index);

        return (
          <View key={`${stop.stop_id}-${stop.stop_sequence}`} style={styles.stopItemContainer}>
            <View style={styles.stopContent}>
              {/* Stop Circle */}
              <View style={styles.stopCircleContainer}>
                <View
                  style={[
                    styles.stopCircle,
                    current && styles.stopCircleCurrent,
                    completed && styles.stopCircleCompleted,
                    !completed && !current && styles.stopCircleUpcoming,
                  ]}
                >
                  {completed ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Text style={[styles.stopNumber, current && styles.stopNumberCurrent]}>
                      {stop.stop_sequence}
                    </Text>
                  )}
                </View>
              </View>

              {/* Stop Details */}
              <View style={styles.detailsContainer}>
                <View style={styles.headerRow}>
                  <Text
                    style={[
                      styles.stopName,
                      completed && styles.stopNameCompleted,
                      current && styles.stopNameCurrent,
                    ]}
                    numberOfLines={2}
                  >
                    {stop.stop_name}
                  </Text>
                  {stop.time_offset_from_start !== undefined && tripStartTime && (() => {
                    const [startHours, startMinutes] = tripStartTime.split(':').map(Number);
                    const startTotalMinutes = (startHours * 60) + startMinutes;
                    const scheduledTotalMinutes = startTotalMinutes + stop.time_offset_from_start;
                    const scheduledHours = Math.floor(scheduledTotalMinutes / 60) % 24;
                    const scheduledMinutes = scheduledTotalMinutes % 60;
                    return (
                      <Text style={[
                        styles.offsetTime,
                        completed && styles.offsetTimeCompleted,
                        current && styles.offsetTimeCurrent,
                      ]}>
                        {scheduledHours}:{String(scheduledMinutes).padStart(2, '0')}
                      </Text>
                    );
                  })()}
                </View>

                {/* Distance and Status */}
                <View style={styles.metaRow}>
                  {stop.cumulativeDistance !== undefined && (
                    <View style={styles.cumulativeDistanceContainer}>
                      <Ionicons name="navigate" size={12} color={colors.primaryAccent} />
                      <Text style={styles.cumulativeDistanceText}>
                        {formatDistance(stop.cumulativeDistance)}
                      </Text>
                    </View>
                  )}
                  {completed && <Text style={styles.completedBadgeText}>Completed</Text>}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const createStyles = (colors: typeof themeTokens.light) =>
  StyleSheet.create({
    container: {
      paddingVertical: 16,
      position: 'relative',
    },
    timelineLineContainer: {
      position: 'absolute',
      left: 28,
      top: 48,
      width: 3,
      height: '100%',
    },
    timelineLine: {
      width: 3,
      height: 64,
    },
    timelineLineSolid: {
      backgroundColor: colors.primaryAccent,
    },
    timelineLineDotted: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primaryAccent + '40',
      borderStyle: 'dotted',
    },
    animatedBusIcon: {
      position: 'absolute',
      left: 12,
      top: 32,
      zIndex: 10,
    },
    busIconMoving: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.cardBackground,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    stopItemContainer: {
      height: 64,
      justifyContent: 'center',
    },
    stopContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    stopCircleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: 56,
      flexShrink: 0,
    },
    stopCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.primaryAccent,
      backgroundColor: colors.cardBackground,
    },
    stopCircleCurrent: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 4,
      borderColor: colors.primaryAccent,
      backgroundColor: colors.primaryAccent,
      shadowColor: colors.primaryAccent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 8,
    },
    stopCircleCompleted: {
      backgroundColor: colors.primaryAccent,
      borderColor: colors.primaryAccent,
    },
    stopCircleUpcoming: {
      borderColor: colors.primaryAccent + '60',
      backgroundColor: colors.cardBackground,
    },
    stopNumber: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryAccent,
    },
    stopNumberCurrent: {
      color: '#fff',
      fontSize: 18,
    },
    detailsContainer: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 4,
    },
    stopName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primaryText,
      flex: 1,
    },
    stopNameCurrent: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.primaryText,
    },
    stopNameCompleted: {
      color: colors.secondaryText,
    },
    etaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3b82f6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    etaText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    cumulativeDistanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryAccent + '10',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primaryAccent + '30',
    },
    cumulativeDistanceText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryAccent,
    },
    distanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryAccent + '15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    distanceText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryAccent,
    },
    completedBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#10b981',
      backgroundColor: '#10b981' + '15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    nextBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primaryAccent,
      backgroundColor: colors.primaryAccent + '15',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border + '20',
    },
    scheduledTimeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primaryText,
    },
    scheduledTimeValue: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primaryText,
    },
    delayStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#10b981' + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginLeft: 'auto',
    },
    delayedBadge: {
      backgroundColor: '#ef4444' + '20',
    },
    delayStatusText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#10b981',
    },
    delayedText: {
      color: '#ef4444',
    },
    offsetTime: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    offsetTimeCompleted: {
      color: '#10b981',
    },
    offsetTimeCurrent: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primaryText,
    },
  });
