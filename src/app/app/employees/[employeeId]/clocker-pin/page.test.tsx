import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ role: 'MANAGER', targetRole: 'EMPLOYEE', active: true, version: 0, unavailable: false, denied: false, missing: false, read: vi.fn(), profile:vi.fn() }));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>m.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load()}}));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { href, ...props }, children) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw Error('notFound'); } }));
vi.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER', 'MANAGER'], requireRoles: async () => ({ role: m.role }) }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => ({ employee: { id: 'actor' }, sessionTokenHash: 'proof' }) }));
vi.mock('@/lib/data/employees', () => ({ getEmployeeManagementProfile: m.profile }));
vi.mock('@/lib/clocker/pin-crypto.server', () => ({ readPinKey: () => { if (m.unavailable) throw Error('private infrastructure error'); return Buffer.alloc(32); } }));
vi.mock('@/lib/clocker/pins.server', () => ({ readEmployeeClockerPin: m.read }));
vi.mock('./actions', () => ({ saveClockerPinAction: vi.fn() }));
import EmployeeClockerPinPage from './page';

beforeEach(() => {
  Object.assign(m, { role: 'MANAGER', targetRole: 'EMPLOYEE', active: true, version: 0, unavailable: false, denied:false, missing: false });
  m.profile.mockReset();m.profile.mockImplementation(async()=>m.missing?null:({firstName:'Avery',lastName:'Lane',role:m.targetRole,active:m.active}));
  m.read.mockReset();
  m.read.mockImplementation(async () => ({ employeeId: 'worker', version: m.version, configured: m.version > 0 }));
});
const render = async () => renderToStaticMarkup(await EmployeeClockerPinPage({ params: Promise.resolve({ employeeId: 'worker' }) }));

it('renders separate masked four-digit setup inputs with employee context and authoritative version', async () => {
  const html = await render();
  // Quiet (v4): a sheet titled Clocker PIN, the person's name, four boxes, Save at the top right.
  expect(html).toContain('Avery'); expect(html).toContain('<span class="q-nav__t">Clocker PIN</span>');
  expect(html).toContain('name="expectedVersion" value="0"');
  expect(html.match(/type="password"/g)).toHaveLength(2);
  expect(html.match(/pattern="\[0-9\]\{4\}"/g)).toHaveLength(2);
  expect(html).toContain('inputMode="numeric"');
  expect(html).toContain('Save PIN'); expect(html).toContain('form="clocker-pin-form"'); expect(html).toContain('Cancel');
  expect(m.read).toHaveBeenCalledWith({ employeeId: 'actor', sessionTokenHash: 'proof' }, 'worker');
});
it('explains reset consequences and retains the current version without exposing an old PIN', async () => {
  m.version = 7;
  const html = await render();
  expect(html).toContain('Reset PIN'); expect(html).toContain('The old PIN stops working.');
  expect(html).toContain('name="expectedVersion" value="7"');
  expect(html).not.toContain('value="0123"');
});
it('withholds all PIN controls and reads for Manager-to-Owner access', async () => {
  m.targetRole = 'OWNER';
  const html = await render();
  expect(html).toContain('Owner access required'); expect(html).not.toContain('<form');
  expect(m.read).not.toHaveBeenCalled();
});
it('allows an Owner to manage another Owner', async () => {
  m.targetRole = 'OWNER'; m.role = 'OWNER';
  expect(await render()).toContain('<form'); expect(m.read).toHaveBeenCalledOnce();
});
it('withholds PIN controls and reads for an inactive employee with profile navigation', async () => {
  m.active = false;
  const html = await render();
  expect(html).toContain('Employee is inactive'); expect(html).not.toContain('<form');
  expect(html).toContain('View employee'); expect(m.read).not.toHaveBeenCalled();
});
it('does not expose private infrastructure failures and offers retry', async () => {
  m.unavailable = true;
  const html = await render();
  expect(html).toContain('PIN setup is unavailable'); expect(html).toContain('Try again');
  expect(html).not.toContain('<form'); expect(html).not.toContain('private infrastructure error');
});
it('fails closed when the PIN reader is unavailable', async () => {
  m.read.mockRejectedValue(Error('private SQL error'));
  const html = await render();
  expect(html).toContain('PIN setup is unavailable'); expect(html).not.toContain('private SQL error'); expect(html).not.toContain('<form');
});
it('uses notFound for missing employees', async () => {
  m.missing = true;
  await expect(render()).rejects.toThrow('notFound'); expect(m.read).not.toHaveBeenCalled();
});
it('withholds company PIN and profile reads when current scope denies the page',async()=>{
 m.denied=true;const html=await render();expect(html).toContain('current company-wide management access');expect(html).not.toContain('<form');expect(m.profile).not.toHaveBeenCalled();expect(m.read).not.toHaveBeenCalled();
});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
