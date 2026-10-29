'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {PHOTO_MAX_BYTES,type PhotoReference,type PhotoReviewPage,type PhotoReviewQuery,type PhotoReviewRecord} from '@/lib/clocker/photo-server/contracts';
import type {PhotoReviewDetailActionResult,PhotoReviewListActionResult,PhotoReviewRemoveActionResult} from '@/lib/clocker/photo-server/settings-types';
import {fetchPrivatePunchPhoto} from '@/lib/clocker/photo-client/private-photo';
import {photoReviewStateLabel,readPhotoReviewPage,readPhotoReviewRecord,referenceKey,verifyPhotoRemoval} from '@/lib/clocker/photo-client/review';
import styles from './photo.module.css';

const labels={CLOCK_IN:'Clock in',START_BREAK:'Start break',END_BREAK:'End break',CLOCK_OUT:'Clock out'};
export type ClockerPhotoReviewProps={initialPage:PhotoReviewPage;
 listAction:(query:PhotoReviewQuery)=>Promise<PhotoReviewListActionResult>;
 detailAction:(reference:PhotoReference)=>Promise<PhotoReviewDetailActionResult>;
 removeAction:(reference:PhotoReference)=>Promise<PhotoReviewRemoveActionResult>;
 readImage?:(locationKey:string,reference:PhotoReference,signal:AbortSignal)=>Promise<Blob>};
function recordedTime(record:PhotoReviewRecord){return new Intl.DateTimeFormat('en-US',{timeZone:record.timeZone,month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(record.performedAt));}
export function ClockerPhotoReview({initialPage,listAction,detailAction,removeAction,readImage=fetchPrivatePunchPhoto}:ClockerPhotoReviewProps){
 const [page,setPage]=useState(()=>readPhotoReviewPage(initialPage)),[selected,setSelected]=useState<PhotoReviewRecord|null>(null);
 const [pending,setPending]=useState(false),[preview,setPreview]=useState<string|null>(null),[confirmRemoval,setConfirmRemoval]=useState(false);
 const [removalUnconfirmed,setRemovalUnconfirmed]=useState(false);
 const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);
 const busy=useRef(false),alive=useRef(false),epoch=useRef(0),privateUrl=useRef<string|null>(null),imageRequest=useRef<AbortController|null>(null);
 const detailHeading=useRef<HTMLHeadingElement>(null),reviewButtons=useRef(new Map<string,HTMLButtonElement>()),lastReference=useRef<string|null>(null);
 function invalidateRequests(){epoch.current+=1;return epoch.current;}
 function releasePreview(){imageRequest.current?.abort();imageRequest.current=null;if(privateUrl.current){URL.revokeObjectURL(privateUrl.current);privateUrl.current=null;}}
 function closeDetail(){invalidateRequests();releasePreview();busy.current=false;setPending(false);setPreview(null);setSelected(null);setConfirmRemoval(false);
  const previous=lastReference.current;if(previous)reviewButtons.current.get(previous)?.focus();}
 useEffect(()=>{
  alive.current=true;
  const leaving=()=>{invalidateRequests();releasePreview();busy.current=false;setPending(false);setPreview(null);setSelected(null);setConfirmRemoval(false);};
  const hidden=()=>{if(document.hidden)leaving();};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){leaving();const previous=lastReference.current;if(previous)reviewButtons.current.get(previous)?.focus();}};
  document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',escape);window.addEventListener('pagehide',leaving);
  return()=>{alive.current=false;invalidateRequests();releasePreview();document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',escape);window.removeEventListener('pagehide',leaving);};
 },[]);
 useEffect(()=>{if(selected)detailHeading.current?.focus({preventScroll:true});},[selected]);
 async function reload(more=false){if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);const current=++epoch.current;
  // A new protected read invalidates the old private detail immediately. Denial
  // or provider failure must not leave an already opened image/actions visible.
  releasePreview();setPreview(null);setSelected(null);setConfirmRemoval(false);
  try{const result=await listAction({limit:20,cursor:more?page.nextCursor:null});if(!alive.current||current!==epoch.current)return;
   if(result.state!=='available'){setFeedback({text:result.message,error:true});return;}
   const fresh=readPhotoReviewPage(result.page);
   setPage(previous=>more?{...fresh,records:[...previous.records,...fresh.records.filter(record=>!previous.records.some(old=>referenceKey(old.reference)===referenceKey(record.reference)))]}:fresh);
   if(!more){releasePreview();setPreview(null);setSelected(null);setConfirmRemoval(false);}
   setFeedback({text:'Current company photo records loaded.',error:false});
  }catch{if(alive.current&&current===epoch.current)setFeedback({text:'The latest photo records could not be confirmed. Previous results are still shown.',error:true});}
  finally{if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 async function inspect(reference:PhotoReference){if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);releasePreview();setPreview(null);setSelected(null);setConfirmRemoval(false);const current=++epoch.current;lastReference.current=referenceKey(reference);
  try{const result=await detailAction(reference);if(!alive.current||current!==epoch.current)return;
   if(result.state!=='available'){setFeedback({text:result.message,error:true});return;}
   if(!result.record){setSelected(null);setFeedback({text:'This original photo record is no longer available. Refresh the company list.',error:true});return;}
   setSelected(readPhotoReviewRecord(result.record,reference));setRemovalUnconfirmed(false);
  }catch{if(alive.current&&current===epoch.current)setFeedback({text:'The original photo record could not be confirmed. No photo was opened.',error:true});}
  finally{if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 async function openImage(){if(busy.current||!selected?.hasImage)return;busy.current=true;setPending(true);setFeedback(null);releasePreview();setPreview(null);const current=++epoch.current;const controller=new AbortController();imageRequest.current=controller;
  try{const blob=await readImage(selected.locationKey,selected.reference,controller.signal);if(!alive.current||current!==epoch.current||controller.signal.aborted)return;
   if(blob.type!=='image/jpeg'||blob.size<1||blob.size>PHOTO_MAX_BYTES)throw Error('The private photo could not be verified.');
   const url=URL.createObjectURL(blob);privateUrl.current=url;setPreview(url);
  }catch{if(alive.current&&current===epoch.current&&!controller.signal.aborted)setFeedback({text:'The private image could not be opened. Check this original record again; it may have expired or been removed.',error:true});}
  finally{if(imageRequest.current===controller)imageRequest.current=null;if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 async function remove(){if(busy.current||!selected||!confirmRemoval||removalUnconfirmed)return;busy.current=true;setPending(true);setFeedback(null);setRemovalUnconfirmed(true);releasePreview();setPreview(null);const current=++epoch.current;const original=selected;
  try{const result=await removeAction(original.reference);if(!alive.current||current!==epoch.current)return;
   if(result.state!=='available'){setConfirmRemoval(false);setFeedback({text:result.message,error:true});return;}
   const outcome=verifyPhotoRemoval(result.result,original.reference);setConfirmRemoval(false);
   if(outcome.state==='unavailable'){setFeedback({text:'Photo removal could not be confirmed. Check the original record before trying again.',error:true});return;}
   const updated:PhotoReviewRecord={...original,state:'removed',hasImage:false,removedAt:outcome.removedAt};setSelected(updated);setRemovalUnconfirmed(false);
   setPage(previous=>({...previous,records:previous.records.map(record=>referenceKey(record.reference)===referenceKey(original.reference)?updated:record)}));
   setFeedback({text:'Punch photo removal confirmed. The time record is preserved. Backup handling follows your company photo notice.',error:false});
  }catch{if(alive.current&&current===epoch.current){setConfirmRemoval(false);setFeedback({text:'The removal result is unconfirmed. Check the original record before trying again.',error:true});}}
  finally{if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 return <section className={styles.review} aria-busy={pending} aria-labelledby="punch-photo-review-title">
  <div className={styles.reviewToolbar}><div><h2 id="punch-photo-review-title">Company punch photos</h2><p className={styles.description}>{page.total} original clock {page.total===1?'action':'actions'} in the current company. Only an authorized Owner can review photos.</p></div>
   <button type="button" className={styles.secondary} disabled={pending} onClick={()=>void reload()}>Refresh photo records</button></div>
  {feedback?<p className={styles.notice} role={feedback.error?'alert':'status'}>{feedback.text}</p>:null}
  {pending?<p className={styles.description} role="status">Checking the original photo record…</p>:null}
  {!page.records.length?<div className={styles.notice}><h3>No punch photo records yet</h3><p>Photo records appear after an authorized clock action. No camera or employee photo collection is started by this page.</p></div>:<ul className={styles.reviewList}>{page.records.map(record=><li key={referenceKey(record.reference)} className={styles.reviewRow}>
   <div><strong>{record.employeeName}</strong><p>{labels[record.action]} · {record.locationName}</p><time dateTime={record.performedAt}>{recordedTime(record)}</time><p className={styles.reviewState}>{photoReviewStateLabel(record.state)}</p></div>
   <button type="button" className={styles.secondary} disabled={pending} ref={button=>{const key=referenceKey(record.reference);if(button)reviewButtons.current.set(key,button);else reviewButtons.current.delete(key);}} onClick={()=>void inspect(record.reference)} aria-label={`Review ${record.employeeName}, ${labels[record.action]}, ${recordedTime(record)}`}>Review record</button>
  </li>)}</ul>}
  {page.nextCursor?<button type="button" disabled={pending} className={styles.secondary} onClick={()=>void reload(true)}>Load more photo records</button>:null}
  {selected?<section className={styles.reviewDetail} aria-labelledby="original-photo-detail">
   <div className={styles.reviewToolbar}><h3 id="original-photo-detail" ref={detailHeading} tabIndex={-1}>{selected.employeeName} · {labels[selected.action]}</h3><button className={styles.quiet} type="button" onClick={closeDetail}>Close record</button></div>
   <p>{selected.locationName} · <time dateTime={selected.performedAt}>{recordedTime(selected)}</time></p><p>{photoReviewStateLabel(selected.state)}</p>
   {selected.expiresAt?<p className={styles.description}>Photo retention ends <time dateTime={selected.expiresAt}>{new Intl.DateTimeFormat('en-US',{timeZone:selected.timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(selected.expiresAt))}</time> ({selected.timeZone}).</p>:null}
   {preview?<div className={styles.privatePreview}><Image src={preview} alt={`Private punch photo for ${selected.employeeName}'s ${labels[selected.action].toLowerCase()}`} width={640} height={640} unoptimized/></div>:null}
   {selected.hasImage?<div className={styles.footer}><button className={styles.primary} type="button" disabled={pending} onClick={()=>void openImage()}>View private photo</button>
    <button className={styles.secondary} type="button" disabled={pending||removalUnconfirmed} onClick={()=>setConfirmRemoval(true)}>Remove photo</button></div>:null}
   {removalUnconfirmed&&!pending?<button className={styles.secondary} type="button" onClick={()=>void inspect(selected.reference)}>Check original record</button>:null}
   {confirmRemoval?<div className={styles.notice} role="group" aria-label="Confirm photo removal"><strong>Remove this punch photo?</strong><p>The time record stays intact. This removes the private stored image; backup handling follows your company photo notice.</p>
    <div className={styles.footer}><button className={styles.secondary} disabled={pending} type="button" onClick={()=>setConfirmRemoval(false)}>Keep photo</button><button className={styles.danger} disabled={pending} type="button" onClick={()=>void remove()}>Confirm photo removal</button></div></div>:null}
   <p className={styles.description}>Images open privately on request and clear when you close the record or leave this screen. No photo download or bulk export is provided.</p>
  </section>:null}
 </section>;
}
