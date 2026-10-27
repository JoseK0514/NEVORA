'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeeMessages,type EmployeeMessages,type MessageView} from '@/lib/employee-messages';
import {useMessageSession} from './message-session';
export function useMessages(authority:string,view:MessageView,selection:string){
 const session=useMessageSession(),[state,setState]=useState<PrivatePanelState<EmployeeMessages>>({snapshot:null,paused:false,refreshing:true}),live=useRef<Extract<EmployeeMessages,{state:'ready'}>|null>(null),control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeMessages>>|null>(null);
 const pause=session?.pause,core=session?.core,register=session?.register;
 const allowed=useCallback(()=>{const read=live.current;if(!read||read.authority!==authority||read.view!==view||read.selection!==selection||!navigator.onLine||document.visibilityState==='hidden'||!document.hasFocus())return false;const path=window.location.pathname;return view==='notifications'?path==='/app/notifications':view==='updates'?path==='/app/updates':view==='compose'?path==='/app/updates/compose':path==='/app/updates/'+selection;},[authority,view,selection]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeeMessages>(next=>{const read=!next.paused&&next.snapshot?.state==='ready'&&next.snapshot.authority===authority&&next.snapshot.view===view&&next.snapshot.selection===selection?next.snapshot:null;live.current=read;if(!read)pause?.();setState(next);},async signal=>{const response=await fetch('/api/employee/messages/'+view+'/'+encodeURIComponent(selection),{credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};if(!response.ok)throw Error('Messages unavailable');return response.json();},value=>{const read=parseEmployeeMessages(value);return read.state==='ready'&&(read.authority!==authority||read.view!==view||read.selection!==selection||core&&read.communicationAuthority!==core)?{state:'unavailable',reason:'access_denied'}:read;},reason=>({state:'unavailable',reason}));
  control.current=controller;let mounted=true;const suspend=()=>{live.current=null;pause?.();controller.pause();},sync=()=>{suspend();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};document.addEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,suspend);for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);void Promise.resolve().then(()=>{if(mounted)sync();});
  return()=>{mounted=false;live.current=null;controller.stop();control.current=null;pause?.();document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,suspend);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,view,selection,core,pause]);
 const refresh=useCallback(()=>control.current?.refresh(),[]);
 // The provider holds an admission function, never a private read snapshot.
 useEffect(()=>register?.(()=>allowed()&&live.current?.updates==='on',refresh),[allowed,refresh,register]);
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.view===view&&state.snapshot.selection===selection?state.snapshot:null;
 return {state,read,refresh,allowed,current:()=>live.current};
}
