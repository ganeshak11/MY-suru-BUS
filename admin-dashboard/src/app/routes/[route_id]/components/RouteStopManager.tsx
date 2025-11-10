'use client';

import { useEffect, useState, Fragment } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal'; // --- UPDATED IMPORT

interface Stop {
    stop_id: number;
    stop_name: string;
    latitude: number;
    longitude: number;
}

interface RouteStop extends Stop {
    route_stop_id: number;
    stop_sequence: number;
    time_offset_from_start: string; // HH:MM:SS
}

interface RouteStopManagerProps {
    routeId: number;
    onStopsUpdated: (stops: RouteStop[]) => void; // Callback to update map
}

export default function RouteStopManager({ routeId, onStopsUpdated }: RouteStopManagerProps) {
    const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedRouteStop, setSelectedRouteStop] = useState<RouteStop | null>(null);
    const [formState, setFormState] = useState({
        stop_id: '',
        stop_name: '',
        latitude: '',
        longitude: '',
        stop_sequence: '',
        time_offset_from_start: '00:00:00',
    });
    const [error, setError] = useState<string | null>(null);
    
    // --- ADDED: Delete Modal State ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [routeStopToDelete, setRouteStopToDelete] = useState<RouteStop | null>(null);


    // --- UNIFIED FETCH FUNCTION ---
    const fetchRouteStops = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('route_stops')
            // --- FIX: Use correct alias syntax for joining stops ---
            .select(`
                route_stop_id,
                stop_sequence,
                time_offset_from_start,
                stops:stop_id (stop_id, stop_name, latitude, longitude)
            `)
            .eq('route_id', routeId)
            .order('stop_sequence', { ascending: true });

        if (error) {
            console.error('Error fetching route stops:', error);
            setError('Failed to load route stops.');
            setRouteStops([]);
        } else {
            // FIX: Format the data correctly since it's now an object, not an array
            const formattedStops: RouteStop[] = data.map((rs: any) => ({
                route_stop_id: rs.route_stop_id,
                stop_sequence: rs.stop_sequence,
                time_offset_from_start: rs.time_offset_from_start,
                // FIX: Access stops data directly (not from an array)
                stop_id: rs.stops.stop_id,
                stop_name: rs.stops.stop_name,
                latitude: rs.stops.latitude,
                longitude: rs.stops.longitude,
            }));
            setRouteStops(formattedStops);
            onStopsUpdated(formattedStops); // Notify map
        }
        setLoading(false);
    };

    const fetchAllStops = async () => {
        const { data, error } = await supabase
            .from('stops')
            .select('stop_id, stop_name, latitude, longitude')
            .order('stop_name', { ascending: true });

        if (error) {
            console.error('Error fetching all stops:', error);
        } else {
            setAllStops(data as Stop[]);
        }
    };
    // --- END UNIFIED FETCH ---

    useEffect(() => {
        fetchRouteStops();
        fetchAllStops();

        // --- ADDED: Real-time subscription to auto-refresh ---
        const channel = supabase
            .channel(`route_${routeId}_stops`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'route_stops', filter: `route_id=eq.${routeId}` }, () => {
                fetchRouteStops();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [routeId]);


    const openModal = (mode: 'add' | 'edit', routeStop?: RouteStop) => {
        setModalMode(mode);
        setError(null);
        if (mode === 'edit' && routeStop) {
            setSelectedRouteStop(routeStop);
            setFormState({
                stop_id: routeStop.stop_id.toString(),
                stop_name: routeStop.stop_name,
                latitude: routeStop.latitude.toString(),
                longitude: routeStop.longitude.toString(),
                stop_sequence: routeStop.stop_sequence.toString(),
                time_offset_from_start: routeStop.time_offset_from_start,
            });
        } else {
            setSelectedRouteStop(null);
            setFormState({
                stop_id: '',
                stop_name: '',
                latitude: '',
                longitude: '',
                stop_sequence: (routeStops.length + 1).toString(), // Suggest next sequence
                time_offset_from_start: '00:00:00',
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prevState => ({ ...prevState, [name]: value }));

        if (name === 'stop_id' && value) {
            const selected = allStops.find(stop => stop.stop_id.toString() === value);
            if (selected) {
                setFormState(prevState => ({
                    ...prevState,
                    stop_name: selected.stop_name,
                    latitude: selected.latitude.toString(),
                    longitude: selected.longitude.toString(),
                }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const { stop_id, stop_sequence, time_offset_from_start } = formState;

        if (!stop_id || !stop_sequence || !time_offset_from_start) {
            setError("Stop, Sequence, and Time Offset are required.");
            return;
        }
        
        // --- VALIDATION: Check if stop_sequence is unique ---
        const sequenceExists = routeStops.some(rs => rs.stop_sequence === parseInt(stop_sequence) && rs.route_stop_id !== selectedRouteStop?.route_stop_id);
        if (sequenceExists) {
          setError("Stop sequence must be unique for this route.");
          return;
        }
        // --- END VALIDATION ---

        let result;
        if (modalMode === 'add') {
            let finalStopId = parseInt(stop_id);
            if (!allStops.some(s => s.stop_id === finalStopId)) {
                 setError("Please select an existing stop.");
                 return;
            }

            result = await supabase.from('route_stops').insert({
                route_id: routeId,
                stop_id: finalStopId,
                stop_sequence: parseInt(stop_sequence),
                time_offset_from_start,
            }).select();
        } else if (selectedRouteStop) {
            result = await supabase.from('route_stops').update({
                stop_id: parseInt(stop_id),
                stop_sequence: parseInt(stop_sequence),
                time_offset_from_start,
            }).eq('route_stop_id', selectedRouteStop.route_stop_id).select();
        }

        const { data, error: submissionError } = result || {};

        if (submissionError) {
            console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} route stop:`, submissionError);
            setError(`Failed to ${modalMode} route stop: ${submissionError.message}`);
        } else if (data) {
            // fetchRouteStops(); // Not needed due to real-time listener
            closeModal();
        }
    };

    // --- UPDATED: Use modal for delete ---
    const handleDelete = (routeStop: RouteStop) => {
        setRouteStopToDelete(routeStop);
        setIsDeleteModalOpen(true);
        setError(null);
    };

    const confirmDelete = async () => {
        if (!routeStopToDelete) return;
        
        const { error } = await supabase.from('route_stops').delete().eq('route_stop_id', routeStopToDelete.route_stop_id);
        if (error) {
            console.error('Error deleting route stop:', error);
            setError(`Failed to remove stop: ${error.message}`);
        } else {
            // fetchRouteStops(); // Not needed due to real-time listener
        }
        setIsDeleteModalOpen(false);
        setRouteStopToDelete(null);
    };
    // --- END UPDATE ---

    return (
        <div className="bg-card p-4 rounded-lg shadow-xl border h-full flex flex-col min-h-[600px]">
            <div className="sm:flex sm:items-center mb-4">
                <div className="sm:flex-auto">
                    <h2 className="text-xl font-bold text-foreground">Stops on this Route</h2>
                    <p className="mt-1 text-sm text-secondary">Manage the sequence of stops and their scheduled times.</p>
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

            {loading ? (
                <p className="mt-8 text-center text-secondary">Loading stops...</p>
            ) : error ? (
                <p className="mt-8 text-center text-danger">{error}</p>
            ) : routeStops.length === 0 ? (
                <div className="mt-8 text-center">
                    <MapPinIcon className="mx-auto h-12 w-12 text-secondary" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No stops added to this route</h3>
                    <p className="mt-1 text-sm text-secondary">Use the button above to add the first stop.</p>
                </div>
            ) : (
                // --- TABLE VIEW ---
                <div className="flex flex-col min-h-0 flex-grow">
                    <div className="overflow-y-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg flex-1">
                        <table className="min-w-full divide-y divide-secondary/30">
                            <thead className="bg-table-header sticky top-0">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Seq.</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Stop Name</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Time Offset</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary/30 bg-table">
                                {routeStops.map((rs) => (
                                    <tr key={rs.route_stop_id} className="hover:bg-table-row-hover">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{rs.stop_sequence}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{rs.stop_name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">{rs.time_offset_from_start}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <button onClick={() => openModal('edit', rs)} className="text-primary hover:text-primary/80 mr-4">
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDelete(rs)} className="text-danger hover:text-danger/80">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- ADD/EDIT MODAL --- */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add Stop to Route' : 'Edit Route Stop'}>
                <form onSubmit={handleSubmit}>
                    <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        {/* Stop Selection/Creation */}
                        <div className="sm:col-span-6">
                            <label htmlFor="stop_id" className="block text-sm font-medium text-secondary">Select Stop</label>
                            <div className="mt-1">
                                <select
                                    id="stop_id"
                                    name="stop_id"
                                    value={formState.stop_id}
                                    onChange={handleFormChange}
                                    required
                                    className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                                >
                                    <option value="">-- Select an existing stop --</option>
                                    {allStops.map(stop => (
                                        <option key={stop.stop_id} value={stop.stop_id}>
                                            {stop.stop_name} (Lat: {stop.latitude.toFixed(4)}, Lng: {stop.longitude.toFixed(4)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Stop Sequence */}
                        <div className="sm:col-span-3">
                            <label htmlFor="stop_sequence" className="block text-sm font-medium text-secondary">Stop Sequence</label>
                            <div className="mt-1">
                                <input
                                    type="number"
                                    name="stop_sequence"
                                    id="stop_sequence"
                                    value={formState.stop_sequence}
                                    onChange={handleFormChange}
                                    required
                                    min={1}
                                    className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                                />
                            </div>
                            <p className="mt-2 text-xs text-secondary">Determines the order on the map.</p>
                        </div>

                        {/* Time Offset from Start */}
                        <div className="sm:col-span-3">
                            <label htmlFor="time_offset_from_start" className="block text-sm font-medium text-secondary">Time Offset (HH:MM:SS)</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="time_offset_from_start"
                                    id="time_offset_from_start"
                                    value={formState.time_offset_from_start}
                                    onChange={handleFormChange}
                                    placeholder="00:15:00"
                                    pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
                                    title="Format: HH:MM:SS"
                                    required
                                    className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                                />
                            </div>
                            <p className="mt-2 text-xs text-secondary">Time from the route's start.</p>
                        </div>
                    </div>
                    {error && <p className="mt-4 text-sm text-danger">{error}</p>}
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                            type="submit"
                            className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                        >
                            {modalMode === 'add' ? 'Add Stop' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 inline-flex w-full justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                            onClick={closeModal}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
            
            {/* --- DELETE CONFIRMATION MODAL --- */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Removal">
                {routeStopToDelete && (
                    <div>
                        <p className="text-sm text-secondary">
                            Are you sure you want to remove stop <strong>{routeStopToDelete.stop_name}</strong> from this route?
                        </p>
                        <p className="mt-2 text-xs text-danger">
                            Note: This does not delete the stop itself from the system, only its position on this route.
                        </p>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button 
                                type="button" 
                                onClick={() => setIsDeleteModalOpen(false)} 
                                className="inline-flex w-full justify-center rounded-md border border-secondary bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 sm:w-auto sm:text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={confirmDelete} 
                                className="inline-flex w-full justify-center rounded-md border border-transparent bg-danger px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-danger/80 sm:w-auto sm:text-sm"
                            >
                                Remove Stop
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}