import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const state=vi.hoisted(()=>({role:'OWNER',lang:'en',session:vi.fn(),path:'/app/billing'}));
vi.mock('@/lib/auth/session',()=>({requireSession:state.session}));
vi.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
vi.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>true}));
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('not_found');},usePathname:()=>state.path}));
import BillingPage from '@/app/app/billing/page';
import PausedPage from '@/app/clocker/access/paused/page';
import {billingDestination} from './billing';
import {clockerReturnPath} from '@/lib/commerce/recovery-routes';
import {CommerceRecoveryBoundary} from '@/lib/commerce/recovery-boundary';
beforeEach(()=>{vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');state.role='OWNER';state.lang='en';state.path='/app/billing';state.session.mockReset().mockImplementation(async()=>({id:'fictional',role:state.role}));});
it('keeps Owner billing status loading until an authenticated current read completes',async()=>{
 const html=renderToStaticMarkup(await BillingPage());expect(html).toContain('Checking workplace access');expect(html).toContain('disabled');expect(html).not.toContain('Active employees');
});
it.each(['EMPLOYEE','LEAD','MANAGER'])('does not mount private billing reads or controls for %s',async role=>{
 state.role=role;const html=renderToStaticMarkup(await BillingPage());expect(html).toContain('Ask your workplace Owner');expect(html).not.toContain('Open billing in Velani');expect(html).not.toContain('Checking workplace access');expect(html).toContain('/app/my-pay');
});
it('requires the session before billing presentation and denies disabled commerce',async()=>{
 state.session.mockRejectedValueOnce(Error('signed_out'));await expect(BillingPage()).rejects.toThrow('signed_out');vi.stubEnv('NEVORA_COMMERCE_ENABLED','false');await expect(BillingPage()).rejects.toThrow('not_found');
});
it.each(['//evil.invalid','https://evil.invalid','/clocker/main?private=1','/clocker/main#hash','/clocker/../app','/clocker/access/paused','/clocker/'+ 'a'.repeat(65),['/clocker/main']])('rejects an unbounded Clocker return path %j',value=>expect(clockerReturnPath(value)).toBeNull());
it.each(['/clocker/main','/clocker/friends-aguada'])('preserves exact safe Clocker return %s',value=>expect(clockerReturnPath(value)).toBe(value));
it('keeps the public tablet recovery screen free of private status and arbitrary query content',async()=>{
 const html=renderToStaticMarkup(await PausedPage({searchParams:Promise.resolve({reason:'billing_status_unavailable',from:'https://evil.invalid/private',secret:'must-not-echo'})}));
 expect(html).toContain('Access could not be checked');expect(html).toContain('Owner sign in');expect(html).not.toContain('Try Clocker again');expect(html).not.toContain('evil.invalid');expect(html).not.toContain('must-not-echo');expect(state.session).not.toHaveBeenCalled();
});
it('uses Spanish copy without exposing a billing-status payload on the tablet',async()=>{
 state.lang='es';const html=renderToStaticMarkup(await PausedPage({searchParams:Promise.resolve({from:'/clocker/main'})}));expect(html).toContain('Intentar el Clocker de nuevo');expect(html).toContain('href="/clocker/main"');expect(html).not.toContain('Active employees');
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

afterEach(()=>vi.unstubAllEnvs());
