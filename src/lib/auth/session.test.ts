import { sessionTransaction } from '../../test/fixtures/business-sql-session';
rs.mock('../data/sql-session-contract',()=>({
  sessionTransaction: (...args: Parameters<typeof sessionTransaction>) => sessionTransaction(...args),
}));
import { beforeEach, afterEach, expect, it, rs } from '@rstest/core';
const state = rs.hoisted(() => ({ values: new Map<string, string>(), query: rs.fn(), signals: [] as AbortSignal[], workspace: rs.fn(() => { throw new Error('workspace unavailable'); }), transaction: rs.fn(), headers: new Headers() }));
rs.mock('next/headers', () => ({ headers: async () => state.headers, cookies: async () => ({ get: (name: string) => state.values.has(name) ? { value: state.values.get(name)! } : undefined, set: (name: string, value: string) => state.values.set(name, value), delete: (name: string) => state.values.delete(name) }) }));
rs.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
rs.mock('@/lib/db', () => ({ getDb: () => ({ query: state.query, transaction: state.transaction }), queryRows: (r: unknown) => r }));
rs.mock('../db', () => ({ getDb: () => ({ query: state.query, transaction: state.transaction }), queryRows: (r: unknown) => r }));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:state.workspace}));
import { destroySession } from './session';
beforeEach(() => { state.values.clear(); state.values.set('fuel_session', 'fictional'); state.query.mockReset(); state.headers = new Headers(); });
afterEach(() => rs.useRealTimers());
it('destroySession_always_clears_auth_cookie_after_storage_rejection', async () => { state.query.mockRejectedValue(new Error('storage unavailable')); await expect(destroySession()).resolves.toBeUndefined(); expect(state.values.has('fuel_session')).toBe(false); });
it('destroySession_caps_hung_session_revocation_at_one_second', async () => { rs.useFakeTimers(); state.query.mockImplementation((_sql, _values, options) => { if (options?.fetchOptions?.signal)
    state.signals.push(options.fetchOptions.signal); return new Promise(() => { }); }); const result = destroySession(); await rs.advanceTimersByTimeAsync(1000); expect(state.values.has('fuel_session')).toBe(false); await result; expect(state.signals.at(-1)?.aborted).toBe(true); });
it('renewed_auth_cookie_and_protected_association_both_revoke_when_push_transport_fails',async()=>{
    const {createHash}=await import('node:crypto');
    const {createInstallationProof,sealInstallationProof,INSTALLATION_COOKIE}=await import('../notifications/installation');
    const key=Buffer.alloc(32,9);rs.stubEnv('PUSH_SUBSCRIPTION_ENCRYPTION_KEY',key.toString('base64url'));rs.stubEnv('PUSH_ENVIRONMENT','test');rs.stubEnv('FUEL_PORTAL_ORIGIN','https://fuel.example');
    const oldHash=createHash('sha256').update('old-session').digest('hex');
    const renewedHash=createHash('sha256').update('renewed-session').digest('hex');
    const sessions=new Set([oldHash,renewedHash,'unrelated-device-session']);
    state.values.set('fuel_session','renewed-session');
    state.values.set(INSTALLATION_COOKIE,sealInstallationProof({...createInstallationProof('test'),associatedSessionHash:oldHash},key));
    state.query.mockImplementation(async(sql:string,values:string[])=>{if(sql.startsWith('DELETE FROM employee_sessions'))sessions.delete(values[0]);return [];});
    // The injected driver intentionally has no transaction method: push transport
    // fails while independent auth query operations remain available.
    try {await destroySession();expect(sessions).toEqual(new Set(['unrelated-device-session']));expect(state.values.has('fuel_session')).toBe(false);}finally{rs.unstubAllEnvs();}
});

it('workspace outage never delays cookie deletion or independent session and installation reconciliation',async()=>{
 const {createInstallationProof,sealInstallationProof,INSTALLATION_COOKIE}=await import('../notifications/installation');
 const key=Buffer.alloc(32,8);rs.stubEnv('PUSH_SUBSCRIPTION_ENCRYPTION_KEY',key.toString('base64url'));rs.stubEnv('PUSH_ENVIRONMENT','test');rs.stubEnv('FUEL_PORTAL_ORIGIN','https://fuel.example');
 state.values.set(INSTALLATION_COOKIE,sealInstallationProof(createInstallationProof('test'),key));
 state.query.mockImplementation(async()=>{expect(state.values.has('fuel_session')).toBe(false);return [];});
 state.transaction.mockRejectedValue(new Error('cleanup unavailable'));state.workspace.mockClear();
 try{await destroySession();expect(state.values.has('fuel_session')).toBe(false);expect(state.workspace).not.toHaveBeenCalled();expect(state.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM employee_sessions'),expect.any(Array),expect.any(Object));expect(state.transaction).toHaveBeenCalled();}finally{rs.unstubAllEnvs();}
});
it('mutation proof binds actual HttpOnly cookie hash and rejects a missing/revoked session',async()=>{
 const {requireSessionMutationProof}=await import('./session');const {createHash}=await import('node:crypto');
 state.query.mockResolvedValue([{id:'E',first_name:'Test',last_name:'Employee',role:'EMPLOYEE',primary_location_id:'L'}]);
 expect(await requireSessionMutationProof()).toEqual({employee:{id:'E',firstName:'Test',lastName:'Employee',role:'EMPLOYEE',primaryLocationId:'L'},sessionTokenHash:createHash('sha256').update('fictional').digest('hex')});
 expect(state.query.mock.calls[0][1]).toEqual([createHash('sha256').update('fictional').digest('hex')]);state.query.mockResolvedValue([]);await expect(requireSessionMutationProof()).rejects.toThrow('redirect:/login');state.values.clear();state.query.mockClear();await expect(requireSessionMutationProof()).rejects.toThrow('redirect:/login');expect(state.query).not.toHaveBeenCalled();
});
it('an ended session lands on sign-in with the reason and a vetted way back; a first visit gets no claim (RA-5)',async()=>{
 const {requireSession,requireSessionMutationProof}=await import('./session');state.query.mockResolvedValue([]);
 const from=(destination?:string)=>{state.headers=new Headers(destination?{'x-nevora-auth-return-to':destination}:{});};
 // The browser still presents a session cookie that no longer opens a session.
 from();await expect(requireSession()).rejects.toThrow(/^redirect:\/login\?ended=1$/);
 // The current request supplies a vetted path through proxy, not a Referer.
 from('/app/requests?tab=my');
 await expect(requireSession()).rejects.toThrow(/^redirect:\/login\?ended=1&returnTo=%2Fapp%2Frequests%3Ftab%3Dmy$/);
 await expect(requireSessionMutationProof()).rejects.toThrow(/^redirect:\/login\?ended=1&returnTo=%2Fapp%2Frequests%3Ftab%3Dmy$/);
 // Home and routes sign-in does not accept carry the reason only; another origin never supplies a way back.
 for(const destination of ['/app','/app/timecards','/app/requests?tab=my&next=//evil.example','https://evil.example/app/requests?tab=my','not a url']){from(destination);await expect(requireSession()).rejects.toThrow(/^redirect:\/login\?ended=1$/);}
 from('/app/schedule?week=2030-01-07');
 await expect(requireSession()).rejects.toThrow(/^redirect:\/login\?ended=1&returnTo=%2Fapp%2Fschedule%3Fweek%3D2030-01-07$/);
 await expect(requireSessionMutationProof()).rejects.toThrow(/^redirect:\/login\?ended=1&returnTo=%2Fapp%2Fschedule%3Fweek%3D2030-01-07$/);
 // Without a presented session, even a valid current route claims no ended session.
 state.values.clear();
 for(const destination of [undefined,'/app/schedule?week=2030-01-07','https://fuel.example/login','https://fuel.example/','https://evil.example/app/requests?tab=my']){from(destination);await expect(requireSession()).rejects.toThrow(/^redirect:\/login$/);await expect(requireSessionMutationProof()).rejects.toThrow(/^redirect:\/login$/);}
 expect(state.query).not.toHaveBeenCalledWith(expect.stringMatching(/INSERT|UPDATE|DELETE/i),expect.anything());
});

it('P4-AUTH-01 does not claim an ended session from Referer or host headers without a presented session',async()=>{
 const {requireSession,requireSessionMutationProof}=await import('./session');
 state.values.clear();
 const attempts:Record<string,string>[]=[
  {host:'actual.example',referer:'https://actual.example/app/requests?tab=my'},
  {host:'actual.example','x-forwarded-host':'spoof.example',referer:'https://spoof.example/app/requests?tab=my'},
  {host:'spoof.example',referer:'https://spoof.example/app/schedule?week=2030-01-07'},
  {'x-nevora-auth-return-to':'/app/requests?tab=my',referer:'https://actual.example/app/requests?tab=my'},
 ];
 for(const headers of attempts){
  state.headers=new Headers(headers);
  await expect(requireSession()).rejects.toThrow(/^redirect:\/login$/);
  await expect(requireSessionMutationProof()).rejects.toThrow(/^redirect:\/login$/);
 }
 expect(state.query).not.toHaveBeenCalled();
});

it('P4-AUTH-01 takes the vetted current request destination and ignores a different Referer',async()=>{
 const {requireSession,requireSessionMutationProof}=await import('./session');
 state.query.mockResolvedValue([]);
 state.headers=new Headers({'x-nevora-auth-return-to':'/app/schedule?week=2030-01-07',host:'actual.example','x-forwarded-host':'spoof.example',referer:'https://spoof.example/app/requests?tab=my'});
 const expected=/^redirect:\/login\?ended=1&returnTo=%2Fapp%2Fschedule%3Fweek%3D2030-01-07$/;
 await expect(requireSession()).rejects.toThrow(expected);
 await expect(requireSessionMutationProof()).rejects.toThrow(expected);
});

it('P4-AUTH-01 retains the return allowlist and never derives language from a Referer',async()=>{
 const {requireSession}=await import('./session');const {readAuthLang}=await import('../auth-lang.server');
 state.query.mockResolvedValue([]);state.values.set('nv-lang','invalid-language');
 for(const candidate of ['//spoof.example/app','https://spoof.example/app','/app/requests?tab=my&next=//spoof.example','/app/requests?tab=my&tab=team','/app/requests#proof=fictional']){
  state.headers=new Headers({'x-nevora-auth-return-to':candidate,referer:'https://actual.example/app/requests?tab=my&lang=invalid-language','accept-language':'es-PR, en;q=0.5'});
  await expect(requireSession()).rejects.toThrow(/^redirect:\/login\?ended=1$/);
  expect(await readAuthLang()).toBe('es');
 }
 state.headers=new Headers({'accept-language':'invalid-language',referer:'https://actual.example/app?lang=es'});
 expect(await readAuthLang()).toBe('en');
 state.values.set('nv-lang','es');expect(await readAuthLang()).toBe('es');
});
