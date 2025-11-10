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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-foreground">Manage Stops</h1>
          <p className="mt-2 text-sm text-secondary">Define and manage all physical bus stops in the system.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Stop
          </button>
        </div>
      </div>
      
      {/* --- UPDATED: Global error display --- */}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="mt-8 text-center">Loading stops...</p>
      ) : stops.length === 0 ? (
        <div className="mt-8 text-center">
            <MapPinIcon className="mx-auto h-12 w-12 text-secondary" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No stops defined</h3>
            <p className="mt-1 text-sm text-secondary">Get started by adding your first stop.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {/* --- UPDATED: Theme-aware dividers --- */}
                <table className="min-w-full divide-y divide-secondary/30">
                  <thead className="bg-table-header">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Stop Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Latitude</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Longitude</th>
                      {/* --- ADDED: Usage Column --- */}
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Used in Routes</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30 bg-table">
                    {stops.map((stop) => (
                      <tr key={stop.stop_id} className="hover:bg-table-row-hover">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{stop.stop_name}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">{stop.latitude}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">{stop.longitude}</td>
                        {/* --- ADDED: Usage Data --- */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                          {stop.route_stops[0].count > 0 
                            ? `${stop.route_stops[0].count} ${stop.route_stops[0].count > 1 ? 'routes' : 'route'}`
                            : 'Not in use'
                          }
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => openModal('edit', stop)} className="text-primary hover:text-primary/80 mr-4">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {/* --- UPDATED: Theme-aware delete --- */}
                          <button onClick={() => handleDelete(stop)} className="text-danger hover:text-danger/80">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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