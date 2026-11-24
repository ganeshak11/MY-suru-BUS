// Creates each day's trips from the schedules, so the service runs without an
// admin adding trips every morning.
import pool from '../database/db';
import { logger } from '../logger';
import { todayInIndia } from '../middleware/params';

export interface GenerateResult {
  date: string;
  created: number;
  trip_ids: number[];
  /** Schedules that run that day but couldn't get a trip because no default bus or driver is set. */
  missing_defaults: { schedule_id: number; route_name: string; start_time: string }[];
}

/**
 * Create the trips for `date` (YYYY-MM-DD, India) from every schedule that runs on
 * that weekday and has a default bus and driver. Safe to call any number of times:
 * an existing trip for a schedule and date is left alone (it may have been edited).
 */
export const generateTripsFor = async (date: string): Promise<GenerateResult> => {
  const created = await pool.query<{ trip_id: number }>(
    `INSERT INTO trips (schedule_id, bus_id, driver_id, trip_date, status)
     SELECT s.schedule_id, s.default_bus_id, s.default_driver_id, $1::date, 'Scheduled'
     FROM schedules s
     WHERE EXTRACT(ISODOW FROM $1::date)::smallint = ANY (s.days_of_week)
       AND s.default_bus_id IS NOT NULL
       AND s.default_driver_id IS NOT NULL
     ON CONFLICT (schedule_id, trip_date) DO NOTHING
     RETURNING trip_id`,
    [date]
  );
  const missing = await pool.query(
    `SELECT s.schedule_id, r.route_name, s.start_time
     FROM schedules s JOIN routes r ON r.route_id = s.route_id
     WHERE EXTRACT(ISODOW FROM $1::date)::smallint = ANY (s.days_of_week)
       AND (s.default_bus_id IS NULL OR s.default_driver_id IS NULL)
       AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.schedule_id = s.schedule_id AND t.trip_date = $1::date)
     ORDER BY r.route_name, s.start_time`,
    [date]
  );
  return {
    date,
    created: created.rowCount ?? 0,
    trip_ids: created.rows.map((r) => r.trip_id),
    missing_defaults: missing.rows,
  };
};

/** Keep today's and tomorrow's trips in place. Runs on startup and every 30 minutes. */
export const startDailyTripScheduler = (): NodeJS.Timeout => {
  const run = async () => {
    for (const date of [todayInIndia(), todayInIndia(1)]) {
      try {
        const r = await generateTripsFor(date);
        if (r.created > 0 || r.missing_defaults.length > 0) {
          logger.info({ date, created: r.created, missing_defaults: r.missing_defaults.length }, 'Daily trips generated');
        }
      } catch (err) {
        logger.error({ err, date }, 'Daily trip generation failed');
      }
    }
  };
  void run();
  const timer = setInterval(run, 30 * 60_000);
  timer.unref();
  return timer;
};
