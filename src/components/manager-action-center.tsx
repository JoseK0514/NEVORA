'use client';
import Link from 'next/link';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {createPrivateSnapshotController} from '../lib/private-snapshot-client';
import {parseActionCenter,type ActionCenter,type ActionItem} from '../lib/action-center/project';
import styles from './manager-action-center.module.css';
import {ArrowsClockwiseIcon, CalendarBlankIcon, CaretDownIcon, CheckCircleIcon, ClockIcon, InfoIcon, UserCheckIcon} from '@phosphor-icons/react/ssr';
import {formatBusinessTimestamp} from '../lib/business-time';
import {actionCenterNavigation} from './action-center-navigation';
import {MobileHomeDisclosure} from './mobile-home-disclosure';
import {SkeletonRows} from './skeleton';
import {hasSetupGaps,setupSteps,withoutSetupItems,type SetupSteps} from '../lib/action-center/setup';
import {isPastCoverageGap} from '../lib/action-center/inbox';
type Connection='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost'|'paused';
type Category='all'|'scheduling'|'requests'|'timekeeping';
const categoryLabels={scheduling:'Scheduling',requests:'Requests',timekeeping:'Timekeeping'};
const plural=(n:number,one:string,many:string)=>`${n} ${n===1?one:many}`;
/** One plain sentence per grouped task type; the item title stays the fallback. */
export function taskGroupHeading(type:ActionItem['type'],count:number,title:string){
 switch(type){
  case 'AVAILABILITY_MISSING':return `${plural(count,'employee hasn’t','employees haven’t')} submitted availability`;
  case 'ACKNOWLEDGEMENT_MISSING':return `${plural(count,'employee hasn’t','employees haven’t')} acknowledged the schedule`;
  case 'TIME_OFF':return plural(count,'time-off request','time-off requests');
  case 'CALLOUT':return plural(count,'unable-to-work request','unable-to-work requests');
  case 'EXCHANGE':return plural(count,'shift request','shift requests');
  case 'TARGET_MISSING':return plural(count,'weekly hour target missing','weekly hour targets missing');
  case 'HOURS_REVIEW':return `${plural(count,'employee','employees')} outside their hour target`;
  // Grouped by location, so the heading names it (D3): "14 coverage gaps at Main Office".
  case 'COVERAGE_GAP':{const at=/ at (.+)$/.exec(title)?.[1];return plural(count,'coverage gap','coverage gaps')+(at?` at ${at}`:'');}
  case 'ATTENDANCE':return `${plural(count,'attendance record needs','attendance records need')} review`;
  case 'TIME_CORRECTION':return `${plural(count,'time correction','time corrections')} waiting for review`;
  case 'TIMECARD':return `${plural(count,'timecard needs','timecards need')} review`;
  default:return `${title} (${count})`;
 }
}
const priorityLabel=(priority:ActionItem['priority'])=>priority==='URGENT'?'Urgent':priority==='MISSING_INPUT'?'Setup needed':'Review';
function formatUpdated(at:string,timeZone:string){
 try{return new Intl.DateTimeFormat('en-US',{timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(at));}catch{return formatBusinessTimestamp(at,timeZone);}
}
export function mobileActionDetail(detail:string){
 return detail.replace(/(^|\s)(\d{4}-\d{2}-\d{2})(?=\s|$)/g,(token,space:string,date:string)=>{
  const parsed=new Date(`${date}T12:00:00Z`);
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)return token;
  return space+new Intl.DateTimeFormat('en-US',{timeZone:'UTC',dateStyle:'medium'}).format(parsed);
 });
}
/** `setupListed`: setup items the Owner setup card took from this list. Counts come
 * from the list as given; an empty list then says where the setup steps went. */
export function ActionCenterSurface({snapshot,connection,onRefresh,expanded=false,onExpand,timeZone='UTC',category='all',onCategoryChange,setupListed=0}:{snapshot:ActionCenter|null;connection:Connection;onRefresh?:()=>void;expanded?:boolean;onExpand?:()=>void;timeZone?:string;category?:Category;onCategoryChange?:(category:Category)=>void;setupListed?:number}){
 const ready=connection==='ready'&&snapshot?.state==='ready'?snapshot:null;
 const status=connection==='ready'&&!ready?'unavailable':connection;
 const matching=ready?.items.filter(item=>category==='all'||item.category===category)??[];
 // C2: coverage gaps on earlier days are history, grouped after current work and not marked urgent.
 const today=ready?new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ready.observedAt)):undefined;
 const past=(item:ActionItem)=>isPastCoverageGap(item,today);
 const grouped=new Map<string,ActionItem[]>();
 for(const item of matching){const key=JSON.stringify([past(item),item.priority,item.type,item.locationId??null]);const group=grouped.get(key)??[];group.push(item);grouped.set(key,group);}
 const groups=[...grouped.values()].sort((a,b)=>Number(past(a[0]))-Number(past(b[0]))||({URGENT:0,REVIEW:1,MISSING_INPUT:2}[a[0].priority]-{URGENT:0,REVIEW:1,MISSING_INPUT:2}[b[0].priority]));
 const tag=(item:ActionItem)=>past(item)?{priority:'PAST',label:'Earlier this week'}:{priority:item.priority,label:priorityLabel(item.priority)};
 // Reserve a place for each group before filling the bounded preview. A large
 // coverage group must not crowd a pending request out of the first view.
 const sizes=groups.map(()=>expanded?1000:1);
 let remaining=20-Math.min(20,groups.length);
 if(!expanded)for(let i=0;i<Math.min(20,groups.length);i++){const extra=Math.min(remaining,groups[i].length-1);sizes[i]+=extra;remaining-=extra;}
 const visibleGroups=groups.slice(0,expanded?1000:20).map((group,index)=>group.slice(0,sizes[index]));
 const visible=visibleGroups.flat();
 const noun=category==='requests'?'request':category==='all'?'task':`${category} task`;
 const emptyLine=setupListed?'Setup steps are listed above.':'No tasks found in the checked sources.';
 const sourceTotal=(ready?.counts.total??0)+setupListed;
 const activeCategories=ready?(['scheduling','requests','timekeeping'] as const).filter(value=>ready.counts[value]>0).length:0;
 const renderItem=(item:ActionItem,nested=false)=>{
    const Icon=item.category==='timekeeping'?ClockIcon:item.category==='requests'?UserCheckIcon:CalendarBlankIcon;
    const action=actionCenterNavigation(item);
    return <article key={item.id} data-action-id={item.id} data-action-kind={item.category}>
     <span className={styles.icon} aria-hidden="true"><Icon size={20}/></span>
     <div className={styles.copy}>{nested?null:<><small className={item.priority==='URGENT'&&!past(item)?styles.priority:undefined}><span className="task-tag" data-priority={tag(item).priority}>{past(item)?tag(item).label:item.priority==='URGENT'?'Coverage need':item.priority==='MISSING_INPUT'?'Setup needed':'Review'}</span> {item.category==='timekeeping'?'Timekeeping':item.category==='requests'?'Request':'Scheduling'}</small><h3>{item.title}</h3></>}<p className="manager-desktop-action-detail">{item.detail}</p><p className="manager-mobile-action-detail">{mobileActionDetail(item.detail)}</p></div>
     <Link className={styles.review} href={action.href} aria-label={`${action.label}: ${item.title}`}>{action.label}</Link>
    </article>;
   };
 return <section className={styles.root} aria-label="Manager Action Center">
  <header><div><h2>Tasks</h2>{ready?<p className="manager-tasks-updated">Updated <time dateTime={ready.observedAt}>{formatUpdated(ready.observedAt,timeZone)}</time></p>:null}</div>{ready?<strong className={styles.total} aria-label="Total tasks">{ready.counts.total}</strong>:null}<button className="button secondary" type="button" onClick={onRefresh} aria-label="Refresh tasks"><ArrowsClockwiseIcon size={18} aria-hidden="true"/><span>Refresh</span></button></header>
  <MobileHomeDisclosure id="mobile-action-review" available={Boolean(ready)} expandedLabel="Close task review"
    label={ready?(category==='all'?`Review ${plural(ready.counts.total,'task','tasks')}`:category==='requests'?`Review ${matching.length} ${matching.length===1?'request':'requests'}`:`Review ${category} tasks`):'Review tasks'}
    summary={ready?<div>
      <dl className="mobile-home-action-summary">{(['scheduling','requests','timekeeping'] as const).filter(value=>ready.counts[value]>0).map(value=><div key={value}><dt>{categoryLabels[value]}</dt><dd>{ready.counts[value]}</dd></div>)}</dl>
      {ready.counts.total===0?<p className="mobile-home-current-note">{emptyLine}</p>:null}
      {ready.limitedAttendance?<p className="mobile-home-current-note">Some attendance comparisons are unavailable.</p>:null}
    </div>:null}>
  {ready?<>
   {activeCategories>1||category!=='all'?<div className={styles.counts} role="group" aria-label="Filter tasks by category"><button type="button" data-action-category="all" aria-pressed={category==='all'} aria-controls="manager-action-list" onClick={()=>onCategoryChange?.('all')}>All tasks</button>{(['scheduling','requests','timekeeping'] as const).map(value=><button type="button" key={value} data-action-category={value} aria-label={`${categoryLabels[value]}: ${plural(ready.counts[value],'task','tasks')}`} aria-pressed={category===value} aria-controls="manager-action-list" onClick={()=>onCategoryChange?.(value)}><span>{categoryLabels[value]}</span><strong>{ready.counts[value]}</strong></button>)}</div>:null}
   <div className={styles.filterBar}><p role="status" aria-live="polite" className={visible.length===matching.length?'sr-only':undefined}>Showing {visible.length} of {matching.length} {noun}{matching.length===1?'':'s'}</p></div>
   {matching.length?<div id="manager-action-list" className={styles.list} data-row-nav="">{visibleGroups.map((group,index)=>groups[index].length===1?renderItem(group[0]):<details className={styles.actionGroup} key={group[0].id}><summary><span><small><span className="task-tag" data-priority={tag(group[0]).priority}>{tag(group[0]).label}</span> {categoryLabels[group[0].category]}</small><strong>{taskGroupHeading(group[0].type,groups[index].length,group[0].title)}</strong></span><span className={styles.groupCount}><span className="manager-task-review-label">Review</span><CaretDownIcon className="manager-task-caret" size={18} aria-hidden="true"/></span></summary><div>{group.length<groups[index].length?<p className={styles.groupPreview}>Showing {group.length} of {groups[index].length}. Use “Show all tasks” below to review the rest.</p>:null}{group.map(item=>renderItem(item,true))}</div></details>)}</div>:<p id="manager-action-list" className={category==='all'?`${styles.status} manager-tasks-clear`:styles.status} role="status">{category==='all'?<><CheckCircleIcon size={28} aria-hidden="true"/><strong>You’re all caught up</strong><span>{emptyLine}</span></>:`No ${category==='requests'?'requests':`${category} tasks`} to review in the checked sources.`}</p>}
   {(matching.length>visible.length&&!expanded)||sourceTotal?<div className="manager-tasks-footer">
    {matching.length>visible.length&&!expanded?<button className="button secondary" onClick={onExpand}>Show all {matching.length} tasks</button>:null}
    {sourceTotal?<Link className={styles.inboxLink} href="/app/inbox">Open inbox</Link>:null}
   </div>:null}
   {ready.limitedAttendance?<p className={styles.status}>Some attendance comparisons are unavailable. Check the attendance view for source limitations.</p>:null}
   <div className={styles.provenance}><details className={styles.note}><summary><InfoIcon size={16} aria-hidden="true"/>About these tasks</summary><p>Counts identify review tasks, not policy violations. Attendance observations concern today and open entries; period timecards use the selected week. These sources are checked under current authority and are refreshed together.</p></details></div>
  </>:<>{status==='loading'||status==='reconnecting'?<SkeletonRows rows={3}/>:null}<p className={status==='loading'||status==='reconnecting'?`${styles.status} nevora-skeleton-status`:styles.status} role="status">{({loading:'Loading tasks',ready:'Tasks unavailable',offline:'Tasks unavailable offline',reconnecting:'Reconnecting to tasks',unavailable:'Tasks unavailable',access_lost:'Task access ended',paused:'Task updates paused'})[status]}{status==='loading'||status==='reconnecting'?'…':`. ${status==='access_lost'?'Sign in with a currently authorized management account.':'The task list is unconfirmed. Refresh a current protected read before reviewing.'}`}</p></>}
  </MobileHomeDisclosure>
 </section>;
}
/** The live, authority-checked action center read shared by Home Tasks and the
 * Inbox. It pauses offline and in background tabs and never keeps stale items. */
export function useActionCenter(weekStart:string,actorId:string){
 const [snapshot,setSnapshot]=useState<ActionCenter|null>(null),[connection,setConnection]=useState<Connection>('loading');
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
 return {snapshot,connection,refresh:()=>controller.current?.refresh()};
}
export type ActionCenterConnection=Connection;
type ActionCenterRead=ReturnType<typeof useActionCenter>;
type SharedHomeRead={read:ActionCenterRead;setup:SetupSteps|null};
const SharedHomeActionCenter=createContext<SharedHomeRead|null>(null);
/** One action-center read per refresh cycle on Home, shared by Tasks and the Owner
 * setup card. The card keeps the last confirmed steps: only a ready read changes
 * them, so a failed or loading read never makes setup look done or gone. */
export function HomeActionCenterProvider({weekStart,actorId,owner,initialItems,children}:{weekStart:string;actorId:string;owner:boolean;initialItems:readonly {type:string;id:string}[];children:ReactNode}){
 const read=useActionCenter(weekStart,actorId);
 const [confirmed,setConfirmed]=useState<SetupSteps|null>(()=>owner?setupSteps(initialItems):null);
 const [seen,setSeen]=useState<ActionCenter|null>(null);
 const ready=read.connection==='ready'&&read.snapshot?.state==='ready'?read.snapshot:null;
 if(owner&&ready&&ready!==seen){setSeen(ready);setConfirmed(setupSteps(ready.items));}
 return <SharedHomeActionCenter.Provider value={{read,setup:owner&&hasSetupGaps(confirmed)?confirmed:null}}>{children}</SharedHomeActionCenter.Provider>;
}
/** The setup steps to show on Home, or null (not an Owner, no gaps, or no shared read). */
export const useHomeSetupSteps=()=>useContext(SharedHomeActionCenter)?.setup??null;
/** The shared Home read and whether the Owner setup card holds the setup items, or null off Home. */
export const useSharedHomeRead=()=>useContext(SharedHomeActionCenter);
export function ManagerActionCenter(props:{weekStart:string;actorId:string;timeZone?:string}){
 const shared=useContext(SharedHomeActionCenter);
 return shared?<ActionCenterTasks {...props} read={shared.read} hideSetup={!!shared.setup}/>:<OwnActionCenterTasks {...props}/>;
}
function OwnActionCenterTasks(props:{weekStart:string;actorId:string;timeZone?:string}){
 const read=useActionCenter(props.weekStart,props.actorId);
 return <ActionCenterTasks {...props} read={read} hideSetup={false}/>;
}
function ActionCenterTasks({timeZone,read,hideSetup}:{weekStart:string;actorId:string;timeZone?:string;read:ActionCenterRead;hideSetup:boolean}){
 const [expanded,setExpanded]=useState(false);
 const [category,setCategory]=useState<Category>('all');
 useEffect(()=>{
  const restore=()=>{const value=new URL(window.location.href).searchParams.get('actionCategory');setCategory(value==='scheduling'||value==='requests'||value==='timekeeping'?value:'all');setExpanded(false);};
  restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
 },[]);
 const selectCategory=(value:Category)=>{
  setCategory(value);setExpanded(false);
  const url=new URL(window.location.href);if(value==='all')url.searchParams.delete('actionCategory');else url.searchParams.set('actionCategory',value);
  window.history.replaceState(window.history.state,'',url);
 };
 const {connection,refresh}=read;
 const {snapshot,removed}=hideSetup?withoutSetupItems(read.snapshot):{snapshot:read.snapshot,removed:0};
 return <ActionCenterSurface snapshot={snapshot} connection={connection} timeZone={timeZone} category={category} onCategoryChange={selectCategory} expanded={expanded} onExpand={()=>setExpanded(true)} onRefresh={refresh} setupListed={removed}/>;
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
