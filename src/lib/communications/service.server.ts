import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {Workspace} from '../domain';
import type {CommunicationCommand,CommunicationDraft,CommunicationRead,CommunicationListRead,CommunicationContext,CommandResult} from './types';
import type {AttentionCommand} from '../employee-attention/types';
import {validateCommunicationDraft,COMMUNICATION_TRANSPORT_BYTES} from './validation';
import {businessDate} from '../business-time';
import {canManageCommunication,canWithdrawCommunication} from './policy';
import {projectCommunicationAudience,type CommunicationFacts} from './project';
import {communicationContentHash,communicationPayloadHash,communicationRootInsert,communicationRevisionInsert,communicationGrantInsert} from '../data/communications.server';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from '../data/management-session';
import {readEmployeeWorkspace,employeeReadLimits} from '../data/employee-profile.server';
import {workspaceReadGuard} from '../data/workspaces';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {communicationDevelopmentAllowedSql,communicationRecipientAllowedSql} from './sql';
export {communicationRecipientAllowedSql} from './sql';
import {notificationPolicyFor} from '../notifications/policy';
import {buildNotificationIntents} from '../notifications/recipients';
import {notificationIntentStatements} from '../data/notifications';
import {currentCalloutReleaseSql,currentShiftFingerprintSql} from '../data/shift-change-release';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,hex=/^[a-f0-9]{64}$/;
const blocked:CommandResult={status:'blocked',reason:'access_denied'};
export function communicationAuthority(proof:SessionMutationProof):string{
 assertManagementProof(proof,proof?.employee?.id);
 return createHash('sha256').update(JSON.stringify(['nevora:communication:lifetime:v1',proof.employee.id,proof.sessionTokenHash])).digest('hex');
}
/** D04 live activation is held. A flag or database name alone is insufficient:
 * actual PostgreSQL loopback address AND disposable ownership comment required. */
export const communicationDevelopmentGuard:SqlStatement={text:`SELECT (CASE WHEN ${communicationDevelopmentAllowedSql()} THEN '1' ELSE 'communication_activation_held' END)::integer`,values:[]};
function proofValid(proof:SessionMutationProof){assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(proof.employee.role))throw Error('communication_authority');}
/** Range locks protect new grants/assignments as well as existing rows. Existing
 * workspace/employee/catalog/source/session order is retained. Locks/timeouts
 * bound contention; authority is observed only after every source/root wait. */
function guards(proof:SessionMutationProof,w:Workspace,root?:string):SqlStatement[]{
 return [...employeeReadLimits,communicationDevelopmentGuard,...workspaceReadGuard(w),
  {text:'LOCK TABLE employees IN SHARE MODE',values:[]},
  {text:'SELECT id FROM employees ORDER BY id FOR SHARE',values:[]},
  {text:'SELECT id FROM locations WHERE workspace_id=$1 ORDER BY id FOR SHARE',values:[w.id]},
  {text:'LOCK TABLE employee_location_eligibility, schedules, shifts, shift_callouts IN SHARE MODE',values:[]},
  ...(root?[{text:'SELECT id FROM communications WHERE workspace_id=$1 AND id=$2::uuid FOR UPDATE',values:[w.id,root]}]:[]),
  ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])];
}
type Observation={facts:CommunicationFacts;fingerprint:string;observedAt:string};
function snapshot(proof:SessionMutationProof,w:Workspace,draft:CommunicationDraft):SqlStatement{
 const s=draft.scope;
 return {text:`/* communication_snapshot */ WITH facts AS (SELECT jsonb_build_object(
 'actor',(SELECT jsonb_build_object('id',e.id,'role',e.role,'active',e.active,'workspaceId',l.workspace_id) FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$2),
 'location',(SELECT jsonb_build_object('id',id,'workspaceId',workspace_id,'active',active) FROM locations WHERE id=$3),
 'members',COALESCE((SELECT jsonb_agg(row_to_json(m) ORDER BY id) FROM (SELECT e.id FROM employees e JOIN locations primary_l ON primary_l.id=e.primary_location_id WHERE e.active AND e.role IN('EMPLOYEE','LEAD') AND primary_l.workspace_id=$1
  AND (e.primary_location_id=$3 OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=$3)) ORDER BY e.id LIMIT 1001)m),'[]'::jsonb),
 'assignments',COALESCE((SELECT jsonb_agg(row_to_json(a) ORDER BY "sourceShiftId") FROM (SELECT sh.employee_id AS "employeeId",sh.id AS "sourceShiftId",sh.assignment_episode_id::text AS "assignmentEpisodeId",${currentShiftFingerprintSql()} AS "termsFingerprint",
  sh.date::text AS date,left(sh.start_time::text,5) AS "startTime",left(sh.end_time::text,5) AS "endTime",
  (s.status='PUBLISHED' AND EXISTS(SELECT 1 FROM schedule_publication_revisions r WHERE r.week_start=s.week_start)) AS published,
  EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}) AS released
  FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.location_id=$3
   AND (($4='TODAYS_TEAM' AND sh.date BETWEEN $5::date-1 AND $5::date) OR ($4='SHIFT' AND sh.id=$6)) ORDER BY sh.id LIMIT 1001)a),'[]'::jsonb)) AS value)
 SELECT value AS facts,encode(sha256(convert_to(value::text,'UTF8')),'hex') AS fingerprint,to_jsonb(clock_timestamp()) AS "observedAt" FROM facts`,
 values:[w.id,proof.employee.id,s.locationId,s.kind,s.kind==='TODAYS_TEAM'?s.businessDate:null,s.kind==='SHIFT'?s.sourceShiftId:null]};
}
async function observe(proof:SessionMutationProof,w:Workspace,draft:CommunicationDraft,executor:SqlExecutor,signal:AbortSignal,root?:string){
 const prefix=guards(proof,w,root),r=await executor.transaction([...prefix,snapshot(proof,w,draft),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
 const observation=r[prefix.length]?.[0] as Observation|undefined;if(!observation||!hex.test(observation.fingerprint))throw Error('communication_source_unavailable');
 return {...observation,...projectCommunicationAudience(draft,observation.facts,w,observation.observedAt)};
}
export async function previewCommunicationAudience(proof:SessionMutationProof,draft:CommunicationDraft,executor:SqlExecutor=neonNotificationExecutor()):Promise<{state:'ready';count:number;fingerprint:string;authority:string}|{state:'blocked'|'unavailable';reason:string}>{
 try{proofValid(proof);const d=validateCommunicationDraft(draft);if(!d.ok)return {state:'blocked',reason:'invalid_draft'};
  const signal=AbortSignal.timeout(8000),w=await readEmployeeWorkspace(executor,signal),o=await observe(proof,w,d.value,executor,signal);
  return o.allowed?{state:'ready',count:o.grants.length,fingerprint:o.fingerprint,authority:communicationAuthority(proof)}:{state:'blocked',reason:'access_denied'};
 }catch(error){return {state:isManagementAuthorizationError(error)?'blocked':'unavailable',reason:'preview_unavailable'};}
}
function validCommand(input:unknown):input is CommunicationCommand{
 if(!input||typeof input!=='object'||Array.isArray(input))return false;const c=input as Record<string,unknown>;
 const base=['kind','operationId','authority'];let extra:string[];
 switch(c.kind){case 'PUBLISH':extra=['draft','audienceFingerprint'];break;case 'REVISE':extra=['communicationId','expectedRevisionId','draft','audienceFingerprint'];break;case 'WITHDRAW':extra=['communicationId','expectedRevisionId'];break;case 'ACKNOWLEDGE':extra=['communicationId','expectedRevisionId','contentHash'];break;default:return false;}
 const allowed=[...base,...extra];if(Object.keys(c).length!==allowed.length||Object.keys(c).some(k=>!allowed.includes(k))||typeof c.operationId!=='string'||!uuid.test(c.operationId)||typeof c.authority!=='string'||!hex.test(c.authority))return false;
 if(c.kind!=='PUBLISH'&&(!uuid.test(String(c.communicationId))||!uuid.test(String(c.expectedRevisionId))))return false;
 if(c.kind==='PUBLISH'||c.kind==='REVISE'){if(!validateCommunicationDraft(c.draft).ok||!hex.test(String(c.audienceFingerprint)))return false;}
 if(c.kind==='ACKNOWLEDGE'&&!hex.test(String(c.contentHash)))return false;
 try{return Buffer.byteLength(JSON.stringify(c),'utf8')<=COMMUNICATION_TRANSPORT_BYTES;}catch{return false;}
}
type Root={id:string;authorId:string;state:'PUBLISHED'|'WITHDRAWN'|'DRAFT';revisionId:string;version:number;contentHash:string;draft:CommunicationDraft;publishedAt:string;authorContext:string};
function rootStatement(w:Workspace,id:string):SqlStatement{return {text:`SELECT c.id::text,c.author_employee_id AS "authorId",c.state,r.id::text AS "revisionId",r.version,r.content_hash AS "contentHash",r.published_at::text AS "publishedAt",(SELECT CASE WHEN role IN('OWNER','MANAGER') THEN 'Management' ELSE 'Team member' END FROM employees WHERE id=c.author_employee_id) AS "authorContext",
 jsonb_build_object('type',r.type,'scope',CASE r.scope_kind WHEN 'LOCATION' THEN jsonb_build_object('kind',r.scope_kind,'locationId',r.location_id)
 WHEN 'TODAYS_TEAM' THEN jsonb_build_object('kind',r.scope_kind,'locationId',r.location_id,'businessDate',r.business_date::text)
 ELSE jsonb_build_object('kind',r.scope_kind,'locationId',r.location_id,'sourceShiftId',r.source_shift_id,'assignmentEpisodeId',r.assignment_episode_id,'termsFingerprint',r.terms_fingerprint) END,
 'title',r.title,'body',r.body,'acknowledgement',r.acknowledgement,'expiresAt',CASE WHEN r.expires_at IS NULL THEN NULL ELSE to_char(r.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END) AS draft
 FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id WHERE c.workspace_id=$1 AND c.id=$2::uuid`,values:[w.id,id]};}
async function rootRead(proof:SessionMutationProof,w:Workspace,id:string,executor:SqlExecutor,signal:AbortSignal){const p=guards(proof,w,id),r=await executor.transaction([...p,rootStatement(w,id),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);return r[p.length]?.[0] as Root|undefined;}
type Operation={payloadHash:string;sessionHash:string;id:string;version:string};
function operationStatement(proof:SessionMutationProof,w:Workspace,id:string):SqlStatement{return {text:`SELECT payload_hash AS "payloadHash",session_hash AS "sessionHash",communication_id::text AS id,revision_id::text AS version FROM communication_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid
 UNION ALL SELECT command_hash::text AS "payloadHash",$4::text AS "sessionHash",result->>'id' AS id,result->>'version' AS version FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid AND result->>'kind'='COMMUNICATION_READ' AND result->>'authority'=$5 LIMIT 1`,values:[w.id,proof.employee.id,id,proof.sessionTokenHash,communicationAuthority(proof)]};}
const committed=(id:string,version:string,operationId:string):CommandResult=>({status:'committed',id,version,operationId});
export async function findCommunicationOperation(proof:SessionMutationProof,operationId:string,authority:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
 try{proofValid(proof);if(!uuid.test(operationId)||authority!==communicationAuthority(proof))return blocked;
  const signal=AbortSignal.timeout(8000),w=await readEmployeeWorkspace(executor,signal),p=guards(proof,w),r=await executor.transaction([...p,operationStatement(proof,w,operationId),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal),o=r[p.length]?.[0] as Operation|undefined;
  return o&&o.sessionHash===proof.sessionTokenHash?committed(o.id,o.version,operationId):{status:'unavailable',reason:'operation_not_found'};
 }catch{return {status:'unavailable',reason:'operation_unavailable'};}
}
function sourceGuard(proof:SessionMutationProof,w:Workspace,d:CommunicationDraft,fingerprint:string):SqlStatement{
 const s=snapshot(proof,w,d);return {text:`SELECT (CASE WHEN fingerprint=$7 THEN '1' ELSE 'communication_source_conflict' END)::integer FROM (${s.text}) source`,values:[...s.values,fingerprint]};
}
function publicationClockGuard(w:Workspace,d:CommunicationDraft):SqlStatement{return {text:`SELECT (CASE WHEN ($1::timestamptz IS NULL OR $1::timestamptz>clock_timestamp())
 AND ($2::date IS NULL OR $2::date=(clock_timestamp() AT TIME ZONE $3)::date) THEN '1' ELSE 'communication_source_conflict' END)::integer`,values:[d.expiresAt,d.scope.kind==='TODAYS_TEAM'?d.scope.businessDate:null,w.timeZone]};}
const conflict:CommandResult={status:'conflict',reason:'source_or_operation_changed'};
function cancelStatements(id:string):SqlStatement[]{return [{text:`WITH cancelled AS (UPDATE notifications SET push_state='cancelled',cancelled_at=clock_timestamp()
 WHERE source_kind='COMMUNICATION' AND source_id=$1 AND push_state IN('pending','materialized','no_active_subscription') RETURNING id)
 UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
 WHERE notification_id IN(SELECT id FROM cancelled) AND status IN('queued','retry_pending','processing')`,values:[id]}];}
export async function executeCommunicationCommand(proof:SessionMutationProof,c:CommunicationCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
 if(!validCommand(c))return {status:'blocked',reason:'invalid_command'};
 let dispatched=false;
 try{
  proofValid(proof);if(c.authority!==communicationAuthority(proof))return blocked;
  const signal=AbortSignal.timeout(10000),w=await readEmployeeWorkspace(executor,signal),root=c.kind==='PUBLISH'?undefined:await rootRead(proof,w,c.communicationId,executor,signal);
  // Actor-bound recovery precedes source eligibility: successful withdrawals and
  // edits remain recoverable without revealing any former body/grant/roster.
  const opPrefix=guards(proof,w),old=(await executor.transaction([...opPrefix,operationStatement(proof,w,c.operationId),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal))[opPrefix.length]?.[0] as Operation|undefined;
  const payloadHash=communicationPayloadHash(c);if(old)return old.payloadHash===payloadHash&&old.sessionHash===proof.sessionTokenHash?committed(old.id,old.version,c.operationId):conflict;
  if(c.kind!=='PUBLISH'&&(!root||root.state!=='PUBLISHED'||root.revisionId!==c.expectedRevisionId))return conflict;
  const d=c.kind==='PUBLISH'||c.kind==='REVISE'?validateCommunicationDraft(c.draft):validateCommunicationDraft(root!.draft);if(!d.ok)return blocked;
  const o=await observe(proof,w,d.value,executor,signal,root?.id);
  if(c.kind==='PUBLISH'||c.kind==='REVISE'){
   if(!o.allowed||(c.kind==='REVISE'&&!canManageCommunication(o.context)))return blocked;
   if(o.fingerprint!==c.audienceFingerprint)return conflict;
  }else if(c.kind==='WITHDRAW'){if(!canWithdrawCommunication(d.value,root!.authorId,o.context))return blocked;}
  else{
   if(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||root!.draft.acknowledgement==='NONE')return blocked;
   if(c.contentHash!==root!.contentHash)return conflict;
  }
  const id=root?.id??randomUUID(),revisionId=c.kind==='WITHDRAW'||c.kind==='ACKNOWLEDGE'?root!.revisionId:randomUUID(),version=(root?.version??0)+1;
  const identity=[w.id,proof.employee.id,c.operationId],prefix=guards(proof,w,root?.id);
  const opLock:SqlStatement={text:"SELECT pg_advisory_xact_lock(hashtextextended('communication-operation:'||$1||':'||$2||':'||$3,0))",values:identity};
  const opCheck:SqlStatement={text:`SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM communication_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid AND (payload_hash<>$4 OR session_hash<>$5)) THEN '1' ELSE 'communication_operation_conflict' END)::integer`,values:[...identity,payloadHash,proof.sessionTokenHash]};
  // Serialize operation first, then distinguish replay in one SQL assertion.
  // A replay throws a typed sentinel, rolls back and recovers the existing ID.
  const freshCheck:SqlStatement={text:`SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM communication_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid) THEN '1' ELSE 'communication_operation_replay' END)::integer`,values:identity};
  const writes:SqlStatement[]=[];
  if(root)writes.push({text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM communications WHERE workspace_id=$1 AND id=$2::uuid AND state='PUBLISHED' AND head_revision_id=$3::uuid) THEN '1' ELSE 'communication_source_conflict' END)::integer`,values:[w.id,id,root.revisionId]});
  writes.push(sourceGuard(proof,w,d.value,o.fingerprint));
  if(c.kind==='PUBLISH'||c.kind==='REVISE')writes.push(publicationClockGuard(w,d.value));
  if(c.kind==='ACKNOWLEDGE')writes.push(recipientCommandGuard(proof,w,id,revisionId,c.contentHash));
  if(c.kind==='WITHDRAW')writes.push(...cancelStatements(id),{text:"UPDATE communications SET state='WITHDRAWN' WHERE workspace_id=$1 AND id=$2::uuid",values:[w.id,id]});
  else if(c.kind==='ACKNOWLEDGE')writes.push({text:`INSERT INTO communication_receipts(id,workspace_id,communication_id,revision_id,employee_id,content_hash)
   VALUES($1::uuid,$2,$3::uuid,$4::uuid,$5,$6) ON CONFLICT(workspace_id,communication_id,revision_id,employee_id) DO NOTHING`,values:[randomUUID(),w.id,id,revisionId,proof.employee.id,c.contentHash]});
  else{
   if(!root)writes.push(communicationRootInsert(w.id,id,proof.employee.id));else writes.push(...cancelStatements(id));
   writes.push(communicationRevisionInsert({workspaceId:w.id,communicationId:id,revisionId,version,actorId:proof.employee.id,draft:d.value,audienceFingerprint:o.fingerprint,observedAt:o.observedAt,publishedAt:o.observedAt}));
   const hash=communicationContentHash(d.value);
   for(const g of o.grants){
    writes.push(communicationGrantInsert({workspaceId:w.id,communicationId:id,revisionId,employeeId:g.employeeId,contentHash:hash,locationId:d.value.scope.locationId,observedAt:o.observedAt,provenance:{source:'canonical',audienceFingerprint:o.fingerprint},...(g.kind==='LOCATION'?{kind:'LOCATION'}:{kind:'ASSIGNMENT',sourceShiftId:g.sourceShiftId!,assignmentEpisodeId:g.assignmentEpisodeId!,termsFingerprint:g.termsFingerprint!})}));

   }
   writes.push(...notificationIntentStatements(buildNotificationIntents({after:{kind:'COMMUNICATION',source:{kind:'COMMUNICATION',id,version:revisionId},updatedAt:o.observedAt,recipientIds:o.grants.map(g=>g.employeeId),expiresAt:d.value.expiresAt},recipients:o.grants.map(g=>({employeeId:g.employeeId,role:'EMPLOYEE',active:true,allowedLocationIds:[]})),environment:'test',now:new Date(o.observedAt),policy:notificationPolicyFor(w.timeZone)})));
   writes.push({text:"UPDATE communications SET state='PUBLISHED',head_revision_id=$3::uuid WHERE workspace_id=$1 AND id=$2::uuid",values:[w.id,id,revisionId]});
  }
  if(c.kind!=='ACKNOWLEDGE')writes.push({text:'INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,$5,$6)',values:[randomUUID(),w.id,id,revisionId,proof.employee.id,c.kind==='WITHDRAW'?'WITHDRAWN':c.kind==='REVISE'?'REVISED':'PUBLISHED']});
  writes.push({text:`INSERT INTO communication_operations(workspace_id,actor_employee_id,operation_id,session_hash,payload_hash,kind,communication_id,revision_id,receipt_id)
   VALUES($1,$2,$3::uuid,$4,$5,$6,$7::uuid,$8::uuid,${c.kind==='ACKNOWLEDGE'?"(SELECT id FROM communication_receipts WHERE workspace_id=$1 AND employee_id=$2 AND communication_id=$7::uuid AND revision_id=$8::uuid)":'NULL'})`,values:[...identity,proof.sessionTokenHash,payloadHash,c.kind,id,revisionId]});
  const finalClock=c.kind==='PUBLISH'||c.kind==='REVISE'?[publicationClockGuard(w,d.value)]:c.kind==='ACKNOWLEDGE'?[recipientCommandGuard(proof,w,id,revisionId,c.contentHash)]:[];
  dispatched=true;await executor.transaction([...prefix,opLock,opCheck,freshCheck,...writes,...finalClock,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  return committed(id,revisionId,c.operationId);
 }catch(error){
  const message=error instanceof Error?error.message:'';
  if(isManagementAuthorizationError(error))return blocked;
  if(message.includes('communication_recipient_denied'))return blocked;
  if(message.includes('communication_operation_replay'))return findCommunicationOperation(proof,c.operationId,c.authority,executor);
  if(message.includes('communication_source_conflict')||message.includes('communication_operation_conflict'))return conflict;
  if(error&&typeof error==='object'&&'code'in error&&['55P03','57014','40P01','40001'].includes(String(error.code)))return {status:'unavailable',reason:'retry_original_operation'};
  return dispatched?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'read_failed'};
 }
}
function recipientStatement(proof:SessionMutationProof,w:Workspace,r:Root):SqlStatement{return {text:`SELECT g.grant_kind AS kind,g.source_shift_id AS "sourceShiftId",g.assignment_episode_id AS "assignmentEpisodeId",g.terms_fingerprint AS "termsFingerprint",
 (SELECT acknowledged_at::text FROM communication_receipts WHERE workspace_id=g.workspace_id AND communication_id=g.communication_id AND revision_id=g.revision_id AND employee_id=g.employee_id) AS "acknowledgedAt",
 (SELECT read_at::text FROM employee_attention_receipts WHERE workspace_id=g.workspace_id AND employee_id=g.employee_id AND source_kind='COMMUNICATION' AND source_id=g.communication_id::text AND source_version=g.revision_id::text) AS "readAt"
 FROM communication_recipients g WHERE g.workspace_id=$1 AND g.communication_id=$2::uuid AND g.revision_id=$3::uuid AND g.employee_id=$4`,values:[w.id,r.id,r.revisionId,proof.employee.id]};}
function lifetimeStatement(proof:SessionMutationProof):SqlStatement{return {text:`/* communication_lifetime */ SELECT to_jsonb(clock_timestamp()) AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM(expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE token_hash=$1 AND employee_id=$2 AND expires_at>clock_timestamp()`,values:[proof.sessionTokenHash,proof.employee.id]};}
function statusStatement(proof:SessionMutationProof,w:Workspace,r:Root):SqlStatement{return {text:`SELECT count(*)::integer AS count,CASE WHEN $4 IN('OWNER','MANAGER') THEN COALESCE(jsonb_agg(jsonb_build_object('name',trim(e.first_name||' '||e.last_name),'acknowledgedAt',(SELECT to_jsonb(acknowledged_at) FROM communication_receipts receipt WHERE receipt.workspace_id=g.workspace_id AND receipt.communication_id=g.communication_id AND receipt.revision_id=g.revision_id AND receipt.employee_id=g.employee_id)) ORDER BY e.id),'[]') ELSE NULL END AS recipients FROM communication_recipients g JOIN employees e ON e.id=g.employee_id WHERE g.workspace_id=$1 AND g.communication_id=$2::uuid AND g.revision_id=$3::uuid`,values:[w.id,r.id,r.revisionId,proof.employee.role]};}
export async function readCommunication(proof:SessionMutationProof,id:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommunicationRead>{
 try{
  proofValid(proof);if(!uuid.test(id))return {state:'unauthorized',reason:'update_unavailable'};
  const signal=AbortSignal.timeout(8000),w=await readEmployeeWorkspace(executor,signal),r=await rootRead(proof,w,id,executor,signal);
  if(!r)return {state:'unauthorized',reason:'update_unavailable'};
  const o=await observe(proof,w,r.draft,executor,signal,id),p=guards(proof,w,id),result=await executor.transaction([...p,sourceGuard(proof,w,r.draft,o.fingerprint),rootStatement(w,id),recipientStatement(proof,w,r),lifetimeStatement(proof),statusStatement(proof,w,r),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  const current=result[p.length+1]?.[0] as Root|undefined,grant=result[p.length+2]?.[0] as {kind:string;sourceShiftId:string;assignmentEpisodeId:string;termsFingerprint:string;acknowledgedAt:string|null;readAt:string|null}|undefined;
  const management=canManageCommunication(o.context),member=o.facts.members.some(m=>m.id===proof.employee.id);
  const assignmentValid=grant&&o.context.assignments.some(a=>a.employeeId===proof.employee.id&&a.published&&!a.released&&a.sourceShiftId===grant.sourceShiftId&&a.assignmentEpisodeId===grant.assignmentEpisodeId&&a.termsFingerprint===grant.termsFingerprint);
  const allowed=management||(o.context.location.active&&o.context.location.workspaceId===w.id&&member&&grant&&(grant.kind==='LOCATION'||assignmentValid));
  if(!allowed)return {state:'unauthorized',reason:'update_unavailable'};
  if(!current||current.revisionId!==r.revisionId)return {state:'unavailable',reason:'update_changed'};
  if(current.state==='WITHDRAWN')return {state:'withdrawn',reason:'update_unavailable'};
  if(current.draft.expiresAt&&Date.parse(current.draft.expiresAt)<=Date.now())return {state:'withdrawn',reason:'update_unavailable'};
  const lifetime=result[p.length+3]?.[0] as {observedAt:string;validForMs:number}|undefined,status=result[p.length+4]?.[0] as {count:number;recipients:{name:string;acknowledgedAt:string|null}[]|null};
  if(!lifetime||lifetime.validForMs<=0)return {state:'unauthorized',reason:'update_unavailable'};
  return {state:'ready',id:r.id,revisionId:r.revisionId,contentHash:r.contentHash,title:r.draft.title,body:r.draft.body,type:r.draft.type,publishedAt:r.publishedAt,editedAt:r.version>1?r.publishedAt:null,acknowledgement:r.draft.acknowledgement,ownAcknowledgedAt:grant?.acknowledgedAt??null,ownReadAt:grant?.readAt??null,authority:communicationAuthority(proof),...lifetime,validForMs:Math.min(lifetime.validForMs,r.draft.expiresAt?Date.parse(r.draft.expiresAt)-Date.parse(lifetime.observedAt):45000),timeZone:w.timeZone,expiresAt:r.draft.expiresAt,authorContext:r.authorContext??'Team member',canWithdraw:canWithdrawCommunication(r.draft,r.authorId,o.context),...(r.authorId===proof.employee.id?{sentCount:status.count}:{}),...(management?{management:{draft:r.draft,recipients:status.recipients??[]}}:{})};
 }catch(error){return {state:isManagementAuthorizationError(error)?'unauthorized':'unavailable',reason:'update_unavailable'};}
}
/** Final protected membership check for list/Home/ack consumers. Immutable
 * grants intersect current exact assignment and current location eligibility. */
function recipientCommandGuard(proof:SessionMutationProof,w:Workspace,id:string,revision:string,contentHash?:string):SqlStatement{return {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id WHERE c.workspace_id=$1 AND c.id=$3::uuid AND r.id=$4::uuid
 AND c.state='PUBLISHED' AND (r.expires_at IS NULL OR r.expires_at>clock_timestamp()) AND ($5::text IS NULL OR r.content_hash=$5) AND ${communicationRecipientAllowedSql()}) THEN '1' ELSE 'communication_recipient_denied' END)::integer`,values:[w.id,proof.employee.id,id,revision,contentHash??null]};}
export async function recordCommunicationRead(proof:SessionMutationProof,c:AttentionCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
 let dispatched=false;
 try{
  proofValid(proof);if(!c||Object.keys(c).sort().join(',')!=='authority,kind,operationId,ref'||c.kind!=='MARK_READ'||!c.ref||Object.keys(c.ref).sort().join(',')!=='id,kind,version'||c.ref.kind!=='COMMUNICATION'||!uuid.test(c.operationId)||!uuid.test(c.ref.id)||!uuid.test(c.ref.version)||c.authority!==communicationAuthority(proof)||!['EMPLOYEE','LEAD'].includes(proof.employee.role))return blocked;
  const signal=AbortSignal.timeout(8000),w=await readEmployeeWorkspace(executor,signal),identity=[w.id,proof.employee.id,c.operationId],payloadHash=createHash('sha256').update(JSON.stringify(['communication:read:v1',c])).digest('hex');
  const prefix=guards(proof,w,c.ref.id),op:SqlStatement={text:'SELECT command_hash::text AS hash,result FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid',values:identity};
  const current=(await executor.transaction([...prefix,op,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal))[prefix.length]?.[0] as {hash:string;result:Record<string,string>}|undefined;
  if(current)return current.hash===payloadHash?committed(current.result.id,current.result.version,c.operationId):conflict;
  const root=await rootRead(proof,w,c.ref.id,executor,signal);if(!root||root.state!=='PUBLISHED'||root.revisionId!==c.ref.version)return conflict;if(root.draft.acknowledgement==='REQUIRED')return {status:'blocked',reason:'required_action'};
  dispatched=true;
  await executor.transaction([...prefix,{text:"SELECT pg_advisory_xact_lock(hashtextextended('communication-read-operation:'||$1||':'||$2||':'||$3,0))",values:identity},
   {text:`SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid AND command_hash<>$4) THEN '1' ELSE 'communication_operation_conflict' END)::integer`,values:[...identity,payloadHash]},
   recipientCommandGuard(proof,w,c.ref.id,c.ref.version),
   {text:`INSERT INTO employee_attention_receipts(id,workspace_id,employee_id,source_kind,source_id,source_version) VALUES($1::uuid,$2,$3,'COMMUNICATION',$4,$5) ON CONFLICT(workspace_id,employee_id,source_kind,source_id,source_version) DO NOTHING`,values:[randomUUID(),w.id,proof.employee.id,c.ref.id,c.ref.version]},
   {text:`INSERT INTO employee_attention_operations(workspace_id,employee_id,operation_id,command_hash,result) VALUES($1,$2,$3::uuid,$4,jsonb_build_object('status','committed','operationId',$3::text,'id',$5::text,'version',$6::text,'kind','COMMUNICATION_READ','authority',$7::text)) ON CONFLICT(workspace_id,employee_id,operation_id) DO NOTHING`,values:[...identity,payloadHash,c.ref.id,c.ref.version,c.authority]},
   recipientCommandGuard(proof,w,c.ref.id,c.ref.version),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  return committed(c.ref.id,c.ref.version,c.operationId);
 }catch(error){const message=error instanceof Error?error.message:'';if(isManagementAuthorizationError(error)||message.includes('communication_recipient_denied'))return blocked;if(message.includes('communication_operation_conflict'))return conflict;return dispatched?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'read_failed'};}
}
function finalItemStatement(proof:SessionMutationProof,w:Workspace,item:Extract<CommunicationRead,{state:'ready'}>):SqlStatement{return {text:`SELECT EXISTS(SELECT 1 FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id
 WHERE c.workspace_id=$1 AND c.id=$3::uuid AND r.id=$4::uuid AND c.state='PUBLISHED' AND (r.expires_at IS NULL OR r.expires_at>clock_timestamp())
 AND ($5 IN('OWNER','MANAGER') OR ${communicationRecipientAllowedSql()})) AS allowed`,values:[w.id,proof.employee.id,item.id,item.revisionId,proof.employee.role]};}
function communicationIndex(proof:SessionMutationProof,w:Workspace):SqlStatement{return {text:`/* communication_list_index */ SELECT c.id::text,c.head_revision_id::text AS revision,
 (SELECT acknowledged_at::text FROM communication_receipts WHERE workspace_id=c.workspace_id AND communication_id=c.id AND revision_id=c.head_revision_id AND employee_id=$2) AS acknowledged,
 (SELECT read_at::text FROM employee_attention_receipts WHERE workspace_id=c.workspace_id AND source_kind='COMMUNICATION' AND source_id=c.id::text AND source_version=c.head_revision_id::text AND employee_id=$2) AS read FROM communications c WHERE c.workspace_id=$1 AND c.state='PUBLISHED' AND
 ($3 IN('OWNER','MANAGER') OR c.author_employee_id=$2 OR EXISTS(SELECT 1 FROM communication_recipients g WHERE g.workspace_id=c.workspace_id AND g.communication_id=c.id AND g.revision_id=c.head_revision_id AND g.employee_id=$2)) ORDER BY c.created_at DESC,c.id LIMIT 101`,values:[w.id,proof.employee.id,proof.employee.role]};}
export async function listEmployeeCommunications(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommunicationListRead>{
 try{proofValid(proof);const signal=AbortSignal.timeout(8000),w=await readEmployeeWorkspace(executor,signal),p=guards(proof,w),results=await executor.transaction([...p,communicationIndex(proof,w)],signal);
  const rows=results[p.length] as {id:string}[],items:CommunicationRead[]=[];let partial=rows.length>100;
  for(const row of rows.slice(0,100)){const r=await readCommunication(proof,row.id,executor);if(r.state==='ready')items.push(r);else if(r.state==='unavailable')partial=true;}
  const ready=items.filter((i):i is Extract<CommunicationRead,{state:'ready'}>=>i.state==='ready');
  const finalPrefix=[...guards(proof,w),{text:'LOCK TABLE communications IN SHARE MODE',values:[]},{text:'SELECT id FROM communications WHERE workspace_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR SHARE',values:[w.id,ready.map(i=>i.id).sort()]}];
  const final=await executor.transaction([...finalPrefix,...ready.map(i=>finalItemStatement(proof,w,i)),communicationIndex(proof,w),lifetimeStatement(proof),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  if(JSON.stringify(final[finalPrefix.length+ready.length])!==JSON.stringify(rows))partial=true;
  const current=ready.filter((_,i)=>(final[finalPrefix.length+i]?.[0] as {allowed:boolean}|undefined)?.allowed===true);if(current.length!==ready.length)partial=true;
  const lifetime=final[finalPrefix.length+ready.length+1]?.[0] as {observedAt:string;validForMs:number}|undefined;if(!lifetime||lifetime.validForMs<=0)return {state:'unauthorized',reason:'updates_unavailable'};
  return {state:partial?'partial':'complete',...lifetime,validForMs:Math.min(lifetime.validForMs,...current.map(i=>i.validForMs-(Date.parse(lifetime.observedAt)-Date.parse(i.observedAt)))),authority:communicationAuthority(proof),timeZone:w.timeZone,items:current,reason:partial?'source_unavailable':null};
 }catch(error){return {state:isManagementAuthorizationError(error)?'unauthorized':'unavailable',reason:'updates_unavailable'};}
}

/** Bounded current composition context; employee context has no coworker roster. */
export async function readCommunicationContext(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommunicationContext>{
 try{proofValid(proof);const signal=AbortSignal.timeout(8000),w=await readEmployeeWorkspace(executor,signal),prefix=guards(proof,w),management=['OWNER','MANAGER'].includes(proof.employee.role);
  const r=await executor.transaction([...prefix,{text:`SELECT l.id,l.short_name AS label FROM locations l WHERE l.workspace_id=$1 AND l.active AND ($3 IN('OWNER','MANAGER') OR EXISTS(SELECT 1 FROM employees e WHERE e.id=$2 AND (e.primary_location_id=l.id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)))) ORDER BY l.id LIMIT 101`,values:[w.id,proof.employee.id,proof.employee.role]},
   {text:`SELECT sh.id,s.location_id AS "locationId",sh.date::text,left(sh.start_time::text,5) AS "startTime",left(sh.end_time::text,5) AS "endTime",sh.assignment_episode_id::text AS "assignmentEpisodeId",${currentShiftFingerprintSql()} AS "termsFingerprint" FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id WHERE $2 IN('OWNER','MANAGER') AND l.workspace_id=$1 AND l.active AND s.status='PUBLISHED' AND sh.date BETWEEN (clock_timestamp() AT TIME ZONE $3)::date-1 AND (clock_timestamp() AT TIME ZONE $3)::date+28 AND EXISTS(SELECT 1 FROM schedule_publication_revisions pr WHERE pr.week_start=s.week_start) AND NOT EXISTS(SELECT 1 FROM shift_callouts callout WHERE ${currentCalloutReleaseSql('callout')}) ORDER BY sh.date,sh.id LIMIT 501`,values:[w.id,proof.employee.role,w.timeZone]},lifetimeStatement(proof),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  const locations=r[prefix.length] as Extract<CommunicationContext,{state:'ready'}>['locations'],shifts=r[prefix.length+1] as Extract<CommunicationContext,{state:'ready'}>['shifts'],lifetime=r[prefix.length+2]?.[0] as {observedAt:string;validForMs:number};if(!lifetime||lifetime.validForMs<=0||locations.length>100||shifts.length>500)return {state:'unavailable',reason:'context_unavailable'};
  return {state:'ready',...lifetime,authority:communicationAuthority(proof),management,businessDate:businessDate(new Date(lifetime.observedAt),w.timeZone),timeZone:w.timeZone,locations,shifts};
 }catch(error){return {state:isManagementAuthorizationError(error)?'unauthorized':'unavailable',reason:'context_unavailable'};}
}
