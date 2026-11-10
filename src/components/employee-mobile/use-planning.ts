'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeePlanning,type EmployeePlanningSnapshot,type PlanningView,type PlanningResult} from '@/lib/employee-planning';
import {offlineListener} from '@/lib/offline-hold';
export function usePlanning(authority:string,view:PlanningView,selection:string){
 const [state,setState]=useState<PrivatePanelState<EmployeePlanningSnapshot>>({snapshot:null,paused:false,refreshing:true});
 const live=useRef<Extract<EmployeePlanningSnapshot,{state:'ready'}>|null>(null),control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeePlanningSnapshot>>|null>(null);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeePlanningSnapshot>(next=>{live.current=!next.paused&&next.snapshot?.state==='ready'&&next.snapshot.authority===authority&&next.snapshot.view===view&&next.snapshot.selection===selection&&next.snapshot.enabled?next.snapshot:null;setState(next);},async signal=>{
   const response=await fetch('/api/employee/planning/'+view+'/'+encodeURIComponent(selection),{credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Planning unavailable');return response.json();
  },value=>{const read=parseEmployeePlanning(value);return read.state==='ready'&&(read.authority!==authority||read.view!==view||read.selection!==selection)?{state:'unavailable',reason:'access_denied'}:read;},reason=>({state:'unavailable',reason}),()=>'read_failed');
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause(),sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);const offline=offlineListener({pause:()=>controller.pause(),hold:()=>controller.hold()});for(const e of ['blur','pagehide'])window.addEventListener(e,pause);window.addEventListener('offline',offline);for(const e of ['focus','pageshow','online','storage'])window.addEventListener(e,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return()=>{mounted=false;live.current=null;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const e of ['blur','pagehide'])window.removeEventListener(e,pause);window.removeEventListener('offline',offline);for(const e of ['focus','pageshow','online','storage'])window.removeEventListener(e,sync);};
 },[authority,view,selection]);
 const refresh=useCallback(()=>control.current?.refresh(),[]);
 const accept=useCallback((result:PlanningResult)=>{if(result.state==='denied'){live.current=null;control.current?.pause();setState({snapshot:{state:'unavailable',reason:'access_denied'},paused:false,refreshing:false});}else if(result.state==='complete'||result.state==='disabled'||result.state==='conflict'||result.state==='locked')control.current?.refresh();},[]);
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.view===view&&state.snapshot.selection===selection?state.snapshot:null;
 const allowed=()=>{const current=live.current;if(!current||!navigator.onLine)return false;const url=new URL(window.location.href);return view==='timeoff'?url.pathname==='/app/requests'&&(url.searchParams.get('tab')==='new'?'new':url.searchParams.get('requestId')||'list')===selection:url.pathname==='/app/availability'&&(url.searchParams.get('week')||'normal')===selection;};
 return {state,read,live,refresh,accept,allowed};
}
