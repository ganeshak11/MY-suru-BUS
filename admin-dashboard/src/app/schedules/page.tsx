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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Schedules</h1>
          <p className="text-secondary">Define when routes run</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium text-secondary hover:text-foreground hover:bg-card transition-all"
          >
            <FunnelIcon className="h-5 w-5" />
            Filter
          </button>
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <PlusIcon className="h-5 w-5" />
            Add Schedule
          </button>
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
      ) : filteredSchedules.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <ClockIcon className="mx-auto h-16 w-16 text-secondary/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No schedules found</h3>
          <p className="mt-2 text-secondary">Add your first schedule or adjust filters</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Route</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Start Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Day</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSchedules.map((schedule) => {
                const isToday = schedule.day_of_week === currentDay;
                return (
                  <tr key={schedule.schedule_id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary">
                      {schedule.routes?.route_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground font-mono">{schedule.start_time.slice(0, 5)}</td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      {daysOfWeek.find(d => d.value === schedule.day_of_week)?.label || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {isToday ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                          Active Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium">
                          Scheduled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal('edit', schedule)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDelete(schedule)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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