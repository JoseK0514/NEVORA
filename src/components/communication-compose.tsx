'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {useRouter} from 'next/navigation';
import {useGSAP} from '@gsap/react';
import gsap from 'gsap';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {PaperPlaneTiltIcon} from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {PageBand,Tile} from './kit/kit';
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
 const feedbackRef=useRef<HTMLDivElement>(null);
 const previewHeadingRef=useRef<HTMLHeadingElement>(null);
 useGSAP(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   if(preview)gsap.from('.compose-reviewed',{y:6,opacity:0,duration:.24,ease:'power2.out'});
  });
  return ()=>media.revert();
 },{scope:formRef,dependencies:[preview],revertOnUpdate:true});
 // IS-B21: a ready preview takes focus on its own heading (with the kit ring); notices and audience errors on the feedback block.
 useEffect(()=>{if(preview)previewHeadingRef.current?.focus();else if(action.notice||error?.startsWith('Audience'))feedbackRef.current?.focus();},[preview,error,action.notice]);
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
 if(action.notice==='blocked')return <section className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon aria-hidden="true" size={24}/><div><h2 className="wb-notice__title">Publication unavailable</h2><p>Your current permission does not allow publication.</p><div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link><Link className="nv-btn" data-kind="secondary" href="/app/updates">Return to updates</Link></div></div></section>;
 return <form ref={formRef} className="wb-form" onSubmit={e=>{e.preventDefault();void review();}}>
  <fieldset disabled={disabled} className="wb-form"><legend className="nv-sr">{editing?'Edit update':context.management?'Create update':'Message today’s team'}</legend>
   <section className="nv-card" aria-labelledby="compose-message-heading">
    <div className="nv-card__head"><h2 className="nv-card__title" id="compose-message-heading">Your message</h2></div>
    <div className="wb-body">
     <div className="wb-field">
      <div className="wb-label-row"><label htmlFor="communication-title">Title</label><span id="communication-title-count" className="wb-counter" data-over={titleCount>120||undefined}>{titleCount}/120</span></div>
      <input id="communication-title" className="wb-control" placeholder="Add a short, clear title" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby={errorField==='title'?'communication-title-error communication-title-count':'communication-title-count'} aria-invalid={titleCount>120||errorField==='title'}/>
      {errorField==='title'&&error?<p className="wb-error" id="communication-title-error"><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></p>:null}
     </div>
     <div className="wb-field">
      <div className="wb-label-row"><label htmlFor="communication-body">Message</label><span id="communication-body-count" className="wb-counter" data-over={bodyCount>2000||undefined}>{bodyCount}/2000</span></div>
      <textarea id="communication-body" className="wb-control" placeholder="What does your team need to know?" rows={8} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby={errorField==='body'?'communication-body-error communication-body-count compose-body-hint':'communication-body-count compose-body-hint'} aria-invalid={bodyCount>2000||errorField==='body'}/>
      {errorField==='body'&&error?<p className="wb-error" id="communication-body-error"><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></p>:null}
      <p className="wb-help" id="compose-body-hint">Plain text. Line breaks are kept.</p>
     </div>
     {editing?<p className="wb-box wb-note wb-inline-icon"><CheckCircleIcon size={18} aria-hidden="true"/><span>Publishing creates a new version. Previous acknowledgements stay with the version they reviewed.</span></p>:<p className="wb-box wb-note">Nothing is published until you review the audience and choose Publish.</p>}
    </div>
   </section>
   <section className="nv-card" aria-labelledby="compose-delivery-heading">
    <div className="nv-card__head"><h2 className="nv-card__title" id="compose-delivery-heading">Delivery</h2><span className="nv-card__meta">Who needs this update</span></div>
    <div className="wb-body">
     {context.management?<div className="wb-field"><label htmlFor="communication-type">Update type</label><select id="communication-type" className="wb-control" value={type} onChange={e=>{const t=e.target.value as CommunicationDraft['type'];changed();setType(t);setScopeKind(t==='TODAYS_TEAM'?'TODAYS_TEAM':t==='SHIFT_NOTE'?'SHIFT':'LOCATION');}}><option value="LOCATION_ANNOUNCEMENT">Announcement</option><option value="SHIFT_NOTE">Shift note</option><option value="OPERATIONAL_UPDATE">Important update</option><option value="TODAYS_TEAM">Today’s team</option></select></div>:<div className="wb-box wb-inline-icon"><UsersThreeIcon size={20} aria-hidden="true"/><span className="wb-summary-text"><strong className="wb-strong">Today’s team</strong><span className="wb-note">{keepWhole(formatDisplayDate(context.businessDate))}</span></span></div>}
     {type==='OPERATIONAL_UPDATE'?<div className="wb-field"><label htmlFor="communication-scope">Who receives it</label><select id="communication-scope" className="wb-control" value={scopeKind} onChange={e=>{changed();setScopeKind(e.target.value as typeof scopeKind);}}><option value="LOCATION">Location</option><option value="TODAYS_TEAM">Today’s team</option><option value="SHIFT">Published shift</option></select></div>:null}
     <div className="wb-field"><label htmlFor="communication-location">Work location</label><select id="communication-location" className="wb-control" value={locationId} aria-describedby={scopeKind==='TODAYS_TEAM'?'compose-team-hint':undefined} onChange={e=>{changed();setLocationId(e.target.value);setShiftId('');}}>{context.locations.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select>{scopeKind==='TODAYS_TEAM'?<p className="wb-help" id="compose-team-hint">Today’s team at {location}, based on current published assignments, including overnight shifts.</p>:null}</div>
     {scopeKind==='SHIFT'?<div className="wb-field"><label htmlFor="communication-shift">Published shift</label><select id="communication-shift" className="wb-control" value={shiftId} onChange={e=>{changed();setShiftId(e.target.value);}}><option value="">Choose a shift</option>{context.shifts.filter(s=>s.locationId===locationId).map(s=><option key={s.id} value={s.id}>{formatDisplayDate(s.date)} · {formatTimeRange(s.startTime,s.endTime)} · {s.assigneeLabel}{s.positionLabel?` · ${s.positionLabel}`:''}</option>)}</select></div>:null}
     {context.management&&type!=='TODAYS_TEAM'?<div className="wb-field"><label htmlFor="communication-requirement">Review requirement</label><select id="communication-requirement" className="wb-control" aria-describedby="compose-requirement-hint" value={ack} onChange={e=>{changed();setAck(e.target.value as CommunicationDraft['acknowledgement']);}}><option value="OPTIONAL">Optional update</option><option value="REQUIRED">Require acknowledgement of this version</option><option value="NONE">Informational only</option></select><p id="compose-requirement-hint" className="wb-help">{ack==='REQUIRED'?'Recipients must acknowledge this exact version.':ack==='NONE'?'Recipients can read the update without a review action.':'Recipients can mark the update as read.'}</p></div>:null}
     <hr className="wb-divider"/>
     <div className="wb-field">
      <label className="wb-check"><input type="checkbox" checked={useExpiry} aria-describedby={useExpiry?undefined:'compose-expiry-hint'} onChange={e=>{changed();setUseExpiry(e.target.checked);}}/><span>Set an expiration</span></label>
      {useExpiry?<div className="wb-field"><label htmlFor="communication-expiration">Available until ({timeZoneLabel(context.timeZone)})</label><input id="communication-expiration" className="wb-control" type={expiration.endsWith('Z')?'text':'datetime-local'} value={expiration} aria-invalid={errorField==='expiration'||undefined} aria-describedby={errorField==='expiration'?'communication-expiration-error':undefined} onChange={e=>{changed();setExpiration(e.target.value);}}/>{errorField==='expiration'&&error?<p className="wb-error" id="communication-expiration-error"><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></p>:null}</div>:<p className="wb-help" id="compose-expiry-hint">The update stays available until it is withdrawn.</p>}
     </div>
    </div>
   </section>
  </fieldset>
  <div ref={feedbackRef} tabIndex={-1} className="wb-form" aria-label="Update review feedback">
   <p id="communication-form-error" className={errorField?'nv-sr':'wb-error'} role={error?'alert':undefined}>{error?errorField?error:<><WarningCircleIcon size={18} aria-hidden="true"/><span>{error}</span></>:null}</p>
   {action.notice==='conflict'||staleEdit?<div className="wb-notice" data-tone="review" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><strong>Review the latest information</strong><p>{staleEdit?'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.':'This update or its audience changed. Review the latest context and preview again.'}</p>{editing?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/'+editing.id}>Review latest</Link></div>:null}</div></div>:action.notice==='unavailable'?<div className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><p>We could not confirm the result. Check status before trying again.</p></div></div>:null}
   {preview&&action.notice!=='conflict'&&!staleEdit?<section className="nv-card compose-reviewed" aria-label="Audience preview"><div className="nv-card__head"><h2 className="nv-card__title" ref={previewHeadingRef} tabIndex={-1}>Audience preview</h2></div><div className="wb-body"><div className="wb-receipt"><Tile tone={preview.count===0?'review':'done'}><UsersThreeIcon size={22}/></Tile><div><p className="wb-strong">{preview.count} eligible {preview.count===1?'recipient':'recipients'}</p><p className="wb-note">At {location}.</p>{scopeKind==='SHIFT'?<p className="wb-note">{context.shifts.filter(s=>s.id===shiftId&&s.locationId===locationId).map(s=><span key={s.id}>{keepWhole(`${s.assigneeLabel}${s.positionLabel?` · ${s.positionLabel}`:''} · ${formatDisplayDate(s.date)} · ${formatTimeRange(s.startTime,s.endTime)}`)}</span>)}</p>:null}</div></div><p className="wb-note">{preview.count===0?'No eligible recipients in this audience. You can change the delivery settings before publishing.':'Check your message and delivery settings, then publish.'}</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" type="button" disabled={action.notice==='unknown'||staleEdit} aria-disabled={action.pending||undefined} aria-busy={action.pending||undefined} onClick={()=>{if(!action.pending)publish();}}>{action.pending?'Publishing…':editing?'Publish new version':'Publish update'}<PaperPlaneTiltIcon size={20} aria-hidden="true"/></button></div><p className="wb-help">Eligibility is checked again when you publish. Changing any field requires a new preview.</p></div></section>:<section className="nv-card" aria-label="Review before publishing"><div className="nv-card__head"><h2 className="nv-card__title">Review before publishing</h2></div><div className="wb-body"><p className="wb-note">Check the eligible audience before your update goes live.</p><div className="wb-actions"><button className="nv-btn" data-kind="primary" disabled={disabled||previewing} aria-busy={previewing||undefined} type="submit">{previewing?'Checking audience…':'Preview audience'}<ArrowRightIcon size={20} aria-hidden="true"/></button></div></div></section>}
   {previewing||action.pending?<p className="nv-sr" role="status">{previewing?'Checking audience…':'Confirming publication…'}</p>:null}
   {action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div className="wb-notice" data-tone="review" role="status"><WarningCircleIcon size={24} aria-hidden="true"/><div><strong>Publication needs a status check</strong><p>We couldn’t confirm the result. Check status before trying again.</p><div className="wb-actions"><button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>Check status</button>{action.canRetry?<button className="nv-btn" data-kind="secondary" type="button" disabled={action.pending} onClick={()=>void action.retry()}>Retry original publication</button>:null}</div></div></div>:null}
  </div>
 </form>;
}
function BoundCommunicationCompose({authority,mode,updateId}:{authority:string;mode:CommunicationMode;updateId?:string}){
 const router=useRouter(),retained=useRef<ComposeRetention|null>(null);
 const pageRef=useRef<HTMLDivElement>(null);
 useGSAP(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{gsap.from('.nv-content > *',{y:6,opacity:0,duration:.3,ease:'power2.out',clearProps:'transform,opacity'});});
  return ()=>media.revert();
 },{scope:pageRef});
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
 const title=updateId?'Edit update':mode==='manager'?'Create update':'Message today’s team';
 return <div ref={pageRef} className="nv-page wb-page wb-narrow wb-compose" data-nv-page="">
  <PageBand back={{href:'/app/updates',label:'Updates'}} eyebrow={updateId?'New version':'Unpublished'} title={title} summary={updateId?'Revise your message and review the audience before publishing a new version.':'Write your message, choose its audience, then review before publishing.'}/>
  <div className="nv-content">{context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action}/>:<section className="nv-card" role="status" aria-busy={resource.state.refreshing}><div className="wb-body"><div className="wb-receipt"><Tile tone="neutral">{resource.state.refreshing?<ClockIcon size={22}/>:<UsersThreeIcon size={22}/>}</Tile><div><h2 className="wb-strong">{offline?'You’re offline':signedOut?'Your session ended':resource.state.paused?'Paused while you were away':resource.state.refreshing?'Loading the form':'Couldn’t load the form'}</h2><p className="wb-note">{offline?'Connect to the internet, then try again.':signedOut?'Sign in again to keep writing.':resource.state.paused?'Come back to this page to keep writing.':resource.state.refreshing?'Getting your locations and today’s team…':'Check your connection, then try again.'}</p></div></div><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={resource.state.paused||resource.state.refreshing} onClick={resource.refresh}>Try again</button>{signedOut?<Link className="nv-btn" data-kind="secondary" href="/login">Sign in again</Link>:null}</div></div></section>}</div>
 </div>;
}

export function CommunicationCompose(props:{authority:string;mode:CommunicationMode;updateId?:string}){
 return <BoundCommunicationCompose key={props.mode+':'+props.authority+':'+(props.updateId??'new')} {...props}/>;
}
