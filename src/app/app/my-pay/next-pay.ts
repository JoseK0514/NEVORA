import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlExecutor } from '@/lib/notifications/types';
import { neonNotificationExecutor } from '@/lib/data/notification-transactions';
import { withOperationalCompany } from '@/lib/company-access/operational-scope.server';
import { readPayrollBacklog, homePayrollStatus, type HomePayrollStatus } from '@/lib/payroll/backlog-read';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { getWorkspace } from '@/lib/data/workspaces';
import { businessDate } from '@/lib/business-time';
import type { NextPay } from '@/components/payroll/my-pay';

/** The next payday from the workspace's pay schedule, read the same way My pay's band reads it (my-pay/page.tsx), for
 * Home's "Next payday" row (MK1). No schedule, a past payday or a failed read gives null. */
export async function readNextPay(timeZone?: string): Promise<NextPay> {
  const [pay, zone] = await Promise.all([currentPayPeriod().catch(() => null), timeZone ? Promise.resolve(timeZone) : getWorkspace().then(workspace => workspace.timeZone).catch(() => null)]);
  if (!pay || !zone) return null;
  const today = businessDate(new Date(), zone);
  const daysUntil = Math.round((Date.parse(`${pay.payday}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return daysUntil >= 0 ? { payday: pay.payday, daysUntil } : null;
}

/** Additive Owner Home facts: independent of the personal upcoming-only NextPay contract.
 * The outer company envelope retains its final authority/workspace fence; the inner
 * payroll read retains current session/Owner checks around the bounded source query. */
export async function readHomePayrollStatus(proof: SessionMutationProof, ex: SqlExecutor = neonNotificationExecutor()): Promise<HomePayrollStatus | null> {
  if (proof.employee.role !== 'OWNER' || process.env.NEVORA_PAYROLL_ENABLED !== 'true') return null;
  const result = await withOperationalCompany(proof, async () => homePayrollStatus(await readPayrollBacklog(proof, ex, 'OWNER')), ex);
  return result.state === 'ready' ? result.data : {state: 'unavailable'};
}
