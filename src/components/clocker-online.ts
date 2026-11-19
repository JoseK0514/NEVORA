'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';

/* Whether the tablet has a connection, as the browser reports it (Phase 6, RA-6 and MK-8). Presentation only: the kiosk
 * uses it to say plainly that nothing can be recorded and to check again by itself when the connection returns. It never
 * decides whether a punch is sent, kept or retried; those rules stay with the punch client and the journal.
 * The browser can report a connection that reaches nothing (a router with no internet), so a failed request still
 * shows its own state; this only adds what the tablet knows for certain: it has no network at all. */
function subscribe(listener:()=>void){
 window.addEventListener('online',listener);window.addEventListener('offline',listener);
 return()=>{window.removeEventListener('online',listener);window.removeEventListener('offline',listener);};
}
/** True while the browser reports a connection. On the server, and before the page is live, it reads as connected. */
export function useClockerOnline():boolean{
 return useSyncExternalStore(subscribe,()=>navigator.onLine!==false,()=>true);
}
/** Runs `action` once each time the connection comes back while `armed` is true. */
export function useWhenBackOnline(armed:boolean,action:()=>void){
 const latest=useRef(action);
 useEffect(()=>{latest.current=action;},[action]);
 useEffect(()=>{
  if(!armed)return;
  const back=()=>latest.current();
  window.addEventListener('online',back);return()=>window.removeEventListener('online',back);
 },[armed]);
}
