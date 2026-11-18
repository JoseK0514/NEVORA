import { beforeEach, expect, it, rs } from '@rstest/core';
import { getSession } from '@/lib/auth/session';
import { readToday } from '@/lib/data/today.server';
import { GET } from './route';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:rs.fn(async(_proof,load)=>({state:'ready',data:await load()}))}));
rs.mock('@/lib/auth/session', () => ({ getSession: rs.fn(), requireSessionMutationProof: rs.fn(async () => ({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) })) }));
rs.mock('@/lib/data/today.server', () => ({ readToday: rs.fn() }));
const request = (headers: Record<string, string> = { 'X-Nevora-Today': '1' }, url = 'http://localhost/api/manager/today') => new Request(url, { headers });
const ready = { state: 'ready', observedAt: '2030-10-16T14:00:00.000Z', validForMs: 30000, timeZone: 'America/Puerto_Rico', today: '2030-10-16', counts: { scheduled: 0, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts: [], missed: [] };
beforeEach(() => { rs.clearAllMocks(); rs.mocked(getSession).mockResolvedValue({ id: 'owner', firstName: 'A', lastName: 'B', role: 'OWNER', primaryLocationId: 'l1' } as never); rs.mocked(readToday).mockResolvedValue(ready as never); });

it('requires a session and reads nothing without one', async () => {
  rs.mocked(getSession).mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect(readToday).not.toHaveBeenCalled();
});
it.each(['EMPLOYEE', 'LEAD'] as const)('denies %s without reading', async role => {
  rs.mocked(getSession).mockResolvedValue({ id: 'w', firstName: 'A', lastName: 'B', role, primaryLocationId: 'l1' } as never);
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
  rs.mocked(readToday).mockResolvedValue({ state: 'unavailable', reason: 'read_failed' });
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ state: 'unavailable', reason: 'read_failed' });
});
it('a manager reads with their own session proof; location scoping happens in that read', async () => {
  rs.mocked(getSession).mockResolvedValue({ id: 'mgr', firstName: 'A', lastName: 'B', role: 'MANAGER', primaryLocationId: 'l1' } as never);
  const { requireSessionMutationProof } = await import('@/lib/auth/session');
  const proof = { employee: { id: 'mgr', role: 'MANAGER' }, sessionTokenHash: 'b'.repeat(64) };
  rs.mocked(requireSessionMutationProof).mockResolvedValueOnce(proof as never);
  expect((await GET(request())).status).toBe(200);
  expect(readToday).toHaveBeenCalledWith(proof);
});
it('a manager without a location grant is denied, not shown an empty day', async () => {
  rs.mocked(getSession).mockResolvedValue({ id: 'mgr', firstName: 'A', lastName: 'B', role: 'MANAGER', primaryLocationId: 'l1' } as never);
  rs.mocked(readToday).mockResolvedValue({ state: 'unavailable', reason: 'access_denied' });
  const response = await GET(request());
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ state: 'unavailable', reason: 'access_denied' });
});
it('refuses the global Today view before reading when current Company authority is absent',async()=>{
  rs.mocked(withOperationalCompany).mockResolvedValueOnce({state:'unavailable',reason:'access_denied'});
  expect((await GET(request())).status).toBe(403);expect(readToday).not.toHaveBeenCalled();
});
it('does not return Today data after current Company authority changes',async()=>{
  rs.mocked(withOperationalCompany).mockImplementationOnce(async(_proof,load)=>{await load();return {state:'unavailable',reason:'access_denied'};});
  const response=await GET(request());expect(response.status).toBe(403);
  expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
});
