import {afterEach,expect,it,vi} from 'vitest';
const request=vi.hoisted(()=>({headers:vi.fn(),cookies:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>request);
import {forceInspectionError} from './inspection.server';
import {localRequest,loopbackOrigin} from './local-only';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
it.each(['localhost','127.0.0.1','[::1]'])('accepts exact loopback origin %s',host=>{expect(loopbackOrigin('http://'+host+':3000')).toBe(true);});
it.each(['http://localhost.evil.invalid','http://user@localhost','http://localhost/path','file://localhost','https://example.invalid'])('rejects nonlocal/ambiguous origins %s',origin=>{expect(loopbackOrigin(origin)).toBe(false);});
it('rejects forwarded external requests even with a local host',()=>{
  expect(localRequest(new Headers({host:'localhost:3000','x-forwarded-for':'192.0.2.1'}))).toBe(false);
  expect(localRequest(new Headers({host:'localhost:3000','x-forwarded-host':'public.invalid'}))).toBe(false);
});
it.each(['root','global','portal','home-read'] as const)('forces only the selected %s error with all gates satisfied',async state=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('NEVORA_DEV_FORCE_ERRORS','1');
  request.headers.mockResolvedValue(new Headers({host:'127.0.0.1:3000'}));request.cookies.mockResolvedValue({get:()=>({value:state})});
  await expect(forceInspectionError(state)).rejects.toThrow('Local inspection failure: '+state);
  await expect(forceInspectionError(state==='root'?'portal':'root')).resolves.toBeUndefined();
});
it('never reads cookies in production or without the explicit flag; rejects remote requests',async()=>{
  vi.stubEnv('NEVORA_DEV_FORCE_ERRORS','1');vi.stubEnv('NODE_ENV','production');await forceInspectionError('root');expect(request.cookies).not.toHaveBeenCalled();
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('NEVORA_DEV_FORCE_ERRORS','0');await forceInspectionError('root');expect(request.cookies).not.toHaveBeenCalled();
  vi.stubEnv('NEVORA_DEV_FORCE_ERRORS','1');request.headers.mockResolvedValue(new Headers({host:'public.invalid'}));await forceInspectionError('root');expect(request.cookies).not.toHaveBeenCalled();
});
