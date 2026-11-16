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
import {Temporal} from '@js-temporal/polyfill';
import {isValidIsoDate} from '../date-utils';
import {requestShift,validateRequestFacts,type ActionRequestFacts,type RequestStatus} from '../action-center/request-facts';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
export type {ActionRequestFacts} from '../action-center/request-facts';
type FactRow={exchange_kind?:'SWAP'|'COVERAGE'|null;kind:'TIME_OFF'|'EXCHANGE'|'CALLOUT';id:string;start_date:string;end_date:string;start_time:string|null;end_time:string|null;location_name:string;note:string|null;counterpart_name?:string|null;
 time_zone?:string;status?:string;created_at?:string;counterpart_shift?:{date:string;startTime:string;endTime:string;locationName:string}|null};
export function projectActionRequestFact(row:FactRow):ActionRequestFacts {
 const start=row.start_time?.slice(0,5),end=row.end_time?.slice(0,5),days=Math.round((Date.parse(row.end_date)-Date.parse(row.start_date))/86400000)+1;
 if(!isValidIsoDate(row.start_date)||!isValidIsoDate(row.end_date)||!(days>0))throw Error('Invalid request dates');
 const counterpart=row.counterpart_shift;
 const result:ActionRequestFacts={...(row.kind==='EXCHANGE'&&row.exchange_kind?{exchangeKind:row.exchange_kind}:{}),startDate:row.start_date,endDate:row.end_date,...(start&&end?{partialDay:{start,end}}:{}),
  lengthText:start&&end?durationText(durationMinutes(start,end)):`${days} ${days===1?'day':'days'}`,locationName:row.location_name,
  ...(row.note?{note:row.note}:{}),...(row.counterpart_name?{counterpartName:row.counterpart_name}:{}),
  ...(row.status?{status:row.status as RequestStatus}:{}),...(row.created_at?{createdAt:Temporal.Instant.from(row.created_at).toString()}:{}),
  ...(row.time_zone&&start&&end&&row.kind!=='TIME_OFF'?{shift:requestShift(row.start_date,start,end,row.location_name,row.time_zone)}:{}),
  ...(row.exchange_kind==='SWAP'&&row.time_zone?{counterpartShift:counterpart?{state:'ready' as const,...requestShift(counterpart.date,counterpart.startTime,counterpart.endTime,counterpart.locationName,row.time_zone)}:{state:'unavailable' as const,reason:'details_unavailable' as const}}:{}),
  reviewHref:row.kind==='TIME_OFF'?`/app/requests?tab=pending&requestId=${encodeURIComponent(row.id)}&from=inbox`:`/app/exchange?tab=requests&requestId=${encodeURIComponent(row.id)}`};
 validateRequestFacts(result);return result;
}
/** Enrich only requests already present in this actor's protected action read.
 * Missing optional facts keep the existing full-review fallback, never fake data. */
export async function withActionRequestFacts(proof:SessionMutationProof,workspace:Workspace,items:ActionItem[],executor:SqlExecutor):Promise<ActionItem[]> {
  const ids=(kind:string)=>items.filter(i=>i.type===kind&&i.id.startsWith(kind+':')).map(i=>i.id.slice(kind.length+1));
  const timeOff=ids('TIME_OFF'),exchanges=ids('EXCHANGE'),callouts=ids('CALLOUT');
  if(!timeOff.length&&!exchanges.length&&!callouts.length)return items;
  try {
    const access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor);
    if(access.workspace.id!==workspace.id)throw Error('Request fact scope changed');
    const authority=()=>operationalScopeStatements(proof,workspace,{kind:'COMPANY'},access.authority);
    const storage=await readManagerScopeStorage(executor),guards=[...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...authority(),...managerScopeStatements(storage,workspace.id,proof.employee.id),...managementSessionStatements(proof,proof.employee.id)];
    const result=await executor.transaction([...guards,{text:`WITH scope AS (${managerLocationsSql(storage,'$1','$2')})
      SELECT 'TIME_OFF' AS kind,r.id,r.start_date::text,r.end_date::text,r.start_time::text,r.end_time::text,l.short_name AS location_name,r.reason AS note,NULL::text AS counterpart_name,NULL::text AS exchange_kind,r.status,r.created_at::text,NULL::jsonb AS counterpart_shift
        FROM time_off_requests r JOIN employees e ON e.id=r.employee_id JOIN locations l ON l.id=e.primary_location_id AND l.active AND l.id IN (SELECT id FROM scope) WHERE r.id=ANY($3::text[])
      UNION ALL SELECT 'EXCHANGE',x.id,s.date::text,s.date::text,s.start_time::text,s.end_time::text,l.short_name,NULL,
        CASE WHEN counterpart.active AND (x.kind<>'SWAP' OR (x.target_terms=${currentShiftTermsSql('ts','tsc')} AND tsc.location_id IN (SELECT id FROM scope))) THEN trim(counterpart.first_name||' '||counterpart.last_name) END,x.kind AS exchange_kind,x.status,x.created_at::text,
        CASE WHEN x.kind='SWAP' AND counterpart.active AND tl.active AND ts.employee_id=x.target_employee_id AND x.target_terms=${currentShiftTermsSql('ts','tsc')} AND tsc.location_id IN (SELECT id FROM scope)
         THEN jsonb_build_object('date',ts.date::text,'startTime',left(ts.start_time::text,5),'endTime',left(ts.end_time::text,5),'locationName',tl.short_name) END
        FROM shift_exchanges x JOIN shifts s ON s.id=x.source_shift_id JOIN schedules sc ON sc.id=s.schedule_id JOIN locations l ON l.id=sc.location_id AND l.active AND l.id IN (SELECT id FROM scope) LEFT JOIN employees counterpart ON counterpart.id=x.target_employee_id LEFT JOIN shifts ts ON ts.id=x.target_shift_id LEFT JOIN schedules tsc ON tsc.id=ts.schedule_id LEFT JOIN locations tl ON tl.id=tsc.location_id WHERE x.id=ANY($4::text[]) AND x.source_terms=${currentShiftTermsSql('s','sc')}
      UNION ALL SELECT 'CALLOUT',c.id,s.date::text,s.date::text,s.start_time::text,s.end_time::text,l.short_name,c.reason_note,NULL::text,NULL::text,c.status,c.created_at::text,NULL::jsonb
        FROM shift_callouts c JOIN shifts s ON s.id=c.shift_id JOIN schedules sc ON sc.id=s.schedule_id JOIN locations l ON l.id=sc.location_id AND l.active AND l.id IN (SELECT id FROM scope) WHERE c.id=ANY($5::text[]) AND c.source_terms=${currentShiftTermsSql('s','sc')}`,values:[workspace.id,proof.employee.id,timeOff,exchanges,callouts]},...authority(),...managementSessionStatements(proof,proof.employee.id)],AbortSignal.timeout(8000));
    const rows=(result[guards.length]??[]) as FactRow[],facts=new Map(rows.map(row=>[row.kind+':'+row.id,projectActionRequestFact({...row,time_zone:workspace.timeZone})]));
    return items.map(item=>facts.has(item.id)?{...item,request:facts.get(item.id)}:item);
  }catch{return items;}
}
