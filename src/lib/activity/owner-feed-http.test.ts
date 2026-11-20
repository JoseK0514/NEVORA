import {afterEach, beforeEach, expect, it, rs} from '@rstest/core';
import {POST} from '../../app/api/owner/activity/route';
import {readSessionMutationProof} from '../auth/session';
import {readOwnerActivityPage} from './owner-feed.server';
import {parseOwnerActivityPage} from './owner-feed-page.server';
import {randomUUID} from 'node:crypto';

rs.mock('../auth/session', () => ({readSessionMutationProof: rs.fn()}));
rs.mock('./owner-feed.server', () => ({readOwnerActivityPage: rs.fn()}));

const origin = 'http://localhost:3000';
const proof = {sessionTokenHash: 'a'.repeat(64), employee: {
  id: 'owner', role: 'OWNER' as const, primaryLocationId: 'loc-1', firstName: 'Fictional', lastName: 'Owner',
}};
const request = (body = '{}', from = origin) => new Request(origin + '/api/owner/activity', {
  method: 'POST', headers: {origin: from, 'content-type': 'application/json', 'x-nevora-activity': '1'}, body,
});
beforeEach(() => { rs.stubEnv('FUEL_PORTAL_ORIGIN', origin); });
afterEach(() => { rs.resetAllMocks(); rs.unstubAllEnvs(); });

it('requires same-origin intent and an Owner, and bounds input before reading any sources', async () => {
  expect((await POST(request('{}', 'https://example.invalid'))).status).toBe(403);
  rs.mocked(readSessionMutationProof).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  rs.mocked(readSessionMutationProof).mockResolvedValue({...proof, employee: {...proof.employee, role: 'MANAGER'}});
  expect(await (await POST(request())).json()).toEqual({state: 'access_denied'});
  rs.mocked(readSessionMutationProof).mockResolvedValue(proof);
  for (const body of ['{"cursor":"broken"}', '{"limit":101}', '{"workspaceId":"another"}', '[', '{}'.padEnd(4097)]) {
    expect((await POST(request(body))).status).toBe(400);
  }
  expect(readOwnerActivityPage).not.toHaveBeenCalled();
});

it('returns private ready, unavailable, and post-admission access-loss responses', async () => {
  rs.mocked(readSessionMutationProof).mockResolvedValue(proof);
  const empty = {state: 'ready' as const, entries: [], nextCursor: null};
  rs.mocked(readOwnerActivityPage).mockResolvedValueOnce(empty).mockResolvedValueOnce({state: 'unavailable'}).mockResolvedValueOnce({state: 'access_denied'});
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toContain('no-store');
  expect(await response.json()).toEqual(empty);
  const unavailable = await POST(request());
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({state: 'unavailable'});
  expect((await POST(request())).status).toBe(403);
});

it('accepts a full microsecond key and rejects impossible cursor dates', () => {
  const id = 'schedule:' + randomUUID();
  const cursor = (at: string) => Buffer.from(JSON.stringify([at, id])).toString('base64url');
  const at = '2026-11-19T17:00:00.123456Z';
  expect(parseOwnerActivityPage({cursor: cursor(at)})).toEqual({limit: 25, before: [at, id]});
  for (const invalid of ['2026-02-30T17:00:00.123456Z', '0000-01-01T00:00:00.000000Z', '2026-11-19T17:00:60.000000Z']) {
    expect(parseOwnerActivityPage({cursor: cursor(invalid)})).toBeNull();
  }
});
