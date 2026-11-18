'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import {AUTH_COPY,type AuthCopy,type AuthLang} from '@/lib/auth-copy';
import {AuthValidation} from '@/components/auth-premium/auth-validation';
import {MobileActivationView} from '@/components/mobile-access/activation-view';
import {useAccessJourney} from '@/components/mobile-access/journey';
import {useLayoutEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import type {ActivationResult} from '@/lib/auth/invitations/model';
import {ActivationPasswords} from './activation-passwords';
import {ActivationSubmit} from './activation-submit';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';
import {isPublicAccountProof} from '@/lib/auth/public-proof';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {IdentificationCardIcon} from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import {FingerprintIcon} from '@phosphor-icons/react/dist/ssr/Fingerprint';
import {UserSwitchIcon} from '@phosphor-icons/react/dist/ssr/UserSwitch';
import {ACCESS_COPY} from '@/components/access-recovery/copy';
import {AccessSteps} from '@/components/access-recovery/access-steps';
import {SupportReference} from '@/components/access-recovery/support-reference';
import {supportReferenceOf} from '@/components/access-recovery/support-reference-seam';
import {passkeysFlagOn} from '@/lib/passkeys/client';
import {MOBILE_ACCESS_COPY} from '@/components/mobile-access/copy';
import {BCallout} from '@/components/owner-b/b-kit';
import {noteParts} from '@/components/auth-premium/note-parts';
import {Whole} from '@/components/auth-premium/whole';

export type ActivationPhase='checking'|'missing'|'ready'|'pending'|'invalid'|'unavailable'|'outcome_unknown'|'activated';
/** Scrub first. Never retain a query string, encoded/ambiguous proof or history state. */
export function takeActivationFragment(location:Pick<Location,'hash'|'pathname'>,history:Pick<History,'replaceState'>):string|null {
 const fragment=location.hash.slice(1);
 try{history.replaceState(null,'',location.pathname);}catch{throw new Error('Invitation could not be opened safely.');}
 const candidate=fragment.startsWith('proof=')?fragment.slice(6):fragment;
 return isPublicAccountProof(candidate)?candidate:null;
}
export function readActivationResult(value:unknown):ActivationResult {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Activation response unavailable.');
 const o=value as Record<string,unknown>,keys=Object.keys(o).sort().join(',');
 if(o.state==='activated'&&keys==='employeeId,state'&&typeof o.employeeId==='string'&&o.employeeId.length>0&&o.employeeId.length<=128&&o.employeeId.trim()===o.employeeId)return {state:'activated',employeeId:o.employeeId};
 if(keys==='state'&&(o.state==='invalid'||o.state==='unavailable'||o.state==='outcome_unknown'))return {state:o.state};
 throw new Error('Activation response unavailable.');
}
/** U11 (Nov 17, 2026): `otherSession` is who is already signed in on this device, when it is someone (the page reads the
 * session it already has; nothing about the invitation is asked). `true` when there is a session without a name to show. */
export function ActivationInvitation({loginHref,workspaceName=null,lang='en',mobileAccess=false,otherSession=null}:{loginHref:string;workspaceName?:string|null;lang?:AuthLang;mobileAccess?:boolean;otherSession?:string|true|null}) {
 const [phase,setPhase]=useState<ActivationPhase>('checking');const [mismatch,setMismatch]=useState(false),[formVersion,setFormVersion]=useState(0),[employeeId,setEmployeeId]=useState<string|null>(null);
 // U11: an attempt made with no connection is stopped here, before anything is sent, so the invitation is kept and the
 // person can try again. The Support reference belongs to the one failed reply it came from and is dropped on the next try.
 const [offline,setOffline]=useState(false),[reference,setReference]=useState<string|null>(null);
 const success=useRef<HTMLDivElement|null>(null);
 // Inspection Nov 14, 2026 (PB-007): a link that arrived but can't be read is not "no link". Shape only, checked in the
 // browser: nothing is asked of the server, so nothing about any account is learned or shown.
 const unusable=useRef(false);
 const proof=useRef<string|null>(null),captured=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null),busy=useRef(false),generation=useRef(0),formRef=useRef<HTMLFormElement|null>(null);
 useLayoutEffect(()=>{
  mounted.current=true;
  function publishCurrent(version:number){queueMicrotask(()=>{if(mounted.current&&generation.current===version){setEmployeeId(null);setMismatch(false);setOffline(false);setReference(null);setFormVersion(version);setPhase(proof.current?'ready':unusable.current?'invalid':'missing');}});}
  function cancelRequest(){++generation.current;request.current?.abort();request.current=null;busy.current=false;formRef.current?.reset();}
  function capture(){
   cancelRequest();const version=generation.current;proof.current=null;
   const arrived=window.location.hash.length>1;
   try{proof.current=takeActivationFragment(window.location,window.history);}catch{window.location.replace('/activate');return;}
   unusable.current=arrived&&!proof.current;
   publishCurrent(version);
  }
  if(!captured.current){captured.current=true;capture();}else publishCurrent(generation.current);
  const online=()=>setOffline(false);
  window.addEventListener('hashchange',capture);window.addEventListener('online',online);
  return()=>{
   window.removeEventListener('hashchange',capture);window.removeEventListener('online',online);mounted.current=false;cancelRequest();
   // StrictMode replays setup/cleanup synchronously. A real unmount clears custody.
   queueMicrotask(()=>{if(!mounted.current)proof.current=null;});
  };
 },[]);
 useLayoutEffect(()=>{if(phase==='activated')success.current?.focus();},[phase]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;if(busy.current||!proof.current||!form.reportValidity())return;
  const fields=new FormData(form),password=String(fields.get('password')??'');
  if(password!==fields.get('confirmPassword')){setMismatch(true);form.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();return;}
  setMismatch(false);setReference(null);
  if(typeof navigator!=='undefined'&&navigator.onLine===false){setOffline(true);requestAnimationFrame(()=>document.getElementById('activation-offline')?.focus());return;}
  setOffline(false);busy.current=true;setPhase('pending');const version=generation.current,requestProof=proof.current;
  const isCurrent=()=>mounted.current&&generation.current===version;
  const abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const response=await fetch('/api/auth/activate',{method:'POST',cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'Content-Type':'application/json','x-nevora-activation':'1'},signal:abort.signal,body:JSON.stringify({proof:requestProof,password})});
   const result=readActivationResult(await response.json());if(!isCurrent())return;
   setReference(supportReferenceOf(response));
   if(result.state==='activated'&&response.ok){proof.current=null;form.reset();setEmployeeId(result.employeeId);setPhase('activated');}
   else if(result.state==='invalid'&&response.status===400){proof.current=null;form.reset();setPhase('invalid');}
   else if(result.state==='unavailable'){setPhase('unavailable');}
   else{proof.current=null;form.reset();setPhase('outcome_unknown');}
  }catch{if(isCurrent()){proof.current=null;form.reset();setPhase('outcome_unknown');}}
  finally{clearTimeout(timeout);if(isCurrent()){busy.current=false;request.current=null;}}
 }
 return <ActivationInvitationView lang={lang} mobileAccess={mobileAccess} offline={offline} supportReference={reference} otherSession={otherSession} passkeys={passkeysFlagOn()} key={formVersion} phase={phase} mismatch={mismatch} employeeId={employeeId} loginHref={loginHref} workspaceName={workspaceName} onSubmit={submit} formRef={formRef} successRef={success}/>;
}
/** Copies the confirmed sign-in ID; says so for two seconds. Selecting the field stays available as before. */
function CopyId({value,a}:{value:string;a:AuthCopy['activation']}) {
 const [copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{document.getElementById('activation-employee-id')?.focus();}}
 return <><button type="button" className="q-in__eye q-in__copy" onClick={()=>void copy()} aria-label={copied?a.copied:a.copyId}>{copied?<CheckIcon size={17} weight="bold" aria-hidden="true"/>:<CopySimpleIcon size={17} weight="bold" aria-hidden="true"/>}</button>
  <span className="q-sr" role="status" aria-live="polite">{copied?a.idCopied:''}</span></>;
}
/* Quiet (v4, approved Oct 23): Activate account with one line under the title. With no usable invitation: Back to sign in
 * and "No invitation? Ask your Owner." With one: the two passwords and Activate account. Activated: the Employee ID to keep.
 * The flow above is unchanged.
 * Inspection Nov 14, 2026: the line under the title says only what is true before the server has checked anything
 * (PB-002); an expired, used or unreadable link has its own message and one next step (PB-007); the success card leads
 * with a done mark, says to save the ID, and hands the ID to Sign in at every width (PB-003, JR-7). */
export function ActivationInvitationView({phase,mismatch=false,employeeId,loginHref,workspaceName=null,onSubmit,formRef,successRef,lang='en',mobileAccess=false,offline=false,supportReference=null,otherSession=null,passkeys=false}:{phase:ActivationPhase;lang?:AuthLang;mobileAccess?:boolean;mismatch?:boolean;employeeId?:string|null;loginHref:string;workspaceName?:string|null;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;formRef?:RefObject<HTMLFormElement|null>;successRef?:RefObject<HTMLDivElement|null>;
 /** U11: an attempt was stopped because the device is offline (nothing was sent). */
 offline?:boolean;
 /** U11: the Support reference of the one failed reply on screen, or null (always null until Codex's reader lands). */
 supportReference?:string|null;
 /** U11: someone is already signed in on this device (their name, or true). */
 otherSession?:string|true|null;
 /** U11: passkeys are offered in this build, so the form says where one is added. */
 passkeys?:boolean}) {
 const mobile=useMobilePresentation(mobileAccess,'activation-password activation-confirm-password'),journey=useAccessJourney();
 if(mobile)return <MobileActivationView {...{phase,mismatch,employeeId,loginHref,workspaceName,onSubmit,formRef,successRef,lang,offline,supportReference,otherSession,passkeys}}/>;
 const canSubmit=['ready','pending','unavailable'].includes(phase);const error=mismatch||phase==='unavailable';
 const signInHref=loginHref.replace('?activated=1&','?').replace('?activated=1','');
 // Review B4 (Nov 10, 2026, NV-055): every word comes from AUTH_COPY, so a Spanish page stays Spanish. NV-196: without a
 // usable invitation the page has one model at every width (the title and line, then one card with the next step and
 // "Already activated? Sign in"); the way back is the page's own back control, so the second grey button is gone.
 const t=AUTH_COPY[lang],a=t.activation,u=ACCESS_COPY[lang].activation;
 // U11 (Nov 17, 2026): every step says where the person is and what comes next (the steps line), what they are setting
 // (the facts under the passwords), and ends with "You’re set" and the ID carried to Sign in. One error style under a
 // field; an offline attempt sends nothing; an unknown result is never shown as failed or as done.
 const other=otherSession?<p className="ar-inline" data-tone="info"><UserSwitchIcon size={16} weight="bold" aria-hidden="true"/><span>{otherSession===true?u.otherSessionUnnamed:u.otherSession.replace('{name}',otherSession)}</span></p>:null;
 const workspace=workspaceName??t.workspaceUnavailable;
 // Phase 5 follow-up (PB-021, PB-015): the workplace is a chip under the title, as on Sign in, in the states whose line
 // does not already name it (with the form on screen U11's line says whose account it is); what else the page offers
 // is a text link under the card.
 const chip=workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null;
 if(phase==='activated'&&employeeId)return <>
  <div className="q-hd"><span className="q-auth__mark q-auth__mark--done q-auth__mark--head" aria-hidden="true"><CheckIcon size={28} weight="bold"/></span><h1>{u.doneTitle}</h1><p>{u.doneSub}</p></div>
  <div className="activation-success q-card" role="status" ref={successRef} tabIndex={-1}>
   <AccessSteps journey="activation" current={3} lang={lang}/>
   <span className="q-auth__mark q-auth__mark--done" aria-hidden="true"><CheckIcon size={28} weight="bold"/></span>
   <p className="q-sr">{a.activatedTitle}. {u.doneTitle}. {u.doneSub}</p>
   <div className="q-fl"><label htmlFor="activation-employee-id">{a.idForSignIn}</label>
    <div className="q-in__wrap"><input id="activation-employee-id" className="q-in" value={employeeId} readOnly autoComplete="off" aria-describedby="activation-employee-id-note" onFocus={event=>event.currentTarget.select()}/><CopyId value={employeeId} a={a}/></div>
    <p className="q-help" id="activation-employee-id-note">{a.saveId}</p></div>
   {other}
   <Link href={loginHref} className="q-btn" onClick={()=>journey.confirm(employeeId)}>{a.continueSignIn}</Link>
   <p className="q-auth__note ar-next">{u.doneNext}</p>
  </div>
 </>;
 // Phase 8 (Nov 17, 2026): without an invitation the card says where the link is, so the band carries the title alone
 // (it used to say the same thing twice, in the band and in the card).
 // Premium pass FD (Nov 18, 2026): the notes are the kit's callout (amber offline, red stop, amber "not confirmed"),
 // word for word. An expired or used invitation has one design at every width, the phone's: "You need a new invitation",
 // what happened and what to do as the line under the title, why and how long a link lasts, then the one button. The
 // workplace's name never splits across lines.
 const [chooseBefore,chooseAfter]=a.choose.split('{workspace}');
 const sub=phase==='checking'?`${a.opening} · ${workspace}`:canSubmit?(workspaceName?<>{chooseBefore}<Whole>{workspaceName}</Whole>{chooseAfter}</>:a.chooseNoWorkspace)
  :phase==='outcome_unknown'?a.notConfirmed:null;
 const expired=phase==='invalid',offlineNote=noteParts(u.offline),unavailableNote=noteParts(a.unavailable),unknownNote=noteParts(u.unknownFirst);
 return <>
  <div className="q-hd"><h1>{phase==='outcome_unknown'?u.unknownTitle:expired?MOBILE_ACCESS_COPY[lang].inviteInvalidTitle:t.activateTitle}</h1>{canSubmit||phase==='checking'?null:chip}
   {expired?<p className="activation-invitation-state" role="status">{a.invalid} {a.invalidNext}</p>:sub&&phase!=='outcome_unknown'?<p role={phase==='checking'?'status':undefined}>{sub}</p>:null}</div>
  <p className="q-sr" id="activation-intro">{a.intro}</p>
  {phase==='missing'?<span className="q-sr activation-invitation-state" role="status">{a.missing}</span>:null}
  {canSubmit&&<form ref={formRef} className="q-auth__form activation-form" onSubmit={onSubmit} aria-busy={phase==='pending'} aria-describedby="activation-intro">
   <AuthValidation/>
   <AccessSteps journey="activation" current={2} lang={lang}/>
   {offline?<div id="activation-offline" className="ar-note" role="alert" tabIndex={-1}><BCallout tone="amber" icon="offline" title={offlineNote.title??undefined}>{offlineNote.body}</BCallout></div>:null}
   {phase==='unavailable'&&!mismatch&&!offline?<><div id="activation-error" className="ar-note" role="alert"><BCallout tone="red" title={unavailableNote.title??undefined}>{unavailableNote.body}</BCallout></div><SupportReference reference={supportReference} lang={lang} id="activation-reference"/></>:null}
   <fieldset className="q-auth__fields" disabled={phase==='pending'}>
    <ActivationPasswords quiet lang={lang} mismatch={mismatch} errorId={error?'activation-error':undefined}/>
   </fieldset>
   <ul className="ar-facts" aria-label={u.factsLabel}>
    <li><KeyIcon size={16} weight="bold" aria-hidden="true"/><span>{u.passwordFact}</span></li>
    <li><IdentificationCardIcon size={16} weight="bold" aria-hidden="true"/><span>{u.idFact}</span></li>
    {passkeys?<li><FingerprintIcon size={16} weight="bold" aria-hidden="true"/><span>{u.passkeyFact}</span></li>:null}
   </ul>
   {other}
   <ActivationSubmit pending={phase==='pending'} idle={t.activateAccount} busy={t.activatingAccount} className="q-btn"/>
  </form>}
  {!canSubmit&&phase!=='checking'?<div className="q-card q-auth__card">
   {phase==='outcome_unknown'?null:<AccessSteps journey="activation" current={1} lang={lang}/>}
   {phase==='outcome_unknown'?<><div className="ar-note activation-invitation-state" role="alert"><BCallout tone="amber" icon="unknown" title={unknownNote.title??undefined}>{unknownNote.body}</BCallout></div>
    <Link href={signInHref} className="q-btn">{t.trySigningIn}</Link>
    <p className="q-auth__note">{a.unknown}</p><SupportReference reference={supportReference} lang={lang} id="activation-reference"/></>:null}
   {expired?<p className="q-auth__note">{u.invalidWhy} {u.invalidActive}</p>
    :phase==='missing'?<><p className="q-auth__note">{u.missingHow}</p><p className="q-auth__note">{t.quiet.noInvitation}</p></>:null}
   {mobileAccess&&phase!=='outcome_unknown'?<Link href="/access-help/invitation" className="q-btn">{a.inviteHelp}</Link>:null}
  </div>:null}
  <noscript><p className="q-help q-auth__alert">{a.noScript}</p></noscript>
  {phase!=='outcome_unknown'?<nav className="q-auth__links" aria-label={t.accountHelp}><Link href={signInHref}>{t.alreadyActivated}</Link></nav>
   :mobileAccess?<nav className="q-auth__links" aria-label={t.accountHelp}><Link href="/access-help/invitation">{a.inviteHelp}</Link></nav>:null}
 </>;
}
