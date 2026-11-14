vi.mock('../data/sql-session-contract',()=>import('../../test/fixtures/business-sql-session'));
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ values: new Map<string, string>(), query: vi.fn(), signals: [] as AbortSignal[], workspace: vi.fn(() => { throw new Error('workspace unavailable'); }), transaction: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => state.values.has(name) ? { value: state.values.get(name)! } : undefined, set: (name: string, value: string) => state.values.set(name, value), delete: (name: string) => state.values.delete(name) }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: state.query, transaction: state.transaction }), queryRows: (r: unknown) => r }));
vi.mock('@/lib/notifications/logout', () => import('../notifications/logout'));
vi.mock('@/lib/notifications/config', () => import('../notifications/config'));
vi.mock('@/lib/notifications/installation', () => import('../notifications/installation'));
vi.mock('../db', () => ({ getDb: () => ({ query: state.query, transaction: state.transaction }), queryRows: (r: unknown) => r }));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:state.workspace}));
import { destroySession } from './session';
beforeEach(() => { state.values.clear(); state.values.set('fuel_session', 'fictional'); state.query.mockReset(); });
afterEach(() => vi.useRealTimers());
it('destroySession_always_clears_auth_cookie_after_storage_rejection', async () => { state.query.mockRejectedValue(new Error('storage unavailable')); await expect(destroySession()).resolves.toBeUndefined(); expect(state.values.has('fuel_session')).toBe(false); });
it('destroySession_caps_hung_session_revocation_at_one_second', async () => { vi.useFakeTimers(); state.query.mockImplementation((_sql, _values, options) => { if (options?.fetchOptions?.signal)
    state.signals.push(options.fetchOptions.signal); return new Promise(() => { }); }); const result = destroySession(); await vi.advanceTimersByTimeAsync(1000); expect(state.values.has('fuel_session')).toBe(false); await result; expect(state.signals.at(-1)?.aborted).toBe(true); });
it('renewed_auth_cookie_and_protected_association_both_revoke_when_push_transport_fails',async()=>{
    const {createHash}=await import('node:crypto');
    const {createInstallationProof,sealInstallationProof,INSTALLATION_COOKIE}=await import('../notifications/installation');
    const key=Buffer.alloc(32,9);vi.stubEnv('PUSH_SUBSCRIPTION_ENCRYPTION_KEY',key.toString('base64url'));vi.stubEnv('PUSH_ENVIRONMENT','test');vi.stubEnv('FUEL_PORTAL_ORIGIN','https://fuel.example');
    const oldHash=createHash('sha256').update('old-session').digest('hex');
    const renewedHash=createHash('sha256').update('renewed-session').digest('hex');
    const sessions=new Set([oldHash,renewedHash,'unrelated-device-session']);
    state.values.set('fuel_session','renewed-session');
    state.values.set(INSTALLATION_COOKIE,sealInstallationProof({...createInstallationProof('test'),associatedSessionHash:oldHash},key));
    state.query.mockImplementation(async(sql:string,values:string[])=>{if(sql.startsWith('DELETE FROM employee_sessions'))sessions.delete(values[0]);return [];});
    // The injected driver intentionally has no transaction method: push transport
    // fails while independent auth query operations remain available.
    try {await destroySession();expect(sessions).toEqual(new Set(['unrelated-device-session']));expect(state.values.has('fuel_session')).toBe(false);}finally{vi.unstubAllEnvs();}
});

it('workspace outage never delays cookie deletion or independent session and installation reconciliation',async()=>{
 const {createInstallationProof,sealInstallationProof,INSTALLATION_COOKIE}=await import('../notifications/installation');
 const key=Buffer.alloc(32,8);vi.stubEnv('PUSH_SUBSCRIPTION_ENCRYPTION_KEY',key.toString('base64url'));vi.stubEnv('PUSH_ENVIRONMENT','test');vi.stubEnv('FUEL_PORTAL_ORIGIN','https://fuel.example');
 state.values.set(INSTALLATION_COOKIE,sealInstallationProof(createInstallationProof('test'),key));
 state.query.mockImplementation(async()=>{expect(state.values.has('fuel_session')).toBe(false);return [];});
 state.transaction.mockRejectedValue(new Error('cleanup unavailable'));state.workspace.mockClear();
 try{await destroySession();expect(state.values.has('fuel_session')).toBe(false);expect(state.workspace).not.toHaveBeenCalled();expect(state.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM employee_sessions'),expect.any(Array),expect.any(Object));expect(state.transaction).toHaveBeenCalled();}finally{vi.unstubAllEnvs();}
});
it('mutation proof binds actual HttpOnly cookie hash and rejects a missing/revoked session',async()=>{
 const {requireSessionMutationProof}=await import('./session');const {createHash}=await import('node:crypto');
 state.query.mockResolvedValue([{id:'E',first_name:'Test',last_name:'Employee',role:'EMPLOYEE',primary_location_id:'L'}]);
 expect(await requireSessionMutationProof()).toEqual({employee:{id:'E',firstName:'Test',lastName:'Employee',role:'EMPLOYEE',primaryLocationId:'L'},sessionTokenHash:createHash('sha256').update('fictional').digest('hex')});
 expect(state.query.mock.calls[0][1]).toEqual([createHash('sha256').update('fictional').digest('hex')]);state.query.mockResolvedValue([]);await expect(requireSessionMutationProof()).rejects.toThrow('redirect:/login');state.values.clear();state.query.mockClear();await expect(requireSessionMutationProof()).rejects.toThrow('redirect:/login');expect(state.query).not.toHaveBeenCalled();
});
