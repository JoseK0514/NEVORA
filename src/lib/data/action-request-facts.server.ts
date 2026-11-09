import 'server-only';
import type {ActionItem} from '../action-center/project';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type {Workspace} from '../domain';
import {managerLocationsSql,managerScopeStatements,readManagerScopeStorage} from './manager-location-scope.server';
import {managementSessionStatements} from './management-session';
import {workspaceReadGuard} from './workspaces';
import {durationMinutes} from '../date-utils';
import {durationText} from '../duration-text';
import {currentShiftTermsSql} from './shift-change-release';
export type ActionRequestFacts={startDate:string;endDate:string;partialDay?:{start:string;end:string};lengthText:string;locationName:string;note?:string;reviewHref:string};
type FactRow={kind:'TIME_OFF'|'EXCHANGE'|'CALLOUT';id:string;start_date:string;end_date:string;start_time:string|null;end_time:string|null;location_name:string;note:string|null};
export function projectActionRequestFact(row:FactRow):ActionRequestFacts {
  const start=row.start_time?.slice(0,5),end=row.end_time?.slice(0,5),days=Math.round((Date.parse(row.end_date)-Date.parse(row.start_date))/86400000)+1;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)||!/^\d{4}-\d{2}-\d{2}$/.test(row.end_date)||!(days>0))throw Error('Invalid request dates');
  return {startDate:row.start_date,endDate:row.end_date,...(start&&end?{partialDay:{start,end}}:{}),
    lengthText:start&&end?durationText(durationMinutes(start,end)):`${days} ${days===1?'day':'days'}`,locationName:row.location_name,
    ...(row.note?{note:row.note}:{}),reviewHref:row.kind==='TIME_OFF'?`/app/requests?tab=pending&requestId=${encodeURIComponent(row.id)}&from=inbox`:`/app/exchange?tab=requests&requestId=${encodeURIComponent(row.id)}`};
}
/** Enrich only requests already present in this actor's protected action read.
 * Missing optional facts keep the existing full-review fallback, never fake data. */
export async function withActionRequestFacts(proof:SessionMutationProof,workspace:Workspace,items:ActionItem[],executor:SqlExecutor):Promise<ActionItem[]> {
  const ids=(kind:string)=>items.filter(i=>i.type===kind&&i.id.startsWith(kind+':')).map(i=>i.id.slice(kind.length+1));
  const timeOff=ids('TIME_OFF'),exchanges=ids('EXCHANGE'),callouts=ids('CALLOUT');
  if(!timeOff.length&&!exchanges.length&&!callouts.length)return items;
  try {
    const storage=await readManagerScopeStorage(executor),guards=[...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...managerScopeStatements(storage,workspace.id,proof.employee.id),...managementSessionStatements(proof,proof.employee.id)];
    const result=await executor.transaction([...guards,{text:`WITH scope AS (${managerLocationsSql(storage,'$1','$2')})
      SELECT 'TIME_OFF' AS kind,r.id,r.start_date::text,r.end_date::text,r.start_time::text,r.end_time::text,l.short_name AS location_name,r.reason AS note
        FROM time_off_requests r JOIN employees e ON e.id=r.employee_id JOIN locations l ON l.id=e.primary_location_id AND l.active AND l.id IN (SELECT id FROM scope) WHERE r.id=ANY($3::text[])
      UNION ALL SELECT 'EXCHANGE',x.id,s.date::text,s.date::text,s.start_time::text,s.end_time::text,l.short_name,NULL
        FROM shift_exchanges x JOIN shifts s ON s.id=x.source_shift_id JOIN schedules sc ON sc.id=s.schedule_id JOIN locations l ON l.id=sc.location_id AND l.active AND l.id IN (SELECT id FROM scope) WHERE x.id=ANY($4::text[]) AND x.source_terms=${currentShiftTermsSql('s','sc')}
      UNION ALL SELECT 'CALLOUT',c.id,s.date::text,s.date::text,s.start_time::text,s.end_time::text,l.short_name,c.reason_note
        FROM shift_callouts c JOIN shifts s ON s.id=c.shift_id JOIN schedules sc ON sc.id=s.schedule_id JOIN locations l ON l.id=sc.location_id AND l.active AND l.id IN (SELECT id FROM scope) WHERE c.id=ANY($5::text[]) AND c.source_terms=${currentShiftTermsSql('s','sc')}`,values:[workspace.id,proof.employee.id,timeOff,exchanges,callouts]},...managementSessionStatements(proof,proof.employee.id)],AbortSignal.timeout(8000));
    const rows=(result[guards.length]??[]) as FactRow[],facts=new Map(rows.map(row=>[row.kind+':'+row.id,projectActionRequestFact(row)]));
    return items.map(item=>facts.has(item.id)?{...item,request:facts.get(item.id)}:item);
  }catch{return items;}
}
