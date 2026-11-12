import {readFile} from 'node:fs/promises';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {freshOnboardingDatabase} from './onboarding-fixture';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {CommerceStore} from '../../../services/commerce/store';
import {createCommerce} from '../../../services/commerce/service';

let catalog:Awaited<ReturnType<typeof freshOnboardingDatabase>>,store:CommerceStore;
let f:Awaited<ReturnType<typeof onboardingJourneyFixture>>;
const enrolled:unknown[]=[];
beforeEach(async()=>{
 enrolled.length=0;
 catalog=await freshOnboardingDatabase();
 await catalog.pool.query(await readFile(new URL('../../../services/commerce/schema.sql',import.meta.url),'utf8'));
 store=new CommerceStore(catalog.pool,Buffer.alloc(32,19));
 f=await onboardingJourneyFixture({commerce:{key:Buffer.alloc(32,23).toString('base64url'),workerKey:Buffer.alloc(32,24).toString('base64url'),async enroll(input){enrolled.push(input);await store.enrollWorkspace(input);}}});
});
afterEach(async()=>{await f?.close();await catalog?.close();});
it('preserves the original provisioning trial receipt through activation, setup, refresh and optional skips',async()=>{
 const {readOnboardingSetup,saveOnboardingStep}=await import('@/lib/onboarding/setup.server');
 const {randomUUID}=await import('node:crypto');
 const c=await f.createCompany('trial-setup'),original=(await catalog.pool.query('SELECT trial_started_at,trial_ends_at FROM commerce.businesses WHERE id=$1',[c.row.workspace_id])).rows[0];
 const provisioned=(await c.resource.db.pool.query('SELECT provisioned_at FROM nevora_commerce_installation')).rows[0].provisioned_at;
 expect(original.trial_started_at).toEqual(provisioned);
 const a=await f.activateCompany(c);let state=await readOnboardingSetup(a.actor,a.binding);
 for(const step of ['TIME_TRACKING','PAYROLL','OPTIONAL_FEATURES']){
  const cmd={schemaVersion:1,operationId:randomUUID(),expectedVersion:state.snapshot.version,payload:{action:'SKIP'}};
  expect((await saveOnboardingStep(a.actor,a.binding,step,cmd)).state).toBe('saved');
  expect((await saveOnboardingStep(a.actor,a.binding,step,cmd)).state).toBe('saved');
  state=await readOnboardingSetup(a.actor,a.binding);expect(state.snapshot.sections.find(s=>s.id===step)?.state).toBe('OPTIONAL');
 }
 expect((await catalog.pool.query('SELECT trial_started_at,trial_ends_at FROM commerce.businesses WHERE id=$1',[c.row.workspace_id])).rows[0]).toEqual(original);
 expect((await c.resource.db.pool.query('SELECT provisioned_at FROM nevora_commerce_installation')).rows[0].provisioned_at).toEqual(provisioned);
 expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM clocker_devices')).rows[0].n).toBe(0);
 expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM native_payroll_setup_records')).rows[0].n).toBe(0);
});
it('enrolls the actual provisioned company once before publishing activation, without a second Owner credential or provisioning job',async()=>{
 const c=await f.createCompany('billing-north');
 const rows=await catalog.pool.query('SELECT id,state,trial_started_at,trial_ends_at FROM commerce.businesses');
 expect(rows.rows).toHaveLength(1);
 const business=rows.rows[0];
 expect(business.id).toBe(c.row.workspace_id);expect(business.state).toBe('ready');
 expect(business.trial_ends_at.getTime()-business.trial_started_at.getTime()).toBe(30*86400000);
 expect((await c.resource.db.pool.query('SELECT active FROM employees')).rows).toEqual([{active:false}]);
 expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);
 expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.jobs')).rows[0].n).toBe(0);
 expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.slots')).rows[0].n).toBe(0);
});
it('refuses the competing public signup and setup paths in integrated mode before writing a second account',async()=>{
 const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://signup.example.test'],signupEnabled:true,provisioningMode:'onboarding'});
 for(const path of ['/v1/signup','/v1/setup','/v1/login-link','/v1/verify']){
  const reply=await app(new Request('https://billing.example.test'+path,{method:'POST',headers:{origin:'https://signup.example.test','content-type':'application/json'},body:JSON.stringify({email:'second-path@example.invalid'})}),'127.0.0.1');
  expect(reply.status).toBe(409);expect(await reply.json()).toEqual({error:{code:'use_onboarding'}});
 }
 expect((await catalog.pool.query("SELECT count(*)::int n FROM commerce.accounts WHERE email='second-path@example.invalid'")).rows[0].n).toBe(0);
});
it('recovers concurrent enrollment replay without restarting a trial or storing any company database credential',async()=>{
 await f.createCompany('billing-replay');
 expect(enrolled.length).toBeGreaterThan(0);
 const input=enrolled[0] as Parameters<CommerceStore['enrollWorkspace']>[0];
 const before=await store.business(input.workspaceId);
 await Promise.all(Array.from({length:8},()=>store.enrollWorkspace(input)));
 const after=await store.business(input.workspaceId);
 expect(after.trialStart).toBe(before.trialStart);expect(after.trialEnd).toBe(before.trialEnd);
 expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.external_installations WHERE business_id=$1',[input.workspaceId])).rows[0].n).toBe(1);
 expect(after.slotId).toBe(input.workspaceId);expect(after.origin).toBe(input.origin);
 await expect(store.enrollWorkspace({...input,origin:'https://foreign.example.test'})).rejects.toThrow('enrollment_identity_mismatch');
 await expect(store.enrollWorkspace({...input,incarnation:'2'})).rejects.toThrow('enrollment_identity_mismatch');
 expect((await catalog.pool.query("SELECT count(*)::int n FROM commerce.accounts WHERE password_hash IS NOT NULL")).rows[0].n).toBe(0);
});
it('allows the verified contact to own a second separate company without linking billing authority by email',async()=>{
 const first=await f.createCompany('billing-east','multi-owner@example.invalid');await f.activateCompany(first);
 await f.db.pool.query("UPDATE nevora_onboarding.email_subjects SET last_sent_at=clock_timestamp()-interval '61 seconds'");
 const second=await f.createCompany('billing-west','multi-owner@example.invalid');
 const businesses=await catalog.pool.query("SELECT b.id FROM commerce.businesses b JOIN commerce.accounts a ON a.id=b.id WHERE a.email='multi-owner@example.invalid'");
 expect(new Set(businesses.rows.map(r=>r.id))).toEqual(new Set([first.row.workspace_id,second.row.workspace_id]));
 const a=enrolled.find(x=>(x as {workspaceId:string}).workspaceId===first.row.workspace_id) as Parameters<CommerceStore['enrollWorkspace']>[0];
 const b=enrolled.find(x=>(x as {workspaceId:string}).workspaceId===second.row.workspace_id) as typeof a;
 expect((await store.installation(a.workspaceId,a.instanceSecret)).id).toBe(a.workspaceId);
 await expect(store.installation(b.workspaceId,a.instanceSecret)).rejects.toThrow('unauthorized');
});

it('uses current A/B routing for billing facts and never the process-wide legacy installation',async()=>{
 const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');
 const {readCommerceAuthority,resetCommerceAccessCache}=await import('@/lib/commerce/access');
 const {GET:facts}=await import('@/app/api/commerce/facts/route');
 const a=await f.createCompany('billing-route-a','route-a@example.invalid'),aa=await f.activateCompany(a);
 const b=await f.createCompany('billing-route-b','route-b@example.invalid'),bb=await f.activateCompany(b);
 const key=Buffer.alloc(32,23).toString('base64url');
 const prior={...process.env};Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:key,NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test',NEVORA_COMMERCE_INSTALLATION_ID:'wrong-legacy',NEVORA_COMMERCE_INSTANCE_SECRET:'x'.repeat(43)});
 const seen:string[]=[];
 const fetcher:typeof fetch=async(_url,init)=>{const id=new Headers(init?.headers).get('x-nevora-installation')!;seen.push(id);return Response.json({businessId:id,installationId:id,operational:true,state:'trial',validUntil:Date.now()+10000});};
 try{
  resetCommerceAccessCache();await withWorkspaceBinding(aa.binding,()=>readCommerceAuthority(fetcher));await withWorkspaceBinding(bb.binding,()=>readCommerceAuthority(fetcher));
  expect(seen).toEqual([a.row.workspace_id,b.row.workspace_id]);
  const input=enrolled.find(x=>(x as {workspaceId:string}).workspaceId===a.row.workspace_id) as Parameters<CommerceStore['enrollWorkspace']>[0];
  const result=await withWorkspaceBinding(aa.binding,()=>facts(new Request(a.origin+'/api/commerce/facts',{headers:{authorization:'Bearer '+input.instanceSecret}})));
  expect(result.status).toBe(200);expect((await result.json()).businessId).toBe(a.row.workspace_id);
  resetCommerceAccessCache();await expect(withWorkspaceBinding(aa.binding,()=>readCommerceAuthority(async()=>Response.json({businessId:b.row.workspace_id,installationId:b.row.workspace_id,operational:true,state:'trial',validUntil:Date.now()+10000})))).rejects.toThrow('invalid_commerce_authority');
 }finally{process.env=prior;resetCommerceAccessCache();}
});

it('recovers a committed enrollment with a lost acknowledgement before publishing the same pending Owner',async()=>{
 const {claimProvisioningJob}=await import('@/lib/onboarding/provisioning/store.server');
 const {runProvisioningJob}=await import('@/lib/onboarding/provisioning/orchestrator.server');
 await f.close();let lose=true;
 f=await onboardingJourneyFixture({commerce:{key:Buffer.alloc(32,23).toString('base64url'),workerKey:Buffer.alloc(32,24).toString('base64url'),async enroll(input){await store.enrollWorkspace(input);if(lose){lose=false;throw Error('Owned catalog commit acknowledgement lost');}}}});
 await expect(f.createCompany('billing-lost-reply')).rejects.toThrow('Owned bootstrap failed');
 const original=(await catalog.pool.query('SELECT id,trial_started_at,trial_ends_at FROM commerce.businesses')).rows[0];
 expect(original).toBeTruthy();
 expect((await f.db.pool.query('SELECT lifecycle FROM nevora_onboarding.workspace_registry')).rows[0].lifecycle).toBe('PROVISIONING');
 await f.db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');
 const result=await runProvisioningJob((await claimProvisioningJob(f.provisionerStore,f.config))!,{store:f.provisionerStore,config:f.config,provider:f.provider,connect:f.provider.connect,commerce:{key:Buffer.alloc(32,23).toString('base64url'),workerKey:Buffer.alloc(32,24).toString('base64url'),enroll:input=>store.enrollWorkspace(input)}});
 expect(result.state).toBe('complete');expect(f.provider.createCalls).toBe(1);
 const final=(await catalog.pool.query('SELECT id,trial_started_at,trial_ends_at FROM commerce.businesses')).rows;
 expect(final).toEqual([original]);expect((await f.db.pool.query('SELECT lifecycle FROM nevora_onboarding.workspace_registry')).rows[0].lifecycle).toBe('OWNER_ACTIVATION_REQUIRED');
});

it('keeps billing identity and capacity immutable to APP/WORKER and binds current Owner proofs to the correct company',async()=>{
 const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');
 const {readBillingOwnerBinding}=await import('@/lib/commerce/owner-binding');
 const {POST:policy}=await import('@/app/api/commerce/policy/route');
 const a=await f.createCompany('billing-privilege-a','privilege-a@example.invalid'),aa=await f.activateCompany(a);
 const b=await f.createCompany('billing-privilege-b','privilege-b@example.invalid'),bb=await f.activateCompany(b);
 const entry=enrolled.find(x=>(x as {workspaceId:string}).workspaceId===a.row.workspace_id) as Parameters<CommerceStore['enrollWorkspace']>[0];
 const connection={installationId:a.row.workspace_id,secret:entry.instanceSecret};
 const prior={...process.env};Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:Buffer.alloc(32,23).toString('base64url'),NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test'});
 try{
  await expect(a.appPool.query('UPDATE nevora_commerce_installation SET employee_limit=15')).rejects.toMatchObject({code:'42501'});
  await expect(a.appPool.query('UPDATE nevora_commerce_installation SET instance_secret_hash=$1',['f'.repeat(64)])).rejects.toMatchObject({code:'42501'});
  expect((await withWorkspaceBinding(aa.binding,()=>readBillingOwnerBinding(aa.actor,connection)))?.business_id).toBe(a.row.workspace_id);
  expect(await withWorkspaceBinding(bb.binding,()=>readBillingOwnerBinding(aa.actor,connection))).toBeNull();
  const reply=await withWorkspaceBinding(aa.binding,()=>policy(new Request(a.origin+'/api/commerce/policy',{method:'POST',headers:{authorization:'Bearer '+entry.instanceSecret,'content-type':'application/json'},body:JSON.stringify({businessId:a.row.workspace_id,employeeLimit:15})})));
  expect(reply.status).toBe(200);expect((await a.appPool.query('SELECT employee_limit FROM nevora_commerce_installation')).rows[0].employee_limit).toBe(15);
  expect((await b.appPool.query('SELECT employee_limit FROM nevora_commerce_installation')).rows[0].employee_limit).toBe(30);
  await a.resource.db.pool.query('DELETE FROM employee_sessions WHERE token_hash=$1',[aa.actor.sessionTokenHash]);
  expect(await withWorkspaceBinding(aa.binding,()=>readBillingOwnerBinding(aa.actor,connection))).toBeNull();
 }finally{process.env=prior;}
});

it('serves the same billing contract through the hosted API prefix while preserving public endpoint authentication',async()=>{
 const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://signup.example.test'],provisioningMode:'onboarding',pathPrefix:'/api/billing'});
 const plans=await app(new Request('https://billing.example.test/api/billing/v1/plans'),'127.0.0.1');
 expect(plans.status).toBe(200);expect((await plans.json()).trialDays).toBe(30);
 const denied=await app(new Request('https://billing.example.test/api/billing/internal/access'),'127.0.0.1');
 expect(denied.status).toBe(401);
});

it('connects the provisioned Owner to one Stripe checkout and signed lifecycle events without changing the original trial',async()=>{
 const {StripeFixture}=await import('../../../services/commerce/stripe-fixture');
 const {StripeBilling}=await import('../../../services/commerce/stripe');
 const {workerOnce}=await import('../../../services/commerce/worker');
 const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');
 const {GET:facts}=await import('@/app/api/commerce/facts/route');
 const {POST:policy}=await import('@/app/api/commerce/policy/route');
 const c=await f.createCompany('billing-full-journey'),active=await f.activateCompany(c);
 const input=enrolled[0] as Parameters<CommerceStore['enrollWorkspace']>[0],initial=await store.business(c.row.workspace_id);
 const provider=new StripeFixture(),webhookSecret='whsec_owned_fictional_only';let now=Date.now();
 const billing=new StripeBilling(store,provider.client,{origin:'https://signup.example.test',prices:{small:'price_small',team:'price_team'},webhookSecret,live:false,now:()=>now});
 const app=createCommerce({store,origin:'https://billing.example.test',uiOrigin:'https://signup.example.test',allowedOrigins:['https://signup.example.test'],billing,provisioningMode:'onboarding',now:()=>now});
 const prior={...process.env},originalFetch=globalThis.fetch;
 Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:Buffer.alloc(32,23).toString('base64url'),NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test'});
 globalThis.fetch=async(url,init)=>{
  const r=new Request(url,init);if(new URL(r.url).origin!==c.origin)throw Error('Non-owned HTTP target');
  return withWorkspaceBinding(active.binding,async()=>new URL(r.url).pathname==='/api/commerce/owner'?(await import('@/app/api/commerce/owner/route')).POST(r):r.method==='POST'?policy(r):facts(r));
 };
 const request=(path:string,body?:unknown,token?:string,operation?:string)=>app(new Request('https://billing.example.test'+path,{method:body===undefined?'GET':'POST',headers:{origin:'https://signup.example.test',...(body!==undefined?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{}),...(operation?{'idempotency-key':operation}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})}),'127.0.0.1');
 try{
  const generation=String((await c.resource.db.pool.query('SELECT generation FROM operational_subject_versions WHERE employee_id=$1',[active.actor.employee.id])).rows[0].generation);
  const owner={businessId:input.workspaceId,installationId:input.workspaceId,incarnation:'1',employeeId:active.actor.employee.id,sessionTokenHash:active.actor.sessionTokenHash,generation};
  const internal=await app(new Request('https://billing.example.test/internal/handoff',{method:'POST',headers:{authorization:'Bearer '+input.instanceSecret,'x-nevora-installation':input.workspaceId,'content-type':'application/json'},body:JSON.stringify({owner})}),'127.0.0.1');
  expect(internal.status).toBe(200);const handoff=await internal.json();
  const session=await request('/v1/handoff/exchange',{token:handoff.handoff});expect(session.status).toBe(200);const bearer=(await session.json()).accessToken;
  expect((await request('/v1/handoff/exchange',{token:handoff.handoff})).status).toBe(400);
  const {randomUUID}=await import('node:crypto');const operation=randomUUID();
  const checkout=await request('/v1/checkout',{},bearer,operation);expect(checkout.status).toBe(200);
  expect(await (await request('/v1/checkout',{},bearer,operation)).json()).toEqual(await checkout.json());expect(provider.sessions.size).toBe(1);
  expect((await store.business(input.workspaceId)).paidThrough).toBeNull();
  const completed=provider.complete([...provider.sessions.keys()][0]);
  const payload=JSON.stringify({id:'evt_owned_enrollment',object:'event',type:'checkout.session.completed',livemode:false,data:{object:completed}});
  const signature=provider.client.webhooks.generateTestHeaderString({payload,secret:webhookSecret});
  const deliver=()=>app(new Request('https://billing.example.test/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:payload}),'127.0.0.1');
  expect((await deliver()).status).toBe(200);expect((await deliver()).status).toBe(200);
  expect((await workerOnce(store,billing,async()=>{throw Error('No mail expected');})).state).toBe('processed');
  const subscribed=await store.business(input.workspaceId);expect(subscribed.subscriptionId).toBeTruthy();expect(subscribed.trialEnd).toBe(initial.trialEnd);
  expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.webhooks')).rows[0].n).toBe(1);
  const end=Math.ceil((initial.trialEnd!+30*86400000)/1000);provider.markPaid(subscribed.subscriptionId!,end);await billing.syncJob({subscriptionId:subscribed.subscriptionId!});now=initial.trialEnd!+1000;
  const access=await app(new Request('https://billing.example.test/internal/access',{headers:{authorization:'Bearer '+input.instanceSecret,'x-nevora-installation':input.workspaceId}}),'127.0.0.1');
  expect(access.status).toBe(200);expect(await access.json()).toMatchObject({businessId:input.workspaceId,state:'paid',operational:true,employeeLimit:15});
  expect((await c.appPool.query('SELECT employee_limit FROM nevora_commerce_installation')).rows[0].employee_limit).toBe(15);
  now=Date.now();const portal=await request('/v1/portal',{},bearer,randomUUID());expect(portal.status).toBe(200);
  const checkoutForm=provider.requests.find(r=>r.method==='POST'&&r.path==='/v1/checkout/sessions')!.form,portalForm=provider.requests.find(r=>r.path==='/v1/billing_portal/sessions')!.form;
  const proofs=[checkoutForm.get('success_url'),portalForm.get('return_url')].map(u=>new URLSearchParams(new URL(u!).hash.slice(1)).get('handoff')!);
  await c.resource.db.pool.query('DELETE FROM employee_sessions WHERE token_hash=$1',[active.actor.sessionTokenHash]);
  for(const token of proofs)expect((await request('/v1/handoff/exchange',{token})).status).toBe(400);
  expect((await request('/v1/status',undefined,bearer)).status).toBe(401);

 }finally{globalThis.fetch=originalFetch;process.env=prior;}
});

it('uses separate real catalog logins so billing cannot reset a trial and enrollment cannot edit subscriptions',async()=>{
 const {commercePrincipalGrants}=await import('../../../services/commerce/principals');
 const {Client}=await import('pg');const {randomBytes}=await import('node:crypto');
 const suffix=randomBytes(12).toString('hex'),api='nv_commerce_api_'+suffix,enrollment='nv_commerce_enroll_'+suffix;
 const clients:InstanceType<typeof Client>[]=[];
 try{
  for(const role of [api,enrollment])await catalog.pool.query('CREATE ROLE '+role+" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD 'owned-fictional-password'");
  for(const statement of commercePrincipalGrants(api,enrollment))await catalog.pool.query(statement);
  const connect=async(role:string)=>{const url=new URL(catalog.connectionUrl);url.username=role;url.password='owned-fictional-password';const c=new Client({connectionString:url.href});await c.connect();clients.push(c);return c;};
  const apiDb=await connect(api),enrollmentDb=await connect(enrollment);
  await expect(apiDb.query('SELECT database_secret FROM commerce.slots')).rejects.toMatchObject({code:'42501'});
  expect((await apiDb.query('SELECT id,origin FROM commerce.slots')).rows).toEqual([]);
  await expect(apiDb.query("UPDATE commerce.businesses SET trial_ends_at=clock_timestamp()+interval '1 year'")).rejects.toMatchObject({code:'42501'});
  await expect(apiDb.query("INSERT INTO commerce.accounts(id,email,profile) VALUES('11111111-1111-4111-8111-111111111111','other@example.invalid','{}')")).rejects.toMatchObject({code:'42501'});
  await expect(enrollmentDb.query("UPDATE commerce.businesses SET subscription_status='active'")).rejects.toMatchObject({code:'42501'});
  await expect(enrollmentDb.query('SELECT payload FROM commerce.jobs')).rejects.toMatchObject({code:'42501'});
 }finally{for(const c of clients)await c.end();for(const role of [api,enrollment]){await catalog.pool.query('DROP OWNED BY '+role);await catalog.pool.query('DROP ROLE '+role);}}
});

it('cannot mint a billing handoff with a retired company instance while its registry is suspended',async()=>{
 const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');const {GET:facts}=await import('@/app/api/commerce/facts/route');
 const c=await f.createCompany('billing-suspended'),a=await f.activateCompany(c),input=enrolled[0] as Parameters<CommerceStore['enrollWorkspace']>[0];
 const originalFetch=globalThis.fetch,prior={...process.env};Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:Buffer.alloc(32,23).toString('base64url'),NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test'});
 globalThis.fetch=async(url,init)=>withWorkspaceBinding(a.binding,()=>facts(new Request(url,init)));
 try{
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[input.workspaceId]);
  const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:[],provisioningMode:'onboarding'});
  const reply=await app(new Request('https://billing.example.test/internal/handoff',{method:'POST',headers:{authorization:'Bearer '+input.instanceSecret,'x-nevora-installation':input.workspaceId}}),'127.0.0.1');
  expect(reply.status).toBe(503);expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.tokens')).rows[0].n).toBe(0);
 }finally{globalThis.fetch=originalFetch;process.env=prior;}
});

it('never substitutes B authority when A cache validation is interleaved with a B request',async()=>{
 const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');const {resolveWorkspaceBinding}=await import('@/lib/workspace-routing/resolver.server');const {readCommerceAuthority,resetCommerceAccessCache}=await import('@/lib/commerce/access');
 const a=await f.createCompany('cache-interleave-a','cache-a@example.invalid'),aa=await f.activateCompany(a),b=await f.createCompany('cache-interleave-b','cache-b@example.invalid'),bb=await f.activateCompany(b);
 let armed=false,reads=0,release!:()=>void,reached!:()=>void;const gate=new Promise<void>(r=>release=r),waiting=new Promise<void>(r=>reached=r);
 const trap=new Proxy(f.store,{get(t,k){if(k==='query')return async(text:string,values:unknown[]=[])=>{if(armed&&text.includes('WHERE id=$1 AND environment=$2')&&values[0]===a.row.workspace_id&&++reads===3){reached();await gate;}return t.query(text,values);};return Reflect.get(t,k);}});
 const bound=await resolveWorkspaceBinding({origin:a.origin},trap,f.routing),prior={...process.env};Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:Buffer.alloc(32,23).toString('base64url'),NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test'});
 const fetcher:typeof fetch=async(_url,init)=>{const id=new Headers(init?.headers).get('x-nevora-installation')!;return Response.json({businessId:id,installationId:id,state:id===a.row.workspace_id?'restricted':'paid',operational:id!==a.row.workspace_id,validUntil:Date.now()+60000});};
 try{resetCommerceAccessCache();await withWorkspaceBinding(aa.binding,()=>readCommerceAuthority(fetcher));armed=true;const pending=withWorkspaceBinding(bound,()=>readCommerceAuthority(fetcher));await waiting;await withWorkspaceBinding(bb.binding,()=>readCommerceAuthority(fetcher));release();expect(await pending).toMatchObject({businessId:a.row.workspace_id,state:'restricted',operational:false});}
 finally{release();resetCommerceAccessCache();process.env=prior;}
});

it('rejects previously issued mailbox proofs for an onboarding business even when a caller omits integrated API configuration',async()=>{
 const c=await f.createCompany('old-mailbox-proof');const now=Date.now(),proof='m'.repeat(43);const {digest}=await import('../../../services/commerce/security');
 await store.loginLink('fictional-owner@example.invalid',proof,'https://signup.example.test/pages/nevora-verify',now,c.row.workspace_id);
 expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.jobs')).rows[0].n).toBe(0);
 await catalog.pool.query("INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,'signin',$3)",[digest(proof),c.row.workspace_id,new Date(now+60000)]);
 await expect(store.exchange(proof,'n'.repeat(43),now)).rejects.toThrow('invalid_or_expired_link');
});

it('rejects preexisting handoffs and billing sessions after Owner authority is revoked',async()=>{
 const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');const {GET:facts}=await import('@/app/api/commerce/facts/route');
 const c=await f.createCompany('billing-owner-revoked'),a=await f.activateCompany(c),input=enrolled[0] as Parameters<CommerceStore['enrollWorkspace']>[0];
 const generation=String((await c.resource.db.pool.query('SELECT generation FROM operational_subject_versions WHERE employee_id=$1',[a.actor.employee.id])).rows[0].generation);
 const owner={businessId:input.workspaceId,installationId:input.workspaceId,incarnation:'1',employeeId:a.actor.employee.id,sessionTokenHash:a.actor.sessionTokenHash,generation};
 const originalFetch=globalThis.fetch,prior={...process.env};Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:Buffer.alloc(32,23).toString('base64url'),NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test'});
 globalThis.fetch=async(url,init)=>withWorkspaceBinding(a.binding,async()=>new URL(String(url)).pathname==='/api/commerce/owner'?(await import('@/app/api/commerce/owner/route')).POST(new Request(url,init)):facts(new Request(url,init)));
 const app=createCommerce({store,origin:'https://billing.example.test',uiOrigin:'https://signup.example.test',allowedOrigins:['https://signup.example.test'],provisioningMode:'onboarding'});
 const mint=async()=>{const r=await app(new Request('https://billing.example.test/internal/handoff',{method:'POST',headers:{authorization:'Bearer '+input.instanceSecret,'x-nevora-installation':input.workspaceId,'content-type':'application/json'},body:JSON.stringify({owner})}),'127.0.0.1');expect(r.status).toBe(200);return (await r.json()).handoff as string;};
 const exchange=(proof:string)=>app(new Request('https://billing.example.test/v1/handoff/exchange',{method:'POST',headers:{origin:'https://signup.example.test','content-type':'application/json'},body:JSON.stringify({token:proof})}),'127.0.0.1');
 try{
  const handoff=await mint(),session=await exchange(await mint());expect(session.status).toBe(200);const bearer=(await session.json()).accessToken;
  await c.resource.db.pool.query("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[a.actor.employee.id]);
  expect((await exchange(handoff)).status).toBe(400);
  const status=await app(new Request('https://billing.example.test/v1/status',{headers:{authorization:'Bearer '+bearer}}),'127.0.0.1');expect(status.status).toBe(401);
  await c.resource.db.pool.query("UPDATE employees SET role='OWNER' WHERE id=$1",[a.actor.employee.id]);
  expect((await exchange(handoff)).status).toBe(400);
  owner.generation=String((await c.resource.db.pool.query('SELECT generation FROM operational_subject_versions WHERE employee_id=$1',[a.actor.employee.id])).rows[0].generation);
  const beforeRestore=await mint(),live=await exchange(await mint());expect(live.status).toBe(200);const liveBearer=(await live.json()).accessToken;
  await catalog.pool.query('UPDATE commerce.external_installations SET incarnation=2 WHERE business_id=$1',[input.workspaceId]);
  expect((await exchange(beforeRestore)).status).toBe(400);
  expect((await app(new Request('https://billing.example.test/v1/status',{headers:{authorization:'Bearer '+liveBearer}}),'127.0.0.1')).status).toBe(401);
 }finally{globalThis.fetch=originalFetch;process.env=prior;}
});
it('refuses a correctly named provisioning target occupied in another user schema without changing its sentinel',async()=>{
 const original=f.provider.create.bind(f.provider);f.provider.create=async(request,identity)=>{const resource=await original(request,identity);const owned=f.provider.resources.get(resource.projectId)!;await owned.db.pool.query('CREATE SCHEMA preexisting_private; CREATE TABLE preexisting_private.sentinel(value text); INSERT INTO preexisting_private.sentinel VALUES(\'keep\')');return resource;};
 await expect(f.createCompany('occupied-private-target')).rejects.toThrow('Owned bootstrap failed');
 expect((await catalog.pool.query('SELECT count(*)::int n FROM commerce.accounts')).rows[0].n).toBe(0);
 const db=[...f.provider.resources.values()][0].db;
 expect((await db.pool.query('SELECT value FROM preexisting_private.sentinel')).rows).toEqual([{value:'keep'}]);
 expect((await db.pool.query("SELECT to_regclass('public.workspaces') AS company")).rows[0].company).toBeNull();
});
it('reports not ready when the required billing authority schema revision is absent',async()=>{
 await catalog.pool.query('ALTER TABLE commerce.tokens DROP COLUMN owner_binding');
 const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:[],provisioningMode:'onboarding'});
 expect((await app(new Request('https://billing.example.test/ready'),'127.0.0.1')).status).toBe(503);
});

it('gives a WORKER a read-only entitlement credential that cannot mint Owner billing authority even with readable session hashes',async()=>{
 const {resolveWorkspaceBinding}=await import('@/lib/workspace-routing/resolver.server');const {withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server');const {currentCommerceConnection}=await import('@/lib/commerce/access');
 const c=await f.createCompany('billing-worker-read'),a=await f.activateCompany(c),input=enrolled[0] as Parameters<CommerceStore['enrollWorkspace']>[0];
 const worker=await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing,'WORKER'),prior={...process.env};Object.assign(process.env,{NEVORA_WORKSPACE_MODE:'isolated',NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_WORKER_BINDING_KEY:Buffer.alloc(32,24).toString('base64url'),NEVORA_COMMERCE_API_ORIGIN:'https://billing.example.test'});delete process.env.NEVORA_COMMERCE_BINDING_KEY;
 try{
  const connection=await withWorkspaceBinding(worker,()=>currentCommerceConnection());expect(connection.secret).not.toBe(input.instanceSecret);
  const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:[],provisioningMode:'onboarding',headcount:async()=>0});
  const headers={authorization:'Bearer '+connection.secret,'x-nevora-installation':input.workspaceId};
  expect((await app(new Request('https://billing.example.test/internal/access',{headers}),'127.0.0.1')).status).toBe(200);
  const generation=String((await c.resource.db.pool.query('SELECT generation FROM operational_subject_versions WHERE employee_id=$1',[a.actor.employee.id])).rows[0].generation);
  expect((await app(new Request('https://billing.example.test/internal/handoff',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({owner:{businessId:input.workspaceId,installationId:input.workspaceId,incarnation:'1',employeeId:a.actor.employee.id,sessionTokenHash:a.actor.sessionTokenHash,generation}})}),'127.0.0.1')).status).toBe(401);
 }finally{process.env=prior;}
});
