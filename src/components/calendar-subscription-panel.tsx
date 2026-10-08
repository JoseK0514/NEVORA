'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {CalendarCommand,CalendarManagementResult,CalendarSubscriptionStatus} from '@/lib/calendar/types';
import './calendar-subscription-panel.css';
type ViewProps={status:CalendarSubscriptionStatus|null;url:string|null;paused:boolean;busy:boolean;notice:string;onCommand:(kind:'ISSUE'|'ROTATE'|'REVOKE')=>void;onCopy:()=>void;onRetry:()=>void};
export function CalendarSubscriptionView({status,url,paused,busy,notice,onCommand,onCopy,onRetry}:ViewProps){
 const link=useRef<HTMLTextAreaElement>(null),unknown=notice.includes('unknown');
 return <section className="employee-view-surface employee-calendar" aria-labelledby="employee-calendar-title" data-calendar-setting>
  <h2 id="employee-calendar-title">Calendar subscription</h2>
  {paused?<p>Calendar settings paused. Return to this window to check the link.</p>:<>
   <p>View your published shifts in a calendar app. This private link includes your shift times and location labels. Anyone with the link can view these details.</p>
   <p>Calendar apps refresh on their own schedule. Check NEVORA for the latest schedule. Revoking this link stops future access; it cannot remove information already copied by a calendar app.</p>
   {!status?<p role="status">Checking calendar link…</p>:status.state==='unavailable'||status.state==='unauthorized'?<p role="alert">Calendar settings unavailable. {status.state==='unauthorized'?'Sign in again.':'Retry to check the current link.'}</p>:<>
    <p className="employee-calendar-state">{status.state==='active'?'Link active':status.state==='revoked'?'Link revoked':'No calendar link'}</p>
    <div className="employee-calendar-actions">
     <button className="button secondary" disabled={busy||unknown} onClick={()=>onCommand(status.state==='active'?'ROTATE':'ISSUE')}>{busy?'Saving…':status.state==='active'?'Replace link':'Create link'}</button>
     {status.state==='active'?<button className="button secondary" disabled={busy||unknown} onClick={()=>onCommand('REVOKE')}>Revoke link</button>:null}
    </div>
    {status.state==='active'&&!url?<p>The link is stored securely and cannot be retrieved. Replace link to create a new URL; the previous link will stop working.</p>:null}
   </>}
   {url?<div className="employee-calendar-secret">
    <label htmlFor="employee-calendar-link">Your private calendar link</label><textarea ref={link} id="employee-calendar-link" value={url} readOnly spellCheck={false} autoComplete="off" rows={3}/>
    <div className="employee-calendar-actions"><button className="button secondary" onClick={onCopy} disabled={busy}>Copy link</button><button className="button secondary" onClick={()=>{link.current?.focus();link.current?.select();}}>Select link</button></div>
    <p>This URL is shown once. Copy it now, or replace it later.</p>
   </div>:null}
   <details><summary>Subscribe in your calendar app</summary>
    <p><strong>Apple Calendar:</strong> On iPhone or iPad, open Calendar → Calendars → Add Calendar → Add Subscription Calendar, then enter the URL. On Mac, use File → New Calendar Subscription.</p>
    <p><strong>Google Calendar:</strong> On a computer, open Other calendars → Add other calendars → From URL, then paste the link.</p>
    <p><strong>Outlook:</strong> In Outlook on the web, use Add calendar → Subscribe from web, then paste the link.</p>
    <p>Use a calendar app you trust. Subscription support and refresh timing depend on the client; creating or copying a link does not confirm a calendar connection.</p>
   </details>
   {notice?<p role="status" className="employee-notice">{notice}</p>:null}
   {(status?.state==='unavailable'||notice.includes('unknown'))?<button className="button secondary" disabled={busy} onClick={onRetry}>Retry</button>:null}
  </>}
 </section>;
}
export function CalendarSubscriptionPanel({authority}:{authority:string}){
 const [status,setStatus]=useState<CalendarSubscriptionStatus|null>(null),[url,setUrl]=useState<string|null>(null),[paused,setPaused]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const generation=useRef(0),work=useRef(0),busyNow=useRef(false),request=useRef<AbortController|null>(null),pending=useRef<CalendarCommand|null>(null),visible=useRef(true);
 const refresh=useCallback(async()=>{
  request.current?.abort();const controller=new AbortController(),at=++generation.current;request.current=controller;
  try{const response=await fetch('/api/employee/calendar-subscriptions',{headers:{'X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':authority,Accept:'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});const result=await response.json() as CalendarSubscriptionStatus;
   if(at!==generation.current||!visible.current)return;
   if(!response.ok||!('authority' in result)||result.authority!==authority){setUrl(null);setStatus({state:response.status===401||response.status===403?'unauthorized':'unavailable',reason:'read_failed'});return;}
   setStatus(result);
  }catch{if(at===generation.current&&visible.current){setUrl(null);setStatus({state:'unavailable',reason:'read_failed'});}}
 },[authority]);
 useEffect(()=>{
  let expiry:ReturnType<typeof setInterval>;
  const pause=()=>{visible.current=false;generation.current++;work.current++;busyNow.current=false;request.current?.abort();setUrl(null);setStatus(null);setBusy(false);setNotice('');setPaused(true);};
  const resume=()=>{if(document.visibilityState!=='visible'||!navigator.onLine){pause();return;}visible.current=true;setPaused(false);if(pending.current)setNotice('The result is unknown. Retry the same operation to check it.');void refresh();};
  const visibility=()=>document.visibilityState==='hidden'?pause():resume();
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online'])window.addEventListener(event,resume);
  const replacement=()=>{pending.current=null;pause();resume();};window.addEventListener('storage',replacement);document.addEventListener('visibilitychange',visibility);
  resume();expiry=setInterval(()=>{if(visible.current&&!busyNow.current){setUrl(null);void refresh();}},45000);
  return()=>{pause();clearInterval(expiry);pending.current=null;for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online'])window.removeEventListener(event,resume);window.removeEventListener('storage',replacement);document.removeEventListener('visibilitychange',visibility);};
 // Authority is server-bound; replacing it destroys all transient private state.
 },[authority,refresh]);
 async function submit(kind:'ISSUE'|'ROTATE'|'REVOKE',retry=false){
  if(!visible.current||busyNow.current||pending.current&&!retry||!status||!('generation' in status))return;
  const command=retry&&pending.current?pending.current:{kind,operationId:crypto.randomUUID(),authority,expectedGeneration:status.generation};pending.current=command;
  const at=++generation.current,operation=++work.current,controller=new AbortController();request.current?.abort();request.current=controller;busyNow.current=true;setBusy(true);setUrl(null);setNotice('');
  try{const response=await fetch('/api/employee/calendar-subscriptions',{method:'POST',headers:{'X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':authority,Accept:'application/json','Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,body:JSON.stringify(command)});const result=await response.json() as CalendarManagementResult;
   if(at!==generation.current||!visible.current)return;
   if(result.status==='created'){pending.current=null;setUrl(result.url);setStatus({state:'active',id:result.id,generation:result.generation,issuedAt:new Date().toISOString(),allowedLocationIds:[],authority});setNotice('Link created.');}
   else if(result.status==='active_url_unavailable'){pending.current=null;setNotice('The link is active. Its URL cannot be retrieved; replace the link to create a new one.');await refresh();}
   else if(result.status==='revoked'){pending.current=null;setNotice('Link revoked.');await refresh();}
   else if(result.status==='outcome_unknown'||result.status==='unavailable'){setNotice('The result is unknown. Retry the same operation to check it.');}
   else{pending.current=null;setNotice(result.status==='conflict'?'The link changed. Check the current status and try again.':'This action is no longer authorized.');setUrl(null);await refresh();}
  }catch{if(at===generation.current&&visible.current)setNotice('The result is unknown. Retry the same operation to check it.');}
  finally{if(operation===work.current&&visible.current){busyNow.current=false;setBusy(false);}}
 }
 async function copy(){if(!url||!visible.current)return;const at=generation.current;try{await navigator.clipboard.writeText(url);if(at===generation.current&&visible.current)setNotice('Link copied.');}catch{if(at===generation.current&&visible.current)setNotice('Copy was unavailable. Use Select link, then copy it manually.');}}
 return <CalendarSubscriptionView status={status} url={url} paused={paused} busy={busy} notice={notice} onCommand={kind=>void submit(kind)} onCopy={()=>void copy()} onRetry={()=>pending.current?void submit(pending.current.kind,true):void refresh()}/>;
}
