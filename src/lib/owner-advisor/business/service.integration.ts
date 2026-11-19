import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import type { SqlExecutor } from '@/lib/notifications/types';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { businessJanuary, fictionalBusinessInput } from '@/test/fixtures/rondo-business';
import { businessSourceService, readBusinessVersion, readBusinessEvidence } from './service.server';
import { AdvisorStore } from '../store.server';
import { admitOwner } from '../authority.server';
import { BusinessStore } from './store.server';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED: 'true', NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED: 'true' };
const signal = () => new AbortController().signal;
beforeEach(async () => { f = await companyAccessFixture(); rs.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No external requests')); });
afterEach(async () => { rs.restoreAllMocks(); await f?.db.dispose(); });
const call = (value?: unknown, ex = f.db.executor, settings: Record<string,string|undefined> = env, proof = f.owner) => businessSourceService(proof, ex, settings, signal(), value);
const draft = (input = fictionalBusinessInput()) => ({ op: 'stage_source_version', requestId: randomUUID(), format: 'JSON', input });
const query = () => ({ window: { ...businessJanuary }, selection: { kind: 'PRIMARY_PERIMETER' }, locationScope: { kind: 'ALL' }, temporalUse: 'HISTORICAL', scenario: null });
async function reviewed(input = fictionalBusinessInput()) {
  const command = draft(input), saved = await call(command), receipt = saved.receipt!;
  const full = await call({ op: 'read_source_version', requestId: randomUUID(), sourceId: receipt.sourceId, versionId: receipt.versionId });
  const publish = { op: 'publish_source_version', requestId: randomUUID(), sourceId: receipt.sourceId, versionId: receipt.versionId, expectedRevision: full.receipt!.revision, digest: full.version!.digest, readReceiptId: full.readReceiptId, acknowledged: true };
  return { command, saved, full, publish };
}
async function mapped(sourceId: string) {
  const catalog = (await call()).catalog!; const map = { expectedRevision: catalog.mapRevision, accounts: [{ accountRef: 'operating', ownership: { kind: 'COMPANY_SHARED' } }], cells: ['CASH','OBLIGATIONS','RECEIVABLES'].map(metric => ({ sourceId, domain: 'FINANCE', metric, currency: 'USD', window: { ...businessJanuary }, role: 'PRIMARY', accountRefs: ['operating'], locationIds: [] })) };
  const staged = await call({ op: 'stage_coverage_map', requestId: randomUUID(), map }); const id = staged.receipt!.mapVersionId;
  const full = await call({ op: 'read_coverage_map', requestId: randomUUID(), mapVersionId: id });
  await call({ op: 'publish_coverage_map', requestId: randomUUID(), mapVersionId: id, expectedRevision: full.receipt!.revision, digest: full.map!.digest, readReceiptId: full.readReceiptId, acknowledged: true });
}
it('requires the complete exact read and acknowledgement and then reads primary finance without a model key', async () => {
  const p = await reviewed(); expect(p.full.version?.input?.records).toHaveLength(9); expect(p.full.readReceiptId).toMatch(/^[a-f0-9-]{36}$/);
  await expect(call({ ...p.publish, requestId: randomUUID(), readReceiptId: randomUUID() })).rejects.toMatchObject({ code: 'conflict' });
  expect((await call(p.publish)).state).toBe('saved'); await mapped(p.publish.sourceId!);
  const result = await call({ op: 'query_finance', requestId: randomUUID(), query: query() });
  expect(result.result).toMatchObject({ state: 'ready', completeScope: true, finance: { currencies: [{ calculatedClosingMinor: '143500', reconciled: true, postedInflowMinor:'50000', postedOutflowMinor:'6500', postedInflowCount:1, postedOutflowCount:2 }] } });
  expect(result.result?.citations).toHaveLength(1); expect(JSON.stringify(result)).not.toMatch(/inspectionId|session_hash|context_digest/);
  const candidates = result.result!.finance!.scenarioInputs;
  const projected = await call({ op: 'query_finance', requestId: randomUUID(), query: { ...query(), scenario: { anchorRecordId: candidates.anchors[0].recordId, throughDate: '2026-02-10', obligationRecordIds: candidates.obligations.map(r => r.recordId), receivableRecordIds: candidates.receivables.map(r => r.recordId) } } });
  expect(projected.result?.finance?.currencies[0]).toMatchObject({ scenarioMinor: '133500', scenarioConditional: true, scenarioAccountRef: 'operating', scenarioAnchorAt: '2026-02-01T00:00:00.000Z' });
  expect(await f.q('SELECT (SELECT count(*) FROM shifts)::int shifts,(SELECT count(*) FROM schedule_publication_revisions)::int publications,(SELECT count(*) FROM notifications)::int notifications')).toEqual([{ shifts: 0, publications: 0, notifications: 0 }]);
});
it('marks the complete scenario candidate field unavailable when it exceeds the model projection, preserving exact admitted base totals', async () => {
  const input = fictionalBusinessInput(); const rent = input.records.find(r => r.kind === 'OBLIGATION')!; if (rent.kind !== 'OBLIGATION') throw Error('Fixture');
  input.records = input.records.filter(r => r.kind !== 'OBLIGATION' && r.kind !== 'RECEIVABLE');
  input.records.push(...Array.from({ length: 99 }, (_, i) => ({ ...rent, recordId: `long-${i}-`+'x'.repeat(100) })));
  const p = await reviewed(input); await call(p.publish);
  const adviser = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
  const result = await readBusinessEvidence(adviser, { ...query(), selection: { kind: 'SOURCE', sourceId: p.publish.sourceId! } } as Parameters<typeof readBusinessEvidence>[1], env, signal(), { origin: { requestId: randomUUID(), profileRevision: 0 }, sourceSlots: 8 });
  expect(result).toMatchObject({ state: 'ready', finance: { currencies: [{ obligationsMinor: '1980000', calculatedClosingMinor: '143500' }], scenarioInputs: { state: 'unavailable', reason: 'RESULT_LIMIT', anchors: [], obligations: [], receivables: [] } } });
  expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(12288);
});
it('rejects unknown fields, unmapped locations and future source observations before mutation', async () => {
  await expect(call({ ...draft(), workspaceId: 'forged' })).rejects.toMatchObject({ code: 'invalid' });
  const sales = fictionalBusinessInput('SALES'); await expect(call(draft(sales))).rejects.toMatchObject({ code: 'invalid' });
  const future = fictionalBusinessInput(); future.sourceAsOf = '2099-01-01T00:00:00.000Z'; await expect(call(draft(future))).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_sources')).toEqual([{ n: 0 }]);
});
it('returns a field-specific validation error for an undeclared coverage-map source', async () => {
  await expect(call({ op: 'stage_coverage_map', requestId: randomUUID(), map: { expectedRevision: 0, accounts: [], cells: [{ sourceId: randomUUID(), domain: 'SALES', metric: 'SALES', currency: 'USD', window: { ...businessJanuary }, role: 'PRIMARY', accountRefs: [], locationIds: ['loc-1'] }] } })).rejects.toMatchObject({ code: 'invalid', detail: { code: 'MISSING_SOURCE', field: 'map' } });
});
it('assigns immutable source timezone on the server and refuses to reinterpret published records after a workspace change', async () => {
  const p = await reviewed(); expect(p.full.version?.timeZone).toBe('America/Puerto_Rico'); await call(p.publish);
  await f.q("UPDATE workspaces SET time_zone='America/New_York',updated_at=clock_timestamp()");
  const result = await call({ op: 'query_finance', requestId: randomUUID(), query: { ...query(), selection: { kind: 'SOURCE', sourceId: p.publish.sourceId } } });
  expect(result.result).toMatchObject({ state: 'unavailable', reason: 'STALE', finance: null });
  expect((await readBusinessVersion(f.owner,f.db.executor,env,signal(),p.publish.sourceId!,p.publish.versionId!)).timeZone).toBe('America/Puerto_Rico');
});
it('requires restaging a draft captured in a different workspace timezone', async () => {
  const p = await reviewed(); await f.q("UPDATE workspaces SET time_zone='America/New_York',updated_at=clock_timestamp()");
  await expect(call(p.publish)).rejects.toMatchObject({ code: 'conflict' });
  const full = await call({ op: 'read_source_version', requestId: randomUUID(), sourceId: p.publish.sourceId, versionId: p.publish.versionId });
  expect(full.version?.publishEligible).toBe(false); expect(full.version?.validation?.qualifiers).toContain('SOURCE_TIMEZONE_CHANGED_RESTAGE_REQUIRED');
});
it('admits explicit CSV through the same canonical immutable store and never guesses columns', async () => {
  const input = fictionalBusinessInput('SALES'); input.records = [];
  const { records: _rows, ...metadata } = input;
  const command = { op: 'stage_source_version', requestId: randomUUID(), format: 'CSV', csv: 'id,amount\nsale,10.10', mapping: { amountUnit: 'DECIMAL_MAJOR', columns: { recordId: 'id', merchandiseMinor: 'amount', collectedMinor: 'amount' }, constants: { kind: 'SALE', revision: '1', orderRef: 'order', locationId: 'loc-1', at: businessJanuary.fromAt, discountMinor: '0', taxMinor: '0' } }, metadata };
  // A column maps once; explicit constants supply the independently reported collection.
  command.mapping.columns = { recordId: 'id', merchandiseMinor: 'amount' } as typeof command.mapping.columns;
  Object.assign(command.mapping.constants, { collectedMinor: '1010' });
  const saved = await call(command), full = await call({ op: 'read_source_version', requestId: randomUUID(), sourceId: saved.receipt!.sourceId, versionId: saved.receipt!.versionId });
  expect(full.version?.input?.records[0]).toMatchObject({ merchandiseMinor: '1010', collectedMinor: '1010', locationId: 'loc-1' });
  expect((await call(command)).receipt).toEqual(saved.receipt);
});
it('recovers a committed lost reply with the original operation without importing again, including flags off', async () => {
  const command = draft(); let dropped = false;
  const ex: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) { const result = await f.db.executor.transaction(statements, incoming);
    if (!dropped && statements.some(s => s.text.startsWith('SELECT owner_business_execute'))) { dropped = true; throw Error('Fictional committed reply lost'); } return result; } };
  await expect(call(command, ex)).rejects.toThrow(/reply lost/);
  const checked = await call({ op: 'check_source_operation', requestId: randomUUID(), operationId: command.requestId }, f.db.executor, { NEVORA_OWNER_ADVISOR_ENABLED: 'true' });
  expect(checked.state).toBe('saved'); expect(checked.receipt?.operationId).toBe(command.requestId); expect(checked.version).toBeNull(); expect(checked.catalog).toBeNull();
  expect((await call(command, f.db.executor, { NEVORA_OWNER_ADVISOR_ENABLED: 'true' })).receipt).toEqual(checked.receipt);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_versions')).toEqual([{ n: 1 }]);
  const changed = draft(); changed.requestId = command.requestId; changed.input.source.name = 'Changed'; await expect(call(changed)).rejects.toMatchObject({ code: 'conflict' });
});
it('keeps content-free original-operation recovery available when the new-write function is unavailable', async () => {
  const command = draft(), saved = await call(command); await f.q('DROP FUNCTION owner_business_execute(text,text,uuid,text,text,text,jsonb,text,text,jsonb,text,timestamptz)');
  const recovered = await call({ op: 'check_source_operation', requestId: randomUUID(), operationId: command.requestId }, f.db.executor, { NEVORA_OWNER_ADVISOR_ENABLED: 'true' });
  expect(recovered.receipt).toEqual(saved.receipt); expect(recovered.version).toBeNull(); expect(recovered.catalog).toBeNull();
  expect((await call(command, f.db.executor, { NEVORA_OWNER_ADVISOR_ENABLED: 'true' })).receipt).toEqual(saved.receipt);
});
it('shares full versions between Owners but does not let the second Owner adopt pending approval', async () => {
  const p = await reviewed(); await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'"); const proof = { ...f.manager, employee: { ...f.manager.employee, role: 'OWNER' as const } };
  const full = await call({ op: 'read_source_version', requestId: randomUUID(), sourceId: p.publish.sourceId, versionId: p.publish.versionId }, f.db.executor, env, proof);
  expect(full.version?.input?.records).toHaveLength(9); expect(full.version?.publishEligible).toBe(false);
  await expect(call({ ...p.publish, requestId: randomUUID(), readReceiptId: full.readReceiptId }, f.db.executor, env, proof)).rejects.toMatchObject({ code: 'conflict' });
  const discarded = await call({ op: 'discard_source_version', requestId: randomUUID(), sourceId: p.publish.sourceId, versionId: p.publish.versionId, expectedRevision: p.publish.expectedRevision, digest: p.publish.digest, acknowledged: true }, f.db.executor, env, proof);
  expect(discarded.state).toBe('saved');
});
it.each(['expired','profile','revision','location'])('invalidates the exact full-read receipt after %s changes', async change => {
  const p = await reviewed();
  if (change === 'expired') await f.q("UPDATE owner_advisor_business_read_receipts SET expires_at=clock_timestamp()-interval '1 second'");
  if (change === 'profile') await f.q("INSERT INTO owner_advisor_profiles(workspace_id,owner_id,priorities,revision) VALUES('workspace-fuel','owner','Changed',1)");
  if (change === 'revision') { const input = fictionalBusinessInput(); input.source = { ...input.source, sourceId: p.publish.sourceId!, expectedRevision: p.publish.expectedRevision }; await call(draft(input)); }
  if (change === 'location') await f.q("UPDATE locations SET active=false WHERE id='loc-2'");
  await expect(call(p.publish)).rejects.toMatchObject({ code: 'conflict' });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_windows')).toEqual([{ n: 0 }]);
});
it('retains PARTIAL inspection, publishes complete-zero periods and publishes valid reconciliation findings', async () => {
  const partial = fictionalBusinessInput(); partial.completeness = 'PARTIAL'; const p = await reviewed(partial);
  expect(p.full.version?.publishEligible).toBe(false); await expect(call(p.publish)).rejects.toMatchObject({ code: 'conflict' });
  const zero = fictionalBusinessInput(); zero.source.namespace = 'empty-bank'; zero.records = []; const empty = await reviewed(zero); expect((await call(empty.publish)).state).toBe('saved');
  const mismatch = fictionalBusinessInput(); mismatch.source.namespace = 'mismatch-bank'; const close = mismatch.records.find(r => r.recordId === 'closing')!; if (close.kind !== 'BALANCE') throw Error('Fixture'); close.amountMinor = '143000';
  const bad = await reviewed(mismatch); expect(bad.full.version?.validation?.finance?.findings).toContainEqual({ code: 'RECONCILIATION_DIFFERENCE', accountRef: 'operating', recordIds: ['closing'], differenceMinor: '-500' });
  expect((await call(bad.publish)).state).toBe('saved');
});
it('serializes simultaneous publishers and competing withdrawal/deletion without a partial active set', async () => {
  const p = await reviewed(); const results = await Promise.allSettled([call(p.publish), call({ ...p.publish, requestId: randomUUID() })]); expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const source = (await call()).catalog!.sources[0]; const shared = { sourceId: source.sourceId, expectedRevision: source.revision, digest: source.scopeDigest, acknowledged: true };
  const retired = await Promise.allSettled([call({ ...shared, op: 'withdraw_source', requestId: randomUUID() }), call({ ...shared, op: 'delete_source', requestId: randomUUID() })]); expect(retired.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_windows')).toEqual([{ n: 0 }]);
});
it('returns unavailable after withdrawing a mapped source and computes actual sales through the same reviewed map workflow', async () => {
  const p = await reviewed(); await call(p.publish); await mapped(p.publish.sourceId!);
  const source = (await call()).catalog!.sources[0]; await call({ op: 'withdraw_source', requestId: randomUUID(), sourceId: source.sourceId, expectedRevision: source.revision, digest: source.scopeDigest, acknowledged: true });
  expect((await call({ op: 'query_finance', requestId: randomUUID(), query: query() })).result).toMatchObject({ state: 'unavailable', reason: 'MISSING_SOURCE' });
  const input = fictionalBusinessInput('SALES'); for (const r of input.records) if ('locationId' in r) r.locationId = 'loc-1';
  const sales = await reviewed(input); await call(sales.publish);
  const staged = await call({ op: 'stage_coverage_map', requestId: randomUUID(), map: { expectedRevision: (await call()).catalog!.mapRevision, accounts: [], cells: [{ sourceId: sales.publish.sourceId, domain: 'SALES', metric: 'SALES', currency: 'USD', window: { ...businessJanuary }, role: 'PRIMARY', accountRefs: [], locationIds: ['loc-1','loc-2'] }] } });
  const full = await call({ op: 'read_coverage_map', requestId: randomUUID(), mapVersionId: staged.receipt!.mapVersionId }); await call({ op: 'publish_coverage_map', requestId: randomUUID(), mapVersionId: staged.receipt!.mapVersionId, expectedRevision: full.receipt!.revision, digest: full.map!.digest, readReceiptId: full.readReceiptId, acknowledged: true });
  const { scenario: _scenario, ...salesQuery } = query(); const result = await call({ op: 'query_sales', requestId: randomUUID(), query: salesQuery });
  expect(result.result).toMatchObject({ state: 'ready', completeScope: true, sales: { currencies: [{ collectionsMinor: '7920', netMerchandiseMinor: '7200', netReceiptsMinor: '7620' }] } });
});
it('rejects a source/location change between materialization and final query admission', async () => {
  const p = await reviewed(); await call(p.publish); await mapped(p.publish.sourceId!); let changed = false;
  const ex: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (!changed && statements.some(s => s.text === 'SELECT 1')) { changed = true; await f.q("UPDATE locations SET active=false WHERE id='loc-2'"); }
    return f.db.executor.transaction(statements, incoming);
  } };
  await expect(call({ op: 'query_finance', requestId: randomUUID(), query: query() }, ex)).rejects.toMatchObject({ code: 'conflict' });
});
it('denies retrieval-only navigation when withdrawal races the exact version read', async () => {
  const p = await reviewed(); await call(p.publish); let changed = false;
  const ex: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (!changed && statements.some(s => s.text.startsWith('WITH clock AS MATERIALIZED'))) { changed = true; const source = (await call()).catalog!.sources[0]; await call({ op: 'withdraw_source', requestId: randomUUID(), sourceId: source.sourceId, expectedRevision: source.revision, digest: source.scopeDigest, acknowledged: true }); }
    return f.db.executor.transaction(statements, incoming);
  } };
  await expect(readBusinessVersion(f.owner, ex, { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED: 'true' }, signal(), p.publish.sourceId!, p.publish.versionId!)).rejects.toMatchObject({ code: 'conflict' });
});
it('admits an explicit small location selection above the ALL perimeter limit and reports ALL unavailable', async () => {
  const input = fictionalBusinessInput('SALES'); for (const r of input.records) if ('locationId' in r) r.locationId = 'loc-1';
  const p = await reviewed(input); await call(p.publish);
  await f.q("INSERT INTO locations(id,name,short_name,workspace_id,clocker_key) SELECT 'extra-'||n,'Fictional '||n,'F '||n,'workspace-fuel','fake-'||n FROM generate_series(1,199) n");
  const { scenario: _scenario, ...base } = query();
  const all = await call({ op: 'query_sales', requestId: randomUUID(), query: { ...base, selection: { kind: 'SOURCE', sourceId: p.publish.sourceId } } });
  expect(all.result).toMatchObject({ state: 'unavailable', reason: 'INPUT_LIMIT' });
  const selected = await call({ op: 'query_sales', requestId: randomUUID(), query: { ...base, selection: { kind: 'SOURCE', sourceId: p.publish.sourceId }, locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } } });
  expect(selected.result).toMatchObject({ state: 'ready', sourceSubtotal: true, sales: { currencies: [{ collectionsMinor: '7920' }] } });
  await f.q("INSERT INTO locations(id,name,short_name,workspace_id,clocker_key) SELECT 'many-'||n,'Fictional large '||n,'L '||n,'workspace-fuel','large-'||n FROM generate_series(1,9799) n");
  const selectedCommand = { op: 'query_sales', requestId: randomUUID(), query: { ...base, selection: { kind: 'SOURCE', sourceId: p.publish.sourceId }, locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } } };
  expect((await call(selectedCommand)).result?.state).toBe('ready');
  await f.q("INSERT INTO locations(id,name,short_name,workspace_id,clocker_key) VALUES('over-metadata','Fictional overflow','Overflow','workspace-fuel','metadata-overflow')");
  expect((await call(selectedCommand)).result).toMatchObject({ state: 'unavailable', reason: 'INPUT_LIMIT' });
  expect((await readBusinessVersion(f.owner, f.db.executor, env, signal(), p.publish.sourceId!, p.publish.versionId!)).versionId).toBe(p.publish.versionId);
});
it('rejects complete materialization above two MiB before fetching a single selected record payload', async () => {
  let sourceId: string | null = null, revision = 0;
  for (let month = 1; month <= 10; month++) {
    const input = fictionalBusinessInput('SALES'); input.source.sourceId = sourceId; input.source.expectedRevision = revision; input.source.namespace = 'large-fictional-pos';
    input.window = { fromAt: `2026-${String(month).padStart(2,'0')}-01T00:00:00.000Z`, toAt: `2026-${String(month+1).padStart(2,'0')}-01T00:00:00.000Z` }; input.sourceAsOf = input.window.toAt;
    const sale = input.records[0]; if (sale.kind !== 'SALE') throw Error('Fixture');
    input.records = Array.from({ length: 1000 }, (_, i) => ({ ...sale, recordId: `m${month}-r${i}`, orderRef: `fictional-order-${month}-${i}`, locationId: 'loc-1', at: input.window.fromAt }));
    const p = await reviewed(input), saved = await call(p.publish); sourceId = saved.receipt!.sourceId; revision = saved.receipt!.revision;
  }
  let fetched = false; const ex: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) { if (statements.some(s => s.text.startsWith('SELECT version_id,payload'))) fetched = true; return f.db.executor.transaction(statements, incoming); } };
  const { scenario: _scenario, ...base } = query(); const result = await call({ op: 'query_sales', requestId: randomUUID(), query: { ...base, window: { fromAt: businessJanuary.fromAt, toAt: '2026-11-01T00:00:00.000Z' }, selection: { kind: 'SOURCE', sourceId }, locationScope: { kind: 'SELECTED', locationIds: ['loc-1'] } } }, ex);
  expect(result.result).toMatchObject({ state: 'unavailable', reason: 'INPUT_LIMIT', sales: null, citations: [] }); expect(fetched).toBe(false);
});
it('erases source and structured private caches, retaining content-free operation and unrelated history custody', async () => {
  const p = await reviewed(); await call(p.publish); await mapped(p.publish.sourceId!);
  const advisor = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor), store = new BusinessStore(advisor, env), inspectionId = randomUUID();
  await store.reserveInspection(inspectionId, 'a'.repeat(64), {}, signal()); await store.completeInspection(inspectionId, { privateAmount: '143500' }, { privateAccount: 'operating' }, signal());
  await f.q("INSERT INTO owner_advisor_profiles(workspace_id,owner_id,priorities,history) VALUES('workspace-fuel','owner','', '[{\"role\":\"user\",\"content\":\"Unrelated conversation\"}]'::jsonb)");
  const source = (await call()).catalog!.sources[0]; await call({ op: 'delete_source', requestId: randomUUID(), sourceId: source.sourceId, expectedRevision: source.revision, digest: source.scopeDigest, acknowledged: true });
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_versions WHERE payload IS NOT NULL')).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_inspections WHERE result IS NOT NULL OR fence IS NOT NULL OR context IS NOT NULL')).toEqual([{ n: 0 }]);
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_maps WHERE payload IS NOT NULL')).toEqual([{ n: 0 }]);
  expect((await call({ op: 'check_source_operation', requestId: randomUUID(), operationId: p.command.requestId })).receipt?.versionId).toBe(p.publish.versionId);
  expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([{ history: [{ role: 'user', content: 'Unrelated conversation' }] }]);
  await expect(readBusinessVersion(f.owner, f.db.executor, env, signal(), source.sourceId, p.publish.versionId!)).rejects.toMatchObject({ code: 'forbidden' });
});
it('applies all feature combinations and current role/session admission without requiring a provider', async () => {
  const p = await reviewed(); await call(p.publish); const primary = { op: 'query_finance', requestId: randomUUID(), query: { ...query(), selection: { kind: 'SOURCE', sourceId: p.publish.sourceId } } };
  const retrieval = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED: 'true' };
  expect((await call(primary, f.db.executor, retrieval)).result?.state).toBe('ready'); expect((await call(primary, f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED: 'false' })).result?.state).toBe('ready');
  await expect(call(draft(), f.db.executor, retrieval)).rejects.toMatchObject({ code: 'disabled' });
  await expect(call(primary, f.db.executor, { NEVORA_OWNER_ADVISOR_ENABLED: 'true' })).rejects.toMatchObject({ code: 'disabled' });
  expect((await readBusinessVersion(f.owner, f.db.executor, retrieval, signal(), p.publish.sourceId!, p.publish.versionId!)).status).toBe('PUBLISHED');
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'"); await expect(call({ op: 'check_source_operation', requestId: randomUUID(), operationId: p.command.requestId })).rejects.toThrow();
  await expect(call(undefined, f.db.executor, env, f.manager)).rejects.toThrow();
});
it('bounds the lock wait during initial Owner admission, before any business mutation is possible', async () => {
  const holder = new Client({ connectionString: f.db.connectionString }); await holder.connect();
  try { await holder.query('BEGIN'); await holder.query("SELECT id FROM workspaces WHERE id='workspace-fuel' FOR NO KEY UPDATE");
    const at = Date.now(); await expect(call(draft())).rejects.toThrow(); expect(Date.now()-at).toBeLessThan(3000);
  } finally { await holder.query('ROLLBACK'); await holder.end(); }
  expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_sources')).toEqual([{ n: 0 }]);
});
it('preserves sale and refund breakdowns on the Owner reader instead of exposing only net receipts',async()=>{
 const input=fictionalBusinessInput('SALES');for(const r of input.records)if('locationId'in r)r.locationId='loc-1';const p=await reviewed(input);await call(p.publish);
 const result=await call({op:'query_sales',requestId:randomUUID(),query:{window:{...businessJanuary},selection:{kind:'SOURCE',sourceId:p.publish.sourceId},locationScope:{kind:'ALL'},temporalUse:'HISTORICAL'}});
 expect(result.result?.sales?.currencies[0]).toMatchObject({sales:{count:1,collectionsMinor:'9900'},refunds:{count:1,collectionsMinor:'1980'},collectionsMinor:'7920'});
});
