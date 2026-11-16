'use client';
import type {HomeBExtras} from './employee-b/home-b';
import Link from 'next/link';
import {unpublishedNote} from '../lib/publication-note';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {createPrivateSnapshotController,type PrivatePanelState} from '../lib/private-snapshot-client';
import {projectEmployeeHome,HOME_SOURCES} from '../lib/employee-home/project';
import type {EmployeeHomeRead,HomeSnapshot,HomeSource,PublishedAssignment} from '../lib/employee-home/types';
import {EmployeeTimePanel,EmployeeTimeView} from './employee-time-panel';
import {EmployeeHomeQuietView,type HomeWeek} from './employee-home-quiet';
import {EmployeeHomeCorpView} from './employee-home-corp';
import {offlineListener} from '@/lib/offline-hold';
export type HomeLifetime={state:'ready';observedAt:string;validForMs:number;home:Extract<EmployeeHomeRead,{snapshot:HomeSnapshot}>}|{state:'unavailable';reason:string};
export function createEmployeeHomeController(changed:(state:PrivatePanelState<HomeLifetime>)=>void,request:(signal:AbortSignal)=>Promise<unknown>,authority:string){
 return createPrivateSnapshotController<HomeLifetime>(changed,request,value=>{
  const read=value as EmployeeHomeRead;
  if(read?.state==='unauthorized')return {state:'unavailable',reason:'access_denied'};
  if(!read||!('snapshot' in read))return {state:'unavailable',reason:'read_failed'};
  if(read.snapshot?.authority!==authority)return {state:'unavailable',reason:'access_denied'};
  const projected=projectEmployeeHome(read.snapshot);
  if(!('snapshot' in projected))return {state:'unavailable',reason:'read_failed'};
  return {state:'ready',observedAt:projected.snapshot.observedAt,validForMs:projected.snapshot.validForMs,home:projected};
 },reason=>({state:'unavailable',reason}),()=> 'read_failed');
}
function stamp(at:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));}
function Assignment({shift,zone}:{shift:PublishedAssignment;zone:string}){
 return <div className="employee-home-assignment">
  <p className="employee-home-shift-time"><time dateTime={shift.startAt}>{stamp(shift.startAt,zone)}</time><span aria-hidden="true"> – </span><time dateTime={shift.endAt}>{stamp(shift.endAt,zone)}</time></p>
  <p className="employee-home-location">{shift.locationLabel}{shift.positionLabel?` · ${shift.positionLabel}`:''}</p>
  {shift.designatedLead?<p>Designated lead</p>:null}
  <Link className="employee-home-review" href={`/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}`}>View schedule <span aria-hidden="true">→</span></Link>
 </div>;
}
const names:Record<HomeSource,string>={schedule:'Schedule',acknowledgements:'Schedule reviews',exchanges:'Shift requests',timeOff:'Time off',ownTime:'Recorded time and corrections',communications:'Communications'};
const destinations:Record<HomeSource,string>={schedule:'/app/schedule',acknowledgements:'/app/schedule',exchanges:'/app/exchange',timeOff:'/app/requests?tab=my',ownTime:'/app/my-time',communications:'/app/updates'};
export function EmployeeHomeView({state,timeAuthority,onRetry,authority}:{state:PrivatePanelState<HomeLifetime>;timeAuthority:string;onRetry:()=>void;authority?:string}){
 const [showAll,setShowAll]=useState(false);
 const replaced=state.snapshot?.state==='ready'&&authority!==undefined&&state.snapshot.home.snapshot.authority!==authority;
 const home=!replaced&&!state.paused&&state.snapshot?.state==='ready'?state.snapshot.home:null,snapshot=home?.snapshot;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const loading=!state.paused&&(!state.snapshot||replaced);
 const items=snapshot?.attention??[],visible=showAll?items:items.slice(0,5);
 return <div className="employee-home-layout" data-home-state={state.paused?'paused':snapshot?home!.state:denied?'unauthorized':loading?'loading':'unavailable'}>
  <div className="employee-home-surface employee-home-primary">
   <section aria-labelledby="employee-next-heading" className="employee-home-next">
    <p className="employee-home-eyebrow">Your schedule</p><h2 id="employee-next-heading">Next Shift</h2>
    {snapshot?<>
     {snapshot.publicationState==='unavailable'?<p>Schedule unavailable</p>:snapshot.nextShift?<Assignment shift={snapshot.nextShift} zone={snapshot.timeZone}/>:<><p>No upcoming published shift</p><Link className="employee-home-review" href="/app/schedule">View schedule</Link></>}
     {snapshot.currentShift?<section className="employee-home-scheduled-now" aria-label="Scheduled now"><h3>Scheduled now</h3><p>Clock status below shows whether you&apos;re clocked in.</p><Assignment shift={snapshot.currentShift} zone={snapshot.timeZone}/></section>:null}
     {snapshot.publicationState==='partial'?<p className="employee-home-publication" role="status">{unpublishedNote(snapshot.unpublishedLocations ?? [])}</p>:null}
    </>:<div className="employee-home-recovery" role="status"><p>{state.paused?'Home paused — return online to refresh.':denied?'Sign in again to view Home.':loading?'Loading Home…':'Home unavailable — try again.'}</p></div>}
   </section>
   {snapshot?<section className="employee-home-actions" aria-labelledby="employee-actions-heading"><h2 id="employee-actions-heading">Needs your attention</h2>
    {home!.state==='partial'?<p className="employee-home-partial" role="status">Some Home sections could not be fully checked.</p>:null}
    {items.length?<><ul>{visible.map(item=><li key={`${item.ref.kind}:${item.ref.id}`}><Link href={item.href}><span><strong>{item.label}</strong>{item.ref.kind==='SCHEDULE'?<small>Week of <time dateTime={item.ref.id}>{new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${item.ref.id}T12:00:00Z`))}</time></small>:<small>Recorded <time dateTime={item.changedAt}>{stamp(item.changedAt,snapshot.timeZone)}</time></small>}{item.required?<small>Required review</small>:null}{item.deadlineAt?<small>Respond by <time dateTime={item.deadlineAt}>{stamp(item.deadlineAt,snapshot.timeZone)}</time></small>:null}</span><span aria-hidden="true">→</span></Link></li>)}</ul>
     {items.length>5?<button className="button secondary" type="button" aria-expanded={showAll} onClick={()=>setShowAll(v=>!v)}>{showAll?'Show fewer':`Show all ${items.length} items (${items.length-5} more)`}</button>:null}
    </>:<p role="status">{home!.allSet?"You’re all set.":'No items in the available sections.'}</p>}
    <ul className="employee-home-source-notices">{HOME_SOURCES.filter(key=>snapshot.sources[key].state!=='complete').map(key=><li key={key}>
     <span>{names[key]} {snapshot.sources[key].state==='unavailable'?(snapshot.sources[key].reason==='review_unavailable'?'unavailable — a changed schedule needs review':'unavailable'):snapshot.sources[key].reason==='source_cap'?'partially shown — more records are available':'partial'}</span>
     <Link href={destinations[key]}>Open {names[key].toLowerCase()}</Link>
    </li>)}</ul>
   </section>:null}
   {/* Only a Home that isn't showing offers Retry or Sign in; a shown Home has no Checked/Refresh footer. */}
   {!snapshot&&!loading&&!state.paused?<footer className="employee-home-refresh">{denied?<Link className="button secondary" href="/login">Sign in</Link>:<button className="button secondary" type="button" onClick={onRetry} disabled={state.refreshing}>{state.refreshing?'Checking…':'Retry home'}</button>}</footer>:null}
  </div>
  <aside className="employee-home-surface employee-home-recorded" aria-label="Own recorded time">
   {snapshot?<EmployeeTimePanel key={timeAuthority} compact authority={timeAuthority}/>:<EmployeeTimeView compact state={{time:state.snapshot?.state==='unavailable'?{state:'unavailable',reason:denied?'access_denied':'read_failed'}:null,refreshing:loading,paused:state.paused}} onRefresh={onRetry}/>}
  </aside>
 </div>;
}
/** Uses the original controller's release guard. This adapter adds no read,
 * lifetime, authority, or recorded-time behavior; the original clock panel
 * remains keyed by its independent authority and owns its existing controller.
 */
export function EmployeeHomeReviewedRenderer({state,timeAuthority,onRetry,authority,displayName,timeZone,workspaceName,week,teamMessage,intro,corporate=false,b}:{b?:HomeBExtras;corporate?:boolean;intro?:ReactNode;state:PrivatePanelState<HomeLifetime>;timeAuthority:string;onRetry:()=>void;authority?:string;displayName?:string;timeZone?:string;workspaceName?:string;week?:HomeWeek|null;teamMessage?:boolean}){
 const replaced=state.snapshot?.state==='ready'&&authority!==undefined&&state.snapshot.home.snapshot.authority!==authority;
 const home=!replaced&&!state.paused&&state.snapshot?.state==='ready'?state.snapshot.home:null,snapshot=home?.snapshot;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const loading=!state.paused&&(!state.snapshot||replaced);
 const status=state.paused?'paused':snapshot?home!.state:denied?'unauthorized':loading?'loading':'unavailable';
 // Corporate (Release 1): an Employee's Home on the corporate kit; a Lead's too since Direction B (Nov 8, 2026), with Today's team.
 if(corporate)return <EmployeeHomeCorpView teamMessage={teamMessage} home={home} status={status} refreshing={state.refreshing} onRetry={onRetry} displayName={displayName} timeZone={timeZone} workspaceName={workspaceName} week={week} intro={intro} ownTimeSlot={null} b={b}/>;
 return <EmployeeHomeQuietView home={home} status={status} refreshing={state.refreshing} onRetry={onRetry} displayName={displayName} timeZone={timeZone} workspaceName={workspaceName} week={week} teamMessage={teamMessage} intro={intro} ownTimeSlot={snapshot?<EmployeeTimePanel key={timeAuthority} compact authority={timeAuthority}/>:null}/>;
}
// TC-P3-08: the signed-in first name reaches Home's band ("Hi, Alexandra."); the view shows it only once Home is read.
export function EmployeeHomeActions({authority,timeAuthority,displayName,timeZone,workspaceName,week,teamMessage,intro,corporate,b}:{b?:HomeBExtras;corporate?:boolean;intro?:ReactNode;authority:string;timeAuthority:string;displayName?:string;timeZone?:string;workspaceName?:string;week?:HomeWeek|null;teamMessage?:boolean}){
 const [state,setState]=useState<PrivatePanelState<HomeLifetime>>({snapshot:null,refreshing:true,paused:false});
 const control=useRef<ReturnType<typeof createEmployeeHomeController>|null>(null),pathname=usePathname();
 useEffect(()=>{
  const controller=createEmployeeHomeController(setState,async signal=>{
   const response=await fetch('/api/employee/home',{credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Home':authority}});
   if(response.status===401||response.status===403)return {state:'unauthorized',reason:'access_denied'};
   if(!response.ok)throw Error('Home unavailable');return response.json();
  },authority);
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause();
  const sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  const offline=offlineListener({pause:()=>controller.pause(),hold:()=>controller.hold()});for(const event of ['blur','pagehide'])window.addEventListener(event,pause);window.addEventListener('offline',offline);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide'])window.removeEventListener(event,pause);window.removeEventListener('offline',offline);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,pathname]);
 return <EmployeeHomeReviewedRenderer authority={authority} state={state} timeAuthority={timeAuthority} displayName={displayName} timeZone={timeZone} workspaceName={workspaceName} week={week} teamMessage={teamMessage} intro={intro} corporate={corporate} b={b} onRetry={()=>control.current?.refresh()}/>;
}
