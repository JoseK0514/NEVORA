import {afterEach,it,expect,vi} from 'vitest';
vi.mock('next/headers',()=>({headers:vi.fn(async()=>new Headers())}));
import {currentWorkspaceBinding,withWorkspaceBinding} from './context.server';
import {resolveWorkspaceBinding} from './resolver.server';
import type {ControlStore} from '../onboarding/control-store.server';
const config={environment:'test' as const,portalBaseDomain:'portal.example.invalid',controlDatabaseUrl:'postgresql://fixture@localhost/fictional',encryptionKey:Buffer.alloc(32,9).toString('base64url'),tokenKey:Buffer.alloc(32,8).toString('base64url')};
function binding(slug:string){return resolveWorkspaceBinding({origin:`https://${slug}.portal.example.invalid`},{query:async()=>({rows:[{id:'170837ce-471d-4c6f-a322-aa73ce9863d6',canonical_origin:`https://${slug}.portal.example.invalid`,environment:'test',incarnation:'1',revision:'1',lifecycle:'ACTIVE',provider_project_id:'fictional',app_secret_ref:'5d332a0d-69ab-45a4-9c0b-e4d2c54a2d87',app_role_name:'nv_app',worker_secret_ref:null,worker_role_name:null}]} as never)} as unknown as ControlStore,config);}
afterEach(()=>vi.unstubAllEnvs());
it('keeps simultaneous callback bindings separate and clears them after return',async()=>{
 vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');const a=await binding('alpha'),b=await binding('beta');
 const values=await Promise.all([a,b].map(x=>withWorkspaceBinding(x,async()=>{await new Promise(r=>setTimeout(r,3));return currentWorkspaceBinding();})));
 expect(values).toEqual([a,b]);await expect(currentWorkspaceBinding()).rejects.toThrow();
});
it('rejects fabricated callback bindings before running work',async()=>{let ran=false;await expect(withWorkspaceBinding({} as never,async()=>{ran=true;})).rejects.toThrow();expect(ran).toBe(false);});
