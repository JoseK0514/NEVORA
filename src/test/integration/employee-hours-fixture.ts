import {randomUUID} from 'node:crypto';
import {saveBreakType} from '../../lib/clocker/break-types.server';
import type {SqlExecutor} from '../../lib/notifications/types';
import {fixtureProof} from './shift-change-api';
import {registerClockerDevice,redeemClockerEnrollment} from '../../lib/clocker/devices.server';
/** Fictional records only, inside an invocation-owned disposable database. No device credential is exposed to the browser. */
export async function seedEmployeeHours(executor:SqlExecutor,actor:string,label:string){
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>executor.query<T>({text,values});
 const owner=await fixtureProof(executor,'QAOWNER');const pending=await registerClockerDevice({employeeId:'QAOWNER',sessionTokenHash:owner.sessionTokenHash},{name:'QA hours '+label,locationId:'loc-1'},executor);
 const device=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},executor);
 const entryId='hours-'+label,breakId=entryId+'-break',startAt=new Date(Date.now()-3*86400000-5*3600000).toISOString(),endAt=new Date(Date.parse(startAt)+4*3600000).toISOString();
 const breakStart=new Date(Date.parse(startAt)+2*3600000).toISOString(),breakEnd=new Date(Date.parse(breakStart)+15*60000).toISOString();
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,$4,$5,'CLOCKED_OUT',4)",[entryId,actor,device.device.id,startAt,endAt]);
 const type=await saveBreakType({employeeId:'QAOWNER',sessionTokenHash:owner.sessionTokenHash},{name:'Rest break '+label,category:'REST',targetMinutes:15,active:true,expectedVersion:0},executor);
 await q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot) VALUES($1,$2,$3,$4,2,$5,$6)",[breakId,entryId,breakStart,breakEnd,type.id,JSON.stringify({id:type.id,version:type.version,name:type.name,category:type.category,targetMinutes:type.targetMinutes})]);
 return {entryId,breakId,startAt,endAt,breakStart,breakEnd,deviceId:device.device.id,unusedId:randomUUID()};
}
