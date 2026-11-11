import {beforeEach, afterEach, expect, it, vi} from 'vitest';
const f = vi.hoisted(() => ({session: vi.fn(), proof: vi.fn(), context: vi.fn(), list: vi.fn(), detail: vi.fn(), execute: vi.fn(), recover: vi.fn()}));
vi.mock('../auth/session', () => ({getSession: f.session, requireSessionMutationProof: f.proof}));
vi.mock('./service.server', () => ({staffTaskAuthority: () => 'a'.repeat(64), readStaffTaskContext: f.context, listStaffTasks: f.list, readStaffTask: f.detail, executeStaffTaskCommand: f.execute, findStaffTaskOperation: f.recover}));
import {staffTaskHttp} from './http.server';
const operationId = '00000000-0000-4000-8000-000000000001';
function request(action = 'commands', body: unknown = {kind: 'COMPLETE', operationId}, headers: Record<string, string> = {}, method = 'POST') {
  return new Request('https://nevora.invalid/api/staff-tasks/' + action, {method, headers: {'x-nevora-staff-task': '1', 'x-nevora-staff-task-authority': 'a'.repeat(64), origin: 'https://nevora.invalid', 'content-type': 'application/json', ...headers}, ...(method === 'POST' ? {body: JSON.stringify(body)} : {})});
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('FUEL_PORTAL_ORIGIN', 'https://nevora.invalid');
  f.session.mockResolvedValue({id: 'alice', role: 'EMPLOYEE'});
  f.proof.mockResolvedValue({employee: {id: 'alice', role: 'EMPLOYEE'}, sessionTokenHash: 'b'.repeat(64)});
  f.context.mockResolvedValue({state: 'ready', authority: 'a'.repeat(64)});
  f.list.mockResolvedValue({state: 'ready', tasks: [], templates: []});
  f.detail.mockResolvedValue({state: 'ready', task: {id: operationId}});
  f.execute.mockResolvedValue({status: 'committed', operationId});
  f.recover.mockResolvedValue({status: 'committed', operationId});
});
afterEach(() => vi.unstubAllEnvs());
it('bootstraps the current private context without a previous authority header', async () => {
  const r = await staffTaskHttp(request('context', undefined, {'x-nevora-staff-task-authority': ''}, 'GET'), 'context');
  expect(r.status).toBe(200); expect(f.context).toHaveBeenCalledOnce();
  expect(r.headers.get('cache-control')).toBe('no-store, private');
  expect(r.headers.get('vary')).toBe('Cookie');
});
it.each(['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'])('passes %s through current domain authorization without inventing broader transport rights', async role => {
  f.session.mockResolvedValue({id: 'actor', role}); f.proof.mockResolvedValue({employee: {id: 'actor', role}, sessionTokenHash: 'b'.repeat(64)});
  expect((await staffTaskHttp(request(), 'command')).status).toBe(200);
  expect(f.execute).toHaveBeenCalledWith(expect.objectContaining({employee: {id: 'actor', role}}), expect.objectContaining({operationId}));
});
it.each([{'sec-fetch-site': 'cross-site'}, {origin: 'https://other.invalid'}, {'x-nevora-staff-task': ''}, {'x-nevora-staff-task-authority': 'c'.repeat(64)}, {'content-type': 'text/plain'}] as Record<string, string>[])('rejects foreign intent, origin, authority and non-JSON input before dispatch', async headers => {
  expect((await staffTaskHttp(request('commands', undefined, headers), 'command')).status).toBe(403);
  expect(f.execute).not.toHaveBeenCalled();
});
it('requires a current matching session, identity and role', async () => {
  f.session.mockResolvedValue(null); expect((await staffTaskHttp(request(), 'command')).status).toBe(401);
  f.session.mockResolvedValue({id: 'alice', role: 'EMPLOYEE'});
  f.proof.mockResolvedValue({employee: {id: 'other', role: 'EMPLOYEE'}}); expect((await staffTaskHttp(request(), 'command')).status).toBe(403);
  f.proof.mockResolvedValue({employee: {id: 'alice', role: 'OWNER'}}); expect((await staffTaskHttp(request(), 'command')).status).toBe(403);
  expect(f.execute).not.toHaveBeenCalled();
});
it('refuses wrong methods and query parameters without running reads or writes', async () => {
  expect((await staffTaskHttp(request('commands', undefined, {}, 'GET'), 'command')).status).toBe(405);
  expect((await staffTaskHttp(request('query?employeeId=bob', {}), 'query')).status).toBe(400);
  expect(f.execute).not.toHaveBeenCalled(); expect(f.list).not.toHaveBeenCalled();
});
it('bounds declared and actual UTF-8 body bytes and rejects malformed JSON', async () => {
  expect((await staffTaskHttp(request('commands', {}, {'content-length': '16385'}), 'command')).status).toBe(400);
  expect((await staffTaskHttp(request('commands', {body: 'é'.repeat(9000)}), 'command')).status).toBe(400);
  const bad = new Request('https://nevora.invalid/api/staff-tasks/commands', {method: 'POST', headers: {'x-nevora-staff-task': '1', 'x-nevora-staff-task-authority': 'a'.repeat(64), origin: 'https://nevora.invalid', 'content-type': 'application/json'}, body: '{'});
  expect((await staffTaskHttp(bad, 'command')).status).toBe(400); expect(f.execute).not.toHaveBeenCalled();
});
it('routes bounded queries, task detail and operation recovery to their distinct services', async () => {
  const query = {fromDate: '2026-11-11', toDate: '2026-11-17', view: 'MINE', locationId: null};
  expect((await staffTaskHttp(request('query', query), 'query')).status).toBe(200); expect(f.list).toHaveBeenCalledWith(expect.any(Object), query);
  await staffTaskHttp(request(operationId, undefined, {}, 'GET'), 'read', operationId); expect(f.detail).toHaveBeenCalledWith(expect.any(Object), operationId);
  await staffTaskHttp(request('operations/' + operationId, undefined, {}, 'GET'), 'operation', operationId); expect(f.recover).toHaveBeenCalledWith(expect.any(Object), operationId);
});
it.each([['invalid', 400], ['blocked', 403], ['conflict', 409], ['unavailable', 503], ['outcome_unknown', 503]] as const)('keeps the %s outcome distinct', async (status, expected) => {
  f.execute.mockResolvedValue({status, operationId, reason: 'source_changed'});
  const r = await staffTaskHttp(request(), 'command'); expect(r.status).toBe(expected); expect((await r.json()).status).toBe(status);
});
it('never returns raw database errors or session credentials', async () => {
  f.context.mockRejectedValue(Error('PASSWORD=fictional-private-value'));
  const r = await staffTaskHttp(request('context', undefined, {}, 'GET'), 'context');
  expect(r.status).toBe(503); expect(await r.text()).not.toContain('fictional-private-value');
});
it('does not dispatch an already aborted request', async () => {
  const c = new AbortController(); c.abort();
  const r = request(); const cancelled = new Request(r, {signal: c.signal});
  expect((await staffTaskHttp(cancelled, 'command')).status).toBe(503); expect(f.execute).not.toHaveBeenCalled();
});
it('paginates history with exact microseconds and the original task identity', async () => {
  const beforeCursor = {createdAt: '2026-11-11T12:00:00.123456Z', id: operationId};
  expect((await staffTaskHttp(request('history', {taskId: operationId, beforeCursor}), 'history')).status).toBe(200);
  expect(f.detail).toHaveBeenCalledWith(expect.any(Object), operationId, undefined, beforeCursor);
  f.detail.mockClear();
  expect((await staffTaskHttp(request('history', {taskId: operationId, beforeCursor: {...beforeCursor, createdAt: '2026-02-30T12:00:00Z'}}), 'history')).status).toBe(400);
  expect(f.detail).not.toHaveBeenCalled();
});
it('paginates canonical people and locations with same-origin authority checks', async () => {
  const query = {employeeCursor: 'roster-100', locationCursor: null};
  expect((await staffTaskHttp(request('context', query), 'contextPage')).status).toBe(200);
  expect(f.context).toHaveBeenCalledWith(expect.any(Object), undefined, query);
  expect((await staffTaskHttp(request('context', query, {'x-nevora-staff-task-authority': ''}), 'contextPage')).status).toBe(403);
  expect((await staffTaskHttp(request('context', {...query, actorId: 'other'}), 'contextPage')).status).toBe(400);
});
