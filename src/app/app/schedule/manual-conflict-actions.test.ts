import { beforeEach, expect, it, vi } from 'vitest';
import { assignmentFacts } from '../../../lib/data/assignment-facts.test-support';
import { ManualAssignmentConflictError, validateManualAssignments } from '../../../lib/data/manual-assignment-validation';
import type { GuardedWeekState } from '../../../lib/data/notification-transactions';
import { schedulingSourceFixture, managementProof } from '../../../test/fixtures/management';

const writes = vi.hoisted(() => ({ copy:vi.fn(async()=>({operationId:'11111111-1111-4111-8111-111111111111',rows:[]})),insert: vi.fn(async () => 'new'), update: vi.fn(async () => true), ensure: vi.fn(async () => 'a') }));
vi.mock('@/lib/data/schedule-copy',()=>({executeScheduleCopy:writes.copy}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
vi.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER', 'MANAGER'], requireRoles: async () => ({ id: 'M', role: 'MANAGER' }) }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => managementProof('M') }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ id: 'test-workspace', active: true, timeZone: 'America/Puerto_Rico' }) }));
vi.mock('@/lib/data/schedules', () => ({
  insertShiftAtLocation: writes.insert, insertShift: writes.insert, updateShift: writes.update, ensureSchedule: writes.ensure,
  getShiftForManagement: async () => ({ id: 'old', employeeId: 'E', locationId: 'loc-1', date: '2030-10-07', startTime: '08:00', endTime: '09:00', weekStart: '2030-10-07' }),
  getShiftValidationContext: async () => ({
    workspace: { id: 'test-workspace', active: true, timeZone: 'America/Puerto_Rico' },
    location: { id: 'loc-1', workspaceId: 'test-workspace', active: true },
    employee: { active: true, role: 'EMPLOYEE', eligibleLocationIds: ['loc-1'], positionIds: [] },
    existingShifts: [], approvedTimeOff: [], availability: [{ dayOfWeek: 1, startTime: '00:00', endTime: '24:00' }],
  }),
  listWeekShifts: async () => [0, 1].map(index => ({ id: String(index), employeeId: 'E', locationId: 'loc-1', date: '2030-09-30', startTime: '10:00', endTime: '12:00', isDesignatedLead: false })),
}));
vi.mock('@/lib/data/schedule-templates', () => ({ listTemplateShifts: async () => [0, 1].map(() => ({ employeeId: 'E', locationId: 'loc-1', dayOffset: 0, startTime: '10:00', endTime: '12:00' })) }));
vi.mock('@/lib/data/positions', () => ({ listPositions: async () => [] }));
vi.mock('@/lib/data/employees', () => ({ listEmployees: async () => [] }));
vi.mock('@/lib/data/week-settings', () => ({ setAvailabilityDeadline: vi.fn() }));
vi.mock('@/lib/data/publication-revisions', () => ({ publishScheduleWithRevision: vi.fn() }));
vi.mock('@/lib/data/schedule-health', () => ({ listCoverageWindows: vi.fn(), listEmployeeHourTargets: vi.fn(), listLocationStaffingSettings: vi.fn() }));
import { createShiftAction, updateShiftAction, copyPreviousWeekAction } from './actions';
import { applyTemplateAction } from './templates/actions';

// Produce the conflict through the real canonical validator, so a plain Error
// or an action that catches every failure cannot satisfy the recovery contract.
function conflict() {
  const shift = { sourceShiftId: 'existing', scheduleId: 'a', weekStart: '2030-10-07', locationId: 'loc-1', employeeId: 'E', date: '2030-10-07', startTime: '08:00', endTime: '16:00', isDesignatedLead: false, isCalloutApproved: false, hasExchangeHistory: false };
  const state: GuardedWeekState = { assignmentFacts: assignmentFacts(), schedules: [{ id: 'a', locationId: 'loc-1', weekStart: '2030-10-07', status: 'DRAFT', updatedAt: '2030-10-01' }], shifts: [shift], recipients: [{ employeeId: 'E', role: 'EMPLOYEE', active: true, allowedLocationIds: ['loc-1'] }], revisions: [], acknowledgements: [] };
  try { validateManualAssignments(schedulingSourceFixture(state), [{ ...shift, sourceShiftId: 'new', startTime: '10:00', endTime: '12:00' }]); }
  catch (error) { return error; }
  throw new Error('Expected the actual validator to reject the overlapping assignment');
}
function form() {
  const data = new FormData();
  Object.entries({ operationId:'11111111-1111-4111-8111-111111111111', shiftId: 'old', employeeId: 'E', locationId: 'loc-1', weekStart: '2030-10-07', date: '2030-10-07', startTime: '10:00', endTime: '12:00', positionId: '', notes: 'Private retained draft', templateId: 't' }).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => { vi.resetAllMocks(); writes.copy.mockResolvedValue({operationId:'11111111-1111-4111-8111-111111111111',rows:[]}); writes.insert.mockResolvedValue('new'); writes.update.mockResolvedValue(true); writes.ensure.mockResolvedValue('a'); });
it('canonical rule conflicts carry the existing stable issue code', () => {
  expect(conflict()).toMatchObject({ name: 'ManualAssignmentConflictError', code: 'SHIFT_OVERLAP', message: 'Employee already has an overlapping shift.' });
});
it.each([createShiftAction, updateShiftAction])('manual final conflict returns local recovery and leaves submitted draft fields intact', async action => {
  (action === createShiftAction ? writes.insert : writes.update).mockRejectedValueOnce(conflict());
  const data = form();
  await expect(action(data)).resolves.toMatchObject({ error: 'Employee already has an overlapping shift.', issueCode: 'SHIFT_OVERLAP' });
  expect(Object.fromEntries(data)).toMatchObject({ employeeId: 'E', date: '2030-10-07', startTime: '10:00', endTime: '12:00', positionId: '', notes: 'Private retained draft' });
});
it.each([createShiftAction, updateShiftAction, copyPreviousWeekAction, applyTemplateAction])('unexpected writer failure remains distinguishable from expected scheduling conflicts', async action => {
  const failure = new Error('Owned transport unavailable');
  (action === updateShiftAction ? writes.update : action===createShiftAction?writes.insert:writes.copy).mockRejectedValueOnce(failure);
  await expect(action(form())).rejects.toBe(failure);
});
it.each([
  [copyPreviousWeekAction, '/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'],
  [applyTemplateAction, '/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'],
] as const)('copy wrapper uses the authoritative receipt for partial-copy outcomes', async (action, destination) => {
  await expect(action(form())).rejects.toMatchObject({ destination });
  expect(writes.copy).toHaveBeenCalledWith(managementProof('M'),expect.objectContaining({operationId:'11111111-1111-4111-8111-111111111111'}));
  expect(writes.insert).not.toHaveBeenCalled();
});
it.each([
  [createShiftAction, undefined],
  [copyPreviousWeekAction, '/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'],
  [applyTemplateAction, '/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'],
] as const)('manual parent conflicts recover locally while copy outcomes navigate to the authoritative receipt', async (action, destination) => {
  writes.insert.mockRejectedValueOnce(new ManualAssignmentConflictError('LOCATION_INACTIVE', 'The location or workspace is inactive or unavailable.'));
  if (destination) await expect(action(form())).rejects.toMatchObject({ destination });
  else await expect(action(form())).resolves.toMatchObject({ issueCode: 'LOCATION_INACTIVE', error: 'The location or workspace is inactive or unavailable.' });
  if(destination){expect(writes.insert).not.toHaveBeenCalled();expect(writes.copy).toHaveBeenCalledTimes(1);}
  else expect(writes.insert).toHaveBeenCalledTimes(1);
  expect(writes.ensure).not.toHaveBeenCalled();
});

// These business/unit fixtures do not execute SQL. Current scope admission and
// rollback are exercised by company-access-schedule-*.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOriginalOperationalAccess:async(_proof:unknown,original:{authority:string})=>{expect(original.authority).toBe('f'.repeat(64));},assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},authority:'f'.repeat(64),workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>({state:'ready',data:{saveAvailability:'available',shift:{id:'test-shift'},employeeOptions:[],positionOptions:[]}})}));
