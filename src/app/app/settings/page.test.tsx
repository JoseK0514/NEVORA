import * as rstestOriginal0 from "react";
import {beforeEach,it,expect,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
const payroll = rs.hoisted(() => ({ enabled: false, canConfigure: false }));
rs.mock('@/lib/auth/permissions',()=>({requireRoles:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'fictional-owner',role:'OWNER'}})}));
rs.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>payroll.enabled,readPayrollCapabilities:async()=>({enabled:payroll.enabled,canConfigure:payroll.canConfigure})}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'w',name:'Fictional Workspace',timeZone:'America/Puerto_Rico',active:true})}));

rs.mock('next/link',()=>{const {createElement}=rstestOriginal0;return {default:({href,children,prefetch:_p,...props}:{href:string;children?:React.ReactNode;prefetch?:boolean})=>createElement('a',{href,...props},children)};});
const reads=rs.hoisted(()=>({devices:[] as {state:string}[],breaks:[] as {active:boolean}[]}));
rs.mock('@/lib/data/employees',()=>({listLocations:async()=>[{id:'l1'},{id:'l2'}]}));
rs.mock('@/lib/data/positions',()=>({listPositions:async()=>[{id:'p1'}]}));
rs.mock('@/lib/clocker/break-types.server',()=>({listBreakTypes:async()=>reads.breaks}));
rs.mock('@/lib/clocker/devices.server',()=>({listClockerDevices:async()=>reads.devices}));
rs.mock('@/lib/workspace-presentation/current.server',()=>({currentPresentation:async()=>({words:'standard',modules:undefined})}));
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

it('lists Shift matching with the other Clocker settings',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 expect(html.match(/<a href="\/app\/settings\/clocker\/matching" class="c-row c-row--one"/g)).toHaveLength(1);
 expect(html).toContain('<span class="c-row__title">Shift matching</span>');
});

// Quiet (v4, approved Oct 23): Settings holds the company's own settings as one-line rows. Scheduling rules open
// from Schedule, the two recovery tools from Team, and Updates from More, so they are not repeated here.
it('keeps every company setting as exactly one named row',async()=>{
 const html=renderToStaticMarkup(await SettingsPage());
 for(const path of [
  '/app/settings/workspace','/app/settings/locations','/app/settings/branding','/app/settings/features','/app/settings/clocker',
  '/app/settings/breaks','/app/settings/positions','/app/settings/company-policies',
 ])expect(html.match(new RegExp(`<a href="${path}" class="c-row c-row--one"`,'g'))).toHaveLength(1);
 // Rows are 15/400 (no bold title class), named as their pages are (A3: Clocker tablets).
 for(const label of ['Company profile','Locations','Branding','Features and team terms','Company policies','Positions','Break types','Clocker tablets'])expect(html).toContain(`<span class="c-row__title">${label}</span>`);
 expect(html).not.toContain('c-row__title--b');
 // Your profile and the notification feed are not settings (one profile entry, in More).
 expect(html).not.toContain('href="/app/profile"');expect(html).not.toContain('href="/app/notifications"');
});

it('says Set up for a zero count, and counts tablets waiting for setup instead of a bare 0',async()=>{
 reads.devices=[{state:'UNREGISTERED'},{state:'PENDING'}];
 let html=renderToStaticMarkup(await SettingsPage());
 expect(html).toMatch(/Break types<\/span><\/span><span class="c-row__value c-row__value--soft">None yet</);
 // Review B5 (NV-247): tablets waiting for setup are an amber chip; plain counts stay grey.
 expect(html).toMatch(/Clocker tablets<\/span><\/span><span class="c-row__trail"><span class="c-pill c-pill--amber b-chip b-chip--amber">2 not set up</);
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
 const guard=rs.mocked(requireRoles);
 guard.mockClear();
 const denied=new Error('fictional authorization refusal');
 guard.mockRejectedValueOnce(denied);
 await expect(SettingsPage()).rejects.toBe(denied);
 expect(guard).toHaveBeenCalledExactlyOnceWith(['OWNER']);
});

// Review Nov 14 (AR-13, JR-4): the subscription has a row in Company, only where this deployment has billing on.
it('lists Plan and billing in Company only while billing is on for this deployment',async()=>{
 expect(renderToStaticMarkup(await SettingsPage())).not.toContain('href="/app/billing"');
 rs.stubEnv('NEVORA_COMMERCE_ENABLED','true');
 try{
  const html=renderToStaticMarkup(await SettingsPage());
  expect(html.match(/<a href="\/app\/billing" class="c-row c-row--one"/g)).toHaveLength(1);
  expect(html).toContain('<span class="c-row__title">Plan and billing</span>');
  // It sits in Company, after Company policies and before Scheduling.
  expect(html.indexOf('href="/app/settings/company-policies"')).toBeLessThan(html.indexOf('href="/app/billing"'));
  expect(html.indexOf('href="/app/billing"')).toBeLessThan(html.indexOf('href="/app/settings/positions"'));
 }finally{rs.unstubAllEnvs();}
});

it('links the Owner settings hub to its activity log', async () => {
  expect(renderToStaticMarkup(await SettingsPage())).toContain('href="/app/settings/activity"');
});
