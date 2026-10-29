'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {PunchPhotoSession,type PhotoBindings,type PhotoSessionContext,type PhotoSessionView,type PhotoPhase} from '@/lib/clocker/photo-client/session';
import {photoResultMessage,offlinePhotoMessage} from '@/lib/clocker/photo-client/result-copy';
import {useClockerCopy,useClockerPresentation} from '../clocker-language';
import {CLOCKER_RECEIPT_CLEAR_MS} from '../clocker-privacy';
import {ClockerPhotoNotice} from './photo-notice';
import styles from './photo.module.css';
const actionNames={CLOCK_IN:'Clock In',CLOCK_OUT:'Clock Out',START_BREAK:'Start Break',END_BREAK:'End Break'};
const titles:Record<PhotoPhase,string>={setup_required:'Photo capture is unavailable',ready:'Photo for {action}',camera_starting:'Opening the camera…',camera_live:'Ready for your photo?',photo_review:'Use this photo?',camera_error:'The camera needs attention',intent_unavailable:'Recovery storage is unavailable',punch_sending:'Checking your time…',punch_unknown:'Check your clock action',punch_retry_allowed:'Check your clock action',photo_saving:'Saving your punch photo…',photo_unknown:'Time recorded. Check the photo.',complete:'Time recorded',expired:'Enter your PIN again',cancelled:'Camera closed'};
export type PunchPhotoFlowProps={context:PhotoSessionContext;bindings:PhotoBindings;timeZone:string;onExit(result:PhotoSessionView):void};
export function ClockerPunchPhotoFlow(props:PunchPhotoFlowProps){
 const key=`${props.context.intent.subject}:${JSON.stringify(props.context.intent.command)}:${props.context.proofExpiresAt}:${props.context.screenExpiresAt}`;
 return <PunchPhotoFlowSession key={key} {...props}/>;
}
function PunchPhotoFlowSession({context,bindings,timeZone,onExit}:PunchPhotoFlowProps){
 const t=useClockerCopy(),initial=useRef({context,bindings});const [session,setSession]=useState<PunchPhotoSession|null>(null);
 useEffect(()=>{const current=new PunchPhotoSession(initial.current.context,initial.current.bindings);setSession(current);return()=>current.dispose();},[]);
 return session?<ActivePhotoFlow session={session} timeZone={timeZone} onExit={onExit}/>:<section className={styles.flow}><p role="status">{t('Preparing your clock action…')}</p></section>;
}
function ActivePhotoFlow({session,timeZone,onExit}:{session:PunchPhotoSession;timeZone:string;onExit:(result:PhotoSessionView)=>void}){
 const t=useClockerCopy(),{locale}=useClockerPresentation(),state=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot);
 const video=useRef<HTMLVideoElement>(null),heading=useRef<HTMLHeadingElement>(null),exitRef=useRef(onExit);
 useEffect(()=>{exitRef.current=onExit;},[onExit]);
 const [offline,setOffline]=useState(false),camera=['camera_starting','camera_live'].includes(state.phase),busy=['camera_starting','punch_sending','photo_saving'].includes(state.phase);
 function exit(){session.cancel();exitRef.current(session.getSnapshot());}
 useEffect(()=>{
  const hidden=()=>{if(document.hidden)session.cancel();},leaving=()=>session.cancel(),escape=(event:KeyboardEvent)=>{if(event.key==='Escape')session.cancel();},network=()=>setOffline(!navigator.onLine);
  document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',escape);window.addEventListener('pagehide',leaving);window.addEventListener('offline',network);window.addEventListener('online',network);network();
  return()=>{document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',escape);window.removeEventListener('pagehide',leaving);window.removeEventListener('offline',network);window.removeEventListener('online',network);};
 },[session]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[state.phase]);
 useEffect(()=>{if(!['camera_live','photo_review'].includes(state.phase))return;const timer=setInterval(()=>void session.checkContext(),1500);return()=>clearInterval(timer);},[session,state.phase]);
 useEffect(()=>{if(state.phase==='ready'&&!state.requiresPhoto)void session.submit();},[session,state.phase,state.requiresPhoto]);
 useEffect(()=>{if(state.phase!=='complete')return;const timer=setTimeout(()=>{session.cancel();exitRef.current(session.getSnapshot());},CLOCKER_RECEIPT_CLEAR_MS);return()=>clearTimeout(timer);},[session,state.phase]);
 const error=state.cameraError==='CAMERA_DENIED'?'Camera access was declined. You can allow it in Safari settings or continue without a photo.':state.cameraError==='CAMERA_TIMEOUT'?'Camera permission was not completed in time. Try again while your PIN session is active.':state.cameraError==='CAPTURE_FAILED'?'A photo could not be captured. Check the camera and try again.':'The camera is unavailable. Continue without a photo or ask your Owner for help.';
 return <section className={styles.flow} aria-busy={busy} aria-labelledby="clocker-photo-title">
  <h1 id="clocker-photo-title" ref={heading} tabIndex={-1}>{t(titles[state.phase],{action:t(actionNames[state.action])})}</h1>
  {state.requiresPhoto&&['ready','setup_required','camera_error'].includes(state.phase)?<ClockerPhotoNotice policy={state.policy} notice={state.notice}/>:null}
  <div className={styles.cameraFrame} hidden={!camera&&!state.previewUrl}>
   <video ref={video} playsInline muted autoPlay className={styles.video} hidden={!camera} aria-label={t('Live camera preview')}/>
   {state.previewUrl?<Image src={state.previewUrl} alt={t('Temporary photo for this clock action')} width={640} height={640} unoptimized className={styles.preview}/>:null}
   {camera?<div className={styles.guide} aria-hidden="true"/>:null}
   {state.phase==='camera_starting'?<span className={styles.cameraStatus} role="status">{t('Allow camera access in Safari')}</span>:null}
  </div>
  {state.phase==='camera_live'?<p className={styles.description}>{t('Face the camera. Take a photo when you are ready.')}</p>:null}
  {state.phase==='photo_review'?<p className={styles.description}>{t('The camera is off. Confirm the photo to record your clock action.')}</p>:null}
  {state.phase==='camera_error'?<p role="alert" className={styles.notice}>{t(error)}</p>:null}
  {['punch_unknown','punch_retry_allowed'].includes(state.phase)?<p role="alert" className={styles.notice}>{t('The clock result is unconfirmed. Check the original action before continuing.')}</p>:null}
  {state.phase==='intent_unavailable'?<p role="alert" className={styles.notice}>{t('The recovery record could not be saved. No new request was sent. Allow browser storage or ask your Owner for help.')}</p>:null}
  {['photo_unknown','complete'].includes(state.phase)?<p role="status" className={styles.notice}>{t(photoResultMessage(state))}</p>:null}
  {['expired','cancelled'].includes(state.phase)?<p className={styles.description}>{t('The camera and private preview have been cleared.')}{' '}{t(state.receipt?'Your recorded time is preserved.':'Check any unconfirmed clock action after entering your PIN again.')}</p>:null}
  {state.receipt?<p className={styles.description}>{t('Time recorded at {time}',{time:new Intl.DateTimeFormat(locale==='es'?'es-PR':'en-US',{timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(state.receipt.performedAt))})}</p>:null}
  {offline?<p role="status" className={styles.notice}>{t(offlinePhotoMessage(state))}</p>:null}
  <div className={styles.actions}>
   {state.phase==='ready'&&state.requiresPhoto||state.phase==='camera_error'?<button type="button" className={styles.primary} onClick={()=>{if(video.current)void session.open(video.current);}}>{t('Open camera')}</button>:null}
   {state.phase==='camera_live'?<button type="button" className={styles.primary} onClick={()=>void session.capture()}>{t('Take photo')}</button>:null}
   {state.phase==='photo_review'?<><button type="button" className={styles.primary} onClick={()=>void session.submit()}>{t('Use photo & continue')}</button><button type="button" className={styles.secondary} onClick={()=>{if(video.current)void session.open(video.current);}}>{t('Retake photo')}</button></>:null}
   {state.fallbackAllowed&&['ready','setup_required','camera_live','photo_review','camera_error'].includes(state.phase)?<button type="button" className={styles.secondary} onClick={()=>void session.submitWithoutPhoto()}>{t('Continue without photo')}</button>:null}
   {['punch_unknown','punch_retry_allowed'].includes(state.phase)?<button type="button" className={styles.primary} onClick={()=>void session.checkPunch()}>{t('Check original action')}</button>:null}
   {state.phase==='punch_retry_allowed'?<button type="button" className={styles.secondary} onClick={()=>void session.submit()}>{t('Retry same clock action')}</button>:null}
   {state.phase==='intent_unavailable'?<button type="button" className={styles.primary} onClick={()=>void session.submit()}>{t('Try saving recovery record')}</button>:null}
   {state.phase==='photo_unknown'?<button type="button" className={styles.primary} onClick={()=>void session.checkPhoto()}>{t('Check photo status')}</button>:null}
   {state.phase==='photo_unknown'&&state.photoStatus?.state==='pending'&&state.previewUrl?<button type="button" className={styles.secondary} onClick={()=>void session.retryPhoto()}>{t('Retry saving same photo')}</button>:null}
   <button type="button" className={styles.quiet} onClick={exit}>{t(state.receipt||['expired','cancelled','complete'].includes(state.phase)?'Return to PIN':'Cancel & return')}</button>
  </div>
 </section>;
}
