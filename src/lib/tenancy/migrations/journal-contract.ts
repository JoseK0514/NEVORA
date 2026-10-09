import { types as nodeTypes } from 'node:util';
import { canonicalOwnershipJson, getOwnershipRegistry, ownershipDigest, type JsonValue } from './ownership';
import { resumeTenantBackfill, type BackfillEntry, type BackfillPlan, type OwnershipRecord } from './backfill';

/** Pure evidence contract. No value in this module grants database authority,
 * creates a persisted journal, executes/resumes a chunk or verifies an effect. */
export type BackfillJournalBoundary = { kind: 'BACKFILL_CHUNK_JOURNAL_V1'; sourceDigest: string; schemaDigest: string; registryDigest: string;
  snapshotId: string; planDigest: string; mappingDigest: string; writeFenceDigest: string };
export type BackfillJournalChunk = { id: string; table: string; ordinal: number; count: number; firstKey: JsonValue[]; lastKey: JsonValue[];
  keysDigest: string; sourceChecksum: string; targetChecksum: string; ownershipChecksum: string };
export type BackfillJournalState = 'NOT_STARTED' | 'STARTED' | 'COMPLETE' | 'UNKNOWN';
export type PersistedBackfillJournalObservation = { boundary: BackfillJournalBoundary; rows: { chunk: BackfillJournalChunk; state: BackfillJournalState; retryKey: string }[];
  reconciliation: null | { boundary: BackfillJournalBoundary; readMode: 'FRESH_OWNED_ORIGINAL_PLAN_RECHECK'; observationId: string; transaction: 'COMMITTED';
    sourceRows: { table: string; key: JsonValue[]; sourceChecksum: string }[]; ownership: OwnershipRecord[] } };
export type BackfillJournalDescription = { status: 'DESCRIBED'; boundary: BackfillJournalBoundary; chunks: BackfillJournalChunk[];
  verification: 'PURE_JOURNAL_CONTRACT_NOT_DATABASE_VERIFICATION' } | { status: 'BLOCKED'; code: string };
export type BackfillJournalAssessment = { status: 'READY_FOR_DATABASE_RECHECK'; boundary: BackfillJournalBoundary;
  chunks: { chunk: BackfillJournalChunk; observedState: BackfillJournalState; retryKey: string; targetObservation: 'UNOBSERVED' | 'ABSENT' | 'PARTIAL' | 'MATCHES_TARGET'; missingKeys: JsonValue[][] }[];
  reconciliationObservation: 'ABSENT' | 'COHERENT_UNVERIFIED'; effectsVerified: false;
  requirement: 'FRESH_OWNED_ORIGINAL_PLAN_DB_RECHECK_AND_OPERATOR_AUTHORITY'; verification: 'PURE_JOURNAL_CONTRACT_NOT_DATABASE_VERIFICATION' } | { status: 'BLOCKED'; code: string };

const VERIFICATION = 'PURE_JOURNAL_CONTRACT_NOT_DATABASE_VERIFICATION' as const;
const SHA = /^[a-f0-9]{64}$/;
const BOUNDARY_FIELDS = ['kind', 'sourceDigest', 'schemaDigest', 'registryDigest', 'snapshotId', 'planDigest', 'mappingDigest', 'writeFenceDigest'];
const CHUNK_FIELDS = ['id', 'table', 'ordinal', 'count', 'firstKey', 'lastKey', 'keysDigest', 'sourceChecksum', 'targetChecksum', 'ownershipChecksum'];
const ENTRY_FIELDS = ['table', 'key', 'workspaceId', 'storage', 'sidecar', 'sourceChecksum', 'mirroredIdentity', 'mirroredIdentityChecksum', 'evidenceDigests'];
const RECORD_FIELDS = ['table', 'key', 'workspaceId', 'sourceChecksum', 'mirroredIdentityChecksum'];
const STATES: readonly string[] = ['NOT_STARTED', 'STARTED', 'COMPLETE', 'UNKNOWN'];
type DataObject = { [key: string]: JsonValue };
type Description = Extract<BackfillJournalDescription, { status: 'DESCRIBED' }>;
type Prepared = { plan: BackfillPlan; description: Description } | { code: string };

/** Reject proxies before any reflection, including revoked proxies. Copy only
 * own data descriptors; never invoke input getters, iterators or conversions.
 * Unsafe numeric integers must arrive as exact strings from a typed adapter. */
function copyData(value: unknown): JsonValue {
  const ancestors = new Set<object>();
  const unsupported = (): never => { throw new Error('Unsupported journal data'); };
  function copy(current: unknown): JsonValue {
    if (current === null || typeof current === 'string' || typeof current === 'boolean') return current;
    if (typeof current === 'number') {
      if (!Number.isFinite(current) || Object.is(current, -0) || (Number.isInteger(current) && !Number.isSafeInteger(current))) return unsupported();
      return current;
    }
    if (typeof current !== 'object' || !current || nodeTypes.isProxy(current) || ancestors.has(current)) return unsupported();
    const array = Array.isArray(current);
    if (Object.getPrototypeOf(current) !== (array ? Array.prototype : Object.prototype)) return unsupported();
    const ownKeys = Reflect.ownKeys(current), descriptors = Object.getOwnPropertyDescriptors(current);
    if (ownKeys.some(k => typeof k !== 'string')) return unsupported();
    ancestors.add(current);
    try {
      if (array) {
        const length = descriptors.length;
        if (!length || !('value' in length) || !Number.isSafeInteger(length.value) || length.value < 0 || ownKeys.length !== length.value + 1) return unsupported();
        const result: JsonValue[] = [];
        for (let i = 0; i < length.value; i++) {
          const descriptor = descriptors[String(i)];
          if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return unsupported();
          result.push(copy(descriptor.value));
        }
        return result;
      }
      const result: DataObject = {};
      for (const key of ownKeys as string[]) {
        const descriptor = descriptors[key];
        if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) return unsupported();
        Object.defineProperty(result, key, { value: copy(descriptor.value), writable: true, enumerable: true, configurable: true });
      }
      return result;
    } finally { ancestors.delete(current); }
  }
  return copy(value);
}
function object(value: JsonValue): value is DataObject { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function fields(value: JsonValue, names: readonly string[]): value is DataObject {
  return object(value) && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
}
function text(value: JsonValue): value is string { return typeof value === 'string' && value.length > 0; }
function fingerprint(value: JsonValue): value is string { return typeof value === 'string' && SHA.test(value); }
function key(value: JsonValue): value is JsonValue[] {
  return Array.isArray(value) && value.length > 0 && value.every(v => v !== null && typeof v !== 'object');
}
function same(a: unknown, b: unknown): boolean { return canonicalOwnershipJson(a) === canonicalOwnershipJson(b); }
function identity(table: string, rowKey: JsonValue[]): string { return canonicalOwnershipJson([table, rowKey]); }
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function blocked(code: string): { status: 'BLOCKED'; code: string } { return freeze({ status: 'BLOCKED', code }); }
function retryKey(planDigest: string, chunkId: string): string { return ownershipDigest(['BACKFILL_ORIGINAL_PLAN_RETRY', planDigest, chunkId]); }

function validEntry(value: JsonValue): boolean {
  if (!fields(value, ENTRY_FIELDS) || !text(value.table) || !key(value.key) || !fingerprint(value.sourceChecksum) ||
    !fingerprint(value.mirroredIdentityChecksum) || !object(value.mirroredIdentity) || !Array.isArray(value.evidenceDigests) ||
    !value.evidenceDigests.every(fingerprint)) return false;
  const rule = getOwnershipRegistry().tables.find(t => t.table === value.table);
  if (!rule || value.storage !== rule.storage || value.sidecar !== rule.sidecar || value.key.length !== rule.primaryKey.length ||
    !fields(value.mirroredIdentity, rule.mirroredIdentityColumns) || ownershipDigest(value.mirroredIdentity) !== value.mirroredIdentityChecksum) return false;
  // NULL belongs only to the retained global control contract. No default
  // workspace or location is inferred for any other original row.
  return rule.storage === 'GLOBAL_SECURITY_CONTROL' ? value.workspaceId === null : text(value.workspaceId);
}
function validPlan(value: JsonValue): value is JsonValue & BackfillPlan {
  if (!fields(value, ['status', 'digest', 'registryDigest', 'sourceDigest', 'schemaDigest', 'snapshotId', 'manifest', 'chunks', 'entries', 'diagnostics', 'preservesAllOriginalColumns', 'verification']) ||
    value.status !== 'READY_FOR_GUARDED_EXECUTION' || value.preservesAllOriginalColumns !== true || value.verification !== 'PURE_PREFLIGHT_NOT_DATABASE_VERIFICATION' ||
    !fingerprint(value.digest) || !fingerprint(value.registryDigest) || !fingerprint(value.sourceDigest) || !fingerprint(value.schemaDigest) || !text(value.snapshotId) ||
    !Array.isArray(value.diagnostics) || value.diagnostics.length !== 0 || !Array.isArray(value.entries) || !value.entries.every(validEntry) || !Array.isArray(value.chunks)) return false;
  const manifest = value.manifest;
  if (!fields(manifest, ['registryDigest', 'sourceDigest', 'schemaDigest', 'snapshotId', 'preservesAllOriginalColumns', 'verification', 'entries', 'chunkSize', 'writeFence', 'historicalReferences', 'mappings', 'payloadCaptures', 'namespaceComparators', 'installation']) ||
    manifest.preservesAllOriginalColumns !== true || manifest.verification !== value.verification ||
    !Array.isArray(manifest.historicalReferences) || !Array.isArray(manifest.mappings) || !Array.isArray(manifest.payloadCaptures)) return false;
  const fence = manifest.writeFence;
  if (!fields(fence, ['mode', 'sourceDigest', 'schemaDigest', 'databaseFenceToken', 'allWritersCovered', 'immutableOwnershipEnabled', 'registeredWriterDigest', 'newWriteJournalDigest', 'newWritesReconciled']) ||
    (fence.mode !== 'EXCLUSIVE_FENCED' && fence.mode !== 'DUAL_WRITE') || fence.sourceDigest !== value.sourceDigest || fence.schemaDigest !== value.schemaDigest ||
    !text(fence.databaseFenceToken) || fence.allWritersCovered !== true || fence.immutableOwnershipEnabled !== true || fence.newWritesReconciled !== true ||
    !fingerprint(fence.registeredWriterDigest) || !fingerprint(fence.newWriteJournalDigest)) return false;
  const identities = new Set<string>();
  for (const entry of value.entries as unknown as BackfillEntry[]) {
    const id = identity(entry.table, entry.key);
    if (identities.has(id)) return false;
    identities.add(id);
  }
  for (const chunk of value.chunks) {
    if (!fields(chunk, ['id', 'table', 'entries', 'count', 'sourceChecksum', 'targetChecksum']) || !fingerprint(chunk.id) || !text(chunk.table) ||
      !Array.isArray(chunk.entries) || !chunk.entries.every(validEntry) || typeof chunk.count !== 'number' || chunk.count < 1 || !Number.isSafeInteger(chunk.count) ||
      !fingerprint(chunk.sourceChecksum) || !fingerprint(chunk.targetChecksum)) return false;
  }
  // Reuse the frozen source-specific manifest/chunk/comparator coherence check
  // only after removing every unsupported input behavior. This is not a fresh
  // capture, database identity, fence validation or operator permission check.
  return resumeTenantBackfill(value as unknown as BackfillPlan, [], []).status === 'READY';
}
function prepare(plan: unknown): Prepared {
  let data: JsonValue;
  try { data = copyData(plan); } catch { return { code: 'UNSUPPORTED_PLAN_VALUE' }; }
  try {
    if (!validPlan(data)) return { code: 'ORIGINAL_PLAN_DRIFT' };
    const p = data as BackfillPlan, m = p.manifest as DataObject;
    const boundary: BackfillJournalBoundary = { kind: 'BACKFILL_CHUNK_JOURNAL_V1', sourceDigest: p.sourceDigest, schemaDigest: p.schemaDigest,
      registryDigest: p.registryDigest, snapshotId: p.snapshotId, planDigest: p.digest,
      mappingDigest: ownershipDigest({ mappings: m.mappings, historicalReferences: m.historicalReferences, payloadCaptures: m.payloadCaptures, installation: m.installation, resolvedEntries: p.entries }),
      writeFenceDigest: ownershipDigest(m.writeFence) };
    const chunks: BackfillJournalChunk[] = p.chunks.map((c, ordinal) => ({ id: c.id, table: c.table, ordinal, count: c.count,
      firstKey: c.entries[0].key, lastKey: c.entries[c.entries.length - 1].key, keysDigest: ownershipDigest(c.entries.map(e => e.key)),
      sourceChecksum: c.sourceChecksum, targetChecksum: c.targetChecksum,
      ownershipChecksum: ownershipDigest(c.entries.map(e => ({ table: e.table, key: e.key, workspaceId: e.workspaceId, sourceChecksum: e.sourceChecksum, mirroredIdentityChecksum: e.mirroredIdentityChecksum }))) }));
    return { plan: p, description: freeze({ status: 'DESCRIBED', boundary, chunks, verification: VERIFICATION }) };
  } catch { return { code: 'ORIGINAL_PLAN_DRIFT' }; }
}

/** Describes a supplied original plan, not a persisted journal or a database.
 * The caller must retain that exact original plan for all retries. */
export function describeBackfillJournal(plan: unknown): BackfillJournalDescription {
  const prepared = prepare(plan);
  return 'code' in prepared ? blocked(prepared.code) : prepared.description;
}

/** Caller-supplied COMMITTED/fresh markers are observations, never attestations.
 * Even coherent complete observations always require a fresh owned original-plan
 * database read, current catalog/fence/role checks and operator authority outside
 * this module. No STARTED/UNKNOWN transition or effect completion is emitted. */
export function assessBackfillJournal(plan: unknown, observation: unknown): BackfillJournalAssessment {
  const prepared = prepare(plan);
  if ('code' in prepared) return blocked(prepared.code);
  let data: JsonValue;
  try { data = copyData(observation); } catch { return blocked('UNSUPPORTED_JOURNAL_VALUE'); }
  if (!fields(data, ['boundary', 'rows', 'reconciliation']) || !fields(data.boundary, BOUNDARY_FIELDS) || !Array.isArray(data.rows)) return blocked('UNSUPPORTED_JOURNAL_STRUCTURE');
  const { description, plan: p } = prepared;
  if (!same(data.boundary, description.boundary)) return blocked('JOURNAL_BOUNDARY_DRIFT');
  const rows = new Map<string, PersistedBackfillJournalObservation['rows'][number]>();
  if (data.rows.length !== description.chunks.length) return blocked('JOURNAL_COVERAGE_DRIFT');
  for (const row of data.rows) {
    if (!fields(row, ['chunk', 'state', 'retryKey']) || !fields(row.chunk, CHUNK_FIELDS) || typeof row.state !== 'string' || !STATES.includes(row.state) || typeof row.retryKey !== 'string') return blocked('UNSUPPORTED_JOURNAL_STRUCTURE');
    const chunk = description.chunks.find(c => c.id === (row.chunk as DataObject).id);
    if (!chunk || !same(row.chunk, chunk)) return blocked('JOURNAL_CHUNK_DRIFT');
    if (rows.has(chunk.id)) return blocked('JOURNAL_COVERAGE_DRIFT');
    if (row.retryKey !== retryKey(p.digest, chunk.id)) return blocked('JOURNAL_RETRY_DRIFT');
    rows.set(chunk.id, row as unknown as PersistedBackfillJournalObservation['rows'][number]);
  }
  const ownership = new Map<string, OwnershipRecord>();
  const hasReconciliation = data.reconciliation !== null;
  if (hasReconciliation) {
    const r = data.reconciliation;
    if (!fields(r, ['boundary', 'readMode', 'observationId', 'transaction', 'sourceRows', 'ownership']) || !fields(r.boundary, BOUNDARY_FIELDS) ||
      r.readMode !== 'FRESH_OWNED_ORIGINAL_PLAN_RECHECK' || !text(r.observationId) || r.transaction !== 'COMMITTED' || !Array.isArray(r.sourceRows) || !Array.isArray(r.ownership)) return blocked('UNSUPPORTED_RECONCILIATION_STRUCTURE');
    if (!same(r.boundary, description.boundary)) return blocked('RECONCILIATION_BOUNDARY_DRIFT');
    const entries = new Map(p.entries.map(e => [identity(e.table, e.key), e]));
    const observedSources = new Set<string>();
    if (r.sourceRows.length !== p.entries.length) return blocked('SOURCE_RECONCILIATION_DRIFT');
    for (const source of r.sourceRows) {
      if (!fields(source, ['table', 'key', 'sourceChecksum']) || !text(source.table) || !key(source.key)) return blocked('SOURCE_RECONCILIATION_DRIFT');
      const id = identity(source.table, source.key), entry = entries.get(id);
      if (!entry || observedSources.has(id) || source.sourceChecksum !== entry.sourceChecksum) return blocked('SOURCE_RECONCILIATION_DRIFT');
      observedSources.add(id);
    }
    for (const record of r.ownership) {
      if (!fields(record, RECORD_FIELDS) || !text(record.table) || !key(record.key)) return blocked('OWNERSHIP_RECONCILIATION_DRIFT');
      const id = identity(record.table, record.key), entry = entries.get(id);
      if (!entry || ownership.has(id) || record.workspaceId !== entry.workspaceId || record.sourceChecksum !== entry.sourceChecksum || record.mirroredIdentityChecksum !== entry.mirroredIdentityChecksum) return blocked('OWNERSHIP_RECONCILIATION_DRIFT');
      ownership.set(id, record as unknown as OwnershipRecord);
    }
  }
  const chunks: Extract<BackfillJournalAssessment, { status: 'READY_FOR_DATABASE_RECHECK' }>['chunks'] = [];
  for (const [ordinal, chunk] of description.chunks.entries()) {
    const row = rows.get(chunk.id)!;
    const missingKeys = hasReconciliation ? p.chunks[ordinal].entries.filter(e => !ownership.has(identity(e.table, e.key))).map(e => e.key) : p.chunks[ordinal].entries.map(e => e.key);
    if (hasReconciliation && row.state === 'COMPLETE' && missingKeys.length > 0) return blocked('INCOMPLETE_CHUNK_METADATA');
    const targetObservation = !hasReconciliation ? 'UNOBSERVED' : missingKeys.length === 0 ? 'MATCHES_TARGET' : missingKeys.length === chunk.count ? 'ABSENT' : 'PARTIAL';
    chunks.push({ chunk, observedState: row.state, retryKey: row.retryKey, targetObservation, missingKeys });
  }
  return freeze({ status: 'READY_FOR_DATABASE_RECHECK', boundary: description.boundary, chunks,
    reconciliationObservation: hasReconciliation ? 'COHERENT_UNVERIFIED' : 'ABSENT', effectsVerified: false,
    requirement: 'FRESH_OWNED_ORIGINAL_PLAN_DB_RECHECK_AND_OPERATOR_AUTHORITY', verification: VERIFICATION });
}
