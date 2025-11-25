'use client';

import { Fragment } from 'react';
import dynamic from 'next/dynamic';

const StopLocationPicker = dynamic(() => import('./StopLocationPicker'), { ssr: false });

interface Stop {
  stop_id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
}

type FormState = {
  stop_name: string;
  latitude: string;
  longitude: string;
};

interface StopFormProps {
  formState: FormState;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error: string | null;
  modalMode: 'add' | 'edit';
  closeModal: () => void;
  useMap: boolean;
  setUseMap: (useMap: boolean) => void;
  handleLocationChange: (lat: number, lng: number) => void;
}

export default function StopForm({ formState, handleFormChange, handleSubmit, error, modalMode, closeModal, useMap, setUseMap, handleLocationChange }: StopFormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        <div className="sm:col-span-6">
          <label htmlFor="stop_name" className="block text-sm font-medium text-secondary">Stop Name</label>
          <div className="mt-1">
            <input type="text" name="stop_name" id="stop_name" value={formState.stop_name} onChange={handleFormChange} required maxLength={100} className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" placeholder="e.g., K.R. Circle" />
          </div>
        </div>
        <div className="sm:col-span-6">
          <button type="button" onClick={() => setUseMap(!useMap)} className="text-sm text-primary hover:text-primary/80">
            {useMap ? 'Enter Manually' : 'Choose from Map'}
          </button>
        </div>
        {useMap ? (
          <div className="sm:col-span-6">
            <StopLocationPicker
              latitude={formState.latitude ? parseFloat(String(formState.latitude)) : null}
              longitude={formState.longitude ? parseFloat(String(formState.longitude)) : null}
              onLocationChange={handleLocationChange}
            />
          </div>
        ) : (
          <>
            <div className="sm:col-span-3">
              <label htmlFor="latitude" className="block text-sm font-medium text-secondary">Latitude</label>
              <div className="mt-1">
                {/* --- UPDATED: Theme-aware border --- */}
                <input type="number" step="any" name="latitude" id="latitude" value={formState.latitude} onChange={handleFormChange} required className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="longitude" className="block text-sm font-medium text-secondary">Longitude</label>
              <div className="mt-1">
                {/* --- UPDATED: Theme-aware border --- */}
                <input type="number" step="any" name="longitude" id="longitude" value={formState.longitude} onChange={handleFormChange} required className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground" />
              </div>
            </div>
          </>
        )}
      </div>
      {/* --- UPDATED: Theme-aware error --- */}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="submit"
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
        >
          {modalMode === 'add' ? 'Create Stop' : 'Save Changes'}
        </button>
        <button
          type="button"
          // --- UPDATED: Theme-aware border ---
          className="mt-3 inline-flex w-full justify-center rounded-md border border-secondary/50 bg-card px-4 py-2 text-base font-medium text-foreground shadow-sm hover:bg-card-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
          onClick={closeModal}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}