'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeeExchange,type EmployeeExchangeSnapshot,type EmployeeResponseKind} from '@/lib/employee-exchange';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {EmployeeRequestOperation} from './request-operation';
import {useEmployeeMobile} from './use-mobile';
import {EmployeeExchangeView,type ExchangeMode} from './exchange-view';
function Recovery({operation,onRetry,onRefresh}:{operation:EmployeeRequestOperation;onRetry:(operation:EmployeeRequestOperation)=>void;onRefresh:()=>void}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const settled=!!operation.state.result&&['completed','pending','closed'].includes(operation.state.result.status);
 useEffect(()=>{if(settled)onRefresh();},[settled,onRefresh]);
 return <section className="em-request-notice" aria-label="Unconfirmed response"><p role="status">{operation.state.pending?'Your previous response is being checked.':'A previous response may have been saved. Check its status before sending it again.'}</p>{operation.state.uncertain?<button type="button" className="em-request-secondary" disabled={operation.state.pending} onClick={()=>onRetry(operation)}>Check previous response</button>:null}</section>;
}
export function ResponsiveEmployeeExchange({authority,mode,selection=null,children}:{authority:string;mode:ExchangeMode;selection?:string|null;children:ReactNode}){
 const mobile=useEmployeeMobile();
 return mobile?<div className="em-requests-mobile"><EmployeeMobileExchange key={authority} authority={authority} mode={mode} selection={selection}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading requests…</p></div></>;
}
function EmployeeMobileExchange({authority,mode,selection}:{authority:string;mode:ExchangeMode;selection:string|null}){
 const [state,setState]=useState<PrivatePanelState<EmployeeExchangeSnapshot>>({snapshot:null,refreshing:true,paused:false}),[operations,setOperations]=useState(()=>new Map<string,EmployeeRequestOperation>());
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeExchangeSnapshot>>|null>(null);
 const lifetime=useRef<{selection:string|null;revision:number|null;allowed:EmployeeResponseKind[]}|null>(null),pathname=usePathname();
 const focusReturn=useRef<string|null>(null);
 const refresh=useCallback(()=>control.current?.refresh(),[]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeeExchangeSnapshot>(next=>{
   const read=!next.paused&&next.snapshot?.state==='ready'&&next.snapshot.authority===authority&&next.snapshot.selection===selection?next.snapshot:null;
   lifetime.current=read?.enabled?{selection,revision:read.detail?.summary.revision??null,allowed:read.detail?.checks.filter(check=>check.allowed).map(check=>check.kind)??[]}:null;
   const summary=read?.detail?.summary;
   if(summary?.revision)setOperations(previous=>{
    const old=previous.get(summary.id);if(old&&(old.revision===summary.revision||old.state.pending||old.state.uncertain))return previous;
    return new Map(previous).set(summary.id,new EmployeeRequestOperation(summary.id,summary.revision!));
   });
   setState(next);
  },async signal=>{
   const response=await fetch('/api/employee/exchange'+(selection?'/'+encodeURIComponent(selection):''),{credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Request unavailable');return response.json();
  },value=>{const read=parseEmployeeExchange(value);return read.state==='ready'&&(read.authority!==authority||read.selection!==selection)?{state:'unavailable',reason:'access_denied'}:read;},reason=>({state:'unavailable',reason}),()=>'read_failed');
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause(),sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return()=>{mounted=false;lifetime.current=null;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,pathname,selection]);
 useEffect(()=>{
  if(selection){focusReturn.current=null;return;}
  if(state.paused||state.snapshot?.state!=='ready'||state.snapshot.selection!==null)return;
  let hash:string;try{hash=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
  if(!hash||focusReturn.current===hash)return;
  const rows=mode==='incoming'?state.snapshot.incoming:state.snapshot.activity;if(rows===null)return;
  focusReturn.current=hash;
  const element=rows?.some(row=>'exchange-request-'+row.id===hash)?document.getElementById(hash):document.querySelector<HTMLElement>('.em-exchange h1');
  element?.focus();element?.scrollIntoView({block:'center'});
 },[selection,mode,state]);
 const operation=selection?operations.get(selection)??null:null;
 const currentPath=()=>window.location.pathname==='/app/exchange';
 const respond=(kind:EmployeeResponseKind)=>{
  if(!operation||!navigator.onLine)return;
  void operation.respond(kind,shiftChangeAction,()=>currentPath()&&new URL(window.location.href).searchParams.get('requestId')===operation.requestId&&lifetime.current?.selection===operation.requestId&&lifetime.current.revision===operation.revision&&lifetime.current.allowed.includes(kind));
 };
 const retry=useCallback((op:EmployeeRequestOperation)=>{if(navigator.onLine)void op.retry(reconcileShiftChangeAction,shiftChangeAction,()=>window.location.pathname==='/app/exchange'&&lifetime.current!==null);},[]);
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.selection===selection?state.snapshot:null;
 const recoveries=read?.enabled?[...operations.values()].filter(op=>op.requestId!==selection&&(op.state.pending||op.state.uncertain)).map(op=><Recovery key={op.requestId} operation={op} onRetry={retry} onRefresh={refresh}/>):null;
 return <EmployeeExchangeView state={state} authority={authority} mode={mode} selection={selection} operation={operation} onRefresh={refresh} onRespond={respond} onRetry={()=>{if(operation)retry(operation);}} recoveries={recoveries}/>;
}
