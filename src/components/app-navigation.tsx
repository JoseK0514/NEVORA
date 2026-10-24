'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {createNavigationCoordinator,onRouterTransition,type NavigationCoordinator} from '@/lib/navigation-coordinator';

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
  return()=>{stopTransitions();window.removeEventListener('popstate',restore);coordinator.discard();};
 },[coordinator]);
 return <NavigationContext value={coordinator}>{children}</NavigationContext>;
}
