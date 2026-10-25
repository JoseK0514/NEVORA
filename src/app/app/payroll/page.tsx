import { notFound } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { PayrollRuns } from '@/components/payroll/payroll-runs';
import { getWorkspace } from '@/lib/data/workspaces';
import { payrollRecoveryScope } from '@/components/payroll/recovery-scope';
import { OwnerOnlyNotice } from '@/components/owner-only-notice';
import { currentPayPeriod } from '@/lib/payroll/pay-calendar.server';
import '../payroll-export/payroll-page.css';
import './payroll-workflow.css';

export default async function PayrollPage() {
  if (!payrollFeatureEnabled()) notFound();
  const proof = await requireSessionMutationProof();
  const capabilities = await readPayrollCapabilities(proof);
  // PD9 / UX10: someone without payroll access who opens the link is told why, instead of a silent move to Home.
  if (!capabilities.canReview) return <OwnerOnlyNotice help="Ask an Owner if you need payroll access." />;
  const workspace = await getWorkspace();
  const recoveryScope = payrollRecoveryScope(workspace.id, proof.employee.id);
  const current = await currentPayPeriod().catch(() => null);
  return <PayrollRuns key={recoveryScope} recoveryScope={recoveryScope} current={current} canEditSettings={proof.employee.role === 'OWNER'} />;
}
