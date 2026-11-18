import * as rstestOriginal0 from "@/lib/company-access/operational-scope.server" with { rstest: 'importActual' };
import { beforeEach, expect, it, rs } from '@rstest/core';
const writes = rs.hoisted(() => ({ insert: rs.fn(async () => 'new'), update: rs.fn(async () => true), ensure: rs.fn(async () => 'schedule') }));
rs.mock('next/cache', () => ({ revalidatePath: () => {} }));
rs.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
rs.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'MANAGER', role: 'MANAGER' }),requireSessionMutationProof:async()=>({employee:{id:'MANAGER',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}) }));
rs.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ id: 'w', active: true, timeZone: 'America/New_York' }) }));
rs.mock('@/lib/data/schedules', () => ({
  insertShiftAtLocation: writes.insert, insertShift: writes.insert, updateShift: writes.update, ensureSchedule: writes.ensure,
  getShiftForManagement: async () => ({ id: 'shift', employeeId: 'SAM', locationId: 'main', positionId: 'cashier', weekStart: '2030-10-07' }),
  getShiftValidationContext: async ({ employeeId, positionId }: { employeeId: string; positionId?: string }) => ({
    workspace: { id: 'w', active: true, timeZone: 'America/New_York' },
    location: { id: 'main', workspaceId: 'w', active: true },
    position: positionId ? { id: 'cashier', workspaceId: 'w', name: 'Cashier', active: true } : undefined,
    employee: { active: true, role: 'EMPLOYEE', eligibleLocationIds: ['main'], positionIds: employeeId === 'LEE' ? ['cashier'] : [] },
    existingShifts: [], approvedTimeOff: [], availability: [{ dayOfWeek: 1, startTime: '08:00', endTime: '17:00' }],
  }),
}));
rs.mock('@/lib/data/positions', () => ({ listPositions: async () => [] }));
rs.mock('@/lib/data/employees', () => ({ listEmployees: async () => [] }));
rs.mock('@/lib/data/week-settings', () => ({ setAvailabilityDeadline: rs.fn() }));
rs.mock('@/lib/data/publication-revisions', () => ({ publishScheduleWithRevision: rs.fn() }));
rs.mock('@/lib/data/schedule-health', () => ({ listCoverageWindows: rs.fn(), listEmployeeHourTargets: rs.fn(), listLocationStaffingSettings: rs.fn() }));
rs.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER','MANAGER'], requireRoles: async () => ({ id: 'MANAGER', role: 'MANAGER' }) }));







// The real action and shared validateShift engine consume submitted FormData.
import { createShiftAction, updateShiftAction } from './actions';
function form(employee: string, position: string) {
  const data = new FormData();
  Object.entries({ expectedReviewVersion:'a'.repeat(64), shiftId: 'shift', weekStart: '2030-10-07', date: '2030-10-07', employeeId: employee, positionId: position, locationId: 'main', startTime: '08:00', endTime: '12:00' }).forEach(([key,value]) => data.set(key,value));
  return data;
}
beforeEach(() => rs.clearAllMocks());
it.each([createShiftAction, updateShiftAction])('qualified reassignment submits the explicit position to the guarded writer', async action => {
  await expect(action(form('lee','cashier'))).rejects.toMatchObject({ destination: expect.stringContaining('/app/schedule?week=2030-10-07') });
  expect(action === createShiftAction ? writes.insert : writes.update).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'LEE', positionId: 'cashier' }));
});
it.each([createShiftAction, updateShiftAction])('unqualified reassignment with retained native position is rejected before any write', async action => {
  await expect(action(form('owner','cashier'))).resolves.toMatchObject({ issueCode: 'POSITION_INELIGIBLE', error: 'Employee is not qualified for the assigned position.' });
  expect(writes.ensure).not.toHaveBeenCalled(); expect(writes.insert).not.toHaveBeenCalled(); expect(writes.update).not.toHaveBeenCalled();
});
it.each([createShiftAction, updateShiftAction])('an explicit No position selection permits a positionless assignment', async action => {
  await expect(action(form('owner',''))).rejects.toMatchObject({ destination: expect.stringContaining('/app/schedule?week=2030-10-07') });
  expect(action === createShiftAction ? writes.insert : writes.update).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'OWNER', positionId: null }));
});

// These business/unit fixtures do not execute SQL. Current scope admission and
// rollback are exercised by company-access-schedule-*.integration.ts.
rs.mock('@/lib/company-access/operational-scope.server', original=>({...rstestOriginal0,assertOriginalOperationalAccess:async(_proof:unknown,original:{authority:string})=>{expect(original.authority).toBe('f'.repeat(64));},assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},authority:'f'.repeat(64),workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>({state:'ready',data:{saveAvailability:'available',shift:{reviewVersion:'a'.repeat(64),id:'test-shift'},employeeOptions:[],positionOptions:[]}})}));
