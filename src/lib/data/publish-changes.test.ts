import { managementProof, schedulingSourceFixture } from '../../test/fixtures/management';
import { assignmentFacts } from './assignment-facts.test-support';
import { beforeEach, expect, it, vi } from 'vitest';
import { publishScheduleChanges } from './publication-revisions';
import { commitPublishedWeekChange, pendingPublicationChanges, patchPublishedProjection, type GuardedWeekState } from './notification-transactions';
import { insertShiftAtLocation } from './schedules';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { OperationalFootprint } from '../company-access/model';

// Publish changes (Jose, 2026-10-29): held manual edits publish once, on
// Publish changes; a swap/callout in that week publishes only its own change.
const access = vi.hoisted(() => ({ footprints: [] as unknown[] }));
vi.mock('@/lib/company-access/operational-scope.server', async original => ({ ...await original<Record<string, unknown>>(),
  assertOperationalAccess: async (_proof: unknown, footprint: unknown) => { access.footprints.push(footprint); return { scope: { mode: 'COMPANY', locationIds: [] }, workspace: { id: 'test-workspace', name: 'Fictional', active: true, timeZone: 'America/Puerto_Rico', createdAt: '', updatedAt: '2030-01-01 00:00:00.123456+00' } }; } }));

const week = '2030-10-07';
const s1 = { sourceShiftId: 's1', scheduleId: 'a', weekStart: week, locationId: 'loc-1', employeeId: 'E', date: '2030-10-11', startTime: '09:00', endTime: '17:00', isDesignatedLead: false, isCalloutApproved: false, hasExchangeHistory: false };
const s2 = { ...s1, sourceShiftId: 's2', employeeId: 'F', date: '2030-10-12' };
/** Week published at r1 with s1 (E) and s2 (F); s1 then edited (held) to 10:00. */
function heldWeek(): GuardedWeekState {
  return { assignmentFacts: assignmentFacts(), schedules: [{ id: 'a', locationId: 'loc-1', weekStart: week, status: 'PUBLISHED', updatedAt: '2030-10-07 12:00:00.123456+00' }],
    shifts: [{ ...s1, startTime: '10:00' }, { ...s2 }],
    revisions: [{ id: 'r1', weekStart: week, revisionNumber: 1, sourceType: 'PUBLISH', createdBy: 'M', createdAt: '2030-10-06T12:00:00Z', shifts: [{ ...s1, positionName: 'Captured' }, { ...s2 }] }],
    acknowledgements: [], recipients: [{ employeeId: 'E', role: 'EMPLOYEE', active: true, allowedLocationIds: ['loc-1', 'loc-2'] }, { employeeId: 'F', role: 'EMPLOYEE', active: true, allowedLocationIds: ['loc-1', 'loc-2'] }, { employeeId: 'G', role: 'EMPLOYEE', active: true, allowedLocationIds: ['loc-1', 'loc-2'] }] };
}
function recorder(initial: GuardedWeekState) {
  const batches: SqlStatement[][] = [];
  const executor: SqlExecutor = {
    query: vi.fn(async statement => statement.text.startsWith('SELECT id, name, time_zone') ? [{ id: 'test-workspace', name: 'Test', active: true, timeZone: 'America/Puerto_Rico', createdAt: '', updatedAt: '2030-01-01 00:00:00.123456+00' }]
      : statement.text.includes('AS state') ? [{ state: structuredClone(initial), source: schedulingSourceFixture(initial), read_at: '2030-10-07 12:00:00.654321+00' }] : []) as SqlExecutor['query'],
    transaction: vi.fn(async statements => { batches.push([...statements]); return statements.map(() => []); }),
  };
  return { executor, batches };
}
const events = (batch: SqlStatement[]) => batch.filter(s => s.text.includes('INSERT INTO notifications') && s.values[12] === 'EVENT').map(s => s.values[1]);
beforeEach(() => { vi.stubEnv('PUSH_ENVIRONMENT', 'test'); access.footprints.length = 0; });

it('reports pending changes by canonical comparison, including a notes-only edit', () => {
  const state = heldWeek();
  expect(pendingPublicationChanges(state, week)).toMatchObject({ hasPendingChanges: true, changes: [{ sourceShiftId: 's1', before: expect.objectContaining({ startTime: '09:00' }), after: expect.objectContaining({ startTime: '10:00' }) }] });
  state.shifts[0].startTime = '09:00'; state.shifts[0].notes = 'Bring keys';
  expect(pendingPublicationChanges(state, week).changes.map(c => c.sourceShiftId)).toEqual(['s1']);
  state.shifts[0].notes = undefined;
  expect(pendingPublicationChanges(state, week)).toMatchObject({ hasPendingChanges: false, changes: [] });
});

it('Publish changes writes one whole-week revision, one diff notification set and marks history in the same transaction', async () => {
  const r = recorder(heldWeek());
  const result = await publishScheduleChanges({ weekStart: week, managerId: 'M', proof: managementProof('M') }, r.executor);
  expect(result.published).toBe(true); expect(r.batches).toHaveLength(1);
  const batch = r.batches[0], texts = batch.map(s => s.text);
  expect(batch.filter(s => s.text.includes('INSERT INTO schedule_publication_revisions')).map(s => s.values[3])).toEqual(['PUBLISH']);
  const capture = batch.find(s => s.text.includes('INSERT INTO schedule_publication_revision_shifts'))!;
  expect(capture.text).toContain('FROM shifts sh JOIN schedules s');
  const mark = texts.findIndex(t => t.includes('UPDATE schedule_pending_edits SET published_revision_id'));
  expect(mark).toBeGreaterThan(texts.indexOf(capture.text));
  expect(batch[mark].values).toEqual([result.revision!.id, result.revision!.createdAt, week]);
  // Only E's shift changed, so only E is told; F's unchanged shift sends nothing.
  expect(events(batch)).toEqual(['E']);
  expect(access.footprints).toContainEqual({ kind: 'COMPANY' });
});

it('Publish changes with nothing pending commits nothing', async () => {
  const state = heldWeek(); state.shifts[0].startTime = '09:00';
  const r = recorder(state);
  expect(await publishScheduleChanges({ weekStart: week, managerId: 'M', proof: managementProof('M') }, r.executor)).toEqual({ published: false });
  expect(r.batches).toEqual([]);
});

it('a notes-only held edit publishes a revision without sending anyone a schedule change', async () => {
  const state = heldWeek(); state.shifts[0].startTime = '09:00'; state.shifts[0].notes = 'Bring keys';
  const r = recorder(state);
  expect((await publishScheduleChanges({ weekStart: week, managerId: 'M', proof: managementProof('M') }, r.executor)).published).toBe(true);
  expect(r.batches[0].some(s => s.text.includes('INSERT INTO schedule_publication_revisions'))).toBe(true);
  expect(events(r.batches[0])).toEqual([]);
});

it('a swap in a week with held edits publishes and notifies only its own change, built from values', async () => {
  const r = recorder(heldWeek());
  const result = await commitPublishedWeekChange({ weekStarts: [week], actorEmployeeId: 'M', sourceType: 'EXCHANGE',
    build: state => ({ statements: [{ text: 'SWAP', values: [] }], afterSchedules: state.schedules, afterShifts: state.shifts.map(sh => sh.sourceShiftId === 's2' ? { ...sh, employeeId: 'G' } : sh) }) }, r.executor);
  expect(result.revisions).toHaveLength(1);
  const batch = r.batches[0];
  const capture = batch.find(s => s.text.includes('INSERT INTO schedule_publication_revision_shifts'))!;
  expect(capture.text).not.toMatch(/FROM shifts\b/);
  const rows = JSON.parse(String(capture.values[1])) as { source_shift_id: string; start_time: string; employee_id: string; position_name: string | null; captured: boolean }[];
  // s1 keeps its published 09:00 (the held 10:00 keeps waiting); s2 moves to G.
  expect(rows.map(x => [x.source_shift_id, x.employee_id, x.start_time, x.captured])).toEqual([['s1', 'E', '09:00', true], ['s2', 'G', '09:00', false]]);
  expect(rows[0].position_name).toBe('Captured');
  expect(events(batch).sort()).toEqual(['F', 'G']);
  expect(batch.some(s => s.text.includes('schedule_pending_edits'))).toBe(false);
});

it('patches only shifts the batch changed and removes deleted ones', () => {
  const latest = [{ ...s1 }, { ...s2 }];
  expect(patchPublishedProjection(latest, [{ ...s1, startTime: '10:00' }, { ...s2 }], [{ ...s1, startTime: '10:00' }])).toEqual([{ ...s1 }]);
});

it('a location-scoped draft edit is not widened to COMPANY by held edits elsewhere in the week', async () => {
  const state = heldWeek(); state.schedules.push({ id: 'b', locationId: 'loc-2', weekStart: week, status: 'DRAFT', updatedAt: '2030-10-07 12:00:00.123456+00' });
  const r = recorder(state);
  await insertShiftAtLocation({ locationId: 'loc-2', weekStart: week, employeeId: 'F', date: '2030-10-09', startTime: '09:00', endTime: '13:00', actorEmployeeId: 'M', proof: managementProof('M') }, r.executor);
  expect(r.batches).toHaveLength(1);
  expect(access.footprints.at(-1)).toEqual({ kind: 'LOCATIONS', locationIds: ['loc-2'] } satisfies OperationalFootprint);
  expect(r.batches[0].some(s => s.text.includes('INSERT INTO schedule_publication_revisions') || s.text.includes('INSERT INTO notifications'))).toBe(false);
});

it('a consented coverage repair (non-deferred manager write) in a week with held edits publishes only its own new shift', async () => {
  const r = recorder(heldWeek());
  const result = await commitPublishedWeekChange({ weekStarts: [week], actorEmployeeId: 'M', proof: managementProof('M'), sourceType: 'MANAGER_MUTATION',
    build: state => ({ statements: [{ text: 'REPAIR', values: [] }], afterSchedules: state.schedules, afterShifts: [...state.shifts, { ...s2, sourceShiftId: 'repair', employeeId: 'G', date: '2030-10-10' }] }) }, r.executor);
  expect(result.revisions).toHaveLength(1);
  const capture = r.batches[0].find(s => s.text.includes('INSERT INTO schedule_publication_revision_shifts'))!;
  expect(capture.text).not.toMatch(/FROM shifts\b/);
  expect((JSON.parse(String(capture.values[1])) as { source_shift_id: string; start_time: string }[]).map(x => [x.source_shift_id, x.start_time])).toEqual([['s1', '09:00'], ['s2', '09:00'], ['repair', '09:00']]);
  expect(events(r.batches[0])).toEqual(['G']);
  expect(r.batches[0].some(s => s.text.includes('schedule_pending_edits'))).toBe(false);
});
