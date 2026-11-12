'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {parseCommerceStatus,type CommerceStatus} from '@/lib/commerce/status';
import type {AuthLang} from '@/lib/auth-copy';
import styles from './recovery.module.css';
const copy={
 en:{title:'Workplace billing',intro:'Review your workplace access and manage your subscription through Velani.',loading:'Checking workplace access…',unavailable:'Billing status is unavailable. Try again in a moment.',denied:'Sign in with the current workplace Owner account to manage billing.',status:'Access',plan:'Plan',people:'Active employees',trial:'Trial ends (UTC)',paid:'Paid through (UTC)',grace:'Grace period ends (UTC)',none:'Not selected',refresh:'Refresh status',billing:'Open billing in Velani',opening:'Opening billing…',failed:'Billing could not be opened. No payment is confirmed. Try again from this page.',back:'Return to workspace',pay:'My pay statements',note:'Velani and Stripe show the payment details before confirmation. Returning here does not confirm a payment.',states:{trial:'Trial',paid:'Active',grace:'Payment needs attention',restricted:'Access paused'}},
 es:{title:'Facturación del negocio',intro:'Revisa el acceso de tu negocio y administra tu suscripción en Velani.',loading:'Consultando el acceso del negocio…',unavailable:'El estado de facturación no está disponible. Inténtalo de nuevo en un momento.',denied:'Inicia sesión con la cuenta del propietario actual para administrar la facturación.',status:'Acceso',plan:'Plan',people:'Empleados activos',trial:'La prueba termina (UTC)',paid:'Pagado hasta (UTC)',grace:'El periodo de gracia termina (UTC)',none:'Sin seleccionar',refresh:'Actualizar estado',billing:'Abrir facturación en Velani',opening:'Abriendo facturación…',failed:'No se pudo abrir la facturación. No hay ningún pago confirmado. Inténtalo de nuevo desde esta página.',back:'Volver al negocio',pay:'Mis comprobantes de pago',note:'Velani y Stripe muestran los detalles antes de confirmar un pago. Volver aquí no confirma un pago.',states:{trial:'Prueba',paid:'Activo',grace:'El pago requiere atención',restricted:'Acceso pausado'}},
};
type State={phase:'loading'|'unavailable'|'denied'}|{phase:'ready';status:CommerceStatus};
export function billingDestination(value:unknown,origin:string):string {
 if(!value||typeof value!=='object'||!('url' in value)||typeof value.url!=='string')throw Error('invalid_destination');
 const url=new URL(value.url);
 if(url.protocol!=='https:'||url.origin!==origin||url.username||url.password||url.pathname!=='/pages/plans'||url.search||!/^#handoff=[A-Za-z0-9_-]{43}$/.test(url.hash))throw Error('invalid_destination');
 return url.href;
}
export function BillingRecovery({lang,billingOrigin,payrollEnabled}: {lang:AuthLang;billingOrigin:string;payrollEnabled:boolean}) {
 const t=copy[lang], [state,setState]=useState<State>({phase:'loading'}),[revision,setRevision]=useState(0),[opening,setOpening]=useState(false),[failed,setFailed]=useState(false);
 const action=useRef<AbortController|null>(null);
 useEffect(()=>{
  let active=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  void fetch('/api/commerce/status',{cache:'no-store',credentials:'same-origin',redirect:'error',signal:controller.signal}).then(async response=>{
   if(!active)return;
   if(response.status===401||response.status===403){setState({phase:'denied'});return;}
   if(!response.ok)throw Error('unavailable');
   const status=parseCommerceStatus(await response.json());if(active)setState({phase:'ready',status});
  }).catch(()=>{if(active)setState({phase:'unavailable'});}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);controller.abort();action.current?.abort();action.current=null;};
 },[revision]);
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
 const status=state.phase==='ready'?state.status:null;
 const date=(value:string)=>new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
 return <><h1>{t.title}</h1><p>{t.intro}</p>
  <div aria-live="polite" aria-busy={state.phase==='loading'}>
   {state.phase==='loading'?<p role="status">{t.loading}</p>:state.phase==='denied'?<p role="alert">{t.denied}</p>:state.phase==='unavailable'?<p role="status">{t.unavailable}</p>:null}
   {status?<dl className={styles.details}><div><dt>{t.status}</dt><dd>{t.states[status.state]}</dd></div><div><dt>{t.plan}</dt><dd>{status.plan===null?t.none:status.plan==='small'?'Small':'Team'}</dd></div><div><dt>{t.people}</dt><dd>{status.activeEmployees} / {status.employeeLimit}</dd></div>{([[t.trial,status.trialEndsAt],[t.paid,status.paidThrough],[t.grace,status.graceEndsAt]] as const).map(([label,value])=>value?<div key={label}><dt>{label}</dt><dd>{date(value)}</dd></div>:null)}</dl>:null}
  </div>
  {failed?<p className={styles.notice} role="alert">{t.failed}</p>:null}
  <div className={styles.actions}>
   {state.phase!=='denied'?<button className={styles.action} type="button" disabled={opening||state.phase==='loading'} onClick={()=>void openBilling()}>{opening?t.opening:t.billing}</button>:null}
   <button className={styles.secondary} type="button" disabled={opening||state.phase==='loading'} onClick={()=>{setState({phase:'loading'});setFailed(false);setRevision(value=>value+1);}}>{t.refresh}</button>
   {status?.operational?<Link className={styles.secondary} href="/app" prefetch={false}>{t.back}</Link>:null}
   {payrollEnabled?<Link className={styles.secondary} href="/app/my-pay" prefetch={false}>{t.pay}</Link>:null}
  </div><p className={styles.footer}>{t.note}</p>
 </>;
}
