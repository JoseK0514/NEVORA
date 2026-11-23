'use client';
import {useCallback,useEffect,useRef,useState,type Ref} from 'react';
import type {JournalReference} from '../lib/clocker/recovery-journal';
import {useClockerCopy,useClockerPresentation} from './clocker-language';
import {clockerOthersSavedText} from './clocker-copy';
import styles from './clocker.module.css';
import {ClockerIcon} from './clocker-icon';
/** Opaque references are assistance evidence, never permission to replay time. */
/* Saved-punch help. History: a small teal link ("Something didn’t save?") under a screen's actions, or inline beside
 * Refresh on the clock screen (Direction B, Nov 8); no Copy reference on a locked kiosk (NV-185); other people's saved
 * punches as a count only (Nov 14); plain words and 56px targets (Phase 6).
 * Phase 8 (Nov 17, 2026): the help is its own card state. The link opens it in place of the screen it was on, so it fits a
 * 1024x768, 768x1024 or 800x600 tablet without scrolling, with Back always in view. The person's saved references sit
 * behind one "Reference" disclosure, as on the receipt, never as raw codes in the body. The request to the Owner, its
 * reference and its retry are unchanged: one request id per saved punch, reused for every retry. */

export type ClockerReviewRequest={state:'idle'|'sending'|'saved'|'unknown';id:string|null;ask:()=>Promise<void>};
/** The "Ask Owner to check" request for one saved punch (or the tablet when the punch has no reference). It lives with the
 * clock screen, not inside the help, so closing and opening the help never mints a second request id. */
export function useClockerReviewRequest(locationKey:string,commandId:string|null):ClockerReviewRequest{
 const ids=useRef(new Map<string,string>()),sending=useRef(false);
 const [request,setRequest]=useState<{key:string;id:string;state:'sending'|'saved'|'unknown'}|null>(null);
 const key=commandId??'tablet-assistance';
 const current=request&&request.key===key?request:null;
 const ask=useCallback(async()=>{
  if(sending.current||current?.state==='saved')return;
  let id=ids.current.get(key);if(!id){id=crypto.randomUUID();ids.current.set(key,id);}
  sending.current=true;setRequest({key,id,state:'sending'});
  try{const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/review`,{method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{'content-type':'application/json','x-nevora-clocker':'1'},body:JSON.stringify({requestId:id,commandId})});const data:unknown=await response.json();if(!response.ok||!data||typeof data!=='object'||!('state'in data)||data.state!=='saved'||!('requestId'in data)||data.requestId!==id)throw Error();setRequest({key,id,state:'saved'});}
  catch{setRequest({key,id,state:'unknown'});}
  finally{sending.current=false;}
 },[current?.state,key,locationKey,commandId]);
 return {state:current?.state??'idle',id:current?.id??null,ask};
}

/** The link that opens the help. */
export function ClockerRecoveryLink({onOpen}:{onOpen:()=>void}){
 const t=useClockerCopy();
 return <button type="button" className={styles.link} data-clocker-help-link="" onClick={onOpen}><ClockerIcon name="info" size={18}/>{t('Something didn’t save?')}</button>;
}

/** The help as its own card state: what is kept, one quiet request to the Owner, the reference behind a disclosure, and
 * Back. Other people's saved punches are a count only.
 * Premium pass (Nov 18, 2026, #8): the title names the fact ("Your punch is kept on this tablet"), not the button's words.
 * Once the request is saved the button goes and its result stands in its place, a teal information line with no done mark
 * (the Owner has not checked anything yet); focus moves to Back, the way on. Sending and "not confirmed" keep the button. */
export function ClockerRecoveryHelp({references,otherCount=0,commandId,request,onBack,headingRef}:{references:JournalReference[];otherCount?:number;commandId:string|null;request:ClockerReviewRequest;onBack:()=>void;headingRef?:Ref<HTMLHeadingElement>}){
 const t=useClockerCopy(),{locale}=useClockerPresentation();
 const back=useRef<HTMLButtonElement>(null);
 const others=clockerOthersSavedText(locale,otherCount);
 const ordered=commandId?[...references.filter(r=>r.commandId===commandId),...references.filter(r=>r.commandId!==commandId)]:references;
 const codes=ordered.flatMap(r=>r.commandId?[r.commandId]:[]),unreadable=ordered.some(r=>!r.commandId);
 const many=references.length>1,sent=request.state==='saved';
 // The button that had focus is gone once the request is saved: hand focus to Back rather than to the page.
 useEffect(()=>{if(sent&&(document.activeElement===document.body||!document.activeElement?.isConnected))back.current?.focus({preventScroll:true});},[sent]);
 return <>
  <span className={styles.ring}><ClockerIcon name="info" size={28} mark/></span>
  <h1 ref={headingRef} tabIndex={-1} className={styles.title}>{t(many?'Your punches are kept on this tablet':'Your punch is kept on this tablet')}</h1>
  <p className={styles.smsg}>{t(many?'Your Owner can check them. You can leave this screen.':'Your Owner can check it. You can leave this screen.')}</p>
  {unreadable?<p className={styles.smsg}>{t('One saved punch can’t be read. Ask your manager to check it.')}</p>:null}
  {others?<p data-clocker-others-saved="" className={styles.quietLine}>{others} {t('Each person can check their own after their PIN.')}</p>:null}
  <div className={`${styles.stack} ${styles.helpStack}`}>
   {sent?null:<button type="button" className={styles.btn} data-kind="secondary" disabled={request.state==='sending'} onClick={()=>void request.ask()}>{t(request.state==='sending'?'Asking…':request.state==='unknown'?'Ask again':'Ask Owner to check')}</button>}
   {/* One live line for the request's result, in place from the start so every change is announced. */}
   <p role="status" className={sent||request.state==='unknown'?styles.msg:styles.quietLine} data-tone={sent?'teal':request.state==='unknown'?'amber':undefined} data-clocker-request={request.state}>
    {sent?<><ClockerIcon name="info" size={18}/><span>{t('Request sent. Your Owner will see it under Clocker recovery.')}</span></>
     :request.state==='unknown'?<><ClockerIcon name="unknown" size={18}/><span>{t('We couldn’t confirm the request. Ask again; it won’t send twice.')}</span></>
     :request.state==='sending'?t('Sending the request.'):''}
   </p>
   <button ref={back} type="button" className={styles.link} onClick={onBack}>{t('Back')}</button>
  </div>
  {/* Last, so opening it never pushes Back out of view: the codes for the Owner, one per line in one block. */}
  {codes.length||request.id?<details className={styles.reference}><summary>{t('Reference')}<ClockerIcon name="caret" size={16}/></summary>
   {codes.length?<code>{codes.map(code=><span key={code}>{code}</span>)}</code>:null}
   {request.id?<><span className={styles.refLabel}>{t('Request reference')}</span><code>{request.id}</code></>:null}
  </details>:null}
 </>;
}
