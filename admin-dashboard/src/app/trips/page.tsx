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
  day_of_week: number;
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

  // --- ADDED: Delete Modal State ---
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
          day_of_week,
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
      // Data is correctly typed as an array of objects due to aliasing
      setTrips(data as unknown as Trip[]);
    }
    setLoading(false);
  };

  const fetchDependencies = async () => {
    // Fetch Schedules (Use alias syntax for correct joins)
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('schedules')
      .select(`schedule_id, start_time, day_of_week, routes:route_id (route_id, route_name)`);
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

    const { error } = await supabase.from('trips').delete().eq('trip_id', tripToDelete.trip_id);
    if (error) {
      console.error('Error deleting trip:', error);
      setError(`Failed to delete trip: ${error.message}`);
    } else {
      // Handled by real-time listener
    }
    setIsDeleteModalOpen(false);
    setTripToDelete(null);
  };
  // --- END UPDATE ---

  const getScheduleDisplay = (schedule?: Schedule) => {
    if (!schedule) return 'N/A';
    const dayLabel = daysOfWeek.find(d => d.value === schedule.day_of_week)?.label;
    return `${schedule.routes?.route_name || ''} (${dayLabel} ${schedule.start_time})`;
  };

  const daysOfWeek = [
    { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' }, { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-foreground">Manage Trips</h1>
          <p className="mt-2 text-sm text-secondary">Assign schedules, buses, and drivers for daily trips.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Trip
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-secondary">Loading trips...</p>
      ) : error ? (
        <p className="mt-8 text-center text-danger">{error}</p>
      ) : trips.length === 0 ? (
        <div className="mt-8 text-center">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-secondary" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No trips scheduled</h3>
            <p className="mt-1 text-sm text-secondary">Get started by adding your first trip.</p>
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
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Date</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Schedule (Route/Time)</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Bus</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Driver</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Status</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30 bg-table">
                    {trips.map((trip) => (
                      <tr key={trip.trip_id} className="hover:bg-table-row-hover">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{trip.trip_date}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{getScheduleDisplay(trip.schedules)}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{trip.buses?.bus_no || 'N/A'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{trip.drivers?.name || 'N/A'}</td>
                        {/* --- UPDATED: Status Chip --- */}
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(trip.status)}`}>
                                {trip.status}
                            </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button onClick={() => openModal('edit', trip)} className="text-primary hover:text-primary/80 mr-4">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleDeleteClick(trip)} className="text-danger hover:text-danger/80">
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