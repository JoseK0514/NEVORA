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
import {ClockerText,useClockerCopy,useClockerIntlLocale} from './clocker-language';
import {FACE_TINTS} from '../lib/face-tint';
import {ClockerReceipt,receiptTitles,shortTime} from './clocker-receipt';
import {useReportTabletHealth} from './clocker-shell';
const labels:Record<PunchAction,string>={CLOCK_IN:'Clock In',START_BREAK:'Start Break',END_BREAK:'End Break',CLOCK_OUT:'Clock Out'};
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
const breakIcon=(category:string):ClockerIconName=>category==='REST'?'rest':category==='MEAL'?'meal':'break';
/* Face tints on the kiosk leave out the red and amber families, which mean stop and wait here (Nov 10 review, NV-301).
 * Same name hash as faceTint, so a person keeps one colour on the kiosk. */
const KIOSK_TINTS=FACE_TINTS.filter((_,index)=>index!==3&&index!==4);
function kioskTint(name:string){let hash=0;for(const ch of name)hash=(hash*31+ch.charCodeAt(0))>>>0;return KIOSK_TINTS[hash%KIOSK_TINTS.length];}
export function ClockerPunchPanel({locationKey,timeZone,onDone,resume,onContinuationChange,screenExpiresAt,screenMonotonicExpiresAt}:{screenMonotonicExpiresAt?:number;screenExpiresAt?:number;locationKey:string;timeZone:string;onDone:()=>void;resume?:ClockContinuation|null;onContinuationChange?:(draft:ClockContinuation|null)=>void}) {
 const t=useClockerCopy(),locale=useClockerIntlLocale();
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
    catch{setMode('storage');setMessage('This tablet can’t read its saved punches right now. Ask your manager to check the tablet.');return;}
    setView(fresh);setPending(saved);setMode(saved?'recovery':resumeContinuation(resume,fresh));
   }catch(error){if(current){setPending(saved);failed(error,Boolean(saved));}}
  };
  void load();return()=>{current=false;alive.current=false;void journal.current?.then(store=>store.close(),()=>{});};
 },[locationKey,resume]);
 useEffect(()=>{onContinuationChange?.(view&&!pending?continuationFor(view,mode):null);return()=>onContinuationChange?.(null);},[view,mode,pending,onContinuationChange]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[mode]);
 useEffect(()=>{
  if(mode!=='success')return;
  const timer=window.setTimeout(onDone,CLOCKER_RECEIPT_CLEAR_MS);return()=>clearTimeout(timer);
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
  busy.current=true;setSendingAction(saved.command.action);setMode('sending');setMessage(null);
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
    reviewProof.current={commandId:pending.command.commandId,subject:fresh.subject,verificationId:fresh.verificationId};setMode('review-current');
    setMessage('No confirmation was found. This earlier request can no longer be applied. Review your current status before choosing a new action.');
   }else{setMode('retry');setMessage('We haven’t confirmed your last punch yet. Tap Retry Same Action; it won’t punch twice.');}
  }catch(error){if(alive.current)failed(error,Boolean(pending));}
  finally{busy.current=false;}
 }
 async function reviewCurrent(){
  const proof=reviewProof.current;if(busy.current||mode!=='review-current'||!pending||!view||!proof||proof.commandId!==pending.command.commandId||proof.subject!==view.subject||proof.verificationId!==view.verificationId||!canRetirePendingPunch(pending.command,view))return;
  busy.current=true;
  try{const store=await recoveryJournal();await store.resolveExact(locationKey,pending,'reviewed-context');if(!alive.current)return;setPending(null);setReferences(await store.references(locationKey));reviewProof.current=null;setMode('ready');setMessage('The earlier punch was kept for review. Nothing was punched again.');}
  catch{if(alive.current){setMode('storage');setMessage('This tablet can’t read its saved punches right now. Ask your manager to check the tablet.');}}
  finally{busy.current=false;}
 }
 // The band follows the card (Nov 10 review, NV-049).
 useReportTabletHealth('panel',mode==='unavailable'?'offline':mode==='storage'?'storage':null);
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
 // One teal action for the likeliest next step: End Break on a break, otherwise Clock Out once clocked in.
 const lead=(['END_BREAK','CLOCK_OUT','CLOCK_IN'] as PunchAction[]).find(action=>allowed.includes(action));
 const actions=lead?[lead,...allowed.filter(action=>action!==lead)]:allowed;
 const status=entry?.status==='ON_BREAK'?'On Break':entry?'Clocked In':'Off Clock';
 const cancelLabel=entry?.status==='ON_BREAK'?'Stay on break':'Cancel clock-out';
 const title=mode==='review-current'?'Review your current status':mode==='success'&&receipt?receiptTitles[receipt.action]:mode==='confirm-out'?'Clock Out?':mode==='select-break'?'Choose a Break':mode==='sending'?'Recording Your Action…'
  :mode==='recovery'||mode==='retry'?'Check Your Last Action':mode==='other-person'?'Previous Action Needs Review'
  :mode==='auth'?'Verify Your PIN Again':mode==='loading'?'Checking Your Clock…':mode==='storage'?'Browser Storage Needed'
  :mode==='unavailable'?'Clock State Unavailable':t('Hi, {name}.',{name:view?.firstName??''});
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
 const handoff=(inline:boolean)=>references.length>0&&!waiting&&!['success','select-break','confirm-out'].includes(mode)?<ClockerRecoveryHandoff inline={inline} key={pending?.command.commandId??'tablet-assistance'} references={references} locationKey={locationKey} commandId={pending?.command.commandId??null}/>:null;
 /* Leaving (Nov 10 review, NV-184, NV-305): beside the state's own actions it is a text link in the same stack; when it is
  * the only way on, it is the primary button. The receipt keeps its grey Done. */
 const withActions=['recovery','retry','unavailable','review-current'].includes(mode);
 const leave=waiting||['ready','confirm-out','select-break'].includes(mode)?null:mode==='success'
  ?<button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={onDone}>{t('Done')}</button>
  :withActions?<button tabIndex={0} className={styles.link} type="button" onClick={onDone}>{t('Return to PIN')}</button>
  :<button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={onDone}>{t('Return to PIN')}</button>;
 // On the ready screens a notice is an information box with its icon (NV-300).
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
   {entry?.status==='CLOCKED_IN'&&!view.breakTypes.length&&!view.atOtherLocation?<div data-clocker-notice className={styles.note}><ClockerIcon name="info" size={20}/><p>{t(view.breaksOff?'Breaks aren’t recorded on the Clocker here.':'No break types are configured. Ask your Owner to add one.')}</p></div>:null}
   {!actions.length?<div className={styles.other}><span className={styles.ring} data-tone="amber"><ClockerIcon name="building" size={28}/></span><p data-clocker-notice className={styles.smsg}>{t("This shift was started at another location. Use that location’s registered Clocker to continue.")}</p></div>:null}
   {actions.length?<div className={styles.acts}>{actions.map((action,i)=><button tabIndex={0} data-clocker-action key={action} type="button" className={styles.act} data-kind={i===0?'primary':'secondary'} aria-label={t(labels[action])} onClick={()=>action==='CLOCK_OUT'?setMode('confirm-out'):action==='START_BREAK'?setMode('select-break'):act(action)}>
    <span className={styles.actIcon}><ClockerIcon name={actionIcons[action]} size={28}/></span>
    <span className={styles.actText}>{t(labels[action])}</span>
    <ClockerIcon name="arrow" size={22}/></button>)}</div>:null}
   <div className={styles.panelFoot}>
    <button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={onDone}>{t("Done")}</button>
    <div className={styles.links}>
     <button tabIndex={0} className={styles.link} type="button" onClick={()=>void refresh()}><ClockerIcon name="refresh" size={18}/>{t("Refresh Clock State")}</button>
     {handoff(true)}
    </div>
    <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
   </div>
  </>:null}
  {mode==='select-break'&&view?<>
   <p className={styles.lead}>{t("Your break doesn’t end on its own. Tap End Break when you’re back.")}</p>
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
   {entry?<dl className={styles.facts}><div><dt>{t("Clocked in")}</dt><dd><time dateTime={entry.clockInAt}>{shortTime(entry.clockInAt,timeZone,now,locale)}</time></dd></div><div><dt>{t("Since clock-in")}</dt><dd>{elapsed(entry.clockInAt,now)==='under a minute'?t('under a minute'):elapsed(entry.clockInAt,now)}</dd></div></dl>:null}
   {entry?.status==='ON_BREAK'?<p data-clocker-notice className={styles.msg} data-tone="amber"><ClockerIcon name="warning" size={18}/><span>{t("This will also end your current break.")}</span></p>:null}
   <div className={styles.stack}><button tabIndex={0} className={styles.btn} data-kind="primary" type="button" aria-label={t("Confirm Clock Out")} onClick={()=>act('CLOCK_OUT')}>{t("Confirm Clock Out")}</button><button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" aria-label={t(cancelLabel)} onClick={()=>setMode('ready')}>{t(cancelLabel)}</button></div>
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:null}
  {mode==='success'&&receipt?<ClockerReceipt action={receipt.action} performedAt={receipt.performedAt} commandId={receipt.commandId} timeZone={timeZone} locale={locale} firstName={first}/>:null}
  {mode==='sending'&&first&&sendingAction?<p className={styles.doing}>{face('sm')}<span>{t(recording[sendingAction],{first})}</span></p>:null}
  {waiting?<><span className={styles.progress} aria-hidden="true"><i/></span><p role="status" className={styles.smsg}>{t(mode==='sending'?'Keep this screen open while the action is checked.':'Reading the latest saved information.')}</p></>:null}
  {mode==='other-person'?<p data-clocker-notice className={styles.smsg}>{t("A previous employee’s action needs verification on this tablet. Ask that employee to enter their PIN again. No new action was sent.")}</p>:null}
  {mode!=='ready'?notice:null}
  {mode==='storage'?<p className={styles.smsg}>{t("Don’t clear this tablet’s browser data while a punch is unconfirmed. Your manager can help check it.")}</p>:null}
  {mode==='review-current'?<div className={styles.stack}><button type="button" className={styles.btn} data-kind="primary" onClick={()=>void reviewCurrent()}>{t('Review current status')}</button>{leave}</div>:null}
  {mode==='recovery'||mode==='retry'?<div className={styles.stack}>
   <button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={()=>void refresh()}>{t("Check Action Status")}</button>
   {mode==='retry'&&pending&&view?<button tabIndex={0} className={styles.btn} data-kind="secondary" type="button" onClick={()=>void send(pending,view)}>{t("Retry Same Action")}</button>:null}
   {leave}
  </div>:null}
  {mode==='unavailable'?<div className={styles.stack}><button tabIndex={0} className={styles.btn} data-kind="primary" type="button" onClick={()=>void refresh()}>{t("Try Again")}</button>{leave}</div>:null}
  {leave&&!withActions?<div className={styles.stack}>{leave}</div>:null}
  {mode!=='ready'?handoff(false):null}
 </div>;
}
