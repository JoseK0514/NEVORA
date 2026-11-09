'use client';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '../private-snapshot-client';
import type {CommunicationRead,CommunicationListRead,CommunicationContext,CommandResult} from './types';
import {createCommunicationRecovery,type CommunicationRecoveryState} from './recovery';
export type {CommunicationNotice} from './recovery';
export type CommunicationMode='employee'|'manager';
export type CommunicationResource=CommunicationRead|CommunicationListRead|CommunicationContext;
export type CommunicationLifetime={state:'ready';observedAt:string;validForMs:number;value:CommunicationResource}|{state:'unavailable';reason:string};
export const communicationHeaders=(authority:string)=>({'Accept':'application/json','X-Nevora-Communication':'1','X-Nevora-Communication-Authority':authority});
export async function communicationRequest(mode:CommunicationMode,authority:string,path='',body?:unknown,signal?:AbortSignal){
 const response=await fetch(`/api/${mode}/communications${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{...communicationHeaders(authority),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(response.status===401||response.status===403)return {state:'unauthorized',reason:'access_denied',httpStatus:response.status};
 return response.json();
}
export function parseCommunicationLifetime(value:unknown,authority:string):CommunicationLifetime{
 if(!value||typeof value!=='object')throw Error('Update unavailable');const v=value as CommunicationResource;
 if(v.state!=='ready'&&v.state!=='complete'&&v.state!=='partial')return {state:'unavailable',reason:v.state==='unauthorized'?('httpStatus'in v&&v.httpStatus===401?'session_ended':'access_denied'):v.state==='withdrawn'?'withdrawn':'read_failed'};
 if(v.authority!==authority)return {state:'unavailable',reason:'access_denied'};
 if(!Number.isFinite(Date.parse(v.observedAt))||!Number.isFinite(v.validForMs)||v.validForMs<=0||v.validForMs>45000)throw Error('Update unavailable');
 if(JSON.stringify(v).length>1_000_000)throw Error('Update unavailable');
 return {state:'ready',observedAt:v.observedAt,validForMs:v.validForMs,value:v};
}
export function useCommunicationResource(mode:CommunicationMode,authority:string,path:string,request?:(signal:AbortSignal)=>Promise<unknown>,onPause?:()=>void){
 const [state,setState]=useState<PrivatePanelState<CommunicationLifetime>>({snapshot:null,paused:false,refreshing:true});
 const ref=useRef<ReturnType<typeof createPrivateSnapshotController<CommunicationLifetime>>|null>(null);
 const requestRef=useRef(request),pauseRef=useRef(onPause);useEffect(()=>{requestRef.current=request;pauseRef.current=onPause;},[request,onPause]);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<CommunicationLifetime>(next=>{if(next.paused||!next.snapshot||next.snapshot.state==='unavailable')pauseRef.current?.();setState(next);},signal=>requestRef.current?requestRef.current(signal):communicationRequest(mode,authority,path,undefined,signal),value=>parseCommunicationLifetime(value,authority),reason=>({state:'unavailable',reason}),()=> 'read_failed');
  ref.current=controller;let mounted=true;
  const pause=()=>controller.pause(),sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;controller.stop();ref.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[mode,authority,path]);
 return {state,value:!state.paused&&state.snapshot?.state==='ready'?state.snapshot.value:null,refresh:()=>ref.current?.refresh()};
}
/** The controller survives temporary removal of private form content. */
export function useCommunicationAction(mode:CommunicationMode,authority:string,onCommit:(result:Extract<CommandResult,{status:'committed'}>)=>void,authorized=true,onBlocked?:()=>void){
 const [state,setState]=useState<CommunicationRecoveryState>({pending:false,notice:null,hasUnknown:false,canRetry:false});
 const commit=useRef(onCommit),blocked=useRef(onBlocked),currentAuthorization=useRef(authorized);useEffect(()=>{commit.current=onCommit;blocked.current=onBlocked;},[onCommit,onBlocked]);
 useEffect(()=>{currentAuthorization.current=authorized;},[authorized]);
 const control=useRef<ReturnType<typeof createCommunicationRecovery>|null>(null);
 useEffect(()=>{
  const controller=createCommunicationRecovery((path,body,signal)=>communicationRequest(mode,authority,path,body,signal),setState,result=>commit.current(result),()=>blocked.current?.());
  control.current=controller;controller.authorize(currentAuthorization.current);
  return ()=>{controller.stop();if(control.current===controller)control.current=null;};
 },[mode,authority]);
 useEffect(()=>{control.current?.authorize(authorized);},[authorized]);
 return {...state,setNotice:(notice:import('./recovery').CommunicationNotice)=>control.current?.setNotice(notice),send:(body:unknown)=>control.current?.send(body)??Promise.resolve(),lookup:()=>control.current?.lookup()??Promise.resolve(),retry:()=>control.current?.retry()??Promise.resolve(),clear:()=>control.current?.clear(),pause:()=>control.current?.authorize(false)};
}
