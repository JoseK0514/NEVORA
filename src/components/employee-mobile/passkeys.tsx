'use client';

import {useEffect,useRef,useState,useSyncExternalStore,type RefObject} from 'react';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {createPasskeyManager,type PasskeyState} from '../../lib/passkeys/management';
import {passkeysAvailable,passkeysFlagOn,type Passkey} from '../../lib/passkeys/client';
import {useEmployeeMobile} from './use-mobile';
import {PasskeyDesktopView} from '../passkeys/passkey-desktop-view';
import '../passkeys/passkeys.css';
import './passkeys.css';

const subscribe=()=>()=>{};
const date=(value:string)=>new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
type ViewProps={mobile:boolean;state:PasskeyState;supported:boolean;confirm:Passkey|null;onAdd:()=>void;onRefresh:()=>void;onRemove:(id:string)=>void;onReview:(key:Passkey,button:HTMLButtonElement)=>void;onKeep:()=>void;onCancel:()=>void;addRef?:RefObject<HTMLButtonElement|null>;confirmationRef?:RefObject<HTMLDivElement|null>;feedbackRef?:RefObject<HTMLParagraphElement|null>};

function EmployeePasskeyDesktop(props:ViewProps){
 const dialog=useRef<HTMLDialogElement>(null),fallbackAdd=useRef<HTMLButtonElement>(null),{state,confirm}=props;
 useEffect(()=>{if(confirm){dialog.current?.showModal();dialog.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();}else if(dialog.current?.open)dialog.current.close();},[confirm]);
 return <div data-passkey-state={state.phase}><PasskeyDesktopView load={state.phase==='ready'?'ready':state.phase==='unavailable'||state.phase==='denied'?'failed':'loading'} passkeys={state.phase==='ready'?state.passkeys??[]:[]} busy={state.busy==='removing'?'remove':state.busy?'add':null} notice={state.notice?{tone:/^(Passkey added|Passkey removed)/.test(state.notice)?'done':'error',text:state.notice}:null} confirm={state.phase==='ready'?confirm:null} supported={props.supported} phone={false} disabled={state.phase!=='ready'||state.needsRefresh} dialog={dialog} addButton={props.addRef??fallbackAdd} onRefresh={props.onRefresh} onAdd={props.onAdd} onReview={props.onReview} onRemove={key=>props.onRemove(key.id)} onKeep={props.onKeep}/></div>;
}

export function EmployeePasskeyView({mobile,state,supported,confirm,onAdd,onRefresh,onRemove,onReview,onKeep,onCancel,addRef,confirmationRef,feedbackRef}:ViewProps){
 const ready=state.phase==='ready',keys=ready?state.passkeys??[]:[],busy=state.busy!==null;
 const reviewed=ready?keys.find(key=>key.id===confirm?.id):null;
 if(state.phase==='disabled'||state.phase==='ended')return null;
 if(!mobile)return <EmployeePasskeyDesktop mobile={mobile} state={state} supported={supported} confirm={confirm} onAdd={onAdd} onRefresh={onRefresh} onRemove={onRemove} onReview={onReview} onKeep={onKeep} onCancel={onCancel} addRef={addRef}/>;
 return <section className={`nv-card pk-section em-passkeys${mobile?' em-passkeys-mobile':''}`} aria-labelledby="passkeys-title" data-passkey-state={state.phase}>
  <div className="nv-card__head"><h2 className="nv-card__title" id="passkeys-title">{mobile?'Passkeys':'Face ID and passkeys'}</h2></div>
  <div className="nv-card__body pk-body">
   <p className="pk-muted em-passkeys-intro">Sign in with your device’s screen lock instead of typing your password.</p>
   {state.phase==='loading'?<p className="pk-muted" role="status">Checking your saved passkeys…</p>:null}
   {state.phase==='paused'&&!busy?<p className="pk-muted" role="status">Passkeys are paused. Return to this page to check your account.</p>:null}
   {state.phase==='denied'?<p className="pk-muted" role="status">Your session changed. <a href="/login">Sign in again</a> to manage your passkeys.</p>:null}
   {state.phase==='unavailable'?<p className="pk-muted">{state.needsRefresh?'Check your saved passkeys before starting another request.':'We couldn’t check your passkeys. Refresh to try again.'}</p>:null}
   {ready?<>
    {keys.length?<ul className="pk-list">{keys.map(key=><li className="pk-item" key={key.id}>
     <KeyIcon className="em-passkeys-key" size={24} aria-hidden="true"/>
     <span className="pk-item__text"><span className="pk-item__name">{key.name}</span><span className="pk-item__meta">Added {date(key.createdAt)}</span><span className="pk-item__meta">{key.lastUsedAt?'Last used '+date(key.lastUsedAt):'Not used yet'}</span></span>
     <button type="button" className="nv-link pk-remove" aria-label={'Remove '+key.name} disabled={busy||state.needsRefresh||!!reviewed} onClick={event=>onReview(key,event.currentTarget)}>Remove</button>
    </li>)}</ul>:<div className="em-passkeys-empty"><KeyIcon size={28} aria-hidden="true"/><div><h3>No saved passkeys</h3><p className="pk-muted">Your password still works. Add a passkey when you’re ready.</p></div></div>}
    {reviewed?<div className="em-passkeys-confirmation" role="group" aria-labelledby="passkey-remove-title" aria-describedby="passkey-remove-body" tabIndex={-1} ref={confirmationRef}>
     <h3 id="passkey-remove-title">Remove “{reviewed.name}”?</h3><p id="passkey-remove-body">This stops this passkey from signing in to NEVORA. It does not delete it from your device or sign you out.</p>
     {keys.length===1?<p>This is your last saved passkey. You can still sign in with your password.</p>:null}
     <div className="em-passkeys-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={busy} onClick={onKeep}>Keep passkey</button><button type="button" className="nv-btn" data-kind="danger" disabled={busy} onClick={()=>onRemove(reviewed.id)}>Remove passkey</button></div>
    </div>:null}
    {!reviewed&&supported?<button ref={addRef} type="button" className="nv-btn pk-add" data-kind="secondary" disabled={busy||state.needsRefresh} onClick={onAdd}><KeyIcon size={20} aria-hidden="true"/>Add a passkey</button>:null}
    {!supported?<p className="pk-muted">This browser can’t create a passkey. You can still manage your saved passkeys here, or use a supported browser to add one.</p>:null}
   </>:null}
   {busy?<div className="em-passkeys-progress"><p role="status">{state.busy==='device'?'Finish setup in your device’s prompt.':state.busy==='removing'?'Removing your passkey…':state.busy==='verifying'?'Checking and saving your passkey…':'Preparing secure setup…'}</p>{state.busy==='device'||state.busy==='options'?<button type="button" className="nv-btn" data-kind="secondary" onClick={onCancel}>Cancel setup</button>:null}</div>:null}
   <p className="em-passkeys-feedback" role="status" aria-live="polite" tabIndex={-1} ref={feedbackRef}>{state.notice}</p>
   {(!busy&&(state.phase==='unavailable'||state.phase==='paused'))?<button type="button" className="nv-btn" data-kind="secondary" onClick={onRefresh}>Refresh passkeys</button>:null}
   <details className="em-passkeys-help"><summary><span>How passkeys work</span><CaretDownIcon size={20} aria-hidden="true"/></summary><div><p>Your device may use a fingerprint, face scan, screen-lock code or security key. NEVORA does not receive your biometric data.</p><p>A saved name describes where a passkey was added. Your device or password manager may sync it to other devices.</p><p>Removing a passkey here stops future sign-ins with it. To remove its saved copy too, use your device or password manager.</p></div></details>
  </div>
 </section>;
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
 return <div data-passkey-owner=""><EmployeePasskeyView mobile={mobile} state={state} supported={supported} confirm={confirm} addRef={add} confirmationRef={confirmation} feedbackRef={feedback}
  onAdd={()=>{completion.current='add';void owner.current?.add();}} onRefresh={()=>void owner.current?.refresh()} onRemove={id=>{completion.current='remove';void owner.current?.remove(id);}} onCancel={()=>{completion.current='add';owner.current?.cancel();}}
  onReview={(key,button)=>{opener.current=button;setConfirm(key);}} onKeep={()=>{setConfirm(null);requestAnimationFrame(()=>{if(opener.current?.isConnected)opener.current.focus();else add.current?.focus();});}}/></div>;
}
