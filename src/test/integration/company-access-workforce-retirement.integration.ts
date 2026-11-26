import { randomUUID } from 'node:crypto';
import { expect, it, rs } from '@rstest/core';
import { Client } from 'pg';
import { readOwnerOperationalScope } from '../../lib/company-access/operational-scope.server';
import { saveEmployeeCoreAccessProfile } from '../../lib/company-access/employee-profile.server';
import { getEmployeeManagementProfile } from '../../lib/data/employees';
import { readEmployeeWeeklyReview } from '../../lib/data/employee-weekly-review.server';
import { findActiveLocationByClockerKey, listLocations, updateLocation } from '../../lib/data/locations';
import { executeOpenShift } from '../../lib/data/open-shifts.server';
import { listPositions, updatePosition } from '../../lib/data/positions';
import { publishScheduleChanges, publishScheduleWithRevision } from '../../lib/data/publication-revisions';
import { deleteShift, getShiftForManagement, insertShiftAtLocation, updateShift } from '../../lib/data/schedules';
import { readShiftChangeTerms } from '../../lib/data/shift-change-snapshot';
import { executeShiftChange } from '../../lib/data/shift-changes';
import { readManagerTimeCorrections } from '../../lib/data/time-corrections.server';
import { closeManagedTimeEntry, readManagementCloseContext } from '../../lib/management-close/service.server';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { reviewTimeCorrection, submitTimeCorrection } from '../../lib/time-corrections/service';
import { companyAccessFixture } from './company-access-fixture';

rs.mock('server-only', () => ({}));

const week = '2090-01-02';
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const worker: SessionMutationProof = {
  employee: { id: 'target', firstName: 'Target', lastName: 'QA', role: 'EMPLOYEE', primaryLocationId: 'loc-1' },
  sessionTokenHash: 'd'.repeat(64),
};

type Fixture = Awaited<ReturnType<typeof companyAccessFixture>>;

async function setWorkerActive(f: Fixture, active: boolean, primaryLocationId = 'loc-1') {
  const scope = await readOwnerOperationalScope(f.owner, 'target', f.db.executor);
  if (scope.state !== 'ready') throw new Error('Missing Owner employee context');
  return saveEmployeeCoreAccessProfile(f.owner, {
    operationId: randomUUID(), employeeId: 'target',
    expectedEmployeeUpdatedAt: scope.data.current.employeeUpdatedAt,
    profile: {
      firstName: 'Target', lastName: 'QA', email: 'target@example.invalid', phone: '7875550103',
      role: 'EMPLOYEE', primaryLocationId, active,
    },
  }, f.db.executor);
}

async function retirementFixture() {
  const f = await companyAccessFixture();
  const sql = f.db.executor;
  try {
    await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
      VALUES('replacement','Replacement','QA','555004','EMPLOYEE','loc-2');
      INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
        VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour');
      INSERT INTO employee_location_eligibility VALUES
        ('target','loc-1'),('target','loc-2'),('replacement','loc-1'),('replacement','loc-2');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time)
        SELECT employee_id||day,employee_id,day,'00:00','24:00'
        FROM unnest(ARRAY['target','replacement']) employee_id CROSS JOIN generate_series(0,6) day;
      INSERT INTO positions(id,workspace_id,name) SELECT 'retiring-position',id,'Service' FROM workspaces;
      INSERT INTO employee_positions VALUES('target','retiring-position'),('replacement','retiring-position');
      INSERT INTO schedules(id,location_id,week_start,created_by)
        VALUES('retiring-schedule','loc-1','${week}','owner'),('receiving-schedule','loc-2','${week}','owner');
      INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES
        ('first','retiring-schedule','target','${week}','08:00','10:00','retiring-position'),
        ('second','retiring-schedule','target','${week}','11:00','13:00','retiring-position'),
        ('receiving','receiving-schedule','target','${week}','14:00','16:00','retiring-position');
      INSERT INTO clocker_devices(id,location_id,name) VALUES('retiring-device','loc-1','Fictional tablet');
      INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES
        ('retiring-open','target','loc-1','retiring-device',clock_timestamp()-interval '4 hours',NULL,'CLOCKED_IN'),
        ('retiring-closed','target','loc-1','retiring-device',clock_timestamp()-interval '28 hours',clock_timestamp()-interval '26 hours','CLOCKED_OUT');`);
    const requestId = randomUUID();
    const request = await submitTimeCorrection(worker, {
      operationId: requestId, kind: 'ENTRY_BOUNDARY', timeEntryId: 'retiring-closed',
      proposedStartAt: ago(1675), proposedEndAt: ago(1560), reason: 'Fictional request about the prior day.',
    }, sql);
    expect(request).toMatchObject({ status: 'pending', requestId });
    const publishLocation = (locationId: string) => publishScheduleWithRevision({
      locationId, weekStart: week, managerId: 'owner', proof: f.owner,
    }, sql);
    await publishLocation('loc-1');
    const original = (await publishLocation('loc-2')).revision!;
    const location = (await listLocations({}, sql)).find(row => row.id === 'loc-1')!;
    const retire = (proof = f.owner) => updateLocation({
      ...location, name: 'Closed site', expectedUpdatedAt: location.updatedAt, active: false,
      actorEmployeeId: proof.employee.id, proof,
    }, sql);
    const close = async () => {
      const context = await readManagementCloseContext(f.owner, 'retiring-open', sql);
      if (context.state !== 'ready') throw new Error('Missing Owner close context');
      return closeManagedTimeEntry(f.owner, {
        operationId: randomUUID(), timeEntryId: 'retiring-open', expectedSourceHash: context.sourceHash,
        closedAt: ago(30), reason: 'Verified end time with the fictional employee.',
      }, context.authority, sql);
    };
    const review = () => reviewTimeCorrection(f.owner, {
      operationId: randomUUID(), requestId, expectedRevision: 1, decision: 'REJECT',
      note: 'Fictional recorded boundaries were confirmed.',
    }, sql);
    const reassign = async (shiftId: string) => {
      const shift = (await getShiftForManagement(shiftId, sql))!;
      return updateShift({
        shiftId, expectedReviewVersion: shift.reviewVersion, employeeId: 'replacement',
        date: shift.date, startTime: shift.startTime, endTime: shift.endTime, actorEmployeeId: 'owner', proof: f.owner,
      }, sql);
    };
    const cancel = async (shiftId: string) => {
      const shift = (await getShiftForManagement(shiftId, sql))!;
      return deleteShift(shiftId, f.owner, sql, shift.reviewVersion);
    };
    const republish = () => publishScheduleChanges({ weekStart: week, managerId: 'owner', proof: f.owner }, sql);
    const reviewShifts = () => readEmployeeWeeklyReview(worker, week, sql);
    const shiftsAt = (revisionId: string) => f.q<{ source_shift_id: string; employee_id: string; position_name: string }>(
      'SELECT source_shift_id,employee_id,position_name FROM schedule_publication_revision_shifts WHERE revision_id=$1 ORDER BY source_shift_id', [revisionId],
    );
    return { ...f, sql, location, original, requestId, retire, close, review, reassign, cancel, republish, reviewShifts, shiftsAt };
  } catch (error) {
    await f.db.dispose();
    throw error;
  }
}

it('keeps a location active until the Owner clears its punch, pending request and current publication', async () => {
  const f = await retirementFixture();
  try {
    const replacementShift = await insertShiftAtLocation({
      locationId: 'loc-2', weekStart: week, date: week, employeeId: 'replacement',
      startTime: '11:00', endTime: '13:00', positionId: 'retiring-position',
      actorEmployeeId: 'owner', proof: f.owner,
    }, f.sql);
    const originalShifts = await f.shiftsAt(f.original.id);
    await expect(f.retire(f.manager)).rejects.toThrow('Only an active Owner');
    await expect(f.retire()).rejects.toMatchObject({ blockers: ['SCHEDULE', 'OPEN_TIME', 'TIME_CORRECTIONS'] });
    expect(await findActiveLocationByClockerKey(f.location.clockerKey, f.sql)).toMatchObject({ id: f.location.id, active: true });
    expect((await listLocations({}, f.sql)).find(location => location.id === f.location.id)).toEqual(f.location);
    expect(await f.reviewShifts()).toMatchObject({ shifts: [{ id: 'first' }, { id: 'second' }, { id: 'receiving' }] });
    expect(await f.q("SELECT status FROM time_entries WHERE id='retiring-open'")).toEqual([{ status: 'CLOCKED_IN' }]);
    expect(await readManagerTimeCorrections(f.owner, f.sql)).toMatchObject({ state: 'ready', requests: [{ id: f.requestId, status: 'PENDING' }] });

    expect((await f.close()).status).toBe('closed');
    await expect(f.retire()).rejects.toMatchObject({ blockers: ['SCHEDULE', 'TIME_CORRECTIONS'] });
    expect((await f.review()).status).toBe('rejected');
    expect(await f.reassign('first')).toBe(true);
    expect(await f.reassign('receiving')).toBe(true);
    expect(await f.cancel('first')).toBe(true);
    expect(await f.cancel('second')).toBe(true);
    // Draft edits removed the live rows, but staff still have the old commitments.
    await expect(f.retire()).rejects.toMatchObject({ blockers: ['SCHEDULE'] });
    expect(await f.reviewShifts()).toMatchObject({ shifts: [{ id: 'first' }, { id: 'second' }, { id: 'receiving' }] });

    const final = await f.republish();
    expect(final.published).toBe(true);
    expect(await f.shiftsAt(final.revision!.id)).toEqual([
      { source_shift_id: replacementShift, employee_id: 'replacement', position_name: 'Service' },
      { source_shift_id: 'receiving', employee_id: 'replacement', position_name: 'Service' },
    ]);
    expect(await f.q("SELECT employee_id FROM notifications WHERE purpose='EVENT' AND source_version=$1 ORDER BY employee_id",
      [final.revision!.id])).toEqual([{ employee_id: 'replacement' }, { employee_id: 'target' }]);
    expect(await f.reviewShifts()).toMatchObject({ displayedRevisionId: final.revision!.id, shifts: [] });

    expect(await f.retire()).toMatchObject({ active: false, clockerKey: f.location.clockerKey });
    expect(await findActiveLocationByClockerKey(f.location.clockerKey, f.sql)).toBeNull();
    expect((await listLocations({includeInactive:true}, f.sql)).find(location => location.id === f.location.id)).toMatchObject({
      active: false, name: 'Closed site',
    });
    const [position] = await listPositions({}, f.sql);
    expect(await updatePosition({
      id: position.id, name: position.name, active: false, expectedUpdatedAt: position.updatedAt,
      actorEmployeeId: 'owner', proof: f.owner,
    }, f.sql)).toMatchObject({ id: position.id, active: false });
    expect(await listPositions({ includeInactive: true }, f.sql)).toEqual([expect.objectContaining({ id: position.id, active: false })]);
    expect(await f.shiftsAt(f.original.id)).toEqual(originalShifts);
    expect(await f.q("SELECT employee_id,location_id,status FROM time_entries WHERE id='retiring-open'")).toEqual([
      { employee_id: 'target', location_id: f.location.id, status: 'CLOCKED_OUT' },
    ]);
    expect(await f.q("SELECT time_entry_id FROM management_time_closes")).toEqual([{ time_entry_id: 'retiring-open' }]);
    expect(await f.q('SELECT event_kind FROM time_correction_events WHERE request_id=$1 ORDER BY revision',
      [f.requestId])).toEqual([{ event_kind: 'REQUESTED' }, { event_kind: 'REJECTED' }]);
  } finally {
    await f.db.dispose();
  }
});

it('surfaces site-specific open postings and pending shift requests without changing their history', async () => {
  const f = await retirementFixture();
  try {
    const posting = {
      kind: 'post', id: randomUUID(), locationId: 'loc-1', positionId: 'retiring-position',
      date: week, startTime: '16:00', endTime: '18:00',
    };
    expect(await executeOpenShift(f.owner, posting, f.sql)).toMatchObject({ state: 'posted' });
    const terms = await readShiftChangeTerms(worker, 'first', undefined, f.sql);
    if (!terms) throw new Error('Missing published terms');
    expect(await executeShiftChange(worker, {
      kind: 'SUBMIT_CALLOUT', operationId: randomUUID(), sourceShiftId: 'first',
      sourceEpisodeId: terms.source.assignmentEpisodeId, sourceTermsFingerprint: terms.sourceTermsFingerprint,
      reasonCode: 'ILLNESS',
    }, f.sql)).toMatchObject({ status: 'pending' });
    const [request] = await f.q<{id:string; request_revision:number}>('SELECT id,request_revision FROM shift_callouts');
    const blockers = ['SCHEDULE', 'OPEN_SHIFT_POSTINGS', 'OPEN_TIME', 'TIME_CORRECTIONS', 'SHIFT_REQUESTS'];
    await expect(f.retire()).rejects.toMatchObject({ blockers });
    expect(await f.q('SELECT status FROM shift_callouts')).toEqual([{ status: 'PENDING' }]);
    expect(await executeOpenShift(f.owner, { kind: 'withdraw', id: posting.id }, f.sql)).toMatchObject({ state: 'withdrawn' });
    expect(await executeShiftChange(f.owner, {
      kind: 'DECLINE_CALLOUT', operationId: randomUUID(), requestId: request.id, expectedRevision: request.request_revision,
    }, f.sql)).toMatchObject({ status: 'closed' });
    await expect(f.retire()).rejects.toMatchObject({ blockers: ['SCHEDULE', 'OPEN_TIME', 'TIME_CORRECTIONS'] });
    expect(await f.q('SELECT status FROM shift_callouts')).toEqual([{ status: 'DENIED' }]);
    expect(await f.q('SELECT withdrawn_by FROM manager_open_shifts')).toEqual([{ withdrawn_by: 'owner' }]);
  } finally {
    await f.db.dispose();
  }
});

it('sees a punch committed while retirement waits for the workspace lock', async () => {
  const f = await companyAccessFixture();
  const punchWriter = new Client({ connectionString: f.db.connectionString });
  const location = (await listLocations({}, f.db.executor)).find(row => row.id === 'loc-1')!;
  let retire: Promise<unknown> | undefined;
  try {
    await f.q("INSERT INTO clocker_devices(id,location_id,name) VALUES('concurrent-device','loc-1','Fictional tablet')");
    await punchWriter.connect();
    await punchWriter.query('BEGIN');
    await punchWriter.query('SELECT id FROM workspaces WHERE singleton FOR SHARE');
    const { rows: [{ pid }] } = await punchWriter.query('SELECT pg_backend_pid() AS pid');
    await punchWriter.query(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status)
      VALUES('concurrent-punch','target','loc-1','concurrent-device',clock_timestamp(),'CLOCKED_IN')`);
    retire = updateLocation({
      ...location, expectedUpdatedAt: location.updatedAt, active: false, actorEmployeeId: 'owner', proof: f.owner,
    }, f.db.executor).catch(error => error);
    let blocked = false;
    for (let attempt = 0; attempt < 100 && !blocked; attempt++) {
      [{ blocked }] = await f.q<{blocked:boolean}>(
        `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
          AND $1::integer=ANY(pg_blocking_pids(pid))) AS blocked`, [pid],
      );
      if (!blocked) await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(blocked).toBe(true);
    await punchWriter.query('COMMIT');
    expect(await retire).toMatchObject({ blockers: ['OPEN_TIME'] });
    expect(await findActiveLocationByClockerKey(location.clockerKey, f.db.executor)).toMatchObject({ active: true });
  } finally {
    await punchWriter.end();
    await retire;
    await f.db.dispose();
  }
});

it('revokes an employee session immediately and keeps outstanding work and history for the Owner', async () => {
  const f = await retirementFixture();
  try {
    const originalShifts = await f.shiftsAt(f.original.id);
    const result = await setWorkerActive(f, false);
    expect(result.state).toBe('saved');
    expect(await f.q("SELECT 1 FROM employee_sessions WHERE employee_id='target'")).toEqual([]);
    expect(await f.reviewShifts()).toMatchObject({ state: 'unavailable', shifts: [] });
    expect(await getEmployeeManagementProfile('target', f.sql)).toMatchObject({
      id: 'target', active: false, positionIds: ['retiring-position'], eligibleLocationIds: ['loc-1', 'loc-2'],
    });
    expect(await f.shiftsAt(f.original.id)).toEqual(originalShifts);
    expect(await f.q("SELECT status FROM time_entries WHERE id='retiring-open'")).toEqual([{ status: 'CLOCKED_IN' }]);
    expect(await readManagerTimeCorrections(f.owner, f.sql)).toMatchObject({ state: 'ready', requests: [{ id: f.requestId, status: 'PENDING' }] });
    expect((await f.close()).status).toBe('closed');
    expect(await f.reassign('receiving')).toBe(true);
    expect(await f.cancel('first')).toBe(true);
    expect(await f.cancel('second')).toBe(true);
    expect((await f.republish()).published).toBe(true);
    expect(await f.shiftsAt(f.original.id)).toEqual(originalShifts);
  } finally {
    await f.db.dispose();
  }
});

it('revokes access without a transfer after the employee’s primary location has retired', async () => {
  const f = await companyAccessFixture();
  try {
    const sql = f.db.executor;
    await f.q(`INSERT INTO employee_sessions(token_hash,employee_id,expires_at)
      VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')`);
    for (const location of await listLocations({}, sql)) {
      expect(await updateLocation({
        ...location, active: false, expectedUpdatedAt: location.updatedAt, actorEmployeeId: 'owner', proof: f.owner,
      }, sql)).toMatchObject({ active: false });
    }
    expect(await setWorkerActive(f, false, 'loc-2')).toMatchObject({ state: 'invalid' });
    expect(await f.q("SELECT 1 FROM employee_sessions WHERE employee_id='target'")).toHaveLength(1);
    expect(await setWorkerActive(f, false)).toMatchObject({ state: 'saved' });
    expect(await f.q("SELECT 1 FROM employee_sessions WHERE employee_id='target'")).toEqual([]);
    expect(await readEmployeeWeeklyReview(worker, week, sql)).toMatchObject({ state: 'unavailable' });
    expect(await getEmployeeManagementProfile('target', sql)).toMatchObject({ active: false, primaryLocationId: 'loc-1' });
    expect(await setWorkerActive(f, true)).toMatchObject({ state: 'invalid' });
  } finally {
    await f.db.dispose();
  }
});
