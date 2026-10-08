'use client';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '../private-snapshot-client';
import type {CommunicationRead,CommunicationListRead,CommunicationContext,CommandResult} from './types';
export type CommunicationMode='employee'|'manager';
export type CommunicationResource=CommunicationRead|CommunicationListRead|CommunicationContext;
export type CommunicationLifetime={state:'ready';observedAt:string;validForMs:number;value:CommunicationResource}|{state:'unavailable';reason:string};
export const communicationHeaders=(authority:string)=>({'Accept':'application/json','X-Nevora-Communication':'1','X-Nevora-Communication-Authority':authority});
export async function communicationRequest(mode:CommunicationMode,authority:string,path='',body?:unknown,signal?:AbortSignal){
 const response=await fetch(`/api/${mode}/communications${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{...communicationHeaders(authority),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(response.status===401||response.status===403)return {state:'unauthorized',reason:'access_denied'};
 return response.json();
}
export function parseCommunicationLifetime(value:unknown,authority:string):CommunicationLifetime{
 if(!value||typeof value!=='object')throw Error('Update unavailable');const v=value as CommunicationResource;
 if(v.state!=='ready'&&v.state!=='complete'&&v.state!=='partial')return {state:'unavailable',reason:v.state==='unauthorized'?'access_denied':v.state==='withdrawn'?'withdrawn':'read_failed'};
 if(v.authority!==authority)return {state:'unavailable',reason:'access_denied'};
 if(!Number.isFinite(Date.parse(v.observedAt))||!Number.isFinite(v.validForMs)||v.validForMs<=0||v.validForMs>45000)throw Error('Update unavailable');
 if(JSON.stringify(v).length>1_000_000)throw Error('Update unavailable');
 return {state:'ready',observedAt:v.observedAt,validForMs:v.validForMs,value:v};
}
export function useCommunicationResource(mode:CommunicationMode,authority:string,path:string,request?:(signal:AbortSignal)=>Promise<unknown>){
 const [state,setState]=useState<PrivatePanelState<CommunicationLifetime>>({snapshot:null,paused:false,refreshing:true});
 const ref=useRef<ReturnType<typeof createPrivateSnapshotController<CommunicationLifetime>>|null>(null);
 const requestRef=useRef(request);useEffect(()=>{requestRef.current=request;},[request]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<CommunicationLifetime>(setState,signal=>requestRef.current?requestRef.current(signal):communicationRequest(mode,authority,path,undefined,signal),value=>parseCommunicationLifetime(value,authority),reason=>({state:'unavailable',reason}),()=> 'read_failed');
  ref.current=controller;let mounted=true;
  const pause=()=>controller.pause(),sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;controller.stop();ref.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[mode,authority,path]);
 return {state,value:!state.paused&&state.snapshot?.state==='ready'?state.snapshot.value:null,refresh:()=>ref.current?.refresh()};
}
export type CommunicationNotice='conflict'|'unknown'|'blocked'|'unavailable'|'committed'|null;
/** Mutation completion is fenced to this mounted private view. No storage retry,
 * optimistic acknowledgement or new operation ID after an ambiguous response. */
export function useCommunicationAction(mode:CommunicationMode,authority:string,onCommit:(result:Extract<CommandResult,{status:'committed'}>)=>void){
 const [pending,setPending]=useState(false),[notice,setNotice]=useState<CommunicationNotice>(null);
 const op=useRef<string|null>(null),generation=useRef(0),abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>{generation.current++;abort.current?.abort();},[]);
 async function run(body?:unknown){
  if(pending)return;const sequence=++generation.current;setPending(true);setNotice(null);const controller=new AbortController();abort.current=controller;
  if(body&&typeof body==='object'&&'operationId'in body)op.current=String(body.operationId);
  try{
   const result=await communicationRequest(mode,authority,body===undefined?'/operations/'+op.current:'',body,controller.signal) as CommandResult;
   if(sequence!==generation.current)return;
   if(result.status==='committed'){op.current=null;setNotice('committed');onCommit(result);}
   else if(result.status==='conflict'||result.status==='blocked'){op.current=null;setNotice(result.status);}
   else if('state'in result&&result.state==='unauthorized'){op.current=null;setNotice('blocked');}
   else setNotice(op.current?'unknown':'unavailable');
  }catch{if(sequence===generation.current)setNotice(op.current?'unknown':'unavailable');}
  finally{if(sequence===generation.current){setPending(false);abort.current=null;}}
 }
 return {pending,notice,setNotice,send:run,lookup:()=>run(),hasUnknown:notice==='unknown'};
}
