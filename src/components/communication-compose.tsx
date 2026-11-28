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
import {localDateTimeToInstant} from '../lib/business-time';
import {validateCommunicationDraft} from '../lib/communications/validation';
import {communicationRequest,useCommunicationAction,useCommunicationResource,type CommunicationMode} from '../lib/communications/client';
import type {CommunicationContext,CommunicationDraft,CommunicationRead} from '../lib/communications/types';
import {usePortalLang} from '../lib/i18n/portal-lang';
import {communicationCopy} from './communication-copy';
type Context=Extract<CommunicationContext,{state:'ready'}>;
type ComposeValues={type:CommunicationDraft['type'];scopeKind:CommunicationDraft['scope']['kind'];locationId:string;shiftId:string;title:string;body:string;ack:CommunicationDraft['acknowledgement'];expiration:string;useExpiry:boolean};
/** An expiry at or before now (outside the component: the clock is read only when Next or Publish is pressed). */
const isPast=(at:string)=>Date.parse(at)<=Date.now();
type ComposeRetention={values:ComposeValues;revisionId:string|null};
export function ComposeForm({context,initial,editing,mode,authority,retained,retain,action,onStep,backRef}:{/** Final polish (Nov 21, 2026): the page's band asks the form to go back from Review to Write (its Back on phones). */backRef?:MutableRefObject<(()=>void)|null>;/** Final polish (Nov 20, 2026): tells the page which of the two steps is showing (1 write, 2 review), for its step line. */onStep?:(step:1|2)=>void;context:Context;initial?:CommunicationDraft;editing?:Extract<CommunicationRead,{state:'ready'}>;mode:CommunicationMode;authority:string;retained:MutableRefObject<ComposeRetention|null>;retain:(values:ComposeValues,revisionId:string|null)=>void;action:ReturnType<typeof useCommunicationAction>}){
 // G98 (Phase 2): the signed-in person's language (PortalLangProvider in the app layout); every word below is from the table.
 const lang=usePortalLang(),t=communicationCopy(lang),formatDisplayDate=t.date,formatTimeRange=t.timeRange,timeZoneLabel=t.zone;
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
  }else if((action.notice==='conflict'||error===t.audienceDenied||error===t.audienceRetry)&&feedbackRef.current)revealFeedback(feedbackRef.current);
 },[error,action.notice,action.hasUnknown,t.audienceDenied,t.audienceRetry]);
 useEffect(()=>{if(preview&&previewHeadingRef.current)revealFeedback(previewHeadingRef.current);},[preview]);
 useEffect(()=>()=>{previewGeneration.current++;},[]);
 const reviewing=!!preview&&action.notice!=='conflict'&&!staleEdit;
 useEffect(()=>{onStep?.(reviewing?2:1);},[reviewing,onStep]);
 const titleCount=[...title.trim()].length,bodyCount=[...body.trim()].length;
 function changed(){previewGeneration.current++;setPreview(null);setPreviewing(false);setError(null);setErrorField(null);action.setNotice(null);}
 function draft():CommunicationDraft|null{
  const selected=context.shifts.find(s=>s.id===shiftId&&s.locationId===locationId);
  const scope=scopeKind==='LOCATION'?{kind:'LOCATION' as const,locationId}:scopeKind==='TODAYS_TEAM'?{kind:'TODAYS_TEAM' as const,locationId,businessDate:context.businessDate}:selected?{kind:'SHIFT' as const,locationId,sourceShiftId:selected.id,assignmentEpisodeId:selected.assignmentEpisodeId,termsFingerprint:selected.termsFingerprint}:initial?.scope.kind==='SHIFT'&&initial.scope.sourceShiftId===shiftId?initial.scope:null;
  if(!scope){setError(t.chooseShift);return null;}
  let expiresAt:string|null=null;try{if(useExpiry)expiresAt=expiration.endsWith('Z')?expiration:localDateTimeToInstant(expiration,context.timeZone);}catch{setError(t.validDateTime(timeZoneLabel(context.timeZone)));setErrorField('expiration');document.getElementById('communication-expiration')?.focus();return null;}
  if(expiresAt&&isPast(expiresAt)){setError(t.laterThanNow);setErrorField('expiration');document.getElementById('communication-expiration')?.focus();return null;}
  const parsed=validateCommunicationDraft({type,scope,title,body,acknowledgement:type==='TODAYS_TEAM'?'OPTIONAL':ack,expiresAt});
  if(!parsed.ok){const field=titleCount<1||titleCount>120?'title':bodyCount<1||bodyCount>2000?'body':null;setErrorField(field);setError(field==='title'?(titleCount<1?t.enterTitle:t.titleTooLong):field==='body'?(bodyCount<1?t.enterMessage:t.messageTooLong):t.plainTextScope);document.getElementById(titleCount<1||titleCount>120?'communication-title':'communication-body')?.focus();return null;}
  return parsed.value;
 }
 async function review(){if(staleEdit)return;const value=draft();if(!value)return;retain(values,reviewedRevisionId);const sequence=++previewGeneration.current;setError(null);setErrorField(null);setPreviewing(true);try{const result=await communicationRequest(mode,authority,'/preview',value) as {state:string;count:number;fingerprint:string};if(sequence!==previewGeneration.current)return;if(result.state==='ready'){action.setNotice(null);setError(null);setPreview({count:result.count,fingerprint:result.fingerprint});}else setError(t.audienceDenied);}catch{if(sequence===previewGeneration.current)setError(t.audienceRetry);}finally{if(sequence===previewGeneration.current)setPreviewing(false);}}
 function publish(){if(staleEdit)return;const value=draft();if(!value||!preview)return;retain(values,reviewedRevisionId);void action.send({kind:editing?'REVISE':'PUBLISH',operationId:crypto.randomUUID(),authority,draft:value,audienceFingerprint:preview.fingerprint,...(editing?{communicationId:editing.id,expectedRevisionId:reviewedRevisionId}:{})});}
 const disabled=action.pending||action.notice==='unknown'||staleEdit;
 // Final polish (Nov 21, 2026): step 2 is a review (read text, not fields). Edit and Back return to step 1 exactly as
 // changing a field always has (the preview is dropped, so Next checks the audience again); focus goes to Title.
 const returning=useRef(false);
 function backToWrite(){if(disabled)return;returning.current=true;changed();}
 useEffect(()=>{if(!backRef)return;backRef.current=backToWrite;return()=>{backRef.current=null;};});
 useEffect(()=>{if(!reviewing&&returning.current){returning.current=false;document.getElementById('communication-title')?.focus();}},[reviewing]);
 const typeLabel=type==='TODAYS_TEAM'?t.todaysTeam:type==='SHIFT_NOTE'?t.shiftNote:type==='OPERATIONAL_UPDATE'?t.importantUpdate:t.announcement;
 const location=context.locations.find(l=>l.id===locationId)?.label;
 if(action.notice==='signed-out'&&mode==='manager')return <BCard><BState kind="locked" alert title={t.sessionEnded} line={t.signInToContinue} action={{label:t.signIn,href:'/login'}}/></BCard>;
 if(action.notice==='blocked'&&mode==='manager')return <BCard><BState kind="locked" alert title={t.publicationUnavailable} line={t.noPermission} action={{label:t.signInAgain,href:'/login'}} quiet={<Link className="b-btn b-btn--quiet" href="/app/updates">{t.returnToUpdates}</Link>}/></BCard>;
 if(action.notice==='signed-out')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24} weight="bold"/><div><h2 className="wb-notice__title">{t.sessionEnded}</h2><p>{t.signInToContinue}</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">{t.signIn}</Link></div></div></section>;
 if(action.notice==='blocked')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24} weight="bold"/><div><h2 className="wb-notice__title">{t.publicationUnavailable}</h2><p>{t.noPermission}</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">{t.signInAgain}</Link><Link className="nv-btn" data-kind="secondary" href="/app/updates">{t.returnToUpdates}</Link></div></div></section>;
 // Phase 4 (Signature, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-4/p4b-board-a.png):
 // employees (Leads) message today's team; the message is set like a page and the review shows the count and the update
 // as people will see it. Managers keep the shared form. Same fields, validation, preview and publish.
 const signature=mode==='employee'&&!context.management;
 const day=keepWhole(formatDisplayDate(context.businessDate));
 const sigReview=preview&&action.notice!=='conflict'&&!staleEdit?<section className={`compose-reviewed ${cc.ccReview}`} aria-label={t.audiencePreview}>
   <div className={cc.ccCount}><b aria-hidden="true">{preview.count}</b><span><h2 ref={previewHeadingRef} tabIndex={-1}><span className="nv-sr">{t.audiencePreviewSr(preview.count)}</span>{t.peopleAt(preview.count,location??'')}</h2><small>{t.everyoneToday(day)}</small></span></div>
   {preview.count===0?<p className={cc.ccEmpty}>{t.noEligible}</p>:null}
   <SigHead title={t.onTheirPhone}/>
   <div className={cc.ccLock} aria-hidden="true"><div className={cc.ccLockTime}><b>9:41</b><span>{day}</span></div>
    <div className={cc.ccAlert}><span className={cc.ccApp}>N</span><span className={cc.ccAlertCopy}><b>NEVORA · {location}</b><span><b>{title.trim()||t.yourTitle}</b> {body.trim()||t.yourMessage}</span></span><small>{t.now}</small></div></div>
   <SigHead title={t.inTheApp}/>
   <div className={`sg-card ${cc.ccPreview}`} aria-hidden="true"><div className="sg-card-head"><span className="sg-tile"><UsersThreeIcon size={22} weight="bold"/></span><span className={cc.ccHeadCopy}><b>{t.todaysTeam}</b><small>{day}</small></span></div>
    <div className={cc.ccPreviewBody}><b>{title.trim()||t.yourTitle}</b><span>{body.trim()||t.yourMessage}</span></div></div>
   <button className="sg-cta" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><PaperPlaneTiltIcon size={20} weight="bold" aria-hidden="true"/><PendingLabel pending={action.pending} pendingText={t.publishing}>{t.publishUpdate}</PendingLabel></button>
   <p className="sg-after">{t.checkedAgain}</p>
  </section>
  :<div className={cc.ccSubmit}><button className="sg-cta" disabled={(disabled&&!previewing)||undefined} aria-disabled={previewing||undefined} aria-busy={previewing||undefined} onClick={event=>{if(previewing)event.preventDefault();}} type="submit"><PendingLabel pending={previewing} pendingText={t.checkingAudience}>{t.previewAudience}</PendingLabel></button><p className="sg-after">{t.nothingPublished}</p></div>;
 return <form ref={formRef} id="compose-form" className="wb-form" lang={lang==='es'?'es':undefined} onSubmit={e=>{e.preventDefault();void review();}}>
  {/* Leaving New update or Edit update with a title or message that is not published asks first (Nov 21, 2026; Owner,
    Manager and a Lead's message to today's team). Next, Edit and Back are steps of this form and never ask; a publish leaves by the router. */}
  <DiscardGuard dirty={!action.pending&&(title!==(initial?.title??'')||body!==(initial?.body??''))}/>
  <fieldset disabled={disabled} className="wb-form"><legend className="nv-sr">{editing?t.editUpdate:context.management?t.newUpdate:t.messageTodaysTeam}</legend>
   {signature?<>
   <SigHead id="compose-message-heading" title={t.message}/>
   <section className={cc.ccPaper} aria-labelledby="compose-message-heading">
    <div className={cc.ccTag}><span><UsersThreeIcon size={15} weight="bold" aria-hidden="true"/>{t.todaysTeam}</span><span id="communication-title-count" data-over={titleCount>120||undefined}><span className="nv-sr">{t.titleSr}</span>{titleCount}/120</span></div>
    <label htmlFor="communication-title" className="nv-sr">{t.title}</label>
    <input id="communication-title" className={cc.ccTitle} placeholder={t.title} value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
    {errorField==='title'&&error?<p className="wb-error" id="communication-title-error"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></p>:null}
    <label htmlFor="communication-body" className="nv-sr">{t.message}</label>
    <textarea id="communication-body" className={cc.ccBody} placeholder={t.whatToKnow} rows={5} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
    {errorField==='body'&&error?<p className="wb-error" id="communication-body-error"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></p>:null}
    <p className={cc.ccFoot}><span id="compose-body-hint">{t.plainTextKept}</span><span id="communication-body-count" data-over={bodyCount>2000||undefined}>{bodyCount} / 2000</span></p>
   </section>
   <SigHead id="compose-delivery-heading" title={t.whoGetsIt}/>
   <fieldset id="communication-location" className={`sg-card ${cc.ccWho}`} aria-labelledby="compose-delivery-heading" aria-describedby="compose-team-hint">
    {context.locations.map(l=><label key={l.id} className="sg-r" data-selected={locationId===l.id||undefined}>
     <span className="sg-tile" aria-hidden="true"><UsersThreeIcon size={22} weight="bold"/></span>
     <span className="sg-copy"><b>{t.todaysTeamAt(l.label)}</b><span>{t.peopleWorking(day)}</span></span>
     <input type="radio" name="communication-location" value={l.id} checked={locationId===l.id} onChange={()=>{changed();setLocationId(l.id);setShiftId('');}}/><span className={cc.ccRadio} aria-hidden="true"/>
    </label>)}
   </fieldset>
   <p className="sg-after" id="compose-team-hint">{t.basedOnAssignments}</p>
   <div className={`sg-card ${cc.ccExpiry}`}>
    <label className={cc.ccCheck}><input type="checkbox" checked={useExpiry} aria-describedby={useExpiry?undefined:'compose-expiry-hint'} onChange={e=>{changed();setUseExpiry(e.target.checked);}}/><span><b>{t.setExpiration}</b>{useExpiry?null:<small id="compose-expiry-hint">{t.staysAvailable}</small>}</span></label>
    {useExpiry?<div className={cc.ccWhen}><label htmlFor="communication-expiration">{t.availableUntilZone(timeZoneLabel(context.timeZone))}</label><input id="communication-expiration" type={expiration.endsWith('Z')?'text':'datetime-local'} value={expiration} aria-invalid={errorField==='expiration'||undefined} aria-describedby={errorField==='expiration'?'communication-expiration-error':undefined} onChange={e=>{changed();setExpiration(e.target.value);}}/>{errorField==='expiration'&&error?<p className="wb-error" id="communication-expiration-error"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></p>:null}</div>:null}
   </div>
   </>:<>
   {/* Phase 2 (package Messages, Nov 23, 2026): Owners and Managers, Direction B. Step 1 is two kit cards: the message
       (Title, Message) and its delivery (Send to, Shift, Ask them to confirm, Expires, Type, Who receives it) as outlined
       fields, ending with Cancel and Next. Same fields, ids, validation and preview as before. */}
   {reviewing?null:<>
   <section className="b-card mb-form" aria-labelledby="compose-message-h">
    <h2 className="b-sr" id="compose-message-h">{t.message}</h2>
    <div className="mb-field">
     <div className="mb-field__row"><label htmlFor="communication-title">{t.title}</label>{titleCount>100?<span id="communication-title-count" className="mb-field__count" data-over={titleCount>120||undefined}>{titleCount}/120</span>:<span id="communication-title-count" className="b-sr">{t.charactersOf(titleCount,'120')}</span>}</div>
     <input id="communication-title" className="mb-in" placeholder={t.titleExample} autoComplete="off" autoCapitalize="sentences" enterKeyHint="next" value={title} onChange={e=>{changed();setTitle(e.target.value);}}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();document.getElementById('communication-body')?.focus();}}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
     {errorField==='title'&&error?<p className="mb-field__error" id="communication-title-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true"/>{error}</p>:null}
    </div>
    <div className="mb-field">
     <div className="mb-field__row"><label htmlFor="communication-body">{t.message}</label>{bodyCount>1800?<span id="communication-body-count" className="mb-field__count" data-over={bodyCount>2000||undefined}>{bodyCount}/2000</span>:<span id="communication-body-count" className="b-sr">{t.charactersOf(bodyCount,'2000')}</span>}</div>
     <textarea id="communication-body" className="mb-in mb-in--area" placeholder={t.whatToKnow} rows={5} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
     <span className="b-sr" id="compose-body-hint">{t.plainTextSr}</span>
     {errorField==='body'&&error?<p className="mb-field__error" id="communication-body-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true"/>{error}</p>:null}
    </div>
   </section>
   {editing?<p className="b-note mb-note">{t.newVersionNote}</p>:<p className="b-sr">{t.nothingPublished}</p>}
   <section className="b-card mb-form" aria-labelledby="compose-delivery-h">
    <h2 className="b-sr" id="compose-delivery-h">{t.delivery}</h2>
    {context.management?<div className="mb-field"><label htmlFor="communication-type">{t.type}</label><span className="mb-select"><select id="communication-type" className="mb-in" value={type} onChange={e=>{const t=e.target.value as CommunicationDraft['type'];changed();setType(t);setScopeKind(t==='TODAYS_TEAM'?'TODAYS_TEAM':t==='SHIFT_NOTE'?'SHIFT':'LOCATION');}}><option value="LOCATION_ANNOUNCEMENT">{t.announcement}</option><option value="SHIFT_NOTE">{t.shiftNote}</option><option value="OPERATIONAL_UPDATE">{t.importantUpdate}</option><option value="TODAYS_TEAM">{t.todaysTeam}</option></select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span></div>:null}
    {type==='OPERATIONAL_UPDATE'?<div className="mb-field"><label htmlFor="communication-scope">{t.whoReceives}</label><span className="mb-select"><select id="communication-scope" className="mb-in" value={scopeKind} onChange={e=>{changed();setScopeKind(e.target.value as typeof scopeKind);}}><option value="LOCATION">{t.everyoneAtLocation}</option><option value="TODAYS_TEAM">{t.todaysTeam}</option><option value="SHIFT">{t.onePublishedShift}</option></select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span></div>:null}
    <div className="mb-field"><label htmlFor="communication-location">{t.sendTo}</label>
     <span className="mb-select"><select id="communication-location" className="mb-in" value={locationId} aria-describedby={scopeKind==='TODAYS_TEAM'?'compose-team-hint':undefined} onChange={e=>{changed();setLocationId(e.target.value);setShiftId('');}}>{context.locations.map(l=><option key={l.id} value={l.id}>{scopeKind==='TODAYS_TEAM'?t.todaysTeamAt(l.label):l.label}</option>)}</select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span>
     {scopeKind==='TODAYS_TEAM'?<span className="mb-field__help" id="compose-team-hint">{t.teamHint}</span>:null}</div>
    {scopeKind==='SHIFT'?<div className="mb-field"><label htmlFor="communication-shift">{t.shift}</label><span className="mb-select"><select id="communication-shift" className="mb-in" value={shiftId} onChange={e=>{changed();setShiftId(e.target.value);}}><option value="">{t.choosePublishedShift}</option>{context.shifts.filter(s=>s.locationId===locationId).map(s=><option key={s.id} value={s.id}>{formatDisplayDate(s.date)} · {formatTimeRange(s.startTime,s.endTime)} · {s.assigneeLabel}{s.positionLabel?` · ${s.positionLabel}`:''}</option>)}</select><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></span></div>:null}
    {context.management&&type!=='TODAYS_TEAM'?<label className="mb-switch"><span className="mb-switch__tx"><b id="compose-requirement-label">{t.askToConfirm}</b><span id="compose-requirement-hint">{ack==='REQUIRED'?t.eachConfirms:t.canMarkRead}</span></span>
     <input id="communication-requirement" type="checkbox" role="switch" className="mb-tog" checked={ack==='REQUIRED'} aria-labelledby="compose-requirement-label" aria-describedby="compose-requirement-hint" onChange={e=>{changed();setAck(e.target.checked?'REQUIRED':'OPTIONAL');}}/></label>:null}
    <div className="mb-field"><div className="mb-field__row"><label htmlFor="communication-expiration">{t.expires}</label><span className="mb-field__count">{t.optional}</span></div>
     {useExpiry&&expiration.endsWith('Z')?<div className="mb-fixed"><span>{keepWhole(formatDisplayDate(expiration.slice(0,10)))}</span><button type="button" className="b-btn b-btn--quiet" onClick={()=>{changed();setUseExpiry(false);setExpiration('');}}>{t.never}</button></div>
      :<input id="communication-expiration" className="mb-in" type="datetime-local" value={expiration} aria-describedby={errorField==='expiration'?'communication-expiration-error compose-expiry-hint':'compose-expiry-hint'} aria-invalid={errorField==='expiration'||undefined}
       onChange={e=>{changed();setExpiration(e.target.value);setUseExpiry(!!e.target.value);}}/>}
     <span className="mb-field__help" id="compose-expiry-hint">{t.expiryHint(timeZoneLabel(context.timeZone))}</span>
     {errorField==='expiration'&&error?<p className="mb-field__error" id="communication-expiration-error"><WarningCircleIcon size={16} weight="bold" aria-hidden="true"/>{error}</p>:null}</div>
    <div className="mb-acts mb-foot"><Link className="b-btn b-btn--quiet" href={editing?'/app/updates/'+editing.id:'/app/updates'}>{t.cancel}</Link><button type="submit" className="b-btn b-btn--teal" disabled={(disabled&&!previewing)||undefined} aria-disabled={previewing||undefined} aria-busy={previewing||undefined} onClick={event=>{if(previewing)event.preventDefault();}}><BBusyLabel busy={previewing} busyLabel={t.checking}>{t.next}</BBusyLabel></button></div>
   </section>
   </>}
   </>}
  </fieldset>
  <div ref={feedbackRef} tabIndex={-1} className="wb-form" role="group" aria-label={t.reviewFeedback}>
   <p id="communication-form-error" className={errorField?'nv-sr':'wb-error'} role={error?'alert':undefined}>{error?errorField?error:<><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/><span>{error}</span></>:null}</p>
   {!signature&&(action.notice==='conflict'||staleEdit)?<BCard><BState kind="failed" alert title={t.reviewLatestInfo} line={staleEdit?t.newerVersion:t.changedAudience} action={editing?{label:t.reviewLatest,href:'/app/updates/'+editing.id}:undefined}/></BCard>
    :!signature&&action.notice==='unavailable'&&!action.hasUnknown?<BCard><BState kind="failed" alert title={t.couldntConfirmResult} line={t.checkBeforeRetry}/></BCard>
    :action.notice==='conflict'||staleEdit?<div className="wb-notice" data-tone="review" role="alert"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><strong>{t.reviewLatestInfo}</strong><p>{staleEdit?t.newerVersion:t.changedAudience}</p>{editing?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/'+editing.id}>{t.reviewLatest}</Link></div>:null}</div></div>:action.notice==='unavailable'?<div className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><p>{t.couldNotConfirm}</p></div></div>:null}
   {signature?sigReview:preview&&action.notice!=='conflict'&&!staleEdit?<section className="b-card compose-reviewed b-cmp-review" aria-labelledby="compose-review-title">
    <div className="b-cmp-review__msg">
     <div className="b-cmp-review__head"><h2 id="compose-review-title" className="b-cmp-review__t" ref={previewHeadingRef} tabIndex={-1}><span className="q-sr">{t.reviewSr}</span>{title.trim()}</h2>
      <button type="button" className="b-btn b-btn--quiet b-rowact b-rowact--quiet b-cmp-review__edit" aria-label={t.editUpdate} disabled={disabled} onClick={backToWrite}>{t.edit}</button></div>
     <p className="b-cmp-review__body">{body.trim()}</p>
     <p className="b-cmp-review__facts"><BSegs parts={[typeLabel,context.management&&type!=='TODAYS_TEAM'?(ack==='REQUIRED'?t.mustBeConfirmed:t.confirmingOptional):null,useExpiry&&expiration?t.expiresOn(formatDisplayDate(expiration.slice(0,10))):t.neverExpires]}/></p>
    </div>
    <ul className="b-list b-cmp-review__who" aria-label={t.whoGetsIt}>
     <BRow lead={<BIcon tone={preview.count===0?'amber':'teal'}><UsersThreeIcon weight="bold"/></BIcon>} title={t.goesTo(preview.count)} sub={t.at(`${location}`)}
      extra={scopeKind==='SHIFT'?context.shifts.filter(s=>s.id===shiftId&&s.locationId===locationId).map(s=><span key={s.id} className="b-row__s">{keepWhole(`${s.assigneeLabel}${s.positionLabel?` · ${s.positionLabel}`:''} · ${formatDisplayDate(s.date)} · ${formatTimeRange(s.startTime,s.endTime)}`)}</span>):undefined}/>
    </ul>
    <p className="b-note b-cmp-review__note">{preview.count===0?t.noOneYet:null}{t.listChecked}</p>
    <div className="b-cmp-review__foot">
     <button type="button" className="b-btn b-btn--ghost b-cmp-review__back" disabled={disabled} onClick={backToWrite}>{t.back}</button>
     <button className="b-btn b-btn--teal b-cmp-review__go" type="button" disabled={!action.pending&&(action.notice==='unknown'||staleEdit)} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}><BBusyLabel busy={action.pending} busyLabel={t.publishing}>{editing?t.publishNewVersion:t.publishUpdate}</BBusyLabel></button>
    </div>
   </section>:!signature?null:<section className="nv-card q-compose-next" aria-label={t.reviewBeforePublishing}><div className="nv-card__head"><h2 className="nv-card__title">{t.reviewBeforePublishing}</h2></div><div className="wb-body"><p className="wb-note">{t.checkEligible}</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" disabled={disabled||previewing} aria-busy={previewing||undefined} type="submit">{previewing?t.checkingAudience:t.previewAudience}<ArrowRightIcon size={20} weight="bold" aria-hidden="true"/></button></div></div></section>}
   {previewing||action.pending?<p className="nv-sr" role="status">{previewing?t.checkingAudience:t.confirmingPublication}</p>:null}
   {!signature&&(action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown)?<div ref={recoveryRef} tabIndex={-1} className="b-card"><BState kind="paused" title={t.needsStatusCheck} line={t.couldntConfirmCheck}
     action={{label:t.checkStatus,onClick:()=>void action.lookup(),busy:action.pending}} quiet={action.canRetry?<button className="b-btn b-btn--quiet" type="button" disabled={action.pending} onClick={()=>void action.retry()}>{t.retryOriginal}</button>:undefined}/></div>
    :action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div ref={recoveryRef} tabIndex={-1} className="wb-notice" data-tone="review" role="status"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><strong>{t.needsStatusCheck}</strong><p>{t.couldntConfirmCheck}</p><div className="wb-actions"><button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>{t.checkStatus}</button>{action.canRetry?<button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.retry()}>{t.retryOriginal}</button>:null}</div></div></div>:null}
  </div>
 </form>;
}
function BoundCommunicationCompose({authority,mode,updateId}:{authority:string;mode:CommunicationMode;updateId?:string}){
 const router=useRouter(),retained=useRef<ComposeRetention|null>(null);
 const lang=usePortalLang(),t=communicationCopy(lang),pageLang=lang==='es'?'es':undefined;
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
 const content=<div className="nv-content">{context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action} onStep={setStep} backRef={backRef}/>:<section className="nv-card" role="status" aria-busy={resource.state.refreshing}><div className="wb-body"><div className="wb-receipt"><Tile tone="neutral">{resource.state.refreshing?<ClockIcon size={22} weight="bold"/>:<UsersThreeIcon size={22} weight="bold"/>}</Tile><div><h2 className="wb-strong">{offline?t.offline:signedOut?t.sessionEnded:resource.state.paused?t.paused:resource.state.refreshing?t.loadingForm:t.couldntLoadForm}</h2><p className="wb-note">{offline?t.connect:signedOut?t.keepWritingSignIn:resource.state.paused?t.keepWritingReturn:resource.state.refreshing?t.gettingLocations:t.checkConnection}</p></div></div><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={resource.state.paused||resource.state.refreshing} onClick={resource.refresh}>{t.tryAgain}</button>{signedOut?<Link className="nv-btn" data-kind="secondary" href="/login">{t.signInAgain}</Link>:null}</div></div></section>}</div>;
 if(mode==='employee'&&!updateId)return <div ref={pageRef} className="nv-page wb-page wb-narrow wb-compose" data-nv-page="" lang={pageLang}>
  <SigPage className={cc.ccRoot} band={<SigBand eyebrow={t.teamUpdatesNew}><h1 className="sg-head2">{t.messageLine1}<br/>{t.messageLine2}</h1><p className="sg-sub"><span>{t.writeOnce}</span></p><Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} weight="bold" aria-hidden="true"/>{t.updates}</Link></SigBand>}>{content}</SigPage>
 </div>;
 // Phase 2 (package Messages, Nov 23, 2026): Owners and Managers, Direction B. The band (the hero on a phone) says New
 // update or Edit update with its step ("Step 1 of 2 · Write"); its way back is Cancel. The form's own cards carry Cancel
 // and Next (step 1) and Back and Publish (step 2) at every width. Until the form is here, the kit's one state card.
 const stateKind=offline?'offline':signedOut?'locked':resource.state.paused?'paused':resource.state.refreshing?'loading':'failed';
 return <div ref={pageRef} className="mb-root wb-compose" lang={pageLang}>
  <ManagerMessagesPage className="mb-compose" titleId="compose-title" title={updateId?t.editUpdate:t.newUpdate} sub={context?t.step(step):undefined}
   back={{href:updateId?'/app/updates/'+updateId:'/app/updates',label:t.cancel,close:true}}
   cards={context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action} onStep={setStep} backRef={backRef}/>
    :<BCard><BState kind={stateKind}
     title={offline?t.offline:signedOut?t.sessionEnded:resource.state.paused?t.paused:resource.state.refreshing?t.loadingForm:t.couldntLoadForm}
     line={offline?t.connect:signedOut?t.keepWritingSignIn:resource.state.paused?t.keepWritingReturn:resource.state.refreshing?t.gettingLocations:t.checkConnection}
     action={signedOut?{label:t.signInAgain,href:'/login'}:resource.state.paused||resource.state.refreshing?undefined:{label:t.tryAgain,onClick:resource.refresh}}/></BCard>}/>
 </div>;
}

export function CommunicationCompose(props:{authority:string;mode:CommunicationMode;updateId?:string}){
 return <BoundCommunicationCompose key={props.mode+':'+props.authority+':'+(props.updateId??'new')} {...props}/>;
}
