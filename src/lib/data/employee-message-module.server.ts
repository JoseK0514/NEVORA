import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {assertEmployeeViewProof,readEmployeeWorkspace} from './employee-profile.server';
import {workspaceReadGuard} from './workspaces';
import {managementSessionStatements} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
/** Fence module permission at the end of the canonical transaction. A concurrent
 * disable rolls the whole write back; the shared presentation lock lasts to commit.
 * Original statement/result indexes and every business-owner guard are preserved. */
export async function employeeUpdatesExecutor(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<SqlExecutor>{
 assertEmployeeViewProof(proof);const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal);
 const [installed]=await executor.query<{installed:boolean}>({text:"SELECT to_regclass('nevora_workspace_presentation_revisions') IS NOT NULL AS installed",values:[]},signal);
 const tail:SqlStatement[]=[...workspaceReadGuard(workspace),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
  {text:'SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))',values:['workspace-presentation:'+workspace.id]},
  installed?.installed?{text:`SELECT (CASE WHEN NOT COALESCE((SELECT (settings#>'{modules,disabled}') ? 'updates' FROM nevora_workspace_presentation_revisions WHERE workspace_id=$1 ORDER BY revision DESC LIMIT 1),false) THEN '1' ELSE 'management_authorization' END)::integer AS employee_updates_module_guard`,values:[workspace.id]}:{text:`SELECT (CASE WHEN to_regclass('nevora_workspace_presentation_revisions') IS NULL THEN '1' ELSE 'management_authorization' END)::integer AS employee_updates_module_guard`,values:[]}];
 const transaction=async(statements:SqlStatement[],caller?:AbortSignal)=>{const rows=await executor.transaction([...statements,...tail],caller?AbortSignal.any([signal,caller]):signal);return rows.slice(0,statements.length);};
 return {transaction,async query<T>(statement:SqlStatement,caller?:AbortSignal){return (await transaction([statement],caller))[0] as T[];}};
}
