'use client';

import {useEffect,useRef,useState} from 'react';
import type {OwnerScopeContext,ScopeCommand,ScopeResult,ScopeSelection} from '@/lib/company-access/model';
import {readScope,readScopeResult} from './commands';
import {ManagerOperationalScopeFields} from './manager-operational-scope-fields';
import '../quiet/u4.css';

export function ManagerOperationalScopePanel(props:{current:OwnerScopeContext;locations:{id:string;name:string}[];actorId:string}){
 return <ScopePanel key={JSON.stringify([props.actorId,props.current.employeeId])} {...props}/>;
}
function ScopePanel({current,locations,actorId}:{current:OwnerScopeContext;locations:{id:string;name:string}[];actorId:string}){
 const [baseline]=useState(current),[value,setValue]=useState<ScopeSelection|null>(current.scope),[pending,setPending]=useState(false),[unknown,setUnknown]=useState(false),[locked,setLocked]=useState(false),[denied,setDenied]=useState(false),[message,setMessage]=useState(''),[confirm,setConfirm]=useState<'ASSIGN'|'REVOKE'|null>(null),[receipt,setReceipt]=useState<Extract<ScopeResult,{state:'saved'}>['receipt']|null>(null);
 const operation=useRef<ScopeCommand|null>(null),busy=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 async function save(reconcile=false){
  if(busy.current||denied||locked)return;
  if(!reconcile){
   if(!confirm||baseline.role!=='MANAGER'||!baseline.active)return;
   let scope:ScopeSelection|null=null;
   if(confirm==='ASSIGN')try{scope=readScope(value);if(!scope)throw new Error('Choose management access explicitly.');}catch(e){setMessage(e instanceof Error?e.message:'Choose management access explicitly.');setConfirm(null);return;}
   const expected={operationId:crypto.randomUUID(),expectedEmployeeVersion:baseline.employeeUpdatedAt,expectedScopeRevision:baseline.scopeRevision,expectedRoleGeneration:baseline.roleGeneration};
   operation.current=confirm==='ASSIGN'?{...expected,action:'ASSIGN',scope:scope!}:{...expected,action:'REVOKE'};
  }
  const command=operation.current;if(!command)return;busy.current=true;setPending(true);setConfirm(null);setMessage('');const abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const response=await fetch('/api/company-access/operational-scopes/'+encodeURIComponent(baseline.employeeId),{method:'POST',headers:{'Content-Type':'application/json','x-nevora-company-access':'1','x-nevora-actor':actorId},body:JSON.stringify(command),cache:'no-store',credentials:'same-origin',redirect:'error',signal:abort.signal});
   if(!mounted.current)return;
   if(response.status===401||response.status===403){operation.current=null;setDenied(true);setUnknown(false);setReceipt(null);setValue(null);setMessage('Your current access does not allow management-access changes. Sign in again or contact your Owner.');return;}
   const result=readScopeResult(await response.json(),command.operationId,baseline.employeeId);if(!mounted.current)return;
   if(result.state==='saved'&&!response.ok)throw new Error('Receipt transport unavailable.');
   if(result.state==='saved'){setReceipt(result.receipt);setUnknown(false);setLocked(true);operation.current=null;setMessage(result.receipt.action==='REVOKE'?'Management access revoked. Reload for current access information.':'Management access saved. Reload for current access information.');}
   else if(result.state==='outcome_unknown'||reconcile){setUnknown(true);setMessage('This access change is not confirmed. Check the original change before starting another.');}
   else{operation.current=null;setUnknown(false);setLocked(result.state==='conflict'||result.state==='unavailable');setMessage(result.state==='conflict'?'Employee or management access changed. Reload and review current information before choosing a replacement.':result.state==='invalid'?result.fieldErrors.map(e=>e.message).join(' ')||'Review management access before saving.':'Management access is unavailable. Reload current information before changing it.');}
  }catch{if(mounted.current){setUnknown(true);setMessage('This access change is not confirmed. Check the original change before starting another.');}}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);request.current=null;}}
 }
 const applicable=baseline.role==='MANAGER'&&baseline.active;
 // T-11 (final pass): Management access on Quiet. The commands, confirmation and receipts are unchanged.
 return <section className="q-u4-panel" aria-labelledby={'scope-'+baseline.employeeId} aria-busy={pending}>
  <div className="q-grp"><h2 id={'scope-'+baseline.employeeId}>Management access</h2></div>
  {!denied&&applicable?<div className="q-details__body q-u4-scope"><ManagerOperationalScopeFields current={baseline} locations={locations} value={value} onChange={setValue} disabled={pending||unknown||locked} error={null}/></div>
   :<p className="q-empty" role="status">{denied?'Current management-access information is unavailable.':'Assign management access together with a Manager promotion or reactivation in Edit.'}</p>}
  {receipt?<p className="q-help q-u4-saved">Done: {receipt.action==='REVOKE'?'Management access revoked':'Management access saved'}. Reload to see current permissions.</p>:null}
  {message?<p className={receipt?'q-help':'q-error'} role={receipt?'status':'alert'}>{message}</p>:null}
  {confirm?<div className="q-u4-confirmbox" role="group" aria-label="Confirm management access change"><p className="q-u4-confirm">{confirm==='REVOKE'?'Revoke this Manager’s operational access? Their employee record and separate payroll permissions are preserved.':'Save this Manager’s selected operational access? This may add or remove the locations they can manage.'}</p>
   <button type="button" className={confirm==='REVOKE'?'q-btn q-u4-danger':'q-btn'} disabled={pending} onClick={()=>void save()}>{confirm==='REVOKE'?'Revoke management access':'Save management access'}</button>
   <button type="button" className="q-btn q-btn--quiet" disabled={pending} onClick={()=>setConfirm(null)}>Cancel</button></div>:null}
  <div className="q-u4-actions">
   {!denied&&applicable&&!unknown&&!locked&&!confirm?<><button type="button" className="q-btn" disabled={pending} onClick={()=>setConfirm('ASSIGN')}>Save management access</button><button type="button" className="q-btn q-btn--sec" disabled={pending||!baseline.scope} onClick={()=>setConfirm('REVOKE')}>Revoke management access</button></>:null}
   {unknown?<button type="button" className="q-btn q-btn--sec" disabled={pending} onClick={()=>void save(true)}>Check original access change</button>:null}
   {(locked||denied)?<button type="button" className="q-btn q-btn--sec" disabled={pending} onClick={()=>window.location.reload()}>Reload current employee</button>:null}
  </div>
 </section>;
}
