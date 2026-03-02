-- ============================================================
-- Sample Seed Data — MY(SURU) BUS DEV
-- Run with: npm run seed
-- ============================================================

-- Admin (password: Admin@123)
-- Hash generated with bcrypt rounds=12
INSERT INTO public.admins (name, email, password_hash) VALUES
  ('Ganesh Kumar', 'admin@mysurubus.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdxUKjXkHpPEqIbP0qe3HMH.Ywm6')
ON CONFLICT (email) DO NOTHING;

-- Stops (Mysuru city stops)
INSERT INTO public.stops (stop_name, latitude, longitude, geofence_radius_meters) VALUES
  ('Mysuru City Bus Stand',   12.3051,  76.6551, 100),
  ('KR Circle',               12.2958,  76.6394, 75),
  ('Mysuru Palace',           12.3052,  76.6551, 75),
  ('Chamundi Hill Base',      12.2723,  76.6670, 100),
  ('University of Mysore',    12.3341,  76.6222, 75),
  ('Infosys Mysuru Campus',   12.2860,  76.5748, 100),
  ('Mysuru Railway Station',  12.3142,  76.6374, 100),
  ('Vijayanagar 4th Stage',   12.3259,  76.5848, 75),
  ('Hebbal Circle',           12.3497,  76.6093, 75),
  ('Bannimantap',             12.3122,  76.6130, 75)
ON CONFLICT DO NOTHING;

-- Routes
INSERT INTO public.routes (route_name, route_no) VALUES
  ('City Stand to Infosys',     '1A'),
  ('Railway Station to Palace', '2B'),
  ('Hebbal to Chamundi Hill',   '3C')
ON CONFLICT DO NOTHING;

-- Route stops for Route 1A: City Stand → KR Circle → University → Vijayanagar → Infosys
WITH r AS (SELECT route_id FROM public.routes WHERE route_no = '1A')
INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
SELECT r.route_id, s.stop_id, s.seq, s.offset FROM r,
(VALUES
  ((SELECT stop_id FROM public.stops WHERE stop_name='Mysuru City Bus Stand'),    1, '00:00:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='KR Circle'),                2, '00:10:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='University of Mysore'),     3, '00:25:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='Vijayanagar 4th Stage'),   4, '00:40:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='Infosys Mysuru Campus'),   5, '00:55:00'::time)
) AS s(stop_id, seq, offset)
ON CONFLICT DO NOTHING;

-- Route stops for Route 2B: Railway Station → KR Circle → Palace
WITH r AS (SELECT route_id FROM public.routes WHERE route_no = '2B')
INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
SELECT r.route_id, s.stop_id, s.seq, s.offset FROM r,
(VALUES
  ((SELECT stop_id FROM public.stops WHERE stop_name='Mysuru Railway Station'), 1, '00:00:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='KR Circle'),              2, '00:12:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='Mysuru Palace'),          3, '00:20:00'::time)
) AS s(stop_id, seq, offset)
ON CONFLICT DO NOTHING;

-- Route stops for Route 3C: Hebbal → Bannimantap → City Stand → Chamundi Hill
WITH r AS (SELECT route_id FROM public.routes WHERE route_no = '3C')
INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
SELECT r.route_id, s.stop_id, s.seq, s.offset FROM r,
(VALUES
  ((SELECT stop_id FROM public.stops WHERE stop_name='Hebbal Circle'),          1, '00:00:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='Bannimantap'),            2, '00:08:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='Mysuru City Bus Stand'),  3, '00:18:00'::time),
  ((SELECT stop_id FROM public.stops WHERE stop_name='Chamundi Hill Base'),     4, '00:35:00'::time)
) AS s(stop_id, seq, offset)
ON CONFLICT DO NOTHING;

-- Schedules
WITH r1 AS (SELECT route_id FROM public.routes WHERE route_no = '1A'),
     r2 AS (SELECT route_id FROM public.routes WHERE route_no = '2B'),
     r3 AS (SELECT route_id FROM public.routes WHERE route_no = '3C')
INSERT INTO public.schedules (route_id, start_time)
VALUES
  ((SELECT route_id FROM r1), '06:00:00'),
  ((SELECT route_id FROM r1), '09:00:00'),
  ((SELECT route_id FROM r1), '17:30:00'),
  ((SELECT route_id FROM r2), '07:00:00'),
  ((SELECT route_id FROM r2), '12:00:00'),
  ((SELECT route_id FROM r3), '08:00:00'),
  ((SELECT route_id FROM r3), '16:00:00')
ON CONFLICT DO NOTHING;

-- Drivers (password: Driver@123 — same hash for all for seed data)
INSERT INTO public.drivers (name, email, phone_number, password_hash) VALUES
  ('Ravi Kumar',     'ravi.driver@mysurubus.com',   '+919876543210', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdxUKjXkHpPEqIbP0qe3HMH.Ywm6'),
  ('Suresh Babu',    'suresh.driver@mysurubus.com', '+919876543211', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdxUKjXkHpPEqIbP0qe3HMH.Ywm6'),
  ('Manjunath S',    'manju.driver@mysurubus.com',  '+919876543212', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TdxUKjXkHpPEqIbP0qe3HMH.Ywm6')
ON CONFLICT (phone_number) DO NOTHING;

-- Buses
INSERT INTO public.buses (bus_no, current_latitude, current_longitude, last_updated, current_speed_kmh) VALUES
  ('KA-09-F-1234', 12.3051, 76.6551, NOW(), 0),
  ('KA-09-F-5678', 12.3142, 76.6374, NOW(), 0),
  ('KA-09-F-9012', 12.3497, 76.6093, NOW(), 0)
ON CONFLICT (bus_no) DO NOTHING;

-- Trips for today using yesterday's schedule
INSERT INTO public.trips (schedule_id, bus_id, driver_id, trip_date, status)
SELECT
  s.schedule_id,
  b.bus_id,
  d.driver_id,
  CURRENT_DATE,
  'Scheduled'
FROM
  (SELECT schedule_id, ROW_NUMBER() OVER (ORDER BY schedule_id) AS rn FROM public.schedules LIMIT 3) s
  JOIN (SELECT bus_id, ROW_NUMBER() OVER (ORDER BY bus_id) AS rn FROM public.buses) b ON s.rn = b.rn
  JOIN (SELECT driver_id, ROW_NUMBER() OVER (ORDER BY driver_id) AS rn FROM public.drivers) d ON s.rn = d.rn
ON CONFLICT DO NOTHING;

-- Announcements
INSERT INTO public.announcements (title, message) VALUES
  ('Service Update', 'Route 1A will have 5-minute delays due to road work near KR Circle. We apologize for the inconvenience.'),
  ('New Schedule', 'Route 3C now has an additional trip at 08:00. Please check the updated timetable.')
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'admins' AS tbl, COUNT(*) FROM public.admins
UNION ALL SELECT 'stops',          COUNT(*) FROM public.stops
UNION ALL SELECT 'routes',         COUNT(*) FROM public.routes
UNION ALL SELECT 'route_stops',    COUNT(*) FROM public.route_stops
UNION ALL SELECT 'schedules',      COUNT(*) FROM public.schedules
UNION ALL SELECT 'drivers',        COUNT(*) FROM public.drivers
UNION ALL SELECT 'buses',          COUNT(*) FROM public.buses
UNION ALL SELECT 'trips',          COUNT(*) FROM public.trips
UNION ALL SELECT 'announcements',  COUNT(*) FROM public.announcements
ORDER BY tbl;
