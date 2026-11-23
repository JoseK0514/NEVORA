'use client';

import {useEffect,useRef,useState} from 'react';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import type {OwnerScopeContext,ScopeCommand,ScopeResult,ScopeSelection} from '@/lib/company-access/model';
import {readScope,readScopeResult} from './commands';
import {ManagerOperationalScopeFields} from './manager-operational-scope-fields';
import styles from './company-access.module.css';
import {accessCopy,commandMessage,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

export function ManagerOperationalScopePanel(props:{current:OwnerScopeContext;locations:{id:string;name:string}[];actorId:string;
 /** The person's language (Signed-in Spanish, Nov 23, 2026). */ lang?:AccessLang}){
 return <ScopePanel key={JSON.stringify([props.actorId,props.current.employeeId])} {...props}/>;
}
function ScopePanel({current,locations,actorId,lang:langProp}:{current:OwnerScopeContext;locations:{id:string;name:string}[];actorId:string;lang?:AccessLang}){
 // Signed-in Spanish (Nov 23, 2026): the person's language, unless the caller names one.
 const portalLang=usePortalLang(),lang=langProp??portalLang;
 const t=accessCopy(lang).scope;
 const [baseline]=useState(current),[value,setValue]=useState<ScopeSelection|null>(current.scope),[pending,setPending]=useState(false),[unknown,setUnknown]=useState(false),[locked,setLocked]=useState(false),[denied,setDenied]=useState(false),[message,setMessage]=useState(''),[confirm,setConfirm]=useState<'ASSIGN'|'REVOKE'|null>(null),[receipt,setReceipt]=useState<Extract<ScopeResult,{state:'saved'}>['receipt']|null>(null);
 const operation=useRef<ScopeCommand|null>(null),busy=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
 async function save(reconcile=false){
  if(busy.current||denied||locked)return;
  if(!reconcile){
   if(!confirm||baseline.role!=='MANAGER'||!baseline.active)return;
   let scope:ScopeSelection|null=null;
   if(confirm==='ASSIGN')try{scope=readScope(value);if(!scope)throw new Error(accessCopy('en').commands.chooseScope);}catch(e){setMessage(e instanceof Error?commandMessage(e.message,lang):accessCopy(lang).commands.chooseScope);setConfirm(null);return;}
   const expected={operationId:crypto.randomUUID(),expectedEmployeeVersion:baseline.employeeUpdatedAt,expectedScopeRevision:baseline.scopeRevision,expectedRoleGeneration:baseline.roleGeneration};
   operation.current=confirm==='ASSIGN'?{...expected,action:'ASSIGN',scope:scope!}:{...expected,action:'REVOKE'};
  }
  const command=operation.current;if(!command)return;busy.current=true;setPending(true);setConfirm(null);setMessage('');const abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const response=await fetch('/api/company-access/operational-scopes/'+encodeURIComponent(baseline.employeeId),{method:'POST',headers:{'Content-Type':'application/json','x-nevora-company-access':'1','x-nevora-actor':actorId},body:JSON.stringify(command),cache:'no-store',credentials:'same-origin',redirect:'error',signal:abort.signal});
   if(!mounted.current)return;
   if(response.status===401||response.status===403){operation.current=null;setDenied(true);setUnknown(false);setReceipt(null);setValue(null);setMessage(t.denied);return;}
   const result=readScopeResult(await response.json(),command.operationId,baseline.employeeId);if(!mounted.current)return;
   if(result.state==='saved'&&!response.ok)throw new Error('Receipt transport unavailable.');
   if(result.state==='saved'){setReceipt(result.receipt);setUnknown(false);setLocked(true);operation.current=null;setMessage(result.receipt.action==='REVOKE'?t.removedMessage:t.savedMessage);}
   else if(result.state==='outcome_unknown'||reconcile){setUnknown(true);setMessage(t.unknown);}
   else{operation.current=null;setUnknown(false);setLocked(result.state==='conflict'||result.state==='unavailable');setMessage(result.state==='conflict'?t.conflict:result.state==='invalid'?result.fieldErrors.map(e=>e.message).join(' ')||t.review:t.unavailable);}
  }catch{if(mounted.current){setUnknown(true);setMessage(t.unknown);}}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);request.current=null;}}
 }
 const applicable=baseline.role==='MANAGER'&&baseline.active;
 return <section className={'panel '+styles.stack} aria-labelledby={'scope-'+baseline.employeeId} aria-busy={pending}>
  <h2 id={'scope-'+baseline.employeeId} className={styles.heading}><ShieldCheckIcon size={22} weight="duotone" aria-hidden="true"/> {t.legend}</h2>
  {!denied&&applicable?<ManagerOperationalScopeFields current={baseline} locations={locations} value={value} onChange={setValue} disabled={pending||unknown||locked} error={null} lang={lang}/>:<p role="status">{denied?t.didntLoad:t.assignWith}</p>}
  {receipt&&<p className={styles.receipt}>{receipt.action==='REVOKE'?t.removed:t.saved}{t.reloadTail}</p>}
  {message&&<p role={receipt?'status':'alert'}>{message}</p>}
  {confirm&&<div className={styles.receipt} role="group" aria-label={t.confirmGroup}><p>{confirm==='REVOKE'?t.confirmRemove:t.confirmSave}</p><div className={styles.actions}><button type="button" className="button primary" disabled={pending} onClick={()=>void save()}>{confirm==='REVOKE'?t.remove:t.save}</button><button type="button" className="button secondary" disabled={pending} onClick={()=>setConfirm(null)}>{t.cancel}</button></div></div>}
  <div className={styles.actions}>
   {!denied&&applicable&&!unknown&&!locked&&<><button type="button" className="button primary" disabled={pending||!!confirm} onClick={()=>setConfirm('ASSIGN')}>{t.save}</button><button type="button" className="button secondary" disabled={pending||!!confirm||!baseline.scope} onClick={()=>setConfirm('REVOKE')}>{t.remove}</button></>}
   {unknown&&<button type="button" className="button secondary" disabled={pending} onClick={()=>void save(true)}>{t.check}</button>}
   {(locked||denied)&&<button type="button" className="button secondary" disabled={pending} onClick={()=>window.location.reload()}>{t.reloadEmployee}</button>}
  </div>
 </section>;
}
