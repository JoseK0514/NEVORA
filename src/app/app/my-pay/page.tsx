import { notFound } from 'next/navigation';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { getSession, requireSession } from '@/lib/auth/session';
import { payrollFeatureEnabled } from '@/lib/payroll/service';
import { MY_PAY_HOME, MyPay, type NextPay } from '@/components/payroll/my-pay';
import { isManagerRole } from '@/lib/auth/permissions';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { getWorkspace } from '@/lib/data/workspaces';
import { businessDate } from '@/lib/business-time';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../route-copy';

/** Review B1 (NV-022): the page title in the tab and for screen readers. Inspection Nov 14 (AR-15): an Employee or Lead
 * reads the name on their tab and heading ("Pay"); an Owner or Manager keeps their menu's name ("My pay"). The session is
 * the render's own cached read. */
export async function generateMetadata() {
  const session = await getSession().catch(() => null);
  const t = ROUTE_COPY[await readPageLang()];
  return { title: session && !isManagerRole(session.role) ? t.pay : t.myPay };
}

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
  // Phase 2 (G10): Owners and Managers get the Employee's Pay screen with their own statements, named "My pay".
  const manager = isManagerRole(session.role);
  return <MyPay key={session.id} nextPay={nextPay} statement={statement} document={document} corporate={manager || session.role === 'EMPLOYEE' || session.role === 'LEAD'} home={manager ? MY_PAY_HOME : undefined} />;
}
