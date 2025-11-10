'use client';

import { Fragment } from 'react';

interface Route {
  route_id: number;
  route_name: string;
}

interface Schedule {
  schedule_id: number;
  route_id: number;
  start_time: string; // HH:MM:SS
  day_of_week: number; // 1 for Monday, 7 for Sunday
  routes?: Route; // Joined route data
}

type FormState = Omit<Schedule, 'schedule_id' | 'routes'>;

interface ScheduleFormProps {
  formState: FormState;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error: string | null;
  modalMode: 'add' | 'edit';
  closeModal: () => void;
  routes: Route[];
}

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export default function ScheduleForm({ formState, handleFormChange, handleSubmit, error, modalMode, closeModal, routes }: ScheduleFormProps) {
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
          <label htmlFor="start_time" className="block text-sm font-medium text-secondary">Start Time (HH:MM:SS)</label>
          <div className="mt-1">
            <input
              type="text"
              name="start_time"
              id="start_time"
              value={formState.start_time}
              onChange={handleFormChange}
              placeholder="HH:MM:SS"
              pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
              title="Format: HH:MM:SS"
              required
              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
            />
          </div>
        </div>

        {/* Day of Week */}
        <div className="sm:col-span-6">
          <label htmlFor="day_of_week" className="block text-sm font-medium text-secondary">Day of Week</label>
          <div className="mt-1">
            <select
              id="day_of_week"
              name="day_of_week"
              value={formState.day_of_week}
              onChange={handleFormChange}
              required
              className="block w-full rounded-md border-secondary/50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-background text-foreground"
            >
              {daysOfWeek.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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