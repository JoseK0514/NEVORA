'use client';

import { useEffect, useRef, useState } from 'react';
import { durationSentence } from '../lib/duration-format';
import { canRetirePendingPunch, makePunchCommand, parseClockView, parseReceiptReply,
 postPunch, punchActions, PunchRequestError, type ClockView, type PendingPunch } from '../lib/clocker/punch-client';
import {openClockerJournal} from '../lib/clocker/recovery-journal.browser';
import type {ClockerJournal,JournalReference} from '../lib/clocker/recovery-journal';
import type { PunchAction, PunchReceipt } from '../lib/clocker/punch-types';
import type { BreakSelection } from '../lib/clocker/break-types';
import {ClockerRecoveryHelp,ClockerRecoveryLink,useClockerReviewRequest} from './clocker-recovery';
import {CLOCKER_RECEIPT_CLEAR_MS,continuationFor,resumeContinuation,type ClockContinuation} from './clocker-privacy';
import styles from './clocker.module.css';
import { drawDone, prefersReducedMotion, stopMotion } from './clocker-motion';
import {ClockerPunchPhotoFlow} from './clocker-photo/punch-photo-flow';
import {createClockerPhotoTransport} from '../lib/clocker/photo-client/transport';
import {readPhotoConfiguration,type PhotoSessionContext,type PhotoBindings} from '../lib/clocker/photo-client/session';
import { ClockerIcon, type ClockerIconName } from './clocker-icon';
import { DoneTick } from './owner-b/b-glyphs';
import {ClockerText,useClockerCopy,useClockerIntlLocale,useClockerKeepNames,useClockerPresentation} from './clocker-language';
import {CLOCKER_PUNCH_ERRORS,clockerOthersSavedText,clockerPunchErrorKey,clockerText,clockerUnconfirmedText} from './clocker-copy';
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
/* Phase 8: a blocked tablet store says which half failed, so the heading and its sentence agree (#22). */
const STORAGE_READ='Nothing was sent. Ask a manager to check this tablet.';
const STORAGE_SAVE='No punch was sent. Ask a manager to check this tablet.';

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
 const t=useClockerCopy(),keep=useClockerKeepNames(),locale=useClockerIntlLocale(),{locale:language}=useClockerPresentation();
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
 // Presentation only: whether the last failure came back from NEVORA, so the band never says "No connection" while online.
 const [reached,setReached]=useState(true);
 // Presentation only (Phase 8): the saved-punch help is open, as its own card state over this screen's mode. It closes
 // by itself when the screen's mode changes.
 const [helpFor,setHelpFor]=useState<Mode|null>(null);
 useEffect(()=>{if(mode!=='ready'&&mode!=='confirm-out')return;const tick=()=>setNow(Date.now());const first=window.setTimeout(tick,0),timer=window.setInterval(tick,15000);return()=>{clearTimeout(first);clearInterval(timer);};},[mode]);
 function failed(error:unknown,hasPending:boolean){
  if(error instanceof PunchRequestError&&(['AUTH_REQUIRED','CONTEXT_CHANGED'].includes(error.code)||error.status===401)){
   setMode('auth');setMessage(CLOCKER_PUNCH_ERRORS.AUTH_REQUIRED);return;
  }
  setReached(error instanceof PunchRequestError&&error.status<500);
  setMode(hasPending?'recovery':'unavailable');
  /* The stable code picks the kiosk's sentence; the server's English sentence is never shown (Phase 6, item 1). No
   * sentence (null) means the result is simply not confirmed: the screen then names the action and its time. */
  const coded=error instanceof PunchRequestError?clockerPunchErrorKey(error.code):null;
  // Premium pass (#18): the title already says the time couldn't be loaded, so the line says only what that means.
  setMessage(coded??(hasPending?null:'Nothing was recorded. Tell a manager if you need your time recorded now.'));
 }
 useEffect(()=>{
  let current=true;alive.current=true;
  const load=async()=>{
   let saved:PendingPunch|null=null;
   try{
    const fresh=parseClockView(await postPunch(locationKey,{operation:'state'}));
    if(!current)return;
    try{const store=await recoveryJournal();saved=await store.read(locationKey,fresh.subject);const {references:refs,otherCount:others}=await store.references(locationKey,fresh.subject);if(!current)return;setReferences(refs);setOtherCount(others);}
    catch{if(!current)return;setMode('storage');setMessage(STORAGE_READ);return;}
    setView(fresh);setPending(saved);setMode(saved?'recovery':resumeContinuation(resume,fresh));
   }catch(error){if(current){setPending(saved);failed(error,Boolean(saved));}}
  };
  // Cleanup owns the old connection; the next state load must open a fresh one.
  void load();return()=>{current=false;alive.current=false;const opened=journal.current;journal.current=null;void opened?.then(store=>store.close(),()=>{});};
 },[locationKey,resume]);
 useEffect(()=>{onContinuationChange?.(view&&!pending?continuationFor(view,mode):null);return()=>onContinuationChange?.(null);},[view,mode,pending,onContinuationChange]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[mode,helpFor]);
 /* Verified (Jose, Nov 25: premium through motion): the first time the person's screen is ready, the done mark on their
  * initial draws its tick, then the greeting arrives. Focus has already moved; this is only paint. Later returns to this
  * screen (Back from breaks) show the mark still. */
 const doneMark=useRef<HTMLSpanElement>(null),drewDone=useRef(false);
 useEffect(()=>{
  if(mode!=='ready'||drewDone.current||!doneMark.current)return;drewDone.current=true;
  const motion=drawDone(doneMark.current,doneMark.current.querySelector('path'),heading.current,prefersReducedMotion());return()=>stopMotion(motion);
 },[mode]);
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
   catch{setMode('storage');setMessage(STORAGE_SAVE);return;}
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
    setMessage('This tablet can no longer send it. Tap See current status, then choose what to do.');
   }else{setMode('retry');setMessage('Your last punch still isn’t confirmed. Tap Send it again. It won’t record twice.');}
  }catch(error){if(alive.current)failed(error,Boolean(pending));}
  finally{busy.current=false;}
 }
 async function reviewCurrent(){
  const proof=reviewProof.current;if(busy.current||mode!=='review-current'||!pending||!view||!proof||proof.commandId!==pending.command.commandId||proof.subject!==view.subject||proof.verificationId!==view.verificationId||!canRetirePendingPunch(pending.command,view))return;
  busy.current=true;
  try{const store=await recoveryJournal();await store.resolveExact(locationKey,pending,'reviewed-context');if(!alive.current)return;setPending(null);const kept=await store.references(locationKey,pending.subject);setReferences(kept.references);setOtherCount(kept.otherCount);reviewProof.current=null;setMode('ready');setMessage('Your earlier punch is kept on this tablet for review. Nothing new was recorded.');}
  catch{if(alive.current){setMode('storage');setMessage(STORAGE_READ);}}
  finally{busy.current=false;}
 }
 // The band follows the card (Nov 10 review, NV-049); with no connection at all it says so on every clock screen.
 // Phase 8: online but NEVORA did not answer is "Can't reach NEVORA", and a refusal NEVORA did send leaves the band as it is.
 useReportTabletHealth('panel',!online?'offline':mode==='unavailable'&&!reached?'unreached':mode==='storage'?'storage':null);
 /* When the connection returns, the two screens that were waiting on it check again by themselves (Phase 6, RA-6): the
  * same read as the button (state, then the receipt of the saved punch). Nothing is sent again without the person. */
 useWhenBackOnline(mode==='recovery'||mode==='unavailable',()=>void refresh());
 // The request to the Owner belongs to the saved punch, not to the help card, so it survives the help closing (Phase 8).
 const helpCommand=pending?.command.commandId??null,review=useClockerReviewRequest(locationKey,helpCommand);
 if(photo&&mode==='photo')return <ClockerPunchPhotoFlow context={photo.context} bindings={photo.bindings} timeZone={timeZone} firstName={view?.firstName??''} snapshot={view?.snapshot} onExit={result=>{
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
 const cancelLabel=entry?.status==='ON_BREAK'?'Stay on break':'Stay clocked in';
 const title=mode==='review-current'?'Your earlier punch wasn’t recorded':mode==='success'&&receipt?receiptTitles[receipt.action]:mode==='confirm-out'?'Clock out?':mode==='select-break'?'Choose a break':mode==='sending'?(view?.firstName&&sendingAction?recording[sendingAction]:'Recording…')
  :mode==='recovery'||mode==='retry'?'Check your last punch':mode==='other-person'?'Someone else’s punch is waiting'
  :mode==='auth'?'Enter your PIN again':mode==='loading'?'Checking your clock…':mode==='storage'?message===STORAGE_SAVE?'This tablet can’t save punches':'This tablet can’t read its saved punches'
  :mode==='unavailable'?(online?'We couldn’t load your time':'No connection'):'Hi, {name}.';
 const waiting=mode==='loading'||mode==='sending';
 const since=entry?(entry.status==='ON_BREAK'?pause!.breakStartAt:entry.clockInAt):null;
 // Direction B: one 64px ring per state (red stop, amber wait or check, green done, teal information). Premium pass (Nov 18,
 // 2026, decision 2): a punch that isn't confirmed is the amber Question, never the circular arrow, which is only Refresh and
 // Try again. A tablet that can't keep punches stops the person (red), and no connection is the Wi-Fi glyph only when the
 // browser says the network is gone.
 const ring:[ClockerIconName,'teal'|'amber'|'red']|null=mode==='confirm-out'?['clock-out','amber']:mode==='auth'?['lock','amber']:mode==='unavailable'?[online?'stop':'offline','red']
  :mode==='storage'?['stop','red']:['recovery','retry','review-current','other-person'].includes(mode)?['unknown','amber']:waiting?['wait','teal']:null;
 const left=mode==='ready'||mode==='select-break';
 const first=view?.firstName??'';
 const tint=kioskTint(first);
 const face=()=>first?<span className={styles.face} style={{background:tint[0],color:tint[1]}} aria-hidden="true">{first.slice(0,1).toUpperCase()}</span>:null;
 /* A break row's second line (premium pass, #19): its kind only when the Owner's name for it doesn't already say it
  * ("Meal break" no longer sits over "Meal · …"), then the suggested length. */
 const breakSub=(type:{name:string;category:string;targetMinutes:number|null})=>{
  const kind=type.category==='REST'?'Rest':type.category==='MEAL'?'Meal':'Other';
  const named=kind!=='Other'&&[kind,clockerText('es',kind)].some(word=>type.name.toLocaleLowerCase().includes(word.toLocaleLowerCase()));
  const parts=[named?null:t(kind),type.targetMinutes!==null?t('Suggested: {minutes} min',{minutes:type.targetMinutes}):null].filter(Boolean);
  return parts.join(' · ');
 };
 // Saved-action help stays off the two decision screens (Nov 10 review, NV-302). Phase 8: the link opens the help as its
 // own card state; Back returns to this screen.
 const helpAvailable=references.length>0&&Boolean(view)&&(!pending||pending.subject===view?.subject)&&!waiting&&!['success','select-break','confirm-out','auth','other-person'].includes(mode);
 const helpLink=(inline:boolean)=>helpAvailable?inline?<ClockerRecoveryLink onOpen={()=>setHelpFor(mode)}/>:<div className={styles.handoff}><ClockerRecoveryLink onOpen={()=>setHelpFor(mode)}/></div>:null;
 if(helpAvailable&&helpFor===mode)return <div className={styles.content} data-clocker-state={mode} data-clocker-help="" data-align="center">
  <ClockerRecoveryHelp references={references} otherCount={otherCount} commandId={helpCommand} request={review} onBack={()=>setHelpFor(null)} headingRef={heading}/>
 </div>;
 /* Leaving (Nov 10 review, NV-184, NV-305): beside the state's own actions it is a quiet link; when it is the only way on,
  * it is the primary button. The receipt keeps its grey Done. Premium pass (#7): sign-in starts at the Employee ID (Jose,
  * Nov 11), so the label is no longer "Return to PIN": "Done", the kiosk's one word for leaving a private screen, and
  * "Start over" where the person has to sign in again to go on (Enter your PIN again). (#26) Beside a state's actions the
  * link shares one row with "Something didn't save?", as Refresh does on the clock screen. */
 const withActions=['recovery','retry','unavailable','review-current'].includes(mode);
 const leaveLabel=mode==='auth'?'Start over':'Done';
 const leave=waiting||['ready','confirm-out','select-break'].includes(mode)?null:mode==='success'
  ?<button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={onDone}>{t('Done')}</button>
  :withActions?<button tabIndex={0} className={styles.link} type="button" onClick={onDone}>{t(leaveLabel)}</button>
  :<button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={onDone}>{t(leaveLabel)}</button>;
 const footLinks=withActions?<div className={styles.links} data-clocker-foot="">{leave}{helpLink(true)}</div>:null;
 // On the ready screens a notice is an information box with its icon (NV-300).
 /* Not confirmed (Phase 6, RA-6 and MK-8): which action, when it was pressed, and that the tablet kept it. Never "failed"
  * and never "saved": the result is unknown until the check comes back. */
 const unconfirmed=mode==='recovery'&&pending&&!message?clockerUnconfirmedText(language,pending.command.action,
  attemptAt===null?null:new Intl.DateTimeFormat(locale,{timeZone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(attemptAt))):null;
 const others=clockerOthersSavedText(language,otherCount);
 const notice=message&&mode!=='other-person'?left
  ?<div role="status" data-clocker-notice className={styles.note}><ClockerIcon name="info" size={20} mark/><p><ClockerText text={message}/></p></div>
  :<p role={mode==='success'?'status':'alert'} data-clocker-notice className={styles.smsg}><ClockerText text={message}/></p>:null;
 return <div className={styles.content} aria-busy={waiting} data-clocker-state={mode} data-align={left?'start':'center'}>
  {mode==='success'?<span className={styles.check}><DoneTick size={52}/></span>
   :ring?<span className={styles.ring} data-tone={ring[1]==='teal'?undefined:ring[1]}><ClockerIcon name={ring[0]} size={28} mark/></span>:null}
  {mode==='ready'?<div className={styles.who}><span className={styles.faceWrap}>{face()}<ClockerDoneMark markRef={doneMark}/></span><h1 ref={heading} tabIndex={-1} className={styles.title}>{t(title,{name:first})}</h1></div>
   :<h1 ref={heading} tabIndex={-1} className={styles.title}>{t(title,{first,name:first})}</h1>}
  {mode==='ready'&&view?<>
   <div className={styles.strow}>
    <p data-clocker-status className={styles.chip} data-state={entry?.status==='ON_BREAK'?'break':entry?'on':'off'}>{t(shown[status])}</p>
    {entry&&since?<p className={styles.detail}>{t('Since')} <time dateTime={since}>{shortTime(since,timeZone,now,locale)}</time> · <span className={styles.ago}>{t('{elapsed} ago',{elapsed:elapsed(since,now)==='under a minute'?t('under a minute'):elapsed(since,now)})}</span></p>
     :null}
   </div>
   {pause?.type?<p className={styles.breakContext}><strong>{pause.type.name}</strong>{pause.type.targetMinutes!==null?' · '+t('Suggested: {minutes} min',{minutes:pause.type.targetMinutes}):''}</p>:null}
   {notice}
   {!online?<div role="status" data-clocker-notice data-clocker-offline="" className={styles.note} data-tone="red"><ClockerIcon name="offline" size={20} mark/><p>{t('No connection. Wait for it to return before you clock in or out, or tell a manager.')}</p></div>:null}
   {entry?.status==='CLOCKED_IN'&&!view.breakTypes.length&&!view.atOtherLocation?<div data-clocker-notice className={styles.note}><ClockerIcon name="info" size={20} mark/><p>{t(view.breaksOff?'Breaks aren’t recorded on the Clocker here.':'There are no breaks to choose here yet. Ask your Owner to add one.')}</p></div>:null}
   {!actions.length?<div className={styles.other}><span className={styles.ring} data-tone="amber"><ClockerIcon name="building" size={28} mark/></span><p data-clocker-notice className={styles.smsg}>{t(view.commerceRestriction==='paused'&&!view.atOtherLocation?"New clock-ins are paused for this workplace. Your Owner can restore access. Ask a manager to record your time.":"This shift was started at another location. Use the connected tablet at that location.")}</p></div>:null}
   {/* Premium pass (#6): while the tablet is offline the note asks the person to wait, so no action is drawn as the filled
     * next step; Done is. The actions stay where they were and behave as before. */}
   {actions.length?<div className={styles.acts}>{actions.map((action,i)=><button tabIndex={0} data-clocker-action key={action} type="button" className={styles.act} data-kind={i===0&&online?'primary':'secondary'} aria-label={t(labels[action])} onClick={()=>action==='CLOCK_OUT'?setMode('confirm-out'):action==='START_BREAK'?setMode('select-break'):act(action)}>
    <span className={styles.actIcon}><ClockerIcon name={actionIcons[action]} size={28} mark/></span>
    <span className={styles.actText}>{t(labels[action])}</span>
    <ClockerIcon name="arrow" size={22}/></button>)}</div>:null}
   <div className={styles.panelFoot}>
    <button tabIndex={0} className={styles.btn} data-kind={online?'secondary':'primary'} type="button" onClick={onDone}>{t("Done")}</button>
    <div className={styles.links}>
     <button tabIndex={0} className={styles.link} type="button" onClick={()=>void refresh()}><ClockerIcon name="refresh" size={18}/>{t("Refresh")}</button>
     {helpLink(true)}
    </div>
    <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
   </div>
  </>:null}
  {mode==='select-break'&&view?<>
   <p className={styles.lead}>{keep(t("Your break doesn’t end on its own. Tap End break when you’re back."))}</p>
   <div className={styles.acts}>{view.breakTypes.map(type=><button tabIndex={0} key={type.id} className={styles.act} data-kind="secondary" type="button" aria-label={[t('Start {name}',{name:type.name}),breakSub(type)].filter(Boolean).join(', ')} onClick={()=>act('START_BREAK',type)}>
    <span className={styles.actIcon}><ClockerIcon name={breakIcon(type.category)} size={28} mark/></span>
    <span className={styles.actText}>{type.name}{breakSub(type)?<>{' '}<small>{breakSub(type)}</small></>:null}</span>
    <ClockerIcon name="arrow" size={22}/>
   </button>)}</div>
   <div className={styles.stack}><button tabIndex={0} type="button" className={styles.btn} data-kind="secondary" onClick={()=>setMode('ready')}>{t("Back")}</button></div>
   {/* The same 30-second private window runs here (NV-181). */}
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:null}
  {mode==='confirm-out'?<>
   <p className={styles.smsg}>{t("Your shift ends at the time NEVORA records.")}</p>
   {entry?<dl className={styles.facts}><div><dt>{t("Clocked in at")}</dt><dd><time dateTime={entry.clockInAt}>{shortTime(entry.clockInAt,timeZone,now,locale)}</time></dd></div><div><dt>{t("Clocked in for")}</dt><dd>{elapsed(entry.clockInAt,now)==='under a minute'?t('under 1 min'):elapsed(entry.clockInAt,now)}</dd></div></dl>:null}
   {entry?.status==='ON_BREAK'?<p data-clocker-notice className={styles.msg} data-tone="amber"><ClockerIcon name="warning" size={18}/><span>{t("This will also end your current break.")}</span></p>:null}
   <div className={styles.stack}><button tabIndex={0} className={styles.btn} data-kind="primary" type="button" aria-label={t("Confirm clock out")} onClick={()=>act('CLOCK_OUT')}>{t("Confirm clock out")}</button><button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" aria-label={t(cancelLabel)} onClick={()=>setMode('ready')}>{t(cancelLabel)}</button></div>
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:null}
  {mode==='success'&&receipt?<ClockerReceipt action={receipt.action} performedAt={receipt.performedAt} commandId={receipt.commandId} timeZone={timeZone} locale={locale} firstName={first} facts={receiptFacts(receipt,view?.snapshot,timeZone,locale)}/>:null}
  {waiting?<><span className={styles.progress} aria-hidden="true"><i/></span><p role="status" className={styles.smsg}>{t(mode==='sending'?'Keep this screen open while it saves.':'Getting your latest time.')}</p></>:null}
  {mode==='other-person'?<p role="alert" data-clocker-notice className={styles.smsg}>{t("The person before you has a punch that isn’t confirmed on this tablet. Ask them to enter their PIN again. Nothing was recorded for you.")}</p>:null}
  {mode!=='ready'&&mode!=='recovery'&&mode!=='retry'?notice:null}
  {/* Check your last punch (Phase 8, #33): one measure for every line. What is not confirmed (the alert), what to do now
   * in ink on its own line, what the tablet kept, then how many others are saved here (a count only, never whose). */}
  {mode==='recovery'||mode==='retry'?<div className={styles.said}>
   {unconfirmed?<div role="alert" data-clocker-notice data-clocker-unconfirmed=""><p>{unconfirmed}</p><p data-strong="">{t('Tell a manager now.')}</p></div>:notice}
   {mode==='recovery'?<p>{t('This tablet kept your punch and won’t record it twice.')}</p>:null}
   {others?<p data-clocker-others-saved="" data-quiet="">{others}</p>:null}
  </div>:null}
  {(mode==='recovery'||mode==='unavailable')&&!online?<p role="status" data-clocker-offline="" className={styles.msg}><ClockerIcon name="offline" size={18}/><span>{t('No connection. This tablet checks again by itself when it returns.')}</span></p>:null}
  {mode==='storage'?<p className={styles.smsg}>{t("Don’t clear this browser’s data while a punch isn’t confirmed.")}</p>:null}
  {mode==='review-current'?<div className={styles.stack}><button type="button" className={styles.btn} data-kind="primary" onClick={()=>void reviewCurrent()}>{t('See current status')}</button></div>:null}
  {/* Phase 8 (#5): once the check found nothing, the screen's one filled button is Send it again, the button its sentence
   * names; Check if it saved stays as a quiet link. Before the check, Check if it saved is the one action. */}
  {mode==='recovery'||mode==='retry'?<div className={styles.stack}>
   {mode==='retry'&&pending&&view?<button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={()=>void send(pending,view)}>{t("Send it again")}</button>:null}
   <button tabIndex={0} className={mode==='retry'&&pending&&view?styles.link:styles.btn} data-kind={mode==='retry'&&pending&&view?undefined:'primary'} type="button" onClick={()=>void refresh()}>{t("Check if it saved")}</button>
  </div>:null}
  {mode==='unavailable'?<div className={styles.stack}><button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={()=>void refresh()}>{t("Try again")}</button></div>:null}
  {footLinks}
  {leave&&!withActions?<div className={styles.stack}>{leave}</div>:null}
  {mode!=='ready'&&!withActions?helpLink(false):null}
 </div>;
}

/* The kit's done mark (BDoneMark: a green disc whose one round-capped tick has pathLength 1, so it can be drawn), with
 * the kiosk's own styles. The kit module isn't imported here: it brings owner-b.css (88 KB, with unscoped rules such as
 * .b-screen) into the kiosk. Same markup and class, so it reads as the same mark. */
function ClockerDoneMark({markRef}:{markRef:React.Ref<HTMLSpanElement>}){
 return <span ref={markRef} className={`b-donemark ${styles.doneMark}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5.5 12.75l4.25 4.25L18.5 7.75" pathLength={1} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"/></svg></span>;
}
