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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Routes</h1>
          <p className="text-secondary text-base">Manage all bus routes in the system</p>
        </div>
        <button
          type="button"
          onClick={() => setView('planner')}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <PlusIcon className="h-5 w-5" />
          Create Route
        </button>
      </div>

      {/* --- ADDED: Global error display --- */}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : routes.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <MapIcon className="mx-auto h-16 w-16 text-secondary/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No routes found</h3>
          <p className="mt-2 text-secondary">Get started by creating your first route</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Route Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Stops</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Schedules</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {routes.map((route) => (
                <tr key={route.route_id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/routes/${route.route_id}`} className="text-primary font-medium hover:text-primary/80 transition-colors">
                      {route.route_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                      {route.route_stops[0]?.count || 0} stops
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                      {route.schedules[0]?.count || 0} schedules
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(route)} 
                        className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Edit route"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(route)} 
                        className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Delete route"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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