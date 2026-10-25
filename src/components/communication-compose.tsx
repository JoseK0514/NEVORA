'use client';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import Link from 'next/link';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {PaperPlaneTiltIcon} from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {Tile} from './kit/kit';
import {QuietNav} from './quiet/quiet';
import {QuietSheet} from './quiet/quiet-sheet';
import './quiet/u3.css';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {PendingLabel} from './employee-submit-button';
import {revealFeedback} from '@/lib/reveal-feedback';
import {keepWhole} from '../lib/keep-whole';
import {formatDisplayDate,formatTime,formatTimeRange} from '../lib/date-utils';
import {timeZoneLabel} from '../lib/time-zone-label';
import {localDateTimeToInstant} from '../lib/business-time';
import {validateCommunicationDraft} from '../lib/communications/validation';
import {communicationRequest,useCommunicationAction,useCommunicationResource,type CommunicationMode} from '../lib/communications/client';
import type {CommunicationContext,CommunicationDraft,CommunicationRead} from '../lib/communications/types';
type Context=Extract<CommunicationContext,{state:'ready'}>;
type ComposeValues={type:CommunicationDraft['type'];scopeKind:CommunicationDraft['scope']['kind'];locationId:string;shiftId:string;title:string;body:string;ack:CommunicationDraft['acknowledgement'];expiration:string;useExpiry:boolean};
type ComposeRetention={values:ComposeValues;revisionId:string|null};
export function ComposeForm({context,initial,editing,mode,authority,retained,retain,action}:{context:Context;initial?:CommunicationDraft;editing?:Extract<CommunicationRead,{state:'ready'}>;mode:CommunicationMode;authority:string;retained:MutableRefObject<ComposeRetention|null>;retain:(values:ComposeValues,revisionId:string|null)=>void;action:ReturnType<typeof useCommunicationAction>}){
 const [values,setValues]=useState<ComposeValues>(()=>retained.current?.values??{type:initial?.type??(context.management?'LOCATION_ANNOUNCEMENT':'TODAYS_TEAM'),scopeKind:initial?.scope.kind??(context.management?'LOCATION':'TODAYS_TEAM'),locationId:initial?.scope.locationId??context.locations[0]?.id??'',shiftId:initial?.scope.kind==='SHIFT'?initial.scope.sourceShiftId:'',title:initial?.title??'',body:initial?.body??'',ack:initial?.acknowledgement??'OPTIONAL',expiration:initial?.expiresAt??'',useExpiry:!!initial?.expiresAt});
 const [reviewedRevisionId]=useState(()=>retained.current?.revisionId??editing?.revisionId??null);
 const staleEdit=!!editing&&reviewedRevisionId!==editing.revisionId;
 const {type,scopeKind,locationId,shiftId,title,body,ack,expiration,useExpiry}=values;
 function set<K extends keyof ComposeValues>(key:K,value:ComposeValues[K]){setValues(previous=>{const next={...previous,[key]:value};retain(next,reviewedRevisionId);return next;});}
 const setType=(value:ComposeValues['type'])=>set('type',value),setScopeKind=(value:ComposeValues['scopeKind'])=>set('scopeKind',value),setLocationId=(value:string)=>set('locationId',value),setShiftId=(value:string)=>set('shiftId',value),setTitle=(value:string)=>set('title',value),setBody=(value:string)=>set('body',value),setAck=(value:ComposeValues['ack'])=>set('ack',value),setExpiration=(value:string)=>set('expiration',value),setUseExpiry=(value:boolean)=>set('useExpiry',value);
 const [error,setError]=useState<string|null>(null),[errorField,setErrorField]=useState<'title'|'body'|'expiration'|null>(null),[preview,setPreview]=useState<{count:number;fingerprint:string}|null>(null),[previewing,setPreviewing]=useState(false);const previewGeneration=useRef(0);
 const formRef=useRef<HTMLFormElement>(null);
 const feedbackRef=useRef<HTMLDivElement>(null),recoveryRef=useRef<HTMLDivElement>(null);
 const previewHeadingRef=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  if((action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown)&&recoveryRef.current){
   revealFeedback(recoveryRef.current);
   const next=recoveryRef.current.querySelector<HTMLButtonElement>('button');
   if(next)revealFeedback(next);
  }else if((action.notice==='conflict'||error?.startsWith('Audience'))&&feedbackRef.current)revealFeedback(feedbackRef.current);
 },[error,action.notice,action.hasUnknown]);
 useEffect(()=>{if(preview&&previewHeadingRef.current)revealFeedback(previewHeadingRef.current);},[preview]);
 useEffect(()=>()=>{previewGeneration.current++;},[]);
 const titleCount=[...title.trim()].length,bodyCount=[...body.trim()].length;
 function changed(){previewGeneration.current++;setPreview(null);setPreviewing(false);setError(null);setErrorField(null);action.setNotice(null);}
 function draft():CommunicationDraft|null{
  const selected=context.shifts.find(s=>s.id===shiftId&&s.locationId===locationId);
  const scope=scopeKind==='LOCATION'?{kind:'LOCATION' as const,locationId}:scopeKind==='TODAYS_TEAM'?{kind:'TODAYS_TEAM' as const,locationId,businessDate:context.businessDate}:selected?{kind:'SHIFT' as const,locationId,sourceShiftId:selected.id,assignmentEpisodeId:selected.assignmentEpisodeId,termsFingerprint:selected.termsFingerprint}:initial?.scope.kind==='SHIFT'&&initial.scope.sourceShiftId===shiftId?initial.scope:null;
  if(!scope){setError('Choose a current published shift.');return null;}
  let expiresAt:string|null=null;try{if(useExpiry)expiresAt=expiration.endsWith('Z')?expiration:localDateTimeToInstant(expiration,context.timeZone);}catch{setError(`Choose a valid date and time in ${timeZoneLabel(context.timeZone)}.`);setErrorField('expiration');document.getElementById('communication-expiration')?.focus();return null;}
  if(expiresAt&&Date.parse(expiresAt)<=Date.now()){setError('Choose a time later than now.');setErrorField('expiration');document.getElementById('communication-expiration')?.focus();return null;}
  const parsed=validateCommunicationDraft({type,scope,title,body,acknowledgement:type==='TODAYS_TEAM'?'OPTIONAL':ack,expiresAt});
  if(!parsed.ok){const field=titleCount<1||titleCount>120?'title':bodyCount<1||bodyCount>2000?'body':null;setErrorField(field);setError(field==='title'?'Title must contain 1–120 characters.':field==='body'?'Message must contain 1–2000 characters.':'Use plain text, and choose a location and who receives it.');document.getElementById(titleCount<1||titleCount>120?'communication-title':'communication-body')?.focus();return null;}
  return parsed.value;
 }
 async function review(){if(staleEdit)return;const value=draft();if(!value)return;retain(values,reviewedRevisionId);const sequence=++previewGeneration.current;setError(null);setErrorField(null);setPreviewing(true);try{const result=await communicationRequest(mode,authority,'/preview',value) as {state:string;count:number;fingerprint:string};if(sequence!==previewGeneration.current)return;if(result.state==='ready'){action.setNotice(null);setError(null);setPreview({count:result.count,fingerprint:result.fingerprint});}else setError('Audience couldn’t be checked. You may not have access to this location.');}catch{if(sequence===previewGeneration.current)setError('Audience couldn’t be checked. Try again.');}finally{if(sequence===previewGeneration.current)setPreviewing(false);}}
 function publish(){if(staleEdit)return;const value=draft();if(!value||!preview)return;retain(values,reviewedRevisionId);void action.send({kind:editing?'REVISE':'PUBLISH',operationId:crypto.randomUUID(),authority,draft:value,audienceFingerprint:preview.fingerprint,...(editing?{communicationId:editing.id,expectedRevisionId:reviewedRevisionId}:{})});}
 const disabled=action.pending||action.notice==='unknown'||staleEdit;
 const [expiryOpen,setExpiryOpen]=useState(false);
 const endOfToday=`${context.businessDate}T23:59`;
 const location=context.locations.find(l=>l.id===locationId)?.label;
 if(action.notice==='signed-out')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24}/><div><h2 className="wb-notice__title">Your session ended</h2><p>Sign in again to continue.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in</Link></div></div></section>;
 if(action.notice==='blocked')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24}/><div><h2 className="wb-notice__title">Publication unavailable</h2><p>Your current permission does not allow publication.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link><Link className="nv-btn" data-kind="secondary" href="/app/updates">Return to updates</Link></div></div></section>;
 // Phase 4 (Signature, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-4/p4b-board-a.png):
 // employees (Leads) message today's team; the message is set like a page and the review shows the count and the update
 // as people will see it. Managers keep the shared form. Same fields, validation, preview and publish.
 const signature=mode==='employee'&&!context.management;
 const day=keepWhole(formatDisplayDate(context.businessDate));
 // T-18 (Oct 25, 2026; owner CreateUpdate.png and the T-16 review): an Employee or Lead messages today's team on the Quiet
 // page. "Cancel · Message team · Next", Title and Message, Send to (one radio row per location they work today) and
 // Expires; Next checks the audience and opens Review ("‹ Edit · Review · Send"). Same draft, validation, preview,
 // fingerprint and publish as before.
 if(signature){
  const people=(id:string)=>new Set(context.shifts.filter(s=>s.locationId===id&&s.date===context.businessDate).map(s=>s.assigneeLabel)).size;
  const expiryText=!useExpiry||!expiration?'Never':expiration===endOfToday?'End of today':keepWhole(`${formatDisplayDate(expiration.slice(0,10))}${expiration.endsWith('Z')?'':`, ${formatTime(expiration.slice(11,16))}`}`);
  const reviewing=!!preview&&action.notice!=='conflict'&&!staleEdit;
  return <form ref={formRef} id="compose-form" className="wb-form q-compose-e" onSubmit={e=>{e.preventDefault();if(!reviewing)void review();}}>
   {reviewing?<div className="q-nav"><button type="button" className="q-nav__l q-nav__l--teal" onClick={changed} disabled={action.pending}><CaretLeftIcon className="q-ic q-ic--s" aria-hidden="true"/>Edit</button><h1 className="q-nav__t">Review</h1>
     <button type="button" className="q-nav__r q-nav__r--b" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><PendingLabel pending={action.pending} pendingText="Sending…">Send</PendingLabel></button></div>
    :<div className="q-nav"><Link className="q-nav__l q-nav__l--teal" href="/app/updates">Cancel</Link><h1 className="q-nav__t">Message team</h1>
     <button type="submit" className="q-nav__r q-nav__r--b" disabled={(disabled&&!previewing)||undefined} aria-disabled={previewing||undefined} aria-busy={previewing||undefined}><PendingLabel pending={previewing} pendingText="Checking…">Next</PendingLabel></button></div>}
   {reviewing?<section aria-label="Review before sending">
     <div className="q-grp"><h2 ref={previewHeadingRef} tabIndex={-1}>Message</h2></div>
     <div className="q-preview-msg"><b>{title.trim()}</b><p>{body.trim()}</p></div>
     <div className="q-grp"><h2>Audience</h2></div>
     <ul className="q-list">
      <li><div className="q-row q-row--one"><span className="q-rt"><b>Send to</b></span><span className="q-rv q-rv--l">{keepWhole(`Today’s team · ${location??''}`)}</span></div></li>
      <li><div className="q-row q-row--one"><span className="q-rt"><b>Recipients</b></span><span className="q-rv q-rv--l">{preview.count} {preview.count===1?'person':'people'}</span></div></li>
      <li><div className="q-row q-row--one"><span className="q-rt"><b>Expires</b></span><span className="q-rv q-rv--l">{expiryText}</span></div></li>
     </ul>
     {preview.count===0?<p className="q-help">No one is on today’s team at {location} yet. You can go back and choose another location.</p>:null}
     <p className="q-help">We check who can see it again when you send.</p>
    </section>:<fieldset disabled={disabled} className="wb-form"><legend className="nv-sr">Message today’s team</legend>
     <div className="q-fl q-first">
      <div className="q-fl__row"><label className="q-fl__label" htmlFor="communication-title">Title</label><span id="communication-title-count" className="q-help" data-over={titleCount>120||undefined} aria-label={`${titleCount} of 120 characters`}>{titleCount}/120</span></div>
      <input id="communication-title" className="q-in" placeholder="e.g. Delivery at 10" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
      {errorField==='title'&&error?<p className="q-fl__error" id="communication-title-error">{error}</p>:null}
     </div>
     <div className="q-fl">
      <div className="q-fl__row"><label className="q-fl__label" htmlFor="communication-body">Message</label><span id="communication-body-count" className="q-help" data-over={bodyCount>2000||undefined} aria-label={`${bodyCount} of 2000 characters`}>{bodyCount}/2000</span></div>
      <textarea id="communication-body" className="q-in" placeholder="What does your team need to know?" rows={5} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count':'communication-body-count'} aria-invalid={bodyCount>2000||errorField==='body'}/>
      {errorField==='body'&&error?<p className="q-fl__error" id="communication-body-error">{error}</p>:null}
     </div>
     <fieldset id="communication-location" className="q-fieldset" aria-labelledby="compose-delivery-heading" aria-describedby="compose-team-hint">
      <div className="q-grp"><h2 id="compose-delivery-heading">Send to</h2></div>
      <ul className="q-list">{context.locations.map(l=><li key={l.id}><label className="q-row q-row--pick">
       <span className="q-rt"><b>{keepWhole(`Today’s team · ${l.label}`)}</b><i>{people(l.id)?`${people(l.id)} ${people(l.id)===1?'person':'people'} working ${day}`:`People working ${day}`}</i></span>
       <input className="q-pick" type="radio" name="communication-location" value={l.id} checked={locationId===l.id} onChange={()=>{changed();setLocationId(l.id);setShiftId('');}}/><span className="q-radio" aria-hidden="true"/>
      </label></li>)}</ul>
      <p className="q-sr" id="compose-team-hint">Based on current published assignments, including overnight shifts.</p>
     </fieldset>
     <ul className="q-list" style={{marginTop:24}}><li><button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" onClick={()=>setExpiryOpen(true)}>
      <span className="q-rt"><b>Expires</b></span><span className="q-rv q-rv--l">{expiryText}</span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li></ul>
     {errorField==='expiration'&&error?<p className="q-error" id="communication-expiration-error">{error}</p>:null}
     <QuietSheet open={expiryOpen} label="Expires" onClose={()=>setExpiryOpen(false)}>
      <div className="q-nav"><span/><span className="q-nav__t">Expires</span><button type="button" className="q-nav__r q-nav__r--b" onClick={()=>setExpiryOpen(false)}>Done</button></div>
      <ul className="q-list" style={{marginTop:16}}>
       {([['never','Never'],['today','End of today'],['custom','Custom']] as const).map(([value,label])=>{
        const current=!useExpiry||!expiration?'never':expiration===endOfToday?'today':'custom';
        return <li key={value}><label className="q-row q-row--one q-row--pick"><span className="q-rt"><b>{label}</b></span>
         <input className="q-pick" type="radio" name="communication-expiry" value={value} checked={current===value} onChange={()=>{changed();if(value==='never'){setUseExpiry(false);setExpiration('');}else if(value==='today'){setExpiration(endOfToday);setUseExpiry(true);}else{setExpiration(expiration&&expiration!==endOfToday?expiration:`${context.businessDate}T18:00`);setUseExpiry(true);}}}/><span className="q-radio" aria-hidden="true"/></label></li>;
       })}
       {useExpiry&&expiration&&expiration!==endOfToday?<li><label className="q-row q-row--one q-row--picker"><span className="q-rt"><b>Until</b></span><span className="q-rv q-rv--go" aria-hidden="true">{expiryText}</span>
        <input id="communication-expiration" className="q-picker" type="datetime-local" value={expiration.endsWith('Z')?'':expiration} aria-label={`Expires (${timeZoneLabel(context.timeZone)})`} aria-invalid={errorField==='expiration'||undefined}
         onClick={event=>{try{event.currentTarget.showPicker?.();}catch{/* the browser opens its own picker */}}} onChange={e=>{changed();setExpiration(e.target.value);setUseExpiry(!!e.target.value);}}/></label></li>:null}
      </ul>
      <p className="q-help">Times in {timeZoneLabel(context.timeZone)}.</p>
     </QuietSheet>
    </fieldset>}
   <div ref={feedbackRef} tabIndex={-1} aria-label="Update review feedback">
    {error&&!errorField?<p id="communication-form-error" className="q-error" role="alert">{error}</p>:error?<p id="communication-form-error" className="q-sr" role="alert">{error}</p>:null}
    {action.notice==='conflict'||staleEdit?<p className="q-note" data-tone="urgent" role="alert"><b className="q-note__title">Review the latest information</b><span className="q-note__body">Today’s team changed. Check the message again, then tap Next.</span></p>
     :action.notice==='unavailable'&&!action.hasUnknown?<p className="q-note" data-tone="urgent" role="alert"><b className="q-note__title">We couldn’t send it</b><span className="q-note__body">Check status before trying again.</span></p>:null}
    {previewing||action.pending?<p className="q-sr" role="status">{previewing?'Checking who gets it…':'Sending…'}</p>:null}
    {action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div ref={recoveryRef} tabIndex={-1} role="status"><p className="q-note"><b className="q-note__title">We need to check if it was sent</b><span className="q-note__body">Check status before trying again.</span></p>
     <button className="q-btn q-btn--sec" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>Check status</button>{action.canRetry?<button className="q-btn q-btn--quiet" type="button" disabled={action.pending} onClick={()=>void action.retry()}>Retry original publication</button>:null}</div>:null}
   </div>
  </form>;
 }
 return <form ref={formRef} id="compose-form" className="wb-form" onSubmit={e=>{e.preventDefault();void review();}}>
  <fieldset disabled={disabled} className="wb-form"><legend className="nv-sr">{editing?'Edit update':context.management?'Create update':'Message today’s team'}</legend>
   <>
   {/* Quiet (v4, approved Oct 23): Title and Message, then Send to, Ask them to confirm and Expires as rows; Next (top
       right) checks the audience. Shift notes, important updates and Today's team stay under Type. */}
   <div className="q-fl q-first">
    <div className="q-fl__row"><label className="q-fl__label" htmlFor="communication-title">Title</label>{titleCount>100?<span id="communication-title-count" className="q-fl__opt" data-over={titleCount>120||undefined}>{titleCount}/120</span>:<span id="communication-title-count" className="q-sr">{titleCount} of 120 characters</span>}</div>
    <input id="communication-title" className="q-in" placeholder="e.g. Holiday hours" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
    {errorField==='title'&&error?<p className="q-fl__error" id="communication-title-error">{error}</p>:null}
   </div>
   <div className="q-fl">
    <div className="q-fl__row"><label className="q-fl__label" htmlFor="communication-body">Message</label>{bodyCount>1800?<span id="communication-body-count" className="q-fl__opt" data-over={bodyCount>2000||undefined}>{bodyCount}/2000</span>:<span id="communication-body-count" className="q-sr">{bodyCount} of 2000 characters</span>}</div>
    <textarea id="communication-body" className="q-in" placeholder="What does your team need to know?" rows={4} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
    <span className="q-sr" id="compose-body-hint">Plain text. Line breaks are kept.</span>
    {errorField==='body'&&error?<p className="q-fl__error" id="communication-body-error">{error}</p>:null}
   </div>
   {editing?<p className="q-help">Publishing creates a new version. Previous acknowledgements stay with the version they reviewed.</p>:<p className="q-sr">Nothing is published until you review the audience and choose Publish.</p>}
   <ul className="q-list" style={{marginTop:24}} aria-label="Delivery">
    <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Send to</b></span>
     <select id="communication-location" className="q-select-row__control" value={locationId} aria-label="Send to" aria-describedby={scopeKind==='TODAYS_TEAM'?'compose-team-hint':undefined} onChange={e=>{changed();setLocationId(e.target.value);setShiftId('');}}>{context.locations.map(l=><option key={l.id} value={l.id}>{context.locations.length===1&&scopeKind==='LOCATION'?'Everyone':scopeKind==='TODAYS_TEAM'?`Today’s team · ${l.label}`:l.label}</option>)}</select>
     <CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>
    {scopeKind==='TODAYS_TEAM'?<li className="q-sr" id="compose-team-hint">Today’s team at {location}, based on current published assignments, including overnight shifts.</li>:null}
    {scopeKind==='SHIFT'?<li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Shift</b></span><select id="communication-shift" className="q-select-row__control" value={shiftId} aria-label="Published shift" onChange={e=>{changed();setShiftId(e.target.value);}}><option value="">Choose</option>{context.shifts.filter(s=>s.locationId===locationId).map(s=><option key={s.id} value={s.id}>{formatDisplayDate(s.date)} · {formatTimeRange(s.startTime,s.endTime)} · {s.assigneeLabel}{s.positionLabel?` · ${s.positionLabel}`:''}</option>)}</select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>:null}
    {context.management&&type!=='TODAYS_TEAM'?<li><label className="q-row q-row--one"><span className="q-rt"><b>Ask them to confirm</b></span>
     <input id="communication-requirement" type="checkbox" role="switch" className="q-tog" checked={ack==='REQUIRED'} aria-describedby="compose-requirement-hint" onChange={e=>{changed();setAck(e.target.checked?'REQUIRED':'OPTIONAL');}}/></label>
     <span id="compose-requirement-hint" className="q-sr">{ack==='REQUIRED'?'Recipients must acknowledge this exact version.':'Recipients can mark the update as read.'}</span></li>:null}
    <li><div className="q-row q-row--one q-picker-row"><span className="q-rt"><b>Expires</b></span>
     {useExpiry&&expiration?<><span className="q-rv q-rv--l">{expiration.endsWith('Z')?keepWhole(formatDisplayDate(expiration.slice(0,10))):keepWhole(formatDisplayDate(expiration.slice(0,10)))}</span><button type="button" className="q-bs" onClick={()=>{changed();setUseExpiry(false);}}>Never</button></>
      :<><span className="q-rv q-rv--l" aria-hidden="true">Never</span><input id="communication-expiration" className="q-picker-row__input" type="datetime-local" value={expiration.endsWith('Z')?'':expiration} aria-label={`Expires (${timeZoneLabel(context.timeZone)}). Never if not set.`} aria-invalid={errorField==='expiration'||undefined}
       onChange={e=>{changed();setExpiration(e.target.value);setUseExpiry(!!e.target.value);}} onClick={event=>{try{event.currentTarget.showPicker?.();}catch{/* Focus is enough where pickers can't open. */}}}/></>}
     <CaretRightIcon className="q-chev" aria-hidden="true"/></div></li>
    {context.management?<li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Type</b></span><select id="communication-type" className="q-select-row__control" value={type} aria-label="Update type" onChange={e=>{const t=e.target.value as CommunicationDraft['type'];changed();setType(t);setScopeKind(t==='TODAYS_TEAM'?'TODAYS_TEAM':t==='SHIFT_NOTE'?'SHIFT':'LOCATION');}}><option value="LOCATION_ANNOUNCEMENT">Announcement</option><option value="SHIFT_NOTE">Shift note</option><option value="OPERATIONAL_UPDATE">Important update</option><option value="TODAYS_TEAM">Today’s team</option></select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>:null}
    {type==='OPERATIONAL_UPDATE'?<li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Who receives it</b></span><select id="communication-scope" className="q-select-row__control" value={scopeKind} aria-label="Who receives it" onChange={e=>{changed();setScopeKind(e.target.value as typeof scopeKind);}}><option value="LOCATION">Location</option><option value="TODAYS_TEAM">Today’s team</option><option value="SHIFT">Published shift</option></select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>:null}
   </ul>
   {errorField==='expiration'&&error?<p className="q-error" id="communication-expiration-error">{error}</p>:null}
   </>
  </fieldset>
  <div ref={feedbackRef} tabIndex={-1} className="wb-form" aria-label="Update review feedback">
   <p id="communication-form-error" className={errorField?'nv-sr':'wb-error'} role={error?'alert':undefined}>{error?errorField?error:<><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></>:null}</p>
   {action.notice==='conflict'||staleEdit?<div className="wb-notice" data-tone="review" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><strong>Review the latest information</strong><p>{staleEdit?'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.':'This update or its audience changed. Review the latest context and preview again.'}</p>{editing?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/'+editing.id}>Review latest</Link></div>:null}</div></div>:action.notice==='unavailable'?<div className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><p>We could not confirm the result. Check status before trying again.</p></div></div>:null}
   {preview&&action.notice!=='conflict'&&!staleEdit?<section className="nv-card compose-reviewed" aria-label="Audience preview"><div className="nv-card__head"><h2 className="nv-card__title" ref={previewHeadingRef} tabIndex={-1}>Audience preview</h2></div><div className="wb-body"><div className="wb-receipt"><Tile tone={preview.count===0?'review':'done'}><UsersThreeIcon size={22}/></Tile><div><p className="wb-strong">{preview.count} eligible {preview.count===1?'recipient':'recipients'}</p><p className="wb-note">At {location}.</p>{scopeKind==='SHIFT'?<p className="wb-note">{context.shifts.filter(s=>s.id===shiftId&&s.locationId===locationId).map(s=><span key={s.id}>{keepWhole(`${s.assigneeLabel}${s.positionLabel?` · ${s.positionLabel}`:''} · ${formatDisplayDate(s.date)} · ${formatTimeRange(s.startTime,s.endTime)}`)}</span>)}</p>:null}</div></div><p className="wb-note">{preview.count===0?'No eligible recipients in this audience. You can change the delivery settings before publishing.':'Check your message and delivery settings, then publish.'}</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><PendingLabel pending={action.pending} pendingText="Publishing…">{editing?'Publish new version':'Publish update'}</PendingLabel><PaperPlaneTiltIcon size={20} aria-hidden="true"/></button></div><p className="wb-help">Eligibility is checked again when you publish. Changing any field requires a new preview.</p></div></section>:<section className="nv-card q-compose-next" aria-label="Review before publishing"><div className="nv-card__head"><h2 className="nv-card__title">Review before publishing</h2></div><div className="wb-body"><p className="wb-note">Check the eligible audience before your update goes live.</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" disabled={disabled||previewing} aria-busy={previewing||undefined} type="submit">{previewing?'Checking audience…':'Preview audience'}<ArrowRightIcon size={20} aria-hidden="true"/></button></div></div></section>}
   {previewing||action.pending?<p className="nv-sr" role="status">{previewing?'Checking audience…':'Confirming publication…'}</p>:null}
   {action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div ref={recoveryRef} tabIndex={-1} className="wb-notice" data-tone="review" role="status"><WarningCircleIcon size={24} aria-hidden="true"/><div><strong>Publication needs a status check</strong><p>We couldn’t confirm the result. Check status before trying again.</p><div className="wb-actions"><button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>Check status</button>{action.canRetry?<button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.retry()}>Retry original publication</button>:null}</div></div></div>:null}
  </div>
 </form>;
}
function BoundCommunicationCompose({authority,mode,updateId}:{authority:string;mode:CommunicationMode;updateId?:string}){
 const router=useRouter(),retained=useRef<ComposeRetention|null>(null);
 const pageRef=useRef<HTMLDivElement>(null);
 const actionRef=useRef<ReturnType<typeof useCommunicationAction>|null>(null);
 const resource=useCommunicationResource(mode,authority,'/context',async signal=>{
  const context=await communicationRequest(mode,authority,'/context',undefined,signal) as CommunicationContext;
  if(context.state==='unauthorized'||context.state==='ready'&&context.authority!==authority){retained.current=null;actionRef.current?.clear();return {state:'unauthorized',reason:'access_denied'};}
  if(context.state!=='ready')return context;
  if(updateId){const read=await communicationRequest(mode,authority,'/'+updateId,undefined,signal) as CommunicationRead;if(read.state==='unauthorized'||read.state==='ready'&&(!read.management||read.authority!==authority)){retained.current=null;actionRef.current?.clear();return {state:'unauthorized',reason:'access_denied'};}if(read.state!=='ready')return {state:'unavailable',reason:'read_failed'};return {...context,editing:read,validForMs:Math.min(context.validForMs,read.validForMs),observedAt:context.observedAt};}
  return context;
 },()=>actionRef.current?.pause());
 const context=resource.value?.state==='ready'&&'locations'in resource.value?resource.value:null;
 const action=useCommunicationAction(mode,authority,result=>router.push('/app/updates/'+result.id),!!context,()=>{retained.current=null;});
 useEffect(()=>{actionRef.current=action;},[action]);
 const editing=(context as (Context&{editing?:Extract<CommunicationRead,{state:'ready'}>})|null)?.editing;
 const signedOut=(!!resource.value&&'state' in resource.value&&resource.value.state==='unauthorized')||(resource.state.snapshot?.state==='unavailable'&&resource.state.snapshot.reason==='access_denied');
 const offline=resource.state.paused&&typeof navigator!=='undefined'&&navigator.onLine===false;
 // IS-B12: when the form arrives after a failed load (Try again), focus goes to its first field.
 const composeFailed=!context&&!resource.state.refreshing;
 const hadFailure=useRef(false);
 useEffect(()=>{if(composeFailed){hadFailure.current=true;return;}if(context&&hadFailure.current){hadFailure.current=false;if(!document.activeElement||document.activeElement===document.body)document.getElementById('communication-title')?.focus({preventScroll:true});}},[composeFailed,context]);
 const title=updateId?'Edit update':mode==='manager'?'Create update':'Message today’s team';
 const content=<div className="nv-content">{context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action}/>:<section className="nv-card" role="status" aria-busy={resource.state.refreshing}><div className="wb-body"><div className="wb-receipt"><Tile tone="neutral">{resource.state.refreshing?<ClockIcon size={22}/>:<UsersThreeIcon size={22}/>}</Tile><div><h2 className="wb-strong">{offline?'You’re offline':signedOut?'Your session ended':resource.state.paused?'Paused while you were away':resource.state.refreshing?'Loading the form':'Couldn’t load the form'}</h2><p className="wb-note">{offline?'Connect to the internet, then try again.':signedOut?'Sign in again to keep writing.':resource.state.paused?'Come back to this page to keep writing.':resource.state.refreshing?'Getting your locations and today’s team…':'Check your connection, then try again.'}</p></div></div><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={resource.state.paused||resource.state.refreshing} onClick={resource.refresh}>Try again</button>{signedOut?<Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link>:null}</div></div></section>}</div>;
 // T-18: Employees and Leads write on the Quiet page (the form draws its own Cancel · Message team · Next). Before the form
 // is ready, one state at a time: loading, or what went wrong with one way forward (UX-E-46).
 if(mode==='employee'&&!updateId)return <div ref={pageRef} className="q-page wb-compose q-compose q-compose-e" data-nv-page="" data-q-sheet="">
  {context?<><h1 className="q-sr">Message today’s team</h1><ComposeForm key={authority+':new'} context={context} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action}/></>
   :<><QuietNav left={<Link className="q-nav__l q-nav__l--teal" href="/app/updates">Cancel</Link>} title="Message team"/>
    <div className="q-hd"><h1>{offline?'You’re offline':signedOut?'Your session ended':resource.state.paused?'Paused while you were away':resource.state.refreshing?'Message today’s team':'Couldn’t load the form'}</h1>
     <p role="status">{offline?'Connect to the internet, then try again.':signedOut?'Sign in again to keep writing.':resource.state.paused?'Come back to this page to keep writing.':resource.state.refreshing?'Getting today’s team…':'Check your connection, then try again.'}</p></div>
    {signedOut?<Link className="q-btn q-btn--sec" href="/login">Sign in again</Link>:!resource.state.refreshing&&!resource.state.paused?<button type="button" className="q-btn q-btn--sec" onClick={resource.refresh}>Try again</button>:null}</>}
 </div>;
 // Quiet (v4, approved Oct 23): a sheet: Cancel, the title, and Next (review the audience) at the top right.
 return <div ref={pageRef} className="q-page wb-compose q-compose" data-nv-page="" data-q-sheet="">
  <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={updateId?'/app/updates/'+updateId:'/app/updates'}>Cancel</Link>} title={updateId?'Edit update':'New update'}
   right={context?<button type="submit" form="compose-form" className="q-nav__r q-nav__r--b">Next</button>:undefined}/>
  <h1 className="q-sr">{title}</h1>
  {content}
 </div>;
}

export function CommunicationCompose(props:{authority:string;mode:CommunicationMode;updateId?:string}){
 return <BoundCommunicationCompose key={props.mode+':'+props.authority+':'+(props.updateId??'new')} {...props}/>;
}
