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

// Indian mobile number: 10 digits starting 6-9, optionally prefixed with +91.
export const PHONE_RE = /^(\+91)?[6-9]\d{9}$/;

export const validateDriver = (req: Request, res: Response, next: NextFunction): void => {
  const { name, phone_number, password, email } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Name must be at least 2 characters' });
    return;
  }

  if (typeof phone_number !== 'string' || !PHONE_RE.test(phone_number.replace(/[\s-]/g, ''))) {
    res.status(400).json({ error: 'Phone number must be a 10-digit Indian mobile number' });
    return;
  }

  if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    res.status(400).json({ error: 'Email address is not valid' });
    return;
  }

  // Password is optional on create (a random one is generated) and ignored on update.
  if (req.method === 'POST' && password !== undefined && password !== '' &&
      (typeof password !== 'string' || password.length < 8)) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Store numbers in one format (+91XXXXXXXXXX) so login lookups match.
  const digits = phone_number.replace(/[\s-]/g, '');
  req.body.phone_number = digits.startsWith('+91') ? digits : `+91${digits}`;
  req.body.name = name.trim();
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
  const trips = Array.isArray(req.body) ? req.body : [req.body];

  for (const { schedule_id, bus_id, driver_id, trip_date } of trips) {
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
  }

  next();
};
