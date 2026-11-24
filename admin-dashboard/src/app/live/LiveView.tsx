'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { LiveData, LiveTrip } from './types';
import { ROUTE_COLORS, freshness, FRESH_COLOR, clock } from './types';

const LiveNetworkMap = dynamic(() => import('./LiveNetworkMap'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-secondary">Loading map…</div>,
});

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const POLL_MS = 10_000;

export default function LiveView() {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/live`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch {
      setError('Can’t reach the server right now. Retrying…');
    } finally {
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const routeIndex = (routeId: number) => data?.routes.findIndex((r) => r.route_id === routeId) ?? 0;
  const routeOf = (t: LiveTrip) => data?.routes.find((r) => r.route_id === t.route_id);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Map */}
      <div className="relative h-[55vh] lg:h-full lg:flex-1">
        <LiveNetworkMap data={data} now={now} selectedTripId={selectedTripId} onSelect={setSelectedTripId} />
      </div>

      {/* Panel */}
      <aside className="flex min-h-0 flex-1 flex-col border-t border-border/60 bg-card lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
        <header className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <h1 className="text-lg font-extrabold text-foreground">MY(suru) BUS · Live</h1>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Every running bus, the stops it has passed, and when it will reach the rest. Updates every 10&nbsp;s.
          </p>
          <p className="mt-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground">
            Route <strong>D</strong> (dashed) is a simulated demo bus, driven through the real API every 30 minutes
            from 06:00 to 21:30 IST so there is always something to watch.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-live="polite">
          {error && <p className="mx-2 mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          {!data && !error && <p className="px-2 text-sm text-secondary">Loading…</p>}
          {data && data.trips.length === 0 && (
            <p className="px-2 text-sm text-secondary">
              No bus is running right now. The demo bus departs every 30 minutes between 06:00 and 21:30 IST.
            </p>
          )}

          <ul className="space-y-2">
            {data?.trips.map((t) => {
              const route = routeOf(t);
              const f = freshness(t, now);
              const stops = t.progress?.stops ?? [];
              const next = stops.find((s) => !s.arrived_at && s.stop_sequence > (t.progress?.last_stop_seq ?? 0));
              const last = stops.filter((s) => s.arrived_at || s.stop_sequence <= (t.progress?.last_stop_seq ?? 0)).pop();
              const delay = t.progress?.delay_min ?? 0;
              const selected = t.trip_id === selectedTripId;
              return (
                <li key={t.trip_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTripId(t.trip_id)}
                    aria-pressed={selected}
                    className={`w-full rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      selected ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-bold text-white"
                        style={{ background: ROUTE_COLORS[routeIndex(t.route_id) % ROUTE_COLORS.length] }}
                      >
                        {route?.route_no}
                      </span>
                      <span className="truncate font-semibold text-foreground">{route?.route_name}</span>
                    </div>
                    <div className="mt-1 text-sm text-secondary">
                      Bus {t.bus.bus_no} · {t.start_time.slice(0, 5)} departure
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm font-medium" style={{ color: FRESH_COLOR[f.level] }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: FRESH_COLOR[f.level] }} />
                      {f.label}
                    </div>
                    {next ? (
                      <div className="mt-2 text-sm text-foreground">
                        Next: <strong>{next.stop_name}</strong>
                        {next.eta && <> at <strong>{clock(next.eta)}</strong></>}
                        {next.scheduled_at && <span className="text-secondary"> (scheduled {clock(next.scheduled_at)})</span>}
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-foreground">At the last stop</div>
                    )}
                    {last && <div className="text-xs text-secondary">Last passed: {last.stop_name}</div>}
                    {delay !== 0 && f.level !== 'paused' && (
                      <div className={`mt-1 text-xs font-semibold ${delay > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {delay > 0 ? `Running ${delay} min late` : `Running ${-delay} min early`}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="border-t border-border/60 px-5 py-3 text-xs text-secondary">
          {data && <>Updated {clock(data.generated_at)} IST · {data.routes.length} routes · {data.trips.length} live</>}
          <span className="mx-1">·</span>
          <a className="underline hover:text-foreground" href="https://github.com/ganeshak11/MY-suru-BUS" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </footer>
      </aside>
    </div>
  );
}
