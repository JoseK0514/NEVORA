import { afterEach, beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { companyKnowledgeService, readKnowledgeLease, readKnowledgeVersion, assertKnowledgeFence } from './company-knowledge.server';
import { CompanyKnowledgeReader } from './company-knowledge-reader.server';
import { Client } from 'pg';
import { AdvisorStore } from './store.server';
import { admitOwner } from './authority.server';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
const call = (value?: unknown, proof = f.owner) => companyKnowledgeService(proof, f.db.executor, new AbortController().signal, value);
const draft = (expectedRevision = 0, extra = {}) => ({ op: 'draft_document', requestId: randomUUID(), expectedRevision, documentId: null, title: 'Fictional opening procedure', locale: 'en', category: 'operations', body: 'Fictional procedure: open at 08:00, verify the roster and never invent employee consent.', ...extra });
async function store() { return new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor); }
async function publish(extra = {}) {
  const created = await call(draft(0, extra));
  if (!('documentId' in created) || !created.versionId || !created.textDigest) throw Error('Expected draft receipt');
  const result = await call({ op: 'publish', requestId: randomUUID(), expectedRevision: created.revision, documentId: created.documentId, versionId: created.versionId, reviewedTextDigest: created.textDigest });
  return { created, result };
}

it('keeps drafts out of Rondo and publishes exactly the Owner-reviewed immutable text', async () => {
  const created = await call(draft());
  expect(created.state).toBe('draft_saved');
  if (!('documentId' in created) || !created.versionId) throw Error('Expected receipt');
  expect((await readKnowledgeLease(await store())).activeVersions).toEqual([]);
  await expect(call({ op: 'publish', requestId: randomUUID(), expectedRevision: 1, documentId: created.documentId, versionId: created.versionId, reviewedTextDigest: 'a'.repeat(64) })).rejects.toMatchObject({ code: 'conflict' });
  await call({ op: 'publish', requestId: randomUUID(), expectedRevision: 1, documentId: created.documentId, versionId: created.versionId, reviewedTextDigest: created.textDigest });
  const lease = await readKnowledgeLease(await store());
  expect(lease.activeVersions).toHaveLength(1);
  expect((await readKnowledgeVersion(await store(), created.documentId, created.versionId)).body).toContain('Fictional procedure');
  expect(await f.q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: 0 }]);
});

it('recovers identical operations, rejects changed payload and serializes concurrent revision writes', async () => {
  const command = draft(), saved = await call(command);
  expect(await call(command)).toEqual(saved);
  await expect(call({ ...command, body: 'Changed text' })).rejects.toMatchObject({ code: 'conflict' });
  const results = await Promise.allSettled([call(draft(1)), call(draft(1))]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(await f.q('SELECT revision FROM owner_advisor_company_knowledge_state')).toEqual([{ revision: 2 }]);
});

it('shares company knowledge across current Owners while denying Managers and other-company identifiers', async () => {
  const { created } = await publish();
  await expect(call(undefined, f.manager)).rejects.toThrow();
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const other = { ...f.manager, employee: { ...f.manager.employee, role: 'OWNER' as const } };
  const snapshot = await call(undefined, other);
  expect(snapshot.state).toBe('ready');
  expect(JSON.stringify(snapshot)).toContain(created.documentId);
  await expect(readKnowledgeVersion(await store(), randomUUID(), created.versionId!)).rejects.toMatchObject({ code: 'forbidden' });
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
  await expect(call()).rejects.toThrow();
});

it('retains the published version during edits, archives immediately and purges text on delete', async () => {
  const { created } = await publish();
  await call(draft(2, { documentId: created.documentId, body: 'New draft must not replace published guidance.' }));
  expect((await readKnowledgeLease(await store())).activeVersions.map(v => v.versionId)).toEqual([created.versionId]);
  await call({ op: 'archive', requestId: randomUUID(), expectedRevision: 3, documentId: created.documentId });
  expect((await readKnowledgeLease(await store())).activeVersions).toEqual([]);
  await call({ op: 'delete', requestId: randomUUID(), expectedRevision: 4, documentId: created.documentId, acknowledged: true });
  await expect(readKnowledgeVersion(await store(), created.documentId, created.versionId!)).rejects.toMatchObject({ code: 'forbidden' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_company_knowledge_versions WHERE body IS NOT NULL OR profile_fields IS NOT NULL')).toEqual([{ n: 0 }]);
  expect(JSON.stringify(await f.q('SELECT receipt FROM owner_advisor_company_knowledge_operations'))).not.toContain('Fictional procedure');
});

it('distinguishes future/expired validity from advisory review-due dates', async () => {
  await publish({ effectiveFrom: '2030-01-01T00:00:00Z' });
  const future = await readKnowledgeLease(await store());
  expect(future.activeVersions).toEqual([]);
  expect(future.validUntil).not.toBeNull();
  await call(draft(2, { effectiveUntil: '2020-01-01T00:00:00Z', reviewDue: '2019-01-01T00:00:00Z' }));
  const fresh = await call(draft(3, { reviewDue: '2020-01-01T00:00:00Z' }));
  if (!('documentId' in fresh)) throw Error('Expected receipt');
  await call({ op: 'publish', requestId: randomUUID(), expectedRevision: 4, documentId: fresh.documentId, versionId: fresh.versionId, reviewedTextDigest: fresh.textDigest });
  const active = await readKnowledgeLease(await store());
  expect(active.activeVersions).toHaveLength(1);
  expect(active.activeVersions[0].reviewOverdue).toBe(true);
});

it('enforces the document quota atomically across competing Owners', async () => {
  for (let revision = 0; revision < 19; revision++) await call(draft(revision));
  const results = await Promise.allSettled([call(draft(19)), call(draft(19))]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  await expect(call(draft(20))).rejects.toMatchObject({ code: 'limit' });
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_company_knowledge_entries WHERE kind='document' AND deleted_at IS NULL")).toEqual([{ n: 20 }]);
});

it('serializes writers without lock-upgrade deadlocks and binds replay to the admitted session', async () => {
  const command = draft(), results = await Promise.allSettled([call(command), call(command)]);
  expect(results.every(r => r.status === 'fulfilled')).toBe(true);
  expect((results[0] as PromiseFulfilledResult<unknown>).value).toEqual((results[1] as PromiseFulfilledResult<unknown>).value);
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'owner',clock_timestamp()+interval '1 hour')");
  await expect(call(command, { ...f.owner, sessionTokenHash: 'c'.repeat(64) })).rejects.toMatchObject({ code: 'conflict' });
});

it('bounds UTF-8 context and citations over repeated EN/ES searches, exposing conflicting sources without merging them', async () => {
  for (let index = 0; index < 7; index++) {
    const d = await call(draft(index * 2, { title: `Manual ficticio ${index}`, body: `apertura ORCHID: ${index % 2 ? 'prioritize deliveries' : 'prioritize walk-in orders'}. ` + 'x'.repeat(6000), locale: 'es' }));
    if (!('documentId' in d)) throw Error('Expected receipt');
    await call({ op: 'publish', requestId: randomUUID(), expectedRevision: index * 2 + 1, documentId: d.documentId, versionId: d.versionId, reviewedTextDigest: d.textDigest });
  }
  const s = await store(), reader = new CompanyKnowledgeReader(s, await readKnowledgeLease(s));
  const first = await reader.search('apertura', 8), second = await reader.search('ORCHID', 8), third = await reader.search('unmatchedkeyword', 8);
  expect(first.partial).toBe(true);
  expect(first.sources.length + second.sources.length).toBeLessThanOrEqual(6);
  const items = [first, second].flatMap(r => (r.data as { excerpts: { text: string; complete: boolean }[] }).excerpts);
  expect(items.reduce((sum, item) => sum + Buffer.byteLength(JSON.stringify(item), 'utf8'), 0)).toBeLessThanOrEqual(24576);
  expect(items.every(item => item.complete === false)).toBe(true);
  expect(JSON.stringify(first.data)).toContain('prioritize deliveries');
  expect(JSON.stringify(first.data)).toContain('prioritize walk-in orders');
  expect(third.data).toMatchObject({ state: 'missing', matchedDocuments: 0 });
  expect(JSON.stringify(third.data)).not.toContain('Manual ficticio');
});

it('bounds retained versions and aggregate text inside the mutation transaction', async () => {
  const first = await call(draft());
  if (!('documentId' in first)) throw Error('Expected receipt');
  // Seed synthetic prior versions to exercise the actual atomic quota without
  // 99 redundant transport writes. The final competing writes use the service.
  await f.q(`INSERT INTO owner_advisor_company_knowledge_versions(workspace_id,document_id,id,title,locale,category,body,text_digest,created_by)
    SELECT workspace_id,document_id,md5('quota-version-'||n)::uuid,title,locale,category,body,text_digest,created_by FROM owner_advisor_company_knowledge_versions CROSS JOIN generate_series(1,98) n WHERE id=$1::uuid`, [first.versionId]);
  const results = await Promise.allSettled([call(draft(1, { documentId: first.documentId })), call(draft(1, { documentId: first.documentId }))]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  await expect(call(draft(2, { documentId: first.documentId }))).rejects.toMatchObject({ code: 'limit' });
  await f.q('DELETE FROM owner_advisor_company_knowledge_versions WHERE id<>$1::uuid', [first.versionId]);
  await f.q(`INSERT INTO owner_advisor_company_knowledge_versions(workspace_id,document_id,id,title,locale,category,body,text_digest,created_by)
    SELECT workspace_id,document_id,md5('byte-version-'||n)::uuid,title,locale,category,repeat('x',262144),text_digest,created_by FROM owner_advisor_company_knowledge_versions CROSS JOIN generate_series(1,39) n WHERE id=$1::uuid`, [first.versionId]);
  await expect(call(draft(2, { documentId: first.documentId, body: 'x'.repeat(262144) }))).rejects.toMatchObject({ code: 'limit' });
  expect(await f.q('SELECT revision FROM owner_advisor_company_knowledge_state')).toEqual([{ revision: 2 }]);
});

it('fences a future publication becoming effective without a revision write', async () => {
  await publish({ effectiveFrom: new Date(Date.now() + 1200).toISOString() });
  const s = await store(), lease = await readKnowledgeLease(s);
  expect(lease.activeVersions).toEqual([]);
  await f.q('SELECT pg_sleep(1.3)');
  await expect(assertKnowledgeFence(s, lease)).rejects.toMatchObject({ code: 'conflict' });
  expect((await readKnowledgeLease(s)).activeVersions).toHaveLength(1);
});

it('checks feature-off replay after an overlapping tagged completion releases the reservation lock', async () => {
  const s = await store(), lease = await readKnowledgeLease(s), id = randomUUID();
  await s.reserve(id, 'fictional-hash', 100, lease);
  const holder = new Client({ connectionString: f.db.connectionString });
  await holder.connect();
  let pending: Promise<{ result?: unknown; error?: unknown }> | undefined;
  try {
    await holder.query('BEGIN');
    await holder.query("SELECT pg_advisory_xact_lock(hashtextextended('owner-advisor:'||$1,0))", ['workspace-fuel']);
    await holder.query("UPDATE owner_advisor_requests SET state='completed',result=$2::jsonb,knowledge_fingerprint=$3 WHERE request_id=$1", [id, JSON.stringify({ text: 'TAGGED_PRIVATE_ANSWER', sources: [] }), lease.fingerprint]);
    pending = s.reserve(id, 'fictional-hash', 100).then(result => ({ result }), error => ({ error }));
    // Observe the real blocked SQL statement, rather than guessing with a sleep.
    let waiting = false;
    for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
      const rows = await f.q<{ n: number }>("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'");
      waiting = rows[0].n > 0;
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(waiting).toBe(true);
    await holder.query('COMMIT');
    const outcome = await pending;
    expect(outcome.error).toMatchObject({ code: 'conflict' });
    expect(outcome.result).toBeUndefined();
  } finally { await holder.query('ROLLBACK').catch(() => {}); await holder.end(); await pending; }
});
