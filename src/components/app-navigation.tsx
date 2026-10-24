'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {createIdentityReload,createNavigationCoordinator,onRouterTransition,type NavigationCoordinator} from '@/lib/navigation-coordinator';

const NavigationContext=createContext<NavigationCoordinator|null>(null);
export const useAppNavigation=()=>useContext(NavigationContext);
export function AppNavigationProvider({children}:{readonly children:ReactNode}){
 const [coordinator]=useState(createNavigationCoordinator);
 const pathname=usePathname(),search=useSearchParams()?.toString();
 const address=(pathname??'')+(search?'?'+search:'');
 const committed=useRef(address);
 useEffect(()=>{committed.current=address;coordinator.committed(address);},[address,coordinator]);
 useEffect(()=>{
  const restore=()=>{coordinator.begin(committed.current,window.location.pathname+window.location.search,'history');};
  window.addEventListener('popstate',restore);
  // Router navigations started outside a link (a server redirect's replace, router.push or replace) are pending
  // too, from their start until the router commits. Same-origin only; history is handled by popstate above.
  const stopTransitions=onRouterTransition(href=>{
   const target=new URL(href,window.location.href);
   if(target.origin===window.location.origin)coordinator.transition(window.location.pathname+window.location.search,target.pathname+target.search);
  });
  // A page restored from the back-forward cache left its navigation behind (a failed router navigation falls back to
  // a browser navigation): nothing is in flight any more.
  const resumed=(event:PageTransitionEvent)=>{if(event.persisted)coordinator.discard();};
  window.addEventListener('pageshow',resumed);
  return()=>{stopTransitions();window.removeEventListener('popstate',restore);window.removeEventListener('pageshow',resumed);coordinator.dispose();};
 },[coordinator]);
 return <NavigationContext value={coordinator}>{children}</NavigationContext>;
}

/** The shell's identity-change reload, deferred until no navigation is in flight. Replacing the shell cancels its wait. */
export function useIdentityReload(reload:()=>void=()=>window.location.reload()){
 const coordinator=useAppNavigation();
 const [identityReload]=useState(()=>createIdentityReload(coordinator,reload));
 useEffect(()=>()=>identityReload.release(),[identityReload]);
 return identityReload;
}
