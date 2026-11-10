'use client';

import {useEffect,useRef,useState} from 'react';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import type {OwnerScopeContext,ScopeCommand,ScopeResult,ScopeSelection} from '@/lib/company-access/model';
import {readScope,readScopeResult} from './commands';
import {ManagerOperationalScopeFields} from './manager-operational-scope-fields';
import styles from './company-access.module.css';

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
   if(response.status===401||response.status===403){operation.current=null;setDenied(true);setUnknown(false);setReceipt(null);setValue(null);setMessage('Your access changed, so you can’t change manager access. Sign in again or ask your Owner.');return;}
   const result=readScopeResult(await response.json(),command.operationId,baseline.employeeId);if(!mounted.current)return;
   if(result.state==='saved'&&!response.ok)throw new Error('Receipt transport unavailable.');
   if(result.state==='saved'){setReceipt(result.receipt);setUnknown(false);setLocked(true);operation.current=null;setMessage(result.receipt.action==='REVOKE'?'Manager access removed. Reload to see the current access.':'Manager access saved. Reload to see the current access.');}
   else if(result.state==='outcome_unknown'||reconcile){setUnknown(true);setMessage('We couldn’t confirm the change. Check it before you make another.');}
   else{operation.current=null;setUnknown(false);setLocked(result.state==='conflict'||result.state==='unavailable');setMessage(result.state==='conflict'?'This person or their access changed. Reload to see the latest before changing it again.':result.state==='invalid'?result.fieldErrors.map(e=>e.message).join(' ')||'Review management access before saving.':'Management access is unavailable. Reload current information before changing it.');}
  }catch{if(mounted.current){setUnknown(true);setMessage('We couldn’t confirm the change. Check it before you make another.');}}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);request.current=null;}}
 }
 const applicable=baseline.role==='MANAGER'&&baseline.active;
 return <section className={'panel '+styles.stack} aria-labelledby={'scope-'+baseline.employeeId} aria-busy={pending}>
  <h2 id={'scope-'+baseline.employeeId} className={styles.heading}><ShieldCheckIcon size={22} weight="duotone" aria-hidden="true"/> Management access</h2>
  {!denied&&applicable?<ManagerOperationalScopeFields current={baseline} locations={locations} value={value} onChange={setValue} disabled={pending||unknown||locked} error={null}/>:<p role="status">{denied?'Manager access didn’t load.':'Assign management access together with a Manager promotion or reactivation in employee details.'}</p>}
  {receipt&&<p className={styles.receipt}>{receipt.action==='REVOKE'?'Manager access removed':'Manager access saved'}. Reload to see the current access.</p>}
  {message&&<p role={receipt?'status':'alert'}>{message}</p>}
  {confirm&&<div className={styles.receipt} role="group" aria-label="Confirm management access change"><p>{confirm==='REVOKE'?'Remove this person’s manager access? They keep their employee account and any payroll access.':'Save this manager’s locations? This may add or remove locations they can manage.'}</p><div className={styles.actions}><button type="button" className="button primary" disabled={pending} onClick={()=>void save()}>{confirm==='REVOKE'?'Remove manager access':'Save manager access'}</button><button type="button" className="button secondary" disabled={pending} onClick={()=>setConfirm(null)}>Cancel</button></div></div>}
  <div className={styles.actions}>
   {!denied&&applicable&&!unknown&&!locked&&<><button type="button" className="button primary" disabled={pending||!!confirm} onClick={()=>setConfirm('ASSIGN')}>Save manager access</button><button type="button" className="button secondary" disabled={pending||!!confirm||!baseline.scope} onClick={()=>setConfirm('REVOKE')}>Remove manager access</button></>}
   {unknown&&<button type="button" className="button secondary" disabled={pending} onClick={()=>void save(true)}>Check the change</button>}
   {(locked||denied)&&<button type="button" className="button secondary" disabled={pending} onClick={()=>window.location.reload()}>Reload current employee</button>}
  </div>
 </section>;
}
