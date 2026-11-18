import {afterEach,beforeEach, expect, it, rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
import type {UserRole} from '@/lib/domain';

const state = rs.hoisted(() => ({
  role: 'EMPLOYEE' as UserRole, marker: '' as string, sessionError: false, recovery: '' as string,
  workspace: rs.fn(), proof: rs.fn(), logout: rs.fn(),
}));
rs.mock('next/headers', () => ({headers: async () => new Headers({'User-Agent': state.marker, 'x-nevora-recovery-route':state.recovery}), cookies: async () => ({get: () => undefined})}));
rs.mock('@/lib/auth/session', () => ({
  requireSession: async () => {
    if (state.sessionError) throw new Error('session unavailable');
    return {id: 'fictional', firstName: 'Test', lastName: 'Person', role: state.role};
  },
  requireSessionMutationProof: state.proof,
}));
rs.mock('@/app/login/actions', () => ({logout: state.logout}));
rs.mock('@/lib/data/workspaces', () => ({getWorkspace: state.workspace}));
rs.mock('@/lib/communications/service.server', () => ({communicationAuthority: () => 'communication'}));
rs.mock('@/lib/employee-view-authority.server', () => ({employeeViewAuthority: () => 'authority'}));
rs.mock('@/lib/notifications/config', () => ({readNotificationConfig: () => ({featureEnabled: false})}));
rs.mock('@/lib/payroll/service', () => ({payrollFeatureEnabled: () => false, readPayrollCapabilities: rs.fn()}));
rs.mock('@/lib/company-access/operational-scope.server', () => ({readOperationalAuthority: async () => ({})}));
rs.mock('@/lib/workspace-presentation/current.server', () => ({currentBrand: async () => ({style: 'B1', logoUrl: null, modules: [], words: 'default'})}));
rs.mock('@/lib/workspace-presentation/words', () => ({wordPreset: () => ({en: {}})}));
rs.mock('@/components/app-shell', () => ({AppShell: ({children}: {children: ReactNode}) => <div data-shell="true">{children}</div>}));
rs.mock('@/components/passkeys/passkey-offer', () => ({PasskeyOffer: () => null}));
rs.mock('next/navigation',()=>({usePathname:()=>state.recovery||'/app'}));
import PlatformLayout from './layout';

beforeEach(() => {
  rs.clearAllMocks(); rs.stubEnv('NEVORA_COMMERCE_ENABLED','false'); state.recovery=''; state.role = 'EMPLOYEE'; state.marker = ''; state.sessionError = false;
  state.workspace.mockResolvedValue({id: 'fictional-workspace', name: 'Test company'});
  state.proof.mockResolvedValue('fictional-proof');
});
const layout = () => PlatformLayout({children: <p>PRIVATE workflow</p>, sheet: <p>PRIVATE sheet</p>});

it.each(['iOS', 'Android'])('explains unsupported native roles on %s before loading shell data', async platform => {
  state.marker = `Mozilla/5.0 NEVORA-Native/${platform}/1`;
  for (const role of ['MANAGER', 'LEAD'] as UserRole[]) {
    state.role = role;
    const html = renderToStaticMarkup(await layout());
    // Review B2 (NV-214): says who the app is for in plain words.
    expect(html).toContain('is for employees and owners');
    expect(html).toContain('web browser');
    expect(html).toContain('Sign out');
    expect(html).not.toContain('PRIVATE');
    expect(html).not.toContain('data-shell');
  }
  expect(state.workspace).not.toHaveBeenCalled();
  expect(state.proof).not.toHaveBeenCalled();
  expect(state.logout).not.toHaveBeenCalled();
});
it.each(['EMPLOYEE', 'OWNER'] as UserRole[])('preserves native %s workflows', async role => {
  state.marker = 'NEVORA-Native/iOS/1'; state.role = role;
  const html = renderToStaticMarkup(await layout());
  expect(html).toContain('PRIVATE workflow'); expect(html).toContain('PRIVATE sheet');
  expect(state.workspace).toHaveBeenCalledOnce();
});
it.each(['MANAGER', 'LEAD'] as UserRole[])('preserves ordinary web %s workflows', async role => {
  state.role = role;
  expect(renderToStaticMarkup(await layout())).toContain('PRIVATE workflow');
});
it('does not reinterpret authentication failure as unsupported-role success', async () => {
  state.marker = 'NEVORA-Native/Android/1'; state.sessionError = true;
  await expect(layout()).rejects.toThrow('session unavailable');
  expect(state.workspace).not.toHaveBeenCalled();
});

it.each(['/app/billing','/app/my-pay','/app/payroll-export','/app/account/delete'])('renders authenticated recovery %s without operational shell reads or parallel sheets',async path=>{
 rs.stubEnv('NEVORA_COMMERCE_ENABLED','true');state.recovery=path;
 state.workspace.mockRejectedValue(Error('operational workspace unavailable'));
 const html=renderToStaticMarkup(await layout());
 expect(html).toContain('PRIVATE workflow');expect(html).not.toContain('PRIVATE sheet');expect(html).not.toContain('data-shell');
 expect(state.workspace).not.toHaveBeenCalled();expect(state.proof).not.toHaveBeenCalled();
});
it.each(['/app/billing','/app/account/delete'])('keeps current session admission before recovery presentation: %s',async path=>{
 rs.stubEnv('NEVORA_COMMERCE_ENABLED','true');state.recovery=path;state.sessionError=true;
 await expect(layout()).rejects.toThrow('session unavailable');
});

afterEach(()=>{ rs.unstubAllEnvs(); });
