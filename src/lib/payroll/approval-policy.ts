import type { PayrollRun } from './contracts';
import { PayrollError } from './model';

function hasOwnAmounts(run: PayrollRun, employeeId: string | null): boolean {
    if (run.sourceAuthority === 'NATIVE_RECORDED_TIME' || !employeeId) return false;
    const row = run.rows?.find(candidate => candidate.employeeId === employeeId);
    // A provider import includes the full roster, including zero-money rows.
    return !!row && (row.grossMinor !== '0' || row.netMinor !== '0' ||
        row.employerContributions.some(line => line.amountMinor !== '0'));
}

export function assertIndependentPayrollActor(run: PayrollRun, employeeId: string): void {
    if (hasOwnAmounts(run, employeeId)) throw new PayrollError('PAYROLL_SELF_REVIEW', 409);
}

export function assertIndependentPayrollApproval(run: PayrollRun): void {
    if (hasOwnAmounts(run, run.approvedBy)) {
        throw new PayrollError('INDEPENDENT_PAYROLL_APPROVAL_REQUIRED', 409);
    }
}
