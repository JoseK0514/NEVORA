import 'server-only';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {PublishedAssignment,PublishedAssignmentRead} from '../employee-home/types';
import {shiftBoundaryInstants} from '../business-time';
import {addDays,isValidIsoDate,isValidWeekStart} from '../date-utils';
import {businessDateStart,shiftPeriod} from '../scheduling/periods';
import {neonNotificationExecutor} from './notification-transactions';
import {assertEmployeeViewProof,employeeViewGuards,employeeReadLimits,readEmployeeWorkspace} from './employee-profile.server';
import {employeeAllowedLocationsSql} from './employee-schedule';
import {currentCalloutReleaseSql} from './shift-change-release';

type AssignmentRow={shiftId:string;assignmentEpisodeId:string;termsRevision:number;weekStart:string;date:string;
 startTime:string;endTime:string;locationId:string;locationLabel:string;positionLabel:string|null;designatedLead:boolean;publicationRevisionId:string|null};
type Observation={observedAt:string;timeZone:string;future:AssignmentRow[];current:AssignmentRow[];coverageComplete:boolean;unpublishedLabels?:unknown};
type SourceAuthority={allowedLocationIds:string[]};
const unavailable:PublishedAssignmentRead={observedAt:null,timeZone:null,nextShift:null,currentShift:null,publicationState:'unavailable'};
const MAX_WINDOW_ROWS=500;

function assignment(row:AssignmentRow,timeZone:string):PublishedAssignment{
 if(!row||!row.shiftId||!row.assignmentEpisodeId||!Number.isSafeInteger(row.termsRevision)||row.termsRevision<1||
  !isValidWeekStart(row.weekStart)||!isValidIsoDate(row.date)||!row.locationId||!row.locationLabel||!row.publicationRevisionId||
  (row.positionLabel!==null&&typeof row.positionLabel!=='string')||typeof row.designatedLead!=='boolean')throw Error('Invalid published assignment source');
 const {startAt,endAt}=shiftBoundaryInstants(row,timeZone);
 return {shiftId:row.shiftId,assignmentEpisodeId:row.assignmentEpisodeId,termsRevision:row.termsRevision,weekStart:row.weekStart,
  date:row.date,startAt,endAt,locationId:row.locationId,locationLabel:row.locationLabel,positionLabel:row.positionLabel,
  designatedLead:row.designatedLead,publicationRevisionId:row.publicationRevisionId};
}

/** Canonical conversion is also the E3 complete-window projection seam. A missing
 * revision or invalid DST boundary closes the read; neither can be normalized. */
export function projectPublishedAssignmentRows(input:Observation):PublishedAssignmentRead|null{
 try{
  const at=Date.parse(input.observedAt);
  if(!Number.isFinite(at)||!input.timeZone||!Array.isArray(input.future)||!Array.isArray(input.current)||typeof input.coverageComplete!=='boolean')return null;
  const future=input.future.map(row=>assignment(row,input.timeZone)).sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.shiftId.localeCompare(b.shiftId));
  const current=input.current.map(row=>assignment(row,input.timeZone)).filter(row=>Date.parse(row.startAt)<=at&&Date.parse(row.endAt)>at)
   .sort((a,b)=>a.startAt.localeCompare(b.startAt)||a.shiftId.localeCompare(b.shiftId));
  if(future.some(row=>Date.parse(row.startAt)<=at))return null;
  return {observedAt:input.observedAt,timeZone:input.timeZone,nextShift:future[0]??null,currentShift:current[0]??null,
   publicationState:input.coverageComplete?'complete':'partial',
   // Only a partly published week carries the names; a complete read keeps its original shape.
   ...(input.coverageComplete?{}:{unpublishedLocations:Array.isArray(input.unpublishedLabels)?input.unpublishedLabels.filter((l):l is string=>typeof l==='string'&&l.length>0).slice(0,10):[]})};
 }catch{return null;}
}

const ownColumns=`sh.id AS "shiftId",sh.assignment_episode_id::text AS "assignmentEpisodeId",sh.terms_revision AS "termsRevision",
 s.week_start::text AS "weekStart",sh.date::text AS date,left(sh.start_time::text,5) AS "startTime",left(sh.end_time::text,5) AS "endTime",
 s.location_id AS "locationId",l.short_name AS "locationLabel",p.name AS "positionLabel",sh.is_designated_lead AS "designatedLead",
 (SELECT r.id FROM schedule_publication_revisions r WHERE r.week_start=s.week_start ORDER BY r.revision_number DESC LIMIT 1) AS "publicationRevisionId"`;
const ownSelect=(extra:string,local='')=>`SELECT ${ownColumns}
 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN allowed l ON l.id=s.location_id
 LEFT JOIN positions p ON p.id=sh.position_id AND p.workspace_id=$1 ${local}
 WHERE sh.employee_id=$2 AND s.status='PUBLISHED' AND NOT EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}) ${extra}`;
// SQL uses the employee/date index and never caps the number of future weeks.
// Today's and yesterday's possible ongoing rows are a separate bounded query.
const nextSql=`WITH clock AS MATERIALIZED (SELECT clock_timestamp() AS at), local AS MATERIALIZED
 (SELECT at,(at AT TIME ZONE $3)::date AS day,(at AT TIME ZONE $3)::time AS wall FROM clock),
 allowed AS MATERIALIZED (${employeeAllowedLocationsSql()}),
 coverage AS (SELECT count(*)>0 AND bool_and(EXISTS(SELECT 1 FROM schedules s WHERE s.location_id=l.id
  AND s.week_start=date_trunc('week',local.day::timestamp)::date AND s.status='PUBLISHED')) AS complete FROM allowed l CROSS JOIN local),
 future AS (${ownSelect('AND (sh.date,sh.start_time)>(local.day,local.wall) ORDER BY sh.date,sh.start_time,sh.id LIMIT 1','CROSS JOIN local')}),
 current AS (${ownSelect('AND sh.date BETWEEN local.day-1 AND local.day AND (sh.date<local.day OR sh.start_time<=local.wall) ORDER BY sh.date,sh.start_time,sh.id LIMIT 501','CROSS JOIN local')})
 SELECT to_jsonb(clock.at) AS "observedAt",ARRAY(SELECT id FROM allowed ORDER BY id) AS "allowedLocationIds",
 (SELECT complete FROM coverage) AS "coverageComplete",
 (SELECT COALESCE(jsonb_agg(l.short_name ORDER BY l.id),'[]'::jsonb) FROM allowed l CROSS JOIN local WHERE NOT EXISTS(SELECT 1 FROM schedules s WHERE s.location_id=l.id
  AND s.week_start=date_trunc('week',local.day::timestamp)::date AND s.status='PUBLISHED')) AS "unpublishedLabels",
 COALESCE((SELECT jsonb_agg(to_jsonb(future)) FROM future),'[]'::jsonb) AS future,
 COALESCE((SELECT jsonb_agg(to_jsonb(current)) FROM current),'[]'::jsonb) AS current FROM clock`;

function validAllowedLocationIds(value:unknown):value is string[]{
 return Array.isArray(value)&&value.length>0&&value.every((id,i)=>typeof id==='string'&&id.length>0&&(i===0||value[i-1]<id));
}
/** The final guard's location/eligibility locks precede this fresh comparison.
 * A remaining authorized location cannot validate a stale observed location. */
async function finalLocationAuthority(proof:SessionMutationProof,workspace:Awaited<ReturnType<typeof readEmployeeWorkspace>>,
 allowedLocationIds:string[],executor:SqlExecutor,signal:AbortSignal):Promise<boolean>{
 const guards=employeeViewGuards(proof,workspace);
 const results=await executor.transaction([...employeeReadLimits,...guards,{text:`WITH allowed AS (${employeeAllowedLocationsSql()})
  SELECT ARRAY(SELECT id FROM allowed ORDER BY id)=$3::text[] AS unchanged`,values:[workspace.id,proof.employee.id,allowedLocationIds]}],signal);
 return (results[employeeReadLimits.length+guards.length]?.[0] as {unchanged?:unknown}|undefined)?.unchanged===true;
}

/** Protected own-assignment read. Workspace, employee, locations, eligibility,
 * and session are locked/checked before the coherent source observation, then
 * checked again after it so logout/role/location changes cannot release rows. */
export async function readEmployeePublishedAssignments(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<PublishedAssignmentRead>{
 try{assertEmployeeViewProof(proof);}catch{return unavailable;}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal);
  const guards=employeeViewGuards(proof,workspace),limits=employeeReadLimits;
  const results=await executor.transaction([...limits,...guards,{text:nextSql,values:[workspace.id,proof.employee.id,workspace.timeZone]}],signal);
  const source=results[limits.length+guards.length]?.[0] as (Observation&SourceAuthority)|undefined;
  if(!source||!validAllowedLocationIds(source.allowedLocationIds)||!Array.isArray(source.future)||source.future.length>1||!Array.isArray(source.current)||source.current.length>MAX_WINDOW_ROWS)return unavailable;
  // The zone comes from the guarded workspace, not a caller or source row.
  const projected=projectPublishedAssignmentRows({...source,timeZone:workspace.timeZone});
  if(!projected)return unavailable;
  if(!await finalLocationAuthority(proof,workspace,source.allowedLocationIds,executor,signal))return unavailable;
  return projected;
 }catch{return unavailable;}
}

export type PublishedAssignmentWindowRead=
 | {state:'ready';observedAt:string;timeZone:string;assignments:PublishedAssignment[]}
 | {state:'unavailable';observedAt:null;timeZone:null;assignments:[]};
const unavailableWindow:PublishedAssignmentWindowRead={state:'unavailable',observedAt:null,timeZone:null,assignments:[]};
/** E3 may request a finite calendar window with its own capability policy.
 * This seam always rechecks current employee authority and never accepts an ID. */
export async function readEmployeePublishedAssignmentWindow(proof:SessionMutationProof,fromDate:string,throughDate:string,
 executor:SqlExecutor=neonNotificationExecutor()):Promise<PublishedAssignmentWindowRead>{
 if(!isValidIsoDate(fromDate)||!isValidIsoDate(throughDate)||fromDate>throughDate)return unavailableWindow;
 try{assertEmployeeViewProof(proof);}catch{return unavailableWindow;}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),guards=employeeViewGuards(proof,workspace);
  const windowSql=`WITH clock AS MATERIALIZED (SELECT clock_timestamp() AS at),allowed AS MATERIALIZED (${employeeAllowedLocationsSql()}),
   own AS (${ownSelect('AND sh.date BETWEEN $3::date-1 AND $4::date ORDER BY sh.date,sh.start_time,sh.id LIMIT 501')})
   SELECT to_jsonb(clock.at) AS "observedAt",ARRAY(SELECT id FROM allowed ORDER BY id) AS "allowedLocationIds",
   COALESCE((SELECT jsonb_agg(to_jsonb(own)) FROM own),'[]'::jsonb) AS assignments FROM clock`;
  const results=await executor.transaction([...employeeReadLimits,...guards,{text:windowSql,values:[workspace.id,proof.employee.id,fromDate,throughDate]}],signal);
  const source=results[employeeReadLimits.length+guards.length]?.[0] as {observedAt:string;assignments:AssignmentRow[]}&SourceAuthority|undefined;
  if(!source||!validAllowedLocationIds(source.allowedLocationIds)||!Number.isFinite(Date.parse(source.observedAt))||!Array.isArray(source.assignments)||source.assignments.length>MAX_WINDOW_ROWS)return unavailableWindow;
  const first=businessDateStart(fromDate),last=businessDateStart(addDays(throughDate,1));
  const assignments=source.assignments.filter(row=>{const period=shiftPeriod(row);return period.end>first&&period.start<last;})
   .map(row=>assignment(row,workspace.timeZone));
  if(!await finalLocationAuthority(proof,workspace,source.allowedLocationIds,executor,signal))return unavailableWindow;
  return {state:'ready',observedAt:source.observedAt,timeZone:workspace.timeZone,assignments};
 }catch{return unavailableWindow;}
}
