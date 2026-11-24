export interface ScheduleFormState {
  route_id: number;
  start_time: string;
  days_of_week: number[];          // ISO: 1 = Monday … 7 = Sunday
  default_bus_id: number | null;   // with a default driver, trips are created automatically
  default_driver_id: number | null;
}
