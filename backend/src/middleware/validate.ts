import { Request, Response, NextFunction } from 'express';

export const validateBus = (req: Request, res: Response, next: NextFunction): void => {
  const { bus_no } = req.body;
  
  if (!bus_no || typeof bus_no !== 'string' || bus_no.trim().length < 2) {
    res.status(400).json({ error: 'Bus number must be at least 2 characters' });
    return;
  }
  
  req.body.bus_no = bus_no.trim();
  next();
};

export const validateDriver = (req: Request, res: Response, next: NextFunction): void => {
  const { name, phone_number, password } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Name must be at least 2 characters' });
    return;
  }
  
  if (!phone_number || typeof phone_number !== 'string') {
    res.status(400).json({ error: 'Phone number is required' });
    return;
  }
  
  if (req.method === 'POST' && (!password || password.length < 6)) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  
  next();
};

export const validateRoute = (req: Request, res: Response, next: NextFunction): void => {
  const { route_name, route_no } = req.body;
  
  if (!route_name || typeof route_name !== 'string' || route_name.trim().length < 2) {
    res.status(400).json({ error: 'Route name must be at least 2 characters' });
    return;
  }
  
  if (!route_no || typeof route_no !== 'string' || route_no.trim().length < 1) {
    res.status(400).json({ error: 'Route number is required' });
    return;
  }
  
  next();
};

export const validateStop = (req: Request, res: Response, next: NextFunction): void => {
  const { stop_name, latitude, longitude } = req.body;
  
  if (!stop_name || typeof stop_name !== 'string' || stop_name.trim().length < 2) {
    res.status(400).json({ error: 'Stop name must be at least 2 characters' });
    return;
  }
  
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || lat < -90 || lat > 90) {
    res.status(400).json({ error: 'Invalid latitude' });
    return;
  }
  
  if (isNaN(lng) || lng < -180 || lng > 180) {
    res.status(400).json({ error: 'Invalid longitude' });
    return;
  }
  
  next();
};

export const validateTrip = (req: Request, res: Response, next: NextFunction): void => {
  const { schedule_id, bus_id, driver_id, trip_date } = req.body;
  
  if (!schedule_id || isNaN(parseInt(schedule_id))) {
    res.status(400).json({ error: 'Valid schedule ID is required' });
    return;
  }
  
  if (!bus_id || isNaN(parseInt(bus_id))) {
    res.status(400).json({ error: 'Valid bus ID is required' });
    return;
  }
  
  if (!driver_id || isNaN(parseInt(driver_id))) {
    res.status(400).json({ error: 'Valid driver ID is required' });
    return;
  }
  
  if (!trip_date) {
    res.status(400).json({ error: 'Trip date is required' });
    return;
  }
  
  next();
};
