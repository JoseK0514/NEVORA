import { notFound, redirect } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { PayrollSettings } from '@/components/payroll/payroll-settings';
import { getWorkspace } from '@/lib/data/workspaces';
import { payrollRecoveryScope } from '@/components/payroll/recovery-scope';
import '../../payroll-export/payroll-page.css';
import '../../payroll/payroll-workflow.css';

export default async function PayrollSettingsPage() {
  if (!payrollFeatureEnabled()) notFound();
  const proof = await requireSessionMutationProof();
  const capabilities = await readPayrollCapabilities(proof);
  if (!capabilities.canConfigure) redirect('/app');
  const workspace = await getWorkspace();
  const recoveryScope = payrollRecoveryScope(workspace.id, proof.employee.id);
  return <PayrollSettings key={recoveryScope} recoveryScope={recoveryScope} />;
}
