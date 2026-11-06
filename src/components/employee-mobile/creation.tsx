'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {creationKey,creationPayload,parseEmployeeCreation,type CreationDraft,type CreationMode,type EmployeeCreationSnapshot} from '@/lib/employee-creation';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {EmployeeCreationOperation} from './creation-operation';
import {useEmployeeMobile} from './use-mobile';
import {CreationView} from './creation-view';
import {RequestsWaitB} from '../employee-b/requests-b';
export function ResponsiveEmployeeCreation({authority,mode,sourceId,children}:{authority:string;mode:CreationMode;sourceId:string;children:ReactNode}){
 const mobile=useEmployeeMobile();return mobile?<div className="em-requests-mobile"><EmployeeMobileCreation key={authority+'|'+mode+'|'+sourceId} authority={authority} mode={mode} sourceId={sourceId}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your shift…</p>
  {/* Direction B: the phone's first frame is this form's hero, checking (phones only). */}
  <RequestsWaitB page={mode} text="Checking your current shift and options…"/></div></>;
}
function EmployeeMobileCreation({authority,mode,sourceId}:{authority:string;mode:CreationMode;sourceId:string}){
 const [state,setState]=useState<PrivatePanelState<EmployeeCreationSnapshot>>({snapshot:null,refreshing:true,paused:false}),[draft,setDraft]=useState<CreationDraft>({sourceKey:null,targetKey:null,reason:'',note:''}),[operation]=useState(()=>new EmployeeCreationOperation());
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeCreationSnapshot>>|null>(null),live=useRef<Extract<EmployeeCreationSnapshot,{state:'ready'}>|null>(null),pathname=usePathname();
 const refresh=useCallback(()=>control.current?.refresh(),[]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeeCreationSnapshot>(next=>{
   const read=!next.paused&&next.snapshot?.state==='ready'&&next.snapshot.authority===authority&&next.snapshot.mode===mode&&next.snapshot.selection===sourceId?next.snapshot:null;
   live.current=read?.enabled?read:null;
   if(read?.source)setDraft(previous=>previous.sourceKey===null?{...previous,sourceKey:creationKey(read.source!.fields)}:previous);
   setState(next);
  },async signal=>{
   const response=await fetch('/api/employee/creation/'+mode+'/'+encodeURIComponent(sourceId),{credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Creation unavailable');return response.json();
  },value=>{const read=parseEmployeeCreation(value);return read.state==='ready'&&(read.authority!==authority||read.mode!==mode||read.selection!==sourceId)?{state:'unavailable',reason:'access_denied'}:read;},reason=>({state:'unavailable',reason}),()=>'read_failed');
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause(),sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return()=>{mounted=false;live.current=null;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,mode,sourceId,pathname]);
 const currentPath=()=>{const url=new URL(window.location.href);return mode==='callout'?url.pathname==='/app/exchange/callout'&&url.searchParams.get('shiftId')===sourceId:url.pathname==='/app/exchange/swap'&&url.searchParams.get('sourceShiftId')===sourceId&&(url.searchParams.get('mode')==='cover'?'cover':'swap')===mode;};
 const submit=()=>{
  const read=live.current;if(!read||!navigator.onLine)return;const data=creationPayload(read,draft);if(!data)return;
  void operation.submit(data,shiftChangeAction,()=>currentPath()&&live.current===read&&creationPayload(read,draft)!==null);
 };
 return <CreationView state={state} authority={authority} mode={mode} sourceId={sourceId} draft={draft} operation={operation} onDraft={patch=>setDraft(previous=>({...previous,...patch}))} onReview={()=>{const source=live.current?.source;if(source)setDraft(previous=>({...previous,sourceKey:creationKey(source.fields),targetKey:null}));}} onRefresh={refresh} onSubmit={submit} onRetry={()=>{if(navigator.onLine)void operation.retry(reconcileShiftChangeAction,shiftChangeAction,()=>currentPath()&&live.current!==null);}}/>;
}
