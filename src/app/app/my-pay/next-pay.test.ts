import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '@/lib/notifications/types';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { PayrollSettingsRevision } from '@/lib/payroll/contracts';
import * as reader from './next-pay';

const { currentPayPeriod } = vi.hoisted(() => ({currentPayPeriod: vi.fn()}));
vi.mock('@/lib/payroll/pay-calendar.server', () => ({ currentPayPeriod }));
const proof: SessionMutationProof = {employee: {id: 'QAOWNER', firstName: 'Fictional', lastName: 'Owner', role: 'OWNER', primaryLocationId: 'loc-1'}, sessionTokenHash: 'a'.repeat(64)};
const revision = (effectiveFrom = '2026-10-19', anchorDate = effectiveFrom, frequency = 'WEEKLY'): PayrollSettingsRevision => ({
  revision: 1, effectiveFrom, reason: 'Fixture', actorId: 'QAOWNER', createdAt: '2026-10-01T00:00:00Z',
  preferences: {companyName: 'Fixture', language: 'en', currency: 'USD', schedule: {frequency: frequency as 'WEEKLY', anchorDate, paydayOffsetDays: 2}, rules: [], automation: {prepare: false, publish: false, reminders: false, reminderLeadDays: []}, bankProfile: null},
});
const historyRow = () => ({today: '2026-11-02', history: [revision()], originals: [], overflow: false});
function fixture(row: unknown = historyRow(), fail?: 'load' | 'final' | 'session' | 'denied') {
  const statements: SqlStatement[] = [];
  let loaded = false;
  const ex: SqlExecutor = {
    query: async <T,>() => [{id: 'workspace-fuel', name: 'Fictional', timeZone: 'America/Puerto_Rico', active: true, createdAt: '2026-01-01', updatedAt: '2026-01-01'}] as T[],
    transaction: async batch => {
      statements.push(...batch);
      if (loaded && fail === 'final') throw Error('operational_authorization PRIVATE');
      if (batch.some(s => s.text.includes('AS "employeeUpdatedAt"'))) return batch.map(s => s.text.includes('AS "employeeUpdatedAt"') && fail !== 'denied' ? [{employeeId: 'QAOWNER', role: 'OWNER', authority: 'b'.repeat(64), observedAt: '2026-11-02T12:00:00Z', validForMs: 15000, locations: []}] : []);
      return batch.map(s => {
        if (!s.text.includes('WITH context AS')) return [];
        loaded = true;
        if (fail === 'load' || fail === 'session') throw Error(fail === 'session' ? 'payroll_authorization PRIVATE' : 'PRIVATE DATABASE ERROR');
        return row === undefined ? [] : [row];
      });
    },
  };
  return {ex, statements};
}
beforeEach(() => { vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'true'); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.clearAllMocks(); });

it('keeps the current future payday independent from an older missing preparation period', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
  currentPayPeriod.mockResolvedValue({payday: '2026-11-10'});
  const {ex, statements} = fixture();
  expect(await reader.readNextPay('America/Puerto_Rico')).toEqual({payday: '2026-11-10', daysUntil: 8});
  expect(await reader.readHomePayrollStatus(proof, ex)).toEqual({state: 'ready', overdue: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}});
  const history = statements.findIndex(s => s.text.includes('WITH context AS'));
  expect(history).toBeGreaterThan(0);
  expect(statements.slice(0, history).some(s => s.values.includes('OWNER') && s.text.includes('payroll_authorization'))).toBe(true);
  expect(statements.slice(history + 1).some(s => s.values.includes('OWNER') && s.text.includes('payroll_authorization'))).toBe(true);
  expect(statements.at(-1)?.text).toContain('operational_authorization');
  expect(statements.some(s => /FROM payroll_documents|FROM payroll_jobs/.test(s.text))).toBe(false);
});
it('keeps personal next-pay upcoming only when its payday has passed', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T12:00:00Z'));
  currentPayPeriod.mockResolvedValue({payday: '2026-11-01'});
  expect(await reader.readNextPay('America/Puerto_Rico')).toBeNull();
});
it.each(['2026-10-27', '2026-10-26'])('does not count a missing payday today or tomorrow as overdue on %s', async today => {
  const {ex} = fixture({...historyRow(), today});
  expect(await reader.readHomePayrollStatus(proof, ex)).toEqual({state: 'ready'});
});
it('returns clear only when every due original is present, or no active settings exist', async () => {
  for (const row of [{...historyRow(), originals: [{startDate: '2026-10-19', endDate: '2026-10-25'}, {startDate: '2026-10-26', endDate: '2026-11-01'}]}, {...historyRow(), history: []}]) {
    expect(await reader.readHomePayrollStatus(proof, fixture(row).ex)).toEqual({state: 'ready'});
  }
});
it('does not silently discard an ambiguous returned transition', async () => {
  const row = {...historyRow(), today: '2026-10-26', history: [revision(), {...revision('2026-10-22', '2026-11-01', 'MONTHLY'), revision: 2}]};
  expect(await reader.readHomePayrollStatus(proof, fixture(row).ex)).toEqual({state: 'ready', reviewRequired: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}});
});
it.each([null, {...historyRow(), overflow: true}, {...historyRow(), history: [{}]}, {...historyRow(), history: [revision('2000-01-01')]}, {...historyRow(), history: [revision('2025-01-06')]}, {...historyRow(), originals: [{startDate: 'bad', endDate: 'bad'}]}, {...historyRow(), today: '2026-02-30'}])('never turns missing, malformed or overflow history into an all-clear %#', async row => {
  expect(await reader.readHomePayrollStatus(proof, fixture(row).ex)).toEqual({state: 'unavailable'});
});
it.each(['load', 'final', 'session', 'denied'] as const)('withholds facts and private diagnostics after %s failure', async failure => {
  const {ex, statements} = fixture(historyRow(), failure);
  expect(await reader.readHomePayrollStatus(proof, ex)).toEqual({state: 'unavailable'});
  if (failure === 'denied') expect(statements.some(s => s.text.includes('WITH context AS'))).toBe(false);
});
it.each(['MANAGER', 'LEAD', 'EMPLOYEE'] as const)('does not read company history for %s', async role => {
  const {ex, statements} = fixture();
  expect(await reader.readHomePayrollStatus({...proof, employee: {...proof.employee, role}}, ex)).toBeNull();
  expect(statements).toEqual([]);
});
it('does not query payroll history when the feature is disabled', async () => {
  vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'false');
  const {ex, statements} = fixture();
  expect(await reader.readHomePayrollStatus(proof, ex)).toBeNull();
  expect(statements).toEqual([]);
});

it('shows only schedule review for an ambiguous overdue period, never an actionable preparation fact', async () => {
  const row = {...historyRow(), today: '2026-11-03', history: [revision(), {...revision('2026-10-22', '2026-11-01', 'MONTHLY'), revision: 2}]};
  expect(await reader.readHomePayrollStatus(proof, fixture(row).ex)).toEqual({state: 'ready', reviewRequired: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}});
});
it('keeps a later unambiguous overdue preparation separate from the oldest ambiguous transition', async () => {
  const row = {...historyRow(), today: '2026-11-10', history: [revision(), {...revision('2026-10-22'), revision: 2}]};
  expect(await reader.readHomePayrollStatus(proof, fixture(row).ex)).toEqual({state: 'ready', overdue: {payday: '2026-11-06', period: {startDate: '2026-10-29', endDate: '2026-11-04'}}, reviewRequired: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}});
});
