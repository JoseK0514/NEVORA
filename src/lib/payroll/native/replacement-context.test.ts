import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import reproduction from './nqaf001-reproduction.test-support.json';
import { projectRecordedSourceCapture, type RecordedSourceRequest } from './recorded-source.server';

function replacement() {
    const row = structuredClone(reproduction.rawCapture[0]);
    // Fictional temporal controls for unit tests; actual immutable revision times are exercised in SQL.
    Object.assign(row.capture.cards[0], { occurredAt: '2026-10-13T14:00:00Z' });
    Object.assign(row.capture.cards[1], { approvalOccurredAt: '2026-10-13T14:01:00Z', occurredAt: '2026-10-13T14:02:00Z' });
    return { request: structuredClone(reproduction.request) as RecordedSourceRequest, row };
}
it('NQAF001 recognizes later complete approved/finalized context while retaining the older reopened observation', () => {
    const { request, row } = replacement();
    const result = projectRecordedSourceCapture(request, row);
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') throw Error('Replacement authority required');
    expect(result.contexts).toEqual([{ startAt: '2026-09-15T04:00:00Z', endAt: '2026-10-05T04:01:00Z' }]);
    expect(result.coverage.map(c => [c.startDate, c.endDate])).toEqual([['2026-09-15', '2026-10-05']]);
    expect(result.entries.map(e => e.id)).toEqual(['r2-current', 'cap-policy-oct1']);
    expect(result.supersededCoverage).toHaveLength(1);
    expect(result.supersededCoverage[0]).toMatchObject({ startDate: '2026-09-08', endDate: '2026-09-28', action: 'REOPEN', revision: 3, operationId: row.capture.cards[0].operationId });
});
it.each(['APPROVE', 'REOPEN'])('does not substitute an unfinalized covering %s card', action => {
    const { request, row } = replacement();row.capture.cards[1].action = action;
    expect(projectRecordedSourceCapture(request, row).state).toBe('blocked');
});
it.each(['newer_reopening', 'approval_before_reopening', 'missing_time', 'future_finalization'])('does not suppress uncertain or newer custody %s', defect => {
    const { request, row } = replacement();
    if (defect === 'newer_reopening') Object.assign(row.capture.cards[0], { occurredAt: '2026-10-13T14:03:00Z' });
    if (defect === 'approval_before_reopening') Object.assign(row.capture.cards[1], { approvalOccurredAt: '2026-10-13T13:59:00Z' });
    if (defect === 'missing_time') Object.assign(row.capture.cards[0], { occurredAt: null });
    if (defect === 'future_finalization') Object.assign(row.capture.cards[1], { occurredAt: '2026-10-14T14:02:00Z' });
    expect(projectRecordedSourceCapture(request, row).state).toBe('blocked');
});
it.each(['changed_current', 'missing_current', 'pending_current', 'changed_finalized', 'self_approval', 'missing_approval', 'foreign_location'])('retains source/lineage/location fences %s', defect => {
    const { request, row } = replacement();
    if (defect === 'changed_current') row.capture.cards[0].currentSource.entries[0].recordedVersion = 2;
    if (defect === 'missing_current') row.capture.cards[0].currentSource.entries = [];
    if (defect === 'pending_current') row.capture.cards[0].currentSource.pendingCorrections = 1;
    if (defect === 'changed_finalized') row.capture.cards[1].currentSource.entries[0].recordedVersion = 2;
    if (defect === 'self_approval') row.capture.cards[1].approvalActorEmployeeId = request.employeeId;
    if (defect === 'missing_approval') row.capture.cards[1].approvalSourceHash = null;
    if (defect === 'foreign_location') row.capture.lineage.locations[0].workspaceId = 'foreign';
    expect(projectRecordedSourceCapture(request, row).state).toBe('blocked');
});
it('retains older historical location disclosure when current replacement authority supersedes changed historical timing', () => {
    const { request, row } = replacement();
    row.capture.cards[0].snapshot.entries[0].locationId = 'historical-loc';
    row.capture.lineage.locations.push({ id: 'historical-loc', workspaceId: request.workspaceId });
    const result = projectRecordedSourceCapture(request, row);
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') throw Error('Replacement authority required');
    expect(result.locationIds).toEqual(['historical-loc', 'loc-1']);
    expect(result.supersededCoverage[0].snapshot.entries[0].locationId).toBe('historical-loc');
});
it('requires terminal-date coverage rather than silently accepting a shorter finalized replacement', () => {
    const { request, row } = replacement();
    request.coverage[1].endDate = '2026-10-04';
    for (const p of [row.capture.cards[1].period, row.capture.cards[1].snapshot, row.capture.cards[1].currentSource]) p.endDate = '2026-10-04';
    expect(projectRecordedSourceCapture(request, row)).toEqual({ state: 'blocked', reason: 'coverage_missing' });
});
it('fences superseded observation identity and time rather than discarding it from review custody', () => {
    const a = replacement(), b = replacement();
    Object.assign(b.row.capture.cards[0], { occurredAt: '2026-10-13T14:00:01Z' });
    const first = projectRecordedSourceCapture(a.request, a.row), second = projectRecordedSourceCapture(b.request, b.row);
    expect(first.state).toBe('ready');expect(second.state).toBe('ready');
    if (first.state !== 'ready' || second.state !== 'ready') throw Error('Replacement authority required');
    expect(second.sourceFence).not.toBe(first.sourceFence);
});

it('accepts the union of later adjacent finalized contexts without requiring one arbitrary covering period', () => {
    const { request, row } = replacement();
    const first = structuredClone(row.capture.cards[1]), second = structuredClone(row.capture.cards[1]);
    first.period.endDate = '2026-09-28';first.snapshot.endDate = '2026-09-28';first.currentSource.endDate = '2026-09-28';first.snapshot.entries = first.snapshot.entries.slice(0, 1);first.currentSource.entries = first.currentSource.entries.slice(0, 1);
    second.period.startDate = '2026-09-29';second.snapshot.startDate = '2026-09-29';second.currentSource.startDate = '2026-09-29';second.snapshot.entries = second.snapshot.entries.slice(1);second.currentSource.entries = second.currentSource.entries.slice(1);
    second.operationId = '00000000-0000-4000-8000-000000000101';second.approvalOperationId = '00000000-0000-4000-8000-000000000102';
    row.capture.cards = [row.capture.cards[0], first, second];request.coverage = row.capture.cards.map(c => c.period);
    const result = projectRecordedSourceCapture(request, row);expect(result.state).toBe('ready');
    if (result.state !== 'ready') throw Error('Complete finalized union required');
    expect(result.coverage.map(c => [c.startDate, c.endDate])).toEqual([['2026-09-15', '2026-09-28'], ['2026-09-29', '2026-10-05']]);
    expect(result.entries.map(e => e.id)).toEqual(['r2-current', 'cap-policy-oct1']);
});
it('rejects inconsistent overlapping finalized snapshots rather than resolving them by arbitrary preference', () => {
    const { request, row } = replacement();const older = row.capture.cards[0];
    Object.assign(older, { action: 'FINALIZE', approvalRevision: 2, approvalSourceHash: older.sourceHash, approvalOperationId: '00000000-0000-4000-8000-000000000103', approvalActorEmployeeId: older.actorEmployeeId });
    older.snapshot.entries[0].recordedVersion = 2;older.currentSource.entries[0].recordedVersion = 2;
    expect(projectRecordedSourceCapture(request, row)).toEqual({ state: 'blocked', reason: 'stale_source' });
});


function outsideCurrentLocation() {
    const { request, row } = replacement();
    const entry = structuredClone(row.capture.cards[0].currentSource.entries[0]);
    Object.assign(entry, { id: 'outside-current', locationId: 'loc-2', locationName: 'Fictional outside location',
        startAt: '2026-09-10T12:00:00Z', endAt: '2026-09-10T20:00:00Z', rawStartAt: '2026-09-10T12:00:00Z', rawEndAt: '2026-09-10T20:00:00Z' });
    row.capture.cards[0].currentSource.entries.unshift(entry);
    return { request, row };
}
it('requires the whole retained current-source location footprint outside the required window', () => {
    const { request, row } = outsideCurrentLocation();
    row.capture.lineage.locations.push({ id: 'loc-2', workspaceId: request.workspaceId });
    const result = projectRecordedSourceCapture(request, row);
    expect(result.state).toBe('ready');
    if (result.state !== 'ready') throw Error('Verified current-source locations required');
    expect(result.locationIds).toEqual(['loc-1', 'loc-2']);
    expect(result.supersededCoverage[0].snapshot.entries.some(e => e.locationId === 'loc-2')).toBe(false);
    expect(result.supersededCoverage[0].currentSource.entries[0].locationId).toBe('loc-2');
});
it.each(['missing', 'foreign'])('blocks retained outside-window current source with %s location metadata', defect => {
    const { request, row } = outsideCurrentLocation();
    if (defect === 'foreign') row.capture.lineage.locations.push({ id: 'loc-2', workspaceId: 'foreign-workspace' });
    expect(projectRecordedSourceCapture(request, row)).toEqual({ state: 'blocked', reason: 'identity_mismatch' });
});
