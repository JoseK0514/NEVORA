import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { installFixtureCompanyAccess } from './fixture-company-access';
import { fixtureProof } from './shift-change-api';
import { insertShift, updateShift, deleteShift, publishScheduleWithRevision, publishScheduleChanges } from './management-api';
import { readSchedulePendingChanges } from '../../lib/company-access/operational-read.server';
import { readEmployeePublishedAssignments } from '../../lib/data/employee-published-assignments.server';
import { getCalloutShift, getPublishedShift, listEmployeePublishedShifts, listSwapTargets } from '../../lib/data/exchanges';
import { randomUUID } from 'node:crypto';
import { executeShiftChange, readShiftChangeAvailability, PUBLISH_CHANGES_FIRST } from '../../lib/data/shift-changes';
import { readShiftChangeTerms } from '../../lib/data/shift-change-snapshot';
import { matchesCalloutShift } from '../../lib/shift-changes/displayed-terms';
import { readNotificationWeekState } from '../../lib/data/notification-transactions';
import { shiftBoundaryInstants } from '../../lib/business-time';

// Publish changes (Jose, 2026-10-29), end to end on disposable PostgreSQL with
// fictional people: edits to a published week are held (live row + history),
// nobody sees or is told about them until the Owner taps Publish changes.
const week = '2030-10-07';
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q = (text: string, values: unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
const count = async (table: string) => Number((await q(`SELECT count(*)::integer AS n FROM ${table}`))[0].n);
beforeEach(async () => {
  db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  await q(`UPDATE workspaces SET time_zone='America/New_York';
    INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Olga','Fictional','555-0100','OWNER','loc-1'),('manager','Mo','Fictional','555-0101','MANAGER','loc-1'),
     ('ana','Ana','Fictional','555-0102','EMPLOYEE','loc-1'),('ben','Ben','Fictional','555-0103','EMPLOYEE','loc-1');
    INSERT INTO employee_location_eligibility VALUES('ana','loc-1'),('ben','loc-1');
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT e||'-'||d,e,d,'00:00','24:00' FROM unnest(ARRAY['ana','ben']) e CROSS JOIN generate_series(0,6) d;
    INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('pc-week','loc-1','${week}','owner');`);
  await installFixtureCompanyAccess(db.executor);
});
afterEach(async () => { await db?.dispose(); });

it('holds a published edit, shows it to the Owner only, then publishes it once with one notification set', async () => {
  const base = { scheduleId: 'pc-week', date: '2030-10-08', startTime: '09:00', endTime: '17:00', actorEmployeeId: 'owner' };
  const anaShift = await insertShift({ ...base, employeeId: 'ana' }, db.executor);
  const benShift = await insertShift({ ...base, employeeId: 'ben', date: '2030-10-09' }, db.executor);
  await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'owner' }, db.executor);
  const notificationsAfterFirstPublish = await count('notifications');

  // Held edit: live row changes, history row written, no revision, no notification.
  await updateShift({ ...base, shiftId: anaShift, employeeId: 'ana', startTime: '10:00' }, db.executor);
  expect(await q("SELECT left(start_time::text,5) AS start FROM shifts WHERE id=$1", [anaShift])).toEqual([{ start: '10:00' }]);
  expect((await readNotificationWeekState([week], db.executor)).revisions).toHaveLength(1);
  expect(await count('notifications')).toBe(notificationsAfterFirstPublish);
  expect(await q("SELECT kind,shift_id,actor_employee_id,before_snapshot->>'startTime' AS before,after_snapshot->>'startTime' AS after,published_revision_id FROM schedule_pending_edits"))
    .toEqual([{ kind: 'UPDATE', shift_id: anaShift, actor_employee_id: 'owner', before: '09:00', after: '10:00', published_revision_id: null }]);

  // The Owner's read shows exactly what is waiting.
  const owner = await fixtureProof(db.executor, 'owner');
  const pending = await readSchedulePendingChanges(owner, { weekStart: week }, db.executor);
  expect(pending).toMatchObject({ state: 'ready', data: { hasPendingChanges: true, pendingCount: 1, canPublish: true, locations: [{ locationId: 'loc-1', pendingCount: 1 }],
    changes: [{ shiftId: anaShift, kind: 'CHANGED', employeeName: 'Ana Fictional', date: '2030-10-08', fields: ['TIME'], editCount: 1, lastEditedBy: { id: 'owner', name: 'Olga Fictional' },
      before: { startTime: '09:00' }, after: { startTime: '10:00' } }] } });

  // Employees still see what they were shown; exchange readers hide the held shift.
  const ana = await fixtureProof(db.executor, 'ana');
  const tz = 'America/New_York';
  expect((await readEmployeePublishedAssignments(ana, db.executor)).nextShift).toMatchObject({ shiftId: anaShift, startAt: shiftBoundaryInstants({ date: '2030-10-08', startTime: '09:00', endTime: '17:00' }, tz).startAt });
  expect(await getPublishedShift(anaShift, db.executor)).toBeNull();
  expect((await listEmployeePublishedShifts('ana', '2030-10-01', db.executor, true)).map(s => s.id)).toEqual([]);
  const benPublished = await getPublishedShift(benShift, db.executor);
  expect(benPublished?.id).toBe(benShift);
  expect((await listSwapTargets(benPublished!, 'ben', db.executor)).map(s => s.id)).toEqual([]);

  // Publish changes: one PUBLISH revision, Ana told once, Ben not, history marked.
  const published = await publishScheduleChanges({ weekStart: week, managerId: 'owner' }, db.executor);
  expect(published).toMatchObject({ published: true, revision: { revisionNumber: 2, sourceType: 'PUBLISH' } });
  const events = await q("SELECT employee_id,type FROM notifications WHERE purpose='EVENT' AND source_version=$1 ORDER BY employee_id", [published.revision!.id]);
  expect(events.map(e => e.employee_id)).toEqual(['ana']);
  expect(await q('SELECT published_revision_id FROM schedule_pending_edits')).toEqual([{ published_revision_id: published.revision!.id }]);
  expect((await readEmployeePublishedAssignments(ana, db.executor)).nextShift).toMatchObject({ startAt: shiftBoundaryInstants({ date: '2030-10-08', startTime: '10:00', endTime: '17:00' }, tz).startAt });
  expect((await readSchedulePendingChanges(owner, { weekStart: week }, db.executor))).toMatchObject({ state: 'ready', data: { hasPendingChanges: false, pendingCount: 0, changes: [] } });
  expect((await getPublishedShift(anaShift, db.executor))?.startTime).toBe('10:00');

  // Nothing left: a second Publish changes commits nothing.
  const revisions = await count('schedule_publication_revisions');
  expect(await publishScheduleChanges({ weekStart: week, managerId: 'owner' }, db.executor)).toEqual({ published: false });
  expect(await count('schedule_publication_revisions')).toBe(revisions);
});

it('history rows are append-only except the single publish mark, and a held delete keeps its snapshot', async () => {
  const shift = await insertShift({ scheduleId: 'pc-week', employeeId: 'ana', date: '2030-10-08', startTime: '09:00', endTime: '17:00', actorEmployeeId: 'owner' }, db.executor);
  await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'owner' }, db.executor);
  expect(await deleteShift(shift, 'owner', db.executor)).toBe(true);
  expect(await q("SELECT kind,shift_id,before_snapshot->>'employeeId' AS who,after_snapshot FROM schedule_pending_edits")).toEqual([{ kind: 'DELETE', shift_id: shift, who: 'ana', after_snapshot: null }]);
  await expect(q("UPDATE schedule_pending_edits SET kind='UPDATE'")).rejects.toThrow('schedule_pending_edit_immutable');
  // Ana still sees the deleted shift until it is published.
  const ana = await fixtureProof(db.executor, 'ana');
  expect((await readEmployeePublishedAssignments(ana, db.executor)).nextShift).toMatchObject({ shiftId: shift });
  const published = await publishScheduleChanges({ weekStart: week, managerId: 'owner' }, db.executor);
  expect(published.published).toBe(true);
  expect((await readEmployeePublishedAssignments(ana, db.executor)).nextShift).toBeNull();
  await expect(q('UPDATE schedule_pending_edits SET published_revision_id=NULL,published_at=NULL')).rejects.toThrow('schedule_pending_edit_immutable');
});

// Jose, 2026-10-31: the employee can always report "I can't work" for the
// shift they were shown; the Owner's approval waits for Publish changes.
it('a report on a held shift is accepted, its approval waits for Publish changes, then completes', async () => {
  const base = { scheduleId: 'pc-week', date: '2030-10-08', startTime: '09:00', endTime: '17:00', actorEmployeeId: 'owner' };
  const anaShift = await insertShift({ ...base, employeeId: 'ana' }, db.executor);
  await publishScheduleWithRevision({ locationId: 'loc-1', weekStart: week, managerId: 'owner' }, db.executor);
  await updateShift({ ...base, shiftId: anaShift, employeeId: 'ana', startTime: '10:00' }, db.executor);
  const notificationsBefore = await count('notifications');

  // Ana's page opens the held shift with the published 09:00 start, bound to the live assignment.
  const ana = await fixtureProof(db.executor, 'ana'), owner = await fixtureProof(db.executor, 'owner');
  const shown = (await getCalloutShift(anaShift, db.executor))!;
  expect(shown).toMatchObject({ id: anaShift, employeeId: 'ana', held: true, date: '2030-10-08', startTime: '09:00', endTime: '17:00' });
  const reviewed = (await readShiftChangeTerms(ana, anaShift, undefined, db.executor))!;
  expect(reviewed.source.startTime).toBe('10:00');
  expect(matchesCalloutShift(shown, reviewed.source)).toBe(true);
  // Swaps and cover offers keep refusing the held shift.
  expect(await getPublishedShift(anaShift, db.executor)).toBeNull();
  const fields = { sourceShiftId: anaShift, sourceEpisodeId: reviewed.source.assignmentEpisodeId, sourceTermsFingerprint: reviewed.sourceTermsFingerprint };
  expect((await executeShiftChange(ana, { kind: 'OFFER_COVERAGE', operationId: randomUUID(), ...fields }, db.executor)).status).toBe('blocked');

  const submitted = await executeShiftChange(ana, { kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), ...fields, reasonCode: 'ILLNESS' }, db.executor);
  expect(submitted.status).toBe('pending');
  const [callout] = await q("SELECT id,request_revision,status,source_terms->>'startTime' AS start FROM shift_callouts WHERE shift_id=$1", [anaShift]);
  expect(callout).toMatchObject({ status: 'PENDING', start: '10:00' });
  // Reviewers are told as for any report; Ben and the other employees hear nothing.
  const told = await q('SELECT DISTINCT employee_id FROM notifications ORDER BY employee_id OFFSET 0');
  expect(await count('notifications')).toBeGreaterThan(notificationsBefore);
  expect(told.map(row => row.employee_id).filter(id => id === 'ben')).toEqual([]);

  const approve = () => ({ kind: 'APPROVE_CALLOUT' as const, operationId: randomUUID(), requestId: String(callout.id), expectedRevision: Number(callout.request_revision) });
  expect(await readShiftChangeAvailability(owner, approve(), db.executor)).toEqual({ allowed: false, notice: PUBLISH_CHANGES_FIRST, refusal: 'other' });
  expect(await executeShiftChange(owner, approve(), db.executor)).toEqual({ status: 'blocked', issues: [{ code: 'STALE_TERMS', message: PUBLISH_CHANGES_FIRST }] });

  expect((await publishScheduleChanges({ weekStart: week, managerId: 'owner' }, db.executor)).published).toBe(true);
  expect((await getCalloutShift(anaShift, db.executor))).toMatchObject({ held: false, startTime: '10:00' });
  expect((await readShiftChangeAvailability(owner, approve(), db.executor)).allowed).toBe(true);
  expect((await executeShiftChange(owner, approve(), db.executor)).status).toBe('completed');
  expect(await q('SELECT status FROM shift_callouts WHERE id=$1', [callout.id])).toEqual([{ status: 'APPROVED' }]);
});
