import type {GenerationSource} from './generation-guards';
import type {GenerationAssignment} from '../scheduling/generation/types';
import type {WeekendHistory} from '../scheduling/generation/weekend-rotation';
import {calloutReleasesShift} from '../shift-changes/terms';
import {addDays} from '../date-utils';

/** Latest publication per week is authoritative over staged live edits. Legacy
 * published/archived weeks without a revision retain their actual stored rows. */
export function mapWeekendHistory(source:GenerationSource,workspaceId:string,timeZone:string,targetWeek:string):WeekendHistory{
 const firstWeek=addDays(targetWeek,-56),inHorizon=(week:unknown)=>typeof week==='string'&&week>=firstWeek&&week<targetWeek;
 const locations=new Set(source.locations.filter(l=>l.workspace_id===workspaceId).map(l=>String(l.id)));
 const schedules=source.schedules.filter(s=>locations.has(String(s.location_id))&&['PUBLISHED','ARCHIVED'].includes(String(s.status))&&inHorizon(s.week_start));
 const scheduleMap=new Map(schedules.map(s=>[s.id,s]));
 const latest=new Map<string,Record<string,unknown>>();
 for(const revision of source.schedule_publication_revisions){
  if(!inHorizon(revision.week_start))continue;
  const week=String(revision.week_start),old=latest.get(week);
  if(!old||Number(revision.revision_number)>Number(old.revision_number))latest.set(week,revision);
 }
 // Archived parents do not prove absence in a location: later whole-week
 // publications may omit them. Positive attributable rows are retained below.
 const knownWeeks=[...new Set([...schedules.map(s=>String(s.week_start)),...latest.keys()])].sort().map(weekStart=>({weekStart,locationIds:[...new Set(schedules.filter(s=>s.week_start===weekStart&&s.status==='PUBLISHED').map(s=>String(s.location_id)))].sort()}));
 const assignments:GenerationAssignment[]=[];
 const revisionMap=new Map([...latest.values()].map(r=>[r.id,r]));
 for(const row of source.schedule_publication_revision_shifts){
  const revision=revisionMap.get(row.revision_id);
  if(!revision||latest.get(String(revision.week_start))?.id!==row.revision_id||!locations.has(String(row.location_id)))continue;
  if(scheduleMap.get(row.schedule_id)?.status==='ARCHIVED')continue;
  assignments.push({id:String(row.source_shift_id??`${row.revision_id}:${row.id}`),employeeId:String(row.employee_id),scheduleId:String(row.schedule_id),locationId:String(row.location_id),date:String(row.date),startTime:String(row.start_time).slice(0,5),endTime:String(row.end_time).slice(0,5),scheduleStatus:'PUBLISHED',isCalloutApproved:row.is_callout_approved===true,hasExchangeHistory:false,hasCalloutHistory:false,hasPublicationHistory:true});
 }
 for(const row of source.shifts){
  const parent=scheduleMap.get(row.schedule_id);if(!parent||parent.status==='PUBLISHED'&&latest.has(String(parent.week_start)))continue;
  const schedule={id:String(parent.id),locationId:String(parent.location_id),weekStart:String(parent.week_start),status:parent.status as 'PUBLISHED'|'ARCHIVED'};
  const published=parent.status==='ARCHIVED'&&latest.has(String(parent.week_start))?source.schedule_publication_revision_shifts.filter(p=>p.source_shift_id===row.id&&p.location_id===parent.location_id&&p.employee_id===row.employee_id&&p.date===row.date&&String(p.start_time).slice(0,5)===String(row.start_time).slice(0,5)&&String(p.end_time).slice(0,5)===String(row.end_time).slice(0,5)).sort((a,b)=>Number(source.schedule_publication_revisions.find(r=>r.id===b.revision_id)?.revision_number??0)-Number(source.schedule_publication_revisions.find(r=>r.id===a.revision_id)?.revision_number??0))[0]:undefined;
  if(parent.status==='ARCHIVED'&&latest.has(String(parent.week_start))&&!published)continue;
  assignments.push({id:String(row.id),employeeId:String(row.employee_id),scheduleId:String(row.schedule_id),locationId:String(parent.location_id),date:String(row.date),startTime:String(row.start_time).slice(0,5),endTime:String(row.end_time).slice(0,5),scheduleStatus:parent.status as 'PUBLISHED'|'ARCHIVED',isCalloutApproved:published?.is_callout_approved===true||source.shift_callouts.some(c=>calloutReleasesShift(c,row,schedule,workspaceId,timeZone)),hasExchangeHistory:false,hasCalloutHistory:false,hasPublicationHistory:!!published});
 }
 const employeeSince:Record<string,string>={};
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
 for(const employee of source.employees){
  if(!locations.has(String(employee.primary_location_id))||employee.created_at==null)continue;
  const date=new Date(String(employee.created_at));if(!Number.isFinite(date.getTime()))continue;
  const parts=formatter.formatToParts(date),part=(type:string)=>parts.find(p=>p.type===type)?.value;
  employeeSince[String(employee.id)]=`${part('year')}-${part('month')}-${part('day')}`;
 }
 return {knownWeeks,employeeSince,assignments};
}
