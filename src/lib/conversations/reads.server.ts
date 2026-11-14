import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type {Conversation,ConversationQuery,Message,Resource} from './types';
import {access,authority,boundedExecutor,clock,denied,fence,locks,memberGuard,observation,sql,type Access} from './access.server';
import {parseQuery,safeId,sequence,uuid} from './model';
import {openCursor,sealCursor} from './cursor.server';
import {neonNotificationExecutor} from '../data/notification-transactions';
const projection=`r.id,r.kind,r.location_id AS "locationId",r.title,r.revision,r.archived,m.epoch AS "membershipEpoch",m.muted,r.last_sequence::text AS "lastSequence",
 least(2147483647,(SELECT count(*) FROM conversation_messages msg WHERE msg.workspace_id=r.workspace_id AND msg.conversation_id=r.id AND msg.sequence>greatest(m.read_through,m.joined_after) AND msg.author_id<>$2))::integer AS unread,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',cm.employee_id,'name',e.first_name||' '||e.last_name,'role',e.role,'membershipEpoch',cm.epoch,'readThrough',cm.read_through::text) ORDER BY cm.employee_id)
 FROM conversation_members cm JOIN employees e ON e.id=cm.employee_id WHERE cm.workspace_id=r.workspace_id AND cm.conversation_id=r.id AND conversation_member_allowed(r.workspace_id,cm.employee_id,r.id,cm.epoch)),'[]'::jsonb) AS members,
 CASE WHEN r.topic_kind IS NULL THEN NULL WHEN conversation_topic_allowed(r.workspace_id,$2,r.location_id,r.topic_kind,r.topic_id) THEN jsonb_build_object('kind',r.topic_kind,'available',true,'id',r.topic_id,'label',CASE r.topic_kind WHEN 'SHIFT' THEN 'Shift' ELSE 'Assigned staff task' END) ELSE jsonb_build_object('kind',r.topic_kind,'available',false) END AS context`;
const visible=`FROM conversations r JOIN conversation_members m ON m.workspace_id=r.workspace_id AND m.conversation_id=r.id AND m.employee_id=$2 AND m.ended_at IS NULL WHERE r.workspace_id=$1 AND conversation_member_allowed($1,$2,r.id,m.epoch)`;
function rows<T>(r:unknown[][],index:number){return r[index] as T[];}
async function responseFence(p:SessionMutationProof,a:Access,ex:SqlExecutor,conversations:Conversation[]){
 await fence(p,a,ex,conversations.map(c=>({id:c.id,epoch:c.membershipEpoch})));
 const checks=conversations.filter(c=>c.context?.available).map(c=>sql(`SELECT(CASE WHEN conversation_topic_allowed($1,$2,$3,$4,$5) THEN '1' ELSE 'conversation_denied' END)::integer`,[a.workspace.id,p.employee.id,c.locationId,c.context!.kind,c.context!.available?c.context!.id:null]));
 if(checks.length)await ex.transaction([...locks(a),...authority(p,a),...checks,...conversations.map(c=>memberGuard(p,a,c.id,c.membershipEpoch)),...authority(p,a)]);
}
export async function readConversations(p:SessionMutationProof,input:ConversationQuery,ex:SqlExecutor=neonNotificationExecutor()):Promise<Resource>{
 const query=parseQuery(input);if(!query)return {state:'invalid',reason:'invalid_query'};
 ex=boundedExecutor(ex);const start=performance.now();
 try{
 const a=await access(p,ex),params=[a.workspace.id,p.employee.id],prefix=[...locks(a),...authority(p,a)];
 if(query.kind==='CONTEXT'){
  const ec=openCursor(a,'people',query.employeeCursor),lc=openCursor(a,'locations',query.locationCursor);
  if(ec&&!safeId(ec.after)||lc&&!safeId(lc.after))throw Error('conversation_cursor_invalid');
  const r=await ex.transaction([...prefix,
   sql('SELECT id,name FROM locations WHERE workspace_id=$1 AND active AND id=ANY($2::text[]) AND($3::text IS NULL OR id>$3) ORDER BY id LIMIT 101',[a.workspace.id,a.locations,lc?.after??null]),
   sql(`SELECT e.id,e.first_name||' '||e.last_name AS name,ARRAY(SELECT l.id FROM locations l WHERE l.id=ANY($2::text[]) AND conversation_person_allowed($1,e.id,l.id) ORDER BY l.id) AS "eligibleLocationIds" FROM employees e WHERE e.active AND EXISTS(SELECT 1 FROM locations l WHERE l.id=ANY($2::text[]) AND conversation_person_allowed($1,e.id,l.id)) AND($3::text IS NULL OR e.id>$3) ORDER BY e.id LIMIT 5`,[a.workspace.id,a.locations,ec?.after??null]),
   sql("SELECT to_regclass('public.staff_task_instances') IS NOT NULL AS available"),clock(p),...authority(p,a)]);
  await fence(p,a,ex);const locations=rows<{id:string;name:string}>(r,prefix.length),employees=rows<{id:string;name:string;eligibleLocationIds:string[]}>(r,prefix.length+1);
  const result={state:'ready' as const,kind:'CONTEXT' as const,management:a.management,taskContextAvailable:!!(r[prefix.length+2][0] as {available:boolean}).available,locations:locations.slice(0,100),employees:employees.slice(0,4),nextLocationCursor:locations.length>100?sealCursor(a,'locations',{after:locations[99].id}):null,nextEmployeeCursor:null as string|null,...observation(r[prefix.length+3][0],start,a)};
  // Preserve identifiers exactly. JSON escaping can double their serialized cost;
  // trim the people page against actual bytes and resume after its last returned row.
  for(;;){
   if(employees.length>0&&result.employees.length===0)throw Error('conversation_capacity');
   result.nextEmployeeCursor=employees.length>result.employees.length?sealCursor(a,'people',{after:result.employees[result.employees.length-1].id}):null;
   if(new TextEncoder().encode(JSON.stringify(result)).length<=1_000_000)return result;
   if(result.employees.length===0)throw Error('conversation_capacity');
   result.employees.pop();
  }
 }
 if(query.kind==='INBOX'){
  const resource='inbox:'+query.archived,c=openCursor(a,resource,query.cursor);
  if(c&&(!sequence(c.head)||!sequence(c.activity)||!uuid(c.id)))throw Error('conversation_cursor_invalid');
  const r=await ex.transaction([...prefix,sql(`WITH head AS(SELECT COALESCE($3::bigint,last_order) AS n FROM conversation_streams WHERE workspace_id=$1), candidates AS(SELECT r.id, greatest(r.created_order,COALESCE((SELECT max(stream_order) FROM conversation_messages msg,head WHERE msg.workspace_id=$1 AND msg.conversation_id=r.id AND msg.stream_order<=head.n),r.created_order)) AS activity ${visible} AND r.archived=$4 AND r.created_order<=(SELECT n FROM head)), page AS(SELECT * FROM candidates WHERE($5::bigint IS NULL OR(activity,id)<($5::bigint,$6::uuid)) ORDER BY activity DESC,id DESC LIMIT 26)
  SELECT ${projection},page.activity::text AS activity,(SELECT n::text FROM head) AS head FROM page JOIN conversations r ON r.id=page.id JOIN conversation_members m ON m.workspace_id=r.workspace_id AND m.conversation_id=r.id AND m.employee_id=$2 AND m.ended_at IS NULL ORDER BY page.activity DESC,r.id DESC`,[...params,c?.head??null,query.archived,c?.activity??null,c?.id??null]),clock(p),...authority(p,a)]);
  const page=rows<Conversation&{activity:string;head:string}>(r,prefix.length),conversations=page.slice(0,25).map(({activity:_,head:__,...rest})=>rest);await responseFence(p,a,ex,conversations);const last=page[24];
  return {state:'ready',kind:'INBOX',conversations,nextCursor:page.length>25?sealCursor(a,resource,{head:last.head,activity:last.activity,id:last.id}):null,...observation(r[prefix.length+1][0],start,a)};
 }
 const member=memberGuard(p,a,query.conversationId,query.membershipEpoch);
 const r=await ex.transaction([...prefix,member,sql(`SELECT ${projection} ${visible} AND r.id=$3::uuid`,[...params,query.conversationId]),clock(p),...authority(p,a)]);
 const conversation=rows<Conversation>(r,prefix.length+1)[0];if(!conversation)throw Error('conversation_denied');
 if(query.kind==='DETAIL'){await responseFence(p,a,ex,[conversation]);return {state:'ready',kind:'DETAIL',conversation,...observation(r[prefix.length+2][0],start,a)};}
 const resource='history:'+query.conversationId+':'+query.membershipEpoch,c=openCursor(a,resource,query.cursor);
 if(c&&(!sequence(c.head)||!sequence(c.before)||BigInt(c.before as string)>BigInt(c.head as string)))throw Error('conversation_cursor_invalid');
 const history=await ex.transaction([...prefix,member,sql(`SELECT msg.id,msg.sequence::text,msg.author_id AS "authorId",msg.body,msg.persisted_at::text AS "persistedAt",ARRAY(SELECT cm.employee_id FROM conversation_members cm WHERE cm.workspace_id=msg.workspace_id AND cm.conversation_id=msg.conversation_id AND cm.read_through>=msg.sequence AND cm.joined_after<msg.sequence AND cm.employee_id<>msg.author_id AND conversation_member_allowed(cm.workspace_id,cm.employee_id,cm.conversation_id,cm.epoch) ORDER BY cm.employee_id) AS "readBy"
 FROM conversation_messages msg JOIN conversation_members m ON m.epoch=$4::uuid AND m.employee_id=$2 WHERE msg.workspace_id=$1 AND msg.conversation_id=$3::uuid AND msg.sequence>m.joined_after AND msg.sequence<=$5::bigint AND($6::bigint IS NULL OR msg.sequence<$6::bigint) ORDER BY msg.sequence DESC LIMIT 26`,[...params,query.conversationId,query.membershipEpoch,c?.head??conversation.lastSequence,c?.before??null]),clock(p),...authority(p,a)]);
 const messages=rows<Message>(history,prefix.length+1);await responseFence(p,a,ex,[conversation]);
 return {state:'ready',kind:'HISTORY',conversationId:query.conversationId,membershipEpoch:query.membershipEpoch,messages:messages.slice(0,25).map(m=>({...m,persistedAt:new Date(m.persistedAt).toISOString()})),nextCursor:messages.length>25?sealCursor(a,resource,{head:c?.head??conversation.lastSequence,before:messages[24].sequence}):null,...observation(history[prefix.length+2][0],start,a)};
 }catch(e){return {state:denied(e)?'blocked':e instanceof Error&&e.message==='conversation_cursor_invalid'?'invalid':'unavailable',reason:denied(e)?'access_denied':e instanceof Error&&e.message==='conversation_cursor_invalid'?'invalid_cursor':'conversations_unavailable'};}
}
