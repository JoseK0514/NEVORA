import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {AttentionItem,EmployeeHomeRead,HomeSource,SourceObservation} from '../employee-home/types';
import {homeDestination,projectEmployeeHome} from '../employee-home/project';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {employeeAllowedLocationsSql} from './employee-schedule';
import {managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import {readEmployeePublishedAssignments} from './employee-published-assignments.server';
import {readEmployeeWeeklyReview} from './employee-weekly-review.server';
import {attentionSourceVersion} from './employee-attention-receipts.server';
import {readEmployeeTime} from './employee-time.server';
import {getExchange} from './exchanges';
import {readShiftChangeAvailability} from './shift-changes';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Public, domain-separated lifetime binding; never a cookie/session proof. */
export function homeAuthority(proof:SessionMutationProof):string{return hash(['nevora:employee-home:lifetime:v1',proof.employee.id,proof.sessionTokenHash]);}
const CAP=100;
type IndexRow={id:string;changedAt:string;version?:string;detail?:Record<string,unknown>;read?:boolean};
type Section={observation:SourceObservation;items:AttentionItem[]};
type Authority={observedAt:string;expiresAt:string;locations:string[]};
const denied:EmployeeHomeRead={state:'unauthorized',reason:'access_denied'};
const unavailable:EmployeeHomeRead={state:'unavailable',reason:'read_failed'};

/** Each index has an explicit cap sentinel and a canonical destination exposing
 * the remaining records. A cap is partial, never a complete empty observation. */
function indexStatement(source:HomeSource,workspaceId:string,employeeId:string):SqlStatement{
 const values=[workspaceId,employeeId];
 const allowed=`WITH allowed AS MATERIALIZED (${employeeAllowedLocationsSql()})`;
 if(source==='acknowledgements')return {values,text:`/* home_acknowledgements */ ${allowed}, latest AS (
  SELECT DISTINCT ON (week_start) id,week_start,created_at FROM schedule_publication_revisions ORDER BY week_start,revision_number DESC)
  SELECT r.week_start::text AS id,r.id AS version,r.created_at::text AS "changedAt",
   (SELECT publication_revision_id FROM schedule_acknowledgements WHERE employee_id=$2 AND week_start=r.week_start) AS ack,
   EXISTS(SELECT 1 FROM employee_attention_receipts WHERE workspace_id=$1 AND employee_id=$2 AND source_kind='SCHEDULE' AND source_id=r.week_start::text AND source_version=r.id) AS read
  FROM latest r WHERE EXISTS(SELECT 1 FROM schedule_publication_revision_shifts rs JOIN allowed l ON l.id=rs.location_id
   WHERE rs.revision_id=r.id AND rs.employee_id=$2)
  ORDER BY r.week_start DESC LIMIT ${CAP+1}`};
 if(source==='timeOff')return {values,text:`/* home_timeOff */ SELECT id,COALESCE(reviewed_at,created_at)::text AS "changedAt",
  jsonb_build_object('id',id,'status',status,'startDate',start_date::text,'endDate',end_date::text,'startTime',start_time::text,'endTime',end_time::text,'reason',reason) AS detail
  FROM time_off_requests WHERE employee_id=$2 AND EXISTS(SELECT 1 FROM workspaces WHERE id=$1 AND active)
  ORDER BY COALESCE(reviewed_at,created_at) DESC,id LIMIT ${CAP+1}`};
 if(source==='ownTime')return {values,text:`/* home_ownTime */ ${allowed} SELECT r.id::text AS id,e.occurred_at::text AS "changedAt",
  jsonb_build_object('id',r.id::text,'revision',e.revision,'status',e.event_kind) AS detail
  FROM time_correction_requests r JOIN allowed l ON l.id=r.location_id JOIN LATERAL
   (SELECT revision,event_kind,occurred_at FROM time_correction_events WHERE request_id=r.id ORDER BY revision DESC LIMIT 1)e ON true
  WHERE r.workspace_id=$1 AND r.employee_id=$2 ORDER BY e.occurred_at DESC,r.id LIMIT ${CAP+1}`};
 if(source==='exchanges')return {values,text:`/* home_exchanges */ ${allowed} SELECT x.id,x.request_revision::text AS version,x.created_at::text AS "changedAt",
  jsonb_build_object('status',x.status,'sourceTerms',x.source_terms,'targetTerms',x.target_terms,'deadline',x.completion_deadline,
   'policy',(SELECT shift_change_policy FROM workspaces WHERE id=$1),'sourceRevision',sh.terms_revision,'sourceEpisode',sh.assignment_episode_id,
   'targetRevision',target.terms_revision,'targetEpisode',target.assignment_episode_id,'legacy',x.legacy_manual) AS detail
  FROM shift_exchanges x JOIN shifts sh ON sh.id=x.source_shift_id JOIN schedules s ON s.id=sh.schedule_id JOIN allowed l ON l.id=s.location_id
  LEFT JOIN shifts target ON target.id=x.target_shift_id
  WHERE ($2 IN(x.requested_by_employee_id,x.target_employee_id) OR (x.kind='COVERAGE' AND x.status='OPEN' AND s.status='PUBLISHED'))
  ORDER BY x.created_at DESC,x.id LIMIT ${CAP+1}`};
 throw Error('Unknown Home index');
}

/** Sources fail independently; authority does not. Every protected batch checks
 * actual SQL authority after waits. A final exact eligible-location comparison
 * invalidates the whole aggregate, including earlier successfully read sections. */
export async function readEmployeeHome(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeHomeRead>{
 try{assertEmployeeViewProof(proof);}catch{return denied;}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal);
  const guards=()=>[...employeeReadLimits,...employeeViewGuards(proof,workspace)];
  const session=()=>managementSessionStatements(proof,proof.employee.id,[proof.employee.role]);
  const protectedExecutor:SqlExecutor={
   query:async<T>(statement:SqlStatement)=>{const prefix=guards();const result=await executor.transaction([...prefix,statement,...session()],signal);return result[prefix.length] as T[];},
   transaction:async(statements)=>{const prefix=employeeReadLimits;const result=await executor.transaction([...prefix,...statements,...session()],signal);return result.slice(prefix.length,prefix.length+statements.length);},
  };
  const authorityStatement:SqlStatement={text:`/* home_authority */ SELECT to_jsonb(clock_timestamp()) AS "observedAt",s.expires_at::text AS "expiresAt",
   ARRAY(SELECT id FROM (${employeeAllowedLocationsSql('$3','$2')}) allowed ORDER BY id) AS locations
   FROM employee_sessions s WHERE s.token_hash=$1 AND s.employee_id=$2`,values:[proof.sessionTokenHash,proof.employee.id,workspace.id]};
  const authority=async()=>{
   const row=(await protectedExecutor.query<Authority>(authorityStatement))[0];
   if(!row||!Number.isFinite(Date.parse(row.observedAt))||!Number.isFinite(Date.parse(row.expiresAt))||!Array.isArray(row.locations)||!row.locations.length)throw Error('Home authority unavailable');
   return row;
  };
  const before=await authority();
  const observation=(state:SourceObservation['state'],reason:string|null,version:string|null=hash([])):SourceObservation=>({state,reason,version,observedAt:before.observedAt});
  const failed=():Section=>({observation:observation('unavailable','read_failed',null),items:[]});
  const readReceipts=async(kind:string)=>new Set((await protectedExecutor.query<{id:string;version:string}>({text:`SELECT source_id AS id,source_version AS version FROM employee_attention_receipts WHERE workspace_id=$1 AND employee_id=$2 AND source_kind=$3`,values:[workspace.id,proof.employee.id,kind]})).map(r=>JSON.stringify([r.id,r.version])));
  async function section(source:'acknowledgements'|'timeOff'|'exchanges'|'ownTime'):Promise<Section>{
   try{
    const statement=indexStatement(source,workspace.id,proof.employee.id),rows=await protectedExecutor.query<IndexRow>(statement),items:AttentionItem[]=[];
    let partial=rows.length>CAP;
    const refs=source==='timeOff'||source==='ownTime'?await readReceipts(source==='timeOff'?'TIME_OFF':'TIME_CORRECTION'):null;
    for(const row of rows.slice(0,CAP)){
     if(!row.id||!Number.isFinite(Date.parse(row.changedAt)))throw Error('Invalid source');
     if(source==='acknowledgements'){
      const review=await readEmployeeWeeklyReview(proof,row.id,protectedExecutor);
      if(review.state==='unavailable'||review.displayedRevisionId!==row.version)throw Error('Weekly source unavailable');
      if(review.state==='unpublished')partial=true;
      if(!review.shifts.length)continue;
      const required=review.acknowledgement.needsAcknowledgement;
      // Weekly confirmation is canonical; receipts cannot resolve it.
      if(required){const ref={kind:'SCHEDULE' as const,id:row.id,version:row.version!};items.push({ref,label:required?(review.publicationChanges.length?'Schedule updated — review required':'Review schedule'):'Schedule updated',href:homeDestination(ref)!,required,actionable:required,deadlineAt:null,changedAt:row.changedAt});}
     }else if(source==='exchanges'){
      const exchange=await getExchange(row.id,protectedExecutor);if(!exchange||String(exchange.requestRevision)!==row.version)throw Error('Exchange changed');
      const participant=[exchange.requestedByEmployeeId,exchange.targetEmployeeId].includes(proof.employee.id);
      const terminal=['APPROVED','DENIED','CANCELLED','EXPIRED'].includes(exchange.status);
      if(terminal){
       // Effective expiry has no new canonical receipt version: omit expired
       // live offers, rather than let a read receipt resolve a live operation.
       if(!participant||exchange.status==='EXPIRED')continue;
       const ref={kind:'EXCHANGE' as const,id:row.id,version:`r:${row.version}`};
       const seen=await readReceipts('EXCHANGE');if(seen.has(JSON.stringify([ref.id,ref.version])))continue;
       items.push({ref,label:`${exchange.kind==='SWAP'?'Swap':'Coverage'} ${exchange.status.toLowerCase()}`,href:homeDestination(ref,'history')!,required:false,actionable:false,deadlineAt:null,changedAt:row.changedAt});continue;
      }
      if(row.detail?.legacy){partial=true;continue;}
      const responds=exchange.status==='OPEN'&&exchange.requestedByEmployeeId!==proof.employee.id||exchange.status==='EMPLOYEE_PENDING'&&exchange.targetEmployeeId===proof.employee.id;
      const allowed=responds&&exchange.actionable?await readShiftChangeAvailability(proof,{kind:'ACCEPT',operationId:randomUUID(),requestId:row.id,expectedRevision:exchange.requestRevision!},protectedExecutor):{allowed:false,notice:null};
      if(!participant&&!allowed.allowed)continue;
      const ref={kind:'EXCHANGE' as const,id:row.id,version:`r:${row.version}`};
      if(!exchange.actionable&&exchange.attention==='CONFIGURATION_REQUIRED')partial=true;
      items.push({ref,label:allowed.allowed?(exchange.kind==='SWAP'?'Review swap request':'Review coverage offer'):exchange.status==='MANAGER_PENDING'?'Shift request awaiting manager review':'Shift request pending',href:homeDestination(ref,participant?'requests':'available')!,required:false,actionable:allowed.allowed,deadlineAt:allowed.allowed?exchange.effectiveCompletionDeadline??null:null,changedAt:row.changedAt});
     }else{
      const kind=source==='timeOff'?'TIME_OFF':'TIME_CORRECTION',detail=row.detail;
      if(!detail||!(source==='timeOff'?['PENDING','APPROVED','DENIED','CANCELLED']:['REQUESTED','APPROVED','REJECTED']).includes(String(detail.status)))throw Error('Unknown status');
      const ref:AttentionItem['ref']={kind,id:row.id,version:attentionSourceVersion({kind,id:row.id,version:''},detail)};
      if(refs?.has(JSON.stringify([ref.id,ref.version])))continue;
      items.push({ref,label:`${source==='timeOff'?'Time off':'Time correction'} ${String(detail.status).toLowerCase()}`,href:homeDestination(ref)!,required:false,actionable:false,deadlineAt:null,changedAt:row.changedAt});
     }
    }
    if(source==='ownTime'){
     const time=await readEmployeeTime(proof,protectedExecutor);if(time.state!=='ready')throw Error('Own time unavailable');
    }
    // Reject an index that changed while its canonical details were awaited.
    if(hash(await protectedExecutor.query<IndexRow>(statement))!==hash(rows))return {observation:observation('unavailable','source_changed',null),items:[]};
    return {observation:observation(partial?'partial':'complete',partial?(rows.length>CAP?'source_cap':'unknown_source'):null,hash(rows)),items};
   }catch{return failed();}
  }
  const [acknowledgements,exchanges,timeOff,ownTime]=await Promise.all([section('acknowledgements'),section('exchanges'),section('timeOff'),section('ownTime')]);
  // Assignment producer preserves its actual null metadata on unavailable.
  const assignments=await readEmployeePublishedAssignments(proof,protectedExecutor);
  const after=await authority();
  if(JSON.stringify(before.locations)!==JSON.stringify(after.locations))return denied;
  const validForMs=Math.min(45000,Date.parse(after.expiresAt)-Date.parse(after.observedAt),45000-(Date.parse(after.observedAt)-Date.parse(before.observedAt)));
  if(validForMs<=0)return unavailable;
  const sources={schedule:assignments.publicationState==='unavailable'?observation('unavailable','read_failed',null):{...observation(assignments.publicationState,assignments.publicationState==='partial'?'unpublished':null,hash(assignments)),observedAt:assignments.observedAt},acknowledgements:acknowledgements.observation,exchanges:exchanges.observation,timeOff:timeOff.observation,ownTime:ownTime.observation,communications:observation('partial','integration_pending',null)};
  return projectEmployeeHome({observedAt:after.observedAt,authority:homeAuthority(proof),timeZone:workspace.timeZone,validForMs,sources,publicationState:assignments.publicationState,nextShift:assignments.nextShift,currentShift:assignments.currentShift,attention:[...acknowledgements.items,...exchanges.items,...timeOff.items,...ownTime.items]});
 }catch(error){return isManagementAuthorizationError(error)?denied:unavailable;}
}
