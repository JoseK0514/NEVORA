import { afterEach, beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalBusinessInput } from '@/test/fixtures/rondo-business';
import { AdvisorStore } from '../store.server';
import { admitOwner } from '../authority.server';
import { BusinessStore } from './store.server';
import { parseBusinessCommand } from './parse';
import { businessDigest } from './digest.server';
import type { BusinessCommand } from './contracts';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
let store: BusinessStore;
const signal = () => new AbortController().signal;
beforeEach(async () => { f = await companyAccessFixture(); store = new BusinessStore(new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor), {}); });
afterEach(async () => { await f?.db.dispose(); });
const stageCommand = (patch = {}) => parseBusinessCommand({ op: 'stage_source_version', requestId: randomUUID(), format: 'JSON', input: { ...fictionalBusinessInput(), ...patch } });
async function run(command: BusinessCommand) { const hash = businessDigest(command); await store.reserveOperation(command, hash, signal()); return store.execute(command, hash, signal()); }
async function stage(patch = {}) { return run(stageCommand(patch)); }
async function publish(sourceId: string, versionId: string) {
  const view = await store.readVersion(versionId, signal()); const catalog = await store.catalog(signal()); const revision = catalog.sources.find(s => s.sourceId === sourceId)!.revision;
  const read = await run({ op: 'read_source_version', requestId: randomUUID(), sourceId, versionId });
  const readReceiptId = await store.reviewHandle(read.operationId, signal());
  return run({ op: 'publish_source_version', requestId: randomUUID(), sourceId, versionId, expectedRevision: revision, digest: view.digest, readReceiptId, acknowledged: true });
}
it('stores immutable versions and content-free operations, keeping draft changes out of the evidence epoch', async () => {
  const before = await store.catalog(signal()); const saved = await stage(); const view = await store.readVersion(saved.versionId!, signal());
  expect(view.input?.records).toHaveLength(9); expect(view.status).toBe('DRAFT');
  expect((await store.catalog(signal())).evidenceRevision).toBe(before.evidenceRevision);
  await expect(f.q("UPDATE owner_advisor_business_versions SET digest=repeat('c',64)")).rejects.toThrow(/immutable/);
  await expect(f.q("UPDATE owner_advisor_business_record_digests SET digest=repeat('c',64)")).rejects.toThrow(/immutable/);
  await expect(f.q("UPDATE owner_advisor_business_sources SET currency='EUR'")).rejects.toThrow(/immutable/);
  expect(JSON.stringify(await f.q('SELECT receipt FROM owner_advisor_business_operations'))).not.toContain('operating');
  await publish(saved.sourceId!, saved.versionId!); expect((await store.catalog(signal())).evidenceRevision).toBe(before.evidenceRevision + 1);
});
it('enforces retained-version and retained-row quotas and frees payload capacity only on explicit discard', async () => {
  const original = await stage();
  await f.q(`INSERT INTO owner_advisor_business_versions(workspace_id,source_id,version_id,owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,status,payload)
    SELECT workspace_id,source_id,gen_random_uuid(),owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,'PUBLISHED',payload FROM owner_advisor_business_versions CROSS JOIN generate_series(1,199) n WHERE version_id=$1::uuid`, [original.versionId]);
  const input = fictionalBusinessInput(); input.source = { ...input.source, sourceId: original.sourceId!, expectedRevision: original.revision };
  await expect(stage(input)).rejects.toMatchObject({ code: 'limit' });
  const view = await store.readVersion(original.versionId!, signal()); await run({ op: 'discard_source_version', requestId: randomUUID(), sourceId: original.sourceId!, versionId: original.versionId!, expectedRevision: 1, digest: view.digest, acknowledged: true });
  input.source.expectedRevision = 2; const replacement = await stage(input); expect(replacement.versionId).toBeTruthy();
  // Synthetic retained history fills exactly 100000 rows without 100k transport calls.
  await f.q(`UPDATE owner_advisor_business_versions SET status='ERASED',payload=NULL WHERE version_id<>$1::uuid`, [replacement.versionId]);
  await f.q(`INSERT INTO owner_advisor_business_versions(workspace_id,source_id,version_id,owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,status,payload)
    SELECT workspace_id,source_id,gen_random_uuid(),owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,'PUBLISHED',
      jsonb_set(payload::jsonb,'{records}',(SELECT jsonb_agg(NULL::text) FROM generate_series(1,CASE WHEN n=100 THEN 991 ELSE 1000 END)))::text
    FROM owner_advisor_business_versions CROSS JOIN generate_series(1,100) n WHERE version_id=$1::uuid`, [replacement.versionId]);
  expect(await f.q('SELECT sum(row_count)::int n FROM owner_advisor_business_versions')).toEqual([{ n: 100000 }]);
  input.source.expectedRevision = replacement.revision; await expect(stage(input)).rejects.toMatchObject({ code: 'limit' });
  await run({ op: 'discard_source_version', requestId: randomUUID(), sourceId: replacement.sourceId!, versionId: replacement.versionId!, expectedRevision: replacement.revision, digest: (await store.readVersion(replacement.versionId!, signal())).digest, acknowledged: true });
  input.source.expectedRevision++; expect((await stage(input)).versionId).toBeTruthy();
});
it('retains original receipt custody at the durable operation cap and never recycles an expired inspection identity', async () => {
  const command = stageCommand(), saved = await run(command);
  await f.q("INSERT INTO owner_advisor_business_operations(workspace_id,owner_id,request_id,command_kind,command_hash) SELECT 'workspace-fuel','owner',gen_random_uuid(),'stage_source_version',repeat('b',64) FROM generate_series(1,9999)");
  await expect(store.reserveOperation(stageCommand(), businessDigest(stageCommand()), signal())).rejects.toMatchObject({ code: 'conflict' });
  const fresh = stageCommand(); await expect(store.reserveOperation(fresh, businessDigest(fresh), signal())).rejects.toMatchObject({ code: 'limit' });
  expect((await store.reserveOperation(command, businessDigest(command), signal())).receipt).toEqual(saved);
  expect((await store.readOperation(saved.operationId, signal())).receipt).toEqual(saved);
});
it('bounds live private inspections, completes them once, and prevents changing their source custody', async () => {
  const id = randomUUID(), hash = businessDigest({ fixture: 'inspection' }); await store.reserveInspection(id, hash, {}, signal());
  await store.completeInspection(id, { state: 'ready' }, { fixture: true }, signal());
  await expect(store.completeInspection(id, { state: 'changed' }, {}, signal())).rejects.toMatchObject({ code: 'conflict' });
  await expect(f.q("UPDATE owner_advisor_business_inspections SET query_hash=repeat('c',64) WHERE inspection_id=$1::uuid", [id])).rejects.toThrow(/immutable/);
  await f.q("INSERT INTO owner_advisor_business_inspections(workspace_id,owner_id,inspection_id,query_hash,authority,session_hash,context) SELECT 'workspace-fuel','owner',gen_random_uuid(),repeat('a',64),$1,repeat('a',64),'{}'::jsonb FROM generate_series(1,999)", [store.advisor.original.authority]);
  await expect(store.reserveInspection(randomUUID(), hash, {}, signal())).rejects.toMatchObject({ code: 'limit' });
  expect((await store.reserveInspection(id, hash, {}, signal())).state).toBe('completed');
});
it('recovers the same operation across competing calls and rejects changed hashes or another Owner custody', async () => {
  const command = stageCommand(), hash = businessDigest(command); await store.reserveOperation(command, hash, signal());
  const [a, b] = await Promise.all([store.execute(command, hash, signal()), store.execute(command, hash, signal())]); expect(a).toEqual(b);
  expect((await store.catalog(signal())).versions).toHaveLength(1);
  await expect(store.reserveOperation(command, 'b'.repeat(64), signal())).rejects.toMatchObject({ code: 'conflict' });
  const changedInput = fictionalBusinessInput(); changedInput.source.name = 'Changed source label'; const changed = { ...stageCommand(changedInput), requestId: command.requestId }; await expect(store.reserveOperation(changed, businessDigest(changed), signal())).rejects.toMatchObject({ code: 'conflict' });
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'"); const proof = { ...f.manager, employee: { ...f.manager.employee, role: 'OWNER' as const } };
  const other = new BusinessStore(new AdvisorStore(proof, await admitOwner(proof, f.db.executor), f.db.executor), {});
  expect((await other.readVersion(a.versionId!, signal())).versionId).toBe(a.versionId);
  await expect(other.readOperation(command.requestId, signal())).rejects.toMatchObject({ code: 'forbidden' });
});
it('denies revoked sessions and foreign identifiers on every actual SQL read', async () => {
  const saved = await stage(); await expect(store.readVersion(randomUUID(), signal())).rejects.toMatchObject({ code: 'forbidden' });
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'"); await expect(store.readVersion(saved.versionId!, signal())).rejects.toThrow();
  await expect(admitOwner(f.manager, f.db.executor)).rejects.toThrow();
});
it('requires exact full-read custody and only corrects the exact window, retaining February', async () => {
  const jan = await stage(); await publish(jan.sourceId!, jan.versionId!);
  const cat = await store.catalog(signal()), source = cat.sources[0]; const febInput = fictionalBusinessInput(); febInput.source = { ...febInput.source, sourceId: source.sourceId, expectedRevision: source.revision }; febInput.window = { fromAt: '2026-02-01T00:00:00.000Z', toAt: '2026-03-01T00:00:00.000Z' }; febInput.sourceAsOf = febInput.window.toAt; febInput.records = [];
  const feb = await run(parseBusinessCommand({ op: 'stage_source_version', requestId: randomUUID(), format: 'JSON', input: febInput })); await publish(feb.sourceId!, feb.versionId!);
  const current = (await store.catalog(signal())).sources[0]; const corrected = fictionalBusinessInput(); corrected.source = { ...corrected.source, sourceId: current.sourceId, expectedRevision: current.revision };
  const next = await stage(corrected); const view = await store.readVersion(next.versionId!, signal());
  await expect(run({ op: 'publish_source_version', requestId: randomUUID(), sourceId: next.sourceId!, versionId: next.versionId!, expectedRevision: next.revision, digest: view.digest, readReceiptId: randomUUID(), acknowledged: true })).rejects.toMatchObject({ code: 'conflict' });
  await publish(next.sourceId!, next.versionId!);
  expect((await store.catalog(signal())).versions.filter(v => v.current).map(v => v.versionId).sort()).toEqual([feb.versionId, next.versionId].sort());
  const overlapping = fictionalBusinessInput(); overlapping.source = { ...overlapping.source, sourceId: next.sourceId!, expectedRevision: (await store.catalog(signal())).sources[0].revision }; overlapping.window.toAt = '2026-01-20T00:00:00.000Z'; overlapping.records = []; overlapping.sourceAsOf = '2026-03-01T00:00:00.000Z';
  const rejected = await stage(overlapping); await expect(publish(rejected.sourceId!, rejected.versionId!)).rejects.toMatchObject({ code: 'conflict' });
  expect((await store.catalog(signal())).versions.filter(v => v.current)).toHaveLength(2);
});
it('rejects reused row revisions with different contents while allowing a genuinely new observation revision', async () => {
  const a = await stage(); const input = fictionalBusinessInput(); input.source = { ...input.source, sourceId: a.sourceId!, expectedRevision: a.revision };
  const row = input.records[0]; if (row.kind !== 'BALANCE') throw Error('Fixture'); row.amountMinor = '100001';
  await expect(stage(input)).rejects.toMatchObject({ code: 'conflict' }); row.revision = '2'; expect((await stage(input)).versionId).not.toBe(a.versionId);
});
it('enforces active-source and draft caps atomically and permits original receipt recovery when full', async () => {
  const receipts = [];
  for (let i = 0; i < 20; i++) { const input = fictionalBusinessInput(); input.source.namespace = `bank-${i}`; receipts.push(await stage(input)); }
  const denied = fictionalBusinessInput(); denied.source.namespace = 'bank-over'; await expect(stage(denied)).rejects.toMatchObject({ code: 'limit' });
  expect((await store.readOperation(receipts[0].operationId, signal())).receipt).toEqual(receipts[0]);
  const original = receipts[0], view = await store.readVersion(original.versionId!, signal());
  await run({ op: 'discard_source_version', requestId: randomUUID(), sourceId: original.sourceId!, versionId: original.versionId!, expectedRevision: original.revision, digest: view.digest, acknowledged: true });
  // Source quota remains occupied until explicit deletion, even after discarding its draft.
  const source = (await store.catalog(signal())).sources.find(s => s.sourceId === original.sourceId)!;
  await run({ op: 'delete_source', requestId: randomUUID(), sourceId: source.sourceId, expectedRevision: source.revision, digest: source.scopeDigest, acknowledged: true });
  expect((await stage(denied)).versionId).toBeTruthy();
  expect((await store.readOperation(original.operationId, signal())).receipt).toEqual(original);
  await publish(receipts[1].sourceId!, receipts[1].versionId!);
  const overSources = fictionalBusinessInput(); overSources.source.namespace = 'twenty-first-bank';
  await expect(stage(overSources)).rejects.toMatchObject({ code: 'limit' });
});
it('enforces the independent draft cap for one source and publication releases one draft slot', async () => {
  let receipt = await stage();
  for (let i = 1; i < 20; i++) { const input = fictionalBusinessInput(); input.source = { ...input.source, sourceId: receipt.sourceId!, expectedRevision: receipt.revision }; receipt = await stage(input); }
  const input = fictionalBusinessInput(); input.source = { ...input.source, sourceId: receipt.sourceId!, expectedRevision: receipt.revision };
  await expect(stage(input)).rejects.toMatchObject({ code: 'limit' });
  const published = await publish(receipt.sourceId!, receipt.versionId!); input.source.expectedRevision = published.revision;
  expect((await stage(input)).versionId).toBeTruthy();
});
it('rolls back the source, rows and receipt together when a final trigger fails', async () => {
  await f.q("CREATE FUNCTION fail_business_qa() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'qa_final_failure'; END $$; CREATE TRIGGER fail_business_qa BEFORE UPDATE ON owner_advisor_business_operations FOR EACH ROW WHEN (NEW.state='completed') EXECUTE FUNCTION fail_business_qa()");
  await expect(stage()).rejects.toThrow(/qa_final_failure/); expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_sources')).toEqual([{ n: 0 }]); expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_versions')).toEqual([{ n: 0 }]);
});
it('bounds a contended workspace lock and releases an aborted reservation without source writes', async () => {
  const holder = new Client({ connectionString: f.db.connectionString }); await holder.connect();
  try { await holder.query('BEGIN'); await holder.query("SELECT id FROM workspaces WHERE id='workspace-fuel' FOR NO KEY UPDATE");
    const command = stageCommand(), at = Date.now(); await expect(store.reserveOperation(command, businessDigest(command), signal())).rejects.toMatchObject({ code: 'busy' }); expect(Date.now() - at).toBeLessThan(4000);
    const abort = new AbortController(); const cancelled = stageCommand(); const pending = store.reserveOperation(cancelled, businessDigest(cancelled), abort.signal); setTimeout(() => abort.abort(), 30); await expect(pending).rejects.toThrow();
  } finally { await holder.query('ROLLBACK'); await holder.end(); }
  expect((await stage()).versionId).toBeTruthy();
});
it('counts retained map and source payloads once at the exact mixed199/200 boundary',async()=>{
 const original=await stage();await f.q(`INSERT INTO owner_advisor_business_versions(workspace_id,source_id,version_id,owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,status,payload) SELECT workspace_id,source_id,gen_random_uuid(),owner_id,time_zone,digest,from_at,to_at,source_as_of,completeness,'PUBLISHED',payload FROM owner_advisor_business_versions CROSS JOIN generate_series(1,99) n WHERE version_id=$1::uuid`,[original.versionId]);
 await f.q("INSERT INTO owner_advisor_business_maps(workspace_id,map_version_id,owner_id,digest,payload,status) SELECT 'workspace-fuel',gen_random_uuid(),'owner',repeat('a',64),'{\"expectedRevision\":0,\"accounts\":[],\"cells\":[]}','PUBLISHED' FROM generate_series(1,99)");
 const map={expectedRevision:0,accounts:[],cells:[]};expect((await run({op:'stage_coverage_map',requestId:randomUUID(),map})).mapVersionId).toBeTruthy();await expect(run({op:'stage_coverage_map',requestId:randomUUID(),map:{...map,expectedRevision:1}})).rejects.toMatchObject({code:'limit'});
});
