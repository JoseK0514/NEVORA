import { notFound } from 'next/navigation';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { requireSession } from '@/lib/auth/session';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import { MyPay, type NextPay } from '@/components/payroll/my-pay';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { getWorkspace } from '@/lib/data/workspaces';
import { businessDate } from '@/lib/business-time';

export default async function MyPayPage() {
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
    if (daysUntil >= 0) nextPay = { payday: pay.payday, daysUntil };
  }
  return <MyPay key={session.id} nextPay={nextPay} />;
}
