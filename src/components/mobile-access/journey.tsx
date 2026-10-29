'use client';
import {createContext,useContext,useState,type InputHTMLAttributes,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';

type Journey={draftId:string;setDraftId:(value:string)=>void;confirmedId:string|null;confirm:(value:string)=>void;dismiss:()=>void};
const Context=createContext<Journey>({draftId:'',setDraftId:()=>{},confirmedId:null,confirm:()=>{},dismiss:()=>{}});
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
 const journey=useAccessJourney();
 return <input {...props} defaultValue={props.defaultValue??journey.draftId} onInput={event=>{const value=event.currentTarget.value;if(journey.draftId.trim().toUpperCase()!==value.trim().toUpperCase()){const email=document.getElementById('recovery-email');if(email instanceof HTMLInputElement)email.value='';}journey.setDraftId(value);props.onInput?.(event);}}/>;
}
