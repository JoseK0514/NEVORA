import {it,expect,vi} from 'vitest';
import {createWorkspaceDiscoveryHandler} from './discovery.server';
import type {ControlStore} from '../onboarding/control-store.server';
const config={environment:'test' as const,portalBaseDomain:'portal.example.invalid',controlDatabaseUrl:'postgresql://fixture@localhost/fictional',encryptionKey:Buffer.alloc(32,9).toString('base64url'),tokenKey:Buffer.alloc(32,8).toString('base64url')};
function request(body:unknown,headers:Record<string,string>={}){return new Request('https://signup.example.invalid/api/mobile/v1/workspaces/resolve',{method:'POST',headers:{'content-type':'application/json','x-nevora-workspace':'1',...headers},body:JSON.stringify(body)});}
function store(found=true,allowed=true){return {query:vi.fn(async()=>({rows:found?[{canonical_origin:'https://alpha.portal.example.invalid'}]:[]})),transaction:vi.fn(async(work:(q:unknown)=>unknown)=>work({query:async()=>({rows:[{attempts:allowed?1:121}]})}))} as unknown as ControlStore;}
it('returns only the canonical registered active origin to cookie-free clients',async()=>{
 const h=createWorkspaceDiscoveryHandler(store(),config,'https://signup.example.invalid');const r=await h(request({schemaVersion:1,slug:'alpha'}));expect(r.status).toBe(200);expect(await r.json()).toEqual({schemaVersion:1,status:'ready',origin:'https://alpha.portal.example.invalid'});expect(r.headers.get('cache-control')).toContain('no-store');
});
it('rejects forged origins, cookies, extra authority fields and unknown businesses',async()=>{
 const s=store(),h=createWorkspaceDiscoveryHandler(s,config,'https://signup.example.invalid');
 for(const [body,headers] of [[{schemaVersion:1,slug:'alpha',role:'OWNER'},{}],[{schemaVersion:1,slug:'alpha'},{cookie:'fuel_session=private'}],[{schemaVersion:1,slug:'alpha'},{origin:'https://foreign.invalid'}]] as const)expect((await h(request(body,headers))).status).toBeGreaterThanOrEqual(400);
 expect(s.query).not.toHaveBeenCalled();expect((await createWorkspaceDiscoveryHandler(store(false),config,'https://signup.example.invalid')(request({schemaVersion:1,slug:'alpha'}))).status).toBe(404);
});
it('applies a durable global discovery budget before registry lookup',async()=>{const s=store(true,false);expect((await createWorkspaceDiscoveryHandler(s,config,'https://signup.example.invalid')(request({schemaVersion:1,slug:'alpha'}))).status).toBe(429);expect(s.query).not.toHaveBeenCalled();});
