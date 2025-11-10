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
    return <p className="mt-8 text-center">Loading buses...</p>;
  }

  if (error) {
    return <p className="mt-8 text-center text-danger">{error}</p>; // Use theme color
  }

  if (buses.length === 0) {
    return (
      <div className="mt-8 text-center">
        <TruckIcon className="mx-auto h-12 w-12 text-secondary" />
        <h3 className="mt-2 text-sm font-medium text-foreground">No buses found</h3>
        <p className="mt-1 text-sm text-secondary">Get started by adding your first bus.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col">
      <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-table-header">
                {/* --- UPDATED: Added new columns --- */}
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Bus Number</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Current Trip ID</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Last Updated</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
                {/* --- END UPDATE --- */}
              </thead>
              <tbody className="divide-y divide-gray-200 bg-table">
                {buses.map((bus) => (
                  <tr key={bus.bus_id} className="hover:bg-table-row-hover">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{bus.bus_no}</td>
                    
                    {/* --- UPDATED: Added new data cells --- */}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                      {bus.current_trip_id ? (
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
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                      {bus.current_trip_id || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-secondary">
                      {bus.last_updated ? new Date(bus.last_updated).toLocaleString() : 'N/A'}
                    </td>
                    {/* --- END UPDATE --- */}

                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button onClick={() => openModal('edit', bus)} className="text-primary hover:text-primary/80 mr-4">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      {/* --- UPDATED: Use theme color --- */}
                      <button onClick={() => handleDelete(bus)} className="text-danger hover:text-danger/80">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}