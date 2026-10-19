'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {useRouter} from 'next/navigation';
import {useGSAP} from '@gsap/react';
import gsap from 'gsap';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {PaperPlaneTiltIcon} from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import {UsersThreeIcon} from '@phosphor-icons/react/dist/ssr/UsersThree';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {SlidersHorizontalIcon} from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import './communication-compose.css';
import {PendingLabel} from './employee-submit-button';
import {revealFeedback} from '@/lib/reveal-feedback';
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
 const [error,setError]=useState<string|null>(null),[preview,setPreview]=useState<{count:number;fingerprint:string}|null>(null),[previewing,setPreviewing]=useState(false);const previewGeneration=useRef(0);
 const formRef=useRef<HTMLFormElement>(null);
 const feedbackRef=useRef<HTMLDivElement>(null),recoveryRef=useRef<HTMLDivElement>(null);
 useGSAP(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   if(preview)gsap.from('.compose-reviewed',{y:6,opacity:0,duration:.24,ease:'power2.out'});
  });
  return ()=>media.revert();
 },{scope:formRef,dependencies:[preview],revertOnUpdate:true});
 useEffect(()=>{
  if((action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown)&&recoveryRef.current){
   revealFeedback(recoveryRef.current);
   const next=recoveryRef.current.querySelector<HTMLButtonElement>('button');
   if(next)revealFeedback(next);
  }else if((action.notice==='conflict'||error?.startsWith('Audience'))&&feedbackRef.current)revealFeedback(feedbackRef.current);
 },[error,action.notice,action.hasUnknown]);
 useEffect(()=>{
  if(!preview)return;
  const heading=feedbackRef.current?.querySelector<HTMLElement>('.communication-audience h2');
  if(heading){heading.tabIndex=-1;revealFeedback(heading);}
 },[preview]);
 useEffect(()=>()=>{previewGeneration.current++;},[]);
 const titleCount=[...title.trim()].length,bodyCount=[...body.trim()].length;
 function changed(){previewGeneration.current++;setPreview(null);setPreviewing(false);setError(null);action.setNotice(null);}
 function draft():CommunicationDraft|null{
  const selected=context.shifts.find(s=>s.id===shiftId&&s.locationId===locationId);
  const scope=scopeKind==='LOCATION'?{kind:'LOCATION' as const,locationId}:scopeKind==='TODAYS_TEAM'?{kind:'TODAYS_TEAM' as const,locationId,businessDate:context.businessDate}:selected?{kind:'SHIFT' as const,locationId,sourceShiftId:selected.id,assignmentEpisodeId:selected.assignmentEpisodeId,termsFingerprint:selected.termsFingerprint}:initial?.scope.kind==='SHIFT'&&initial.scope.sourceShiftId===shiftId?initial.scope:null;
  if(!scope){setError('Choose a current published shift.');return null;}
  let expiresAt:string|null=null;try{if(useExpiry)expiresAt=expiration.endsWith('Z')?expiration:localDateTimeToInstant(expiration,context.timeZone);}catch{setError('Choose a valid expiration in the workspace time zone.');return null;}
  const parsed=validateCommunicationDraft({type,scope,title,body,acknowledgement:type==='TODAYS_TEAM'?'OPTIONAL':ack,expiresAt});
  if(!parsed.ok){setError(titleCount<1||titleCount>120?'Title must contain 1–120 characters.':bodyCount<1||bodyCount>2000?'Message must contain 1–2000 characters.':'Use plain text without unsupported controls and choose a valid context.');document.getElementById(titleCount<1||titleCount>120?'communication-title':'communication-body')?.focus();return null;}
  return parsed.value;
 }
 async function review(){if(staleEdit)return;const value=draft();if(!value)return;retain(values,reviewedRevisionId);const sequence=++previewGeneration.current;setPreviewing(true);try{const result=await communicationRequest(mode,authority,'/preview',value) as {state:string;count:number;fingerprint:string};if(sequence!==previewGeneration.current)return;if(result.state==='ready'){action.setNotice(null);setPreview({count:result.count,fingerprint:result.fingerprint});}else setError('Audience unavailable. Check your current permission and published context.');}catch{if(sequence===previewGeneration.current)setError('Audience unavailable. Retry to check current information.');}finally{if(sequence===previewGeneration.current)setPreviewing(false);}}
 function publish(){if(staleEdit)return;const value=draft();if(!value||!preview)return;retain(values,reviewedRevisionId);void action.send({kind:editing?'REVISE':'PUBLISH',operationId:crypto.randomUUID(),authority,draft:value,audienceFingerprint:preview.fingerprint,...(editing?{communicationId:editing.id,expectedRevisionId:reviewedRevisionId}:{})});}
 const disabled=action.pending||action.notice==='unknown'||staleEdit;
 if(action.notice==='signed-out')return <section className="compose-state" role="alert"><h2>Your session ended</h2><p>Sign in again to continue.</p><Link className="button secondary" href="/login">Sign in</Link></section>;
 if(action.notice==='blocked')return <section className="compose-state" role="alert"><WarningCircleIcon aria-hidden="true" size={24}/><h2>Publication unavailable</h2><p>Your current permission does not allow publication.</p><Link className="button secondary" href="/app/updates">Return to updates</Link></section>;
 return <form ref={formRef} className="communication-compose compose-form" onSubmit={e=>{e.preventDefault();void review();}}>
  <fieldset disabled={disabled} className="compose-grid"><legend className="compose-visually-hidden">{editing?'Edit update':'Create update'}</legend>
   <section className="compose-panel compose-writing" aria-labelledby="compose-message-heading">
    <div className="compose-panel-heading"><div><h2 id="compose-message-heading">Your message</h2><p>Keep your team informed, one clear update at a time.</p></div><span className="compose-icon-tile"><PaperPlaneTiltIcon size={24} weight="regular" aria-hidden="true"/></span></div>
    <div className="compose-field">
     <div className="compose-label-row"><label htmlFor="communication-title">Title</label><span id="communication-title-count" className="communication-counter">{titleCount}/120</span></div>
     <input id="communication-title" placeholder="Give your update a clear title" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby="communication-title-count communication-form-error" aria-invalid={titleCount>120}/>
    </div>
    <div className="compose-field compose-message-field">
     <label htmlFor="communication-body">Message</label>
     <textarea id="communication-body" placeholder="What does your team need to know?" rows={10} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby="communication-body-count communication-form-error" aria-invalid={bodyCount>2000}/>
     <div className="compose-message-meta"><span>Plain text · Line breaks supported</span><span id="communication-body-count" className="communication-counter">{bodyCount}/2000</span></div>
    </div>
    {editing?<p className="compose-edit-note"><CheckCircleIcon size={18} aria-hidden="true"/>Publishing creates a new version. Previous acknowledgements stay with the version they reviewed.</p>:<p className="compose-draft-note">Nothing is published until you review the audience and choose Publish.</p>}
   </section>
   <section className="compose-panel compose-delivery" aria-labelledby="compose-delivery-heading">
    <div className="compose-panel-heading"><div><h2 id="compose-delivery-heading">Delivery</h2><p>Choose who needs this update.</p></div><SlidersHorizontalIcon size={22} aria-hidden="true"/></div>
    {context.management?<div className="compose-field"><label htmlFor="communication-type">Update type</label><select id="communication-type" value={type} onChange={e=>{const t=e.target.value as CommunicationDraft['type'];changed();setType(t);setScopeKind(t==='TODAYS_TEAM'?'TODAYS_TEAM':t==='SHIFT_NOTE'?'SHIFT':'LOCATION');}}><option value="LOCATION_ANNOUNCEMENT">Location announcement</option><option value="SHIFT_NOTE">Shift note</option><option value="OPERATIONAL_UPDATE">Important update</option><option value="TODAYS_TEAM">Today&apos;s team message</option></select></div>:<div className="compose-context-note"><UsersThreeIcon size={20} aria-hidden="true"/><div><strong>Today&apos;s team</strong><span>{context.businessDate}</span></div></div>}
    {type==='OPERATIONAL_UPDATE'?<div className="compose-field"><label htmlFor="communication-scope">Audience context</label><select id="communication-scope" value={scopeKind} onChange={e=>{changed();setScopeKind(e.target.value as typeof scopeKind);}}><option value="LOCATION">Location</option><option value="TODAYS_TEAM">Today&apos;s team</option><option value="SHIFT">Published shift</option></select></div>:null}
    <div className="compose-field"><label htmlFor="communication-location">Work location</label><select id="communication-location" value={locationId} onChange={e=>{changed();setLocationId(e.target.value);setShiftId('');}}>{context.locations.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
    {scopeKind==='SHIFT'?<div className="compose-field"><label htmlFor="communication-shift">Published shift</label><select id="communication-shift" value={shiftId} onChange={e=>{changed();setShiftId(e.target.value);}}><option value="">Choose a shift</option>{context.shifts.filter(s=>s.locationId===locationId).map(s=><option key={s.id} value={s.id}>{s.date} · {s.startTime}–{s.endTime} · {s.assigneeLabel}{s.positionLabel?` · ${s.positionLabel}`:''}</option>)}</select></div>:scopeKind==='TODAYS_TEAM'?<p className="compose-hint">Today&apos;s team at {context.locations.find(l=>l.id===locationId)?.label}, based on current published assignments, including overnight shifts.</p>:null}
    {context.management&&type!=='TODAYS_TEAM'?<div className="compose-field"><label htmlFor="communication-requirement">Review requirement</label><select id="communication-requirement" aria-describedby="compose-requirement-hint" value={ack} onChange={e=>{changed();setAck(e.target.value as CommunicationDraft['acknowledgement']);}}><option value="OPTIONAL">Optional update</option><option value="REQUIRED">Require acknowledgement of this version</option><option value="NONE">Informational only</option></select><p id="compose-requirement-hint" className="compose-hint">{ack==='REQUIRED'?'Recipients must acknowledge this exact version.':ack==='NONE'?'Recipients can read the update without a review action.':'Recipients can mark the update as read.'}</p></div>:null}
    <div className="compose-expiry"><label className="communication-review-check"><ClockIcon size={20} aria-hidden="true"/><span>Set an expiration</span><input type="checkbox" checked={useExpiry} onChange={e=>{changed();setUseExpiry(e.target.checked);}}/></label>{useExpiry?<div className="compose-field"><label htmlFor="communication-expiration">Available until ({context.timeZone})</label><input id="communication-expiration" type={expiration.endsWith('Z')?'text':'datetime-local'} value={expiration} onChange={e=>{changed();setExpiration(e.target.value);}}/></div>:<p className="compose-hint">The update stays available until it is withdrawn.</p>}</div>
   </section>
  </fieldset>
  <div ref={feedbackRef} tabIndex={-1} className="compose-feedback" aria-label="Update review feedback">
   <p id="communication-form-error" className={error?'compose-alert':undefined} role={error?'alert':undefined}>{error}</p>
   {action.notice==='conflict'||staleEdit?<div className="compose-alert" role="alert"><WarningCircleIcon size={22} aria-hidden="true"/><div><strong>Review the latest information</strong><p>{staleEdit?'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.':'This update or its audience changed. Review the latest context and preview again.'}</p>{editing?<Link className="button secondary" href={'/app/updates/'+editing.id}>Review latest</Link>:null}</div></div>:action.notice==='unavailable'?<p className="compose-alert" role="alert">We could not confirm the result. Check status before trying again.</p>:null}
   {preview&&action.notice!=='conflict'&&!staleEdit?<section className="communication-audience compose-review compose-reviewed" aria-label="Audience preview"><div className="compose-review-copy"><span className="compose-review-icon"><UsersThreeIcon size={24} aria-hidden="true"/></span><div><h2>Audience preview</h2><p><strong>{preview.count} eligible {preview.count===1?'recipient':'recipients'}</strong> at {context.locations.find(l=>l.id===locationId)?.label}.</p>{scopeKind==='SHIFT'?<p>{context.shifts.filter(s=>s.id===shiftId&&s.locationId===locationId).map(s=><span key={s.id}>{s.assigneeLabel}{s.positionLabel?` · ${s.positionLabel}`:''} · {s.date} · {s.startTime}–{s.endTime}</span>)}</p>:null}<p className="compose-hint">{preview.count===0?'No eligible recipients in this audience. You can change the delivery settings before publishing.':'Check your message and delivery settings, then publish.'}</p></div></div><button className="button primary compose-action" type="button" disabled={disabled} onClick={publish}><PendingLabel pending={action.pending} pendingText="Publishing…">{editing?'Publish new version':'Publish update'}</PendingLabel><PaperPlaneTiltIcon size={20} aria-hidden="true"/></button><p className="compose-review-footnote">Eligibility is checked again when you publish. Changing any field requires a new preview.</p></section>:<section className="compose-review" aria-label="Review before publishing"><div className="compose-review-copy"><span className="compose-review-icon"><UsersThreeIcon size={24} aria-hidden="true"/></span><div><h2>Review before publishing</h2><p>Check the eligible audience before your update goes live.</p></div></div><button className="button primary compose-action" disabled={disabled||previewing} type="submit">{previewing?'Checking audience…':'Preview audience'}<ArrowRightIcon size={20} aria-hidden="true"/></button></section>}
   {previewing||action.pending?<p className="compose-live" role="status">{previewing?'Checking audience…':'Confirming publication…'}</p>:null}
   {action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div ref={recoveryRef} tabIndex={-1} className="compose-alert compose-recovery" role="status"><div><strong>Publication needs a status check</strong><p>We couldn&apos;t confirm the result. Check status before trying again.</p></div><div className="compose-recovery-actions"><button className="button secondary" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>Check status</button>{action.canRetry?<button className="button secondary" type="button" disabled={action.pending} onClick={()=>void action.retry()}>Retry original publication</button>:null}</div></div>:null}
  </div>
 </form>;
}
function BoundCommunicationCompose({authority,mode,updateId}:{authority:string;mode:CommunicationMode;updateId?:string}){
 const router=useRouter(),retained=useRef<ComposeRetention|null>(null);
 const pageRef=useRef<HTMLDivElement>(null);
 useGSAP(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{gsap.from('.compose-page-heading',{y:6,opacity:0,duration:.3,ease:'power2.out'});});
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
 return <div ref={pageRef} className="employee-view communication-view compose-page"><Link className="communication-back compose-back" href="/app/updates"><ArrowLeftIcon size={18} aria-hidden="true"/>Updates</Link><header className="compose-page-heading"><div><h1>{updateId?'Edit update':mode==='manager'?'Create update':"Message today's team"}</h1><p>{updateId?'Revise your message and review the audience before publishing a new version.':'Write your message, choose its audience, then review before publishing.'}</p></div><span className="compose-status"><span aria-hidden="true"/>{updateId?'New version':'Unpublished'}</span></header>{context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority} retained={retained} retain={(values,revisionId)=>{retained.current={values,revisionId};}} action={action}/>:<section className="compose-state" role="status"><UsersThreeIcon size={28} aria-hidden="true"/><h2>{resource.state.paused?'Connection paused':resource.state.refreshing?'Getting ready':'Composer unavailable'}</h2><p>{resource.state.paused?'Updates paused — return online to refresh.':resource.state.refreshing?'Loading current context…':'Composition unavailable. Check your current permission and published context.'}</p><button className="button secondary" disabled={resource.state.paused||resource.state.refreshing} onClick={resource.refresh}>Retry</button></section>}</div>;
}

export function CommunicationCompose(props:{authority:string;mode:CommunicationMode;updateId?:string}){
 return <BoundCommunicationCompose key={props.mode+':'+props.authority+':'+(props.updateId??'new')} {...props}/>;
}
