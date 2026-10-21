'use client';

import {useEffect,useRef,useState} from 'react';
import type {UserRole} from '@/lib/domain';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {readOperationalNavigation} from './commands';

const reloadCurrent=()=>window.location.reload();
function scopeIdentity(view:Extract<OperationalAuthorityView,{state:'ready'}>){return JSON.stringify([view.employeeId,view.role,view.source,view.scopeRevision,view.scope]);}
/** Navigation follows current server scope; the shared lifecycle owns stale replies. */
export function useOperationalNavigation(employeeId:string,role:UserRole,initial?:OperationalAuthorityView,onAccessChange:(reason:'identity'|'scope')=>void=reloadCurrent){
 const [state,setState]=useState<PrivatePanelState<OperationalAuthorityView>>({snapshot:initial??null,refreshing:false,paused:false});
 const controllerRef=useRef<ReturnType<typeof createPrivateSnapshotController<OperationalAuthorityView>>|null>(null);
 useEffect(()=>{
  if(role!=='MANAGER')return;
  let mounted=true,changed=false,baseline=initial?.state==='ready'?scopeIdentity(initial):null;
  function identityChanged(){if(!changed){changed=true;onAccessChange('identity');}}
  const controller=createPrivateSnapshotController<OperationalAuthorityView>(setState,async signal=>{
   const response=await fetch('/api/company-access/operational-authority',{cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'x-nevora-company-access':'1'},signal});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   const body=await response.json();
   if(!response.ok){const result=readOperationalNavigation(body);if(result.state==='unavailable'&&result.reason==='access_denied')return result;throw new Error('Current management access unavailable.');}
   return body;
  },value=>{
   const current=readOperationalNavigation(value);
   if(current.state==='unavailable'){if(current.reason==='access_denied')identityChanged();return current;}
   if(current.employeeId!==employeeId||current.role!==role){identityChanged();return {state:'unavailable',reason:'access_denied'};}
   if(baseline!==null&&scopeIdentity(current)!==baseline)onAccessChange('scope');
   baseline=scopeIdentity(current);return current;
  },reason=>({state:'unavailable',reason}),()=>{
   // The shared controller clears at the source deadline. Revalidate immediately
   // instead of waiting for its normal 30-second polling interval.
   queueMicrotask(()=>{if(mounted&&!changed)controller.refresh();});return 'read_failed';
  });
  controllerRef.current=controller;
  const pause=()=>controller.pause();
  const sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  queueMicrotask(()=>{if(mounted)sync();});
  return()=>{mounted=false;controller.stop();controllerRef.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[employeeId,role,initial,onAccessChange]);
 const view=!state.paused?state.snapshot:null;
 return {view:view?.state==='ready'&&(view.employeeId!==employeeId||view.role!==role)?null:view,refreshing:state.refreshing,paused:state.paused,retry:()=>controllerRef.current?.refresh()};
}
