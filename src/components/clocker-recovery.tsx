'use client';
import {useRef,useState} from 'react';
import type {JournalReference} from '../lib/clocker/recovery-journal';
import {useClockerCopy,useClockerPresentation} from './clocker-language';
import {clockerOthersSavedText} from './clocker-copy';
import styles from './clocker.module.css';
import {ClockerIcon} from './clocker-icon';
/** Opaque references are assistance evidence, never permission to replay time. */
/** Direction B: a small teal link ("Something didn’t save?") that opens the saved references below it. Inline, it sits
 * in the ready screen's link row beside Refresh; otherwise under the state's actions.
 * Nov 10 review (NV-185): the panel scrolls inside itself, so opening it never stretches the page or moves the band's
 * clock; the current person's reference leads and their others wait behind "Show N more"; a locked kiosk has no app
 * to paste into, so there is no Copy reference. Ask Owner to review and its request are unchanged.
 * Nov 14 inspection: other people's saved punches on this tablet show as a count only (otherCount), never a reference.
 * Phase 6 (Nov 17, 2026): plain words ("Ask Owner to check", "Request sent"), the count in the singular and the plural
 * ("1 more saved on this tablet."), and 56px targets. The request, its reference and its retry are unchanged. */
export function ClockerRecoveryHandoff({references,otherCount=0,locationKey,commandId,inline=false}:{references:JournalReference[];otherCount?:number;locationKey:string;commandId:string|null;inline?:boolean}){
 const requestId=useRef<string|null>(null);const [displayId,setDisplayId]=useState<string|null>(null),[requestState,setRequestState]=useState<'idle'|'sending'|'saved'|'unknown'>('idle');
 const t=useClockerCopy(),{locale}=useClockerPresentation(),[open,setOpen]=useState(false),[all,setAll]=useState(false);
 const others=clockerOthersSavedText(locale,otherCount);
 async function requestReview(){
  if(requestState==='sending'||requestState==='saved')return;const id=requestId.current??(requestId.current=crypto.randomUUID());setDisplayId(id);setRequestState('sending');
  try{const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/review`,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{'content-type':'application/json','x-nevora-clocker':'1'},body:JSON.stringify({requestId:id,commandId})});const data:unknown=await response.json();if(!response.ok||!data||typeof data!=='object'||!('state'in data)||data.state!=='saved'||!('requestId'in data)||data.requestId!==id)throw Error();setRequestState('saved');}catch{setRequestState('unknown');}
 }
 const ordered=commandId?[...references.filter(r=>r.commandId===commandId),...references.filter(r=>r.commandId!==commandId)]:references;
 const shown=all?ordered:ordered.slice(0,1),more=ordered.length-shown.length;
 return <aside className={styles.handoff} data-inline={inline||undefined}>
  <button type="button" className={styles.link} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Hide help':'Something didn’t save?')}<ClockerIcon name="caret" size={16}/></button>
  {open?<div data-clocker-notice className={styles.handoffPanel}><p>{t('Something of yours is saved on this tablet for checking. Ask your Owner to check it. You can leave this screen; it stays saved.')}</p><button type="button" className={styles.btn} data-kind="secondary" disabled={requestState==='sending'||requestState==='saved'} onClick={()=>void requestReview()}>{t(requestState==='sending'?'Asking…':requestState==='saved'?'Request sent':requestState==='unknown'?'Ask again':'Ask Owner to check')}</button>{displayId?<p role="status">{t(requestState==='sending'?'Sending the request.':requestState==='saved'?'Your Owner will see it under Clocker recovery.':'We couldn’t confirm the request. Ask again; it won’t send twice.')} {t('Request reference')}: <code>{displayId}</code></p>:null}<ul>{shown.map((r,i)=><li key={r.commandId??i}>{r.commandId?<code>{r.commandId}</code>:<p>{t('One saved punch can’t be read. Ask your manager to check it.')}</p>}</li>)}</ul>{more>0||all&&ordered.length>1?<button type="button" className={styles.link} aria-expanded={all} onClick={()=>setAll(value=>!value)}>{all?t('Show fewer'):t('Show {count} more',{count:more})}</button>:null}{others?<p data-clocker-others-saved="">{others} {t('Each person can check their own after their PIN.')}</p>:null}<button type="button" className={styles.link} onClick={()=>setOpen(false)}>{t('Dismiss')}</button></div>:null}
 </aside>;
}
