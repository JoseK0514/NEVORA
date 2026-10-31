import { notFound } from 'next/navigation';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { requireSession } from '@/lib/auth/session';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import { MyPay, QuietMyPay, type NextPay } from '@/components/payroll/my-pay';
import { isManagerRole } from '@/lib/auth/permissions';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { getWorkspace } from '@/lib/data/workspaces';
import { businessDate } from '@/lib/business-time';

const STATEMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** `statement`: the exact statement a notification named. `document`: why opening a PDF came back here. Both only
 * select wording and focus; the statements read decides what exists. */
export default async function MyPayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const statement = typeof params.statement === 'string' && STATEMENT.test(params.statement) ? params.statement : null;
  const document = params.document === 'unavailable' || params.document === 'failed' || params.document === 'temporary' ? params.document : null;
  const moduleOff = await moduleGate("payStatements");
  if (moduleOff) return moduleOff;

  if (!payrollFeatureEnabled()) notFound();
  const session = await requireSession();
  // Signature: the band names the next payday from the workspace's pay schedule (the same read My time uses).
  // No schedule, or a failed read, leaves the band on "My pay".
  const [pay, zone] = await Promise.all([currentPayPeriod().catch(() => null), getWorkspace().then(workspace => workspace.timeZone).catch(() => null)]);
  let nextPay: NextPay = null;
  if (pay && zone) {
    const today = businessDate(new Date(), zone);
    const daysUntil = Math.round((Date.parse(`${pay.payday}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
    if (daysUntil >= 0) nextPay = { payday: pay.payday, daysUntil, period: pay.period, timeZone: zone };
  }
  // Quiet: Owners and Managers get My pay (v4); Employees and Leads get the Pay tab (v5).
  if (isManagerRole(session.role)) return <QuietMyPay key={session.id} nextPay={nextPay} />;
  return <MyPay key={session.id} nextPay={nextPay} statement={statement} document={document} corporate={session.role === 'EMPLOYEE'} />;
}
