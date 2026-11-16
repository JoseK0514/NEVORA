'use client';
import './timeoff-corp.css';
import Link from 'next/link';
import {useEffect,useRef,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {EmployeePlanningSnapshot} from '@/lib/employee-planning';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import {focusShown} from '../employee-b/focus';
/* Employee planning pages (Time off, Availability) on the corporate kit (Release 1): the pushed page's white bar with
 * "‹ Back" and the centred title, then the page's cards. `sheet`: the bar reads Cancel · title like the board's sheet
 * (Request time off). The read states keep their own words and a single Try again or Sign in. */
/** `b`: a Direction B phone screen, drawn as the page's first child (phones only); on a phone it takes the bar's place.
 * `bTitleId` is its title, which takes focus instead of this bar's when that screen is the one shown (without it, the
 * screen's own h1). */
export function PlanningFrame({title,sub,back,backLabel='Requests',selection,state,ready,refresh,children,sheet=false,b,bTitleId}:{title:string;sub:string;back:string;backLabel?:string;selection:string;state:PrivatePanelState<EmployeePlanningSnapshot>;ready:boolean;refresh:()=>void;children:ReactNode;sheet?:boolean;b?:ReactNode;bTitleId?:string}){
 const heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===selection)return;focused.current=selection;const id=window.location.hash.slice(1);
  const twin=()=>bTitleId?document.getElementById(bTitleId):heading.current?.closest('.c-page')?.querySelector<HTMLElement>(':scope > .b-screen h1')??null;
  if(id)focusShown(document.getElementById(id),b?document.getElementById('b-'+id):null);else focusShown(heading.current,b?twin():null);
 // eslint-disable-next-line react-hooks/exhaustive-deps -- focus moves once per selection, as before; `b` is the screen, not a trigger.
 },[ready,selection]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 // Review F2 (NV-148): the state names the page's own subject, not "planning" (the two planning pages).
 const noun=title==='Availability'?'availability':'time off';
 return <div className={'c-page c-page--narrow tof-frame em-planning'+(sheet?' tof-frame--sheet':'')} data-corp="" data-planning-selection={selection} data-planning-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  {b??null}
  {/* Upscale M2: Request time off reads as a sheet on a phone (grabber, 16px top corners, no tab bar). */}
  {sheet?<div className="tof-grab" aria-hidden="true"/>:null}
  <div className="c-nav">
   {sheet?<Link href={back} className="c-nav__back tof-cancel">Cancel</Link>:<Link href={back} className="c-nav__back"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/>{backLabel}</Link>}
   <h1 className="c-nav__title" ref={heading} tabIndex={-1}>{title}</h1><span className="c-nav__right"/>
  </div>
  {sub?<p className="tof-sub">{sub}</p>:null}
  {ready?children:<section className="c-card" aria-label="Planning access"><div className="c-card__body">
   <p className="tof-state" role="status">{state.paused?`${noun[0].toUpperCase()+noun.slice(1)} is paused. Return to this page or reconnect to refresh.`:denied?'Your access changed. Sign in again to continue.':state.refreshing?`Loading your ${noun}…`:`Your ${noun} didn’t load.`}</p>
   {denied?<Link href="/login" className="c-btn c-btn--secondary c-btn--md c-btn--full">Sign in</Link>:state.refreshing||state.paused?null:<button className="c-btn c-btn--secondary c-btn--md c-btn--full" type="button" onClick={refresh}>Try again</button>}
  </div></section>}
 </div>;
}
