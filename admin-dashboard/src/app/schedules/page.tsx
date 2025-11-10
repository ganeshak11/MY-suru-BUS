'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, FunnelIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal';
import ScheduleForm from './components/ScheduleForm';

interface Route {
  route_id: number;
  route_name: string;
}

interface Schedule {
  schedule_id: number;
  route_id: number;
  start_time: string; // HH:MM:SS
  day_of_week: number; // 1 for Monday, 7 for Sunday
  routes?: Route; // Joined route data, now an object
}

type FormState = Omit<Schedule, 'schedule_id' | 'routes'>;

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]); // For dropdown
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formState, setFormState] = useState<FormState>({
    route_id: 0,
    start_time: '00:00:00',
    day_of_week: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // --- ADDED: Delete Modal State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);

  const [filters, setFilters] = useState({
    route_id: '',
    day_of_week: '',
    start_time: ''
  });
  
  // Get current day for visual status (1=Monday... 7=Sunday)
  const currentDay = new Date().getDay() || 7; 

  useEffect(() => {
    fetchSchedules();
    fetchRoutes();
    
    // --- ADDED: Real-time subscription ---
    const channel = supabase
      .channel('schedules-table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // --- END ADDED ---
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    // --- FIX: Use alias to ensure single object join ---
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        schedule_id,
        route_id,
        start_time,
        day_of_week,
        routes:route_id (route_id, route_name)
      `)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedules:', error);
      setError('Failed to fetch schedules. Please try again.');
    } else {
      // TypeScript fix for joined object structure
      const formattedData = data.map((item: any) => ({
        ...item,
        routes: item.routes, // already correctly aliased to an object
      }));
      setSchedules(formattedData as Schedule[]);
    }
    setLoading(false);
  };

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from('routes')
      .select('route_id, route_name')
      .order('route_name', { ascending: true });

    if (error) {
      console.error('Error fetching routes:', error);
    } else {
      setRoutes(data as Route[]);
    }
  };

  const openModal = (mode: 'add' | 'edit', schedule?: Schedule) => {
    setModalMode(mode);
    setError(null);
    if (mode === 'edit' && schedule) {
      setSelectedSchedule(schedule);
      setFormState({
        route_id: schedule.route_id,
        start_time: schedule.start_time,
        day_of_week: schedule.day_of_week,
      });
    } else {
      setSelectedSchedule(null);
      setFormState({
        route_id: routes.length > 0 ? routes[0].route_id : 0, 
        start_time: '00:00:00',
        day_of_week: 1,
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
      [name]: name === 'route_id' || name === 'day_of_week' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { route_id, start_time, day_of_week } = formState;

    if (!route_id || !start_time || !day_of_week) {
        setError("All fields are required.");
        return;
    }

    let result;
    if (modalMode === 'add') {
      // Assuming 'create-schedule' Edge Function handles insertion and checks
      result = await supabase.functions.invoke('create-schedule', {
        body: { route_id, start_time, day_of_week },
      });
    } else if (selectedSchedule) {
      result = await supabase.from('schedules').update({ route_id, start_time, day_of_week }).eq('schedule_id', selectedSchedule.schedule_id).select();
    }

    const { data, error: submissionError } = result || {};

    if (submissionError) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} schedule:`, submissionError);
      setError(`Failed to ${modalMode} schedule: ${submissionError.message}`);
    } else if (data) {
      // fetchSchedules(); // Real-time handles this
      closeModal();
    }
  };

  // --- UPDATED: Delete handler uses modal ---
  const handleDelete = (schedule: Schedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    // Deleting a schedule might cascade delete trips, so we check first
    // Check for future/active trips first to warn user (Optional, but good UX)
    
    const { error } = await supabase.from('schedules').delete().eq('schedule_id', scheduleToDelete.schedule_id);

    if (error) {
      console.error('Error deleting schedule:', error);
      setError(`Failed to delete schedule: ${error.message}`);
    } else {
      // Success is handled by real-time listener
    }
    
    setIsDeleteModalOpen(false);
    setScheduleToDelete(null);
  };
  // --- END UPDATED ---

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      route_id: '',
      day_of_week: '',
      start_time: ''
    });
    setIsFilterModalOpen(false);
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (filters.route_id && schedule.route_id !== parseInt(filters.route_id)) {
      return false;
    }
    if (filters.day_of_week && schedule.day_of_week !== parseInt(filters.day_of_week)) {
      return false;
    }
    if (filters.start_time && schedule.start_time.slice(0, 5) !== filters.start_time) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-foreground">Manage Schedules</h1>
          <p className="mt-2 text-sm text-secondary">Define when specific routes are scheduled to run.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto mr-4"
          >
            <FunnelIcon className="-ml-1 mr-2 h-5 w-5" />
            Filter
          </button>
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Schedule
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-secondary">Loading schedules...</p>
      ) : error ? (
        <p className="mt-8 text-center text-danger">{error}</p>
      ) : filteredSchedules.length === 0 ? (
        <div className="mt-8 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-secondary" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No schedules found</h3>
            <p className="mt-1 text-sm text-secondary">Get started by adding your first schedule or adjust your filters.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-secondary/30">
                  <thead className="bg-table-header">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Route</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Start Time</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Day of Week</th>
                      {/* --- ADDED: Live Status Column --- */}
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Status</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30 bg-table">
                    {filteredSchedules.map((schedule) => {
                      const isToday = schedule.day_of_week === currentDay;
                      return (
                        <tr key={schedule.schedule_id} className="hover:bg-table-row-hover">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-primary sm:pl-6">
                            {schedule.routes?.route_name || 'N/A'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">{schedule.start_time}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                            {daysOfWeek.find(d => d.value === schedule.day_of_week)?.label || 'N/A'}
                          </td>
                          {/* --- ADDED: Live Status Data --- */}
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {isToday ? (
                              <span className="inline-flex items-center rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
                                Active Today
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-medium text-secondary">
                                Scheduled
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button onClick={() => openModal('edit', schedule)} className="text-primary hover:text-primary/80 mr-4">
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleDelete(schedule)} className="text-danger hover:text-danger/80">
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add New Schedule' : 'Edit Schedule'}>
        <ScheduleForm
          formState={formState}
          handleFormChange={handleFormChange}
          handleSubmit={handleSubmit}
          error={error}
          modalMode={modalMode}
          closeModal={closeModal}
          routes={routes}
        />
      </Modal>

      {/* --- FILTER MODAL (Theme-aware updates) --- */}
      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filter Schedules">
        <div className="p-4">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="route_id" className="block text-sm font-medium text-secondary">Route</label>
              <select
                id="route_id"
                name="route_id"
                value={filters.route_id}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
              >
                <option value="">All Routes</option>
                {routes.map(route => (
                  <option key={route.route_id} value={route.route_id}>{route.route_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="day_of_week" className="block text-sm font-medium text-secondary">Day of Week</label>
              <select
                id="day_of_week"
                name="day_of_week"
                value={filters.day_of_week}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
              >
                <option value="">All Days</option>
                {daysOfWeek.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-secondary">Start Time</label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={filters.start_time}
                onChange={handleFilterChange}
                className="mt-1 block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <button type="button" onClick={clearFilters} className="inline-flex items-center justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              Clear Filters
            </button>
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={() => setIsFilterModalOpen(false)} className="inline-flex items-center justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                Cancel
              </button>
              <button type="button" onClick={applyFilters} className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </Modal>
      
      {/* --- ADDED: Delete Confirmation Modal --- */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {scheduleToDelete && (
          <div>
            <p className="text-sm text-secondary">
              Are you sure you want to delete the schedule for route <strong>{scheduleToDelete.routes?.route_name || 'N/A'}</strong> on <strong>{daysOfWeek.find(d => d.value === scheduleToDelete.day_of_week)?.label}</strong> at <strong>{scheduleToDelete.start_time}</strong>?
            </p>
            <p className="mt-2 text-sm font-semibold text-danger">
              Warning: This may automatically delete any future scheduled trips associated with this time slot.
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
                Delete Schedule
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}