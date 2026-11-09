// HTTP adapter tests only. Mocked ALLOW does not establish native tenant authority.
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock('@/lib/auth/portal-request.server', () => ({ resolveSelectedPortalRequest: mocks.resolve }));
import { GET } from './route';

const request = (query = '', headers: Record<string, string> = {}) =>
  new Request('https://nevora.invalid/api/workspaces/test-a-01/session' + query, { headers });
const context = (locator = 'test-a-01') => ({ params: Promise.resolve({ locator }) });
const allowed = () => ({ status: 'ALLOW', proof: { kind: 'PORTAL', secret: 'private-proof' },
  workspace: { id: 'internal-A', name: 'Fictional A', timeZone: 'America/Puerto_Rico', active: true },
  employment: { id: 'internal-employee-A', firstName: 'Fictional', lastName: 'Employee', role: 'EMPLOYEE', active: true },
  sessionTokenHash: 'private-digest', workspaceIncarnation: 'private-version' });
beforeEach(() => { vi.resetAllMocks(); mocks.resolve.mockResolvedValue(allowed()); });

it('returns only the current selected workspace and own safe employment fields', async () => {
  const response = await GET(request(), context());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ workspace: { locator: 'test-a-01', name: 'Fictional A', timeZone: 'America/Puerto_Rico' },
    employee: { firstName: 'Fictional', lastName: 'Employee', role: 'EMPLOYEE' } });
  expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith('test-a-01');
});
it('keeps every successful response private and uncacheable', async () => {
  const response = await GET(request(), context());
  expect(response.headers.get('cache-control')).toBe('no-store, private');
  expect(response.headers.get('vary')).toBe('Cookie');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
});
it('uses the path selector without accepting query/header employee or workspace authority', async () => {
  await GET(request('?workspaceId=internal-B&employeeId=other&proof=fake', { 'X-Workspace-Id': 'internal-B' }), context());
  expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith('test-a-01');
});
it('normalizes the approved nonsecret selector and rejects malformed selectors before cookie lookup', async () => {
  const response = await GET(request(), context(' TEST-A-01 '));
  expect((await response.json()).workspace.locator).toBe('test-a-01');
  expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith('test-a-01');
  mocks.resolve.mockClear();
  for (const selector of ['', 'short', 'x'.repeat(33), 'test/a-01', 'test-a-01\u0000']) {
    const denied = await GET(request(), context(selector));
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({ error: 'authentication_required' });
  }
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it('keeps missing/foreign/revoked session denials generic and private', async () => {
  mocks.resolve.mockResolvedValue({ status: 'DENY' });
  const response = await GET(request(), context('test-b-01'));
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: 'authentication_required' });
  expect(response.headers.get('cache-control')).toBe('no-store, private');
});
it('reports native/helper unavailability without an empty successful session', async () => {
  mocks.resolve.mockResolvedValue({ status: 'UNAVAILABLE' });
  const response = await GET(request(), context());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'portal_unavailable' });
  expect(response.headers.get('cache-control')).toBe('no-store, private');
});
it('suppresses raw errors and private digests from failed requests', async () => {
  mocks.resolve.mockRejectedValue(new Error('private SQL credential internal-A private-digest'));
  const response = await GET(request(), context());
  expect(response.status).toBe(503);
  expect(await response.text()).toBe('{"error":"portal_unavailable"}');
});
it('rejects browser-declared cross-site reads before cookie/native access', async () => {
  const response = await GET(request('', { 'Sec-Fetch-Site': 'cross-site' }), context());
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: 'access_denied' });
  expect(mocks.resolve).not.toHaveBeenCalled();
});
it('does not retain a preceding selected workspace when a following request is denied', async () => {
  const first = await GET(request(), context());
  expect(first.status).toBe(200);
  mocks.resolve.mockResolvedValueOnce({ status: 'DENY' });
  const second = await GET(request(), context('test-b-01'));
  expect(second.status).toBe(401);
  expect(await second.text()).not.toContain('Fictional A');
  expect(mocks.resolve.mock.calls).toEqual([['test-a-01'], ['test-b-01']]);
});
it('contains asynchronous route-param failure without touching cookie/native access', async () => {
  const response = await GET(request(), { params: Promise.reject(new Error('private params failure')) });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'portal_unavailable' });
  expect(mocks.resolve).not.toHaveBeenCalled();
});
