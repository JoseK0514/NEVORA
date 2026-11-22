import { randomUUID } from 'node:crypto';
import { saveBreakType } from '../../src/lib/clocker/break-types.server';
import { businessDate } from '../../src/lib/business-time';
import { createTimeOffRequest } from '../../src/lib/data/requests';
import { submitTimeCorrection } from '../../src/lib/time-corrections/service';
import { fixtureProof } from '../../src/test/integration/shift-change-api';
import { publishScheduleWithRevision } from '../../src/test/integration/management-api';
import { addDays, weekStartFor } from '../../src/lib/date-utils';
import { executeCommunicationCommand, previewCommunicationAudience } from '../../src/lib/communications/service.server';
import { executeScheduleCopy } from '../../src/lib/data/schedule-copy';
import type { SqlExecutor } from '../../src/lib/notifications/types';
import type { SessionMutationProof } from '../../src/lib/shift-changes/types';
import { seedPayrollFixture } from '../../src/test/integration/payroll-fixture';

export async function seedCollabPageData(executor: SqlExecutor, owner: SessionMutationProof, week: string) {
  const clockerOwner = { employeeId: owner.employee.id, sessionTokenHash: owner.sessionTokenHash };
  await saveBreakType(clockerOwner, { name: 'Rest break', category: 'REST', targetMinutes: 15, active: true, expectedVersion: 0 }, executor);
  await saveBreakType(clockerOwner, { name: 'Meal break', category: 'MEAL', targetMinutes: 30, active: true, expectedVersion: 0 }, executor);
  const draft = {
    type: 'LOCATION_ANNOUNCEMENT' as const,
    scope: { kind: 'LOCATION' as const, locationId: 'loc-1' },
    title: 'Fictional shift update',
    body: 'Check the published test schedule.',
    acknowledgement: 'REQUIRED' as const,
    expiresAt: null,
  };
  const audience = await previewCommunicationAudience(owner, draft, executor);
  if (audience.state !== 'ready') throw Error('The fictional update audience could not be built.');
  const published = await executeCommunicationCommand(owner, {
    kind: 'PUBLISH', operationId: randomUUID(), authority: audience.authority, draft,
    audienceFingerprint: audience.fingerprint,
  }, executor);
  if (published.status !== 'committed') throw Error('The fictional update could not be published.');

  const copyWeek = addDays(week, 7);
  const copy = await executeScheduleCopy(owner, {
    kind: 'PREVIOUS_WEEK', operationId: randomUUID(), weekStart: copyWeek,
  }, executor);
  if (!copy.rows.some(row => row.status === 'COMMITTED')) throw Error('The fictional schedule could not be copied.');

  // The app receives its own copy of this flag. The payroll fixture also calls
  // the service directly in the launcher process.
  const priorPayroll = process.env.NEVORA_PAYROLL_ENABLED;
  process.env.NEVORA_PAYROLL_ENABLED = 'true';
  try {
    const payroll = await seedPayrollFixture(executor, { automaticPublish: false });
    if (!payroll.runId) throw Error('The fictional payroll run could not be prepared.');
    return { updateId: published.id, copyId: copy.operationId, copyWeek, payrollRunId: payroll.runId };
  } finally {
    if (priorPayroll === undefined) delete process.env.NEVORA_PAYROLL_ENABLED;
    else process.env.NEVORA_PAYROLL_ENABLED = priorPayroll;
  }
}

/** Seed equivalent real work on each side of the Manager's location boundary. */
export async function seedScopedManagerCases(executor: SqlExecutor, owner: SessionMutationProof) {
  const zone = 'America/Puerto_Rico';
  const today = businessDate(new Date(), zone);
  const week = weekStartFor(today);
  const worked = addDays(today, -2);
  const records = [];
  for (const [location, name] of [['loc-1','MainScopeWorker'], ['loc-2','WestScopeWorker']]) {
    const employeeId = 'QA-' + name.toUpperCase();
    const scheduleId = 'scope-qa-' + location;
    await executor.transaction([
      { text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,'Fictional','555-0188','EMPLOYEE',$3)", values: [employeeId, name, location] },
      { text: 'INSERT INTO employee_location_eligibility VALUES($1,$2)', values: [employeeId, location] },
      { text: "INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT',$4)", values: [scheduleId, location, week, owner.employee.id] },
      { text: "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,'00:00','00:30','qa-pos')", values: [scheduleId + '-shift', scheduleId, employeeId, today] },
    ]);
    const published = await publishScheduleWithRevision({ locationId: location, weekStart: week, managerId: owner.employee.id }, executor);
    if (!published.published) throw Error('Fictional scope schedule was not published');
    const worker = await fixtureProof(executor, employeeId);
    const correction = await submitTimeCorrection(worker, {
      kind:'MISSING_ENTRY', operationId:randomUUID(), locationId:location, reason:'Fictional location scope correction',
      proposedStartAt:worked + 'T08:00:00-04:00', proposedEndAt:worked + 'T09:00:00-04:00',
    }, executor);
    if (correction.status !== 'pending') throw Error('Fictional scope correction was not submitted');
    const leaveId = randomUUID();
    const leaveDay = addDays(today, 2);
    await createTimeOffRequest({ requestId: leaveId, employeeId, proof: worker, startDate: leaveDay, endDate: leaveDay }, executor);
    records.push({ location, name, employeeId, correctionId: correction.requestId, leaveId });
  }
  return { week, records };
}
