import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';
// Keep prior byte custody checks while allowing only the reviewed marked additions.
function beforePortalDependencyInsertions(text: string): string {
  for (const name of ['PORTAL_SOURCE_DEPENDENCY_ADMISSION', 'PORTAL_SOURCE_DEPENDENCY_CTES']) {
    const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
    if (!text.includes(start) && !text.includes(end)) continue;
    expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
    const after = text.indexOf(end) + end.length;
    expect(text.slice(after, after + 1)).toBe('\n');
    text = text.slice(0, text.indexOf(start)) + text.slice(after + 1);
  }
  return text;
}

const portalDependencyCurrentPins: Record<string, string> = {
  "audited-role-guard.sql": "ba0b4617d66892ad350e42221e9ad1dc27b406c35d5103b9eba28b08ea6a02e0",
  "audited-role-guard-installer.sql": "cfbe111978adc37a1ce0025ce843fb37e7e43b71f568c3dd01c68b126c23f7d5",
  "original-runtime-login.sql": "0993c3ba476cc8dab6d80ee2e0287ba9d18072b3dab99aee8bcab23814c4e6b8",
  "original-runtime-login-installer.sql": "a63f71569af622928d879c1b6759440a42f20f9f599efd24eb80bfb2e1be584f"
};
function expectFrozenSql(text: string, name: string, historicalPin: string): void {
  expect(hash(beforePortalDependencyInsertions(text))).toBe(historicalPin);
  expect(hash(text)).toBe(portalDependencyCurrentPins[name] ?? historicalPin);
}
const folder = resolve('src/lib/tenancy/runtime');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const control = readFileSync(join(folder,'control-storage.sql'),'utf8');
const capability = readFileSync(join(folder,'audited-helper-storage.sql'),'utf8');
const specifications = [
  { id: 'HI-R', name: 'role-guard', helper: 'assert_runtime_role', controls: ['runtime_role_binding'], sourceSHA256: '1af5a6c342391d30af27c46a0880810deba3d2778fbe5fefecc09b5a836432b1', fragmentSHA256: '7c0ce83b99d401aac9a31db391cb750b676a22bf3c76e440194de986299bbd6a' },
  { id: 'HI-A', name: 'audited-role-guard', helper: 'assert_audited_runtime_role', controls: ['runtime_role_binding','audited_helper_capability'], sourceSHA256: '9f8fd73c7a0f2711aaac38836377d9a1ca6e0b504ab899c32c6558a2366b6f99', fragmentSHA256: '28ce7c57e59426c12437fb4c14ded3e48c074ff67c9051ac36ae3e180c83443f' },
].map(spec => ({ ...spec, source: readFileSync(join(folder,spec.name+'-installer.sql'),'utf8'), fragment: readFileSync(join(folder,spec.name+'.sql'),'utf8') }));
type Specification = typeof specifications[number];
const leasePath = process.env.F_HI_OWNED_LEASE, runPath = process.env.F_HI_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string; login: boolean };
type OwnObject = { kind: 'schema' | 'table' | 'function'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; dropped: boolean };

// HOLD without exact root lease+run directory. Empty fictional base only; no
// startup/discovery/ambient URL. Source reads do not authenticate an installer.
// No audited capability seeds, resolver/definer fixture or business data.
describe.skipIf(!leasePath && !runPath)('owned PG18 fresh-only role helper installers', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, installer: Client;
  let appRole: Role, workerRole: Role, outsiderRole: Role;
  let password = '', installerOid = '', verified = false, runVerified = false, setupCommitted = false, sqlAttempted = false;
  let originalStorageCatalog: ReturnType<typeof canonicalAcl>;
  const clients = new Set<Client>(), closedClients = new Set<Client>();
  const objects: OwnObject[] = [], roles: Role[] = [], records: unknown[] = [];
  const repairs = new Set<string>(), pendingFenceAttempts = new Set<Promise<unknown>>();
  const sqlstate = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN';
  };
  async function query(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { return await client.query(text, values); }
    catch (error) { throw Error('owned_helper_installer_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    records.push(value);
    appendFileSync(join(runPath!, 'helper-installers-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_helper_installer_connection_failed'); }
    await query(client, 'SET search_path=pg_catalog');
    expect(client.getTransactionStatus()).toBe('I'); return client;
  }
  async function identity(client: Client, name: string, oid: string) {
    const native = (await query(client, `SELECT pg_catalog.pg_backend_pid() pid,session_user::text session,
      current_user::text current_role,pg_catalog.current_setting('role') role,
      (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid`)).rows[0];
    expect(native).toMatchObject({ session: name, current_role: name, role: 'none', original_oid: oid }); return native;
  }
  async function checkBase() {
    const native = (await query(admin, `SELECT current_database() db,
      (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) oid,
      pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database') marker,
      pg_catalog.current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,
      session_user::text role,current_user::text current_role,pg_catalog.host(pg_catalog.inet_server_addr()) host,
      pg_catalog.inet_server_port() port,pg_catalog.current_setting('server_version') version,
      pg_catalog.current_setting('server_encoding') encoding`)).rows[0];
    expect(native).toMatchObject({ db: lease.database, oid: String(lease.databaseOid), marker: lease.marker,
      data: lease.data, system_id: lease.systemIdentifier, role: lease.user, current_role: lease.user,
      host: '127.0.0.1', port: lease.port, encoding: 'UTF8' });
    expect(native.version).toMatch(/^18\.4(?:\s|$)/); expect(admin.getTransactionStatus()).toBe('I'); return native;
  }
  async function role(name: string, login: boolean) {
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    record({ operation: 'BEFORE_EXACT_FICTIONAL_ROLE_CREATE', name, login });
    await query(admin, 'CREATE ROLE ' + q(name) + (login ? ' LOGIN' : ' NOLOGIN') +
      ' NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT' +
      (login ? ' PASSWORD ' + literal(password) : ''));
    const result: Role = { name, login, oid: (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(result); record({ operation: 'EXACT_FICTIONAL_ROLE_CREATED', ...result }); return result;
  }
  async function remember(kind: OwnObject['kind'], namespace: string, name: string, signature?: string) {
    const found = kind === 'schema'
      ? (await query(admin,'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1',[name])).rows[0]
      : kind === 'function'
        ? (await query(admin,'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)',[q(namespace)+'.'+q(name)+signature])).rows[0]
        : (await query(admin,'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)',[q(namespace)+'.'+q(name)])).rows[0];
    expect(found).toEqual({ oid: expect.stringMatching(/^[0-9]+$/), owner: installerOid });
    const result: OwnObject = { kind,schema:namespace,name,oid:found.oid as string,ownerOid:installerOid,...(signature?{signature}:{}),dropped:false };
    objects.push(result);record({operation:'EXACT_OWN_OBJECT_OBSERVED',...result});return result;
  }
  async function dropObject(object: OwnObject) {
    const found=object.kind==='schema'
      ?(await query(admin,'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1',[object.name])).rows[0]
      :object.kind==='function'
        ?(await query(admin,'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)',[q(object.schema)+'.'+q(object.name)+object.signature])).rows[0]
        :(await query(admin,'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)',[q(object.schema)+'.'+q(object.name)])).rows[0];
    expect(found).toEqual({oid:object.oid,owner:object.ownerOid});
    const target=object.kind==='schema'?q(object.name):q(object.schema)+'.'+q(object.name)+(object.signature??'');
    await query(admin,'DROP '+object.kind.toUpperCase()+' '+target);
    const relation=object.kind==='schema'?'pg_namespace':object.kind==='function'?'pg_proc':'pg_class';
    expect((await query(admin,'SELECT oid FROM pg_catalog.'+relation+' WHERE oid=$1::oid',[object.oid])).rows).toEqual([]);
    object.dropped=true;record({operation:'EXACT_OWN_OBJECT_DROPPED',...object});
  }
  async function catalog() {
    const condition = "n.nspname='nevora_tenancy'";
    const schemas = (await query(admin, `SELECT oid::text oid,nspname,nspowner::text owner,nspacl::text acl FROM pg_catalog.pg_namespace
      WHERE nspname='nevora_tenancy' ORDER BY oid`)).rows;
    const relations = (await query(admin, `SELECT c.oid::text oid,n.nspname,c.relname,c.relowner::text owner,c.relkind,c.relpersistence,
      c.relrowsecurity,c.relforcerowsecurity,c.reloptions,c.relacl::text acl FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid`)).rows;
    const columns = (await query(admin, `SELECT c.oid::text relation_oid,a.attnum,a.attname,a.atttypid::text type_oid,a.atttypmod,
      a.attnotnull,a.atthasdef,a.attidentity,a.attgenerated,a.attcollation::text collation_oid,a.attndims,a.attacl::text acl,pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_source
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE ${condition} AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.oid,a.attnum`)).rows;
    const constraints = (await query(admin, `SELECT c.oid::text relation_oid,co.oid::text oid,co.conname,co.contype::text contype,co.conkey,
      co.confrelid::text parent_oid,co.confkey,co.confupdtype::text update_action,co.confdeltype::text delete_action,
      co.convalidated,co.conenforced,co.condeferrable,co.condeferred,co.conindid::text index_oid,pg_catalog.pg_get_constraintdef(co.oid,false) definition
      FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE ${condition} ORDER BY c.oid,co.oid`)).rows;
    const indexes = (await query(admin, `SELECT c.oid::text relation_oid,i.indexrelid::text oid,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indislive,i.indimmediate,i.indkey::text keys,i.indclass::text opclasses,i.indcollation::text collations,i.indoption::text options,
      (SELECT idx.reloptions FROM pg_catalog.pg_class idx WHERE idx.oid=i.indexrelid) reloptions,pg_catalog.pg_get_expr(i.indpred,i.indrelid) predicate,pg_catalog.pg_get_expr(i.indexprs,i.indrelid) expressions,
      pg_catalog.pg_get_indexdef(i.indexrelid) definition FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid,i.indexrelid`)).rows;
    const functions = (await query(admin, `SELECT p.oid::text oid,p.proname,p.proowner::text owner,p.prosecdef,p.proconfig,p.prorettype::text return_oid,
      p.proargtypes::text arg_oids,p.proretset,p.provolatile,p.prosrc,l.lanname,p.proacl::text acl,pg_catalog.pg_get_functiondef(p.oid) definition
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang
      WHERE n.nspname='nevora_tenancy' ORDER BY p.oid`)).rows;
    const triggers = (await query(admin, `SELECT c.oid::text relation_oid,t.oid::text oid,t.tgname,t.tgfoid::text function_oid,
      t.tgtype,t.tgenabled,t.tgisinternal,t.tgconstraint::text constraint_oid,t.tgdeferrable,t.tginitdeferred,
      pg_catalog.pg_get_triggerdef(t.oid,false) definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid,t.oid`)).rows;
    const policies = (await query(admin, `SELECT c.oid::text relation_oid,p.oid::text oid,p.polname,p.polcmd::text command,p.polroles,p.polpermissive,
      pg_catalog.pg_get_expr(p.polqual,p.polrelid) using_source,pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid) check_source
      FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE ${condition} ORDER BY p.oid`)).rows;
    const expandedAcls = (await query(admin, `SELECT 'SCHEMA' kind,n.oid::text oid,a.grantor::text grantor,a.grantee::text grantee,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) a WHERE n.nspname='nevora_tenancy'
      UNION ALL SELECT 'TABLE',c.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) a WHERE ${condition}
      UNION ALL SELECT 'FUNCTION',p.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL pg_catalog.aclexplode(p.proacl) a
      WHERE n.nspname='nevora_tenancy' ORDER BY kind,oid,grantee,privilege_type`)).rows;
    const columnAcls=(await query(admin,`SELECT a.attrelid::text relation_oid,a.attnum,x.grantor::text grantor,x.grantee::text grantee,x.privilege_type,x.is_grantable
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) x WHERE n.nspname='nevora_tenancy' AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY a.attrelid,a.attnum,x.grantee,x.privilege_type,x.grantor`)).rows;
    return { schemas, relations, columns, constraints, indexes, functions, triggers, policies, expandedAcls,columnAcls };
  }
  function canonicalAcl(value: Awaited<ReturnType<typeof catalog>>) {
    return { ...value, columns:value.columns.map(row=>({...row,acl:value.columnAcls.filter(x=>x.relation_oid===row.relation_oid&&x.attnum===row.attnum)})),schemas: value.schemas.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'SCHEMA' && x.oid === row.oid) })),
      relations: value.relations.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'TABLE' && x.oid === row.oid) })),
      functions: value.functions.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'FUNCTION' && x.oid === row.oid) })) };
  }
  function controlProjection(value:ReturnType<typeof canonicalAcl>){return {...value,functions:[],expandedAcls:value.expandedAcls.filter(x=>x.kind!=='FUNCTION')};}
  async function storageRows() {
    return { binding:(await query(admin,`SELECT kind,role_name::text role_name,role_oid::text role_oid,pg_settings_oid::text pg_settings_oid,
      pg_settings_definition,pg_settings_rules,pg_catalog.array_dims(pg_settings_rules) rules_dimensions
      FROM nevora_tenancy.runtime_role_binding ORDER BY kind COLLATE pg_catalog."C"`)).rows,
      capability:(await query(admin,'SELECT * FROM nevora_tenancy.audited_helper_capability ORDER BY runtime_kind,route_kind,function_oid,route_oid')).rows };
  }
  async function assertEmpty() { expect(await storageRows()).toEqual({binding:[],capability:[]}); }
  async function poll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_helper_installer_observation_timeout_' + label);
  }
  function keyTuple(pid: number, mode: string, granted: boolean) {
    const bits = BigInt('0x' + hash('nevora.runtime.catalog-fence.v1:' + String(lease.databaseOid)).slice(0, 16));
    return { database: String(lease.databaseOid), classid: (bits >> BigInt(32)).toString(),
      objid: (bits & BigInt('4294967295')).toString(), objsubid: 1, pid, mode, granted };
  }
  async function locks(pids: number[]) {
    return (await query(admin, `SELECT database::text database,classid::text classid,objid::text objid,objsubid,pid,mode,granted
      FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=ANY($1::int4[]) ORDER BY pid,mode`, [pids])).rows;
  }
  async function finishRejected(client: Client, code: string, expectedCode: string) {
    const pid = (client as Client & { processID: number }).processID;
    const immediateClientStatus = client.getTransactionStatus();
    await poll(async () => (await query(admin, 'SELECT state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid])).rows[0]?.state === 'idle in transaction (aborted)' && client.getTransactionStatus() === 'E', 'aborted_' + expectedCode);
    const native = (await query(admin, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid])).rows[0];
    const failedQuery = await rejected(client, 'SELECT 1');
    record({ operation: 'EXACT_NATIVE_FAILED_BLOCK', code, expectedCode, immediateClientStatus, native, synchronizedClientStatus: client.getTransactionStatus(), failedQuery });
    try { expect(code).toBe(expectedCode); expect(failedQuery).toBe('25P02'); expect(client.getTransactionStatus()).toBe('E'); }
    finally { await query(client, 'ROLLBACK'); }
    expect(client.getTransactionStatus()).toBe('I'); expect(await locks([pid])).toEqual([]);
  }
  async function installReject(spec:Specification,expected:string) {
    const before=await catalog();const code=await rejected(installer,spec.source);
    await finishRejected(installer,code,expected);expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));
    return code;
  }
  async function wholeFence(spec:Specification) {
    const reader=await identity(app,appRole.name,appRole.oid),original=await identity(installer,lease.user,installerOid);
    const before=await catalog();const originalDefault=(await query(installer,'SHOW default_transaction_isolation')).rows[0].default_transaction_isolation as string;
    const undo='ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user);let pending:Promise<{code:string}>|undefined;
    try{
      await query(installer,"SET default_transaction_isolation='repeatable read'");
      await query(app,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(app,RUNTIME_CATALOG_SHARED_FENCE_SQL.text,[...RUNTIME_CATALOG_SHARED_FENCE_SQL.values]);
      pending=installer.query(spec.source).then(()=>({code:'NO_ERROR'}),error=>({code:sqlstate(error)}));pendingFenceAttempts.add(pending);
      await poll(async()=>(await locks([original.pid as number,reader.pid as number])).some(x=>x.pid===original.pid&&x.mode==='ExclusiveLock'&&!x.granted),'whole_installer_wait');
      const lockRows=await locks([original.pid as number,reader.pid as number]);
      const activity=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[original.pid])).rows[0];
      const relationLocks=(await query(admin,`SELECT c.oid::text oid,n.nspname,c.relname,l.mode,l.granted FROM pg_catalog.pg_locks l
        JOIN pg_catalog.pg_class c ON c.oid=l.relation JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE l.pid=$1 AND l.locktype='relation' ORDER BY c.oid,l.mode`,[original.pid])).rows;
      record({caseId:spec.id+'04',phase:'WHOLE_ARTIFACT_BLOCKED',lockRows,activity,relationLocks,original,reader});
      expect(lockRows).toContainEqual(keyTuple(reader.pid as number,'ShareLock',true));expect(lockRows).toContainEqual(keyTuple(original.pid as number,'ExclusiveLock',false));
      expect(activity).toMatchObject({state:'active',wait_event_type:'Lock',wait_event:'advisory'});expect(activity.blockers).toContain(reader.pid);
      expect(relationLocks.filter(x=>x.nspname==='nevora_tenancy'||['pg_namespace','pg_class','pg_attribute','pg_constraint','pg_index','pg_authid'].includes(x.relname))).toEqual([]);
      repairs.add(undo);await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));
      record({caseId:spec.id+'04',phase:'DELIBERATE_NONCOOPERATING_OWN_SCHEMA_OWNER_DELTA',before,changed:await catalog()});
      await query(app,'COMMIT');const outcome=await pending;pendingFenceAttempts.delete(pending);
      await finishRejected(installer,outcome.code,'42501');
    }finally{
      if(['T','E'].includes(app.getTransactionStatus()??''))await query(app,'ROLLBACK');
      if(pending&&pendingFenceAttempts.has(pending)){await pending;pendingFenceAttempts.delete(pending);}
      if(['T','E'].includes(installer.getTransactionStatus()??''))await query(installer,'ROLLBACK');
      if(repairs.has(undo)){await query(admin,undo);repairs.delete(undo);}
      await query(installer,"SELECT pg_catalog.set_config('default_transaction_isolation',$1,false)",[originalDefault]);
      expect((await query(installer,'SHOW default_transaction_isolation')).rows).toEqual([{default_transaction_isolation:originalDefault}]);
      expect(await identity(installer,lease.user,installerOid)).toEqual(original);expect(await identity(app,appRole.name,appRole.oid)).toEqual(reader);
      expect(await locks([original.pid as number,reader.pid as number])).toEqual([]);expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));
    }
  }
  function fragmentFor(name:string){
    const artifact=name==='runtime_role_binding'?control:capability;
    const matches=artifact.match(new RegExp('CREATE TABLE nevora_tenancy\\.'+name+' \\([\\s\\S]*?\\n\\);','g'));
    expect(matches).toHaveLength(1);return matches![0];
  }
  async function substituteControl(spec:Specification,name:string,variant:string){
    const before=await catalog(),rows=await storageRows();const original=objects.find(x=>x.kind==='table'&&x.name===name&&!x.dropped)!;
    const shadow=lease.invocation+'_'+name+'_shadow';
    expect((await query(admin,'SELECT pg_catalog.to_regclass($1)::oid::text oid',['nevora_tenancy.'+q(shadow)])).rows).toEqual([{oid:null}]);
    const undo='ALTER TABLE nevora_tenancy.'+q(shadow)+' RENAME TO '+q(name);repairs.add(undo);let bad:OwnObject|undefined;
    const originalIndexes=before.indexes.filter(x=>x.relation_oid===original.oid).map(index=>({...index,name:before.relations.find(x=>x.oid===index.oid)!.relname as string}));
    const indexRepairs:{undo:string,oid:string,shadow:string,name:string}[]=[];
    try{
      await query(admin,'ALTER TABLE nevora_tenancy.'+q(name)+' RENAME TO '+q(shadow));
      expect((await query(admin,'SELECT pg_catalog.to_regclass($1)::oid::text oid',['nevora_tenancy.'+q(shadow)])).rows).toEqual([{oid:original.oid}]);
      for(const index of originalIndexes){
        const alias=lease.invocation.slice(0,20)+'_i_'+index.oid+'_shadow';
        expect((await query(admin,'SELECT pg_catalog.to_regclass($1)::oid::text oid',['nevora_tenancy.'+q(alias)])).rows).toEqual([{oid:null}]);
        expect((await query(admin,'SELECT c.oid::text oid,c.relowner::text owner,i.indrelid::text table_oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_index i ON i.indexrelid=c.oid WHERE c.oid=pg_catalog.to_regclass($1)',['nevora_tenancy.'+q(index.name)])).rows).toEqual([{oid:index.oid,owner:installerOid,table_oid:original.oid}]);
        const restoreIndex='ALTER INDEX nevora_tenancy.'+q(alias)+' RENAME TO '+q(index.name);repairs.add(restoreIndex);
        await query(admin,'ALTER INDEX nevora_tenancy.'+q(index.name)+' RENAME TO '+q(alias));
        indexRepairs.push({undo:restoreIndex,oid:index.oid,shadow:alias,name:index.name});
        record({operation:'EXACT_ORIGINAL_BACKING_INDEX_TEMPORARY_NAME',originalIndex:index,alias,tableOid:original.oid,after:await catalog()});
      }
      let fragment=fragmentFor(name);
      if(variant==='PK')fragment=name==='runtime_role_binding'?fragment.replace('kind pg_catalog.text PRIMARY KEY CHECK','kind pg_catalog.text NOT NULL CHECK'):fragment.replace('  PRIMARY KEY(runtime_kind,route_kind,function_oid,route_oid),\n','');
      if(variant==='U')fragment=fragment.replace('role_name pg_catalog.name UNIQUE NOT NULL','role_name pg_catalog.name NOT NULL');
      if(variant==='C')fragment=name==='runtime_role_binding'?fragment.replace("CHECK(kind IN ('APP','WORKER'))","CHECK(kind IN ('APP','WORKER','OTHER'))"):fragment.replace("IN ('APP','WORKER'))","IN ('APP','WORKER','OTHER'))");
      await query(admin,fragment);bad=await remember('table','nevora_tenancy',name);
      await query(admin,'REVOKE ALL ON TABLE nevora_tenancy.'+q(name)+' FROM PUBLIC');
      if(variant==='BACKING'){
        const exact=(await query(admin,'SELECT c.oid::text oid,c.relowner::text owner,i.indrelid::text table_oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_index i ON i.indexrelid=c.oid WHERE c.oid=pg_catalog.to_regclass($1)',['nevora_tenancy.'+q(name+'_pkey')])).rows[0];
        expect(exact).toMatchObject({oid:expect.stringMatching(/^[0-9]+$/),owner:installerOid,table_oid:bad.oid});
        expect(originalIndexes.map(x=>x.oid)).not.toContain(exact.oid);
        await query(admin,'ALTER INDEX nevora_tenancy.'+q(name+'_pkey')+' SET (fillfactor=70)');
      }
      const malformed=await catalog();const constraintRows=malformed.constraints.filter(x=>x.relation_oid===bad!.oid);
      const indexRows=malformed.indexes.filter(x=>x.relation_oid===bad!.oid);
      record({caseId:spec.id+'02',name,variant,original,bad,fragment,malformed,constraintRows,indexRows});
      if(variant==='BACKING')expect(indexRows.find(x=>x.indisprimary)).toMatchObject({indisvalid:true,indisready:true,indislive:true,indimmediate:true,reloptions:['fillfactor=70']});
      await installReject(spec,'55000');
    }finally{if(bad)await dropObject(bad);await query(admin,undo);repairs.delete(undo);
      for(const entry of [...indexRepairs].reverse()){
        expect((await query(admin,'SELECT c.oid::text oid,c.relowner::text owner,i.indrelid::text table_oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_index i ON i.indexrelid=c.oid WHERE c.oid=pg_catalog.to_regclass($1)',['nevora_tenancy.'+q(entry.shadow)])).rows).toEqual([{oid:entry.oid,owner:installerOid,table_oid:original.oid}]);
        await query(admin,entry.undo);repairs.delete(entry.undo);
      }
    }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));expect(await storageRows()).toEqual(rows);
  }
  async function defaults(){return(await query(admin,`SELECT d.oid::text oid,d.defaclrole::text owner,d.defaclnamespace::text namespace_oid,d.defaclobjtype::text kind,d.defaclacl::text acl,
    ARRAY(SELECT pg_catalog.row_to_json(a)::text FROM pg_catalog.aclexplode(d.defaclacl) a ORDER BY a.grantee,a.privilege_type,a.grantor,a.is_grantable) native_expanded
    FROM pg_catalog.pg_default_acl d ORDER BY d.oid`)).rows;}
  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true); expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid = process.getuid?.(); expect(uid !== undefined).toBe(true);
    const mode = lstatSync(leasePath!); expect(mode.isFile() && !mode.isSymbolicLink()).toBe(true); expect(mode.uid).toBe(uid); expect(mode.mode & 0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(uid); runVerified = true;
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false); expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.marker).toBe('f10-owned:' + lease.invocation); expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:runtime-role:' + lease.invocation);
    expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true); expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data')); expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credential = lstatSync(lease.credentialFile); expect(credential.isFile() && !credential.isSymbolicLink()).toBe(true); expect(credential.uid).toBe(uid); expect(credential.mode & 0o777).toBe(0o600);
    expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile); expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    for(const spec of specifications){expectFrozenSql(spec.source, spec.name+'-installer.sql', spec.sourceSHA256);expectFrozenSql(spec.fragment, spec.name+'.sql', spec.fragmentSHA256);
      expect(spec.source.split(spec.fragment.replace('CREATE OR REPLACE FUNCTION','CREATE FUNCTION'))).toHaveLength(2);}
    expect(hash(control)).toBe('4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66');
    expect(hash(capability)).toBe('2a7d8c979e5e854ddd0e516a07ce20eed15365efcfb1c21812ffffe9e31d9603');
    expect(hash(readFileSync(join(folder,'catalog-fence.server.ts')))).toBe('2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f');
    password=readFileSync(lease.credentialFile,'utf8');expect(password.length>0).toBe(true);
    admin=await connect(lease.user);const base=await checkBase();installerOid=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[lease.user])).rows[0].oid as string;
    expect((await query(admin,'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid',[String(lease.databaseOid)])).rows).toEqual([{owner:installerOid}]);
    expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
    verified=true;record({operation:'EXACT_ROOT_BASE_VERIFIED',base,sources:specifications.map(spec=>({name:spec.name,sourceSHA256:hash(spec.source),fragmentSHA256:hash(spec.fragment)}))});
    await query(admin,'BEGIN');try{
      appRole=await role(lease.invocation+'_app',true);workerRole=await role(lease.invocation+'_worker',true);outsiderRole=await role(lease.invocation+'_outsider',true);
      await query(admin,'REVOKE CREATE,TEMPORARY ON DATABASE '+q(lease.database)+' FROM PUBLIC');await query(admin,'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin,'GRANT CONNECT ON DATABASE '+q(lease.database)+' TO '+roles.map(x=>q(x.name)).join(','));
      await query(admin,'CREATE SCHEMA nevora_tenancy');await remember('schema','','nevora_tenancy');await query(admin,'COMMIT');setupCommitted=true;
    }catch(error){if(['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');throw error;}
    await query(admin,control);await remember('table','nevora_tenancy','runtime_role_binding');
    await query(admin,capability);await remember('table','nevora_tenancy','audited_helper_capability');
    originalStorageCatalog=canonicalAcl(await catalog());await assertEmpty();
    app=await connect(appRole.name);worker=await connect(workerRole.name);outsider=await connect(outsiderRole.name);installer=await connect(lease.user);
    writeFileSync(join(runPath!,'helper-installers-fixture-custody.json'),JSON.stringify({base,roles,objects,catalog:await catalog(),rows:await storageRows(),sourceScope:'EXACT_EXISTING_STORAGE_TWO_NEW_HELPER_INSTALLERS_ONLY_NO_CAPABILITY_OR_AUTHORITY_SEEDS'},null,2),{flag:'wx',mode:0o600});
  },30000);

  for(const spec of specifications){
    it(spec.id+'01 missing or foreign-owned schema denies without replacing private storage',async()=>{
      const before=await catalog(),shadow=lease.invocation+'_schema_shadow';
      expect((await query(admin,'SELECT oid FROM pg_catalog.pg_namespace WHERE nspname=$1',[shadow])).rows).toEqual([]);
      const restoreName='ALTER SCHEMA '+q(shadow)+' RENAME TO nevora_tenancy';repairs.add(restoreName);
      try{await query(admin,'ALTER SCHEMA nevora_tenancy RENAME TO '+q(shadow));await installReject(spec,'3F000');}finally{await query(admin,restoreName);repairs.delete(restoreName);}
      const restoreOwner='ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user);repairs.add(restoreOwner);
      try{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));await installReject(spec,'42501');}finally{await query(admin,restoreOwner);repairs.delete(restoreOwner);}
      expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await assertEmpty();
    });
    it(spec.id+'02 exact malformed PK U C or backing index refuses native lookalike controls and restores original OIDs',async()=>{
      for(const name of spec.controls){for(const variant of name==='runtime_role_binding'?['PK','U','C','BACKING']:['PK','C','BACKING'])await substituteControl(spec,name,variant);}
      await assertEmpty();
    });
    it(spec.id+'03 rejects named schema table and column control grants without silently repairing them',async()=>{
      const before=await catalog();
      const mutations=[['GRANT USAGE ON SCHEMA nevora_tenancy TO ','REVOKE USAGE ON SCHEMA nevora_tenancy FROM '],
        ...spec.controls.flatMap(name=>[['GRANT SELECT ON nevora_tenancy.'+q(name)+' TO ','REVOKE SELECT ON nevora_tenancy.'+q(name)+' FROM '],
        ['GRANT SELECT('+q(name==='runtime_role_binding'?'kind':'runtime_kind')+') ON nevora_tenancy.'+q(name)+' TO ','REVOKE SELECT('+q(name==='runtime_role_binding'?'kind':'runtime_kind')+') ON nevora_tenancy.'+q(name)+' FROM ']])];
      for(const[grant,revoke]of mutations){const undo=revoke+q(outsiderRole.name);repairs.add(undo);try{await query(admin,grant+q(outsiderRole.name));const changed=await catalog();
        await installReject(spec,'55000');record({caseId:spec.id+'03',changed,afterDenied:await catalog()});}finally{await query(admin,undo);repairs.delete(undo);}}
      expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await assertEmpty();
    });
    it(spec.id+'04 entire frozen artifact waits first then sees owner drift fresh under repeatable-read session default',async()=>{await wholeFence(spec);await assertEmpty();});
    it(spec.id+'05 rejects any same-name overload without replacing its source or original controls',async()=>{
      const before=await catalog();let overload:OwnObject|undefined;
      try{await query(admin,'CREATE FUNCTION nevora_tenancy.'+q(spec.helper)+'(integer) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS '+literal('SELECT true'));
        overload=await remember('function','nevora_tenancy',spec.helper,'(integer)');const retained=await catalog();await installReject(spec,'42723');expect(await catalog()).toEqual(retained);
        record({caseId:spec.id+'05',overload,retained,after:await catalog()});}finally{if(overload)await dropObject(overload);}
      expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await assertEmpty();
    });
    it(spec.id+'06 named default function EXECUTE causes atomic private-ACL rejection with exact native default restoration',async()=>{
      const before=await catalog(),beforeDefaults=await defaults();expect(beforeDefaults).toEqual([]);
      const undo='ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy REVOKE EXECUTE ON FUNCTIONS FROM '+q(outsiderRole.name);repairs.add(undo);
      try{await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy GRANT EXECUTE ON FUNCTIONS TO '+q(outsiderRole.name));const nativeDefaults=await defaults();expect(nativeDefaults).toHaveLength(1);
        await installReject(spec,'55000');record({caseId:spec.id+'06',beforeDefaults,nativeDefaults,after:await catalog()});}
      finally{await query(admin,undo);repairs.delete(undo);}
      expect(await defaults()).toEqual(beforeDefaults);expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await assertEmpty();
    });
    it(spec.id+'07 whole fresh artifact commits exact byte-preserved invoker body empty storage and no grants then duplicate denies',async()=>{
      const before=await catalog();const batch=await query(installer,spec.source);
      expect(Array.isArray(batch)).toBe(true);if(!Array.isArray(batch))throw Error('owned_helper_installer_multistatement_result_required');
      record({caseId:spec.id+'07',wholeArtifact:true,commands:batch.map(x=>x.command),rows:batch.map(x=>x.rows)});
      expect(batch).toHaveLength(8);expect(batch[0].command).toBe('BEGIN');expect(batch[1]).toMatchObject({command:'SELECT',rows:[{catalog_fence:''}]});expect(batch.at(-1).command).toBe('COMMIT');
      const owned=await remember('function','nevora_tenancy',spec.helper,'(text)');const after=await catalog(),native=after.functions.find(x=>x.oid===owned.oid)!;
      const body=spec.fragment.split('$role_guard$');expect(body).toHaveLength(3);
      expect(native).toMatchObject({owner:installerOid,prosecdef:false,provolatile:'v',proconfig:['search_path=pg_catalog'],return_oid:'16',arg_oids:'25',proretset:false,lanname:'sql',prosrc:body[1]});
      expect(after.expandedAcls.filter(x=>x.kind==='FUNCTION'&&x.oid===owned.oid&&x.grantee!==installerOid)).toEqual([]);
      expect(after.schemas).toEqual(before.schemas);expect(after.relations).toEqual(before.relations);expect(after.columns).toEqual(before.columns);expect(after.constraints).toEqual(before.constraints);expect(after.indexes).toEqual(before.indexes);expect(after.triggers).toEqual(before.triggers);expect(after.policies).toEqual([]);
      for(const role of roles){expect((await query(admin,'SELECT pg_catalog.has_function_privilege($1,$2::oid,\'EXECUTE\') allowed',[role.name,owned.oid])).rows).toEqual([{allowed:false}]);}
      await assertEmpty();await installReject(spec,'42723');expect(await catalog()).toEqual(after);
      record({caseId:spec.id+'07',owned,before,after,nativeBodySHA256:hash(native.prosrc as string),originalBodySHA256:hash(body[1]),storageEmpty:true,noRuntimeAuthority:true});
    });
    it(spec.id+'08 only explicit fictional native binding and minimum reader grants exercise unchanged direct helper compatibility',async()=>{
      const before=await catalog();await assertEmpty();const grantees=[appRole,workerRole].map(x=>q(x.name)).join(',');
      const settings=(await query(admin,`SELECT 'pg_catalog.pg_settings'::regclass::oid::text oid,pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::regclass,false) definition,
        ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite w WHERE w.ev_class='pg_catalog.pg_settings'::regclass ORDER BY w.rulename COLLATE pg_catalog."C") rules`)).rows[0];
      const undo='fixture-minimum-read-grants-and-bindings-'+spec.helper;repairs.add(undo);
      try{
        await query(admin,'BEGIN');await query(admin,`INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules)
          VALUES('APP',$1,$2::oid,$5::oid,$6,$7::text[]),('WORKER',$3,$4::oid,$5::oid,$6,$7::text[])`,[appRole.name,appRole.oid,workerRole.name,workerRole.oid,settings.oid,settings.definition,settings.rules]);
        await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+grantees);for(const name of spec.controls)await query(admin,'GRANT SELECT ON nevora_tenancy.'+q(name)+' TO '+grantees);
        await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.'+q(spec.helper)+'(text) TO '+grantees);await query(admin,'COMMIT');
        const observations=[];
        for(const[role,client,kind]of[[appRole,app,'APP'],[workerRole,worker,'WORKER']]as const){const original=await identity(client,role.name,role.oid);
          for(const request of[kind,kind==='APP'?'WORKER':'APP',null,'UNKNOWN']){const result=(await query(client,'SELECT nevora_tenancy.'+q(spec.helper)+'($1::text) allowed',[request])).rows;observations.push({role,request,result});expect(result).toEqual([{allowed:request===kind}]);}
          expect(await identity(client,role.name,role.oid)).toEqual(original);
        }
        expect(await rejected(outsider,'SELECT nevora_tenancy.'+q(spec.helper)+"('APP')")).toBe('42501');
        record({caseId:spec.id+'08',settings,bindings:await storageRows(),observations,claim:'EXPLICIT_ROOT_FICTIONAL_ROLE_SETTINGS_BINDINGS_ONLY_NO_DOMAIN_CURRENT_PROOF_AUDITED_CAPABILITY_SEEDS_OR_CALLER_AUTHORITY'});
      }finally{
        if(['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');
        await query(admin,'BEGIN');await query(admin,'DELETE FROM nevora_tenancy.runtime_role_binding');
        await query(admin,'REVOKE EXECUTE ON FUNCTION nevora_tenancy.'+q(spec.helper)+'(text) FROM '+grantees);
        for(const name of spec.controls)await query(admin,'REVOKE SELECT ON nevora_tenancy.'+q(name)+' FROM '+grantees);
        await query(admin,'REVOKE USAGE ON SCHEMA nevora_tenancy FROM '+grantees);await query(admin,'COMMIT');repairs.delete(undo);
      }
      const after=await catalog();expect(canonicalAcl(after)).toEqual(canonicalAcl(before));await assertEmpty();record({caseId:spec.id+'08',before,after,fullNativeAclAuthorityRestored:true});
    });
  }
  afterAll(async()=>{
    let cleaned=false;const closure:{client:string;status:string|null;closed:boolean}[]=[];
    try{
      if(app&&['T','E'].includes(app.getTransactionStatus()??''))await query(app,'ROLLBACK');
      if(admin&&['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');
      for(const pending of pendingFenceAttempts){await pending;pendingFenceAttempts.delete(pending);}
      for(const client of clients)if(client!==admin){const status=client.getTransactionStatus()??null;if(['T','E'].includes(status??''))await query(client,'ROLLBACK');await client.end();closedClients.add(client);closure.push({client:'OWN_FIXTURE_CLIENT',status,closed:true});}
      if(verified&&admin){await query(admin,'RESET ROLE');await checkBase();
        for(const undo of repairs){if(undo.startsWith('fixture-'))throw Error('owned_helper_installer_explicit_grant_repair_pending');await query(admin,undo);repairs.delete(undo);}
        if(setupCommitted){await assertEmpty();const finalCatalog=await catalog();expect(controlProjection(canonicalAcl(finalCatalog))).toEqual(controlProjection(originalStorageCatalog));
          record({operation:'FINAL_NATIVE_SOURCE_BEFORE_EXACT_DROP',catalog:finalCatalog,rows:await storageRows(),originalStorageCatalog,objects});}
        for(const object of[...objects].reverse())if(!object.dropped)await dropObject(object);
        for(const role of[...roles].reverse()){const native=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[role.name])).rows[0];if(!native&&!setupCommitted)continue;expect(native).toEqual({oid:role.oid});
          await query(admin,'REVOKE CONNECT ON DATABASE '+q(lease.database)+' FROM '+q(role.name));await query(admin,'DROP ROLE '+q(role.name));expect((await query(admin,'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2',[role.oid,role.name])).rows).toEqual([]);record({operation:'EXACT_FICTIONAL_ROLE_DROPPED',...role});}
        expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);cleaned=true;
      }
    }finally{
      for(const client of clients)if(!closedClients.has(client)){const status=client.getTransactionStatus()??null;try{await client.end();closedClients.add(client);closure.push({client:client===admin?'ADMIN':'OWN_FIXTURE_CLIENT',status,closed:true});}catch{closure.push({client:client===admin?'ADMIN':'OWN_FIXTURE_CLIENT',status,closed:false});}}
      password='';if(runVerified)writeFileSync(join(runPath!,'helper-installers-cleanup.json'),JSON.stringify({verified,setupCommitted,cleaned,roles,objects,records,closure,
        connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,extraInstallerFenceClients:installer?1:0,pendingRepairs:repairs.size,pendingFenceAttempts:pendingFenceAttempts.size,actualSQLAttempted:sqlAttempted,
        sourcePins:specifications.map(spec=>({name:spec.name,sourceSHA256:hash(spec.source),fragmentSHA256:hash(spec.fragment)})),
        claim:'LOCAL_NATIVE_INSTALLER_WIRING_AND_PRESERVED_LITERAL_COMPATIBILITY_NOT_SEMANTIC_APPROVAL_CURRENT_PROOF_RLS_NEON_OR_FULL_F10',rootOnlyDatabaseAndPostmasterCleanup:true},null,2),{flag:'wx',mode:0o600});
    }
  },60000);
});
