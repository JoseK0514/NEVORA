import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {parseEmployeeRequests,type EmployeeRequestsSnapshot,type OwnRequest,type OpenEmployeeShift} from '../employee-requests';
import {businessDate} from '../business-time';
import {readActivePresentation} from '../workspace-presentation/service';
import {neonNotificationExecutor} from './notification-transactions';
import {isManagementAuthorizationError} from './management-session';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {listOpenCoverage,listEmployeeRequestExchanges} from './exchanges';
import {listEmployeeTimeOffRequests} from './requests';
import {listEmployeeCallouts} from './callouts';
import {readShiftChangeAvailability} from './shift-changes';

/** Existing read owners run inside the shared Employee guards. No business SQL or eligibility rules are copied here. */
export async function readEmployeeRequests(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeRequestsSnapshot>{
 try{assertEmployeeViewProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal);
  const guards=[...employeeReadLimits,...employeeViewGuards(proof,workspace)];
  const guarded:SqlExecutor={
   async query<T>(statement:SqlStatement){const rows=await executor.transaction([...guards,statement,...employeeViewGuards(proof,workspace)],signal);return rows[guards.length] as T[];},
   async transaction(statements:SqlStatement[]){const rows=await executor.transaction([...guards,...statements,...employeeViewGuards(proof,workspace)],signal);return rows.slice(guards.length,guards.length+statements.length);},
  };
  const presentation=await readActivePresentation(workspace.id,guarded,{strict:true}),modules=presentation.modules;
  const own=proof.employee.id;
  const [coverage,exchanges,timeOff,callouts]=await Promise.all([
   modules.marketplace?listOpenCoverage(own,businessDate(new Date(),workspace.timeZone),guarded).catch(()=>null):[],
   modules.marketplace?listEmployeeRequestExchanges(own,guarded).catch(()=>null):{incoming:0,recent:[]},
   modules.timeOff?listEmployeeTimeOffRequests(own,guarded).catch(()=>null):[],
   modules.marketplace?listEmployeeCallouts(own,guarded).catch(()=>null):[],
  ]);
  const open:OpenEmployeeShift[]|null=coverage===null?null:await Promise.all(coverage.filter(row=>row.actionable&&row.status==='OPEN'&&Number.isSafeInteger(row.requestRevision)&&row.requestRevision!>0).map(async row=>{
   const check=await readShiftChangeAvailability(proof,{kind:'ACCEPT',requestId:row.id,expectedRevision:row.requestRevision!,operationId:randomUUID()},guarded).catch(()=>null);
   const eligible=check?.allowed&&(check.outcome==='completed'||check.outcome==='pending');
   return {id:row.id,revision:row.requestRevision!,date:row.sourceShift.date,startTime:row.sourceShift.startTime,endTime:row.sourceShift.endTime,location:row.sourceShift.locationName,position:row.sourceShift.positionName??null,
    check:eligible?'eligible' as const:check?.refusal?'refused' as const:'unavailable' as const,notice:check?.notice??(eligible?null:'Eligibility could not be checked. Refresh before continuing.'),outcome:eligible?check.outcome as 'completed'|'pending':null};
  }));
  // Keep the combined recent eight, plus every own time-off request still awaiting a decision.
  const recent:OwnRequest[]|null=exchanges===null||timeOff===null||callouts===null?null:[
   ...timeOff.filter(row=>row.employeeId===own).map(row=>({id:row.id,kind:'timeOff' as const,status:row.status,date:row.startDate,endDate:row.endDate,startTime:row.startTime&&row.endTime?row.startTime:null,endTime:row.startTime&&row.endTime?row.endTime:null,createdAt:row.createdAt})),
   ...exchanges.recent.map(row=>({id:row.id,kind:'shift' as const,status:row.status,date:row.sourceShift.date,endDate:null,startTime:null,endTime:null,createdAt:row.createdAt})),
   ...callouts.filter(row=>row.employeeId===own).map(row=>({id:row.id,kind:'callout' as const,status:row.status,date:row.date,endDate:null,startTime:null,endTime:null,createdAt:row.createdAt})),
  ].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).filter((row,index)=>index<8||(row.kind==='timeOff'&&row.status==='PENDING'));
  // Recheck current module revision after all independent reads; mixed policy observations never escape.
  const current=await readActivePresentation(workspace.id,guarded,{strict:true});
  if(current.revision!==presentation.revision)throw Error('Requests modules changed');
  const [lease]=await guarded.query<{observedAt:string;validForMs:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2`,values:[own,proof.sessionTokenHash]});
  return parseEmployeeRequests({state:'ready',kind:'requests',authority:employeeViewAuthority(proof,'requests'),...lease,timeZone:workspace.timeZone,modules:{timeOff:modules.timeOff,marketplace:modules.marketplace},open,recent,incoming:exchanges?.incoming??null});
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
