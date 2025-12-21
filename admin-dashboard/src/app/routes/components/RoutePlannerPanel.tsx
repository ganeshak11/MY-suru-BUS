'use client';

import { StopWithOffset } from './RoutePlannerMap';
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/solid';

interface Props {
  routeName: string;
  setRouteName: (name: string) => void;
  routeNo: string;
  setRouteNo: (no: string) => void;
  selectedStops: StopWithOffset[];
  onRemoveStop: (stopId: number) => void;
  onReorderStops: (reorderedStops: StopWithOffset[]) => void;
  onUpdateTimeOffset: (stopId: number, timeOffset: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  error: string | null;
}

export default function RoutePlannerPanel({ 
  routeName, setRouteName, routeNo, setRouteNo, selectedStops, onRemoveStop, onReorderStops, onUpdateTimeOffset, onSave, onCancel, isSaving, error 
}: Props) {

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selectedStops.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...selectedStops];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, movedItem);
    onReorderStops(reordered);
  };

  return (
    // --- UPDATED: Use theme colors and flex for scrolling ---
    <div className="bg-card p-4 rounded-lg border h-[500px] sm:h-[600px] lg:h-[calc(100vh-100px)] flex flex-col">
      {/* This div grows and makes the list scroll */}
      <div className="flex-1 flex flex-col min-h-0">
        <h2 className="text-2xl font-semibold tracking-tight mb-4 text-foreground">Route Details</h2>
        <div className="mb-4">
          <label htmlFor="routeNo" className="block text-sm font-medium mb-1 text-secondary">Route Number</label>
          <input
            id="routeNo"
            type="text"
            value={routeNo}
            onChange={(e) => setRouteNo(e.target.value)}
            className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
            placeholder="e.g., 178B UP"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="routeName" className="block text-sm font-medium mb-1 text-secondary">Route Name</label>
          <input
            id="routeName"
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
            placeholder="e.g., Colombo - Kandy"
          />
        </div>

        <h3 className="text-lg font-medium mb-2 text-foreground">Stops ({selectedStops.length})</h3>
        {/* --- UPDATED: Flexbox scrolling --- */}
        <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-2">
          {selectedStops.length === 0 && <p className="text-sm text-secondary">No stops added yet.</p>}
          
          {selectedStops.map((stop, index) => (
            <div key={stop.stop_id} className="p-3 rounded-md bg-background border border-secondary/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground truncate" title={stop.stop_name}>{index + 1}. {stop.stop_name}</span>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="flex flex-col">
                    <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="disabled:opacity-20 text-secondary hover:text-foreground" aria-label="Move up">
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleMove(index, 'down')} disabled={index === selectedStops.length - 1} className="disabled:opacity-20 text-secondary hover:text-foreground" aria-label="Move down">
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={() => onRemoveStop(stop.stop_id)} className="text-danger hover:text-danger/80" aria-label="Remove stop">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-secondary flex-shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={(() => {
                    const offset = stop.time_offset || '00:00:00';
                    const [hours, minutes] = offset.split(':').map(Number);
                    return hours * 60 + minutes;
                  })()}
                  onChange={(e) => {
                    const totalMinutes = parseInt(e.target.value) || 0;
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
                    onUpdateTimeOffset(stop.stop_id, formatted);
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-secondary/50 rounded bg-card text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                  aria-label={`Time offset for ${stop.stop_name}`}
                  placeholder="0"
                />
                <span className="text-xs text-secondary whitespace-nowrap">minutes from start</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer with buttons */}
      <div className="mt-4 pt-4 border-t border-secondary/30">
        {/* --- ADDED: Display error message --- */}
        {error && <p className="text-sm text-danger mb-4">{error}</p>}
        
        {/* --- UPDATED: Theme-aware buttons --- */}
        <div className="flex flex-col-reverse sm:flex-row sm:gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={onSave} 
            disabled={isSaving || !routeNo || !routeName || selectedStops.length < 2}
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 disabled:bg-secondary disabled:cursor-not-allowed sm:w-auto sm:text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      </div>
    </div>
  );
}