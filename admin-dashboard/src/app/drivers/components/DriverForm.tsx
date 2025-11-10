'use client';

import { Fragment } from 'react';

interface Driver {
  driver_id: number;
  name: string;
  email: string | null;
  phone_number: string;
  auth_user_id?: string | null;
}

type FormState = Omit<Driver, 'driver_id' | 'trips'>; // Also remove 'trips'

interface DriverFormProps {
  formState: FormState;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error: string | null;
  modalMode: 'add' | 'edit';
  closeModal: () => void;
}

export default function DriverForm({ formState, handleFormChange, handleSubmit, error, modalMode, closeModal }: DriverFormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label htmlFor="name" className="block text-sm font-medium text-secondary">Full Name</label>
          <div className="mt-1">
            {/* --- UPDATED: Theme-aware border --- */}
            <input type="text" name="name" id="name" value={formState.name} onChange={handleFormChange} required className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" />
          </div>
        </div>
        <div className="sm:col-span-6">
          <label htmlFor="email" className="block text-sm font-medium text-secondary">Email (Optional)</label>
          <div className="mt-1">
            {/* --- UPDATED: Theme-aware border --- */}
            <input type="email" name="email" id="email" value={formState.email || ''} onChange={handleFormChange} className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" />
          </div>
        </div>
        <div className="sm:col-span-6">
          <label htmlFor="phone_number" className="block text-sm font-medium text-secondary">Phone Number</label>
          <div className="mt-1">
            {/* --- UPDATED: Theme-aware border --- */}
            <input type="text" name="phone_number" id="phone_number" value={formState.phone_number} onChange={handleFormChange} required className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" />
          </div>
        </div>
      </div>
      {/* --- UPDATED: Theme-aware error --- */}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="submit"
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
        >
          {modalMode === 'add' ? 'Create Driver' : 'Save Changes'}
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