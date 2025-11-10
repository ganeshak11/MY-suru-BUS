'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal';
import BusForm from './components/BusForm';
import BusList from './components/BusList';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_updated: string | null; // ISO timestamp
  current_trip_id: number | null;
}

type FormState = Omit<Bus, 'bus_id' | 'current_latitude' | 'current_longitude' | 'last_updated' | 'current_trip_id'>;

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [busToDelete, setBusToDelete] = useState<Bus | null>(null);

  useEffect(() => {
    fetchBuses();

    // --- ADDED: Real-time subscription ---
    const channel = supabase
      .channel('buses-table-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buses' },
        (payload) => {
          // Refetch all buses when any change occurs
          fetchBuses();
        }
      )
      .subscribe();

    // Cleanup function to remove the channel subscription
    return () => {
      supabase.removeChannel(channel);
    };
    // --- END ADD ---
  }, []); // Dependency array is empty to run only on mount

  const fetchBuses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('bus_no', { ascending: true });

    if (error) {
      console.error('Error fetching buses:', error);
      setError('Failed to fetch buses. Please try again.');
    } else {
      setBuses(data as Bus[]);
    }
    setLoading(false);
  };

  const openModal = (mode: 'add' | 'edit', bus?: Bus) => {
    setModalMode(mode);
    setError(null);
    if (mode === 'edit' && bus) {
      setSelectedBus(bus);
    } else {
      setSelectedBus(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (formData: FormState) => {
    setError(null);
    const { bus_no } = formData;
    if (!bus_no) {
        setError("Bus Number is required.");
        return;
    }
    let result;
    if (modalMode === 'add') {
      result = await supabase.from('buses').insert([{ bus_no }]).select();
    } else if (selectedBus) {
      result = await supabase.from('buses').update({ bus_no }).eq('bus_id', selectedBus.bus_id).select();
    }
    const { data, error: submissionError } = result || {};
    if (submissionError) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} bus:`, submissionError);
      setError(`Failed to ${modalMode} bus: ${submissionError.message}`);
    } else if (data) {
      // fetchBuses(); // No longer needed, real-time listener will catch it
      closeModal();
    }
  };

  const handleDelete = (bus: Bus) => {
    setBusToDelete(bus);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (busToDelete) {
      setError(null);
      const { data, error } = await supabase.functions.invoke('delete-bus', {
        body: { bus_id: busToDelete.bus_id },
      });

      if (error) {
        console.error('Error deleting bus:', error);
        if (error instanceof FunctionsHttpError) {
          try {
            const errorDetails = await error.context.json();
            if (errorDetails.error) {
              setError(`Failed to delete bus: ${errorDetails.error}`);
            } else {
              setError('An unknown error occurred while deleting the bus.');
            }
          } catch (parseError) {
            setError(`Failed to delete bus: ${error.message}`);
          }
        } else {
          setError(`Failed to delete bus: ${error.message}`);
        }
      } else if (data?.error) {
        setError(data.error);
      } else {
        // fetchBuses(); // No longer needed, real-time listener will catch it
      }
      setIsDeleteModalOpen(false);
      setBusToDelete(null);
    }
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-foreground">Manage Buses</h1>
          <p className="mt-2 text-sm text-secondary">Add, edit, and remove buses from the system.</p>
        </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center space-x-4">
          <button
            type="button"
            onClick={() => fetchBuses()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 sm:w-auto"
            >
            Refresh
            </button>
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Bus
          </button>
        </div>
      </div>

      <BusList
        buses={buses}
        loading={loading}
        error={error}
        openModal={openModal}
        handleDelete={handleDelete}
      />
      <Modal isOpen={isModalOpen} onClose={closeModal} title={modalMode === 'add' ? 'Add New Bus' : 'Edit Bus'}>
        <BusForm
          initialData={selectedBus ? { bus_no: selectedBus.bus_no } : { bus_no: '' }}
          onSubmit={handleSave}
          error={error}
          modalMode={modalMode}
          closeModal={closeModal}
        />
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        {busToDelete && (
          <div>
            <p className="text-sm text-secondary">Are you sure you want to delete bus number <strong>{busToDelete.bus_no}</strong>? This action cannot be undone.</p>
            {/* --- UPDATED: Theme-aware buttons --- */}
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
            {/* --- END UPDATE --- */}
          </div>
        )}
      </Modal>
    </div>
  );
}