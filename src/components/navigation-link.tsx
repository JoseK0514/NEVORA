'use client';
import NextLink,{useLinkStatus} from 'next/link';
import {useEffect,useRef,useState,type ComponentProps} from 'react';
import {useAppNavigation} from './app-navigation';
import type {NavigationAttempt,NavigationCoordinator} from '@/lib/navigation-coordinator';

type Props=Omit<ComponentProps<typeof NextLink>,'legacyBehavior'|'passHref'>;
function Completion({attempt,coordinator}:{readonly attempt:NavigationAttempt|null;readonly coordinator:NavigationCoordinator}){
 const {pending}=useLinkStatus();
 useEffect(()=>{if(attempt)coordinator.observe(attempt,pending);},[attempt,coordinator,pending]);
 return null;
}
export function NavigationLink({children,onNavigate,onClickCapture,...props}:Props){
 const coordinator=useAppNavigation(),destination=useRef<string|null>(null);
 const [attempt,setAttempt]=useState<NavigationAttempt|null>(null);
 if(!coordinator)return <NextLink {...props} onNavigate={onNavigate} onClickCapture={onClickCapture}>{children}</NextLink>;
 return <NextLink {...props} onClickCapture={event=>{
  onClickCapture?.(event);destination.current=event.currentTarget.href;
 }} onNavigate={event=>{
  let prevented=false;
  onNavigate?.({...event,preventDefault:()=>{prevented=true;event.preventDefault();}});
  if(prevented||!destination.current)return;
  const target=new URL(destination.current,window.location.href);
  if(target.origin!==window.location.origin)return;
  setAttempt(coordinator.begin(window.location.pathname+window.location.search,target.pathname+target.search,'link'));
 }}>{children}{attempt&&<Completion attempt={attempt} coordinator={coordinator}/>}</NextLink>;
}
