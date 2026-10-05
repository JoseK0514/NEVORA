import 'server-only';
import type { SqlStatement } from '../notifications/types';
import type { PunchCommand, PunchState, PunchEntry, PunchErrorCode } from './punch-command';
import { ClockerPunchError } from './punch-command';
export const sql=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});
export const punchTime="current_setting('nevora.clocker_punch_at')::timestamptz";
export const iso=(field:string)=>`to_char(${field} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
export const entryJson=(alias:string)=>`jsonb_build_object(
 'id',${alias}.id,'version',${alias}.version,'locationId',${alias}.location_id,'status',${alias}.status,
 'clockInAt',${iso(alias+'.clock_in_at')},'clockOutAt',${iso(alias+'.clock_out_at')},
 'breaks',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'version',b.version,
 'startAt',${iso('b.break_start_at')},'endAt',${iso('b.break_end_at')}) ORDER BY b.break_start_at,b.id)
 FROM break_entries b WHERE b.time_entry_id=${alias}.id),'[]'::jsonb))`;
export const stateJson=`jsonb_build_object('revision',COALESCE((SELECT revision FROM clocker_employee_state WHERE employee_id=$1),0),
 'currentEntry',(SELECT ${entryJson('t')} FROM time_entries t WHERE t.employee_id=$1 AND t.clock_out_at IS NULL))`;
export function checkSql(condition:string,values:readonly unknown[],code:PunchErrorCode):SqlStatement{
 return sql(`SELECT (CASE WHEN ${condition} THEN '1' ELSE 'clocker_punch_${code}' END)::integer`,values);
}
/** Validate persisted state, never silently repair conflicting history. */
export function checkedState(value:PunchState):PunchState{
 if(!value||!Number.isInteger(value.revision)||value.revision<0)throw new ClockerPunchError('UNAVAILABLE');
 const entry=value.currentEntry;if(entry===null)return value;
 if(!entry||!Number.isInteger(entry.version)||entry.version<1||entry.clockOutAt!==null||!Array.isArray(entry.breaks)||
   !['CLOCKED_IN','ON_BREAK'].includes(entry.status))throw new ClockerPunchError('UNAVAILABLE');
 const stamp=(s:string)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(s)&&Number.isFinite(Date.parse(s));
 if(!stamp(entry.clockInAt))throw new ClockerPunchError('UNAVAILABLE');
 let latest=entry.clockInAt,open=0;
 for(const pause of entry.breaks){
  if(open||!Number.isInteger(pause.version)||pause.version<1||!stamp(pause.startAt)||pause.startAt<latest||
    (pause.endAt!==null&&(!stamp(pause.endAt)||pause.endAt<pause.startAt)))throw new ClockerPunchError('UNAVAILABLE');
  if(pause.endAt===null)open++;latest=pause.endAt??pause.startAt;
 }
 if((entry.status==='ON_BREAK')!==(open===1))throw new ClockerPunchError('UNAVAILABLE');
 return value;
}
export function checkExpected(command:PunchCommand,state:PunchState,locationId:string){
 const entry=state.currentEntry,pause=entry?.breaks.find(b=>b.endAt===null);
 if(command.expectedRevision!==state.revision||command.expectedEntryId!==(entry?.id??null)||
   command.expectedEntryVersion!==(entry?.version??null)||command.expectedBreakId!==(pause?.id??null)||
   command.expectedBreakVersion!==(pause?.version??null))throw new ClockerPunchError('STALE');
 if(entry&&entry.locationId!==locationId)throw new ClockerPunchError('WRONG_LOCATION');
 if((command.action==='CLOCK_IN'&&entry)||(command.action!=='CLOCK_IN'&&!entry)||
   (command.action==='START_BREAK'&&entry?.status!=='CLOCKED_IN')||
   (command.action==='END_BREAK'&&entry?.status!=='ON_BREAK'))throw new ClockerPunchError('TRANSITION');
}
export function mutations(command:PunchCommand,state:PunchState,employeeId:string,deviceId:string,locationId:string,newEntryId:string,newBreakId:string):{
 statements:SqlStatement[];entryId:string;
}{
 const before=state.currentEntry,entryId=before?.id??newEntryId;
 const version=(before?.version??0)+1;
 const status: PunchEntry['status']=command.action==='CLOCK_OUT'?'CLOCKED_OUT':command.action==='START_BREAK'?'ON_BREAK':'CLOCKED_IN';
 const result:SqlStatement[]=[
  sql('INSERT INTO clocker_employee_state(employee_id) VALUES($1) ON CONFLICT DO NOTHING',[employeeId]),
  sql("SELECT set_config('nevora.clocker_punch_at',clock_timestamp()::text,true)"),
  checkSql(`NOT EXISTS(SELECT 1 FROM time_entries t WHERE t.employee_id=$1 AND (t.clock_in_at>${punchTime} OR t.clock_out_at>${punchTime}))
   AND NOT EXISTS(SELECT 1 FROM break_entries b JOIN time_entries t ON t.id=b.time_entry_id WHERE t.employee_id=$1
    AND (b.break_start_at>${punchTime} OR b.break_end_at>${punchTime}))`,[employeeId],'UNAVAILABLE'),
 ];
 if(command.action==='CLOCK_IN'){
  result.push(sql(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,created_at,updated_at)
   VALUES($1,$2,$3,$4,${punchTime},'CLOCKED_IN',${punchTime},${punchTime})`,[entryId,employeeId,locationId,deviceId]));
 }else{
  if(command.action==='START_BREAK')result.push(sql(`INSERT INTO break_entries(id,time_entry_id,break_start_at)
    VALUES($1,$2,${punchTime})`,[newBreakId,entryId]));
  if(command.expectedBreakId)result.push(sql(`UPDATE break_entries SET break_end_at=${punchTime},version=version+1
    WHERE id=$1 AND time_entry_id=$2 AND break_end_at IS NULL`,[command.expectedBreakId,entryId]));
  result.push(sql(`UPDATE time_entries SET status=$2,clock_out_at=CASE WHEN $2='CLOCKED_OUT' THEN ${punchTime} ELSE NULL END,
    version=version+1,updated_at=${punchTime} WHERE id=$1 AND employee_id=$3 AND clock_out_at IS NULL`,[entryId,status,employeeId]));
 }
 result.push(sql('UPDATE clocker_employee_state SET revision=revision+1 WHERE employee_id=$1',[employeeId]));
 result.push(checkSql(`EXISTS(SELECT 1 FROM time_entries WHERE id=$1 AND employee_id=$2 AND version=$3 AND status=$4
   AND updated_at=${punchTime} AND (CASE WHEN $4='CLOCKED_OUT' THEN clock_out_at=${punchTime} ELSE clock_out_at IS NULL END))
   AND (SELECT revision FROM clocker_employee_state WHERE employee_id=$2)=$5
   AND (SELECT count(*) FROM break_entries WHERE time_entry_id=$1 AND break_end_at IS NULL)=$6`,
   [entryId,employeeId,version,status,state.revision+1,status==='ON_BREAK'?1:0],'UNAVAILABLE'));
 if(command.action==='START_BREAK')result.push(checkSql(`EXISTS(SELECT 1 FROM break_entries WHERE id=$1 AND time_entry_id=$2 AND version=1 AND break_start_at=${punchTime} AND break_end_at IS NULL)`,[newBreakId,entryId],'UNAVAILABLE'));
 if(command.expectedBreakId)result.push(checkSql(`EXISTS(SELECT 1 FROM break_entries WHERE id=$1 AND time_entry_id=$2 AND version=$3 AND break_end_at=${punchTime})`,[command.expectedBreakId,entryId,command.expectedBreakVersion!+1],'UNAVAILABLE'));
 return {statements:result,entryId};
}
