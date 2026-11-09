import{Pool}from'pg';
import{randomBytes}from'node:crypto';
import{configureCommerceControlReader}from'../../../services/hosted/neon/control-reader';
import{createControlStore}from'@/lib/onboarding/control-store.server';
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest';
import {ownedWorkspaceFixture,type OwnedCompany} from './onboarding-workspace-fixture';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {withWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {applicationSql} from '@/lib/data/app-sql';
import {neonNotificationExecutor} from '@/lib/data/sql-executor';
import {queryRows} from '@/lib/db';

describe('actual A/B PostgreSQL routing behind the installed Neon HTTP protocol',()=>{
 let fixture:Awaited<ReturnType<typeof ownedWorkspaceFixture>>,companies:OwnedCompany[],control:Awaited<ReturnType<typeof ownedWorkspaceFixture>>['control'],store:Awaited<ReturnType<typeof ownedWorkspaceFixture>>['store'],config:Awaited<ReturnType<typeof ownedWorkspaceFixture>>['config'],map:Awaited<ReturnType<typeof ownedWorkspaceFixture>>['map'];
 beforeAll(async()=>{fixture=await ownedWorkspaceFixture();({companies,control,store,config,map}=fixture);});
 afterAll(async()=>{await fixture?.close();vi.unstubAllEnvs();});
 it('limits the real commerce authority reader to current test APP custody and keeps A/B routing intact',async()=>{
  const role='nv_control_commerce_'+randomBytes(12).toString('hex'),password=randomBytes(24).toString('hex');
  await control.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);
  await control.pool.query(`GRANT CONNECT ON DATABASE ${control.name} TO ${role}`);await configureCommerceControlReader(control.pool,role);
  const target=new URL(control.connectionUrl);target.username=role;target.password=password;const reader=new Pool({connectionString:target.href,max:1});
  try{await expect(reader.query('SELECT ciphertext FROM nevora_onboarding.workspace_secrets')).rejects.toMatchObject({code:'42501'});
   expect((await reader.query("SELECT count(*)::int AS count FROM nevora_onboarding.commerce_app_workspace_secrets WHERE role_kind='WORKER' OR environment<>'test' OR NOT active")).rows[0].count).toBe(0);
   expect((await reader.query('SELECT count(*)::int AS count FROM nevora_onboarding.commerce_app_workspace_secrets')).rows[0].count).toBe(2);
   const machine={...config,tokenKey:undefined,secretScope:'COMMERCE_APP_ONLY' as const};
   for(const c of companies){const binding=await resolveWorkspaceBinding({origin:c.origin},createControlStore(reader),machine);expect((await getWorkspaceDb(binding).query<{label:string}>({text:'SELECT label FROM employees WHERE id=$1',values:['EMP-1']}))[0].label).toBe(c===companies[0]?'Company A':'Company B');}
  }finally{await reader.end();await control.pool.query('DROP OWNED BY '+role);await control.pool.query('DROP ROLE '+role);}
 });
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
