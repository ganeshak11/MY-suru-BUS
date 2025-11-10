'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, MapIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import RoutePlanner from './components/RoutePlanner';
import Modal from '@/app/components/Modal';
import RouteForm from './components/RouteForm';

// --- UPDATED: Interface includes new counts ---
interface Route {
  route_id: number;
  route_name: string;
  route_stops: { count: number }[];
  schedules: { count: number }[];
}

type FormState = Omit<Route, 'route_id' | 'route_stops' | 'schedules'>;

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'planner'>('list');
  
  // State for the Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [formState, setFormState] = useState<FormState>({ route_name: '' });
  const [error, setError] = useState<string | null>(null);

  // --- ADDED: State for delete modal ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);

  useEffect(() => {
    if (view === 'list') {
      fetchRoutes();
    }

    // --- ADDED: Real-time subscription ---
    const channel = supabase
      .channel('routes-table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'routes' },
        (payload) => {
          if (view === 'list') {
            fetchRoutes();
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
    // --- END ADD ---

  }, [view]);

  const fetchRoutes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('routes')
      // --- UPDATED: Get counts of stops and schedules ---
      .select('*, route_stops(count), schedules(count)')
      .order('route_name', { ascending: true });

    if (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes. Please try again.');
    } else {
      setRoutes(data as Route[]);
    }
    setLoading(false);
  };

  const openEditModal = (route: Route) => {
    setError(null);
    setSelectedRoute(route);
    setFormState({ route_name: route.route_name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formState.route_name) {
        setError("Route Name is required.");
        return;
    }
    if (!selectedRoute) return;

    const { data, error: submissionError } = await supabase.from('routes').update(formState).eq('route_id', selectedRoute.route_id).select();

    if (submissionError) {
      console.error(`Error updating route:`, submissionError);
      setError(`Failed to update route: ${submissionError.message}`);
    } else if (data) {
      // fetchRoutes(); // No longer needed, real-time listener will catch it
      closeModal();
    }
  };

  // --- UPDATED: Swapped window.confirm for modal ---
  const handleDelete = (route: Route) => {
    setRouteToDelete(route);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!routeToDelete) return;
    setError(null);

    try {
      // First, get all schedules for the route
      const { data: schedules, error: schedulesError } = await supabase
        .from('schedules')
        .select('schedule_id')
        .eq('route_id', routeToDelete.route_id);

      if (schedulesError) throw schedulesError;

      const scheduleIds = schedules.map(s => s.schedule_id);

      // If there are schedules, delete associated trips
      if (scheduleIds.length > 0) {
        const { error: tripsError } = await supabase.from('trips').delete().in('schedule_id', scheduleIds);
        if (tripsError) throw tripsError;
      }

      // Delete associated schedules
      const { error: schedulesDeleteError } = await supabase.from('schedules').delete().eq('route_id', routeToDelete.route_id);
      if (schedulesDeleteError) throw schedulesDeleteError;

      // Delete associated route_stops
      const { error: routeStopsError } = await supabase.from('route_stops').delete().eq('route_id', routeToDelete.route_id);
      if (routeStopsError) throw routeStopsError;

      // Now delete the route
      const { error: routeError } = await supabase.from('routes').delete().eq('route_id', routeToDelete.route_id);
      if (routeError) throw routeError;

      // Success
      // setRoutes(routes.filter(r => r.route_id !== route_id)); // No longer needed
      setIsDeleteModalOpen(false);
      setRouteToDelete(null);

    } catch (error: any) {
      console.error('Error deleting route:', error);
      setError(`Failed to delete route: ${error.message}`);
      setIsDeleteModalOpen(false);
    }
  };
  // --- END UPDATE ---

  if (view === 'planner') {
    return <RoutePlanner onCancel={() => setView('list')} onSaveSuccess={() => setView('list')} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-foreground">Manage Routes</h1>
          <p className="mt-2 text-sm text-secondary">A list of all the bus routes in the system.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setView('planner')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Interactive Route
          </button>
        </div>
      </div>

      {/* --- ADDED: Global error display --- */}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="mt-8 text-center">Loading routes...</p>
      ) : routes.length === 0 ? (
        <div className="mt-8 text-center">
            <MapIcon className="mx-auto h-12 w-12 text-secondary" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No routes found</h3>
            <p className="mt-1 text-sm text-secondary">Get started by creating a new route.</p>
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
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Route Name</th>
                      {/* --- ADDED: New Columns --- */}
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Stops</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Schedules</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30 bg-table">
                    {routes.map((route) => (
                      <tr key={route.route_id} className="hover:bg-table-row-hover">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                          <Link href={`/routes/${route.route_id}`} className="hover:underline text-primary">
                            {route.route_name}
                          </Link>
                        </td>
                        {/* --- ADDED: New Data --- */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                          {route.route_stops[0]?.count || 0}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                          {route.schedules[0]?.count || 0}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => openEditModal(route)} className="text-primary hover:text-primary/80 mr-4">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {/* --- UPDATED: Theme-aware button --- */}
                          <button onClick={() => handleDelete(route)} className="text-danger hover:text-danger/80">
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

      {/* Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Edit Route">
        <RouteForm
          formState={formState}
          handleFormChange={handleFormChange}
          handleEditSubmit={handleEditSubmit}
          error={error}
          closeModal={closeModal}
        />
      </Modal>

      {/* --- ADDED: Delete Confirmation Modal --- */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {routeToDelete && (
          <div>
            <p className="text-sm text-secondary">
              Are you sure you want to delete the route <strong>{routeToDelete.route_name}</strong>?
            </p>
            <p className="mt-2 text-sm text-danger font-semibold">
              Warning: This is a destructive action. It will also delete all associated stops, schedules, and past trip data for this route. This cannot be undone.
            </p>
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
                Delete Route
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}