-- ============================================================
-- Migration 005 — Demo route for the public /live page
-- A clearly labelled, simulated route whose bus is driven by the
-- "Demo bus" GitHub Actions workflow (scripts/demo-bus.js), so visitors
-- always see a bus moving. Idempotent: creates only what's missing.
-- Switch the demo off by disabling that workflow; the data is harmless.
-- ============================================================

-- Stops (reused when they already exist under the same name)
INSERT INTO public.stops (stop_name, latitude, longitude, geofence_radius_meters)
SELECT v.name, v.lat, v.lon, 75
FROM (VALUES
  ('Mysuru City Bus Stand', 12.3051, 76.6551),
  ('KR Circle',             12.2958, 76.6394),
  ('Mysuru Railway Station',12.3142, 76.6374),
  ('Mysuru Zoo',            12.3011, 76.6653)
) AS v(name, lat, lon)
WHERE NOT EXISTS (SELECT 1 FROM public.stops s WHERE s.stop_name = v.name);

INSERT INTO public.routes (route_name, route_no)
SELECT 'Demo city loop (simulated)', 'D'
WHERE NOT EXISTS (SELECT 1 FROM public.routes WHERE route_no = 'D');

INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
SELECT r.route_id, (SELECT stop_id FROM public.stops WHERE stop_name = v.name ORDER BY stop_id LIMIT 1), v.seq, v.off::time
FROM public.routes r,
     (VALUES ('Mysuru City Bus Stand', 1, '00:00'),
             ('KR Circle',             2, '00:06'),
             ('Mysuru Railway Station',3, '00:13'),
             ('Mysuru Zoo',            4, '00:23')) AS v(name, seq, off)
WHERE r.route_no = 'D'
  AND NOT EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.route_id = r.route_id);

INSERT INTO public.buses (bus_no)
SELECT 'DEMO-01' WHERE NOT EXISTS (SELECT 1 FROM public.buses WHERE bus_no = 'DEMO-01');

-- Demo driver. The phone number is deliberately not a valid Indian mobile, so it
-- can't belong to anyone. Only the bcrypt hash is here; the password lives in the
-- DEMO_DRIVER_PASSWORD repository secret used by the workflow.
INSERT INTO public.drivers (name, phone_number, password_hash)
SELECT 'Demo Driver', '+910000000001', '$2a$12$cYAeo4phvGz6L1H6QT0uLeLwI.OeiePO/PMEqTWMVsUqrZCCODcQ2'
WHERE NOT EXISTS (SELECT 1 FROM public.drivers WHERE phone_number = '+910000000001');

-- A departure every 30 minutes, 06:00–21:30, every day, run by the demo bus/driver.
INSERT INTO public.schedules (route_id, start_time, days_of_week, default_bus_id, default_driver_id)
SELECT r.route_id, t::time, '{1,2,3,4,5,6,7}',
       (SELECT bus_id FROM public.buses WHERE bus_no = 'DEMO-01'),
       (SELECT driver_id FROM public.drivers WHERE phone_number = '+910000000001')
FROM public.routes r,
     generate_series('2000-01-01 06:00'::timestamp, '2000-01-01 21:30'::timestamp, interval '30 minutes') AS t
WHERE r.route_no = 'D'
  AND NOT EXISTS (SELECT 1 FROM public.schedules s WHERE s.route_id = r.route_id);
