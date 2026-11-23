'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import type {InvitationCommand,InvitationResult,InvitationStatusResult} from '@/lib/auth/invitations/model';
import {readInvitationResult,readInvitationStatus} from './commands';
import styles from './company-access.module.css';

import {accessCopy,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

/** A different actor/target gets fresh transient state, never a previous receipt. */
export function EmployeeInvitationPanel(props:{employeeId:string;initialStatus:InvitationStatusResult;actorId:string;
 /** The person's language (Signed-in Spanish, Nov 23, 2026). */ lang?:AccessLang}){
 return <InvitationPanel key={JSON.stringify([props.actorId,props.employeeId,props.initialStatus.state==='unavailable'&&props.initialStatus.reason==='access_denied'])} {...props}/>;
}
function InvitationPanel({employeeId,initialStatus,actorId,lang:langProp}:{employeeId:string;initialStatus:InvitationStatusResult;actorId:string;lang?:AccessLang}){
 // Signed-in Spanish (Nov 23, 2026): the person's language, unless the caller names one.
 const portalLang=usePortalLang(),lang=langProp??portalLang;
 const t=accessCopy(lang).invite,deliveryText=t.delivery,invitationText=t.state;
 const [status,setStatus]=useState(initialStatus),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[receipt,setReceipt]=useState<Extract<InvitationResult,{state:'saved'}>['receipt']|null>(null),[confirm,setConfirm]=useState<'ISSUE'|'REVOKE'|null>(null),[uncertain,setUncertain]=useState(false);
 // Nov 14, 2026 inspection (JR-5): the server refused to issue because email delivery isn't configured for this workplace.
 // Nothing was written and refreshing can't fix it, so the panel says so, names support and stops offering to send.
 const [deliveryOff,setDeliveryOff]=useState(false);
 const command=useRef<InvitationCommand|null>(null),busy=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null),generation=useRef(0);
 useEffect(()=>{mounted.current=true;function retire(){++generation.current;request.current?.abort();command.current=null;}return()=>{mounted.current=false;retire();};},[]);
 const headers={'x-nevora-company-access':'1','x-nevora-actor':actorId};
 const isCurrent=(version:number)=>mounted.current&&generation.current===version;
 function denied(){++generation.current;request.current?.abort();request.current=null;busy.current=false;setPending(false);setStatus({state:'unavailable',reason:'access_denied'});setReceipt(null);setConfirm(null);command.current=null;setUncertain(false);setDeliveryOff(false);setMessage(t.denied);}
 async function currentStatus(signal:AbortSignal,version:number){
  const response=await fetch('/api/company-access/invitations/'+encodeURIComponent(employeeId),{headers,cache:'no-store',credentials:'same-origin',redirect:'error',signal});
  if(!isCurrent(version))return;
  if(response.status===401||response.status===403){denied();return;}
  const current=readInvitationStatus(await response.json(),employeeId);if(!isCurrent(version))return;
  if(current.state==='unavailable'&&current.reason==='access_denied'){denied();return;}
  if(!response.ok)throw new Error('Current invitation unavailable.');
  setStatus(current);
 }
 async function refresh(){
  if(busy.current||command.current)return;busy.current=true;setPending(true);setConfirm(null);setDeliveryOff(false);const version=generation.current,abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),15000);
  try{await currentStatus(abort.signal,version);}catch{if(isCurrent(version)){setStatus({state:'unavailable',reason:'read_failed'});setMessage(t.loadFailed);}}
  finally{clearTimeout(timeout);if(isCurrent(version)){busy.current=false;setPending(false);request.current=null;}}
 }
 async function run(reconcile=false){
  if(busy.current)return;
  if(!reconcile){
   if(status.state!=='ready'||!confirm||!status.allowedCommands.includes(confirm))return;
   if(confirm==='REVOKE'&&!status.invitation)return;
   const operationId=crypto.randomUUID();
   command.current=confirm==='ISSUE'?{action:'ISSUE',operationId,expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:status.invitationRevision}:{action:'REVOKE',operationId,invitationId:status.invitation!.id,expectedInvitationRevision:status.invitationRevision};
  }
  const submitted=command.current;if(!submitted)return;
  busy.current=true;setPending(true);setConfirm(null);setMessage('');const version=generation.current,abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const response=await fetch(reconcile?'/api/company-access/invitation-operations/'+encodeURIComponent(submitted.operationId):'/api/company-access/invitations/'+encodeURIComponent(employeeId),{method:reconcile?'GET':'POST',headers:{...headers,...(!reconcile?{'Content-Type':'application/json'}:{})},...(!reconcile?{body:JSON.stringify(submitted)}:{}),cache:'no-store',credentials:'same-origin',redirect:'error',signal:abort.signal});
   if(!isCurrent(version))return;
   if(response.status===401||response.status===403){denied();return;}
   const result=readInvitationResult(await response.json(),submitted.operationId,employeeId);if(!isCurrent(version))return;
   if(result.state==='outcome_unknown'){setStatus({state:'unavailable',reason:'source_changed'});setUncertain(true);setMessage(t.unknown);return;}
   if(!response.ok&&result.state==='saved')throw new Error('Receipt transport unavailable.');
   if(result.state==='saved'){
    setReceipt(result.receipt);command.current=null;setUncertain(false);setMessage(result.receipt.action==='ISSUE'?t.issuedMessage:t.revokedMessage);
    try{await currentStatus(abort.signal,version);}catch{if(isCurrent(version))setStatus({state:'unavailable',reason:'read_failed'});}
   }else if(reconcile){
    // An unavailable historical read cannot prove that the original write failed.
    setUncertain(true);setMessage(t.stillUnknown);
   }else if(result.state==='unavailable'&&result.reason==='delivery_unavailable'){
    command.current=null;setUncertain(false);setDeliveryOff(true);
   }else{
    command.current=null;setUncertain(false);setStatus({state:'unavailable',reason:'source_changed'});
    setMessage(result.state==='limited'?t.limited(Math.ceil(result.retryAfterMs/1000)):result.state==='conflict'?t.conflict:result.state==='invalid'?result.fieldErrors.map(e=>e.message).join(' '):t.notSent);
   }
  }catch{if(isCurrent(version)){setStatus({state:'unavailable',reason:'source_changed'});setUncertain(true);setMessage(t.unknown);}}
  finally{clearTimeout(timeout);if(isCurrent(version)){busy.current=false;setPending(false);request.current=null;}}
 }
 const available=status.state==='ready',deniedAccess=status.state==='unavailable'&&status.reason==='access_denied';
 return <section className={'panel '+styles.stack} aria-labelledby={'invitation-'+employeeId} aria-busy={pending}>
  <h2 id={'invitation-'+employeeId} className={styles.heading}><EnvelopeSimpleIcon size={22} weight="duotone" aria-hidden="true"/> {t.title}</h2>
  {available?<div className={styles.status}>
   <p><strong>{status.eligibility==='ALREADY_ACTIVATED'?t.activated:status.invitation?invitationText[status.invitation.state]:t.none}</strong></p>
   {status.registeredEmailMasked&&<p>{t.email}{status.registeredEmailMasked}</p>}
   {status.eligibility==='NO_EMAIL'&&<p>{t.noEmail}</p>}
   {status.eligibility==='INACTIVE'&&<p>{t.inactive}</p>}
   {status.eligibility==='SELF_ISSUE_DENIED'&&<p>{t.selfDenied}</p>}
   {/* Backend (Nov 15, 2026): deliveryAvailable says whether invitation email is configured for this workplace (not that
     * any email arrived). When it isn't, the reason shows before anyone tries to send; a Manager's read is read-only
     * (allowedCommands is empty), so it says who sends invitations. */}
   {status.eligibility==='INVITABLE'&&!status.deliveryAvailable&&!deliveryOff&&<p>{t.deliveryOffBefore}<a className="c-link" href="mailto:support@thevelani.com">support@thevelani.com</a>.</p>}
   {status.eligibility==='INVITABLE'&&status.deliveryAvailable&&!status.allowedCommands.length&&<p>{t.ownerSends}</p>}
   {status.invitation&&<p>{deliveryText[status.delivery]}</p>}
  </div>:<p role="status">{deniedAccess?t.accessChanged:t.didntLoad}</p>}
  {receipt&&<div className={styles.receipt}><strong>{receipt.action==='ISSUE'?t.receiptIssued:t.receiptCanceled}</strong><p>{deliveryText[receipt.delivery]}</p><small>{t.checkShows}</small></div>}
  {message&&<p role={uncertain?'alert':'status'} aria-live="polite">{message}</p>}
  {deliveryOff&&<p role="status" aria-live="polite">{t.deliveryOff}<a className="c-link" href="mailto:support@thevelani.com">support@thevelani.com</a>.</p>}
  {confirm&&<div className={styles.receipt} role="group" aria-label={t.confirmGroup}><p>{confirm==='REVOKE'?t.confirmRevoke:status.state==='ready'&&status.invitation?t.confirmResend:t.confirmSend}</p><div className={`${styles.actions} ${styles.confirmActs}`}><button type="button" className="button secondary" disabled={pending} onClick={()=>setConfirm(null)}>{confirm==='REVOKE'?t.keep:t.dontSend}</button><button type="button" className="button primary" disabled={pending} onClick={()=>void run()}>{confirm==='REVOKE'?t.cancel:t.send}</button></div></div>}
  <div className={styles.actions}>
   {uncertain?<button type="button" className="button secondary" disabled={pending} onClick={()=>void run(true)}>{pending?t.checking:t.checkWhat}</button>:<>
    {available&&!deliveryOff&&status.allowedCommands.includes('ISSUE')&&<button type="button" className="button primary" disabled={pending||!!confirm} onClick={()=>setConfirm('ISSUE')}>{status.invitation?t.sendNew:t.send}</button>}
    {available&&status.allowedCommands.includes('REVOKE')&&<button type="button" className="button secondary" disabled={pending||!!confirm} onClick={()=>setConfirm('REVOKE')}>{t.cancel}</button>}
    {!deniedAccess&&<button type="button" className="button secondary" disabled={pending||!!confirm} onClick={()=>void refresh()}>{pending?t.checkingInvitation:t.check}</button>}
   </>}
   {deniedAccess&&<Link href="/login" className="button secondary">{t.signIn}</Link>}
  </div>
 </section>;
}
