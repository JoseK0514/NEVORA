'use client';

import { useEffect, useRef, useState } from 'react';
import { durationSentence } from '../lib/duration-format';
import { canRetirePendingPunch, makePunchCommand, parseClockView, parseReceiptReply,
 postPunch, punchActions, PunchRequestError, type ClockView, type PendingPunch } from '../lib/clocker/punch-client';
import {openClockerJournal} from '../lib/clocker/recovery-journal.browser';
import type {ClockerJournal,JournalReference} from '../lib/clocker/recovery-journal';
import type { PunchAction, PunchReceipt } from '../lib/clocker/punch-types';
import type { BreakSelection } from '../lib/clocker/break-types';
import {ClockerRecoveryHandoff} from './clocker-recovery';
import {CLOCKER_RECEIPT_CLEAR_MS,continuationFor,resumeContinuation,type ClockContinuation} from './clocker-privacy';
import styles from './clocker.module.css';
import {ClockerPunchPhotoFlow} from './clocker-photo/punch-photo-flow';
import {createClockerPhotoTransport} from '../lib/clocker/photo-client/transport';
import {readPhotoConfiguration,type PhotoSessionContext,type PhotoBindings} from '../lib/clocker/photo-client/session';
import { ClockerIcon, type ClockerIconName } from './clocker-icon';
import {ClockerText,useClockerCopy,useClockerIntlLocale,useClockerPresentation} from './clocker-language';
import {CLOCKER_PUNCH_ERRORS,clockerOthersSavedText,clockerPunchErrorKey,clockerUnconfirmedText} from './clocker-copy';
import {useClockerOnline,useWhenBackOnline} from './clocker-online';
import {FACE_TINTS} from '../lib/face-tint';
import {ClockerReceipt,receiptFacts,receiptTitles,shortTime} from './clocker-receipt';
import {useReportTabletHealth} from './clocker-shell';
const labels:Record<PunchAction,string>={CLOCK_IN:'Clock in',START_BREAK:'Start break',END_BREAK:'End break',CLOCK_OUT:'Clock out'};
const actionIcons:Record<PunchAction,ClockerIconName>={CLOCK_IN:'clock-in',START_BREAK:'break',END_BREAK:'resume',CLOCK_OUT:'clock-out'};
/* Direction B (approved Nov 8, 2026): what the recording card says, by action. The receipt is clocker-receipt.tsx. */
const recording:Record<PunchAction,string>={CLOCK_IN:'Clocking in {first}…',CLOCK_OUT:'Clocking out {first}…',START_BREAK:'Starting {first}’s break…',END_BREAK:'Ending {first}’s break…'};
type Mode='photo'|'review-current'|'select-break'|'loading'|'ready'|'confirm-out'|'sending'|'recovery'|'retry'|'other-person'|'auth'|'unavailable'|'storage'|'success';
const shown:Record<string,string>={'Clocked In':'Clocked in','On Break':'On break','Off Clock':'Off clock'};
/** Time since a recorded moment, for orientation only: "6 h 26 min", "12 min", "under a minute". */
function elapsed(value:string,now:number):string {
 const minutes=Math.max(0,Math.floor((now-new Date(value).getTime())/60000));
 if(minutes<1)return 'under a minute';
 return durationSentence(minutes);
}
/** The wall-clock moment a button was pressed, for the "not confirmed" sentence. Presentation only. */
const pressedAt=()=>Date.now();
const breakIcon=(category:string):ClockerIconName=>category==='REST'?'rest':category==='MEAL'?'meal':'break';
/* Face tints on the kiosk leave out the red and amber families, which mean stop and wait here (Nov 10 review, NV-301).
 * Same name hash as faceTint, so a person keeps one colour on the kiosk. */
const KIOSK_TINTS=FACE_TINTS.filter((_,index)=>index!==3&&index!==4);
function kioskTint(name:string){let hash=0;for(const ch of name)hash=(hash*31+ch.charCodeAt(0))>>>0;return KIOSK_TINTS[hash%KIOSK_TINTS.length];}
export function ClockerPunchPanel({locationKey,timeZone,onDone,resume,onContinuationChange,screenExpiresAt,screenMonotonicExpiresAt}:{screenMonotonicExpiresAt?:number;screenExpiresAt?:number;locationKey:string;timeZone:string;onDone:()=>void;resume?:ClockContinuation|null;onContinuationChange?:(draft:ClockContinuation|null)=>void}) {
 const t=useClockerCopy(),locale=useClockerIntlLocale(),{locale:language}=useClockerPresentation();
 const online=useClockerOnline();
 const [view,setView]=useState<ClockView|null>(null),[pending,setPending]=useState<PendingPunch|null>(null);
 const [mode,setMode]=useState<Mode>('loading'),[message,setMessage]=useState<string|null>(null);
 // Presentation only: the action being sent, for the recording card's line.
 const [sendingAction,setSendingAction]=useState<PunchAction|null>(null);
 const [photo,setPhoto]=useState<{context:PhotoSessionContext;bindings:PhotoBindings}|null>(null);
 const [receipt,setReceipt]=useState<PunchReceipt|null>(null);
 const [references,setReferences]=useState<JournalReference[]>([]);
 const reviewProof=useRef<{commandId:string;subject:string;verificationId:string}|null>(null);
 const journal=useRef<Promise<ClockerJournal>|null>(null);
 function recoveryJournal(){return journal.current??(journal.current=openClockerJournal());}
 const busy=useRef(false),alive=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 const [now,setNow]=useState(()=>Date.now());
 // Other people's saved punches on this tablet: a count only, for the saved-punch help (NV-185).
 const [otherCount,setOtherCount]=useState(0);
 // Presentation only: when the person pressed the action on this tablet, for "Your clock in at 9:02 AM is not confirmed yet."
 const [attemptAt,setAttemptAt]=useState<number|null>(null);
 useEffect(()=>{if(mode!=='ready'&&mode!=='confirm-out')return;const tick=()=>setNow(Date.now());const first=window.setTimeout(tick,0),timer=window.setInterval(tick,15000);return()=>{clearTimeout(first);clearInterval(timer);};},[mode]);
 function failed(error:unknown,hasPending:boolean){
  if(error instanceof PunchRequestError&&(['AUTH_REQUIRED','CONTEXT_CHANGED'].includes(error.code)||error.status===401)){
   setMode('auth');setMessage(CLOCKER_PUNCH_ERRORS.AUTH_REQUIRED);return;
  }
  setMode(hasPending?'recovery':'unavailable');
  /* The stable code picks the kiosk's sentence; the server's English sentence is never shown (Phase 6, item 1). No
   * sentence (null) means the result is simply not confirmed: the screen then names the action and its time. */
  const coded=error instanceof PunchRequestError?clockerPunchErrorKey(error.code):null;
  setMessage(coded??(hasPending?null:'We couldn’t load your time, so nothing was recorded. Tell a manager if you need your time recorded now.'));
 }
 useEffect(()=>{
  let current=true;alive.current=true;
  const load=async()=>{
   let saved:PendingPunch|null=null;
   try{
    const fresh=parseClockView(await postPunch(locationKey,{operation:'state'}));
    if(!current)return;
    try{const store=await recoveryJournal();saved=await store.read(locationKey,fresh.subject);const {references:refs,otherCount:others}=await store.references(locationKey,fresh.subject);if(!current)return;setReferences(refs);setOtherCount(others);}
    catch{if(!current)return;setMode('storage');setMessage('This tablet can’t read its saved punches right now. Ask your manager to check the tablet.');return;}
    setView(fresh);setPending(saved);setMode(saved?'recovery':resumeContinuation(resume,fresh));
   }catch(error){if(current){setPending(saved);failed(error,Boolean(saved));}}
  };
  // Cleanup owns the old connection; the next state load must open a fresh one.
  void load();return()=>{current=false;alive.current=false;const opened=journal.current;journal.current=null;void opened?.then(store=>store.close(),()=>{});};
 },[locationKey,resume]);
 useEffect(()=>{onContinuationChange?.(view&&!pending?continuationFor(view,mode):null);return()=>onContinuationChange?.(null);},[view,mode,pending,onContinuationChange]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[mode]);
 /* A punch that could not be confirmed is in the tablet's journal by now: read the saved references again so the
  * "Something didn’t save?" path is offered on this screen, not only after the next PIN (Phase 6, item 3). A read only. */
 useEffect(()=>{
  if(mode!=='recovery'||!view)return;
  let current=true;
  void recoveryJournal().then(store=>store.references(locationKey,view.subject)).then(kept=>{if(current&&alive.current){setReferences(kept.references);setOtherCount(kept.otherCount);}}).catch(()=>{});
  return()=>{current=false;};
 },[mode,view,locationKey]);
 useEffect(()=>{
  if(mode!=='success')return;
  const timer=window.setTimeout(onDone,CLOCKER_RECEIPT_CLEAR_MS);return()=>clearTimeout(timer);
 },[mode,onDone]);
 async function confirmed(value:unknown,saved:PendingPunch){
  const result=parseReceiptReply(value,saved.command);
  let storageWarning:string|null=null;
  try{const store=await recoveryJournal();await store.resolveExact(locationKey,saved,'recorded');if(!alive.current)return;setPending(null);const kept=await store.references(locationKey,saved.subject);setReferences(kept.references);setOtherCount(kept.otherCount);}
  catch{storageWarning='Your time is recorded. This tablet could not clear its saved copy; ask a manager to check the tablet.';}
  if(alive.current){setReceipt(result);setMessage(storageWarning);setMode('success');}
 }
 async function send(saved:PendingPunch,current:ClockView){
  if(busy.current||saved.subject!==current.subject)return;
  busy.current=true;setSendingAction(saved.command.action);setAttemptAt(pressedAt());setMode('sending');setMessage(null);
  try{
   if(current.photoCaptureAvailable&&!pending){
    const transport=createClockerPhotoTransport(locationKey);
    const config=readPhotoConfiguration(await transport.policy(AbortSignal.timeout(6000)));
    if(!alive.current)return;
    if(config.policy.enabled&&config.policy.events.includes(saved.command.action)){
     const context:PhotoSessionContext={screenMonotonicExpiresAt,intent:saved,policy:config.policy,notice:config.notice,proofExpiresAt:current.expiresAt,screenExpiresAt:new Date(screenExpiresAt??0).toISOString(),captureAuthorized:config.notice!==null};
     const boundTransport=createClockerPhotoTransport(locationKey,fetch,config.notice?{policyVersion:config.notice.policyVersion,profileVersion:config.notice.profileVersion}:null);
     const bindings:PhotoBindings={
      preserveIntent:async intent=>{await(await recoveryJournal()).saveExact(locationKey,intent);if(alive.current)setPending(intent);},
      verifyContext:async signal=>{const fresh=parseClockView(await postPunch(locationKey,{operation:'state'},signal));if(fresh.subject!==saved.subject||fresh.verificationId!==saved.command.verificationId||canRetirePendingPunch(saved.command,fresh))throw Error('Verification changed');const next=readPhotoConfiguration(await transport.policy(signal));if(JSON.stringify(next)!==JSON.stringify(config))throw Error('Photo policy changed');},
      commitExactPunch:(command,signal)=>postPunch(locationKey,{operation:'execute',command},signal),
      readExactPunch:async(command,signal)=>{const fresh=parseClockView(await postPunch(locationKey,{operation:'state'},signal));if(fresh.subject!==saved.subject||fresh.verificationId!==command.verificationId)throw Error('Verification changed');const result=await postPunch(locationKey,{operation:'receipt',commandId:command.commandId,verificationId:fresh.verificationId},signal);if(result&&typeof result==='object'&&'state' in result&&result.state==='committed')return result;return {state:canRetirePendingPunch(command,fresh)?'obsolete':'retry_allowed'};},transport:boundTransport,
     };setPhoto({context,bindings});setMode('photo');return;
    }
   }
   // A committed IndexedDB transaction preserves the exact intent before sending.
   try{await (await recoveryJournal()).saveExact(locationKey,saved);}
   catch{setMode('storage');setMessage('This tablet can’t save punches right now. No punch was sent. Ask your manager to check the tablet.');return;}
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
   if(view&&view.verificationId!==fresh.verificationId){setMode('auth');setMessage(CLOCKER_PUNCH_ERRORS.AUTH_REQUIRED);return;}
   setView(fresh);
   if(!pending){setMode('ready');return;}
   // State is read before the receipt. A missing receipt plus an obsolete state
   // rules out any later valid commit of this exact old command.
   const result=await postPunch(locationKey,{operation:'receipt',commandId:pending.command.commandId,verificationId:fresh.verificationId});
   if(!alive.current)return;
   if(result&&typeof result==='object'&&'state' in result&&result.state==='committed'){await confirmed(result,pending);return;}
   if(!result||typeof result!=='object'||!('state' in result)||result.state!=='unknown')throw Error('Unconfirmed response');
   if(canRetirePendingPunch(pending.command,fresh)){
    reviewProof.current={commandId:pending.command.commandId,subject:fresh.subject,verificationId:fresh.verificationId};setMode('review-current');
    setMessage('Your earlier punch was not recorded and can no longer be sent. See your current status, then choose what to do.');
   }else{setMode('retry');setMessage('We haven’t confirmed your last punch yet. Tap Send it again; it won’t record twice.');}
  }catch(error){if(alive.current)failed(error,Boolean(pending));}
  finally{busy.current=false;}
 }
 async function reviewCurrent(){
  const proof=reviewProof.current;if(busy.current||mode!=='review-current'||!pending||!view||!proof||proof.commandId!==pending.command.commandId||proof.subject!==view.subject||proof.verificationId!==view.verificationId||!canRetirePendingPunch(pending.command,view))return;
  busy.current=true;
  try{const store=await recoveryJournal();await store.resolveExact(locationKey,pending,'reviewed-context');if(!alive.current)return;setPending(null);const kept=await store.references(locationKey,pending.subject);setReferences(kept.references);setOtherCount(kept.otherCount);reviewProof.current=null;setMode('ready');setMessage('The earlier punch was kept for review. Nothing was punched again.');}
  catch{if(alive.current){setMode('storage');setMessage('This tablet can’t read its saved punches right now. Ask your manager to check the tablet.');}}
  finally{busy.current=false;}
 }
 // The band follows the card (Nov 10 review, NV-049); with no connection at all it says so on every clock screen.
 useReportTabletHealth('panel',mode==='unavailable'||!online?'offline':mode==='storage'?'storage':null);
 /* When the connection returns, the two screens that were waiting on it check again by themselves (Phase 6, RA-6): the
  * same read as the button (state, then the receipt of the saved punch). Nothing is sent again without the person. */
 useWhenBackOnline(mode==='recovery'||mode==='unavailable',()=>void refresh());
 if(photo&&mode==='photo')return <ClockerPunchPhotoFlow context={photo.context} bindings={photo.bindings} timeZone={timeZone} firstName={view?.firstName??''} onExit={result=>{
  if(result.receipt){
   try{parseReceiptReply({state:'committed',receipt:result.receipt},photo.context.intent.command);}catch{onDone();return;}
   // This independent connection may finish after the private panel unmounts.
   // A failed cleanup leaves the exact pending intent for canonical recovery.
   void openClockerJournal().then(async store=>{try{await store.resolveExact(locationKey,photo.context.intent,'recorded');}finally{store.close();}}).catch(()=>undefined);
  }
  onDone();
 }}/>;
 const entry=view?.snapshot.entry,pause=view?.snapshot.break,allowed=view?punchActions(view):[];
 // One teal action for the likeliest next step: End break on a break, otherwise Clock out once clocked in.
 const lead=(['END_BREAK','CLOCK_OUT','CLOCK_IN'] as PunchAction[]).find(action=>allowed.includes(action));
 const actions=lead?[lead,...allowed.filter(action=>action!==lead)]:allowed;
 const status=entry?.status==='ON_BREAK'?'On Break':entry?'Clocked In':'Off Clock';
 const cancelLabel=entry?.status==='ON_BREAK'?'Stay on break':'Cancel clock-out';
 const title=mode==='review-current'?'See your current status':mode==='success'&&receipt?receiptTitles[receipt.action]:mode==='confirm-out'?'Clock out?':mode==='select-break'?'Choose a break':mode==='sending'?'Recording…'
  :mode==='recovery'||mode==='retry'?'Check your last punch':mode==='other-person'?'Someone else’s punch is waiting'
  :mode==='auth'?'Enter your PIN again':mode==='loading'?'Checking your clock…':mode==='storage'?'This tablet can’t save right now'
  :mode==='unavailable'?(online?'We couldn’t load your time':'No connection'):t('Hi, {name}.',{name:view?.firstName??''});
 const waiting=mode==='loading'||mode==='sending';
 const since=entry?(entry.status==='ON_BREAK'?pause!.breakStartAt:entry.clockInAt):null;
 // Direction B: one 64px ring per state (red stop, amber wait or check, green done, teal information).
 const ring:[ClockerIconName,'teal'|'amber'|'red']|null=mode==='confirm-out'?['clock-out','amber']:mode==='auth'?['lock','amber']:mode==='unavailable'?['stop','red']
  :mode==='storage'?['warning','amber']:['recovery','retry','review-current','other-person'].includes(mode)?['refresh','amber']:waiting?['wait','teal']:null;
 const left=mode==='ready'||mode==='select-break';
 const first=view?.firstName??'';
 const tint=kioskTint(first);
 const face=(size?:'sm')=>first?<span className={styles.face} data-size={size} style={{background:tint[0],color:tint[1]}} aria-hidden="true">{first.slice(0,1).toUpperCase()}</span>:null;
 // Saved-action help stays off the two decision screens (Nov 10 review, NV-302).
 const handoff=(inline:boolean)=>references.length>0&&view&&(!pending||pending.subject===view.subject)&&!waiting&&!['success','select-break','confirm-out','auth','other-person'].includes(mode)?<ClockerRecoveryHandoff inline={inline} key={pending?.command.commandId??'tablet-assistance'} references={references} otherCount={otherCount} locationKey={locationKey} commandId={pending?.command.commandId??null}/>:null;
 /* Leaving (Nov 10 review, NV-184, NV-305): beside the state's own actions it is a text link in the same stack; when it is
  * the only way on, it is the primary button. The receipt keeps its grey Done. */
 const withActions=['recovery','retry','unavailable','review-current'].includes(mode);
 const leave=waiting||['ready','confirm-out','select-break'].includes(mode)?null:mode==='success'
  ?<button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={onDone}>{t('Done')}</button>
  :withActions?<button tabIndex={0} className={styles.link} type="button" onClick={onDone}>{t('Return to PIN')}</button>
  :<button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={onDone}>{t('Return to PIN')}</button>;
 // On the ready screens a notice is an information box with its icon (NV-300).
 /* Not confirmed (Phase 6, RA-6 and MK-8): which action, when it was pressed, and that the tablet kept it. Never "failed"
  * and never "saved": the result is unknown until the check comes back. */
 const unconfirmed=mode==='recovery'&&pending&&!message?clockerUnconfirmedText(language,pending.command.action,
  attemptAt===null?null:new Intl.DateTimeFormat(locale,{timeZone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(attemptAt))):null;
 const others=clockerOthersSavedText(language,otherCount);
 const notice=message&&mode!=='other-person'?left
  ?<div role="status" data-clocker-notice className={styles.note}><ClockerIcon name="info" size={20}/><p><ClockerText text={message}/></p></div>
  :<p role={mode==='success'?'status':'alert'} data-clocker-notice className={styles.smsg}><ClockerText text={message}/></p>:null;
 return <div className={styles.content} aria-busy={waiting} data-clocker-state={mode} data-align={left?'start':'center'}>
  {mode==='success'?<span className={styles.check}><ClockerIcon name="check" size={52}/></span>
   :ring?<span className={styles.ring} data-tone={ring[1]==='teal'?undefined:ring[1]}><ClockerIcon name={ring[0]} size={28}/></span>:null}
  {mode==='ready'?<div className={styles.who}>{face()}<h1 ref={heading} tabIndex={-1} className={styles.title}>{title}</h1></div>
   :<h1 ref={heading} tabIndex={-1} className={styles.title}>{t(title)}</h1>}
  {mode==='ready'&&view?<>
   <div className={styles.strow}>
    <p data-clocker-status className={styles.chip} data-state={entry?.status==='ON_BREAK'?'break':entry?'on':'off'}>{t(shown[status])}</p>
    {entry&&since?<p className={styles.detail}>{t('Since')} <time dateTime={since}>{shortTime(since,timeZone,now,locale)}</time> · <span className={styles.ago}>{t('{elapsed} ago',{elapsed:elapsed(since,now)==='under a minute'?t('under a minute'):elapsed(since,now)})}</span></p>
     :<p className={styles.detail}>{t("Your time is recorded when you clock in.")}</p>}
   </div>
   {pause?.type?<p className={styles.breakContext}><strong>{pause.type.name}</strong>{pause.type.targetMinutes!==null?' · '+t('Suggested: {minutes} min',{minutes:pause.type.targetMinutes}):''}</p>:null}
   {notice}
   {!online?<div role="status" data-clocker-notice data-clocker-offline="" className={styles.note} data-tone="amber"><ClockerIcon name="offline" size={20}/><p>{t('No connection. Wait for it to return before you clock in or out, or tell a manager.')}</p></div>:null}
   {entry?.status==='CLOCKED_IN'&&!view.breakTypes.length&&!view.atOtherLocation?<div data-clocker-notice className={styles.note}><ClockerIcon name="info" size={20}/><p>{t(view.breaksOff?'Breaks aren’t recorded on the Clocker here.':'There are no breaks to choose here yet. Ask your Owner to add one.')}</p></div>:null}
   {!actions.length?<div className={styles.other}><span className={styles.ring} data-tone="amber"><ClockerIcon name="building" size={28}/></span><p data-clocker-notice className={styles.smsg}>{t(view.commerceRestriction==='paused'&&!view.atOtherLocation?"New clock-ins are paused for this workplace. Your Owner can restore access. Ask a manager to record your time.":"This shift was started at another location. Use that location’s registered Clocker to continue.")}</p></div>:null}
   {actions.length?<div className={styles.acts}>{actions.map((action,i)=><button tabIndex={0} data-clocker-action key={action} type="button" className={styles.act} data-kind={i===0?'primary':'secondary'} aria-label={t(labels[action])} onClick={()=>action==='CLOCK_OUT'?setMode('confirm-out'):action==='START_BREAK'?setMode('select-break'):act(action)}>
    <span className={styles.actIcon}><ClockerIcon name={actionIcons[action]} size={28}/></span>
    <span className={styles.actText}>{t(labels[action])}</span>
    <ClockerIcon name="arrow" size={22}/></button>)}</div>:null}
   <div className={styles.panelFoot}>
    <button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={onDone}>{t("Done")}</button>
    <div className={styles.links}>
     <button tabIndex={0} className={styles.link} type="button" onClick={()=>void refresh()}><ClockerIcon name="refresh" size={18}/>{t("Refresh")}</button>
     {handoff(true)}
    </div>
    <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
   </div>
  </>:null}
  {mode==='select-break'&&view?<>
   <p className={styles.lead}>{t("Your break doesn’t end on its own. Tap End break when you’re back.")}</p>
   <div className={styles.acts}>{view.breakTypes.map(type=><button tabIndex={0} key={type.id} className={styles.act} data-kind="secondary" type="button" aria-label={t('Start {name}',{name:type.name})} onClick={()=>act('START_BREAK',type)}>
    <span className={styles.actIcon}><ClockerIcon name={breakIcon(type.category)} size={28}/></span>
    <span className={styles.actText}>{type.name}<small>{t(type.category==='REST'?'Rest':type.category==='MEAL'?'Meal':'Other')}{type.targetMinutes!==null?' · '+t('Suggested: {minutes} min',{minutes:type.targetMinutes}):''}</small></span>
    <ClockerIcon name="arrow" size={22}/>
   </button>)}</div>
   <div className={styles.stack}><button tabIndex={0} type="button" className={styles.btn} data-kind="secondary" onClick={()=>setMode('ready')}>{t("Back")}</button></div>
   {/* The same 30-second private window runs here (NV-181). */}
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:null}
  {mode==='confirm-out'?<>
   <p className={styles.smsg}>{t("Your shift will end at the time recorded by NEVORA.")}</p>
   {entry?<dl className={styles.facts}><div><dt>{t("Clocked in at")}</dt><dd><time dateTime={entry.clockInAt}>{shortTime(entry.clockInAt,timeZone,now,locale)}</time></dd></div><div><dt>{t("Since clock-in")}</dt><dd>{elapsed(entry.clockInAt,now)==='under a minute'?t('under a minute'):elapsed(entry.clockInAt,now)}</dd></div></dl>:null}
   {entry?.status==='ON_BREAK'?<p data-clocker-notice className={styles.msg} data-tone="amber"><ClockerIcon name="warning" size={18}/><span>{t("This will also end your current break.")}</span></p>:null}
   <div className={styles.stack}><button tabIndex={0} className={styles.btn} data-kind="primary" type="button" aria-label={t("Confirm clock out")} onClick={()=>act('CLOCK_OUT')}>{t("Confirm clock out")}</button><button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" aria-label={t(cancelLabel)} onClick={()=>setMode('ready')}>{t(cancelLabel)}</button></div>
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:null}
  {mode==='success'&&receipt?<ClockerReceipt action={receipt.action} performedAt={receipt.performedAt} commandId={receipt.commandId} timeZone={timeZone} locale={locale} firstName={first} facts={receiptFacts(receipt,view?.snapshot,timeZone,locale)}/>:null}
  {mode==='sending'&&first&&sendingAction?<p className={styles.doing}>{face('sm')}<span>{t(recording[sendingAction],{first})}</span></p>:null}
  {waiting?<><span className={styles.progress} aria-hidden="true"><i/></span><p role="status" className={styles.smsg}>{t(mode==='sending'?'Keep this screen open while it saves.':'Getting your latest time.')}</p></>:null}
  {mode==='other-person'?<p role="alert" data-clocker-notice className={styles.smsg}>{t("The person before you has a punch that isn’t confirmed on this tablet. Ask them to enter their PIN again. Nothing was recorded for you.")}</p>:null}
  {mode!=='ready'?notice:null}
  {unconfirmed?<p role="alert" data-clocker-notice data-clocker-unconfirmed="" className={styles.smsg}>{unconfirmed}</p>:null}
  {mode==='recovery'?<p className={styles.blockedHint}>{t('This tablet kept the attempt and will not record it twice. Tell a manager now, then tap Check if it saved.')}</p>:null}
  {(mode==='recovery'||mode==='unavailable')&&!online?<p role="status" data-clocker-offline="" className={styles.msg} data-tone="amber"><ClockerIcon name="offline" size={18}/><span>{t('No connection. This tablet checks again by itself when it returns.')}</span></p>:null}
  {/* Saved for later: how many other people have a saved punch on this tablet, never whose (item 3). */}
  {(mode==='recovery'||mode==='retry')&&others?<p data-clocker-others-saved="" className={styles.clears}>{others}</p>:null}
  {mode==='storage'?<p className={styles.smsg}>{t("Don’t clear this tablet’s browser data while a punch is unconfirmed. Your manager can help check it.")}</p>:null}
  {mode==='review-current'?<div className={styles.stack}><button type="button" className={styles.btn} data-kind="primary" onClick={()=>void reviewCurrent()}>{t('See current status')}</button>{leave}</div>:null}
  {mode==='recovery'||mode==='retry'?<div className={styles.stack}>
   <button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={()=>void refresh()}>{t("Check if it saved")}</button>
   {mode==='retry'&&pending&&view?<button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={()=>void send(pending,view)}>{t("Send it again")}</button>:null}
   {leave}
  </div>:null}
  {mode==='unavailable'?<div className={styles.stack}><button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={()=>void refresh()}>{t("Try again")}</button>{leave}</div>:null}
  {leave&&!withActions?<div className={styles.stack}>{leave}</div>:null}
  {mode!=='ready'?handoff(false):null}
 </div>;
}
