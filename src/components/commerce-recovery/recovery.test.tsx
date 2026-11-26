import * as rstestOriginal0 from "@/lib/data/workspaces" with { rstest: 'importActual' };
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
const state=rs.hoisted(()=>({role:'OWNER',lang:'en',saved:rs.fn(),session:rs.fn(),path:'/app/billing',workspace:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({requireSession:state.session,readSessionMutationProof:async()=>({employee:{id:'fictional'}})}));
rs.mock('@/lib/activation/language.server',()=>({readSavedLanguage:state.saved}));
rs.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
rs.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>true}));
rs.mock('@/lib/data/workspaces', ()=>({...rstestOriginal0,getWorkspace:state.workspace}));
rs.mock('next/navigation',()=>({notFound:()=>{throw Error('not_found');},usePathname:()=>state.path}));
import recoveryStyles from './recovery.module.css';
import BillingPage,{generateMetadata} from '@/app/app/billing/page';
import PausedPage from '@/app/clocker/access/paused/page';
import {billingDestination} from './billing';
import {accessNotice,contactLabel,unreachableNotice} from './copy';
import {clockerReturnPath} from '@/lib/commerce/recovery-routes';
import {CommerceRecoveryBoundary} from '@/lib/commerce/recovery-boundary';
beforeEach(()=>{rs.stubEnv('NEVORA_COMMERCE_ENABLED','true');state.role='OWNER';state.lang='en';state.saved.mockReset().mockResolvedValue(null);state.path='/app/billing';state.session.mockReset().mockImplementation(async()=>({id:'fictional',role:state.role}));state.workspace.mockReset().mockResolvedValue({timeZone:'America/Puerto_Rico'});});
it('keeps Owner billing status loading until an authenticated current read completes',async()=>{
 const html=renderToStaticMarkup(await BillingPage());expect(html).toContain('Checking workplace access');expect(html).toContain('disabled');expect(html).not.toContain('Active employees');
});
it.each(['EMPLOYEE','LEAD','MANAGER'])('does not mount private billing reads or controls for %s',async role=>{
 state.role=role;const html=renderToStaticMarkup(await BillingPage());expect(html).toContain('Ask your workplace Owner');expect(html).not.toContain('Open billing in Velani');expect(html).not.toContain('Checking workplace access');expect(html).toContain('/app/my-pay');
});
it('requires the session before billing presentation and denies disabled commerce',async()=>{
 state.session.mockRejectedValueOnce(Error('signed_out'));await expect(BillingPage()).rejects.toThrow('signed_out');rs.stubEnv('NEVORA_COMMERCE_ENABLED','false');await expect(BillingPage()).rejects.toThrow('not_found');
});
it.each(['//evil.invalid','https://evil.invalid','/clocker/main?private=1','/clocker/main#hash','/clocker/../app','/clocker/access/paused','/clocker/'+ 'a'.repeat(65),['/clocker/main']])('rejects an unbounded Clocker return path %j',value=>expect(clockerReturnPath(value)).toBeNull());
it.each(['/clocker/main','/clocker/friends-aguada'])('preserves exact safe Clocker return %s',value=>expect(clockerReturnPath(value)).toBe(value));
it('keeps the public tablet recovery screen free of private status and arbitrary query content',async()=>{
 const html=renderToStaticMarkup(await PausedPage({searchParams:Promise.resolve({reason:'billing_status_unavailable',from:'https://evil.invalid/private',secret:'must-not-echo'})}));
 expect(html).toContain('Access could not be checked');expect(html).toContain('Open billing on your own device.');expect(html).not.toContain('/login');expect(html).not.toContain('>Try again</a>');expect(html).not.toContain('evil.invalid');expect(html).not.toContain('must-not-echo');expect(state.session).not.toHaveBeenCalled();
});
it('uses Spanish copy without exposing a billing-status payload on the tablet',async()=>{
 state.lang='es';const html=renderToStaticMarkup(await PausedPage({searchParams:Promise.resolve({from:'/clocker/main'})}));expect(html).toContain('>Intentar de nuevo</a>');expect(html).toContain('href="/clocker/main"');expect(html).not.toContain('Active employees');
});
it('unmounts retained operational shell and sheets on recovery entry, preserving them on ordinary routes',()=>{
 const render=()=>renderToStaticMarkup(<CommerceRecoveryBoundary enabled shell={<aside>OPERATIONAL POLLERS AND SHEET</aside>}><h1>BILLING</h1></CommerceRecoveryBoundary>);
 expect(render()).not.toContain('OPERATIONAL');state.path='/app/schedule';expect(render()).toContain('OPERATIONAL');
});
it('holds operational content until a recovery-first layout obtains a fresh document',()=>{
 state.path='/app/schedule';const html=renderToStaticMarkup(<CommerceRecoveryBoundary enabled initialRecovery><p>PRIVATE</p></CommerceRecoveryBoundary>);expect(html).toContain('Opening your workspace');expect(html).not.toContain('PRIVATE');
});
it('accepts only the trusted bounded billing handoff destination',()=>{
 const trusted='https://www.thevelani.com',path='/pages/plans#handoff='+'a'.repeat(43);
 expect(billingDestination({url:trusted+path},trusted)).toBe(trusted+path);
 for(const url of ['https://evil.invalid'+path,'http://www.thevelani.com'+path,trusted+'/other#handoff='+'a'.repeat(43),trusted+'/pages/plans?secret=1#handoff='+'a'.repeat(43),trusted+'/pages/plans#handoff=bad','javascript:alert(1)'])expect(()=>billingDestination({url},trusted)).toThrow();
});
it.each([['en','Language: Español','Sign out'],['es','Idioma: English','Cerrar sesión']])('frames billing on the sign-in look in %s: the wordmark, one language pill and Sign out for every role',async(lang,language,signOut)=>{
 state.lang=lang;
 for(const role of ['OWNER','MANAGER']){state.role=role;const html=renderToStaticMarkup(await BillingPage());expect(html).toContain('class="brand-wordmark"');expect(html).not.toContain('>NEVORA</p>');expect(html).toContain(`aria-label="${language}"`);expect(html).toMatch(new RegExp(`<form[^>]*><button[^>]*type="submit"[^>]*>${signOut}</button></form>`));expect(html).toContain('© 2026 VELANI LLC');}
});
it('still renders billing when the workplace time zone cannot be read, and reads it for the Owner only',async()=>{
 state.workspace.mockRejectedValueOnce(Error('unavailable'));expect(renderToStaticMarkup(await BillingPage())).toContain('Checking workplace access');expect(state.workspace).toHaveBeenCalledTimes(1);
 state.role='EMPLOYEE';await BillingPage();expect(state.workspace).toHaveBeenCalledTimes(1);
});
it.each(['en','es'] as const)('tells a non-Owner in %s when the billing check itself could not be reached, with a way to try again',async lang=>{
 state.role='MANAGER';state.lang=lang;
 const html=renderToStaticMarkup(await BillingPage({searchParams:Promise.resolve({reason:'billing_status_unavailable'})}));
 expect(html).toContain(unreachableNotice(lang));expect(html).toContain(lang==='en'?'tell your workplace Owner':'avísale al dueño');expect(html).toContain(lang==='en'?'Try again':'Intentar de nuevo');expect(html).not.toContain('Open billing in Velani');
 const paused=renderToStaticMarkup(await BillingPage({searchParams:Promise.resolve({reason:'subscription_required'})}));
 expect(paused).toContain(lang==='en'?'Ask your workplace Owner':'Pídele al dueño');expect(paused).not.toContain(lang==='en'?'Try again':'Intentar de nuevo');
});
it('titles the tab by what the page returns',async()=>{
 expect((await generateMetadata()).title).toBe('Workplace billing');state.lang='es';expect((await generateMetadata()).title).toBe('Facturación del negocio');
 rs.stubEnv('NEVORA_COMMERCE_ENABLED','false');expect(await generateMetadata()).toEqual({title:'Página no encontrada',robots:{index:false,follow:false},referrer:'no-referrer'});
});
const paused={state:'restricted',reason:null,activeEmployees:4,employeeLimit:15} as const;
it('gives one sentence per reason access is paused, in both languages',()=>{
 expect(accessNotice('en',paused)).toBeNull();
 expect(accessNotice('en',{...paused,reason:'trial_ended'})).toEqual({text:'Your free trial ended. Choose a plan to keep using NEVORA.',tone:'red',contact:false});
 expect(accessNotice('es',{...paused,reason:'trial_ended'})?.text).toBe('Tu prueba gratis terminó. Elige un plan para seguir usando NEVORA.');
 expect(accessNotice('en',{...paused,state:'grace',reason:'payment_failed'})).toEqual({text:'We couldn’t charge your card. Update your payment method.',tone:'amber',contact:false});
 expect(accessNotice('es',{...paused,reason:'payment_failed'})?.text).toBe('No pudimos cobrar a tu tarjeta. Actualiza tu método de pago.');
 expect(accessNotice('en',{...paused,reason:'subscription_canceled'})?.text).toBe('Your subscription ended. Subscribe again to continue.');
 expect(accessNotice('es',{...paused,reason:'subscription_canceled'})?.text).toBe('Tu suscripción terminó. Suscríbete de nuevo para continuar.');
 for(const reason of ['payment_required','setup_required','setup_pending'] as const)for(const lang of ['en','es'] as const)expect(accessNotice(lang,{...paused,reason})?.text).toMatch(/\.$/);
 expect(accessNotice('en',{...paused,reason:'setup_required'})?.contact).toBe(true);
});
it('explains the bare headcount: upgrade or deactivate up to 30 people, a quote with the support address above 30',()=>{
 expect(accessNotice('en',{...paused,reason:'employee_limit_exceeded',activeEmployees:17})).toEqual({text:'Your team has 17 active people and your plan covers 15. Upgrade, or deactivate people you no longer need.',tone:'red',contact:false});
 expect(accessNotice('es',{...paused,reason:'employee_limit_exceeded',activeEmployees:17})?.text).toBe('Tu equipo tiene 17 personas activas y tu plan cubre 15. Mejora tu plan o desactiva a las personas que ya no necesitas.');
 expect(accessNotice('en',{...paused,reason:'employee_limit_exceeded',activeEmployees:30})?.contact).toBe(false);
 expect(accessNotice('en',{...paused,reason:'employee_limit_exceeded',activeEmployees:31,employeeLimit:30})).toEqual({text:'Teams over 30 need a custom plan. Contact us for a quote.',tone:'red',contact:true});
 expect(accessNotice('es',{...paused,reason:'employee_limit_exceeded',activeEmployees:31})?.text).toBe('Los equipos de más de 30 personas necesitan un plan a la medida. Contáctanos para una cotización.');
 expect(contactLabel('en')).toBe('Email support@thevelani.com');expect(contactLabel('es')).toBe('Escribir a support@thevelani.com');
});

afterEach(()=>{ rs.unstubAllEnvs(); });
// J18 polish (Nov 24, 2026, Jose): on the non-Owner page, "My pay statements" sits in the actions block, so it has the
// same gap under the paragraph as the Owner's actions (the block's --b-space-20 top margin), with or without Try again.
it.each(['MANAGER','EMPLOYEE'])('%s: My pay statements sits in the actions block under the paragraph',async role=>{
 state.role=role;
 for(const searchParams of [undefined,Promise.resolve({reason:'billing_status_unavailable'})]){
  const html=renderToStaticMarkup(await BillingPage(searchParams?{searchParams}:undefined));
  const actions=html.indexOf(`<div class="${recoveryStyles.actions}">`),pay=html.indexOf('href="/app/my-pay"'),paragraph=html.lastIndexOf('</p>',pay);
  expect(actions).toBeGreaterThan(paragraph);expect(pay).toBeGreaterThan(actions);
  expect(html.slice(actions,pay)).not.toContain('</p>');
 }
});

it('uses the saved profile by default and confines an explicit language choice to the billing view',async()=>{
 state.saved.mockResolvedValue('es');
 expect((await generateMetadata()).title).toBe('Facturación del negocio');
 expect(renderToStaticMarkup(await BillingPage())).toContain('Consultando el acceso del negocio');
 const override={searchParams:Promise.resolve({billingLang:'en'})};
 expect((await generateMetadata(override)).title).toBe('Workplace billing');
 expect(renderToStaticMarkup(await BillingPage(override))).toContain('Checking workplace access');
 expect((await generateMetadata({searchParams:Promise.resolve({billingLang:'unknown'})})).title).toBe('Facturación del negocio');
 expect((await generateMetadata()).title).toBe('Facturación del negocio');
});
