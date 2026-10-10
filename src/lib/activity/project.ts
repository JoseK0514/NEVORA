import { types as nodeTypes } from 'node:util';
import { Temporal } from '@js-temporal/polyfill';
import { evaluateCapability } from '../capabilities/policy';
import { CAPABILITIES, CAPABILITY_FIELDS } from '../capabilities/types';
import type { Capability, CapabilityField, CapabilityInput } from '../capabilities/types';
import { ACTIVITY_BUSINESS_SOURCE_TABLES, PRESERVED_ACTIVITY_LEDGERS } from './types';
import type {
  ActivityCoverage, ActivityCoverageObservation, ActivityDefinition, ActivityEntry,
  ActivityFootprint, ActivityProjection, ActivityProjectionInput, ActivityPublicSourceRef, ActivityQuery,
  ActivityRecordObservation, ActivitySourceRef,
} from './types';

const fields = new Set<string>(CAPABILITY_FIELDS);
const capabilities = new Set<string>(CAPABILITIES);
const ledgers = new Set<string>(PRESERVED_ACTIVITY_LEDGERS);
const businessSources = new Set<string>(ACTIVITY_BUSINESS_SOURCE_TABLES);
const ownCapabilities = new Set<string>(['self.schedule.read', 'self.time.read', 'communication.own-receipt.read']);
const activityFields = new Set<CapabilityField>([
  'audit.metadata', 'audit.source', 'employee.identity', 'schedule', 'request',
  'attendance', 'timecard', 'communication.ownReceipt',
]);
const proofKinds = ['PORTAL', 'CLOCKER', 'CALENDAR_READ', 'WORKER', 'PROVISIONER'];
const detailPermissions = ['ACTOR_IDENTITY', 'SOURCE_REFERENCE', 'SOURCE_HASH', 'PROVENANCE_REFERENCE', 'PROVENANCE_HASH'];
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !nodeTypes.isProxy(v) && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v);
// Exact existing DB keys/opaque versions are not display labels or selectors.
// Preserve original bytes and match the tenant resolver's control rejection.
const key = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(v);
const code = (v: unknown): v is string => typeof v === 'string' && /^[A-Z][A-Z0-9_]{0,99}$/.test(v);
const table = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_]{0,99}$/.test(v);
const digest = (v: unknown) => v === null || typeof v === 'string' && /^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(v);
const strings = (v: unknown, predicate: (item: unknown) => boolean = key): v is string[] => Array.isArray(v) && v.every(predicate) && new Set(v).size === v.length;
const fieldList = (v: unknown): v is CapabilityField[] => strings(v, f => typeof f === 'string' && fields.has(f));
function instant(v: unknown): v is string {
  if (!text(v)) return false;
  try { Temporal.Instant.from(v); return true; } catch { return false; }
}
const compare = (a: string, b: string) => Temporal.Instant.compare(a, b);
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
function fail(): never { throw new Error('Invalid activity observation'); }

/** Detach only data properties. Never invoke accessors/coercions or serialize
 * arbitrary payloads into output. Mechanical depth/node bounds are defensive
 * parser limits, not owner-approved throughput or performance thresholds. */
function dataSnapshot(value: unknown): unknown {
  const seen = new Set<object>(); let remaining = 100_000;
  const workspace = object(value) ? Object.getOwnPropertyDescriptor(value, 'workspace') : undefined;
  const workspaceId = workspace && Object.hasOwn(workspace, 'value') && object(workspace.value)
    ? Object.getOwnPropertyDescriptor(workspace.value, 'id') : undefined;
  const tenant = workspaceId && Object.hasOwn(workspaceId, 'value') && key(workspaceId.value) ? workspaceId.value : null;
  function copy(v: unknown, depth: number, observationRows = false): unknown {
    if (--remaining < 0 || depth > 20) return fail();
    // Optional observations can legitimately be explicitly undefined. Required
    // fields are checked below; no undefined value is copied into the public DTO.
    if (v === undefined || v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v !== 'object' || nodeTypes.isProxy(v) || seen.has(v)) return fail();
    seen.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v as object);
    if (Array.isArray(v)) {
      const lengthDescriptor = Object.hasOwn(descriptors, 'length') ? descriptors.length : undefined;
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')) return fail();
      const length: unknown = lengthDescriptor.value;
      if (Object.getPrototypeOf(v) !== Array.prototype || typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0 ||
        Reflect.ownKeys(descriptors).length !== length + 1) return fail();
      const result: unknown[] = [];
      for (let i = 0; i < length; i++) {
        const index = String(i), d = Object.hasOwn(descriptors, index) ? descriptors[index] : undefined;
        if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) return fail();
        // A foreign observation is not part of this tenant projection. Inspect
        // only its own data-bound tenant key, never any opaque payload property.
        const binding = observationRows && object(d.value) ? Object.getOwnPropertyDescriptor(d.value, 'workspaceId') : undefined;
        if (tenant && binding && Object.hasOwn(binding, 'value') && typeof binding.value === 'string' && binding.value !== tenant) continue;
        result.push(copy(d.value, depth + 1));
      }
      seen.delete(v); return result;
    }
    if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return fail();
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') return fail();
      const d = descriptors[key]; if (!Object.hasOwn(d, 'value') || !d.enumerable) return fail();
      result[key] = copy(d.value, depth + 1, depth === 0 && (key === 'records' || key === 'coverage'));
    }
    seen.delete(v); return result;
  }
  return copy(value, 0);
}

function validDefinition(v: unknown): v is ActivityDefinition {
  if (!object(v) || !code(v.eventType) || !code(v.purpose) || !code(v.family) || !strings(v.sourceTables, t => table(t) && businessSources.has(t)) || v.sourceTables.length === 0 ||
    !(v.prospectiveFrom === null || instant(v.prospectiveFrom)) || typeof v.managementCapability !== 'string' || !capabilities.has(v.managementCapability) ||
    v.managementCapability.startsWith('audit.') || !(v.selfCapability === null || typeof v.selfCapability === 'string' && ownCapabilities.has(v.selfCapability)) ||
    !fieldList(v.summaryFields) || v.summaryFields.some(f => !activityFields.has(f)) || !object(v.preservedKinds)) return false;
  return Object.entries(v.preservedKinds).every(([key, kinds]) => ledgers.has(key) && strings(kinds, code));
}
function validQuery(v: unknown): v is ActivityQuery {
  return object(v) && (v.eventTypes === undefined || strings(v.eventTypes, code)) && (v.sourceIds === undefined || strings(v.sourceIds)) &&
    (v.changedFields === undefined || fieldList(v.changedFields) && v.changedFields.every(f => activityFields.has(f))) &&
    (v.from === undefined || instant(v.from)) && (v.through === undefined || instant(v.through));
}
function validInput(v: unknown): v is ActivityProjectionInput {
  if (!object(v) || !instant(v.observedAt) || !['READ', 'COUNT', 'EXPORT'].includes(String(v.mode)) || !fieldList(v.requestedFields) ||
    !v.requestedFields.includes('audit.metadata') || v.requestedFields.some(f => !activityFields.has(f)) ||
    !Array.isArray(v.definitions) || v.definitions.length === 0 || !v.definitions.every(validDefinition) ||
    new Set(v.definitions.map(d => d.eventType)).size !== v.definitions.length ||
    !Array.isArray(v.records) || !v.records.every(object) || !Array.isArray(v.coverage) || !v.coverage.every(object) ||
    v.query !== undefined && !validQuery(v.query) || !object(v.actor) || !object(v.workspace) || !object(v.authority)) return false;
  const a = v.actor, w = v.workspace, authority = v.authority;
  if (!key(a.id) || !key(w.id) || a.workspaceId !== w.id || w.active !== true || a.workforceActive !== true || a.portalState !== 'ENABLED' ||
    !['OWNER', 'MANAGER', 'EMPLOYEE', 'LEAD'].includes(String(a.role)) || !strings(a.effectiveAdministrativeCapabilities, c => typeof c === 'string' && capabilities.has(c)) ||
    authority.membershipCurrent !== true || authority.sessionCurrent !== true || authority.grantsCurrent !== true || typeof authority.capturedSelfChange !== 'boolean') return false;
  const s = a.administrativeScope;
  if (!(s === null || object(s) && (s.kind === 'ALL_TENANT' && ['EXPLICIT_GRANT', 'LEGACY_COMPATIBILITY'].includes(String(s.origin)) ||
    s.kind === 'LOCATIONS' && s.origin === 'EXPLICIT_GRANT' && strings(s.locationIds)))) return false;
  return a.role !== 'MANAGER' || s !== null && a.effectiveAdministrativeCapabilities.includes('audit.read') &&
    (v.mode !== 'EXPORT' || a.effectiveAdministrativeCapabilities.includes('report.export'));
}
function validFootprint(v: unknown): v is ActivityFootprint {
  return object(v) && v.complete === true && strings(v.locationIds) && v.locationIds.length > 0;
}
function validRef(v: unknown, workspaceId: string): v is ActivitySourceRef {
  return object(v) && v.workspaceId === workspaceId && table(v.table) && businessSources.has(v.table) && key(v.id) && key(v.version) && digest(v.digest);
}
function readCapability(input: ActivityProjectionInput, definition: ActivityDefinition): Capability | null {
  return input.actor.role === 'OWNER' || input.actor.role === 'MANAGER' ? definition.managementCapability : definition.selfCapability;
}
function permitted(input: ActivityProjectionInput, authorization: CapabilityInput['source'], footprint: ActivityFootprint,
  capability: Capability, requestedFields: CapabilityField[]) {
  return evaluateCapability({ actor: input.actor, workspace: input.workspace, authority: input.authority,
    capability, mode: input.mode, phase: 'HISTORY', requestedFields, affectedLocationIds: footprint.locationIds, source: authorization }).allowed;
}
function permitsField(input: ActivityProjectionInput, source: CapabilityInput['source'], footprint: ActivityFootprint,
  capability: Capability, field: CapabilityField) {
  const audit = input.actor.role === 'OWNER' || input.actor.role === 'MANAGER' ? 'audit.read' : 'audit.self.read';
  return input.requestedFields.includes(field) && permitted(input, source, footprint, audit, [field]) &&
    (field === 'audit.metadata' || field === 'audit.source' || permitted(input, source, footprint, capability, [field]));
}
function authorized(input: ActivityProjectionInput, source: CapabilityInput['source'], footprint: ActivityFootprint, capability: Capability) {
  return permitted(input, source, footprint, capability, []) && permitsField(input, source, footprint, capability, 'audit.metadata');
}
function publicRef(ref: ActivitySourceRef, hashPermitted: boolean): ActivityPublicSourceRef {
  return { table: ref.table, id: ref.id, version: ref.version, ...(hashPermitted ? { digest: ref.digest } : {}) };
}

function projectRecord(input: ActivityProjectionInput, definition: ActivityDefinition, raw: unknown): ActivityEntry | null {
  if (!object(raw) || raw.workspaceId !== input.workspace.id || !key(raw.id) || raw.eventType !== definition.eventType || raw.purpose !== definition.purpose ||
    !instant(raw.occurredAt) || compare(raw.occurredAt, input.observedAt) > 0 || !validRef(raw.source, input.workspace.id) ||
    !definition.sourceTables.includes(raw.source.table) || !validFootprint(raw.footprint) || !object(raw.authorization) ||
    !object(raw.actor) || raw.actor.workspaceId !== input.workspace.id || !['EMPLOYEE', 'SERVICE', 'UNKNOWN'].includes(String(raw.actor.kind)) ||
    !(raw.actor.id === null || key(raw.actor.id)) || !(raw.actor.proofKind === null || proofKinds.includes(String(raw.actor.proofKind))) ||
    (raw.actor.kind === 'UNKNOWN') !== (raw.actor.id === null) || !object(raw.provenance) || !object(raw.summary) ||
    !strings(raw.detailPermissions, p => typeof p === 'string' && detailPermissions.includes(p)) ||
    !Array.isArray(raw.summary.changedFields) || !raw.summary.changedFields.every(f => typeof f === 'string' && fields.has(f))) return null;
  const r = raw as unknown as ActivityRecordObservation;
  if (r.detailPermissions.includes('SOURCE_HASH') && !r.detailPermissions.includes('SOURCE_REFERENCE') ||
    r.detailPermissions.includes('PROVENANCE_HASH') && !r.detailPermissions.includes('PROVENANCE_REFERENCE')) return null;
  const capability = readCapability(input, definition);
  if (!capability || !authorized(input, r.authorization, r.footprint, capability)) return null;
  if (r.provenance.kind === 'PROSPECTIVE') {
    const operation = r.provenance.operation;
    if (!definition.prospectiveFrom || compare(r.occurredAt, definition.prospectiveFrom) < 0 || !r.actor.proofKind || !r.actor.id || r.actor.kind === 'UNKNOWN' ||
      !object(operation) || operation.workspaceId !== input.workspace.id || operation.actorId !== r.actor.id || operation.purpose !== definition.purpose || !key(operation.id) ||
      (r.actor.proofKind === 'WORKER' || r.actor.proofKind === 'PROVISIONER') !== (r.actor.kind === 'SERVICE')) return null;
  } else if (r.provenance.kind === 'PRESERVED') {
    if (!validRef(r.provenance.ledger, input.workspace.id) || r.actor.proofKind !== null) return null;
    const kinds = definition.preservedKinds[r.provenance.ledger.table];
    if (!kinds || !(r.provenance.sourceEventType === null && kinds.length === 0 || typeof r.provenance.sourceEventType === 'string' && kinds.includes(r.provenance.sourceEventType))) return null;
  } else return null;
  const entry: ActivityEntry = {
    id: r.id, eventType: definition.eventType, purpose: definition.purpose, occurredAt: r.occurredAt,
    provenanceKind: r.provenance.kind,
    summary: { changedFields: [...new Set(r.summary.changedFields)].filter(f => definition.summaryFields.includes(f) && permitsField(input, r.authorization, r.footprint, capability, f)).sort(lexical) },
  };
  if (r.detailPermissions.includes('ACTOR_IDENTITY') && permitsField(input, r.authorization, r.footprint, capability, 'employee.identity')) {
    entry.actor = { kind: r.actor.kind, id: r.actor.id, proofKind: r.actor.proofKind };
  }
  if (permitsField(input, r.authorization, r.footprint, capability, 'audit.source')) {
    if (r.detailPermissions.includes('SOURCE_REFERENCE')) entry.source = publicRef(r.source, r.detailPermissions.includes('SOURCE_HASH'));
    if (r.detailPermissions.includes('PROVENANCE_REFERENCE')) {
      entry.provenance = r.provenance.kind === 'PROSPECTIVE'
        ? { kind: 'PROSPECTIVE', operation: { purpose: r.provenance.operation.purpose, id: r.provenance.operation.id } }
        : { kind: 'PRESERVED', ledger: publicRef(r.provenance.ledger, r.detailPermissions.includes('PROVENANCE_HASH')), sourceEventType: r.provenance.sourceEventType };
    }
  }
  return entry;
}
function projectCoverage(input: ActivityProjectionInput, definition: ActivityDefinition, raw: unknown): ActivityCoverage | null {
  if (!object(raw) || raw.workspaceId !== input.workspace.id || raw.family !== definition.family || !validFootprint(raw.footprint) || !object(raw.authorization) ||
    !object(raw.historical) || !['PRESERVED_HISTORY', 'NOT_OBSERVED', 'UNKNOWN'].includes(String(raw.historical.state))) return null;
  const c = raw as unknown as ActivityCoverageObservation;
  const capability = readCapability(input, definition);
  if (!capability || !authorized(input, c.authorization, c.footprint, capability) ||
    !permitsField(input, c.authorization, c.footprint, capability, 'audit.source')) return null;
  const h = c.historical;
  if (!strings(h.ledgers, l => typeof l === 'string' && ledgers.has(l) && Object.hasOwn(definition.preservedKinds, l)) ||
    !Array.isArray(h.gaps) || h.gaps.length === 0 || !h.gaps.every(g => object(g) && (g.from === null || instant(g.from)) &&
      (g.until === null || instant(g.until)) && ['PRE_F_NOT_INSTRUMENTED', 'SOURCE_NOT_OBSERVED', 'ADAPTER_LIMIT'].includes(String(g.reason)) &&
      (g.from === null || compare(g.from, input.observedAt) <= 0) && (g.until === null || compare(g.until, input.observedAt) <= 0) &&
      (g.from === null || g.until === null || compare(g.from, g.until) <= 0))) return null;
  if (h.state === 'PRESERVED_HISTORY') {
    if (!instant(h.observedFrom) || !instant(h.observedThrough) || h.ledgers.length === 0 ||
      compare(h.observedFrom, h.observedThrough) > 0 || compare(h.observedThrough, input.observedAt) > 0) return null;
  } else if (h.observedFrom !== null || h.observedThrough !== null || h.ledgers.length !== 0) return null;
  return { family: definition.family, historical: {
    state: h.state, observedFrom: h.observedFrom, observedThrough: h.observedThrough, ledgers: [...h.ledgers].sort(lexical),
    gaps: h.gaps.map(g => ({ from: g.from, until: g.until, reason: g.reason })).sort((a, b) => lexical(JSON.stringify(a), JSON.stringify(b))),
  } };
}
function matches(entry: ActivityEntry, query: ActivityQuery | undefined) {
  return !query || (query.eventTypes === undefined || query.eventTypes.includes(entry.eventType)) &&
    (query.sourceIds === undefined || entry.source !== undefined && query.sourceIds.includes(entry.source.id)) &&
    (query.changedFields === undefined || query.changedFields.every(f => entry.summary.changedFields.includes(f))) &&
    (query.from === undefined || compare(entry.occurredAt, query.from) >= 0) &&
    (query.through === undefined || compare(entry.occurredAt, query.through) <= 0);
}

/** Pure privacy projection, not source authenticity, final activity detail,
 * runtime tenant isolation, complete historical inventory or atomic event writes.
 * Hidden rows never affect counts, filters, diagnostics or coverage totals. */
export function projectActivity(value: unknown): ActivityProjection {
  try {
    const input = dataSnapshot(value);
    if (!validInput(input)) return { state: 'unavailable' };
    const definitions = new Map(input.definitions.map(d => [d.eventType, d]));
    const entries: ActivityEntry[] = [];
    const seen = new Map<string, string>();
    for (const raw of input.records) {
      if (raw.workspaceId !== input.workspace.id) continue;
      const definition = definitions.get(raw.eventType); if (!definition) continue;
      const entry = projectRecord(input, definition, raw);
      if (!entry || !matches(entry, input.query)) continue;
      const prior = seen.get(entry.id), encoded = JSON.stringify(entry);
      if (prior !== undefined && prior !== encoded) return { state: 'unavailable' };
      if (prior === undefined) { seen.set(entry.id, encoded); entries.push(entry); }
    }
    entries.sort((a, b) => compare(b.occurredAt, a.occurredAt) || lexical(a.id, b.id));
    if (input.mode === 'COUNT') return { state: 'ready', mode: 'COUNT', observedAt: input.observedAt, count: entries.length };
    const coverage: ActivityCoverage[] = [];
    const seenCoverage = new Set<string>();
    for (const raw of input.coverage) {
      if (raw.workspaceId !== input.workspace.id) continue;
      const definition = definitions.get(raw.definitionType); if (!definition) continue;
      const projected = projectCoverage(input, definition, raw); if (!projected) continue;
      const encoded = JSON.stringify(projected);
      if (!seenCoverage.has(encoded)) { coverage.push(projected); seenCoverage.add(encoded); }
    }
    coverage.sort((a, b) => lexical(a.family, b.family) || lexical(JSON.stringify(a), JSON.stringify(b)));
    return { state: 'ready', mode: input.mode, observedAt: input.observedAt, entries, coverage, count: entries.length };
  } catch { return { state: 'unavailable' }; }
}
