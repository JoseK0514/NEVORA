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
