import {beforeEach,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const payroll = vi.hoisted(() => ({ enabled: false, canConfigure: false }));
vi.mock('@/lib/auth/permissions',()=>({requireRoles:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'fictional-owner',role:'OWNER'}})}));
vi.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>payroll.enabled,readPayrollCapabilities:async()=>({enabled:payroll.enabled,canConfigure:payroll.canConfigure})}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'w',name:'Fictional Workspace',timeZone:'America/Puerto_Rico',active:true})}));
vi.mock('@/components/kit/kit',()=>import('../../../components/kit/kit'));
vi.mock('next/link',async()=>{const {createElement}=await import('react');return {default:({href,children,prefetch:_p,...props}:{href:string;children?:React.ReactNode;prefetch?:boolean})=>createElement('a',{href,...props},children)};});
const reads=vi.hoisted(()=>({devices:[] as {state:string}[],breaks:[] as {active:boolean}[]}));
vi.mock('@/lib/data/employees',()=>({listLocations:async()=>[{id:'l1'},{id:'l2'}]}));
vi.mock('@/lib/data/positions',()=>({listPositions:async()=>[{id:'p1'}]}));
vi.mock('@/lib/clocker/break-types.server',()=>({listBreakTypes:async()=>reads.breaks}));
vi.mock('@/lib/clocker/devices.server',()=>({listClockerDevices:async()=>reads.devices}));
vi.mock('@/lib/workspace-presentation/current.server',()=>({currentPresentation:async()=>({words:'standard',modules:undefined})}));
import SettingsPage from './page';
import {requireRoles} from '@/lib/auth/permissions';
beforeEach(()=>{payroll.enabled=false;payroll.canConfigure=false;reads.devices=[];reads.breaks=[];});
it('Owner settings exposes working workspace, location and position destinations',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of ['workspace','locations','positions'])expect(html).toContain(`href="/app/settings/${path}"`);
 expect(html).not.toContain('two Fuel');
 // Back to More on a phone; each group is its card's header (Owner premium A9).
 expect(html).toContain('href="/app/more"');
 for(const group of ['Company','Scheduling','Clocker'])expect(html).toContain(`>${group}</h2>`);
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
 ])expect(html.match(new RegExp(`<a href="${path}" class="c-row c-row--one"`,'g'))).toHaveLength(1);
 // Rows are 15/400 (no bold title class), named as their pages are (A3: Clocker tablets).
 for(const label of ['Company profile','Locations','Branding','Features and words','Company policies','Positions','Break types','Clocker tablets'])expect(html).toContain(`<span class="c-row__title">${label}</span>`);
 expect(html).not.toContain('c-row__title--b');
 // Your profile and the notification feed are not settings (one profile entry, in More).
 expect(html).not.toContain('href="/app/profile"');expect(html).not.toContain('href="/app/notifications"');
});

it('says Set up for a zero count, and counts tablets waiting for setup instead of a bare 0',async()=>{
 reads.devices=[{state:'UNREGISTERED'},{state:'PENDING'}];
 let html=renderToStaticMarkup(await SettingsPage());
 expect(html).toMatch(/Break types<\/span><\/span><span class="c-row__value c-row__value--soft">Set up</);
 expect(html).toMatch(/Clocker tablets<\/span><\/span><span class="c-row__value c-row__value--soft">2 need setup</);
 reads.devices=[{state:'ACTIVE'}];reads.breaks=[{active:true}];
 html=renderToStaticMarkup(await SettingsPage());
 expect(html).toMatch(/Clocker tablets<\/span><\/span><span class="c-row__value c-row__value--soft">1</);
 expect(html).toMatch(/Break types<\/span><\/span><span class="c-row__value c-row__value--soft">1</);
});

it('keeps Clocker recovery reachable from Settings, returning there',async()=>{
 expect(renderToStaticMarkup(await SettingsPage())).toContain('href="/app/clocker-recovery?from=settings"');
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
