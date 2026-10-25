import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {AttentionItem,EmployeeHomeRead,HomeSource,SourceObservation} from '../employee-home/types';
import {isValidIsoDate} from '../date-utils';
import {homeDestination,projectEmployeeHome} from '../employee-home/project';
import {assertEmployeeViewProof,employeeReadLimits,employeeSessionCheck,employeeSnapshotGuards,employeeSnapshotLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {employeeAllowedLocationsSql} from './employee-schedule';
import {managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import {readEmployeePublishedAssignments} from './employee-published-assignments.server';
import {readEmployeeWeeklyReview} from './employee-weekly-review.server';
import {attentionSourceVersion} from './employee-attention-receipts.server';
import {readEmployeeTime} from './employee-time.server';
import {getExchange} from './exchanges';
import {readShiftChangeAvailability} from './shift-changes';
import {listEmployeeCommunications} from '../communications/service.server';
import {readActivePresentation} from '../workspace-presentation/service';
import {isReadSnapshot} from './read-snapshot';
import {communicationRecipientAllowedSql} from '../communications/sql';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Public, domain-separated lifetime binding; never a cookie/session proof. */
export function homeAuthority(proof:SessionMutationProof):string{return hash(['nevora:employee-home:lifetime:v1',proof.employee.id,proof.sessionTokenHash]);}
const CAP=100;
function timeOffPeriod(detail:Record<string,unknown>):string{
 const start=String(detail.startDate),end=String(detail.endDate);
 if(!isValidIsoDate(start)||!isValidIsoDate(end)||end<start)throw Error('Invalid request period');
 // These are calendar dates; UTC formatting preserves them in every workspace zone.
 const format=(day:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${day}T12:00:00Z`));
 return start===end?format(start):`${format(start)} – ${format(end)}`;
}
type IndexRow={id:string;changedAt:string;version?:string;detail?:Record<string,unknown>;read?:boolean};
type Section={observation:SourceObservation;items:AttentionItem[]};
type Authority={observedAt:string;expiresAt:string;locations:string[]};
type CommunicationIndex={id:string;revision:string;contentHash:string;expiresAt:string|null;allowed:boolean;acknowledged:string|null;read:string|null};
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
  FROM latest r WHERE EXISTS(
   SELECT 1 FROM schedule_publication_revision_shifts rs
   JOIN schedule_publication_revisions prior ON prior.id=rs.revision_id
   JOIN allowed l ON l.id=rs.location_id
   WHERE prior.week_start=r.week_start AND rs.employee_id=$2)
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
 if(source==='exchanges')return {values,text:`/* home_exchanges */ ${allowed} SELECT x.id,x.request_revision::text AS version,GREATEST(x.created_at,x.resolved_at,(SELECT max(e.created_at) FROM shift_change_events e WHERE e.workspace_id=$1 AND e.request_kind='EXCHANGE' AND e.request_id=x.id))::text AS "changedAt",
  jsonb_build_object('status',x.status,'sourceTerms',x.source_terms,'targetTerms',x.target_terms,'deadline',x.completion_deadline,
   'policy',(SELECT shift_change_policy FROM workspaces WHERE id=$1),'sourceRevision',sh.terms_revision,'sourceEpisode',sh.assignment_episode_id,
   'targetRevision',target.terms_revision,'targetEpisode',target.assignment_episode_id,'legacy',x.legacy_manual) AS detail
  FROM shift_exchanges x JOIN shifts sh ON sh.id=x.source_shift_id JOIN schedules s ON s.id=sh.schedule_id JOIN allowed l ON l.id=s.location_id
  LEFT JOIN shifts target ON target.id=x.target_shift_id
  WHERE ($2 IN(x.requested_by_employee_id,x.target_employee_id) OR (x.kind='COVERAGE' AND x.status='OPEN' AND s.status='PUBLISHED'))
  ORDER BY "changedAt" DESC,x.id LIMIT ${CAP+1}`};
 throw Error('Unknown Home index');
}

/** Sources fail independently; authority does not. Every protected batch checks
 * actual SQL authority after waits. A final exact eligible-location comparison
 * invalidates the whole aggregate, including earlier successfully read sections. */
export async function readEmployeeHome(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeHomeRead>{
 try{assertEmployeeViewProof(proof);}catch{return denied;}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal);
  // Inspection B3/B4: Home's own reads are READ ONLY snapshots with lock-free guards, so Home never blocks a sign-in,
  // a shift edit or a publish, and never waits behind one. Each batch still checks the session, role and eligible
  // locations in the same snapshot as its data. Nested readers keep their own transactions (protectedExecutor
  // .transaction below adds only the time bounds and the trailing session check).
  const guards=()=>[...employeeSnapshotLimits,...employeeSnapshotGuards(proof,workspace)];
  const session=()=>[employeeSessionCheck(proof)];
  const lockedSession=()=>managementSessionStatements(proof,proof.employee.id,[proof.employee.role]);
  const indexes=new Map<HomeSource,{statement:SqlStatement;rows:unknown[]}>();
  const receipts=new Map<string,{statement:SqlStatement;rows:unknown[]}>();
  let assignmentIndex:{statement:SqlStatement;rows:unknown[]}|undefined;
  const assignmentFingerprint=(rows:unknown[])=>hash(rows.map(row=>{const {observedAt:_at,...facts}=row as Record<string,unknown>;void _at;return facts;}));
  const protectedExecutor:SqlExecutor={
   query:async<T>(statement:SqlStatement)=>{const prefix=guards();const result=await executor.transaction([...prefix,statement,...session()],signal);return result[prefix.length] as T[];},
   transaction:async(statements)=>{const prefix=employeeReadLimits;const result=await executor.transaction([...prefix,...statements,...(isReadSnapshot(statements)?session():lockedSession())],signal);const rows=result.slice(prefix.length,prefix.length+statements.length);
    const at=statements.findIndex(s=>s.text.includes('WITH clock AS MATERIALIZED')&&s.text.includes('"coverageComplete"'));
    if(at>=0)assignmentIndex={statement:statements[at],rows:rows[at]};return rows;},
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
  const readReceipts=async(kind:string)=>{const statement:SqlStatement={text:`/* home_receipts */ SELECT source_id AS id,source_version AS version FROM employee_attention_receipts WHERE workspace_id=$1 AND employee_id=$2 AND source_kind=$3 ORDER BY source_id,source_version`,values:[workspace.id,proof.employee.id,kind]};
   const rows=await protectedExecutor.query<{id:string;version:string}>(statement);receipts.set(kind,{statement,rows});return new Set(rows.map(r=>JSON.stringify([r.id,r.version])));};
  async function section(source:'acknowledgements'|'timeOff'|'exchanges'|'ownTime'):Promise<Section>{
   try{
    const statement=indexStatement(source,workspace.id,proof.employee.id),rows=await protectedExecutor.query<IndexRow>(statement),items:AttentionItem[]=[];
    let partial=rows.length>CAP,reviewUnavailable=false,unpublished=false;
    const refs=source==='timeOff'||source==='ownTime'?await readReceipts(source==='timeOff'?'TIME_OFF':'TIME_CORRECTION'):null;
    for(const row of rows.slice(0,CAP)){
     if(!row.id||!Number.isFinite(Date.parse(row.changedAt)))throw Error('Invalid source');
     if(source==='acknowledgements'){
      const review=await readEmployeeWeeklyReview(proof,row.id,protectedExecutor);
      if(review.state==='unavailable'||review.displayedRevisionId!==row.version)throw Error('Weekly source unavailable');
      if(review.state==='unpublished'){partial=true;unpublished=true;}
      const required=review.acknowledgement.needsAcknowledgement;
      if(!review.shifts.length){
       // Prior own relevance can include a removal. Preserve this exact week's
       // current confirmation intent, and keep missing authority visibly partial.
       // Resolved/equivalent empty states follow canonical acknowledgement.
       if(required){const ref={kind:'SCHEDULE' as const,id:row.id,version:row.version!};const actionable=!!review.intent;if(!actionable){partial=true;reviewUnavailable=true;}items.push({ref,label:actionable?'Schedule removed — review required':'Schedule removed — review unavailable',href:homeDestination(ref)!,required:true,actionable,deadlineAt:null,changedAt:row.changedAt});}
       continue;
      }
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
       items.push({ref,label:`${exchange.kind==='SWAP'?'Swap':'Coverage'} ${exchange.status==='DENIED'?'declined':exchange.status==='CANCELLED'?'withdrawn':exchange.status.toLowerCase()}`,href:homeDestination(ref,'history')!,required:false,actionable:false,deadlineAt:null,changedAt:row.changedAt});continue;
      }
      if(row.detail?.legacy){partial=true;continue;}
      const responds=exchange.status==='OPEN'&&exchange.requestedByEmployeeId!==proof.employee.id||exchange.status==='EMPLOYEE_PENDING'&&exchange.targetEmployeeId===proof.employee.id;
      const allowed=responds&&exchange.actionable?await readShiftChangeAvailability(proof,{kind:'ACCEPT',operationId:randomUUID(),requestId:row.id,expectedRevision:exchange.requestRevision!},protectedExecutor):{allowed:false,notice:null};
      if(!exchange.actionable&&exchange.attention==='CONFIGURATION_REQUIRED'||'refusal' in allowed&&(allowed.refusal==='review'||!!allowed.reasons?.includes('unconfirmed')))partial=true;
      if(!participant&&!allowed.allowed)continue;
      const ref={kind:'EXCHANGE' as const,id:row.id,version:`r:${row.version}`};
      items.push({ref,label:allowed.allowed?(exchange.kind==='SWAP'?'Review swap request':'Review coverage offer'):exchange.status==='MANAGER_PENDING'?'Shift request awaiting manager review':'Shift request waiting',href:homeDestination(ref,participant?'requests':'available')!,required:false,actionable:allowed.allowed,deadlineAt:allowed.allowed?exchange.effectiveCompletionDeadline??null:null,changedAt:row.changedAt});
     }else{
      const kind=source==='timeOff'?'TIME_OFF':'TIME_CORRECTION',detail=row.detail;
      if(!detail||!(source==='timeOff'?['PENDING','APPROVED','DENIED','CANCELLED']:['REQUESTED','APPROVED','REJECTED']).includes(String(detail.status)))throw Error('Unknown status');
      const ref:AttentionItem['ref']={kind,id:row.id,version:attentionSourceVersion({kind,id:row.id,version:''},detail)};
      if(refs?.has(JSON.stringify([ref.id,ref.version])))continue;
      items.push({ref,label:`${source==='timeOff'?'Time off':'Time correction'} ${({PENDING:'waiting',REQUESTED:'requested',APPROVED:'approved',DENIED:'declined',REJECTED:'declined',CANCELLED:'withdrawn'} as Record<string,string>)[String(detail.status)]}${source==='timeOff'?` · ${timeOffPeriod(detail)}`:''}`,href:homeDestination(ref)!,required:false,actionable:false,deadlineAt:null,changedAt:row.changedAt});
     }
    }
    if(source==='ownTime'){
     const time=await readEmployeeTime(proof,protectedExecutor);if(time.state!=='ready')throw Error('Own time unavailable');
    }
    // Reject an index that changed while its canonical details were awaited.
    if(hash(await protectedExecutor.query<IndexRow>(statement))!==hash(rows))return {observation:observation('unavailable','source_changed',null),items:[]};
    indexes.set(source,{statement,rows});
    return {observation:observation(partial?'partial':'complete',partial?(reviewUnavailable?'review_unavailable':rows.length>CAP?'source_cap':unpublished?'unpublished':'unknown_source'):null,hash(rows)),items};
   }catch{return failed();}
  }
  const [acknowledgements,exchanges,timeOff,ownTime]=await Promise.all([section('acknowledgements'),section('exchanges'),section('timeOff'),section('ownTime')]);
  // Assignment producer preserves its actual null metadata on unavailable.
  const assignments=await readEmployeePublishedAssignments(proof,protectedExecutor);
  // This metadata observation uses the canonical communication recipient SQL;
  // it is a coherency witness, never a second content/audience producer.
  const communicationIndex:SqlStatement={text:`/* home_communications */ SELECT c.id::text,c.head_revision_id::text AS revision,r.content_hash AS "contentHash",r.expires_at::text AS "expiresAt",
   (r.expires_at IS NULL OR r.expires_at>clock_timestamp()) AND ${communicationRecipientAllowedSql()} AS allowed,
   (SELECT acknowledged_at::text FROM communication_receipts WHERE workspace_id=c.workspace_id AND communication_id=c.id AND revision_id=r.id AND employee_id=$2) AS acknowledged,
   (SELECT read_at::text FROM employee_attention_receipts WHERE workspace_id=c.workspace_id AND source_kind='COMMUNICATION' AND source_id=c.id::text AND source_version=r.id::text AND employee_id=$2) AS read
   FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id WHERE c.workspace_id=$1 AND c.state='PUBLISHED'
   AND (c.author_employee_id=$2 OR EXISTS(SELECT 1 FROM communication_recipients g WHERE g.workspace_id=c.workspace_id AND g.communication_id=c.id AND g.revision_id=r.id AND g.employee_id=$2))
   ORDER BY c.created_at DESC,c.id LIMIT ${CAP+1}`,values:[workspace.id,proof.employee.id]};
  let communicationRows:CommunicationIndex[]|null=null,communicationItems:AttentionItem[]=[],communications=failed().observation;
  try{
   communicationRows=await protectedExecutor.query<CommunicationIndex>(communicationIndex);
   const read=await listEmployeeCommunications(proof,protectedExecutor);
   if(read.state==='complete'||read.state==='partial'){
    const partial=read.state==='partial'||communicationRows.length>CAP;
    communications=observation(partial?'partial':'complete',partial?(communicationRows.length>CAP?'source_cap':'read_failed'):null,hash(communicationRows));
    const visible=read.items.filter(item=>item.state==='ready');
    if(communicationRows.slice(0,CAP).filter(row=>row.allowed).some(row=>!visible.some(item=>item.state==='ready'&&item.id===row.id&&item.revisionId===row.revision)))throw Error('Incomplete communication manifest');
    for(const item of read.items){if(item.state!=='ready')continue;
     const current=communicationRows.find(row=>row.id===item.id&&row.revision===item.revisionId&&row.contentHash===item.contentHash&&row.allowed);
     if(!current||Date.parse(current.acknowledged??'')!==Date.parse(item.ownAcknowledgedAt??'')&&current.acknowledged!==item.ownAcknowledgedAt||Date.parse(current.read??'')!==Date.parse(item.ownReadAt??'')&&current.read!==item.ownReadAt)throw Error('Communication source changed');
     const required=item.acknowledgement==='REQUIRED';
     if(required?!!item.ownAcknowledgedAt:!!(item.ownReadAt||item.ownAcknowledgedAt))continue;
     const ref={kind:'COMMUNICATION' as const,id:item.id,version:item.revisionId},href=homeDestination(ref);if(!href)throw Error('Invalid communication destination');
     communicationItems.push({ref,label:`${required?'Review update':'Update'}: ${item.title}`,href,required,actionable:required,deadlineAt:null,changedAt:item.editedAt??item.publishedAt});
    }
   }
  }catch{communications=failed().observation;communicationItems=[];}
  // One final SQL batch re-reads every source's canonical observation in ONE snapshot (REPEATABLE READ READ ONLY,
  // inspection B4; it used to take SHARE locks on up to 22 tables for the same purpose). This includes empty
  // indexes and receipt/grant membership; comparing two separately buffered API responses cannot prove all-clear,
  // but re-reads from one instant can. A writer committing during the batch is not waited for: the result is the
  // same as if the batch had finished a moment earlier, inside the existing 45 s validity window.
  const checks=[...indexes.entries()].map(([source,value])=>({source,...value}));
  const receiptChecks=[...receipts.entries()].map(([kind,value])=>({kind,...value}));
  let after:Authority;
  try{
   const prefix=guards();
   const statements=[...checks.map(c=>c.statement),...receiptChecks.map(c=>c.statement),communicationIndex,...(assignmentIndex?[assignmentIndex.statement]:[]),authorityStatement];
   const result=await executor.transaction([...prefix,...statements,...session()],signal),rows=result.slice(prefix.length,prefix.length+statements.length);
   for(let i=0;i<checks.length;i++)if(hash(rows[i])!==hash(checks[i].rows)){
    const source=checks[i].source;const section={acknowledgements,exchanges,timeOff,ownTime}[source as 'acknowledgements'|'exchanges'|'timeOff'|'ownTime'];section.observation=observation('unavailable','source_changed',null);section.items=[];
   }
   for(let i=0;i<receiptChecks.length;i++)if(hash(rows[checks.length+i])!==hash(receiptChecks[i].rows)){
    const source=receiptChecks[i].kind==='TIME_OFF'?'timeOff':receiptChecks[i].kind==='TIME_CORRECTION'?'ownTime':'exchanges';const section={timeOff,ownTime,exchanges}[source];section.observation=observation('unavailable','source_changed',null);section.items=[];
   }
   const finalCommunicationRows=rows[checks.length+receiptChecks.length] as CommunicationIndex[];
   if(communicationRows===null||hash(finalCommunicationRows)!==hash(communicationRows)){communications=observation('unavailable','source_changed',null);communicationItems=[];}
   after=rows.at(-1)?.[0] as Authority;
   if(!after||!Number.isFinite(Date.parse(after.observedAt)))throw Error('Final observation unavailable');
   if(assignmentIndex&&assignmentFingerprint(rows[checks.length+receiptChecks.length+1])!==assignmentFingerprint(assignmentIndex.rows)){
    assignments.nextShift=null;assignments.currentShift=null;assignments.publicationState='unavailable';
   }
   const expiry=finalCommunicationRows.filter(row=>communicationItems.some(item=>item.ref.id===row.id)&&row.expiresAt).map(row=>row.expiresAt!).sort((a,b)=>Date.parse(a)-Date.parse(b))[0];
   if(expiry)communications={...communications,validUntil:expiry};
  }catch(error){if(isManagementAuthorizationError(error))throw error;after=await authority();communications=observation('unavailable','read_failed',null);communicationItems=[];}
  if(JSON.stringify(before.locations)!==JSON.stringify(after.locations))return denied;
  // Release fence: the reader's own authority rows only (company, employee, locations, eligibility, session), with the
  // locked guards, so a role, session, location or eligibility change already in flight is waited for and honoured
  // before Home is returned. It locks no source table, so sign-ins, shift edits and publishing are not blocked.
  const fenceGuards=[...employeeReadLimits,...employeeViewGuards(proof,workspace)];
  const fenced=(await executor.transaction([...fenceGuards,authorityStatement,...lockedSession()],signal))[fenceGuards.length]?.[0] as Authority|undefined;
  if(!fenced||JSON.stringify(fenced.locations)!==JSON.stringify(before.locations))return denied;
  const validForMs=Math.min(45000,Date.parse(after.expiresAt)-Date.parse(after.observedAt),45000-(Date.parse(after.observedAt)-Date.parse(before.observedAt)));
  if(validForMs<=0)return unavailable;
  // Company modules (B2): a module that is off has nothing to show on Home.
  const modules=(await readActivePresentation(workspace.id,executor)).modules;
  const off=(part:Section)=>{part.observation=observation('complete',null);part.items=[];};
  if(!modules.marketplace)off(exchanges);
  if(!modules.timeOff)off(timeOff);
  if(!modules.updates){communications=observation('complete',null);communicationItems=[];}
  const sources={schedule:assignments.publicationState==='unavailable'?observation('unavailable','read_failed',null):{...observation(assignments.publicationState,assignments.publicationState==='partial'?'unpublished':null,hash(assignments)),observedAt:assignments.observedAt},acknowledgements:acknowledgements.observation,exchanges:exchanges.observation,timeOff:timeOff.observation,ownTime:ownTime.observation,communications};
  return projectEmployeeHome({observedAt:after.observedAt,authority:homeAuthority(proof),timeZone:workspace.timeZone,validForMs,sources,publicationState:assignments.publicationState,...(assignments.publicationState==='partial'?{unpublishedLocations:assignments.unpublishedLocations??[]}:{}),nextShift:assignments.nextShift,currentShift:assignments.currentShift,attention:[...acknowledgements.items,...exchanges.items,...timeOff.items,...ownTime.items,...communicationItems]});
 }catch(error){return isManagementAuthorizationError(error)?denied:unavailable;}
}
