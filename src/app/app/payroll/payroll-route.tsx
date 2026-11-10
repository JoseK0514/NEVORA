import { notFound } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { PayrollRuns, type PayrollView } from '@/components/payroll/payroll-runs';
import { getWorkspace } from '@/lib/data/workspaces';
import { listEmployees } from '@/lib/data/employees';
import { payrollRecoveryScope } from '@/components/payroll/recovery-scope';
import { OwnerOnlyNotice } from '@/components/owner-only-notice';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { payrollTabs } from '@/components/payroll/payroll-tabs';
import './payroll-workflow.css';

/** Every Payroll page (Release 1): the same access check, then one view of the payroll workspace. The review pages are
 * their own URLs so a phone shows them as pushed pages (‹ Payroll) and Back returns where it should. */
async function ownerNamesFor() {
  return listEmployees().then(list => list.filter(employee => employee.role === 'OWNER' && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim())).catch(() => []);
}

export async function PayrollRoute({ view, runId = null }: { view: PayrollView; runId?: string | null }) {
  if (!payrollFeatureEnabled()) notFound();
  const proof = await requireSessionMutationProof();
  const capabilities = await readPayrollCapabilities(proof);
  // PD9 / UX10: someone without payroll access who opens the link is told why, instead of a silent move to Home.
  // Review B2 (NV-137): the notice names who can help (the workspace's Owners, from the team list the person already sees).
  if (!capabilities.canReview) return <OwnerOnlyNotice title="Payroll" reason="Payroll is for Owners" help="Owners can give you payroll access." ownersCan="give you payroll access"
    owners={await ownerNamesFor()} />;
  const workspace = await getWorkspace();
  const recoveryScope = payrollRecoveryScope(workspace.id, proof.employee.id);
  const current = await currentPayPeriod().catch(() => null);
  // Names for the people a review, fix list or Pay history statement refers to by reference (no pay data; the team list
  // the Owner already sees). Pay history uses them to name each statement's employee from its record, never its file name.
  const names = view === 'home' ? {} : await listEmployees().then(list => Object.fromEntries(list.map(employee => [employee.id, `${employee.firstName} ${employee.lastName}`.trim()]))).catch(() => ({}));
  return <PayrollRuns key={recoveryScope} recoveryScope={recoveryScope} current={current} canEditSettings={proof.employee.role === 'OWNER'}
    view={view} runId={runId} names={names} company={workspace.name} timeZone={workspace.timeZone} tabs={view === 'home' ? payrollTabs(proof.employee.role, capabilities) : null} />;
}

export type PayrollSearch = Promise<{ run?: string | string[] }>;
export async function runParam(searchParams: PayrollSearch) {
  const run = (await searchParams).run;
  return typeof run === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(run) ? run : null;
}
