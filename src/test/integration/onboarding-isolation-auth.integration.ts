import {beforeAll,afterAll,beforeEach,afterEach,it,expect,vi} from 'vitest';
import {createHash,randomUUID} from 'node:crypto';
const cookies=vi.hoisted(()=>({values:new Map<string,{name:string;value:string}>(),get(name:string){return this.values.get(name);},getAll(name?:string){return [...this.values.values()].filter(v=>!name||v.name===name);},set(name:string,value:string){this.values.set(name,{name,value});},delete(name:string){this.values.delete(name);}}));
vi.mock('next/headers',()=>({cookies:async()=>cookies,headers:async()=>new Headers()}));
import {ownedWorkspaceFixture} from './onboarding-workspace-fixture';
import {withWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {sealWorkspaceToken,openWorkspaceToken} from '@/lib/workspace-routing/token-envelope.server';
import {assertWorkerWorkspace} from '@/lib/workspace-routing/worker.server';
import {getSession,writeSessionCookie,readSessionMutationProof} from '@/lib/auth/session';
import {POST as activate} from '@/app/api/auth/activate/route';
import {POST as reset} from '@/app/api/auth/reset-access/route';
import {GET as calendar} from '@/app/api/calendar/[token]/schedule.ics/route';
import {POST as photo} from '@/app/api/clocker/[location]/photos/[photoId]/route';
import {GET as logo} from '@/app/api/workspace-presentation/logo/[assetId]/route';
import {createWorkspaceDiscoveryHandler} from '@/lib/workspace-routing/discovery.server';
import {POST as mobileSessionUnsupportedPost} from '@/app/api/mobile/v1/notifications/complete/route';
import {GET as mobileSession} from '@/app/api/mobile/v1/session/route';
import {POST as pin} from '@/app/api/clocker/[location]/pin/route';
import {POST as passkey} from '@/app/api/auth/passkey/login/verify/route';
let f:Awaited<ReturnType<typeof ownedWorkspaceFixture>>;
const inner='A'.repeat(43),digest=createHash('sha256').update(inner).digest('hex');
const assetId=randomUUID();
beforeAll(async()=>{
 f=await ownedWorkspaceFixture();
 for(const c of f.companies){
  await c.db.pool.query(`ALTER TABLE employees ADD first_name text,ADD last_name text DEFAULT 'Example',ADD role text DEFAULT 'EMPLOYEE',ADD primary_location_id text DEFAULT 'LOC-1',ADD active boolean DEFAULT true; UPDATE employees SET first_name=label; CREATE TABLE employee_sessions(token_hash text PRIMARY KEY,employee_id text REFERENCES employees(id),expires_at timestamptz); GRANT SELECT ON employee_sessions TO ${c.role}`);
  // Deliberately duplicated inner session digest on A/B: envelope must still deny cross-host use.
  await c.db.pool.query("INSERT INTO employee_sessions VALUES($1,'EMP-1',clock_timestamp()+interval '1 day')",[digest]);
  await c.db.pool.query(`CREATE TABLE nevora_workspace_presentation_assets(id uuid PRIMARY KEY,media_type text,sha256 text,bytes bytea); GRANT SELECT ON nevora_workspace_presentation_assets TO ${c.role}`);
  await c.db.pool.query("INSERT INTO nevora_workspace_presentation_assets VALUES($1,'image/png',$2,$3)",[assetId,'a'.repeat(64),Buffer.from(c.origin)]);
 }
});
afterAll(async()=>{await f?.close();});
beforeEach(()=>{
 for(const [key,value] of Object.entries({NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:f.config.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:f.control.connectionUrl,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:f.config.encryptionKey,NEVORA_WORKSPACE_TOKEN_SECRET:f.config.tokenKey,NEVORA_ONBOARDING_ENABLED:'false'}))vi.stubEnv(key,value);
 cookies.values.clear();
});
afterEach(()=>vi.unstubAllEnvs());
function request(origin:string,path:string,marker:string,body:unknown,extra:Record<string,string>={}){return new Request(origin+path,{method:'POST',headers:{host:new URL(origin).host,origin,'content-type':'application/json',[marker]:'1',...extra},body:JSON.stringify(body)});}
it('reads the same employee ID from its own database and rejects copied session cookies even with identical stored inner hashes',async()=>{
 const [a,b]=f.companies;
 await withWorkspaceBinding(a.binding,()=>writeSessionCookie({token:inner,expiresAt:new Date(Date.now()+60000)}));const original=cookies.get('fuel_session')!.value;expect(original).toMatch(/^nw1_/);
 expect(await withWorkspaceBinding(a.binding,getSession)).toMatchObject({id:'EMP-1',firstName:'Company A'});
 expect(await withWorkspaceBinding(b.binding,getSession)).toBeNull();expect(await withWorkspaceBinding(b.binding,readSessionMutationProof)).toBeNull();
 await withWorkspaceBinding(b.binding,()=>writeSessionCookie({token:inner,expiresAt:new Date(Date.now()+60000)}));expect(await withWorkspaceBinding(b.binding,getSession)).toMatchObject({id:'EMP-1',firstName:'Company B'});
});
it('rejects a legacy raw session in isolated mode and respects canonical employee revocation',async()=>{
 const a=f.companies[0];cookies.set('fuel_session',inner);expect(await withWorkspaceBinding(a.binding,getSession)).toBeNull();
 await withWorkspaceBinding(a.binding,()=>writeSessionCookie({token:inner,expiresAt:new Date(Date.now()+60000)}));await a.db.pool.query("UPDATE employees SET active=false WHERE id='EMP-1'");
 try{expect(await withWorkspaceBinding(a.binding,getSession)).toBeNull();}finally{await a.db.pool.query("UPDATE employees SET active=true WHERE id='EMP-1'");}
});
it('rejects copied invitation and recovery proofs at their real HTTP entrypoints before any credential change',async()=>{
 const [a,b]=f.companies;
 for(const [purpose,handler,path,marker] of [['INVITATION',activate,'/api/auth/activate','x-nevora-activation'],['RECOVERY',reset,'/api/auth/reset-access','x-nevora-recovery']] as const){
  const proof=sealWorkspaceToken(a.binding,purpose,inner,Date.now()+60000);
  const result=await withWorkspaceBinding(b.binding,()=>handler(request(b.origin,path,marker,{proof,password:'Fictional passphrase 123!'})));expect(result.status).toBe(400);expect(await result.json()).toEqual({state:'invalid'});
 }
 expect((await b.db.pool.query('SELECT token_hash FROM employee_sessions')).rows.map(r=>r.token_hash)).toEqual([digest]);
});
it('rejects a copied calendar credential at its public route',async()=>{
 const [a,b]=f.companies,token=sealWorkspaceToken(a.binding,'CALENDAR',inner,Date.now()+60000);
 const result=await withWorkspaceBinding(b.binding,()=>calendar(new Request(b.origin+'/api/calendar/'+token+'/schedule.ics'),{params:Promise.resolve({token})}));expect(result.status).toBe(404);
});
it('rejects a copied Clocker device cookie at the real PIN endpoint',async()=>{
 const [a,b]=f.companies;cookies.set('nevora_clocker',sealWorkspaceToken(a.binding,'CLOCKER_DEVICE','nev_dev_'+'a'.repeat(64),Date.now()+60000));
 const result=await withWorkspaceBinding(b.binding,()=>pin(request(b.origin,'/api/clocker/main/pin','x-nevora-clocker',{action:'status'}),{params:Promise.resolve({location:'main'})}));expect(result.status).toBe(401);expect(await result.json()).toMatchObject({state:'device_required'});
});
it('rejects a copied passkey flow cookie at the real verification endpoint',async()=>{
 const [a,b]=f.companies;vi.stubEnv('NEXT_PUBLIC_NEVORA_PASSKEYS','on');cookies.set('nevora_pk_login',sealWorkspaceToken(a.binding,'PASSKEY_LOGIN',inner,Date.now()+60000));
 const result=await withWorkspaceBinding(b.binding,()=>passkey(request(b.origin,'/api/auth/passkey/login/verify','x-nevora-passkey',{response:{}})));expect(result.status).toBe(404);
});
it('does not accept another company session or a native marker as native sign-in authority',async()=>{
 const [a,b]=f.companies;await withWorkspaceBinding(a.binding,()=>writeSessionCookie({token:inner,expiresAt:new Date(Date.now()+60000)}));
 const result=await withWorkspaceBinding(b.binding,()=>mobileSession(new Request(b.origin+'/api/mobile/v1/session',{headers:{'user-agent':'NEVORA-Native/iOS/1'}})));expect(result.status).toBe(401);expect(await result.json()).toEqual({protocolVersion:1,state:'unauthenticated'});
 // Disabled native registration stays closed and creates no company-side enrollment.
 const closed=await withWorkspaceBinding(b.binding,()=>mobileSessionUnsupportedPost(request(b.origin,'/api/mobile/v1/notifications/complete','x-nevora-native',{})));expect(closed.status).toBe(503);
});
it('denies private file retrieval with another company session at the actual photo route',async()=>{
 const [a,b]=f.companies,id=randomUUID();await withWorkspaceBinding(a.binding,()=>writeSessionCookie({token:inner,expiresAt:new Date(Date.now()+60000)}));
 const result=await withWorkspaceBinding(b.binding,()=>photo(request(b.origin,'/api/clocker/main/photos/'+id,'x-nevora-clocker',{operation:'photo',reference:{commandId:id}},{'x-nevora-photo-command':id}),{params:Promise.resolve({location:'main',photoId:id})}));expect(result.status).toBe(401);expect(await result.json()).toMatchObject({code:'AUTH_REQUIRED'});
});
it('keeps public file lookups in the registered company and disables shared caching in isolated mode',async()=>{
 const responses=await Promise.all(f.companies.map(c=>withWorkspaceBinding(c.binding,()=>logo(new Request(c.origin+'/api/workspace-presentation/logo/'+assetId),{params:Promise.resolve({assetId})}))));
 for(let i=0;i<responses.length;i++){expect(responses[i].status).toBe(200);expect(await responses[i].text()).toBe(f.companies[i].origin);expect(responses[i].headers.get('cache-control')).toBe('no-store, private');}
});
it('requires the explicit WORKER principal and keeps simultaneous worker job reads in their own databases',async()=>{
 await expect(withWorkspaceBinding(f.companies[0].binding,assertWorkerWorkspace)).rejects.toThrow();
 const rows=await Promise.all(f.companies.map(c=>withWorkspaceBinding(c.workerBinding,async()=>{await assertWorkerWorkspace();return getWorkspaceDb(c.workerBinding).query<{label:string}>({text:"SELECT label FROM employees WHERE id='EMP-1'",values:[]});})));
 expect(rows.map(r=>r[0].label)).toEqual(['Company A','Company B']);
});
it('stops a previously resolved worker when the registry is suspended',async()=>{
 const a=f.companies[0];await f.control.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[a.id]);
 try{await expect(withWorkspaceBinding(a.workerBinding,()=>getWorkspaceDb(a.workerBinding).query({text:'SELECT label FROM employees',values:[]}))).rejects.toThrow();}
 finally{await f.control.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='ACTIVE',revision=revision+1 WHERE id=$1",[a.id]);}
});
it('discovery uses actual active registry records and remains available while new signup is disabled',async()=>{
 const h=createWorkspaceDiscoveryHandler(f.store,f.config,'https://signup.example.invalid');
 const make=(slug:string)=>new Request('https://signup.example.invalid/api/mobile/v1/workspaces/resolve',{method:'POST',headers:{'content-type':'application/json','x-nevora-workspace':'1'},body:JSON.stringify({schemaVersion:1,slug})});
 const b=await h(make('beta'));expect(await b.json()).toEqual({schemaVersion:1,status:'ready',origin:f.companies[1].origin});expect((await h(make('unknown'))).status).toBe(404);
});
it('invalidates every envelope purpose after restoration changes the company incarnation',async()=>{
 const a=f.companies[0],token=sealWorkspaceToken(a.binding,'PASSKEY_LOGIN',inner,Date.now()+60000);
 await f.control.pool.query('UPDATE nevora_onboarding.workspace_registry SET incarnation=incarnation+1,revision=revision+1 WHERE id=$1',[a.id]);
 await a.db.pool.query('UPDATE onboarding_workspace_identity SET incarnation=incarnation+1');
 const {resolveWorkspaceBinding}=await import('@/lib/workspace-routing/resolver.server');const restored=await resolveWorkspaceBinding({origin:a.origin},f.store,f.config);
 expect(openWorkspaceToken(restored,'PASSKEY_LOGIN',token)).toBeNull();
 await expect(getWorkspaceDb(a.binding).query({text:'SELECT label FROM employees',values:[]})).rejects.toThrow();
});
