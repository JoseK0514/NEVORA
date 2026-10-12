import { describe, expect, it, vi } from 'vitest';
import { buildRecordedSourceCapture, projectRecordedSourceCapture, type RecordedSourceRequest } from './recorded-source.server';
vi.mock('server-only', () => ({}));
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`;
const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
const request = (): RecordedSourceRequest => ({ workspaceId: 'workspace-fuel', employeeId: 'worker', timeZone: 'America/Puerto_Rico', period,
  contexts: [{ startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' }], coverage: [period] });
const entry = () => ({ id: 'punch', locationId: 'loc-1', locationName: 'Fictional', positionId: null, positionName: null,
  sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1,
  startAt: '2026-09-22T12:00:00Z', endAt: '2026-09-22T20:00:00Z', rawStartAt: '2026-09-22T12:00:00Z', rawEndAt: '2026-09-22T20:00:00Z',
  breaks: [{ id: 'break', name: 'Rest', adjustmentId: null, startAt: '2026-09-22T16:00:00Z', endAt: '2026-09-22T16:15:00Z', rawStartAt: '2026-09-22T16:00:00Z', rawEndAt: '2026-09-22T16:15:00Z' }] });
function fixture() {
  const snapshot = { ...period, employeeId: 'worker', employeeName: 'Fictional Worker', timeZone: 'America/Puerto_Rico', pendingCorrections: 0, entries: [entry()], corrections: [] };
  return { capture: { observedAt: '2026-10-01T00:00:00Z', limitExceeded: false,
    workspace: { id: 'workspace-fuel', timeZone: 'America/Puerto_Rico', active: true }, employee: { id: 'worker', workspaceId: 'workspace-fuel' },
    cards: [{ period, action: 'FINALIZE', operationId: uuid(2), revision: 2, sourceHash: 'a'.repeat(32), currentSourceHash: 'b'.repeat(32),
      actorEmployeeId: 'reviewer', approvalRevision: 1, approvalOperationId: uuid(1), approvalSourceHash: 'a'.repeat(32), approvalActorEmployeeId: 'reviewer', snapshot, currentSource: structuredClone(snapshot) }],
    entries: [{ ...entry(), employeeId: 'worker', status: 'CLOCKED_OUT', breaks: [{ ...entry().breaks[0], recordedVersion: 1,
      classification: { id: 'rest', version: 1, name: 'Rest', category: 'REST', targetMinutes: 15 } }] }],
    lineage: { requests: [], adjustments: [], events: [], locations: [{ id: 'loc-1', workspaceId: 'workspace-fuel' }] } } };
}
function ready(r = request(), raw: unknown = fixture()) {
  const result = projectRecordedSourceCapture(r, raw);
  expect(result.state).toBe('ready');
  if (result.state !== 'ready') throw Error('Expected ready');
  return result;
}
it('captures actual time and retained classification without choosing compensation', () => {
  const c = ready(); expect(c.entries).toHaveLength(1); expect(c.entries[0].startAt).toBe('2026-09-22T12:00:00Z');
  expect(c.entries[0].breaks[0].classification).toEqual({ id: 'rest', version: 1, name: 'Rest', category: 'REST', targetMinutes: 15 });
  expect(c.entries[0].breaks[0]).not.toHaveProperty('paid'); expect(c.coverage[0].sourceHash).toBe('a'.repeat(32));
  expect(c.coverage[0].currentSourceHash).toBe('b'.repeat(32)); expect(c.sourceFence).toMatch(/^[a-f0-9]{64}$/);
});
it('keeps unclassified history explicit without inventing an unpaid break', () => {
  const f = fixture(); f.capture.entries[0].breaks[0].classification = null as never;
  expect(ready(request(), f).entries[0].breaks[0].classification).toBeNull();
});
it('keeps a no-break entry distinct from missing source', () => {
  const f = fixture(); f.capture.entries[0].breaks = []; f.capture.cards[0].snapshot.entries[0].breaks = []; f.capture.cards[0].currentSource.entries[0].breaks = [];
  expect(ready(request(), f).entries[0].breaks).toEqual([]);
  f.capture.entries = []; expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'stale_source' });
});
it('accepts explicit empty finalized coverage and refuses absent coverage', () => {
  const f = fixture(); f.capture.entries = []; f.capture.cards[0].snapshot.entries = []; f.capture.cards[0].currentSource.entries = [];
  expect(ready(request(), f).emptyFinalizedCoverage).toEqual([period]);
  f.capture.cards = []; expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'coverage_missing' });
});
it('does not invalidate frozen time solely because current display metadata changed', () => {
  const f = fixture(); f.capture.cards[0].currentSource.employeeName = 'Renamed'; f.capture.cards[0].currentSource.entries[0].locationName = 'Renamed';
  expect(ready(request(), f).coverage[0].snapshot.employeeName).toBe('Fictional Worker');
});
it('deduplicates overlapping context windows and pins enrichment in a stable recapture fence', () => {
  const r = request(); r.contexts = [...r.contexts, { startAt: '2026-09-22T04:00:00Z', endAt: '2026-09-23T04:00:00Z' }];
  const f = fixture(), before = ready(r, f); expect(before.entries).toHaveLength(1);
  f.capture.observedAt = '2026-10-02T00:00:00Z'; expect(ready(r, f).sourceFence).toBe(before.sourceFence);
  f.capture.entries[0].breaks[0].classification.targetMinutes = 20;
  expect(ready(r, f).sourceFence).not.toBe(before.sourceFence);
});
it('blocks a required context gap outside the pay period', () => {
  const r = request(); r.contexts = [{ startAt: '2026-09-20T04:00:00Z', endAt: '2026-09-28T04:00:00Z' }];
  expect(projectRecordedSourceCapture(r, fixture())).toEqual({ state: 'blocked', reason: 'coverage_missing' });
});
it.each(['APPROVE', 'REOPEN'])('does not treat %s as finalized source', action => {
  const f = fixture(); f.capture.cards[0].action = action;
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'not_finalized' });
});
it.each(['open_entry', 'open_break', 'pending'])('blocks unresolved %s', kind => {
  const f = fixture();
  if (kind === 'pending') f.capture.cards[0].currentSource.pendingCorrections = 1;
  if (kind === 'open_entry') { f.capture.entries[0].endAt = null as never; f.capture.entries[0].status = 'CLOCKED_IN'; }
  if (kind === 'open_break') f.capture.entries[0].breaks[0].endAt = null as never;
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'unresolved_time' });
});
it('blocks changed effective time/version instead of replacing the frozen interval', () => {
  const f = fixture(); f.capture.entries[0].recordedVersion = 2;
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'stale_source' });
});
it('requires approval lineage matching the finalized hash/revision and independent actor', () => {
  for (const patch of [{ approvalRevision: 0 }, { approvalSourceHash: 'c'.repeat(32) }, { actorEmployeeId: 'worker' }]) {
    const f = fixture(); Object.assign(f.capture.cards[0], patch);
    expect(projectRecordedSourceCapture(request(), f).state).toBe('blocked');
  }
});
it('rejects semantic enrichment location ownership mismatch', () => {
  const f = fixture(); f.capture.lineage.locations[0].workspaceId = 'another';
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'identity_mismatch' });
});
describe('strict unknown boundaries', () => {
  it.each([null, undefined, [], 'capture', { capture: null }, { capture: [] }])('rejects malformed capture %#', value => {
    expect(projectRecordedSourceCapture(request(), value)).toEqual({ state: 'blocked', reason: 'invalid_source' });
  });
  it.each([
    ['revision', '2'], ['revision', true], ['revision', [2]], ['revision', new Number(2)],
    ['action', ['FINALIZE']], ['action', { toString: () => 'FINALIZE' }], ['sourceHash', ['a'.repeat(32)]],
  ])('rejects coerced card %s %#', (key, value) => {
    const f = fixture(); Object.assign(f.capture.cards[0], { [key as string]: value });
    expect(projectRecordedSourceCapture(request(), f).state).toBe('blocked');
  });
  it.each(['REST', ['REST'], { toString: () => 'REST' }, 1])('accepts only primitive category %#', value => {
    const f = fixture(); Object.assign(f.capture.entries[0].breaks[0].classification, { category: value });
    const result = projectRecordedSourceCapture(request(), f); expect(result.state).toBe(value === 'REST' ? 'ready' : 'blocked');
  });
  it('does not convert an explicit source-limit sentinel into complete data', () => {
    const f = fixture(); f.capture.limitExceeded = true;
    expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'source_limit' });
  });
  it.each([null, [], 'request', { ...request(), employeeId: ['worker'] }, { ...request(), timeZone: '+00:00' },
    { ...request(), contexts: [] }, { ...request(), contexts: [{ startAt: '2026-09-22T00:00:00Z', endAt: '2026-09-23T00:00:00Z' }] }])('rejects malformed or incomplete server context %#', value => {
    expect(() => buildRecordedSourceCapture(value as RecordedSourceRequest)).toThrow('recorded_source_invalid');
  });
});
it('binds workspace, employee and explicit context as parameters with no payroll authority', () => {
  const r = request(); const sql = buildRecordedSourceCapture(r);
  expect(sql.values.slice(0, 3)).toEqual(['workspace-fuel', 'worker', 'America/Puerto_Rico']);
  expect(sql.text).not.toContain('worker'); expect(sql.text).not.toContain('America/Puerto_Rico');
  expect(sql.text).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  expect(sql.text).toContain('nevora_timecard_latest'); expect(sql.text).toContain('time_correction_events');
});

function chainFixture() {
  const f = fixture();
  const requests = [], adjustments = [], events = [];
  for (let i = 1; i <= 9; i++) {
    const id = uuid(100 + i), aid = uuid(200 + i), parent = i === 1 ? null : uuid(199 + i);
    const locationId = 'loc-2';
    requests.push({ id, workspaceId: 'workspace-fuel', employeeId: 'worker', requestedByEmployeeId: 'worker', kind: 'MISSING_ENTRY',
      timeEntryId: null, breakEntryId: null, locationId, sourceRevision: i - 1, sourceSnapshot: { locationId }, baseAdjustmentId: parent,
      proposal: { startAt: '2026-09-22T12:00:00Z', endAt: '2026-09-22T20:00:00Z' }, reason: 'Fictional correction', requestHash: 'a'.repeat(64), createdAt: '2026-09-29T00:00:00Z' });
    adjustments.push({ id: aid, requestId: id, workspaceId: 'workspace-fuel', employeeId: 'worker', kind: 'MISSING_ENTRY', timeEntryId: null, breakEntryId: null,
      locationId, startAt: '2026-09-22T12:00:00Z', endAt: '2026-09-22T20:00:00Z', sourceRevision: i - 1,
      sourceSnapshot: { locationId }, supersedesAdjustmentId: parent, createdByEmployeeId: 'reviewer', createdAt: '2026-09-29T00:00:00Z' });
    for (const revision of [1, 2]) events.push({ id: uuid(300 + i * 2 + revision), requestId: id, revision,
      kind: revision === 1 ? 'REQUESTED' : 'APPROVED', actorEmployeeId: revision === 1 ? 'worker' : 'reviewer', operationHash: 'a'.repeat(64),
      decisionNote: null, adjustmentId: revision === 1 ? null : aid, result: {}, occurredAt: '2026-09-29T00:00:00Z' });
  }
  const missing = { ...entry(), locationId: 'loc-2', id: uuid(209), sourceKind: 'ADJUSTMENT', adjustmentId: uuid(209), recordedVersion: null,
    rawStartAt: null, rawEndAt: null, breaks: [] };
  const other = { ...entry(), id: 'other-location', startAt: '2026-09-23T12:00:00Z', endAt: '2026-09-23T20:00:00Z', rawStartAt: '2026-09-23T12:00:00Z', rawEndAt: '2026-09-23T20:00:00Z', breaks: [] };
  f.capture.entries = [{ ...missing, employeeId: 'worker', status: 'CLOCKED_OUT' }, { ...other, employeeId: 'worker', status: 'CLOCKED_OUT' }] as never;
  for (const cardSource of [f.capture.cards[0].snapshot, f.capture.cards[0].currentSource]) {
    cardSource.entries = [missing, other] as never;
    cardSource.corrections = requests.map(r => ({ id: r.id, kind: r.kind, status: 'APPROVED', reason: r.reason, revision: 2, ...r.proposal })) as never;
  }
  f.capture.lineage = { requests, adjustments, events, locations: [{ id: 'loc-1', workspaceId: 'workspace-fuel' }, { id: 'loc-2', workspaceId: 'workspace-fuel' }] } as never;
  return f;
}
it('retains the complete missing-entry chain beyond five revisions and historical locations', () => {
  const c = ready(request(), chainFixture());
  expect(c.entries).toHaveLength(2); expect(c.entries[0].logicalId).toBe(`missing:${uuid(201)}`);
  expect(c.lineage.requests).toHaveLength(9); expect(c.lineage.adjustments).toHaveLength(9); expect(c.lineage.events).toHaveLength(18);
  expect(c.locationIds).toEqual(['loc-1', 'loc-2']);
});
it.each(['missing_ancestor', 'missing_event', 'wrong_actor', 'wrong_target', 'cycle', 'extra_leaf', 'lost_location'])('blocks incoherent retained lineage %s', defect => {
  const f = chainFixture();
  const l = f.capture.lineage as unknown as { requests: Array<Record<string, unknown>>; adjustments: Array<Record<string, unknown>>; events: Array<Record<string, unknown>>; locations: Array<Record<string, unknown>> };
  if (defect === 'missing_ancestor') l.adjustments.shift();
  if (defect === 'missing_event') l.events.shift();
  if (defect === 'wrong_actor') l.events[1].actorEmployeeId = 'worker';
  if (defect === 'wrong_target') l.adjustments[8].kind = 'ENTRY_BOUNDARY';
  if (defect === 'cycle') { l.adjustments[0].supersedesAdjustmentId = uuid(209); l.requests[0].baseAdjustmentId = uuid(209); }
  if (defect === 'extra_leaf') l.adjustments[8].supersedesAdjustmentId = null;
  if (defect === 'lost_location') l.locations.pop();
  expect(projectRecordedSourceCapture(request(), f).state).toBe('blocked');
});
it('rejects duplicated raw identity, even with otherwise equal timing', () => {
  const f = fixture(); f.capture.entries.push(structuredClone(f.capture.entries[0]));
  expect(projectRecordedSourceCapture(request(), f).state).toBe('blocked');
});
it('blocks overlapping source entries rather than double-counting', () => {
  const f = fixture(), second = { ...entry(), id: 'second', breaks: [] };
  f.capture.entries.push({ ...second, employeeId: 'worker', status: 'CLOCKED_OUT' } as never);
  f.capture.cards[0].snapshot.entries.push(second); f.capture.cards[0].currentSource.entries.push(second);
  expect(projectRecordedSourceCapture(request(), f).state).toBe('blocked');
});

it('recognizes an open ON_BREAK parent as unresolved time', () => {
  const f = fixture(); f.capture.entries[0].status = 'ON_BREAK';
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'unresolved_time' });
});
it('does not accept recorded versions on adjustment-sourced time', () => {
  const f = chainFixture(); f.capture.entries[0].recordedVersion = 1;
  f.capture.cards[0].snapshot.entries[0].recordedVersion = 1; f.capture.cards[0].currentSource.entries[0].recordedVersion = 1;
  expect(projectRecordedSourceCapture(request(), f).state).toBe('blocked');
});
it('includes locations in full retained coverage even outside the selected context', () => {
  const f = fixture(), r = request(); r.coverage = [{ startDate: '2026-09-20', endDate: period.endDate }];
  f.capture.cards[0].period = r.coverage[0];
  const outside = { ...entry(), id: 'outside', locationId: 'lost-location', startAt: '2026-09-20T12:00:00Z', endAt: '2026-09-20T20:00:00Z', rawStartAt: '2026-09-20T12:00:00Z', rawEndAt: '2026-09-20T20:00:00Z', breaks: [] };
  for (const s of [f.capture.cards[0].snapshot, f.capture.cards[0].currentSource]) { Object.assign(s, r.coverage[0]); s.entries.push(outside); }
  expect(projectRecordedSourceCapture(r, f).state).toBe('blocked');
});

it('rejects an unsupported classification field rather than silently dropping its meaning', () => {
  const f = fixture(); Object.assign(f.capture.entries[0].breaks[0].classification, { paid: false });
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'invalid_source' });
});
it('refuses reviewed zero when an overlapping approved missing-entry leaf is omitted', () => {
  const f = chainFixture(); f.capture.entries = [];
  for (const s of [f.capture.cards[0].snapshot, f.capture.cards[0].currentSource]) s.entries = [];
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'inconsistent_lineage' });
});
it('rejects a missing-entry ancestor that changes the same-location supersession target', () => {
  const f = chainFixture();
  const l = f.capture.lineage as unknown as { requests: Array<Record<string, unknown>>; adjustments: Array<Record<string, unknown>> };
  for (const r of [l.requests[3], l.adjustments[3]]) { r.locationId = 'loc-1'; r.sourceSnapshot = { locationId: 'loc-1' }; }
  expect(projectRecordedSourceCapture(request(), f)).toEqual({ state: 'blocked', reason: 'inconsistent_lineage' });
});
