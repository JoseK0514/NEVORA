import {createPrivateSnapshotController} from './private-snapshot-client';
import type { ClockMonitor } from './time-clock';
import { parseClockMonitor } from './clock-monitor';
export type MonitorPanelState={monitor:ClockMonitor|null;refreshing:boolean;paused:boolean};

/** Preserve the existing Manager API while sharing the verified lifecycle engine. */
export function createMonitorController(changed:(state:MonitorPanelState)=>void,request:(signal:AbortSignal)=>Promise<unknown>){
 return createPrivateSnapshotController<ClockMonitor>(({snapshot,refreshing,paused})=>changed({monitor:snapshot,refreshing,paused}),request,parseClockMonitor,reason=>({state:'unavailable',reason}));
}

export async function fetchClockMonitor(signal:AbortSignal):Promise<ClockMonitor>{
 const response=await fetch('/api/manager/clock-monitor',{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal,
  headers:{'Accept':'application/json','X-Nevora-Monitor':'1'}});
 if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
 if(!response.ok)throw Error('Live activity unavailable');
 return parseClockMonitor(await response.json());
}
