'use client';
import NextLink,{useLinkStatus} from 'next/link';
import {useContext,useEffect,useRef,useState,type ComponentProps} from 'react';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type {PrefetchKind} from 'next/dist/client/components/router-reducer/router-reducer-types';
import {useAppNavigation} from './app-navigation';
import type {NavigationAttempt,NavigationCoordinator} from '@/lib/navigation-coordinator';

type Props=Omit<ComponentProps<typeof NextLink>,'legacyBehavior'|'passHref'>&{
 /** Prefetch on intent instead of on sight: "full" loads the whole page ahead of the tap (the tab bar), "auto" its loading
  * shell (the sidebar). */
 intent?:'full'|'auto';
};
type IntentEvents=Pick<Props,'onPointerEnter'|'onFocus'|'onTouchStart'>;
/** Gap closure (Nov 23, 2026, lead): the tab bar and the sidebar are on screen on every page, so links that prefetched on
 * sight fetched every destination again after each access-frame renewal (router.refresh clears the router cache): 36
 * extra page reads a minute on Payroll export at 390. With an intent they prefetch when the pointer enters, on focus, or
 * when a touch starts, which on a phone comes before the tap's click. */
export function intentProps(prefetch:(href:string,options:{kind:PrefetchKind})=>void,href:string,intent:'full'|'auto',events:IntentEvents){
 const warm=()=>prefetch(href,{kind:intent as PrefetchKind});
 return {
  prefetch:false as const,
  onPointerEnter:((event)=>{events.onPointerEnter?.(event);warm();}) satisfies NonNullable<IntentEvents['onPointerEnter']>,
  onFocus:((event)=>{events.onFocus?.(event);warm();}) satisfies NonNullable<IntentEvents['onFocus']>,
  onTouchStart:((event)=>{events.onTouchStart?.(event);warm();}) satisfies NonNullable<IntentEvents['onTouchStart']>,
 };
}
function Completion({attempt,coordinator}:{readonly attempt:NavigationAttempt|null;readonly coordinator:NavigationCoordinator}){
 const {pending}=useLinkStatus();
 useEffect(()=>{if(attempt)coordinator.observe(attempt,pending);},[attempt,coordinator,pending]);
 return null;
}
export function NavigationLink({children,onNavigate,onClickCapture,intent,...rest}:Props){
 // The router useRouter() reads, without its throw: outside the app router (static renders, tests) nothing is prefetched.
 const coordinator=useAppNavigation(),destination=useRef<string|null>(null),router=useContext(AppRouterContext);
 const props=intent&&typeof rest.href==='string'?{...rest,...intentProps((href,options)=>router?.prefetch(href,options),rest.href,intent,rest)}:rest;
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
