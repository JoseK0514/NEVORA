'use client';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {createCentralBillingClient,type BillingAction,type BillingLanguage,type BillingResult,type CentralRead} from '@/lib/commerce/central-billing';
import {takeBillingFragment} from '@/lib/commerce/central-billing';
import {RecoveryFrame} from './frame';
import styles from './recovery.module.css';
const words={
 en:{title:'NEVORA billing',intro:'Review your workplace subscription with Velani.',entry:'Open Billing from your signed-in workplace Owner account to continue.',unavailable:'Billing is temporarily unavailable. Return to your workplace and try again.',loading:'Checking current billing access…',denied:'This billing access has ended. Return to your workplace and open Billing again.',hidden:'Billing details are hidden. Refresh to check current access.',refresh:'Refresh status',checkout:'Review subscription in Stripe',portal:'Manage billing in Stripe',small:'Review Small plan',team:'Review Team plan',retry:'Retry the original request',opening:'Opening Stripe…',close:'Close billing',language:'Billing language',plan:'Current plan',access:'Access',people:'Active employees',trial:'Trial ends',paid:'Paid through',grace:'Grace period ends',none:'Not selected',utc:'Dates are shown in UTC because the workplace time zone is unavailable.',month:'per month',note:'Stripe shows the details before confirmation. Opening or returning from Stripe does not confirm a payment or plan change.',change:'Upgrades take effect after successful payment. Downgrades take effect at the next renewal.',unknown:'The request could not be confirmed. Refresh access, then retry the original request.',conflict:'The original request must be resolved before changing its language or action. Refresh status or reopen Billing from your workplace.',refused:'Billing could not be opened. No payment or plan change is confirmed.',states:{trial:'Trial',paid:'Active',grace:'Payment needs attention',restricted:'Access paused'}},
 es:{title:'Facturación de NEVORA',intro:'Revisa la suscripción de tu negocio con Velani.',entry:'Abre Facturación desde la cuenta del propietario de tu negocio para continuar.',unavailable:'La facturación no está disponible por el momento. Vuelve a tu negocio e inténtalo de nuevo.',loading:'Consultando el acceso actual a la facturación…',denied:'Este acceso de facturación terminó. Vuelve a tu negocio y abre Facturación de nuevo.',hidden:'Los detalles de facturación están ocultos. Actualiza para consultar el acceso actual.',refresh:'Actualizar estado',checkout:'Revisar suscripción en Stripe',portal:'Administrar facturación en Stripe',small:'Revisar plan Small',team:'Revisar plan Team',retry:'Reintentar la solicitud original',opening:'Abriendo Stripe…',close:'Cerrar facturación',language:'Idioma de facturación',plan:'Plan actual',access:'Acceso',people:'Empleados activos',trial:'La prueba termina',paid:'Pagado hasta',grace:'El periodo de gracia termina',none:'Sin seleccionar',utc:'Las fechas se muestran en UTC porque no está disponible la zona horaria del negocio.',month:'al mes',note:'Stripe muestra los detalles antes de confirmar. Abrir Stripe o volver aquí no confirma un pago ni un cambio de plan.',change:'Las mejoras se activan después de un pago exitoso. Las reducciones se aplican en la próxima renovación.',unknown:'No se pudo confirmar la solicitud. Actualiza el acceso y reintenta la solicitud original.',conflict:'La solicitud original debe resolverse antes de cambiar su idioma o acción. Actualiza el estado o vuelve a abrir Facturación desde tu negocio.',refused:'No se pudo abrir la facturación. No hay ningún pago ni cambio de plan confirmado.',states:{trial:'Prueba',paid:'Activo',grace:'El pago requiere atención',restricted:'Acceso pausado'}},
};
type Client=ReturnType<typeof createCentralBillingClient>;
const empty:PrivatePanelState<CentralRead>={snapshot:null,paused:true,refreshing:false};
export function CentralBilling({apiOrigin,initialLanguage}:{apiOrigin:string|null;initialLanguage:BillingLanguage}){
 const [lang,setLang]=useState(initialLanguage),[link,setLink]=useState<'entry'|'loading'|'ready'|'denied'|'unavailable'>('loading'),[panel,setPanel]=useState(empty),[opening,setOpening]=useState(false),[pending,setPending]=useState(false),[problem,setProblem]=useState<BillingResult['kind']|null>(null);
 const client=useRef<Client|null>(null),controls=useRef<ReturnType<typeof createPrivateSnapshotController<CentralRead>>|null>(null),current=useRef(empty),mutation=useRef<AbortController|null>(null),proof=useRef<string|null>(null),captured=useRef(false),generation=useRef({value:0});
 const alert=useRef<HTMLParagraphElement|null>(null);
 const foreground=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();
 useEffect(()=>{
  const lifetime=generation.current,setup=++lifetime.value;let active=true;
  if(!captured.current){captured.current=true;proof.current=takeBillingFragment(window.location,url=>history.replaceState(history.state,'',url));}
  const transport=createCentralBillingClient(apiOrigin);client.current=transport;
  const cancel=()=>{mutation.current?.abort();mutation.current=null;if(active)setOpening(false);};
  const controller=createPrivateSnapshotController<CentralRead>(state=>{
   current.current=state;if(state.paused||state.snapshot?.state==='unavailable'){cancel();transport.cancelAction();}if(active){setPanel(state);setPending(transport.hasPending());}
   if(active&&state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied')setLink('denied');
  },signal=>transport.read(signal),value=>value as CentralRead,reason=>({state:'unavailable',reason}),()=> 'read_failed');
  controls.current=controller;
  const pause=()=>{cancel();transport.pause();controller.pause();};
  const resume=()=>{controller.pause();if(foreground()&&transport.hasSession())controller.start();};
  const visibility=()=>{if(document.visibilityState==='hidden')pause();else resume();};
  const retire=()=>{pause();transport.dispose();setPending(false);setLink('denied');};
  document.addEventListener('visibilitychange',visibility);for(const event of ['blur','offline'])window.addEventListener(event,pause);for(const event of ['focus','online','storage','pageshow'])window.addEventListener(event,resume);window.addEventListener('pagehide',retire);
  const start=setTimeout(()=>{
   const value=proof.current;proof.current=null;setPending(false);
   if(!apiOrigin){setLink('unavailable');return;}if(!value){setLink('entry');return;}if(!foreground()){setLink('denied');return;}
   void transport.enter(value).then(result=>{if(!active)return;if(result!=='ready'){setLink(result==='invalid'?'denied':'unavailable');return;}setLink('ready');if(foreground())controller.start();});
  },0);
  return()=>{active=false;clearTimeout(start);cancel();controller.stop();transport.dispose();current.current=empty;if(client.current===transport)client.current=null;if(controls.current===controller)controls.current=null;document.removeEventListener('visibilitychange',visibility);for(const event of ['blur','offline'])window.removeEventListener(event,pause);for(const event of ['focus','online','storage','pageshow'])window.removeEventListener(event,resume);window.removeEventListener('pagehide',retire);queueMicrotask(()=>{if(lifetime.value===setup)proof.current=null;});};
 },[apiOrigin]);
 useEffect(()=>{if(problem&&foreground())alert.current?.focus();},[problem]);
 const ready=panel.snapshot?.state==='ready'?panel.snapshot:null,t=words[lang];
 async function financial(action?:BillingAction){
  if(mutation.current||!foreground()||current.current.snapshot?.state!=='ready')return;
  const transport=client.current;if(!transport)return;const controller=new AbortController();mutation.current=controller;setOpening(true);setProblem(null);
  try{const request=action?transport.action(action,lang,controller.signal):transport.retry(controller.signal);setPending(transport.hasPending());const result=await request;
   if(mutation.current!==controller||controller.signal.aborted||!foreground()||current.current.snapshot?.state!=='ready')return;
   if(result.kind==='denied'){setPending(false);controls.current?.pause();setLink('denied');return;}
   if(result.kind==='navigate'){try{window.location.assign(result.url);}catch{setProblem('unknown');}}else setProblem(result.kind);
  }finally{if(mutation.current===controller){mutation.current=null;setOpening(false);}}
 }
 const refresh=()=>{setProblem(null);if(foreground())controls.current?.start();};
 const close=()=>{controls.current?.pause();mutation.current?.abort();setPending(false);setLink('denied');void client.current?.signOut();};
 const manage=ready?.status.billingAction==='portal';
 const date=(value:string)=>new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:ready?.status.timeZone??'UTC'}).format(new Date(value));
 return <RecoveryFrame lang={lang}><h1>{t.title}</h1><p>{t.intro}</p>
  <fieldset className={styles.language}><legend>{t.language}</legend>{(['en','es'] as const).map(value=><button key={value} className={styles.secondary} type="button" disabled={pending||opening} aria-pressed={lang===value} onClick={()=>{if(!client.current?.hasPending())setLang(value);}}>{value==='en'?'English':'Español'}</button>)}</fieldset>
  <div aria-live="polite" aria-busy={link==='loading'||panel.refreshing}>
   {ready?<><h2>{ready.status.businessName??t.title}</h2><dl className={styles.details}><div><dt>{t.access}</dt><dd>{t.states[ready.status.state]}</dd></div><div><dt>{t.plan}</dt><dd>{ready.status.plan===null?t.none:ready.status.plan==='small'?'Small':'Team'}</dd></div><div><dt>{t.people}</dt><dd>{ready.status.activeEmployees} / {ready.status.employeeLimit}</dd></div>{([[t.trial,ready.status.trialEndsAt],[t.paid,ready.status.paidThrough],[t.grace,ready.status.graceEndsAt]] as const).map(([label,value])=>value?<div key={label}><dt>{label}</dt><dd>{date(value)}</dd></div>:null)}</dl>{ready.status.timeZone===null?<p>{t.utc}</p>:null}<ul className={styles.plans}>{ready.catalog.plans.map(plan=><li key={plan.key}>{plan.key==='small'?'Small':'Team'} · {new Intl.NumberFormat(lang,{style:'currency',currency:ready.catalog.currency,currencyDisplay:'code'}).format(plan.amount/100)} {t.month}</li>)}</ul></>:<p role="status">{link==='loading'||link==='ready'&&panel.refreshing?t.loading:link==='entry'?t.entry:link==='denied'?t.denied:link==='unavailable'?t.unavailable:t.hidden}</p>}
  </div>
  {problem&&problem!=='navigate'&&problem!=='busy'?<p role="alert" tabIndex={-1} ref={alert}>{problem==='unknown'?t.unknown:problem==='conflict'?t.conflict:problem==='denied'?t.denied:t.refused}</p>:null}
  {ready&&ready.status.billingAction===null?<p role="status">{t.unavailable}</p>:null}
  <div className={styles.actions}>
   {ready&&!pending&&ready.status.billingAction!==null?<><button className={styles.action} disabled={opening} type="button" onClick={()=>void financial(manage?'portal':'checkout')}>{opening?t.opening:manage?t.portal:t.checkout}</button>{manage&&ready.status.state==='paid'&&ready.status.plan==='small'?<button className={styles.secondary} type="button" disabled={opening||ready.status.activeEmployees>30} onClick={()=>void financial('team')}>{t.team}</button>:null}{manage&&ready.status.state==='paid'&&ready.status.plan==='team'&&ready.status.activeEmployees<=15?<button className={styles.secondary} type="button" disabled={opening} onClick={()=>void financial('small')}>{t.small}</button>:null}</>:null}
   {pending?<button className={styles.action} type="button" disabled={opening||!ready} onClick={()=>void financial()}>{opening?t.opening:t.retry}</button>:null}
   {link==='ready'?<button className={styles.secondary} type="button" disabled={opening||panel.refreshing} onClick={refresh}>{t.refresh}</button>:null}
   {link==='ready'?<button className={styles.secondary} type="button" onClick={close}>{t.close}</button>:null}
  </div><p className={styles.footer}>{t.change}</p><p className={styles.footer}>{t.note}</p>
 </RecoveryFrame>;
}
