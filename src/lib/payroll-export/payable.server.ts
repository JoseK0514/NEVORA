import 'server-only';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {Period} from '../timecards/project';
import type {PayrollRun} from '../payroll/contracts';
import {parseConfiguration} from '../payroll/native/model';
import {classifyPayableHours,type PayableHoursResult} from '../payroll/native/payable-hours';
import {buildRecordedSourceCapture,projectRecordedSourceCapture} from '../payroll/native/recorded-source.server';
import {exactReadFence,nativeSchemaAvailable,nativeSourceRequest,nativeTimecardsFromCapture} from '../payroll/native/source.server';

type Facts={timeZone:string|null;profiles:Record<string,unknown>[];coverage:{employeeId:string;startDate:string;endDate:string}[]};
/** Payroll wage profiles and finalized-card coverage, the same rows native payroll reads. */
function payableFactsQuery(workspaceId:string,period:Period,ids:readonly string[]):SqlStatement{
 return {text:`SELECT (SELECT time_zone FROM workspaces WHERE id=$1 AND active) AS "timeZone",
 COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id) FROM native_payroll_profiles_current WHERE workspace_id=$1 AND employee_id=ANY($2::text[])),'[]'::jsonb) AS profiles,
 COALESCE((SELECT jsonb_agg(value ORDER BY employee_id,start_date,end_date) FROM (SELECT employee_id,start_date,end_date,jsonb_build_object('employeeId',employee_id,'startDate',start_date::text,'endDate',end_date::text) AS value FROM nevora_timecard_latest WHERE workspace_id=$1 AND employee_id=ANY($2::text[]) AND start_date<=$4::date+8 AND end_date>=$3::date-14 ORDER BY employee_id,start_date,end_date LIMIT 19201) selected),'[]'::jsonb) AS coverage`,values:[workspaceId,[...ids],period.startDate,period.endDate]};
}
const blocked=(code:string,reference:string|null=null):PayableHoursResult=>({state:'blocked',code,reference});
const codeOf=(error:unknown)=>{const e=error as Error&{code?:unknown};const text=typeof e?.code==='string'&&/^[A-Z][A-Z_]+$/.test(e.code)?e.code:e instanceof Error?e.message:'';return /^[A-Z][A-Z_]+$/.test(text)?text:'NATIVE_SOURCE_UNAVAILABLE';};

/**
 * Classify each employee's payable hours for an export period with the native payroll
 * engine over the same captured, finalized source native payroll uses (workweek and
 * seventh-day context included). Every read runs between the caller's authority
 * statements; the returned fences must run in the receipt transaction so the export
 * fails if any captured source changed. A SQL failure throws; missing payroll facts
 * return a blocked result per employee instead of a guessed number.
 */
export async function readPayableHours(workspaceId:string,period:Period,ids:readonly string[],executor:SqlExecutor,prefix:SqlStatement[],suffix:SqlStatement[]):Promise<{payable:Record<string,PayableHoursResult>;fences:SqlStatement[]}>{
 const payable:Record<string,PayableHoursResult>={},fences:SqlStatement[]=[];
 if(!await nativeSchemaAvailable(executor)){for(const id of ids)payable[id]=blocked('PAYROLL_SCHEMA_UNAVAILABLE');return {payable,fences};}
 const query=payableFactsQuery(workspaceId,period,ids),rows=(await executor.transaction([...prefix,query,...suffix]))[prefix.length] as Facts[];
 if(rows?.length!==1)throw new Error('Payable hours source unavailable');
 fences.push(exactReadFence(query,rows));
 const facts=rows[0];
 for(const id of ids){
  if(facts.timeZone!=='America/Puerto_Rico'){payable[id]=blocked('UNSUPPORTED_NATIVE_TIME_ZONE');continue;}
  const revision=facts.profiles.find(p=>p.employeeId===id);
  if(!revision){payable[id]=blocked('WAGE_PROFILE_REQUIRED');continue;}
  try{
   const configuration=parseConfiguration({schema:revision.schema,employeeId:revision.employeeId,wages:revision.wages,tax:revision.tax,deductions:revision.deductions,...(revision.calculationPolicyReference!==undefined?{calculationPolicyReference:revision.calculationPolicyReference}:{})});
   // nativeSourceRequest reads only the period from a run.
   const request=nativeSourceRequest(workspaceId,{period} as PayrollRun,id,configuration.wages,facts.coverage),captureQuery=buildRecordedSourceCapture(request);
   const captureRows=(await executor.transaction([...prefix,captureQuery,...suffix]))[prefix.length] as unknown[];
   if(captureRows?.length!==1)throw new Error('Payable hours source unavailable');
   fences.push(exactReadFence(captureQuery,captureRows));
   const capture=projectRecordedSourceCapture(request,captureRows[0]);
   if(capture.state!=='ready'){payable[id]=blocked(`RECORDED_SOURCE_${capture.reason.toUpperCase()}`);continue;}
   // There is no payday for a time export; the period end stands in for the payroll
   // policy's tax-year check only. Hours never depend on money.
   payable[id]=classifyPayableHours({employeeId:id,period,payday:period.endDate,timecards:nativeTimecardsFromCapture(id,capture),wages:configuration.wages,tax:configuration.tax,...(configuration.calculationPolicyReference!==undefined?{calculationPolicyReference:configuration.calculationPolicyReference}:{})});
  }catch(error){
   if(error instanceof Error&&error.message==='Payable hours source unavailable')throw error;
   if(error&&typeof error==='object'&&'code' in error&&/^[0-9A-Z]{5}$/.test(String((error as {code:unknown}).code))&&!/^[A-Z][A-Z_]+$/.test(String((error as {code:unknown}).code)))throw error;
   payable[id]=blocked(codeOf(error));
  }
 }
 return {payable,fences};
}
