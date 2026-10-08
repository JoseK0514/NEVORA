import {Temporal} from '@js-temporal/polyfill';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {assertManagementProof,isManagementAuthorizationError,managementSessionStatements} from '../data/management-session';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {timecardReadSql} from '../timecards/service';
import {parsePeriod,type Period} from '../timecards/project';
import {projectReports,type PeriodReports} from './project';

// One statement snapshot across effective/finalized time, published planning,
// preserved punch context, current request state and immutable change events.
const reportSql=`WITH cards AS MATERIALIZED (${timecardReadSql}), bounds AS (
 SELECT $4::date::timestamp AT TIME ZONE $6 AS first_at,($5::date+1)::timestamp AT TIME ZONE $6 AS after_at
), latest AS (
 SELECT DISTINCT ON (r.week_start) r.* FROM schedule_publication_revisions r
 WHERE r.week_start <= $5::date AND r.week_start+6 >= $4::date-1
 ORDER BY r.week_start,r.revision_number DESC
), plan AS (
 SELECT sh.*,r.revision_number,l.name AS location_name FROM latest r
 JOIN schedule_publication_revision_shifts sh ON sh.revision_id=r.id JOIN locations l ON l.id=sh.location_id
 WHERE l.workspace_id=$1 AND sh.employee_id IS NOT NULL AND sh.date BETWEEN $4::date-1 AND $5::date
), raw AS (
 SELECT t.* FROM time_entries t JOIN locations l ON l.id=t.location_id CROSS JOIN bounds b
 WHERE l.workspace_id=$1 AND t.clock_in_at<b.after_at AND COALESCE(t.clock_out_at,'infinity')>b.first_at
), raw_rows AS (
 SELECT t.employee_id,jsonb_build_object('id',t.id,'workspaceId',$1::text,'employeeId',t.employee_id,'locationId',t.location_id,
 'sourceVersion',t.version,'clockInAt',t.clock_in_at::text,'clockOutAt',t.clock_out_at::text,'status',t.status,'scheduleContext',t.schedule_context,
 'breaks',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'timeEntryId',b.time_entry_id,'startAt',b.break_start_at::text,
 'endAt',b.break_end_at::text,'breakTypeId',b.break_type_id,'breakTypeSnapshot',b.break_type_snapshot) ORDER BY b.break_start_at,b.id)
 FROM break_entries b WHERE b.time_entry_id=t.id),'[]'::jsonb)) AS value FROM raw t
), refs AS (
 SELECT DISTINCT employee_id,schedule_context #>> '{match,revisionId}' AS revision_id,schedule_context #>> '{match,publishedShiftId}' AS shift_id
 FROM raw WHERE schedule_context->>'status'='MATCHED'
), historical AS (
 SELECT ref.employee_id,jsonb_build_object('workspaceId',l.workspace_id,'employeeId',sh.employee_id,'locationId',sh.location_id,
 'revisionId',r.id,'revisionNumber',r.revision_number,'publishedShiftId',sh.id,'scheduleId',sh.schedule_id,'sourceShiftId',sh.source_shift_id,
 'date',sh.date::text,'startTime',sh.start_time::text,'endTime',sh.end_time::text,'isCalloutApproved',sh.is_callout_approved) AS value
 FROM refs ref JOIN schedule_publication_revision_shifts sh ON sh.id=ref.shift_id AND sh.revision_id=ref.revision_id
 JOIN schedule_publication_revisions r ON r.id=sh.revision_id LEFT JOIN locations l ON l.id=sh.location_id
), requests AS (
 SELECT jsonb_build_object('id',t.id,'kind','TIME_OFF','employeeId',t.employee_id,'employeeName',trim(e.first_name||' '||e.last_name),
 'status',t.status,'date',t.start_date::text,'endDate',t.end_date::text,'createdAt',t.created_at::text,'locationId',NULL) AS value
 FROM time_off_requests t JOIN employees e ON e.id=t.employee_id JOIN locations l ON l.id=e.primary_location_id
 WHERE l.workspace_id=$1 AND t.start_date<=$5::date AND t.end_date>=$4::date
 UNION ALL
 SELECT jsonb_build_object('id',c.id,'kind','CALLOUT','employeeId',c.employee_id,'employeeName',trim(e.first_name||' '||e.last_name),
 'status',c.status,'date',COALESCE(c.source_terms->>'date',sh.date::text),'endDate',COALESCE(c.source_terms->>'date',sh.date::text),
 'createdAt',c.created_at::text,'locationId',s.location_id)
 FROM shift_callouts c JOIN employees e ON e.id=c.employee_id JOIN shifts sh ON sh.id=c.shift_id
 JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id
 WHERE l.workspace_id=$1 AND COALESCE(c.source_terms->>'date',sh.date::text) BETWEEN $4::text AND $5::text
), events AS (
 SELECT ev.*,COALESCE(ev.source_terms->>'employeeId',ev.source_terms->>'employee_id') AS source_employee,
 COALESCE(x.kind,'UNKNOWN') AS workflow_kind FROM shift_change_events ev LEFT JOIN shift_exchanges x ON ev.request_kind='EXCHANGE' AND x.id=ev.request_id
 WHERE ev.workspace_id=$1 AND ev.source_terms->>'date' BETWEEN $4::text AND $5::text
), revisions AS (
 SELECT r.* FROM schedule_publication_revisions r WHERE EXISTS (
 SELECT 1 FROM schedule_publication_revision_shifts sh JOIN locations l ON l.id=sh.location_id
 WHERE sh.revision_id=r.id AND l.workspace_id=$1 AND sh.date BETWEEN $4::date AND $5::date)
)
SELECT jsonb_build_object('workspaceId',$1::text,'timeZone',$6::text,'observedAt',c."observedAt",
 'period',jsonb_build_object('startDate',$4::text,'endDate',$5::text),'cards',c.cards,
 'publishedWeeks',COALESCE((SELECT jsonb_agg(week_start::text) FROM latest),'[]'::jsonb),
 'schedules',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'employeeId',employee_id,'locationId',location_id,'locationName',location_name,
 'positionId',position_id,'positionName',position_name,'date',date::text,'startTime',start_time::text,'endTime',end_time::text,
 'revisionId',revision_id,'revisionNumber',revision_number,'isCalloutApproved',is_callout_approved) ORDER BY date,start_time,id) FROM plan),'[]'::jsonb),
 'requests',COALESCE((SELECT jsonb_agg(value) FROM requests),'[]'::jsonb),
 'changes',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'requestId',request_id,'requestKind',request_kind,'eventKind',event_kind,
 'requestRevision',request_revision,'createdAt',created_at::text,'sourceDate',source_terms->>'date','employeeId',source_employee,
 'outcomeMode',outcome_mode,'kind',workflow_kind) ORDER BY created_at,id) FROM events),'[]'::jsonb),
 'publications',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'revisionNumber',revision_number,'createdAt',created_at::text,'sourceType',source_type)
 ORDER BY created_at,id) FROM revisions),'[]'::jsonb),
 'attendanceSources',COALESCE((SELECT jsonb_agg(jsonb_build_object('version',1,'workspaceId',$1::text,'employeeId',employee_id,'timeZone',$6::text,
 'observedAt',c."observedAt",'entries',(SELECT jsonb_agg(value) FROM raw_rows rr WHERE rr.employee_id=ids.employee_id),
 'publications',COALESCE((SELECT jsonb_agg(value) FROM historical h WHERE h.employee_id=ids.employee_id),'[]'::jsonb),
 'coverage',jsonb_build_object('entriesComplete',true,'breaksComplete',true,'publicationsComplete',true)))
 FROM (SELECT DISTINCT employee_id FROM raw) ids),'[]'::jsonb)) AS source,
 (SELECT expires_at::text FROM employee_sessions WHERE token_hash=$7) AS "expiresAt" FROM cards c`;
export type ReportsResult={state:'ready';source:unknown;report:PeriodReports;validForMs:number}|{state:'unavailable';reason:'access_denied'|'read_failed'|'source_limit'|'schema_missing'};
export async function readReports(proof:SessionMutationProof,requested:Period,executor:SqlExecutor=neonNotificationExecutor()):Promise<ReportsResult>{
 try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
 if(!['OWNER','MANAGER'].includes(proof.employee.role))return {state:'unavailable',reason:'access_denied'};
 const period=parsePeriod(requested.startDate,requested.endDate);
 try{
  const workspace=await getWorkspace(executor);
  const guards=[...workspaceReadGuard(workspace),{text:'SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE l.workspace_id=$1 ORDER BY e.id FOR SHARE OF e',values:[workspace.id]},...managementSessionStatements(proof,proof.employee.id)];
  const results=await executor.transaction([...guards,{text:reportSql,values:[workspace.id,true,proof.employee.id,period.startDate,period.endDate,workspace.timeZone,proof.sessionTokenHash]},...managementSessionStatements(proof,proof.employee.id)]);
  const row=results[guards.length]?.[0] as {source:unknown;expiresAt:string}|undefined;
  if(!row)throw new Error('Missing report');
  const report=projectReports(row.source);
  // Authority can disappear while projecting after locks are released. Give the
  // client a short lifetime bounded by the original observation and expiry.
  const started=performance.now();
  const [final]=await executor.query<{at:string;expiresAt:string}>({text:`SELECT clock_timestamp()::text AS at,s.expires_at::text AS "expiresAt" FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
   WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role IN ('OWNER','MANAGER') AND s.expires_at>clock_timestamp()`,values:[proof.sessionTokenHash,proof.employee.id]});
  if(!final)return {state:'unavailable',reason:'access_denied'};
  const deadline=[Temporal.Instant.from(report.observedAt).epochMilliseconds+15000,Temporal.Instant.from(row.expiresAt).epochMilliseconds,Temporal.Instant.from(final.expiresAt).epochMilliseconds].reduce((a,b)=>Math.min(a,b));
  const validForMs=Math.floor(deadline-Temporal.Instant.from(final.at).epochMilliseconds-(performance.now()-started));
  if(validForMs<=0)return {state:'unavailable',reason:'access_denied'};
  return {state:'ready',source:row.source,report,validForMs:Math.min(15000,validForMs)};
 }catch(error){
  if(isManagementAuthorizationError(error))return {state:'unavailable',reason:'access_denied'};
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  return {state:'unavailable',reason:['42P01','42703','42883'].includes(code)?'schema_missing':/source limit|SOURCE_LIMIT|source limit or unavailable/i.test(error instanceof Error?error.message:'')?'source_limit':'read_failed'};
 }
}
