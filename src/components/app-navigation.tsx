'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {createNavigationCoordinator,type NavigationCoordinator} from '@/lib/navigation-coordinator';

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
  return()=>{window.removeEventListener('popstate',restore);coordinator.discard();};
 },[coordinator]);
 return <NavigationContext value={coordinator}>{children}</NavigationContext>;
}
