import {beforeEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
import type {UserRole} from '@/lib/domain';

const state = vi.hoisted(() => ({
  role: 'EMPLOYEE' as UserRole, marker: '' as string, sessionError: false,
  workspace: vi.fn(), proof: vi.fn(), logout: vi.fn(),
}));
vi.mock('next/headers', () => ({headers: async () => new Headers({'User-Agent': state.marker}), cookies: async () => ({get: () => undefined})}));
vi.mock('@/lib/auth/session', () => ({
  requireSession: async () => {
    if (state.sessionError) throw new Error('session unavailable');
    return {id: 'fictional', firstName: 'Test', lastName: 'Person', role: state.role};
  },
  requireSessionMutationProof: state.proof,
}));
vi.mock('@/app/login/actions', () => ({logout: state.logout}));
vi.mock('@/lib/data/workspaces', () => ({getWorkspace: state.workspace}));
vi.mock('@/lib/communications/service.server', () => ({communicationAuthority: () => 'communication'}));
vi.mock('@/lib/employee-view-authority.server', () => ({employeeViewAuthority: () => 'authority'}));
vi.mock('@/lib/notifications/config', () => ({readNotificationConfig: () => ({featureEnabled: false})}));
vi.mock('@/lib/payroll/service', () => ({payrollFeatureEnabled: () => false, readPayrollCapabilities: vi.fn()}));
vi.mock('@/lib/company-access/operational-scope.server', () => ({readOperationalAuthority: async () => ({})}));
vi.mock('@/lib/workspace-presentation/current.server', () => ({currentBrand: async () => ({style: 'B1', logoUrl: null, modules: [], words: 'default'})}));
vi.mock('@/lib/workspace-presentation/words', () => ({wordPreset: () => ({en: {}})}));
vi.mock('@/components/app-shell', () => ({AppShell: ({children}: {children: ReactNode}) => <div data-shell="true">{children}</div>}));
vi.mock('@/components/passkeys/passkey-offer', () => ({PasskeyOffer: () => null}));
import PlatformLayout from './layout';

beforeEach(() => {
  vi.clearAllMocks(); state.role = 'EMPLOYEE'; state.marker = ''; state.sessionError = false;
  state.workspace.mockResolvedValue({id: 'fictional-workspace', name: 'Test company'});
  state.proof.mockResolvedValue('fictional-proof');
});
const layout = () => PlatformLayout({children: <p>PRIVATE workflow</p>, sheet: <p>PRIVATE sheet</p>});

it.each(['iOS', 'Android'])('explains unsupported native roles on %s before loading shell data', async platform => {
  state.marker = `Mozilla/5.0 NEVORA-Native/${platform}/1`;
  for (const role of ['MANAGER', 'LEAD'] as UserRole[]) {
    state.role = role;
    const html = renderToStaticMarkup(await layout());
    expect(html).toContain('Employee and Owner accounts');
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
