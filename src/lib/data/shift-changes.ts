import {readShiftChangeCompany,shiftChangeCompanyStatements,shiftChangeCompanyFence,isShiftChangeAuthorizationError} from './shift-change-authority';
import { createHash, randomUUID } from 'node:crypto';
import type { SessionMutationProof, ShiftChangeCommand, ShiftChangeResult, ShiftTerms, ConsentSnapshot, ShiftChangeEvaluation } from '../shift-changes/types';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { readShiftChangeSnapshot, type CommandSnapshot } from './shift-change-snapshot';
import { shiftChangeSessionGuard,shiftChangeAfterGuard } from './shift-change-guards';
import { generationMutationGuards, type GenerationSourceRow } from './generation-guards';
import { neonNotificationExecutor, preparePublishedWeekChange, type GuardedShift } from './notification-transactions';
import { bindWorkspaceNotificationConfig, readNotificationConfig } from '../notifications/config';
import { materialShiftTerms, shiftTermsFingerprint, sameShiftTerms, calloutReleasesShift } from '../shift-changes/terms';
import { evaluateRequestDeadlines } from '../shift-changes/policy';
import { shiftBoundaryInstants } from '../business-time';
import { affectedWorkweeks,shiftPeriod } from '../scheduling/periods';
import { evaluateShiftChange } from '../scheduling/shift-change-evaluation';
import { decideShiftChangeTransition } from '../shift-changes/lifecycle';
import type { ExchangeRecord, ExchangeShift } from './exchanges';
import type { CalloutRecord } from './callouts';
import { requestNotificationStatements,requestSnapshot,guardedRequestMutation } from './request-notifications';
import { shiftChangeEvent,decisionVersionReferences } from './shift-change-history';
import { cancelNotificationStatements } from './notifications';
import { eligibilityReasons, REASON_TEXT, type EligibilityReason } from '../shift-changes/eligibility-reasons';
const conflict:ShiftChangeResult={status:'conflict'};
const unavailable:ShiftChangeResult={status:'unavailable'};
const blocked=(code:'STALE_TERMS'|'DEADLINE_PASSED'|'POLICY_UNKNOWN'|'CONSENT_REQUIRED',message:string):ShiftChangeResult=>({status:'blocked',issues:[{code,message}]});
const fingerprint=(command:ShiftChangeCommand)=>createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(command).sort(([a],[b])=>a.localeCompare(b))))).digest('hex');
export async function findShiftChangeOperation(proof:SessionMutationProof,operationId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<ShiftChangeResult|null> {
 try{return await readShiftChangeCompany(proof,async()=>{
 const [r]=await executor.query<{result:ShiftChangeResult}>({text:`SELECT o.result FROM shift_change_operations o JOIN workspaces w ON w.id=o.workspace_id AND w.active JOIN employees e ON e.id=o.actor_employee_id AND e.active JOIN employee_sessions s ON s.employee_id=e.id AND s.token_hash=$1 AND s.expires_at>clock_timestamp() WHERE o.actor_employee_id=$2 AND o.operation_id=$3::uuid AND e.role=$4`,values:[proof.sessionTokenHash,proof.employee.id,operationId,proof.employee.role]});
 return r?.result??null;
 },executor);}catch(error){if(isShiftChangeAuthorizationError(error))return null;throw error;}
}
type Plan={result:ShiftChangeResult;statements:SqlStatement[];afterShifts:GuardedShift[];deadline?:string;requestId:string;sourceType:'EXCHANGE'|'CALLOUT'};
function planCommand(s:CommandSnapshot,c:ShiftChangeCommand):Plan|ShiftChangeResult {
 const actor=s.actor.employee,manager=['OWNER','MANAGER'].includes(actor.role),w=s.facts.workspace;
 const shifts=s.weekState.shifts.map(x=>({...x})),statements:SqlStatement[]=[];
 const callout=c.kind.endsWith('CALLOUT');
 if(!c.kind.startsWith('MANAGER_')&&!['APPROVE_CALLOUT','DECLINE_CALLOUT'].includes(c.kind)&&!['EMPLOYEE','LEAD'].includes(actor.role))return unavailable;
 const r=s.requestRow;
 const source=s.ledger.find(t=>t.shiftId===('sourceShiftId' in c?c.sourceShiftId:r?.source_shift_id??r?.shift_id));
 const target=s.ledger.find(t=>t.shiftId===('targetShiftId' in c?c.targetShiftId:r?.target_shift_id))??null;
 if(!source) return unavailable;
 const published=(t:ShiftTerms)=>s.publication.some(p=>p.scheduleId===t.scheduleId&&p.status==='PUBLISHED');
 const current=(stored:unknown,t:ShiftTerms)=>{try{return !!stored&&sameShiftTerms(stored as ShiftTerms,t);}catch{return false;}};
 const fresh=()=>published(source)&&(!target||published(target))&&current(r?.source_terms,source)&&(!target||current(r?.target_terms,target));
 const scope=s.policy?.[(c.kind==='PROPOSE_SWAP'||r?.kind==='SWAP')?'swap':'coverage'];
 // Only transfer/approval paths require an absolute trading boundary. An inability
 // report preserves the exact reviewed civil terms even when configuration needs
 // repair; closing a request likewise does not interpret an uncertain instant.
 let deadline:ReturnType<typeof evaluateRequestDeadlines>={status:'UNVERIFIED',allowed:false};
 if(['PROPOSE_SWAP','OFFER_COVERAGE','ACCEPT','MANAGER_APPROVE','APPROVE_CALLOUT'].includes(c.kind)) {
  let earliest:number;
  try {earliest=Math.min(...[source,...(target?[target]:[])].map(t=>Date.parse(shiftBoundaryInstants(t,w.timeZone).startAt)));}
  catch {return {status:'blocked',issues:[{code:'INVALID_TIME_RANGE',message:'Assignment time is ambiguous or invalid. Management must review the time zone and shift boundaries.'}]};}
  deadline=evaluateRequestDeadlines({stage:'requestId' in c?'COMPLETE':'SUBMIT',now:s.observedAt,earliestShiftStart:new Date(earliest).toISOString(),currentSubmissionAdvanceMinutes:scope?.submissionAdvanceMinutes??null,currentCompletionAdvanceMinutes:scope?.completionAdvanceMinutes??null,recordedCompletionDeadline:r?.completion_deadline?String(r.completion_deadline):null});
 }
 const config=bindWorkspaceNotificationConfig(readNotificationConfig(process.env),s.facts.workspace);
 const notify=(before:ReturnType<typeof requestSnapshot>|undefined,after:ReturnType<typeof requestSnapshot>)=>{
  const shiftId=after.kind==='EXCHANGE'?after.record.sourceShift.id:after.kind==='CALLOUT'?after.record.shiftId:null;
  const live=s.weekState.shifts.find(shift=>shift.sourceShiftId===shiftId);
  const targetShiftId=after.kind==='EXCHANGE'?after.record.targetShift?.id:null;
  const liveTarget=targetShiftId?s.weekState.shifts.find(shift=>shift.sourceShiftId===targetShiftId):null;
  // Historical identity does not confer current location access. Keep that
  // independent live check without relabeling the original request/recipient.
  const recipients=s.weekState.recipients.filter(recipient=>['OWNER','MANAGER'].includes(recipient.role)||(live&&recipient.allowedLocationIds.includes(live.locationId)&&(!liveTarget||recipient.allowedLocationIds.includes(liveTarget.locationId))));
  if(after.kind==='EXCHANGE'&&after.record.status==='OPEN'){const terms=storedTerms(r??{},'source')??source;after={...after,semanticNeedKey:JSON.stringify([terms.shiftId,terms.assignmentEpisodeId,terms.termsRevision])};}
  statements.push(...requestNotificationStatements({before,after,actorEmployeeId:actor.id,recipients,config,observedAt:s.observedAt}));
 };
 // Current assignments authorize applicability. Persisted request terms and
 // participants identify history and personal outcomes after reassignment.
 const storedTerms=(row:GenerationSourceRow,key:'source'|'target'):ShiftTerms|null=>
  (row[key+'_terms']??(row.requester_consent as ConsentSnapshot|null)?.[key]??null) as ShiftTerms|null;
 const requestSource=r?storedTerms(r,'source'):source,requestTarget=r?storedTerms(r,'target'):target;
 const shiftRecord=(terms:ShiftTerms,employeeId=terms.employeeId):ExchangeShift=>({id:terms.shiftId,scheduleId:terms.scheduleId,employeeId,employeeName:'',locationId:terms.locationId,locationName:'',weekStart:terms.weekStart,date:terms.date,startTime:terms.startTime,endTime:terms.endTime,positionId:terms.positionId??undefined,isDesignatedLead:terms.isDesignatedLead});
 const exchangeRecord=(requestId:string,requestStatus:ExchangeRecord['status'],targetId?:string,row=r?.id===requestId?r:null):ExchangeRecord=>{
  const originalSource=row?storedTerms(row,'source'):source,originalTarget=row?storedTerms(row,'target'):target;
  const requesterId=String(row?.requested_by_employee_id??source.employeeId);
  return {id:requestId,requestRevision:Number(row?.request_revision??0)+(row?.status===requestStatus?0:1)||1,kind:(row?.kind??(target?'SWAP':'COVERAGE')) as ExchangeRecord['kind'],status:requestStatus,requestedByEmployeeId:requesterId,requestedByName:'',requestedByRole:s.facts.employees.find(e=>e.id===requesterId)!.role,targetEmployeeId:targetId,sourceShift:shiftRecord(originalSource??source,requesterId),targetShift:originalTarget?shiftRecord(originalTarget):undefined,createdAt:row?String(row.created_at):s.observedAt};
 };
 const calloutRecord=(requestId:string,requestStatus:CalloutRecord['status']):CalloutRecord=>{
  const original=requestSource??source;
  return {id:requestId,requestRevision:Number(r?.request_revision??0)+(r?.status===requestStatus?0:1)||1,shiftId:String(r?.shift_id??original.shiftId),employeeId:String(r?.employee_id??original.employeeId),employeeName:'',locationName:'',locationId:original.locationId,weekStart:original.weekStart,date:original.date,startTime:original.startTime,endTime:original.endTime,reasonCode:c.kind==='SUBMIT_CALLOUT'?c.reasonCode:r?.reason_code as CalloutRecord['reasonCode'],status:requestStatus,createdAt:r?String(r.created_at):s.observedAt};
 };
 const newId=randomUUID();let id='requestId' in c?c.requestId:newId,revision=Number(r?.request_revision??0)+1,status='';let mode:string|undefined,guardDeadline:string|undefined;
 const consent=(employeeId:string):ConsentSnapshot=>({employeeId,consentedAt:s.observedAt,source:materialShiftTerms(source),target:target?materialShiftTerms(target):null});
 let decisionVersions:ReturnType<typeof decisionVersionReferences>|undefined;
 const event=(eventKind:string,kind:'EXCHANGE'|'CALLOUT'=callout?'CALLOUT':'EXCHANGE',eventId=id,eventRevision=revision)=>shiftChangeEvent({workspaceId:w.id,requestId:eventId,revision:eventRevision,kind,event:eventKind,actorId:actor.id,source:requestSource,target:requestTarget,participants:callout?{employeeId:String(r?.employee_id??source.employeeId)}:{requesterEmployeeId:String(r?.requested_by_employee_id??source.employeeId),targetEmployeeId:r?(c.kind==='ACCEPT'?actor.id:r.target_employee_id??null):target?.employeeId??null,...(decisionVersions?{decisionVersions}:{})},mode,reasonCode:callout?String(c.kind==='SUBMIT_CALLOUT'?c.reasonCode:r?.reason_code):undefined,reasonNote:callout?(c.kind==='SUBMIT_CALLOUT'?c.reasonNote:r?.reason_note?String(r.reason_note):undefined):undefined});
 if(c.kind==='SUBMIT_CALLOUT') {
  if(source.employeeId!==actor.id || !published(source)) return unavailable;
  if(source.assignmentEpisodeId!==c.sourceEpisodeId||shiftTermsFingerprint(source)!==c.sourceTermsFingerprint)return blocked('STALE_TERMS','The assignment changed. Your reason is preserved. Refresh and review the current assignment before submitting your inability report.');
  // Absence reporting remains available after trade cutoff and shift start.
  // Reporting inability atomically retires incompatible voluntary participation,
  // including a target-side trade. Completed assignments and current approved
  // absence remain intact; stale linked coverage can be explicitly re-reported.
  // A pending report belongs to the assignment the employee actually reported.
  // A proven owner/material change must not reserve a later assignment forever.
  // Unknown legacy terms are not proof of staleness: leave those for management.
  for (const prior of s.source.shift_callouts.filter(row =>
    row.shift_id === source.shiftId && row.status === 'PENDING' &&
    (row.employee_id !== source.employeeId ||
      (row.legacy_manual === false && row.source_terms && !current(row.source_terms, source))))) {
   statements.push(guardedRequestMutation({
    text: "UPDATE shift_callouts SET status='CANCELLED',outcome_reason='STALE_TERMS' WHERE id=$1 AND request_revision=$2 AND status='PENDING' RETURNING id",
    values: [prior.id, prior.request_revision],
   }));
   statements.push(
    ...cancelNotificationStatements({kind:'CALLOUT',id:String(prior.id),version:`r:${prior.request_revision}`}),
    ...cancelNotificationStatements({kind:'CALLOUT',id:String(prior.id),version:'PENDING'}),
    shiftChangeEvent({
     workspaceId:w.id,requestId:String(prior.id),revision:Number(prior.request_revision)+1,
     kind:'CALLOUT',event:'STALE',actorId:null,mode:'SYSTEM',outcomeReason:'STALE_TERMS',
     source:storedTerms(prior,'source'),participants:{employeeId:String(prior.employee_id)},
     reasonCode:String(prior.reason_code),reasonNote:prior.reason_note?String(prior.reason_note):undefined,
    }),
   );
  }
  for(const stale of s.source.shift_exchanges.filter(x=>['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'].includes(String(x.status))&&((!x.linked_callout_id&&(x.source_shift_id===source.shiftId||x.target_shift_id===source.shiftId))||(x.source_shift_id===source.shiftId&&x.linked_callout_id&&!current(x.source_terms,source))))) {
   statements.push(guardedRequestMutation({text:"UPDATE shift_exchanges SET status='CANCELLED',outcome_reason=$3,resolved_at=clock_timestamp() WHERE id=$1 AND request_revision=$2 RETURNING id",values:[stale.id,stale.request_revision,stale.linked_callout_id?'STALE_TERMS':'PARTICIPANT_UNAVAILABLE']}));
   notify(requestSnapshot('EXCHANGE',exchangeRecord(String(stale.id),stale.status as ExchangeRecord['status'],stale.target_employee_id?String(stale.target_employee_id):undefined,stale)),requestSnapshot('EXCHANGE',exchangeRecord(String(stale.id),'CANCELLED',stale.target_employee_id?String(stale.target_employee_id):undefined,stale)));
   statements.push(shiftChangeEvent({workspaceId:w.id,requestId:String(stale.id),revision:Number(stale.request_revision)+1,kind:'EXCHANGE',event:stale.linked_callout_id?'STALE':'CANCELLED',outcomeReason:stale.linked_callout_id?'STALE_TERMS':'PARTICIPANT_UNAVAILABLE',actorId:actor.id,source:storedTerms(stale,'source'),target:storedTerms(stale,'target'),participants:{requesterEmployeeId:stale.requested_by_employee_id,targetEmployeeId:stale.target_employee_id}}));
  }
  statements.push(guardedRequestMutation({text:`INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,reason_note,legacy_manual,assignment_episode_id,source_terms) VALUES($1,$2,$3,$4,$5,false,$6,$7) RETURNING id`,values:[id,source.shiftId,actor.id,c.reasonCode,c.reasonNote??null,source.assignmentEpisodeId,JSON.stringify(materialShiftTerms(source))]}));status='pending';statements.push(event('CREATED'));notify(undefined,requestSnapshot(callout?'CALLOUT':'EXCHANGE',callout?calloutRecord(id,'PENDING'):exchangeRecord(id,target?'EMPLOYEE_PENDING':'OPEN',target?.employeeId)));
 } else if(callout && 'requestId' in c) {
  if(!r||Number(r.request_revision)!==c.expectedRevision) return conflict;
  if(r.status!=='PENDING') return conflict;
  if(c.kind==='CANCEL_CALLOUT'?actor.id!==r.employee_id:!manager) return unavailable;
  const approved=c.kind==='APPROVE_CALLOUT';
  if(approved&&(!fresh()||r.assignment_episode_id!==source.assignmentEpisodeId))return blocked('STALE_TERMS','Review the current assignment before approving absence.');
  status=approved?'completed':'closed';mode=c.kind==='CANCEL_CALLOUT'?undefined:'MANAGER';
  const linked=approved?randomUUID():null;
  statements.push(guardedRequestMutation({text:`UPDATE shift_callouts SET status=$2,reviewed_by=$3,reviewed_at=clock_timestamp(),reviewed_terms_fingerprint=$4,linked_coverage_request_id=$5 WHERE id=$1 AND request_revision=$6 RETURNING id`,values:[id,approved?'APPROVED':c.kind==='CANCEL_CALLOUT'?'CANCELLED':'DENIED',manager?actor.id:null,approved?shiftTermsFingerprint(source):null,linked,c.expectedRevision]}));
  if(approved) {
   shifts.find(x=>x.sourceShiftId===source.shiftId)!.isCalloutApproved=true;
   statements.push(guardedRequestMutation({text:`INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status,legacy_manual,source_terms,recorded_approval_mode,policy_revision,completion_deadline,linked_callout_id) VALUES($1,'COVERAGE',$2,$3,'OPEN',false,$4,$5,$6,$7,$8) RETURNING id`,values:[linked,source.shiftId,source.employeeId,JSON.stringify(materialShiftTerms(source)),scope?.mode??null,scope?.revision||null,deadline.status==='READY'?deadline.completionDeadline:null,id]}));
   notify(undefined,requestSnapshot('EXCHANGE',exchangeRecord(linked!,'OPEN')));
   statements.push(shiftChangeEvent({workspaceId:w.id,requestId:linked!,revision:1,kind:'EXCHANGE',event:'CREATED',actorId:actor.id,source,participants:{requesterEmployeeId:source.employeeId,calloutId:id},mode:'MANAGER'}));
  }
  notify(requestSnapshot('CALLOUT',calloutRecord(id,'PENDING')),requestSnapshot('CALLOUT',calloutRecord(id,approved?'APPROVED':c.kind==='CANCEL_CALLOUT'?'CANCELLED':'DENIED')));
  statements.push(event(approved?'COMPLETED':c.kind==='CANCEL_CALLOUT'?'CANCELLED':'DECLINED'));
 } else if(c.kind==='OFFER_COVERAGE'||c.kind==='PROPOSE_SWAP') {
  if(source.employeeId!==actor.id||!published(source)||source.assignmentEpisodeId!==c.sourceEpisodeId||shiftTermsFingerprint(source)!==c.sourceTermsFingerprint)return blocked('STALE_TERMS','Review the current source assignment.');
  if(c.kind==='PROPOSE_SWAP'&&(!target||!published(target)||target.assignmentEpisodeId!==c.targetEpisodeId||shiftTermsFingerprint(target)!==c.targetTermsFingerprint))return blocked('STALE_TERMS','Review the current target assignment.');
  if(!scope?.mode||deadline.status!=='READY')return blocked('POLICY_UNKNOWN','Workflow policy needs review.');
  if(!deadline.allowed)return blocked('DEADLINE_PASSED','The submission deadline has passed.');
  if(c.kind==='PROPOSE_SWAP'&&!['EMPLOYEE','LEAD'].includes(s.facts.employees.find(e=>e.id===target?.employeeId)?.role??''))return unavailable;
  if(c.kind==='PROPOSE_SWAP') {const e=evaluateShiftChange(s,c);if(['BLOCKED','UNVERIFIED'].includes(e.decision))return {status:'blocked',issues:e.issues};decisionVersions=decisionVersionReferences(s,e,'swap');}
  guardDeadline=deadline.submissionDeadline;
  const priorRequest=s.source.shift_exchanges.filter(x=>x.source_shift_id===source.shiftId&&x.requested_by_employee_id===actor.id&&x.kind===(target?'SWAP':'COVERAGE')&&['CANCELLED','DENIED','EXPIRED'].includes(String(x.status))&&(x.source_terms as ShiftTerms|null)?.assignmentEpisodeId===source.assignmentEpisodeId).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id))).at(-1);
  statements.push(guardedRequestMutation({text:`INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,target_employee_id,target_shift_id,status,legacy_manual,requester_consent,source_terms,target_terms,recorded_approval_mode,policy_revision,submission_deadline,completion_deadline,prior_request_id) VALUES($1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,values:[id,c.kind==='PROPOSE_SWAP'?'SWAP':'COVERAGE',source.shiftId,actor.id,target?.employeeId??null,target?.shiftId??null,target?'EMPLOYEE_PENDING':'OPEN',JSON.stringify(consent(actor.id)),JSON.stringify(materialShiftTerms(source)),target?JSON.stringify(materialShiftTerms(target)):null,scope.mode,scope.revision,deadline.submissionDeadline,deadline.completionDeadline,priorRequest?.id??null]}));
  status='pending';statements.push(event('CREATED'));notify(undefined,requestSnapshot('EXCHANGE',exchangeRecord(id,target?'EMPLOYEE_PENDING':'OPEN',target?.employeeId)));
 } else if('requestId' in c) {
  if(!s.request||!r)return unavailable;
  if(Number(r.request_revision)!==c.expectedRevision)return conflict;
  // A reviewed callout release supplies authority for the outgoing assignment,
  // independently of voluntary requester consent. Never persist fabricated consent.
  const release=r.linked_callout_id?s.source.shift_callouts.find(x=>x.id===r.linked_callout_id):null;
  const parent=s.facts.schedules.find(x=>x.id===source.scheduleId)!;
  const rawShift=s.source.shifts.find(x=>x.id===source.shiftId)!;
  if(release&&calloutReleasesShift(release,rawShift,parent,w.id,w.timeZone)) s.request.releaseAuthorization={calloutId:String(release.id),reviewedBy:String(release.reviewed_by),source:materialShiftTerms(source)};
  const completing=c.kind==='ACCEPT'||c.kind==='MANAGER_APPROVE';
  if(completing&&!fresh())return blocked('STALE_TERMS','The reviewed assignment changed.');
  const evaluation:ShiftChangeEvaluation=completing?evaluateShiftChange(s,c):{decision:'ELIGIBLE',issues:[],affectedWeeks:[],proposedAssignments:[],scheduledProjections:[]};
  if(completing)decisionVersions=decisionVersionReferences(s,evaluation,s.request.kind==='SWAP'?'swap':'coverage');
  const transition=decideShiftChangeTransition({request:s.request,command:c,actor,evaluation,deadline});
  if(transition.status==='REFUSED')return transition.code==='CONFLICT'?conflict:transition.code==='FORBIDDEN'?unavailable:{status:'blocked',issues:evaluation.issues.length?evaluation.issues:[{code:'CONSENT_REQUIRED',message:'This request cannot proceed with its current consent, policy or deadline.'}]};
  if(transition.status!=='NEXT')return conflict;
  if(completing&&deadline.status==='READY')guardDeadline=deadline.completionDeadline;
  const apply=transition.effects.includes('APPLY_ASSIGNMENTS');
  status=apply?'completed':['APPROVED','DENIED','CANCELLED','EXPIRED'].includes(transition.nextStatus)?'closed':'pending';
  mode=apply?(c.kind==='MANAGER_APPROVE'?'MANAGER':'AUTOMATIC'):undefined;
  const nextTarget=c.kind==='ACCEPT'?actor.id:r.target_employee_id??null;
  statements.push(guardedRequestMutation({text:`UPDATE shift_exchanges SET status=$2,target_employee_id=$3,target_consent=$4,resolved_by=$5,resolved_at=CASE WHEN $6::boolean THEN clock_timestamp() ELSE resolved_at END,outcome_mode=$7 WHERE id=$1 AND request_revision=$8 RETURNING id`,values:[id,transition.nextStatus,nextTarget,transition.effects.includes('RECORD_TARGET_CONSENT')?JSON.stringify(consent(actor.id)):transition.effects.includes('CLEAR_TARGET_CONSENT')?null:r.target_consent?JSON.stringify(r.target_consent):null,manager&&c.kind.startsWith('MANAGER_')?actor.id:null,status!=='pending',mode??null,c.expectedRevision]}));
  if(apply)for(const assignment of evaluation.proposedAssignments) {
   const shift=shifts.find(x=>x.sourceShiftId===assignment.shiftId)!;
   shift.employeeId=assignment.employeeId;shift.assignmentOrigin='MANAGER';shift.generatedClaims=null;shift.isCalloutApproved=false;
   statements.push(guardedRequestMutation({text:"UPDATE shifts SET employee_id=$2,assignment_origin='MANAGER',generated_claims=NULL,updated_at=clock_timestamp() WHERE id=$1 RETURNING id",values:[assignment.shiftId,assignment.employeeId]}));
  }
  notify(requestSnapshot('EXCHANGE',exchangeRecord(id,s.request.status,s.request.targetEmployeeId??undefined)),requestSnapshot('EXCHANGE',exchangeRecord(id,transition.nextStatus,nextTarget==null?undefined:String(nextTarget))));
  statements.push(event(apply?'COMPLETED':status==='pending'?'CONSENT':transition.nextStatus==='DENIED'?'DECLINED':'CANCELLED'));
 } else return unavailable;
 return {result:{status:status as 'completed'|'pending'|'closed',operationId:c.operationId,requestId:id,revision},statements,afterShifts:shifts,deadline:guardDeadline,requestId:id,sourceType:callout?'CALLOUT':'EXCHANGE'};
}
export async function executeShiftChange(proof:SessionMutationProof,command:ShiftChangeCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<ShiftChangeResult> {
 if(!proof?.employee?.id||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash)||!isShiftChangeCommand(command))return unavailable;
 let originalAuthority:string|undefined;
 for(let attempt=0;attempt<3;attempt++) {
  let transactionStarted=false;
  try {
   const s=await readShiftChangeSnapshot(proof,command,executor);
   if(s.operational){if(originalAuthority!==undefined&&originalAuthority!==s.operational.authority)return unavailable;originalAuthority=s.operational.authority;}
   const op=s.source.shift_change_operations.find(o=>o.actor_employee_id===proof.employee.id&&o.operation_id===command.operationId&&o.workspace_id===s.facts.workspace.id);
   if(op)return op.command_fingerprint===fingerprint(command)?op.result as ShiftChangeResult:conflict;
   const plan=planCommand(s,command);
   if(!('statements' in plan))return plan;
   const relevantShiftIds=new Set(['sourceShiftId' in command?command.sourceShiftId:s.requestRow?.source_shift_id??s.requestRow?.shift_id,'targetShiftId' in command?command.targetShiftId:s.requestRow?.target_shift_id]);
   const weeks=[...new Set(s.ledger.filter(t=>relevantShiftIds.has(t.shiftId)).map(t=>t.weekStart))];
   const weekState={...s.weekState,schedules:s.weekState.schedules.filter(x=>weeks.includes(x.weekStart)),shifts:s.weekState.shifts.filter(x=>weeks.includes(x.weekStart)),revisions:s.weekState.revisions.filter(x=>weeks.includes(x.weekStart)),acknowledgements:s.weekState.acknowledgements.filter(x=>weeks.includes(x.weekStart))};
   const afterShifts=plan.afterShifts.filter(x=>weeks.includes(x.weekStart));
   const revisionWeekStarts=[...new Set(afterShifts.filter(x=>{const before=weekState.shifts.find(b=>b.sourceShiftId===x.sourceShiftId);return before?.employeeId!==x.employeeId||before?.isCalloutApproved!==x.isCalloutApproved;}).map(x=>x.weekStart))];
   const prepared=preparePublishedWeekChange({suppressPublicationEventEmployeeIds:plan.statements.filter(statement=>statement.text.startsWith('INSERT INTO notifications')&&statement.values[12]==='EVENT').map(statement=>String(statement.values[1])),weekStarts:weeks,actorEmployeeId:proof.employee.id,sourceType:plan.sourceType,sourceId:plan.requestId,revisionWeekStarts,state:weekState,batch:{statements:plan.statements,afterSchedules:weekState.schedules,afterShifts},config:bindWorkspaceNotificationConfig(readNotificationConfig(process.env),s.facts.workspace),observedAt:s.observedAt});
   const guardWeeks=[...new Set([...weeks,...s.ledger.flatMap(t=>affectedWorkweeks(shiftPeriod(t)))])];
   const guards=generationMutationGuards(s.source,guardWeeks);
   transactionStarted=true;
   await executor.transaction([...guards.slice(0,-1),{text:'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 FOR SHARE',values:[proof.sessionTokenHash]},shiftChangeSessionGuard(proof,plan.deadline),...shiftChangeCompanyStatements(proof,s.operational),guards.at(-1)!,...prepared.statements,shiftChangeAfterGuard(s,plan.afterShifts),
    {text:'INSERT INTO shift_change_operations(workspace_id,actor_employee_id,operation_id,command_fingerprint,request_id,result) VALUES($1,$2,$3,$4,$5,$6)',values:[s.facts.workspace.id,proof.employee.id,command.operationId,fingerprint(command),plan.requestId,JSON.stringify(plan.result)]},shiftChangeSessionGuard(proof,plan.deadline),...shiftChangeCompanyStatements(proof,s.operational)]);
   await shiftChangeCompanyFence(proof,s.operational,executor);
   return plan.result;
  } catch(error) {
   const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
   const message=error instanceof Error?error.message:'';
   if(isShiftChangeAuthorizationError(error))return unavailable;
   if(message.includes('shift_change_deadline'))return blocked('DEADLINE_PASSED','The completion deadline has passed.');
   if(code==='23505')return conflict;
   const retry=code==='40001'||code==='40P01'||code==='22P02'&&/generation_source_conflict|schedule_week_version_conflict|workspace_version_conflict|request_transition_conflict|shift_change_after_conflict/.test(message);
   if(retry) {if(attempt<2)continue;return conflict;}
   if(code==='55P03')return conflict;
   // A lost HTTP response can follow COMMIT. Only the actor-scoped stored result
   // determines success; callers retry exactly the same operation and inputs.
   if(!code||code==='57014'||/^(ECONN|ETIMEDOUT|UND_ERR|FETCH)/.test(code))return transactionStarted?{status:'outcome-unknown',operationId:command.operationId}:unavailable;
   throw error;
  }
 }
 return conflict;
}
import { isShiftChangeCommand } from '../shift-changes/command-parser';

/** Read-only UI availability uses the same command plan as final guarded writes.
 * Return a finite safe projection, never the private snapshot or SQL statements. */
/** reasons and refusal are additive: older callers read allowed and notice only. */
export type ShiftChangeAvailability={allowed:boolean;notice:string|null;reasons?:EligibilityReason[];refusal?:'rules'|'review'|'stale'|'other'};
export async function readShiftChangeAvailability(proof:SessionMutationProof,command:ShiftChangeCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<ShiftChangeAvailability> {
 try {
  const snapshot=await readShiftChangeSnapshot(proof,command,executor);
  const plan=planCommand(snapshot,command),result='result' in plan?plan.result:plan;
  if(['completed','pending','closed'].includes(result.status)){
   const reasons:string[]=[];
   if(command.kind==='MANAGER_APPROVE'&&['OWNER','MANAGER'].includes(snapshot.actor.employee.role)) {
    const evaluation=evaluateShiftChange(snapshot,command);
    if(evaluation.issues.some(issue=>issue.code==='PROJECTED_OVERTIME_REVIEW'))reasons.push('Projected scheduled overtime needs manager review.');
    const current=snapshot.policy?.[snapshot.request?.kind==='SWAP'?'swap':'coverage'];
    if(current?.mode==='MANAGER_REVIEW')reasons.push('Current workflow policy requires manager review.');
    else if(snapshot.request?.recordedApprovalMode==='MANAGER_REVIEW')reasons.push('This request was submitted under manager review.');
   }
   return {allowed:true,notice:reasons.length?reasons.join(' '):null};
  }
  const scope=snapshot.policy?.[snapshot.request?.kind==='SWAP'||command.kind==='PROPOSE_SWAP'?'swap':'coverage'];
  const unknown=!scope?.mode||scope.submissionAdvanceMinutes===null||scope.completionAdvanceMinutes===null||result.status==='blocked'&&result.issues.some(i=>['RULE_UNVERIFIABLE','POLICY_UNKNOWN'].includes(i.code));
  const stale=result.status==='conflict'||result.status==='blocked'&&result.issues.some(i=>i.code==='STALE_TERMS');
  // An expired window is not a changed shift: reloading cannot reopen it (Codex F4).
  const late=result.status==='blocked'&&result.issues.some(i=>i.code==='DEADLINE_PASSED');
  // B3: name the rules that refused it, in plain words; the rules themselves are unchanged.
  // A rule that blocks is named even when other rules still need the Owner's review.
  // Reasons are worded for the person claiming ("You already work then"), so only a claim gets them;
  // a manager approving someone else's claim keeps the general notices.
  const reasons=stale||late||command.kind!=='ACCEPT'?[]:eligibilityReasons([...(result.status==='blocked'?result.issues:[]),...(unknown?[{code:'POLICY_UNKNOWN' as const}]:[])]);
  if(reasons.some(r=>r!=='unconfirmed'))return {allowed:false,notice:reasons.map(r=>REASON_TEXT[r]).join('. ')+'.',reasons,refusal:'rules'};
  return {allowed:false,notice:unknown?'Needs Owner rule review':late?'The deadline for changes to this shift has passed.':stale?'This shift changed. Reload to see the latest.':'Not available under the current rules.',refusal:unknown?'review':late?'other':stale?'stale':'other'};
 }catch(error){if(isShiftChangeAuthorizationError(error))return {allowed:false,notice:'Unavailable for your current account.'};throw error;}
}
