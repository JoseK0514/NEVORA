'use client';

import {useEffect,useRef,useState,useSyncExternalStore,type RefObject} from 'react';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {createPasskeyManager,type PasskeyState} from '../../lib/passkeys/management';
import {passkeysAvailable,passkeysFlagOn,type Passkey} from '../../lib/passkeys/client';
import {useEmployeeMobile} from './use-mobile';
import './account-corp.css';

const subscribe=()=>()=>{};
const date=(value:string)=>new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
type ViewProps={mobile?:boolean;state:PasskeyState;supported:boolean;confirm:Passkey|null;onAdd:()=>void;onRefresh:()=>void;onRemove:(id:string)=>void;onReview:(key:Passkey,button:HTMLButtonElement)=>void;onKeep:()=>void;onCancel:()=>void;addRef?:RefObject<HTMLButtonElement|null>;confirmationRef?:RefObject<HTMLDivElement|null>;feedbackRef?:RefObject<HTMLParagraphElement|null>};

/** One presentation on every width (board style): a "Saved passkeys" card with one row per key, the review inline, and
 * one primary Add a passkey. The device ceremony, removal review and refresh are unchanged. */
export function EmployeePasskeyView({state,supported,confirm,onAdd,onRefresh,onRemove,onReview,onKeep,onCancel,addRef,confirmationRef,feedbackRef}:ViewProps){
 const ready=state.phase==='ready',keys=ready?state.passkeys??[]:[],busy=state.busy!==null;
 const reviewed=ready?keys.find(key=>key.id===confirm?.id):null;
 if(state.phase==='disabled'||state.phase==='ended')return null;
 const status=state.phase==='loading'?'Checking your saved passkeys…':state.phase==='paused'&&!busy?'Passkeys are paused. Return to this page to check your account.':state.phase==='unavailable'?(state.needsRefresh?'Check your saved passkeys before starting another request.':'We couldn’t check your passkeys. Refresh to try again.'):null;
 return <>
  <section className="c-card em-passkeys" aria-labelledby="passkeys-title" data-passkey-state={state.phase}>
   <div className="c-card__head"><h2 className="c-card__label" id="passkeys-title">Saved passkeys</h2></div>
   {ready&&keys.length?<ul className="c-rows" aria-label="Your passkeys">{keys.map(key=><li key={key.id}><div className="c-row">
    <span className="c-row__icon" aria-hidden="true"><KeyIcon className="c-ic"/></span>
    <span className="c-row__main"><span className="c-row__title c-row__title--b">{key.name}</span><span className="c-row__detail"><span>Added {date(key.createdAt)} · {key.lastUsedAt?'Last used '+date(key.lastUsedAt):'Not used yet'}</span></span></span>
    <button type="button" className="em-account-textbtn em-account-textbtn--danger" aria-label={'Remove '+key.name} disabled={busy||state.needsRefresh||!!reviewed} onClick={event=>onReview(key,event.currentTarget)}>Remove</button>
   </div></li>)}</ul>:null}
   <div className="c-card__body em-passkeys-body">
    {ready&&!keys.length?<p className="em-passkeys-empty"><b>No saved passkeys</b>Your password still works. Add a passkey when you’re ready.</p>:null}
    {ready&&keys.length?null:<p className="em-passkeys-intro">Sign in with your device’s screen lock instead of typing your password.</p>}
    {status?<p className="c-note" role="status">{status}</p>:null}
    {state.phase==='denied'?<p className="c-note" role="status">Your session changed. <a className="c-link" href="/login">Sign in again</a> to manage your passkeys.</p>:null}
    {ready&&!supported?<p className="c-note">This browser can’t create a passkey. You can still manage your saved passkeys here, or use a supported browser to add one.</p>:null}
    {busy?<p className="c-note" role="status">{state.busy==='device'?'Finish setup in your device’s prompt.':state.busy==='removing'?'Removing your passkey…':state.busy==='verifying'?'Checking and saving your passkey…':'Preparing secure setup…'}</p>:null}
    <p className="em-passkeys-feedback c-note" role="status" aria-live="polite" tabIndex={-1} ref={feedbackRef}>{state.notice}</p>
    {ready&&!reviewed&&supported?<button ref={addRef} type="button" className="c-btn c-btn--full" disabled={busy||state.needsRefresh} onClick={onAdd}>Add a passkey</button>:null}
    {busy&&(state.busy==='device'||state.busy==='options')?<button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={onCancel}>Cancel setup</button>:null}
    {!busy&&(state.phase==='unavailable'||state.phase==='paused')?<button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={onRefresh}>Refresh passkeys</button>:null}
   </div>
  </section>
  {reviewed?<div className="c-card em-passkeys-confirmation" role="group" aria-labelledby="passkey-remove-title" aria-describedby="passkey-remove-body" tabIndex={-1} ref={confirmationRef}>
   <div className="c-card__head"><h2 className="c-card__label" id="passkey-remove-title">Remove “{reviewed.name}”?</h2></div>
   <div className="c-card__body">
    <p id="passkey-remove-body">This stops this passkey from signing in to NEVORA. It does not delete it from your device or sign you out.</p>
    {keys.length===1?<p className="em-passkeys-last">This is your last saved passkey. You can still sign in with your password.</p>:null}
    <div className="c-btns"><button type="button" className="c-btn c-btn--secondary" disabled={busy} onClick={onKeep}>Keep passkey</button><button type="button" className="c-btn c-btn--danger" disabled={busy} onClick={()=>onRemove(reviewed.id)}>Remove passkey</button></div>
   </div>
  </div>:null}
  <p className="c-note">Your device may use a fingerprint, face scan, screen-lock code or security key. NEVORA does not receive your biometric data.</p>
 </>;
}

/** Stable lifetime; responsive changes replace presentation, never a ceremony. */
export function EmployeePasskeySection({authority}:{authority:string}){
 const mobile=useEmployeeMobile(),flag=passkeysFlagOn();
 const supported=useSyncExternalStore(subscribe,()=>passkeysAvailable()&&typeof navigator.credentials?.create==='function'&&window.isSecureContext,()=>false);
 const [state,setState]=useState<PasskeyState>({phase:'loading',busy:null,passkeys:null,notice:'',needsRefresh:false});
 const [confirm,setConfirm]=useState<Passkey|null>(null),owner=useRef<ReturnType<typeof createPasskeyManager>|null>(null);
 const add=useRef<HTMLButtonElement>(null),confirmation=useRef<HTMLDivElement>(null),feedback=useRef<HTMLParagraphElement>(null),opener=useRef<HTMLButtonElement|null>(null),completion=useRef<'add'|'remove'|null>(null);
 useEffect(()=>{
  if(!flag)return;
  const manager=createPasskeyManager(authority,()=>{if(manager.state.phase!=='ready')setConfirm(null);setState({...manager.state});});owner.current=manager;
  const resume=()=>{if(document.visibilityState!=='hidden'&&navigator.onLine!==false)void manager.resume();};
  const blur=()=>manager.pause(true),pause=()=>manager.pause(),end=()=>manager.end();
  const visibility=()=>document.visibilityState==='hidden'?pause():resume();
  const storage=(event:StorageEvent)=>{if(event.key===null||event.key==='fuel-portal-account-fence'||event.key==='fuel-portal-owner-generation')end();};
  void manager.refresh();window.addEventListener('blur',blur);window.addEventListener('pagehide',pause);window.addEventListener('offline',pause);window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);window.addEventListener('nevora:signout',end);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',visibility);
  const poll=setInterval(()=>{if(document.visibilityState!=='hidden'&&manager.state.phase==='ready'&&!manager.state.busy)void manager.refresh();},30000);
  return()=>{clearInterval(poll);manager.end();owner.current=null;window.removeEventListener('blur',blur);window.removeEventListener('pagehide',pause);window.removeEventListener('offline',pause);window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);window.removeEventListener('nevora:signout',end);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visibility);};
 },[authority,flag]);
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
