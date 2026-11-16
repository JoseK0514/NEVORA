'use client';
import {createContext,useContext,useEffect,useState,type InputHTMLAttributes,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

type Journey={draftId:string;setDraftId:(value:string)=>void;confirmedId:string|null;confirm:(value:string)=>void;dismiss:()=>void};
/* Without the provider (mobile Access off) a just-activated Employee ID still reaches Sign in at every width (inspection
 * Nov 14, 2026, PB-003): confirm() holds it in this module's memory for that one in-app navigation; the next ID field
 * shows it and drops it. Browser only (set from a click), never stored, never sent. */
let handoffId:string|null=null;
const Context=createContext<Journey>({draftId:'',setDraftId:()=>{},confirmedId:null,confirm:value=>{handoffId=value;},dismiss:()=>{handoffId=null;}});
export const useAccessJourney=()=>useContext(Context);

/** UI continuity only. No proof/password, browser storage or authorization is held here. */
export function AccessJourneyProvider({children}:{children:ReactNode}) {
 const [draftId,setDraftId]=useState(''),[confirmedId,setConfirmedId]=useState<string|null>(null);
 const pathname=usePathname(),[previous,setPrevious]=useState(pathname);
 if(previous!==pathname){
  setPrevious(pathname);
  // Reset before the public page mounts its uncontrolled ID field. An effect is too late.
  if(previous.startsWith('/app')&&!pathname.startsWith('/app')){setDraftId('');setConfirmedId(null);}
 }
 return <Context.Provider value={{draftId,setDraftId,confirmedId,confirm:value=>{setDraftId(value);setConfirmedId(value);},dismiss:()=>setConfirmedId(null)}}>{children}</Context.Provider>;
}
export function AccessEmployeeIdInput(props:InputHTMLAttributes<HTMLInputElement>) {
 const journey=useAccessJourney(),[handedOff]=useState(()=>handoffId??'');
 useEffect(()=>{handoffId=null;},[]);
 return <input {...props} defaultValue={props.defaultValue??(journey.draftId||handedOff)} onInput={event=>{const value=event.currentTarget.value;if(journey.draftId.trim().toUpperCase()!==value.trim().toUpperCase()){const email=document.getElementById('recovery-email');if(email instanceof HTMLInputElement)email.value='';}journey.setDraftId(value);props.onInput?.(event);}}/>;
}
