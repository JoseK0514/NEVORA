'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {PHOTO_MAX_BYTES,type PhotoReference,type PhotoReviewPage,type PhotoReviewQuery,type PhotoReviewRecord} from '@/lib/clocker/photo-server/contracts';
import type {PhotoReviewDetailActionResult,PhotoReviewListActionResult,PhotoReviewRemoveActionResult} from '@/lib/clocker/photo-server/settings-types';
import {fetchPrivatePunchPhoto} from '@/lib/clocker/photo-client/private-photo';
import {readPhotoReviewPage,readPhotoReviewRecord,referenceKey,verifyPhotoRemoval} from '@/lib/clocker/photo-client/review';
import styles from './photo.module.css';
import {CameraIcon} from '@phosphor-icons/react/dist/ssr/Camera';
import {CorpButton} from '../corp/corp';
import {BState} from '../owner-b/b-kit';
import {Notice} from '@/app/app/settings/wave-c-kit';
import './photo-review.css';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {PHOTO_OWNER_COPY} from './photo-owner-copy';

export type ClockerPhotoReviewProps={initialPage:PhotoReviewPage;
 listAction:(query:PhotoReviewQuery)=>Promise<PhotoReviewListActionResult>;
 detailAction:(reference:PhotoReference)=>Promise<PhotoReviewDetailActionResult>;
 removeAction:(reference:PhotoReference)=>Promise<PhotoReviewRemoveActionResult>;
 readImage?:(locationKey:string,reference:PhotoReference,signal:AbortSignal)=>Promise<Blob>};
function recordedTime(record:PhotoReviewRecord,locale='en-US'){return new Intl.DateTimeFormat(locale,{timeZone:record.timeZone,month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(record.performedAt));}
export function ClockerPhotoReview({initialPage,listAction,detailAction,removeAction,readImage=fetchPrivatePunchPhoto}:ClockerPhotoReviewProps){
 const t=PHOTO_OWNER_COPY[usePortalLang()],labels=t.actions,when=(record:PhotoReviewRecord)=>recordedTime(record,t.locale);
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
   setFeedback({text:t.recordsLoaded,error:false});
  }catch{if(alive.current&&current===epoch.current)setFeedback({text:t.recordsUnconfirmed,error:true});}
  finally{if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 async function inspect(reference:PhotoReference){if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);releasePreview();setPreview(null);setSelected(null);setConfirmRemoval(false);const current=++epoch.current;lastReference.current=referenceKey(reference);
  try{const result=await detailAction(reference);if(!alive.current||current!==epoch.current)return;
   if(result.state!=='available'){setFeedback({text:result.message,error:true});return;}
   if(!result.record){setSelected(null);setFeedback({text:t.recordGone,error:true});return;}
   setSelected(readPhotoReviewRecord(result.record,reference));setRemovalUnconfirmed(false);
  }catch{if(alive.current&&current===epoch.current)setFeedback({text:t.recordUnconfirmed,error:true});}
  finally{if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 async function openImage(){if(busy.current||!selected?.hasImage)return;busy.current=true;setPending(true);setFeedback(null);releasePreview();setPreview(null);const current=++epoch.current;const controller=new AbortController();imageRequest.current=controller;
  try{const blob=await readImage(selected.locationKey,selected.reference,controller.signal);if(!alive.current||current!==epoch.current||controller.signal.aborted)return;
   if(blob.type!=='image/jpeg'||blob.size<1||blob.size>PHOTO_MAX_BYTES)throw Error('The private photo could not be verified.');
   const url=URL.createObjectURL(blob);privateUrl.current=url;setPreview(url);
  }catch{if(alive.current&&current===epoch.current&&!controller.signal.aborted)setFeedback({text:t.imageFailed,error:true});}
  finally{if(imageRequest.current===controller)imageRequest.current=null;if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 async function remove(){if(busy.current||!selected||!confirmRemoval||removalUnconfirmed)return;busy.current=true;setPending(true);setFeedback(null);setRemovalUnconfirmed(true);releasePreview();setPreview(null);const current=++epoch.current;const original=selected;
  try{const result=await removeAction(original.reference);if(!alive.current||current!==epoch.current)return;
   if(result.state!=='available'){setConfirmRemoval(false);setFeedback({text:result.message,error:true});return;}
   const outcome=verifyPhotoRemoval(result.result,original.reference);setConfirmRemoval(false);
   if(outcome.state==='unavailable'){setFeedback({text:t.removalUnconfirmed,error:true});return;}
   const updated:PhotoReviewRecord={...original,state:'removed',hasImage:false,removedAt:outcome.removedAt};setSelected(updated);setRemovalUnconfirmed(false);
   setPage(previous=>({...previous,records:previous.records.map(record=>referenceKey(record.reference)===referenceKey(original.reference)?updated:record)}));
   setFeedback({text:t.removalConfirmed,error:false});
  }catch{if(alive.current&&current===epoch.current){setConfirmRemoval(false);setFeedback({text:t.removalResultUnconfirmed,error:true});}}
  finally{if(current===epoch.current){busy.current=false;if(alive.current)setPending(false);}}
 }
 // Phase 2 (Nov 23, 2026): Settings in Direction B. The list is one white card of kit rows (the person, then the clock
 // action, place and time, then the photo's state) with one white Review on the right; the record opens as a second card.
 // The same reads, actions, focus moves and messages as before. The count sits beside the card's label once; the line
 // that said only an Owner can review photos is gone (only an Owner can open this page).
 const keep=(key:string,button:HTMLButtonElement|null)=>{if(button)reviewButtons.current.set(key,button);else reviewButtons.current.delete(key);};
 return <section className="c-photo-review" aria-busy={pending} aria-labelledby="punch-photo-review-title">
  <section className="c-card">
   <div className="c-card__head"><h2 className="c-card__label" id="punch-photo-review-title">{t.clockActions}{page.total?<span className="c-count c-num">{page.total}</span>:null}</h2>
    <div className="c-card__aside"><button type="button" className="c-link" disabled={pending} onClick={()=>void reload()}>{t.refresh}<span className="c-sr">{t.photoRecordsSr}</span></button></div></div>
   {pending?<p className="c-photo-review__lede" role="status">{t.checking}</p>:null}
   {!page.records.length?<BState kind="empty" icon={<CameraIcon weight="bold"/>} title={t.noRecords} line={t.noRecordsLine}/>
    :<ul className="c-rows" aria-label={t.recordsLabel}>{page.records.map(record=>{const key=referenceKey(record.reference);return <li key={key}><div className="c-row c-photo-review__row">
     <span className="c-row__main"><span className="c-row__title">{record.employeeName}</span>
      <span className="c-row__detail"><span>{labels[record.action]} · {record.locationName} · <time dateTime={record.performedAt}>{when(record)}</time></span></span>
      <span className="c-row__detail"><span>{t.states[record.state]}</span></span></span>
     <span className="c-row__trail"><button type="button" className="c-btn c-btn--secondary c-btn--md" disabled={pending} ref={button=>keep(key,button)} onClick={()=>void inspect(record.reference)}>{t.review}<span className="c-sr">{`, ${record.employeeName}, ${labels[record.action]}, ${when(record)}`}</span></button></span>
    </div></li>;})}</ul>}
   {page.nextCursor?<div className="c-card__foot"><CorpButton kind="secondary" size="md" full disabled={pending} onClick={()=>void reload(true)}>{t.loadMore}</CorpButton></div>:null}
   {/* Approved privacy wording (Jose, Nov 23, 2026): said once, as the list card's note (no longer also in the band). */}
   <p className="c-setb-cardnote">{t.privateNote}</p>
  </section>
  {feedback?<div className="c-photo-review__result" role={feedback.error?'alert':'status'}><Notice tone={feedback.error?'urgent':'done'}>{feedback.text}</Notice></div>:null}
  {selected?<section className="c-card" aria-labelledby="original-photo-detail">
   <div className="c-card__head"><h3 className="c-card__label" id="original-photo-detail" ref={detailHeading} tabIndex={-1}>{selected.employeeName} · {labels[selected.action]}</h3>
    <div className="c-card__aside"><button className="c-link" type="button" onClick={closeDetail}>{t.closeRecord}</button></div></div>
   <div className="c-photo-review__body">
    <p>{selected.locationName} · <time dateTime={selected.performedAt}>{when(selected)}</time></p><p className="c-photo-review__state">{t.states[selected.state]}</p>
    {selected.expiresAt?<p className="c-photo-review__fine">{t.retentionEnds} <time dateTime={selected.expiresAt}>{new Intl.DateTimeFormat(t.locale,t.locale==='en-US'?{timeZone:selected.timeZone,dateStyle:'medium',timeStyle:'short'}:{timeZone:selected.timeZone,month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(selected.expiresAt))}</time> ({selected.timeZone}).</p>:null}
    {preview?<div className={styles.privatePreview}><Image src={preview} alt={t.photoAlt(selected.employeeName,labels[selected.action])} width={640} height={640} unoptimized/></div>:null}
    {selected.hasImage?<div className="c-photo-review__acts"><CorpButton size="md" disabled={pending} onClick={()=>void openImage()}>{t.viewPhoto}</CorpButton>
     <CorpButton kind="secondary" size="md" disabled={pending||removalUnconfirmed} onClick={()=>setConfirmRemoval(true)}>{t.removePhoto}</CorpButton></div>:null}
    {removalUnconfirmed&&!pending?<div className="c-photo-review__acts"><CorpButton kind="secondary" size="md" onClick={()=>void inspect(selected.reference)}>{t.checkOriginal}</CorpButton></div>:null}
    {confirmRemoval?<div className="c-photo-review__confirm" role="group" aria-labelledby="photo-removal-q"><strong id="photo-removal-q">{t.removeQuestion}</strong><p>{t.removeBody}</p>
     <div className="c-photo-review__acts"><CorpButton kind="secondary" size="md" disabled={pending} onClick={()=>setConfirmRemoval(false)}>{t.keepPhoto}</CorpButton><CorpButton kind="danger" size="md" disabled={pending} onClick={()=>void remove()}>{t.confirmRemoval}</CorpButton></div></div>:null}
   </div>
   <p className="c-setb-cardnote">{t.openPrivately}</p>
  </section>:null}
 </section>;
}
