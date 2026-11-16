import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture=vi.hoisted(()=>({snapshot:null as unknown}));
// Seed the real component's private snapshot for static rendering. Effects,
// browser lifetime, normal Owner proof and real Stripe remain separate retests.
vi.mock('react',async original=>{
 const actual=await original<typeof import('react')>();
 return {...actual,useState:(initial:unknown)=>actual.useState(
  initial&&typeof initial==='object'&&'snapshot'in initial&&'paused'in initial
   ?{snapshot:fixture.snapshot,paused:false,refreshing:false}:initial)};
});
import {CentralBilling} from './central';
import {parseCentralStatus} from '@/lib/commerce/central-billing';
const base={state:'paid',operational:true,trialEndsAt:'2026-12-09T00:06:15.800Z',paidThrough:'2026-12-09T00:29:58.000Z',
 graceEndsAt:null,plan:'small',employeeLimit:15,activeEmployees:1,reason:null,billing:true,export:true,
 businessName:'Fictional recovery',applicationUrl:'https://company.example.test',timeZone:'America/Puerto_Rico'};
function render(action:unknown,lang:'en'|'es'='en',returning=false,status:Record<string,unknown>={}){
 fixture.snapshot={state:'ready',observedAt:'2026-11-13T23:52:28.000Z',validForMs:15000,
  status:parseCentralStatus({...base,...status,...(action===undefined?{}:{billingAction:action})}),
  catalog:{currency:'usd',trialDays:30,plans:[{key:'small',employees:15,amount:1900},{key:'team',employees:30,amount:2900}]}};
 return renderToStaticMarkup(<CentralBilling apiOrigin="http://127.0.0.1:39991" initialLanguage={lang} returning={returning}/>);
}
afterEach(()=>{fixture.snapshot=null;});
it.each(['en','es'] as const)('renders replacement Checkout for paid access with a terminal subscription in %s without plan-change controls',lang=>{
 const html=render('checkout',lang);
 expect(html).toContain(lang==='en'?'Review subscription in Stripe':'Revisar suscripción en Stripe');
 expect(html).not.toContain(lang==='en'?'Manage billing in Stripe':'Administrar facturación en Stripe');
 expect(html).not.toContain(lang==='en'?'Review Team plan':'Revisar plan Team');
 expect(html).toContain(lang==='en'?'Active':'Activo');
});
it('keeps current subscriptions on Portal with existing paid plan-change controls',()=>{
 const html=render('portal');expect(html).toContain('Manage billing in Stripe');expect(html).toContain('Review Team plan');
 expect(html).not.toContain('Review subscription in Stripe');
});
it.each([null,undefined])('does not infer a financial action from paid access when billingAction is %s',action=>{
 const html=render(action);expect(html).not.toContain('Manage billing in Stripe');expect(html).not.toContain('Review subscription in Stripe');
 expect(html).not.toContain('Review Team plan');
});
it('rejects an unknown billing-action value rather than rendering a guessed replacement',()=>{
 expect(()=>render('unknown')).toThrow();
});
it.each(['en','es'] as const)('names the page for what it is and links back to the workplace from its status in %s',lang=>{
 const html=render('portal',lang);
 expect(html).toContain(lang==='en'?'<h1>Plan and billing</h1>':'<h1>Plan y facturación</h1>');expect(html).not.toContain(lang==='en'?'NEVORA billing':'Facturación de NEVORA');
 expect(html).toMatch(new RegExp(`<a[^>]*href="https://company\\.example\\.test/app"[^>]*>${lang==='en'?'Back to Fictional recovery':'Volver a Fictional recovery'}</a>`));
 expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>(English|Español)<\/button>/);expect(html).toContain('>English</button>');expect(html).toContain('>Español</button>');
});
it.each(['en','es'] as const)('gives a real link to sign-in in %s when no workplace is known',lang=>{
 fixture.snapshot=null;const html=renderToStaticMarkup(<CentralBilling apiOrigin="http://127.0.0.1:39991" initialLanguage={lang}/>);
 expect(html).toMatch(new RegExp(`<a[^>]*href="/login"[^>]*>${lang==='en'?'Back to NEVORA sign-in':'Volver al inicio de sesión de NEVORA'}</a>`));expect(html).not.toContain('<dl');
});
it.each(['en','es'] as const)('confirms a Stripe return in %s only from a current subscription, and offers no second checkout while confirming',lang=>{
 const waiting=render('checkout',lang,true);
 expect(waiting).toContain(lang==='en'?'Confirming your payment with Stripe…':'Confirmando tu pago con Stripe…');expect(waiting).not.toContain(lang==='en'?'Review subscription in Stripe':'Revisar suscripción en Stripe');expect(waiting).not.toContain(lang==='en'?'You’re subscribed.':'Tu suscripción está activa.');
 const done=render('portal',lang,true);
 expect(done).toContain(lang==='en'?'You’re subscribed.':'Tu suscripción está activa.');expect(done).not.toContain(lang==='en'?'Confirming your payment':'Confirmando tu pago');
 expect(done).toContain(lang==='en'?'Back to Fictional recovery':'Volver a Fictional recovery');expect(done).toContain(lang==='en'?'Manage billing in Stripe':'Administrar facturación en Stripe');
 const unpaid=render('portal',lang,true,{state:'grace',graceEndsAt:'2026-12-16T00:00:00.000Z',reason:'payment_failed'});
 expect(unpaid).not.toContain(lang==='en'?'You’re subscribed.':'Tu suscripción está activa.');expect(unpaid).toContain(lang==='en'?'We couldn’t charge your card.':'No pudimos cobrar a tu tarjeta.');
 expect(render('checkout',lang)).not.toContain(lang==='en'?'Confirming your payment':'Confirmando tu pago');
});
it('sends a team over 30 to a quote with the support address',()=>{
 const html=render('portal','en',false,{state:'restricted',operational:false,plan:'team',employeeLimit:30,activeEmployees:31,reason:'employee_limit_exceeded'});
 expect(html).toContain('Teams over 30 need a custom plan. Contact us for a quote.');expect(html).toContain('href="mailto:support@thevelani.com"');expect(html).toContain('Email support@thevelani.com');expect(html).toContain('31 / 30');
});
