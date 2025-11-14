-- Add predicted_arrival_time column to trip_stop_times
ALTER TABLE public.trip_stop_times 
ADD COLUMN predicted_arrival_time timestamp with time zone;

-- Distance calculation function (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric, lon1 numeric, 
  lat2 numeric, lon2 numeric
) RETURNS numeric AS $$
DECLARE
  R numeric := 6371000; -- Earth radius in meters
  phi1 numeric;
  phi2 numeric;
  delta_phi numeric;
  delta_lambda numeric;
  a numeric;
  c numeric;
BEGIN
  phi1 := radians(lat1);
  phi2 := radians(lat2);
  delta_phi := radians(lat2 - lat1);
  delta_lambda := radians(lon2 - lon1);
  
  a := sin(delta_phi / 2) * sin(delta_phi / 2) + 
       cos(phi1) * cos(phi2) * 
       sin(delta_lambda / 2) * sin(delta_lambda / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate and update predicted ETAs for all stops in a trip
CREATE OR REPLACE FUNCTION calculate_trip_etas(p_trip_id bigint)
RETURNS void AS $$
DECLARE
  v_bus_lat numeric;
  v_bus_lon numeric;
  v_route_id bigint;
  v_start_time time;
  v_trip_date date;
  v_trip_start timestamp;
  v_elapsed_minutes numeric;
  v_current_stop_index integer;
  v_current_stop_scheduled numeric;
  v_current_delay numeric;
  v_stop record;
  v_current_stop record;
  v_prev_lat numeric;
  v_prev_lon numeric;
  v_next_lat numeric;
  v_next_lon numeric;
  v_additional_distance numeric;
  v_additional_minutes numeric;
  v_scheduled_travel_time numeric;
  v_delay_propagation numeric;
  v_predicted_eta numeric;
  v_predicted_time timestamp;
  i integer;
BEGIN
  -- Get bus location and trip details
  SELECT b.current_latitude, b.current_longitude, s.route_id, s.start_time, t.trip_date
  INTO v_bus_lat, v_bus_lon, v_route_id, v_start_time, v_trip_date
  FROM buses b
  JOIN trips t ON b.current_trip_id = t.trip_id
  JOIN schedules s ON t.schedule_id = s.schedule_id
  WHERE t.trip_id = p_trip_id;

  IF v_bus_lat IS NULL OR v_bus_lon IS NULL THEN
    RETURN;
  END IF;

  -- Calculate trip start time and elapsed minutes
  v_trip_start := v_trip_date + v_start_time;
  v_elapsed_minutes := ROUND(EXTRACT(EPOCH FROM (now() - v_trip_start)) / 60);

  -- Find current stop index (number of completed stops)
  SELECT COUNT(*)
  INTO v_current_stop_index
  FROM trip_stop_times
  WHERE trip_id = p_trip_id AND actual_arrival_time IS NOT NULL;

  -- Get current stop scheduled time and location
  SELECT EXTRACT(EPOCH FROM rs.time_offset_from_start) / 60, s.latitude, s.longitude
  INTO v_current_stop_scheduled, v_prev_lat, v_prev_lon
  FROM route_stops rs
  JOIN stops s ON rs.stop_id = s.stop_id
  WHERE rs.route_id = v_route_id
  ORDER BY rs.stop_sequence
  OFFSET v_current_stop_index LIMIT 1;

  -- Calculate current delay
  v_current_delay := v_elapsed_minutes - COALESCE(v_current_stop_scheduled, 0);

  -- Update predicted times for all future stops
  FOR v_stop IN
    SELECT rs.stop_id, rs.stop_sequence, s.latitude, s.longitude,
           EXTRACT(EPOCH FROM rs.time_offset_from_start) / 60 as scheduled_minutes
    FROM route_stops rs
    JOIN stops s ON rs.stop_id = s.stop_id
    WHERE rs.route_id = v_route_id
    ORDER BY rs.stop_sequence
  LOOP
    -- Skip completed stops
    IF v_stop.stop_sequence <= v_current_stop_index THEN
      CONTINUE;
    END IF;

    -- For current stop: use direct distance from bus to stop
    IF v_stop.stop_sequence = v_current_stop_index + 1 THEN
      v_additional_distance := calculate_distance(v_bus_lat, v_bus_lon, v_stop.latitude, v_stop.longitude);
      v_additional_minutes := ROUND((v_additional_distance / 1000.0 / 50.0) * 60);
      v_predicted_eta := v_elapsed_minutes + v_additional_minutes;
    ELSE
      -- For future stops: cumulative distance
      v_additional_distance := calculate_distance(v_bus_lat, v_bus_lon, v_prev_lat, v_prev_lon);
      
      -- Add distance between consecutive stops
      FOR i IN v_current_stop_index + 1 .. v_stop.stop_sequence - 1 LOOP
        SELECT s.latitude, s.longitude INTO v_prev_lat, v_prev_lon
        FROM route_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = v_route_id AND rs.stop_sequence = i;
        
        SELECT s.latitude, s.longitude INTO v_next_lat, v_next_lon
        FROM route_stops rs
        JOIN stops s ON rs.stop_id = s.stop_id
        WHERE rs.route_id = v_route_id AND rs.stop_sequence = i + 1;
        
        v_additional_distance := v_additional_distance + calculate_distance(v_prev_lat, v_prev_lon, v_next_lat, v_next_lon);
      END LOOP;
      
      v_additional_minutes := ROUND((v_additional_distance / 1000.0 / 50.0) * 60);
      v_scheduled_travel_time := v_stop.scheduled_minutes - v_current_stop_scheduled;
      v_delay_propagation := GREATEST(0, v_additional_minutes - v_scheduled_travel_time);
      v_predicted_eta := v_stop.scheduled_minutes + v_current_delay + v_delay_propagation;
    END IF;

    -- Convert minutes to timestamp
    v_predicted_time := v_trip_start + (v_predicted_eta || ' minutes')::interval;

    -- Update or insert predicted time
    UPDATE trip_stop_times
    SET predicted_arrival_time = v_predicted_time
    WHERE trip_id = p_trip_id AND stop_id = v_stop.stop_id;

    IF NOT FOUND THEN
      INSERT INTO trip_stop_times (trip_id, stop_id, predicted_arrival_time)
      VALUES (p_trip_id, v_stop.stop_id, v_predicted_time);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to calculate ETAs when bus location updates
CREATE OR REPLACE FUNCTION trigger_calculate_trip_etas()
RETURNS trigger AS $$
BEGIN
  IF NEW.current_trip_id IS NOT NULL AND 
     (NEW.current_latitude IS DISTINCT FROM OLD.current_latitude OR 
      NEW.current_longitude IS DISTINCT FROM OLD.current_longitude) THEN
    PERFORM calculate_trip_etas(NEW.current_trip_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on buses table
DROP TRIGGER IF EXISTS update_trip_etas_on_location ON public.buses;
CREATE TRIGGER update_trip_etas_on_location
AFTER UPDATE ON public.buses
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_trip_etas();
