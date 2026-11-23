'use client';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import Link from 'next/link';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {useRouter} from 'next/navigation';
import {DiscardGuard} from './kit/discard-dialog';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {PaperPlaneTiltIcon} from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';

import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {Tile} from './kit/kit';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {SigBand,SigHead,SigPage} from './signature/signature';
import cc from './communication-compose-signature.module.css';
import {PendingLabel} from './employee-submit-button';
import {BBusyLabel,BCard,BIcon,BRow,BSegs,BState} from './owner-b/b-kit';
import {ManagerMessagesPage} from './messages-manager-b';
import {revealFeedback} from '@/lib/reveal-feedback';
import {keepWhole} from '../lib/keep-whole';
import {formatDisplayDate,formatTimeRange} from '../lib/date-utils';
import {timeZoneLabel} from '../lib/time-zone-label';
import {localDateTimeToInstant} from '../lib/business-time';
import {validateCommunicationDraft} from '../lib/communications/validation';
import {communicationRequest,useCommunicationAction,useCommunicationResource,type CommunicationMode} from '../lib/communications/client';
import type {CommunicationContext,CommunicationDraft,CommunicationRead} from '../lib/communications/types';
type Context=Extract<CommunicationContext,{state:'ready'}>;
type ComposeValues={type:CommunicationDraft['type'];scopeKind:CommunicationDraft['scope']['kind'];locationId:string;shiftId:string;title:string;body:string;ack:CommunicationDraft['acknowledgement'];expiration:string;useExpiry:boolean};
type ComposeRetention={values:ComposeValues;revisionId:string|null};
export function ComposeForm({context,initial,editing,mode,authority,retained,retain,action,onStep,backRef}:{/** Final polish (Nov 21, 2026): the page's band asks the form to go back from Review to Write (its Back on phones). */backRef?:MutableRefObject<(()=>void)|null>;/** Final polish (Nov 20, 2026): tells the page which of the two steps is showing (1 write, 2 review), for its step line. */onStep?:(step:1|2)=>void;context:Context;initial?:CommunicationDraft;editing?:Extract<CommunicationRead,{state:'ready'}>;mode:CommunicationMode;authority:string;retained:MutableRefObject<ComposeRetention|null>;retain:(values:ComposeValues,revisionId:string|null)=>void;action:ReturnType<typeof useCommunicationAction>}){
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
 const reviewing=!!preview&&action.notice!=='conflict'&&!staleEdit;
 useEffect(()=>{onStep?.(reviewing?2:1);},[reviewing,onStep]);
 const titleCount=[...title.trim()].length,bodyCount=[...body.trim()].length;
 function changed(){previewGeneration.current++;setPreview(null);setPreviewing(false);setError(null);setErrorField(null);action.setNotice(null);}
 function draft():CommunicationDraft|null{
  const selected=context.shifts.find(s=>s.id===shiftId&&s.locationId===locationId);
  const scope=scopeKind==='LOCATION'?{kind:'LOCATION' as const,locationId}:scopeKind==='TODAYS_TEAM'?{kind:'TODAYS_TEAM' as const,locationId,businessDate:context.businessDate}:selected?{kind:'SHIFT' as const,locationId,sourceShiftId:selected.id,assignmentEpisodeId:selected.assignmentEpisodeId,termsFingerprint:selected.termsFingerprint}:initial?.scope.kind==='SHIFT'&&initial.scope.sourceShiftId===shiftId?initial.scope:null;
  if(!scope){setError('Choose a current published shift.');return null;}
  let expiresAt:string|null=null;try{if(useExpiry)expiresAt=expiration.endsWith('Z')?expiration:localDateTimeToInstant(expiration,context.timeZone);}catch{setError(`Choose a valid date and time in ${timeZoneLabel(context.timeZone)}.`);setErrorField('expiration');document.getElementById('communication-expiration')?.focus();return null;}
  if(expiresAt&&Date.parse(expiresAt)<=Date.now()){setError('Choose a time later than now.');setErrorField('expiration');document.getElementById('communication-expiration')?.focus();return null;}
  const parsed=validateCommunicationDraft({type,scope,title,body,acknowledgement:type==='TODAYS_TEAM'?'OPTIONAL':ack,expiresAt});
  if(!parsed.ok){const field=titleCount<1||titleCount>120?'title':bodyCount<1||bodyCount>2000?'body':null;setErrorField(field);setError(field==='title'?(titleCount<1?'Enter a title':'Use 120 characters or fewer'):field==='body'?(bodyCount<1?'Enter a message':'Use 2,000 characters or fewer'):'Use plain text, and choose a location and who receives it.');document.getElementById(titleCount<1||titleCount>120?'communication-title':'communication-body')?.focus();return null;}
  return parsed.value;
 }
 async function review(){if(staleEdit)return;const value=draft();if(!value)return;retain(values,reviewedRevisionId);const sequence=++previewGeneration.current;setError(null);setErrorField(null);setPreviewing(true);try{const result=await communicationRequest(mode,authority,'/preview',value) as {state:string;count:number;fingerprint:string};if(sequence!==previewGeneration.current)return;if(result.state==='ready'){action.setNotice(null);setError(null);setPreview({count:result.count,fingerprint:result.fingerprint});}else setError('Audience couldn’t be checked. You may not have access to this location.');}catch{if(sequence===previewGeneration.current)setError('Audience couldn’t be checked. Try again.');}finally{if(sequence===previewGeneration.current)setPreviewing(false);}}
 function publish(){if(staleEdit)return;const value=draft();if(!value||!preview)return;retain(values,reviewedRevisionId);void action.send({kind:editing?'REVISE':'PUBLISH',operationId:crypto.randomUUID(),authority,draft:value,audienceFingerprint:preview.fingerprint,...(editing?{communicationId:editing.id,expectedRevisionId:reviewedRevisionId}:{})});}
 const disabled=action.pending||action.notice==='unknown'||staleEdit;
 // Final polish (Nov 21, 2026): step 2 is a review (read text, not fields). Edit and Back return to step 1 exactly as
 // changing a field always has (the preview is dropped, so Next checks the audience again); focus goes to Title.
 const returning=useRef(false);
 function backToWrite(){if(disabled)return;returning.current=true;changed();}
 useEffect(()=>{if(!backRef)return;backRef.current=backToWrite;return()=>{backRef.current=null;};});
 useEffect(()=>{if(!reviewing&&returning.current){returning.current=false;document.getElementById('communication-title')?.focus();}},[reviewing]);
 const typeLabel=type==='TODAYS_TEAM'?'Today’s team':type==='SHIFT_NOTE'?'Shift note':type==='OPERATIONAL_UPDATE'?'Important update':'Announcement';
 const location=context.locations.find(l=>l.id===locationId)?.label;
 if(action.notice==='signed-out'&&mode==='manager')return <BCard><BState kind="locked" alert title="Your session ended" line="Sign in again to continue." action={{label:'Sign in',href:'/login'}}/></BCard>;
 if(action.notice==='blocked'&&mode==='manager')return <BCard><BState kind="locked" alert title="Publication unavailable" line="Your current permission does not allow publication." action={{label:'Sign in again',href:'/login'}} quiet={<Link className="b-btn b-btn--quiet" href="/app/updates">Return to updates</Link>}/></BCard>;
 if(action.notice==='signed-out')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24} weight="bold"/><div><h2 className="wb-notice__title">Your session ended</h2><p>Sign in again to continue.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in</Link></div></div></section>;
 if(action.notice==='blocked')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24} weight="bold"/><div><h2 className="wb-notice__title">Publication unavailable</h2><p>Your current permission does not allow publication.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link><Link className="nv-btn" data-kind="secondary" href="/app/updates">Return to updates</Link></div></div></section>;
 // Phase 4 (Signature, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-4/p4b-board-a.png):
 // employees (Leads) message today's team; the message is set like a page and the review shows the count and the update
 // as people will see it. Managers keep the shared form. Same fields, validation, preview and publish.
 const signature=mode==='employee'&&!context.management;
 const day=keepWhole(formatDisplayDate(context.businessDate));
 const sigReview=preview&&action.notice!=='conflict'&&!staleEdit?<section className={`compose-reviewed ${cc.ccReview}`} aria-label="Audience preview">
   <div className={cc.ccCount}><b aria-hidden="true">{preview.count}</b><span><h2 ref={previewHeadingRef} tabIndex={-1}><span className="nv-sr">Audience preview: {preview.count} </span>{preview.count===1?'person':'people'} at {location}</h2><small>Everyone on today’s team · {day}</small></span></div>
   {preview.count===0?<p className={cc.ccEmpty}>No eligible recipients in this audience. You can change the delivery settings before publishing.</p>:null}
   <SigHead title="On their phone"/>
   <div className={cc.ccLock} aria-hidden="true"><div className={cc.ccLockTime}><b>9:41</b><span>{day}</span></div>
    <div className={cc.ccAlert}><span className={cc.ccApp}>N</span><span className={cc.ccAlertCopy}><b>NEVORA · {location}</b><span><b>{title.trim()||'Your title'}</b> {body.trim()||'Your message'}</span></span><small>now</small></div></div>
   <SigHead title="In the app"/>
   <div className={`sg-card ${cc.ccPreview}`} aria-hidden="true"><div className="sg-card-head"><span className="sg-tile"><UsersThreeIcon size={22} weight="bold"/></span><span className={cc.ccHeadCopy}><b>Today’s team</b><small>{day}</small></span></div>
    <div className={cc.ccPreviewBody}><b>{title.trim()||'Your title'}</b><span>{body.trim()||'Your message'}</span></div></div>
   <button className="sg-cta" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><PaperPlaneTiltIcon size={20} weight="bold" aria-hidden="true"/><PendingLabel pending={action.pending} pendingText="Publishing…">Publish update</PendingLabel></button>
   <p className="sg-after">Eligibility is checked again when you publish. Changing any field requires a new preview.</p>
  </section>
  :<div className={cc.ccSubmit}><button className="sg-cta" disabled={(disabled&&!previewing)||undefined} aria-disabled={previewing||undefined} aria-busy={previewing||undefined} onClick={event=>{if(previewing)event.preventDefault();}} type="submit"><PendingLabel pending={previewing} pendingText="Checking audience…">Preview audience</PendingLabel></button><p className="sg-after">Nothing is published until you review the audience and choose Publish.</p></div>;
 return <form ref={formRef} id="compose-form" className="wb-form" onSubmit={e=>{e.preventDefault();void review();}}>
  {/* Leaving New update or Edit update with a title or message that is not published asks first (Nov 21, 2026; Owner,
    Manager and a Lead's message to today's team). Next, Edit and Back are steps of this form and never ask; a publish leaves by the router. */}
  <DiscardGuard dirty={!action.pending&&(title!==(initial?.title??'')||body!==(initial?.body??''))}/>
  <fieldset disabled={disabled} className="wb-form"><legend className="nv-sr">{editing?'Edit update':context.management?'New update':'Message today’s team'}</legend>
   {signature?<>
   <SigHead id="compose-message-heading" title="Message"/>
   <section className={cc.ccPaper} aria-labelledby="compose-message-heading">
    <div className={cc.ccTag}><span><UsersThreeIcon size={15} weight="bold" aria-hidden="true"/>Today’s team</span><span id="communication-title-count" data-over={titleCount>120||undefined}><span className="nv-sr">Title: </span>{titleCount}/120</span></div>
    <label htmlFor="communication-title" className="nv-sr">Title</label>
    <input id="communication-title" className={cc.ccTitle} placeholder="Title" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
    {errorField==='title'&&error?<p className="wb-error" id="communication-title-error"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></p>:null}
    <label htmlFor="communication-body" className="nv-sr">Message</label>
    <textarea id="communication-body" className={cc.ccBody} placeholder="What does your team need to know?" rows={5} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
    {errorField==='body'&&error?<p className="wb-error" id="communication-body-error"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></p>:null}
    <p className={cc.ccFoot}><span id="compose-body-hint">Plain text · line breaks kept</span><span id="communication-body-count" data-over={bodyCount>2000||undefined}>{bodyCount} / 2000</span></p>
   </section>
   <SigHead id="compose-delivery-heading" title="Who gets it"/>
   <fieldset id="communication-location" className={`sg-card ${cc.ccWho}`} aria-labelledby="compose-delivery-heading" aria-describedby="compose-team-hint">
    {context.locations.map(l=><label key={l.id} className="sg-r" data-selected={locationId===l.id||undefined}>
     <span className="sg-tile" aria-hidden="true"><UsersThreeIcon size={22} weight="bold"/></span>
     <span className="sg-copy"><b>Today’s team · {l.label}</b><span>People working {day}</span></span>
     <input type="radio" name="communication-location" value={l.id} checked={locationId===l.id} onChange={()=>{changed();setLocationId(l.id);setShiftId('');}}/><span className={cc.ccRadio} aria-hidden="true"/>
    </label>)}
   </fieldset>
   <p className="sg-after" id="compose-team-hint">Based on current published assignments, including overnight shifts.</p>
   <div className={`sg-card ${cc.ccExpiry}`}>
    <label className={cc.ccCheck}><input type="checkbox" checked={useExpiry} aria-describedby={useExpiry?undefined:'compose-expiry-hint'} onChange={e=>{changed();setUseExpiry(e.target.checked);}}/><span><b>Set an expiration</b>{useExpiry?null:<small id="compose-expiry-hint">It stays available until it is withdrawn.</small>}</span></label>
    {useExpiry?<div className={cc.ccWhen}><label htmlFor="communication-expiration">Available until ({timeZoneLabel(context.timeZone)})</label><input id="communication-expiration" type={expiration.endsWith('Z')?'text':'datetime-local'} value={expiration} aria-invalid={errorField==='expiration'||undefined} aria-describedby={errorField==='expiration'?'communication-expiration-error':undefined} onChange={e=>{changed();setExpiration(e.target.value);}}/>{errorField==='expiration'&&error?<p className="wb-error" id="communication-expiration-error"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></p>:null}</div>:null}
   </div>
   </>:<>
   {/* Phase 2 (package Messages, Nov 23, 2026): Owners and Managers, Direction B. Step 1 is two kit cards: the message
       (Title, Message) and its delivery (Send to, Shift, Ask them to confirm, Expires, Type, Who receives it) as outlined
       fields, ending with Cancel and Next. Same fields, ids, validation and preview as before. */}
   {reviewing?null:<>
   <section className="b-card mb-form" aria-labelledby="compose-message-h">
    <h2 className="b-sr" id="compose-message-h">Message</h2>
    <div className="mb-field">
     <div className="mb-field__row"><label htmlFor="communication-title">Title</label>{titleCount>100?<span id="communication-title-count" className="mb-field__count" data-over={titleCount>120||undefined}>{titleCount}/120</span>:<span id="communication-title-count" className="b-sr">{titleCount} of 120 characters</span>}</div>
     <input id="communication-title" className="mb-in" placeholder="e.g. Holiday hours" autoComplete="off" autoCapitalize="sentences" enterKeyHint="next" value={title} onChange={e=>{changed();setTitle(e.target.value);}}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();document.getElementById('communication-body')?.focus();}}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
     {errorField==='title'&&error?<p className="mb-field__error" id="communication-title-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true"/>{error}</p>:null}
    </div>
    <div className="mb-field">
     <div className="mb-field__row"><label htmlFor="communication-body">Message</label>{bodyCount>1800?<span id="communication-body-count" className="mb-field__count" data-over={bodyCount>2000||undefined}>{bodyCount}/2000</span>:<span id="communication-body-count" className="b-sr">{bodyCount} of 2000 characters</span>}</div>
     <textarea id="communication-body" className="mb-in mb-in--area" placeholder="What does your team need to know?" rows={5} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
     <span className="b-sr" id="compose-body-hint">Plain text. Line breaks are kept.</span>
     {errorField==='body'&&error?<p className="mb-field__error" id="communication-body-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true"/>{error}</p>:null}
    </div>
   </section>
   {editing?<p className="b-note mb-note">Publishing creates a new version. Earlier confirmations stay with the version people reviewed.</p>:<p className="b-sr">Nothing is published until you review the audience and choose Publish.</p>}
   <section className="b-card mb-form" aria-labelledby="compose-delivery-h">
    <h2 className="b-sr" id="compose-delivery-h">Delivery</h2>
    {context.management?<div className="mb-field"><label htmlFor="communication-type">Type</label><span className="mb-select"><select id="communication-type" className="mb-in" value={type} onChange={e=>{const t=e.target.value as CommunicationDraft['type'];changed();setType(t);setScopeKind(t==='TODAYS_TEAM'?'TODAYS_TEAM':t==='SHIFT_NOTE'?'SHIFT':'LOCATION');}}><option value="LOCATION_ANNOUNCEMENT">Announcement</option><option value="SHIFT_NOTE">Shift note</option><option value="OPERATIONAL_UPDATE">Important update</option><option value="TODAYS_TEAM">Today’s team</option></select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span></div>:null}
    {type==='OPERATIONAL_UPDATE'?<div className="mb-field"><label htmlFor="communication-scope">Who receives it</label><span className="mb-select"><select id="communication-scope" className="mb-in" value={scopeKind} onChange={e=>{changed();setScopeKind(e.target.value as typeof scopeKind);}}><option value="LOCATION">Everyone at the location</option><option value="TODAYS_TEAM">Today’s team</option><option value="SHIFT">One published shift</option></select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span></div>:null}
    <div className="mb-field"><label htmlFor="communication-location">Send to</label>
     <span className="mb-select"><select id="communication-location" className="mb-in" value={locationId} aria-describedby={scopeKind==='TODAYS_TEAM'?'compose-team-hint':undefined} onChange={e=>{changed();setLocationId(e.target.value);setShiftId('');}}>{context.locations.map(l=><option key={l.id} value={l.id}>{scopeKind==='TODAYS_TEAM'?`Today’s team · ${l.label}`:l.label}</option>)}</select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span>
     {scopeKind==='TODAYS_TEAM'?<span className="mb-field__help" id="compose-team-hint">People with a published shift today, overnight shifts included.</span>:null}</div>
    {scopeKind==='SHIFT'?<div className="mb-field"><label htmlFor="communication-shift">Shift</label><span className="mb-select"><select id="communication-shift" className="mb-in" value={shiftId} onChange={e=>{changed();setShiftId(e.target.value);}}><option value="">Choose a published shift</option>{context.shifts.filter(s=>s.locationId===locationId).map(s=><option key={s.id} value={s.id}>{formatDisplayDate(s.date)} · {formatTimeRange(s.startTime,s.endTime)} · {s.assigneeLabel}{s.positionLabel?` · ${s.positionLabel}`:''}</option>)}</select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span></div>:null}
    {context.management&&type!=='TODAYS_TEAM'?<label className="mb-switch"><span className="mb-switch__tx"><b id="compose-requirement-label">Ask them to confirm</b><span id="compose-requirement-hint">{ack==='REQUIRED'?'Each person confirms this version.':'People can mark it read.'}</span></span>
     <input id="communication-requirement" type="checkbox" role="switch" className="mb-tog" checked={ack==='REQUIRED'} aria-labelledby="compose-requirement-label" aria-describedby="compose-requirement-hint" onChange={e=>{changed();setAck(e.target.checked?'REQUIRED':'OPTIONAL');}}/></label>:null}
    <div className="mb-field"><div className="mb-field__row"><label htmlFor="communication-expiration">Expires</label><span className="mb-field__count">Optional</span></div>
     {useExpiry&&expiration.endsWith('Z')?<div className="mb-fixed"><span>{keepWhole(formatDisplayDate(expiration.slice(0,10)))}</span><button type="button" className="b-btn b-btn--quiet" onClick={()=>{changed();setUseExpiry(false);setExpiration('');}}>Never</button></div>
      :<input id="communication-expiration" className="mb-in" type="datetime-local" value={expiration} aria-describedby={errorField==='expiration'?'communication-expiration-error compose-expiry-hint':'compose-expiry-hint'} aria-invalid={errorField==='expiration'||undefined}
       onChange={e=>{changed();setExpiration(e.target.value);setUseExpiry(!!e.target.value);}}/>}
     <span className="mb-field__help" id="compose-expiry-hint">{`Time in ${timeZoneLabel(context.timeZone)}. Empty means it never expires.`}</span>
     {errorField==='expiration'&&error?<p className="mb-field__error" id="communication-expiration-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true"/>{error}</p>:null}</div>
    <div className="mb-acts mb-foot"><Link className="b-btn b-btn--quiet" href={editing?'/app/updates/'+editing.id:'/app/updates'}>Cancel</Link><button type="submit" className="b-btn b-btn--teal" disabled={(disabled&&!previewing)||undefined} aria-disabled={previewing||undefined} aria-busy={previewing||undefined} onClick={event=>{if(previewing)event.preventDefault();}}><BBusyLabel busy={previewing} busyLabel="Checking…">Next</BBusyLabel></button></div>
   </section>
   </>}
   </>}
  </fieldset>
  <div ref={feedbackRef} tabIndex={-1} className="wb-form" role="group" aria-label="Update review feedback">
   <p id="communication-form-error" className={errorField?'nv-sr':'wb-error'} role={error?'alert':undefined}>{error?errorField?error:<><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></>:null}</p>
   {!signature&&(action.notice==='conflict'||staleEdit)?<BCard><BState kind="failed" alert title="Review the latest information" line={staleEdit?'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.':'This update or its audience changed. Review the latest context and preview again.'} action={editing?{label:'Review latest',href:'/app/updates/'+editing.id}:undefined}/></BCard>
    :!signature&&action.notice==='unavailable'&&!action.hasUnknown?<BCard><BState kind="failed" alert title="Couldn’t confirm the result" line="Check status before trying again."/></BCard>
    :action.notice==='conflict'||staleEdit?<div className="wb-notice" data-tone="review" role="alert"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><strong>Review the latest information</strong><p>{staleEdit?'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.':'This update or its audience changed. Review the latest context and preview again.'}</p>{editing?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/'+editing.id}>Review latest</Link></div>:null}</div></div>:action.notice==='unavailable'?<div className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><p>We could not confirm the result. Check status before trying again.</p></div></div>:null}
   {signature?sigReview:preview&&action.notice!=='conflict'&&!staleEdit?<section className="b-card compose-reviewed b-cmp-review" aria-labelledby="compose-review-title">
    <div className="b-cmp-review__msg">
     <div className="b-cmp-review__head"><h2 id="compose-review-title" className="b-cmp-review__t" ref={previewHeadingRef} tabIndex={-1}><span className="q-sr">Review: </span>{title.trim()}</h2>
      <button type="button" className="b-btn b-btn--quiet b-rowact b-rowact--quiet b-cmp-review__edit" aria-label="Edit update" disabled={disabled} onClick={backToWrite}>Edit</button></div>
     <p className="b-cmp-review__body">{body.trim()}</p>
     <p className="b-cmp-review__facts"><BSegs parts={[typeLabel,context.management&&type!=='TODAYS_TEAM'?(ack==='REQUIRED'?'Must be confirmed':'Confirming is optional'):null,useExpiry&&expiration?`Expires ${formatDisplayDate(expiration.slice(0,10))}`:'Never expires']}/></p>
    </div>
    <ul className="b-list b-cmp-review__who" aria-label="Who gets it">
     <BRow lead={<BIcon tone={preview.count===0?'amber':'teal'}><UsersThreeIcon weight="bold"/></BIcon>} title={`Goes to ${preview.count} ${preview.count===1?'person':'people'}`} sub={`At ${location}`}
      extra={scopeKind==='SHIFT'?context.shifts.filter(s=>s.id===shiftId&&s.locationId===locationId).map(s=><span key={s.id} className="b-row__s">{keepWhole(`${s.assigneeLabel}${s.positionLabel?` · ${s.positionLabel}`:''} · ${formatDisplayDate(s.date)} · ${formatTimeRange(s.startTime,s.endTime)}`)}</span>):undefined}/>
    </ul>
    <p className="b-note b-cmp-review__note">{preview.count===0?'No one is in this audience right now. Edit the update to change who gets it. ':null}The list is checked again when you publish.</p>
    <div className="b-cmp-review__foot">
     <button type="button" className="b-btn b-btn--ghost b-cmp-review__back" disabled={disabled} onClick={backToWrite}>Back</button>
     <button className="b-btn b-btn--teal b-cmp-review__go" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><BBusyLabel busy={action.pending} busyLabel="Publishing…">{editing?'Publish new version':'Publish update'}</BBusyLabel></button>
    </div>
   </section>:!signature?null:<section className="nv-card q-compose-next" aria-label="Review before publishing"><div className="nv-card__head"><h2 className="nv-card__title">Review before publishing</h2></div><div className="wb-body"><p className="wb-note">Check the eligible audience before your update goes live.</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" disabled={disabled||previewing} aria-busy={previewing||undefined} type="submit">{previewing?'Checking audience…':'Preview audience'}<ArrowRightIcon size={20} weight="bold" aria-hidden="true"/></button></div></div></section>}
   {previewing||action.pending?<p className="nv-sr" role="status">{previewing?'Checking audience…':'Confirming publication…'}</p>:null}
   {!signature&&(action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown)?<div ref={recoveryRef} tabIndex={-1} className="b-card"><BState kind="paused" title="Publication needs a status check" line="We couldn’t confirm the result. Check status before trying again."
     action={{label:'Check status',onClick:()=>void action.lookup(),busy:action.pending}} quiet={action.canRetry?<button className="b-btn b-btn--quiet" type="button" disabled={action.pending} onClick={()=>void action.retry()}>Retry original publication</button>:undefined}/></div>
    :action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div ref={recoveryRef} tabIndex={-1} className="wb-notice" data-tone="review" role="status"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><strong>Publication needs a status check</strong><p>We couldn’t confirm the result. Check status before trying again.</p><div className="wb-actions"><button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>Check status</button>{action.canRetry?<button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.retry()}>Retry original publication</button>:null}</div></div></div>:null}
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
 // Final polish (Nov 21, 2026): the update's page shows its result once after a publish from here (?published=1; the
 // page reads it and drops it from the address). Client navigation only; the request is the same.
 const action=useCommunicationAction(mode,authority,result=>router.push('/app/updates/'+result.id+(mode==='manager'?'?published=1':'')),!!context,()=>{retained.current=null;});
 const backRef=useRef<(()=>void)|null>(null);
 useEffect(()=>{actionRef.current=action;},[action]);
 const editing=(context as (Context&{editing?:Extract<CommunicationRead,{state:'ready'}>})|null)?.editing;
 const [step,setStep]=useState<1|2>(1);
 const signedOut=(!!resource.value&&'state' in resource.value&&resource.value.state==='unauthorized')||(resource.state.snapshot?.state==='unavailable'&&resource.state.snapshot.reason==='access_denied');
 const offline=resource.state.paused&&typeof navigator!=='undefined'&&navigator.onLine===false;
 // IS-B12: when the form arrives after a failed load (Try again), focus goes to its first field.
 const composeFailed=!context&&!resource.state.refreshing;
 const hadFailure=useRef(false);
 useEffect(()=>{if(composeFailed){hadFailure.current=true;return;}if(context&&hadFailure.current){hadFailure.current=false;if(!document.activeElement||document.activeElement===document.body)document.getElementById('communication-title')?.focus({preventScroll:true});}},[composeFailed,context]);
 const content=<div className="nv-content">{context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action} onStep={setStep} backRef={backRef}/>:<section className="nv-card" role="status" aria-busy={resource.state.refreshing}><div className="wb-body"><div className="wb-receipt"><Tile tone="neutral">{resource.state.refreshing?<ClockIcon size={22} weight="bold"/>:<UsersThreeIcon size={22} weight="bold"/>}</Tile><div><h2 className="wb-strong">{offline?'You’re offline':signedOut?'Your session ended':resource.state.paused?'Paused while you were away':resource.state.refreshing?'Loading the form':'Couldn’t load the form'}</h2><p className="wb-note">{offline?'Connect to the internet, then try again.':signedOut?'Sign in again to keep writing.':resource.state.paused?'Come back to this page to keep writing.':resource.state.refreshing?'Getting your locations and today’s team…':'Check your connection, then try again.'}</p></div></div><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={resource.state.paused||resource.state.refreshing} onClick={resource.refresh}>Try again</button>{signedOut?<Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link>:null}</div></div></section>}</div>;
 if(mode==='employee'&&!updateId)return <div ref={pageRef} className="nv-page wb-page wb-narrow wb-compose" data-nv-page="">
  <SigPage className={cc.ccRoot} band={<SigBand eyebrow="Team updates · new"><h1 className="sg-head2">Message<br/>today’s team</h1><p className="sg-sub"><span>Write it once. Everyone working today sees it.</span></p><Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} weight="bold" aria-hidden="true"/>Updates</Link></SigBand>}>{content}</SigPage>
 </div>;
 // Phase 2 (package Messages, Nov 23, 2026): Owners and Managers, Direction B. The band (the hero on a phone) says New
 // update or Edit update with its step ("Step 1 of 2 · Write"); its way back is Cancel. The form's own cards carry Cancel
 // and Next (step 1) and Back and Publish (step 2) at every width. Until the form is here, the kit's one state card.
 const stateKind=offline?'offline':signedOut?'locked':resource.state.paused?'paused':resource.state.refreshing?'loading':'failed';
 return <div ref={pageRef} className="mb-root wb-compose">
  <ManagerMessagesPage className="mb-compose" titleId="compose-title" title={updateId?'Edit update':'New update'} sub={context?`Step ${step} of 2 · ${step===1?'Write':'Review'}`:undefined}
   back={{href:updateId?'/app/updates/'+updateId:'/app/updates',label:'Cancel',close:true}}
   cards={context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action} onStep={setStep} backRef={backRef}/>
    :<BCard><BState kind={stateKind}
     title={offline?'You’re offline':signedOut?'Your session ended':resource.state.paused?'Paused while you were away':resource.state.refreshing?'Loading the form':'Couldn’t load the form'}
     line={offline?'Connect to the internet, then try again.':signedOut?'Sign in again to keep writing.':resource.state.paused?'Come back to this page to keep writing.':resource.state.refreshing?'Getting your locations and today’s team…':'Check your connection, then try again.'}
     action={signedOut?{label:'Sign in again',href:'/login'}:resource.state.paused||resource.state.refreshing?undefined:{label:'Try again',onClick:resource.refresh}}/></BCard>}/>
 </div>;
}

export function CommunicationCompose(props:{authority:string;mode:CommunicationMode;updateId?:string}){
 return <BoundCommunicationCompose key={props.mode+':'+props.authority+':'+(props.updateId??'new')} {...props}/>;
}
