import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof, ShiftChangeCommand, ShiftChangeSnapshot, ShiftChangeRequest } from '../shift-changes/types';
import { generationSourceSql, type GenerationSource, type GenerationSourceRow } from './generation-guards';
import { neonNotificationExecutor, notificationStateSql, type GuardedWeekState } from './notification-transactions';
import { mapSchedulingSourceFacts } from './scheduling-source-facts';
import { resolveShiftChangePolicy } from '../shift-changes/policy';
import { materialShiftTerms, shiftTermsFingerprint, sourceShiftTerms } from '../shift-changes/terms';
export class ShiftChangeAuthorizationError extends Error {}
export type CommandSnapshot = ShiftChangeSnapshot & { weekState: GuardedWeekState; requestRow: GenerationSourceRow | null };
export async function readShiftChangeSnapshot(proof:SessionMutationProof, command:ShiftChangeCommand | {kind:'REVIEW';sourceShiftId:string;targetShiftId?:string}, executor:SqlExecutor):Promise<CommandSnapshot> {
 const [row]=await executor.query<{source:GenerationSource;state:GuardedWeekState;observedAt:string;workspaceUpdatedAt:string;authorized:boolean}>({text:`SELECT ${generationSourceSql} AS source, ${notificationStateSql.replaceAll('$1','ARRAY(SELECT DISTINCT week_start FROM schedules)')} AS state, to_jsonb(clock_timestamp()) AS "observedAt", (SELECT updated_at::text FROM workspaces WHERE singleton) AS "workspaceUpdatedAt", EXISTS(SELECT 1 FROM employee_sessions ss JOIN employees e ON e.id=ss.employee_id WHERE ss.token_hash=$1 AND e.id=$2 AND e.active AND e.role=$3 AND ss.expires_at>clock_timestamp()) AS authorized`,values:[proof.sessionTokenHash,proof.employee.id,proof.employee.role]});
 if(!row?.authorized || row.source.workspaces[0]?.active!==true) throw new ShiftChangeAuthorizationError();
 const source=row.source,w=source.workspaces[0];
 const dates=source.shifts.map(s=>String(s.date)).sort();
 const facts=mapSchedulingSourceFacts(source,{workspaceId:String(w.id),startDate:dates[0]??row.observedAt.slice(0,10),endDate:dates.at(-1)??row.observedAt.slice(0,10),retainAdjacentCommitments:true});
 facts.workspace.updatedAt=row.workspaceUpdatedAt;
 const policy=resolveShiftChangePolicy(w.shift_change_policy);
 const callout=command.kind.endsWith('CALLOUT');
 const requestRow='requestId' in command ? (callout?source.shift_callouts:source.shift_exchanges).find(r=>r.id===command.requestId)??null:null;
 const r=requestRow;
 const request:ShiftChangeRequest|null = r&&!callout ? {id:String(r.id),kind:r.kind as ShiftChangeRequest['kind'],status:r.status as ShiftChangeRequest['status'],revision:Number(r.request_revision),legacyManual:r.legacy_manual===true,requestedByEmployeeId:String(r.requested_by_employee_id),targetEmployeeId:r.target_employee_id==null?null:String(r.target_employee_id),requesterConsent:r.requester_consent as ShiftChangeRequest['requesterConsent'],targetConsent:r.target_consent as ShiftChangeRequest['targetConsent'],recordedApprovalMode:r.recorded_approval_mode as ShiftChangeRequest['recordedApprovalMode'],effectiveApprovalMode:policy?.[r.kind==='SWAP'?'swap':'coverage'].mode??null}:null;
 return {source,facts,observedAt:row.observedAt,actor:proof,request,policy,profiles:facts.employees.map(e=>({employeeId:e.id,profile:e.operationalProfile!})),ledger:source.shifts.flatMap(s=>{const parent=facts.schedules.find(p=>p.id===s.schedule_id);return parent?[sourceShiftTerms(s,parent,String(w.id),String(w.time_zone))]:[];}),publication:facts.schedules.map(s=>({scheduleId:s.id,status:s.status})),weekState:row.state,requestRow};
}

/** Safe displayed terms for a new consent-bearing form. The private snapshot and
 * actual session proof never cross the server boundary. Fingerprints are freshness,
 * not authority; submission rechecks the current session and every scheduling fact. */
export async function readShiftChangeTerms(proof:SessionMutationProof,sourceShiftId:string,targetShiftId?:string,executor:SqlExecutor=neonNotificationExecutor()) {
 if(!proof?.employee?.id||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash)||![sourceShiftId,...(targetShiftId?[targetShiftId]:[])].every(id=>id.length>0&&id.length<=128))return null;
 try {
  const s=await readShiftChangeSnapshot(proof,{kind:'REVIEW',sourceShiftId,targetShiftId},executor);
  const source=s.ledger.find(t=>t.shiftId===sourceShiftId),target=targetShiftId?s.ledger.find(t=>t.shiftId===targetShiftId):null;
  const published=(scheduleId:string)=>s.publication.some(p=>p.scheduleId===scheduleId&&p.status==='PUBLISHED');
  if(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||!source||source.employeeId!==proof.employee.id||!published(source.scheduleId)||(targetShiftId&&(!target||!published(target.scheduleId))))return null;
  return {source:materialShiftTerms(source),sourceTermsFingerprint:shiftTermsFingerprint(source),target:target?materialShiftTerms(target):null,targetTermsFingerprint:target?shiftTermsFingerprint(target):null};
 } catch(error) {if(error instanceof ShiftChangeAuthorizationError)return null;throw error;}
}
