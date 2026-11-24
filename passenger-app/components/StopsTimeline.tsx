import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { calculateETAs } from '../lib/etaCalculator';

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

type Stop = {
  stop_id: number;
  stop_name: string;
  stop_sequence: number;
  latitude: number;
  longitude: number;
  geofence_radius_meters?: number;
  status?: string;
  time_offset_from_start?: number;
  predicted_arrival_time?: string;
  actual_arrival_time?: string;
};

interface StopsTimelineProps {
  stops: Stop[];
  currentStopIndex: number;
  tripStartTime?: string;
  currentLocation?: { latitude: number; longitude: number };
  tripId?: number;
  busSpeed?: number | null;
  /** Server times per stop_id (ISO). When given, these replace the on-phone ETA guess. */
  times?: Record<number, { scheduled?: string | null; eta?: string | null; arrived?: string | null }>;
}

// HH:MM in India time.
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

export const StopsTimeline: React.FC<StopsTimelineProps> = ({
  stops,
  currentStopIndex,
  tripStartTime,
  currentLocation,
  tripId,
  busSpeed,
  times,
}) => {
  const { colors } = useTheme();
  const [predictedTimes, setPredictedTimes] = useState<Record<number, string>>({});
  const busPositionAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (times || !currentLocation || stops.length === 0) return;

    const etas = calculateETAs(
      currentLocation.latitude,
      currentLocation.longitude,
      stops,
      busSpeed
    );

    const computed: Record<number, string> = {};
    Object.entries(etas).forEach(([stopId, etaDate]) => {
      computed[Number(stopId)] = etaDate.toISOString();
    });
    setPredictedTimes(computed);
  }, [currentLocation, stops, busSpeed, times]);

  const isCompleted = (index: number) => stops[index]?.status === 'Completed';
  const isCurrent = (index: number) => index === currentStopIndex && currentLocation !== undefined;

  return (
    <View style={{ paddingVertical: 16, paddingHorizontal: 20, position: 'relative' }}>
      {/* Vertical Timeline Line */}
      <View style={{ position: 'absolute', left: 48, top: 48, width: 3, height: '100%' }}>
        {stops.map((_, index) => {
          if (index === stops.length - 1) return null;
          const isCompleted = index < currentStopIndex;
          return (
            <View
              key={`line-${index}`}
              style={[
                { width: 3, height: 64 },
                isCompleted
                  ? { backgroundColor: colors.primaryAccent }
                  : { borderLeftWidth: 3, borderLeftColor: colors.primaryAccent + '40', borderStyle: 'dotted' },
              ]}
            />
          );
        })}
      </View>

      {/* Animated Bus Icon */}
      {currentLocation && (
        <Animated.View
          style={[
            { position: 'absolute', left: 32, top: 32, zIndex: 10 },
            { transform: [{ translateY: busPositionAnim }] },
          ]}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.cardBackground, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
            <Ionicons name="bus" size={18} color="#fff" />
          </View>
        </Animated.View>
      )}

      {/* Stops */}
      {stops.map((stop, index) => {
        const completed = isCompleted(index);
        const current = isCurrent(index);

        return (
          <View key={`${stop.stop_id}-${stop.stop_sequence}`} style={{ height: 64, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 56, height: 56, flexShrink: 0 }}>
                <View style={{
                  width: current ? 48 : 40,
                  height: current ? 48 : 40,
                  borderRadius: current ? 24 : 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: current ? 4 : 3,
                  borderColor: completed || current ? colors.primaryAccent : colors.primaryAccent + '60',
                  backgroundColor: completed || current ? colors.primaryAccent : colors.cardBackground,
                  shadowColor: current ? colors.primaryAccent : undefined,
                  shadowOffset: current ? { width: 0, height: 0 } : undefined,
                  shadowOpacity: current ? 0.6 : undefined,
                  shadowRadius: current ? 12 : undefined,
                  elevation: current ? 8 : undefined,
                }}>
                  {completed ? (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  ) : (
                    <Text style={{ fontSize: current ? 18 : 16, fontWeight: '700', color: current ? '#fff' : colors.primaryAccent }}>
                      {stop.stop_sequence}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <Text style={{
                    fontSize: current ? 17 : 15,
                    fontWeight: current ? '700' : '600',
                    color: completed ? colors.secondaryText : current ? colors.primaryText : colors.primaryText,
                    flex: 1,
                  }} numberOfLines={2}>
                    {stop.stop_name}
                  </Text>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {/* Server times: scheduled (grey), then arrival or ETA */}
                    {times?.[stop.stop_id]?.scheduled && (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondaryText }}>
                        {clock(times[stop.stop_id].scheduled!)}
                      </Text>
                    )}
                    {times && completed && times[stop.stop_id]?.arrived && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                        {clock(times[stop.stop_id].arrived!)}
                      </Text>
                    )}
                    {times && !completed && times[stop.stop_id]?.eta && (() => {
                      const t = times[stop.stop_id];
                      const late = t.scheduled ? new Date(t.eta!).getTime() - new Date(t.scheduled).getTime() > 60_000 : false;
                      return (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: late ? '#b91c1c' : '#047857' }}>
                          {late ? 'Expected ' : 'On time '}{clock(t.eta!)}
                        </Text>
                      );
                    })()}
                    {/* Always show scheduled time in grey */}
                    {!times && stop.time_offset_from_start !== undefined && tripStartTime && (() => {
                      const [startHours, startMinutes] = tripStartTime.split(':').map(Number);
                      const startTotalMinutes = (startHours * 60) + startMinutes;
                      const scheduledTotalMinutes = startTotalMinutes + stop.time_offset_from_start;
                      const scheduledHours = Math.floor(scheduledTotalMinutes / 60) % 24;
                      const scheduledMinutes = scheduledTotalMinutes % 60;
                      return (
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondaryText }}>
                          {scheduledHours}:{String(scheduledMinutes).padStart(2, '0')}
                        </Text>
                      );
                    })()}
                    {/* Show actual arrival time for completed, predicted for pending */}
                    {!times && completed && stop.actual_arrival_time ? (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                        {new Date(stop.actual_arrival_time).toLocaleTimeString('en-IN', { 
                          timeZone: 'Asia/Kolkata',
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}
                      </Text>
                    ) : !times && !completed && predictedTimes[stop.stop_id] && currentLocation && (() => {
                      const predictedTime = new Date(predictedTimes[stop.stop_id]);
                      const etaHours = predictedTime.getHours();
                      const etaMinutes = predictedTime.getMinutes();
                      
                      if (tripStartTime && stop.time_offset_from_start !== undefined) {
                        const [startHours, startMinutes] = tripStartTime.split(':').map(Number);
                        const startTotalMinutes = (startHours * 60) + startMinutes;
                        const scheduledTotalMinutes = startTotalMinutes + stop.time_offset_from_start;
                        const scheduledTime = new Date();
                        scheduledTime.setHours(Math.floor(scheduledTotalMinutes / 60) % 24, scheduledTotalMinutes % 60, 0, 0);
                        const isOnTime = predictedTime.getTime() <= scheduledTime.getTime();
                        return (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isOnTime ? '#047857' : '#b91c1c' }}>
                            {etaHours}:{String(etaMinutes).padStart(2, '0')}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </View>
                {completed && (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#047857', backgroundColor: '#10b981' + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
                    Completed
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};
