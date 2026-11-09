import {createPrivateSnapshotController} from './private-snapshot-client';
import {parseEmployeeTime,type EmployeeTime} from './employee-time';
export type EmployeeTimePanelState={time:EmployeeTime|null;refreshing:boolean;paused:boolean};
/** Adapts the shared expiring-read lifecycle to the employee time panel's state shape. */
export function createEmployeeTimeController(changed:(state:EmployeeTimePanelState)=>void,request:(signal:AbortSignal)=>Promise<unknown>){
 return createPrivateSnapshotController<EmployeeTime>(({snapshot,refreshing,paused})=>changed({time:snapshot,refreshing,paused}),request,parseEmployeeTime,reason=>({state:'unavailable',reason}));
}
/**
 * Reads current recorded time without browser caching. The optional binding
 * accompanies the session cookie; it is not a substitute for authentication.
 * Access denial is terminal panel state; transport/server failures throw so the
 * lifecycle controller can clear stale data and schedule a read retry.
 */
export async function fetchEmployeeTime(signal:AbortSignal,authority?:string):Promise<EmployeeTime>{
 const response=await fetch('/api/employee/my-time',{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{'Accept':'application/json','X-Nevora-My-Time':'1',...(authority?{'X-Nevora-Correction-Authority':authority}:{})}});
 if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
 if(!response.ok)throw Error('Recorded time is unavailable');
 return parseEmployeeTime(await response.json());
}
