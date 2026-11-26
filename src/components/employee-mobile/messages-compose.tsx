'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {communicationRequest} from '@/lib/communications/client';
import type {CommunicationContext,CommunicationDraft} from '@/lib/communications/types';
import {useMessageSession,todayMessageDraft,type MessageDraft} from './message-session';
import {validCommunicationText} from '@/lib/communications/validation';
import {localDateTimeToInstant} from '@/lib/business-time';
import {messageTime} from './messages-view';
import {useMobileLang} from './mobile-lang';
import {messagesComposeCopy} from './copy/messages-compose';
type Context=Extract<CommunicationContext,{state:'ready'}>;
type FieldErrors=Partial<Record<'title'|'body'|'expiry',string>>;
export function MessageCompose({context,allowed}:{context:Context;allowed:()=>boolean}){
 // Only locations where the person can message today's team are offered; the send check still decides.
 const options=context.locations.filter(location=>location.todayTeam),lang=useMobileLang(),t=messagesComposeCopy[lang];
 const session=useMessageSession()!,initial:MessageDraft={title:'',body:'',locationId:options.length===1?options[0].id:'',businessDate:context.businessDate,expiresAt:''},draft=session.draft??initial;
 const [preview,setPreview]=useState<{count:number;fingerprint:string;draft:CommunicationDraft}|null>(null),[checking,setChecking]=useState(false),[error,setError]=useState<string|null>(null),generation=useRef(0),abort=useRef<AbortController|null>(null),reviewHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>()=>{generation.current++;abort.current?.abort();},[]);
 useEffect(()=>{if(preview)reviewHeading.current?.focus();},[preview]);
 const [fieldErrors,setFieldErrors]=useState<FieldErrors>({}),focusInvalid=useRef(false);
 useEffect(()=>{if(!focusInvalid.current)return;focusInvalid.current=false;const field=Object.keys(fieldErrors)[0];if(field)document.getElementById('message-'+field)?.focus();},[fieldErrors]);
 const busy=session.state.pending||session.state.hasUnknown,changedDay=draft.businessDate!==context.businessDate,invalidLocation=!!draft.locationId&&!options.some(location=>location.id===draft.locationId);
 const change=(patch:Partial<MessageDraft>)=>{generation.current++;abort.current?.abort();setChecking(false);setPreview(null);setError(null);setFieldErrors(previous=>{const next={...previous};if('title'in patch)delete next.title;if('body'in patch)delete next.body;if('expiresAt'in patch)delete next.expiry;return next;});session.setDraft({...draft,...patch});session.clear();};
 async function review(event:FormEvent){event.preventDefault();if(!allowed()||busy||checking)return;
  const problems:FieldErrors={};
  if(!validCommunicationText(draft.title,'title'))problems.title=t.titleError;
  if(!validCommunicationText(draft.body,'body'))problems.body=t.bodyError;
  try{if(draft.expiresAt&&Date.parse(localDateTimeToInstant(draft.expiresAt,context.timeZone))<=Date.now())problems.expiry=t.expiryPast;}catch{problems.expiry=t.expiryInvalid(t.zone(context.timeZone));}
  setFieldErrors(problems);if(Object.keys(problems).length){focusInvalid.current=true;setError(t.fieldsError);return;}
  const value=todayMessageDraft(draft,context);if(!value||invalidLocation){setError(t.locationError);return;}
  session.clear();session.setDraft({...draft});setPreview(null);setError(null);setChecking(true);const seq=++generation.current,controller=new AbortController();abort.current=controller;
  try{const result=await communicationRequest('employee',session.core,'/preview',value,controller.signal) as {state?:string;count?:number;fingerprint?:string};if(seq!==generation.current||!allowed())return;if(result.state==='ready'&&Number.isSafeInteger(result.count)&&Number(result.count)>0&&Number(result.count)<=1000&&typeof result.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(result.fingerprint))setPreview({count:Number(result.count),fingerprint:result.fingerprint,draft:value});else setError(t.audienceNoAssignment);}catch{if(seq===generation.current&&allowed())setError(t.audienceFailed);}finally{if(seq===generation.current){setChecking(false);abort.current=null;}}
 }
 if(session.commit&&session.operationHref==='/app/updates/compose')return <section className="em-request-notice"><h2>{t.published}</h2><p>{t.publishedBody}</p><Link className="em-request-primary" href={'/app/updates/'+session.commit.id}>{t.viewPublished}</Link><button type="button" className="em-request-secondary" onClick={()=>{session.clear();session.setDraft(null);setPreview(null);}}>{t.writeAnother}</button></section>;
 if(!options.length)return <section className="em-request-notice" aria-labelledby="compose-unavailable-title"><h2 id="compose-unavailable-title">{t.notScheduled}</h2><p>{t.notScheduledBody}</p><Link className="em-request-secondary" href="/app/updates">{t.backToUpdates}</Link></section>;
 return <form className="em-message-compose" onSubmit={review}>
  <p className="em-message-information">{t.intro}</p>
  {changedDay?<section className="em-request-notice"><h2>{t.earlierDay}</h2><p>{t.earlierDayBody}</p><button type="button" className="em-request-secondary" disabled={busy} onClick={()=>change({businessDate:context.businessDate})}>{t.reviewForToday}</button></section>:null}
  <fieldset disabled={busy||changedDay}><div className="em-message-field"><label htmlFor="message-location">{t.location}</label><select id="message-location" value={draft.locationId} required onChange={event=>change({locationId:event.target.value})}><option value="">{t.chooseLocation}</option>{invalidLocation?<option value={draft.locationId}>{t.previousLocation}</option>:null}{options.map(location=><option key={location.id} value={location.id}>{location.label}</option>)}</select></div>
   <div className="em-message-field"><label htmlFor="message-title">{t.title}</label><input id="message-title" required value={draft.title} maxLength={240} aria-invalid={!!fieldErrors.title||undefined} aria-describedby={'message-title-limit'+(fieldErrors.title?' message-title-error':'')} onChange={event=>change({title:event.target.value})}/><small id="message-title-limit">{t.titleCount([...draft.title.trim()].length)}</small>{fieldErrors.title?<p id="message-title-error" className="em-message-information" role="alert">{fieldErrors.title}</p>:null}</div>
   <div className="em-message-field"><label htmlFor="message-body">{t.message}</label><textarea id="message-body" required rows={6} maxLength={4000} value={draft.body} aria-invalid={!!fieldErrors.body||undefined} aria-describedby={'message-body-limit'+(fieldErrors.body?' message-body-error':'')} onChange={event=>change({body:event.target.value})}/><small id="message-body-limit">{t.bodyCount([...draft.body.trim()].length)}</small>{fieldErrors.body?<p id="message-body-error" className="em-message-information" role="alert">{fieldErrors.body}</p>:null}</div>
   <div className="em-message-field"><label htmlFor="message-expiry">{t.expiry}</label><input id="message-expiry" type="datetime-local" value={draft.expiresAt} onChange={event=>change({expiresAt:event.target.value})} aria-invalid={!!fieldErrors.expiry||undefined} aria-describedby={'message-expiry-help'+(fieldErrors.expiry?' message-expiry-error':'')}/><small id="message-expiry-help">{t.expiryHelp(t.zone(context.timeZone))}</small>{fieldErrors.expiry?<p id="message-expiry-error" className="em-message-information" role="alert">{fieldErrors.expiry}</p>:null}</div>
  </fieldset>
  {error?<p className="em-message-information" role="alert">{error}</p>:null}
  {preview&&!changedDay&&!invalidLocation&&!['conflict','blocked','signed-out'].includes(String(session.state.notice))?<section className="em-message-preview"><h2 ref={reviewHeading} tabIndex={-1}>{t.reviewTitle}</h2><p><strong>{t.recipients(preview.count)}</strong> · {context.locations.find(location=>location.id===draft.locationId)?.label}</p><h3>{preview.draft.title}</h3><p className="em-message-copy">{preview.draft.body}</p><p>{preview.draft.expiresAt?t.availableUntil(messageTime(preview.draft.expiresAt,context.timeZone,lang)):t.noExpiry}{t.optional}</p><button type="button" className="em-request-primary" disabled={busy} onClick={()=>{if(allowed())session.send({kind:'PUBLISH',operationId:crypto.randomUUID(),authority:session.core,draft:preview.draft,audienceFingerprint:preview.fingerprint},'/app/updates/compose');}}>{t.send}</button><button type="button" className="em-request-secondary" disabled={busy} onClick={()=>setPreview(null)}>{t.keepEditing}</button></section>:<button type="submit" className="em-request-primary" disabled={busy||checking||changedDay||invalidLocation}>{checking?t.checkingAudience:t.reviewAudience}</button>}
 </form>;
}
