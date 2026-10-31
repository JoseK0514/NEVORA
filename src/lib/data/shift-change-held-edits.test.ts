import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [{ id: 'legacy' }] }), queryRows: (value: unknown) => value }));
import { approveCalloutAndOpenCoverage, approveCoverageExchange, claimCoverage, createCallout, createCoverageOffer, createSwapProposal, fixture, intents, shiftChangeResult, verifyReadOnlyFences } from './shift-change-compat.test-support';
import { PUBLISH_CHANGES_FIRST } from './shift-changes';
import { calloutShiftFromRow } from './exchanges';
import { matchesCalloutShift } from '../shift-changes/displayed-terms';
import type { ShiftTerms } from '../shift-changes/types';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-10-07T12:00:00Z')); });
afterEach(() => { try { verifyReadOnlyFences(); } finally { vi.useRealTimers(); } });

// Publish changes (Jose, 2026-10-29): people must never consent to, or be
// approved into, terms they were not shown. A shift whose live row differs from
// its latest published row (here a held notes-only edit, which leaves the
// material terms fingerprint unchanged) is refused before any business write.
const hold = (r: ReturnType<typeof fixture>) => { r.state.shifts[0].notes = 'Held, not yet published'; };
// "I can't work" (Jose, 2026-10-31) is the exception: the report is accepted
// and only its approval waits for Publish changes (cases further below).
it.each([
  ['callout approval', 'CALLOUT', 'PENDING', () => approveCalloutAndOpenCoverage, { calloutId: 'request-1', managerId: 'M' }],
  ['coverage offer', 'EXCHANGE', 'OPEN', () => createCoverageOffer, { sourceShiftId: 's1', requestedByEmployeeId: 'E' }],
  ['coverage claim', 'EXCHANGE', 'OPEN', () => claimCoverage, { exchangeId: 'request-1', employeeId: 'F' }],
  ['coverage approval', 'EXCHANGE', 'MANAGER_PENDING', () => approveCoverageExchange, { exchangeId: 'request-1', managerId: 'M' }],
] as const)('%s on a shift with held edits is refused without a business write', async (_name, kind, status, run, input) => {
  const control = fixture(kind, status);
  expect(await run()(input as never, control.executor)).toBeTruthy();
  expect(control.businessBatches).toHaveLength(1);
  const r = fixture(kind, status); hold(r);
  // Compatibility adapters report a refusal as false, or (offers) as a thrown refusal.
  const refused = await run()(input as never, r.executor).then(result => !result, (error: Error) => /Current reviewed command/.test(error.message));
  expect(refused).toBe(true);
  expect(r.businessBatches).toEqual([]);
});

// "I can't work" on a shift with held edits (Jose, 2026-10-31): the employee
// can always report inability for the shift they were shown; the Owner's
// approval of that report waits until they publish the changes.
const holdTime = (r: ReturnType<typeof fixture>) => { r.state.shifts[0].startTime = '10:00'; };
const publish = (r: ReturnType<typeof fixture>) => { r.state.revisions[0].shifts[0] = { ...r.state.shifts[0] }; };
const submit = { shiftId: 's1', employeeId: 'E', reasonCode: 'ILLNESS' };
it.each([['notes-only', hold], ['time', holdTime]] as const)('a %s held edit no longer refuses the report and it notifies exactly like a normal report', async (_name, held) => {
  const control = fixture('CALLOUT', 'PENDING');
  expect(await createCallout(submit, control.executor)).toBeTruthy();
  const r = fixture('CALLOUT', 'PENDING'); held(r);
  expect(await shiftChangeResult('createCallout', submit, r.executor)).toMatchObject({ status: 'pending' });
  expect(r.businessBatches).toHaveLength(1);
  // Same reviewers, same kinds, same purposes and copy as a report on a published shift; co-workers hear nothing.
  expect(intents(r.businessBatches[0])).toEqual(intents(control.businessBatches[0]));
  expect(intents(r.businessBatches[0]).map(n => n.employee)).not.toContain('Z');
  // The stored terms are the live assignment the report binds to.
  const insert = r.businessBatches[0].find(statement => statement.text.includes('INSERT INTO shift_callouts'))!;
  expect(JSON.parse(String(insert.values[6]))).toMatchObject({ shiftId: 's1', employeeId: 'E', startTime: held === holdTime ? '10:00' : '09:00' });
});
it.each([
  ['the latest publication shows someone else on it', (r: ReturnType<typeof fixture>) => { hold(r); r.state.revisions[0].shifts[0].employeeId = 'Z'; }],
  ['the latest publication does not show it at all', (r: ReturnType<typeof fixture>) => { r.state.revisions[0].shifts = []; }],
] as const)('a held shift is not reported when %s', async (_name, arrange) => {
  const r = fixture('CALLOUT', 'PENDING'); arrange(r);
  expect(await shiftChangeResult('createCallout', submit, r.executor)).toEqual({ status: 'unavailable' });
  expect(r.businessBatches).toEqual([]);
});
it.each([['notes-only', hold], ['time', holdTime]] as const)('approving a report on a %s held shift waits for Publish changes, then succeeds', async (_name, held) => {
  const r = fixture('CALLOUT', 'PENDING'); held(r);
  expect(await shiftChangeResult('approveCalloutAndOpenCoverage', { calloutId: 'request-1', managerId: 'M' }, r.executor))
    .toEqual({ status: 'blocked', issues: [{ code: 'STALE_TERMS', message: 'Publish the schedule changes for this shift first, then approve.' }] });
  expect(PUBLISH_CHANGES_FIRST).toBe('Publish the schedule changes for this shift first, then approve.');
  expect(r.businessBatches).toEqual([]);
  // Declining is still the Owner's choice while the edit is held.
  const declined = fixture('CALLOUT', 'PENDING'); held(declined);
  expect(await shiftChangeResult('denyCallout', { calloutId: 'request-1', managerId: 'M' }, declined.executor)).toMatchObject({ status: 'closed' });
  publish(r);
  expect(await shiftChangeResult('approveCalloutAndOpenCoverage', { calloutId: 'request-1', managerId: 'M' }, r.executor)).toMatchObject({ status: 'completed' });
  expect(r.businessBatches).toHaveLength(1);
});
it('a swap from a held shift is still refused', async () => {
  const control = fixture('EXCHANGE', 'OPEN');
  control.state.shifts.push({ ...control.state.shifts[0], sourceShiftId: 's2', employeeId: 'F' }); control.state.revisions[0].shifts.push({ ...control.state.shifts[1] });
  const swap = { sourceShiftId: 's1', targetShiftId: 's2', requestedByEmployeeId: 'E', targetEmployeeId: 'F' };
  expect(await createSwapProposal(swap, control.executor)).toBeTruthy();
  const r = fixture('EXCHANGE', 'OPEN');
  r.state.shifts.push({ ...r.state.shifts[0], sourceShiftId: 's2', employeeId: 'F' }); r.state.revisions[0].shifts.push({ ...r.state.shifts[1] });
  hold(r);
  await expect(createSwapProposal(swap, r.executor)).rejects.toThrow('Current reviewed command');
  expect(r.businessBatches).toEqual([]);
});

// The employee's "I can't work" page shows the published version of a held shift.
const readerRow = (overrides: Record<string, unknown> = {}) => ({
  source_shift_id: 's1', source_time_zone: 'America/New_York', source_assignment_episode_id: 'ep-1', source_terms_revision: 3, source_schedule_id: 'a',
  source_employee_id: 'E', source_employee_name: 'Ana Fictional', source_location_id: 'L', source_location_name: 'Northside', source_week_start: '2030-10-07',
  source_date: '2030-10-12', source_start_time: '10:00:00', source_end_time: '18:00:00', source_position_id: 'p2', source_position_name: 'Grill', source_is_designated_lead: false,
  held: true, published_employee_id: 'E', published_location_id: 'L', published_location_name: 'Northside', published_date: '2030-10-11', published_start_time: '09:00:00',
  published_end_time: '17:00:00', published_position_id: 'p1', published_position_name: 'Counter', published_is_designated_lead: true, published_is_callout_approved: false, ...overrides,
});
it('the callout reader overlays the published version on the live assignment identity while held', () => {
  expect(calloutShiftFromRow(readerRow())).toEqual({
    held: true, id: 's1', timeZone: 'America/New_York', assignmentEpisodeId: 'ep-1', termsRevision: 3, scheduleId: 'a', employeeId: 'E', employeeName: 'Ana Fictional', weekStart: '2030-10-07',
    locationId: 'L', locationName: 'Northside', date: '2030-10-11', startTime: '09:00', endTime: '17:00', positionId: 'p1', positionName: 'Counter', isDesignatedLead: true,
  });
  // Not held: the live row is the published row.
  expect(calloutShiftFromRow(readerRow({ held: false }))).toMatchObject({ held: false, date: '2030-10-12', startTime: '10:00', endTime: '18:00', positionName: 'Grill', isDesignatedLead: false });
  // Held and never shown to this employee (reassigned or added, not yet published), or already released: not offered.
  expect(calloutShiftFromRow(readerRow({ published_employee_id: 'Z' }))).toBeNull();
  expect(calloutShiftFromRow(readerRow({ published_employee_id: null }))).toBeNull();
  expect(calloutShiftFromRow(readerRow({ published_is_callout_approved: true }))).toBeNull();
});
it('a held shift binds the report to the live assignment identity, not to the displayed times', () => {
  const shown = calloutShiftFromRow(readerRow())!;
  const live = { shiftId: 's1', scheduleId: 'a', workspaceId: 'northside', timeZone: 'America/New_York', weekStart: '2030-10-07', date: '2030-10-12', startTime: '10:00', endTime: '18:00', locationId: 'L',
    employeeId: 'E', assignmentEpisodeId: 'ep-1', termsRevision: 3, positionId: 'p2', isDesignatedLead: false, scheduledBreaks: { status: 'UNKNOWN' } } as ShiftTerms;
  expect(matchesCalloutShift(shown, live)).toBe(true);
  expect(matchesCalloutShift(shown, { ...live, assignmentEpisodeId: 'ep-2' })).toBe(false);
  expect(matchesCalloutShift(shown, { ...live, employeeId: 'Z' })).toBe(false);
  expect(matchesCalloutShift(shown, { ...live, timeZone: 'America/Chicago' })).toBe(false);
  // A shift that is not held keeps the full displayed-terms comparison.
  const unheld = calloutShiftFromRow(readerRow({ held: false }))!;
  expect(matchesCalloutShift(unheld, live)).toBe(true);
  expect(matchesCalloutShift(unheld, { ...live, startTime: '11:00' })).toBe(false);
});

// This SQL-assembly fixture models admission I/O only, as in callouts-notifications.test.ts.
vi.mock('@/lib/company-access/operational-scope.server', async original => ({
 ...await original<Record<string,unknown>>(),
 assertOperationalAccess: async () => ({
  scope:{mode:'COMPANY',locationIds:[]},authority:'b'.repeat(64),
  observedAt:'2030-10-07T12:00:00.000Z',validForMs:15000,
  workspace:{id:'northside',name:'Northside',active:true,timeZone:'America/New_York',createdAt:'2030-01-01 00:00:00+00',updatedAt:'2030-01-01 00:00:00.123456+00'},
 }),
}));
