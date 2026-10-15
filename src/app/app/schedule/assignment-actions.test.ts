import { beforeEach, expect, it, vi } from 'vitest';
const writes = vi.hoisted(() => ({ insert: vi.fn(async () => 'new'), update: vi.fn(async () => true), ensure: vi.fn(async () => 'schedule') }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'MANAGER', role: 'MANAGER' }),requireSessionMutationProof:async()=>({employee:{id:'MANAGER',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}) }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ id: 'w', active: true, timeZone: 'America/New_York' }) }));
vi.mock('@/lib/data/schedules', () => ({
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
vi.mock('@/lib/data/positions', () => ({ listPositions: async () => [] }));
vi.mock('@/lib/data/employees', () => ({ listEmployees: async () => [] }));
vi.mock('@/lib/data/week-settings', () => ({ setAvailabilityDeadline: vi.fn() }));
vi.mock('@/lib/data/publication-revisions', () => ({ publishScheduleWithRevision: vi.fn() }));
vi.mock('@/lib/data/schedule-health', () => ({ listCoverageWindows: vi.fn(), listEmployeeHourTargets: vi.fn(), listLocationStaffingSettings: vi.fn() }));
vi.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER','MANAGER'], requireRoles: async () => ({ id: 'MANAGER', role: 'MANAGER' }) }));
vi.mock('@/lib/business-time', () => import('../../../lib/business-time'));
vi.mock('@/lib/date-utils', () => import('../../../lib/date-utils'));
vi.mock('@/lib/scheduling/validate-shift', () => import('../../../lib/scheduling/validate-shift'));
vi.mock('@/lib/scheduling/schedule-health', () => import('../../../lib/scheduling/schedule-health'));
vi.mock('@/lib/scheduling/publish-readiness', () => import('../../../lib/scheduling/publish-readiness'));
vi.mock('@/lib/scheduling/copy-week', () => import('../../../lib/scheduling/copy-week'));
vi.mock('@/lib/scheduling/exchange-validation', () => import('../../../lib/scheduling/exchange-validation'));
// The real action and shared validateShift engine consume submitted FormData.
import { createShiftAction, updateShiftAction } from './actions';
function form(employee: string, position: string) {
  const data = new FormData();
  Object.entries({ shiftId: 'shift', weekStart: '2030-10-07', date: '2030-10-07', employeeId: employee, positionId: position, locationId: 'main', startTime: '08:00', endTime: '12:00' }).forEach(([key,value]) => data.set(key,value));
  return data;
}
beforeEach(() => vi.clearAllMocks());
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
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>({state:'ready',data:{saveAvailability:'available',shift:{id:'test-shift'},employeeOptions:[],positionOptions:[]}})}));
