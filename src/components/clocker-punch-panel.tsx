'use client';

import { useEffect, useRef, useState } from 'react';
import { canRetirePendingPunch, makePunchCommand, parseClockView, parseReceiptReply,
 postPunch, punchActions, PunchRequestError, type ClockView, type PendingPunch } from '../lib/clocker/punch-client';
import {openClockerJournal} from '../lib/clocker/recovery-journal.browser';
import type {ClockerJournal,JournalReference} from '../lib/clocker/recovery-journal';
import type { PunchAction, PunchReceipt } from '../lib/clocker/punch-types';
import type { BreakSelection } from '../lib/clocker/break-types';
import styles from './clocker-punch.module.css';
import { ClockerIcon, type ClockerIconName } from './clocker-icon';
import { useClockerMotion } from './clocker-motion';
import { Es, useClockerSpanish, type ClockerPhrase } from './clocker-language';
import {useClockerCopy,useClockerPresentation} from './clocker-language';
const labels:Record<PunchAction,string>={CLOCK_IN:'Clock In',START_BREAK:'Start Break',END_BREAK:'End Break',CLOCK_OUT:'Clock Out'};
const receipts:Record<PunchAction,string>={CLOCK_IN:'Clock In Recorded',START_BREAK:'Break Start Recorded',END_BREAK:'Break End Recorded',CLOCK_OUT:'Clock Out Recorded'};
const actionIcons:Record<PunchAction,ClockerIconName>={CLOCK_IN:'clock-in',START_BREAK:'break',END_BREAK:'resume',CLOCK_OUT:'clock-out'};
const ESP:Record<string,true>={'Clock In Recorded':true,'Break Start Recorded':true,'Break End Recorded':true,'Clock Out Recorded':true,'Choose a Break':true,'Clock Out?':true};
type Mode='select-break'|'loading'|'ready'|'confirm-out'|'sending'|'recovery'|'retry'|'other-person'|'auth'|'unavailable'|'storage'|'success';
function clockTime(value:string,timeZone:string,locale='en-US'):string {
 const parts=new Intl.DateTimeFormat(locale,{timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(value));
 const part=(name:Intl.DateTimeFormatPartTypes)=>parts.find(p=>p.type===name)?.value??'';
 return `${part('month')} ${part('day')} · ${part('hour')}:${part('minute')} ${part('dayPeriod')}`;
}
const shown:Record<string,string>={'Clocked In':'Clocked in','On Break':'On break','Off Clock':'Off clock'};
function dayKey(value:Date,timeZone:string){return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(value);}
/** "8:02 AM" today, "Oct 19 · 10:02 PM" on another day. */
function shortTime(value:string,timeZone:string,now:number,locale='en-US'):string {
 if(dayKey(new Date(value),timeZone)!==dayKey(new Date(now),timeZone))return clockTime(value,timeZone,locale);
 return new Intl.DateTimeFormat(locale,{timeZone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(value));
}
/** Time since a recorded moment, for orientation only: "6h 26m", "12m", "under a minute". */
function elapsed(value:string,now:number):string {
 const minutes=Math.max(0,Math.floor((now-new Date(value).getTime())/60000));
 if(minutes<1)return 'under a minute';
 const h=Math.floor(minutes/60),m=minutes%60;return h?`${h}h ${m}m`:`${m}m`;
}
const breakIcon=(category:string):ClockerIconName=>category==='REST'?'rest':category==='MEAL'?'meal':'break';
export function ClockerPunchPanel({locationKey,timeZone,onDone}:{locationKey:string;timeZone:string;onDone:()=>void}) {
 const t=useClockerCopy(),presentation=useClockerPresentation();
 const [view,setView]=useState<ClockView|null>(null),[pending,setPending]=useState<PendingPunch|null>(null);
 const [mode,setMode]=useState<Mode>('loading'),[message,setMessage]=useState<string|null>(null);
 const motion=useClockerMotion(mode);
 const spanish=useClockerSpanish(),locale=presentation.v2&&presentation.locale==='es'?'es-PR':'en-US';
 const [receipt,setReceipt]=useState<PunchReceipt|null>(null);
 const [references,setReferences]=useState<JournalReference[]>([]),[showReferences,setShowReferences]=useState(false);
 const journal=useRef<Promise<ClockerJournal>|null>(null);
 function recoveryJournal(){return journal.current??(journal.current=openClockerJournal());}
 const busy=useRef(false),alive=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{if(mode!=='ready'&&mode!=='confirm-out')return;const tick=()=>setNow(Date.now());const first=window.setTimeout(tick,0),timer=window.setInterval(tick,15000);return()=>{clearTimeout(first);clearInterval(timer);};},[mode]);
 function failed(error:unknown,hasPending:boolean){
  if(error instanceof PunchRequestError&&(['AUTH_REQUIRED','CONTEXT_CHANGED'].includes(error.code)||error.status===401)){
   setMode('auth');setMessage('Your tablet verification changed. Enter your PIN again. Any pending action is kept for checking.');return;
  }
  setMode(hasPending?'recovery':'unavailable');
  setMessage(error instanceof PunchRequestError?error.message:hasPending
   ?'We could not confirm this action. Check its status before trying anything else.'
   :'Your clock state could not be loaded. No action has been sent.');
 }
 useEffect(()=>{
  let current=true;alive.current=true;
  const load=async()=>{
   let saved:PendingPunch|null=null;
   try{
    const fresh=parseClockView(await postPunch(locationKey,{operation:'state'}));
    if(!current)return;
    try{const store=await recoveryJournal();saved=await store.read(locationKey,fresh.subject);const refs=await store.references(locationKey);if(!current)return;setReferences(refs);}
    catch{setMode('storage');setMessage('Your recovery record cannot be verified. Keep it saved and ask an Owner to review it.');return;}
    setView(fresh);setPending(saved);setMode(saved?'recovery':'ready');
   }catch(error){if(current){setPending(saved);failed(error,Boolean(saved));}}
  };
  void load();return()=>{current=false;alive.current=false;void journal.current?.then(store=>store.close(),()=>{});};
 },[locationKey]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[mode]);
 useEffect(()=>{
  if(mode!=='success')return;
  const timer=window.setTimeout(onDone,5000);return()=>clearTimeout(timer);
 },[mode,onDone]);
 async function confirmed(value:unknown,saved:PendingPunch){
  const result=parseReceiptReply(value,saved.command);
  let storageWarning:string|null=null;
  try{const store=await recoveryJournal();await store.resolveExact(locationKey,saved,'recorded');if(!alive.current)return;setPending(null);setReferences(await store.references(locationKey));}
  catch{storageWarning='The action was recorded, but this browser could not clear its recovery data. Check it again after allowing browser storage.';}
  if(alive.current){setReceipt(result);setMessage(storageWarning);setMode('success');}
 }
 async function send(saved:PendingPunch,current:ClockView){
  if(busy.current||saved.subject!==current.subject)return;
  busy.current=true;setMode('sending');setMessage(null);
  try{
   // A committed IndexedDB transaction preserves the exact intent before sending.
   try{await (await recoveryJournal()).saveExact(locationKey,saved);}
   catch{setMode('storage');setMessage('Recovery storage is unavailable. No new request was sent. Allow browser storage before continuing.');return;}
   if(!alive.current)return;
   setPending(saved);
   const result=await postPunch(locationKey,{operation:'execute',command:saved.command});
   if(alive.current)await confirmed(result,saved);
  }catch(error){if(alive.current)failed(error,true);}
  finally{busy.current=false;}
 }
 function act(action:PunchAction,selection?:BreakSelection){
  if(!view||pending||busy.current||!['ready','confirm-out','select-break'].includes(mode))return;
  if(!punchActions(view).includes(action))return;
  void send({subject:view.subject,command:makePunchCommand(action,view,crypto.randomUUID(),selection)},view);
 }
 async function refresh(){
  if(busy.current)return;busy.current=true;setMode('loading');setMessage(null);
  try{
   const fresh=parseClockView(await postPunch(locationKey,{operation:'state'}));
   if(!alive.current)return;
   // Never allow a silent cookie switch to move a pending action to another person.
   if(pending&&pending.subject!==fresh.subject){setView(fresh);setMode('other-person');return;}
   if(view&&view.verificationId!==fresh.verificationId){setMode('auth');setMessage('Your verification changed. Enter your PIN again before continuing.');return;}
   setView(fresh);
   if(!pending){setMode('ready');return;}
   // State is read before the receipt. A missing receipt plus an obsolete state
   // rules out any later valid commit of this exact old command.
   const result=await postPunch(locationKey,{operation:'receipt',commandId:pending.command.commandId,verificationId:fresh.verificationId});
   if(!alive.current)return;
   if(result&&typeof result==='object'&&'state' in result&&result.state==='committed'){await confirmed(result,pending);return;}
   if(!result||typeof result!=='object'||!('state' in result)||result.state!=='unknown')throw Error('Unconfirmed response');
   if(canRetirePendingPunch(pending.command,fresh)){
    const store=await recoveryJournal();await store.resolveExact(locationKey,pending,'reviewed-context');if(!alive.current)return;setPending(null);setReferences(await store.references(locationKey));setMode('ready');
    setMessage('Your clock state or verification changed. No confirmation was found for the previous action, and nothing was replayed. Review the current state before choosing a new action.');
   }else{setMode('retry');setMessage('No saved confirmation was found yet. Retry the same action only; it keeps the original request ID.');}
  }catch(error){if(alive.current)failed(error,Boolean(pending));}
  finally{busy.current=false;}
 }
 const entry=view?.snapshot.entry,pause=view?.snapshot.break,allowed=view?punchActions(view):[];
 // One deep card for the likeliest next step: End Break on a break, otherwise Clock Out once clocked in.
 const lead=(['END_BREAK','CLOCK_OUT','CLOCK_IN'] as PunchAction[]).find(action=>allowed.includes(action));
 const actions=lead?[lead,...allowed.filter(action=>action!==lead)]:allowed;
 const status=entry?.status==='ON_BREAK'?'On Break':entry?'Clocked In':'Off Clock';
 const title=mode==='success'&&receipt?receipts[receipt.action]:mode==='confirm-out'?'Clock Out?':mode==='select-break'?'Choose a Break':mode==='sending'?'Recording Your Action…'
  :mode==='recovery'||mode==='retry'?'Check Your Last Action':mode==='other-person'?'Previous Action Needs Review'
  :mode==='auth'?'Verify Your PIN Again':mode==='loading'?'Checking Your Clock…':mode==='storage'?'Browser Storage Needed'
  :mode==='unavailable'?'Clock State Unavailable':t('Hi, {name}.',{name:view?.firstName??''});
 const waiting=mode==='loading'||mode==='sending';
 const since=entry?(entry.status==='ON_BREAK'?pause!.breakStartAt:entry.clockInAt):null;
 const orb:ClockerIconName|null=mode==='confirm-out'?'clock-out':mode==='auth'?'lock':['recovery','retry','other-person','storage','unavailable'].includes(mode)?'refresh':null;
 const left=mode==='ready'||mode==='select-break';
 return <div ref={motion} className={styles.panel} aria-busy={waiting} data-clocker-state={mode} data-align={left?'start':'center'}>
  {mode==='success'?<span className={styles.seal}><ClockerIcon name="check" size={52} weight={presentation.v2?'regular':'bold'}/></span>
   :orb?<span className={styles.orb} data-tone={mode==='confirm-out'||orb==='refresh'?'amber':undefined}><ClockerIcon name={orb} size={44} weight={presentation.v2?'regular':'duotone'}/></span>:null}
  <h1 ref={heading} tabIndex={-1} className={mode==='ready'?styles.hello:undefined}>{mode==='ready'?title:t(title)}</h1>
  {spanish&&(title in ESP)?<p className={styles.titleEs}><Es phrase={title as ClockerPhrase}/></p>:null}
  {mode==='ready'&&view?<>
   <p data-clocker-status className={styles.state} data-state={entry?.status==='ON_BREAK'?'break':entry?'on':'off'}><span aria-hidden="true"/>{t(shown[status])}</p>
   {spanish?<p className={styles.stateEs}><Es phrase={status as ClockerPhrase}/></p>:null}
   {entry&&since?<p className={styles.detail}>{t(entry.status==='ON_BREAK'?'Break started':'Clocked in')} <time dateTime={since}>{shortTime(since,timeZone,now,locale)}</time><span className={styles.dot} aria-hidden="true">·</span><span className={styles.ago}>{t('{elapsed} ago',{elapsed:elapsed(since,now)==='under a minute'?t('under a minute'):elapsed(since,now)})}</span></p>
    :<p className={styles.detail}>{t("Your time is recorded when you clock in.")}</p>}
   {pause?.type?<p className={styles.breakContext}><strong>{pause.type.name}</strong>{pause.type.targetMinutes!==null?' · '+t('Reference: {minutes} min',{minutes:pause.type.targetMinutes}):''}</p>:null}
   {entry?.status==='CLOCKED_IN'&&!view.breakTypes.length&&!view.atOtherLocation?<p data-clocker-notice className={styles.notice}>{t(view.breaksOff?'Breaks aren\u2019t recorded on the Clocker here.':'No break types are configured. Ask your Owner to add one.')}</p>:null}
   {!actions.length?<p data-clocker-notice className={styles.notice}>{t("This shift was started at another location. Use that location’s registered Clocker to continue.")}</p>:null}
   <div className={styles.cards}>{actions.map((action,i)=><button tabIndex={0} data-clocker-action key={action} type="button" className={`button ${i===0?'primary':'secondary'} ${styles.card}`} aria-label={t(labels[action])} onClick={()=>action==='CLOCK_OUT'?setMode('confirm-out'):action==='START_BREAK'?setMode('select-break'):act(action)}>
    <span className={styles.tile}><ClockerIcon name={actionIcons[action]} size={36} weight={presentation.v2?'regular':'duotone'}/></span>
    <span className="clocker-label"><span>{t(labels[action])}</span>{spanish?<Es phrase={labels[action] as ClockerPhrase} inButton/>:null}</span>
    <ClockerIcon name="arrow" size={22}/></button>)}</div>
   <div className={styles.foot}>
    <button tabIndex={0} className={`button ghost ${styles.link}`} type="button" onClick={onDone}>{t("Done")}</button>
    <button tabIndex={0} className={`button ghost ${styles.quiet}`} type="button" onClick={()=>void refresh()}><ClockerIcon name="refresh" size={18}/>{t("Refresh Clock State")}</button>
   </div>
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:null}
  {mode==='select-break'&&view?<>
   <p className={styles.detail}>{t("Reference times don’t end a break on their own.")}</p>
   <div className={styles.breakOptions}>{view.breakTypes.map(type=><button tabIndex={0} key={type.id} className={`button secondary ${styles.breakOption}`} type="button" aria-label={t('Start {name}',{name:type.name})} onClick={()=>act('START_BREAK',type)}>
    <span className={styles.tile}><ClockerIcon name={breakIcon(type.category)} size={32} weight={presentation.v2?'regular':'duotone'}/></span>
    <span className={styles.breakText}><strong>{type.name}</strong><span>{t(type.category==='REST'?'Rest':type.category==='MEAL'?'Meal':'Other')}{type.targetMinutes!==null?' · '+t('Reference: {minutes} min',{minutes:type.targetMinutes}):''}</span></span>
    <ClockerIcon name="arrow" size={22}/>
   </button>)}</div>
   <div className={styles.foot}><button tabIndex={0} type="button" className={`button ghost ${styles.link}`} onClick={()=>setMode('ready')}>{t("Back")}</button></div>
  </>:null}
  {mode==='confirm-out'?<>
   <p className={styles.detail}>{t("Your shift will end at the time recorded by NEVORA.")}</p>
   {entry?<dl className={styles.summary}><div><dt>{t("Clocked in")}</dt><dd><time dateTime={entry.clockInAt}>{shortTime(entry.clockInAt,timeZone,now,locale)}</time></dd></div><div><dt>{t("Since clock-in")}</dt><dd>{elapsed(entry.clockInAt,now)}</dd></div></dl>:null}
   {entry?.status==='ON_BREAK'?<p data-clocker-notice className={styles.notice}>{t("This will also end your current break.")}</p>:null}
   <div className={styles.stack}><button tabIndex={0} className="button primary" type="button" aria-label={t("Confirm Clock Out")} onClick={()=>act('CLOCK_OUT')}><span className="clocker-label"><span>{t("Confirm Clock Out")}</span>{spanish?<Es phrase="Confirm Clock Out" inButton/>:null}</span></button><button tabIndex={0} className="button secondary" type="button" aria-label={t("Keep Working")} onClick={()=>setMode('ready')}><span className="clocker-label"><span>{t("Keep Working")}</span>{spanish?<Es phrase="Keep Working" inButton/>:null}</span></button></div>
  </>:null}
  {mode==='success'&&receipt?<><p role="status" className={styles.saved}>{t("Saved at")}{' '}<time dateTime={receipt.performedAt}>{clockTime(receipt.performedAt,timeZone,locale)}</time>{t(". This screen will clear shortly.")}</p><span className={styles.countdown} aria-hidden="true"><i/></span></>:null}
  {mode==='other-person'?<p data-clocker-notice className={styles.notice}>{t("A previous employee’s action needs verification on this tablet. Ask that employee to enter their PIN again. No new action was sent.")}</p>:null}
  {references.length>0&&!waiting?<aside data-clocker-notice className={styles.notice}>
   <p>{t("Saved actions remain on this tablet. Each employee can check their own action after entering their PIN. An Owner can review a reference at Clocker Recovery in the portal.")}</p>
   <button type="button" className="button secondary" onClick={()=>setShowReferences(v=>!v)}>{t(showReferences?'Hide saved references':'Show saved references for an Owner')}</button>
   {showReferences?<ul>{references.map((r,i)=><li key={r.commandId??i}>{r.commandId?<code style={{overflowWrap:'anywhere'}}>{r.commandId}</code>:t('Unreadable recovery record — keep it saved for assistance')}</li>)}</ul>:null}
  </aside>:null}
  {waiting?<p role="status" className={styles.detail}>{t(mode==='sending'?'Keep this screen open while the action is checked.':'Reading the latest saved information.')}</p>:null}
  {waiting?<span className={styles.working} aria-hidden="true"/>:null}
  {message&&mode!=='other-person'?<p role={mode==='ready'||mode==='success'?'status':'alert'} data-clocker-notice className={styles.notice}>{t(message)}</p>:null}
  {mode==='recovery'||mode==='retry'?<div className={styles.stack}>
   <button tabIndex={0} className="button primary" type="button" onClick={()=>void refresh()}>{t("Check Action Status")}</button>
   {mode==='retry'&&pending&&view?<button tabIndex={0} className="button secondary" type="button" onClick={()=>void send(pending,view)}>{t("Retry Same Action")}</button>:null}
  </div>:null}
  {mode==='unavailable'?<div className={styles.stack}><button tabIndex={0} className="button primary" type="button" onClick={()=>void refresh()}>{t("Try Again")}</button></div>:null}
  {mode==='storage'?<p className={styles.detail}>{t("Do not clear recovery data for an unconfirmed action. An Owner can help check it.")}</p>:null}
  {!waiting&&!['ready','confirm-out','select-break'].includes(mode)?<button tabIndex={0} className={`button secondary ${styles.leave}`} type="button" aria-label={t(mode==='success'?'Done':'Return to PIN')} onClick={onDone}>{mode==='success'?<span className="clocker-label"><span>{t("Done")}</span>{spanish?<Es phrase="Done" inButton/>:null}</span>:t('Return to PIN')}</button>:null}
 </div>;
}
