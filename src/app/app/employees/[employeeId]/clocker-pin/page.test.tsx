import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, rs } from '@rstest/core';

const m = rs.hoisted(() => ({ role: 'OWNER', targetRole: 'EMPLOYEE', active: true, version: 0, unavailable: false, denied: false, missing: false, read: rs.fn(), profile:rs.fn() }));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>m.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load()}}));
rs.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { href, ...props }, children) }));
rs.mock('next/navigation', () => ({ notFound: () => { throw Error('notFound'); } }));
rs.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER', 'MANAGER'], requireRoles: async (roles:string[]) => {if(!roles.includes(m.role))throw Error('role_denied');return {role:m.role};} }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => ({ employee: { id: 'actor' }, sessionTokenHash: 'proof' }) }));
rs.mock('@/lib/data/employees', () => ({ getEmployeeManagementProfile: m.profile }));
rs.mock('@/lib/clocker/pin-crypto.server', () => ({ readPinKey: () => { if (m.unavailable) throw Error('private infrastructure error'); return Buffer.alloc(32); } }));
rs.mock('@/lib/clocker/pins.server', () => ({ readEmployeeClockerPin: m.read }));
rs.mock('./actions', () => ({ saveClockerPinAction: rs.fn(),checkClockerPinSaveAction:rs.fn() }));
import EmployeeClockerPinPage from './page';

beforeEach(() => {
  Object.assign(m, { role: 'OWNER', targetRole: 'EMPLOYEE', active: true, version: 0, unavailable: false, denied:false, missing: false });
  m.profile.mockReset();m.profile.mockImplementation(async()=>m.missing?null:({firstName:'Avery',lastName:'Lane',role:m.targetRole,active:m.active}));
  m.read.mockReset();
  m.read.mockImplementation(async () => ({ employeeId: 'worker', version: m.version, configured: m.version > 0 }));
});
const render = async (from?: string) => renderToStaticMarkup(await EmployeeClockerPinPage({ params: Promise.resolve({ employeeId: 'worker' }), searchParams: Promise.resolve(from ? { from } : {}) }));

it('renders separate masked four-digit setup inputs with employee context and authoritative version', async () => {
  const html = await render();
  // Phase 6: the Settings frame (back names the person, the title, the person's name under it), then one form card.
  expect(html).toContain('<div class="q-hd"><h1>Clocker PIN</h1></div>'); expect(html).toContain('Set a PIN for Avery Lane'); expect(html).not.toContain('<p>Avery Lane</p>'); expect(html).toContain('<span class="q-nav__t">Clocker PIN</span>');
  expect(html).toMatch(/<a href="\/app\/employees\/worker" class="q-nav__l">.*Avery Lane<\/a>/);
  expect(html).toContain('Set a PIN for Avery Lane'); expect(html).toContain('They type it on the tablet after their Employee ID.');
  expect(html).toContain('name="expectedVersion" value="0"');
  // P9: masked number-pad text fields, never password fields (no Strong Password or saved login offered for a PIN).
  expect(html).not.toContain('type="password"');
  expect(html.match(/type="text" inputMode="numeric" autoComplete="off"/g)).toHaveLength(2);
  expect(html.match(/pattern="\[0-9\]\{4\}"/g)).toHaveLength(2);
  expect(html).toContain('inputMode="numeric"');
  // One filled button, in the form's own footer.
  expect(html).toContain('Save PIN'); expect(html).toContain('id="clocker-pin-form"'); expect(html.match(/b-btn b-btn--teal/g)).toHaveLength(1);
  expect(m.read).toHaveBeenCalledWith({ employeeId: 'actor', sessionTokenHash: 'proof' }, 'worker');
});
it('explains reset consequences and retains the current version without exposing an old PIN', async () => {
  m.version = 7;
  const html = await render();
  expect(html).toContain('Reset the PIN for Avery Lane'); expect(html).toContain('The old PIN stops working when you save.');
  expect(html).toContain('name="expectedVersion" value="7"');
  expect(html).not.toContain('value="0123"');
});
it.each(['MANAGER','EMPLOYEE','LEAD'])('denies %s before private profile or PIN reads',async role=>{m.role=role;await expect(render()).rejects.toThrow('role_denied');expect(m.profile).not.toHaveBeenCalled();expect(m.read).not.toHaveBeenCalled();});
it('allows an Owner to manage another Owner', async () => {
  m.targetRole = 'OWNER'; m.role = 'OWNER';
  expect(await render()).toContain('<form'); expect(m.read).toHaveBeenCalledOnce();
});
it('withholds PIN controls and reads for an inactive employee with profile navigation', async () => {
  m.active = false;
  const html = await render();
  expect(html).toContain('Avery Lane is inactive'); expect(html).toContain('Make them active again before you set a PIN.'); expect(html).not.toContain('<form');
  expect(html).toMatch(/<a class="b-btn b-btn--ghost" href="\/app\/employees\/worker">View their profile<\/a>/); expect(m.read).not.toHaveBeenCalled();
});
it('does not expose private infrastructure failures and offers retry', async () => {
  m.unavailable = true;
  const html = await render();
  expect(html).toContain('PINs can’t be set right now'); expect(html).toContain('No PIN was changed.'); expect(html).toContain('Try again');
  expect(html).toMatch(/role="alert"/);
  expect(html).not.toContain('<form'); expect(html).not.toContain('private infrastructure error');
});
it('fails closed when the PIN reader is unavailable', async () => {
  m.read.mockRejectedValue(Error('private SQL error'));
  const html = await render();
  expect(html).toContain('PINs can’t be set right now'); expect(html).not.toContain('private SQL error'); expect(html).not.toContain('<form');
});
it('uses notFound for missing employees', async () => {
  m.missing = true;
  await expect(render()).rejects.toThrow('notFound'); expect(m.read).not.toHaveBeenCalled();
});
it('withholds company PIN and profile reads when current scope denies the page',async()=>{
 m.denied=true;const html=await render();expect(html).toContain('Company-wide access needed');expect(html).not.toContain('<form');expect(m.profile).not.toHaveBeenCalled();expect(m.read).not.toHaveBeenCalled();
});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
it('keeps Save unavailable until complete PIN input is present',async()=>{const html=await render();expect(html).toMatch(/<button type="submit" class="b-btn b-btn--teal" disabled="">Save PIN<\/button>/);});
it('opened from the list of PINs, Back returns to the list; any other value returns to the person',async()=>{
 expect(await render('pins')).toMatch(/<a href="\/app\/settings\/clocker\/pins" class="q-nav__l">.*Clocker PINs<\/a>/);
 expect(await render('https://elsewhere.example')).toMatch(/<a href="\/app\/employees\/worker" class="q-nav__l">/);
});
