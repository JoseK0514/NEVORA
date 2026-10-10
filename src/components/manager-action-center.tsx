'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import {parseActionCenter,type ActionCenter} from '../lib/action-center/project';
import styles from './manager-action-center.module.css';
type Connection='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost'|'paused';
export function ActionCenterSurface({snapshot,connection,onRefresh,expanded=false,onExpand}:{snapshot:ActionCenter|null;connection:Connection;onRefresh?:()=>void;expanded?:boolean;onExpand?:()=>void}){
 const ready=connection==='ready'&&snapshot?.state==='ready'?snapshot:null;
 const status=connection==='ready'&&!ready?'unavailable':connection;
 return <section className={styles.root} aria-label="Manager Action Center"><header><div><p>What needs my attention?</p><h2>Action Center</h2></div>{ready?<strong aria-label="Total actions">{ready.counts.total}</strong>:null}<button className="button secondary" type="button" onClick={onRefresh}>Refresh actions</button></header>
  {ready?<><dl className={styles.counts}>{(['scheduling','requests','timekeeping'] as const).map(category=><div key={category}><dt>{category==='scheduling'?'Scheduling':category==='requests'?'Requests':'Timekeeping'}</dt><dd>{ready.counts[category]}</dd></div>)}</dl>
   {ready.items.length?<div className={styles.list}>{ready.items.slice(0,expanded?1000:20).map(item=><article key={item.id} data-action-id={item.id}><div><small>{item.category==='timekeeping'?'Timekeeping':item.category==='requests'?'Request':'Scheduling'} · {item.priority==='URGENT'?'Coverage need':item.priority==='MISSING_INPUT'?'Setup needed':'Review'}</small><h3>{item.title}</h3><p>{item.detail}</p></div><Link className="button secondary" href={item.href}>Review</Link></article>)}</div>:<p role="status">No actions found in the checked sources.</p>}
   {ready.items.length>20&&!expanded?<button className="button secondary" onClick={onExpand}>Show all {ready.items.length} actions</button>:null}
   {ready.limitedAttendance?<p>Some attendance comparisons are unavailable. Check the attendance view for source limitations.</p>:null}
   <p className={styles.note}>Counts identify review tasks, not policy violations. Attendance observations concern today and open entries; period timecards use the selected week. These sources are checked under current authority and are refreshed together.</p>
  </>:<p role="status">{({loading:'Loading actions',ready:'Actions unavailable',offline:'Actions unavailable offline',reconnecting:'Reconnecting to actions',unavailable:'Actions unavailable',access_lost:'Action Center access ended',paused:'Action updates paused'})[status]}. {status==='access_lost'?'Sign in with a currently authorized management account.':'The action list is unconfirmed. Refresh a current protected read before reviewing.'}</p>}
  <footer><Link href="/app/clocker-recovery">Clocker Recovery</Link><Link href="/app/account-recovery">Assisted Account Recovery</Link></footer>
 </section>;
}
export function ManagerActionCenter({weekStart,actorId}:{weekStart:string;actorId:string}){
 const [snapshot,setSnapshot]=useState<ActionCenter|null>(null),[connection,setConnection]=useState<Connection>('loading'),[expanded,setExpanded]=useState(false);
 const controller=useRef<ReturnType<typeof createPrivateSnapshotController<ActionCenter>>|null>(null);
 useEffect(()=>{
  const c=createPrivateSnapshotController<ActionCenter>(value=>{setSnapshot(value.refreshing?null:value.snapshot);if(value.paused)setConnection(navigator.onLine?'paused':'offline');else if(value.refreshing)setConnection(previous=>previous==='reconnecting'?'reconnecting':'loading');else if(value.snapshot?.state==='ready')setConnection('ready');else setConnection(value.snapshot?.state==='unavailable'&&value.snapshot.reason==='access_denied'?'access_lost':'unavailable');},async signal=>{
   const response=await fetch('/api/manager/action-center',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'Content-Type':'application/json','X-Nevora-Action-Center':'1','X-Nevora-Actor':actorId},body:JSON.stringify({weekStart})});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};if(!response.ok)throw Error('Unavailable');return response.json();
  },value=>parseActionCenter(value,weekStart),reason=>({state:'unavailable',reason}),()=> 'read_failed');controller.current=c;
  let active=false;
  const current=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||active))return;active=document.visibilityState==='visible'&&navigator.onLine;if(active)c.start();else c.pause();},pause=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;active=false;c.pause();},online=()=>{setConnection('reconnecting');current();};
  for(const name of ['focus','pageshow','storage','nevora:time-correction-changed'])window.addEventListener(name,current);for(const name of ['blur','pagehide','offline'])window.addEventListener(name,pause);window.addEventListener('online',online);document.addEventListener('visibilitychange',current);current();
  return()=>{c.stop();controller.current=null;for(const name of ['focus','pageshow','storage','nevora:time-correction-changed'])window.removeEventListener(name,current);for(const name of ['blur','pagehide','offline'])window.removeEventListener(name,pause);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',current);};
 },[weekStart,actorId]);
 return <ActionCenterSurface snapshot={snapshot} connection={connection} expanded={expanded} onExpand={()=>setExpanded(true)} onRefresh={()=>controller.current?.refresh()}/>;
}

import { Temporal } from '@js-temporal/polyfill';
import type { ActionIntelligenceResult, SourceKey } from '../lib/action-center/intelligence';

export type ActionIntelligenceSurfaceProps = {
 snapshot: ActionIntelligenceResult | null;
 connection: Connection;
 expectedViewId: string;
 weekStart: string;
 /** Explicit display observation. The future protected adapter owns clock,
  * timer, live view and authority invalidation before releasing this DTO. */
 now: string;
 onRefresh?: () => void;
 onRetrySource?: (source: SourceKey) => void;
 expanded?: boolean;
 onExpand?: () => void;
};

/** Isolated F1 display preparation. No reader, parser, proof, action engine or
 * connected controller is introduced; full F10/F6 integration remains held. */
export function ActionIntelligenceSurface({ snapshot, connection, expectedViewId, weekStart, now,
 onRefresh, onRetrySource, expanded = false, onExpand }: ActionIntelligenceSurfaceProps) {
 const candidate = snapshot?.state === 'ready' || snapshot?.state === 'partial' ? snapshot : null;
 let current = false;
 if (connection === 'ready' && candidate?.viewId === expectedViewId && candidate.weekStart === weekStart) {
  try { current = Temporal.Instant.compare(Temporal.Instant.from(now), Temporal.Instant.from(candidate.validUntil)) < 0; }
  catch { current = false; }
 }
 const ready = current ? candidate : null;
 // A superseded/expired ready DTO cannot retain even its old source counts or
 // retry actions. Non-ready projection sections contain only fixed statuses.
 const sections = ready?.sections ?? (connection === 'ready' && !candidate && snapshot && 'sections' in snapshot ? snapshot.sections : []);
 const status = connection === 'ready' ? snapshot?.state === 'loading' && !candidate ? 'loading' : 'unavailable' : connection;
 return <section className={styles.root} aria-label="Manager Action Center intelligence">
  <header><div><p>What needs my attention?</p><h2>Action Center</h2></div>
   {ready ? <strong aria-label="Observed actions">{ready.counts.total}</strong> : null}
   <button className="button secondary" type="button" onClick={onRefresh} disabled={!onRefresh}>Refresh actions</button>
  </header>
  {ready ? <>
   <dl className={styles.counts}>{(['scheduling', 'requests', 'timekeeping'] as const).map(category =>
    <div key={category}><dt>{category === 'scheduling' ? 'Scheduling' : category === 'requests' ? 'Requests' : 'Timekeeping'}</dt><dd>{ready.counts[category]}</dd></div>)}</dl>
   {ready.state === 'partial' ? <p role="status">Action results are incomplete. Check the named sources below.</p> : null}
   {ready.items.length ? <div className={styles.list}>{ready.items.slice(0, expanded ? ready.items.length : 20).map(item =>
    <article key={item.id} data-action-id={item.id}>
     <div><small>{item.category === 'timekeeping' ? 'Timekeeping' : item.category === 'requests' ? 'Request' : 'Scheduling'} · {item.priority === 'URGENT' ? 'Urgent' : item.priority === 'MISSING_INPUT' ? 'Missing input' : 'Review'}</small>
      <h3>{item.title}</h3><p>{item.reason.text}</p>
      <p className={styles.note}>Source version <code>{item.sourceVersion}</code> · Observed <time dateTime={item.observedAt}>{item.observedAt}</time></p>
     </div><Link className="button secondary" href={item.nextAction.href}>{item.nextAction.label}</Link>
    </article>)}</div> : ready.state === 'ready' && ready.allClear ? <p role="status">No actions need review in this authorized view.</p> : null}
   {ready.items.length > 20 && !expanded ? <button className="button secondary" type="button" onClick={onExpand} disabled={!onExpand}>Show all {ready.items.length} observed actions</button> : null}
   <p className={styles.note}>Counts include only observed actions in this authorized view. Incomplete or capped sources may contain additional actions. Counts identify review tasks, not policy violations.</p>
  </> : <p role="status">{({loading: 'Loading actions', ready: 'Actions unavailable', offline: 'Actions unavailable offline', reconnecting: 'Reconnecting to actions', unavailable: 'Actions unavailable', access_lost: 'Action Center access ended', paused: 'Action updates paused'})[status]}. The action list is unconfirmed. Refresh a current protected read before reviewing.</p>}
  {sections.length ? <div aria-label="Action source status">{sections.map(section =>
   <article key={section.source} data-action-source={section.source}>
    <h3>{section.label}</h3><p>{({complete: 'Checked source', limited: 'Incomplete source', loading: 'Loading', unavailable: 'Read unavailable'})[section.state]}</p>
    {ready && section.observedCount !== null ? <p>Observed actions: {section.observedCount}</p> : null}
    {section.retry ? <button className="button secondary" type="button" disabled={!onRetrySource} onClick={onRetrySource ? () => onRetrySource(section.retry!.source) : undefined}>Retry {section.label}</button> : null}
   </article>)}</div> : null}
 </section>;
}
