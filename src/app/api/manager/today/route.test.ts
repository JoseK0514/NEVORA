import { beforeEach, expect, it, vi } from 'vitest';
import { getSession } from '@/lib/auth/session';
import { readToday } from '@/lib/data/today.server';
import { GET } from './route';
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn(), requireSessionMutationProof: vi.fn(async () => ({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) })) }));
vi.mock('@/lib/data/today.server', () => ({ readToday: vi.fn() }));
const request = (headers: Record<string, string> = { 'X-Nevora-Today': '1' }, url = 'http://localhost/api/manager/today') => new Request(url, { headers });
const ready = { state: 'ready', observedAt: '2030-10-16T14:00:00.000Z', validForMs: 30000, timeZone: 'America/Puerto_Rico', today: '2030-10-16', counts: { scheduled: 0, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts: [], missed: [] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getSession).mockResolvedValue({ id: 'owner', firstName: 'A', lastName: 'B', role: 'OWNER', primaryLocationId: 'l1' } as never); vi.mocked(readToday).mockResolvedValue(ready as never); });

it('requires a session and reads nothing without one', async () => {
  vi.mocked(getSession).mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect(readToday).not.toHaveBeenCalled();
});
it.each(['EMPLOYEE', 'LEAD'] as const)('denies %s without reading', async role => {
  vi.mocked(getSession).mockResolvedValue({ id: 'w', firstName: 'A', lastName: 'B', role, primaryLocationId: 'l1' } as never);
  expect((await GET(request())).status).toBe(403);
  expect(readToday).not.toHaveBeenCalled();
});
it('rejects cross-site, unmarked and parameterised requests', async () => {
  expect((await GET(request({ 'Sec-Fetch-Site': 'cross-site', 'X-Nevora-Today': '1' }))).status).toBe(403);
  expect((await GET(request({}))).status).toBe(403);
  expect((await GET(request({ 'X-Nevora-Today': '1' }, 'http://localhost/api/manager/today?employee=x'))).status).toBe(400);
  expect(readToday).not.toHaveBeenCalled();
});
it('returns the snapshot privately and uncached', async () => {
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store, private');
  expect(await response.json()).toEqual(ready);
});
it('a failed read is unavailable, never an empty day', async () => {
  vi.mocked(readToday).mockResolvedValue({ state: 'unavailable', reason: 'read_failed' });
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ state: 'unavailable', reason: 'read_failed' });
});
