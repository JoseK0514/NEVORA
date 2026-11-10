'use client';
import {useRef,useState} from 'react';
import type {JournalReference} from '../lib/clocker/recovery-journal';
import {useClockerCopy} from './clocker-language';
import styles from './clocker.module.css';
import {ClockerIcon} from './clocker-icon';
/** Opaque references are assistance evidence, never permission to replay time. */
/** Direction B: a small teal link ("Help with a saved action") that opens the saved references below it. Inline, it sits
 * in the ready screen's link row beside Refresh Clock State; otherwise under the state's actions.
 * Nov 10 review (NV-185): the panel scrolls inside itself, so opening it never stretches the page or moves the band's
 * clock; the current person's reference leads and the tablet's others wait behind "Show N more"; a locked kiosk has no app
 * to paste into, so there is no Copy reference. Ask Owner to review and its request are unchanged. */
export function ClockerRecoveryHandoff({references,locationKey,commandId,inline=false}:{references:JournalReference[];locationKey:string;commandId:string|null;inline?:boolean}){
 const requestId=useRef<string|null>(null);const [displayId,setDisplayId]=useState<string|null>(null),[requestState,setRequestState]=useState<'idle'|'sending'|'saved'|'unknown'>('idle');
 const t=useClockerCopy(),[open,setOpen]=useState(false),[all,setAll]=useState(false);
 async function requestReview(){
  if(requestState==='sending'||requestState==='saved')return;const id=requestId.current??(requestId.current=crypto.randomUUID());setDisplayId(id);setRequestState('sending');
  try{const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/review`,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{'content-type':'application/json','x-nevora-clocker':'1'},body:JSON.stringify({requestId:id,commandId})});const data:unknown=await response.json();if(!response.ok||!data||typeof data!=='object'||!('state'in data)||data.state!=='saved'||!('requestId'in data)||data.requestId!==id)throw Error();setRequestState('saved');}catch{setRequestState('unknown');}
 }
 const ordered=commandId?[...references.filter(r=>r.commandId===commandId),...references.filter(r=>r.commandId!==commandId)]:references;
 const shown=all?ordered:ordered.slice(0,1),more=ordered.length-shown.length;
 return <aside className={styles.handoff} data-inline={inline||undefined}>
  <button type="button" className={styles.link} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Hide saved action help':'Help with a saved action')}<ClockerIcon name="caret" size={16}/></button>
  {open?<div data-clocker-notice className={styles.handoffPanel}><p>{t('Ask your Owner to review a saved reference in their portal. You can leave this screen; the records stay saved.')}</p><button type="button" className={styles.btn} data-kind="primary" disabled={requestState==='sending'||requestState==='saved'} onClick={()=>void requestReview()}>{t(requestState==='sending'?'Requesting review…':requestState==='saved'?'Review requested':requestState==='unknown'?'Retry original review request':'Ask Owner to review')}</button>{displayId?<p role="status">{t('Review request reference')}: <code>{displayId}</code> {t(requestState==='sending'?'Waiting for request confirmation.':requestState==='saved'?'Your Owner can find this in Clocker recovery.':'Request confirmation is unavailable. Keep this reference; retry uses the same request.')}</p>:null}<ul>{shown.map((r,i)=><li key={r.commandId??i}>{r.commandId?<code>{r.commandId}</code>:<p>{t('One saved punch can’t be read. Ask your manager to check it.')}</p>}</li>)}</ul>{more>0||all&&ordered.length>1?<button type="button" className={styles.link} aria-expanded={all} onClick={()=>setAll(value=>!value)}>{all?t('Show fewer'):t('Show {count} more',{count:more})}</button>:null}<button type="button" className={styles.link} onClick={()=>setOpen(false)}>{t('Dismiss')}</button></div>:null}
 </aside>;
}
