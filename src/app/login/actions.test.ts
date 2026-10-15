import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ create: vi.fn(), destroy: vi.fn(), prepare: vi.fn(), credential: vi.fn(), activation: vi.fn(), verify: vi.fn(), activate: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock('@/lib/auth/session', () => ({ createSession: state.create, destroySession: state.destroy }));
vi.mock('@/lib/data/employees', () => ({ findEmployeeCredential: state.credential, getEmployeeActivationState: state.activation, activateEmployeeCredential: state.activate }));
vi.mock('@/lib/auth/password', () => ({ verifyPassword: state.verify, hashPassword: async () => 'fictional-hash' }));
vi.mock('@/lib/notifications/destinations', () => import('../../lib/notifications/destinations'));
vi.mock('@/lib/notifications/logout', () => ({ prepareInstallationForLogin: state.prepare }));
vi.mock('@/lib/phone', () => import('../../lib/phone'));
import { login, logout } from './actions';
import { activateAccountAction } from '../activate/actions';
function form(returnTo?: string) { const f = new FormData(); f.set('employeeId', ' employee '); f.set('password', 'test-password'); f.set('confirmPassword', 'test-password'); f.set('phone', '7875550123'); if (returnTo)
    f.set('returnTo', returnTo); return f; }
beforeEach(() => { vi.clearAllMocks(); state.activation.mockResolvedValue(null); state.credential.mockResolvedValue({ id: 'EMPLOYEE', active: true, password_hash: 'fictional', updated_at:'2030-01-01 00:00:00.123456+00', password_updated_at:'2030-01-01 00:00:00.234567+00' }); state.verify.mockResolvedValue(true); state.activate.mockResolvedValue(true); state.prepare.mockResolvedValue({ state: 'complete' }); });
it('login_defaults_and_permissions_remain_unchanged', async () => { await expect(login(form())).rejects.toThrow('redirect:/app'); expect(state.create).toHaveBeenCalledWith('EMPLOYEE',await state.credential()); state.credential.mockResolvedValue(null); await expect(login(form('/app/requests?tab=my'))).rejects.toThrow('redirect:/login?error=invalid'); });
it('safe_notification_return_is_preserved_after_successful_login', async () => { await expect(login(form('/app/notifications/open?notificationId=fictional'))).rejects.toThrow('redirect:/app/notifications/open?notificationId=fictional'); expect(state.prepare).toHaveBeenCalledWith('EMPLOYEE'); expect(state.prepare.mock.invocationCallOrder[0]).toBeLessThan(state.create.mock.invocationCallOrder[0]); });
it.each(['https://evil.test', '//evil.test', '/clocker/2', '/app/%2e%2e', '/application'])('unsafe_return_%s_falls_back_to_app', async (path) => { await expect(login(form(path))).rejects.toThrow('redirect:/app'); });
it('uncredentialed login is generic and the retired knowledge-only action never calls credential creation', async () => {
 const path='/app/notifications/open?notificationId=fictional';state.activation.mockResolvedValue({active:true,has_credential:false});state.credential.mockResolvedValue(null);
 await expect(login(form(path))).rejects.toThrow('redirect:/login?error=invalid');
 expect(state.activation).not.toHaveBeenCalled();expect(state.create).not.toHaveBeenCalled();
 await expect(activateAccountAction(form(path))).rejects.toThrow('redirect:/activate');expect(state.activate).not.toHaveBeenCalled();
});
it('javascript_disabled_native_signout_exits_after_cleanup_rejection', async () => { state.destroy.mockRejectedValue(new Error('storage failure')); await expect(logout()).rejects.toThrow('redirect:/login'); });
vi.mock('@/components/brand-mark', () => ({ BrandMark: () => null, BrandWordmark: () => null }));
vi.mock('@/components/brand-lockup', () => ({ BrandLockup: () => null }));
vi.mock('@/components/brand-legal', () => ({ BrandLegal: () => null }));
vi.mock('@/components/phone-input', () => ({ PhoneInput: () => null }));
vi.mock('@/app/login/actions', () => import('./actions'));
vi.mock('@/app/activate/actions', () => import('../activate/actions'));
function hiddenReturns(node: unknown): unknown[] {
    if (Array.isArray(node))
        return node.flatMap(hiddenReturns);
    if (!node || typeof node !== 'object' || !('props' in node))
        return [];
    const element = node as {
        type: unknown;
        props: {
            name?: string;
            type?: string;
            value?: unknown;
            children?: unknown;
        };
    };
    return element.type === 'input' && element.props.name === 'returnTo' && element.props.type === 'hidden' ? [element.props.value] : hiddenReturns(element.props.children);
}
it.each(['/app/notifications/open?notificationId=fictional', 'https://evil.test', ['/app', '//evil.test']])('login_activation_forms_include_only_validated_hidden_return_%s', async (returnTo) => {
    const [{ default: LoginPage }, { default: ActivatePage }] = await Promise.all([import('./page'), import('../activate/page')]);
    const searchParams = Promise.resolve({ returnTo });
    const expected = typeof returnTo === 'string' && returnTo.startsWith('/app/') ? [returnTo] : [];
    expect(hiddenReturns(await LoginPage({ searchParams }))).toEqual(expected);
    expect(hiddenReturns(await ActivatePage({ searchParams }))).toEqual(expected);
});

// Public identity is an external database read, independent of return-to validation.
vi.mock('@/lib/data/workspaces', () => ({getPublicWorkspaceName:async()=> 'Northside Services'}));
