import 'server-only';
import {neonNotificationExecutor} from '../data/sql-executor';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {NativeConfigurationRevision} from '../payroll/native/contracts';
import {PayrollError} from '../payroll/model';
import {hash} from '../payroll/store';
import {ownerTransaction, q, ws} from './store.server';
import {parseWageRequest, updatedWages, wageTerms} from './wages';

export async function employeeWages(proof: SessionMutationProof, value: unknown, ex: SqlExecutor = neonNotificationExecutor()) {
  const cmd = parseWageRequest(value);
  const member = q(`SELECT (CASE WHEN EXISTS (SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=$1 AND l.workspace_id=${ws} FOR SHARE OF e,l) THEN '1' ELSE 'wage_authorization' END)::int`, cmd.employeeId);
  if (cmd.action === 'READ_WAGES') {
    const rows = await ownerTransaction<{payload: NativeConfigurationRevision}>(proof, ex, [member,
      q(`SELECT payload FROM native_payroll_profile_revisions WHERE workspace_id=${ws} AND employee_id=$1
        AND ($2::int IS NULL OR revision<$2) ORDER BY revision DESC LIMIT 21`, cmd.employeeId, cmd.beforeRevision)]);
    const history = rows.slice(0,20).map(({payload: p}) => ({revision:p.revision, actorId:p.actorId,
      createdAt:p.createdAt, reason:p.reason, wages:p.wages.map(wageTerms)}));
    return {employeeId:cmd.employeeId, history, nextBeforeRevision:rows.length > 20 ? history[19].revision : null};
  }

  const fingerprint = hash(cmd);
  const fetchReceipt = async () => {
    const [row] = await ownerTransaction<{command_hash:string; payload:typeof receipt}>(proof, ex, [member,
      q(`SELECT command_hash,payload FROM payroll_command_receipts WHERE workspace_id=${ws} AND actor_id=$1 AND operation_id=$2`,
        proof.employee.id, cmd.operationId)]);
    if (row && row.command_hash !== fingerprint) throw new PayrollError('OPERATION_CONFLICT',409);
    return row?.payload;
  };
  const receipt = {action:cmd.action, employeeId:cmd.employeeId, operationId:cmd.operationId, revision:cmd.expectedRevision + 1};
  const replay = await fetchReceipt();
  if (replay) return {receipt:replay};
  const [previous] = await ownerTransaction<{payload:NativeConfigurationRevision}>(proof, ex, [member,
    q(`SELECT payload FROM native_payroll_profiles_current WHERE workspace_id=${ws} AND employee_id=$1`,cmd.employeeId)]);
  if ((previous?.payload.revision ?? 0) !== cmd.expectedRevision) {
    const recovered = await fetchReceipt();
    if (recovered) return {receipt:recovered};
    throw new PayrollError('WAGE_REVISION_CONFLICT',409);
  }
  const wages = updatedWages(cmd, previous?.payload);
  const changedWages = wages.filter(w => !previous?.payload.wages.includes(w));
  const ids = [...new Set(changedWages.flatMap(w => w.locationIds))];
  const payload = {...(previous?.payload ?? {schema:'NEVORA_NATIVE_CONFIGURATION_V1', tax:null, deductions:[]}),
    employeeId:cmd.employeeId, wages, revision:receipt.revision, actorId:proof.employee.id, reason:cmd.reason};
  try {
    await ownerTransaction(proof, ex, [member,
      q('SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', ids),
      q(`SELECT (CASE WHEN (SELECT count(*) FROM locations WHERE workspace_id=${ws} AND active AND id=ANY($1::text[]))=cardinality($1::text[])
        AND COALESCE((SELECT revision FROM native_payroll_profiles_current WHERE workspace_id=${ws} AND employee_id=$2),0)=$3
        THEN '1' ELSE 'WAGE_REVISION_CONFLICT' END)::int`,ids,cmd.employeeId,cmd.expectedRevision),
      q(`INSERT INTO native_payroll_profile_revisions(workspace_id,employee_id,revision,payload)
        VALUES(${ws},$1,$2,$3::jsonb || jsonb_build_object('createdAt', clock_timestamp()))`,cmd.employeeId,receipt.revision,JSON.stringify(payload)),
      q(`INSERT INTO payroll_command_receipts VALUES(${ws},$1,$2::uuid,$3,$4::jsonb)`,proof.employee.id,cmd.operationId,fingerprint,JSON.stringify(receipt))],true);
    return {receipt};
  } catch (error) {
    const recovered = await fetchReceipt();
    if (recovered) return {receipt:recovered};
    throw error;
  }
}
