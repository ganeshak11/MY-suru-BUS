'use client';

import { useEffect, useState, Fragment } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal'; // Import your Modal component

// --- Interfaces ---
interface Route {
  route_id: number;
  route_name: string;
}

interface Schedule {
  schedule_id: number;
  start_time: string;
  routes?: Route; // Single object join
}

interface Bus {
  bus_id: number;
  bus_no: string;
}

interface Driver {
  driver_id: number;
  name: string;
}

interface Trip {
  trip_id: number;
  schedule_id: number;
  bus_id: number;
  driver_id: number;
  trip_date: string; 
  status: 'Scheduled' | 'En Route' | 'Completed' | 'Cancelled';
  schedules?: Schedule; // Single object join
  buses?: Bus;          // Single object join
  drivers?: Driver;     // Single object join
}

type FormState = Omit<Trip, 'trip_id' | 'schedules' | 'buses' | 'drivers'>;

const tripStatuses = ['Scheduled', 'En Route', 'Completed', 'Cancelled'];

// --- Helper function for dynamic status colors ---
const getStatusClasses = (status: Trip['status']) => {
    switch (status) {
        case 'Scheduled':
            return 'bg-secondary/30 text-secondary';
        case 'En Route':
            return 'bg-success/30 text-success';
        case 'Completed':
            return 'bg-primary/30 text-primary';
        case 'Cancelled':
            return 'bg-danger/30 text-danger';
        default:
            return 'bg-secondary/30 text-secondary';
    }
};


export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [formState, setFormState] = useState<FormState>({
    schedule_id: 0,
    bus_id: 0,
    driver_id: 0,
    trip_date: new Date().toISOString().split('T')[0],
    status: 'Scheduled',
  });
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);


  useEffect(() => {
  const channel = supabase
    .channel('trips-table-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trips' },
      () => fetchTrips()
      
    )
    .subscribe();

  // Initial load
  fetchTrips();
  fetchDependencies();
  // Synchronous cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
 // Dependency array ensures cleanup works for the initial setup

  const fetchTrips = async () => {
    setLoading(true);
    // --- UPDATED: Use alias syntax for correct joins (single object) ---
    const { data, error } = await supabase
      .from('trips')
      .select(`
        trip_id,
        trip_date,
        status,
        schedule_id,
        bus_id,
        driver_id,
        schedules:schedule_id (
          schedule_id,
          start_time,
          routes:route_id (route_id, route_name)
        ),
        buses:bus_id (bus_id, bus_no),
        drivers:driver_id (driver_id, name)
      `)
      .order('trip_date', { ascending: false });

    if (error) {
      console.error('Error fetching trips:', error);
      setError('Failed to fetch trips. Please try again.');
    } else {
      const tripsData = data as unknown as Trip[];
      setTrips(tripsData);
      setFilteredTrips(tripsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredTrips(trips);
    } else {
      setFilteredTrips(trips.filter(trip => trip.status === statusFilter));
    }
  }, [statusFilter, trips]);

  const fetchDependencies = async () => {
    // Fetch Schedules (Use alias syntax for correct joins)
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('schedules')
      .select(`schedule_id, start_time, routes:route_id (route_id, route_name)`);
    if (schedulesError) console.error('Error fetching schedules:', schedulesError);
    else setSchedules(schedulesData as unknown as Schedule[]);

    // Fetch Buses
    const { data: busesData, error: busesError } = await supabase
      .from('buses')
      .select('bus_id, bus_no');
    if (busesError) console.error('Error fetching buses:', busesError);
    else setBuses(busesData as Bus[]);

    // Fetch Drivers
    const { data: driversData, error: driversError } = await supabase
      .from('drivers')
      .select('driver_id, name');
    if (driversError) console.error('Error fetching drivers:', driversError);
    else setDrivers(driversData as Driver[]);
  };

  const openModal = (mode: 'add' | 'edit', trip?: Trip) => {
    setModalMode(mode);
    setError(null);
    if (mode === 'edit' && trip) {
      setSelectedTrip(trip);
      setFormState({
        schedule_id: trip.schedule_id,
        bus_id: trip.bus_id,
        driver_id: trip.driver_id,
        trip_date: trip.trip_date,
        status: trip.status,
      });
    } else {
      setSelectedTrip(null);
      setFormState({
        schedule_id: schedules.length > 0 ? schedules[0].schedule_id : 0,
        bus_id: buses.length > 0 ? buses[0].bus_id : 0,
        driver_id: drivers.length > 0 ? drivers[0].driver_id : 0,
        trip_date: new Date().toISOString().split('T')[0],
        status: 'Scheduled',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      // Ensure numerical fields are parsed correctly
      [name]: name === 'schedule_id' || name === 'bus_id' || name === 'driver_id' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { schedule_id, bus_id, driver_id, trip_date, status } = formState;

    if (!schedule_id || !bus_id || !driver_id || !trip_date || !status) {
        setError("All fields are required.");
        return;
    }

    let result;
    if (modalMode === 'add') {
      result = await supabase.from('trips').insert([{ schedule_id, bus_id, driver_id, trip_date, status }]).select();
    } else if (selectedTrip) {
      result = await supabase.from('trips').update({ schedule_id, bus_id, driver_id, trip_date, status }).eq('trip_id', selectedTrip.trip_id).select();
    }

    const { data, error: submissionError } = result || {};

    if (submissionError) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} trip:`, submissionError);
      setError(`Failed to ${modalMode} trip: ${submissionError.message}`);
    } else if (data) {
      // fetchTrips(); // Handled by real-time listener
      closeModal();
    }
  };

  // --- UPDATED: Delete handler uses modal ---
  const handleDeleteClick = (trip: Trip) => {
    setTripToDelete(trip);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;

    // Delete related trip_stop_times records
    const { error: stopTimesError } = await supabase
      .from('trip_stop_times')
      .delete()
      .eq('trip_id', tripToDelete.trip_id);

    if (stopTimesError) {
      console.error('Error deleting trip stop times:', stopTimesError);
      setError(`Failed to delete trip: ${stopTimesError.message}`);
      setIsDeleteModalOpen(false);
      setTripToDelete(null);
      return;
    }

    // Set trip_id to null in passenger_reports
    const { error: reportsError } = await supabase
      .from('passenger_reports')
      .update({ trip_id: null })
      .eq('trip_id', tripToDelete.trip_id);

    if (reportsError) {
      console.error('Error updating passenger reports:', reportsError);
      setError(`Failed to delete trip: ${reportsError.message}`);
      setIsDeleteModalOpen(false);
      setTripToDelete(null);
      return;
    }

    // Delete the trip
    const { error } = await supabase.from('trips').delete().eq('trip_id', tripToDelete.trip_id);
    if (error) {
      console.error('Error deleting trip:', error);
      setError(`Failed to delete trip: ${error.message}`);
    }
    setIsDeleteModalOpen(false);
    setTripToDelete(null);
  };
  // --- END UPDATE ---

  const getScheduleDisplay = (schedule?: Schedule) => {
    if (!schedule) return 'N/A';
    return `${schedule.routes?.route_name || ''} (${schedule.start_time})`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Trips</h1>
          <p className="text-secondary">Manage daily trip assignments</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('add')}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <PlusIcon className="h-5 w-5" />
          Add Trip
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Filter by Status:</span>
        <div className="flex gap-2">
          {['all', ...tripStatuses].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-card text-secondary hover:bg-primary/10 border border-border'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
          <p className="text-danger font-medium">{error}</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <CalendarDaysIcon className="mx-auto h-16 w-16 text-secondary/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No trips found</h3>
          <p className="mt-2 text-secondary">{statusFilter === 'all' ? 'Get started by adding your first trip' : `No ${statusFilter} trips`}</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Route & Schedule</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Bus</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Driver</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTrips.map((trip) => (
                <tr key={trip.trip_id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{new Date(trip.trip_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{getScheduleDisplay(trip.schedules)}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{trip.buses?.bus_no || '—'}</td>
                  <td className="px-6 py-4 text-sm text-secondary">{trip.drivers?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(trip.status)}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal('edit', trip)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDeleteClick(trip)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {/* Note: This block uses the standard Transition/Dialog structure provided in the original code */}
      <Transition.Root show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            {/* UPDATED: Theme-aware backdrop */}
            <div className="fixed inset-0 bg-secondary/75 transition-opacity" /> 
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-card px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <form onSubmit={handleSubmit}>
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-foreground">{modalMode === 'add' ? 'Add New Trip' : 'Edit Trip'}</h3>
                      <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        
                        {/* Schedule Selection */}
                        <div className="sm:col-span-6">
                          <label htmlFor="schedule_id" className="block text-sm font-medium text-secondary">Schedule</label>
                          <div className="mt-1">
                            <select
                              id="schedule_id"
                              name="schedule_id"
                              value={formState.schedule_id}
                              onChange={handleFormChange}
                              required
                              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                            >
                              <option value={0}>-- Select a Schedule --</option>
                              {schedules.map(schedule => (
                                <option key={schedule.schedule_id} value={schedule.schedule_id}>
                                  {getScheduleDisplay(schedule)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Bus Selection */}
                        <div className="sm:col-span-6">
                          <label htmlFor="bus_id" className="block text-sm font-medium text-secondary">Bus</label>
                          <div className="mt-1">
                            <select
                              id="bus_id"
                              name="bus_id"
                              value={formState.bus_id}
                              onChange={handleFormChange}
                              required
                              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                            >
                              <option value={0}>-- Select a Bus --</option>
                              {buses.map(bus => (
                                <option key={bus.bus_id} value={bus.bus_id}>
                                  {bus.bus_no}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Driver Selection */}
                        <div className="sm:col-span-6">
                          <label htmlFor="driver_id" className="block text-sm font-medium text-secondary">Driver</label>
                          <div className="mt-1">
                            <select
                              id="driver_id"
                              name="driver_id"
                              value={formState.driver_id}
                              onChange={handleFormChange}
                              required
                              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                            >
                              <option value={0}>-- Select a Driver --</option>
                              {drivers.map(driver => (
                                <option key={driver.driver_id} value={driver.driver_id}>
                                  {driver.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Trip Date */}
                        <div className="sm:col-span-3">
                          <label htmlFor="trip_date" className="block text-sm font-medium text-secondary">Trip Date</label>
                          <div className="mt-1">
                            <input
                              type="date"
                              name="trip_date"
                              id="trip_date"
                              value={formState.trip_date}
                              onChange={handleFormChange}
                              required
                              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                            />
                          </div>
                        </div>

                        {/* Status */}
                        <div className="sm:col-span-3">
                          <label htmlFor="status" className="block text-sm font-medium text-secondary">Status</label>
                          <div className="mt-1">
                            <select
                              id="status"
                              name="status"
                              value={formState.status}
                              onChange={handleFormChange}
                              required
                              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                            >
                              {tripStatuses.map(status => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>
                      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
                    </div>
                    <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                      <button
                        type="submit"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                      >
                        {modalMode === 'add' ? 'Create Trip' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="mt-3 inline-flex w-full justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      
      {/* --- ADDED: DELETE CONFIRMATION MODAL --- */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {tripToDelete && (
          <div>
            <p className="text-sm text-secondary">
              Are you sure you want to delete the trip for 
              <strong className='text-foreground ml-1'>
                  {getScheduleDisplay(tripToDelete.schedules)}
              </strong> on <strong className='text-foreground'>{tripToDelete.trip_date}</strong>?
            </p>
            <p className="mt-2 text-sm font-semibold text-danger">
              Warning: This action will delete all associated tracking and stop time data for this trip and cannot be undone.
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
                Delete Trip
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}