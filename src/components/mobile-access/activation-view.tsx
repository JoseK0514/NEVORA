'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {ActivationSubmit} from '@/app/activate/activation-submit';
import type {ActivationPhase} from '@/app/activate/activation-invitation';
import type {AuthLang} from '@/lib/auth-copy';
import {MOBILE_ACCESS_COPY} from './copy';
import {AccessPasswordPair} from './password-pair';
import {useAccessJourney} from './journey';

export function MobileActivationView({phase,mismatch=false,employeeId,loginHref,workspaceName,onSubmit,formRef,successRef,lang}:{phase:ActivationPhase;mismatch?:boolean;employeeId?:string|null;loginHref:string;workspaceName?:string|null;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;formRef?:RefObject<HTMLFormElement|null>;successRef?:RefObject<HTMLDivElement|null>;lang:AuthLang}) {
 const t=MOBILE_ACCESS_COPY[lang],journey=useAccessJourney(),input=useRef<HTMLInputElement>(null),version=useRef({generation:0}),[copyStatus,setCopyStatus]=useState('');
 useEffect(()=>{const lifetime=version.current;lifetime.generation++;return()=>{lifetime.generation++;};},[employeeId,lang]);
 const canSubmit=['ready','pending','unavailable'].includes(phase),signInHref=loginHref.replace('?activated=1&','?').replace('?activated=1','');
 async function copyId(){const current=version.current.generation;try{if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(employeeId!);if(current===version.current.generation)setCopyStatus(t.copied);}catch{if(current===version.current.generation){input.current?.focus();input.current?.select();setCopyStatus(t.copyFallback);}}}
 if(phase==='activated'&&employeeId)return <div className="activation-success" role="status" ref={successRef} tabIndex={-1}>
  <div className="ma-receipt-mark"><CheckIcon size={28} aria-hidden="true"/></div><div className="q-hd"><h1>{t.activatedTitle}</h1><p>{t.activatedSub}</p></div>
  <div className="ma-id-receipt"><div className="q-fl"><label htmlFor="activation-employee-id">{t.idForSignIn}</label><div className="q-in__wrap"><input ref={input} id="activation-employee-id" className="q-in" value={employeeId} readOnly autoComplete="off" onFocus={e=>e.currentTarget.select()}/><button type="button" className="q-in__eye" aria-label={t.copyId} onClick={()=>void copyId()}><CopySimpleIcon size={20} aria-hidden="true"/></button></div></div><p className="ma-note" aria-live="polite">{copyStatus||t.idReceiptHint}</p></div>
  <Link href={loginHref} className="q-btn" onClick={()=>journey.confirm(employeeId)}>{t.continueSignIn}</Link>
 </div>;
 const title=canSubmit?t.inviteTitle:phase==='invalid'?t.inviteInvalidTitle:phase==='outcome_unknown'?t.inviteUnknownTitle:t.activateTitle;
 const sub=phase==='checking'?(lang==='es'?'Abriendo tu invitación…':'Opening your invitation…'):canSubmit?t.inviteSub.replace('{workplace}',workspaceName??t.workspaceUnavailable):phase==='invalid'?t.inviteInvalidBody:phase==='outcome_unknown'?t.inviteUnknownBody:t.activateSub;
 return <><div className="q-hd"><h1>{title}</h1><p role={phase==='checking'?'status':undefined}>{sub}</p></div>
  {canSubmit?<form ref={formRef} className="q-auth__form activation-form" onSubmit={onSubmit} aria-busy={phase==='pending'}><fieldset className="q-auth__fields" disabled={phase==='pending'}><AccessPasswordPair prefix="activation" lang={lang} mismatch={mismatch} newLabel={t.createPassword}/>{mismatch?<p id="activation-error" className="q-auth__alert" role="alert">{t.mismatch}</p>:phase==='unavailable'?<p id="activation-error" className="q-auth__alert" role="alert">{t.inviteUnavailable}</p>:null}</fieldset><ActivationSubmit pending={phase==='pending'} idle={t.activateAccount} busy={t.activating} className="q-btn"/></form>:null}
  <div className="ma-actions">{phase!=='checking'&&!canSubmit?<Link href="/access-help/invitation" className="q-btn">{t.inviteHelp}</Link>:null}<Link className="q-btn q-btn--quiet" href={signInHref}>{t.alreadyActivated}</Link></div>
  {canSubmit?<details className="ma-details"><summary><CaretRightIcon size={16} aria-hidden="true"/>{t.inviteAbout}</summary><p>{t.inviteExpires}</p></details>:null}
  <noscript><p className="q-help">{lang==='es'?'Activa JavaScript para abrir la invitación segura de tu trabajo.':'Enable JavaScript to open your workplace’s secure invitation.'}</p></noscript>
 </>;
}
