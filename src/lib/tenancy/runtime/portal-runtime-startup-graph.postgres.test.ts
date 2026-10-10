import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { verifyCompleteNativeJsonl } from '../../../test/evidence/complete-native-jsonl';
import { Client } from 'pg';
import { appendFileSync, existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_PSG_OWNED_LEASE, runPath = process.env.F_PSG_RUN_DIR;
const graphPath = process.env.F_PSG_GRAPH_SOURCE;
const graphSHA256 = '199958c03b1116c2425147889dcf99ae1ef586df0c26f410888a669735553a79';
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string; root: string; data: string;
  pid: number; pidStart: string; port: number; systemIdentifier: string; database: string; databaseOid: string | number;
  marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string };
type ObjectReceipt = { kind: 'schema' | 'table' | 'sequence' | 'function' | 'trigger' | 'policy'; schema: string;
  name: string; oid: string; ownerOid: string; signature?: string; dropped: boolean; relation?: string };
type Settings = { oid: string; definition: string; rules: string[] };
const sourcePins: Readonly<Record<string, string>> = {
  "control-storage.sql": "4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66",
  "audited-helper-storage.sql": "2a7d8c979e5e854ddd0e516a07ce20eed15365efcfb1c21812ffffe9e31d9603",
  "audited-role-guard.sql": "5469198859b10441ffdcfe0150624cbccec9862c13b5a20ba77614d6d19f1414",
  "audited-role-guard-installer.sql": "6cfcdf18fcf4eb9099b2b6b86f1c9d42cb0757fd2b20c1eeee5bb51a63f8297d",
  "original-runtime-login.sql": "e44dbeca8c034b0b92a8af595d3c3fcb932215ea09c8a8394b9bf7bd28c96da4",
  "original-runtime-login-installer.sql": "ba6053428fe34020c26f0e7e1e724a7fc9fa41018532875bbfb8e1909e6c8607",
  "portal-source-locks.sql": "fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03",
  "portal-source-observation.sql": "72b6509933ca2bbd73fbb11eae7232db40bf5f5eafd94be56e291f236ff83dc7",
  "portal-installed-policy-observation.sql": "d25be72e0bede3e2ded9ce0ba782b060e41260b79db00e202e1db1d6c965573a",
  "portal-policy-joint-locks.sql": "a1394da4b29c86dbf9c87a2968325d359f2bbe4137cf4004e4e4d81245f1f79e",
  "portal-policy-joint-observation.sql": "40283f6d7834a2dd01cbe4c418a8a12e6b4a8569d4680cf734c746e1cb55c9e3",
  "catalog-fence.server.ts": "2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f"
};
// PROPOSED SOURCE ONLY. No native callback has been executed by this producer.
// Root alone may invoke against its exact fresh PG18.4 lease. The one dummy
// SECURITY DEFINER Portal root is NEVER CALLED; its single APP EXECUTE grant
// permits metadata admission only. Five private source fragments and the real
// original-login terminal are also NEVER CALLED. No tenant/source rows or RLS
// policies are installed. Genuine catalog capture is not reviewer authentication.
describe.skipIf(!leasePath && !runPath)('owned PG18 Portal startup graph metadata only', () => {
  let lease: Lease, admin: Client, writer: Client, settings: Settings;
  let appRole: Role, workerRole: Role, outsiderRole: Role, ownerRole: Role;
  let app: Client, worker: Client, outsider: Client;
  let password = '', installerOid = '', verified = false, runVerified = false, fixtureSetupCommitted = false;
  let graphSource = '', completeAuditedGuard = '', sqlAttempted = false;
  let portal: ObjectReceipt;
  let finalCatalog: Awaited<ReturnType<typeof controlCatalog>>, finalRows: Record<string, unknown>[], finalBindings: Record<string, unknown>[], finalRoles: Awaited<ReturnType<typeof roleCatalog>>;
  const sources: Record<string, string> = {};
  const dependencies: ObjectReceipt[] = [];
  const pendingFenceAttempts = new Set<Promise<unknown>>();
  const clients = new Set<Client>(), closedClients = new Set<Client>();
  const roles: Role[] = [], objects: ObjectReceipt[] = [], records: unknown[] = [];
  const repairs = new Set<string>();
  const sqlstate = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN';
  };
  async function query(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { return await client.query(text, values); }
    catch (error) { throw new Error('owned_portal_startup_graph_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    const captured=JSON.stringify(value);records.push(JSON.parse(captured));
    appendFileSync(join(runPath!, 'portal-startup-graph-operations.jsonl'), captured + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); }
    catch { throw new Error('owned_portal_startup_graph_connection_failed'); }
    await query(client, 'SET search_path = pg_catalog');
    expect(client.getTransactionStatus()).toBe('I');
    return client;
  }
  async function checkBase() {
    const actual = (await query(admin, `SELECT current_database() db,
      (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) oid,
      pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database') marker,
      pg_catalog.current_setting('data_directory') data,
      (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,
      session_user::text role,current_user::text current_role,
      pg_catalog.host(pg_catalog.inet_server_addr()) host,pg_catalog.inet_server_port() port,
      pg_catalog.current_setting('server_version') version,pg_catalog.current_setting('server_encoding') encoding`)).rows[0];
    expect(actual).toMatchObject({ db: lease.database, oid: String(lease.databaseOid), marker: lease.marker,
      data: lease.data, system_id: lease.systemIdentifier, role: lease.user, current_role: lease.user,
      host: '127.0.0.1', port: lease.port, encoding: 'UTF8' });
    expect(actual.version).toMatch(/^18\.4(?:\s|$)/);
    expect(admin.getTransactionStatus()).toBe('I');
    return actual;
  }
  async function role(name: string, login = true) {
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    record({ operation: 'BEFORE_EXACT_FICTIONAL_ROLE_CREATE', name });
    // Root-generated fictional password is never recorded in SQL/error receipts.
    await query(admin, 'CREATE ROLE ' + q(name) + (login ? ' LOGIN' : ' NOLOGIN') + ' NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT' + (login ? ' PASSWORD ' + literal(password) : ''));
    const receipt = { name, oid: (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(receipt); record({ operation: 'EXACT_FICTIONAL_ROLE_CREATED', ...receipt });
    return receipt;
  }
  async function remember(kind: ObjectReceipt['kind'], schema: string, name: string, ownerOid: string, signature?: string) {
    const row = kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [name])).rows[0]
      : kind === 'table' || kind === 'sequence'
        ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(schema) + '.' + q(name)])).rows[0]
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(schema) + '.' + q(name) + signature])).rows[0];
    expect(row).toEqual({ oid: expect.stringMatching(/^[0-9]+$/), owner: ownerOid });
    const receipt: ObjectReceipt = { kind, schema, name, oid: row.oid as string, ownerOid,
      ...(signature ? { signature } : {}), dropped: false };
    objects.push(receipt); record({ operation: 'EXACT_OWN_OBJECT_OBSERVED', ...receipt });
    return receipt;
  }
  async function dropObject(object: ObjectReceipt) {
    if (object.kind === 'policy') {
      const current = (await query(admin, `SELECT p.oid::text oid,c.relowner::text owner,p.polname name
        FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
        WHERE p.oid=$1::oid AND p.polrelid=pg_catalog.to_regclass($2)`, [object.oid, object.relation])).rows;
      expect(current).toEqual([{ oid: object.oid, owner: object.ownerOid, name: object.name }]);
      await query(admin, 'DROP POLICY ' + q(object.name) + ' ON ' + object.relation);
      expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_policy WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
      object.dropped = true; record({ operation: 'EXACT_OWN_POLICY_DROPPED', ...object }); return;
    }
    if (object.kind === 'trigger') {
      const current = (await query(admin, 'SELECT t.oid::text oid,c.relowner::text owner,t.tgname FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid WHERE t.oid=$1::oid AND t.tgrelid=pg_catalog.to_regclass($2)', [object.oid, object.relation])).rows[0];
      expect(current).toEqual({ oid: object.oid, owner: object.ownerOid, tgname: object.name });
      await query(admin, 'DROP TRIGGER ' + q(object.name) + ' ON ' + object.relation);
      expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_trigger WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
      object.dropped = true; record({ operation: 'EXACT_OWN_TRIGGER_DROPPED', ...object }); return;
    }
    const current = object.kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [object.name])).rows[0]
      : object.kind === 'table' || object.kind === 'sequence'
        ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows[0]
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows[0];
    expect(current).toEqual({ oid: object.oid, owner: object.ownerOid });
    const target = object.kind === 'schema' ? q(object.name) : q(object.schema) + '.' + q(object.name) + (object.signature ?? '');
    if (object.kind === 'table' || object.kind === 'sequence') expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', [target])).rows).toEqual([{ oid: object.oid }]);
    if (object.kind === 'function') expect((await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [target])).rows).toEqual([{ oid: object.oid }]);
    await query(admin, 'DROP ' + object.kind.toUpperCase() + ' ' + target);
    const remaining = object.kind === 'schema'
      ? (await query(admin, 'SELECT oid FROM pg_catalog.pg_namespace WHERE oid=$1::oid', [object.oid])).rows
      : object.kind === 'table' || object.kind === 'sequence'
        ? (await query(admin, 'SELECT oid FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows
        : (await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows;
    expect(remaining).toEqual([]);
    object.dropped = true; record({ operation: 'EXACT_OWN_OBJECT_DROPPED', ...object });
  }
  async function roleCatalog() {
    return (await query(admin, `SELECT oid::text oid,rolname::text name,rolsuper,rolinherit,rolcreaterole,
      rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_catalog.pg_roles ORDER BY oid`)).rows;
  }
  async function controlCatalog() {
    const schema = (await query(admin, `SELECT oid::text oid,nspname,nspowner::text owner,nspacl::text acl
      FROM pg_catalog.pg_namespace WHERE nspname IN ('nevora_tenancy','public') ORDER BY nspname COLLATE pg_catalog."C"`)).rows;
    const relations = (await query(admin, `SELECT c.oid::text oid,c.relname,c.relowner::text owner,c.relkind,
      c.relpersistence,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('nevora_tenancy','public') ORDER BY n.nspname COLLATE pg_catalog."C",c.relname COLLATE pg_catalog."C"`)).rows;
    const columns = (await query(admin, `SELECT c.oid::text relation_oid,n.nspname,c.relname,a.attnum,a.attname,a.atttypid::text type_oid,
      pg_catalog.format_type(a.atttypid,a.atttypmod) native_type,a.attnotnull,
      a.atthasdef,a.attidentity,a.attgenerated,a.attacl::text acl
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('nevora_tenancy','public') AND c.relkind IN ('r','p','v','m','f','S') AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY n.nspname COLLATE pg_catalog."C",c.relname COLLATE pg_catalog."C",a.attnum`)).rows;
    const constraints = (await query(admin, `SELECT c.oid::text relation_oid,n.nspname,c.relname,co.oid::text oid,co.conname,co.contype,co.conkey,
      co.convalidated,co.condeferrable,co.condeferred,pg_catalog.pg_get_constraintdef(co.oid,false) definition
      FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('nevora_tenancy','public')
      ORDER BY n.nspname COLLATE pg_catalog."C",c.relname COLLATE pg_catalog."C",co.contype::text COLLATE pg_catalog."C",co.conname COLLATE pg_catalog."C"`)).rows;
    const functions = (await query(admin, `SELECT p.oid::text oid,p.proname,p.proowner::text owner,
      p.prosecdef,p.proconfig,p.proacl::text acl,pg_catalog.pg_get_functiondef(p.oid) definition
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('nevora_tenancy','public') ORDER BY p.oid`)).rows;
    const triggers = (await query(admin, `SELECT t.oid::text oid,t.tgrelid::text relation_oid,t.tgfoid::text function_oid,t.tgname,
      t.tgenabled,t.tgisinternal,t.tgtype,t.tgdeferrable,t.tginitdeferred,pg_catalog.pg_get_triggerdef(t.oid,false) definition
      FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('nevora_tenancy','public') ORDER BY t.oid`)).rows;
    const rules = (await query(admin, `SELECT w.oid::text oid,w.ev_class::text relation_oid,w.rulename,w.ev_type::text event,w.ev_enabled,
      pg_catalog.pg_get_ruledef(w.oid,false) definition FROM pg_catalog.pg_rewrite w JOIN pg_catalog.pg_class c ON c.oid=w.ev_class
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('nevora_tenancy','public') ORDER BY w.oid`)).rows;
    const memberships = (await query(admin, 'SELECT roleid::text roleid,member::text member,grantor::text grantor,admin_option,inherit_option,set_option FROM pg_catalog.pg_auth_members ORDER BY roleid,member,grantor')).rows;
    const expandedAcls = (await query(admin, `SELECT 'SCHEMA' kind,n.oid::text oid,a.grantor::text grantor,a.grantee::text grantee,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) a WHERE n.nspname IN ('nevora_tenancy','public')
      UNION ALL SELECT 'TABLE',c.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) a
      WHERE n.nspname IN ('nevora_tenancy','public') AND c.relkind IN ('r','p','v','m','f','S')
      UNION ALL SELECT 'FUNCTION',p.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL pg_catalog.aclexplode(p.proacl) a
      WHERE n.nspname IN ('nevora_tenancy','public') ORDER BY kind,oid,grantee,privilege_type`)).rows;
    const policies = (await query(admin, `SELECT p.oid::text oid,p.polrelid::text relation_oid,p.polname name,
      p.polcmd::text command,p.polpermissive permissive,
      ARRAY(SELECT r::text FROM pg_catalog.unnest(p.polroles) r ORDER BY r) AS role_oids,
      pg_catalog.pg_get_expr(p.polqual,p.polrelid,false) AS using_expression,
      pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false) AS with_check_expression
      FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('nevora_tenancy','public') ORDER BY p.oid`)).rows;
    return { schema, relations, columns, constraints, functions, triggers, rules, memberships, expandedAcls, policies };
  }
  function canonicalAclCatalog(catalog: Awaited<ReturnType<typeof controlCatalog>>) {
    // Preserve every observed row/property; replace only each raw ACL array
    // spelling with its full sorted native expansion for that exact object OID.
    return { ...catalog,
      schema: catalog.schema.map(row => ({ ...row, acl: catalog.expandedAcls.filter(acl => acl.kind === 'SCHEMA' && acl.oid === row.oid) })),
      relations: catalog.relations.map(row => ({ ...row, acl: catalog.expandedAcls.filter(acl => acl.kind === 'TABLE' && acl.oid === row.oid) })),
      functions: catalog.functions.map(row => ({ ...row, acl: catalog.expandedAcls.filter(acl => acl.kind === 'FUNCTION' && acl.oid === row.oid) })),
    };
  }
  async function settingsSource(): Promise<Settings> {
    return (await query(admin, `SELECT 'pg_catalog.pg_settings'::pg_catalog.regclass::oid::text oid,
      pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::pg_catalog.regclass,false) definition,
      ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite w
      WHERE w.ev_class='pg_catalog.pg_settings'::pg_catalog.regclass ORDER BY w.rulename COLLATE pg_catalog."C") rules`)).rows[0] as Settings;
  }
  async function originalLogin(client: Client, owned: Role) {
    const rows=(await query(client,`SELECT pg_catalog.pg_backend_pid() pid,session_user::text session_role,current_user::text current_role,
      pg_catalog.current_setting('role') effective_setting_role,
      (SELECT r.oid::text FROM pg_catalog.pg_roles r WHERE r.rolname=session_user) original_login_oid,
      current_database() database,
      (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) database_oid`)).rows;
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({session_role:owned.name,current_role:owned.name,effective_setting_role:'none',original_login_oid:owned.oid,database:lease.database,database_oid:String(lease.databaseOid)});
    expect(Number.isSafeInteger(rows[0].pid)&&rows[0].pid>0).toBe(true);return rows[0];
  }
  async function synchronizedNativeAbort(client: Client, owned: Role, pid: number) {
    const deadline=Date.now()+3000,observations=[];
    while(true){
      // Admin is idle: each independent statement observes a fresh activity
      // snapshot. No attempted query or status override on the aborted backend.
      expect(admin.getTransactionStatus()).toBe('I');
      const rows=(await query(admin,`SELECT pid,usesysid::text role_oid,usename::text role,
        datid::text database_oid,datname::text database,backend_type,state,
        pg_catalog.host(client_addr) host,backend_start::text backend_start
        FROM pg_catalog.pg_stat_activity WHERE pid=$1 AND usesysid=$2::oid
        AND datid=$3::oid AND backend_type='client backend'`,[pid,owned.oid,lease.databaseOid])).rows;
      expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({pid,role_oid:owned.oid,role:owned.name,
        database_oid:String(lease.databaseOid),database:lease.database,backend_type:'client backend',host:'127.0.0.1'});
      expect(rows[0].backend_start).toEqual(expect.any(String));
      const clientStatus=client.getTransactionStatus();observations.push({rows,clientStatus});
      if(rows[0].state==='idle in transaction (aborted)'&&clientStatus==='E')return {rows,clientStatus,observations};
      if(Date.now()>=deadline){record({caseId:'PSG_ABORT',operation:'EXACT_NATIVE_ABORT_SYNCHRONIZATION_TIMED_OUT',pid,owned,observations});throw new Error('owned_portal_startup_graph_native_abort_timeout');}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
  }
  const rootSource = `CREATE FUNCTION nevora_tenancy.resolve_portal(pg_catalog.text,pg_catalog.text)
    RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
    SET search_path=pg_catalog AS $startup_fiction$ SELECT '{"fixture":"UNUSED_STARTUP_METADATA_ONLY"}'::pg_catalog.jsonb $startup_fiction$`;
  const helperSpecs = [
    ['portal-source-observation.sql','read_portal_source_rows','(text,text,bpchar)','$portal_source_observation$'],
    ['portal-source-locks.sql','lock_portal_source_rows','(text,text,bpchar)','$portal_source_locks$'],
    ['portal-installed-policy-observation.sql','read_portal_installed_policy','(text)','$portal_installed_policy_observation$'],
    ['portal-policy-joint-locks.sql','lock_portal_policy_source_rows','(text,text,bpchar)','$portal_policy_source_locks$'],
    ['portal-policy-joint-observation.sql','read_portal_policy_source_rows','(text,text,bpchar)','$portal_policy_source_observation$'],
  ] as const;
  const rootTarget = 'nevora_tenancy.resolve_portal(text,text)';
  const guardTarget = 'nevora_tenancy.assert_audited_runtime_role(text)';
  function helperFragment(file: string, delimiter: string) {
    const whole=sources[file]; expect(hash(whole)).toBe(sourcePins[file]);
    const start=whole.indexOf('CREATE FUNCTION nevora_tenancy.'), at=whole.indexOf(delimiter+';',start);
    expect(start).toBeGreaterThan(0); expect(at).toBeGreaterThan(start);
    return whole.slice(start,at+delimiter.length+1);
  }
  function nativeQuery(select: string) {
    const begin='-- AUDITED_NATIVE_CTES_BEGIN',end='-- AUDITED_NATIVE_CTES_END';
    expect(completeAuditedGuard.split(begin)).toHaveLength(2);expect(completeAuditedGuard.split(end)).toHaveLength(2);
    return 'WITH '+completeAuditedGuard.slice(completeAuditedGuard.indexOf(begin)+begin.length,completeAuditedGuard.indexOf(end)).trim()+'\n'+select;
  }
  async function native(oid: string) {
    const rows=(await query(admin,nativeQuery(`SELECT f.observation,f.source_sha256,o.observation owner_observation,
      o.acl_observation owner_acl_observation,o.safe FROM audit_functions f LEFT JOIN audit_owners o ON o.oid=f.owner_oid WHERE f.oid=$1::oid`),[oid])).rows;
    expect(rows).toHaveLength(1);expect(rows[0].observation.oid).toBe(oid);
    expect(rows[0].source_sha256).toBe(hash(rows[0].observation.definition));return rows[0];
  }
  async function registryRows(): Promise<Record<string,unknown>[]> {
    return (await query(admin,'SELECT pg_catalog.to_jsonb(c) value FROM nevora_tenancy.audited_helper_capability c ORDER BY c.runtime_kind,c.route_kind,c.function_oid,c.route_oid')).rows.map(row=>row.value);
  }
  async function bindingRows(): Promise<Record<string,unknown>[]> {
    return (await query(admin,'SELECT pg_catalog.to_jsonb(b) value FROM nevora_tenancy.runtime_role_binding b ORDER BY b.kind COLLATE pg_catalog."C"')).rows.map(row=>row.value);
  }
  async function writeCapability(row: Record<string,unknown>) {
    const cols=['runtime_kind','route_kind','function_oid','route_oid','function_observation','owner_observation','owner_acl_observation','dependencies','route_observation','review_reference','review_source_sha256','owner_lock_columns'];
    const jsonCols=['function_observation','owner_observation','owner_acl_observation','dependencies','route_observation','owner_lock_columns'];
    await query(admin,'INSERT INTO nevora_tenancy.audited_helper_capability('+cols.map(q).join(',')+') VALUES('+cols.map((column,i)=>'$'+(i+1)+(jsonCols.includes(column)?'::jsonb':'')).join(',')+')',cols.map(column=>jsonCols.includes(column)?row[column]===null?null:JSON.stringify(row[column]):row[column]));
  }
  async function recapture() {
    // Single owned installer transaction. Empty provisional profiles are invalid
    // observations, never invented safe/approval booleans. Current stage derives
    // native source, role/ACL/ownership independently of those profile fields.
    expect(admin.getTransactionStatus()).toBe('T');
    const root=await native(portal.oid), observed=[];
    for(const member of dependencies)observed.push((await native(member.oid)).observation);
    const row:Record<string,unknown>={runtime_kind:'APP',route_kind:'DIRECT_CALL',function_oid:portal.oid,route_oid:'0',
      function_observation:root.observation,owner_observation:{},owner_acl_observation:{},dependencies:observed,
      route_observation:null,review_reference:'ROOT_FICTIONAL_STARTUP_METADATA_ONLY:'+lease.invocation,
      review_source_sha256:root.source_sha256,owner_lock_columns:[]};
    await query(admin,'DELETE FROM nevora_tenancy.audited_helper_capability');await writeCapability(row);
    const fresh=await native(portal.oid);
    await query(admin,'UPDATE nevora_tenancy.audited_helper_capability SET owner_observation=$1::jsonb,owner_acl_observation=$2::jsonb WHERE function_oid=$3::oid',
      [JSON.stringify(fresh.owner_observation),JSON.stringify(fresh.owner_acl_observation),portal.oid]);
    const current=await registryRows();expect(current).toHaveLength(1);
    expect(current[0].owner_observation).toEqual(fresh.owner_observation);expect(current[0].owner_acl_observation).toEqual(fresh.owner_acl_observation);
    record({operation:'GENUINE_NATIVE_PROVISIONAL_THEN_OWNER_RECAPTURE',row,fresh,current,
      scope:'ONE_FICTIONAL_ROOT_REGISTRATION_SIX_NATIVE_DEPENDENCIES_NOT_CONTROLLED_PRODUCTION_ENROLLMENT'});return current;
  }
  async function installerTransaction(body:()=>Promise<void>) {
    expect(admin.getTransactionStatus()).toBe('I');await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
    await query(admin,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    try{await body();await query(admin,'COMMIT');}finally{if(['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');}
  }
  async function observe(client:Client,owned:Role) {
    expect(client.getTransactionStatus()).toBe('I');const identity=await originalLogin(client,owned);
    const dispatched:string[]=[];await query(client,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try{
      dispatched.push('SHARED_FENCE');const fence=(await query(client,RUNTIME_CATALOG_SHARED_FENCE_SQL.text)).rows;
      expect(fence).toEqual([{catalog_fence:''}]);
      dispatched.push('ORIGINAL_NATIVE_APP_GUARD');const first=(await query(client,'SELECT nevora_tenancy.assert_audited_runtime_role($1::text) allowed',['APP'])).rows;
      dispatched.push('WHOLE_FIXED_GRAPH_QUERY');const rows=(await query(client,graphSource)).rows;
      dispatched.push('FINAL_NATIVE_APP_GUARD');const last=(await query(client,'SELECT nevora_tenancy.assert_audited_runtime_role($1::text) allowed',['APP'])).rows;
      const current=await originalLogin(client,owned);await query(client,'COMMIT');
      return {identity,current,dispatched,fence,first,rows,last};
    }finally{if(['T','E'].includes(client.getTransactionStatus()??''))await query(client,'ROLLBACK');}
  }
  function assertPositive(outcome:Awaited<ReturnType<typeof observe>>) {
    expect(outcome.first).toEqual([{allowed:true}]);expect(outcome.last).toEqual([{allowed:true}]);
    expect(outcome.rows).toHaveLength(1);expect(Object.keys(outcome.rows[0])).toEqual(['startup']);
    const startup=outcome.rows[0].startup;
    expect(Object.keys(startup).sort()).toEqual(['format','databaseOid','rootOid','ownerOid','rootDefinition','rootDefinitionSha256','nativeAuditCapsuleText','nativeAuditCapsuleSha256'].sort());
    expect(startup).toMatchObject({format:'PORTAL_STARTUP_NATIVE_GRAPH_OBSERVATION_V1',databaseOid:String(lease.databaseOid),rootOid:portal.oid,ownerOid:ownerRole.oid});
    expect(startup.rootDefinitionSha256).toBe(hash(startup.rootDefinition));expect(startup.nativeAuditCapsuleSha256).toBe(hash(startup.nativeAuditCapsuleText));
    const capsule=JSON.parse(startup.nativeAuditCapsuleText);
    expect(capsule.format).toBe('PORTAL_STARTUP_NATIVE_GRAPH_CAPSULE_V1');
    expect(Object.keys(capsule).sort()).toEqual(['format','databaseOid','serverVersionNum','auditedRoleGuard','originalBackendLogin','rootFunction','rootRegistration','owner','ownerAcl','nativeFixedDependencies','currentLockColumns','runtimeBindings','allRegistrations'].sort());
    expect(Object.keys(capsule.originalBackendLogin).sort()).toEqual(['roleOid','roleName','kind','sessionUser','currentUser','backendLoginOid','roleSetting'].sort());
    expect(capsule.databaseOid).toBe(String(lease.databaseOid));
    expect(capsule.originalBackendLogin).toMatchObject({roleOid:appRole.oid,roleName:appRole.name,backendLoginOid:appRole.oid,kind:'APP',sessionUser:appRole.name,currentUser:appRole.name,roleSetting:'none'});
    expect(capsule.rootFunction).toMatchObject({oid:portal.oid,ownerOid:ownerRole.oid,definition:startup.rootDefinition,securityDefiner:true});
    expect(capsule.nativeFixedDependencies).toHaveLength(6);
    expect(capsule.nativeFixedDependencies.map((x:{name:string})=>x.name).sort()).toEqual(['require_original_runtime_login_kind',...helperSpecs.map(x=>x[1])].sort());
    expect(new Set(capsule.nativeFixedDependencies.map((x:{oid:string})=>x.oid)).size).toBe(6);
    expect(capsule.runtimeBindings).toHaveLength(2);expect(capsule.allRegistrations).toHaveLength(1);expect(capsule.currentLockColumns).toEqual([]);
    expect(capsule.rootRegistration.dependencies).toHaveLength(6);expect(capsule.rootRegistration.owner_lock_columns).toEqual([]);
    expect(capsule.owner).toMatchObject({oid:ownerRole.oid,canLogin:false,superuser:false,bypassRls:false,inherit:false,memberships:[]});
    expect(Object.values(capsule.ownerAcl.effectiveChecks).every(value=>value===false)).toBe(true);
    // These are assertions on genuine native observations, not approved flags
    // constructed for a production policy or issuer.
    return {startup,capsule};
  }
  async function committedVariant(caseId:string,label:string,change:()=>Promise<void>,restore:()=>Promise<void>,check:()=>Promise<void>,capture=true) {
    const before=canonicalAclCatalog(await controlCatalog()),rows=await registryRows(),bindings=await bindingRows(),roleRows=await roleCatalog();
    const repair=caseId+':'+label;repairs.add(repair);
    try{
      await installerTransaction(async()=>{await change();if(capture)await recapture();});
      record({caseId,label,stage:'EXACT_COMMITTED_FICTIONAL_VARIANT',catalog:await controlCatalog(),rows:await registryRows(),bindings:await bindingRows(),roles:await roleCatalog()});
      await check();
    }finally{
      // Always record and restore the original tuple after a feature failure.
      await installerTransaction(async()=>{await restore();await query(admin,'DELETE FROM nevora_tenancy.audited_helper_capability');for(const row of rows)await writeCapability(row);});
      const after=canonicalAclCatalog(await controlCatalog()),afterRows=await registryRows(),afterBindings=await bindingRows(),afterRoles=await roleCatalog();
      record({caseId,label,stage:'FULL_EXACT_TUPLE_RESTORATION',before,after,rows,afterRows,bindings,afterBindings,roleRows,afterRoles});
      expect(after).toEqual(before);expect(afterRows).toEqual(rows);expect(afterBindings).toEqual(bindings);expect(afterRoles).toEqual(roleRows);
      assertPositive(await observe(app,appRole));repairs.delete(repair);
    }
  }
  async function lockWait(waiterPid:number,blockerPid:number,waitingMode:'ShareLock'|'ExclusiveLock') {
    const observations=[],deadline=Date.now()+3000;
    for(;;){
      const rows=(await query(admin,`SELECT a.pid,a.usesysid::text role_oid,a.datid::text database_oid,a.state,a.wait_event_type,a.wait_event,
        pg_catalog.pg_blocking_pids(a.pid) blockers,l.mode,l.granted,l.database::text lock_database,l.classid::text classid,l.objid::text objid,l.objsubid
        FROM pg_catalog.pg_stat_activity a JOIN pg_catalog.pg_locks l ON l.pid=a.pid AND l.locktype='advisory'
        WHERE a.pid=$1`,[waiterPid])).rows;
      const held=(await query(admin,`SELECT database::text lock_database,classid::text classid,objid::text objid,objsubid,mode,granted
        FROM pg_catalog.pg_locks WHERE pid=$1 AND locktype='advisory' AND granted`,[blockerPid])).rows;
      observations.push({rows,held});const pending=rows.find(row=>row.mode===waitingMode&&!row.granted&&row.blockers.includes(blockerPid));
      if(pending){expect(pending.database_oid).toBe(String(lease.databaseOid));expect(pending.wait_event_type).toBe('Lock');
        expect(held).toHaveLength(1);expect(held[0]).toMatchObject({lock_database:pending.lock_database,classid:pending.classid,objid:pending.objid,objsubid:pending.objsubid,granted:true});return {pending,held,observations};}
      if(Date.now()>=deadline){record({operation:'EXACT_FENCE_WAIT_TIMEOUT',waiterPid,blockerPid,observations});throw new Error('owned_startup_fence_wait_timeout');}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
  }
  async function reconcilePending() {
    // Controller release precedes awaiting a pending acquire on failure; never
    // leave a query promise in flight and then send another query on that client.
    for(const client of [admin,writer])if(client&&['T','E'].includes(client.getTransactionStatus()??''))await query(client,'ROLLBACK');
    for(const pending of [...pendingFenceAttempts]){try{await pending;}finally{pendingFenceAttempts.delete(pending);}}
    for(const client of [app,worker,outsider])if(client&&['T','E'].includes(client.getTransactionStatus()??''))await query(client,'ROLLBACK');
  }
  beforeAll(async()=>{
    expect(leasePath!==undefined&&runPath!==undefined&&graphPath!==undefined).toBe(true);
    expect(process.env.DATABASE_URL===undefined&&process.env.FUEL_TEST_DATABASE_URL===undefined).toBe(true);
    expect(isAbsolute(leasePath!)&&isAbsolute(runPath!)&&isAbsolute(graphPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath);expect(realpathSync(runPath!)).toBe(runPath);expect(realpathSync(graphPath!)).toBe(graphPath);
    const uid=process.getuid?.();expect(uid!==undefined).toBe(true);const ls=lstatSync(leasePath!);
    expect(ls.isFile()&&!ls.isSymbolicLink()).toBe(true);expect(ls.uid).toBe(uid);expect(ls.mode&0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true);expect(statSync(runPath!).uid).toBe(uid);runVerified=true;
    lease=JSON.parse(readFileSync(leasePath!,'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10');expect(lease.closed).toBe(false);expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.marker).toBe('f10-owned:'+lease.invocation);expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:runtime-role:'+lease.invocation);
    expect(Number.isSafeInteger(lease.port)&&lease.port>1024&&lease.port<65536).toBe(true);expect(Number.isSafeInteger(lease.pid)&&lease.pid>0).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root);expect(realpathSync(lease.data)).toBe(join(lease.root,'data'));expect(leasePath!.startsWith(lease.root+sep)).toBe(true);
    const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');expect(Number(pid[0])).toBe(lease.pid);expect(realpathSync(pid[1])).toBe(lease.data);expect(pid[2]).toBe(lease.pidStart);expect(Number(pid[3])).toBe(lease.port);
    const cs=lstatSync(lease.credentialFile);expect(cs.isFile()&&!cs.isSymbolicLink()).toBe(true);expect(cs.uid).toBe(uid);expect(cs.mode&0o777).toBe(0o600);
    expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);expect(lease.credentialFile.startsWith(lease.root+sep)).toBe(true);
    graphSource=readFileSync(graphPath!,'utf8');expect(hash(graphSource)).toBe(graphSHA256);
    for(const [file,pin] of Object.entries(sourcePins)){sources[file]=readFileSync(resolve('src/lib/tenancy/runtime',file),'utf8');expect(hash(sources[file])).toBe(pin);}
    completeAuditedGuard=sources['audited-role-guard.sql'];
    const cteBegin='-- AUDITED_NATIVE_CTES_BEGIN',cteEnd='-- AUDITED_NATIVE_CTES_END';
    const ctes=completeAuditedGuard.slice(completeAuditedGuard.indexOf(cteBegin)+cteBegin.length,completeAuditedGuard.indexOf(cteEnd));
    expect(graphSource).toContain(ctes);expect(hash(ctes)).toBe('dae26b270d250e9cd75fd2eeb5cd69e8e392bf954f685c3cd4168c554a4d8b33');
    // All source/lease checks precede the ONLY root fictional credential read.
    password=readFileSync(lease.credentialFile,'utf8');expect(password.length>0).toBe(true);
    admin=await connect(lease.user);const base=await checkBase();
    installerOid=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[lease.user])).rows[0].oid;
    expect((await query(admin,'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid',[String(lease.databaseOid)])).rows).toEqual([{owner:installerOid}]);
    expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);verified=true;
    record({operation:'EXACT_ROOT_OWNED_EMPTY_BASE_VERIFIED',base,graphSHA256,sourcePins,scope:'GRAPH_ONLY_NO_TENANT_TABLES_ROOT_OR_PRIVATE_HELPER_INVOCATION'});
    await installerTransaction(async()=>{
      appRole=await role(lease.invocation+'_psg_app');workerRole=await role(lease.invocation+'_psg_worker');outsiderRole=await role(lease.invocation+'_psg_outsider');ownerRole=await role(lease.invocation+'_psg_owner',false);
      await query(admin,'REVOKE CREATE,TEMPORARY ON DATABASE '+q(lease.database)+' FROM PUBLIC');await query(admin,'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin,'GRANT CONNECT ON DATABASE '+q(lease.database)+' TO '+[appRole,workerRole,outsiderRole].map(x=>q(x.name)).join(','));
      await query(admin,'CREATE SCHEMA nevora_tenancy');await remember('schema','','nevora_tenancy',installerOid);
    });fixtureSetupCommitted=true;
    // Whole pinned fresh installers own their explicit RC/exclusive transactions.
    // They precede all fictional named reads/grants and capability enrollment.
    await query(admin,sources['control-storage.sql']);await remember('table','nevora_tenancy','runtime_role_binding',installerOid);
    await query(admin,sources['audited-helper-storage.sql']);await remember('table','nevora_tenancy','audited_helper_capability',installerOid);
    await query(admin,sources['audited-role-guard-installer.sql']);await remember('function','nevora_tenancy','assert_audited_runtime_role',installerOid,'(text)');
    await query(admin,sources['original-runtime-login-installer.sql']);dependencies.push(await remember('function','nevora_tenancy','require_original_runtime_login_kind',installerOid,'()'));
    expect(await registryRows()).toEqual([]);expect(await bindingRows()).toEqual([]);
    record({operation:'WHOLE_PRIVATE_INSTALLERS_BEFORE_EXPLICIT_FICTIONAL_SETUP',catalog:await controlCatalog(),rows:await registryRows(),bindings:await bindingRows()});
    settings=await settingsSource();
    await installerTransaction(async()=>{
      for(const [kind,owned] of [['APP',appRole],['WORKER',workerRole]] as const)await query(admin,'INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules) VALUES($1,$2,$3::oid,$4::oid,$5,$6::text[])',[kind,owned.name,owned.oid,settings.oid,settings.definition,settings.rules]);
      const readers=[appRole,workerRole,outsiderRole,ownerRole].map(x=>q(x.name)).join(',');
      await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+readers);
      await query(admin,'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding,nevora_tenancy.audited_helper_capability TO '+readers);
      await query(admin,'GRANT EXECUTE ON FUNCTION '+guardTarget+' TO '+[appRole,workerRole,outsiderRole].map(x=>q(x.name)).join(','));
      await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.require_original_runtime_login_kind() TO '+q(ownerRole.name));
      for(const [file,name,signature,delimiter] of helperSpecs){
        const fragment=helperFragment(file,delimiter);await query(admin,fragment);await query(admin,'REVOKE ALL ON FUNCTION nevora_tenancy.'+name+signature+' FROM PUBLIC');
        await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.'+name+signature+' TO '+q(ownerRole.name));
        const object=await remember('function','nevora_tenancy',name,installerOid,signature);dependencies.push(object);
        record({operation:'PINNED_CREATE_FRAGMENT_ONLY_NEVER_CALLED',file,wholeSourceSHA256:sourcePins[file],fragment,fragmentSHA256:hash(fragment),object,wholeInstallerRlsOrSourceAccessClaim:false});
      }
      await query(admin,rootSource);await query(admin,'ALTER FUNCTION '+rootTarget+' OWNER TO '+q(ownerRole.name));await query(admin,'REVOKE ALL ON FUNCTION '+rootTarget+' FROM PUBLIC');
      await query(admin,'GRANT EXECUTE ON FUNCTION '+rootTarget+' TO '+q(appRole.name));portal=await remember('function','nevora_tenancy','resolve_portal',ownerRole.oid,'(text,text)');
      record({operation:'ROOT_APPROVED_UNUSED_FICTIONAL_ROOT_METADATA_GRANT_ONLY',rootSource,rootSourceSHA256:hash(rootSource),portal,grantee:appRole,neverCalled:true,productionEnrollment:false});
      await recapture();
    });
    app=await connect(appRole.name);worker=await connect(workerRole.name);outsider=await connect(outsiderRole.name);writer=await connect(lease.user);
    for(const [client,owned] of [[app,appRole],[worker,workerRole],[outsider,outsiderRole]] as const)await originalLogin(client,owned);
    finalCatalog=await controlCatalog();finalRows=await registryRows();finalBindings=await bindingRows();finalRoles=await roleCatalog();
    expect(objects).toHaveLength(11);expect(roles).toHaveLength(4);expect(clients.size).toBe(5);expect(dependencies).toHaveLength(6);
    writeFileSync(join(runPath!,'portal-startup-graph-fixture-custody.json'),JSON.stringify({base,roles,objects,dependencies,sourcePins,graphSHA256,sourceCatalog:finalCatalog,sourceRows:finalRows,bindingRows:finalBindings,clients:5,
      claim:'NATIVE_METADATA_ONLY_FICTIONAL_ROOT_NEVER_CALLED_NO_CONTROLLED_PRODUCTION_ENROLLMENT_OR_PROOF'},null,2),{flag:'wx',mode:0o600});
  },45000);
  it('PSG01 complete genuine native six-capsule metadata yields one exact observation, without calling the fictional root',async()=>{
    const before=await controlCatalog(),rows=await registryRows(),bindings=await bindingRows();
    const outcome=await observe(app,appRole),positive=assertPositive(outcome);
    const nativeRoot=await native(portal.oid);
    expect(positive.capsule.rootFunction).toEqual(nativeRoot.observation);
    expect(positive.capsule.owner).toEqual(nativeRoot.owner_observation);expect(positive.capsule.ownerAcl).toEqual(nativeRoot.owner_acl_observation);
    for(const member of dependencies){const actual=(await native(member.oid)).observation;expect(positive.capsule.nativeFixedDependencies).toContainEqual(actual);}
    const guardOid=(await query(admin,'SELECT pg_catalog.to_regprocedure($1)::oid::text oid',[guardTarget])).rows[0].oid;
    expect(positive.capsule.auditedRoleGuard).toEqual((await native(guardOid)).observation);
    record({caseId:'PSG01',outcome,positive,nativeRoot,rows,bindings,scope:'CATALOG_SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_BUILD_ATTESTATION'});
    expect(await controlCatalog()).toEqual(before);expect(await registryRows()).toEqual(rows);expect(await bindingRows()).toEqual(bindings);
  },45000);
  it('PSG02 original WORKER and outsider yield no APP startup and each private dependency refuses direct LOGIN execution before its body',async()=>{
    const outcomes=[];
    for(const [client,owned] of [[worker,workerRole],[outsider,outsiderRole]] as const){const actual=await observe(client,owned);outcomes.push(actual);expect(actual.rows).toEqual([]);expect(actual.first).toEqual([{allowed:false}]);expect(actual.last).toEqual([{allowed:false}]);}
    const direct=[];
    for(const [client,owned] of [[app,appRole],[worker,workerRole],[outsider,outsiderRole]] as const)for(const member of dependencies){
      const identity=await originalLogin(client,owned),args=member.signature==='()'?'':member.signature==='(text)'?'NULL::pg_catalog.text':'NULL::pg_catalog.text,NULL::pg_catalog.text,NULL::pg_catalog.bpchar';
      await query(client,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(client,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      try{
        const code=await rejected(client,'SELECT nevora_tenancy.'+q(member.name)+'('+args+')');
        const aborted=await synchronizedNativeAbort(client,owned,identity.pid),replay=await rejected(client,'SELECT 1');
        const measured={owned,member,identity,code,aborted,replay};record({caseId:'PSG02',measured});direct.push(measured);
        expect(code).toBe('42501');expect(replay).toBe('25P02');expect(client.getTransactionStatus()).toBe('E');
      }finally{await query(client,'ROLLBACK');}expect(client.getTransactionStatus()).toBe('I');
    }
    // Never call the APP dummy root even as a positive test. The two other
    // original LOGINs lack EXECUTE; native ACL closure proves that distinction.
    const rootAcl=(await native(portal.oid)).observation.acl;
    expect(rootAcl.filter((x:{granteeOid:string})=>x.granteeOid!==ownerRole.oid).map((x:{granteeOid:string})=>x.granteeOid)).toEqual([appRole.oid]);
    record({caseId:'PSG02',outcomes,direct,rootAcl,noDummyRootOrDependencyBodyExecuted:true});
  },45000);
  it('PSG03 changed original APP binding and LOGIN profile deny on fresh native observations then restore the entire tuple',async()=>{
    await committedVariant('PSG03','WRONG_NATIVE_NAME_WITH_ORIGINAL_OID',async()=>{await query(admin,"UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind='APP'",[outsiderRole.name]);},async()=>{await query(admin,"UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind='APP'",[appRole.name]);},async()=>{
      const actual=await observe(app,appRole);record({caseId:'PSG03',variant:'WRONG_NATIVE_NAME_WITH_ORIGINAL_OID',actual});expect(actual.rows).toEqual([]);expect(actual.first).toEqual([{allowed:false}]);
    });
    await committedVariant('PSG03','NATIVE_APP_NOINHERIT_DRIFT',async()=>{await query(admin,'ALTER ROLE '+q(appRole.name)+' INHERIT');},async()=>{await query(admin,'ALTER ROLE '+q(appRole.name)+' NOINHERIT');},async()=>{
      const actual=await observe(app,appRole);record({caseId:'PSG03',variant:'NATIVE_APP_NOINHERIT_DRIFT',actual});expect(actual.rows).toEqual([]);expect(actual.first).toEqual([{allowed:false}]);
    });
  },45000);
  it('PSG04 each lost retained descriptor, duplicate capsule, or extra noncatalog self capsule denies exact complete selection',async()=>{
    const original=(await registryRows())[0],full=original.dependencies as Record<string,unknown>[];
    for(const member of dependencies)await committedVariant('PSG04','MISSING:'+member.name,async()=>{
      await query(admin,'UPDATE nevora_tenancy.audited_helper_capability SET dependencies=$1::jsonb WHERE function_oid=$2::oid',[JSON.stringify(full.filter(value=>value.oid!==member.oid)),portal.oid]);
    },async()=>{},async()=>{const actual=await observe(app,appRole);record({caseId:'PSG04',member,actual});expect(actual.rows).toEqual([]);},false);
    for(const [label,altered] of [['DUPLICATE',[...full,full[0]]],['EXTRA_CUSTOM_SELF',[...full,(await native(portal.oid)).observation]]] as const)await committedVariant('PSG04',label,async()=>{
      await query(admin,'UPDATE nevora_tenancy.audited_helper_capability SET dependencies=$1::jsonb WHERE function_oid=$2::oid',[JSON.stringify(altered),portal.oid]);
    },async()=>{},async()=>{const actual=await observe(app,appRole);record({caseId:'PSG04',label,altered,actual});expect(actual.rows).toEqual([]);},false);
  },45000);
  it('PSG05 each physically absent fixed signature denies despite original retained OID and faithfully recaptured renamed metadata',async()=>{
    for(const member of dependencies){const absent=member.name+'_psg_absent',target='nevora_tenancy.'+member.name+member.signature;
      await committedVariant('PSG05',member.name,async()=>{
        expect((await query(admin,'SELECT pg_catalog.to_regprocedure($1)::oid::text oid',[target])).rows).toEqual([{oid:member.oid}]);
        await query(admin,'ALTER FUNCTION '+target+' RENAME TO '+q(absent));
      },async()=>{
        expect((await query(admin,'SELECT pg_catalog.to_regprocedure($1)::oid::text oid',['nevora_tenancy.'+absent+member.signature])).rows).toEqual([{oid:member.oid}]);
        await query(admin,'ALTER FUNCTION nevora_tenancy.'+q(absent)+member.signature+' RENAME TO '+q(member.name));
      },async()=>{
        const actual=await observe(app,appRole),observed=await native(member.oid);record({caseId:'PSG05',member,absent,actual,observed});
        expect(observed.observation.name).toBe(absent);expect(actual.rows).toEqual([]);
      });
    }
  },45000);
  it('PSG06 fixed source helper strictness or body delta denies after full native recapture, not merely stale registry equality',async()=>{
    for(const [file,name,signature,delimiter] of helperSpecs){const member=dependencies.find(x=>x.name===name)!;
      await committedVariant('PSG06',name+':STRICT',async()=>{await query(admin,'ALTER FUNCTION nevora_tenancy.'+name+signature+' STRICT');},async()=>{await query(admin,'ALTER FUNCTION nevora_tenancy.'+name+signature+' CALLED ON NULL INPUT');},async()=>{
        const actual=await observe(app,appRole),shape=(await query(admin,'SELECT oid::text oid,proisstrict FROM pg_catalog.pg_proc WHERE oid=$1::oid',[member.oid])).rows;
        record({caseId:'PSG06',name,variant:'STRICT',shape,actual});expect(shape).toEqual([{oid:member.oid,proisstrict:true}]);expect(actual.rows).toEqual([]);
      });
      const original=helperFragment(file,delimiter),changed=original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('AS '+delimiter,'AS '+delimiter+'\n-- OWNED_FICTIONAL_BODY_DELTA');
      expect(changed).not.toBe(original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));
      await committedVariant('PSG06',name+':BODY_BYTES',async()=>{await query(admin,changed);},async()=>{await query(admin,original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));},async()=>{
        const actual=await observe(app,appRole),observed=await native(member.oid);record({caseId:'PSG06',name,variant:'BODY_BYTES',changedSHA256:hash(changed),observed,actual});expect(actual.rows).toEqual([]);
      });
    }
  },45000);
  it('PSG07 PUBLIC or bound WORKER dependency EXECUTE and unsafe declaring owner deny after genuine ACL/profile capture',async()=>{
    for(const member of dependencies)for(const grantee of ['PUBLIC',q(workerRole.name)])await committedVariant('PSG07',member.name+':'+grantee,async()=>{
      await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.'+member.name+member.signature+' TO '+grantee);
    },async()=>{await query(admin,'REVOKE EXECUTE ON FUNCTION nevora_tenancy.'+member.name+member.signature+' FROM '+grantee);},async()=>{
      const actual=await observe(app,appRole),observed=await native(member.oid);record({caseId:'PSG07',member,grantee,observed,actual});expect(actual.rows).toEqual([]);
    });
    await committedVariant('PSG07','DECLARING_OWNER_LOGIN',async()=>{await query(admin,'ALTER ROLE '+q(ownerRole.name)+' LOGIN');},async()=>{await query(admin,'ALTER ROLE '+q(ownerRole.name)+' NOLOGIN');},async()=>{
      const actual=await observe(app,appRole),observed=await native(portal.oid);record({caseId:'PSG07',variant:'DECLARING_OWNER_LOGIN',observed,actual});expect(observed.owner_observation.canLogin).toBe(true);expect(actual.rows).toEqual([]);
    });
    const member=dependencies.find(x=>x.name==='read_portal_policy_source_rows')!;
    await committedVariant('PSG07','HELPER_BOUND_WORKER_OWNER',async()=>{await query(admin,'ALTER FUNCTION nevora_tenancy.'+member.name+member.signature+' OWNER TO '+q(workerRole.name));},async()=>{await query(admin,'ALTER FUNCTION nevora_tenancy.'+member.name+member.signature+' OWNER TO '+q(lease.user));},async()=>{
      const actual=await observe(app,appRole),observed=await native(member.oid);record({caseId:'PSG07',variant:'HELPER_BOUND_WORKER_OWNER',observed,actual});expect(observed.observation.ownerOid).toBe(workerRole.oid);expect(actual.rows).toEqual([]);
    });
  },45000);
  it('PSG08 writer exclusive first blocks first runtime shared statement; fresh explicit RC sees committed binding drift despite RR session default',async()=>{
    const identity=await originalLogin(app,appRole),writerIdentity=await originalLogin(writer,{name:lease.user,oid:installerOid});
    const originalDefault=(await query(app,'SHOW default_transaction_isolation')).rows[0].default_transaction_isolation as string;
    expect(['read committed','repeatable read','serializable','read uncommitted']).toContain(originalDefault);
    const rows=await registryRows(),beforeBindings=await bindingRows(),catalog=canonicalAclCatalog(await controlCatalog());
    repairs.add('PSG08_BINDING_AND_DEFAULT');let pending:Promise<unknown>|undefined;
    try{
      await query(app,"SET default_transaction_isolation='repeatable read'");
      await query(writer,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(writer,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      await query(writer,"UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind='APP'",[outsiderRole.name]);
      await query(app,'BEGIN ISOLATION LEVEL READ COMMITTED');pending=query(app,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);pendingFenceAttempts.add(pending);
      const wait=await lockWait(identity.pid,writerIdentity.pid,'ShareLock');
      const premature=(await query(admin,"SELECT l.relation::text relation_oid,l.mode FROM pg_catalog.pg_locks l WHERE l.pid=$1 AND l.locktype='relation' AND l.relation IN (pg_catalog.to_regclass('nevora_tenancy.runtime_role_binding'),pg_catalog.to_regclass('nevora_tenancy.audited_helper_capability'))",[identity.pid])).rows;
      record({caseId:'PSG08',stage:'BEFORE_RELEASE_NATIVE_WAIT',identity,writerIdentity,wait,premature,firstInTransaction:'EXACT_SHARED_FENCE'});expect(premature).toEqual([]);
      await query(writer,'COMMIT');const acquired=await pending;pendingFenceAttempts.delete(pending);pending=undefined;
      const isolation=(await query(app,'SHOW transaction_isolation')).rows;const first=(await query(app,"SELECT nevora_tenancy.assert_audited_runtime_role('APP') allowed")).rows;
      const actual=(await query(app,graphSource)).rows;record({caseId:'PSG08',stage:'FRESH_POST_WAIT_OBSERVATION',acquired,isolation,first,actual,bindingRows:await bindingRows()});
      expect(isolation).toEqual([{transaction_isolation:'read committed'}]);expect(first).toEqual([{allowed:false}]);expect(actual).toEqual([]);await query(app,'ROLLBACK');
    }finally{
      await reconcilePending();
      await installerTransaction(async()=>{await query(admin,"UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind='APP'",[appRole.name]);});
      await query(app,'SET default_transaction_isolation='+literal(originalDefault));
      expect((await query(app,'SHOW default_transaction_isolation')).rows).toEqual([{default_transaction_isolation:originalDefault}]);
      expect(await registryRows()).toEqual(rows);expect(await bindingRows()).toEqual(beforeBindings);expect(canonicalAclCatalog(await controlCatalog())).toEqual(catalog);
      assertPositive(await observe(app,appRole));repairs.delete('PSG08_BINDING_AND_DEFAULT');
      record({caseId:'PSG08',stage:'ORIGINAL_BINDING_DEFAULT_AND_CATALOG_RESTORED',rows:await registryRows(),bindings:await bindingRows(),catalog:await controlCatalog(),pending:pendingFenceAttempts.size});
    }
  },45000);
  it('PSG09 runtime shared first retains exact startup while exclusive writer waits, then fresh next transaction rejects the committed change',async()=>{
    const identity=await originalLogin(app,appRole),writerIdentity=await originalLogin(writer,{name:lease.user,oid:installerOid});
    const original=await bindingRows(),catalog=canonicalAclCatalog(await controlCatalog());repairs.add('PSG09_BINDING');
    try{
      await query(app,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(app,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      const first=(await query(app,graphSource)).rows;expect(first).toHaveLength(1);
      await query(writer,'BEGIN ISOLATION LEVEL READ COMMITTED');const pending=query(writer,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);pendingFenceAttempts.add(pending);
      const wait=await lockWait(writerIdentity.pid,identity.pid,'ExclusiveLock');const second=(await query(app,graphSource)).rows;
      expect(second).toEqual(first);record({caseId:'PSG09',stage:'ORIGINAL_READER_REMAINS_CURRENT_WHILE_WRITER_WAITS',identity,writerIdentity,wait,first,second});
      await query(app,'COMMIT');await pending;pendingFenceAttempts.delete(pending);
      await query(writer,"UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind='APP'",[outsiderRole.name]);await query(writer,'COMMIT');
      const fresh=await observe(app,appRole);record({caseId:'PSG09',stage:'FRESH_SUBSEQUENT_TRANSACTION_DENIES_COMMITTED_NATIVE_DRIFT',fresh});expect(fresh.rows).toEqual([]);expect(fresh.first).toEqual([{allowed:false}]);
    }finally{
      // Release a held reader before awaiting an exclusive acquire on failure.
      if(['T','E'].includes(app.getTransactionStatus()??''))await query(app,'ROLLBACK');await reconcilePending();
      await installerTransaction(async()=>{await query(admin,"UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind='APP'",[appRole.name]);});
      expect(await bindingRows()).toEqual(original);expect(canonicalAclCatalog(await controlCatalog())).toEqual(catalog);assertPositive(await observe(app,appRole));repairs.delete('PSG09_BINDING');
      record({caseId:'PSG09',stage:'EXACT_READER_WRITER_RECONCILIATION',bindings:await bindingRows(),catalog:await controlCatalog(),pending:pendingFenceAttempts.size});
    }
  },45000);
  it('PSG10 repeatable-read owning transaction yields no selected row and standalone RC observation never proves a held catalog fence',async()=>{
    const identity=await originalLogin(app,appRole);
    await query(app,'BEGIN ISOLATION LEVEL REPEATABLE READ');await query(app,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
    try{const isolation=(await query(app,'SHOW transaction_isolation')).rows,rows=(await query(app,graphSource)).rows;
      record({caseId:'PSG10',stage:'NON_RC_OWNING_TRANSACTION',identity,isolation,rows});expect(isolation).toEqual([{transaction_isolation:'repeatable read'}]);expect(rows).toEqual([]);
    }finally{await query(app,'ROLLBACK');}
    const before=(await query(admin,"SELECT mode,granted FROM pg_catalog.pg_locks WHERE pid=$1 AND locktype='advisory'",[identity.pid])).rows;
    const standalone=(await query(app,graphSource)).rows;
    const after=(await query(admin,"SELECT mode,granted FROM pg_catalog.pg_locks WHERE pid=$1 AND locktype='advisory'",[identity.pid])).rows;
    // Truthful negative control: the query checks RC but does NOT acquire or prove
    // an owning/shared-fenced transaction. A coherent autocommit observation can
    // exist; producer/build custody and fenced caller adoption remain required.
    record({caseId:'PSG10',stage:'AUTOCOMMIT_METADATA_IS_NOT_HELD_FENCE_OR_AUTHORITY',before,standalone,after,clientStatus:app.getTransactionStatus()});
    expect(standalone).toHaveLength(1);expect(standalone[0].startup.format).toBe('PORTAL_STARTUP_NATIVE_GRAPH_OBSERVATION_V1');expect(before).toEqual([]);expect(after).toEqual([]);expect(app.getTransactionStatus()).toBe('I');
  },45000);
  it('PSG11 native top-level error synchronizes aborted backend and 25P02; explicit rollback releases own transaction without catalog or registry effects',async()=>{
    const identity=await originalLogin(app,appRole),catalog=await controlCatalog(),rows=await registryRows();
    await query(app,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(app,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
    const held=(await query(admin,"SELECT mode,granted,database::text lock_database,classid::text classid,objid::text objid,objsubid FROM pg_catalog.pg_locks WHERE pid=$1 AND locktype='advisory'",[identity.pid])).rows;
    expect(held).toHaveLength(1);expect(held[0]).toMatchObject({mode:'ShareLock',granted:true});
    try{
      const code=await rejected(app,'SELECT 1 / 0'),immediate=app.getTransactionStatus();const aborted=await synchronizedNativeAbort(app,appRole,identity.pid);
      const replay=await rejected(app,'SELECT 1');const afterAbort=(await query(admin,"SELECT mode,granted FROM pg_catalog.pg_locks WHERE pid=$1 AND locktype='advisory'",[identity.pid])).rows;
      record({caseId:'PSG11',identity,held,code,immediate,aborted,replay,afterAbort});expect(code).toBe('22012');expect(replay).toBe('25P02');expect(app.getTransactionStatus()).toBe('E');expect(afterAbort).toEqual([]);
    }finally{await query(app,'ROLLBACK');}
    expect(app.getTransactionStatus()).toBe('I');expect(await controlCatalog()).toEqual(catalog);expect(await registryRows()).toEqual(rows);assertPositive(await observe(app,appRole));
    record({caseId:'PSG11',stage:'EXACT_NATIVE_ABORT_ROLLBACK_RECONCILIATION',catalog:await controlCatalog(),rows:await registryRows()});
  },45000);
  it('PSG12 stale root observation denies; truthful new literal body recapture changes full startup bytes without claiming execution applicability',async()=>{
    const old=assertPositive(await observe(app,appRole)),original=rootSource.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION');
    const changed=original.replace('UNUSED_STARTUP_METADATA_ONLY','UNUSED_STARTUP_METADATA_CHANGED');expect(changed).not.toBe(original);
    const before=canonicalAclCatalog(await controlCatalog()),beforeRows=await registryRows();repairs.add('PSG12_ROOT_BYTES');
    try{
      await installerTransaction(async()=>{await query(admin,changed);});const stale=await observe(app,appRole);
      record({caseId:'PSG12',stage:'CHANGED_NATIVE_ROOT_WITH_STALE_REGISTRY',stale,root:await native(portal.oid)});expect(stale.rows).toEqual([]);
      await installerTransaction(async()=>{await recapture();});const current=assertPositive(await observe(app,appRole));
      record({caseId:'PSG12',stage:'HONEST_NEW_NATIVE_BODY_OBSERVATION_DIFFERS_FROM_RETAINED_SOURCE',old,current,changedSourceSHA256:hash(changed),claim:'NEW_METADATA_OBSERVATION_NOT_APPROVED_ROOT_SOURCE_OR_RUNTIME_BUILD'});
      expect(current.startup.rootOid).toBe(old.startup.rootOid);expect(current.startup.rootDefinition).not.toBe(old.startup.rootDefinition);
      expect(current.startup.rootDefinitionSha256).not.toBe(old.startup.rootDefinitionSha256);expect(current.startup.nativeAuditCapsuleText).not.toBe(old.startup.nativeAuditCapsuleText);
      expect(current.startup.nativeAuditCapsuleSha256).not.toBe(old.startup.nativeAuditCapsuleSha256);
    }finally{
      await installerTransaction(async()=>{await query(admin,original);await query(admin,'DELETE FROM nevora_tenancy.audited_helper_capability');for(const row of beforeRows)await writeCapability(row);});
      expect(canonicalAclCatalog(await controlCatalog())).toEqual(before);expect(await registryRows()).toEqual(beforeRows);
      const restored=assertPositive(await observe(app,appRole));expect(restored.startup).toEqual(old.startup);repairs.delete('PSG12_ROOT_BYTES');
      record({caseId:'PSG12',stage:'ORIGINAL_ROOT_SOURCE_AND_NATIVE_CAPSULE_RESTORED',restored,catalog:await controlCatalog(),rows:await registryRows()});
    }
  },45000);
  afterAll(async()=>{
    let cleaned=false;
    const closure:{client:'ADMIN'|'INSTALLER_WRITER'|'FICTIONAL_LOGIN';status:string|null;closed:boolean;pid?:number}[]=[];
    try{
      if(verified&&admin)await reconcilePending();
      for(const client of clients)if(client!==admin){
        const status=client.getTransactionStatus()??null;if(['T','E'].includes(status??''))await query(client,'ROLLBACK');
        const identity=(await query(client,'SELECT pg_catalog.pg_backend_pid() pid,session_user::text session_role,current_user::text current_role,pg_catalog.current_setting(\'role\') effective_role')).rows[0];
        record({operation:'EXACT_OWN_CLIENT_BEFORE_CLOSE',identity,status});await client.end();closedClients.add(client);
        closure.push({client:client===writer?'INSTALLER_WRITER':'FICTIONAL_LOGIN',status,closed:true,pid:identity.pid});
      }
      if(verified&&admin){
        if(['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');await checkBase();
        expect(repairs.size).toBe(0);expect(pendingFenceAttempts.size).toBe(0);
        if(finalCatalog){
          const catalog=await controlCatalog(),rows=await registryRows(),bindings=await bindingRows(),roleRows=await roleCatalog();
          record({operation:'FINAL_GRAPH_NATIVE_SOURCE_BEFORE_EXACT_DROP',originalCatalog:finalCatalog,catalog,originalRows:finalRows,rows,originalBindings:finalBindings,bindings,originalRoles:finalRoles,roleRows,sourcePins,graphSHA256});
          expect(canonicalAclCatalog(catalog)).toEqual(canonicalAclCatalog(finalCatalog));expect(rows).toEqual(finalRows);expect(bindings).toEqual(finalBindings);expect(roleRows).toEqual(finalRoles);
          expect(objects).toHaveLength(11);expect(roles).toHaveLength(4);expect(clients.size).toBe(5);
        }
        // No CASCADE or adoption: each current target name/signature must still
        // resolve to the exact retained OID and owner before its exact DROP.
        for(const object of [...objects].reverse())if(!object.dropped)await dropObject(object);
        for(const owned of [...roles].reverse()){
          const rows=(await query(admin,'SELECT oid::text oid,rolname::text name FROM pg_catalog.pg_roles WHERE rolname=$1 OR oid=$2::oid',[owned.name,owned.oid])).rows;
          if(rows.length===0&&!fixtureSetupCommitted)continue;expect(rows).toEqual([{oid:owned.oid,name:owned.name}]);
          await query(admin,'REVOKE CONNECT ON DATABASE '+q(lease.database)+' FROM '+q(owned.name));await query(admin,'DROP ROLE '+q(owned.name));
          expect((await query(admin,'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2',[owned.oid,owned.name])).rows).toEqual([]);
          record({operation:'EXACT_FICTIONAL_ROLE_DROPPED',...owned});
        }
        expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
        for(const [file,pin] of Object.entries(sourcePins))expect(hash(readFileSync(resolve('src/lib/tenancy/runtime',file)))).toBe(pin);
        expect(hash(readFileSync(graphPath!))).toBe(graphSHA256);cleaned=true;
        record({operation:'EXACT_OWN_GRAPH_OBJECTS_AND_ROLES_ABSENT',objects,roles,sourcePins,graphSHA256});
      }
    }finally{
      for(const client of clients)if(!closedClients.has(client)){
        const status=client.getTransactionStatus()??null;
        try{await client.end();closedClients.add(client);closure.push({client:client===admin?'ADMIN':client===writer?'INSTALLER_WRITER':'FICTIONAL_LOGIN',status,closed:true});}
        catch{closure.push({client:client===admin?'ADMIN':client===writer?'INSTALLER_WRITER':'FICTIONAL_LOGIN',status,closed:false});}
      }
      password='';
      if(runVerified){
        const operationsPath=join(runPath!,'portal-startup-graph-operations.jsonl');
        if(!existsSync(operationsPath))writeFileSync(operationsPath,'',{flag:'wx',mode:0o600});
        const operations=await verifyCompleteNativeJsonl(operationsPath,records,{requireCanonicalLines:true});expect(operations.count).toBe(records.length);
        writeFileSync(join(runPath!,'portal-startup-graph-cleanup.json'),JSON.stringify({verified,fixtureSetupCommitted,cleaned,roles,objects,closure,
          connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingRepairs:repairs.size,pendingFenceAttempts:pendingFenceAttempts.size,
          actualSQLAttempted:sqlAttempted,operations,sourcePins,graphSHA256,
          scope:'EXACT_OWN_EMPTY_BASE_CATALOG_METADATA_ONLY_NO_DATABASE_DROP_CLUSTER_CONTROL_TENANT_SOURCE_OR_ROOT_HELPER_CALL',
          claim:'PROPOSED_CALLBACKS_UNEXECUTED_UNTIL_ROOT_ACTUAL_NO_AUTHORITY_BUILD_ATTESTATION_CURRENT_PROOF_RLS_NEON_FULL_F10_OR_INDEPENDENT_F12'},null,2),{flag:'wx',mode:0o600});
      }
    }
  },60000);
});
