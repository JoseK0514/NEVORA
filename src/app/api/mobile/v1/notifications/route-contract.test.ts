import {afterEach, expect, it, vi} from 'vitest';
const database = vi.hoisted(() => vi.fn(() => {throw Error('Unexpected database access');}));
vi.mock('@/lib/db', () => ({getDb: database, queryRows: () => []}));
afterEach(() => {vi.unstubAllEnvs(); database.mockClear();});
it('keeps all actual notification routes disabled without reading cookies or the database', async () => {
  vi.stubEnv('NATIVE_PUSH_REGISTRATION_ENABLED', 'false');
  const routes = {status: await import('./status/route'), challenge: await import('./challenge/route'), complete: await import('./complete/route')};
  for (const [action, route] of Object.entries(routes)) {
    expect(route.runtime).toBe('nodejs');
    const response = await route.POST(new Request(`https://nevora.example/api/mobile/v1/notifications/${action}`, {method: 'POST'}));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({state: 'unavailable'});
    expect(response.headers.get('cache-control')).toContain('no-store');
  }
  expect(database).not.toHaveBeenCalled();
});
