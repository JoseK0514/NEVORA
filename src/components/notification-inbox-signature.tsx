'use client';

import Link from 'next/link';
import {useState} from 'react';
import {keepWhole} from '@/lib/keep-whole';
import type {PrivatePanelState} from '../lib/private-snapshot-client';
import type {EmployeeViewSnapshot,EmployeeNotificationItem} from '../lib/employee-view';
import {filterNotifications,notificationPresentation,type NotificationFilter} from '../lib/notification-inbox-view';
import {HoldHeight} from './kit/hold-height';
import {SigBand,SigPage,SigChevron} from './signature/signature';
import styles from './notification-inbox-signature.module.css';

/* Notifications in the Signature style (phase 2, approved Oct 20, 2026; target:
 * docs/product/specs/employee-style/signature/phase-2/p2c-notifications.png). The band says what is waiting in words
 * ("Three things to review"); the sheet holds the filters, To do, the other updates, and the refresh with any
 * coverage notice. Same read, filters, search, states and links as the inbox; the Phase E hooks are kept
 * ([data-private-view], the "Filter notifications" group, one header button, [data-inbox-row] > a, the state headings). */

const filters:{value:NotificationFilter;label:string}[]=[{value:'all',label:'All'},{value:'unread',label:'Unread'},{value:'required',label:'To do'}];
const words=['No','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
/** "Three", or "12" from ten on. */
const countWord=(n:number)=>n<words.length?words[n]:String(n);
const kinds:Record<string,[string,string]>={schedule:['schedule review','schedule reviews'],update:['team update','team updates'],timeOff:['time-off update','time-off updates'],exchange:['shift request','shift requests'],availability:['availability update','availability updates'],callout:['Unable to work update','Unable to work updates'],statement:['pay statement','pay statements']};

/** "2 schedule reviews · 1 team update", from the items waiting on the person. */
export function waitingSummary(items:readonly EmployeeNotificationItem[]){
 const counts=new Map<string,number>();
 for(const item of items){const icon=notificationPresentation(item.label).icon;const key=kinds[icon]?icon:'other';counts.set(key,(counts.get(key)??0)+1);}
 return [...counts.entries()].map(([key,n])=>{const [one,many]=kinds[key]??['other update','other updates'];return `${n} ${n===1?one:many}`;}).join(' · ');
}

/** A short title for the row: what to do, in a few words. */
const titles:Record<string,string>={schedule:'Review your schedule',update:'Read the team update',timeOff:'Your time-off request',exchange:'Your shift request',availability:'Your availability',callout:'Your Unable to work request',statement:'Your pay statement'};

function when(at:string){
 const date=new Date(at),today=new Date();
 const sameDay=date.toDateString()===today.toDateString();
 return keepWhole(new Intl.DateTimeFormat('en-US',sameDay?{hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric'}).format(date));
}

function Row({item}:{item:EmployeeNotificationItem}){
 const presentation=notificationPresentation(item.label);
 const unread=item.reviewState==='unread';
 return <li data-inbox-row><a className={styles.ntRow} data-unread={unread||undefined} href={item.href}>
  <span className={styles.ntDot} aria-hidden="true"/>
  <span className="sg-copy"><b>{titles[presentation.icon]??presentation.destination}</b><span>{item.label} · <time dateTime={item.at}>{when(item.at)}</time>{unread?<span className="nv-sr"> · Unread</span>:null}</span></span>
  <SigChevron/>
 </a></li>;
}

export function NotificationInboxSignature({state,onRetry}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void}){
 const [filter,setFilter]=useState<NotificationFilter>('all');
 const [search,setSearch]=useState('');
 const [searching,setSearching]=useState(false);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const items=ready?[...filterNotifications(ready.items,filter,search)].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)):[];
 const todo=items.filter(item=>item.actionState==='required'),other=items.filter(item=>item.actionState!=='required');
 const required=ready?ready.items.filter(item=>item.actionState==='required'):[];
 const unread=ready?ready.items.filter(item=>item.reviewState==='unread').length:0;
 const counts=ready?{all:ready.items.length,unread,required:required.length}:null;
 const headline=!ready?<>{state.paused?'Updates paused':denied?'Your session ended':unavailable?'Not available right now':'Checking your updates'}</>
  :required.length?<><em>{countWord(required.length)}</em> {required.length===1?'thing':'things'}<br/>to review</>
  :unread?<><em>{countWord(unread)}</em> unread<br/>{unread===1?'update':'updates'}</>:<>All caught up</>;
 const sub=ready?(required.length?waitingSummary(required):'Schedule, requests and team updates'):state.paused?'Return to this window while online.':denied?'Sign in again to see notifications.':unavailable?'Check your connection, then try again.':' ';

 return <SigPage band={<SigBand eyebrow="Notifications">
  <h1 className="nv-sr">Notifications</h1>
  <p className={styles.ntHead}>{headline}</p>
  <p className="sg-sub"><span>{sub}</span></p>
 </SigBand>}>
  <section className={styles.ntInbox} aria-label="Notifications" data-private-view="notifications">
   <div className={styles.ntControls}>
    <div className={styles.ntFilters} role="group" aria-label="Filter notifications">{filters.map(option=><button key={option.value} type="button" aria-pressed={filter===option.value} disabled={!ready} onClick={()=>setFilter(option.value)}>{option.label}<span className={styles.ntCount}>{counts?counts[option.value]:'–'}</span></button>)}</div>
    <button type="button" className={styles.ntSearchToggle} aria-expanded={searching} aria-controls="nt-search" disabled={!ready} onClick={()=>{setSearching(open=>{if(open)setSearch('');return !open;});}}>
     <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span className="nv-sr">{searching?'Close search':'Search notifications'}</span>
    </button>
   </div>
   {searching?<label className={styles.ntSearch} id="nt-search"><span className="nv-sr">Search notifications</span><input type="search" autoFocus value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search notifications"/></label>:null}
   {ready?<p className="nv-sr" role="status" aria-live="polite">{items.length} {items.length===1?'notification':'notifications'} in this view{filter==='required'?' · To do':filter==='unread'?' · Unread':''}</p>:null}
   <HoldHeight holding={!ready} memory="notifications">
    {!ready?<div className={`sg-alert ${styles.ntState}`} role="status"><h2>{state.paused?'Updates paused':denied?'Your session ended':unavailable?'Couldn’t load notifications':'Loading notifications…'}</h2><span>{state.paused?'Return to this window while online to check current information.':denied?'Sign in again to see notifications.':unavailable?'Check your connection, then try again.':'Checking your current access.'}</span></div>
     :items.length?<>
      {todo.length?<section className="sg-section-lite" aria-labelledby="nt-todo"><h2 id="nt-todo" className={styles.ntHeading}>To do <em>· {todo.length}</em></h2><ul className="sg-list">{todo.map(item=><Row key={item.id} item={item}/>)}</ul></section>:null}
      {other.length?<section className="sg-section-lite" aria-labelledby="nt-other"><h2 id="nt-other" className={styles.ntHeading}>{todo.length?'Other updates':'Updates'} <em>· {other.length}</em></h2><ul className="sg-list">{other.map(item=><Row key={item.id} item={item}/>)}</ul></section>:null}
     </>:<div className={`sg-alert ${styles.ntState}`} role="status">
      <h2>{search?'No matching notifications':filter==='unread'?'No unread notifications in this view':filter==='required'?'Nothing to do in this view':ready.coverage==='complete'?'No notifications here.':'No available notifications to show'}</h2>
      <span>{search?'Try another search, or clear it to see your updates.':ready.coverage==='partial'?'This view is incomplete. Retry to check what is available.':'Check Requests and Schedule for their current status.'}</span>
      {search?<button type="button" className="sg-link" onClick={()=>setSearch('')}>Clear search</button>:filter!=='all'?<button type="button" className="sg-link" onClick={()=>setFilter('all')}>View all notifications</button>:null}
     </div>}
   </HoldHeight>
   {/* The one header button is Refresh (or Try again); a partial read says so beside it. */}
   <header className={styles.ntFoot}>
    {ready?.coverage==='partial'?<span className={styles.ntPartial}>Some updates could not be checked.</span>:<span>Opening one doesn’t complete it.</span>}
    {denied?<Link className="sg-link" href="/login">Sign in</Link>:<button type="button" className="sg-link" data-retry={unavailable?'true':undefined} disabled={state.paused||state.refreshing} onClick={onRetry}>{state.refreshing?'Checking…':unavailable||ready?.coverage==='partial'?'Try again':'Refresh'}</button>}
   </header>
  </section>
 </SigPage>;
}
