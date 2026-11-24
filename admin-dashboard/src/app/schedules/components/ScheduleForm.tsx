'use client';


interface Route {
  route_id: number;
  route_name: string;
}

import type { ScheduleFormState as FormState } from '../types';

const DAYS: [number, string][] = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']];

interface ScheduleFormProps {
  formState: FormState;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error: string | null;
  modalMode: 'add' | 'edit';
  closeModal: () => void;
  routes: Route[];
  buses: { bus_id: number; bus_no: string }[];
  drivers: { driver_id: number; name: string }[];
  toggleDay: (day: number) => void;
}



export default function ScheduleForm({ formState, handleFormChange, handleSubmit, error, modalMode, closeModal, routes, buses, drivers, toggleDay }: ScheduleFormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Route Selection */}
        <div className="sm:col-span-6">
          <label htmlFor="route_id" className="block text-sm font-medium text-secondary">Route</label>
          <div className="mt-1">
            <select
              id="route_id"
              name="route_id"
              value={formState.route_id}
              onChange={handleFormChange}
              required
              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
            >
              <option value={0}>-- Select a Route --</option>
              {routes.map(route => (
                <option key={route.route_id} value={route.route_id}>
                  {route.route_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start Time */}
        <div className="sm:col-span-6">
          <label htmlFor="start_time" className="block text-sm font-medium text-secondary">Start Time</label>
          <div className="mt-1">
            <input
              type="time"
              name="start_time"
              id="start_time"
              value={formState.start_time.substring(0, 5)}
              onChange={(e) => {
                const timeValue = e.target.value;
                handleFormChange({
                  target: {
                    name: 'start_time',
                    value: `${timeValue}:00`
                  }
                } as any);
              }}
              required
              step="60"
              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
            />
            <p className="text-xs text-secondary mt-1">Select the departure time for this schedule</p>
          </div>
        </div>

        {/* Days of the week */}
        <fieldset className="sm:col-span-6">
          <legend className="block text-sm font-medium text-secondary">Runs on</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map(([d, label]) => {
              const on = formState.days_of_week.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  aria-pressed={on}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    on ? 'border-primary bg-primary text-white' : 'border-secondary/50 text-foreground hover:bg-primary/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Default bus and driver */}
        <div className="sm:col-span-3">
          <label htmlFor="default_bus_id" className="block text-sm font-medium text-secondary">Default bus</label>
          <select
            id="default_bus_id"
            name="default_bus_id"
            value={formState.default_bus_id ?? ''}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
          >
            <option value="">— None —</option>
            {buses.map((b) => <option key={b.bus_id} value={b.bus_id}>{b.bus_no}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="default_driver_id" className="block text-sm font-medium text-secondary">Default driver</label>
          <select
            id="default_driver_id"
            name="default_driver_id"
            value={formState.default_driver_id ?? ''}
            onChange={handleFormChange}
            className="mt-1 block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
          >
            <option value="">— None —</option>
            {drivers.map((d) => <option key={d.driver_id} value={d.driver_id}>{d.name}</option>)}
          </select>
        </div>
        <p className="sm:col-span-6 -mt-3 text-xs text-secondary">
          {formState.default_bus_id && formState.default_driver_id
            ? "Trips are created automatically for each day this runs. You can still change a single day's bus or driver on the Trips page."
            : 'Set a default bus and driver to have trips created automatically every day.'}
        </p>

      </div>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="submit"
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:col-start-2 sm:text-sm"
        >
          {modalMode === 'add' ? 'Create Schedule' : 'Save Changes'}
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