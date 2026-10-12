import { notFound, redirect } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { PayrollRuns } from '@/components/payroll/payroll-runs';
import '../payroll-export/payroll-page.css';
import './payroll-workflow.css';

export default async function PayrollPage() {
  if (!payrollFeatureEnabled()) notFound();
  const proof = await requireSessionMutationProof();
  const capabilities = await readPayrollCapabilities(proof);
  if (!capabilities.canReview) redirect('/app');
  return <PayrollRuns key={proof.employee.id} />;
}
