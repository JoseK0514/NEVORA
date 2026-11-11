import {afterEach, expect, it, vi} from 'vitest';
import {staffTaskRequest, sendStaffTaskCommand, readStaffTaskOperation, parseStaffTaskLifetime} from './client';
import type {StaffTaskCommand} from './types';
const authority = 'a'.repeat(64), id = '00000000-0000-4000-8000-000000000001';
const command: StaffTaskCommand = {kind: 'COMPLETE', operationId: id, authority, taskId: id, expectedRevision: 1};
afterEach(() => vi.unstubAllGlobals());
it('uses only fixed same-origin endpoints with no-store credentials and intent headers', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({state: 'ready'})); vi.stubGlobal('fetch', fetch);
  await staffTaskRequest('query', authority, {fromDate: '2026-11-11', toDate: '2026-11-17', view: 'MINE', locationId: null});
  expect(fetch).toHaveBeenCalledWith('/api/staff-tasks/query', expect.objectContaining({method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: expect.objectContaining({'X-Nevora-Staff-Task': '1', 'X-Nevora-Staff-Task-Authority': authority})}));
  await expect(staffTaskRequest('read', authority, undefined, '../private')).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('preserves committed, conflict and blocked results without automatic retry', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  for (const result of [{status: 'committed', operationId: id, templateId: id, taskId: id, revision: 2}, {status: 'conflict', reason: 'revision_changed'}, {status: 'blocked', reason: 'access_denied'}]) {
    fetch.mockResolvedValueOnce(Response.json(result)); expect(await sendStaffTaskCommand(command)).toEqual(result);
  }
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('treats transport or invalid response loss after mutation dispatch as unknown with the original operation ID', async () => {
  const fetch = vi.fn().mockRejectedValueOnce(Error('network')).mockResolvedValueOnce(new Response('<html>failed</html>', {status: 502})).mockResolvedValueOnce(Response.json({status: 'committed', operationId: 'other'})); vi.stubGlobal('fetch', fetch);
  for (let n = 0; n < 3; n++) expect(await sendStaffTaskCommand(command)).toEqual({status: 'outcome_unknown', operationId: id});
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('uses recovery with the same ID and never interprets a failed lookup as a safe retry', async () => {
  const fetch = vi.fn().mockRejectedValue(Error('network')); vi.stubGlobal('fetch', fetch);
  expect(await readStaffTaskOperation(authority, id)).toEqual({status: 'unavailable', reason: 'operation_unavailable'});
  expect(fetch).toHaveBeenCalledWith('/api/staff-tasks/operations/' + id, expect.objectContaining({method: 'GET'}));
});
it('rejects stale, foreign-authority or oversized private resource observations', () => {
  const r = {state: 'ready', authority, observedAt: '2026-11-11T12:00:00Z', validForMs: 15000, tasks: [], templates: [], hasMore: false, timeZone: 'America/Puerto_Rico', nextTaskCursor: null, nextTemplateCursor: null};
  expect(parseStaffTaskLifetime(r, authority)).toMatchObject({state: 'ready', validForMs: 15000});
  expect(() => parseStaffTaskLifetime({...r, authority: 'b'.repeat(64)}, authority)).toThrow();
  for (const validForMs of [0, -1, 15001, NaN]) expect(() => parseStaffTaskLifetime({...r, validForMs}, authority)).toThrow();
  expect(() => parseStaffTaskLifetime({...r, observedAt: 'invalid'}, authority)).toThrow();
  expect(() => parseStaffTaskLifetime({...r, extra: 'x'.repeat(1_000_001)}, authority)).toThrow();
});
it('rejects incomplete resources and malformed nested task/template/context/history values', () => {
  const envelope = {state: 'ready', authority, observedAt: '2026-11-11T12:00:00Z', validForMs: 15000};
  for (const body of [
    envelope, {...envelope, tasks: []},
    {...envelope, tasks: [], templates: [], hasMore: 'false', timeZone: 'America/Puerto_Rico'},
    {...envelope, tasks: [{id}], templates: [], hasMore: false, timeZone: 'America/Puerto_Rico'},
    {...envelope, tasks: [], templates: [{id, revision: '1'}], hasMore: false, timeZone: 'America/Puerto_Rico'},
    {...envelope, management: false, locations: [], employees: [{id}], hasMore: false, timeZone: 'America/Puerto_Rico'},
    {...envelope, task: {id}, events: [], historyTruncated: false},
    {...envelope, authority: 'invalid', tasks: [], templates: [], hasMore: false, timeZone: 'America/Puerto_Rico'},
  ]) expect(() => parseStaffTaskLifetime(body, String(body.authority))).toThrow();
});
it('rejects malformed or wrong-target committed receipts after dispatch without inventing success', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const receipt = {status: 'committed', operationId: id, templateId: id, taskId: id, revision: 2};
  for (const body of [
    {...receipt, taskId: '00000000-0000-4000-8000-000000000002'},
    {...receipt, revision: '2'}, {...receipt, revision: -1}, {...receipt, templateId: null},
    {...receipt, createdCount: 999999, more: 'yes', nextDate: 'invalid'},
    {status: 'committed', operationId: id},
  ]) {
    fetch.mockResolvedValueOnce(Response.json(body));
    expect(await sendStaffTaskCommand(command)).toEqual({status: 'outcome_unknown', operationId: id});
  }
});
it('uses fixed POST endpoints for canonical and history continuation without query-string workarounds', async () => {
  const fetch = vi.fn().mockImplementation(async () => Response.json({state: 'ready'})); vi.stubGlobal('fetch', fetch);
  await staffTaskRequest('contextPage', authority, {employeeCursor: 'roster-100', locationCursor: null});
  expect(fetch).toHaveBeenLastCalledWith('/api/staff-tasks/context', expect.objectContaining({method: 'POST'}));
  await staffTaskRequest('history', authority, {taskId: id, beforeCursor: {id, createdAt: '2026-11-11T12:00:00.123456Z'}});
  expect(fetch).toHaveBeenLastCalledWith('/api/staff-tasks/history', expect.objectContaining({method: 'POST'}));
});
