'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {BusinessApiResult,BusinessCommand} from '@/lib/owner-advisor/business/contracts';
import type {BusinessOutcome} from './business-client';
import {newRequestId} from './business-client';
import type {BusinessCtx} from './business-page';

type ReadState={[K in 'idle'|'loading'|'hidden'|'failed'|'gone']:{kind:K}}['idle'|'loading'|'hidden'|'failed'|'gone']|{kind:'ready';result:BusinessApiResult;until:number};
const foreground=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();
const ACTIVE_FOR=120000;
/** Display authority is a monotonic lease, independent from publication receipts
 * and unresolved write custody. Renewal never cancels the old expiry. */
export function useBusinessRead(ctx:BusinessCtx,request:(signal:AbortSignal,fresh:boolean)=>Promise<BusinessOutcome>,accept:(result:BusinessApiResult)=>boolean,auto:boolean,onFresh?:(result:BusinessApiResult)=>void){
 const [state,setState]=useState<ReadState>({kind:auto?'loading':'idle'});
 const latest=useRef({ctx,request,accept,onFresh});latest.current={ctx,request,accept,onFresh};
 const generation=useRef(0),mounted=useRef(false),focused=useRef(true),active=useRef<AbortController|null>(null),lastActive=useRef(0),deadline=useRef(0);
 const timers=useRef<{end?:ReturnType<typeof setTimeout>;renew?:ReturnType<typeof setTimeout>}>({});
 const retire=useCallback((kind:'idle'|'hidden'|'failed'|'gone'='hidden')=>{
  generation.current++;active.current?.abort();active.current=null;deadline.current=0;
  clearTimeout(timers.current.end);clearTimeout(timers.current.renew);timers.current={};
  if(mounted.current)setState({kind});
 },[]);
 const read=useCallback(async(quiet=false)=>{
  if(!mounted.current||!focused.current||!foreground())return;
  const current=++generation.current,controller=new AbortController();active.current?.abort();active.current=controller;
  clearTimeout(timers.current.renew);
  if(!quiet){clearTimeout(timers.current.end);deadline.current=0;setState({kind:'loading'});}
  const now=latest.current,outcome=await now.request(controller.signal,!quiet);
  if(!mounted.current||!focused.current||current!==generation.current||!foreground())return;
  active.current=null;
  if(outcome.kind==='refused'&&outcome.code==='forbidden'){retire();now.ctx.revoke();return;}
  if(outcome.kind!=='ok'||!now.accept(outcome.result)){retire(outcome.kind==='refused'&&outcome.code==='invalid'?'gone':outcome.kind==='refused'&&outcome.code==='conflict'?'hidden':'failed');return;}
  const result=outcome.result;
  if(now.ctx.authority&&result.authority!==now.ctx.authority){retire();now.ctx.revoke();return;}
  deadline.current=performance.now()+result.validForMs;
  clearTimeout(timers.current.end);
  now.onFresh?.(result);setState({kind:'ready',result,until:deadline.current});
  timers.current.end=setTimeout(()=>retire(),result.validForMs);
  timers.current.renew=setTimeout(()=>{if(performance.now()-lastActive.current<ACTIVE_FOR&&!latest.current.ctx.busy)void read(true);},Math.max(1,Math.min(30000,result.validForMs*.7)));
 },[retire]);
 useEffect(()=>{
  mounted.current=true;focused.current=foreground();lastActive.current=performance.now();
  if(auto)queueMicrotask(()=>{if(mounted.current)void read(true);});
  const activity=()=>{lastActive.current=performance.now();};
  const away=()=>{focused.current=false;retire();};
  const visible=()=>{if(document.visibilityState==='hidden')away();else focused.current=foreground();};
  const back=()=>{focused.current=foreground();};
  window.addEventListener('pointerdown',activity,true);window.addEventListener('keydown',activity,true);window.addEventListener('scroll',activity,true);
  window.addEventListener('blur',away);window.addEventListener('offline',away);window.addEventListener('pagehide',away);window.addEventListener('focus',back);window.addEventListener('online',back);document.addEventListener('visibilitychange',visible);
  return()=>{mounted.current=false;retire();window.removeEventListener('pointerdown',activity,true);window.removeEventListener('keydown',activity,true);window.removeEventListener('scroll',activity,true);window.removeEventListener('blur',away);window.removeEventListener('offline',away);window.removeEventListener('pagehide',away);window.removeEventListener('focus',back);window.removeEventListener('online',back);document.removeEventListener('visibilitychange',visible);};
 },[auto,read,retire]);
 return{state,read,clear:()=>retire('idle'),current:()=>focused.current&&foreground()&&performance.now()<deadline.current};
}

type FullRead=Extract<BusinessCommand,{op:'read_source_version'|'read_coverage_map'}>;
/** The same full-read command renews observation, not its publication lifetime.
 * Only an explicit fresh review mints another identity and acknowledgement. */
export function useBusinessReview(ctx:BusinessCtx,make:(requestId:string)=>FullRead,accept:(result:BusinessApiResult)=>boolean,onReview:(result:BusinessApiResult)=>void,onReset:()=>void){
 const command=useRef<FullRead|null>(null),handle=useRef<string|null>(null),publicationDeadline=useRef(0);
 const observation=useBusinessRead(ctx,(signal,fresh)=>{
  if(fresh){command.current=null;handle.current=null;publicationDeadline.current=0;onReset();}
  if(handle.current&&performance.now()>=publicationDeadline.current)return Promise.resolve({kind:'unavailable'});
  command.current??=make(newRequestId());return ctx.client.send(command.current,signal);
 },accept,true,result=>{
  const end=performance.now()+Math.max(0,Date.parse(result.readReceiptExpiresAt!)-Date.parse(result.observedAt)-(15000-result.validForMs)-3000);
  publicationDeadline.current=handle.current===result.readReceiptId?Math.min(publicationDeadline.current,end):end;
  handle.current=result.readReceiptId;onReview(result);
 });
 return{...observation,publishable:()=>observation.current()&&performance.now()<publicationDeadline.current};
}
