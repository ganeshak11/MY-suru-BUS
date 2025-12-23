'use client';

import { useEffect, useState, Fragment } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal';

// --- Interfaces ---
interface Route {
  route_id: number;
  route_name: string;
}

interface Schedule {
  schedule_id: number;
  start_time: string;
  route_id: number;
  route_name?: string;
}

interface ScheduleGroup {
  route_id: number;
  route_name: string;
  schedules: Schedule[];
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
  bus_no?: string;
  driver_name?: string;
  start_time?: string;
  route_name?: string;
  route_id?: number;
}

type FormState = Omit<Trip, 'trip_id' | 'schedules' | 'buses' | 'drivers'> & { route_id: number };

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
  const [scheduleGroups, setScheduleGroups] = useState<ScheduleGroup[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [formState, setFormState] = useState<FormState>({
    route_id: 0,
    schedule_id: 0,
    bus_id: 0,
    driver_id: 0,
    trip_date: (() => {
      const now = new Date();
      return now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
    })(),
    status: 'Scheduled',
  });
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);


  useEffect(() => {
    fetchTrips();
    fetchDependencies();
    const interval = setInterval(fetchTrips, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getTrips();
      setTrips(data);
      setFilteredTrips(data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      setError('Failed to fetch trips. Please try again.');
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
    try {
      const schedulesData = await apiClient.getSchedules();
      setSchedules(schedulesData);
      
      const grouped = schedulesData.reduce((acc: ScheduleGroup[], schedule: Schedule) => {
        const routeName = schedule.route_name || 'Unknown';
        const routeId = schedule.route_id;
        const existing = acc.find(g => g.route_id === routeId);
        if (existing) {
          existing.schedules.push(schedule);
        } else {
          acc.push({ route_id: routeId, route_name: routeName, schedules: [schedule] });
        }
        return acc;
      }, []);
      setScheduleGroups(grouped);

      const busesData = await apiClient.getBuses();
      setBuses(busesData);

      const driversData = await apiClient.getDrivers();
      setDrivers(driversData);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  const openModal = (mode: 'add' | 'edit', trip?: Trip) => {
    setModalMode(mode);
    setError(null);
    if (mode === 'edit' && trip) {
      setSelectedTrip(trip);
      setFormState({
        route_id: trip.route_id || 0,
        schedule_id: trip.schedule_id,
        bus_id: trip.bus_id,
        driver_id: trip.driver_id,
        trip_date: trip.trip_date,
        status: trip.status,
      });
    } else {
      setSelectedTrip(null);
      setFormState({
        route_id: scheduleGroups.length > 0 ? scheduleGroups[0].route_id : 0,
        schedule_id: 0,
        bus_id: buses.length > 0 ? buses[0].bus_id : 0,
        driver_id: drivers.length > 0 ? drivers[0].driver_id : 0,
        trip_date: (() => {
          const now = new Date();
          return now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0');
        })(),
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
    setFormState(prevState => {
      const updated = {
        ...prevState,
        [name]: name === 'route_id' || name === 'schedule_id' || name === 'bus_id' || name === 'driver_id' ? parseInt(value) : value,
      };
      // Reset schedule_id when route changes
      if (name === 'route_id') {
        updated.schedule_id = 0;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { route_id, bus_id, driver_id, trip_date, status } = formState;

    if (!route_id || !bus_id || !driver_id || !trip_date || !status) {
        setError("All fields are required.");
        return;
    }

    try {
      if (modalMode === 'add') {
        const selectedGroup = scheduleGroups.find(g => g.route_id === route_id);
        if (!selectedGroup || selectedGroup.schedules.length === 0) {
          setError("No schedules found for the selected route.");
          return;
        }

        const tripsToCreate = selectedGroup.schedules.map(schedule => ({
          schedule_id: schedule.schedule_id,
          bus_id,
          driver_id,
          trip_date,
          status
        }));

        await apiClient.createTrip(tripsToCreate);
      } else if (selectedTrip) {
        await apiClient.updateTrip(selectedTrip.trip_id, { bus_id, driver_id, trip_date, status });
      }
      fetchTrips();
      closeModal();
    } catch (error: any) {
      console.error('Error with trip:', error);
      setError(`Failed to ${modalMode} trip: ${error.message}`);
    }
  };

  // --- UPDATED: Delete handler uses modal ---
  const handleDeleteClick = (trip: Trip) => {
    setTripToDelete(trip);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const generateDailyTrips = async () => {
    setIsGenerating(true);
    setError(null);
    setIsGenerating(false);
    setError('Daily trip generation not yet implemented in API');
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;

    try {
      await apiClient.deleteTrip(tripToDelete.trip_id);
      fetchTrips();
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      setError(`Failed to delete trip: ${error.message}`);
    }
    
    setIsDeleteModalOpen(false);
    setTripToDelete(null);
  };

  const getScheduleDisplay = (trip: Trip) => {
    if (!trip) return 'N/A';
    return `${trip.route_name || ''} (${trip.start_time || ''})`;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Trips</h1>
          <p className="text-secondary text-sm sm:text-base">Manage daily trip assignments</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={generateDailyTrips}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 bg-success text-white px-6 py-3 rounded-xl font-medium hover:bg-success/90 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <CalendarDaysIcon className="h-5 w-5" />
            )}
            {isGenerating ? 'Generating...' : "Generate Today's Trips"}
          </button>
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <PlusIcon className="h-5 w-5" />
            Add Trip
          </button>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 flex-shrink-0">
        <span className="text-sm font-medium text-foreground mb-2 block sm:inline sm:mb-0">Filter by Status:</span>
        {/* Mobile Dropdown */}
        <div className="sm:hidden">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl bg-background text-foreground border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="all">All Statuses</option>
            {tripStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        {/* Desktop Buttons */}
        <div className="hidden sm:flex sm:items-center sm:gap-3 sm:ml-3">
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
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
            <p className="text-danger font-medium">{error}</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border h-full flex flex-col justify-center">
            <CalendarDaysIcon className="mx-auto h-16 w-16 text-secondary/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">No trips found</h3>
            <p className="mt-2 text-secondary">{statusFilter === 'all' ? 'Get started by adding your first trip' : `No ${statusFilter} trips`}</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-card sticky top-0">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">Date</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">Route & Schedule</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">Bus</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">Driver</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-foreground">Status</th>
                    <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTrips.map((trip) => (
                    <tr key={trip.trip_id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 font-medium text-foreground text-sm">{new Date(trip.trip_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-foreground">
                        <div className="truncate max-w-[150px] sm:max-w-none" title={getScheduleDisplay(trip)}>
                          {getScheduleDisplay(trip)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-secondary">{trip.bus_no || '—'}</td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-secondary">
                        <div className="truncate max-w-[100px] sm:max-w-none" title={trip.driver_name}>
                          {trip.driver_name || '—'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusClasses(trip.status)}`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button onClick={() => openModal('edit', trip)} className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteClick(trip)} className="w-8 h-8 flex items-center justify-center text-danger hover:bg-danger/10 rounded-lg transition-colors">
                            <TrashIcon className="h-4 w-4" />
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
      </div>

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
            <div className="fixed inset-0 bg-secondary/75 backdrop-blur-sm transition-opacity" /> 
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-card px-4 pt-5 pb-4 text-left shadow-xl transition-all w-full max-w-sm sm:max-w-lg sm:p-6">
                  <form onSubmit={handleSubmit}>
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-foreground">{modalMode === 'add' ? 'Create Trips for Route' : 'Edit Trip'}</h3>
                      <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        
                        {/* Route Selection (for add mode) */}
                        {modalMode === 'add' && (
                          <div className="sm:col-span-6">
                            <label htmlFor="route_id" className="block text-sm font-medium text-secondary">Route</label>
                            <div className="mt-1">
                              <select
                                id="route_id"
                                name="route_id"
                                value={formState.route_id}
                                onChange={handleFormChange}
                                required
                                className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
                              >
                                <option value={0}>-- Select a Route --</option>
                                {scheduleGroups.map(group => (
                                  <option key={group.route_id} value={group.route_id}>
                                    {group.route_name} ({group.schedules.length} schedules)
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="mt-2 text-xs text-secondary">Trips will be created for all schedules of this route</p>
                          </div>
                        )}

                        {/* Schedule Selection (for edit mode) */}
                        {modalMode === 'edit' && (
                          <div className="sm:col-span-6">
                            <label htmlFor="schedule_id" className="block text-sm font-medium text-secondary">Schedule</label>
                            <div className="mt-1">
                              <select
                                id="schedule_id"
                                name="schedule_id"
                                value={formState.schedule_id}
                                onChange={handleFormChange}
                                disabled
                                className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground opacity-50 cursor-not-allowed"
                              >
                                <option value={formState.schedule_id}>
                                  {getScheduleDisplay(selectedTrip!)}
                                </option>
                              </select>
                            </div>
                          </div>
                        )}

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
                        {modalMode === 'add' ? 'Create All Trips' : 'Save Changes'}
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
                  {getScheduleDisplay(tripToDelete)}
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