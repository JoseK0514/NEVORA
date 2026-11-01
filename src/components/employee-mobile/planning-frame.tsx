'use client';
import './timeoff-corp.css';
import Link from 'next/link';
import {useEffect,useRef,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {EmployeePlanningSnapshot} from '@/lib/employee-planning';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
/* Employee planning pages (Time off, Availability) on the corporate kit (Release 1): the pushed page's white bar with
 * "‹ Back" and the centred title, then the page's cards. `sheet`: the bar reads Cancel · title like the board's sheet
 * (Request time off). The read states keep their own words and a single Try again or Sign in. */
export function PlanningFrame({title,sub,back,backLabel='Requests',selection,state,ready,refresh,children,sheet=false}:{title:string;sub:string;back:string;backLabel?:string;selection:string;state:PrivatePanelState<EmployeePlanningSnapshot>;ready:boolean;refresh:()=>void;children:ReactNode;sheet?:boolean}){
 const heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===selection)return;focused.current=selection;const id=window.location.hash.slice(1);if(id)document.getElementById(id)?.focus();else heading.current?.focus();},[ready,selection]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 return <div className={'c-page c-page--narrow tof-frame em-planning'+(sheet?' tof-frame--sheet':'')} data-corp="" data-planning-selection={selection} data-planning-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  {/* Upscale M2: Request time off reads as a sheet on a phone (grabber, 16px top corners, no tab bar). */}
  {sheet?<div className="tof-grab" aria-hidden="true"/>:null}
  <div className="c-nav">
   {sheet?<Link href={back} className="c-nav__back tof-cancel">Cancel</Link>:<Link href={back} className="c-nav__back"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/>{backLabel}</Link>}
   <h1 className="c-nav__title" ref={heading} tabIndex={-1}>{title}</h1><span className="c-nav__right"/>
  </div>
  {sub?<p className="tof-sub">{sub}</p>:null}
  {ready?children:<section className="c-card" aria-label="Planning access"><div className="c-card__body">
   <p className="tof-state" role="status">{state.paused?'Your planning is paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current planning…':'Your planning couldn’t be checked.'}</p>
   {denied?<Link href="/login" className="c-btn c-btn--secondary c-btn--md c-btn--full">Sign in</Link>:state.refreshing||state.paused?null:<button className="c-btn c-btn--secondary c-btn--md c-btn--full" type="button" onClick={refresh}>Try again</button>}
  </div></section>}
 </div>;
}
