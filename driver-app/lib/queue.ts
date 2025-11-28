import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabaseClient";

const ARRIVAL_QUEUE_KEY = "arrival_queue";

export type QueuedArrival = {
  trip_id: number;
  stop_id: number;
  actual_arrival_time: string;
};

// Add an arrival to the queue
export const queueArrival = async (arrival: QueuedArrival) => {
  try {
    if (!arrival || typeof arrival.trip_id !== 'number' || typeof arrival.stop_id !== 'number') {
      throw new Error('Invalid arrival data');
    }
    
    const existingQueue = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    const queue: QueuedArrival[] = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push(arrival);
    await AsyncStorage.setItem(ARRIVAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (e: any) {
    const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
    console.error("Failed to queue arrival:", errorMsg);
  }
};

// Process the queue
export const processArrivalQueue = async () => {
  try {
    const existingQueue = await AsyncStorage.getItem(ARRIVAL_QUEUE_KEY);
    if (!existingQueue) return;

    const queue: QueuedArrival[] = JSON.parse(existingQueue);
    if (queue.length === 0) return;

    console.log(`Processing arrival queue with ${queue.length} items.`);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Queue processing timeout')), 15000)
    );
    
    const insertPromise = supabase.from("trip_stop_times").insert(queue);
    
    const { error } = await Promise.race([insertPromise, timeoutPromise]) as any;

    if (error) {
      if (error.code === '23505') {
        await AsyncStorage.removeItem(ARRIVAL_QUEUE_KEY);
        return;
      }
      throw new Error(error.message || 'Failed to insert queue items');
    }

    await AsyncStorage.removeItem(ARRIVAL_QUEUE_KEY);
    console.log("Arrival queue processed and cleared.");
  } catch (e: any) {
    const errorMsg = e?.message?.replace(/[\r\n]/g, ' ') || 'Unknown error';
    console.error("Failed to process arrival queue:", errorMsg);
  }
};
