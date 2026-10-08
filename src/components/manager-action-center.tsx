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
