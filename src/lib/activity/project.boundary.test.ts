// These vectors call the real public projector. No mocked policy or private helper.
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

// Every assertion runs after restoration, even if the projector throws.
// The callback is the real public projection, not an extracted/replaced helper.
function withPrototypeProperty<T>(name: string, descriptor: PropertyDescriptor, callback: () => T): T {
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, name);
  Object.defineProperty(Object.prototype, name, descriptor);
  try { return callback(); }
  finally {
    delete (Object.prototype as Record<string, unknown>)[name];
    if (previous) Object.defineProperty(Object.prototype, name, previous);
  }
}

const proxySeams = ['root', 'workspace', 'actor', 'authority', 'definitions', 'definition', 'records', 'record',
  'source', 'coverage', 'coverage-row', 'requested-fields', 'effective-capabilities', 'authorization-locations',
  'query', 'private-payload', 'foreign-record'] as const;
const valueSeams = ['workspace', 'workspace-id', 'actor-id', 'record-id', 'record-workspace', 'records-index'] as const;
const sparseSeams = ['records', 'coverage', 'requested-fields'] as const;
const accessorSeams = ['workspace', 'workspace-id', 'record-workspace', 'records-index'] as const;
const invalidSeams = ['sparse', 'extra', 'symbol', 'prototype', 'cycle', 'callable'] as const;

describe('activity projector inert observation boundary', () => {
  it.each(proxySeams)('rejects transparent Proxy at %s before any trap', seam => {
    const input = fixture(); let traps = 0;
    const wrap = <T extends object>(target: T): T => new Proxy(target, {
      get(t, property, receiver) { traps++; return Reflect.get(t, property, receiver); },
      getPrototypeOf(t) { traps++; return Reflect.getPrototypeOf(t); },
      ownKeys(t) { traps++; return Reflect.ownKeys(t); },
      getOwnPropertyDescriptor(t, property) { traps++; return Reflect.getOwnPropertyDescriptor(t, property); },
      has(t, property) { traps++; return Reflect.has(t, property); },
    });
    let value: unknown = input;
    if (seam === 'root') value = wrap(input);
    if (seam === 'workspace') input.workspace = wrap(input.workspace);
    if (seam === 'actor') input.actor = wrap(input.actor);
    if (seam === 'authority') input.authority = wrap(input.authority);
    if (seam === 'definitions') input.definitions = wrap(input.definitions);
    if (seam === 'definition') input.definitions[0] = wrap(input.definitions[0]);
    if (seam === 'records') input.records = wrap(input.records);
    if (seam === 'record') input.records[0] = wrap(input.records[0]);
    if (seam === 'source') input.records[0].source = wrap(input.records[0].source);
    if (seam === 'coverage') input.coverage = wrap(input.coverage);
    if (seam === 'coverage-row') input.coverage[0] = wrap(input.coverage[0]);
    if (seam === 'requested-fields') input.requestedFields = wrap(input.requestedFields);
    if (seam === 'effective-capabilities') input.actor.effectiveAdministrativeCapabilities = wrap(input.actor.effectiveAdministrativeCapabilities);
    if (seam === 'authorization-locations') input.records[0].authorization.locations = wrap(input.records[0].authorization.locations);
    if (seam === 'query') input.query = wrap({ sourceIds: ['request-a'] });
    if (seam === 'private-payload') Object.assign(input.records[0], { privatePayload: wrap({ body: 'PRIVATE' }) });
    if (seam === 'foreign-record') input.records.push(wrap({ workspaceId: 'tenant-b' }) as ActivityRecordObservation);
    const result = projectActivity(value);
    expect({ result, traps }).toEqual({ result: { state: 'unavailable' }, traps: 0 });
  });

  it.each(valueSeams)('rejects inherited descriptor.value at %s without either accessor', seam => {
    const input = fixture(); let accessorReads = 0, inheritedReads = 0;
    let target: object = input, property = 'workspace', replacement: unknown = input.workspace;
    if (seam === 'workspace-id') { target = input.workspace; property = 'id'; replacement = 'tenant-a'; }
    if (seam === 'actor-id') { target = input.actor; property = 'id'; replacement = 'owner-a'; }
    if (seam === 'record-id') { target = input.records[0]; property = 'id'; replacement = 'event-a'; }
    if (seam === 'record-workspace') { target = input.records[0]; property = 'workspaceId'; replacement = 'tenant-b'; }
    if (seam === 'records-index') { target = input.records; property = '0'; replacement = input.records[0]; }
    Object.defineProperty(target, property, { configurable: true, enumerable: true,
      get() { accessorReads++; throw new Error('PRIVATE_ACCESSOR'); } });
    // A null-prototype descriptor prevents the pollution setup itself from
    // inheriting a conflicting value/get member through ToPropertyDescriptor.
    const injected = Object.assign(Object.create(null), { configurable: true, enumerable: false,
      get() { inheritedReads++; return replacement; } }) as PropertyDescriptor;
    const result = withPrototypeProperty('value', injected, () => projectActivity(input));
    expect({ result, inheritedReads, accessorReads }).toEqual({ result: { state: 'unavailable' }, inheritedReads: 0, accessorReads: 0 });
  });

  it.each(sparseSeams)('rejects sparse %s with compensating own key and inherited numeric descriptor', seam => {
    const input = fixture();
    const original = seam === 'records' ? input.records[0] : seam === 'coverage' ? input.coverage[0] : input.requestedFields[0];
    const sparse: unknown[] = new Array(1);
    // Count matches old length+1 check; index 0 is still absent as an own key.
    Object.assign(sparse, { compensatingKey: 'IGNORED' });
    if (seam === 'records') input.records = sparse as ActivityProjectionInput['records'];
    if (seam === 'coverage') input.coverage = sparse as ActivityProjectionInput['coverage'];
    if (seam === 'requested-fields') input.requestedFields = sparse as ActivityProjectionInput['requestedFields'];
    const inheritedDescriptor = { value: original, enumerable: true, configurable: true, writable: true };
    const result = withPrototypeProperty('0', { value: inheritedDescriptor, configurable: true, writable: true }, () => projectActivity(input));
    expect(result).toEqual({ state: 'unavailable' });
  });

  it.each(accessorSeams)('rejects ordinary own accessor at %s without invoking it', seam => {
    const input = fixture(); let reads = 0; let target: object = input, property = 'workspace';
    if (seam === 'workspace-id') { target = input.workspace; property = 'id'; }
    if (seam === 'record-workspace') { target = input.records[0]; property = 'workspaceId'; }
    if (seam === 'records-index') { target = input.records; property = '0'; }
    Object.defineProperty(target, property, { configurable: true, enumerable: true,
      get() { reads++; throw new Error('PRIVATE_ACCESSOR'); } });
    expect({ result: projectActivity(input), reads }).toEqual({ result: { state: 'unavailable' }, reads: 0 });
  });

  it.each(invalidSeams)('preserves refusal of non-data structure %s', seam => {
    const input = fixture(); let calls = 0;
    if (seam === 'sparse') input.records = new Array(1);
    if (seam === 'extra') Object.assign(input.records, { extra: 'PRIVATE' });
    if (seam === 'symbol') Object.assign(input.records, { [Symbol('PRIVATE')]: true });
    if (seam === 'prototype') Object.setPrototypeOf(input.records[0], { private: 'PRIVATE' });
    if (seam === 'cycle') Object.assign(input.records[0], { cycle: input });
    if (seam === 'callable') Object.assign(input.records[0], { privatePayload: () => { calls++; return 'PRIVATE'; } });
    expect({ result: projectActivity(input), calls }).toEqual({ result: { state: 'unavailable' }, calls: 0 });
  });

  it('rejects a revoked Proxy without relying on metadata exceptions', () => {
    const revoked = Proxy.revocable(fixture(), {}); revoked.revoke();
    expect(projectActivity(revoked.proxy)).toEqual({ state: 'unavailable' });
  });

  it.each(['READ', 'EXPORT', 'COUNT'] as const)('preserves valid %s observations and private field redaction', mode => {
    const input = fixture(); input.mode = mode;
    Object.assign(input.records[0], { privatePayload: { password: 'PRIVATE_PASSWORD', bearer: 'PRIVATE_BEARER' } });
    const baseline = fixture(); baseline.mode = mode;
    const result = projectActivity(input);
    expect(result).toEqual(projectActivity(baseline));
    expect(result).toMatchObject({ state: 'ready', mode, count: 1 });
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
    if (mode === 'COUNT') expect(result).toEqual({ state: 'ready', mode, observedAt: later, count: 1 });
  });

  it('keeps foreign own-data-bound rows opaque before payload accessors or nested proxies', () => {
    const input = fixture(); const baseline = projectActivity(input); let reads = 0, traps = 0;
    const foreign = { workspaceId: 'tenant-b', nested: new Proxy({}, { ownKeys(t) { traps++; return Reflect.ownKeys(t); } }) };
    Object.defineProperty(foreign, 'privatePayload', { enumerable: true, get() { reads++; throw new Error('PRIVATE_FOREIGN'); } });
    input.records.push(foreign as unknown as ActivityRecordObservation);
    input.coverage.push(foreign as unknown as ActivityProjectionInput['coverage'][number]);
    expect({ result: projectActivity(input), reads, traps }).toEqual({ result: baseline, reads: 0, traps: 0 });
  });

  it('preserves detached public output while leaving original source facts unchanged', () => {
    const input = fixture(), before = structuredClone(input), result = projectActivity(input);
    expect(result.state).toBe('ready');
    if (result.state !== 'ready' || result.mode === 'COUNT') throw new Error('Expected read projection');
    result.entries[0].summary.changedFields.push('timecard');
    result.coverage[0].historical.gaps[0].until = later;
    if (result.entries[0].source) result.entries[0].source.id = 'changed-output';
    expect(input).toEqual(before);
    expect(projectActivity(input)).toMatchObject({ state: 'ready', count: 1 });
  });

  it('preserves explicit undefined optional observations', () => {
    const input = fixture(), baseline = projectActivity(input);
    input.query = undefined; input.records[0].authorization.review = undefined;
    input.coverage[0].authorization.review = undefined;
    expect(projectActivity(input)).toEqual(baseline);
  });

  it('preserves exact long padded IDs and opaque source versions', () => {
    const input = fixture(), persisted = '  old-' + 'x'.repeat(500) + '  ';
    input.records[0].id = persisted; input.records[0].source.id = persisted; input.records[0].source.version = persisted;
    const result = projectActivity(input);
    expect(result).toMatchObject({ state: 'ready', count: 1 });
    if (result.state !== 'ready' || result.mode === 'COUNT') throw new Error('Expected read projection');
    expect(result.entries[0]).toMatchObject({ id: persisted, source: { id: persisted, version: persisted } });
  });

  it('continues to accept inert null-prototype records', () => {
    const input = fixture(), baseline = projectActivity(input);
    input.records[0] = Object.assign(Object.create(null), input.records[0]) as ActivityRecordObservation;
    expect(projectActivity(input)).toEqual(baseline);
  });
});
