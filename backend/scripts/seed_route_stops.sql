-- ============================================================
-- Route Stops seed patch — run after seed.sql
-- Fixes the reserved-word issue with column alias "offset"
-- ============================================================

-- Route 1A: City Stand → KR Circle → University → Vijayanagar → Infosys
INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
VALUES
  ((SELECT route_id FROM public.routes WHERE route_no='1A'), (SELECT stop_id FROM public.stops WHERE stop_name='Mysuru City Bus Stand'),  1, '00:00:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='1A'), (SELECT stop_id FROM public.stops WHERE stop_name='KR Circle'),               2, '00:10:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='1A'), (SELECT stop_id FROM public.stops WHERE stop_name='University of Mysore'),    3, '00:25:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='1A'), (SELECT stop_id FROM public.stops WHERE stop_name='Vijayanagar 4th Stage'),  4, '00:40:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='1A'), (SELECT stop_id FROM public.stops WHERE stop_name='Infosys Mysuru Campus'),  5, '00:55:00')
ON CONFLICT DO NOTHING;

-- Route 2B: Railway Station → KR Circle → Palace
INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
VALUES
  ((SELECT route_id FROM public.routes WHERE route_no='2B'), (SELECT stop_id FROM public.stops WHERE stop_name='Mysuru Railway Station'), 1, '00:00:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='2B'), (SELECT stop_id FROM public.stops WHERE stop_name='KR Circle'),              2, '00:12:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='2B'), (SELECT stop_id FROM public.stops WHERE stop_name='Mysuru Palace'),          3, '00:20:00')
ON CONFLICT DO NOTHING;

-- Route 3C: Hebbal → Bannimantap → City Stand → Chamundi Hill
INSERT INTO public.route_stops (route_id, stop_id, stop_sequence, time_offset_from_start)
VALUES
  ((SELECT route_id FROM public.routes WHERE route_no='3C'), (SELECT stop_id FROM public.stops WHERE stop_name='Hebbal Circle'),         1, '00:00:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='3C'), (SELECT stop_id FROM public.stops WHERE stop_name='Bannimantap'),           2, '00:08:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='3C'), (SELECT stop_id FROM public.stops WHERE stop_name='Mysuru City Bus Stand'), 3, '00:18:00'),
  ((SELECT route_id FROM public.routes WHERE route_no='3C'), (SELECT stop_id FROM public.stops WHERE stop_name='Chamundi Hill Base'),    4, '00:35:00')
ON CONFLICT DO NOTHING;

-- Verify counts
SELECT 'route_stops' AS tbl, COUNT(*) FROM public.route_stops;
