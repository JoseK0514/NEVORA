'use client';
import {useState} from 'react';
import type {JournalReference} from '../lib/clocker/recovery-journal';
import {useClockerCopy} from './clocker-language';
import styles from './clocker-punch.module.css';
/** Opaque references are assistance evidence, never permission to replay time. */
export function ClockerRecoveryHandoff({references}:{references:JournalReference[]}){
 const t=useClockerCopy(),[open,setOpen]=useState(false),[message,setMessage]=useState<string|null>(null);
 async function copy(reference:string){try{if(!navigator.clipboard)throw Error();await navigator.clipboard.writeText(reference);setMessage('Reference copied.');}catch{setMessage('Select and copy the reference shown below.');}}
 return <aside className={styles.handoff}>
  <button type="button" className="button ghost" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Hide saved action help':'Help with a saved action')}</button>
  {open?<div data-clocker-notice className={styles.notice}><p>{t('Ask your Owner to review a saved reference in their portal. You can leave this screen; the records stay saved.')}</p><ul>{references.map((r,i)=><li key={r.commandId??i}>{r.commandId?<><code style={{overflowWrap:'anywhere'}}>{r.commandId}</code><button type="button" className="button secondary" onClick={()=>void copy(r.commandId!)}>{t('Copy reference')}</button></>:<p>{t('Unreadable recovery record — keep it saved for assistance')}</p>}</li>)}</ul>{message?<p role="status">{t(message)}</p>:null}<button type="button" className="button ghost" onClick={()=>setOpen(false)}>{t('Dismiss')}</button></div>:null}
 </aside>;
}
