import {Pool} from 'pg';
import type {ProvisioningDependencies} from '@/lib/onboarding/provisioning/orchestrator.server';
import {restrictedOnboardingControl} from './onboarding-control-principals-fixture';
import {neonConfig} from '@neondatabase/serverless';
import {randomUUID,createHash} from 'node:crypto';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import {freshOnboardingControl} from './onboarding-fixture';
import {onboardingTestConfig} from './onboarding-test-config';
import {OwnedProvisioningProvider} from './onboarding-provider-fixture';
import {createControlStore} from '@/lib/onboarding/control-store.server';
import {openOnboardingValue} from '@/lib/onboarding/crypto.server';
import {requestRegistration,verifyRegistration} from '@/lib/onboarding/registration.server';
import {requestWorkspace,claimProvisioningJob} from '@/lib/onboarding/provisioning/store.server';
import {runProvisioningJob} from '@/lib/onboarding/provisioning/orchestrator.server';
import {requestOwnerBootstrapGrant,runOwnerActivationWorker,activateInitialOwner} from '@/lib/onboarding/owner-activation.server';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
export async function onboardingJourneyFixture(options:{restrictedControl?:boolean;commerce?:ProvisioningDependencies['commerce']}={}){
 const db=await freshOnboardingControl(),principals=options.restrictedControl?await restrictedOnboardingControl(db):null,store=principals?.store??createControlStore(db.pool),provisionerStore=principals?.provisionerStore??store,provider=new OwnedProvisioningProvider(),pools:Pool[]=[],map=new Map<string,Pool>();
 const config=onboardingTestConfig({NEVORA_CONTROL_DATABASE_URL:principals?.appUrl??db.connectionUrl,NEVORA_ONBOARDING_PROVIDER_ENABLED:'true',NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY:'10',NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF:'fictional-org',NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION:'fictional-policy-1'}),routing={...config,tokenKey:config.workspaceTokenKey};
 const errors:string[]=[];const original=neonConfig.fetchFunction;let loseNextRuntimeCommit=false;
 neonConfig.fetchFunction=async(_url:unknown,options:RequestInit)=>{
  const uri=new Headers(options.headers).get('Neon-Connection-String'),pool=uri?map.get(uri):undefined;if(!pool)throw Error('Non-owned onboarding SDK target');
  const body=JSON.parse(String(options.body)),queries=body.queries??[body],client=await pool.connect();
  try{await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');const results=[];for(const q of queries){const r=await client.query({text:q.query,values:q.params??[],rowMode:'array',types:{getTypeParser:()=>((x:string)=>x)}});results.push({command:r.command,rowCount:r.rowCount,fields:r.fields.map(f=>({name:f.name,dataTypeID:f.dataTypeID})),rows:r.rows,rowAsArray:true});}await client.query('COMMIT');if(loseNextRuntimeCommit&&queries.some((q:{query:string;params:unknown[]})=>(q.query.includes('onboarding_owner_claim')&&q.params?.[6])||q.query.startsWith('INSERT INTO onboarding_commands'))){loseNextRuntimeCommit=false;throw Error('Owned runtime commit reply lost');}return new Response(JSON.stringify(body.queries?{results}:results[0]),{status:200});}
  catch(error){await client.query('ROLLBACK');if(error instanceof Error&&error.message==='Owned runtime commit reply lost')throw error;const e=error as {message:string;code:string};errors.push(e.code+':'+e.message);return new Response(JSON.stringify({message:e.message,code:e.code}),{status:400});}finally{client.release();}
 };
 async function createCompany(slug='fictional-north',email='fictional-owner@example.invalid'){
  let proof='';await requestRegistration({schemaVersion:1,operationId:randomUUID(),email,locale:'en',termsVersion:config.termsVersion,privacyVersion:config.privacyVersion},store,{async send(m){proof=m.proof;return {providerAccepted:true};}},config,'127.0.0.1');
  const actor=await verifyRegistration({operationId:randomUUID(),proof},store,config);if(actor.state!=='verified')throw Error('Owned verification failed');const signupSession=actor.session;
  const c={schemaVersion:1,operationId:randomUUID(),expectedVersion:actor.snapshot.version,payload:{businessName:'Fictional '+slug,timeZone:'America/Chicago',requestedSlug:slug,initialLocation:{name:'Main Studio',shortName:'Main',key:'main'},ownerProfile:{id:'OWNER-1',firstName:'Fictional',lastName:'Owner',phone:'787-555-0101'}}};
  if((await requestWorkspace(actor.session,c,store,config)).state!=='pending')throw Error('Owned reservation failed');
  if((await runProvisioningJob((await claimProvisioningJob(provisionerStore,config))!,{store:provisionerStore,config,provider,connect:provider.connect,commerce:options.commerce})).state!=='complete')throw Error('Owned bootstrap failed');
  const until=Date.now()+5000;while((await db.pool.query('SELECT state FROM nevora_onboarding.provisioning_operations WHERE operation_id=$1',[c.operationId])).rows[0]?.state!=='OWNER_ACTIVATION_REQUIRED'){if(Date.now()>until)throw Error('Owned concurrent bootstrap did not publish its operation');await new Promise(r=>setTimeout(r,10));}
  const row=(await db.pool.query('SELECT * FROM nevora_onboarding.provisioning_operations WHERE operation_id=$1',[c.operationId])).rows[0],resource=provider.resources.get(row.resource.projectId)!;
  const secrets=(await db.pool.query('SELECT * FROM nevora_onboarding.workspace_secrets WHERE workspace_id=$1',[row.workspace_id])).rows;
  let appPool:Pool|undefined;
  for(const s of secrets){const uri=openOnboardingValue(s.ciphertext,'workspace-secret:test:'+row.workspace_id+':1:'+s.role_kind+':'+s.id,config.encryptionKey);if(!uri)throw Error('Owned runtime URI unavailable');const url=new URL(resource.db.connectionUrl);url.username=new URL(uri).username;url.password=new URL(uri).password;const pool=new Pool({connectionString:url.href,max:4});pools.push(pool);map.set(uri,pool);if(s.role_kind==='APP')appPool=pool;}
  const origin='https://'+slug+'.'+config.portalBaseDomain,binding=await resolveWorkspaceBinding({origin},store,routing,'BOOTSTRAP');
  const grantCommand={schemaVersion:1,operationId:randomUUID()};
  async function work(){
   for(let i=0;i<20;i++){await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');const result=await runOwnerActivationWorker({store:provisionerStore,config,connect:provider.connect});if(result.state==='idle'||result.operationId===c.operationId)return result;}
   throw Error('Owned fair activation worker did not reach requested company');
  }
  async function grant(){const requested=await requestOwnerBootstrapGrant(signupSession,grantCommand,store,config);if(!['pending','ready'].includes(requested.state))throw Error('Owned grant request failed:'+requested.state);await work();const ready=await requestOwnerBootstrapGrant(signupSession,grantCommand,store,config);if(ready.state!=='ready')throw Error('Owned grant publication failed:'+ready.state);return {ready,proof:new URLSearchParams(new URL(ready.url).hash.slice(1)).get('proof')!};}
  return {actor,command:c,row,resource,origin,binding,grantCommand,work,grant,appPool:appPool!};
 }
 async function activateCompany(c:Awaited<ReturnType<typeof createCompany>>){
  const {proof}=await c.grant();const result=await activateInitialOwner(c.binding,{schemaVersion:1,operationId:randomUUID(),proof,password:'Fictional owner password 123!'});if(result.state!=='activated')throw Error('Owned Owner activation failed');await c.work();
  const binding=await resolveWorkspaceBinding({origin:c.origin},store,routing),row=(await c.resource.db.pool.query("SELECT id,first_name,last_name,role,primary_location_id FROM employees WHERE id='OWNER-1'")).rows[0],hash=createHash('sha256').update(randomUUID()).digest('hex');
  await c.resource.db.pool.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 hour')",[hash,row.id]);
  const actor:SessionMutationProof={sessionTokenHash:hash,employee:{id:row.id,firstName:row.first_name,lastName:row.last_name,role:row.role,primaryLocationId:row.primary_location_id}};
  return {c,binding,actor};
 }
 return {db,store,provisionerStore,principals,provider,config,routing,errors,createCompany,activateCompany,loseRuntimeCommit(){loseNextRuntimeCommit=true;},async close(){neonConfig.fetchFunction=original;for(const p of pools)await p.end();await provider.close();await principals?.close();await db.close();}};
}
