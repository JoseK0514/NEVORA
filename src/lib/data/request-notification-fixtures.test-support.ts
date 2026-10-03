import { vi } from 'vitest';
import type { GuardedWeekState } from './notification-transactions';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
export const week = '2030-10-07';
export const recipients = [
  { employeeId: 'E', role: 'EMPLOYEE' as const, active: true, allowedLocationIds: ['L'] },
  { employeeId: 'F', role: 'LEAD' as const, active: true, allowedLocationIds: ['L'] },
  { employeeId: 'M', role: 'MANAGER' as const, active: true, allowedLocationIds: ['L'] },
  { employeeId: 'O', role: 'OWNER' as const, active: true, allowedLocationIds: [] },
  { employeeId: 'Z', role: 'EMPLOYEE' as const, active: true, allowedLocationIds: ['L'] },
];
export function fixture(kind: 'TIME_OFF' | 'EXCHANGE' | 'CALLOUT', status = 'PENDING') {
  const shift = { sourceShiftId: 's1', scheduleId: 'a', weekStart: week, locationId: 'L', employeeId: 'E', date: '2030-10-11', startTime: '09:00', endTime: '17:00', isDesignatedLead: true, isCalloutApproved: false, hasExchangeHistory: kind === 'EXCHANGE', approvedCalloutEmployeeId: null };
  const state: GuardedWeekState = { schedules: [{ id: 'a', locationId: 'L', weekStart: week, status: 'PUBLISHED', updatedAt: '2030-10-07 12:00:00.123456+00' }], shifts: [shift], revisions: [{ id: 'r1', weekStart: week, revisionNumber: 1, sourceType: 'PUBLISH', createdBy: 'M', createdAt: '2030-10-07T11:00:00Z', shifts: [{ ...shift }] }], acknowledgements: [{ employeeId: 'Z', weekStart: week, revisionId: 'r1' }], recipients };
  const row: Record<string, unknown> = { id: 'request-1', employee_id: 'E', employee_name: 'Employee', start_date: '2030-10-11', end_date: '2030-10-11', status, created_at: '2030-10-07T11:00:00Z', kind: 'COVERAGE', requested_by_employee_id: 'E', requested_by_name: 'Employee', requested_by_role: 'EMPLOYEE', target_employee_id: 'F', shift_id: 's1', location_id: 'L', location_name: 'Location', week_start: week, date: '2030-10-11', start_time: '09:00', end_time: '17:00', reason_code: 'ILLNESS' };
  Object.assign(row, { source_shift_id: 's1', source_schedule_id: 'a', source_employee_id: 'E', source_employee_name: 'Employee', source_location_id: 'L', source_location_name: 'Location', source_week_start: week, source_date: '2030-10-11', source_start_time: '09:00', source_end_time: '17:00', source_is_designated_lead: true });
  const batches: SqlStatement[][] = [];
  const executor: SqlExecutor = {
    query: vi.fn(async statement => statement.text.includes('AS state') ? [{ state: structuredClone(state), read_at: '2030-10-07 12:00:00.123456+00' }] : statement.text.includes('AS "allowedLocationIds"') ? recipients : [row]) as SqlExecutor['query'],
    transaction: vi.fn(async statements => { batches.push([...statements]); return statements.map(() => []); }),
  };
  return { row, state, batches, executor };
}
export function intents(batch: SqlStatement[]) { return batch.filter(s => s.text.includes('INSERT INTO notifications')).map(s => ({ employee: s.values[1], kind: s.values[8], status: s.values[10], purpose: s.values[12], body: s.values[4] })); }
