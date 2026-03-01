/**
 * Offline arrival queue — uses apiClient (REST backend).
 * Replaces the old dead Supabase import (CRIT-05).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';

const ARRIVAL_QUEUE_KEY = 'arrival_queue';

export type QueuedArrival = {
  trip_id: number;
  stop_id: number;
  actual_arrival_time: string;
};

// Add an arrival to the persistent queue
export const queueArrival = async (arrival: QueuedArrival): Promise<void> => {
  try {
    if (!arrival || typeof arrival.trip_id !== 'number' || typeof arrival.stop_id !== 'number') {
      throw new Error('Invalid arrival data');
    }
    const raw = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    const queue: QueuedArrival[] = raw ? JSON.parse(raw) : [];
    // Deduplicate: skip if already queued for same trip+stop
    const isDuplicate = queue.some(
      (q) => q.trip_id === arrival.trip_id && q.stop_id === arrival.stop_id
    );
    if (!isDuplicate) {
      queue.push(arrival);
      await AsyncStorage.setItem(ARRIVAL_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (e: any) {
    console.error('Failed to queue arrival:', e?.message || e);
  }
};

// Flush the queue to the REST backend (CRIT-05 fix: was calling Supabase)
export const processArrivalQueue = async (): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    if (!raw) return;

    const queue: QueuedArrival[] = JSON.parse(raw);
    if (queue.length === 0) return;

    const succeeded: QueuedArrival[] = [];

    for (const arrival of queue) {
      try {
        await apiClient.markStopArrival(String(arrival.trip_id), String(arrival.stop_id));
        succeeded.push(arrival);
      } catch (err: any) {
        // Keep in queue on network failure; stop processing to preserve order
        console.error('Failed to flush arrival, will retry:', err?.message || err);
        break;
      }
    }

    if (succeeded.length > 0) {
      const remaining = queue.filter(
        (q) => !succeeded.some((s) => s.trip_id === q.trip_id && s.stop_id === q.stop_id)
      );
      await AsyncStorage.setItem(ARRIVAL_QUEUE_KEY, JSON.stringify(remaining));
    }
  } catch (e: any) {
    console.error('Failed to process arrival queue:', e?.message || e);
  }
};
