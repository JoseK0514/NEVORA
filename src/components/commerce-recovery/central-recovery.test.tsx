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
function render(action:unknown,lang:'en'|'es'='en'){
 fixture.snapshot={state:'ready',observedAt:'2026-11-13T23:52:28.000Z',validForMs:15000,
  status:parseCentralStatus({...base,...(action===undefined?{}:{billingAction:action})}),
  catalog:{currency:'usd',trialDays:30,plans:[{key:'small',employees:15,amount:1900},{key:'team',employees:30,amount:2900}]}};
 return renderToStaticMarkup(<CentralBilling apiOrigin="http://127.0.0.1:39991" initialLanguage={lang}/>);
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
