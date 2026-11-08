import {Pool} from 'pg';
import {neonConfig} from '@neondatabase/serverless';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {freshOnboardingControl,freshOnboardingDatabase} from './onboarding-fixture';
import {onboardingTestConfig} from './onboarding-test-config';
import {createControlStore} from '@/lib/onboarding/control-store.server';
import {sealOnboardingValue} from '@/lib/onboarding/crypto.server';
import {resolveWorkspaceBinding,type WorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
export type OwnedCompany={id:string;ref:string;origin:string;role:string;project:string;uri:string;db:Awaited<ReturnType<typeof freshOnboardingDatabase>>;pool:Pool;binding:WorkspaceBinding;workerBinding:WorkspaceBinding;workerPool:Pool};
/** Actual owned A/B databases and restricted roles. Only the installed SDK's
 * fetch transport is substituted; SQL, transactions and permissions are real PG. */
export async function ownedWorkspaceFixture(){
 const config={...onboardingTestConfig(),tokenKey:Buffer.alloc(32,8).toString('base64url')},control=await freshOnboardingControl(),store=createControlStore(control.pool);
 const companies:OwnedCompany[]=[],resources:{db:Awaited<ReturnType<typeof freshOnboardingDatabase>>;roles:string[];pools:Pool[]}[]=[],map=new Map<string,Pool>(),originalFetch=neonConfig.fetchFunction;
 async function close(){
  neonConfig.fetchFunction=originalFetch;
  for(const c of resources)for(const pool of c.pools)await pool.end();
  for(const c of [...resources].reverse()){await c.db.close();for(const role of c.roles)await control.pool.query('DROP ROLE '+role);}
  await control.close();
 }
 try{
  neonConfig.fetchFunction=async(_url:unknown,options:RequestInit)=>{
   const uri=new Headers(options.headers).get('Neon-Connection-String'),pool=uri?map.get(uri):undefined;if(!pool)throw Error('The installed SDK attempted a non-owned test target');
   const body=JSON.parse(String(options.body)),queries=body.queries??[body],client=await pool.connect();
   try{await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');const results=[];for(const q of queries){const r=await client.query({text:q.query,values:q.params??[],rowMode:'array',types:{getTypeParser:()=>((x:string)=>x)}});results.push({command:r.command,rowCount:r.rowCount,fields:r.fields.map(f=>({name:f.name,dataTypeID:f.dataTypeID})),rows:r.rows,rowAsArray:true});}await client.query('COMMIT');return new Response(JSON.stringify(body.queries?{results}:results[0]),{status:200});}
   catch(error){await client.query('ROLLBACK');const e=error as {message:string;code:string};return new Response(JSON.stringify({message:e.message,code:e.code}),{status:400});}finally{client.release();}
  };
  for(const [slug,label] of [['alpha','Company A'],['beta','Company B']]){
   const db=await freshOnboardingDatabase(),owned={db,roles:[] as string[],pools:[] as Pool[]};resources.push(owned);
   const id=randomUUID(),project='fictional-'+slug,origin='https://'+slug+'.portal.example.invalid';
   await db.pool.query('CREATE TABLE workspaces(id text PRIMARY KEY,singleton boolean NOT NULL UNIQUE DEFAULT true,active boolean NOT NULL DEFAULT true,name text NOT NULL);CREATE TABLE employees(id text PRIMARY KEY,label text NOT NULL)');
   await db.pool.query('INSERT INTO workspaces(id,name) VALUES($1,$2)',[id,label]);await db.pool.query('INSERT INTO employees VALUES($1,$2)',['EMP-1',label]);
   await db.pool.query(await readFile(resolve('db/migrations/0047_isolated_workspace_runtime.sql'),'utf8'));
   await db.pool.query('INSERT INTO onboarding_workspace_identity(workspace_id,environment,incarnation,provider_project_id,lifecycle) VALUES($1,$2,1,$3,$4)',[id,'test',project,'ACTIVE']);
   await db.pool.query(`REVOKE CONNECT ON DATABASE ${db.name} FROM PUBLIC`);
   const credentials=[];
   for(const kind of ['APP','WORKER'] as const){
    const ref=randomUUID(),role='nv_'+kind.toLowerCase()+'_'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('hex');
    await db.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);owned.roles.push(role);
    await db.pool.query('INSERT INTO onboarding_runtime_roles(kind,login_role) VALUES($1,$2)',[kind,role]);
    await db.pool.query(`GRANT CONNECT ON DATABASE ${db.name} TO ${role}; GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT ON workspaces,onboarding_workspace_identity,onboarding_runtime_roles TO ${role}; GRANT UPDATE(lock_token) ON onboarding_workspace_identity TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON employees TO ${role}`);
    const uri='postgresql://'+role+':fictional@ep-'+slug+'.us-east-1.aws.neon.tech/fictional',url=new URL(db.connectionUrl);url.username=role;url.password=password;const pool=new Pool({connectionString:url.href,max:4});owned.pools.push(pool);map.set(uri,pool);
    credentials.push({kind,ref,role,uri,pool});
   }
   const [app,worker]=credentials;
   await control.pool.query(`INSERT INTO nevora_onboarding.workspace_registry(id,canonical_origin,environment,incarnation,revision,lifecycle,provider_project_id,app_secret_ref,app_role_name,worker_secret_ref,worker_role_name) VALUES($1,$2,'test',1,1,'ACTIVE',$3,$4,$5,$6,$7)`,[id,origin,project,app.ref,app.role,worker.ref,worker.role]);
   for(const c of credentials)await control.pool.query(`INSERT INTO nevora_onboarding.workspace_secrets(id,workspace_id,environment,incarnation,role_kind,login_role,ciphertext) VALUES($1,$2,'test',1,$3,$4,$5)`,[c.ref,id,c.kind,c.role,sealOnboardingValue(c.uri,'workspace-secret:test:'+id+':1:'+c.kind+':'+c.ref,config.encryptionKey)]);
   const binding=await resolveWorkspaceBinding({origin},store,config),workerBinding=await resolveWorkspaceBinding({origin},store,config,'WORKER');
   companies.push({id,ref:app.ref,origin,role:app.role,project,uri:app.uri,db,pool:app.pool,binding,workerBinding,workerPool:worker.pool});
  }
  return {config,control,store,companies,map,close};
 }catch(error){await close();throw error;}
}
