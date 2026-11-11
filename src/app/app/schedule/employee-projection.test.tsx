import { beforeEach, expect, it, vi } from 'vitest';
import { ScheduleShiftForm, type ScheduleShiftFormProps } from '@/components/schedule-shift-form';
import { findElementProps } from '@/test/react-props.test-support';
import type { Employee } from '@/lib/domain';
import Edit from './edit/page';
import Add from './new/page';

const fixture = vi.hoisted(() => ({ selected: 'ACTIVE', denied: false }));
const employees: Employee[] = [
  { id: 'ACTIVE', firstName: 'Active', lastName: 'Person', role: 'MANAGER', active: true,
    positionIds: ['P1'], phone: '555-private-active', email: 'active@private.invalid', primaryLocationId: 'L1', eligibleLocationIds: ['L1','L2'] },
  { id: 'SELECTED', firstName: 'Retained', lastName: 'Person', role: 'EMPLOYEE', active: false,
    positionIds: ['P1'], phone: '555-private-selected', email: 'selected@private.invalid', primaryLocationId: 'L1', eligibleLocationIds: ['L1'] },
  { id: 'UNRELATED', firstName: 'Unrelated', lastName: 'Inactive', role: 'EMPLOYEE', active: false,
    positionIds: [], phone: '555-private-unrelated', email: 'unrelated@private.invalid', primaryLocationId: 'L1', eligibleLocationIds: ['L1'] },
];
vi.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER','MANAGER'], requireRoles: async () => ({ id: 'M', role: 'MANAGER' }) }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => ({ employee: { id: 'M', role: 'MANAGER' }, sessionTokenHash: 'a'.repeat(64) }) }));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ id: 'W', timeZone: 'America/Puerto_Rico' }) }));
vi.mock('@/lib/company-access/operational-scope.server', () => ({
  readOperationalAuthority: async () => ({ state: 'ready', scope: { mode: 'COMPANY' } }),
  withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => fixture.denied
    ? { state: 'unavailable', reason: 'access_denied' }
    : { state: 'ready', data: await load(), authority: 'authority', observedAt: '2026-11-10T12:00:00Z', validForMs: 15000 },
}));
vi.mock('@/lib/data/employees', () => ({ listEmployees: async () => employees, listLocations: async () => [{ id: 'L1', shortName: 'Main', active: true }] }));
vi.mock('@/lib/data/positions', () => ({ listPositions: async () => [{ id: 'P1', name: 'Support', active: true }] }));
vi.mock('@/lib/data/schedules', () => ({ getShiftForManagement: async () => ({ id: 'SHIFT', employeeId: fixture.selected, employeeName: 'Retained person', locationId: 'L1', weekStart: '2026-11-09', date: '2026-11-10', startTime: '08:00', endTime: '16:00' }) }));
vi.mock('@/app/app/schedule/actions', () => ({ createShiftAction: vi.fn(), updateShiftAction: vi.fn(), deleteShiftAction: vi.fn() }));
vi.mock('@/lib/company-access/operational-read.server', () => ({ readOperationalShiftEditor: async () => { throw Error('Unexpected scoped reader'); }, readSchedulePendingChanges: async () => null }));
beforeEach(() => { fixture.selected = 'ACTIVE'; fixture.denied = false; });

const active = { id: 'ACTIVE', firstName: 'Active', lastName: 'Person', role: 'MANAGER', active: true, positionIds: ['P1'] };
it('add-shift serializes only active assignment choices, never contact or unrelated inactive rows', async () => {
  const page = await Add({ searchParams: Promise.resolve({ week: '2026-11-09', employeeId: 'UNRELATED' }) });
  const props = findElementProps<ScheduleShiftFormProps>(page, ScheduleShiftForm);
  expect(props.employees).toEqual([active]);
  expect(JSON.stringify(props.employees)).not.toMatch(/private|primaryLocationId|eligibleLocationIds|UNRELATED|SELECTED/);
});
it('edit-shift serializes the minimal active choices while preserving its real command identity', async () => {
  const props = findElementProps<ScheduleShiftFormProps>(await Edit({ searchParams: Promise.resolve({ shiftId: 'SHIFT' }) }), ScheduleShiftForm);
  expect(props.employees).toEqual([active]);
  expect(props.employeeId).toBe('ACTIVE');
  expect(props.hidden).toEqual({ shiftId: 'SHIFT' });
});
it('only the actually assigned inactive person may retain minimal edit context; unrelated inactive people stay server-side', async () => {
  fixture.selected = 'SELECTED';
  const props = findElementProps<ScheduleShiftFormProps>(await Edit({ searchParams: Promise.resolve({ shiftId: 'SHIFT' }) }), ScheduleShiftForm);
  expect(props.employees).toEqual([active, { id: 'SELECTED', firstName: 'Retained', lastName: 'Person', role: 'EMPLOYEE', active: false, positionIds: ['P1'] }]);
  expect(props.employeeId).toBe('SELECTED');
  expect(JSON.stringify(props.employees)).not.toMatch(/private|primaryLocationId|eligibleLocationIds|UNRELATED/);
});
it('current company-access denial withholds the client form and its employee catalog', async () => {
  fixture.denied = true;
  const page = await Edit({ searchParams: Promise.resolve({ shiftId: 'SHIFT' }) });
  expect(() => findElementProps(page, ScheduleShiftForm)).toThrow('boundary not found');
});
