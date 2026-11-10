import 'server-only';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import type { PayrollPeriod, PayrollSettingsRevision } from './contracts';
import { missingPayrollPeriods } from './backlog';
import { payrollHistorySql } from './history';
import { date, period } from './model';
import { guarded, statement } from './store';

type Backlog = ReturnType<typeof missingPayrollPeriods>;
export type HomePayrollFact = { payday: string; period: PayrollPeriod };
/** Home-only preparation facts, never employee payment or settlement status. */
export type HomePayrollStatus = { state: 'ready'; overdue?: HomePayrollFact; reviewRequired?: HomePayrollFact } | { state: 'unavailable' };

type HistoryRow = { today: string; history: PayrollSettingsRevision[]; originals: PayrollPeriod[]; overflow: boolean };
function validHistory(row: HistoryRow | undefined): row is HistoryRow {
  if (!row || !date(row.today) || typeof row.overflow !== 'boolean' || !Array.isArray(row.history) || !Array.isArray(row.originals)) return false;
  return row.history.every(r => {
    const schedule = r?.preferences?.schedule;
    return date(r?.effectiveFrom) && r.effectiveFrom <= row.today && Number.isInteger(r.revision) && r.revision > 0 && schedule
      && ['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY'].includes(schedule.frequency) && date(schedule.anchorDate)
      && Number.isInteger(schedule.paydayOffsetDays) && schedule.paydayOffsetDays >= 0 && schedule.paydayOffsetDays <= 31;
  }) && row.originals.every(p => { try { period(p); return true; } catch { return false; } });
}

/** Shared bounded history read. Manager runs intentionally have no company backlog.
 * The existing payroll envelope checks current session/role both before and after the read. */
export async function readPayrollBacklog(proof: SessionMutationProof, ex: SqlExecutor, permission: 'OWNER' | 'REVIEW' = 'REVIEW'): Promise<Backlog> {
  const [row] = await guarded<HistoryRow>(proof, permission, statement(proof.employee.role === 'MANAGER'
    ? "SELECT CURRENT_DATE::text AS today,'[]'::jsonb AS history,'[]'::jsonb AS originals,false AS overflow"
    : payrollHistorySql), ex);
  if (!validHistory(row)) throw new Error('payroll_history_unavailable');
  const result = missingPayrollPeriods(row.history, row.originals, row.today);
  if (row.overflow) return {missingPeriods: [], backlog: {...result.backlog, missingCount: null, remainingCount: null, ambiguousCount: null, returnedCount: 0, overflow: true}};
  return result;
}

export function homePayrollStatus(result: Backlog): HomePayrollStatus {
  if (result.backlog.overflow || result.backlog.remainingCount !== 0) return {state: 'unavailable'};
  const fact = (p: (typeof result.missingPeriods)[number]): HomePayrollFact => ({payday: p.payday, period: p.period});
  const overdue = result.missingPeriods.find(p => p.state === 'MISSING' && p.payday < result.backlog.asOfDate);
  const review = result.missingPeriods.find(p => p.state === 'AMBIGUOUS_TRANSITION');
  return {state: 'ready', ...(overdue ? {overdue: fact(overdue)} : {}), ...(review ? {reviewRequired: fact(review)} : {})};
}
