'use client';

import { PencilIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';

interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_updated: string | null;
  current_trip_id: number | null;
}

interface BusListProps {
  buses: Bus[];
  loading: boolean;
  error: string | null;
  openModal: (mode: 'add' | 'edit', bus?: Bus) => void;
  handleDelete: (bus: Bus) => void;
}

export default function BusList({ buses, loading, error, openModal, handleDelete }: BusListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center">
        <p className="text-danger font-medium">{error}</p>
      </div>
    );
  }

  if (buses.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-2xl border border-border">
        <TruckIcon className="mx-auto h-16 w-16 text-secondary/50" />
        <h3 className="mt-4 text-lg font-medium text-foreground">No buses found</h3>
        <p className="mt-2 text-secondary">Get started by adding your first bus</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-card">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Bus Number</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Current Trip</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Last Updated</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {buses.map((bus) => (
            <tr key={bus.bus_id} className="hover:bg-primary/5 transition-colors">
              <td className="px-6 py-4 font-medium text-foreground">{bus.bus_no}</td>
              <td className="px-6 py-4">
                {bus.current_trip_id ? (
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
                {bus.current_trip_id ? `Trip #${bus.current_trip_id}` : '—'}
              </td>
              <td className="px-6 py-4 text-sm text-secondary">
                {bus.last_updated ? new Date(bus.last_updated).toLocaleString() : '—'}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openModal('edit', bus)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(bus)} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}