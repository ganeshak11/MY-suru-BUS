'use client';

import { useEffect, useState } from 'react';

interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_updated: string | null; // ISO timestamp
  current_trip_id: number | null;
}

type FormState = Omit<Bus, 'bus_id' | 'current_latitude' | 'current_longitude' | 'last_updated' | 'current_trip_id'>;

interface BusFormProps {
  initialData: FormState;
  onSubmit: (data: FormState) => void;
  error: string | null;
  modalMode: 'add' | 'edit';
  closeModal: () => void;
}

export default function BusForm({ initialData, onSubmit, error, modalMode, closeModal }: BusFormProps) {
  const [formData, setFormData] = useState<FormState>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label htmlFor="bus_no" className="block text-sm font-medium text-secondary">Bus Number</label>
          <div className="mt-1">
            {/* --- UPDATED: Use theme-aware border --- */}
            <input 
              type="text" 
              name="bus_no" 
              id="bus_no" 
              value={formData.bus_no} 
              onChange={handleChange} 
              required 
              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" 
            />
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>} {/* Use theme color */}
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="submit"
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
        >
          {modalMode === 'add' ? 'Create Bus' : 'Save Changes'}
        </button>
        <button
          type="button"
          className="mt-3 inline-flex w-full justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
          onClick={closeModal}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}