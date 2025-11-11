import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, themeTokens } from '../contexts/ThemeContext';

type Stop = {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  status: string;
  cumulativeDistance?: number; // Distance from start point to this stop
time_offset_from_start?: number; // Offset in minutes from trip start
  scheduledArrivalTime?: string; // ISO string of scheduled arrival time
};

interface StopsTimelineProps {
  stops: Stop[];
  currentStopIndex: number;
  eta?: string;
  tripStartTime?: string; // Trip start time as ISO string
  distanceToStop?: number; // in meters
  currentLocation?: { latitude: number; longitude: number }; // Current driver location
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

  const getDistance = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number => {
    const R = 6371e3;
    const φ1 = (from.latitude * Math.PI) / 180;
    const φ2 = (to.latitude * Math.PI) / 180;
    const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
    const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateETA = (stop: Stop, index: number): { etaMinutes: number; scheduledMinutes: number } | null => {
    if (!tripStartTime || stop.time_offset_from_start === undefined || !currentLocation) return null;
    
    const scheduledMinutes = stop.time_offset_from_start;
    
    if (index < currentStopIndex) return { etaMinutes: 0, scheduledMinutes };
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tripStart = new Date(`${today}T${tripStartTime}`);
    const elapsedMinutes = Math.round((now.getTime() - tripStart.getTime()) / 60000);
    
    // Calculate current delay
    const currentStopScheduled = stops[currentStopIndex]?.time_offset_from_start || 0;
    const currentDelay = elapsedMinutes - currentStopScheduled;
    
    if (index === currentStopIndex) {
      const distanceMeters = getDistance(currentLocation, { latitude: stop.latitude, longitude: stop.longitude });
      const distanceKm = distanceMeters / 1000;
      const speedKmh = 15;
      const travelMinutes = Math.round((distanceKm / speedKmh) * 60);
      return { etaMinutes: elapsedMinutes + travelMinutes, scheduledMinutes };
    }
    
    // For future stops: scheduled time + current delay + additional travel time
    let additionalDistance = 0;
    additionalDistance += getDistance(currentLocation, { latitude: stops[currentStopIndex].latitude, longitude: stops[currentStopIndex].longitude });
    
    for (let i = currentStopIndex; i < index; i++) {
      additionalDistance += getDistance(
        { latitude: stops[i].latitude, longitude: stops[i].longitude },
        { latitude: stops[i + 1].latitude, longitude: stops[i + 1].longitude }
      );
    }
    
    const additionalDistanceKm = additionalDistance / 1000;
    const speedKmh = 15;
    const additionalMinutes = Math.round((additionalDistanceKm / speedKmh) * 60);
    
    // Predicted ETA = scheduled time + current delay + (actual travel time - scheduled travel time between stops)
    const scheduledTravelTime = scheduledMinutes - currentStopScheduled;
    const delayPropagation = Math.max(0, additionalMinutes - scheduledTravelTime);
    const predictedETA = scheduledMinutes + currentDelay + delayPropagation;
    
    return { etaMinutes: predictedETA, scheduledMinutes };
  };

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
      {stops.map((stop, index) => {
        const completed = isCompleted(index);
        const current = isCurrent(index);
        const isNext = index === currentStopIndex + 1;

        return (
          <View key={`${stop.stop_id}-${stop.stop_sequence}`} style={styles.stopItemContainer}>
            {/* Stop Circle and Content */}
            <View style={styles.stopContent}>
              {/* Bus Icon and Circle */}
              <View style={styles.stopCircleContainer}>
                {/* Main circle */}
                <View
                  style={[
                    styles.stopCircle,
                    current && styles.stopCircleCurrent,
                    completed && styles.stopCircleCompleted,
                  ]}
                >
                  {completed ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text style={[styles.stopNumber, current && styles.stopNumberCurrent]}>
                      {stop.stop_sequence}
                    </Text>
                  )}
                </View>

                {/* Bus Icon for current stop */}
                {current && (
                  <View style={styles.busIconContainer}>
                    <View style={[styles.busIcon, { backgroundColor: colors.primaryAccent }]}>
                      <Ionicons name="bus" size={16} color="#fff" />
                    </View>
                  </View>
                )}
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
                  <View style={styles.timeColumn}>
                    {stop.time_offset_from_start !== undefined && tripStartTime && (() => {
                      const [startHours, startMinutes] = tripStartTime.split(':').map(Number);
                      const startTotalMinutes = (startHours * 60) + startMinutes;
                      const scheduledTotalMinutes = startTotalMinutes + stop.time_offset_from_start;
                      const scheduledHours = Math.floor(scheduledTotalMinutes / 60) % 24;
                      const scheduledMinutes = scheduledTotalMinutes % 60;
                      return (
                        <Text style={styles.offsetTime}>
                          {scheduledHours}:{String(scheduledMinutes).padStart(2, '0')}
                        </Text>
                      );
                    })()}
                    {(() => {
                      const etaData = calculateETA(stop, index);
                      if (etaData && !completed && tripStartTime) {
                        const isOnTime = etaData.etaMinutes <= etaData.scheduledMinutes;
                        const [startHours, startMinutes] = tripStartTime.split(':').map(Number);
                        const startTotalMinutes = (startHours * 60) + startMinutes;
                        const etaTotalMinutes = startTotalMinutes + etaData.etaMinutes;
                        const etaHours = Math.floor(etaTotalMinutes / 60) % 24;
                        const etaMinutes = etaTotalMinutes % 60;
                        return (
                          <Text style={[styles.etaTime, isOnTime ? styles.etaOnTime : styles.etaDelayed]}>
                            {etaHours}:{String(etaMinutes).padStart(2, '0')}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </View>

                {/* Distance and Status */}
                <View style={styles.metaRow}>
                  {/* Distance from start point */}
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

                {/* Scheduled time and delay status (only for current stop) */}
                {current && stop.scheduledArrivalTime && (() => {
                  const delayInfo = getScheduledAndDelayStatus(stop);
                  return delayInfo ? (
                    <View style={styles.scheduleRow}>
                      <Text style={styles.scheduledTimeLabel}>Scheduled: </Text>
                      <Text style={styles.scheduledTimeValue}>{delayInfo.scheduledTime}</Text>
                      <View style={[styles.delayStatusBadge, delayInfo.isDelayed && styles.delayedBadge]}>
                        <Ionicons 
                          name={delayInfo.isDelayed ? "alert-circle" : "checkmark-circle"} 
                          size={12} 
                          color={delayInfo.isDelayed ? "#ef4444" : "#10b981"}
                        />
                        <Text style={[styles.delayStatusText, delayInfo.isDelayed && styles.delayedText]}>
                          {delayInfo.isDelayed ? "Delayed" : "On Time"}
                        </Text>
                      </View>
                    </View>
                  ) : null;
                })()}
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
    },
    stopItemContainer: {
      marginBottom: 8,
    },
    stopContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 8,
    },
    stopCircleContainer: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: 56,
      flexShrink: 0,
    },
    stopCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryAccent + '20',
      borderWidth: 2,
      borderColor: colors.primaryAccent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopCircleCurrent: {
      backgroundColor: colors.primaryAccent,
      borderColor: colors.primaryAccent,
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    stopCircleCompleted: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    stopNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primaryAccent,
    },
    stopNumberCurrent: {
      color: '#fff',
      fontSize: 20,
    },
    checkmark: {
      fontSize: 24,
      color: '#10b981',
      fontWeight: '700',
    },
    busIconContainer: {
      position: 'absolute',
      right: -8,
      top: -8,
    },
    busIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#fff',
    },
    detailsContainer: {
      flex: 1,
      paddingVertical: 4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 6,
    },
    stopName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primaryText,
      flex: 1,
    },
    stopNameCurrent: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primaryAccent,
    },
    stopNameCompleted: {
      color: colors.secondaryText,
      textDecorationLine: 'line-through',
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
    timeColumn: {
      alignItems: 'flex-end',
      gap: 2,
    },
    offsetTime: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.secondaryText,
    },
    etaTime: {
      fontSize: 11,
      fontWeight: '600',
    },
    etaOnTime: {
      color: '#10b981',
    },
    etaDelayed: {
      color: '#ef4444',
    },
  });
