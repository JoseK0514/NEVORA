'use client';
import {useRef,useState} from 'react';
import type {JournalReference} from '../lib/clocker/recovery-journal';
import {useClockerCopy} from './clocker-language';
import styles from './clocker-punch.module.css';
/** Opaque references are assistance evidence, never permission to replay time. */
export function ClockerRecoveryHandoff({references,locationKey,commandId}:{references:JournalReference[];locationKey:string;commandId:string|null}){
 const requestId=useRef<string|null>(null);const [displayId,setDisplayId]=useState<string|null>(null),[requestState,setRequestState]=useState<'idle'|'sending'|'saved'|'unknown'>('idle');
 const t=useClockerCopy(),[open,setOpen]=useState(false),[message,setMessage]=useState<string|null>(null);
 async function copy(reference:string){try{if(!navigator.clipboard)throw Error();await navigator.clipboard.writeText(reference);setMessage('Reference copied.');}catch{setMessage('Select and copy the reference shown below.');}}
 async function requestReview(){
  if(requestState==='sending'||requestState==='saved')return;const id=requestId.current??(requestId.current=crypto.randomUUID());setDisplayId(id);setRequestState('sending');
  try{const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/review`,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{'content-type':'application/json','x-nevora-clocker':'1'},body:JSON.stringify({requestId:id,commandId})});const data:unknown=await response.json();if(!response.ok||!data||typeof data!=='object'||!('state'in data)||data.state!=='saved'||!('requestId'in data)||data.requestId!==id)throw Error();setRequestState('saved');}catch{setRequestState('unknown');}
 }
 return <aside className={styles.handoff}>
  <button type="button" className="button ghost" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Hide saved action help':'Help with a saved action')}</button>
  {open?<div data-clocker-notice className={styles.notice}><p>{t('Ask your Owner to review a saved reference in their portal. You can leave this screen; the records stay saved.')}</p><button type="button" className="button secondary" disabled={requestState==='sending'||requestState==='saved'} onClick={()=>void requestReview()}>{t(requestState==='sending'?'Requesting review…':requestState==='saved'?'Review requested':requestState==='unknown'?'Retry original review request':'Ask Owner to review')}</button>{displayId?<p role="status">{t('Review request reference')}: <code>{displayId}</code> {t(requestState==='sending'?'Waiting for request confirmation.':requestState==='saved'?'Your Owner can find this in Clocker recovery.':'Request confirmation is unavailable. Keep this reference; retry uses the same request.')}</p>:null}<ul>{references.map((r,i)=><li key={r.commandId??i}>{r.commandId?<><code style={{overflowWrap:'anywhere'}}>{r.commandId}</code><button type="button" className="button secondary" onClick={()=>void copy(r.commandId!)}>{t('Copy reference')}</button></>:<p>{t('Unreadable recovery record — keep it saved for assistance')}</p>}</li>)}</ul>{message?<p role="status">{t(message)}</p>:null}<button type="button" className="button ghost" onClick={()=>setOpen(false)}>{t('Dismiss')}</button></div>:null}
 </aside>;
}
