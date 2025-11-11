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
      .select('*, trips(trip_id, status)')
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

    if (!formState.name || !formState.phone_number) {
        setError("Name and Phone Number are required.");
        return;
    }

    let result;
    if (modalMode === 'add') {
      result = await supabase.from('drivers').insert([formState]).select();
    } else if (selectedDriver) {
      result = await supabase.from('drivers').update(formState).eq('driver_id', selectedDriver.driver_id).select();
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Drivers</h1>
          <p className="text-secondary">Manage your driver roster</p>
        </div>
        <button
          type="button"
          onClick={() => openModal('add')}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <PlusIcon className="h-5 w-5" />
          Add Driver
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
          <p className="text-danger font-medium">{error}</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <UserCircleIcon className="mx-auto h-16 w-16 text-secondary/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No drivers found</h3>
          <p className="mt-2 text-secondary">Get started by adding your first driver</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-card">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Current Trip</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drivers.map((driver) => {
                const activeTrip = driver.trips.find(trip => trip.status === 'En Route');
                
                return (
                  <tr key={driver.driver_id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{driver.name}</td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      <div className="flex flex-col gap-1">
                        <span>{driver.email || 'No email'}</span>
                        <span className="text-xs">{driver.phone_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {activeTrip ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                          En Route
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium">
                          <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                          Idle
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary">
                      {activeTrip ? `Trip #${activeTrip.trip_id}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModal('edit', driver)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDelete(driver)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors">
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