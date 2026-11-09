import { describe, expect, it } from 'vitest';
import { projectActivity } from './project';
import type { ActivityProjectionInput, ActivityRecordObservation } from './types';

const at = '2026-10-09T12:00:00Z';
const later = '2026-10-09T13:00:00Z';
const fields: ActivityProjectionInput['requestedFields'] = ['audit.metadata', 'audit.source', 'employee.identity', 'attendance', 'request', 'timecard'];
function fixture(): ActivityProjectionInput {
  const authorization: ActivityRecordObservation['authorization'] = {
    workspaceId: 'tenant-a', current: true, footprintComplete: true, canonicalAllowed: true,
    permittedFields: [...fields], locations: [
      { id: 'loc-a', workspaceId: 'tenant-a', active: true },
      { id: 'loc-b', workspaceId: 'tenant-a', active: false },
    ], subject: { id: 'employee-a', workspaceId: 'tenant-a', role: 'EMPLOYEE', workforceActive: true,
      portalState: 'ENABLED', identityVerified: true, locationIds: ['loc-a'] },
    resourceOwnerEmployeeId: 'employee-a',
  };
  return {
    actor: { id: 'owner-a', workspaceId: 'tenant-a', role: 'OWNER', workforceActive: true,
      portalState: 'ENABLED', administrativeScope: null, effectiveAdministrativeCapabilities: [] },
    workspace: { id: 'tenant-a', active: true },
    authority: { membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, capturedSelfChange: false },
    observedAt: later, mode: 'READ', requestedFields: [...fields],
    definitions: [{ eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION', family: 'TIME_CORRECTION',
      sourceTables: ['time_correction_requests'], prospectiveFrom: '2026-10-09T00:00:00Z',
      managementCapability: 'timecard.read', selfCapability: 'self.time.read', summaryFields: ['attendance', 'request', 'timecard'],
      preservedKinds: { time_correction_events: ['REQUESTED', 'APPROVED', 'REJECTED'] } }],
    records: [{ workspaceId: 'tenant-a', id: 'event-a', eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION',
      occurredAt: at, actor: { workspaceId: 'tenant-a', kind: 'EMPLOYEE', id: 'manager-a', proofKind: 'PORTAL' },
      source: { workspaceId: 'tenant-a', table: 'time_correction_requests', id: 'request-a', version: '7', digest: 'a'.repeat(64) },
      provenance: { kind: 'PROSPECTIVE', operation: { workspaceId: 'tenant-a', actorId: 'manager-a', purpose: 'TIME_CORRECTION', id: 'operation-a' } },
      footprint: { complete: true, locationIds: ['loc-a'] }, authorization,
      detailPermissions: ['ACTOR_IDENTITY', 'SOURCE_REFERENCE', 'SOURCE_HASH', 'PROVENANCE_REFERENCE', 'PROVENANCE_HASH'],
      summary: { changedFields: ['attendance', 'request'] } }],
    coverage: [{ workspaceId: 'tenant-a', family: 'TIME_CORRECTION', definitionType: 'TIME_CORRECTION_APPROVED',
      footprint: { complete: true, locationIds: ['loc-a'] }, authorization: structuredClone(authorization),
      historical: { state: 'PRESERVED_HISTORY', observedFrom: '2026-01-01T00:00:00Z', observedThrough: at,
        ledgers: ['time_correction_events'], gaps: [{ from: null, until: '2026-10-09T00:00:00Z', reason: 'PRE_F_NOT_INSTRUMENTED' }] } }],
  };
}
function ready(input: unknown) {
  const result = projectActivity(input);
  expect(result.state).toBe('ready');
  if (result.state !== 'ready' || result.mode === 'COUNT') throw new Error('Expected projected entries');
  return result;
}
function self(input: ActivityProjectionInput, role: 'EMPLOYEE' | 'LEAD' = 'EMPLOYEE') {
  input.actor = { ...input.actor, id: 'employee-a', role };
  for (const source of [...input.records.map(r => r.authorization), ...input.coverage.map(c => c.authorization)]) {
    source.subject = { ...source.subject!, role };
  }
  // Existing correction own-history exposes request id/version, not manager
  // identity, another actor's operation, ledger keys or source hashes.
  input.records.forEach(r => { r.detailPermissions = ['SOURCE_REFERENCE']; });
}
function manager(input: ActivityProjectionInput) {
  input.actor = { ...input.actor, id: 'manager-a', role: 'MANAGER',
    administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] },
    effectiveAdministrativeCapabilities: ['audit.read', 'timecard.read', 'report.export'] };
}

describe('pure F5 activity projection preparation', () => {
  it('retains actual prospective actor/time/source/version/operation with a sanitized field-name summary', () => {
    const projected = ready(fixture());
    expect(projected.entries).toEqual([{ id: 'event-a', eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION',
      occurredAt: at, provenanceKind: 'PROSPECTIVE', actor: { kind: 'EMPLOYEE', id: 'manager-a', proofKind: 'PORTAL' },
      source: { table: 'time_correction_requests', id: 'request-a', version: '7', digest: 'a'.repeat(64) },
      provenance: { kind: 'PROSPECTIVE', operation: { purpose: 'TIME_CORRECTION', id: 'operation-a' } },
      summary: { changedFields: ['attendance', 'request'] } }]);
    expect(projected.coverage[0].historical).toEqual(fixture().coverage[0].historical);
    expect(projected.count).toBe(1);
  });
  it('preserves prior ledger keys/hash/time and unknown proof kind rather than making synthetic F events', () => {
    const input = fixture(); const record = input.records[0];
    record.occurredAt = '2026-01-01T03:00:00Z'; record.actor.proofKind = null;
    record.provenance = { kind: 'PRESERVED', ledger: { workspaceId: 'tenant-a', table: 'time_correction_events',
      id: 'original-ledger-key', version: '3', digest: 'b'.repeat(64) }, sourceEventType: 'APPROVED' };
    const projected = ready(input);
    expect(projected.entries[0].provenance).toEqual({ kind: 'PRESERVED', ledger: { table: 'time_correction_events',
      id: 'original-ledger-key', version: '3', digest: 'b'.repeat(64) }, sourceEventType: 'APPROVED' });
    expect(projected.entries[0].occurredAt).toBe(record.occurredAt);
    expect(projected.entries[0].actor?.proofKind).toBeNull();
  });
  it('shows a supplied historical observation gap without adding any events', () => {
    const input = fixture(); input.records = [];
    input.coverage[0].historical = { state: 'NOT_OBSERVED', observedFrom: null, observedThrough: null, ledgers: [],
      gaps: [{ from: null, until: at, reason: 'PRE_F_NOT_INSTRUMENTED' }] };
    expect(ready(input)).toMatchObject({ count: 0, entries: [], coverage: [{ family: 'TIME_CORRECTION', historical: input.coverage[0].historical }] });
  });
  it.each(['READ', 'EXPORT', 'COUNT'] as const)('ignores foreign records, links and coverage without exposing omitted totals in %s', mode => {
    const input = fixture(); input.mode = mode;
    const foreign = structuredClone(input.records[0]); foreign.workspaceId = 'tenant-b'; foreign.id = 'foreign-event';
    input.records.push(foreign);
    input.coverage.push({ ...structuredClone(input.coverage[0]), workspaceId: 'tenant-b', family: 'FOREIGN_FAMILY' });
    const result = projectActivity(input);
    expect(result).toEqual(projectActivity({ ...input, records: [input.records[0]], coverage: [input.coverage[0]] }));
    expect(JSON.stringify(result)).not.toContain('foreign');
  });
  it.each(['actor', 'source', 'operation', 'location', 'subject', 'resourceOwner'] as const)('withholds the whole event on cross-tenant %s linkage', seam => {
    const input = fixture(); const r = input.records[0]; input.coverage = [];
    if (seam === 'actor') r.actor.workspaceId = 'tenant-b';
    if (seam === 'source') r.source.workspaceId = 'tenant-b';
    if (seam === 'operation' && r.provenance.kind === 'PROSPECTIVE') r.provenance.operation.workspaceId = 'tenant-b';
    if (seam === 'location') r.authorization.locations[0].workspaceId = 'tenant-b';
    if (seam === 'subject') r.authorization.subject!.workspaceId = 'tenant-b';
    if (seam === 'resourceOwner') { self(input); r.authorization.resourceOwnerEmployeeId = 'foreign-employee'; }
    expect(ready(input)).toMatchObject({ entries: [], count: 0 });
  });
  it.each(['workspace', 'actorWorkspace', 'session', 'membership', 'grant', 'workforce', 'portal'] as const)('denies stale or disabled current viewer %s authority', seam => {
    const input = fixture();
    if (seam === 'workspace') input.workspace.active = false;
    if (seam === 'actorWorkspace') input.actor.workspaceId = 'tenant-b';
    if (seam === 'session') input.authority.sessionCurrent = false;
    if (seam === 'membership') input.authority.membershipCurrent = false;
    if (seam === 'grant') input.authority.grantsCurrent = false;
    if (seam === 'workforce') input.actor.workforceActive = false;
    if (seam === 'portal') input.actor.portalState = 'DISABLED';
    expect(projectActivity(input)).toEqual({ state: 'unavailable' });
  });
  it.each(['audit.read', 'timecard.read'] as const)('requires Manager %s as well as the other permission', missing => {
    const input = fixture(); manager(input);
    input.actor.effectiveAdministrativeCapabilities = input.actor.effectiveAdministrativeCapabilities.filter(c => c !== missing);
    const result = projectActivity(input);
    expect(result.state === 'unavailable' || result.state === 'ready' && result.count === 0).toBe(true);
  });
  it('denies partial Manager timecard footprint, including preserved inactive history and current subject locations', () => {
    const input = fixture(); manager(input);
    expect(ready(input).count).toBe(1);
    input.records[0].footprint.locationIds.push('loc-b');
    input.coverage[0].footprint.locationIds.push('loc-b');
    expect(ready(input)).toMatchObject({ entries: [], coverage: [], count: 0 });
    input.records[0].footprint.locationIds = ['loc-a'];
    input.records[0].authorization.subject!.locationIds.push('loc-b');
    expect(ready(input).entries).toEqual([]);
  });
  it('permits explicit legacy ALL_TENANT history and retains inactive locations without adding a roster default', () => {
    const input = fixture(); manager(input);
    input.actor.administrativeScope = { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' };
    input.records[0].footprint.locationIds.push('loc-b');
    expect(ready(input).count).toBe(1);
  });
  it.each(['EMPLOYEE', 'LEAD'] as const)('permits %s existing own history but withholds coworkers and non-own-source families', role => {
    const input = fixture(); self(input, role);
    expect(ready(input).count).toBe(1);
    input.records[0].authorization.subject!.id = 'coworker';
    expect(ready(input).entries).toEqual([]);
    input.records[0].authorization.subject!.id = input.actor.id;
    input.definitions[0].selfCapability = null;
    expect(ready(input)).toMatchObject({ entries: [], coverage: [], count: 0 });
  });
  it('projects only fields permitted by both audit and source and never copies private payloads even for Owner', () => {
    const input = fixture();
    Object.assign(input.records[0], { privatePayload: { body: 'PRIVATE_BODY', recipients: ['PRIVATE_COWORKER'],
      password: 'PRIVATE_PASSWORD', pin: 'PRIVATE_PIN', bearer: 'PRIVATE_BEARER', contact: 'PRIVATE_CONTACT', attestation: 'PRIVATE_ATTESTATION' } });
    input.records[0].summary.changedFields.push('secret.password', 'csv.contacts', 'communication.body');
    input.records[0].authorization.permittedFields = ['audit.metadata', 'attendance'];
    const entry = ready(input).entries[0];
    expect(entry).toEqual({ id: 'event-a', eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION',
      occurredAt: at, provenanceKind: 'PROSPECTIVE', summary: { changedFields: ['attendance'] } });
    expect(JSON.stringify(entry)).not.toContain('PRIVATE_');
  });
  it.each(['secret.password', 'secret.pin', 'secret.bearer', 'verification.attestation', 'employee.contact',
    'csv.contacts', 'communication.body', 'communication.recipientReceipts', 'calendar.url'] as const)('does not expand general activity with requested %s', field => {
    const input = fixture(); input.requestedFields.push(field);
    expect(projectActivity(input)).toEqual({ state: 'unavailable' });
  });
  it('filters only projected fields/source links, not denied payload fields or foreign records', () => {
    const input = fixture(); input.query = { sourceIds: ['request-a'], changedFields: ['attendance'] };
    expect(ready(input).count).toBe(1);
    input.records[0].authorization.permittedFields = ['audit.metadata', 'attendance'];
    expect(ready(input).count).toBe(0);
    input.query = { changedFields: ['request'] };
    expect(ready(input).count).toBe(0);
  });
  it('uses identical authorized filtering for count/export/read and count exposes only the count', () => {
    const input = fixture(); input.query = { from: at, through: at, eventTypes: ['TIME_CORRECTION_APPROVED'] };
    const read = ready(input); input.mode = 'EXPORT'; expect(ready(input).entries).toEqual(read.entries);
    input.mode = 'COUNT'; expect(projectActivity(input)).toEqual({ state: 'ready', mode: 'COUNT', observedAt: later, count: 1 });
    input.query.from = later; expect(projectActivity(input)).toMatchObject({ count: 0 });
  });
  it('requires the same Manager export grant as F6', () => {
    const input = fixture(); manager(input); input.mode = 'EXPORT';
    expect(ready(input).count).toBe(1);
    input.actor.effectiveAdministrativeCapabilities = ['audit.read', 'timecard.read'];
    expect(projectActivity(input)).toEqual({ state: 'unavailable' });
  });
  it('sorts deterministically, does not mutate input and returns detached summaries/coverage', () => {
    const input = fixture(); const earlier = structuredClone(input.records[0]); earlier.id = 'event-z';
    earlier.occurredAt = '2026-10-09T11:00:00Z'; input.records.unshift(earlier);
    input.records[1].summary.changedFields = ['request', 'attendance', 'attendance'];
    const before = structuredClone(input); const result = ready(input);
    expect(result.entries.map(e => e.id)).toEqual(['event-a', 'event-z']);
    expect(input).toEqual(before);
    result.entries[0].summary.changedFields.push('timecard'); result.coverage[0].historical.gaps[0].until = later;
    expect(input).toEqual(before);
  });
  it.each(['registry', 'start', 'type', 'purpose', 'operationActor', 'sourceTable', 'future', 'footprint', 'sourceCurrent', 'canonical'] as const)('fails closed for unverified %s event facts', seam => {
    const input = fixture(); const r = input.records[0]; input.coverage = [];
    if (seam === 'registry') input.definitions = [];
    if (seam === 'start') input.definitions[0].prospectiveFrom = null;
    if (seam === 'type') r.eventType = 'UNREGISTERED';
    if (seam === 'purpose') r.purpose = 'OTHER_PURPOSE';
    if (seam === 'operationActor' && r.provenance.kind === 'PROSPECTIVE') r.provenance.operation.actorId = 'other';
    if (seam === 'sourceTable') Object.assign(r.source, { table: 'employee_credentials' });
    if (seam === 'future') r.occurredAt = '2027-01-01T00:00:00Z';
    if (seam === 'footprint') r.footprint.complete = false;
    if (seam === 'sourceCurrent') r.authorization.current = false;
    if (seam === 'canonical') r.authorization.canonicalAllowed = false;
    const result = projectActivity(input);
    expect(result.state === 'unavailable' || result.state === 'ready' && result.count === 0).toBe(true);
  });
  it('does not mislabel an earlier event as prospective or infer a previously unrecorded proof kind', () => {
    const input = fixture(); input.records[0].occurredAt = '2026-01-01T00:00:00Z';
    expect(ready(input).entries).toEqual([]);
    input.records[0].occurredAt = at; input.records[0].actor.proofKind = null;
    expect(ready(input).entries).toEqual([]);
  });
  it('does not invent preserved event kinds, ledger provenance or whole-history completeness', () => {
    const input = fixture(); input.records[0].actor.proofKind = null;
    input.records[0].provenance = { kind: 'PRESERVED', ledger: { workspaceId: 'tenant-a', table: 'time_correction_events', id: 'old-event', version: '3', digest: null }, sourceEventType: 'INVENTED' };
    expect(ready(input).entries).toEqual([]);
    input.coverage[0].historical.gaps = [];
    expect(ready(input).coverage).toEqual([]);
  });
  it('retains worker service provenance without granting new authority or exposing credential facts', () => {
    const input = fixture(); const r = input.records[0];
    r.actor = { workspaceId: 'tenant-a', kind: 'SERVICE', id: 'worker-a', proofKind: 'WORKER' };
    if (r.provenance.kind === 'PROSPECTIVE') r.provenance.operation.actorId = 'worker-a';
    Object.assign(r.actor, { workerCredentialDigest: 'PRIVATE_CREDENTIAL' });
    expect(ready(input).entries[0].actor).toEqual({ kind: 'SERVICE', id: 'worker-a', proofKind: 'WORKER' });
  });
  it('fails closed for malformed containers and never invokes an accessor', () => {
    let invoked = 0; const accessor = fixture();
    Object.defineProperty(accessor.records[0], 'privatePayload', { enumerable: true, get() { invoked++; throw new Error('secret'); } });
    const sparse = fixture(); sparse.records = new Array(1);
    for (const value of [undefined, null, [], { ...fixture(), actor: null }, accessor, sparse,
      { ...fixture(), records: null }, { ...fixture(), coverage: [null] }, { ...fixture(), definitions: [null] }]) {
      expect(projectActivity(value)).toEqual({ state: 'unavailable' });
    }
    expect(invoked).toBe(0);
  });
  it('discards foreign opaque rows before traversing their private payload or accessors', () => {
    const input = fixture(); const baseline = projectActivity(input); let invoked = 0;
    const foreign = { workspaceId: 'tenant-b' };
    Object.defineProperty(foreign, 'privatePayload', { enumerable: true, get() { invoked++; throw new Error('PRIVATE_FOREIGN'); } });
    input.records.push(foreign as ActivityRecordObservation);
    input.coverage.push(foreign as ActivityProjectionInput['coverage'][number]);
    expect(projectActivity(input)).toEqual(baseline);
    expect(invoked).toBe(0);
  });
  it.each(['employee_credentials', 'employee_sessions', 'clocker_device_credentials', 'employee_clocker_pins', 'password_recovery_proofs', 'calendar_subscriptions'])('refuses a registry that admits credential-bearing source table %s', sourceTable => {
    const input = fixture(); (input.definitions[0].sourceTables as string[]).push(sourceTable);
    Object.assign(input.records[0].source, { table: sourceTable });
    expect(projectActivity(input)).toEqual({ state: 'unavailable' });
  });
  it('withholds actor identity as well as source detail when their fields are denied', () => {
    const input = fixture(); input.requestedFields = ['audit.metadata', 'attendance'];
    expect(ready(input).entries[0]).toEqual({ id: 'event-a', eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION',
      occurredAt: at, provenanceKind: 'PROSPECTIVE', summary: { changedFields: ['attendance'] } });
    expect(ready(input).coverage).toEqual([]);
  });
  it('rejects cross-tenant preserved refs and invented preserved proof kind without copying their values', () => {
    const input = fixture(); const r = input.records[0];
    r.provenance = { kind: 'PRESERVED', ledger: { workspaceId: 'tenant-b', table: 'time_correction_events', id: 'foreign-ledger', version: '3', digest: null }, sourceEventType: 'APPROVED' };
    r.actor.proofKind = null; expect(ready(input).entries).toEqual([]);
    r.provenance.ledger.workspaceId = 'tenant-a'; r.actor.proofKind = 'PORTAL';
    expect(ready(input).entries).toEqual([]);
  });
  it('deduplicates identical permitted rows, but refuses conflicting permitted facts for one event identity', () => {
    const input = fixture(); input.records.push(structuredClone(input.records[0]));
    expect(ready(input).count).toBe(1);
    input.records[1].source.version = '8';
    expect(projectActivity(input)).toEqual({ state: 'unavailable' });
  });
  it('fails closed on sparse, extra-property, non-data, cyclic and non-plain structures without coercing them', () => {
    const extra = fixture(); Object.assign(extra.records, { hidden: 'PRIVATE' });
    const nonData = fixture(); Object.defineProperty(nonData.records, '0', { get() { throw new Error('PRIVATE'); } });
    const cyclic = fixture(); Object.assign(cyclic, { cycle: cyclic });
    const wrongPrototype = fixture(); Object.setPrototypeOf(wrongPrototype.records[0], { private: 'PRIVATE' });
    for (const value of [extra, nonData, cyclic, wrongPrototype, { ...fixture(), query: { changedFields: ['secret.pin'] } }]) {
      expect(projectActivity(value)).toEqual({ state: 'unavailable' });
    }
  });
  it.each(['id', 'sourceId', 'sourceVersion', 'actorId', 'operationId'] as const)('preserves padded long persisted %s exactly instead of normalizing or imposing a new size rule', seam => {
    const input = fixture(); const r = input.records[0]; const original = '  persisted-' + 'x'.repeat(500) + '  ';
    if (seam === 'id') r.id = original;
    if (seam === 'sourceId') r.source.id = original;
    if (seam === 'sourceVersion') r.source.version = original;
    if (seam === 'actorId' && r.provenance.kind === 'PROSPECTIVE') { r.actor.id = original; r.provenance.operation.actorId = original; }
    if (seam === 'operationId' && r.provenance.kind === 'PROSPECTIVE') r.provenance.operation.id = original;
    if (seam === 'sourceId') input.query = { sourceIds: [original] };
    expect(JSON.stringify(ready(input).entries[0])).toContain(original);
  });
  it('retains original padded ledger text keys and opaque source versions byte for byte', () => {
    const input = fixture(); const r = input.records[0]; const original = '  old-event-' + 'x'.repeat(500) + '  ';
    r.actor.proofKind = null;
    r.provenance = { kind: 'PRESERVED', ledger: { workspaceId: 'tenant-a', table: 'time_correction_events', id: original, version: original, digest: null }, sourceEventType: 'APPROVED' };
    expect(ready(input).entries[0].provenance).toMatchObject({ ledger: { id: original, version: original } });
  });
  it.each(['OWNER', 'MANAGER', 'EMPLOYEE', 'LEAD'] as const)('preserves exact padded/long %s authority keys through the frozen F6 policy', role => {
    const input = fixture();
    if (role === 'MANAGER') manager(input);
    if (role === 'EMPLOYEE' || role === 'LEAD') self(input, role);
    const pad = (id: string) => '  ' + id + '-' + 'x'.repeat(500) + '  ';
    input.workspace.id = pad(input.workspace.id); input.actor.workspaceId = input.workspace.id; input.actor.id = pad(input.actor.id);
    if (input.actor.administrativeScope?.kind === 'LOCATIONS') input.actor.administrativeScope.locationIds = input.actor.administrativeScope.locationIds.map(pad);
    for (const observation of [...input.records, ...input.coverage]) {
      observation.workspaceId = input.workspace.id; observation.footprint.locationIds = observation.footprint.locationIds.map(pad);
      const a = observation.authorization; a.workspaceId = input.workspace.id;
      a.locations = a.locations.map(l => ({ ...l, id: pad(l.id), workspaceId: input.workspace.id }));
      a.subject = { ...a.subject!, id: pad(a.subject!.id), workspaceId: input.workspace.id, locationIds: a.subject!.locationIds.map(pad) };
      a.resourceOwnerEmployeeId = pad(a.resourceOwnerEmployeeId!);
    }
    const r = input.records[0]; r.source.workspaceId = input.workspace.id; r.actor.workspaceId = input.workspace.id; r.actor.id = pad(r.actor.id!);
    if (r.provenance.kind === 'PROSPECTIVE') { r.provenance.operation.workspaceId = input.workspace.id; r.provenance.operation.actorId = r.actor.id; }
    expect(ready(input).count).toBe(1);
    r.authorization.locations[0].id = r.authorization.locations[0].id.trim();
    expect(ready(input).entries).toEqual([]);
  });
  it('preserves legitimate explicit undefined optional observations without relaxing required fields', () => {
    const input = fixture(); const baseline = projectActivity(input);
    input.query = undefined; input.records[0].authorization.review = undefined;
    input.coverage[0].authorization.review = undefined;
    expect(projectActivity(input)).toEqual(baseline);
    input.query = { from: undefined, sourceIds: undefined };
    expect(projectActivity(input)).toEqual(baseline);
    expect(projectActivity({ ...input, actor: undefined })).toEqual({ state: 'unavailable' });
  });
  it('keeps source and occurred-at timestamp text with recorded microseconds and offset unchanged', () => {
    const input = fixture(); const stamp = '2026-10-09T12:00:00.123456+00:00';
    input.records[0].occurredAt = stamp; input.records[0].source.version = stamp;
    expect(ready(input).entries[0]).toMatchObject({ occurredAt: stamp, source: { version: stamp } });
  });
  it.each(['EMPLOYEE', 'LEAD'] as const)('does not widen %s own correction history into actor/operation/hash metadata', role => {
    const input = fixture(); self(input, role);
    expect(ready(input).entries[0]).toEqual({ id: 'event-a', eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION',
      occurredAt: at, provenanceKind: 'PROSPECTIVE', source: { table: 'time_correction_requests', id: 'request-a', version: '7' },
      summary: { changedFields: ['attendance', 'request'] } });
  });
  it('keeps adapter detail permissions as a ceiling for Owner and filters only visible source references', () => {
    const input = fixture(); input.records[0].detailPermissions = [];
    const entry = ready(input).entries[0];
    expect(entry.actor).toBeUndefined(); expect(entry.source).toBeUndefined(); expect(entry.provenance).toBeUndefined();
    input.query = { sourceIds: ['request-a'] }; expect(ready(input).count).toBe(0);
  });
  it('separates reference permission from exact source/history hash permission', () => {
    const input = fixture(); const r = input.records[0]; r.actor.proofKind = null;
    r.provenance = { kind: 'PRESERVED', ledger: { workspaceId: 'tenant-a', table: 'time_correction_events', id: 'old-event', version: '3', digest: 'b'.repeat(64) }, sourceEventType: 'APPROVED' };
    r.detailPermissions = ['SOURCE_REFERENCE', 'PROVENANCE_REFERENCE'];
    const projected = ready(input).entries[0];
    expect(projected.source).toEqual({ table: 'time_correction_requests', id: 'request-a', version: '7' });
    expect(projected.provenance).toEqual({ kind: 'PRESERVED', ledger: { table: 'time_correction_events', id: 'old-event', version: '3' }, sourceEventType: 'APPROVED' });
    expect(JSON.stringify(projected)).not.toContain('b'.repeat(64));
  });
});
