'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {createCommunicationRecovery} from '@/lib/communications/recovery';
import {communicationRequest} from '@/lib/communications/client';
import {localDateTimeToInstant} from '@/lib/business-time';
import {validateCommunicationDraft} from '@/lib/communications/validation';
import type {CommandResult,CommunicationDraft} from '@/lib/communications/types';
import type {CommunicationRecoveryState} from '@/lib/communications/recovery';
import type {MessageFilter} from './messages-view';
import {useEmployeeMobile} from './use-mobile';
export type MessageMemory={search:string;filter:MessageFilter;cursors:string[]};
export type MessageDraft={title:string;body:string;locationId:string;businessDate:string;expiresAt:string};
export type MessageOrigin={source:'/app/notifications'|'/app/updates';id:string;target:string};
type Session={authority:string;core:string;lists:Record<'notifications'|'updates',MessageMemory>;setList:(kind:'notifications'|'updates',patch:Partial<MessageMemory>)=>void;draft:MessageDraft|null;setDraft:(value:MessageDraft|null)=>void;state:CommunicationRecoveryState;operationHref:string|null;commit:Extract<CommandResult,{status:'committed'}>|null;send:(command:unknown,href:string)=>void;lookup:()=>void;retry:()=>void;clear:()=>void;register:(read:()=>boolean,refresh:()=>void)=>()=>void;pause:()=>void;allowed:()=>boolean;origin:MessageOrigin|null;setOrigin:(value:MessageOrigin|null)=>void};
const Context=createContext<Session|null>(null),initial=():MessageMemory=>({search:'',filter:'all',cursors:[]});
export const useMessageSession=()=>useContext(Context);
export function EmployeeMessageProvider({authority,core,children}:{authority:string;core:string;children:ReactNode}){
 const router=useRouter(),[lists,setLists]=useState({notifications:initial(),updates:initial()}),[draft,setDraft]=useState<MessageDraft|null>(null),[origin,setOrigin]=useState<MessageOrigin|null>(null),[state,setState]=useState<CommunicationRecoveryState>({pending:false,notice:null,hasUnknown:false,canRetry:false}),[operationHref,setOperationHref]=useState<string|null>(null),[commit,setCommit]=useState<Extract<CommandResult,{status:'committed'}>|null>(null);
 const admission=useRef<{read:()=>boolean;refresh:()=>void}|null>(null),recovery=useRef<ReturnType<typeof createCommunicationRecovery>|null>(null);
 const allowed=()=>!!admission.current?.read()&&document.visibilityState!=='hidden'&&document.hasFocus()&&navigator.onLine;
 useEffect(()=>{
  const control=createCommunicationRecovery((path,body,signal)=>communicationRequest('employee',core,path,body,signal),setState,result=>{setCommit(result);admission.current?.refresh();router.refresh();});recovery.current=control;
  const pause=()=>control.authorize(false);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);const visible=()=>{if(document.visibilityState==='hidden')pause();};document.addEventListener('visibilitychange',visible);
  return()=>{control.stop();if(recovery.current===control)recovery.current=null;for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);document.removeEventListener('visibilitychange',visible);};
 },[core,router]);
 const register=useCallback((read:()=>boolean,refresh:()=>void)=>{const entry={read,refresh};admission.current=entry;return()=>{if(admission.current===entry){admission.current=null;recovery.current?.authorize(false);}};},[]);
 const pause=useCallback(()=>recovery.current?.authorize(false),[]);
 const prepare=()=>{const current=allowed();recovery.current?.authorize(current);return current;};
 const value:Session={authority,core,lists,setList:(kind,patch)=>setLists(previous=>({...previous,[kind]:{...previous[kind],...patch}})),draft,setDraft,state,operationHref,commit,origin,setOrigin,
  send:(command,href)=>{const control=recovery.current;if(!control||!prepare()||control.snapshot().pending||control.snapshot().hasUnknown)return;setCommit(null);setOperationHref(href);void control.send(command);},lookup:()=>{if(prepare())void recovery.current?.lookup();},retry:()=>{if(prepare())void recovery.current?.retry();},clear:()=>{const control=recovery.current;if(!control||control.snapshot().pending||control.snapshot().hasUnknown)return;control.clear();setCommit(null);setOperationHref(null);},register,pause,allowed};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
/** Presentation-only return context. Source pages still enforce their own access. */
export function EmployeeMessageReturn(){
 const session=useMessageSession(),pathname=usePathname(),mobile=useEmployeeMobile(),origin=session?.origin;
 if(!mobile||!origin||pathname!==origin.target.split(/[?#]/)[0]||pathname.startsWith('/app/updates/'))return null;
 return <div className="em-message-return"><Link href={origin.source+'#message-'+encodeURIComponent(origin.id)}>Back to {origin.source==='/app/notifications'?'notifications':'updates'}</Link></div>;
}
// A draft is never reconstructed from an outcome-unknown command or a new day.
export function todayMessageDraft(draft:MessageDraft,source:{businessDate:string;timeZone:string}):CommunicationDraft|null{
 if(draft.businessDate!==source.businessDate||!draft.locationId)return null;
 try{const value=validateCommunicationDraft({type:'TODAYS_TEAM',scope:{kind:'TODAYS_TEAM',locationId:draft.locationId,businessDate:draft.businessDate},title:draft.title,body:draft.body,acknowledgement:'OPTIONAL',expiresAt:draft.expiresAt?localDateTimeToInstant(draft.expiresAt,source.timeZone):null});return value.ok?value.value:null;}catch{return null;}
}
