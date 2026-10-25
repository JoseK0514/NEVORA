'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import type {InvitationCommand,InvitationResult,InvitationStatusResult} from '@/lib/auth/invitations/model';
import {readInvitationResult,readInvitationStatus} from './commands';
import '../quiet/u4.css';

const deliveryText={UNAVAILABLE:'Invitation email is not available.',PREPARED:'Prepared for email delivery. Receipt is not confirmed.',PROVIDER_ACCEPTED:'Accepted for email delivery. This does not confirm receipt or activation.',UNKNOWN:'Email delivery could not be confirmed.',FAILED:'Email delivery failed. Account activation is not confirmed.'};
const invitationText={ISSUED:'Invitation issued',CONSUMED:'Invitation used',REVOKED:'Invitation revoked',EXPIRED:'Invitation expired',INVALIDATED:'Invitation no longer valid'};

/** A different actor/target gets fresh transient state, never a previous receipt. */
export function EmployeeInvitationPanel(props:{employeeId:string;initialStatus:InvitationStatusResult;actorId:string}){
 return <InvitationPanel key={JSON.stringify([props.actorId,props.employeeId,props.initialStatus.state==='unavailable'&&props.initialStatus.reason==='access_denied'])} {...props}/>;
}
function InvitationPanel({employeeId,initialStatus,actorId}:{employeeId:string;initialStatus:InvitationStatusResult;actorId:string}){
 const [status,setStatus]=useState(initialStatus),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[receipt,setReceipt]=useState<Extract<InvitationResult,{state:'saved'}>['receipt']|null>(null),[confirm,setConfirm]=useState<'ISSUE'|'REVOKE'|null>(null),[uncertain,setUncertain]=useState(false);
 const command=useRef<InvitationCommand|null>(null),busy=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null),generation=useRef(0);
 useEffect(()=>{mounted.current=true;function retire(){++generation.current;request.current?.abort();command.current=null;}return()=>{mounted.current=false;retire();};},[]);
 const headers={'x-nevora-company-access':'1','x-nevora-actor':actorId};
 const isCurrent=(version:number)=>mounted.current&&generation.current===version;
 function denied(){++generation.current;request.current?.abort();request.current=null;busy.current=false;setPending(false);setStatus({state:'unavailable',reason:'access_denied'});setReceipt(null);setConfirm(null);command.current=null;setUncertain(false);setMessage('Your current access does not allow invitation management. Sign in again or contact your Owner.');}
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
  if(busy.current||command.current)return;busy.current=true;setPending(true);setConfirm(null);const version=generation.current,abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),15000);
  try{await currentStatus(abort.signal,version);}catch{if(isCurrent(version)){setStatus({state:'unavailable',reason:'read_failed'});setMessage('Current invitation information could not be loaded. Refresh before taking another action.');}}
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
   if(result.state==='outcome_unknown'){setStatus({state:'unavailable',reason:'source_changed'});setUncertain(true);setMessage('The action outcome is not confirmed. Check this action before sending another invitation.');return;}
   if(!response.ok&&result.state==='saved')throw new Error('Receipt transport unavailable.');
   if(result.state==='saved'){
    setReceipt(result.receipt);command.current=null;setUncertain(false);setMessage(result.receipt.action==='ISSUE'?'Invitation issued. Check the separate delivery status below.':'Invitation revoked.');
    try{await currentStatus(abort.signal,version);}catch{if(isCurrent(version))setStatus({state:'unavailable',reason:'read_failed'});}
   }else if(reconcile){
    // An unavailable historical read cannot prove that the original write failed.
    setUncertain(true);setMessage('The original action is still not confirmed. Check again before starting another invitation action.');
   }else{
    command.current=null;setUncertain(false);setStatus({state:'unavailable',reason:'source_changed'});
    setMessage(result.state==='limited'?`Too many invitation actions. Wait at least ${Math.ceil(result.retryAfterMs/1000)} seconds, then refresh current information.`:result.state==='conflict'?'Employee or invitation information changed. Refresh and review it before choosing a new action.':result.state==='invalid'?result.fieldErrors.map(e=>e.message).join(' '):'Invitation email is unavailable. Refresh current information before trying again.');
   }
  }catch{if(isCurrent(version)){setStatus({state:'unavailable',reason:'source_changed'});setUncertain(true);setMessage('The action outcome is not confirmed. Check this action before sending another invitation.');}}
  finally{clearTimeout(timeout);if(isCurrent(version)){busy.current=false;setPending(false);request.current=null;}}
 }
 const available=status.state==='ready',deniedAccess=status.state==='unavailable'&&status.reason==='access_denied';
 // T-11 / UX-O-51/52 (final pass): the invitation on Quiet rows. The commands, confirmation and receipts are unchanged.
 const stateText=available?status.eligibility==='ALREADY_ACTIVATED'?'Active':status.invitation?invitationText[status.invitation.state]:'Not invited yet':'Unavailable';
 return <section className="q-u4-panel" aria-labelledby={'invitation-'+employeeId} aria-busy={pending}>
  <div className="q-grp"><h2 id={'invitation-'+employeeId}>Account invitation</h2></div>
  {available?<ul className="q-list">
   <li><div className="q-row q-row--one"><span className="q-rt"><b>Account</b></span><span className="q-rv q-rv--l">{stateText}</span></div></li>
   {status.registeredEmailMasked?<li><div className="q-row q-row--one"><span className="q-rt"><b>Registered email</b></span><span className="q-rv q-rv--l">{status.registeredEmailMasked}</span></div></li>:null}
   {status.invitation?<li><div className="q-row"><span className="q-rt"><b>Delivery</b><i>{deliveryText[status.delivery]}</i></span></div></li>:null}
  </ul>:<p className="q-empty" role="status">{deniedAccess?'Invitation management is unavailable for your current access.':'Current invitation information is unavailable. Refresh before taking an action.'}</p>}
  {available&&status.eligibility==='NO_EMAIL'?<p className="q-help">Add an email in Edit to send an invitation. You can save someone without one.</p>:null}
  {available&&status.eligibility==='INACTIVE'?<p className="q-help">This person is inactive. Reactivate them before inviting them.</p>:null}
  {available&&status.eligibility==='SELF_ISSUE_DENIED'?<p className="q-help">Ask another Owner to manage your invitation.</p>:null}
  {receipt?<p className="q-help q-u4-saved">{`Done: ${receipt.action==='ISSUE'?'Invitation sent':'Invitation revoked'}. ${deliveryText[receipt.delivery]}`}</p>:null}
  {message?<p className={uncertain?'q-error':'q-help'} role={uncertain?'alert':'status'} aria-live="polite">{message}</p>:null}
  {confirm?<div className="q-u4-confirmbox" role="group" aria-label="Confirm invitation action"><p className="q-u4-confirm">{confirm==='REVOKE'?'Revoke this invitation? The employee will need a new invitation to activate.':status.state==='ready'&&status.invitation?'Send a new invitation to the registered email? The previous invitation will no longer be usable.':'Send an invitation to the registered employee email?'}</p>
   <button type="button" className={confirm==='REVOKE'?'q-btn q-u4-danger':'q-btn'} disabled={pending} onClick={()=>void run()}>{confirm==='REVOKE'?'Revoke invitation':'Send invitation'}</button>
   <button type="button" className="q-btn q-btn--quiet" disabled={pending} onClick={()=>setConfirm(null)}>Cancel</button></div>:null}
  <div className="q-u4-actions">
   {uncertain?<button type="button" className="q-btn q-btn--sec" disabled={pending} onClick={()=>void run(true)}>{pending?'Checking action…':'Check action outcome'}</button>:<>
    {available&&status.allowedCommands.includes('ISSUE')&&!confirm?<button type="button" className="q-btn" disabled={pending} onClick={()=>setConfirm('ISSUE')}>{status.invitation?'Send new invitation':'Send invitation'}</button>:null}
    {available&&status.allowedCommands.includes('REVOKE')&&!confirm?<button type="button" className="q-btn q-btn--sec" disabled={pending} onClick={()=>setConfirm('REVOKE')}>Revoke invitation</button>:null}
    {!deniedAccess&&!confirm?<button type="button" className="q-btn q-btn--quiet" disabled={pending} onClick={()=>void refresh()}>{pending?'Checking invitation…':'Check invitation status'}</button>:null}
   </>}
   {deniedAccess?<Link href="/login" className="q-btn q-btn--sec">Sign in again</Link>:null}
  </div>
 </section>;
}
