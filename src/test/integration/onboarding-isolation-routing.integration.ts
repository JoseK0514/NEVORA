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
  finally{await a.db.pool.query('ALTER TABLE employees OWNER TO CURRENT_USER');await a.db.pool.query('GRANT SELECT,INSERT,UPDATE,DELETE ON employees TO '+a.role);}
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
 const tokenCases=(['isolated_app','isolated_worker','single_executor','single_application'] as const).flatMap(mode=>([['Pacific/Honolulu','SQL,DMY'],['Asia/Tokyo','German,DMY'],['America/Puerto_Rico','Postgres,MDY'],['UTC','ISO,MDY']] as const).map(([zone,style])=>[mode,zone,style] as const));
 it.each(tokenCases)('pins %s timestamp tokens under %s / %s pooled defaults',async(mode,zone,style)=>{
  const a=companies[0],originalPool=mode==='isolated_worker'?a.workerPool:a.pool,entry=[...map].find(([,pool])=>pool===originalPool);if(!entry)throw Error('Owned SDK map missing');
  const [uri]=entry,pool=new Pool({connectionString:originalPool.options.connectionString,options:'-c TimeZone='+zone+' -c DateStyle='+style+' -c default_transaction_isolation=serializable',max:2});map.set(uri,pool);
  try{
   const raw=(await pool.query("SELECT current_setting('TimeZone') AS zone,current_setting('DateStyle') AS style")).rows[0];expect(raw).toEqual({zone,style:style.replace(',',', ')});
   const text="SELECT timestamptz '2026-11-10 12:34:56.123456+00'::text AS token,current_setting('TimeZone') AS zone,current_setting('DateStyle') AS style,current_setting('transaction_isolation') AS isolation";
   let rows;
   if(mode.startsWith('isolated'))rows=await getWorkspaceDb(mode==='isolated_worker'?await resolveWorkspaceBinding({origin:a.origin},store,config,'WORKER'):a.binding).query({text,values:[]});
   else {vi.stubEnv('NEVORA_WORKSPACE_MODE','single_company');vi.stubEnv('DATABASE_URL',a.uri);rows=mode==='single_executor'?await neonNotificationExecutor().query({text,values:[]}):await applicationSql().query(text);}
   expect(rows).toEqual([{token:'2026-11-10 12:34:56.123456+00',zone:'UTC',style:'ISO, YMD',isolation:'read committed'}]);
   expect((await pool.query("SELECT current_setting('TimeZone') AS zone,current_setting('DateStyle') AS style")).rows[0]).toEqual(raw);
  }finally{map.set(uri,originalPool);await pool.end();vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('DATABASE_URL',undefined);}
 });
 it('rolls back a real business write when its body changes the SQL session contract',async()=>{
  const a=companies[0];
  await expect(getWorkspaceDb(a.binding).transaction([{text:'INSERT INTO employees VALUES($1,$2)',values:['SESSION-ROLLBACK','must roll back']},{text:"SELECT set_config('DateStyle','SQL, DMY',true)",values:[]}])).rejects.toThrow(/sql_session_contract_changed/);
  expect((await a.db.pool.query("SELECT count(*)::int AS n FROM employees WHERE id='SESSION-ROLLBACK'")).rows[0].n).toBe(0);
 });
 it('preserves microsecond token comparisons after a real row-lock wait and permits only one competing update',async()=>{
  const a=companies[0];await a.db.pool.query("CREATE TABLE timestamp_token_probe(id text PRIMARY KEY,updated_at timestamptz NOT NULL,revision integer NOT NULL);INSERT INTO timestamp_token_probe VALUES('same-row','2026-11-10 12:34:56.123456+00',1)");await a.db.pool.query('GRANT SELECT,UPDATE ON timestamp_token_probe TO '+a.role);
  const ex=getWorkspaceDb(a.binding),[original]=await ex.query<{token:string}>({text:"SELECT updated_at::text AS token FROM timestamp_token_probe WHERE id='same-row'",values:[]}),blocker=await a.db.pool.connect();let first:Promise<unknown[][]>|undefined,second:Promise<unknown[][]>|undefined;
  try{
   await blocker.query('BEGIN');await blocker.query("SELECT id FROM timestamp_token_probe WHERE id='same-row' FOR UPDATE");const update={text:"UPDATE timestamp_token_probe SET updated_at=updated_at+interval '1 microsecond',revision=revision+1 WHERE id='same-row' AND updated_at::text=$1 RETURNING updated_at::text AS token,revision",values:[original.token]};first=ex.transaction([update]);second=ex.transaction([update]);
   let waiting=false;const until=Date.now()+5000;while(Date.now()<until){const result=await a.db.pool.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'UPDATE timestamp_token_probe%'");if(result.rows[0].n===2){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,10));}expect(waiting).toBe(true);
   await blocker.query('COMMIT');const result=await Promise.all([first,second]);expect(result.map(rows=>rows[0].length).sort()).toEqual([0,1]);expect((await a.db.pool.query("SELECT revision,updated_at=timestamptz '2026-11-10 12:34:56.123457+00' AS exact FROM timestamp_token_probe")).rows).toEqual([{revision:2,exact:true}]);
  }finally{await blocker.query('ROLLBACK').catch(()=>{});blocker.release();await Promise.allSettled([first,second].filter((p):p is Promise<unknown[][]>=>!!p));}
 });
 it('retains one canonical timestamp receipt across an actual committed SDK response loss and exact-operation replay',async()=>{
  const a=companies[0];await a.db.pool.query('CREATE TABLE timestamp_token_receipts(operation_id text PRIMARY KEY,token text NOT NULL)');await a.db.pool.query('GRANT SELECT,INSERT ON timestamp_token_receipts TO '+a.role);
  const originalPool=map.get(a.uri)!,pools=[new Pool({connectionString:a.pool.options.connectionString,options:'-c TimeZone=Pacific/Honolulu -c DateStyle=SQL,DMY -c default_transaction_isolation=serializable',max:1}),new Pool({connectionString:a.pool.options.connectionString,options:'-c TimeZone=Asia/Tokyo -c DateStyle=German,DMY -c default_transaction_isolation=serializable',max:1})];map.set(a.uri,pools[0]);
  const {neonConfig}=await import('@neondatabase/serverless'),originalFetch=neonConfig.fetchFunction!;let lost=false;
  neonConfig.fetchFunction=async(url:unknown,options:RequestInit)=>{const response=await originalFetch(url,options);if(!lost&&String(options?.body).includes('INSERT INTO timestamp_token_receipts')){lost=true;throw Error('Fictional response lost after actual commit');}return response;};
  const ex=getWorkspaceDb(a.binding),operation='receipt-once',statements=[{text:"INSERT INTO timestamp_token_receipts(operation_id,token) VALUES($1,timestamptz '2026-11-10 12:34:56.123456+00'::text) ON CONFLICT(operation_id) DO NOTHING",values:[operation]},{text:'SELECT token FROM timestamp_token_receipts WHERE operation_id=$1',values:[operation]}];
  try{await expect(ex.transaction(statements)).rejects.toThrow(/Fictional response lost/);expect((await a.db.pool.query('SELECT count(*)::int AS n FROM timestamp_token_receipts')).rows[0].n).toBe(1);map.set(a.uri,pools[1]);expect((await ex.transaction(statements))[1]).toEqual([{token:'2026-11-10 12:34:56.123456+00'}]);expect((await a.db.pool.query('SELECT count(*)::int AS n FROM timestamp_token_receipts')).rows[0].n).toBe(1);}
  finally{neonConfig.fetchFunction=originalFetch;map.set(a.uri,originalPool);for(const pool of pools)await pool.end();}
 });
 it.each(['single_company','isolated'] as const)('keeps %s auth revocation independent from push cleanup failure through the actual SDK batch',async mode=>{
  const a=companies[0],{createHash}=await import('node:crypto'),{createLogoutDeps,terminatePortalSession}=await import('@/lib/notifications/logout'),{readNotificationConfig}=await import('@/lib/notifications/config'),{createInstallationProof,sealInstallationProof,INSTALLATION_COOKIE}=await import('@/lib/notifications/installation');
  await a.db.pool.query('CREATE TABLE IF NOT EXISTS employee_sessions(token_hash text PRIMARY KEY)');await a.db.pool.query('GRANT SELECT,DELETE ON employee_sessions TO '+a.role);const token='fictional-logout-'+mode,hash=createHash('sha256').update(token).digest('hex');await a.db.pool.query('INSERT INTO employee_sessions VALUES($1)',[hash]);
  const key=Buffer.alloc(32,19),proof=createInstallationProof('test'),values=new Map([['fuel_session',token],[INSTALLATION_COOKIE,sealInstallationProof(proof,key)]]),cookies={get:(name:string)=>values.has(name)?{value:values.get(name)!}:undefined,set:(name:string,value:string)=>{values.set(name,value);},delete:(name:string)=>{values.delete(name);}},configuration=readNotificationConfig({PUSH_ENVIRONMENT:'test',FUEL_PORTAL_ORIGIN:a.origin,PUSH_SUBSCRIPTION_ENCRYPTION_KEY:key.toString('base64url')});
  vi.stubEnv('NEVORA_WORKSPACE_MODE',mode);if(mode==='single_company')vi.stubEnv('DATABASE_URL',a.uri);
  const run=async()=>{const deps={...createLogoutDeps(configuration),subscriptions:()=>{throw Error('Fictional independent push cleanup outage');}};expect(await terminatePortalSession({sessionToken:token,installation:proof,cookies,deps})).toEqual({state:'pending'});};
  try{if(mode==='isolated')await withWorkspaceBinding(a.binding,run);else await run();expect(values.has('fuel_session')).toBe(false);expect((await a.db.pool.query('SELECT count(*)::int AS n FROM employee_sessions WHERE token_hash=$1',[hash])).rows[0].n).toBe(0);}
  finally{vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('DATABASE_URL',undefined);}
 });
 it('rechecks workspace incarnation after a restore rather than reusing a stale transport binding',async()=>{const a=companies[0];await control.pool.query('UPDATE nevora_onboarding.workspace_registry SET incarnation=incarnation+1,revision=revision+1 WHERE id=$1',[a.id]);await expect(getWorkspaceDb(a.binding).query({text:'SELECT label FROM employees',values:[]})).rejects.toThrow();});
});
