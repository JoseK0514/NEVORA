import { notFound } from 'next/navigation';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { requireSession } from '@/lib/auth/session';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import { MyPay } from '@/components/payroll/my-pay';
import { ManagerMyPay } from '@/components/payroll/manager-my-pay';
import { isManagerRole } from '@/lib/auth/permissions';
import { readNextPay } from './next-pay';

export default async function MyPayPage() {
  const moduleOff = await moduleGate("payStatements");
  if (moduleOff) return moduleOff;

  if (!payrollFeatureEnabled()) notFound();
  const session = await requireSession();
  // Signature: the band names the next payday from the workspace's pay schedule (the same read My time uses).
  // No schedule, or a failed read, leaves the band on "My pay".
  const nextPay = await readNextPay();
  // UI-4: Owners and Managers see My pay in the clean v3 frame; Employees and Leads keep the Signature My pay.
  return isManagerRole(session.role) ? <ManagerMyPay key={session.id} nextPay={nextPay} /> : <MyPay key={session.id} nextPay={nextPay} />;
}
