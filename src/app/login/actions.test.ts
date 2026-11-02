import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ allowed: vi.fn(async () => true), create: vi.fn(), destroy: vi.fn(), prepare: vi.fn(), credential: vi.fn(), activation: vi.fn(), verify: vi.fn(), activate: vi.fn(), deletion: vi.fn(), admit: vi.fn(), release: vi.fn(), forwarded: null as string | null }));
vi.mock('@/lib/auth/login-limits', () => ({ passwordLoginAllowed: state.allowed }));
vi.mock('next/headers', () => ({ headers: async () => new Headers(state.forwarded ? { 'x-forwarded-for': state.forwarded } : {}) }));
vi.mock('@/lib/auth/login-limits.server', async () => ({ ...(await import('../../lib/auth/login-limits.server')), admitLogin: async (id: string, address: string | null) => ({ admitted: await state.admit(id, address), addressBucket: 1977 }), releaseLoginAddress: state.release }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock('@/lib/auth/session', () => ({ createSession: state.create, destroySession: state.destroy }));
vi.mock('@/lib/data/employees', () => ({ findEmployeeCredential: state.credential, getEmployeeActivationState: state.activation, activateEmployeeCredential: state.activate }));
vi.mock('@/lib/auth/password', () => ({ verifyPassword: state.verify, hashPassword: async () => 'fictional-hash', dummyPasswordHash: async () => 'fictional-dummy-hash' }));
vi.mock('@/lib/notifications/destinations', () => import('../../lib/notifications/destinations'));
vi.mock('@/lib/notifications/logout', () => ({ prepareInstallationForLogin: state.prepare }));
vi.mock('@/lib/phone', () => import('../../lib/phone'));
vi.mock('@/lib/account-deletion/requests.server', () => ({ activeDeletionRequest: state.deletion }));
import { login, logout } from './actions';
import { activateAccountAction } from '../activate/actions';
function form(returnTo?: string) { const f = new FormData(); f.set('employeeId', ' employee '); f.set('password', 'test-password'); f.set('confirmPassword', 'test-password'); f.set('phone', '7875550123'); if (returnTo)
    f.set('returnTo', returnTo); return f; }
beforeEach(() => { vi.clearAllMocks(); state.allowed.mockResolvedValue(true); state.deletion.mockResolvedValue(null); state.admit.mockResolvedValue(true); state.forwarded = null; state.activation.mockResolvedValue(null); state.credential.mockResolvedValue({ id: 'EMPLOYEE', active: true, password_hash: 'fictional', updated_at:'2030-01-01 00:00:00.123456+00', password_updated_at:'2030-01-01 00:00:00.234567+00' }); state.verify.mockResolvedValue(true); state.activate.mockResolvedValue(true); state.prepare.mockResolvedValue({ state: 'complete' }); });
it('login_defaults_and_permissions_remain_unchanged', async () => { await expect(login(form())).rejects.toThrow('redirect:/app'); expect(state.create).toHaveBeenCalledWith('EMPLOYEE',await state.credential()); state.credential.mockResolvedValue(null); await expect(login(form('/app/requests?tab=my'))).rejects.toThrow('redirect:/login?error=invalid'); });
it('a shared login rate denial cannot create a password session', async () => {
  state.allowed.mockResolvedValueOnce(false);
  await expect(login(form())).rejects.toThrow('redirect:/login?error=invalid');
  expect(state.create).not.toHaveBeenCalled();
});
it('safe_notification_return_is_preserved_after_successful_login', async () => { await expect(login(form('/app/notifications/open?notificationId=fictional'))).rejects.toThrow('redirect:/app/notifications/open?notificationId=fictional'); expect(state.prepare).toHaveBeenCalledWith('EMPLOYEE'); expect(state.prepare.mock.invocationCallOrder[0]).toBeLessThan(state.create.mock.invocationCallOrder[0]); });
it.each(['https://evil.test', '//evil.test', '/clocker/2', '/app/%2e%2e', '/application'])('unsafe_return_%s_falls_back_to_app', async (path) => { await expect(login(form(path))).rejects.toThrow('redirect:/app'); });
it('uncredentialed login is generic and the retired knowledge-only action never calls credential creation', async () => {
 const path='/app/notifications/open?notificationId=fictional';state.activation.mockResolvedValue({active:true,has_credential:false});state.credential.mockResolvedValue(null);
 await expect(login(form(path))).rejects.toThrow('redirect:/login?error=invalid');
 expect(state.activation).not.toHaveBeenCalled();expect(state.create).not.toHaveBeenCalled();
 await expect(activateAccountAction(form(path))).rejects.toThrow('redirect:/activate');expect(state.activate).not.toHaveBeenCalled();
});
it('an_account_with_an_open_deletion_request_stays_signed_out_after_the_right_password', async () => {
  state.deletion.mockResolvedValue({ reference: 'DEL-7KQ2M9XA', status: 'received', confirmedAt: '2030-01-01' });
  await expect(login(form('/app/requests?tab=my'))).rejects.toThrow('redirect:/login?error=deleting&returnTo=%2Fapp%2Frequests%3Ftab%3Dmy');
  expect(state.create).not.toHaveBeenCalled();
  state.verify.mockResolvedValue(false);
  await expect(login(form())).rejects.toThrow('redirect:/login?error=invalid');
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
function pageElements(node:unknown):{type:unknown;props:Record<string,unknown>}[]{
    if(Array.isArray(node))return node.flatMap(pageElements);
    if(!node||typeof node!=='object'||!('props'in node))return [];
    const element=node as {type:unknown;props:Record<string,unknown>};
    return [element,...pageElements(element.props.children)];
}
function activationLoginDestination(node:unknown):URL{
    const elements=pageElements(node);
    const invitation=elements.filter(element=>Object.prototype.hasOwnProperty.call(element.props,'loginHref'));
    if(invitation.length){
        expect(invitation).toHaveLength(1);
        expect(typeof invitation[0].props.loginHref).toBe('string');
        return new URL(String(invitation[0].props.loginHref),'https://activation.test');
    }
    // The author checkout still has the retired form; Root owns the reviewed invitation page.
    // Accept that legacy representation only when its exact native action is present.
    const legacy=elements.filter(element=>element.type==='form'&&element.props.action===activateAccountAction);
    expect(legacy).toHaveLength(1);
    const returns=hiddenReturns(legacy[0]);expect(returns.length).toBeLessThanOrEqual(1);
    if(returns.length)expect(typeof returns[0]).toBe('string');
    return new URL('/login?activated=1'+(returns.length?'&returnTo='+encodeURIComponent(String(returns[0])):''),'https://activation.test');
}
it.each([
    {name:'valid notification',returnTo:'/app/notifications/open?notificationId=fictional',expected:'/app/notifications/open?notificationId=fictional'},
    {name:'external origin',returnTo:'https://evil.test',expected:null},
    {name:'array input',returnTo:['/app','//evil.test'],expected:null},
    {name:'protocol-relative origin',returnTo:'//evil.test',expected:null},
    {name:'encoded traversal',returnTo:'/app/%2e%2e',expected:null},
])('login and invitation success preserve only the validated return destination: $name',async({returnTo,expected})=>{
    const [{default:LoginPage},{default:ActivatePage}]=await Promise.all([import('./page'),import('../activate/page')]);
    const searchParams=Promise.resolve({returnTo});
    expect(hiddenReturns(await LoginPage({searchParams}))).toEqual(expected?[expected]:[]);
    const destination=activationLoginDestination(await ActivatePage({searchParams}));
    expect(destination.origin).toBe('https://activation.test');expect(destination.pathname).toBe('/login');expect(destination.hash).toBe('');
    expect(destination.searchParams.get('activated')).toBe('1');expect(destination.searchParams.get('returnTo')).toBe(expected);
    expect([...destination.searchParams.keys()].sort()).toEqual(expected?['activated','returnTo']:['activated']);
});

// Public identity is an external database read, independent of return-to validation.
vi.mock('@/lib/data/workspaces', () => ({getPublicWorkspaceName:async()=> 'Northside Services'}));

it('too_many_attempts_stop_before_the_account_is_read_and_say_so', async () => {
 state.admit.mockResolvedValue(false); state.forwarded = '203.0.113.7, 10.0.0.1';
 await expect(login(form('/app/requests?tab=my'))).rejects.toThrow('redirect:/login?error=busy&returnTo=%2Fapp%2Frequests%3Ftab%3Dmy');
 expect(state.admit).toHaveBeenCalledWith('EMPLOYEE', '203.0.113.7');
 expect(state.credential).not.toHaveBeenCalled(); expect(state.verify).not.toHaveBeenCalled(); expect(state.create).not.toHaveBeenCalled();
});
it('unknown_and_inactive_ids_still_pay_for_a_password_check', async () => {
 state.credential.mockResolvedValue(null); state.verify.mockResolvedValue(false);
 await expect(login(form())).rejects.toThrow('redirect:/login?error=invalid');
 expect(state.verify).toHaveBeenCalledWith('test-password', 'fictional-dummy-hash');
 state.verify.mockClear(); state.credential.mockResolvedValue({ id: 'EMPLOYEE', active: false, password_hash: 'real-but-inactive' });
 await expect(login(form())).rejects.toThrow('redirect:/login?error=invalid');
 expect(state.verify).toHaveBeenCalledWith('test-password', 'fictional-dummy-hash'); expect(state.create).not.toHaveBeenCalled();
});
it('a proven password hands its slot back to the shared network address; a wrong one never does', async () => {
  state.forwarded = '198.51.100.9';
  await expect(login(form())).rejects.toThrow('redirect:/app');
  // The refund names the window the attempt was admitted in, never the current one.
  expect(state.release).toHaveBeenCalledWith('198.51.100.9', { admitted: true, addressBucket: 1977 });
  state.release.mockClear(); state.verify.mockResolvedValue(false);
  await expect(login(form())).rejects.toThrow('redirect:/login?error=invalid');
  expect(state.release).not.toHaveBeenCalled();
  state.verify.mockResolvedValue(true); state.release.mockRejectedValueOnce(new Error('storage failure'));
  await expect(login(form())).rejects.toThrow('redirect:/app');
});
