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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-foreground">Manage Drivers</h1>
          <p className="mt-2 text-sm text-secondary">A list of all the drivers in the system.</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Driver
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-center">Loading drivers...</p>
      ) : error ? (
         <p className="mt-8 text-center text-danger">{error}</p> // --- UPDATED: Theme color
      ) : drivers.length === 0 ? (
        <div className="mt-8 text-center">
            <UserCircleIcon className="mx-auto h-12 w-12 text-secondary" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No drivers found</h3>
            <p className="mt-1 text-sm text-secondary">Get started by adding a new driver.</p>
        </div>
      ) : (
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {/* --- UPDATED: Theme-aware dividers --- */}
                <table className="min-w-full divide-y divide-secondary/30">
                  <thead className="bg-table-header">
                    {/* --- UPDATED: Added new columns --- */}
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Contact</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Status</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Current Trip ID</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/30 bg-table">
                    {drivers.map((driver) => {
                      // --- ADDED: Find active trip ---
                      const activeTrip = driver.trips.find(trip => trip.status === 'En Route');
                      
                      return (
                        <tr key={driver.driver_id} className="hover:bg-table-row-hover">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{driver.name}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                            <div>{driver.email || 'No email'}</div>
                            <div>{driver.phone_number}</div>
                          </td>
                          {/* --- ADDED: Status Cell --- */}
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                            {activeTrip ? (
                              <span className="inline-flex items-center rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-medium text-success">
                                <span className="mr-1.5 h-2 w-2 rounded-full bg-success"></span>
                                En Route
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-secondary/20 px-2.5 py-0.5 text-xs font-medium text-secondary">
                                <span className="mr-1.5 h-2 w-2 rounded-full bg-secondary"></span>
                                Idle
                              </span>
                            )}
                          </td>
                          {/* --- ADDED: Trip ID Cell --- */}
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                            {activeTrip?.trip_id || 'N/A'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button onClick={() => openModal('edit', driver)} className="text-primary hover:text-primary/80 mr-4">
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            {/* --- UPDATED: Theme color --- */}
                            <button onClick={() => handleDelete(driver)} className="text-danger hover:text-danger/80">
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