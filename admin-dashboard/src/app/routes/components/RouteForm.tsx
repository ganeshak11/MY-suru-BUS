'use client';

import { Fragment } from 'react';

interface Route {
  route_id: number;
  route_name: string;
  route_no: string;
}

type FormState = Omit<Route, 'route_id'>;

interface RouteFormProps {
  formState: FormState;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEditSubmit: (e: React.FormEvent) => void;
  error: string | null;
  closeModal: () => void;
}

export default function RouteForm({ formState, handleFormChange, handleEditSubmit, error, closeModal }: RouteFormProps) {
  return (
    <form onSubmit={handleEditSubmit}>
      <div className="mt-6 sm:col-span-6">
        <label htmlFor="route_no" className="block text-sm font-medium text-secondary">Route Number</label>
        <input type="text" name="route_no" id="route_no" value={formState.route_no} onChange={handleFormChange} required className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" placeholder="e.g., 178B UP" />
      </div>
      <div className="mt-6 sm:col-span-6">
        <label htmlFor="route_name" className="block text-sm font-medium text-secondary">Route Name</label>
        <input type="text" name="route_name" id="route_name" value={formState.route_name} onChange={handleFormChange} required className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" placeholder="e.g., Colombo - Kandy" />
      </div>
      {/* --- UPDATED: Theme-aware error --- */}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button type="submit" className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm">
          Save Changes
        </button>
        {/* --- UPDATED: Theme-aware border --- */}
        <button type="button" onClick={closeModal} className="mt-3 inline-flex w-full justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}