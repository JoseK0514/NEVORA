'use client';

import {CompactActionLabel} from '../compact-action-label';
import {useEffect,useRef,useState,useSyncExternalStore,type RefObject} from 'react';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {createPasskeyManager,type PasskeyState} from '../../lib/passkeys/management';
import {passkeysAvailable,passkeysFlagOn,type Passkey} from '../../lib/passkeys/client';
import {useEmployeeMobile} from './use-mobile';
import {BState} from '../owner-b/b-kit';
import {PASSKEY_COPY} from '../../lib/passkeys/copy';
import './account-corp.css';
import {usePortalLang,type PortalLang} from '@/lib/i18n/portal-lang';
import {ACCOUNT_LOCALE} from '../employee-b/account-copy';
import {passkeysCopy} from './passkeys-copy';

const subscribe=()=>()=>{};
const date=(value:string,lang:PortalLang)=>new Date(value).toLocaleDateString(ACCOUNT_LOCALE[lang],{month:'short',day:'numeric',year:'numeric'});
type ViewProps={mobile?:boolean;state:PasskeyState;supported:boolean;confirm:Passkey|null;onAdd:()=>void;onRefresh:()=>void;onRemove:(id:string)=>void;onReview:(key:Passkey,button:HTMLButtonElement)=>void;onKeep:()=>void;onCancel:()=>void;addRef?:RefObject<HTMLButtonElement|null>;confirmationRef?:RefObject<HTMLDivElement|null>;feedbackRef?:RefObject<HTMLParagraphElement|null>};

/** One presentation on every width (board style): a "Saved passkeys" card with one row per key, the review inline, and
 * one primary Add a passkey. The device ceremony, removal review and refresh are unchanged. */
export function EmployeePasskeyView({state,supported,confirm,onAdd,onRefresh,onRemove,onReview,onKeep,onCancel,addRef,confirmationRef,feedbackRef}:ViewProps){
 const lang=usePortalLang(),t=passkeysCopy[lang];
 const ready=state.phase==='ready',keys=ready?state.passkeys??[]:[],busy=state.busy!==null;
 const reviewed=ready?keys.find(key=>key.id===confirm?.id):null;
 if(state.phase==='ended')return null;
 // Batch 1 (item 18): a card at every width; the kept panel around it is no longer drawn as one on wide screens.
 if(state.phase==='disabled')return <div className="c-card" data-passkey-state="disabled">
  <BState kind="locked" title={PASSKEY_COPY[lang].unavailableHere} line={PASSKEY_COPY[lang].passwordStillWorks}/>
 </div>;
 const status=state.phase==='loading'?t.checking:state.phase==='paused'&&!busy?t.paused:state.phase==='unavailable'?(state.needsRefresh?t.checkFirst:t.couldntCheck):null;
 return <>
  <section className="c-card em-passkeys" aria-labelledby="passkeys-title" data-passkey-state={state.phase}>
   <div className="c-card__head"><h2 className="c-card__label" id="passkeys-title">{t.saved}</h2></div>
   {ready&&keys.length?<ul className="c-rows" aria-label={t.yours}>{keys.map(key=><li key={key.id}><div className="c-row">
    <span className="c-row__icon" aria-hidden="true"><KeyIcon weight="bold" className="c-ic"/></span>
    <span className="c-row__main"><span className="c-row__title c-row__title--b">{key.name}</span><span className="c-row__detail"><span>{t.addedLead}{date(key.createdAt,lang)} · {key.lastUsedAt?t.lastUsed.replace('{date}', date(key.lastUsedAt,lang)):t.notUsed}</span></span></span>
    <button type="button" className="em-account-textbtn em-account-textbtn--danger" aria-label={t.removeLabel.replace('{name}', () => key.name)} disabled={busy||state.needsRefresh||!!reviewed} onClick={event=>onReview(key,event.currentTarget)}>{t.remove}</button>
   </div></li>)}</ul>:null}
   <div className="c-card__body em-passkeys-body">
    {ready&&!keys.length?<p className="em-passkeys-empty"><b>{t.noneYet}</b>{t.passwordWorks}</p>:null}
    {ready&&keys.length?null:<p className="em-passkeys-intro">{t.intro}</p>}
    {status?<p className="c-note" role="status">{status}</p>:null}
    {state.phase==='denied'?<p className="c-note" role="status">{t.sessionChanged}<a className="c-link" href="/login">{t.signInAgain}</a>{t.signInAgainTail}</p>:null}
    {ready&&!supported?<p className="c-note">{t.cantCreate}</p>:null}
    {busy?<p className="c-note" role="status">{state.busy==='device'?t.busy.device:state.busy==='removing'?t.busy.removing:state.busy==='verifying'?t.busy.verifying:t.busy.options}</p>:null}
    <p className="em-passkeys-feedback c-note" role="status" aria-live="polite" tabIndex={-1} ref={feedbackRef}>{state.notice}</p>
    {ready&&!reviewed&&supported?<button ref={addRef} type="button" className="c-btn c-btn--full" disabled={busy||state.needsRefresh} onClick={onAdd}>{lang==='es'?<CompactActionLabel full={t.add} short={t.addShort} />:t.add}</button>:null}
    {busy&&(state.busy==='device'||state.busy==='options')?<button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={onCancel}>{t.cancelSetup}</button>:null}
    {!busy&&(state.phase==='unavailable'||state.phase==='paused')?<button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={onRefresh}>{t.refresh}</button>:null}
   </div>
  </section>
  {reviewed?<div className="c-card em-passkeys-confirmation" role="group" aria-labelledby="passkey-remove-title" aria-describedby="passkey-remove-body" tabIndex={-1} ref={confirmationRef}>
   <div className="c-card__head"><h2 className="c-card__label" id="passkey-remove-title">{t.removeTitleLead}{reviewed.name}{t.removeTitleTail}</h2></div>
   <div className="c-card__body">
    <p id="passkey-remove-body">{t.removeBody}</p>
    {keys.length===1?<p className="em-passkeys-last">{t.last}</p>:null}
    <div className="c-btns"><button type="button" className="c-btn c-btn--secondary" disabled={busy} onClick={onKeep}>{t.keep}</button><button type="button" className="c-btn c-btn--danger" disabled={busy} onClick={()=>onRemove(reviewed.id)}>{t.removePasskey}</button></div>
   </div>
  </div>:null}
  <p className="c-note">{t.biometric}</p>
 </>;
}

/** Stable lifetime; responsive changes replace presentation, never a ceremony. */
export function EmployeePasskeySection({authority}:{authority:string}){
 const mobile=useEmployeeMobile(),flag=passkeysFlagOn(),lang=usePortalLang();
 const supported=useSyncExternalStore(subscribe,()=>passkeysAvailable()&&typeof navigator.credentials?.create==='function'&&window.isSecureContext,()=>false);
 const [state,setState]=useState<PasskeyState>({phase:'loading',busy:null,passkeys:null,notice:'',needsRefresh:false});
 const [confirm,setConfirm]=useState<Passkey|null>(null),owner=useRef<ReturnType<typeof createPasskeyManager>|null>(null);
 const add=useRef<HTMLButtonElement>(null),confirmation=useRef<HTMLDivElement>(null),feedback=useRef<HTMLParagraphElement>(null),opener=useRef<HTMLButtonElement|null>(null),completion=useRef<'add'|'remove'|null>(null);
 useEffect(()=>{
  if(!flag)return;
  const manager=createPasskeyManager(authority,()=>{if(manager.state.phase!=='ready')setConfirm(null);setState({...manager.state});},lang);owner.current=manager;
  const resume=()=>{if(document.visibilityState!=='hidden'&&navigator.onLine!==false)void manager.resume();};
  const blur=()=>manager.pause(true),pause=()=>manager.pause(),end=()=>manager.end();
  const visibility=()=>document.visibilityState==='hidden'?pause():resume();
  const storage=(event:StorageEvent)=>{if(event.key===null||event.key==='fuel-portal-account-fence'||event.key==='fuel-portal-owner-generation')end();};
  void manager.refresh();window.addEventListener('blur',blur);window.addEventListener('pagehide',pause);window.addEventListener('offline',pause);window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);window.addEventListener('nevora:signout',end);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',visibility);
  const poll=setInterval(()=>{if(document.visibilityState!=='hidden'&&manager.state.phase==='ready'&&!manager.state.busy)void manager.refresh();},30000);
  return()=>{clearInterval(poll);manager.end();owner.current=null;window.removeEventListener('blur',blur);window.removeEventListener('pagehide',pause);window.removeEventListener('offline',pause);window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);window.removeEventListener('nevora:signout',end);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visibility);};
 },[authority,flag,lang]);
 useEffect(()=>{if(confirm){confirmation.current?.focus();confirmation.current?.scrollIntoView({block:'nearest'});}},[confirm]);
 useEffect(()=>{
  if(!completion.current||state.busy||!state.notice||state.phase==='loading'||state.phase==='paused')return;
  completion.current=null;const cancelled=/^Setup cancelled\./.test(state.notice);
  const frame=requestAnimationFrame(()=>{if(owner.current?.state.phase==='ended')return;const target=cancelled||!mobile?add.current:feedback.current;target?.focus();target?.scrollIntoView({block:'center'});});return()=>cancelAnimationFrame(frame);
 },[mobile,state.busy,state.notice,state.phase]);
 if(!flag)return null;
 return <div className="em-account-stack" data-passkey-owner=""><EmployeePasskeyView mobile={mobile} state={state} supported={supported} confirm={confirm} addRef={add} confirmationRef={confirmation} feedbackRef={feedback}
  onAdd={()=>{completion.current='add';void owner.current?.add();}} onRefresh={()=>void owner.current?.refresh()} onRemove={id=>{completion.current='remove';void owner.current?.remove(id);}} onCancel={()=>{completion.current='add';owner.current?.cancel();}}
  onReview={(key,button)=>{opener.current=button;setConfirm(key);}} onKeep={()=>{setConfirm(null);requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();else add.current?.focus();});}}/></div>;
}
