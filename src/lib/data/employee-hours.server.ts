import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {parseEmployeeHours,validHoursSelection,type EmployeeHoursSnapshot,type HoursDecision} from '../employee-hours';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import {readEmployeeTime} from './employee-time.server';
import {readTimecards} from '../timecards/service';
import {readEmployeeTimeCorrections} from './time-corrections.server';
import {hoursCorrectionBasis} from './employee-hours-basis';
export async function hoursReadContext(proof:SessionMutationProof,executor:SqlExecutor){
 assertEmployeeViewProof(proof);const signal=AbortSignal.timeout(10000),workspace=await readEmployeeWorkspace(executor,signal);
 const authority=()=>[...employeeViewGuards(proof,workspace,false),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])];
 const guarded:SqlExecutor={
  async query<T>(statement:SqlStatement){const before=[...employeeReadLimits,...authority()],rows=await executor.transaction([...before,statement,...authority()],signal);return rows[before.length] as T[];},
  async transaction(statements){const before=[...employeeReadLimits,...authority()],rows=await executor.transaction([...before,...statements,...authority()],signal);return rows.slice(before.length,before.length+statements.length);},
 };
 return {workspace,guarded};
}
/** Each capability is read independently. A failed timecard read cannot fabricate empty time or disable recorded punches. */
export async function readEmployeeHours(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor(),view:string,selection:string):Promise<EmployeeHoursSnapshot>{
 try{assertEmployeeViewProof(proof);if(!validHoursSelection(view,selection))throw Error('selection');}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const started=performance.now(),{workspace,guarded}=await hoursReadContext(proof,executor);let data:unknown,deadline=Infinity;
  if(view==='records'){
   const time=await readEmployeeTime(proof,guarded);if(time.state==='unavailable'&&time.reason==='access_denied')return {state:'unavailable',reason:'access_denied'};
   if(time.state==='ready')deadline=Date.parse(time.observedAt)+time.validForMs;data=time;
  }else if(view==='cards'){
   const [startDate,endDate]=selection.split('_'),cards=await readTimecards(proof,{startDate,endDate},guarded);
   if(cards.state==='unavailable'&&cards.reason==='access_denied')return {state:'unavailable',reason:'access_denied'};if(cards.state==='ready')deadline=Date.parse(cards.observedAt)+cards.validForMs;data=cards;
  }else{
   const [{basis}]=await guarded.query<{basis:string}>(hoursCorrectionBasis(proof.employee.id,workspace.id));
   const snapshot=await readEmployeeTimeCorrections(proof,guarded,selection==='list'||selection.startsWith('target:')?undefined:selection,selection.startsWith('target:')?selection.slice(7):undefined);
   if(snapshot.state==='unavailable'&&snapshot.reason==='access_denied')return {state:'unavailable',reason:'access_denied'};
   const ids=snapshot.state==='ready'?snapshot.requests.map(r=>r.id):[],decisions=ids.length?await guarded.query<HoursDecision>({text:`SELECT r.id::text AS "requestId",e.event_kind AS status,e.occurred_at::text AS at,trim(a.first_name||' '||a.last_name) AS by,e.decision_note AS note FROM time_correction_requests r JOIN LATERAL(SELECT * FROM time_correction_events WHERE request_id=r.id ORDER BY revision DESC LIMIT 1)e ON true JOIN employees a ON a.id=e.actor_employee_id WHERE r.employee_id=$1 AND r.workspace_id=$2 AND r.id=ANY($3::uuid[]) AND e.event_kind IN('APPROVED','REJECTED')`,values:[proof.employee.id,workspace.id,ids]}):[];
   const [{basis:latest}]=await guarded.query<{basis:string}>(hoursCorrectionBasis(proof.employee.id,workspace.id));if(latest!==basis)throw Error('Correction source changed');data={basis,snapshot,decisions};
  }
  const [lease]=await guarded.query<{observedAt:string;validForMs:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM(expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2`,values:[proof.employee.id,proof.sessionTokenHash]});
  const validForMs=Math.floor(Math.min(lease.validForMs,deadline-Date.parse(lease.observedAt),45000-(performance.now()-started)));
  return parseEmployeeHours({state:'ready',kind:'hours',authority:employeeViewAuthority(proof,'hours'),observedAt:lease.observedAt,validForMs,timeZone:workspace.timeZone,view,selection,data});
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
