'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {localDateTimeToInstant} from '../lib/business-time';
import {validateCommunicationDraft} from '../lib/communications/validation';
import {communicationRequest,useCommunicationAction,useCommunicationResource,type CommunicationMode} from '../lib/communications/client';
import type {CommunicationContext,CommunicationDraft,CommunicationRead} from '../lib/communications/types';
type Context=Extract<CommunicationContext,{state:'ready'}>;
function ComposeForm({context,initial,editing,mode,authority}:{context:Context;initial?:CommunicationDraft;editing?:Extract<CommunicationRead,{state:'ready'}>;mode:CommunicationMode;authority:string}){
 const router=useRouter(),[type,setType]=useState<CommunicationDraft['type']>(initial?.type??(context.management?'LOCATION_ANNOUNCEMENT':'TODAYS_TEAM'));
 const [scopeKind,setScopeKind]=useState(initial?.scope.kind??(context.management?'LOCATION':'TODAYS_TEAM'));
 const [locationId,setLocationId]=useState(initial?.scope.locationId??context.locations[0]?.id??''),[shiftId,setShiftId]=useState(initial?.scope.kind==='SHIFT'?initial.scope.sourceShiftId:'');
 const [title,setTitle]=useState(initial?.title??''),[body,setBody]=useState(initial?.body??''),[ack,setAck]=useState<CommunicationDraft['acknowledgement']>(initial?.acknowledgement??'OPTIONAL');
 const [expiration,setExpiration]=useState(initial?.expiresAt??''),[useExpiry,setUseExpiry]=useState(!!initial?.expiresAt),[error,setError]=useState<string|null>(null);
 const [preview,setPreview]=useState<{count:number;fingerprint:string}|null>(null),[previewing,setPreviewing]=useState(false);const previewGeneration=useRef(0);
 const action=useCommunicationAction(mode,authority,result=>router.push('/app/updates/'+result.id));
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
 async function review(){const value=draft();if(!value)return;const sequence=++previewGeneration.current;setPreviewing(true);try{const result=await communicationRequest(mode,authority,'/preview',value) as {state:string;count:number;fingerprint:string};if(sequence!==previewGeneration.current)return;if(result.state==='ready'){action.setNotice(null);setPreview({count:result.count,fingerprint:result.fingerprint});}else setError('Audience unavailable. Check your current permission and published context.');}catch{if(sequence===previewGeneration.current)setError('Audience unavailable. Retry to check current information.');}finally{if(sequence===previewGeneration.current)setPreviewing(false);}}
 function publish(){const value=draft();if(!value||!preview)return;void action.send({kind:editing?'REVISE':'PUBLISH',operationId:crypto.randomUUID(),authority,draft:value,audienceFingerprint:preview.fingerprint,...(editing?{communicationId:editing.id,expectedRevisionId:editing.revisionId}:{})});}
 const disabled=action.pending||action.notice==='unknown';
 if(action.notice==='blocked')return <section className="employee-view-surface" role="alert"><p>Your current permission does not allow publication.</p><Link className="button secondary" href="/app/updates">Return to updates</Link></section>;
 return <form className="employee-view-surface communication-compose" onSubmit={e=>{e.preventDefault();void review();}}>
  <fieldset disabled={disabled}><legend>{editing?'Edit update':'Create update'}</legend>
   {context.management?<><label htmlFor="communication-type">Update type</label><select id="communication-type" value={type} onChange={e=>{const t=e.target.value as CommunicationDraft['type'];changed();setType(t);setScopeKind(t==='TODAYS_TEAM'?'TODAYS_TEAM':t==='SHIFT_NOTE'?'SHIFT':'LOCATION');}}><option value="LOCATION_ANNOUNCEMENT">Location announcement</option><option value="SHIFT_NOTE">Shift note</option><option value="OPERATIONAL_UPDATE">Important update</option><option value="TODAYS_TEAM">Today&apos;s team message</option></select></>:<p>Message today&apos;s team · {context.businessDate}</p>}
   {type==='OPERATIONAL_UPDATE'?<><label htmlFor="communication-scope">Audience context</label><select id="communication-scope" value={scopeKind} onChange={e=>{changed();setScopeKind(e.target.value as typeof scopeKind);}}><option value="LOCATION">Location</option><option value="TODAYS_TEAM">Today&apos;s team</option><option value="SHIFT">Published shift</option></select></>:null}
   <label htmlFor="communication-location">Work location</label><select id="communication-location" value={locationId} onChange={e=>{changed();setLocationId(e.target.value);setShiftId('');}}>{context.locations.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select>
   {scopeKind==='SHIFT'?<><label htmlFor="communication-shift">Published shift</label><select id="communication-shift" value={shiftId} onChange={e=>{changed();setShiftId(e.target.value);}}><option value="">Choose a shift</option>{context.shifts.filter(s=>s.locationId===locationId).map(s=><option key={s.id} value={s.id}>{s.date} · {s.startTime}–{s.endTime}</option>)}</select></>:scopeKind==='TODAYS_TEAM'?<p>Today&apos;s team at {context.locations.find(l=>l.id===locationId)?.label}. The server checks current published assignments, including overnight shifts.</p>:null}
   <label htmlFor="communication-title">Title</label><input id="communication-title" value={title} onChange={e=>{changed();setTitle(e.target.value);}} aria-describedby="communication-title-count communication-form-error" aria-invalid={titleCount>120}/><p id="communication-title-count" className="communication-counter">{titleCount}/120 characters</p>
   <label htmlFor="communication-body">Message</label><textarea id="communication-body" rows={8} value={body} onChange={e=>{changed();setBody(e.target.value);}} aria-describedby="communication-body-count communication-form-error" aria-invalid={bodyCount>2000}/><p id="communication-body-count" className="communication-counter">{bodyCount}/2000 characters · Plain text</p>
   {context.management&&type!=='TODAYS_TEAM'?<><label htmlFor="communication-requirement">Review requirement</label><select id="communication-requirement" value={ack} onChange={e=>{changed();setAck(e.target.value as CommunicationDraft['acknowledgement']);}}><option value="OPTIONAL">Optional update</option><option value="REQUIRED">Require acknowledgement of this version</option><option value="NONE">Informational only</option></select></>:null}
   <label className="communication-review-check"><input type="checkbox" checked={useExpiry} onChange={e=>{changed();setUseExpiry(e.target.checked);}}/>Set an expiration</label>{useExpiry?<><label htmlFor="communication-expiration">Available until ({context.timeZone})</label><input id="communication-expiration" type={expiration.endsWith('Z')?'text':'datetime-local'} value={expiration} onChange={e=>{changed();setExpiration(e.target.value);}}/></>:null}
  </fieldset>
  <p id="communication-form-error" role={error?'alert':undefined}>{error}</p>
  {action.notice==='conflict'?<div role="alert"><p>This update or its audience changed. Review the latest context and preview again.</p>{editing?<Link className="button secondary" href={'/app/updates/'+editing.id}>Review latest</Link>:null}</div>:action.notice==='unavailable'?<p role="alert">We could not confirm the result. Check status before trying again.</p>:null}
  {preview&&action.notice!=='conflict'?<section className="communication-audience" aria-label="Audience preview"><h2>Audience preview</h2><p>{preview.count} eligible {preview.count===1?'recipient':'recipients'} at {context.locations.find(l=>l.id===locationId)?.label}. Current grants are checked again at publication.</p><button className="button primary" type="button" disabled={disabled} onClick={publish}>{action.pending?'Publishing…':editing?'Publish new version':'Publish update'}</button></section>:<button className="button secondary" disabled={disabled||previewing} type="submit">{previewing?'Checking audience…':'Preview audience'}</button>}
  {action.notice==='unknown'||action.notice==='unavailable'&&action.hasUnknown?<div role="status"><p>We couldn&apos;t confirm the result. Check status before trying again.</p><button className="button secondary" type="button" disabled={action.pending} onClick={()=>void action.lookup()}>Check status</button></div>:null}
 </form>;
}
export function CommunicationCompose({authority,mode,updateId}:{authority:string;mode:CommunicationMode;updateId?:string}){
 const resource=useCommunicationResource(mode,authority,'/context',async signal=>{
  const context=await communicationRequest(mode,authority,'/context',undefined,signal) as CommunicationContext;
  if(context.state!=='ready')return context;
  if(updateId){const read=await communicationRequest(mode,authority,'/'+updateId,undefined,signal) as CommunicationRead;if(read.state!=='ready'||!read.management)return {state:'unavailable',reason:'read_failed'};if(read.authority!==authority)return {state:'unauthorized',reason:'access_denied'};return {...context,editing:read,validForMs:Math.min(context.validForMs,read.validForMs),observedAt:context.observedAt};}
  return context;
 });
 const context=resource.value?.state==='ready'&&'locations'in resource.value?resource.value:null;
 const editing=(context as (Context&{editing?:Extract<CommunicationRead,{state:'ready'}>})|null)?.editing;
 return <div className="employee-view communication-view"><Link className="communication-back" href="/app/updates">← Updates</Link><header className="employee-view-heading"><h1>{updateId?'Edit update':mode==='manager'?'Create update':"Message today's team"}</h1></header>{context?<ComposeForm key={authority+':'+(editing?.revisionId??'new')} context={context} initial={editing?.management?.draft} editing={editing} mode={mode} authority={authority}/>:<section className="employee-view-surface" role="status"><p>{resource.state.paused?'Updates paused — return online to refresh.':resource.state.refreshing?'Loading current context…':'Composition unavailable. Check your current permission and published context.'}</p><button className="button secondary" disabled={resource.state.paused||resource.state.refreshing} onClick={resource.refresh}>Retry</button></section>}</div>;
}
