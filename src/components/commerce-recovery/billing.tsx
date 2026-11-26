'use client';
import Link from 'next/link';
import {copy as billingCopy} from './billing-copy';
import { WholeWordHeading } from "@/components/whole-word-heading";
import {useEffect,useRef,useState} from 'react';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import type {CommerceStatus} from '@/lib/commerce/status';
import {parseBillingSnapshot,type BillingSnapshot} from '@/lib/commerce/billing-snapshot';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import type {AuthLang} from '@/lib/auth-copy';
import {accessNotice,contactLabel,supportEmail,unreachableNotice} from './copy';
import styles from './recovery.module.css';
const copy={
 en:{title:'Workplace billing',intro:'Review your workplace access and manage your subscription through Velani.',loading:'Checking workplace access…',slow:'Still checking your access. This connection is slow. Your billing details appear when the check finishes.',denied:'Sign in with the current workplace Owner account to manage billing.',status:'Access',plan:'Plan',people:'Active employees',trial:'Trial ends',paid:'Paid through',grace:'Grace period ends',utc:' (UTC)',none:'Not selected',refresh:'Refresh status',billing:'Open billing in Velani',opening:'Opening billing…',failed:'Billing could not be opened. No payment is confirmed. Try again from this page.',back:'Return to workspace',pay:'My pay statements',note:'Velani and Stripe show the payment details before confirmation. Returning here does not confirm a payment.',states:{trial:'Trial',paid:'Active',grace:'Payment needs attention',restricted:'Access paused'}},
 es:{title:'Facturación del negocio',intro:'Revisa el acceso de tu negocio y administra tu suscripción en Velani.',loading:'Consultando el acceso del negocio…',slow:'Seguimos comprobando tu acceso. La conexión está lenta. Los detalles de facturación aparecen cuando termine la comprobación.',denied:billingCopy.es.signInWithTheCurrentWorkplaceOwnerAccountTo,status:'Acceso',plan:'Plan',people:'Empleados activos',trial:'La prueba termina',paid:'Pagado hasta',grace:'El periodo de gracia termina',utc:' (UTC)',none:'Sin seleccionar',refresh:'Actualizar estado',billing:'Abrir facturación en Velani',opening:'Abriendo facturación…',failed:'No se pudo abrir la facturación. No hay ningún pago confirmado. Inténtalo de nuevo desde esta página.',back:'Volver al negocio',pay:'Mis comprobantes de pago',note:'Velani y Stripe muestran los detalles antes de confirmar un pago. Volver aquí no confirma un pago.',states:{trial:'Prueba',paid:'Activo',grace:'El pago requiere atención',restricted:'Acceso pausado'}},
};
type State={phase:'loading'|'unavailable'|'denied'}|{phase:'ready';status:CommerceStatus};
/** QA S-01's threshold (scoped-read-frame STUCK_MS): a status check still running after this says it is still checking,
 * until the answer or the 10 s cut-off (which shows the failed state). */
export const SLOW_CHECK_MS=2500;
export function billingDestination(value:unknown,origin:string):string {
 if(!value||typeof value!=='object'||!('url' in value)||typeof value.url!=='string')throw Error('invalid_destination');
 const url=new URL(value.url);
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||url.pathname!=='/pages/plans'||url.search||!/^#handoff=[A-Za-z0-9_-]{43}$/.test(url.hash))throw Error('invalid_destination');
 return url.href;
}
/** A workplace time zone the browser can format in, or null: dates then print in UTC and say so. */
function usableZone(timeZone:string|null|undefined):string|null {
 if(!timeZone)return null;
 try{new Intl.DateTimeFormat('en',{timeZone});return timeZone;}catch{return null;}
}
export function BillingRecovery({lang,billingOrigin,payrollEnabled,timeZone}: {lang:AuthLang;billingOrigin:string;payrollEnabled:boolean;timeZone?:string|null}) {
 const t=copy[lang], [state,setState]=useState<State>({phase:'loading'}),[opening,setOpening]=useState(false),[failed,setFailed]=useState(false),[slow,setSlow]=useState(false);
 useEffect(()=>{if(state.phase!=='loading')return;const timer=setTimeout(()=>setSlow(true),SLOW_CHECK_MS);return()=>{clearTimeout(timer);setSlow(false);};},[state.phase]);
 const action=useRef<AbortController|null>(null);
 const refresh=useRef<(()=>void)|null>(null);
 useEffect(()=>{
  const cancelOpening=()=>{action.current?.abort();action.current=null;setOpening(false);};
  const controller=createPrivateSnapshotController<BillingSnapshot>(view=>{
   if(view.paused){cancelOpening();setState({phase:'unavailable'});return;}
   if(!view.snapshot){setState({phase:'loading'});return;}
   if(view.snapshot.state==='unavailable'){cancelOpening();setState({phase:view.snapshot.reason==='access_denied'?'denied':'unavailable'});return;}
   setState({phase:'ready',status:view.snapshot.status});
  },async signal=>{
   const response=await fetch('/api/commerce/status',{cache:'no-store',credentials:'same-origin',redirect:'error',signal});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Billing status unavailable');return response.json();
  },value=>{if(value&&typeof value==='object'&&'state'in value&&value.state==='unavailable'&&'reason'in value&&value.reason==='access_denied')return {state:'unavailable',reason:'access_denied'};return parseBillingSnapshot(value);},reason=>({state:'unavailable',reason}),()=> 'read_failed');
  const foreground=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();
  const pause=()=>controller.pause(),resume=()=>{controller.pause();if(foreground())controller.start();};
  refresh.current=()=>{controller.pause();if(foreground())controller.start();};
  document.addEventListener('visibilitychange',resume);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,resume);resume();
  return()=>{refresh.current=null;controller.stop();action.current?.abort();action.current=null;document.removeEventListener('visibilitychange',resume);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,resume);};
 },[]);
 async function openBilling(){
  if(action.current||state.phase==='loading'||state.phase==='denied')return;
  const controller=new AbortController();action.current=controller;setOpening(true);setFailed(false);
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch('/api/commerce/handoff',{method:'POST',cache:'no-store',credentials:'same-origin',redirect:'error',signal:controller.signal});
   if(response.status===401||response.status===403){setState({phase:'denied'});return;}
   if(!response.ok)throw Error('unavailable');
   const destination=billingDestination(await response.json(),billingOrigin);
   if(action.current===controller&&!controller.signal.aborted)window.location.assign(destination);
  }catch{if(action.current===controller)setFailed(true);}
  finally{clearTimeout(timer);if(action.current===controller){action.current=null;setOpening(false);}}
 }
 const status=state.phase==='ready'?state.status:null,notice=status?accessNotice(lang,status):null;
 // Review Nov 14, 2026 (JR-9): dates read in the workplace's time zone when the page has it; otherwise they stay in
 // UTC and every date label says so.
 const zone=usableZone(timeZone),suffix=zone?'':t.utc;
 const date=(value:string)=>new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:zone??'UTC'}).format(new Date(value));
 return <><h1>{lang === "es" ? <WholeWordHeading text={t.title} /> : t.title}</h1><p>{t.intro}</p>
  <div aria-live="polite" aria-busy={state.phase==='loading'}>
   {state.phase==='loading'?<p className={styles.callout} role="status">{slow?t.slow:t.loading}</p>:state.phase==='denied'?<p className={styles.callout} data-tone="red" role="alert"><WarningCircleIcon className={styles.calloutIcon} weight="bold" aria-hidden="true"/>{t.denied}</p>:state.phase==='unavailable'?<p className={styles.callout} data-tone="amber" role="status"><WarningCircleIcon className={styles.calloutIcon} weight="bold" aria-hidden="true"/>{unreachableNotice(lang)}</p>:null}
   {notice?<p className={styles.callout} data-tone={notice.tone} role="status"><WarningCircleIcon className={styles.calloutIcon} weight="bold" aria-hidden="true"/>{notice.text}</p>:null}
   {status?<dl className={styles.details}><div><dt>{t.status}</dt><dd>{t.states[status.state]}</dd></div><div><dt>{t.plan}</dt><dd>{status.plan===null?t.none:status.plan==='small'?'Small':'Team'}</dd></div><div><dt>{t.people}</dt><dd>{status.activeEmployees} / {status.employeeLimit}</dd></div>{([[t.trial,status.trialEndsAt],[t.paid,status.paidThrough],[t.grace,status.graceEndsAt]] as const).map(([label,value])=>value?<div key={label}><dt>{label}{suffix}</dt><dd>{date(value)}</dd></div>:null)}</dl>:null}
  </div>
  {failed?<p className={styles.callout} data-tone="red" role="alert"><WarningCircleIcon className={styles.calloutIcon} weight="bold" aria-hidden="true"/>{t.failed}</p>:null}
  <div className={styles.actions}>
   {notice?.contact?<a className={styles.action} href={`mailto:${supportEmail}`}>{contactLabel(lang)}</a>:null}
   {/* J18 (Nov 24, 2026): when the status can't be read, Refresh is the filled button and comes first, above the outlined
     * Open billing, as the filled button does in every other state. */}
   {state.phase==='unavailable'?<button className={styles.action} type="button" disabled={opening} onClick={()=>{setFailed(false);refresh.current?.();}}>{t.refresh}</button>:null}
   {state.phase!=='denied'?<button className={notice?.contact||state.phase==='unavailable'?styles.secondary:styles.action} type="button" disabled={opening||state.phase==='loading'} onClick={()=>void openBilling()}>{opening?t.opening:t.billing}</button>:null}
   {/* Phase 2 (Nov 23, 2026): the text links stand one per line, centred, so none wraps beside another at 200% text. */}
   {/* Phase 5 (Nov 17, 2026): one filled button per state. Refresh is that button only when the status could not be
     * read; otherwise it and the ways out of this page are text links, as the links under the sign-in card. */}
   {state.phase!=='unavailable'||status?.operational||payrollEnabled?<div className={`${styles.links} ${styles.linksStack}`}>
    {state.phase!=='unavailable'?<button className={styles.quiet} type="button" disabled={opening||state.phase==='loading'} onClick={()=>{setFailed(false);refresh.current?.();}}>{t.refresh}</button>:null}
    {status?.operational?<Link className={styles.quiet} href="/app" prefetch={false}>{t.back}</Link>:null}
    {payrollEnabled?<Link className={styles.quiet} href="/app/my-pay" prefetch={false}>{t.pay}</Link>:null}
   </div>:null}
  </div><p className={styles.footer}>{t.note}</p>
 </>;
}
