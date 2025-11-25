'use client';

import { PencilIcon, TrashIcon, TruckIcon } from '@heroicons/react/24/outline';

interface Bus {
  bus_id: number;
  bus_no: string;
  current_latitude: number | null;
  current_longitude: number | null;
  last_updated: string | null;
  current_trip_id: number | null;
  passenger_reports?: { count: number }[];
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
    <div className="bg-card rounded-2xl border border-border overflow-hidden overflow-x-auto shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Bus Number</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Reports</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Current Trip</th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">Last Updated</th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-foreground/80">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {buses.map((bus) => {
              const reportCount = bus.passenger_reports?.[0]?.count || 0;
              return (
              <tr key={bus.bus_id} className="hover:bg-primary/5 transition-all duration-200 group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <TruckIcon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">{bus.bus_no}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {bus.current_trip_id ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium shadow-sm">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      En Route
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                      Idle
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {reportCount > 0 ? (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${
                      reportCount > 5 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                      reportCount > 2 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {reportCount}
                    </span>
                  ) : (
                    <span className="text-sm text-secondary font-medium">No reports</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {bus.current_trip_id ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <span className="text-primary">#</span>{bus.current_trip_id}
                    </span>
                  ) : (
                    <span className="text-sm text-secondary">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-secondary">
                  {bus.last_updated ? new Date(bus.last_updated).toLocaleString('en-GB', { 
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                  }) : '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openModal('edit', bus)} 
                      className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      title="Edit bus"
                      aria-label={`Edit bus ${bus.bus_no}`}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(bus)} 
                      className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Delete bus"
                      aria-label={`Delete bus ${bus.bus_no}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}