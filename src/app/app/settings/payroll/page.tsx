import { notFound, redirect } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { PayrollSettings } from '@/components/payroll/payroll-settings';
import { listEmployees, listLocations } from '@/lib/data/employees';
import { listBreakTypes } from '@/lib/clocker/break-types.server';
import type { NativeConfigurationSources } from '@/components/payroll/native-payroll-config';
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
  let nativeSources: NativeConfigurationSources|null = null;
  if (capabilities.internalCalculatorAvailable) {
    try {
      const [employees,locations,breakTypes] = await Promise.all([listEmployees(),listLocations({includeInactive:true}),listBreakTypes({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash})]);
      nativeSources = {employees:employees.map(e=>({id:e.id,name:`${e.firstName} ${e.lastName}`,role:e.role,active:e.active})),locations:locations.map(l=>({id:l.id,name:l.name,active:l.active})),breakTypes:breakTypes.map(b=>({id:b.id,name:b.name,active:b.active}))};
    } catch { nativeSources = null; }
  }
  if (nativeSources && !(await readPayrollCapabilities(proof)).canConfigure) redirect('/app');
  return <PayrollSettings nativeSources={nativeSources} key={recoveryScope} recoveryScope={recoveryScope} />;
}
