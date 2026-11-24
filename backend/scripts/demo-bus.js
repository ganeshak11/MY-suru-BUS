#!/usr/bin/env node
/**
 * demo-bus.js — drives the demo route's bus so the public /live page always has a
 * bus moving. Run by the "Demo bus" GitHub Actions workflow every 30 minutes.
 *
 * It signs in as the demo driver (created by migration 005), picks the departure
 * that is due now, starts it, sends GPS positions along the route at roughly the
 * scheduled pace (with random traffic and dwell at stops, so the delay and ETAs
 * look real), then completes the trip. It talks to the API exactly like the driver
 * app does, so it exercises the real pipeline end to end.
 *
 * Env: API_BASE_URL (…/api), DEMO_DRIVER_PASSWORD, DEMO_DRIVER_PHONE (optional),
 *      DEMO_SPEEDUP (optional, e.g. 20 to run a trip 20× faster when testing).
 * No dependencies: Node 20+ (global fetch).
 */
const API = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const PHONE = process.env.DEMO_DRIVER_PHONE || '+910000000001';
const PASSWORD = process.env.DEMO_DRIVER_PASSWORD;
const SPEEDUP = Number(process.env.DEMO_SPEEDUP || 1);
const TICK_S = 10;                 // one position every 10 s, like a live phone
const MAX_RUNTIME_MS = 45 * 60_000;

const started = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEEDUP));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const rand = (a, b) => a + Math.random() * (b - a);

let token = null;
const api = async (method, path, body) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(API + path, {
        method,
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60_000),
      });
      const renewed = res.headers.get('x-refreshed-token');
      if (renewed) token = renewed;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw Object.assign(new Error(`${method} ${path} → ${res.status} ${data?.error ?? ''}`), { status: res.status });
      return data;
    } catch (e) {
      // Retry network errors and 5xx (Render cold starts); not client errors.
      if (attempt >= 4 || (e.status && e.status < 500)) throw e;
      log(`retrying ${method} ${path} (${e.message})`);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
};

// Minutes since midnight and today's date, in India.
const indiaNow = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
};
const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };

const distM = (a, b) => {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const sendPosition = async (busId, p, speedKmh) => {
  // A few metres of GPS jitter, as from a real phone.
  const lat = p.lat + rand(-0.00004, 0.00004);
  const lon = p.lon + rand(-0.00004, 0.00004);
  await api('POST', `/buses/${busId}/location`, { latitude: lat, longitude: lon, speed: Math.round(speedKmh), gps_timestamp: new Date().toISOString() });
};

(async () => {
  if (!PASSWORD) throw new Error('DEMO_DRIVER_PASSWORD is not set');
  await api('GET', '/live').catch(() => undefined); // wake the backend up
  token = (await api('POST', '/auth/driver/login', { phone_number: PHONE, password: PASSWORD })).token;

  const { date, minutes: nowMin } = indiaNow();
  const trips = await api('GET', '/drivers/me/trips?limit=200');
  const today = trips.filter((t) => String(t.trip_date).slice(0, 10) === date);

  // Finish anything a previous run left running.
  for (const t of today.filter((t) => t.status === 'En Route' || t.status === 'Paused')) {
    log(`completing leftover trip ${t.trip_id}`);
    await api('POST', `/trips/${t.trip_id}/complete`).catch((e) => log(e.message));
  }

  // The departure due now: started up to 20 min ago, or starting within 10 min.
  const due = today
    .filter((t) => t.status === 'Scheduled')
    .map((t) => ({ ...t, startMin: toMin(t.start_time) }))
    .filter((t) => t.startMin >= nowMin - 20 && t.startMin <= nowMin + 10)
    .sort((a, b) => b.startMin - a.startMin)
    .pop();
  if (!due) {
    log(`no demo departure due around ${Math.floor(nowMin / 60)}:${String(nowMin % 60).padStart(2, '0')} IST; nothing to do`);
    return;
  }
  if (due.startMin > nowMin) {
    log(`waiting ${due.startMin - nowMin} min for the ${due.start_time.slice(0, 5)} departure`);
    await sleep((due.startMin - nowMin) * 60_000);
  }

  const stops = (await api('GET', `/routes/${due.route_id}/stops`)).map((s) => ({
    name: s.stop_name, lat: Number(s.latitude), lon: Number(s.longitude),
    off: s.time_offset_from_start ? toMin(s.time_offset_from_start.slice(0, 5)) : 0,
  }));
  if (stops.length < 2) throw new Error('demo route has fewer than 2 stops');

  log(`starting trip ${due.trip_id} (${due.start_time.slice(0, 5)}, bus ${due.bus_no})`);
  await api('POST', `/trips/${due.trip_id}/start`);
  try {
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      // Dwell at the stop (passengers boarding).
      const dwell = i === 0 ? 30 : rand(20, 40);
      for (let s = 0; s < dwell; s += TICK_S) {
        await sendPosition(due.bus_id, stop, 0);
        await sleep(TICK_S * 1000);
      }
      log(`at ${stop.name}`);
      if (i === stops.length - 1) break;

      // Drive to the next stop in about the scheduled time, ±25 % for traffic.
      const next = stops[i + 1];
      const legS = Math.max(60, (next.off - stop.off) * 60 * rand(0.85, 1.25) - dwell);
      const steps = Math.max(1, Math.round(legS / TICK_S));
      const kmh = (distM(stop, next) / 1000) / (legS / 3600);
      for (let k = 1; k <= steps; k++) {
        if (Date.now() - started > MAX_RUNTIME_MS) throw new Error('took too long');
        const f = k / steps;
        await sendPosition(due.bus_id, { lat: stop.lat + (next.lat - stop.lat) * f, lon: stop.lon + (next.lon - stop.lon) * f }, kmh * rand(0.7, 1.2));
        await sleep(TICK_S * 1000);
      }
    }
  } finally {
    await api('POST', `/trips/${due.trip_id}/complete`).then(() => log(`completed trip ${due.trip_id}`)).catch((e) => log(`could not complete: ${e.message}`));
  }
})().catch((e) => {
  console.error('demo bus failed:', e.message);
  process.exit(1);
});
