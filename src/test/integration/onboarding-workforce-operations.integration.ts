import {afterEach,expect,it,vi} from 'vitest';
import {randomUUID,randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import {configureWorkerControlReader,workerControlRole} from '@/lib/operations/routing-reader';
import {currentWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {readQueueHealth,assessQueueHealth} from '@/lib/operations/queue-health';
import {withWorkerWorkspace} from '@/lib/workspace-routing/worker.server';
import * as routing from '@/lib/workspace-routing/config.server';
import * as control from '@/lib/onboarding/control-store.server';
import {readFile} from 'node:fs/promises';
import {freshOnboardingControl} from './onboarding-fixture';
import {configureMonitorPrincipal,processMonitorObservation} from '@/lib/operations/monitor-store';
import {sendMonitorNotice,type MonitorConfig} from '@/lib/operations/monitor';
import {ownedSmtpLostAcknowledgement} from './owned-smtp-ack-fixture';
import {assertMachinePrincipal} from '@/lib/operations/principal-policy';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
it.each(['PUBLIC-function','named-relation','PUBLIC-relation','named-column','PUBLIC-column','catalog-grant-option','information-schema-write','information-schema-grant-option','information-schema-definer','information-schema-private-table','unregistered-catalog-function'] as const)('compares effective %s catalog access to the shipped PUBLIC baseline',async capability=>{
 const f=await freshOnboardingControl(),monitor='nv_ops_monitor_'+randomBytes(12).toString('hex'),worker=workerControlRole(randomUUID(),'test'),roles=[monitor,worker],pools:Pool[]=[];
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);
  for(const role of roles){const password=randomBytes(32).toString('base64url');await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);const u=new URL(f.connectionUrl);u.username=role;u.password=password;pools.push(new Pool({connectionString:u.href}));}
  const setup=await f.pool.connect();try{
   await configureMonitorPrincipal(setup,monitor);await configureWorkerControlReader(setup,worker);
   for(const pool of pools){expect((await pool.query("SELECT count(*)::int n FROM pg_catalog.pg_roles")).rows[0].n).toBeGreaterThan(0);expect((await pool.query('SELECT count(*)::int n FROM information_schema.columns')).rows[0].n).toBeGreaterThan(0);await expect(pool.query('SELECT rolpassword IS NOT NULL FROM pg_catalog.pg_authid')).rejects.toMatchObject({code:'42501'});}
   if(capability==='PUBLIC-function')await f.pool.query('GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_file(text) TO PUBLIC');
   else if(capability==='information-schema-definer')await f.pool.query("CREATE FUNCTION information_schema.fictional_private_read() RETURNS boolean LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog AS 'SELECT rolpassword IS NOT NULL FROM pg_catalog.pg_authid WHERE rolname=session_user'");
   else if(capability==='unregistered-catalog-function')await f.pool.query("CREATE FUNCTION pg_catalog.fictional_private_read() RETURNS boolean LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog AS 'SELECT rolpassword IS NOT NULL FROM pg_catalog.pg_authid WHERE rolname=session_user'");
   else if(capability==='information-schema-private-table'){await f.pool.query('CREATE TABLE information_schema.fictional_private AS SELECT rolpassword IS NOT NULL AS available FROM pg_catalog.pg_authid WHERE rolname=$1',[monitor]);await f.pool.query('GRANT SELECT ON information_schema.fictional_private TO PUBLIC');}
   else for(const grantee of capability.startsWith('PUBLIC')?['PUBLIC']:roles){
    if(capability.endsWith('relation'))await f.pool.query(`GRANT SELECT ON pg_catalog.pg_authid TO ${grantee}`);
    if(capability.endsWith('column'))await f.pool.query(`GRANT SELECT(rolname,rolpassword) ON pg_catalog.pg_authid TO ${grantee}`);
    if(capability==='catalog-grant-option')await f.pool.query(`GRANT SELECT ON pg_catalog.pg_roles TO ${grantee} WITH GRANT OPTION`);
    if(capability==='information-schema-write')await f.pool.query(`GRANT UPDATE ON information_schema.sql_features TO ${grantee}`);
    if(capability==='information-schema-grant-option')await f.pool.query(`GRANT SELECT ON information_schema.sql_features TO ${grantee} WITH GRANT OPTION`);
   }
   for(const pool of pools){
    if(capability==='PUBLIC-function')expect((await pool.query("SELECT pg_catalog.pg_read_file('PG_VERSION') AS version")).rows[0].version).toMatch(/^\d/);
    else if(capability==='information-schema-definer')expect((await pool.query('SELECT information_schema.fictional_private_read() AS available')).rows[0].available).toBe(true);
    else if(capability==='unregistered-catalog-function')expect((await pool.query('SELECT pg_catalog.fictional_private_read() AS available')).rows[0].available).toBe(true);
    else if(capability==='information-schema-private-table')expect((await pool.query('SELECT available FROM information_schema.fictional_private')).rows[0].available).toBe(true);
    else if(!capability.includes('grant-option')&&!capability.startsWith('information-schema'))expect((await pool.query('SELECT rolpassword IS NOT NULL AS available FROM pg_catalog.pg_authid WHERE rolname=current_user')).rows[0].available).toBe(true);
   }
   await expect(configureMonitorPrincipal(setup,monitor)).rejects.toThrow('monitor_principal_invalid');await expect(configureWorkerControlReader(setup,worker)).rejects.toThrow('operations_reader_scope_invalid');
   let sampled=false;await expect(processMonitorObservation(pools[0],monitor,async()=>{sampled=true;return 'ok';},false,async()=>'accepted')).rejects.toThrow('monitor_principal_invalid');expect(sampled).toBe(false);
  }finally{setup.release();}
 }finally{
  // Restore only these synthetic catalog grants before dropping the owned DB.
  await f.pool.query('REVOKE EXECUTE ON FUNCTION pg_catalog.pg_read_file(text) FROM PUBLIC').catch(()=>{});await f.pool.query('REVOKE SELECT ON pg_catalog.pg_authid FROM PUBLIC').catch(()=>{});await f.pool.query('REVOKE SELECT(rolname,rolpassword) ON pg_catalog.pg_authid FROM PUBLIC').catch(()=>{});
  for(const pool of pools)await pool.end();for(const role of roles){await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});}await f.close();
 }
});
it.each(['tablespace','parameter','routine','foreign-wrapper','foreign-server','grant-option'] as const)('rejects non-journal %s authority for both machine principals',async capability=>{
 const f=await freshOnboardingControl(),monitor='nv_ops_monitor_'+randomBytes(12).toString('hex'),worker=workerControlRole(randomUUID(),'test'),roles=[monitor,worker],pools:Pool[]=[];
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);
  for(const role of roles){const password=randomBytes(32).toString('base64url');await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);const u=new URL(f.connectionUrl);u.username=role;u.password=password;pools.push(new Pool({connectionString:u.href}));}
  const setup=await f.pool.connect();try{
   await configureMonitorPrincipal(setup,monitor);await configureWorkerControlReader(setup,worker);
   if(capability.startsWith('foreign'))await f.pool.query('CREATE FOREIGN DATA WRAPPER fictional_wrapper; CREATE SERVER fictional_server FOREIGN DATA WRAPPER fictional_wrapper');
   for(let i=0;i<2;i++){
    const role=roles[i];
    if(capability==='tablespace')await f.pool.query(`GRANT CREATE ON TABLESPACE pg_default TO ${role}`);
    if(capability==='parameter')await f.pool.query(`GRANT ALTER SYSTEM ON PARAMETER log_statement TO ${role}`);
    if(capability==='routine')await f.pool.query(`GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_file(text) TO ${role}`);
    if(capability==='foreign-wrapper')await f.pool.query(`GRANT USAGE ON FOREIGN DATA WRAPPER fictional_wrapper TO ${role}`);
    if(capability==='foreign-server')await f.pool.query(`GRANT USAGE ON FOREIGN SERVER fictional_server TO ${role}`);
    if(capability==='grant-option')await f.pool.query(`GRANT SELECT ON ${i?'nevora_onboarding.worker_workspace_registry':'nevora_operations.monitor_state'} TO ${role} WITH GRANT OPTION`);
   }
   // An explicit restricted C-function grant really reads this owned server's
   // benign version file; there is no external filesystem or network target.
   if(capability==='routine')for(const pool of pools)expect((await pool.query("SELECT pg_catalog.pg_read_file('PG_VERSION') AS version")).rows[0].version).toMatch(/^\d/);
   await expect(configureMonitorPrincipal(setup,monitor)).rejects.toThrow('monitor_principal_invalid');await expect(configureWorkerControlReader(setup,worker)).rejects.toThrow('operations_reader_scope_invalid');
   let sampled=false;await expect(processMonitorObservation(pools[0],monitor,async()=>{sampled=true;return 'ok';},false,async()=>'accepted')).rejects.toThrow('monitor_principal_invalid');expect(sampled).toBe(false);
  }finally{setup.release();}
 }finally{for(const pool of pools)await pool.end();for(const role of roles){await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});}await f.close();}
});
it('rejects deceptive schema names, sequences, PG17 maintenance and private large objects for both machine principals',async()=>{
 const f=await freshOnboardingControl(),monitor='nv_ops_monitor_'+randomBytes(12).toString('hex'),worker=workerControlRole(randomUUID(),'test'),roles=[monitor,worker],pools:Pool[]=[];
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);
  for(const role of roles){const password=randomBytes(32).toString('base64url');await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);const u=new URL(f.connectionUrl);u.username=role;u.password=password;pools.push(new Pool({connectionString:u.href}));}
  const setup=await f.pool.connect();
  try{
   const configure=[()=>configureMonitorPrincipal(setup,monitor),()=>configureWorkerControlReader(setup,worker)];
   await assertMachinePrincipal(setup,monitor,'monitor');await assertMachinePrincipal(setup,worker,'worker-reader');
   for(const c of configure)await c();
   await f.pool.query("CREATE SCHEMA pgxreview; CREATE TABLE pgxreview.restricted(s text); INSERT INTO pgxreview.restricted VALUES('fictional-private'); CREATE FUNCTION pgxreview.private_read() RETURNS text LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog AS 'SELECT s FROM pgxreview.restricted'; REVOKE EXECUTE ON FUNCTION pgxreview.private_read() FROM PUBLIC; CREATE SEQUENCE pgxreview.business_sequence");
   for(const role of roles)await f.pool.query(`GRANT USAGE ON SCHEMA pgxreview TO ${role}`);
   const deny=async()=>{for(let i=0;i<2;i++)await expect(configure[i]()).rejects.toThrow(i?'operations_reader_scope_invalid':'monitor_principal_invalid');let sampled=false;await expect(processMonitorObservation(pools[0],monitor,async()=>{sampled=true;return 'ok';},false,async()=>'accepted')).rejects.toThrow('monitor_principal_invalid');expect(sampled).toBe(false);};
   for(const role of roles)await f.pool.query(`GRANT EXECUTE ON FUNCTION pgxreview.private_read() TO ${role}`);await deny();for(const role of roles)await f.pool.query(`REVOKE EXECUTE ON FUNCTION pgxreview.private_read() FROM ${role}`);
   for(const privilege of ['USAGE','SELECT','UPDATE']){for(const role of roles)await f.pool.query(`GRANT ${privilege} ON SEQUENCE pgxreview.business_sequence TO ${role}`);await deny();for(const role of roles)await f.pool.query(`REVOKE ${privilege} ON SEQUENCE pgxreview.business_sequence FROM ${role}`);}
   const version=Number((await f.pool.query("SELECT current_setting('server_version_num') AS version")).rows[0].version);
   if(version>=170000){for(const role of roles)await f.pool.query(`GRANT MAINTAIN ON pgxreview.restricted TO ${role}`);await deny();for(const role of roles)await f.pool.query(`REVOKE MAINTAIN ON pgxreview.restricted FROM ${role}`);}
   const large=Number((await f.pool.query("SELECT lo_from_bytea(0,convert_to('fictional private object','utf8')) AS id")).rows[0].id);
   for(const privilege of ['SELECT','UPDATE']){for(const role of roles)await f.pool.query(`GRANT ${privilege} ON LARGE OBJECT ${large} TO ${role}`);await deny();for(const role of roles)await f.pool.query(`REVOKE ${privilege} ON LARGE OBJECT ${large} FROM ${role}`);}
   await f.pool.query(`ALTER LARGE OBJECT ${large} OWNER TO ${monitor}`);await expect(configure[0]()).rejects.toThrow('monitor_principal_invalid');await f.pool.query(`ALTER LARGE OBJECT ${large} OWNER TO ${worker}`);await expect(configure[1]()).rejects.toThrow('operations_reader_scope_invalid');await f.pool.query('SELECT lo_unlink($1)',[large]);
   for(const c of configure)await c();for(const pool of pools){await expect(pool.query('SELECT pgxreview.private_read()')).rejects.toMatchObject({code:'42501'});await expect(pool.query("SELECT setval('pgxreview.business_sequence',947)")).rejects.toMatchObject({code:'42501'});}
  }finally{setup.release();}
 }finally{for(const pool of pools)await pool.end();for(const role of roles){await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});}await f.close();}
});
it('refuses effective PUBLIC TEMP, schema/database CREATE and callable security-definer privilege before setup or observation',async()=>{
 const f=await freshOnboardingControl(),role='nv_ops_monitor_'+randomBytes(12).toString('hex');let pool:Pool|undefined;
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION`);
  const setup=await f.pool.connect();
  try{
   await expect(configureMonitorPrincipal(setup,role)).rejects.toThrow('monitor_principal_invalid');
   await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);
   await f.pool.query(`GRANT CREATE ON DATABASE ${f.name} TO ${role}`);await expect(configureMonitorPrincipal(setup,role)).rejects.toThrow('monitor_principal_invalid');await f.pool.query(`REVOKE CREATE ON DATABASE ${f.name} FROM ${role}`);
   await f.pool.query(`CREATE SCHEMA monitor_adversary; GRANT USAGE,CREATE ON SCHEMA monitor_adversary TO ${role}`);await expect(configureMonitorPrincipal(setup,role)).rejects.toThrow('monitor_principal_invalid');await f.pool.query(`REVOKE CREATE ON SCHEMA monitor_adversary FROM ${role}`);
   await f.pool.query("CREATE TABLE monitor_adversary.restricted(s text); INSERT INTO monitor_adversary.restricted VALUES('fictional-private'); CREATE FUNCTION monitor_adversary.private_read() RETURNS text LANGUAGE SQL SECURITY DEFINER SET search_path=pg_catalog AS 'SELECT s FROM monitor_adversary.restricted'");
   await expect(configureMonitorPrincipal(setup,role)).rejects.toThrow('monitor_principal_invalid');
   await f.pool.query('REVOKE EXECUTE ON FUNCTION monitor_adversary.private_read() FROM PUBLIC');await f.pool.query(`GRANT EXECUTE ON FUNCTION monitor_adversary.private_read() TO ${role}`);await expect(configureMonitorPrincipal(setup,role)).rejects.toThrow('monitor_principal_invalid');await f.pool.query(`REVOKE EXECUTE ON FUNCTION monitor_adversary.private_read() FROM ${role}`);
   await configureMonitorPrincipal(setup,role);
  }finally{setup.release();}
  // Real login proves the least-privileged positive, not SET ROLE on the owner.
  const password=randomBytes(32).toString('base64url');await f.pool.query(`ALTER ROLE ${role} PASSWORD '${password}'`);const u=new URL(f.connectionUrl);u.username=role;u.password=password;pool=new Pool({connectionString:u.href});
  expect((await pool.query("SELECT has_database_privilege(current_database(),'CREATE,TEMPORARY') AS db,has_schema_privilege('monitor_adversary','CREATE') AS schema")).rows[0]).toEqual({db:false,schema:false});await expect(pool.query('SELECT monitor_adversary.private_read()')).rejects.toMatchObject({code:'42501'});
  await f.pool.query(`GRANT CREATE ON SCHEMA monitor_adversary TO ${role}`);let sampled=false;
  await expect(processMonitorObservation(pool,role,async()=>{sampled=true;return 'ok';},false,async()=>'accepted')).rejects.toThrow('monitor_principal_invalid');expect(sampled).toBe(false);
 }finally{await pool?.end();await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});await f.close();}
});
it('owns observation before HTTP sampling so delayed healthy callbacks cannot manufacture recovery',async()=>{
 const f=await freshOnboardingControl(),role='nv_ops_monitor_'+randomBytes(12).toString('hex'),password=randomBytes(32).toString('base64url');let pool:Pool|undefined;
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC; CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);
  const setup=await f.pool.connect();try{await configureMonitorPrincipal(setup,role);}finally{setup.release();}const u=new URL(f.connectionUrl);u.username=role;u.password=password;pool=new Pool({connectionString:u.href,max:2});const sent:string[]=[];const send=async(kind:string)=>{sent.push(kind);return 'accepted' as const;};
  let release!:()=>void,started!:()=>void;const held=new Promise<void>(ok=>{release=ok;}),sampling=new Promise<void>(ok=>{started=ok;});
  const old=processMonitorObservation(pool,role,async()=>{started();await held;return 'ok';},true,send);
  // Let a missing callback API reject visibly instead of hanging the test.
  await Promise.race([sampling,old.then(()=>{throw Error('observation_did_not_sample');})]);
  let overlappingSample=false;
  try{expect(await processMonitorObservation(pool,role,async()=>{overlappingSample=true;return 'unhealthy';},true,send)).toEqual({state:'idle'});expect(overlappingSample).toBe(false);}finally{release();await old;}
  await processMonitorObservation(pool,role,async()=>'unhealthy',true,send);await processMonitorObservation(pool,role,async()=>'unhealthy',true,send);
  expect(sent).toEqual(['outage']);expect((await pool.query('SELECT condition FROM nevora_operations.monitor_state')).rows[0].condition).toBe('unhealthy');
 }finally{await pool?.end();await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});await f.close();}
});
it('captures full SMTP DATA then loses its ACK and never sends the same notice a second time',async()=>{
 const f=await freshOnboardingControl(),role='nv_ops_monitor_'+randomBytes(12).toString('hex'),password=randomBytes(32).toString('base64url'),sink=await ownedSmtpLostAcknowledgement();let pool:Pool|undefined;
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC; CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);
  const setup=await f.pool.connect();try{await configureMonitorPrincipal(setup,role);}finally{setup.release();}const u=new URL(f.connectionUrl);u.username=role;u.password=password;pool=new Pool({connectionString:u.href,max:1});
  const config:MonitorConfig={enabled:true,mailEnabled:true,origin:'https://fictional.onrender.com',sourceSha:'a'.repeat(40),healthKey:Buffer.alloc(32,1).toString('base64url'),expectedCommands:1,databaseUrl:u.href,role};
  const send=(kind:'outage'|'recovery')=>sendMonitorNotice(config,kind,sink.mail);
  await processMonitorObservation(pool,role,async()=>'unhealthy',true,send);expect(sink.bodies()).toBe(1);
  await f.pool.query("UPDATE nevora_operations.monitor_notices SET next_attempt_at=clock_timestamp()-interval '1 second'");await processMonitorObservation(pool,role,async()=>'unhealthy',true,send);
  expect(sink.bodies()).toBe(1);expect((await pool.query('SELECT status FROM nevora_operations.monitor_attempts')).rows).toEqual([{status:'unknown'}]);
 }finally{await sink.close();await pool?.end();await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});await f.close();}
});
it('deduplicates real concurrent incident mail and keeps ambiguous acknowledgement from being resent',async()=>{
 const f=await freshOnboardingControl(),role='nv_ops_monitor_'+randomBytes(12).toString('hex'),password=randomBytes(32).toString('base64url');let pool:Pool|undefined;
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);
  await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);await f.pool.query(`GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);
  const setup=await f.pool.connect();try{await configureMonitorPrincipal(setup,role);}finally{setup.release();}
  const url=new URL(f.connectionUrl);url.username=role;url.password=password;pool=new Pool({connectionString:url.href,max:4});
  await expect(pool.query('SELECT email_ciphertext FROM nevora_onboarding.registrations')).rejects.toMatchObject({code:'42501'});
  await expect(pool.query('SELECT * FROM nevora_onboarding.workspace_secrets')).rejects.toMatchObject({code:'42501'});
  await expect(pool.query("INSERT INTO nevora_operations.monitor_state(scope_key,condition) VALUES('nv_ops_monitor_000000000000000000000000','ok')")).rejects.toMatchObject({code:'42501'});
  let sends=0;
  const send=async()=>{sends++;await new Promise(r=>setTimeout(r,30));return 'accepted' as const;};
  await Promise.all(Array.from({length:4},()=>processMonitorObservation(pool!,role,async()=>'unhealthy',true,send)));
  expect(sends).toBe(1);await processMonitorObservation(pool,role,async()=>'unhealthy',true,send);expect(sends).toBe(1);
  expect((await pool.query('SELECT status FROM nevora_operations.monitor_notices')).rows).toEqual([{status:'accepted'}]);
  await processMonitorObservation(pool,role,async()=>'ok',true,send);await processMonitorObservation(pool,role,async()=>'ok',true,send);expect(sends).toBe(2);
  await processMonitorObservation(pool,role,async()=>'unavailable',true,async()=>{sends++;return 'unknown';});
  await processMonitorObservation(pool,role,async()=>'unavailable',true,send);expect(sends).toBe(3);
  expect((await pool.query("SELECT count(*)::int n FROM nevora_operations.monitor_attempts WHERE status='unknown'")).rows[0].n).toBe(1);
  // A crashed sender committed its intent before losing its SMTP outcome.
  await f.pool.query("UPDATE nevora_operations.monitor_notices SET status='sending' WHERE scope_key=$1 AND status='unknown'",[role]);
  await processMonitorObservation(pool,role,async()=>'unavailable',true,send);expect(sends).toBe(3);expect((await pool.query("SELECT status FROM nevora_operations.monitor_notices WHERE kind='outage' ORDER BY created_at DESC LIMIT 1")).rows[0].status).toBe('unknown');
 }finally{await pool?.end();await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});await f.close();}
});
it('bounds definite mail retries and daily attempts, records disabled monitoring without sending, and respects principal isolation',async()=>{
 const f=await freshOnboardingControl(),role='nv_ops_monitor_'+randomBytes(12).toString('hex'),password=randomBytes(32).toString('base64url');let pool:Pool|undefined;
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);await f.pool.query(`GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);
  const setup=await f.pool.connect();try{await configureMonitorPrincipal(setup,role);}finally{setup.release();}
  const url=new URL(f.connectionUrl);url.username=role;url.password=password;pool=new Pool({connectionString:url.href,max:2});let sends=0;const failure=async()=>{sends++;return 'definite_failure' as const;};
  await processMonitorObservation(pool,role,async()=>'unhealthy',false,failure);expect(sends).toBe(0);
  await processMonitorObservation(pool,role,async()=>'unhealthy',true,failure);await processMonitorObservation(pool,role,async()=>'unhealthy',true,failure);expect(sends).toBe(1);
  for(let i=0;i<5;i++){await f.pool.query("UPDATE nevora_operations.monitor_notices SET next_attempt_at=clock_timestamp()-interval '1 second'");await processMonitorObservation(pool,role,async()=>'unhealthy',true,failure);}
  expect(sends).toBe(3);expect((await pool.query('SELECT count(*)::int n FROM nevora_operations.monitor_attempts')).rows[0].n).toBe(3);
  await processMonitorObservation(pool,role,async()=>'ok',true,async()=>{sends++;return 'accepted';});expect(sends).toBe(4);
  await processMonitorObservation(pool,role,async()=>'unhealthy',true,failure);expect(sends).toBe(4);
  await expect(pool.query("UPDATE nevora_operations.monitor_state SET scope_key='nv_ops_monitor_000000000000000000000000'")).rejects.toMatchObject({code:'42501'});
  const broad=await f.pool.connect();try{await f.pool.query('GRANT SELECT ON nevora_onboarding.workspace_secrets TO '+role);await expect(configureMonitorPrincipal(broad,role)).rejects.toThrow('monitor_principal_invalid');}finally{broad.release();}
 }finally{await pool?.end();await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});await f.close();}
});
it('retains a real committed SMTP intent when the journal connection dies after sending, without replaying it',async()=>{
 const f=await freshOnboardingControl(),role='nv_ops_monitor_'+randomBytes(12).toString('hex'),password=randomBytes(32).toString('base64url');let pool:Pool|undefined;
 try{
  await f.pool.query(await readFile('db/control-migrations/0006_workforce_monitor.sql','utf8'));await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);await f.pool.query(`GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);
  const setup=await f.pool.connect();try{await configureMonitorPrincipal(setup,role);}finally{setup.release();}
  const url=new URL(f.connectionUrl);url.username=role;url.password=password;pool=new Pool({connectionString:url.href,max:1,application_name:'owned-monitor-lost-ack'});let sends=0;
  await expect(processMonitorObservation(pool,role,async()=>'unhealthy',true,async()=>{sends++;await f.pool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename=$1 AND datname=$2 AND application_name='owned-monitor-lost-ack'",[role,f.name]);return 'accepted';})).rejects.toThrow();
  expect((await f.pool.query('SELECT status FROM nevora_operations.monitor_notices')).rows).toEqual([{status:'sending'}]);
  await processMonitorObservation(pool,role,async()=>'unhealthy',true,async()=>{sends++;return 'accepted';});expect(sends).toBe(1);
  expect((await f.pool.query('SELECT status FROM nevora_operations.monitor_notices')).rows).toEqual([{status:'unknown'}]);
 }finally{await pool?.end();await f.pool.query('DROP OWNED BY '+role).catch(()=>{});await f.pool.query('DROP ROLE '+role).catch(()=>{});await f.close();}
});
const queues=`SELECT jsonb_build_object('payroll',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM payroll_jobs t),'notifications',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM notifications t),'deliveries',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM push_deliveries t),'subscriptions',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM push_subscriptions t)) AS snapshot`;
it('observes real due/future/failed/leased queues under restricted WORKER without writes or cross-company data',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),b=await f.activateCompany(await f.createCompany('beta','b@example.invalid'));vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
  const db=a.c.resource.db.pool,workspaceId=a.c.row.workspace_id;
  for(const [status,delay,lease] of [['PENDING','-5 minutes',null],['PENDING','1 hour',null],['FAILED','-5 minutes',null],['RUNNING','-5 minutes','-2 minutes'],['RUNNING','-5 minutes','1 minute']] as const)await db.query("INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,status,payload,available_at,lease_token,lease_until) VALUES($1::uuid,$2,'REMINDER',$1::text,$3,'{}',clock_timestamp()+$4::interval,$5,CASE WHEN $6::text IS NULL THEN NULL ELSE clock_timestamp()+$6::interval END)",[randomUUID(),workspaceId,status,delay,lease?randomUUID():null,lease]);
  await db.query("INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status) VALUES('owned-sub','OWNER-1','owned-installation','test','owned-endpoint','fictional-private-material','owned-generation',$1,'active')",[a.actor.sessionTokenHash]);
  async function notice(id:string,state='pending',due='-5 minutes',expires='1 hour',environment='test'){
   await db.query("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state,cancelled_at) VALUES($1,'OWNER-1','SELF_TEST','Fictional','Fictional',$1,$2,'SELF_TEST',$1,'1','1','TEST',clock_timestamp()+$3::interval,clock_timestamp()+$4::interval,'normal',$5,CASE WHEN $5='cancelled' THEN clock_timestamp() END)",[id,environment,due,expires,state]);
  }
  await notice('due');await notice('future','pending','1 hour','2 hours');await notice('expired','pending','-1 hour','-1 minute');await notice('cancelled','cancelled');await notice('other-environment','pending','-5 minutes','1 hour','production');
  for(const [id,status,next,lease] of [['retry','retry_pending','-5 minutes',null],['expired-lease','processing','-5 minutes','-2 minutes'],['failed','failed','-5 minutes',null],['future-delivery','queued','1 hour',null]] as const){
   await notice(id,'materialized','-5 minutes','2 hours');await db.query("INSERT INTO push_deliveries(notification_id,subscription_id,generation,status,attempt_count,next_attempt_at,expires_at,lease_token,lease_expires_at) VALUES($1,'owned-sub','owned-generation',$2,1,clock_timestamp()+$3::interval,clock_timestamp()+interval '2 hours',$4,CASE WHEN $5::text IS NULL THEN NULL ELSE clock_timestamp()+$5::interval END)",[id,status,next,lease?'owned-lease':null,lease]);
  }
  const before=(await db.query(queues)).rows;
  const binding=await resolveWorkspaceBinding({origin:a.c.origin},f.store,f.routing,'WORKER'),ex=getWorkspaceDb(binding);
  expect((await ex.query<{role:string}>({text:'SELECT current_user AS role',values:[]}))[0].role).toBe(a.c.resource.identity.workerRole);
  const health=await readQueueHealth(ex,'test');expect(health).toMatchObject({workspaceId,payroll:{due:2,failed:1,expiredLeases:1},notifications:{dueIntents:1,dueDeliveries:2,failed:1,expiredLeases:1}});
  expect(health.payroll.oldestDueSeconds).toBeGreaterThanOrEqual(300);expect(health.payroll.oldestDueSeconds).toBeLessThan(600);expect(health.notifications.oldestDueSeconds).toBeGreaterThanOrEqual(300);expect(assessQueueHealth(health,120).healthy).toBe(false);
  const other=await readQueueHealth(getWorkspaceDb(await resolveWorkspaceBinding({origin:b.c.origin},f.store,f.routing,'WORKER')),'test');expect(other).toMatchObject({workspaceId:b.c.row.workspace_id,payroll:{due:0,failed:0,expiredLeases:0,oldestDueSeconds:0},notifications:{dueIntents:0,dueDeliveries:0,failed:0,expiredLeases:0,oldestDueSeconds:0}});expect(assessQueueHealth(other,120)).toEqual({healthy:true,reasons:[]});
  expect((await db.query(queues)).rows).toEqual(before);expect(JSON.stringify(health)).not.toMatch(/fictional-private-material|OWNER-1|owned-lease|password|session/);
  // The schema permits this stranded state, but health must never call it empty.
  const malformed=randomUUID();await db.query("INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,status,payload,available_at,lease_token,lease_until) VALUES($1::uuid,$2,'REMINDER',$1::text,'RUNNING','{}',clock_timestamp()-interval '1 hour',NULL,NULL)",[malformed,workspaceId]);
  const malformedBefore=(await db.query(queues)).rows;await expect(readQueueHealth(ex,'test')).rejects.toThrow('operations_health_unavailable');expect((await db.query(queues)).rows).toEqual(malformedBefore);await db.query('DELETE FROM payroll_jobs WHERE id=$1',[malformed]);
  await expect(ex.query({text:'SELECT password_hash FROM employee_credentials',values:[]})).rejects.toMatchObject({code:'42501'});
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[workspaceId]);await expect(readQueueHealth(ex,'test')).rejects.toThrow('operations_health_unavailable');expect((await db.query(queues)).rows).toEqual(before);
 }finally{await f.close();}
});
it('uses actual company-scoped WORKER-only control custody without any browser key and rejects broad/mismatched readers',async()=>{
 const f=await onboardingJourneyFixture();const readers:Pool[]=[],roles:string[]=[];try{
  await f.db.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.db.name} FROM PUBLIC`);
  const a=await f.activateCompany(await f.createCompany()),b=await f.activateCompany(await f.createCompany('beta','b@example.invalid'));vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
  async function reader(environment:'test'|'production'){
   const role=workerControlRole(a.c.row.workspace_id,environment),password=randomBytes(32).toString('base64url');roles.push(role);
   await f.db.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);await f.db.pool.query(`GRANT CONNECT ON DATABASE ${f.db.name} TO ${role}`);
   const client=await f.db.pool.connect();try{await configureWorkerControlReader(client,role);}finally{client.release();}
   const url=new URL(f.db.connectionUrl);url.username=role;url.password=password;const pool=new Pool({connectionString:url.href,max:2});readers.push(pool);return {role,pool,url:url.href,store:control.createControlStore(pool)};
  }
  const r=await reader('test');
  await f.db.pool.query("ALTER TABLE nevora_onboarding.workspace_registry ADD COLUMN future_private_metadata text DEFAULT 'fictional-do-not-project'");
  const rerun=await f.db.pool.connect();try{await configureWorkerControlReader(rerun,r.role);}finally{rerun.release();}
  expect((await r.pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='nevora_onboarding' AND table_name='worker_workspace_registry' ORDER BY ordinal_position")).rows.map(x=>x.column_name)).toEqual([
   'id','registration_id','canonical_origin','environment','incarnation','revision','lifecycle','provider_project_id','app_secret_ref','app_role_name','worker_secret_ref','worker_role_name','created_at',
  ]);
  for(const table of ['workspace_secrets','workspace_registry'])await expect(r.pool.query('SELECT * FROM nevora_onboarding.'+table)).rejects.toMatchObject({code:'42501'});
  expect((await r.pool.query('SELECT workspace_id::text,role_kind FROM nevora_onboarding.worker_workspace_secrets')).rows).toEqual([{workspace_id:a.c.row.workspace_id,role_kind:'WORKER'}]);
  expect((await r.pool.query('SELECT id::text FROM nevora_onboarding.worker_workspace_registry')).rows).toEqual([{id:a.c.row.workspace_id}]);
  const machine=routing.readWorkerRoutingConfig({NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:f.config.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:r.url,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:f.config.encryptionKey});expect(machine).not.toHaveProperty('tokenKey');
  await expect(resolveWorkspaceBinding({origin:b.c.origin},r.store,machine,'WORKER')).rejects.toThrow();for(const purpose of ['APP','BOOTSTRAP'] as const)await expect(resolveWorkspaceBinding({origin:a.c.origin},r.store,machine,purpose)).rejects.toThrow();
  vi.spyOn(routing,'readWorkerRoutingConfig').mockReturnValue(machine);vi.spyOn(control,'runtimeControlStore').mockReturnValue(r.store);
  const work=vi.fn(async()=>readQueueHealth(getWorkspaceDb(await currentWorkspaceBinding()),'test'));
  const expected={workspaceId:a.c.row.workspace_id,environment:'test' as const};expect(await withWorkerWorkspace(a.c.origin,work,expected)).toMatchObject({workspaceId:a.c.row.workspace_id});
  await expect(withWorkerWorkspace(a.c.origin,work,{...expected,workspaceId:b.c.row.workspace_id})).rejects.toThrow();await expect(withWorkerWorkspace(a.c.origin,work,{...expected,environment:'production'})).rejects.toThrow();expect(work).toHaveBeenCalledTimes(1);
  const prod=await reader('production');expect((await prod.pool.query('SELECT * FROM nevora_onboarding.worker_workspace_secrets')).rows).toEqual([]);expect((await r.pool.query('SELECT count(*)::int n FROM nevora_onboarding.worker_workspace_secrets')).rows[0].n).toBe(1);
  // Effective column privileges are distinct from whole-table privileges.
  const setup=await f.db.pool.connect();try{
   await f.db.pool.query('GRANT SELECT(ciphertext) ON nevora_onboarding.workspace_secrets TO '+r.role);
   const foreign=(await f.db.pool.query("SELECT ciphertext FROM nevora_onboarding.workspace_secrets WHERE workspace_id=$1 AND role_kind='APP'",[b.c.row.workspace_id])).rows[0];
   expect((await r.pool.query('SELECT ciphertext FROM nevora_onboarding.workspace_secrets')).rows).toContainEqual(foreign);
   await expect(configureWorkerControlReader(setup,r.role)).rejects.toThrow('operations_reader_scope_invalid');
   await f.db.pool.query('REVOKE SELECT(ciphertext) ON nevora_onboarding.workspace_secrets FROM '+r.role);
   for(const [privilege,column] of [['UPDATE','ciphertext'],['INSERT','ciphertext'],['REFERENCES','id']] as const){
    await f.db.pool.query(`GRANT ${privilege}(${column}) ON nevora_onboarding.worker_workspace_secrets TO ${r.role}`);
    await expect(configureWorkerControlReader(setup,r.role)).rejects.toThrow('operations_reader_scope_invalid');
    await f.db.pool.query(`REVOKE ${privilege}(${column}) ON nevora_onboarding.worker_workspace_secrets FROM ${r.role}`);
   }
   await configureWorkerControlReader(setup,r.role);
  }finally{setup.release();}
  await f.db.pool.query('ALTER ROLE '+r.role+' INHERIT');const elevated=await f.db.pool.connect();try{await expect(configureWorkerControlReader(elevated,r.role)).rejects.toThrow('operations_reader_scope_invalid');}finally{elevated.release();await f.db.pool.query('ALTER ROLE '+r.role+' NOINHERIT');}
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[a.c.row.workspace_id]);expect((await r.pool.query('SELECT * FROM nevora_onboarding.worker_workspace_secrets')).rows).toEqual([]);await expect(withWorkerWorkspace(a.c.origin,work,expected)).rejects.toThrow();
 }finally{for(const pool of readers)await pool.end();for(const role of roles){await f.db.pool.query('DROP OWNED BY '+role);await f.db.pool.query('DROP ROLE '+role);}await f.close();}
});
