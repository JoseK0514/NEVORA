import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
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
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {withWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {applicationSql} from '@/lib/data/app-sql';
import {neonNotificationExecutor} from '@/lib/data/sql-executor';
import {queryRows} from '@/lib/db';

describe('actual A/B PostgreSQL routing behind the installed Neon HTTP protocol',()=>{
 const baseConfig=onboardingTestConfig(),config={...baseConfig,tokenKey:Buffer.alloc(32,8).toString('base64url')};let control:Awaited<ReturnType<typeof freshOnboardingControl>>,store:ReturnType<typeof createControlStore>;
 const companies:{id:string;ref:string;origin:string;role:string;project:string;uri:string;db:Awaited<ReturnType<typeof freshOnboardingDatabase>>;pool:Pool;binding:WorkspaceBinding}[]=[];
 const map=new Map<string,Pool>();let originalFetch:unknown;
 beforeAll(async()=>{
  control=await freshOnboardingControl();store=createControlStore(control.pool);originalFetch=neonConfig.fetchFunction;
  neonConfig.fetchFunction=async(_url:unknown,options:RequestInit)=>{
   const headers=new Headers(options.headers),uri=headers.get('Neon-Connection-String'),pool=uri?map.get(uri):undefined;
   if(!pool)throw Error('The installed SDK attempted a non-owned test target');
   const body=JSON.parse(String(options.body)),queries=body.queries??[body],client=await pool.connect();
   try{await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');const results=[];for(const q of queries){const r=await client.query({text:q.query,values:q.params??[],rowMode:'array',types:{getTypeParser:()=>((x:string)=>x)}});results.push({command:r.command,rowCount:r.rowCount,fields:r.fields.map(f=>({name:f.name,dataTypeID:f.dataTypeID})),rows:r.rows,rowAsArray:true});}await client.query('COMMIT');return new Response(JSON.stringify(body.queries?{results}:results[0]),{status:200});}
   catch(error){await client.query('ROLLBACK');const e=error as {message:string;code:string};return new Response(JSON.stringify({message:e.message,code:e.code}),{status:400});}finally{client.release();}
  };
  for(const [slug,label] of [['alpha','Company A'],['beta','Company B']]){
   const db=await freshOnboardingDatabase(),id=randomUUID(),ref=randomUUID(),role='nv_app_'+randomBytes(6).toString('hex'),project='fictional-'+slug,origin='https://'+slug+'.portal.example.invalid',password=randomBytes(24).toString('hex');
   await db.pool.query('CREATE TABLE workspaces(id text PRIMARY KEY,singleton boolean NOT NULL UNIQUE DEFAULT true,active boolean NOT NULL DEFAULT true,name text NOT NULL);CREATE TABLE employees(id text PRIMARY KEY,label text NOT NULL)');
   await db.pool.query('INSERT INTO workspaces(id,name) VALUES($1,$2)',[id,label]);await db.pool.query('INSERT INTO employees VALUES($1,$2)',['EMP-1',label]);
   await db.pool.query(await readFile(resolve('db/migrations/0047_isolated_workspace_runtime.sql'),'utf8'));
   await db.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);
   await db.pool.query('INSERT INTO onboarding_workspace_identity(workspace_id,environment,incarnation,provider_project_id,lifecycle) VALUES($1,$2,1,$3,$4)',[id,'test',project,'ACTIVE']);await db.pool.query('INSERT INTO onboarding_runtime_roles(kind,login_role) VALUES($1,$2)',['APP',role]);
   await db.pool.query(`REVOKE CONNECT ON DATABASE ${db.name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${db.name} TO ${role}; GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT ON workspaces,onboarding_workspace_identity,onboarding_runtime_roles TO ${role}; GRANT UPDATE(lock_token) ON onboarding_workspace_identity TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON employees TO ${role}`);
   const uri='postgresql://'+role+':fictional@ep-'+slug+'.us-east-1.aws.neon.tech/fictional',url=new URL(db.connectionUrl);url.username=role;url.password=password;const pool=new Pool({connectionString:url.href,max:4});map.set(uri,pool);
   await control.pool.query(`INSERT INTO nevora_onboarding.workspace_registry(id,canonical_origin,environment,incarnation,revision,lifecycle,provider_project_id,app_secret_ref,app_role_name) VALUES($1,$2,'test',1,1,'ACTIVE',$3,$4,$5)`,[id,origin,project,ref,role]);
   await control.pool.query(`INSERT INTO nevora_onboarding.workspace_secrets(id,workspace_id,environment,incarnation,role_kind,login_role,ciphertext) VALUES($1,$2,'test',1,'APP',$3,$4)`,[ref,id,role,sealOnboardingValue(uri,'workspace-secret:test:'+id+':1:APP:'+ref,config.encryptionKey)]);
   const binding=await resolveWorkspaceBinding({origin},store,config);companies.push({id,ref,origin,role,project,uri,db,pool,binding});
  }
 });
 afterAll(async()=>{neonConfig.fetchFunction=originalFetch;for(const c of companies)await c.pool.end();for(const c of [...companies].reverse()){await c.db.close();await control.pool.query('DROP ROLE '+c.role);}await control?.close();vi.unstubAllEnvs();});
 it('returns different actual rows for identical employee IDs under simultaneous A/B traffic',async()=>{const read=async(c:typeof companies[number])=>(await getWorkspaceDb(c.binding).query<{label:string}>({text:'SELECT label FROM employees WHERE id=$1',values:['EMP-1']}))[0].label;const r=await Promise.all(Array.from({length:20},(_,i)=>read(companies[i%2])));expect(r.filter((x,i)=>x!==(i%2?'Company B':'Company A'))).toEqual([]);});
 it('keeps genuine SDK transaction writes in their selected business',async()=>{const [a,b]=companies;await getWorkspaceDb(a.binding).transaction([{text:'INSERT INTO employees VALUES($1,$2)',values:['EMP-2','Only A']}]);expect((await b.db.pool.query('SELECT count(*)::int n FROM employees WHERE id=$1',['EMP-2'])).rows[0].n).toBe(0);});
 it('routes existing application adapters through separate concurrent callback contexts without DATABASE_URL',async()=>{
  vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');expect(process.env.DATABASE_URL).toBeUndefined();
  const results=await Promise.all(companies.map(c=>withWorkspaceBinding(c.binding,async()=>{
   const raw=queryRows(await applicationSql().query('SELECT label FROM employees WHERE id=$1',['EMP-1']));
   const batch=await neonNotificationExecutor().transaction([{text:'SELECT label FROM employees WHERE id=$1',values:['EMP-1']}]);
   return [raw[0].label,(batch[0][0] as {label:string}).label];
  })));
  expect(results).toEqual([['Company A','Company A'],['Company B','Company B']]);
 });
 it('refuses an elevated runtime principal before its business statement executes',async()=>{
  const a=companies[0];await a.db.pool.query('ALTER ROLE '+a.role+' INHERIT');
  try{await expect(getWorkspaceDb(a.binding).query({text:'INSERT INTO employees VALUES($1,$2)',values:['FORBIDDEN','must never write']})).rejects.toThrow();}
  finally{await a.db.pool.query('ALTER ROLE '+a.role+' NOINHERIT');}
  expect((await a.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='FORBIDDEN'")).rows[0].n).toBe(0);
 });
 it('rejects runtime table ownership even when role flags are restricted',async()=>{
  const a=companies[0];await a.db.pool.query('ALTER TABLE employees OWNER TO '+a.role);
  try{await expect(getWorkspaceDb(a.binding).query({text:'SELECT label FROM employees',values:[]})).rejects.toThrow();}
  finally{await a.db.pool.query('ALTER TABLE employees OWNER TO CURRENT_USER');}
 });
 it('rolls back all business statements when the final company identity guard changes',async()=>{
  const a=companies[0];
  // Test-owned definer simulates an operator/restore identity change. Never deployed.
  await a.db.pool.query(`CREATE FUNCTION public.fixture_change_identity() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN UPDATE public.onboarding_workspace_identity SET incarnation=incarnation+1; RETURN 1; END $$; REVOKE ALL ON FUNCTION public.fixture_change_identity() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.fixture_change_identity() TO ${a.role}`);
  await expect(getWorkspaceDb(a.binding).transaction([{text:'INSERT INTO employees VALUES($1,$2)',values:['FINAL-GUARD','must roll back']},{text:'SELECT public.fixture_change_identity()',values:[]}])).rejects.toThrow();
  expect((await a.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='FINAL-GUARD'")).rows[0].n).toBe(0);
  expect((await a.db.pool.query('SELECT incarnation::text FROM onboarding_workspace_identity')).rows[0].incarnation).toBe('1');
 });
 it('rejects a suspended registry binding and never selects the other company',async()=>{const a=companies[0];await control.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[a.id]);await expect(getWorkspaceDb(a.binding).query({text:'SELECT label FROM employees',values:[]})).rejects.toThrow();await control.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='ACTIVE',revision=revision+1 WHERE id=$1",[a.id]);a.binding=await resolveWorkspaceBinding({origin:a.origin},store,config);});
 it('rolls back a business write when a later query fails',async()=>{const a=companies[0];await expect(getWorkspaceDb(a.binding).transaction([{text:'INSERT INTO employees VALUES($1,$2)',values:['ROLLBACK-1','must roll back']},{text:'SELECT 1/0',values:[]}])).rejects.toThrow();expect((await a.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='ROLLBACK-1'")).rows[0].n).toBe(0);});
 it('does not accept another actual company behind a miswired credential target',async()=>{const [a,b]=companies;map.set(a.uri,b.pool);await expect(getWorkspaceDb(a.binding).query({text:'SELECT label FROM employees WHERE id=$1',values:['EMP-1']})).rejects.toThrow();map.set(a.uri,a.pool);});
 it('rechecks workspace incarnation after a restore rather than reusing a stale transport binding',async()=>{const a=companies[0];await control.pool.query('UPDATE nevora_onboarding.workspace_registry SET incarnation=incarnation+1,revision=revision+1 WHERE id=$1',[a.id]);await expect(getWorkspaceDb(a.binding).query({text:'SELECT label FROM employees',values:[]})).rejects.toThrow();});
});
