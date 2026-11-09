import {afterEach,describe,it,expect,vi} from 'vitest';
import {workspaceMode,parseWorkspaceOrigin} from './config.server';
import {resolveWorkspaceBinding,workspaceBindingFacts} from './resolver.server';
import {workspaceIdentity} from './binding.server';
import type {ControlStore} from '../onboarding/control-store.server';

const id='170837ce-471d-4c6f-a322-aa73ce9863d6',appRef='5d332a0d-69ab-45a4-9c0b-e4d2c54a2d87';
const config={environment:'test' as const,portalBaseDomain:'portal.example.invalid',controlDatabaseUrl:'postgresql://fixture@127.0.0.1/fictional',encryptionKey:Buffer.alloc(32,9).toString('base64url'),tokenKey:Buffer.alloc(32,8).toString('base64url')};
const row={id,canonical_origin:'https://alpha.portal.example.invalid',environment:'test',incarnation:'1',revision:'1',lifecycle:'ACTIVE',provider_project_id:'fictional-project-a',app_secret_ref:appRef,app_role_name:'nv_app_alpha',worker_secret_ref:null,worker_role_name:null};
function registry(value:unknown=row):ControlStore{return {async query(){return {rows:value===null?[]:[value],rowCount:value===null?0:1};},async transaction(){throw Error('No mutation belongs in routing resolution');}} as ControlStore;}
afterEach(()=>vi.unstubAllEnvs());
describe('canonical workspace routing',()=>{
 it('defaults only an absent mode to legacy and rejects misspelled modes',()=>{expect(workspaceMode({})).toBe('single_company');expect(()=>workspaceMode({NEVORA_WORKSPACE_MODE:'isolate'})).toThrow();});
 it('accepts only one registered business label under the approved portal domain',()=>{expect(parseWorkspaceOrigin('https://alpha.portal.example.invalid',config)).toBe('https://alpha.portal.example.invalid');});
 it.each(['https://foreign.invalid','https://portal.example.invalid','https://a.b.portal.example.invalid','https://alpha.portal.example.invalid/path','https://user:pass@alpha.portal.example.invalid','http://alpha.portal.example.invalid','https://alpha.portal.example.invalid?proof=private'])('refuses ambiguous/foreign origin %s',origin=>expect(parseWorkspaceOrigin(origin,config)).toBeNull());
 it('issues opaque routing custody without serializable secret/authority fields',async()=>{const b=await resolveWorkspaceBinding({origin:row.canonical_origin},registry(),config);expect(workspaceIdentity(b).workspaceId).toBe(id);expect(JSON.stringify(b)).toBe('{}');expect(workspaceBindingFacts(b).role).toBe('APP');});
 it('rejects a copied, serialized or proxied binding',async()=>{const b=await resolveWorkspaceBinding({origin:row.canonical_origin},registry(),config);for(const fake of [{...b},JSON.parse(JSON.stringify(b)),new Proxy(b,{})])expect(()=>workspaceIdentity(fake)).toThrow();});
 it.each(['SUSPENDED','QUARANTINED','PROVISIONING'])('refuses ordinary access during %s',lifecycle=>expect(resolveWorkspaceBinding({origin:row.canonical_origin},registry({...row,lifecycle}),config)).rejects.toThrow());
 it('does not treat forwarded host or extra workspace fields as routing authority',async()=>{await expect(resolveWorkspaceBinding({origin:row.canonical_origin,forwardedHost:'foreign.invalid'},registry(),config)).rejects.toThrow();await expect(resolveWorkspaceBinding({origin:row.canonical_origin,workspaceId:id} as never,registry(),config)).rejects.toThrow();});
 it('denies an unknown workspace and mismatched environment or unsafe decimal version',async()=>{await expect(resolveWorkspaceBinding({origin:row.canonical_origin},registry(null),config)).rejects.toThrow();await expect(resolveWorkspaceBinding({origin:row.canonical_origin},registry({...row,environment:'production'}),config)).rejects.toThrow();await expect(resolveWorkspaceBinding({origin:row.canonical_origin},registry({...row,incarnation:9007199254740992}),config)).rejects.toThrow();});
 it('reports unavailable on registry failure without selecting a default company',async()=>{const broken={...registry(),async query(){throw Error('private registry failure');}} as ControlStore;await expect(resolveWorkspaceBinding({origin:row.canonical_origin},broken,config)).rejects.toThrow('Workspace is unavailable');});
 it.each(['isolated','','isolate'])('never permits a cached legacy connection with explicit non-legacy mode %s',async(mode)=>{vi.stubEnv('DATABASE_URL','postgresql://fictional:fictional@ep-fictional.us-east-1.aws.neon.tech/fictional');const {getDb,getTenantRuntimeDb}=await import('../db');getDb();vi.stubEnv('NEVORA_WORKSPACE_MODE',mode);expect(()=>getDb()).toThrow();expect(()=>getTenantRuntimeDb('APP')).toThrow();});
});
