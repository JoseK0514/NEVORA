import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlExecutor } from '@/lib/notifications/types';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
const state = vi.hoisted(() => ({ proof: null as SessionMutationProof | null, ex: null as SqlExecutor | null }));
vi.mock('@/lib/auth/session', () => ({ getSession: async () => state.proof?.employee ?? null, requireSessionMutationProof: async () => state.proof }));
vi.mock('@/lib/data/sql-executor', () => ({ neonNotificationExecutor: () => state.ex }));
import { GET, POST } from '@/app/api/owner/advisor/knowledge/route';
import { GET as versionGET } from '@/app/api/owner/advisor/knowledge/entries/[documentId]/versions/[versionId]/route';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); state.proof = f.owner; state.ex = f.db.executor; });
afterEach(async () => { vi.restoreAllMocks(); await f?.db.dispose(); });
const url = 'http://localhost/api/owner/advisor/knowledge';
const request = (body?: unknown, headers = {}) => new Request(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'x-nevora-company-knowledge': '1', origin: 'http://localhost', 'content-type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const draft = () => ({ op: 'draft_document', requestId: randomUUID(), expectedRevision: 0, documentId: null, title: 'Fictional handbook', locale: 'es', category: 'policy', body: 'Texto ficticio: <script>alert(1)</script>. This is guidance, not verified law.', sourceName: 'handbook.md' });
const context = (documentId = randomUUID(), versionId = randomUUID()) => ({ params: Promise.resolve({ documentId, versionId }) });

it('uses current Owner admission, same-origin intent, bounded JSON and private response headers without a model', async () => {
  const outbound = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No network allowed'));
  expect((await POST(request(draft(), { origin: 'https://evil.invalid' }))).status).toBe(403);
  expect((await GET(request(undefined, { 'x-nevora-company-knowledge': '' }))).status).toBe(403);
  expect((await GET(new Request(url + '?workspace=other', { headers: { 'x-nevora-company-knowledge': '1' } }))).status).toBe(400);
  expect((await POST(request({ ...draft(), workspaceId: 'other' }))).status).toBe(400);
  expect((await POST(request({ ...draft(), body: 'x'.repeat(262145) }))).status).toBe(400);
  const r = await POST(request(draft()));
  expect(r.status).toBe(200);
  expect(r.headers.get('cache-control')).toBe('no-store, private');
  expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  expect((await r.json()).state).toBe('draft_saved');
  state.proof = null; expect((await GET(request())).status).toBe(401);
  state.proof = f.manager; expect((await GET(request())).status).toBe(403);
  state.proof = f.owner;
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
  expect((await GET(request())).status).toBe(403);
  expect(outbound).not.toHaveBeenCalled();
});

it('serves exact text as private plain text, labels unpublished/history, rejects forged IDs and purges deleted versions', async () => {
  const created = await (await POST(request(draft()))).json();
  const params = context(created.documentId, created.versionId), href = `${url}/entries/${created.documentId}/versions/${created.versionId}`;
  const r = await versionGET(new Request(href, { headers: { 'sec-fetch-site': 'same-origin' } }), params);
  expect(r.status).toBe(200);
  expect(r.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  expect(r.headers.get('x-content-sha256')).toBe(created.textDigest);
  const text = await r.text();
  expect(text).toContain('Unpublished draft');
  expect(text).toContain('<script>alert(1)</script>');
  const json = await versionGET(new Request(href, { headers: { accept: 'application/json' } }), params);
  expect(await json.json()).toMatchObject({ body: expect.stringContaining('Texto ficticio'), textDigest: created.textDigest, current: false });
  expect((await versionGET(new Request(href, { headers: { 'sec-fetch-site': 'cross-site' } }), params)).status).toBe(403);
  expect((await versionGET(new Request(href), context(randomUUID(), created.versionId))).status).toBe(403);
  await POST(request({ op: 'delete', requestId: randomUUID(), expectedRevision: 1, documentId: created.documentId, acknowledged: true }));
  expect((await versionGET(new Request(href), params)).status).toBe(403);
  expect(await (await GET(request())).json()).toMatchObject({ entries: [] });
});

it('bounds actual streamed bytes even with no Content-Length or a false small length', async () => {
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(1048577).fill(32)); c.close(); } });
  const r = await POST(new Request(url, { method: 'POST', headers: { 'x-nevora-company-knowledge': '1', origin: 'http://localhost', 'content-type': 'application/json', 'content-length': '1' }, body, duplex: 'half' } as RequestInit));
  expect(r.status).toBe(400);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_company_knowledge_operations')).toEqual([{ n: 0 }]);
});

it('rechecks revoked authority after receiving text before any draft is stored', async () => {
  const body = new ReadableStream<Uint8Array>({ async start(c) {
    c.enqueue(new TextEncoder().encode('{'));
    await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
    c.enqueue(new TextEncoder().encode(JSON.stringify(draft()).slice(1))); c.close();
  } });
  const r = await POST(new Request(url, { method: 'POST', headers: { 'x-nevora-company-knowledge': '1', origin: 'http://localhost', 'content-type': 'application/json' }, body, duplex: 'half' } as RequestInit));
  expect(r.status).toBe(403);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_company_knowledge_versions')).toEqual([{ n: 0 }]);
});
