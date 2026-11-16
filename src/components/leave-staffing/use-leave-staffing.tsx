'use client';
import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {readStaffing,type StaffingAuthority,type StaffingRead,type StaffingSelection} from '@/lib/time-off-staffing/client';

/* The leave-staffing read for whoever is signed in (Nov 9, 2026). The app layout provides the actor and the requests view
 * binding (public freshness metadata; the session cookie and the server's guards decide). Pages ask for weeks and,
 * optionally, a request or a person. Like every private read here it pauses in the background and offline, and nothing
 * stays on screen past the read's lifetime: then it says the check expired, distinct from "no conflicts". */

const Authority=createContext<StaffingAuthority|null>(null);
export function LeaveStaffingProvider({authority,children}:{authority:StaffingAuthority|null;children:ReactNode}){
 return <Authority.Provider value={authority}>{children}</Authority.Provider>;
}
export const useStaffingAuthority=()=>useContext(Authority);

export type StaffingState={status:'loading'}|{status:'ready';read:Extract<StaffingRead,{state:'ready'}>}|{status:'unavailable';denied:boolean}|{status:'expired'}|{status:'paused'};

export function useLeaveStaffing(selection:StaffingSelection|null){
 const authority=useStaffingAuthority();
 const key=selection&&authority?JSON.stringify([authority,selection]):null;
 const [state,setState]=useState<StaffingState>({status:'loading'});
 const controller=useRef<{refresh():void}|null>(null);
 useEffect(()=>{
  if(!key||!authority||!selection)return;
  let expired=false;
  const c=createPrivateSnapshotController<StaffingRead>(value=>{
   if(value.paused){setState({status:'paused'});return;}
   // A re-read keeps the confirmed check on screen until the new one lands; the controller still clears it at expiry.
   if(value.refreshing){setState(previous=>previous.status==='ready'?previous:{status:'loading'});return;}
   const snapshot=value.snapshot;
   if(snapshot?.state==='ready'){expired=false;setState({status:'ready',read:snapshot});return;}
   setState(expired?{status:'expired'}:{status:'unavailable',denied:snapshot?.state==='unavailable'&&snapshot.reason==='access_denied'});
  },signal=>readStaffing(authority,selection,signal),value=>value as StaffingRead,reason=>({state:'unavailable',reason}),()=>{expired=true;return 'read_failed';});
  controller.current=c;
  const current=()=>{if(document.visibilityState==='visible'&&navigator.onLine)c.start();else c.pause();},pause=()=>c.pause();
  window.addEventListener('focus',current);window.addEventListener('online',current);window.addEventListener('offline',pause);window.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',current);current();
  return()=>{c.stop();controller.current=null;window.removeEventListener('focus',current);window.removeEventListener('online',current);window.removeEventListener('offline',pause);window.removeEventListener('pagehide',pause);document.removeEventListener('visibilitychange',current);};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- key carries authority and selection
 },[key]);
 // No authority (signed out) or nothing to check: unavailable, never "no conflicts".
 return useMemo(()=>({state:key?state:{status:'unavailable',denied:false} as StaffingState,refresh:()=>{setState({status:'loading'});controller.current?.refresh();}}),[key,state]);
}
