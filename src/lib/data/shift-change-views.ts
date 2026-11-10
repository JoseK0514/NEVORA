import {readShiftChangeCompany,isShiftChangeAuthorizationError} from './shift-change-authority';
import {findShiftChangeOperation} from './shift-changes';
import type {SessionMutationProof} from '../shift-changes/types';
import {readShiftChangeHistory} from './shift-change-history';
import {neonNotificationExecutor} from './notification-transactions';
import type {SqlExecutor} from '../notifications/types';
import {resolveOperationalRuleProfile} from '../shift-changes/policy';
/** Management-only read. No default settings row is created. */
export async function readOperationalRuleProfileView(proof:SessionMutationProof,employeeId:string,executor:SqlExecutor=neonNotificationExecutor()){
 if(!['OWNER','MANAGER'].includes(proof.employee.role))return null;
 try{return await readShiftChangeCompany(proof,async()=>{
 const rows=await executor.query<{profile:unknown}>({text:`SELECT settings.operational_rule_profile AS profile FROM employee_scheduling_settings settings WHERE settings.employee_id=$1 AND EXISTS(SELECT 1 FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE e.id=$2 AND s.token_hash=$3 AND s.expires_at>clock_timestamp() AND e.active AND e.role IN ('OWNER','MANAGER'))`,values:[employeeId,proof.employee.id,proof.sessionTokenHash]});
 return rows[0]?resolveOperationalRuleProfile(rows[0].profile):null;
 },executor);}catch(error){if(isShiftChangeAuthorizationError(error))return null;throw error;}
}
export type ShiftHistoryView={revision:number;event:string;at:string;source:string|null;target:string|null;mode:string|null};
/** Explicit immutable presentation only; private peer absence/rules/participants never cross the UI boundary. */
/** `shownSource` lets an employee's own callout show a held shift's published version (Jose, 2026-10-31). */
export async function readShiftChangeHistoryView(proof:SessionMutationProof,requestId:string,executor:SqlExecutor=neonNotificationExecutor(),shownSource:(terms:unknown)=>unknown=terms=>terms):Promise<ShiftHistoryView[]>{
 const rows=await readShiftChangeHistory(proof,requestId,executor);
 function slot(raw:unknown){
  if(!raw||typeof raw!=='object')return null;
  const t=raw as Record<string,unknown>;
  const fact=(current:string,legacy:string)=>Object.hasOwn(t,current)?t[current]:t[legacy];
  const time=(value:unknown)=>typeof value==='string'?value.slice(0,5):'Unknown time';
  const position=fact('positionId','position_id'),lead=fact('isDesignatedLead','is_designated_lead');
  return `${typeof t.date==='string'?t.date.slice(0,10):'Unknown date'} · ${time(fact('startTime','start_time'))} – ${time(fact('endTime','end_time'))} · Location ${String(fact('locationId','location_id')??'unknown')} · ${position===undefined?'Position unknown':position===null?'No assigned position':`Position ${String(position)}`} · ${lead===true?'Shift lead':lead===false?'No shift lead':'Lead designation unknown'}`;
 }
 return rows.map(raw=>{const row=raw as Record<string,unknown>;return ({revision:Number(row.request_revision),event:String(row.event_kind).toLowerCase().replaceAll('_',' '),at:new Date(String(row.created_at)).toISOString(),source:slot(shownSource(row.source_terms)),target:slot(row.target_terms),mode:row.outcome_mode?String(row.outcome_mode):null});});
}

/** Authorized read-only lookup for Server Component rendering. Revalidation
 * belongs to the separate, client-invoked reconciliation action boundary. */
export async function readShiftChangeOperationView(
 proof:SessionMutationProof,
 operationId:string,
 executor:SqlExecutor=neonNotificationExecutor(),
){
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(operationId))return null;
 return findShiftChangeOperation(proof,operationId,executor);
}
