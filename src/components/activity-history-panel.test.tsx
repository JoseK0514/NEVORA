import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { projectActivity } from '../lib/activity/project';
import type { ActivityProjectionInput, ActivityRecordObservation } from '../lib/activity/types';
import type { ActivityHistoryPanelProps, ActivityHistoryObservationBinding } from './activity-history-panel';

// Actual unchanged projector + F6 evaluator on fictional local observations.
// No DB/private issuer/authority is created. A missing new panel fails each
// feature assertion, not test collection or an absent import assertion.
const modulePath = './activity-history-panel';
const surface = await import(modulePath).catch(() => null);
const AT = '2026-10-09T12:00:00Z', OBSERVED = '2026-10-09T13:00:00Z';
const fields: ActivityProjectionInput['requestedFields'] = ['audit.metadata', 'audit.source', 'employee.identity', 'attendance', 'request', 'timecard'];
function fixture(): ActivityProjectionInput {
 const authorization: ActivityRecordObservation['authorization'] = {
  workspaceId: 'tenant-a', current: true, footprintComplete: true, canonicalAllowed: true,
  permittedFields: [...fields], locations: [{ id: 'loc-a', workspaceId: 'tenant-a', active: true }, { id: 'loc-b', workspaceId: 'tenant-a', active: false }],
  subject: { id: 'employee-a', workspaceId: 'tenant-a', role: 'EMPLOYEE', workforceActive: true, portalState: 'ENABLED', identityVerified: true, locationIds: ['loc-a'] },
  resourceOwnerEmployeeId: 'employee-a',
 };
 return {
  actor: { id: 'owner-a', workspaceId: 'tenant-a', role: 'OWNER', workforceActive: true, portalState: 'ENABLED', administrativeScope: null, effectiveAdministrativeCapabilities: [] },
  workspace: { id: 'tenant-a', active: true }, authority: { membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, capturedSelfChange: false },
  observedAt: OBSERVED, mode: 'READ', requestedFields: [...fields],
  definitions: [{ eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION', family: 'TIME_CORRECTION', sourceTables: ['time_correction_requests'],
   prospectiveFrom: '2026-10-09T00:00:00Z', managementCapability: 'timecard.read', selfCapability: 'self.time.read',
   summaryFields: ['attendance', 'request', 'timecard'], preservedKinds: { time_correction_events: ['REQUESTED', 'APPROVED', 'REJECTED'] } }],
  records: [{ workspaceId: 'tenant-a', id: 'event-a', eventType: 'TIME_CORRECTION_APPROVED', purpose: 'TIME_CORRECTION', occurredAt: AT,
   actor: { workspaceId: 'tenant-a', kind: 'EMPLOYEE', id: 'manager-a', proofKind: 'PORTAL' },
   source: { workspaceId: 'tenant-a', table: 'time_correction_requests', id: 'request-a', version: '7', digest: 'a'.repeat(64) },
   provenance: { kind: 'PROSPECTIVE', operation: { workspaceId: 'tenant-a', actorId: 'manager-a', purpose: 'TIME_CORRECTION', id: 'operation-a' } },
   footprint: { complete: true, locationIds: ['loc-a'] }, authorization,
   detailPermissions: ['ACTOR_IDENTITY', 'SOURCE_REFERENCE', 'SOURCE_HASH', 'PROVENANCE_REFERENCE', 'PROVENANCE_HASH'],
   summary: { changedFields: ['attendance', 'request'] } }],
  coverage: [{ workspaceId: 'tenant-a', family: 'TIME_CORRECTION', definitionType: 'TIME_CORRECTION_APPROVED', footprint: { complete: true, locationIds: ['loc-a'] },
   authorization: structuredClone(authorization), historical: { state: 'PRESERVED_HISTORY', observedFrom: '2026-01-01T00:00:00Z', observedThrough: AT,
    ledgers: ['time_correction_events'], gaps: [{ from: null, until: '2026-10-09T00:00:00Z', reason: 'PRE_F_NOT_INSTRUMENTED' }] } }],
 };
}
function preserved(input: ActivityProjectionInput) {
 const r = input.records[0]; r.occurredAt = '2026-01-01T03:00:00Z'; r.actor.proofKind = null;
 r.provenance = { kind: 'PRESERVED', ledger: { workspaceId: input.workspace.id, table: 'time_correction_events', id: 'original-ledger-key', version: '3', digest: 'b'.repeat(64) }, sourceEventType: 'APPROVED' };
}
function own(input: ActivityProjectionInput, role: 'EMPLOYEE' | 'LEAD') {
 input.actor = { ...input.actor, id: 'employee-a', role };
 for (const source of [...input.records.map(r => r.authorization), ...input.coverage.map(c => c.authorization)]) source.subject = { ...source.subject!, role };
 input.records.forEach(r => { r.detailPermissions = ['SOURCE_REFERENCE']; });
}
function observation(input: ActivityProjectionInput): ActivityHistoryObservationBinding {
 return { workspaceId: input.workspace.id, actorId: input.actor.id, sessionVersion: 'session-1', grantsVersion: 'grant-1', scopeVersion: 'scope-1',
  incarnation: '1', sourceVersion: 'source-1', queryVersion: 'query-1', mode: 'READ', observedAt: input.observedAt };
}
function ready(input: ActivityProjectionInput) {
 const projection = projectActivity(input); expect(projection.state, 'actual projector fixture').toBe('ready');
 if (projection.state !== 'ready' || projection.mode !== 'READ') throw Error('Expected genuine READ projection'); return projection;
}
function render(input = fixture(), changes: Partial<ActivityHistoryPanelProps> = {}) {
 const renderer = surface?.ActivityHistoryPanel;
 expect(renderer, 'unused F5 activity history panel must be implemented').toBeTypeOf('function');
 const binding = observation(input);
 const props: ActivityHistoryPanelProps = { result: { state: 'projection', projection: projectActivity(input), binding },
  expected: { ...binding }, connection: 'ready', sourceCurrent: true, ...changes };
 return renderToStaticMarkup(createElement(renderer, props));
}
function noPrivateHistory(html: string) {
 expect(html).not.toContain('Observed activity count'); expect(html).not.toContain('data-activity-id'); expect(html).not.toContain('Historical coverage');
 expect(html).not.toContain('event-a'); expect(html).not.toContain('request-a'); expect(html).not.toContain('manager-a'); expect(html).not.toContain('operation-a');
 expect(html).not.toContain('TIME_CORRECTION'); expect(html).not.toContain('time_correction_events'); expect(html).not.toContain(AT);
 expect(html).not.toContain('<details'); expect(html).not.toContain('a'.repeat(64));
}
function noActions(html: string) {
 expect(html).not.toMatch(/<(?:button|a|form|input|textarea|select)\b/);
 expect(html).not.toMatch(/Export|Download|Revert|Restore|Filter|Sort|Retry/);
}

describe('unused read-only F5 activity history presentation', () => {
 it('shows exact scoped prospective event codes/time/changed fields and an observed-only count', () => {
  const input = fixture(), projection = ready(input), html = render(input);
  expect(projection.count).toBe(1); expect(html).toContain('Observed activity count: 1');
  expect(html).toContain('Only observed activity is shown. Historical recording may be incomplete.');
  expect(html).toContain('TIME_CORRECTION_APPROVED'); expect(html).toContain('TIME_CORRECTION'); expect(html).toContain('Prospective');
  expect(html).toContain(`<time dateTime="${AT}">`); expect(html).toContain('Changed field codes'); expect(html).toContain('attendance'); expect(html).toContain('request');
  expect(html).not.toMatch(/Historical total|All activity|Complete history/); noActions(html);
 });
 it('shows included actor/source/operation facts literally without manufacturing a display name', () => {
  const html = render(); expect(html).toContain('manager-a'); expect(html).toContain('Employee'); expect(html).toContain('PORTAL');
  expect(html).toContain('request-a'); expect(html).toContain('time_correction_requests'); expect(html).toContain('Source version'); expect(html).toContain('7');
  expect(html).toContain('a'.repeat(64)); expect(html).toContain('operation-a'); expect(html).not.toContain('Manager A');
  expect(html).not.toContain('owner-a'); expect(html).not.toContain('source-1'); expect(html).not.toContain('session-1'); noActions(html);
 });
 it('distinguishes preserved original ledger provenance without converting legacy unknown proof into a new event', () => {
  const input = fixture(); preserved(input); const p = ready(input), html = render(input);
  expect(p.entries[0].provenanceKind).toBe('PRESERVED'); expect(html).toContain('Preserved'); expect(html).toContain('original-ledger-key');
  expect(html).toContain('time_correction_events'); expect(html).toContain('b'.repeat(64)); expect(html).toContain('APPROVED');
  expect(html).toContain('Proof kind not observed'); expect(html).not.toContain('operation-a'); expect(html).not.toContain('PORTAL'); noActions(html);
 });
 it('retains an explicitly unknown preserved actor without inventing an actor identity', () => {
  const input = fixture(); preserved(input); input.records[0].actor.kind = 'UNKNOWN'; input.records[0].actor.id = null;
  expect(ready(input).entries[0].actor).toEqual({ kind: 'UNKNOWN', id: null, proofKind: null }); const html = render(input);
  expect(html).toContain('Unknown'); expect(html).toContain('Actor identity not observed'); expect(html).not.toContain('manager-a');
 });
 it.each(['EMPLOYEE', 'LEAD'] as const)('does not widen actual %s own history into actor/operation/hash details', role => {
  const input = fixture(); own(input, role); const p = ready(input); expect(p.entries[0].actor).toBeUndefined(); expect(p.entries[0].provenance).toBeUndefined();
  const html = render(input); expect(html).toContain('request-a'); expect(html).toContain('Prospective');
  expect(html).not.toContain('manager-a'); expect(html).not.toContain('operation-a'); expect(html).not.toContain('a'.repeat(64));
  expect(html).not.toContain('Actor identity not observed'); noActions(html);
 });
 it('omits every optional identity/reference block when the actual adapter ceiling withholds them, even for Owner', () => {
  const input = fixture(); input.records[0].detailPermissions = []; input.coverage = [];
  const p = ready(input); expect(p.entries[0].actor).toBeUndefined(); expect(p.entries[0].source).toBeUndefined(); expect(p.entries[0].provenance).toBeUndefined();
  const html = render(input); expect(html).toContain('TIME_CORRECTION_APPROVED'); expect(html).not.toContain('manager-a');
  expect(html).not.toContain('request-a'); expect(html).not.toContain('operation-a'); expect(html).not.toContain('Source version');
  expect(html).not.toContain('Actor identity not observed'); expect(html).not.toContain('Source hash');
 });
 it('keeps reference permission separate from source and preserved-ledger hash permission', () => {
  const input = fixture(); preserved(input); input.records[0].detailPermissions = ['SOURCE_REFERENCE', 'PROVENANCE_REFERENCE'];
  const p = ready(input); expect(p.entries[0].source).not.toHaveProperty('digest'); const html = render(input);
  expect(html).toContain('request-a'); expect(html).toContain('original-ledger-key'); expect(html).not.toContain('Source hash'); expect(html).not.toContain('Ledger hash');
  expect(html).not.toContain('a'.repeat(64)); expect(html).not.toContain('b'.repeat(64));
 });
 it('renders explicitly observed null hashes as not observed instead of inventing a checksum', () => {
  const input = fixture(); preserved(input); input.records[0].source.digest = null;
  if (input.records[0].provenance.kind !== 'PRESERVED') throw Error('fixture'); input.records[0].provenance.ledger.digest = null;
  const p = ready(input); expect(p.entries[0].source).toHaveProperty('digest', null); const html = render(input);
  expect(html).toContain('Source hash'); expect(html).toContain('Ledger hash'); expect(html).toContain('Not observed');
  expect(html).not.toContain('null'); expect(html).not.toContain('a'.repeat(64));
 });
 it('shows included preserved historical coverage and explicit pre-F gap bounds independently of entries', () => {
  const html = render(); expect(html).toContain('Historical coverage'); expect(html).toContain('Preserved historical observations');
  expect(html).toContain('2026-01-01T00:00:00Z'); expect(html).toContain(AT); expect(html).toContain('time_correction_events');
  expect(html).toContain('Pre-F activity was not instrumented'); expect(html).toContain('Start not observed');
  expect(html).toContain('2026-10-09T00:00:00Z'); expect(html).not.toContain('No historical gaps');
 });
 it.each(['NOT_OBSERVED', 'UNKNOWN'] as const)('keeps empty entries separate from actual %s historical coverage', state => {
  const input = fixture(); input.records = []; input.coverage[0].historical = { state, observedFrom: null, observedThrough: null, ledgers: [],
   gaps: [{ from: null, until: null, reason: 'SOURCE_NOT_OBSERVED' }] };
  expect(ready(input).coverage[0].historical.state).toBe(state); const html = render(input);
  expect(html).toContain('Observed activity count: 0'); expect(html).toContain('No activity entries were observed for this view.');
  expect(html).toContain(state === 'NOT_OBSERVED' ? 'Historical activity not observed' : 'Historical coverage unknown');
  expect(html).toContain('Source not observed'); expect(html).toContain('End not observed'); expect(html).not.toContain('No activity occurred');
 });
 it('states missing coverage as missing observation rather than empty or fully recorded history', () => {
  const input = fixture(); input.records = []; input.coverage = []; const html = render(input);
  expect(html).toContain('Historical coverage was not supplied for this view.'); expect(html).toContain('Observed activity count: 0');
  expect(html).not.toMatch(/No historical activity|No historical gaps|Complete history/);
 });
 it('retains all supplied gap reason kinds and literal fractional/offset time observations', () => {
  const input = fixture(); input.records[0].occurredAt = '2026-10-09T12:00:00.123456+00:00'; input.records[0].source.version = input.records[0].occurredAt;
  input.coverage[0].historical.gaps.push({ from: AT, until: OBSERVED, reason: 'ADAPTER_LIMIT' });
  const html = render(input); expect(html).toContain('2026-10-09T12:00:00.123456+00:00'); expect(html).toContain('Adapter observation limit');
  expect(html).toContain(`<time dateTime="${OBSERVED}">`);
 });
 it('does not describe an empty included changed-field list as no change', () => {
  const input = fixture(); input.records[0].summary.changedFields = []; expect(ready(input).entries[0].summary.changedFields).toEqual([]);
  const html = render(input); expect(html).toContain('No changed field codes were included in this observation.'); expect(html).not.toContain('Nothing changed');
 });
 it('preserves the canonical projector ordering without adding another sorter or deriving extra events', () => {
  const input = fixture(); const next = structuredClone(input.records[0]); next.id = 'event-z'; next.occurredAt = '2026-10-09T12:30:00Z';
  input.records.push(next); const p = ready(input); expect(p.entries.map(e => e.id)).toEqual(['event-z', 'event-a']); const html = render(input);
  expect(html.indexOf('data-activity-id="event-z"')).toBeLessThan(html.indexOf('data-activity-id="event-a"'));
  expect(html).toContain('Observed activity count: 2'); noActions(html);
 });
 it('excludes foreign events and source payload values through the actual projector, without adding omission totals', () => {
  const input = fixture(), foreign = structuredClone(input.records[0]); foreign.workspaceId = 'tenant-b'; foreign.id = 'PRIVATE_FOREIGN'; input.records.push(foreign);
  Object.assign(input.records[0], { payload: { note: 'PRIVATE_NOTE', credential: 'PRIVATE_TOKEN' } });
  const p = ready(input); expect(p.count).toBe(1); const html = render(input); expect(html).not.toMatch(/PRIVATE_|omitted|hidden count/);
 });
 it('does not enumerate/spread/stringify arbitrary extra payload fields attached to a public DTO', () => {
  const input = fixture(), p = ready(input); let reads = 0;
  Object.defineProperty(p.entries[0], 'privatePayload', { enumerable: true, get() { reads++; return 'PRIVATE_PAYLOAD'; } });
  Object.assign(p.entries[0].summary, { values: { notes: 'PRIVATE_NOTE' } });
  const html = render(input, { result: { state: 'projection', projection: p, binding: observation(input) } });
  expect(reads).toBe(0); expect(html).not.toMatch(/PRIVATE_PAYLOAD|PRIVATE_NOTE|values/);
 });
 it('retains padded long original keys and escapes literal markup with existing wrapping disclosure classes', () => {
  const input = fixture(), r = input.records[0], id = '  original-' + 'x'.repeat(240) + '<script>literal</script>  ';
  r.id = id; r.source.id = id; r.source.version = id; r.actor.id = id;
  if (r.provenance.kind !== 'PROSPECTIVE') throw Error('fixture'); r.provenance.operation.actorId = id; r.provenance.operation.id = id;
  expect(ready(input).entries[0].id).toBe(id); const html = render(input);
  expect(html).toContain('  original-' + 'x'.repeat(240)); expect(html).toContain('&lt;script&gt;literal&lt;/script&gt;  ');
  expect(html).not.toContain('<script>'); expect(html).toContain('shift-change-history'); expect(html).toContain('shift-policy-disclosure'); noActions(html);
 });
 it('uses named native ordered/disclosure/list/time/status semantics without action controls', () => {
  const html = render(); expect(html).toContain('aria-label="Activity history"'); expect(html).toContain('role="status"');
  expect(html).toContain('<ol aria-label="Observed activity entries">'); expect(html).toContain('<details'); expect(html).toContain('<summary>');
  expect(html).toContain('schedule-publication-change'); expect(html).not.toContain('<details open'); noActions(html);
 });
 it.each(['workspaceId', 'actorId', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation', 'sourceVersion', 'queryVersion', 'mode', 'observedAt'] as const)
 ('clears entries/count/coverage on replaced expected %s', field => {
  const input = fixture(), expected = observation(input); Object.assign(expected, { [field]: 'replacement' });
  const html = render(input, { expected }); noPrivateHistory(html); noActions(html); expect(html).toContain('no longer current');
 });
 it('does not attach an older observedAt DTO to a matching new envelope', () => {
  const input = fixture(), p = ready(input), binding = observation(input); binding.observedAt = '2026-10-09T14:00:00Z';
  const html = render(input, { expected: binding, result: { state: 'projection', projection: p, binding } }); noPrivateHistory(html);
 });
 it('uses exact timestamp text equality rather than collapsing a different observation spelling into the same instant', () => {
  const input = fixture(), p = ready(input), binding = observation(input); binding.observedAt = '2026-10-09T13:00:00.000Z';
  noPrivateHistory(render(input, { expected: binding, result: { state: 'projection', projection: p, binding } }));
 });
 it.each(['COUNT', 'EXPORT'] as const)('withholds an actual canonical %s projection from this READ display', mode => {
  const input = fixture(); input.mode = mode; const p = projectActivity(input); expect(p.state).toBe('ready');
  if (p.state !== 'ready') throw Error('fixture'); expect(p.mode).toBe(mode);
  const html = render(input); noPrivateHistory(html); noActions(html); expect(html).toContain('unavailable');
 });
 it.each(['COUNT', 'EXPORT'] as const)('rejects matching non-READ %s envelope observations even around an actual READ DTO', mode => {
  const input = fixture(), binding = observation(input); Object.assign(binding, { mode });
  noPrivateHistory(render(input, { expected: { ...binding }, result: { state: 'projection', projection: ready(input), binding } }));
 });
 it.each(['loading', 'offline', 'reconnecting', 'unavailable', 'access_lost', 'paused'] as const)('clears all history on connection %s', connection => {
  const html = render(fixture(), { connection }); noPrivateHistory(html); noActions(html);
  if (connection === 'loading') expect(html).toContain('aria-busy="true"');
 });
 it.each(['loading', 'error'] as const)('clears all history in explicit %s result', state => {
  const html = render(fixture(), { result: { state } }); noPrivateHistory(html); noActions(html);
  if (state === 'loading') expect(html).toContain('aria-busy="true"');
 });
 it('suppresses missing binding/null projection/explicit source invalidation without inferring an empty history', () => {
  const input = fixture(); for (const changes of [{ result: { state: 'projection' as const, projection: ready(input), binding: null } },
   { result: { state: 'projection' as const, projection: null, binding: observation(input) } }, { sourceCurrent: false }]) {
   const html = render(input, changes); noPrivateHistory(html); expect(html).not.toContain('No activity entries');
  }
 });
 it('shows actual stale authority projection as unavailable rather than a historical zero', () => {
  const input = fixture(); input.authority.sessionCurrent = false; expect(projectActivity(input)).toEqual({ state: 'unavailable' });
  const html = render(input); noPrivateHistory(html); expect(html).toContain('unavailable'); expect(html).not.toContain('No activity entries');
 });
});
