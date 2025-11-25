'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon, PencilIcon, TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal';
import DriverForm from './components/DriverForm';

// --- UPDATED: Interface now includes trip status ---
interface Driver {
  driver_id: number;
  name: string;
  email: string | null;
  phone_number: string;
  auth_user_id?: string | null;
  // This will hold the driver's *current* active trip
  trips: { trip_id: number; status: string }[];
  passenger_reports?: { count: number }[];
}

type FormState = Omit<Driver, 'driver_id' | 'trips'>;

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone_number: '',
  });
  const [error, setError] = useState<string | null>(null);

  // --- ADDED: State for delete modal ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  useEffect(() => {
    fetchDrivers();

    // --- ADDED: Real-time subscription for drivers AND trips ---
    const channel = supabase
      .channel('drivers-and-trips-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload) => { fetchDrivers(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => { fetchDrivers(); }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
    // --- END ADD ---
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      // --- UPDATED: Join with trips to get status ---
      .select('*, trips(trip_id, status), passenger_reports(count)')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drivers:', error);
      setError('Failed to fetch drivers. Please try again.');
    } else {
      setDrivers(data as Driver[]);
    }
    setLoading(false);
  };

  const openModal = (mode: 'add' | 'edit', driver?: Driver) => {
    setModalMode(mode);
    setError(null);
    if (mode === 'edit' && driver) {
      setSelectedDriver(driver);
      setFormState({
        name: driver.name,
        email: driver.email || '',
        phone_number: driver.phone_number,
      });
    } else {
      setSelectedDriver(null);
      setFormState({ name: '', email: '', phone_number: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = formState.name.trim();
    const trimmedPhone = formState.phone_number.trim();
    const trimmedEmail = formState.email?.trim();

    if (!trimmedName || !trimmedPhone) {
        setError("Name and Phone Number are required.");
        return;
    }

    if (trimmedName.length < 2) {
        setError("Name must be at least 2 characters.");
        return;
    }

    const updatedFormState = {
      name: trimmedName,
      phone_number: trimmedPhone,
      email: trimmedEmail || null
    };

    let result;
    if (modalMode === 'add') {
      result = await supabase.from('drivers').insert([updatedFormState]).select();
    } else if (selectedDriver) {
      result = await supabase.from('drivers').update(updatedFormState).eq('driver_id', selectedDriver.driver_id).select();
    }

    const { data, error: submissionError } = result || {};

    if (submissionError) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} driver:`, submissionError);
      setError(`Failed to ${modalMode} driver: ${submissionError.message}`);
    } else if (data) {
      // fetchDrivers(); // No longer needed, real-time listener will catch it
      closeModal();
    }
  };

  // --- UPDATED: Replaced window.confirm with modal ---
  const handleDelete = (driver: Driver) => {
    setDriverToDelete(driver);
    setIsDeleteModalOpen(true);
    setError(null); // Clear previous errors
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;

    // First, check for associated trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('trip_id')
      .eq('driver_id', driverToDelete.driver_id)
      .limit(1);

    if (tripsError) {
      console.error('Error checking for trips:', tripsError);
      setError(`Failed to check for associated trips: ${tripsError.message}`);
      setIsDeleteModalOpen(false); // Close modal on error
      return;
    }

    if (trips && trips.length > 0) {
      setError('This driver cannot be deleted because they are associated with one or more trips. Please reassign or delete the trips first.');
      setIsDeleteModalOpen(false); // Close modal on error
      return;
    }

    // If no trips, proceed with deletion
    const { error } = await supabase.from('drivers').delete().eq('driver_id', driverToDelete.driver_id);
    if (error) {
      console.error('Error deleting driver:', error);
      setError(`Failed to delete driver: ${error.message}`);
    } else {
      // setDrivers(drivers.filter(d => d.driver_id !== driver_id)); // No longer needed
    }
    
    setIsDeleteModalOpen(false);
    setDriverToDelete(null);
  };
  // --- END UPDATE ---

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Drivers</h1>
          <p className="text-secondary text-base">Manage your driver roster and track performance</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('add')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all hover:-translate-y-0.5 hover:scale-105"
        >
          <PlusIcon className="h-5 w-5" />
          Add Driver
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-primary/10 rounded-full"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center shadow-soft">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl mb-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-red-700 dark:text-red-300 font-semibold text-lg">{error}</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-card to-slate-50 dark:to-slate-900 rounded-2xl border border-border shadow-soft">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-4">
            <UserCircleIcon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No drivers found</h3>
          <p className="mt-2 text-secondary max-w-sm mx-auto">Get started by adding your first driver to the roster</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden overflow-x-auto shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Reports</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Current Trip</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-foreground/80">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {drivers.map((driver) => {
                  const activeTrip = driver.trips.find(trip => trip.status === 'En Route');
                  const reportCount = driver.passenger_reports?.[0]?.count || 0;
                  
                  return (
                    <tr key={driver.driver_id} className="hover:bg-primary/5 transition-all duration-200 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <UserCircleIcon className="h-6 w-6 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground">{driver.name}</span>
                        </div>
                      </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      <div className="flex flex-col gap-1">
                        <span>{driver.email || 'No email'}</span>
                        <span className="text-xs">{driver.phone_number}</span>
                      </div>
                    </td>
                      <td className="px-6 py-4">
                        {activeTrip ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium shadow-sm">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            En Route
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                            Idle
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {reportCount > 0 ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${
                            reportCount > 5 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                            reportCount > 2 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                            'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }`}>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {reportCount}
                          </span>
                        ) : (
                          <span className="text-sm text-secondary font-medium">No reports</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {activeTrip ? (
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <span className="text-primary">#</span>{activeTrip.trip_id}
                          </span>
                        ) : (
                          <span className="text-sm text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openModal('edit', driver)} 
                            className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Edit driver"
                            aria-label={`Edit driver ${driver.name}`}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(driver)} 
                            className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete driver"
                            aria-label={`Delete driver ${driver.name}`}
                          >
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
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add New Driver' : 'Edit Driver'}>
        <DriverForm
          formState={formState}
          handleFormChange={handleFormChange}
          handleSubmit={handleSubmit}
          error={error}
          modalMode={modalMode}
          closeModal={closeModal}
        />
      </Modal>

      {/* --- ADDED: Delete Confirmation Modal --- */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {driverToDelete && (
          <div>
            <p className="text-sm text-secondary">Are you sure you want to delete the driver <strong>{driverToDelete.name}</strong>? This action cannot be undone.</p>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
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