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
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {SigBand,SigHead,SigPage} from './signature/signature';
import cc from './communication-compose-signature.module.css';
import {PendingLabel} from './employee-submit-button';
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
 const location=context.locations.find(l=>l.id===locationId)?.label;
 if(action.notice==='signed-out')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24}/><div><h2 className="wb-notice__title">Your session ended</h2><p>Sign in again to continue.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in</Link></div></div></section>;
 if(action.notice==='blocked')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24}/><div><h2 className="wb-notice__title">Publication unavailable</h2><p>Your current permission does not allow publication.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link><Link className="nv-btn" data-kind="secondary" href="/app/updates">Return to updates</Link></div></div></section>;
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
   <div className={`sg-card ${cc.ccPreview}`} aria-hidden="true"><div className="sg-card-head"><span className="sg-tile"><UsersThreeIcon size={22}/></span><span className={cc.ccHeadCopy}><b>Today’s team</b><small>{day}</small></span></div>
    <div className={cc.ccPreviewBody}><b>{title.trim()||'Your title'}</b><span>{body.trim()||'Your message'}</span></div></div>
   <button className="sg-cta" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><PaperPlaneTiltIcon size={20} aria-hidden="true"/><PendingLabel pending={action.pending} pendingText="Publishing…">Publish update</PendingLabel></button>
   <p className="sg-after">Eligibility is checked again when you publish. Changing any field requires a new preview.</p>
  </section>
  :<div className={cc.ccSubmit}><button className="sg-cta" disabled={(disabled&&!previewing)||undefined} aria-disabled={previewing||undefined} aria-busy={previewing||undefined} onClick={event=>{if(previewing)event.preventDefault();}} type="submit"><PendingLabel pending={previewing} pendingText="Checking audience…">Preview audience</PendingLabel></button><p className="sg-after">Nothing is published until you review the audience and choose Publish.</p></div>;
 return <form ref={formRef} id="compose-form" className="wb-form" onSubmit={e=>{e.preventDefault();void review();}}>
  <fieldset disabled={disabled} className="wb-form"><legend className="nv-sr">{editing?'Edit update':context.management?'Create update':'Message today’s team'}</legend>
   {signature?<>
   <SigHead id="compose-message-heading" title="Message"/>
   <section className={cc.ccPaper} aria-labelledby="compose-message-heading">
    <div className={cc.ccTag}><span><UsersThreeIcon size={15} aria-hidden="true"/>Today’s team</span><span id="communication-title-count" data-over={titleCount>120||undefined}><span className="nv-sr">Title: </span>{titleCount}/120</span></div>
    <label htmlFor="communication-title" className="nv-sr">Title</label>
    <input id="communication-title" className={cc.ccTitle} placeholder="Title" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
    {errorField==='title'&&error?<p className="wb-error" id="communication-title-error"><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></p>:null}
    <label htmlFor="communication-body" className="nv-sr">Message</label>
    <textarea id="communication-body" className={cc.ccBody} placeholder="What does your team need to know?" rows={5} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
    {errorField==='body'&&error?<p className="wb-error" id="communication-body-error"><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></p>:null}
    <p className={cc.ccFoot}><span id="compose-body-hint">Plain text · line breaks kept</span><span id="communication-body-count" data-over={bodyCount>2000||undefined}>{bodyCount} / 2000</span></p>
   </section>
   <SigHead id="compose-delivery-heading" title="Who gets it"/>
   <fieldset id="communication-location" className={`sg-card ${cc.ccWho}`} aria-labelledby="compose-delivery-heading" aria-describedby="compose-team-hint">
    {context.locations.map(l=><label key={l.id} className="sg-r" data-selected={locationId===l.id||undefined}>
     <span className="sg-tile" aria-hidden="true"><UsersThreeIcon size={22}/></span>
     <span className="sg-copy"><b>Today’s team · {l.label}</b><span>People working {day}</span></span>
     <input type="radio" name="communication-location" value={l.id} checked={locationId===l.id} onChange={()=>{changed();setLocationId(l.id);setShiftId('');}}/><span className={cc.ccRadio} aria-hidden="true"/>
    </label>)}
   </fieldset>
   <p className="sg-after" id="compose-team-hint">Based on current published assignments, including overnight shifts.</p>
   <div className={`sg-card ${cc.ccExpiry}`}>
    <label className={cc.ccCheck}><input type="checkbox" checked={useExpiry} aria-describedby={useExpiry?undefined:'compose-expiry-hint'} onChange={e=>{changed();setUseExpiry(e.target.checked);}}/><span><b>Set an expiration</b>{useExpiry?null:<small id="compose-expiry-hint">It stays available until it is withdrawn.</small>}</span></label>
    {useExpiry?<div className={cc.ccWhen}><label htmlFor="communication-expiration">Available until ({timeZoneLabel(context.timeZone)})</label><input id="communication-expiration" type={expiration.endsWith('Z')?'text':'datetime-local'} value={expiration} aria-invalid={errorField==='expiration'||undefined} aria-describedby={errorField==='expiration'?'communication-expiration-error':undefined} onChange={e=>{changed();setExpiration(e.target.value);}}/>{errorField==='expiration'&&error?<p className="wb-error" id="communication-expiration-error"><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></p>:null}</div>:null}
   </div>
   </>:<>
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
   </>}
  </fieldset>
  <div ref={feedbackRef} tabIndex={-1} className="wb-form" aria-label="Update review feedback">
   <p id="communication-form-error" className={errorField?'nv-sr':'wb-error'} role={error?'alert':undefined}>{error?errorField?error:<><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></>:null}</p>
   {action.notice==='conflict'||staleEdit?<div className="wb-notice" data-tone="review" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><strong>Review the latest information</strong><p>{staleEdit?'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.':'This update or its audience changed. Review the latest context and preview again.'}</p>{editing?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/'+editing.id}>Review latest</Link></div>:null}</div></div>:action.notice==='unavailable'?<div className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><p>We could not confirm the result. Check status before trying again.</p></div></div>:null}
   {signature?sigReview:preview&&action.notice!=='conflict'&&!staleEdit?<section className="nv-card compose-reviewed" aria-label="Audience preview"><div className="nv-card__head"><h2 className="nv-card__title" ref={previewHeadingRef} tabIndex={-1}>Audience preview</h2></div><div className="wb-body"><div className="wb-receipt"><Tile tone={preview.count===0?'review':'done'}><UsersThreeIcon size={22}/></Tile><div><p className="wb-strong">{preview.count} eligible {preview.count===1?'recipient':'recipients'}</p><p className="wb-note">At {location}.</p>{scopeKind==='SHIFT'?<p className="wb-note">{context.shifts.filter(s=>s.id===shiftId&&s.locationId===locationId).map(s=><span key={s.id}>{keepWhole(`${s.assigneeLabel}${s.positionLabel?` · ${s.positionLabel}`:''} · ${formatDisplayDate(s.date)} · ${formatTimeRange(s.startTime,s.endTime)}`)}</span>)}</p>:null}</div></div><p className="wb-note">{preview.count===0?'No eligible recipients in this audience. You can change the delivery settings before publishing.':'Check your message and delivery settings, then publish.'}</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><PendingLabel pending={action.pending} pendingText="Publishing…">{editing?'Publish new version':'Publish update'}</PendingLabel><PaperPlaneTiltIcon size={20} aria-hidden="true"/></button></div><p className="wb-help">Eligibility is checked again when you publish. Changing any field requires a new preview.</p></div></section>:<section className="nv-card q-compose-next" aria-label="Review before publishing"><div className="nv-card__head"><h2 className="nv-card__title">Review before publishing</h2></div><div className="wb-body"><p className="wb-note">Check the eligible audience before your update goes live.</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" disabled={disabled||previewing} aria-busy={previewing||undefined} type="submit">{previewing?'Checking audience…':'Preview audience'}<ArrowRightIcon size={20} aria-hidden="true"/></button></div></div></section>}
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
 if(mode==='employee'&&!updateId)return <div ref={pageRef} className="nv-page wb-page wb-narrow wb-compose" data-nv-page="">
  <SigPage className={cc.ccRoot} band={<SigBand eyebrow="Team updates · new"><h1 className="sg-head2">Message<br/>today’s team</h1><p className="sg-sub"><span>Write it once. Everyone working today sees it.</span></p><Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} aria-hidden="true"/>Updates</Link></SigBand>}>{content}</SigPage>
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
