import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { calculateETAs } from '../lib/etaCalculator';

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
};

interface StopsTimelineProps {
  stops: Stop[];
  currentStopIndex: number;
  tripStartTime?: string;
  currentLocation?: { latitude: number; longitude: number };
  tripId?: number;
  busSpeed?: number | null;
}

export const StopsTimeline: React.FC<StopsTimelineProps> = ({
  stops,
  currentStopIndex,
  tripStartTime,
  currentLocation,
  tripId,
  busSpeed,
}) => {
  const { colors } = useTheme();
  const [predictedTimes, setPredictedTimes] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!currentLocation || stops.length === 0) return;

    const etas = calculateETAs(
      currentLocation.latitude,
      currentLocation.longitude,
      stops,
      busSpeed
    );

    const times: Record<number, string> = {};
    Object.entries(etas).forEach(([stopId, etaDate]) => {
      times[Number(stopId)] = etaDate.toISOString();
    });
    setPredictedTimes(times);
  }, [currentLocation, stops, busSpeed]);

  const isCompleted = (index: number) => stops[index]?.status === 'Completed';
  const isCurrent = (index: number) => index === currentStopIndex && currentLocation !== undefined;

  return (
    <View style={{ paddingVertical: 16, paddingHorizontal: 20 }}>
      {stops.map((stop, index) => {
        const completed = isCompleted(index);
        const current = isCurrent(index);

        return (
          <View key={`${stop.stop_id}-${stop.stop_sequence}`} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 }}>
              <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, flexShrink: 0 }}>
                <View style={{
                  width: current ? 56 : 48,
                  height: current ? 56 : 48,
                  borderRadius: current ? 28 : 24,
                  backgroundColor: completed ? '#10b981' : current ? colors.primaryAccent : colors.primaryAccent + '20',
                  borderWidth: 2,
                  borderColor: completed ? '#10b981' : colors.primaryAccent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {completed ? (
                    <Text style={{ fontSize: 24, color: '#10b981', fontWeight: '700' }}>✓</Text>
                  ) : (
                    <Text style={{ fontSize: current ? 20 : 18, fontWeight: '700', color: current ? '#fff' : colors.primaryAccent }}>
                      {stop.stop_sequence}
                    </Text>
                  )}
                </View>
                {current && (
                  <View style={{ position: 'absolute', right: -8, top: -8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryAccent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                      <Ionicons name="bus" size={16} color="#fff" />
                    </View>
                  </View>
                )}
              </View>

              <View style={{ flex: 1, paddingVertical: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                  <Text style={{
                    fontSize: current ? 16 : 15,
                    fontWeight: current ? '700' : '600',
                    color: completed ? colors.secondaryText : current ? colors.primaryAccent : colors.primaryText,
                    flex: 1,
                    textDecorationLine: completed ? 'line-through' : 'none',
                  }} numberOfLines={2}>
                    {stop.stop_name}
                  </Text>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {stop.time_offset_from_start !== undefined && tripStartTime && (() => {
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
                    {(() => {
                      if (!completed && predictedTimes[stop.stop_id] && currentLocation) {
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
                            <Text style={{ fontSize: 11, fontWeight: '600', color: isOnTime ? '#10b981' : '#ef4444' }}>
                              {etaHours}:{String(etaMinutes).padStart(2, '0')}
                            </Text>
                          );
                        }
                      }
                      return null;
                    })()}
                  </View>
                </View>
                {completed && (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#10b981', backgroundColor: '#10b981' + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }}>
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
