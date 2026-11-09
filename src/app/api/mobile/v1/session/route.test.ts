import {beforeEach, expect, it, vi} from 'vitest';

const auth = vi.hoisted(() => ({session: vi.fn()}));
vi.mock('@/lib/auth/session', () => ({getSession: auth.session}));
import {GET} from './route';
const request = (path = '', headers: Record<string, string> = {}) =>
  new Request('https://nevora.example/api/mobile/v1/session' + path, {headers});
beforeEach(() => { auth.session.mockReset(); });

it.each(['EMPLOYEE', 'LEAD', 'MANAGER', 'OWNER'])('recognizes the current %s session without disclosing identity', async role => {
  auth.session.mockResolvedValue({id: 'private-id', firstName: 'Private', role, sessionTokenHash: 'never-serialize'});
  for (const marker of ['', 'NEVORA-Native/iOS/1', 'NEVORA-Native/Android/1']) {
    const response = await GET(request('', {'User-Agent': marker}));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({protocolVersion: 1, state: 'authenticated'});
    expect(response.headers.get('cache-control')).toBe('no-store, private');
    expect(response.headers.get('vary')).toBe('Cookie');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  }
});
it('treats a missing, expired or revoked session as unauthenticated', async () => {
  auth.session.mockResolvedValue(null);
  const response = await GET(request());
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({protocolVersion: 1, state: 'unauthenticated'});
});
it('does not trust native markers or bearer headers without the cookie session', async () => {
  auth.session.mockResolvedValue(null);
  expect((await GET(request('', {'Authorization': 'Bearer fictional', 'User-Agent': 'NEVORA-Native/iOS/1'}))).status).toBe(401);
});
it.each([
  ['?employeeId=other', {}], ['?anything=', {}], ['', {'Sec-Fetch-Site': 'cross-site'}],
  ['', {'Origin': 'https://foreign.example'}], ['', {'Origin': 'null'}],
  ['', {'Origin': 'https://nevora.example.attacker.example'}],
] as [string, Record<string, string>][] )('rejects selectors/foreign origins before private reads: %s %j', async (path, headers) => {
  const response = await GET(request(path, headers));
  expect(response.status).toBe(path ? 400 : 403);
  expect(await response.json()).toEqual({protocolVersion: 1, state: 'denied'});
  expect(auth.session).not.toHaveBeenCalled();
});
it('accepts the existing same-origin browser contract', async () => {
  auth.session.mockResolvedValue(null);
  expect((await GET(request('', {'Origin': 'https://nevora.example', 'Sec-Fetch-Site': 'same-origin'}))).status).toBe(401);
});
it('keeps outages distinct from logout and sanitizes diagnostics', async () => {
  auth.session.mockRejectedValue(new Error('private SQL/password material'));
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({protocolVersion: 1, state: 'unavailable'});
  expect(response.headers.get('cache-control')).toBe('no-store, private');
});
