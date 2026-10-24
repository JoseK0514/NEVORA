import {beforeEach,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const payroll = vi.hoisted(() => ({ enabled: false, canConfigure: false }));
vi.mock('@/lib/auth/permissions',()=>({requireRoles:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'fictional-owner',role:'OWNER'}})}));
vi.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>payroll.enabled,readPayrollCapabilities:async()=>({enabled:payroll.enabled,canConfigure:payroll.canConfigure})}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'w',name:'Fictional Workspace',timeZone:'America/Puerto_Rico',active:true})}));
vi.mock('@/components/kit/kit',()=>import('../../../components/kit/kit'));
import SettingsPage from './page';
import {requireRoles} from '@/lib/auth/permissions';
beforeEach(()=>{payroll.enabled=false;payroll.canConfigure=false;});
it('Owner settings exposes working workspace, location and position destinations',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of ['workspace','locations','positions'])expect(html).toContain(`href="/app/settings/${path}"`);
 expect(html).not.toContain('two Fuel');
 // Quiet (v4): back to More; the groups are Company, Scheduling and Pay.
 expect(html).toContain('href="/app/more"');
 for(const group of ['Company','Scheduling'])expect(html).toContain(`>${group}</h2>`);
});

it('makes registered Clocker device setup discoverable from Settings',async()=>{
 expect(renderToStaticMarkup(await SettingsPage())).toContain('href="/app/settings/clocker"');
});

it('makes operational break configuration discoverable',async()=>{expect(renderToStaticMarkup(await SettingsPage())).toContain('href="/app/settings/breaks"');});

// Quiet (v4, approved Oct 23): Settings holds the company's own settings as one-line rows. Scheduling rules open
// from Schedule, the two recovery tools from Team, and Updates from More, so they are not repeated here.
it('keeps every company setting as exactly one named row',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of [
  '/app/settings/workspace','/app/settings/locations','/app/settings/branding','/app/settings/features','/app/settings/clocker',
  '/app/settings/breaks','/app/settings/positions','/app/settings/company-policies',
 ])expect(html.match(new RegExp(`class="q-row q-row--one" href="${path}"`,'g'))).toHaveLength(1);
 for(const label of ['Company profile','Locations','Branding','Features and words','Company policies','Positions','Break types','Clocker devices'])expect(html).toContain(`<b>${label}</b>`);
});

it.each([[false,false],[true,false],[true,true]])('payroll configuration requires enabled=%s and canConfigure=%s',async(enabled,canConfigure)=>{
 payroll.enabled=enabled;payroll.canConfigure=canConfigure;
 const html=renderToStaticMarkup(await SettingsPage());
 expect(html.includes('href="/app/settings/payroll"')).toBe(enabled&&canConfigure);
 expect(html).toContain('href="/app/settings/company-policies"');
});

it('requires Owner authorization before returning any settings content',async()=>{
 const guard=vi.mocked(requireRoles);
 guard.mockClear();
 const denied=new Error('fictional authorization refusal');
 guard.mockRejectedValueOnce(denied);
 await expect(SettingsPage()).rejects.toBe(denied);
 expect(guard).toHaveBeenCalledExactlyOnceWith(['OWNER']);
});
