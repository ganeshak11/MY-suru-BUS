-- ============================================================
-- Data Export Queries — Run in OLD PostgreSQL instance
-- Each query produces ONE cell containing all INSERT statements.
-- Click the cell → Ctrl+A → Ctrl+C to copy. Then paste in new project.
-- Run in order (1 → 13) to respect FK dependencies.
-- ============================================================

-- 1. ROUTES
SELECT string_agg(
  'INSERT INTO public.routes (route_id, route_name, route_no) OVERRIDING SYSTEM VALUE VALUES ('
  || route_id || ','
  || '''' || REPLACE(route_name, '''', '''''') || ''','
  || COALESCE('''' || REPLACE(route_no, '''', '''''') || '''', 'NULL')
  || ');',
  E'\n' ORDER BY route_id
) AS sql_output FROM public.routes;

-- 2. STOPS
SELECT string_agg(
  'INSERT INTO public.stops (stop_id, stop_name, latitude, longitude, geofence_radius_meters) OVERRIDING SYSTEM VALUE VALUES ('
  || stop_id || ','
  || '''' || REPLACE(stop_name, '''', '''''') || ''','
  || latitude || ',' || longitude || ',' || geofence_radius_meters
  || ');',
  E'\n' ORDER BY stop_id
) AS sql_output FROM public.stops;

-- 3. ROUTE_STOPS
SELECT string_agg(
  'INSERT INTO public.route_stops (route_stop_id, route_id, stop_id, stop_sequence, time_offset_from_start) OVERRIDING SYSTEM VALUE VALUES ('
  || route_stop_id || ',' || route_id || ',' || stop_id || ',' || stop_sequence || ','
  || COALESCE('''' || time_offset_from_start::text || '''', 'NULL')
  || ');',
  E'\n' ORDER BY route_id, stop_sequence
) AS sql_output FROM public.route_stops;

-- 4. SCHEDULES
SELECT string_agg(
  'INSERT INTO public.schedules (schedule_id, route_id, start_time) OVERRIDING SYSTEM VALUE VALUES ('
  || schedule_id || ',' || route_id || ','
  || '''' || start_time::text || ''''
  || ');',
  E'\n' ORDER BY schedule_id
) AS sql_output FROM public.schedules;

-- 5. BUSES (without current_trip_id — set later after trips are inserted)
SELECT string_agg(
  'INSERT INTO public.buses (bus_id, bus_no, current_latitude, current_longitude, current_speed_kmh, last_updated) OVERRIDING SYSTEM VALUE VALUES ('
  || bus_id || ','
  || '''' || REPLACE(bus_no, '''', '''''') || ''','
  || COALESCE(current_latitude::text, 'NULL') || ','
  || COALESCE(current_longitude::text, 'NULL') || ','
  || COALESCE(current_speed_kmh::text, 'NULL') || ','
  || COALESCE('''' || last_updated::text || '''', 'NULL')
  || ');',
  E'\n' ORDER BY bus_id
) AS sql_output FROM public.buses;

-- 6. DRIVERS (skips auth_user_id — not in new schema)
SELECT string_agg(
  'INSERT INTO public.drivers (driver_id, name, email, phone_number, profile_photo_url) OVERRIDING SYSTEM VALUE VALUES ('
  || driver_id || ','
  || '''' || REPLACE(name, '''', '''''') || ''','
  || COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ','
  || '''' || REPLACE(phone_number, '''', '''''') || ''','
  || COALESCE('''' || REPLACE(COALESCE(profile_photo_url,''), '''', '''''') || '''', 'NULL')
  || ');',
  E'\n' ORDER BY driver_id
) AS sql_output FROM public.drivers;

-- 7. TRIPS
SELECT string_agg(
  'INSERT INTO public.trips (trip_id, schedule_id, bus_id, driver_id, trip_date, status) OVERRIDING SYSTEM VALUE VALUES ('
  || trip_id || ',' || schedule_id || ',' || bus_id || ',' || driver_id || ','
  || '''' || trip_date::text || ''','
  || '''' || status::text || ''''
  || ');',
  E'\n' ORDER BY trip_id
) AS sql_output FROM public.trips;

-- 8. UPDATE buses.current_trip_id (circular FK — buses that are currently on a trip)
SELECT string_agg(
  'UPDATE public.buses SET current_trip_id = ' || current_trip_id || ' WHERE bus_id = ' || bus_id || ';',
  E'\n' ORDER BY bus_id
) AS sql_output FROM public.buses WHERE current_trip_id IS NOT NULL;

-- 9. TRIP_STOP_TIMES
SELECT string_agg(
  'INSERT INTO public.trip_stop_times (trip_stop_id, trip_id, stop_id, actual_arrival_time, actual_departure_time, predicted_arrival_time) OVERRIDING SYSTEM VALUE VALUES ('
  || trip_stop_id || ',' || trip_id || ',' || stop_id || ','
  || COALESCE('''' || actual_arrival_time::text || '''', 'NULL') || ','
  || COALESCE('''' || actual_departure_time::text || '''', 'NULL') || ','
  || COALESCE('''' || predicted_arrival_time::text || '''', 'NULL')
  || ');',
  E'\n' ORDER BY trip_stop_id
) AS sql_output FROM public.trip_stop_times;

-- 10. PASSENGER_REPORTS
SELECT string_agg(
  'INSERT INTO public.passenger_reports (report_id, created_at, report_type, message, status, trip_id, bus_id, driver_id, route_id) OVERRIDING SYSTEM VALUE VALUES ('
  || report_id || ','
  || '''' || created_at::text || ''','
  || '''' || REPLACE(report_type, '''', '''''') || ''','
  || '''' || REPLACE(message, '''', '''''') || ''','
  || '''' || REPLACE(status, '''', '''''') || ''','
  || COALESCE(trip_id::text, 'NULL') || ','
  || COALESCE(bus_id::text, 'NULL') || ','
  || COALESCE(driver_id::text, 'NULL') || ','
  || COALESCE(route_id::text, 'NULL')
  || ');',
  E'\n' ORDER BY report_id
) AS sql_output FROM public.passenger_reports;

-- 11. ANNOUNCEMENTS
SELECT string_agg(
  'INSERT INTO public.announcements (announcement_id, title, message, created_at) OVERRIDING SYSTEM VALUE VALUES ('
  || announcement_id || ','
  || '''' || REPLACE(title, '''', '''''') || ''','
  || '''' || REPLACE(message, '''', '''''') || ''','
  || '''' || created_at::text || ''''
  || ');',
  E'\n' ORDER BY announcement_id
) AS sql_output FROM public.announcements;

-- 12. ADMINS (skips auth_user_id, carries over password_hash if it exists)
SELECT string_agg(
  'INSERT INTO public.admins (admin_id, name, email, created_at, password_hash) OVERRIDING SYSTEM VALUE VALUES ('
  || admin_id || ','
  || '''' || REPLACE(name, '''', '''''') || ''','
  || '''' || REPLACE(email, '''', '''''') || ''','
  || '''' || created_at::text || ''','
  || COALESCE('''' || REPLACE(COALESCE(password_hash,''), '''', '''''') || '''', 'NULL')
  || ');',
  E'\n' ORDER BY admin_id
) AS sql_output FROM public.admins;

-- 13. RESET SEQUENCES — run last in the NEW project after all inserts
-- Copy and run this block in the NEW project, not the old one.
SELECT string_agg(stmt, E'\n') AS sql_output FROM (VALUES
  ('SELECT setval(pg_get_serial_sequence(''public.routes'',       ''route_id''),       (SELECT COALESCE(MAX(route_id),1)       FROM public.routes));'),
  ('SELECT setval(pg_get_serial_sequence(''public.stops'',        ''stop_id''),        (SELECT COALESCE(MAX(stop_id),1)        FROM public.stops));'),
  ('SELECT setval(pg_get_serial_sequence(''public.route_stops'',  ''route_stop_id''),  (SELECT COALESCE(MAX(route_stop_id),1)  FROM public.route_stops));'),
  ('SELECT setval(pg_get_serial_sequence(''public.schedules'',    ''schedule_id''),    (SELECT COALESCE(MAX(schedule_id),1)    FROM public.schedules));'),
  ('SELECT setval(pg_get_serial_sequence(''public.buses'',        ''bus_id''),         (SELECT COALESCE(MAX(bus_id),1)         FROM public.buses));'),
  ('SELECT setval(pg_get_serial_sequence(''public.drivers'',      ''driver_id''),      (SELECT COALESCE(MAX(driver_id),1)      FROM public.drivers));'),
  ('SELECT setval(pg_get_serial_sequence(''public.trips'',        ''trip_id''),        (SELECT COALESCE(MAX(trip_id),1)        FROM public.trips));'),
  ('SELECT setval(pg_get_serial_sequence(''public.trip_stop_times'',''trip_stop_id''),(SELECT COALESCE(MAX(trip_stop_id),1)   FROM public.trip_stop_times));'),
  ('SELECT setval(pg_get_serial_sequence(''public.passenger_reports'',''report_id''), (SELECT COALESCE(MAX(report_id),1)      FROM public.passenger_reports));'),
  ('SELECT setval(pg_get_serial_sequence(''public.announcements'',''announcement_id''),(SELECT COALESCE(MAX(announcement_id),1) FROM public.announcements));'),
  ('SELECT setval(pg_get_serial_sequence(''public.admins'',       ''admin_id''),       (SELECT COALESCE(MAX(admin_id),1)       FROM public.admins));')
) AS t(stmt);
