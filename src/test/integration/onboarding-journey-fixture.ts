import {Pool} from 'pg';
import {neonConfig} from '@neondatabase/serverless';
import {randomUUID} from 'node:crypto';
import {freshOnboardingControl} from './onboarding-fixture';
import {onboardingTestConfig} from './onboarding-test-config';
import {OwnedProvisioningProvider} from './onboarding-provider-fixture';
import {createControlStore} from '@/lib/onboarding/control-store.server';
import {openOnboardingValue} from '@/lib/onboarding/crypto.server';
import {requestRegistration,verifyRegistration} from '@/lib/onboarding/registration.server';
import {requestWorkspace,claimProvisioningJob} from '@/lib/onboarding/provisioning/store.server';
import {runProvisioningJob} from '@/lib/onboarding/provisioning/orchestrator.server';
import {requestOwnerBootstrapGrant,runOwnerActivationWorker} from '@/lib/onboarding/owner-activation.server';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
export async function onboardingJourneyFixture(){
 const db=await freshOnboardingControl(),store=createControlStore(db.pool),provider=new OwnedProvisioningProvider(),pools:Pool[]=[],map=new Map<string,Pool>();
 const config=onboardingTestConfig({NEVORA_ONBOARDING_PROVIDER_ENABLED:'true',NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY:'10',NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF:'fictional-org',NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION:'fictional-policy-1'}),routing={...config,tokenKey:config.workspaceTokenKey};
 const errors:string[]=[];const original=neonConfig.fetchFunction;let loseNextRuntimeCommit=false;
 neonConfig.fetchFunction=async(_url:unknown,options:RequestInit)=>{
  const uri=new Headers(options.headers).get('Neon-Connection-String'),pool=uri?map.get(uri):undefined;if(!pool)throw Error('Non-owned onboarding SDK target');
  const body=JSON.parse(String(options.body)),queries=body.queries??[body],client=await pool.connect();
  try{await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');const results=[];for(const q of queries){const r=await client.query({text:q.query,values:q.params??[],rowMode:'array',types:{getTypeParser:()=>((x:string)=>x)}});results.push({command:r.command,rowCount:r.rowCount,fields:r.fields.map(f=>({name:f.name,dataTypeID:f.dataTypeID})),rows:r.rows,rowAsArray:true});}await client.query('COMMIT');if(loseNextRuntimeCommit&&queries.some((q:{query:string;params:unknown[]})=>q.query.includes('onboarding_owner_claim')&&q.params?.[6])){loseNextRuntimeCommit=false;throw Error('Owned activation commit reply lost');}return new Response(JSON.stringify(body.queries?{results}:results[0]),{status:200});}
  catch(error){await client.query('ROLLBACK');if(error instanceof Error&&error.message==='Owned activation commit reply lost')throw error;const e=error as {message:string;code:string};errors.push(e.code+':'+e.message);return new Response(JSON.stringify({message:e.message,code:e.code}),{status:400});}finally{client.release();}
 };
 async function createCompany(slug='fictional-north',email='fictional-owner@example.invalid'){
  let proof='';await requestRegistration({schemaVersion:1,operationId:randomUUID(),email,locale:'en',termsVersion:config.termsVersion,privacyVersion:config.privacyVersion},store,{async send(m){proof=m.proof;return {providerAccepted:true};}},config,'127.0.0.1');
  const actor=await verifyRegistration({operationId:randomUUID(),proof},store,config);if(actor.state!=='verified')throw Error('Owned verification failed');const signupSession=actor.session;
  const c={schemaVersion:1,operationId:randomUUID(),expectedVersion:actor.snapshot.version,payload:{businessName:'Fictional '+slug,timeZone:'America/Chicago',requestedSlug:slug,initialLocation:{name:'Main Studio',shortName:'Main',key:'main'},ownerProfile:{id:'OWNER-1',firstName:'Fictional',lastName:'Owner',phone:'787-555-0101'}}};
  if((await requestWorkspace(actor.session,c,store,config)).state!=='pending')throw Error('Owned reservation failed');
  if((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state!=='complete')throw Error('Owned bootstrap failed');
  const row=(await db.pool.query('SELECT * FROM nevora_onboarding.provisioning_operations WHERE operation_id=$1',[c.operationId])).rows[0],resource=provider.resources.get(row.resource.projectId)!;
  const secrets=(await db.pool.query('SELECT * FROM nevora_onboarding.workspace_secrets WHERE workspace_id=$1',[row.workspace_id])).rows;
  let appPool:Pool|undefined;
  for(const s of secrets){const uri=openOnboardingValue(s.ciphertext,'workspace-secret:test:'+row.workspace_id+':1:'+s.role_kind+':'+s.id,config.encryptionKey);if(!uri)throw Error('Owned runtime URI unavailable');const url=new URL(resource.db.connectionUrl);url.username=new URL(uri).username;url.password=new URL(uri).password;const pool=new Pool({connectionString:url.href,max:4});pools.push(pool);map.set(uri,pool);if(s.role_kind==='APP')appPool=pool;}
  const origin='https://'+slug+'.'+config.portalBaseDomain,binding=await resolveWorkspaceBinding({origin},store,routing,'BOOTSTRAP');
  const grantCommand={schemaVersion:1,operationId:randomUUID()};
  async function work(){await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');return runOwnerActivationWorker({store,config,connect:provider.connect});}
  async function grant(){const requested=await requestOwnerBootstrapGrant(signupSession,grantCommand,store,config);if(!['pending','ready'].includes(requested.state))throw Error('Owned grant request failed:'+requested.state);await work();const ready=await requestOwnerBootstrapGrant(signupSession,grantCommand,store,config);if(ready.state!=='ready')throw Error('Owned grant publication failed:'+ready.state);return {ready,proof:new URLSearchParams(new URL(ready.url).hash.slice(1)).get('proof')!};}
  return {actor,command:c,row,resource,origin,binding,grantCommand,work,grant,appPool:appPool!};
 }
 return {db,store,provider,config,routing,errors,createCompany,loseRuntimeCommit(){loseNextRuntimeCommit=true;},async close(){neonConfig.fetchFunction=original;for(const p of pools)await p.end();await provider.close();await db.close();}};
}
