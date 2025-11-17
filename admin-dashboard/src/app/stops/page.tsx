'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal';
import StopForm from './components/StopForm';
import dynamic from 'next/dynamic';

const StopLocationPicker = dynamic(() => import('./components/StopLocationPicker'), { ssr: false });

// --- UPDATED: Interface now includes route count ---
interface Stop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  route_stops: { count: number }[]; // Will hold the count of routes
}

type FormState = {
  stop_name: string;
  latitude: string;
  longitude: string;
};

export default function StopsPage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [formState, setFormState] = useState<FormState>({
    stop_name: '',
    latitude: '',
    longitude: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [useMap, setUseMap] = useState(false);

  // --- ADDED: State for delete modal ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stopToDelete, setStopToDelete] = useState<Stop | null>(null);

  useEffect(() => {
    fetchStops();

    // --- ADDED: Real-time subscription ---
    const channel = supabase
      .channel('stops-table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stops' },
        (payload) => {
          fetchStops();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
    // --- END ADD ---

  }, []);

  const fetchStops = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stops')
      // --- UPDATED: Get a count of routes using this stop ---
      .select('*, route_stops(count)')
      .order('stop_name', { ascending: true });

    if (error) {
      console.error('Error fetching stops:', error);
      setError('Failed to fetch stops. Please try again.');
    } else {
      setStops(data as Stop[]);
    }
    setLoading(false);
  };

  const openModal = (mode: 'add' | 'edit', stop?: Stop) => {
    setModalMode(mode);
    setError(null);
    if (mode === 'edit' && stop) {
      setSelectedStop(stop);
      setFormState({
        stop_name: stop.stop_name,
        latitude: stop.latitude.toString(),
        longitude: stop.longitude.toString(),
      });
    } else {
      setSelectedStop(null);
      setFormState({
        stop_name: '',
        latitude: '12.2958', // Default to Mysore center
        longitude: '76.6552',
      });
    }
    setUseMap(false); // Reset map toggle
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormState(prevState => ({
      ...prevState,
      latitude: lat.toFixed(6), // Add precision
      longitude: lng.toFixed(6),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { stop_name, latitude, longitude } = formState;

    if (!stop_name || !latitude || !longitude) {
        setError("Stop Name, Latitude, and Longitude are required.");
        return;
    }

    let result;
    if (modalMode === 'add') {
      result = await supabase.from('stops').insert([{ stop_name, latitude: parseFloat(latitude), longitude: parseFloat(longitude) }]).select();
    } else if (selectedStop) {
      result = await supabase.from('stops').update({ stop_name, latitude: parseFloat(latitude), longitude: parseFloat(longitude) }).eq('stop_id', selectedStop.stop_id).select();
    }

    const { data, error: submissionError } = result || {};

    if (submissionError) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} stop:`, submissionError);
      setError(`Failed to ${modalMode} stop: ${submissionError.message}`);
    } else if (data) {
      // fetchStops(); // No longer needed, real-time listener will catch it
      closeModal();
    }
  };

  // --- UPDATED: Use modal for delete confirmation ---
  const handleDelete = (stop: Stop) => {
    setStopToDelete(stop);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!stopToDelete) return;
    
    setError(null); // Clear old errors

    try {
      // Check if the stop is associated with any routes
      const { data: routeStops, error: routeStopsError } = await supabase
          .from('route_stops')
          .select('route_id')
          .eq('stop_id', stopToDelete.stop_id)
          .limit(1);

      if (routeStopsError) {
          throw new Error(`Error checking for associated routes: ${routeStopsError.message}`);
      }

      if (routeStops && routeStops.length > 0) {
          setError('This stop cannot be deleted because it is currently associated with one or more routes.');
          setIsDeleteModalOpen(false);
          return;
      }

      // Check if the stop is associated with any trip stop times
      const { data: tripStopTimes, error: tripStopTimesError } = await supabase
          .from('trip_stop_times')
          .select('trip_id')
          .eq('stop_id', stopToDelete.stop_id)
          .limit(1);

      if (tripStopTimesError) {
          throw new Error(`Error checking for associated trip stop times: ${tripStopTimesError.message}`);
      }

      if (tripStopTimes && tripStopTimes.length > 0) {
          setError('This stop cannot be deleted because it has recorded trip data associated with it.');
          setIsDeleteModalOpen(false);
          return;
      }

      // If no associations, proceed with deletion
      const { error: deleteError } = await supabase.from('stops').delete().eq('stop_id', stopToDelete.stop_id);

      if (deleteError) {
        throw new Error(`Failed to delete stop: ${deleteError.message}`);
      }
      
      // Success
      setIsDeleteModalOpen(false);
      setStopToDelete(null);
      // fetchStops(); // No longer needed, real-time listener will catch it

    } catch (error: any) {
        console.error('Deletion process failed:', error);
        setError(error.message); // Show error to user
        setIsDeleteModalOpen(false);
    }
  };
  // --- END UPDATE ---

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Stops</h1>
          <p className="text-secondary text-base">Define and manage all physical bus stops in the system</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('add')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all hover:-translate-y-0.5 hover:scale-105"
        >
          <PlusIcon className="h-5 w-5" />
          Add Stop
        </button>
      </div>
      
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6 shadow-soft">
          <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-primary/10 rounded-full"></div>
            </div>
          </div>
        </div>
      ) : stops.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-card to-slate-50 dark:to-slate-900 rounded-2xl border border-border shadow-soft">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-4">
            <MapPinIcon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No stops found</h3>
          <p className="mt-2 text-secondary max-w-sm mx-auto">Get started by adding your first stop to the system</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Stop Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Coordinates</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Used in Routes</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-foreground/80">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {stops.map((stop) => (
                  <tr key={stop.stop_id} className="hover:bg-primary/5 transition-all duration-200 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <MapPinIcon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">{stop.stop_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary font-mono">
                      <div className="flex flex-col gap-0.5">
                        <span>Lat: {stop.latitude.toFixed(6)}</span>
                        <span>Lng: {stop.longitude.toFixed(6)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {stop.route_stops[0].count > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          {stop.route_stops[0].count} {stop.route_stops[0].count > 1 ? 'routes' : 'route'}
                        </span>
                      ) : (
                        <span className="text-sm text-secondary font-medium">Not in use</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openModal('edit', stop)} 
                          className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                          title="Edit stop"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(stop)} 
                          className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110 hover:shadow-md border border-transparent hover:border-red-200 dark:hover:border-red-800"
                          title="Delete stop"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add New Stop' : 'Edit Stop'}>
        <StopForm
          formState={formState}
          handleFormChange={handleFormChange}
          handleSubmit={handleSubmit}
          error={error}
          modalMode={modalMode}
          closeModal={closeModal}
          useMap={useMap}
          setUseMap={setUseMap}
          handleLocationChange={handleLocationChange}
        />
      </Modal>

      {/* --- ADDED: Delete Modal --- */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {stopToDelete && (
          <div>
            <p className="text-sm text-secondary">Are you sure you want to delete stop <strong>{stopToDelete.stop_name}</strong>? This action cannot be undone.</p>
            {/* Note: 'error' state will be shown in the main page's error banner */}
            <div className="mt-6 flex justify-end space-x-4">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="inline-flex w-full justify-center rounded-md border border-secondary bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDelete} 
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-danger px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-danger/80 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2 sm:w-auto sm:text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}