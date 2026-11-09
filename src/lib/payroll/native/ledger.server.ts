import 'server-only';
import type { PayrollRun } from '../contracts';
import type { Snapshot } from '../service';
import { statement as q, workspaceSql as ws } from '../store';
import { PayrollError } from '../model';
/** Build immutable employee ledger inserts for the approved native snapshot. Execute
 * them atomically with approval under current authority/source guards; opening
 * revision and correction lineage are retained for future YTD replacement projection. */
export function nativeLedgerStatements(run: PayrollRun, snapshot: Snapshot) {
    if (run.sourceAuthority !== 'NATIVE_RECORDED_TIME' || run.status !== 'APPROVED' || run.nativeCalculation?.state !== 'ready' || !snapshot.native)
        throw new PayrollError('NATIVE_APPROVAL_REQUIRED', 409);
    return run.nativeCalculation.employees.map(result => {
        const openingRevision = snapshot.native!.openingRevisions?.[result.employeeId];
        if (!openingRevision)
            throw new PayrollError('YTD_SOURCE_CONFLICT', 409);
        return q(`INSERT INTO native_payroll_ledger(workspace_id,employee_id,tax_year,run_id,correction_of,opening_revision,start_date,end_date,payday,payload) VALUES(${ws},$1,$2,$3::uuid,$4::uuid,$5,$6::date,$7::date,$8::date,$9::jsonb)`, result.employeeId, result.breakdown.taxYear, run.id, run.correctionOf, openingRevision, run.period.startDate, run.period.endDate, run.payday, JSON.stringify({ result }));
    });
}
