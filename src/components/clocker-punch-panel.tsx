'use client';

import { useEffect, useRef, useState } from 'react';
import { canRetirePendingPunch, forgetPendingPunch, makePunchCommand, parseClockView, parseReceiptReply,
 postPunch, punchActions, PunchRequestError, readPendingPunch, savePendingPunch, type ClockView, type PendingPunch } from '../lib/clocker/punch-client';
import type { PunchAction, PunchReceipt } from '../lib/clocker/punch-types';
import type { BreakSelection } from '../lib/clocker/break-types';
import styles from './clocker-punch.module.css';
const labels:Record<PunchAction,string>={CLOCK_IN:'Clock In',START_BREAK:'Start Break',END_BREAK:'End Break',CLOCK_OUT:'Clock Out'};
const receipts:Record<PunchAction,string>={CLOCK_IN:'Clock In Recorded',START_BREAK:'Break Start Recorded',END_BREAK:'Break End Recorded',CLOCK_OUT:'Clock Out Recorded'};
type Mode='select-break'|'loading'|'ready'|'confirm-out'|'sending'|'recovery'|'retry'|'other-person'|'auth'|'unavailable'|'storage'|'success';
function clockTime(value:string,timeZone:string):string {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(value));
 const part=(name:Intl.DateTimeFormatPartTypes)=>parts.find(p=>p.type===name)?.value??'';
 return `${part('month')} ${part('day')} · ${part('hour')}:${part('minute')} ${part('dayPeriod')}`;
}
export function ClockerPunchPanel({locationKey,timeZone,onDone}:{locationKey:string;timeZone:string;onDone:()=>void}) {
 const [view,setView]=useState<ClockView|null>(null),[pending,setPending]=useState<PendingPunch|null>(null);
 const [mode,setMode]=useState<Mode>('loading'),[message,setMessage]=useState<string|null>(null);
 const [receipt,setReceipt]=useState<PunchReceipt|null>(null);
 const busy=useRef(false),alive=useRef(false),heading=useRef<HTMLHeadingElement>(null);
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
   let saved:PendingPunch|null;
   try{saved=readPendingPunch(window.sessionStorage,locationKey);}
   catch{if(current){setMode('storage');setMessage('This tablet cannot read its recovery data. Allow browser storage and reload before clocking.');}return;}
   try{
    const fresh=parseClockView(await postPunch(locationKey,{operation:'state'}));
    if(!current)return;setView(fresh);setPending(saved);setMode(saved?(saved.subject===fresh.subject?'recovery':'other-person'):'ready');
   }catch(error){if(current){setPending(saved);failed(error,Boolean(saved));}}
  };
  void load();return()=>{current=false;alive.current=false;};
 },[locationKey]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[mode]);
 useEffect(()=>{
  if(mode!=='success')return;
  const timer=window.setTimeout(onDone,5000);return()=>clearTimeout(timer);
 },[mode,onDone]);
 function confirmed(value:unknown,saved:PendingPunch){
  const result=parseReceiptReply(value,saved.command);
  let storageWarning:string|null=null;
  try{forgetPendingPunch(window.sessionStorage,locationKey);setPending(null);}
  catch{storageWarning='The action was recorded, but this browser could not clear its recovery data. Check it again after allowing browser storage.';}
  setReceipt(result);setMessage(storageWarning);setMode('success');
 }
 async function send(saved:PendingPunch,current:ClockView){
  if(busy.current||saved.subject!==current.subject)return;
  busy.current=true;setMode('sending');setMessage(null);
  try{
   // Durable per-tab intent is saved and read back BEFORE the HTTP request.
   try{savePendingPunch(window.sessionStorage,locationKey,saved);}
   catch{setMode('storage');setMessage('Recovery storage is unavailable. No new request was sent. Allow browser storage before continuing.');return;}
   setPending(saved);
   const result=await postPunch(locationKey,{operation:'execute',command:saved.command});
   if(alive.current)confirmed(result,saved);
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
   if(result&&typeof result==='object'&&'state' in result&&result.state==='committed'){confirmed(result,pending);return;}
   if(!result||typeof result!=='object'||!('state' in result)||result.state!=='unknown')throw Error('Unconfirmed response');
   if(canRetirePendingPunch(pending.command,fresh)){
    forgetPendingPunch(window.sessionStorage,locationKey);setPending(null);setMode('ready');
    setMessage('Your clock state or verification changed. No confirmation was found for the previous action, and nothing was replayed. Review the current state before choosing a new action.');
   }else{setMode('retry');setMessage('No saved confirmation was found yet. Retry the same action only; it keeps the original request ID.');}
  }catch(error){if(alive.current)failed(error,Boolean(pending));}
  finally{busy.current=false;}
 }
 const entry=view?.snapshot.entry,pause=view?.snapshot.break,actions=view?punchActions(view):[];
 const status=entry?.status==='ON_BREAK'?'On Break':entry?'Clocked In':'Off Clock';
 const title=mode==='success'&&receipt?receipts[receipt.action]:mode==='confirm-out'?'Clock Out?':mode==='select-break'?'Choose a Break':mode==='sending'?'Recording Your Action…'
  :mode==='recovery'||mode==='retry'?'Check Your Last Action':mode==='other-person'?'Previous Action Needs Review'
  :mode==='auth'?'Verify Your PIN Again':mode==='loading'?'Checking Your Clock…':mode==='storage'?'Browser Storage Needed'
  :mode==='unavailable'?'Clock State Unavailable':`Hi, ${view?.firstName??''}.`;
 const waiting=mode==='loading'||mode==='sending';
 return <div className={styles.panel} aria-busy={waiting}>
  {mode==='success'?<div className={styles.successMark} aria-hidden="true">✓</div>:null}
  <h1 ref={heading} tabIndex={-1}>{title}</h1>
  {mode==='ready'&&view?<>
   <span className={`${styles.state} ${entry?styles.active:''}`}>{status}</span>
   {entry?<p className={styles.detail}>{entry.status==='ON_BREAK'?'Break started':'Clocked in'} <time dateTime={entry.status==='ON_BREAK'?pause!.breakStartAt:entry.clockInAt}>{clockTime(entry.status==='ON_BREAK'?pause!.breakStartAt:entry.clockInAt,timeZone)}</time></p>:<p className={styles.detail}>Ready to begin? Your time is recorded when you clock in.</p>}
   {pause?.type?<p className={styles.breakContext}><strong>{pause.type.name}</strong>{pause.type.targetMinutes!==null?` · Reference: ${pause.type.targetMinutes} min`:''}</p>:null}
   {entry?.status==='CLOCKED_IN'&&!view.breakTypes.length&&!view.atOtherLocation?<p className={styles.notice}>No break types are configured. Ask your Owner to add one.</p>:null}
   {!actions.length?<p className={styles.notice}>This shift was started at another location. Use that location’s registered Clocker to continue.</p>:null}
   <div className={styles.actions}>{actions.map((action,i)=><button tabIndex={0} key={action} type="button" className={`button ${i===0?'primary':'secondary'}`} onClick={()=>action==='CLOCK_OUT'?setMode('confirm-out'):action==='START_BREAK'?setMode('select-break'):act(action)}>{labels[action]}</button>)}</div>
   <button tabIndex={0} className={`button ghost ${styles.quiet}`} type="button" onClick={()=>void refresh()}>Refresh Clock State</button>
  </>:null}
  {mode==='select-break'&&view?<>
   <p className={styles.detail}>Choose the break you are starting. Reference durations do not end a break automatically.</p>
   <div className={styles.breakOptions}>{view.breakTypes.map(type=><button tabIndex={0} key={type.id} className={`button secondary ${styles.breakOption}`} type="button" aria-label={`Start ${type.name}`} onClick={()=>act('START_BREAK',type)}>
    <strong>{type.name}</strong><span>{type.category==='REST'?'Rest':type.category==='MEAL'?'Meal':'Other'}{type.targetMinutes!==null?` · Reference: ${type.targetMinutes} min`:''}</span>
   </button>)}</div>
   <button tabIndex={0} type="button" className="button secondary" onClick={()=>setMode('ready')}>Back</button>
  </>:null}
  {mode==='confirm-out'?<>
   <p className={styles.detail}>Your shift will end at the time recorded by NEVORA.</p>
   {entry?.status==='ON_BREAK'?<p className={styles.notice}>This will also end your current break.</p>:null}
   <div className={styles.actions}><button tabIndex={0} className="button primary" type="button" onClick={()=>act('CLOCK_OUT')}>Confirm Clock Out</button><button tabIndex={0} className="button secondary" type="button" onClick={()=>setMode('ready')}>Keep Working</button></div>
  </>:null}
  {mode==='success'&&receipt?<p role="status" className={styles.detail}>Saved at <time dateTime={receipt.performedAt}>{clockTime(receipt.performedAt,timeZone)}</time>. This screen will clear shortly.</p>:null}
  {mode==='other-person'?<p className={styles.notice}>A previous employee’s action needs verification on this tablet. Ask that employee to enter their PIN again. No new action was sent.</p>:null}
  {waiting?<p role="status" className={styles.detail}>{mode==='sending'?'Keep this screen open while the action is checked.':'Reading the latest saved information.'}</p>:null}
  {message&&mode!=='other-person'?<p role={mode==='ready'||mode==='success'?'status':'alert'} className={styles.notice}>{message}</p>:null}
  {mode==='recovery'||mode==='retry'?<div className={styles.actions}>
   <button tabIndex={0} className="button primary" type="button" onClick={()=>void refresh()}>Check Action Status</button>
   {mode==='retry'&&pending&&view?<button tabIndex={0} className="button secondary" type="button" onClick={()=>void send(pending,view)}>Retry Same Action</button>:null}
  </div>:null}
  {mode==='unavailable'?<button tabIndex={0} className="button primary" type="button" onClick={()=>void refresh()}>Try Again</button>:null}
  {mode==='storage'?<p className={styles.detail}>Do not clear recovery data for an unconfirmed action. An Owner can help check it.</p>:null}
  {!waiting&&!['confirm-out','select-break'].includes(mode)?<button tabIndex={0} className={`button ghost ${styles.quiet}`} type="button" onClick={onDone}>{mode==='ready'||mode==='success'?'Done':'Return to PIN'}</button>:null}
 </div>;
}
