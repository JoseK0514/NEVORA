'use client';
import { WholeWordHeading } from "@/components/whole-word-heading";
import './creation-corp.css';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {SheetCancel,useSheetClose} from '../quiet/quiet-sheet';
import {CorpNav} from '../corp/corp';
import {shiftChangeFeedback} from '../shift-change-form-state';
import {formatTime as clockTime,addDays} from '@/lib/date-utils';
import {dateText,timeText,type MobileLang} from './mobile-format';
import {useMobileLang} from './mobile-lang';
import {creationViewCopy} from './copy/creation-view';
import {calloutReasonNoteError} from '@/lib/shift-changes/command-parser';
import {CALLOUT_REASONS,creationKey,creationPayload,type CreationDraft,type CreationMode,type EmployeeCreationSnapshot} from '@/lib/employee-creation';
import type {RequestSlot} from '@/lib/employee-exchange';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import type {EmployeeCreationOperation} from './creation-operation';
import {BCallout,BHero,BScreen,BState} from '../owner-b/b-kit';
import {momentsCopy} from '../owner-b/moments-copy';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {FormMark} from '../employee-b/requests-b';
import '../employee-b/requests.css';

/* Swap shift, Offer for cover and Can't work this shift on the corporate kit (Release 1, boards E-SwapSheet, E-CoverSheet,
 * E-CantWorkSheet). Opened from a shift it is a bottom sheet over Schedule (Cancel · title); opened by its URL, the same
 * content under a pushed-page header, as cards on the grey page (upscale S15: no card inside a card). Presentation only: the read, draft, operation, receipt and every state are as before. */

/** The reasons the board offers, in its words; each is one the server accepts. */
const reasonsIn=(labels:Record<string,string>)=>CALLOUT_REASONS.filter(([value])=>labels[value]).map(([value])=>[value,labels[value]!] as const);
/** A time never breaks between the hour and AM/PM. */
const timeIn=(lang:MobileLang)=>(time:string)=>lang==='en'?clockTime(time).replace(' ','\u00a0'):timeText(clockTime(time),lang).replace(/ /g,'\u00a0');
const dayIn=(lang:MobileLang)=>(date:string)=>dateText(date,lang,{weekday:'short',month:'short',day:'numeric'});
const minutes=(time:string)=>{const [h,m]=time.split(':').map(Number);return h*60+m;};
const length=(slot:RequestSlot)=>{const span=(minutes(slot.endTime)-minutes(slot.startTime)+1440)%1440||1440,hours=Math.round(span/6)/10;return `${hours} h`;};
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]!.toUpperCase()).join('');
const first=(name:string)=>name.split(/\s+/)[0]??name;

/** The shift on a grey block: an optional label, date · time, then position · location · length. */
function ShiftBlock({slot,label}:{slot:RequestSlot;label?:string}){
 const lang=useMobileLang(),t=creationViewCopy[lang],formatTime=timeIn(lang),day=dayIn(lang);
 const overnight=slot.endTime<=slot.startTime;
 return <div className="c-xs-shift">
  {label?<span className="c-xs-shift__label">{label}</span>:null}
  <b className="c-xs-shift__time">{day(slot.date)} · {formatTime(slot.startTime)} – {formatTime(slot.endTime)}</b>
  <span className="c-xs-shift__place">{[slot.position,slot.location,length(slot),slot.lead?t.shiftLead:null].filter(Boolean).join(' · ')}</span>
  {overnight?<span className="c-xs-shift__place">{t.ends(day(addDays(slot.date,1)),formatTime(slot.endTime))}</span>:null}
 </div>;
}

/** Grey blocks where the sheet's content lands (shift, choices, button), so loading doesn't jump in height. */
function SkeletonBlocks({mode}:{mode:CreationMode}){
 return <>
  <span className="c-xsk c-xsk--shift" style={mode==='callout'?{height:58}:undefined}/>
  <span className="c-xsk c-xsk--label"/>
  <span className="c-xsk c-xsk--list" style={{height:mode==='swap'?180:mode==='cover'?60:192}}/>
  {mode==='callout'?<><span className="c-xsk c-xsk--label"/><span className="c-xsk c-xsk--list" style={{height:68}}/><span className="c-xsk" style={{height:52}}/></>:<span className="c-xsk c-xsk--label" style={{width:'80%'}}/>}
  <span className="c-xsk c-xsk--btn"/>
 </>;
}
/** The whole sheet while its route loads: the bar and the blocks, static. */
export function CreationSheetSkeleton({mode='swap'}:{mode?:CreationMode}){
 const t=creationViewCopy[useMobileLang()];
 return <div className="c-page c-embed c-xsheet c-xsheet--skel" aria-busy="true" aria-label={t.loading}>
  <div className="c-sheet-head"><span className="c-xsk c-xsk--s"/><span className="c-xsk c-xsk--m"/><span/></div>
  <div className="c-sheet-body"><SkeletonBlocks mode={mode}/></div>
 </div>;
}

export function CreationView({state,authority,mode,sourceId,draft,operation,onDraft,onReview,onRefresh,onSubmit,onRetry}:{state:PrivatePanelState<EmployeeCreationSnapshot>;authority:string;mode:CreationMode;sourceId:string;draft:CreationDraft;operation:EmployeeCreationOperation;onDraft:(patch:Partial<CreationDraft>)=>void;onReview:()=>void;onRefresh:()=>void;onSubmit:()=>void;onRetry:()=>void}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const lang=useMobileLang(),t=creationViewCopy[lang],M=momentsCopy(lang),titles=t.titles,sendLabels=t.sendLabels,reasons=reasonsIn(t.reasons),formatTime=timeIn(lang),day=dayIn(lang);
 const inSheet=useSheetClose()!==null;
 const [error,setError]=useState<string|null>(null),form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null),errorId=useId(),noteId=useId(),titleId=useId();
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.mode===mode&&state.snapshot.selection===sourceId?state.snapshot:null;
 const result=operation.state.result,pending=operation.state.pending,uncertain=operation.state.uncertain;
 const resolved=!!result&&['completed','pending','closed'].includes(result.status),hasRead=read!==null;
 useEffect(()=>{if(resolved&&hasRead)receipt.current?.focus();},[resolved,hasRead]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',source=read?.source;
 const sourceReviewed=!!source&&draft.sourceKey===creationKey(source.fields),locked=pending||uncertain||resolved;
 const change=(patch:Partial<CreationDraft>)=>{setError(null);onDraft(patch);};
 const back=source?'/app/schedule?week='+source.weekStart+'&day='+source.date+'&shift='+encodeURIComponent(source.id):'/app/schedule';
 const chosen=mode==='swap'?read?.targets?.find(target=>creationKey(target.fields)===draft.targetKey):undefined;
 // A failed or partial swap check gets its own quiet line; every other notice (a verified empty list, a changed shift) shows once.
 const notice=read&&!(mode==='swap'&&(read.partial||read.targets===null||!read.targets.length))?read.check.notice:null;
 // Nov 21, 2026: a swap with no one to choose says so in place of the list, with the step that still works, and draws no
 // dead Send button. "Couldn't be checked" and "no one right now" are different answers and read differently.
 const swapEmpty=mode==='swap'&&!!read&&read.targets!==null&&!read.targets.length;
 const status=(text:ReactNode,action?:ReactNode)=><div className="c-xs-state"><p role="status">{text}</p>{action}</div>;

 const firstLoad=!read&&!state.paused&&!denied&&state.refreshing&&!state.snapshot;
 const body=firstLoad?<><p className="c-sr" role="status">{t.checking}</p><SkeletonBlocks mode={mode}/></>
  :!read?status(state.paused?t.paused:denied?t.denied:state.refreshing?t.checking:t.failed,
   denied?<Link className="c-btn c-btn--secondary c-btn--full" href="/login">{t.signIn}</Link>:<button className="c-btn c-btn--secondary c-btn--full" type="button" disabled={state.paused||state.refreshing} onClick={onRefresh}>{state.refreshing?t.checkingShort:t.tryAgain}</button>)
  :!read.enabled?status(t.turnedOff)
  :resolved&&result&&'requestId'in result?<section className="c-xs-receipt b-done-host--flush" aria-label={t.resultAria}>
    {/* Phase 7 (moments): the title follows the reply. "pending" is sent, not approved; "completed" is already on the
      * schedule; "closed" changed nothing, so it is not a success and carries no mark. */}
    {result.status==='closed'?<BState kind="paused" icon={<InfoIcon weight="bold"/>} heading titleRef={receipt} title={M.changeClosed} line={M.changeClosedLine} action={{label:M.viewRequest,href:'/app/exchange?tab=requests&requestId='+encodeURIComponent(result.requestId)}}/>
    :<BState kind="done" heading titleRef={receipt}
      title={result.status==='completed'?M.changeDone:mode==='callout'?M.calloutSent:mode==='swap'?M.swapSent:M.coverSent}
      line={result.status==='completed'?M.changeDoneLine:mode==='callout'?M.calloutLine:mode==='swap'?M.swapLine:M.coverLine}
      action={{label:M.viewRequest,href:'/app/exchange?tab=requests&requestId='+encodeURIComponent(result.requestId)}}
      quiet={<Link className="b-done__quiet" href={back}>{M.backToSchedule}</Link>}/>}
   </section>
  :source?<>
   <ShiftBlock slot={source} label={mode==='swap'?t.yourShift:mode==='cover'?t.shiftToOffer:undefined}/>
   {!sourceReviewed?<div className="c-callout c-xs-callout"><span><b>{t.changedTitle}</b>{t.changedText}</span><button className="c-btn c-btn--secondary c-btn--sm" type="button" disabled={locked} onClick={onReview}>{t.reviewUpdated}</button></div>:null}
   {notice?<p className="c-xs-notice" role="status">{notice}</p>:null}
   <form ref={form} className="c-xs-form" noValidate aria-busy={pending} onSubmit={event=>{
    event.preventDefault();if(locked)return;
    if(!creationPayload(read,draft)){
     const noteError=calloutReasonNoteError(draft.reason,draft.note);
     const message=mode==='callout'?(!CALLOUT_REASONS.some(([value])=>value===draft.reason)?t.chooseReason:(noteError&&lang!=='en'?t.otherDetail:noteError)??t.reviewNote):t.chooseSwap;
     setError(message);const field=mode==='callout'?(draft.reason==='OTHER'?'textarea':'input[name="reasonCode"]'):'input[name="targetShiftId"]';form.current?.querySelector<HTMLElement>(field)?.focus();return;
    }
    setError(null);onSubmit();
   }}>
    <fieldset className="c-xs-fields" disabled={locked}>
     {swapEmpty?(read!.partial
      ?<BCallout tone="amber" role="status" title={t.uncheckedTitle} action={{label:state.refreshing?t.checkingShort:t.checkAgain,onClick:onRefresh}}>{t.uncheckedText}</BCallout>
      :<BCallout tone="grey" icon="info" title={t.noOneTitle} action={read!.coverage.allowed&&!locked?{label:t.offerInstead,href:'/app/exchange/swap?sourceShiftId='+encodeURIComponent(sourceId)+'&mode=cover'}:undefined}>{read!.coverage.allowed?t.noOneOffer:t.noOneKeep}</BCallout>)
     :mode==='swap'?<fieldset className="c-xs-group" aria-describedby={error?errorId:undefined}><legend className="c-field__label">{t.chooseTeammate}</legend>
      {read.targets===null?<p className="c-xs-notice" role="status">{t.optionsUnchecked}<button className="c-xs-inline" type="button" disabled={state.refreshing} onClick={onRefresh}>{t.refresh}</button></p>
       :read.targets.length?<ul className="c-xs-options">{read.targets.map((target,index)=><li key={target.id}><label className="c-xs-option">
        <span className={index%2?'c-av c-av--grey':'c-av'} aria-hidden="true">{initials(target.person)}</span>
        <span className="c-xs-option__main"><b>{target.person}</b><span>{day(target.date)} · {formatTime(target.startTime)} – {formatTime(target.endTime)}</span>
         {target.endTime<=target.startTime||target.lead?<span>{[target.lead?t.shiftLead:null,target.endTime<=target.startTime?t.ends(day(addDays(target.date,1)),formatTime(target.endTime)):null].filter(Boolean).join(' · ')}</span>:null}</span>
        <input className="c-xs-radio" type="radio" name="targetShiftId" value={target.id} checked={draft.targetKey===creationKey(target.fields)} onChange={()=>change({targetKey:creationKey(target.fields)})}/>
       </label></li>)}</ul>
       :null}
      {read.targets?.length?<p className="c-field__help">{read.partial?<>{t.someUnchecked}<button className="c-xs-inline" type="button" disabled={state.refreshing} onClick={onRefresh}>{t.refresh}</button></>:t.swapHelp}</p>:null}
      {draft.targetKey&&!read.targets?.some(target=>creationKey(target.fields)===draft.targetKey)?<p className="c-xs-notice" role="status">{t.selectedChanged}</p>:null}
     </fieldset>
     :mode==='cover'?<div className="c-field"><span className="c-field__label">{t.whoCanTake}</span>
      {/* Upscale S10: the read names no one, so the row is text only (no icon tile). */}
      <div className="c-xs-who"><span className="c-xs-option__main"><b>{t.yourTeamAt(source.location)}</b><span>{t.inOpenShifts}</span></span></div>
     </div>
     :<>
      <fieldset className="c-xs-group" aria-describedby={error?errorId:undefined}><legend className="c-field__label">{t.reason}</legend><ul className="c-xs-options">{reasons.map(([value,label])=><li key={value}><label className="c-xs-option c-xs-option--one">
       <span className="c-xs-option__main"><b>{label}</b></span>
       <input className="c-xs-radio" type="radio" name="reasonCode" value={value} checked={draft.reason===value} onChange={()=>change({reason:value})}/>
      </label></li>)}</ul></fieldset>
      <div className="c-field"><label className="c-field__label" htmlFor={noteId}>{t.noteLabel}<span className="c-xs-optional">({draft.reason==='OTHER'?t.neededForOther:t.optional})</span></label>
       <textarea className="c-in c-xs-note" id={noteId} name="reasonNote" value={draft.note} maxLength={300} rows={3} placeholder={t.notePlaceholder} aria-describedby={[draft.reason==='OTHER'?noteId+'-hint':null,error?errorId:null].filter(Boolean).join(' ')||undefined} aria-invalid={!!error&&draft.reason==='OTHER'} onChange={event=>change({note:event.target.value})}/>
       {draft.reason==='OTHER'?<span className="c-field__help" id={noteId+'-hint'}>{t.noteHint}</span>:null}
      </div>
      <div className="c-xs-who c-xs-who--fill"><span className="c-xs-option__main"><b>{t.managerGets}</b><span>{t.keepUntil}</span></span></div>
     </>}
     {mode==='swap'&&read.targets?.length?<p className="c-xs-foot">{t.swapFoot(chosen?first(chosen.person):t.yourTeammate)}</p>
      :mode==='cover'?<p className="c-xs-foot">{t.coverFoot}</p>:null}
     {error?<p id={errorId} className="c-error" role="alert">{error}</p>:null}
     {swapEmpty?null:<button className={mode==='callout'?'c-btn c-btn--danger c-btn--full':'c-btn c-btn--full'} type="submit" disabled={locked||!sourceReviewed||!read.check.allowed}>{pending?t.submitting:sendLabels[mode]}</button>}
    </fieldset>
   </form>
  </>:status(read.check.notice??t.notYours);
 // Submission progress and recovery, shown with the form (never over the receipt or a closed state), as before.
 const live=!!read&&read.enabled&&!(resolved&&result&&'requestId'in result);
 const extras=live?<>
  {pending?<p className="c-xs-notice" role="status">{uncertain?t.checkingOriginal:t.submittingRequest}</p>:null}
  {result&&!resolved?<p className="c-error" role="alert">{shiftChangeFeedback(result,lang)}</p>:null}
  {uncertain?<button className="c-btn c-btn--secondary c-btn--full" type="button" disabled={pending} onClick={onRetry}>{t.checkStatus}</button>:null}
  {mode==='swap'&&!(swapEmpty&&!read!.partial)&&read!.coverage.allowed&&!locked?<Link className="c-link c-link--l c-xs-alt" href={'/app/exchange/swap?sourceShiftId='+encodeURIComponent(sourceId)+'&mode=cover'}>{t.offerInstead}</Link>:null}
 </>:null;

 return <div className={`c-page c-xsheet em-creation${inSheet?' c-embed':' c-xsheet--page'}${firstLoad?' c-xsheet--skel':''}`} data-corp="" data-creation-state={state.paused?'paused':read?'ready':denied?'denied':state.refreshing?'loading':'unavailable'} aria-labelledby={titleId}>
  {/* Direction B (phones only, opened by its URL): Cancel and the title on the teal hero; the form below stays once in this
    * page (b-keep) and is drawn as the screen's one card. Opened from a shift it stays Schedule's sheet. */}
  {inSheet?null:<BScreen back><FormMark/><BHero back={{href:back,label:t.cancel,close:true}} title={lang === "es" ? <WholeWordHeading text={titles[mode]} /> : titles[mode]} titleId={titleId+'-b'}/></BScreen>}
  {inSheet?<div className="c-sheet-head"><SheetCancel href={back} className="c-sheet-head__l">{t.cancel}</SheetCancel><h2 id={titleId}>{titles[mode]}</h2><span/></div>
   :<CorpNav back={{href:back,label:t.back}} title={titles[mode]} titleId={titleId}/>}
  <div className={inSheet?'c-sheet-body':'c-sheet-body b-keep'}>{body}{extras}</div>
 </div>;
}
