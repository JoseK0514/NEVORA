'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {parseEmployeeExchange,type EmployeeExchangeSnapshot,type EmployeeResponseKind} from '@/lib/employee-exchange';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {EmployeeRequestOperation} from './request-operation';
import {useEmployeeBScreen,useEmployeeWideScreen} from './use-mobile';
import {EmployeeExchangeView,ExchangePaneView,type ExchangeMode} from './exchange-view';
import {RequestsWaitB} from '../employee-b/requests-b';
import {focusShown} from '../employee-b/focus';
/** An earlier response that still needs checking. `look="b"` draws it as a Direction B card; that copy passes
 * `effects={false}` so the refresh after it settles runs once. */
function Recovery({operation,onRetry,onRefresh,look='corp',effects=true}:{operation:EmployeeRequestOperation;onRetry:(operation:EmployeeRequestOperation)=>void;onRefresh:()=>void;look?:'corp'|'b';effects?:boolean}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const settled=!!operation.state.result&&['completed','pending','closed'].includes(operation.state.result.status);
 useEffect(()=>{if(effects&&settled)onRefresh();},[effects,settled,onRefresh]);
 const text=operation.state.pending?'Your previous response is being checked.':'A previous response may have been saved. Check its status before sending it again.';
 if(look==='b')return <section className="b-card" aria-label="Unconfirmed response"><div className="eb-status"><p className="b-state" role="status">{text}</p>{operation.state.uncertain?<button type="button" className="b-btn b-btn--quiet b-btn--full" disabled={operation.state.pending} onClick={()=>onRetry(operation)}>Check previous response</button>:null}</div></section>;
 return <section className="em-request-notice" aria-label="Unconfirmed response"><p role="status">{text}</p>{operation.state.uncertain?<button type="button" className="em-request-secondary" disabled={operation.state.pending} onClick={()=>onRetry(operation)}>Check previous response</button>:null}</section>;
}
export function ResponsiveEmployeeExchange({authority,mode,selection=null,children}:{authority:string;mode:ExchangeMode;selection?:string|null;children:ReactNode}){
 const mobile=useEmployeeBScreen();
 return mobile?<div className="em-requests-mobile"><EmployeeMobileExchange key={authority} authority={authority} mode={mode} selection={selection}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading requests…</p>
  {/* Direction B: the phone's first frame is this page's hero, checking (phones only). */}
  <RequestsWaitB page={selection?mode==='incoming'?'detail-foryou':'detail-mine':mode==='incoming'?'foryou':'mine'} text="Checking your current requests…"/></div></>;
}
/** The private read of Pick up and swap (the list, or one request with `selection`), its response operations and their
 * recoveries. `stillShown` says whether the request a response is for is still the one on screen. */
function useExchangeRead(authority:string,selection:string|null,stillShown:(requestId:string)=>boolean){
 const [state,setState]=useState<PrivatePanelState<EmployeeExchangeSnapshot>>({snapshot:null,refreshing:true,paused:false}),[operations,setOperations]=useState(()=>new Map<string,EmployeeRequestOperation>());
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeExchangeSnapshot>>|null>(null);
 const lifetime=useRef<{selection:string|null;revision:number|null;allowed:EmployeeResponseKind[]}|null>(null),pathname=usePathname();
 const refresh=useCallback(()=>control.current?.refresh(),[]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeeExchangeSnapshot>(next=>{
   const read=!next.paused&&next.snapshot?.state==='ready'&&next.snapshot.authority===authority&&next.snapshot.selection===selection?next.snapshot:null;
   lifetime.current=read?.enabled?{selection,revision:read.detail?.summary.revision??null,allowed:read.detail?.checks.filter(check=>check.allowed).map(check=>check.kind)??[]}:null;
   const summary=read?.detail?.summary;
   if(summary?.revision)setOperations(previous=>{
    const old=previous.get(summary.id);if(old&&(old.revision===summary.revision||old.state.pending||old.state.uncertain))return previous;
    const next=new EmployeeRequestOperation(summary.id,summary.revision!),settled=old?.state.result&&['completed','pending','closed'].includes(old.state.result.status);
    next.receipt=settled&&old.kind?{kind:old.kind,result:old.state.result!}:old?.receipt??null;
    return new Map(previous).set(summary.id,next);
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
 const operation=selection?operations.get(selection)??null:null;
 const currentPath=()=>window.location.pathname==='/app/exchange';
 const respond=(kind:EmployeeResponseKind)=>{
  if(!operation||!navigator.onLine)return;
  void operation.respond(kind,shiftChangeAction,()=>currentPath()&&stillShown(operation.requestId)&&lifetime.current?.selection===operation.requestId&&lifetime.current.revision===operation.revision&&lifetime.current.allowed.includes(kind));
 };
 const retry=useCallback((op:EmployeeRequestOperation)=>{if(navigator.onLine)void op.retry(reconcileShiftChangeAction,shiftChangeAction,()=>window.location.pathname==='/app/exchange'&&lifetime.current!==null);},[]);
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.selection===selection?state.snapshot:null;
 const recovering=read?.enabled?[...operations.values()].filter(op=>op.requestId!==selection&&(op.state.pending||op.state.uncertain)):null;
 const recoveries=recovering?.map(op=><Recovery key={op.requestId} operation={op} onRetry={retry} onRefresh={refresh}/>)??null;
 const recoveriesB=recovering?.map(op=><Recovery key={op.requestId} look="b" effects={false} operation={op} onRetry={retry} onRefresh={refresh}/>)??null;
 const recoveriesPane=recovering?.map(op=><Recovery key={op.requestId} look="b" operation={op} onRetry={retry} onRefresh={refresh}/>)??null;
 return {state,read,operation,refresh,respond,retry,recoveries,recoveriesB,recoveriesPane};
}
function EmployeeMobileExchange({authority,mode,selection}:{authority:string;mode:ExchangeMode;selection:string|null}){
 // The page's own request is the one in the address (?requestId=…).
 const x=useExchangeRead(authority,selection,requestId=>new URL(window.location.href).searchParams.get('requestId')===requestId);
 const {state,operation,refresh,respond,retry}=x;
 const focusReturn=useRef<string|null>(null),focusedDetail=useRef<string|null>(null);
 useEffect(()=>{
  if(selection){
   focusReturn.current=null;
   // The row that opened this request is gone; its heading takes focus once its details have loaded.
   if(!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.selection===selection&&focusedDetail.current!==selection){focusedDetail.current=selection;focusShown(document.querySelector<HTMLElement>('.em-exchange h1'),document.getElementById('b-exchange-detail-title'));}
   return;
  }
  focusedDetail.current=null;
  if(state.paused||state.snapshot?.state!=='ready'||state.snapshot.selection!==null)return;
  let hash:string;try{hash=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
  if(!hash||focusReturn.current===hash)return;
  const rows=mode==='incoming'?state.snapshot.incoming:state.snapshot.activity;if(rows===null)return;
  focusReturn.current=hash;
  const element=rows?.some(row=>'exchange-request-'+row.id===hash)?focusShown(document.getElementById(hash),document.getElementById('b-'+hash)):focusShown(document.querySelector<HTMLElement>('.em-exchange h1'),document.getElementById('b-exchange-title'));
  element?.scrollIntoView({block:'center'});
 },[selection,mode,state]);
 // Desktop (1024px and wider), For you: the list and the chosen request side by side. The request's details come from its
 // own read (the same one its page uses), fetched when it's chosen; phones and tablets keep opening the request's page.
 const wide=useEmployeeWideScreen(),[chosen,setChosen]=useState<string|null>(null),[focusKey,setFocusKey]=useState(0);
 const incoming=mode==='incoming'&&!selection&&x.read?.enabled?x.read.incoming:null;
 const shown=wide&&incoming?.length?(incoming.some(row=>row.id===chosen)?chosen!:incoming[0].id):null;
 const split=shown?{chosen:shown,onChoose:(id:string,keyboard:boolean)=>{setChosen(id);if(keyboard)setFocusKey(key=>key+1);},
  pane:<ExchangePane authority={authority} selection={shown} focusKey={focusKey} onSettled={refresh} onBack={()=>focusShown(document.getElementById('b-exchange-request-'+shown))}/>}:null;
 return <EmployeeExchangeView state={state} authority={authority} mode={mode} selection={selection} operation={operation} onRefresh={refresh} onRespond={respond} onRetry={()=>{if(operation)retry(operation);}} recoveries={x.recoveries} recoveriesB={x.recoveriesB} split={split}/>;
}
/** The desktop For you pane: one request's details and response, read on its own. A response is sent only while this
 * pane still shows that request and the address is still the For you list. */
function ExchangePane({authority,selection,focusKey,onSettled,onBack}:{authority:string;selection:string;focusKey:number;onSettled:()=>void;onBack:()=>void}){
 const current=useRef(selection);
 useEffect(()=>{current.current=selection;},[selection]);
 const x=useExchangeRead(authority,selection,requestId=>current.current===requestId&&!new URL(window.location.href).searchParams.get('requestId'));
 const {refresh}=x,settled=useCallback(()=>{refresh();onSettled();},[refresh,onSettled]);
 // Enter on a row: once this request has been checked, its heading (or the pane) takes focus.
 const focused=useRef(0),checked=!!x.read||(!x.state.refreshing&&!(x.state.snapshot?.state==='ready'&&x.state.snapshot.selection!==selection));
 useEffect(()=>{if(focusKey&&focused.current!==focusKey&&checked){focused.current=focusKey;focusShown(document.getElementById('b-xpane-s-h'),document.getElementById('b-xpane'));}},[focusKey,checked,selection]);
 return <ExchangePaneView state={x.state} authority={authority} selection={selection} operation={x.operation} onRefresh={settled} onRespond={x.respond} onRetry={()=>{if(x.operation)x.retry(x.operation);}} recoveries={x.recoveriesPane} onBack={onBack}/>;
}
