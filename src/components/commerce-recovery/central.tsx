'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {createPrivateSnapshotController,type PrivatePanelState} from '@/lib/private-snapshot-client';
import {createCentralBillingClient,type BillingAction,type BillingLanguage,type BillingResult,type CentralRead} from '@/lib/commerce/central-billing';
import {takeBillingFragment} from '@/lib/commerce/central-billing';
import {accessNotice,contactLabel,quoteNotice,supportEmail} from './copy';
import {RecoveryFrame} from './frame';
import styles from './recovery.module.css';
const words={
 en:{title:'Plan and billing',intro:'See your plan and manage your subscription. Payments are made in Stripe.',entry:'Open Billing from your signed-in workplace Owner account to continue.',unavailable:'Billing is temporarily unavailable. Return to your workplace and try again.',loading:'Checking current billing access…',denied:'This billing access has ended. Return to your workplace and open Billing again.',hidden:'Billing details are hidden. Refresh to check current access.',refresh:'Refresh status',checkout:'Review subscription in Stripe',portal:'Manage billing in Stripe',small:'Review Small plan',team:'Review Team plan',retry:'Retry the original request',opening:'Opening Stripe…',close:'Close billing',language:'Billing language',plan:'Current plan',access:'Access',people:'Active employees',trial:'Trial ends',paid:'Paid through',grace:'Grace period ends',none:'Not selected',utc:'Dates are shown in UTC because the workplace time zone is unavailable.',month:'per month',note:'Stripe shows the details before confirmation. Opening or returning from Stripe does not confirm a payment or plan change.',change:'Upgrades take effect after successful payment. Downgrades take effect at the next renewal.',unknown:'The request could not be confirmed. Refresh access, then retry the original request.',conflict:'The original request must be resolved before changing its language or action. Refresh status or reopen Billing from your workplace.',refused:'Billing could not be opened. No payment or plan change is confirmed.',states:{trial:'Trial',paid:'Active',grace:'Payment needs attention',restricted:'Access paused'},
  backTo:(business:string)=>`Back to ${business}`,backWorkplace:'Back to your workplace',backSignIn:'Back to NEVORA sign-in',
  confirming:'Confirming your payment with Stripe…',subscribed:'You’re subscribed.',unseen:'We haven’t seen a payment yet. If you paid, wait a moment and refresh. You won’t be charged twice for the same checkout.',
  refusals:{changed:'This billing request changed. Review the original request before starting another.',pending:'A billing request is already in progress. Retry the original request.',review:'The result needs review. No new payment is confirmed; contact support with the original request.',expired:'This billing request expired. Refresh your billing status before continuing.',employees:'The Small plan covers up to 15 active people. Deactivate people you no longer need, then try again.',manage:'You already have a subscription. Refresh your billing status to manage it.',syncing:'Stripe is still confirming your subscription. Refresh your billing status in a moment.'}},
 es:{title:'Plan y facturación',intro:'Consulta tu plan y administra tu suscripción. Los pagos se hacen en Stripe.',entry:'Abre Facturación desde la cuenta del propietario de tu negocio para continuar.',unavailable:'La facturación no está disponible por el momento. Vuelve a tu negocio e inténtalo de nuevo.',loading:'Consultando el acceso actual a la facturación…',denied:'Este acceso de facturación terminó. Vuelve a tu negocio y abre Facturación de nuevo.',hidden:'Los detalles de facturación están ocultos. Actualiza para consultar el acceso actual.',refresh:'Actualizar estado',checkout:'Revisar suscripción en Stripe',portal:'Administrar facturación en Stripe',small:'Revisar plan Small',team:'Revisar plan Team',retry:'Reintentar la solicitud original',opening:'Abriendo Stripe…',close:'Cerrar facturación',language:'Idioma de facturación',plan:'Plan actual',access:'Acceso',people:'Empleados activos',trial:'La prueba termina',paid:'Pagado hasta',grace:'El período de gracia termina',none:'Sin seleccionar',utc:'Las fechas se muestran en UTC porque no está disponible la zona horaria del negocio.',month:'al mes',note:'Stripe muestra los detalles antes de confirmar. Abrir Stripe o volver aquí no confirma un pago ni un cambio de plan.',change:'Las mejoras se activan después de un pago exitoso. Las reducciones se aplican en la próxima renovación.',unknown:'No se pudo confirmar la solicitud. Actualiza el acceso y reintenta la solicitud original.',conflict:'La solicitud original debe resolverse antes de cambiar su idioma o acción. Actualiza el estado o vuelve a abrir Facturación desde tu negocio.',refused:'No se pudo abrir la facturación. No hay ningún pago ni cambio de plan confirmado.',states:{trial:'Prueba',paid:'Activo',grace:'El pago requiere atención',restricted:'Acceso pausado'},
  backTo:(business:string)=>`Volver a ${business}`,backWorkplace:'Volver a tu negocio',backSignIn:'Volver al inicio de sesión de NEVORA',
  confirming:'Confirmando tu pago con Stripe…',subscribed:'Tu suscripción está activa.',unseen:'Todavía no vemos un pago. Si pagaste, espera un momento y actualiza. No se te cobrará dos veces por el mismo pago.',
  refusals:{changed:'Esta solicitud de facturación cambió. Revisa la solicitud original antes de iniciar otra.',pending:'Ya hay una solicitud de facturación en curso. Reintenta la solicitud original.',review:'El resultado requiere revisión. No hay un pago nuevo confirmado; contacta a soporte con la solicitud original.',expired:'Esta solicitud de facturación venció. Actualiza el estado de facturación antes de continuar.',employees:'El plan Small cubre hasta 15 personas activas. Desactiva a las personas que ya no necesitas e inténtalo de nuevo.',manage:'Ya tienes una suscripción. Actualiza el estado de facturación para administrarla.',syncing:'Stripe todavía está confirmando tu suscripción. Actualiza el estado de facturación en un momento.'}},
};
type Client=ReturnType<typeof createCentralBillingClient>;
const empty:PrivatePanelState<CentralRead>={snapshot:null,paused:true,refreshing:false};
type Problem=Exclude<BillingResult,{kind:'navigate'}>;
/** `returning` is the page Stripe sends the Owner back to after Checkout (JR-19); `legal` is the footer line, rendered
 * by the server page in both languages because the language changes here without a reload. */
export function CentralBilling({apiOrigin,initialLanguage,returning=false,legal}:{apiOrigin:string|null;initialLanguage:BillingLanguage;returning?:boolean;legal?:Record<BillingLanguage,ReactNode>}){
 const [lang,setLang]=useState(initialLanguage),[link,setLink]=useState<'entry'|'loading'|'ready'|'denied'|'unavailable'>('loading'),[panel,setPanel]=useState(empty),[opening,setOpening]=useState(false),[pending,setPending]=useState(false),[problem,setProblem]=useState<Problem|null>(null);
 // JR-11: the workplace this session last showed, kept in memory only, so every state has a real way back.
 const [home,setHome]=useState<{url:string;name:string|null}|null>(null);
 // JR-19: after about two minutes without a subscription, stop saying "confirming" and say what to do.
 const [waited,setWaited]=useState(false);
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
   if(active&&state.snapshot?.state==='ready'){const {applicationUrl:url,businessName:name}=state.snapshot.status;if(url)setHome(now=>now&&now.url===url&&now.name===name?now:{url,name});}
  },signal=>transport.read(signal),value=>value as CentralRead,reason=>({state:'unavailable',reason}),()=> 'read_failed');
  controls.current=controller;
  const pause=()=>{cancel();transport.pause();controller.pause();};
  // JR-11: the one-time handoff is exchanged only once the page is in front. Until then it waits in memory (the
  // address bar is already scrubbed), so a page opened in a background tab is not left with "access has ended".
  let armed=false;
  const begin=()=>{
   const value=proof.current;if(!armed||!value||!foreground())return;proof.current=null;
   void transport.enter(value).then(result=>{if(!active)return;if(result!=='ready'){setLink(result==='invalid'?'denied':'unavailable');return;}setLink('ready');if(foreground())controller.start();});
  };
  const resume=()=>{controller.pause();if(!foreground())return;if(proof.current)begin();else if(transport.hasSession())controller.start();};
  const visibility=()=>{if(document.visibilityState==='hidden')pause();else resume();};
  const retire=()=>{proof.current=null;pause();transport.dispose();setPending(false);setLink('denied');};
  document.addEventListener('visibilitychange',visibility);for(const event of ['blur','offline'])window.addEventListener(event,pause);for(const event of ['focus','online','storage','pageshow'])window.addEventListener(event,resume);window.addEventListener('pagehide',retire);
  const start=setTimeout(()=>{
   armed=true;setPending(false);
   if(!apiOrigin){proof.current=null;setLink('unavailable');return;}if(!proof.current){setLink('entry');return;}
   begin();
  },0);
  return()=>{active=false;clearTimeout(start);cancel();controller.stop();transport.dispose();current.current=empty;if(client.current===transport)client.current=null;if(controls.current===controller)controls.current=null;document.removeEventListener('visibilitychange',visibility);for(const event of ['blur','offline'])window.removeEventListener(event,pause);for(const event of ['focus','online','storage','pageshow'])window.removeEventListener(event,resume);window.removeEventListener('pagehide',retire);queueMicrotask(()=>{if(lifetime.value===setup)proof.current=null;});};
 },[apiOrigin]);
 useEffect(()=>{if(problem&&foreground())alert.current?.focus();},[problem]);
 useEffect(()=>{if(!returning)return;const timer=setTimeout(()=>setWaited(true),120000);return()=>clearTimeout(timer);},[returning]);
 const ready=panel.snapshot?.state==='ready'?panel.snapshot:null,t=words[lang];
 async function financial(action?:BillingAction){
  if(mutation.current||!foreground()||current.current.snapshot?.state!=='ready')return;
  const transport=client.current;if(!transport)return;const controller=new AbortController();mutation.current=controller;setOpening(true);setProblem(null);
  try{const request=action?transport.action(action,lang,controller.signal):transport.retry(controller.signal);setPending(transport.hasPending());const result=await request;
   if(mutation.current!==controller||controller.signal.aborted||!foreground()||current.current.snapshot?.state!=='ready')return;
   // Codex (Nov 15, 2026): read the held operation again after the answer. A final refusal retires it (no Retry for an
   // operation the service closed); anything uncertain keeps the original key and body for the person's own retry.
   setPending(transport.hasPending());
   if(result.kind==='denied'){setPending(false);controls.current?.pause();setLink('denied');return;}
   if(result.kind==='navigate'){try{window.location.assign(result.url);}catch{setProblem({kind:'unknown'});}}else if(result.kind!=='busy')setProblem(result);
  }finally{if(mutation.current===controller){mutation.current=null;setOpening(false);}}
 }
 const refresh=()=>{setProblem(null);if(foreground())controls.current?.start();};
 const close=()=>{controls.current?.pause();mutation.current?.abort();setPending(false);setLink('denied');void client.current?.signOut();};
 const manage=ready?.status.billingAction==='portal';
 const date=(value:string)=>new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:ready?.status.timeZone??'UTC'}).format(new Date(value));
 const notice=ready?accessNotice(lang,ready.status):null;
 // JR-19: on the return page a current subscription on working access is the confirmation; a return URL never is.
 const subscribed=returning&&manage&&(ready?.status.state==='paid'||ready?.status.state==='trial');
 const confirming=returning&&!subscribed&&!waited&&(link==='loading'||link==='ready');
 const unseen=returning&&!subscribed&&waited&&!!ready;
 const waiting=link==='loading'||link==='ready'&&panel.refreshing;
 // JR-10: the service's refusal code picks the words and the next step; a refusal without a known code keeps the general line.
 const refusal=problem&&(problem.kind==='refused'||problem.kind==='conflict')?problem.refusal:undefined;
 const contact=notice?.contact||refusal==='quote'||refusal==='review';
 // JR-11: the workplace to go back to, from the status on screen or the last one this session showed.
 const known=ready?.status.applicationUrl?{url:ready.status.applicationUrl,name:ready.status.businessName}:home;
 // Phase 5 (Nov 17, 2026): one filled button per state. The way back is that button only when nothing else can be
 // done here (no status, or the subscription is confirmed); otherwise it is a text link with the page's other
 // non-payment choices (Refresh status, Close billing), as the links under the sign-in card.
 const primaryBack=!ready||subscribed;
 const back=<a className={primaryBack?styles.action:styles.quiet} href={known?known.url+'/app':'/login'}>{known?known.name?t.backTo(known.name):t.backWorkplace:t.backSignIn}</a>;
 const language=<fieldset className={styles.language}><legend className={styles.srOnly}>{t.language}</legend><div className={styles.seg}>{(['en','es'] as const).map(value=><button key={value} type="button" lang={value} disabled={pending||opening} aria-pressed={lang===value} onClick={()=>{if(!client.current?.hasPending())setLang(value);}}>{value==='en'?'English':'Español'}</button>)}</div></fieldset>;
 return <RecoveryFrame lang={lang} language={language} legal={legal?.[lang]}><h1>{t.title}</h1><p>{t.intro}</p>
  <div aria-live="polite" aria-busy={link==='loading'||panel.refreshing}>
   {subscribed?<p className={styles.callout} data-tone="green" role="status"><CheckCircleIcon size={18} weight="bold" aria-hidden="true"/>{t.subscribed}</p>:unseen?<p className={styles.callout} data-tone="amber" role="status"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/>{t.unseen}</p>:confirming&&(ready||waiting)?<p className={styles.callout} data-tone="teal" role="status"><ClockIcon size={18} weight="bold" aria-hidden="true"/>{t.confirming}</p>:null}
   {ready?<><h2>{ready.status.businessName??t.title}</h2>{notice?<p className={styles.callout} data-tone={notice.tone} role="status"><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/>{notice.text}</p>:null}<dl className={styles.details}><div><dt>{t.access}</dt><dd>{t.states[ready.status.state]}</dd></div><div><dt>{t.plan}</dt><dd>{ready.status.plan===null?t.none:ready.status.plan==='small'?'Small':'Team'}</dd></div><div><dt>{t.people}</dt><dd>{ready.status.activeEmployees} / {ready.status.employeeLimit}</dd></div>{([[t.trial,ready.status.trialEndsAt],[t.paid,ready.status.paidThrough],[t.grace,ready.status.graceEndsAt]] as const).map(([label,value])=>value?<div key={label}><dt>{label}</dt><dd>{date(value)}</dd></div>:null)}</dl>{ready.status.timeZone===null?<p className={styles.footer}>{t.utc}</p>:null}<ul className={styles.plans}>{ready.catalog.plans.map(plan=><li key={plan.key}>{plan.key==='small'?'Small':'Team'} · {new Intl.NumberFormat(lang,{style:'currency',currency:ready.catalog.currency,currencyDisplay:'code'}).format(plan.amount/100)} {t.month}</li>)}</ul></>:confirming&&waiting?null:<p className={styles.callout} role="status">{waiting?t.loading:link==='entry'?t.entry:link==='denied'?t.denied:link==='unavailable'?t.unavailable:t.hidden}</p>}
  </div>
  {problem?<p className={styles.callout} data-tone="red" role="alert" tabIndex={-1} ref={alert}><WarningCircleIcon size={18} weight="bold" aria-hidden="true"/>{problem.kind==='unknown'?t.unknown:refusal==='quote'?quoteNotice(lang):refusal?t.refusals[refusal]:problem.kind==='conflict'?t.conflict:problem.kind==='denied'?t.denied:t.refused}</p>:null}
  {ready&&ready.status.billingAction===null?<p className={styles.callout} role="status">{t.unavailable}</p>:null}
  <div className={styles.actions}>
   {subscribed?back:null}
   {contact?<a className={subscribed?styles.secondary:styles.action} href={`mailto:${supportEmail}`}>{contactLabel(lang)}</a>:null}
   {ready&&!pending&&!confirming&&ready.status.billingAction!==null?<><button className={subscribed||contact?styles.secondary:styles.action} disabled={opening} type="button" onClick={()=>void financial(manage?'portal':'checkout')}>{opening?t.opening:manage?t.portal:t.checkout}</button>{manage&&ready.status.state==='paid'&&ready.status.plan==='small'?<button className={styles.secondary} type="button" disabled={opening||ready.status.activeEmployees>30} onClick={()=>void financial('team')}>{t.team}</button>:null}{manage&&ready.status.state==='paid'&&ready.status.plan==='team'&&ready.status.activeEmployees<=15?<button className={styles.secondary} type="button" disabled={opening} onClick={()=>void financial('small')}>{t.small}</button>:null}</>:null}
   {pending?<button className={contact?styles.secondary:styles.action} type="button" disabled={opening||!ready} onClick={()=>void financial()}>{opening?t.opening:t.retry}</button>:null}
   {subscribed?null:primaryBack?back:null}
   {link==='ready'||!primaryBack?<div className={styles.links}>
    {link==='ready'?<button className={styles.quiet} type="button" disabled={opening||panel.refreshing} onClick={refresh}>{t.refresh}</button>:null}
    {primaryBack?null:back}
    {link==='ready'?<button className={styles.quiet} type="button" onClick={close}>{t.close}</button>:null}
   </div>:null}
  </div><p className={styles.footer}>{t.change}</p><p className={styles.footer}>{t.note}</p>
 </RecoveryFrame>;
}
