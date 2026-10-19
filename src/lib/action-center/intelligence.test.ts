import { calculateScheduleHealth } from '../scheduling/schedule-health';
import { describe, expect, it } from 'vitest';
import type { ActionFact, ActionIntelligenceInput, SourceKey } from './intelligence';
import { buildManagerActionItems } from '../assistance/manager-actions';
import { projectAttendance } from '../attendance/project';
import { parseManagerTimeCorrections } from '../time-corrections/read-model';
import { parseTimecardsResponse } from '../timecards/read-model';

// The initial RED run reports behavior assertions rather than a missing-module
// collection error. This test still requires the actual implementation to exist.
const modulePath = './intelligence';
const implementation: typeof import('./intelligence') | null = await import(modulePath).catch(() => null);
const project = (input: unknown) => implementation?.buildActionIntelligence(input);
const NOW = '2026-10-09T12:00:00Z';
const binding = { workspaceId: 'tenant-a', actorId: 'manager', role: 'MANAGER' as const,
  sessionVersion: 'session-2', grantsVersion: 'grants-3', scopeVersion: 'scope-4', viewId: 'view-5', weekStart: '2026-10-05' };
const keys: SourceKey[] = ['scheduling', 'attendance', 'corrections', 'timecards'];
function input(): ActionIntelligenceInput {
  return {
    context: { ...binding, now: NOW, authorityExpiresAt: '2026-10-09T12:00:40Z', online: true,
      workforceActive: true, portalState: 'ENABLED', workspaceActive: true, membershipCurrent: true,
      sessionCurrent: true, grantsCurrent: true, actionCenterReadAllowed: true, timeZone: 'America/Puerto_Rico',
      administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['a'] },
      selectedLocationIds: ['a'], locations: [{ id: 'a', workspaceId: 'tenant-a', active: true },
        { id: 'b', workspaceId: 'tenant-a', active: true }, { id: 'old', workspaceId: 'tenant-a', active: false }],
      expectedSourceVersions: { scheduling: 's1', attendance: 'a1', corrections: 'c1', timecards: 't1' } },
    sources: keys.map(source => ({ source, state: 'ready', binding: { ...binding },
      version: ({ scheduling: 's1', attendance: 'a1', corrections: 'c1', timecards: 't1' })[source],
      observedAt: NOW, expiresAt: '2026-10-09T12:00:30Z', coverage: 'complete', rows: [] })),
  };
}
function meta(id: string) {
  return { id, workspaceId: 'tenant-a', version: '1', currentVersion: '1', state: 'ACTIONABLE' as const,
    footprintComplete: true, locationIds: ['a'], subjectIds: ['employee'], readAllowed: true,
    destinationAllowed: true, permittedFields: ['employee.identity', 'schedule', 'configuration', 'request', 'attendance', 'timecard'],
    deadlineAt: null, startAt: null, sourceTimestamp: null };
}
function request(id = 'r'): ActionFact {
  return { kind: 'REQUEST', meta: meta('TIME_OFF:' + id), payload: { id, kind: 'TIME_OFF',
    employeeId: 'employee', employeeName: 'Alex', createdAt: '2026-10-09T10:00:00Z' } };
}
function attendance(): ActionFact {
  return { kind: 'ATTENDANCE', meta: meta('ATTENDANCE:entry'), payload: { entryId: 'entry', employeeId: 'employee',
    employeeName: 'Alex', locationId: 'a', sourceVersion: 1,
    observations: [{ id: 'observation', kind: 'CLOCK_IN_AFTER_SCHEDULE_START' }] } };
}
function correction(): ActionFact {
  return { kind: 'TIME_CORRECTION', meta: meta('TIME_CORRECTION:correction'), payload: { id: 'correction',
    employeeId: 'employee', employeeName: 'Alex', locationId: 'a', kind: 'MISSING_ENTRY', status: 'PENDING',
    revision: 1, createdAt: '2026-10-09T09:00:00Z', isSelf: false } };
}
function card(): ActionFact {
  const rowMeta = meta('TIMECARD:employee:2026-10-05:2026-10-11');
  rowMeta.version = rowMeta.currentVersion = '1:hash';
  return { kind: 'TIMECARD', meta: rowMeta, payload: { employeeId: 'employee', employeeName: 'Alex',
    startDate: '2026-10-05', endDate: '2026-10-11', state: 'NEEDS_REVIEW', revision: 1, sourceHash: 'hash',
    entries: [{ locationId: 'a' }], history: [], issues: ['pending_correction'] } };
}
function add(v: ActionIntelligenceInput, source: SourceKey, ...rows: ActionFact[]) {
  const section = v.sources.find(s => s.source === source);
  if (section?.state !== 'ready') throw Error('Fixture section is not ready');
  section.rows.push(...rows);
  return v;
}
function ready(v: unknown) {
  const result = project(v);
  expect(result).toBeDefined();
  if (!result || !('items' in result)) throw Error('Expected observed projection');
  return result;
}

describe('F1 approved source-backed intelligence', () => {
  it('implements the actual pure entry point', () => {
    expect(implementation?.buildActionIntelligence).toBeTypeOf('function');
  });
  it('requires all four fresh complete sources for all clear in the authorized current scope', () => {
    expect(project(input())).toMatchObject({ state: 'ready', allClear: true, allClearScope: 'AUTHORIZED_CURRENT_SCOPE',
      items: [], counts: { total: 0, scheduling: 0, requests: 0, timekeeping: 0 } });
  });
  it('projects all four current sources with reasons, exact versions, observed times and existing destinations', () => {
    const result = ready(add(add(add(add(input(), 'scheduling', request()), 'attendance', attendance()), 'corrections', correction()), 'timecards', card()));
    expect(result.counts).toEqual({ total: 4, scheduling: 0, requests: 1, timekeeping: 3 });
    expect(result.allClear).toBe(false);
    expect(result.items.map(item => item.id)).toEqual(['TIME_CORRECTION:correction', 'TIME_OFF:r', 'ATTENDANCE:entry', 'TIMECARD:employee:2026-10-05:2026-10-11']);
    expect(result.items.find(i => i.type === 'TIME_CORRECTION')).toMatchObject({ source: 'corrections', sourceVersion: 'c1',
      rowVersion: '1', observedAt: NOW, reason: { code: 'CORRECTION_MISSING_ENTRY' },
      nextAction: { href: '/app?view=attendance#correction-correction', label: 'Open correction review' } });
    expect(result.items.find(i => i.type === 'TIMECARD')?.nextAction.href).toBe('/app/timecards?start=2026-10-05&end=2026-10-11#timecard-employee');
  });
  it('orders category, actual relevant time, actual source timestamp, stable ID deterministically', () => {
    const v = input();
    const urgent: ActionFact = { kind: 'COVERAGE_GAP', meta: meta('COVERAGE:gap'), payload: { key: 'gap', locationId: 'a',
      locationName: 'North', date: '2026-10-10', startTime: '08:00', endTime: '09:00', gap: 2, requiresLead: false } };
    const missing: ActionFact = { kind: 'AVAILABILITY_MISSING', meta: meta('AVAILABILITY:employee'), payload: { employeeId: 'employee', employeeName: 'Alex' } };
    const later = request('z'), earlier = request('a'), tie = request('b');
    later.meta.deadlineAt = '2026-10-10T08:00:00Z';
    earlier.meta.deadlineAt = '2026-10-10T06:00:00-04:00';
    tie.meta.deadlineAt = '2026-10-10T10:00:00Z';
    add(v, 'scheduling', missing, tie, earlier, urgent, later);
    const expected = ['COVERAGE:gap', 'TIME_OFF:z', 'TIME_OFF:a', 'TIME_OFF:b', 'AVAILABILITY:employee'];
    expect(ready(v).items.map(i => i.id)).toEqual(expected);
    v.sources.reverse();
    for (const source of v.sources) if (source.state === 'ready') source.rows.reverse();
    expect(ready(v).items.map(i => i.id)).toEqual(expected);
  });
  it('does not invent a relevant time from request creation or a missing timestamp', () => {
    const withDeadline = request('deadline'), noDeadline = request('old');
    withDeadline.meta.deadlineAt = '2026-10-10T10:00:00Z';
    if (noDeadline.kind === 'REQUEST') noDeadline.payload.createdAt = '2020-01-01T00:00:00Z';
    const result = ready(add(input(), 'scheduling', noDeadline, withDeadline));
    expect(result.items.map(i => i.id)).toEqual(['TIME_OFF:deadline', 'TIME_OFF:old']);
    expect(result.items[1].relevantAt).toBeNull();
  });
  it('compares actual instants including nanoseconds rather than text or locale', () => {
    const a = request('a'), b = request('b');
    a.meta.deadlineAt = '2026-10-10T10:00:00.000000002Z';
    b.meta.deadlineAt = '2026-10-10T06:00:00.000000001-04:00';
    expect(ready(add(input(), 'scheduling', a, b)).items.map(i => i.id)).toEqual(['TIME_OFF:b', 'TIME_OFF:a']);
  });
  it.each(['unavailable', 'loading'] as const)('retains known sections and names %s without aggregate success', state => {
    const v = add(input(), 'scheduling', request());
    v.sources[1] = state === 'unavailable' ? { source: 'attendance', state, binding: { ...binding }, reason: 'READ_FAILED' }
      : { source: 'attendance', state, binding: { ...binding } };
    const result = ready(v);
    expect(result).toMatchObject({ state: 'partial', allClear: false, counts: { total: 1 } });
    expect(result.sections.find(s => s.source === 'attendance')).toMatchObject({ state, observedCount: null,
      retry: { kind: 'RETRY_SOURCE', source: 'attendance' } });
  });
  it.each(['limited', 'capped'] as const)('does not turn %s empty data into all clear', coverage => {
    const v = input();
    if (v.sources[1].state === 'ready') v.sources[1].coverage = coverage;
    expect(project(v)).toMatchObject({ state: 'partial', allClear: false, counts: { total: 0 } });
  });
  it('does not return observed counts for an entirely loading or unavailable aggregate', () => {
    const v = input();
    v.sources = keys.map(source => ({ source, state: 'loading', binding: { ...binding } }));
    expect(project(v)).toMatchObject({ state: 'loading', allClear: false });
    expect(project(v)).not.toHaveProperty('items');
    expect(project(v)).not.toHaveProperty('counts');
    v.sources[0] = { source: 'scheduling', state: 'unavailable', binding: { ...binding }, reason: 'READ_FAILED' };
    expect(project(v)).toMatchObject({ state: 'unavailable', allClear: false });
  });
  it('requires each source exactly once, with no omitted required source disguised as empty', () => {
    const v = input(); v.sources.pop();
    expect(project(v)).toMatchObject({ state: 'unavailable', reason: 'INVALID_INPUT', allClear: false });
    const duplicate = input(); duplicate.sources[3] = duplicate.sources[0];
    expect(project(duplicate)).toMatchObject({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
});

describe('F1 current authority, source and scoped DTO boundary', () => {
  it.each(['LEAD', 'EMPLOYEE'] as const)('does not create a management view for %s', role => {
    const v = add(input(), 'scheduling', request()); v.context.role = role;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED', allClear: false });
  });
  it.each(['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'actionCenterReadAllowed'] as const)('fails closed on lost %s', field => {
    const v = add(input(), 'scheduling', request()); v.context[field] = false;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED', allClear: false });
  });
  it.each(['DISABLED', 'PROOF_PENDING', 'SUSPENDED'] as const)('denies portal state %s', portalState => {
    const v = input(); v.context.portalState = portalState;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED', allClear: false });
  });
  it('clears rows when offline or authority expires', () => {
    const v = add(input(), 'scheduling', request()); v.context.online = false;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'OFFLINE', allClear: false });
    v.context.online = true; v.context.authorityExpiresAt = NOW;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED', allClear: false });
  });
  it.each(['workspaceId', 'actorId', 'role', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'viewId', 'weekStart'] as const)('drops an old %s source binding without private diagnostics', field => {
    const v = add(input(), 'scheduling', request());
    const source = v.sources[0]; source.binding = { ...source.binding, [field]: 'old-private-binding' } as typeof binding;
    const result = ready(v);
    expect(result).toMatchObject({ state: 'partial', allClear: false, items: [] });
    expect(result.sections[0]).toMatchObject({ source: 'scheduling', state: 'unavailable', reason: 'STALE_SOURCE', observedCount: null });
    expect(JSON.stringify(result)).not.toContain('old-private-binding');
  });
  it.each(['expired', 'future', 'overlong', 'version', 'missing-version'] as const)('rejects %s source freshness', kind => {
    const v = add(input(), 'scheduling', request()); const source = v.sources[0];
    if (source.state !== 'ready') throw Error('Fixture');
    if (kind === 'expired') source.expiresAt = NOW;
    if (kind === 'future') source.observedAt = '2026-10-09T12:00:01Z';
    if (kind === 'overlong') source.expiresAt = '2026-10-09T12:00:46Z';
    if (kind === 'version') source.version = 'old-version';
    if (kind === 'missing-version') v.context.expectedSourceVersions.scheduling = null;
    expect(ready(v)).toMatchObject({ state: 'partial', items: [], allClear: false });
  });
  it('bounds validity by current authority and every observed source', () => {
    const v = input(); if (v.sources[2].state === 'ready') v.sources[2].expiresAt = '2026-10-09T12:00:10Z';
    expect(ready(v).validUntil).toBe('2026-10-09T12:00:10Z');
    v.context.authorityExpiresAt = '2026-10-09T12:00:05Z';
    expect(ready(v).validUntil).toBe('2026-10-09T12:00:05Z');
  });
  it('suppresses whole rows, names, IDs, reasons and counts outside M', () => {
    const hidden = request('private-other-location'); hidden.meta.locationIds = ['a', 'b'];
    if (hidden.kind === 'REQUEST') hidden.payload.employeeName = 'PRIVATE PERSON';
    const result = ready(add(input(), 'scheduling', hidden));
    expect(result.items).toEqual([]); expect(result.counts.total).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/private-other-location|PRIVATE PERSON|suppressedCount/);
  });
  it('requires explicit Manager scope and does not infer authority from employment eligibility', () => {
    const v = input(); v.context.administrativeScope = null;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED', allClear: false });
  });
  it.each(['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT'] as const)('preserves explicit ALL_TENANT %s', origin => {
    const v = add(input(), 'scheduling', request()); v.context.administrativeScope = { kind: 'ALL_TENANT', origin };
    v.context.selectedLocationIds = ['b'];
    const row = request('b'); row.meta.locationIds = ['b']; add(v, 'scheduling', row);
    expect(ready(v).items.map(i => i.id)).toEqual(['TIME_OFF:b']);
  });
  it('allows Owner same-tenant history at inactive locations but excludes inactive current scheduling', () => {
    const v = input(); v.context.role = 'OWNER'; v.context.selectedLocationIds = ['old'];
    for (const section of v.sources) section.binding.role = 'OWNER';
    const history = attendance(); history.meta.locationIds = ['old'];
    if (history.kind === 'ATTENDANCE') history.payload.locationId = 'old';
    const current = request(); current.meta.locationIds = ['old'];
    add(v, 'attendance', history); add(v, 'scheduling', current);
    expect(ready(v).items.map(i => i.id)).toEqual(['ATTENDANCE:entry']);
  });
  it.each(['readAllowed', 'destinationAllowed', 'footprintComplete'] as const)('withholds an entire row lacking %s', field => {
    const row = request(); row.meta[field] = false;
    const result = ready(add(input(), 'scheduling', row));
    expect(result.items).toEqual([]); expect(result.counts.total).toBe(0);
    expect(result.allClear).toBe(false);
  });
  it.each(['employee.identity', 'request'] as const)('does not expose IDs, links or counts without %s field permission', field => {
    const row = request(); row.meta.permittedFields = row.meta.permittedFields.filter(f => f !== field);
    expect(ready(add(input(), 'scheduling', row)).items).toEqual([]);
  });
  it('withholds an entire card if current or historical locations exceed M', () => {
    const row = card(); row.meta.locationIds = ['a', 'b'];
    if (row.kind === 'TIMECARD') row.payload.history = [{ occurredAt: '2026-10-08T12:00:00Z', snapshot: { entries: [{ locationId: 'b' }] } }];
    const result = ready(add(input(), 'timecards', row));
    expect(result.items).toEqual([]); expect(result.counts.total).toBe(0);
    const incomplete = card(); if (incomplete.kind === 'TIMECARD') incomplete.payload.history = [{ occurredAt: '2026-10-08T12:00:00Z', snapshot: { entries: [{ locationId: 'b' }] } }];
    expect(ready(add(input(), 'timecards', incomplete))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('never copies private correction reasons, raw evidence, arbitrary destinations or delivery state', () => {
    const a = attendance(), c = correction();
    Object.assign(a.payload, { evidence: 'PRIVATE EVIDENCE', message: 'PRIVATE MESSAGE', href: 'https://evil.invalid/' });
    Object.assign(c.payload, { reason: 'PRIVATE REASON', privateContext: 'PRIVATE CONTEXT', href: '//evil.invalid', notificationDelivered: true });
    const result = ready(add(add(input(), 'attendance', a), 'corrections', c));
    expect(result.counts.total).toBe(2);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|evil|notificationDelivered/);
  });
  it('retains self review exclusions and gives a view action rather than approval', () => {
    const c = correction(), t = card(); c.meta.subjectIds = ['manager']; t.meta.subjectIds = ['manager'];
    if (c.kind === 'TIME_CORRECTION') { c.payload.employeeId = 'manager'; c.payload.isSelf = true; }
    if (t.kind === 'TIMECARD') t.payload.employeeId = 'manager';
    t.meta.id = 'TIMECARD:manager:2026-10-05:2026-10-11';
    const result = ready(add(add(input(), 'corrections', c), 'timecards', t));
    expect(result.items.map(i => i.title)).toEqual(['Your correction needs another reviewer', 'Your timecard needs another reviewer']);
    expect(result.items.map(i => i.nextAction.label)).toEqual(['View your correction', 'View your timecard']);
  });
});

describe('F1 source resolution and bounded recovery', () => {
  it.each(['RESOLVED', 'SUPERSEDED'] as const)('omits authoritative %s source rows', state => {
    const row = request(); row.meta.state = state;
    expect(project(add(input(), 'scheduling', row))).toMatchObject({ state: 'ready', allClear: true, items: [] });
  });
  it('does not interpret delivery/seen state as resolving a pending request', () => {
    const row = request(); Object.assign(row.payload, { notificationSeen: true, notificationDelivered: true });
    expect(ready(add(input(), 'scheduling', row)).counts.total).toBe(1);
  });
  it('deduplicates identical sanitized sources and fails closed on conflicting duplicate facts', () => {
    const row = request(); expect(ready(add(input(), 'scheduling', row, structuredClone(row))).counts.total).toBe(1);
    const conflict = request(); if (conflict.kind === 'REQUEST') conflict.payload.employeeName = 'Other';
    const v = add(input(), 'scheduling', row, conflict);
    expect(ready(v)).toMatchObject({ state: 'partial', allClear: false, items: [] });
    v.sources[0].state === 'ready' && v.sources[0].rows.reverse();
    expect(ready(v)).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('drops stale row versions and mismatched canonical IDs without exposing them', () => {
    const stale = request(); stale.meta.currentVersion = '2';
    expect(ready(add(input(), 'scheduling', stale))).toMatchObject({ state: 'partial', allClear: false, items: [] });
    const wrong = attendance(); wrong.meta.id = 'PRIVATE WRONG ID';
    expect(ready(add(input(), 'attendance', wrong))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('does not invent zero hours or a Lead requirement from missing/zero configuration', () => {
    const hours: ActionFact = { kind: 'HOURS', meta: meta('HOURS:employee'), payload: { employeeId: 'employee', employeeName: 'Alex', kind: 'UNDER' } };
    expect(ready(add(input(), 'scheduling', hours))).toMatchObject({ state: 'partial', allClear: false, items: [] });
    const gap: ActionFact = { kind: 'COVERAGE_GAP', meta: meta('COVERAGE:gap'), payload: { key: 'gap', locationId: 'a', locationName: 'North',
      date: '2026-10-10', startTime: '08:00', endTime: '09:00', gap: 0, requiresLead: false } };
    expect(ready(add(input(), 'scheduling', gap)).items).toEqual([]);
    gap.payload.gap = null;
    expect(ready(add(input(), 'scheduling', gap)).items[0]).toMatchObject({ priority: 'REVIEW', reason: { code: 'COVERAGE_SETUP_REQUIRED' } });
  });
  it('shows finalized/non-pending sources as resolved without mutating input', () => {
    const c = correction(), t = card(); if (c.kind === 'TIME_CORRECTION') c.payload.status = 'APPROVED';
    if (t.kind === 'TIMECARD') t.payload.state = 'FINALIZED';
    const v = add(add(input(), 'corrections', c), 'timecards', t), before = structuredClone(v);
    expect(project(v)).toMatchObject({ state: 'ready', allClear: true, items: [] });
    expect(v).toEqual(before);
  });
  it('caps source rows explicitly instead of presenting a truncated empty source', () => {
    const v = input(); add(v, 'scheduling', ...Array.from({ length: 1001 }, (_, n) => request(String(n))));
    expect(ready(v)).toMatchObject({ state: 'partial', allClear: false, items: [] });
    expect(ready(v).sections[0]).toMatchObject({ state: 'unavailable', reason: 'SOURCE_LIMIT', observedCount: null });
  });
  it.each([null, {}, [], { context: {}, sources: [] }])('does not throw or default authority for malformed input %j', value => {
    expect(() => project(value)).not.toThrow();
    expect(project(value)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT', allClear: false });
  });
  it('does not count a repeated attendance observation as another recorded observation', () => {
    const row = attendance();
    if (row.kind === 'ATTENDANCE') row.payload.observations.push(structuredClone(row.payload.observations[0]));
    expect(ready(add(input(), 'attendance', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it.each(['attendance', 'corrections', 'scheduling'] as const)('rejects impossible future revision/creation time in %s', source => {
    const row = source === 'attendance' ? attendance() : source === 'corrections' ? correction() : request();
    const future = '2026-10-09T12:00:01Z';
    row.meta.sourceTimestamp = future;
    if (row.kind === 'TIME_CORRECTION' || row.kind === 'REQUEST') row.payload.createdAt = future;
    expect(ready(add(input(), source, row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('does not accept a current-week source binding for another weekly card period', () => {
    const row = card();
    if (row.kind === 'TIMECARD') { row.payload.startDate = '2026-09-28'; row.payload.endDate = '2026-10-04'; }
    row.meta.id = 'TIMECARD:employee:2026-09-28:2026-10-04';
    expect(ready(add(input(), 'timecards', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('preserves the existing Monday week-start invariant', () => {
    const v = input(); v.context.weekStart = '2026-10-04';
    for (const source of v.sources) source.binding.weekStart = v.context.weekStart;
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT', allClear: false });
  });
  it('rejects another week coverage fact despite a current source binding', () => {
    const row: ActionFact = { kind: 'COVERAGE_GAP', meta: meta('COVERAGE:gap'), payload: { key: 'gap', locationId: 'a', locationName: 'North',
      date: '2026-09-30', startTime: '08:00', endTime: '09:00', gap: 1, requiresLead: false } };
    expect(ready(add(input(), 'scheduling', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('does not let a resolved metadata flag turn malformed source facts into all clear', () => {
    const row = request(); row.meta.state = 'RESOLVED'; Object.assign(row.payload, { employeeId: null, createdAt: 'not-an-instant' });
    expect(ready(add(input(), 'scheduling', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('does not let an empty attendance source bypass its canonical ID binding', () => {
    const row = attendance(); if (row.kind === 'ATTENDANCE') row.payload.observations = []; row.meta.id = 'PRIVATE WRONG ID';
    expect(ready(add(input(), 'attendance', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('does not let a finalized card bypass its historical timestamp binding', () => {
    const finalized = card(); if (finalized.kind === 'TIMECARD') { finalized.payload.state = 'FINALIZED';
      finalized.payload.history = [{ occurredAt: '2026-10-09T12:00:01Z', snapshot: { entries: [{ locationId: 'a' }] } }]; }
    expect(ready(add(input(), 'timecards', finalized))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('does not let an approved correction bypass impossible creation time', () => {
    const row = correction(); if (row.kind === 'TIME_CORRECTION') { row.payload.status = 'APPROVED'; row.payload.createdAt = '2026-10-09T12:00:01Z'; }
    expect(ready(add(input(), 'corrections', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('reports invalid foreign rows generically without returning tenant/source identity', () => {
    const row = request('PRIVATE FOREIGN ID'); row.meta.workspaceId = 'PRIVATE FOREIGN TENANT';
    const result = ready(add(input(), 'scheduling', row));
    expect(result).toMatchObject({ state: 'partial', allClear: false, items: [], counts: { total: 0 } });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it('never returns unknown source errors or substitutes empty success', () => {
    const v = input(); v.sources[0] = { source: 'scheduling', binding: { ...binding }, state: 'unavailable', reason: 'READ_FAILED' };
    Object.assign(v.sources[0], { reason: 'PRIVATE SQL AND CUSTOMER FAILURE' });
    const result = ready(v); expect(result.allClear).toBe(false); expect(result.state).toBe('partial');
    expect(result.sections[0]).toMatchObject({ state: 'unavailable', reason: 'INVALID_SOURCE', observedCount: null });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it.each(['version', 'currentVersion'] as const)('requires exact canonical correction %s', field => {
    const row = correction(); row.meta[field] = '2';
    expect(ready(add(input(), 'corrections', row))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
  it('rejects a source fact from the wrong one of the four readers', () => {
    expect(ready(add(input(), 'scheduling', attendance()))).toMatchObject({ state: 'partial', allClear: false, items: [] });
  });
});

describe('F1 compatibility with current pure source contracts', () => {
  it('reuses all current scheduling builder categories, factual texts and authorized routes', () => {
    const v = input(), base = { weekStart: v.context.weekStart, availabilityDeadlineSet: true, coverageRulesConfigured: true };
    const facts: ActionFact[] = [
      { kind: 'HOURS', meta: meta('HOURS:under'), payload: { employeeId: 'under', employeeName: 'Under', kind: 'UNDER', scheduledHours: 30, targetHours: 40 } },
      { kind: 'HOURS', meta: meta('HOURS:over'), payload: { employeeId: 'over', employeeName: 'Over', kind: 'OVER', scheduledHours: 45, targetHours: 40 } },
      { kind: 'HOURS', meta: meta('HOURS:target'), payload: { employeeId: 'target', employeeName: 'Target', kind: 'TARGET_MISSING' } },
      { kind: 'AVAILABILITY_MISSING', meta: meta('AVAILABILITY:availability'), payload: { employeeId: 'availability', employeeName: 'Availability' } },
      { kind: 'ACKNOWLEDGEMENT_MISSING', meta: meta('ACKNOWLEDGEMENT:ack'), payload: { employeeId: 'ack', employeeName: 'Acknowledgement' } },
      { kind: 'DEADLINE', meta: meta('SETUP:DEADLINE'), payload: { configured: false } },
      { kind: 'COVERAGE_RULES', meta: meta('SETUP:COVERAGE_RULES'), payload: { configured: false } },
    ];
    for (const fact of facts) if ('employeeId' in fact.payload) fact.meta.subjectIds = [fact.payload.employeeId];
    const expected = buildManagerActionItems({ ...base, availabilityDeadlineSet: false, coverageRulesConfigured: false,
      hourIssues: facts.filter(f => f.kind === 'HOURS').map(f => f.payload),
      missingAvailability: [{ employeeId: 'availability', employeeName: 'Availability' }], unacknowledgedEmployees: [{ employeeId: 'ack', employeeName: 'Acknowledgement' }] });
    const result = ready(add(v, 'scheduling', ...facts));
    expect(result.counts).toEqual({ total: 7, scheduling: 7, requests: 0, timekeeping: 0 });
    for (const canonical of expected) expect(result.items.find(i => i.id === canonical.id)).toMatchObject({ type: canonical.type,
      title: canonical.title, priority: canonical.priority, reason: { text: canonical.detail }, nextAction: { href: canonical.href } });
    expect(JSON.stringify(result)).not.toMatch(/disciplin|performance score|overtime law/i);
  });
  it.each(['TIME_OFF', 'EXCHANGE', 'CALLOUT'] as const)('preserves %s source routing without caller-controlled hrefs', kind => {
    const row = request('id?x=1#fragment');
    if (row.kind !== 'REQUEST') throw Error('Fixture');
    row.payload.kind = kind; row.meta.id = kind + ':' + row.payload.id;
    const canonical = buildManagerActionItems({ weekStart: '2026-10-05', availabilityDeadlineSet: true,
      coverageRulesConfigured: true, pendingRequests: [row.payload] })[0];
    const result = ready(add(input(), 'scheduling', row));
    expect(result.items[0]).toMatchObject({ title: canonical.title, reason: { code: kind + '_PENDING', text: canonical.detail },
      nextAction: { href: canonical.href } });
    expect(result.items[0].nextAction.href).toContain('id%3Fx%3D1%23fragment');
  });
  it.each([
    { gap: 2, requiresLead: false, expectedCode: 'STAFF_COVERAGE_MISSING' },
    { gap: 0, requiresLead: true, expectedCode: 'LEAD_COVERAGE_MISSING' },
    { gap: null, requiresLead: null, expectedCode: 'COVERAGE_SETUP_REQUIRED' },
    { gap: 0, requiresLead: false, positionCoverage: [{ positionId: 'p', positionName: 'Cashier', missing: 1 }], expectedCode: 'POSITION_COVERAGE_MISSING' },
  ])('preserves configured coverage distinction $expectedCode', values => {
    const payload = { key: 'gap', locationId: 'a', locationName: 'North', date: '2026-10-10', startTime: '08:00', endTime: '09:00',
      gap: values.gap, requiresLead: values.requiresLead, positionCoverage: values.positionCoverage };
    const row: ActionFact = { kind: 'COVERAGE_GAP', meta: meta('COVERAGE:gap'), payload };
    const canonical = buildManagerActionItems({ weekStart: '2026-10-05', availabilityDeadlineSet: true, coverageRulesConfigured: true, coverageGaps: [payload] })[0];
    expect(ready(add(input(), 'scheduling', row)).items[0]).toMatchObject({ title: canonical.title, priority: canonical.priority,
      reason: { code: values.expectedCode, text: canonical.detail }, nextAction: { href: canonical.href }, relevantAt: '2026-10-10T12:00:00Z' });
  });
  it('accepts actual D1 projection observations without carrying raw messages/evidence', () => {
    const canonical = projectAttendance({ version: 1, workspaceId: 'tenant-a', timeZone: 'America/Puerto_Rico', observedAt: NOW,
      entries: [{ id: 'entry', workspaceId: 'tenant-a', employeeId: 'employee', locationId: 'a', sourceVersion: 1,
        clockInAt: '2026-10-09T10:00:00Z', clockOutAt: '2026-10-08T11:00:00Z', status: 'CLOCKED_OUT', scheduleContext: null, breaks: [] }],
      publications: [], coverage: { entriesComplete: true, breaksComplete: true, publicationsComplete: true } });
    expect(canonical.state).toBe('ready'); if (canonical.state !== 'ready') throw Error('Canonical fixture failed');
    const group = canonical.groups[0], row: ActionFact = { kind: 'ATTENDANCE', meta: meta('ATTENDANCE:' + group.entryId),
      payload: { ...group, observations: [...group.observations], employeeName: 'Alex' } };
    const v = add(input(), 'attendance', row); if (v.sources[1].state === 'ready') v.sources[1].coverage = canonical.coverage.state;
    const result = ready(v);
    expect(result.items[0]).toMatchObject({ title: 'Recorded attendance needs review', reason: { text: `Alex · ${group.observations.length} recorded observations.` } });
    expect(result.allClear).toBe(false);
    expect(result.items[0]).not.toHaveProperty('evidence'); expect(result.items[0]).not.toHaveProperty('message');
  });
  it('accepts the actual D2 manager parser contract while excluding private correction context', () => {
    const canonical = parseManagerTimeCorrections({ state: 'ready', observedAt: NOW, timeZone: 'America/Puerto_Rico', validForMs: 30000,
      requests: [{ id: '10000000-0000-4000-8000-000000000001', kind: 'MISSING_ENTRY', status: 'PENDING', revision: 1,
        createdAt: '2026-10-09T09:00:00Z', locationId: 'a', locationName: 'North', originalStartAt: null, originalEndAt: null,
        proposedStartAt: '2026-10-08T09:00:00Z', proposedEndAt: '2026-10-08T10:00:00Z', breakName: null,
        reason: 'PRIVATE CANONICAL REASON', baseChanged: false, context: { state: 'none' }, employeeName: 'Alex', isSelf: false }] });
    if (canonical.state !== 'ready') throw Error('Canonical fixture failed');
    const item = canonical.requests[0], row: ActionFact = { kind: 'TIME_CORRECTION', meta: meta('TIME_CORRECTION:' + item.id), payload: { ...item, employeeId: 'employee' } };
    const result = ready(add(input(), 'corrections', row));
    expect(result.items[0].sourceTimestamp).toBe(item.createdAt);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE CANONICAL REASON|proposedStartAt|baseChanged|context/);
  });
  it('accepts actual D3 projected cards and retained history while preserving whole-source privacy', () => {
    const source = { employeeId: 'employee', employeeName: 'Alex', startDate: '2026-10-05', endDate: '2026-10-11',
      timeZone: 'America/Puerto_Rico', pendingCorrections: 0, corrections: [], entries: [{ id: 'entry', locationId: 'a', locationName: 'North',
        positionId: null, positionName: null, sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1,
        startAt: '2026-10-08T12:00:00Z', endAt: '2026-10-08T20:00:00Z', rawStartAt: '2026-10-08T12:00:00Z', rawEndAt: '2026-10-08T20:00:00Z', breaks: [] }] };
    const hash = 'a'.repeat(32), canonical = parseTimecardsResponse({ observedAt: NOW, cards: [{ source, sourceHash: hash, revision: 1, state: 'APPROVED',
      history: [{ operationId: '10000000-0000-4000-8000-000000000001', revision: 1, action: 'APPROVE', occurredAt: '2026-10-08T21:00:00Z',
        actorName: 'PRIVATE REVIEWER', note: 'PRIVATE NOTE', sourceHash: hash, snapshot: source }] }] }, { startDate: source.startDate, endDate: source.endDate });
    const item = canonical.cards[0], rowMeta = meta('TIMECARD:employee:2026-10-05:2026-10-11'); rowMeta.version = rowMeta.currentVersion = `1:${hash}`;
    const row: ActionFact = { kind: 'TIMECARD', meta: rowMeta, payload: { ...item.card, state: item.state, sourceHash: item.sourceHash, revision: item.revision, history: item.history } };
    const result = ready(add(input(), 'timecards', row));
    expect(result.items[0]).toMatchObject({ title: 'Approved timecard awaits finalization', sourceTimestamp: '2026-10-08T21:00:00Z', rowVersion: `1:${hash}` });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|recordedNanoseconds|breakNanoseconds|rawStartAt/);
  });
  it('keeps known authorized rows in an explicitly capped section', () => {
    const v = add(input(), 'scheduling', request()); if (v.sources[0].state === 'ready') v.sources[0].coverage = 'capped';
    const result = ready(v); expect(result.state).toBe('partial'); expect(result.counts.total).toBe(1);
    expect(result.sections[0]).toMatchObject({ state: 'limited', observedCount: 1, reason: 'INCOMPLETE_SOURCE' });
  });
  it('bounds the combined aggregate without returning partial totals as the whole aggregate', () => {
    const v = add(input(), 'scheduling', ...Array.from({ length: 501 }, (_, n) => request(String(n))));
    for (let n = 0; n < 501; n++) { const row = attendance(); if (row.kind === 'ATTENDANCE') row.payload.entryId = String(n); row.meta.id = 'ATTENDANCE:' + n; add(v, 'attendance', row); }
    expect(project(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_LIMIT', allClear: false });
  });
});

describe('EQ-F-FUNC-001 canonical end-of-day coverage boundaries', () => {
  // Real canonical health output, with fictional current observation metadata.
  // These observations do not authenticate a caller or issue a tenant proof.
  function coverage(windows: { startTime: string; endTime: string }[]) {
    const health = calculateScheduleHealth({
      workspace: { id: 'tenant-a', active: true }, shifts: [], employees: [],
      locations: [{ id: 'a', name: 'North', minimumStaffPerShift: 1, requiresDesignatedLead: false }],
      weekDates: ['2026-10-05'], coverageWindows: windows.map(window => ({ ...window,
        locationId: 'a', dayOfWeek: 1, minimumStaff: 1, positionRequirements: [] })),
    });
    const facts = health.coverageBlocks.map(block => ({
      kind: 'COVERAGE_GAP' as const,
      meta: { ...meta('COVERAGE:' + block.key), subjectIds: [], permittedFields: ['schedule'] },
      payload: { key: block.key, locationId: block.locationId, locationName: block.locationName,
        date: block.date, startTime: block.startTime, endTime: block.endTime, gap: block.gap,
        requiresLead: block.requiresLead, positionCoverage: block.positionCoverage },
    }));
    return { health, facts };
  }
  function actionFor(row: Extract<ActionFact, { kind: 'COVERAGE_GAP' }>) {
    return buildManagerActionItems({ weekStart: binding.weekStart, availabilityDeadlineSet: true,
      coverageRulesConfigured: true, coverageGaps: [row.payload] })[0];
  }

  it.each([
    { startTime: '20:00', endTime: '23:59', relevantAt: '2026-10-06T00:00:00Z' },
    { startTime: '20:00', endTime: '24:00', relevantAt: '2026-10-06T00:00:00Z' },
    { startTime: '00:00', endTime: '24:00', relevantAt: '2026-10-05T04:00:00Z' },
  ])('retains the actual canonical $startTime–$endTime uncovered block and exact review destination', window => {
    const { health, facts } = coverage([window]);
    expect(health.coverageBlocks).toHaveLength(1);
    expect(health.coverageBlocks[0]).toMatchObject({ startTime: window.startTime, endTime: window.endTime,
      assignedStaff: 0, requiredStaff: 1, gap: 1, requiresLead: false, covered: false });
    expect(health.coverageSummary).toMatchObject({ totalBlocks: 1, uncoveredBlocks: 1, coveredBlocks: 0 });
    const value = add(input(), 'scheduling', ...facts), before = structuredClone(value);
    const result = ready(value), canonical = actionFor(facts[0]);
    expect(result).toMatchObject({ state: 'ready', allClear: false,
      counts: { total: 1, scheduling: 1, requests: 0, timekeeping: 0 } });
    expect(result.sections[0]).toMatchObject({ state: 'complete', observedCount: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ id: canonical.id, type: canonical.type, priority: canonical.priority,
      title: canonical.title, reason: { code: 'STAFF_COVERAGE_MISSING', text: canonical.detail },
      relevantAt: window.relevantAt, source: 'scheduling', sourceVersion: 's1', rowVersion: '1', observedAt: NOW,
      nextAction: { label: 'Open coverage review', href: canonical.href } });
    // People read 12-hour times; a gap ending at 24:00 reads "midnight" and a whole day "all day".
    const clock = (time: string) => { const [h, m] = time.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h % 24 >= 12 ? 'PM' : 'AM'}`; };
    expect(result.items[0].reason.text).toContain(window.startTime === '00:00' && window.endTime === '24:00' ? 'all day' : `${clock(window.startTime)}–${window.endTime === '24:00' ? 'midnight' : clock(window.endTime)}`);
    expect(value).toEqual(before);
  });

  it('keeps both ordinary and midnight canonical gaps complete and deterministically ordered', () => {
    const { health, facts } = coverage([{ startTime: '08:00', endTime: '09:00' }, { startTime: '20:00', endTime: '24:00' }]);
    expect(health.coverageBlocks.map(block => block.endTime)).toEqual(['09:00', '24:00']);
    const value = add(input(), 'scheduling', ...facts), result = ready(value);
    expect(result).toMatchObject({ state: 'ready', allClear: false,
      counts: { total: 2, scheduling: 2, requests: 0, timekeeping: 0 } });
    expect(result.sections[0]).toMatchObject({ state: 'complete', observedCount: 2 });
    expect(result.items.map(item => item.id)).toEqual(facts.map(row => row.meta.id));
    for (const row of facts) {
      const canonical = actionFor(row);
      expect(result.items.find(item => item.id === row.meta.id)).toMatchObject({
        reason: { code: 'STAFF_COVERAGE_MISSING', text: canonical.detail }, nextAction: { href: canonical.href } });
    }
    for (const source of value.sources) if (source.state === 'ready') source.rows.reverse();
    expect(ready(value).items).toEqual(result.items);
  });

  it.each(['24:00', '24:01', '25:00', '23:60'])('rejects %s as a start rather than extending the end-only exception', startTime => {
    const { facts } = coverage([{ startTime: '20:00', endTime: '23:59' }]);
    facts[0].payload.startTime = startTime;
    const result = ready(add(input(), 'scheduling', ...facts));
    expect(result).toMatchObject({ state: 'partial', allClear: false, items: [], counts: { total: 0, scheduling: 0 } });
    expect(result.sections[0]).toMatchObject({ state: 'limited', reason: 'INCOMPLETE_SOURCE', observedCount: 0 });
  });

  it.each(['24:01', '24:00:00', '24:00.0', '24:00Z', '24:00 ', '25:00'])('rejects noncanonical end %j instead of coercing it to 24:00', endTime => {
    const { facts } = coverage([{ startTime: '20:00', endTime: '23:59' }]);
    facts[0].payload.endTime = endTime;
    const result = ready(add(input(), 'scheduling', ...facts));
    expect(result).toMatchObject({ state: 'partial', allClear: false, items: [], counts: { total: 0, scheduling: 0 } });
    expect(result.sections[0]).toMatchObject({ state: 'limited', reason: 'INCOMPLETE_SOURCE', observedCount: 0 });
  });

  it('keeps an ordinary valid gap observed while a malformed end makes the scheduling source incomplete', () => {
    const { facts } = coverage([{ startTime: '08:00', endTime: '09:00' }, { startTime: '20:00', endTime: '23:59' }]);
    facts[1].payload.endTime = '24:01';
    const result = ready(add(input(), 'scheduling', ...facts));
    expect(result).toMatchObject({ state: 'partial', allClear: false, counts: { total: 1, scheduling: 1 } });
    expect(result.items.map(item => item.id)).toEqual([facts[0].meta.id]);
    expect(result.sections[0]).toMatchObject({ state: 'limited', reason: 'INCOMPLETE_SOURCE', observedCount: 1 });
  });

  it('retains a known midnight gap without claiming capped coverage is complete', () => {
    const { facts } = coverage([{ startTime: '20:00', endTime: '24:00' }]);
    const value = add(input(), 'scheduling', ...facts);
    if (value.sources[0].state !== 'ready') throw Error('Fixture section is not ready');
    value.sources[0].coverage = 'capped';
    const result = ready(value);
    expect(result).toMatchObject({ state: 'partial', allClear: false, counts: { total: 1, scheduling: 1 } });
    expect(result.items.map(item => item.id)).toEqual([facts[0].meta.id]);
    expect(result.sections[0]).toMatchObject({ state: 'limited', reason: 'INCOMPLETE_SOURCE', observedCount: 1 });
  });

  it('suppresses a midnight block with an outside-scope footprint before exposing its reason or destination', () => {
    const { facts } = coverage([{ startTime: '20:00', endTime: '24:00' }]);
    facts[0].meta.locationIds.push('b'); facts[0].payload.locationName = 'PRIVATE OUTSIDE M';
    const result = ready(add(input(), 'scheduling', ...facts));
    expect(result).toMatchObject({ state: 'ready', allClear: true, items: [], counts: { total: 0, scheduling: 0 } });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(JSON.stringify(result)).not.toContain(facts[0].meta.id);
  });

  it('does not expose a canonical midnight gap from another tenant', () => {
    const { facts } = coverage([{ startTime: '20:00', endTime: '24:00' }]);
    facts[0].meta.workspaceId = 'PRIVATE FOREIGN TENANT'; facts[0].payload.locationName = 'PRIVATE FOREIGN LOCATION';
    const result = ready(add(input(), 'scheduling', ...facts));
    expect(result).toMatchObject({ state: 'partial', allClear: false, items: [], counts: { total: 0 } });
    expect(result.sections[0]).toMatchObject({ state: 'limited', reason: 'INCOMPLETE_SOURCE', observedCount: 0 });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });

  it('requires the current scheduling source version even for a canonical midnight block', () => {
    const { facts } = coverage([{ startTime: '20:00', endTime: '24:00' }]);
    const value = add(input(), 'scheduling', ...facts); value.context.expectedSourceVersions.scheduling = 's2';
    const result = ready(value);
    expect(result).toMatchObject({ state: 'partial', allClear: false, items: [], counts: { total: 0 } });
    expect(result.sections[0]).toMatchObject({ state: 'unavailable', reason: 'STALE_SOURCE', observedCount: null });
    expect(JSON.stringify(result)).not.toContain(facts[0].meta.id);
  });
});

it('writes readable calendar dates and issue wording before any UI presentation',()=>{
 const fact=card();fact.meta.id='TIMECARD:employee:2026-10-19:2026-10-25';fact.payload={...fact.payload,employeeName:'Casey Rivera',startDate:'2026-10-19',endDate:'2026-10-25'};
 const v=input();v.context.timeZone='Pacific/Kiritimati';v.context.weekStart='2026-10-19';for(const section of v.sources)section.binding.weekStart='2026-10-19';
 const detail=ready(add(v,'timecards',fact)).items.find(i=>i.reason.code==='TIMECARD_RECORDED_EXCEPTIONS')?.reason.text;
 expect(detail).toBe('Casey Rivera · Oct 19 – Oct 25 · Fix recorded-time issues before finalizing.');
});
