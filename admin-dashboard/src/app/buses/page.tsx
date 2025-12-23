'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { PlusIcon } from '@heroicons/react/24/outline';
import Modal from '@/app/components/Modal';
import BusForm from './components/BusForm';
import BusList from './components/BusList';

interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_updated: string | null; // ISO timestamp
  current_trip_id: number | null;
  passenger_reports?: { count: number }[];
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
    const interval = setInterval(fetchBuses, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getBuses();
      setBuses(data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching buses:', error);
      setError('Failed to fetch buses. Please try again.');
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
    setError(null);
  };

  const handleSave = async (formData: FormState) => {
    setError(null);
    const { bus_no } = formData;
    const trimmedBusNo = bus_no.trim();
    
    if (!trimmedBusNo) {
        setError("Bus Number is required.");
        return;
    }
    
    if (trimmedBusNo.length < 2) {
        setError("Bus Number must be at least 2 characters.");
        return;
    }
    
    const isDuplicate = buses.some(b => 
      b.bus_no.toLowerCase() === trimmedBusNo.toLowerCase() && 
      b.bus_id !== selectedBus?.bus_id
    );
    
    if (isDuplicate) {
        setError(`Bus number "${trimmedBusNo}" already exists.`);
        return;
    }
    
    try {
      if (modalMode === 'add') {
        await apiClient.createBus({ bus_no: trimmedBusNo });
      } else if (selectedBus) {
        await apiClient.updateBus(selectedBus.bus_id, { bus_no: trimmedBusNo });
      }
      fetchBuses();
      closeModal();
    } catch (error: any) {
      console.error(`Error ${modalMode === 'add' ? 'adding' : 'updating'} bus:`, error);
      setError(`Failed to ${modalMode} bus: ${error.message}`);
    }
  };

  const handleDelete = (bus: Bus) => {
    setBusToDelete(bus);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (busToDelete) {
      setError(null);
      try {
        await apiClient.deleteBus(busToDelete.bus_id);
        fetchBuses();
      } catch (error: any) {
        console.error('Error deleting bus:', error);
        setError(`Failed to delete bus: ${error.message}`);
      }
      setIsDeleteModalOpen(false);
      setBusToDelete(null);
    }
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Buses</h1>
          <p className="text-secondary text-base">Manage your bus fleet and monitor performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openModal('add')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl transition-all hover:-translate-y-0.5 hover:scale-105"
          >
            <PlusIcon className="h-5 w-5" />
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

      <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setError(null); }} title="Confirm Deletion">
        {busToDelete && (
          <div>
            <p className="text-sm text-secondary">Are you sure you want to delete bus number <strong>{busToDelete.bus_no}</strong>? This action cannot be undone.</p>
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
            {/* --- END UPDATE --- */}
          </div>
        )}
      </Modal>
    </div>
  );
}