import {createPrivateSnapshotController} from './private-snapshot-client';
import {parseEmployeeTime,type EmployeeTime} from './employee-time';
export type EmployeeTimePanelState={time:EmployeeTime|null;refreshing:boolean;paused:boolean};
export function createEmployeeTimeController(changed:(state:EmployeeTimePanelState)=>void,request:(signal:AbortSignal)=>Promise<unknown>){
 return createPrivateSnapshotController<EmployeeTime>(({snapshot,refreshing,paused})=>changed({time:snapshot,refreshing,paused}),request,parseEmployeeTime,reason=>({state:'unavailable',reason}));
}
export async function fetchEmployeeTime(signal:AbortSignal,authority?:string):Promise<EmployeeTime>{
 const response=await fetch('/api/employee/my-time',{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{'Accept':'application/json','X-Nevora-My-Time':'1',...(authority?{'X-Nevora-Correction-Authority':authority}:{})}});
 if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
 if(!response.ok)throw Error('Recorded time is unavailable');
 return parseEmployeeTime(await response.json());
}
