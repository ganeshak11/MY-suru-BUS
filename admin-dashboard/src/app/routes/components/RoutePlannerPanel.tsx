'use client';

import { Stop } from '../../../lib/database.types';
// --- ADDED: Icons for buttons ---
import { ArrowUpIcon, ArrowDownIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Props {
  routeName: string;
  setRouteName: (name: string) => void;
  selectedStops: Stop[];
  onRemoveStop: (stopId: number) => void;
  onReorderStops: (reorderedStops: Stop[]) => void;
  onSave: () => void;
  onCancel: () => void; // --- ADDED
  isSaving: boolean;
  error: string | null; // --- ADDED
}

export default function RoutePlannerPanel({ 
  routeName, setRouteName, selectedStops, onRemoveStop, onReorderStops, onSave, onCancel, isSaving, error 
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
          <label htmlFor="routeName" className="block text-sm font-medium mb-1 text-secondary">Route Name</label>
          <input
            id="routeName"
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            // --- UPDATED: Theme-aware input ---
            className="w-full p-2 border border-secondary/50 rounded-md bg-background text-foreground focus:border-primary focus:ring-primary"
            placeholder="e.g., K.R. Hospital to Infosys"
          />
        </div>

        <h3 className="text-lg font-medium mb-2 text-foreground">Stops ({selectedStops.length})</h3>
        {/* --- UPDATED: Flexbox scrolling --- */}
        <div className="flex-1 space-y-2 overflow-y-auto min-h-0 pr-2">
          {selectedStops.length === 0 && <p className="text-sm text-secondary">No stops added yet.</p>}
          
          {selectedStops.map((stop, index) => (
            <div key={stop.stop_id} className="flex items-center justify-between p-2 rounded-md bg-background">
              <span className="font-medium text-foreground truncate" title={stop.stop_name}>{index + 1}. {stop.stop_name}</span>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* --- UPDATED: Icon buttons for reordering --- */}
                <div className="flex flex-col">
                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="disabled:opacity-20 text-secondary hover:text-foreground">
                    <ArrowUpIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleMove(index, 'down')} disabled={index === selectedStops.length - 1} className="disabled:opacity-20 text-secondary hover:text-foreground">
                    <ArrowDownIcon className="h-4 w-4" />
                  </button>
                </div>
                {/* --- UPDATED: Icon button for remove --- */}
                <button onClick={() => onRemoveStop(stop.stop_id)} className="text-danger hover:text-danger/80">
                  <XMarkIcon className="h-5 w-5" />
                </button>
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
            disabled={isSaving || !routeName || selectedStops.length < 2}
            className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 disabled:bg-secondary disabled:cursor-not-allowed sm:w-auto sm:text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Route'}
          </button>
        </div>
      </div>
    </div>
  );
}