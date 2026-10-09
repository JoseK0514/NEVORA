import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describeBackfillJournal, assessBackfillJournal } from './journal-contract';
import type { BackfillCapture, BackfillPlan, OwnershipRecord } from './backfill';
import { preflightTenantBackfill } from './backfill';
import { getOwnershipRegistry, OWNERSHIP_SOURCE, type JsonValue } from './ownership';

// Fictional observations only. No database, persisted journal, committed
// transaction or actual source/ownership reconciliation is produced by this test.
const canonical = (v: unknown): string => v !== null && typeof v === 'object' ? Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical((v as Record<string, unknown>)[k])).join(',') + '}' : JSON.stringify(v);
const digest = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const sha = 'a'.repeat(64);
const registry = getOwnershipRegistry();
const rule = (table: string) => registry.tables.find(t => t.table === table)!;
const keys = (table: string, value: Record<string, JsonValue>) => rule(table).primaryKey.map(k => value[k]);

function originalPlan(): BackfillPlan {
  const c: BackfillCapture = { migrations: OWNERSHIP_SOURCE.map(m => ({ path: m.path, text: readFileSync(m.path, 'utf8') })), registryDigest: registry.digest,
    sourceDigest: sha, currentSchemaDigest: registry.schemaDigest, snapshot: { id: ' fictional original snapshot ', isolation: 'SERIALIZABLE', includesInactive: true, includesHistory: true },
    tables: registry.tables.map(t => ({ table: t.table, rows: [], expectedCount: 0, expectedChecksum: '' })), mappings: [], historicalReferences: [], payloadCaptures: [],
    namespaceComparators: { binding: { registryDigest: '', sourceDigest: '', schemaDigest: '', snapshotId: '', rowSetChecksum: '' }, catalogs: [], rows: [], captureChecksum: '' },
    writeFence: { mode: 'EXCLUSIVE_FENCED', sourceDigest: sha, schemaDigest: registry.schemaDigest, databaseFenceToken: 'fictional explicit fence', allWritersCovered: true,
      immutableOwnershipEnabled: true, registeredWriterDigest: sha, newWriteJournalDigest: sha, newWritesReconciled: true }, chunkSize: 2 };
  function add(table: string, supplied: Record<string, JsonValue>) {
    const values = Object.fromEntries(rule(table).columns.map(col => [col.name, col.nullable ? null : col.type === 'boolean' ? false : /^(integer|smallint)/.test(col.type) ? 1 : col.type === 'bigint' ? '1' : col.type === 'numeric(5,2)' ? '1.00' : col.type === 'jsonb' ? {} : col.type.endsWith('[]') ? [] : 'fictional'])) as Record<string, JsonValue>;
    Object.assign(values, supplied); c.tables.find(t => t.table === table)!.rows.push({ values, originalChecksum: digest(values) });
  }
  add('workspaces', { id: 'A', active: false }); add('locations', { id: 'LA', workspace_id: 'A', clocker_key: '2', active: false });
  for (const id of ['007', ' padded employee ', 'x'.repeat(240)]) add('employees', { id, primary_location_id: 'LA', active: false, email: null });
  add('clocker_pin_events', { id: 'historic-pin', employee_id: '007', actor_employee_id: '007', pin_version: 1 });
  add('password_recovery_limits', { scope: 'f'.repeat(64), bucket: '9007199254740993', attempts: 1 });
  for (const t of c.tables) {
    t.expectedCount = t.rows.length; t.expectedChecksum = digest(t.rows.map(r => ({ key: keys(t.table, r.values), checksum: r.originalChecksum })).sort((a, b) => canonical(a.key) < canonical(b.key) ? -1 : 1));
    for (const r of t.rows) {
      if (t.table === 'employees') c.mappings.push({ table: t.table, key: keys(t.table, r.values), workspaceId: 'A', rowChecksum: r.originalChecksum, evidenceDigest: sha });
      for (const p of rule(t.table).payloads) if (r.values[p.column] !== null) c.payloadCaptures.push({ table: t.table, key: keys(t.table, r.values), column: p.column, contractId: p.contractId,
        valueDigest: digest(r.values[p.column]), bindings: [{ path: [], kind: 'DATA' }], unresolvedPaths: [], reviewEvidenceDigest: sha });
    }
  }
  const specifications = [
    { contractId: 'employees.email_ci', table: 'employees', path: 'db/migrations/0001_initial.sql', line: 31, expression: 'lower(email)', predicate: '(email IS NOT NULL)', indexDefinition: 'CREATE UNIQUE INDEX employees_email_unique ON public.employees USING btree (lower(email)) WHERE (email IS NOT NULL)' },
    { contractId: 'positions.name_ci', table: 'positions', path: 'db/migrations/0008_workspace_positions.sql', line: 42, expression: 'lower(name)', predicate: null, indexDefinition: 'CREATE UNIQUE INDEX positions_workspace_name_unique ON public.positions USING btree (workspace_id, lower(name))' },
    { contractId: 'clocker_break_types.name_ci', table: 'clocker_break_types', path: 'db/migrations/0014_clocker_breaks.sql', line: 16, expression: 'lower(name)', predicate: null, indexDefinition: 'CREATE UNIQUE INDEX clocker_break_type_name ON public.clocker_break_types USING btree (workspace_id, lower(name))' },
    { contractId: 'schedule_templates.active_name_ci', table: 'schedule_templates', path: 'db/migrations/0003_schedule_assistance.sql', line: 91, expression: 'lower(name)', predicate: '(active = true)', indexDefinition: 'CREATE UNIQUE INDEX schedule_templates_name_unique ON public.schedule_templates USING btree (lower(name)) WHERE (active = true)' },
  ];
  const collation = { oid: '100', schema: 'pg_catalog', name: 'default', provider: 'd', deterministic: true, encoding: -1, lcCollate: 'C', lcCtype: 'C', locale: null, version: null, actualVersion: null };
  c.namespaceComparators.binding = { registryDigest: c.registryDigest, sourceDigest: c.sourceDigest, schemaDigest: c.currentSchemaDigest, snapshotId: c.snapshot.id,
    rowSetChecksum: digest(c.tables.map(t => ({ table: t.table, count: t.expectedCount, checksum: t.expectedChecksum })).sort((a, b) => a.table < b.table ? -1 : 1)) };
  c.namespaceComparators.catalogs = specifications.map(s => {
    const statement = c.migrations.find(m => m.path === s.path)!.text.split('\n').slice(s.line - 1).join('\n').split(';')[0] + ';';
    const value = { contractId: s.contractId, source: { path: s.path, line: s.line }, sourceStatementChecksum: digest(statement), definition: { indexDefinition: s.indexDefinition, expression: s.expression,
      predicate: s.predicate, expressionCollation: collation, indexCollation: collation, serverVersion: '18.4 fictional', serverEncoding: 'UTF8' } };
    return { ...value, checksum: digest(value) };
  }).sort((a, b) => a.contractId < b.contractId ? -1 : 1);
  c.namespaceComparators.rows = c.tables.find(t => t.table === 'employees')!.rows.map(r => ({ contractId: 'employees.email_ci', key: keys('employees', r.values), rowChecksum: r.originalChecksum,
    included: false, expressionValue: null, comparisonClass: null })).sort((a, b) => canonical([a.contractId, a.key]) < canonical([b.contractId, b.key]) ? -1 : 1);
  c.namespaceComparators.captureChecksum = digest({ binding: c.namespaceComparators.binding, catalogs: c.namespaceComparators.catalogs, rows: c.namespaceComparators.rows });
  const p = preflightTenantBackfill(c); expect(p.status, JSON.stringify(p.diagnostics)).toBe('READY_FOR_GUARDED_EXECUTION'); return p;
}

function expected(p: BackfillPlan) {
  const m = p.manifest as Record<string, JsonValue>;
  const boundary = { kind: 'BACKFILL_CHUNK_JOURNAL_V1' as const, sourceDigest: p.sourceDigest, schemaDigest: p.schemaDigest, registryDigest: p.registryDigest,
    snapshotId: p.snapshotId, planDigest: p.digest, mappingDigest: digest({ mappings: m.mappings, historicalReferences: m.historicalReferences, payloadCaptures: m.payloadCaptures,
      installation: m.installation, resolvedEntries: p.entries }), writeFenceDigest: digest(m.writeFence) };
  const chunks = p.chunks.map((c, ordinal) => ({ id: c.id, table: c.table, ordinal, count: c.count, firstKey: c.entries[0].key, lastKey: c.entries[c.entries.length - 1].key,
    keysDigest: digest(c.entries.map(e => e.key)), sourceChecksum: c.sourceChecksum, targetChecksum: c.targetChecksum,
    ownershipChecksum: digest(c.entries.map(e => ({ table: e.table, key: e.key, workspaceId: e.workspaceId, sourceChecksum: e.sourceChecksum, mirroredIdentityChecksum: e.mirroredIdentityChecksum }))) }));
  return { boundary, chunks };
}
function observation(p: BackfillPlan, state: 'NOT_STARTED' | 'STARTED' | 'COMPLETE' | 'UNKNOWN' = 'NOT_STARTED') {
  const d = expected(p);
  return { boundary: d.boundary, rows: d.chunks.map(chunk => ({ chunk, state, retryKey: digest(['BACKFILL_ORIGINAL_PLAN_RETRY', p.digest, chunk.id]) })), reconciliation: null as null | {
    boundary: typeof d.boundary; readMode: 'FRESH_OWNED_ORIGINAL_PLAN_RECHECK'; observationId: string; transaction: 'COMMITTED'; sourceRows: { table: string; key: JsonValue[]; sourceChecksum: string }[]; ownership: OwnershipRecord[];
  } };
}
function reconciled(p: BackfillPlan, state: 'NOT_STARTED' | 'STARTED' | 'COMPLETE' | 'UNKNOWN' = 'COMPLETE') {
  const o = observation(p, state); o.reconciliation = { boundary: o.boundary, readMode: 'FRESH_OWNED_ORIGINAL_PLAN_RECHECK', observationId: ' fictional fresh observation ', transaction: 'COMMITTED',
    sourceRows: p.entries.map(e => ({ table: e.table, key: e.key, sourceChecksum: e.sourceChecksum })),
    ownership: p.entries.map(e => ({ table: e.table, key: e.key, workspaceId: e.workspaceId, sourceChecksum: e.sourceChecksum, mirroredIdentityChecksum: e.mirroredIdentityChecksum })) };
  return o;
}

describe('original-plan durable journal preparation', () => {
  it('binds exact source/schema/lineage/plan and ordered chunk boundaries with no persistence or effect claim', () => {
    const p = originalPlan(), before = clone(p), d = describeBackfillJournal(p);
    expect(d).toEqual({ status: 'DESCRIBED', ...expected(p), verification: 'PURE_JOURNAL_CONTRACT_NOT_DATABASE_VERIFICATION' });
    expect(p).toEqual(before);
  });
  it('retains exact padded and long existing identifiers and NULL global ownership', () => {
    const p = originalPlan(), d = describeBackfillJournal(p); expect(d.status).toBe('DESCRIBED');
    if (d.status !== 'DESCRIBED') return;
    expect(d.boundary.snapshotId).toBe(' fictional original snapshot '); expect(d.chunks.filter(c => c.table === 'employees').flatMap(c => [c.firstKey, c.lastKey])).toContainEqual([' padded employee ']);
    const o = reconciled(p); expect(assessBackfillJournal(p, o).status).toBe('READY_FOR_DATABASE_RECHECK');
    expect(o.reconciliation!.ownership.find(r => r.table === 'password_recovery_limits')!.workspaceId).toBeNull();
  });
  it('requires a fresh owned original-plan database gate even for a perfectly matching COMPLETE assertion', () => {
    const p = originalPlan(), result = assessBackfillJournal(p, observation(p, 'COMPLETE'));
    expect(result).toMatchObject({ status: 'READY_FOR_DATABASE_RECHECK', effectsVerified: false, requirement: 'FRESH_OWNED_ORIGINAL_PLAN_DB_RECHECK_AND_OPERATOR_AUTHORITY' });
    if (result.status !== 'READY_FOR_DATABASE_RECHECK') return;
    expect(result.chunks.every(c => c.observedState === 'COMPLETE' && c.targetObservation === 'UNOBSERVED')).toBe(true);
  });
  it.each(['STARTED', 'UNKNOWN'] as const)('never promotes %s to COMPLETE from matching alleged committed ownership', state => {
    const p = originalPlan(), result = assessBackfillJournal(p, reconciled(p, state));
    expect(result).toMatchObject({ status: 'READY_FOR_DATABASE_RECHECK', effectsVerified: false });
    if (result.status !== 'READY_FOR_DATABASE_RECHECK') return;
    expect(result.chunks.every(c => c.observedState === state && c.targetObservation === 'MATCHES_TARGET')).toBe(true);
  });
  it('returns one deterministic original retry identity per chunk despite observation order', () => {
    const p = originalPlan(), o = observation(p, 'UNKNOWN'), first = assessBackfillJournal(p, o); o.rows.reverse(); const second = assessBackfillJournal(p, o);
    expect(first.status).toBe('READY_FOR_DATABASE_RECHECK'); expect(second).toEqual(first);
    if (first.status !== 'READY_FOR_DATABASE_RECHECK') return;
    expect(new Set(first.chunks.map(c => c.retryKey)).size).toBe(p.chunks.length); expect(first.chunks.map(c => c.chunk.id)).toEqual(p.chunks.map(c => c.id));
  });
  it.each(['sourceDigest', 'schemaDigest', 'registryDigest', 'snapshotId', 'planDigest', 'mappingDigest', 'writeFenceDigest'] as const)('rejects changed %s at the persisted boundary', field => {
    const p = originalPlan(), o = observation(p); o.boundary[field] = 'changed'; expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'JOURNAL_BOUNDARY_DRIFT' });
  });
  it.each(['id', 'table', 'ordinal', 'count', 'firstKey', 'lastKey', 'keysDigest', 'sourceChecksum', 'targetChecksum', 'ownershipChecksum'] as const)('rejects changed chunk %s', field => {
    const p = originalPlan(), o = observation(p), c = o.rows[0].chunk;
    if (field === 'firstKey' || field === 'lastKey') c[field] = ['foreign']; else if (field === 'ordinal' || field === 'count') c[field]++; else c[field] = 'changed';
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'JOURNAL_CHUNK_DRIFT' });
  });
  it.each(['omitted', 'extra', 'duplicate'] as const)('rejects %s journal rows instead of hiding unobserved operations', variant => {
    const p = originalPlan(), o = observation(p); if (variant === 'omitted') o.rows.pop(); else o.rows.push(clone(o.rows[0]));
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'JOURNAL_COVERAGE_DRIFT' });
  });
  it('rejects replacement retry identity for an unknown original operation', () => {
    const p = originalPlan(), o = observation(p, 'UNKNOWN'); o.rows[0].retryKey = 'b'.repeat(64);
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'JOURNAL_RETRY_DRIFT' });
  });
  it('rejects undeclared state and extra asserted authority/completion fields', () => {
    const p = originalPlan(), o = observation(p); (o.rows[0] as unknown as { state: string }).state = 'TRUST_ME_COMPLETE';
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_JOURNAL_STRUCTURE' });
    const extra = observation(p); Object.assign(extra, { effectsVerified: true });
    expect(assessBackfillJournal(p, extra)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_JOURNAL_STRUCTURE' });
  });
  it('accepts only coherent alleged committed reconciliation while retaining the actual database gate', () => {
    const p = originalPlan(), o = reconciled(p), before = clone(o), result = assessBackfillJournal(p, o);
    expect(result).toMatchObject({ status: 'READY_FOR_DATABASE_RECHECK', effectsVerified: false, reconciliationObservation: 'COHERENT_UNVERIFIED' }); expect(o).toEqual(before);
  });
  it.each(['source omitted', 'source extra', 'source duplicate', 'source checksum', 'source key'] as const)('rejects %s in whole original-source reconciliation', variant => {
    const p = originalPlan(), o = reconciled(p), rows = o.reconciliation!.sourceRows;
    if (variant === 'source omitted') rows.pop(); else if (variant === 'source extra' || variant === 'source duplicate') rows.push(clone(rows[0])); else if (variant === 'source checksum') rows[0].sourceChecksum = 'b'.repeat(64); else rows[0].key = ['foreign'];
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'SOURCE_RECONCILIATION_DRIFT' });
  });
  it.each(['workspaceId', 'sourceChecksum', 'mirroredIdentityChecksum'] as const)('rejects changed current ownership %s', field => {
    const p = originalPlan(), o = reconciled(p); o.reconciliation!.ownership[0][field] = 'foreign';
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'OWNERSHIP_RECONCILIATION_DRIFT' });
  });
  it('rejects extra or duplicate current ownership rows', () => {
    const p = originalPlan(), o = reconciled(p); o.reconciliation!.ownership.push(clone(o.reconciliation!.ownership[0]));
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'OWNERSHIP_RECONCILIATION_DRIFT' });
  });
  it('refuses COMPLETE with missing target rows but retains partial STARTED observations without fabricating completion', () => {
    const p = originalPlan(), o = reconciled(p); o.reconciliation!.ownership.pop();
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'INCOMPLETE_CHUNK_METADATA' });
    for (const row of o.rows) row.state = 'STARTED';
    const result = assessBackfillJournal(p, o); expect(result.status).toBe('READY_FOR_DATABASE_RECHECK');
    if (result.status !== 'READY_FOR_DATABASE_RECHECK') return;
    expect(result.chunks.some(c => c.missingKeys.length > 0)).toBe(true); expect(result.effectsVerified).toBe(false);
  });
  it('rejects alleged uncommitted or nonfresh reconciliation and a changed reconciliation boundary', () => {
    const p = originalPlan(), o = reconciled(p); (o.reconciliation! as unknown as { transaction: string }).transaction = 'OPEN';
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_RECONCILIATION_STRUCTURE' });
    const wrong = reconciled(p); wrong.reconciliation!.boundary = clone(wrong.boundary); wrong.reconciliation!.boundary.planDigest = 'b'.repeat(64);
    expect(assessBackfillJournal(p, wrong)).toEqual({ status: 'BLOCKED', code: 'RECONCILIATION_BOUNDARY_DRIFT' });
  });
  it('rejects changed saved ownership or chunk in the original plan', () => {
    const p = originalPlan(), o = observation(p); p.entries[0].workspaceId = 'foreign';
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'ORIGINAL_PLAN_DRIFT' });
    const q = originalPlan(); q.chunks[0].count++; expect(describeBackfillJournal(q)).toEqual({ status: 'BLOCKED', code: 'ORIGINAL_PLAN_DRIFT' });
  });
  it('returns detached deeply frozen descriptors and assessments', () => {
    const p = originalPlan(), o = observation(p), d = describeBackfillJournal(p), a = assessBackfillJournal(p, o);
    expect(d.status).toBe('DESCRIBED'); expect(a.status).toBe('READY_FOR_DATABASE_RECHECK');
    if (d.status !== 'DESCRIBED' || a.status !== 'READY_FOR_DATABASE_RECHECK') return;
    expect(Object.isFrozen(d.chunks[0].firstKey)).toBe(true); expect(Object.isFrozen(a.chunks[0].missingKeys)).toBe(true);
    o.rows[0].chunk.firstKey[0] = 'rewritten'; expect(a.chunks[0].chunk.firstKey).not.toEqual(['rewritten']);
  });
});

describe('untrusted journal data boundary before reflection or coercion', () => {
  it.each(['root', 'nested', 'revoked'] as const)('rejects a %s proxy without invoking any trap', variant => {
    const p = originalPlan(), o = observation(p); let traps = 0;
    const handler = { get() { traps++; throw Error('PRIVATE'); }, ownKeys() { traps++; throw Error('PRIVATE'); }, getOwnPropertyDescriptor() { traps++; throw Error('PRIVATE'); }, getPrototypeOf() { traps++; throw Error('PRIVATE'); } };
    let input: unknown;
    if (variant === 'root') input = new Proxy(o, handler); else if (variant === 'nested') { o.rows[0].chunk.firstKey = new Proxy(o.rows[0].chunk.firstKey, handler); input = o; }
    else { const r = Proxy.revocable(o, handler); r.revoke(); input = r.proxy; }
    expect(assessBackfillJournal(p, input)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_JOURNAL_VALUE' }); expect(traps).toBe(0);
  });
  it('rejects an original-plan proxy before accessing it', () => {
    const p = originalPlan(); let traps = 0; const proxy = new Proxy(p, { get() { traps++; throw Error('PRIVATE'); }, ownKeys() { traps++; throw Error('PRIVATE'); } });
    expect(describeBackfillJournal(proxy)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_PLAN_VALUE' }); expect(traps).toBe(0);
  });
  it.each(['root', 'nested'] as const)('rejects a %s accessor without executing it', variant => {
    const p = originalPlan(), o = observation(p); let reads = 0;
    Object.defineProperty(variant === 'root' ? o : o.rows[0].chunk, variant === 'root' ? 'boundary' : 'count', { enumerable: true, get() { reads++; throw Error('PRIVATE'); } });
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_JOURNAL_VALUE' }); expect(reads).toBe(0);
  });
  it.each(['hole', 'array extra', 'symbol', 'hidden', 'prototype', 'cycle', 'bigint', 'undefined', 'NaN', 'infinity', 'unsafe integer', 'negative zero'] as const)('rejects %s without invoking conversion hooks', variant => {
    const p = originalPlan(), o = observation(p); let coercions = 0;
    if (variant === 'hole') delete (o.rows as unknown[])[0]; else if (variant === 'array extra') Object.assign(o.rows, { unexpected: 1 });
    else if (variant === 'symbol') Object.assign(o, { [Symbol('private')]: 1 }); else if (variant === 'hidden') Object.defineProperty(o, 'hidden', { value: 1 });
    else if (variant === 'prototype') Object.setPrototypeOf(o, { [Symbol.toPrimitive]() { coercions++; return 'private'; } });
    else if (variant === 'cycle') Object.assign(o, { cycle: o });
    else Object.assign(o.rows[0].chunk, { count: variant === 'bigint' ? BigInt('1') : variant === 'undefined' ? undefined : variant === 'NaN' ? NaN : variant === 'infinity' ? Infinity : variant === 'unsafe integer' ? 9007199254740992 : -0 });
    expect(assessBackfillJournal(p, o)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_JOURNAL_VALUE' }); expect(coercions).toBe(0);
  });
});
