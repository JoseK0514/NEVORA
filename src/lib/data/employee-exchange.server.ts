import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {employeeRequestId,exchangeSummary,calloutSummary,exchangeSlot,employeeHistory,parseEmployeeExchange,type EmployeeExchangeSnapshot,type EmployeeRequestDetail,type EmployeeResponseKind,type ResponseCheck,type RequestSummary,type RequestSlot} from '../employee-exchange';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {neonNotificationExecutor} from './notification-transactions';
import {isManagementAuthorizationError} from './management-session';
import {sqlNotificationStateRepository,notificationReadSql} from './notification-state';
import {readActivePresentation} from '../workspace-presentation/service';
import {getExchange,listIncomingSwaps,listEmployeeExchangeActivity,type ExchangeRecord} from './exchanges';
import {getCallout,listEmployeeCallouts,shownCalloutTerms,type CalloutRecord} from './callouts';
import {readShiftChangeHistory} from './shift-change-history';
import {readShiftChangeAvailability} from './shift-changes';
const active=['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'];
const reasonLabels:Record<string,string>={ILLNESS:'Illness / sick',FAMILY_EMERGENCY:'Family emergency',TRANSPORTATION:'Transportation issue',SCHOOL:'School conflict',PERSONAL_EMERGENCY:'Personal emergency',OTHER:'Other'};
/** Minimal Employee list/detail view. Existing source readers and the final command planner remain authoritative. */
export async function readEmployeeExchange(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor(),selection:string|null=null):Promise<EmployeeExchangeSnapshot>{
 try{assertEmployeeViewProof(proof);if(selection!==null&&!employeeRequestId(selection))throw Error('selection');}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),guards=[...employeeReadLimits,...employeeViewGuards(proof,workspace)];
  let locationScope:string[]|null=null;
  // Bind the captured permission scope through every later transaction, including final lease admission.
  const scopeGuards=():SqlStatement[]=>locationScope===null?[]:[{text:`SELECT (CASE WHEN EXISTS(
   SELECT 1 FROM (${notificationReadSql.recipient()}) current_access WHERE allowed_location_ids=$2::text[])
   THEN '1' ELSE 'management_authorization' END)::integer AS employee_location_scope_guard`,values:[proof.employee.id,locationScope]}];
  const guarded:SqlExecutor={
   async query<T>(statement:SqlStatement){const admission=[...guards,...scopeGuards()];const rows=await executor.transaction([...admission,statement,...employeeViewGuards(proof,workspace),...scopeGuards()],signal);return rows[admission.length] as T[];},
   async transaction(statements:SqlStatement[]){const admission=[...guards,...scopeGuards()];const rows=await executor.transaction([...admission,...statements,...employeeViewGuards(proof,workspace),...scopeGuards()],signal);return rows.slice(admission.length,admission.length+statements.length);},
  };
  const presentation=await readActivePresentation(workspace.id,guarded,{strict:true}),enabled=presentation.modules.marketplace,own=proof.employee.id;
  const access=await sqlNotificationStateRepository(guarded,workspace).recipientAccess(own);
  if(!access?.active||access.employeeId!==own||access.role!==proof.employee.role)return {state:'unavailable',reason:'access_denied'};
  locationScope=[...access.allowedLocationIds];
  const allowed=new Set(access.allowedLocationIds);
  const permitted=(row:ExchangeRecord)=>!!exchangeSummary(row,own)&&allowed.has(row.sourceShift.locationId)&&(!row.targetShift||allowed.has(row.targetShift.locationId));
  const permittedCallout=(row:CalloutRecord)=>row.employeeId===own&&allowed.has(row.locationId);
  let incoming:RequestSummary[]|null=selection===null?[]:null,activity:RequestSummary[]|null=selection===null?[]:null,detail:EmployeeRequestDetail|null=null;
  if(enabled&&selection===null){
   const [received,mine,reports]=await Promise.all([listIncomingSwaps(own,guarded).catch(()=>null),listEmployeeExchangeActivity(own,guarded).catch(()=>null),listEmployeeCallouts(own,guarded).catch(()=>null)]);
   incoming=received===null?null:received.filter(row=>permitted(row)&&row.targetEmployeeId===own&&row.status==='EMPLOYEE_PENDING').map(row=>exchangeSummary(row,own)!);
   activity=mine===null||reports===null?null:[
    ...mine.filter(row=>permitted(row)&&!(row.targetEmployeeId===own&&row.requestedByEmployeeId!==own&&row.status==='EMPLOYEE_PENDING')).map(row=>exchangeSummary(row,own)!),
    ...reports.filter(permittedCallout).map(row=>calloutSummary(row,own)!),
   ].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  }else if(enabled&&selection){
   const [exchange,report]=await Promise.all([getExchange(selection,guarded),getCallout(selection,guarded,{employeeView:true})]);
   const ownExchange=exchange&&permitted(exchange)?exchange:null,ownReport=report&&permittedCallout(report)?report:null;
   // Jose, 2026-10-31: while the reported shift has held edits, history recorded
   // from its live terms is shown as the published version (display only).
   const recorded=await readShiftChangeHistory(proof,selection,guarded).catch(()=>null);
   const raw=recorded&&ownReport?recorded.map(value=>{const row=value as Record<string,unknown>;return {...row,source_terms:shownCalloutTerms(ownReport,row.source_terms)};}):recorded;
   const historyScoped=raw?.every(value=>{
    const row=value as Record<string,unknown>;
    return [row.source_terms,row.target_terms].every(terms=>terms===null||!!terms&&typeof terms==='object'&&allowed.has(String((terms as Record<string,unknown>).locationId??(terms as Record<string,unknown>).location_id)));
   });
   const history=raw===null||!historyScoped?null:employeeHistory(raw);
   const checks:ResponseCheck[]=[];
   const summary=ownExchange?exchangeSummary(ownExchange,own):ownReport?calloutSummary(ownReport,own):null;
   if(summary){
    const kinds:EmployeeResponseKind[]=ownExchange?
     ownExchange.targetEmployeeId===own&&ownExchange.kind==='SWAP'&&ownExchange.status==='EMPLOYEE_PENDING'?['ACCEPT','DECLINE']:
     ownExchange.requestedByEmployeeId===own&&active.includes(ownExchange.status)?['CANCEL']:
     ownExchange.targetEmployeeId===own&&ownExchange.status==='MANAGER_PENDING'?['WITHDRAW']:[]:
     ownReport?.status==='PENDING'?['CANCEL_CALLOUT']:[];
    await Promise.all(kinds.map(async kind=>{
     const view=summary.revision?await readShiftChangeAvailability(proof,{kind,requestId:selection,expectedRevision:summary.revision,operationId:randomUUID()},guarded).catch(()=>null):null;
     const canReview=kind!=='ACCEPT'||!!ownExchange?.targetShift&&!!exchangeSlot(ownExchange.sourceShift)&&!!exchangeSlot(ownExchange.targetShift);
     const permitted=view?.allowed===true&&canReview&&(kind!=='ACCEPT'||view.outcome==='completed'||view.outcome==='pending');
     checks.push({kind,allowed:permitted,notice:view?.notice??(permitted?null:'This response couldn’t be checked. Refresh before continuing.'),outcome:permitted&&(view?.outcome==='completed'||view?.outcome==='pending')?view.outcome:null});
    }));
    checks.sort((a,b)=>kinds.indexOf(a.kind)-kinds.indexOf(b.kind));
    const calloutSlot:RequestSlot|null=ownReport?{date:ownReport.date,startTime:ownReport.startTime,endTime:ownReport.endTime,location:ownReport.locationName,position:null,lead:null}:null;
    // Callout joins can describe a later assignment. Prefer the immutable recorded terms when available.
    const originalReport=raw?.[0] as {source_terms?:{locationId?:string;location_id?:string}}|undefined;
    const originalLocation=originalReport?.source_terms?.locationId??originalReport?.source_terms?.location_id;
    const recordedReport=ownReport&&history?.[0]?.offered?{...calloutSlot!,...history[0].offered,location:originalLocation===ownReport.locationId?ownReport.locationName:'Original location'}:null;
    detail={summary,offered:ownExchange?exchangeSlot(ownExchange.sourceShift):recordedReport,requested:ownExchange?.targetShift?exchangeSlot(ownExchange.targetShift):null,history,checks,
     notice:ownExchange?.actionable===false&&active.includes(ownExchange.status)?'The reviewed shift changed or the request needs review. Check the current status before changing your plans.':ownReport?.status==='APPROVED'&&!ownReport.releaseApplies?'This approval relates to an earlier assignment. Check your current schedule.':null,
     reason:ownReport?[reasonLabels[ownReport.reasonCode]??'Recorded reason',ownReport.reasonNote].filter(Boolean).join(' · '):null};
   }else if(raw===null)throw Error('History unavailable');
   else if(history?.length){
    const first=history[0],original=raw[0] as Record<string,unknown>;
    // History-only membership was enforced by its existing reader; no live request means no action.
    const slot=(v:typeof first.offered):RequestSlot|null=>v?{...v,location:'Recorded location',position:null,lead:null}:null;
    const isReport=original.request_kind==='CALLOUT';
    const participants=original.participants as {requesterEmployeeId?:string}|undefined;
    detail={summary:{id:selection,kind:isReport?'callout':first.requested?'swap':'coverage',viewer:isReport?'reporter':participants?.requesterEmployeeId===own?'requester':'recipient',status:'RECORDED',date:first.offered?.date??first.at.slice(0,10),createdAt:first.at,counterparty:null,revision:null,releaseApplies:isReport?false:null},offered:slot(first.offered),requested:slot(first.requested),history,checks:[],notice:'This request is available as recorded history. No current response can be submitted.',reason:null};
   }
  }
  const current=await readActivePresentation(workspace.id,guarded,{strict:true});
  if(current.revision!==presentation.revision)throw Error('Modules changed');
  const [lease]=await guarded.query<{observedAt:string;validForMs:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2`,values:[own,proof.sessionTokenHash]});
  return parseEmployeeExchange({state:'ready',kind:'exchange',authority:employeeViewAuthority(proof,'exchange'),...lease,timeZone:workspace.timeZone,enabled,selection,incoming,activity,detail});
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
