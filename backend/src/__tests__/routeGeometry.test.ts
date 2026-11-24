import { mockQuery } from './__mocks__/db';
import { getRoutePath, geometryKey } from '../services/routeGeometry';

jest.mock('../database/db');

const STOPS = [
  { latitude: 12.3051, longitude: 76.6551 },
  { latitude: 12.2958, longitude: 76.6394 },
];
const osrm = (coords: [number, number][]) =>
  ({ ok: true, json: async () => ({ code: 'Ok', routes: [{ geometry: { coordinates: coords } }] }) }) as any;

beforeEach(() => {
  mockQuery.mockReset();
  (global as any).fetch = jest.fn();
});

describe('route road geometry', () => {
  it('uses the stored path when the stops have not changed (no OSRM call)', async () => {
    const stored: [number, number][] = [[12.3051, 76.6551], [12.30, 76.65], [12.2958, 76.6394]];
    const path = await getRoutePath(1, STOPS, { geometry: stored, geometry_key: geometryKey(STOPS) });
    expect(path).toBe(stored);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches, stores and returns [lat, lon] when the stops changed', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(osrm([[76.6551, 12.3051], [76.648, 12.301], [76.6394, 12.2958]]));
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const path = await getRoutePath(2, STOPS, { geometry: [[1, 1], [2, 2]], geometry_key: 'old' });
    expect(path).toEqual([[12.3051, 76.6551], [12.301, 76.648], [12.2958, 76.6394]]);
    expect(mockQuery.mock.calls[0][0]).toMatch(/UPDATE routes SET geometry/);
    expect(mockQuery.mock.calls[0][1][1]).toBe(geometryKey(STOPS));
  });

  it('returns null (straight lines) when OSRM fails, and stores nothing', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    expect(await getRoutePath(3, STOPS, { geometry: null, geometry_key: null })).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('a route with under two stops has no path', async () => {
    expect(await getRoutePath(4, STOPS.slice(0, 1), { geometry: null, geometry_key: null })).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
