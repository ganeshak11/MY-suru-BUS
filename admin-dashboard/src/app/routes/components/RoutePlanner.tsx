'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import RoutePlannerPanel from './RoutePlannerPanel';
import { Stop } from '../../../lib/database.types';
import { useRouter } from 'next/navigation'; // --- ADDED: For navigation

// --- UPDATED: Add props for canceling or succeeding ---
interface RoutePlannerProps {
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export default function RoutePlanner({ onCancel, onSaveSuccess }: RoutePlannerProps) {
  const supabase = createClientComponentClient();
  const router = useRouter(); // --- ADDED

  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [selectedStops, setSelectedStops] = useState<Stop[]>([]);
  const [routeName, setRouteName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // --- ADDED: State for errors ---
  const [error, setError] = useState<string | null>(null);

  const RoutePlannerMap = useMemo(() => dynamic(() => import('./RoutePlannerMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background flex items-center justify-center z-0"><p>Loading Map...</p></div>,
  }), []);

  useEffect(() => {
    const fetchStops = async () => {
      const { data, error } = await supabase.from('stops').select('*');
      if (data) setAllStops(data as Stop[]);
      if (error) console.error('Error fetching stops:', error);
    };
    fetchStops();
  }, [supabase]);

  const handleAddStopToRoute = (stop: Stop) => {
    setError(null); // Clear error on interaction
    if (!selectedStops.find(s => s.stop_id === stop.stop_id)) {
      setSelectedStops(prev => [...prev, stop]);
    }
  };

  const handleRemoveStopFromRoute = (stopId: number) => {
    setSelectedStops(prev => prev.filter(s => s.stop_id !== stopId));
  };

  const handleReorderStops = (reorderedStops: Stop[]) => {
    setSelectedStops(reorderedStops);
  };

  const handleSaveRoute = async () => {
    setError(null); // Clear old errors
    if (!routeName) {
      setError('Route Name is required.');
      return;
    }
    if (selectedStops.length < 2) {
      setError('You must select at least two stops for a route.');
      return;
    }
    
    setIsSaving(true);

    const payload = {
      routeName: routeName,
      // --- FIX: Send only the stop IDs ---
      stops: selectedStops.map(stop => stop.stop_id),
    };

    // --- UPDATED: Assumes 'create-route' is the new function name ---
    const { error } = await supabase.functions.invoke('create-route', {
      body: payload,
    });

    if (error) {
      // --- UPDATED: Use error state instead of alert ---
      console.error('Error saving route:', error);
      setError(`Error saving route: ${error.message}`);
    } else {
      // --- UPDATED: Use success callback instead of alert ---
      // alert('Route saved successfully!');
      setRouteName('');
      setSelectedStops([]);
      // Call the success prop (which will trigger setView('list') in the parent)
      onSaveSuccess();
    }

    setIsSaving(false);
  };

  return (
    // --- UPDATED: Use theme background and padding ---
    <div className="flex flex-col h-full p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Interactive Route Planner</h1>
        <p className="text-secondary">Click stops on the map to add them, then drag to reorder.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        <div className="lg:col-span-2 h-[calc(100vh-220px)] rounded-lg border overflow-hidden">
          <RoutePlannerMap 
            allStops={allStops}
            selectedStops={selectedStops}
            onAddStopToRoute={handleAddStopToRoute}
          />
        </div>
        <div className="lg:col-span-1 h-[calc(100vh-220px)]">
          <RoutePlannerPanel 
            routeName={routeName}
            setRouteName={setRouteName}
            selectedStops={selectedStops}
            onRemoveStop={handleRemoveStopFromRoute}
            onReorderStops={handleReorderStops}
            onSave={handleSaveRoute}
            onCancel={onCancel} // --- ADDED ---
            isSaving={isSaving}
            error={error} // --- ADDED ---
          />
        </div>
      </div>
    </div>
  );
}