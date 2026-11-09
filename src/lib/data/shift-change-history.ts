import {readShiftChangeCompany,isShiftChangeAuthorizationError} from './shift-change-authority';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof, ShiftTerms, ShiftChangeSnapshot, ShiftChangeEvaluation } from '../shift-changes/types';
export function shiftChangeEvent(input:{workspaceId:string;requestId:string;revision:number;kind:'EXCHANGE'|'CALLOUT';event:string;actorId:string|null;source:ShiftTerms|null;target?:ShiftTerms|null;participants:Record<string,unknown>;mode?:string;outcomeReason?:string;reasonCode?:string;reasonNote?:string}):SqlStatement {
 return {text:'INSERT INTO shift_change_events(workspace_id,request_kind,request_id,request_revision,event_kind,actor_employee_id,source_terms,target_terms,participants,outcome_mode,callout_reason_code,callout_reason_note,outcome_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',values:[input.workspaceId,input.kind,input.requestId,input.revision,input.event,input.actorId,JSON.stringify(input.source),JSON.stringify(input.target??null),JSON.stringify(input.participants),input.mode??null,input.reasonCode??null,input.reasonNote??null,input.outcomeReason??null]};
}
/** History stays accessible after live-row deletion. Absence details are never exposed to peers. */
export async function readShiftChangeHistory(proof:SessionMutationProof,requestId:string,executor:SqlExecutor) {
 try{return await readShiftChangeCompany(proof,()=>executor.query({text:`SELECT request_kind,request_id,request_revision,event_kind,source_terms,target_terms,participants,outcome_mode,h.created_at,
 CASE WHEN e.role IN ('OWNER','MANAGER') OR h.participants->>'employeeId'=e.id THEN callout_reason_code ELSE NULL END AS callout_reason_code,
 CASE WHEN e.role IN ('OWNER','MANAGER') OR h.participants->>'employeeId'=e.id THEN callout_reason_note ELSE NULL END AS callout_reason_note
 FROM shift_change_events h JOIN workspaces w ON w.id=h.workspace_id AND w.active JOIN employees e ON e.id=$1 AND e.active JOIN employee_sessions s ON s.employee_id=e.id AND s.token_hash=$2 AND s.expires_at>clock_timestamp()
 WHERE h.request_id=$3 AND e.role=$4 AND (e.role IN ('OWNER','MANAGER') OR h.participants->>'employeeId'=e.id OR h.participants->>'requesterEmployeeId'=e.id OR h.participants->>'targetEmployeeId'=e.id) ORDER BY h.created_at,h.request_revision`,values:[proof.employee.id,proof.sessionTokenHash,requestId,proof.employee.role]}),executor);}catch(error){if(isShiftChangeAuthorizationError(error))return [];throw error;}
}

/** Prospective audit references only: no profile values, classifications or defaults.
 * This snapshot is the same source protected by the command transaction guards. */
export function decisionVersionReferences(snapshot:ShiftChangeSnapshot,evaluation:ShiftChangeEvaluation,workflow:'swap'|'coverage') {
 const employeeIds=[...new Set(evaluation.proposedAssignments.map(a=>a.employeeId))].sort();
 const keys=['minimumRest','maximumShift','maximumDaily','breaks','projectedOvertime'] as const;
 return {
  ...(snapshot.policy?{policy:{version:snapshot.policy.version,revision:snapshot.policy.revision,workflow,workflowRevision:snapshot.policy[workflow].revision}}:{}),
  profiles:employeeIds.flatMap(employeeId=>{
   const profile=snapshot.profiles.find(p=>p.employeeId===employeeId)?.profile;
   if(!profile||profile.revision<=0)return [];
   return [{employeeId,version:profile.version,revision:profile.revision,rules:Object.fromEntries(keys.flatMap(key=>{const setting=profile[key];return setting.status==='CONFIGURED'?[[key,setting.revision]]:[];}))}];
  }),
 };
}
