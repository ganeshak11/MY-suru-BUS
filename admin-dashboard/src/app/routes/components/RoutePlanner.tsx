'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import RoutePlannerPanel from './RoutePlannerPanel';
import { Stop } from '../../../lib/database.types';
import { StopWithOffset } from './RoutePlannerMap';
import { useRouter } from 'next/navigation';

// --- UPDATED: Add props for canceling or succeeding ---
interface RoutePlannerProps {
  onCancel: () => void;
  onSaveSuccess: () => void;
}

export default function RoutePlanner({ onCancel, onSaveSuccess }: RoutePlannerProps) {
  
  const router = useRouter(); // --- ADDED

  const [allStops, setAllStops] = useState<Stop[]>([]);
  const [selectedStops, setSelectedStops] = useState<StopWithOffset[]>([]);
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
    setError(null);
    if (!selectedStops.find(s => s.stop_id === stop.stop_id)) {
      setSelectedStops(prev => [...prev, { ...stop, time_offset: '00:00:00' }]);
    }
  };

  const handleRemoveStopFromRoute = (stopId: number) => {
    setSelectedStops(prev => prev.filter(s => s.stop_id !== stopId));
  };

  const handleReorderStops = (reorderedStops: StopWithOffset[]) => {
    setSelectedStops(reorderedStops);
  };

  const handleUpdateTimeOffset = (stopId: number, timeOffset: string) => {
    setSelectedStops(prev => prev.map(s => 
      s.stop_id === stopId ? { ...s, time_offset: timeOffset } : s
    ));
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
      stops: selectedStops.map((stop, index) => ({
        stop_id: stop.stop_id,
        stop_sequence: index + 1,
        time_offset_from_start: stop.time_offset || '00:00:00'
      })),
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        <div className="lg:col-span-1 h-[350px] sm:h-[450px] lg:h-[calc(100vh-130px)] rounded-lg border overflow-hidden">
          <RoutePlannerMap 
            allStops={allStops}
            selectedStops={selectedStops}
            onAddStopToRoute={handleAddStopToRoute}
          />
        </div>
        <div className="lg:col-span-1 h-[350px] sm:h-[450px] lg:h-[calc(100vh-130px)]">
          <RoutePlannerPanel 
            routeName={routeName}
            setRouteName={setRouteName}
            selectedStops={selectedStops}
            onRemoveStop={handleRemoveStopFromRoute}
            onReorderStops={handleReorderStops}
            onUpdateTimeOffset={handleUpdateTimeOffset}
            onSave={handleSaveRoute}
            onCancel={onCancel}
            isSaving={isSaving}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
