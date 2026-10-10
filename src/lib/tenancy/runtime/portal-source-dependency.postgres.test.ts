import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import { appendFileSync, existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const sourcePath = resolve('src/lib/tenancy/runtime/control-storage.sql');
const source = readFileSync(sourcePath, 'utf8');
const testPath = resolve('src/lib/tenancy/runtime/portal-source-dependency.postgres.test.ts');
const auditedStoragePath = resolve('src/lib/tenancy/runtime/audited-helper-storage.sql');
const auditedGuardPath = resolve('src/lib/tenancy/runtime/audited-role-guard.sql');
const expectedAuditedStorageSHA256 = '2a7d8c979e5e854ddd0e516a07ce20eed15365efcfb1c21812ffffe9e31d9603';
const expectedAuditedGuardSHA256 = 'ba0b4617d66892ad350e42221e9ad1dc27b406c35d5103b9eba28b08ea6a02e0';
const sourcePins: Readonly<Record<string, string>> = {
  'src/lib/tenancy/runtime/control-storage.sql': '4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66',
  'src/lib/tenancy/runtime/audited-helper-storage.sql': expectedAuditedStorageSHA256,
  'src/lib/tenancy/runtime/portal-source-locks.sql': 'fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03',
  'src/lib/tenancy/runtime/portal-source-observation.sql': '72b6509933ca2bbd73fbb11eae7232db40bf5f5eafd94be56e291f236ff83dc7',
  'src/lib/tenancy/runtime/audited-role-guard.sql': expectedAuditedGuardSHA256,
  'src/lib/tenancy/runtime/audited-role-guard-installer.sql': 'cfbe111978adc37a1ce0025ce843fb37e7e43b71f568c3dd01c68b126c23f7d5',
  'src/lib/tenancy/runtime/original-runtime-login.sql': '0993c3ba476cc8dab6d80ee2e0287ba9d18072b3dab99aee8bcab23814c4e6b8',
  'src/lib/tenancy/runtime/original-runtime-login-installer.sql': 'a63f71569af622928d879c1b6759440a42f20f9f599efd24eb80bfb2e1be584f',
};
const leasePath = process.env.F_PD_OWNED_LEASE, runPath = process.env.F_PD_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string; root: string; data: string;
  pid: number; pidStart: string; port: number; systemIdentifier: string; database: string; databaseOid: string | number;
  marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string };
type ObjectReceipt = { kind: 'schema' | 'table' | 'sequence' | 'function' | 'trigger' | 'policy'; schema: string;
  name: string; oid: string; ownerOid: string; signature?: string; dropped: boolean; relation?: string };
type Settings = { oid: string; definition: string; rules: string[] };
// Graph-only capsule fixture: no original source tables, successful reader/kernel calls,
// function activation, current-proof assertions, grants to source rows or RLS policy.
// Literal roots are never called and cannot establish domain body approval.
describe.skipIf(!leasePath && !runPath)('owned PG18 fixed Portal source dependency graph observations only', () => {
  let lease: Lease, admin: Client, settings: Settings, appRole: Role, workerRole: Role, outsiderRole: Role, ownerRole: Role, unrelatedOwnerRole: Role;
  let app: Client, worker: Client, outsider: Client;
  let password = '', installerOid = '', verified = false, runVerified = false, fixtureSetupCommitted = false;
  let auditedStorage = '', auditedGuard = '', sqlAttempted = false;
  let reader: ObjectReceipt, kernel: ObjectReceipt, portal: ObjectReceipt, calendar: ObjectReceipt, triggerFunction: ObjectReceipt, route: ObjectReceipt;
  let finalCatalog: Awaited<ReturnType<typeof controlCatalog>>, finalRows: Record<string, unknown>[], finalBindings: Record<string, unknown>[], finalRoles: Awaited<ReturnType<typeof roleCatalog>>;
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
    catch (error) { throw new Error('owned_portal_dependency_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    const captured=JSON.stringify(value);records.push(JSON.parse(captured));
    appendFileSync(join(runPath!, 'portal-source-dependency-operations.jsonl'), captured + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); }
    catch { throw new Error('owned_portal_dependency_connection_failed'); }
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
      if(Date.now()>=deadline){record({caseId:'SD02',operation:'EXACT_NATIVE_ABORT_SYNCHRONIZATION_TIMED_OUT',pid,owned,observations});throw new Error('owned_portal_dependency_native_abort_timeout');}
      await new Promise(resolve=>setTimeout(resolve,10));
    }
  }
  const businessName = () => lease.invocation + '_dependency_route';
  const business = () => 'public.' + q(businessName());
  const portalSource = `CREATE FUNCTION nevora_tenancy.resolve_portal(pg_catalog.text,pg_catalog.text)
    RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
    AS $fictional_direct$ SELECT '{"fixture":"audited-direct-only"}'::pg_catalog.jsonb $fictional_direct$`;
  const calendarSource = `CREATE FUNCTION nevora_tenancy.resolve_calendar(pg_catalog.text) RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY DEFINER SET search_path=pg_catalog AS $fictional_undeclared$ SELECT '{"fixture":"undeclared-dependency-owner-only"}'::pg_catalog.jsonb $fictional_undeclared$`;
  const triggerSource = `CREATE FUNCTION nevora_tenancy.source_write_fence()
    RETURNS pg_catalog.trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
    AS $fictional_trigger$ BEGIN RETURN NULL; END $fictional_trigger$`;
  const helperSources = () => [
    ['portal-source-locks.sql', 'lock_portal_source_rows', '$portal_source_locks$'],
    ['portal-source-observation.sql', 'read_portal_source_rows', '$portal_source_observation$'],
  ] as const;
  function helperFragment(name: string, delimiter: string) {
    const whole = readFileSync(resolve('src/lib/tenancy/runtime/' + name), 'utf8');
    expect(hash(whole)).toBe(sourcePins['src/lib/tenancy/runtime/' + name]);
    const start = whole.indexOf('CREATE FUNCTION nevora_tenancy.');
    const end = whole.indexOf(delimiter + ';', start) + delimiter.length + 1;
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start); return whole.slice(start, end);
  }
  function nativeQuery(select: string) {
    const start = '-- AUDITED_NATIVE_CTES_BEGIN', end = '-- AUDITED_NATIVE_CTES_END';
    expect(auditedGuard.split(start)).toHaveLength(2); expect(auditedGuard.split(end)).toHaveLength(2);
    return 'WITH ' + auditedGuard.slice(auditedGuard.indexOf(start) + start.length, auditedGuard.indexOf(end)).trim() + '\n' + select;
  }
  async function native(oid: string) {
    const rows = (await query(admin, nativeQuery(`SELECT f.observation,f.source_sha256,o.observation owner_observation,o.acl_observation owner_acl_observation
      FROM audit_functions f LEFT JOIN audit_owners o ON o.oid=f.owner_oid WHERE f.oid=$1::oid`), [oid])).rows;
    expect(rows).toHaveLength(1); expect(rows[0].observation.oid).toBe(oid);
    expect(rows[0].source_sha256).toBe(hash(rows[0].observation.definition)); return rows[0];
  }
  async function bindingRows(): Promise<Record<string, unknown>[]> {
    return (await query(admin, `SELECT pg_catalog.to_jsonb(b) value FROM nevora_tenancy.runtime_role_binding b ORDER BY b.kind COLLATE pg_catalog."C"`)).rows.map(row=>row.value);
  }
  async function registryRows(): Promise<Record<string, unknown>[]> {
    return (await query(admin, `SELECT pg_catalog.to_jsonb(c) value FROM nevora_tenancy.audited_helper_capability c ORDER BY c.runtime_kind,c.route_kind,c.function_oid,c.route_oid`)).rows.map(row => row.value);
  }
  async function writeCapability(row: Record<string, unknown>) {
    const columns = ['runtime_kind', 'route_kind', 'function_oid', 'route_oid', 'function_observation', 'owner_observation', 'owner_acl_observation', 'dependencies', 'route_observation', 'review_reference', 'review_source_sha256', 'owner_lock_columns'];
    const jsonColumns = ['function_observation', 'owner_observation', 'owner_acl_observation', 'dependencies', 'route_observation', 'owner_lock_columns'];
    await query(admin, 'INSERT INTO nevora_tenancy.audited_helper_capability(' + columns.map(q).join(',') + ') VALUES(' + columns.map((column, i) => '$' + (i + 1) + (jsonColumns.includes(column) ? '::jsonb' : '')).join(',') + ')', columns.map(column => jsonColumns.includes(column) ? row[column] === null ? null : JSON.stringify(row[column]) : row[column]));
  }
  async function capture(overrides: Record<string, unknown[]> = {}) {
    expect(admin.getTransactionStatus()).toBe('T');
    const before = await registryRows();
    const pair = [(await native(reader.oid)).observation, (await native(kernel.oid)).observation];
    const roots = [portal, calendar, triggerFunction];
    const nativeRoots: Awaited<ReturnType<typeof native>>[] = [];
    for (const root of roots) nativeRoots.push(await native(root.oid));
    const nativeRoute = (await query(admin, nativeQuery('SELECT observation FROM audit_routes WHERE oid=$1::oid'), [route.oid])).rows[0].observation;
    const provisional = roots.map((root, i) => ({ runtime_kind: 'APP', route_kind: root === triggerFunction ? 'TRIGGER_ROUTE' : 'DIRECT_CALL', function_oid: root.oid, route_oid: root === triggerFunction ? route.oid : '0',
      function_observation: nativeRoots[i].observation, owner_observation: {}, owner_acl_observation: {}, dependencies: overrides[root.oid] ?? (root === portal ? pair : []),
      route_observation: root === triggerFunction ? nativeRoute : null, review_reference: 'ROOT_FICTIONAL_GRAPH_ONLY:' + lease.invocation,
      review_source_sha256: nativeRoots[i].source_sha256, owner_lock_columns: [] }));
    await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability'); for (const row of provisional) await writeCapability(row);
    const fresh = await native(portal.oid);
    for (const row of provisional) await query(admin, `UPDATE nevora_tenancy.audited_helper_capability SET owner_observation=$1::jsonb,owner_acl_observation=$2::jsonb WHERE function_oid=$3::oid`, [JSON.stringify(fresh.owner_observation), JSON.stringify(fresh.owner_acl_observation), row.function_oid]);
    const current = await registryRows();
    for (const row of current) { expect(row.owner_observation).toEqual(fresh.owner_observation); expect(row.owner_acl_observation).toEqual(fresh.owner_acl_observation); }
    record({ operation: 'ACTUAL_NATIVE_CAPSULE_BOOTSTRAP_OWN_TRANSACTION', before, pair, provisional, freshOwner: fresh, current, noBooleanConstructor: true, scope: 'METADATA_ONLY_NOT_ROOT_BODY_APPROVAL_OR_AUTHORITY' }); return current;
  }
  async function admitted(root: ObjectReceipt = portal) {
    const rows = (await query(admin, nativeQuery('SELECT function_oid::text function_oid FROM audit_capabilities WHERE function_oid=$1::oid ORDER BY function_oid'), [root.oid])).rows;
    return rows.length !== 0;
  }
  async function mutation(caseId: string, body: () => Promise<void>) {
    const before = canonicalAclCatalog(await controlCatalog()), beforeRows = await registryRows(), beforeRoles = await roleCatalog();
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED'); await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    try { await body(); record({ caseId, changedCatalog: await controlCatalog(), changedRows: await registryRows(), changedRoles: await roleCatalog() }); }
    finally { await query(admin, 'ROLLBACK'); }
    expect(admin.getTransactionStatus()).toBe('I'); expect(canonicalAclCatalog(await controlCatalog())).toEqual(before);
    expect(await registryRows()).toEqual(beforeRows); expect(await roleCatalog()).toEqual(beforeRoles); record({ caseId, stage: 'EXACT_ROLLBACK_RESTORATION', before, after: await controlCatalog(), beforeRows, afterRows: await registryRows() });
  }
  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath);
    expect(realpathSync(runPath!)).toBe(runPath);
    const currentUid = process.getuid?.(); expect(currentUid !== undefined).toBe(true);
    const leaseStat = lstatSync(leasePath!);
    expect(leaseStat.isFile() && !leaseStat.isSymbolicLink()).toBe(true);
    expect(leaseStat.uid).toBe(currentUid); expect(leaseStat.mode & 0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(currentUid);
    runVerified = true;
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.marker).toBe('f10-owned:' + lease.invocation);
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:runtime-role:' + lease.invocation);
    expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root);
    expect(realpathSync(lease.data)).toBe(join(lease.root, 'data'));
    expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data);
    expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credentialStat = lstatSync(lease.credentialFile);
    expect(credentialStat.isFile() && !credentialStat.isSymbolicLink()).toBe(true);
    expect(credentialStat.uid).toBe(currentUid); expect(credentialStat.mode & 0o777).toBe(0o600);
    expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);
    expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    for (const [path, pin] of Object.entries(sourcePins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
    auditedStorage = readFileSync(auditedStoragePath, 'utf8'); auditedGuard = readFileSync(auditedGuardPath, 'utf8');
    expect(hash(auditedStorage)).toBe(expectedAuditedStorageSHA256);
    expect(hash(auditedGuard)).toBe(expectedAuditedGuardSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/catalog-fence.server.ts')))).toBe('2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f');
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user);
    const actual = await checkBase();
    installerOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid as string;
    expect((await query(admin, 'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid', [String(lease.databaseOid)])).rows).toEqual([{ owner: installerOid }]);
    expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, `SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')`)).rows).toEqual([]);
    verified = true;
    record({ operation: 'EXACT_ROOT_BASE_VERIFIED', actual, sourceSHA256: hash(source),
      testSHA256: hash(readFileSync(testPath)), claim: 'GRAPH_CAPSULE_ONLY_NOT_HELPER_INSTALLATION_CALLER_AUTHORITY_CURRENT_PROOF_RLS_OR_F10' });
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    try {
      appRole = await role(lease.invocation + '_app');
      workerRole = await role(lease.invocation + '_worker');
      outsiderRole = await role(lease.invocation + '_outsider');
      ownerRole = await role(lease.invocation + '_owner', false);
      unrelatedOwnerRole = await role(lease.invocation + '_unrelated_owner', false);
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + [appRole,workerRole,outsiderRole].map(r => q(r.name)).join(','));
      await query(admin, 'COMMIT'); fixtureSetupCommitted = true;
    } catch {
      if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
      throw new Error('owned_control_fictional_role_setup_failed');
    }
    settings = await settingsSource();
    record({ operation: 'NATIVE_PG18_SETTINGS_OBSERVED_NOT_BOUND', settings, roles,
      assertion: 'AUDITED_ARTIFACTS_HAVE_NOT_INSTALLED_AND_NO_CAPABILITY_ROWS_OR_HELPER_GRANTS_EXIST' });
    await query(admin, 'CREATE SCHEMA nevora_tenancy'); await remember('schema', '', 'nevora_tenancy', installerOid);
    await query(admin, source); await remember('table', 'nevora_tenancy', 'runtime_role_binding', installerOid);
    await query(admin, auditedStorage); await remember('table', 'nevora_tenancy', 'audited_helper_capability', installerOid);
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED'); await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    try {
      await query(admin, `INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules)
        VALUES($1,$2,$3::oid,$7::oid,$8,$9::text[]),($4,$5,$6::oid,$7::oid,$8,$9::text[])`, ['APP',appRole.name,appRole.oid,'WORKER',workerRole.name,workerRole.oid,settings.oid,settings.definition,settings.rules]);
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + [appRole.name,workerRole.name,ownerRole.name,unrelatedOwnerRole.name].map(q).join(','));
      for (const [file, name, delimiter] of helperSources()) {
        const fragment = helperFragment(file, delimiter); await query(admin, fragment);
        await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.' + name + '(text,text,bpchar) FROM PUBLIC');
        await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.' + name + '(text,text,bpchar) TO ' + q(ownerRole.name));
        const item = await remember('function','nevora_tenancy',name,installerOid,'(text,text,bpchar)');
        if (name === 'read_portal_source_rows') reader=item; else kernel=item;
        record({ operation:'EXACT_ACCEPTED_HELPER_CREATE_FRAGMENT_ONLY',file,wholeSourceSHA256:sourcePins['src/lib/tenancy/runtime/'+file],fragment,fragmentSHA256:hash(fragment),object:item,neverCalled:true,wholeInstallerOrRLSClaim:false });
      }
      for (const [body,name,signature] of [[portalSource,'resolve_portal','(text,text)'],[calendarSource,'resolve_calendar','(text)'],[triggerSource,'source_write_fence','()']] as const) {
        await query(admin, body); await query(admin, 'ALTER FUNCTION nevora_tenancy.'+name+signature+' OWNER TO '+q(ownerRole.name));
        await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.'+name+signature+' FROM PUBLIC');
        if (name !== 'source_write_fence') await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.'+name+signature+' TO '+q(appRole.name));
        const item=await remember('function','nevora_tenancy',name,ownerRole.oid,signature);
        if(name==='resolve_portal')portal=item; else if(name==='resolve_calendar')calendar=item; else triggerFunction=item;
        record({ operation:'KNOWN_LITERAL_ROOT_METADATA_ONLY',body,bodySHA256:hash(body),object:item,neverCalled:true,domainBodyApproval:false });
      }
      await query(admin,'CREATE TABLE '+business()+'(id pg_catalog.int4 PRIMARY KEY)');await remember('table','public',businessName(),installerOid);
      await query(admin,'GRANT UPDATE(id) ON TABLE '+business()+' TO '+q(appRole.name));
      const triggerName=lease.invocation+'_dependency_trigger';
      await query(admin,'CREATE TRIGGER '+q(triggerName)+' AFTER UPDATE ON '+business()+' FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence()');
      const found=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_trigger WHERE tgrelid=pg_catalog.to_regclass($1) AND tgname=$2',[business(),triggerName])).rows[0];
      route={kind:'trigger',schema:'public',name:triggerName,oid:found.oid,ownerOid:installerOid,relation:business(),dropped:false};objects.push(route);record({operation:'EXACT_GRAPH_TRIGGER_ROUTE',...route});
      await capture();await query(admin,'COMMIT');
    } finally {if(['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');}
    app=await connect(appRole.name);worker=await connect(workerRole.name);outsider=await connect(outsiderRole.name);
    for(const [client,owned] of [[app,appRole],[worker,workerRole],[outsider,outsiderRole]] as const)await originalLogin(client,owned);
    finalCatalog=await controlCatalog();finalRows=await registryRows();finalBindings=await bindingRows();finalRoles=await roleCatalog();
    expect(objects).toHaveLength(10);expect(roles).toHaveLength(5);expect(clients.size).toBe(4);
    writeFileSync(join(runPath!,'portal-source-dependency-fixture-custody.json'),JSON.stringify({base:actual,roles,objects,sourcePins,sourceCatalog:finalCatalog,sourceRows:finalRows,bindingRows:finalBindings,clients:4,scope:'GRAPH_ONLY_NO_SUCCESSFUL_RAW_READER_OR_ROOT_CALL_NO_INSTALLATION_RLS_AUTHORITY'},null,2),{flag:'wx',mode:0o600});
  },45000);
  it('SD01 actual complete helper pair admits only the genuinely observed Portal dependency graph',async()=>{
    let oldGuard = auditedGuard;
    for (const name of ['PORTAL_SOURCE_DEPENDENCY_ADMISSION', 'PORTAL_SOURCE_DEPENDENCY_CTES']) {
      const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
      expect(oldGuard.split(start)).toHaveLength(2); expect(oldGuard.split(end)).toHaveLength(2);
      const after = oldGuard.indexOf(end) + end.length;
      expect(oldGuard.slice(after, after + 1)).toBe('\n');
      oldGuard = oldGuard.slice(0, oldGuard.indexOf(start)) + oldGuard.slice(after + 1);
    }
    expect(hash(oldGuard)).toBe('28ce7c57e59426c12437fb4c14ded3e48c074ff67c9051ac36ae3e180c83443f');
    const start = '-- AUDITED_NATIVE_CTES_BEGIN', end = '-- AUDITED_NATIVE_CTES_END';
    const oldCommand = 'WITH ' + oldGuard.slice(oldGuard.indexOf(start) + start.length, oldGuard.indexOf(end)).trim() +
      '\nSELECT function_oid::text function_oid FROM audit_capabilities WHERE function_oid=$1::oid';
    const beforeRows = await registryRows();
    const oldRows = (await query(admin, oldCommand, [portal.oid])).rows;
    expect(oldRows).toEqual([]); expect(await registryRows()).toEqual(beforeRows);
    record({caseId:'SD01',stage:'PRIOR_BYTE_EXACT_NATIVE_GRAPH_CONTROL_DENIES_SAME_GENUINE_PAIR',oldGuardSHA256:hash(oldGuard),oldCommandSHA256:hash(oldCommand),oldRows,rows:beforeRows,rootBodiesNeverCalled:true});
    const actual=await admitted();record({caseId:'SD01',stage:'CURRENT_NATIVE_GRAPH_ADMITS_SAME_GENUINE_PAIR',actual,rows:await registryRows(),catalog:await controlCatalog(),sourcePins,rootBodiesNeverCalled:true});expect(actual).toBe(true);
    expect(await registryRows()).toEqual(beforeRows);
    expect(await admitted(calendar)).toBe(true);expect(await admitted(triggerFunction)).toBe(true);
    expect((await query(admin,'SELECT * FROM '+business())).rows).toEqual([]);
  },45000);
  it('SD02 native pair binds exact body metadata owner OID and full observed descriptors',async()=>{
    const rows=(await query(admin,nativeQuery('SELECT n.name,n.function_oid::text function_oid,n.observation FROM audit_portal_source_native n ORDER BY n.name'))).rows;
    expect(rows.map(x=>x.name)).toEqual(['lock_portal_source_rows','read_portal_source_rows']);
    for(const row of rows){expect(row.observation).toMatchObject({ownerOid:installerOid,argumentTypeOids:['25','25','1042'],configuration:['search_path=pg_catalog'],securityDefiner:false,returnsSet:false,supportFunctionOid:'0'});expect(row.observation).toEqual((await native(row.function_oid)).observation);}
    const scopes=(await query(admin,nativeQuery('SELECT root_function_oid::text root_function_oid,function_oid::text function_oid,observation FROM audit_portal_source_dependency_current ORDER BY function_oid'))).rows;
    expect(scopes).toHaveLength(2);expect(scopes.every(x=>x.root_function_oid===portal.oid)).toBe(true);record({caseId:'SD02',rows,scopes});
    for(const [client,owned] of [[app,appRole],[worker,workerRole],[outsider,outsiderRole]] as const){
      const before=await originalLogin(client,owned);
      for(const name of ['read_portal_source_rows','lock_portal_source_rows']){
        const privilege=(await query(admin,`SELECT pg_catalog.has_function_privilege($1::oid,$2::oid,'EXECUTE') allowed`,[owned.oid,name==='read_portal_source_rows'?reader.oid:kernel.oid])).rows[0].allowed;
        await query(client, 'BEGIN ISOLATION LEVEL READ COMMITTED');
        const code=await rejected(client,'SELECT nevora_tenancy.'+name+'($1::text,$2::text,$3::bpchar)',['fictional-unread-workspace','fictional-unread-employee','a'.repeat(64)]);
        // pg can reject query() before ReadyForQuery updates its cached status.
        // Preserve that immediate observation and independently verify the exact
        // original backend's native aborted state plus processed client E.
        const immediateStatus=client.getTransactionStatus();
        const nativeAbort=await synchronizedNativeAbort(client,owned,before.pid);
        const replayCode=await rejected(client,'SELECT 1');
        const replayNativeAbort=await synchronizedNativeAbort(client,owned,before.pid);
        const synchronizedStatus=client.getTransactionStatus();
        await query(client,'ROLLBACK');
        const after=await originalLogin(client,owned);record({caseId:'SD02',operation:'ORIGINAL_LOGIN_UNGRANTED_CALL_DENIED_BEFORE_BODY',name,owned,privilege,code,before,after,immediateStatus,nativeAbort,replayCode,replayNativeAbort,synchronizedStatus,noSuccessfulHelperCall:true});
        expect(privilege).toBe(false);expect(code).toBe('42501');expect(['T','E']).toContain(immediateStatus);expect(nativeAbort.clientStatus).toBe('E');expect(nativeAbort.rows[0].state).toBe('idle in transaction (aborted)');expect(replayCode).toBe('25P02');expect(replayNativeAbort.clientStatus).toBe('E');expect(replayNativeAbort.rows[0].state).toBe('idle in transaction (aborted)');expect(synchronizedStatus).toBe('E');expect(after).toEqual(before);expect(client.getTransactionStatus()).toBe('I');
      }
    }
  },45000);
  it('SD03 missing either descriptor empty pair and duplicate retained observation are denied without defaulting',async()=>{
    const pair=[(await native(reader.oid)).observation,(await native(kernel.oid)).observation];
    for(const deps of [[],[pair[0]],[pair[1]],[...pair,pair[0]]])await mutation('SD03',async()=>{
      await capture({[portal.oid]:deps});
      const helperRows=(await query(admin,nativeQuery(`SELECT dependency.function_oid::text function_oid
        FROM audit_portal_source_dependency_current dependency JOIN audit_capabilities current
          ON current.function_oid=dependency.root_function_oid AND current.runtime_kind=dependency.runtime_kind
          AND current.route_kind=dependency.route_kind AND current.route_oid=dependency.route_oid
        WHERE dependency.root_function_oid=$1::oid ORDER BY dependency.function_oid`),[portal.oid])).rows;
      const rootAdmitted=await admitted();const actual=helperRows.length!==0;
      record({caseId:'SD03',deps,actual,helperRows,rootAdmitted,scope:'HELPER_PAIR_ADMISSION_NOT_UNCHANGED_EMPTY_DEPENDENCY_ROOT_METADATA'});
      expect(actual).toBe(false);expect(helperRows).toEqual([]);
      if(deps.length===0)expect(rootAdmitted).toBe(true);else expect(rootAdmitted).toBe(false);
    });
  },45000);
  it('SD04 changed exact helper body denies even after honest native descriptor and owner recapture',async()=>{
    await mutation('SD04',async()=>{
      const fragment=helperFragment('portal-source-observation.sql','$portal_source_observation$').replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('DECLARE observed pg_catalog.jsonb;','-- own graph-negative source delta\nDECLARE observed pg_catalog.jsonb;');
      await query(admin,fragment);await capture();const actual=await admitted();expect(actual).toBe(false);
      const matched=(await query(admin,nativeQuery('SELECT name FROM audit_portal_source_native ORDER BY name'))).rows;expect(matched).toEqual([{name:'lock_portal_source_rows'}]);record({caseId:'SD04',fragmentSHA256:hash(fragment),actual,matched});
    });
  },45000);
  it('SD05 changed invoker metadata cannot be adopted through a freshly captured matching JSON descriptor',async()=>{
    for(const change of ['STABLE','PARALLEL SAFE','SECURITY DEFINER','SET search_path=pg_catalog,nevora_tenancy'])await mutation('SD05',async()=>{
      await query(admin,'ALTER FUNCTION nevora_tenancy.read_portal_source_rows(text,text,bpchar) '+change);await capture();
      const actual=await admitted();expect(actual).toBe(false);expect((await query(admin,nativeQuery('SELECT name FROM audit_portal_source_native ORDER BY name'))).rows).toEqual([{name:'lock_portal_source_rows'}]);record({caseId:'SD05',change,actual});
    });
  },45000);
  it('SD06 PUBLIC runtime unrelated and grant-option helper EXECUTE deny after complete native recapture',async()=>{
    for(const grantee of ['PUBLIC',q(appRole.name),q(workerRole.name),q(outsiderRole.name),q(ownerRole.name)+' WITH GRANT OPTION'])await mutation('SD06',async()=>{
      await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.read_portal_source_rows(text,text,bpchar) TO '+grantee);await capture();
      const actual=await admitted();record({caseId:'SD06',grantee,actual,helper:await native(reader.oid)});expect(actual).toBe(false);
    });
  },45000);
  it('SD07 absence of a declared pair creates no helper dependency admission or new root authority',async()=>{
    await mutation('SD07',async()=>{await capture({[portal.oid]:[]});expect(await admitted()).toBe(true);
      expect((await query(admin,nativeQuery('SELECT function_oid FROM audit_portal_source_dependency_current'))).rows).toEqual([]);
      record({caseId:'SD07',scope:'NO_DECLARED_DEPENDENCY_IS_NO_NEW_HELPER_ADMISSION_NOT_ROOT_AUTHORITY'});
    });
  },45000);
  it('SD08 non-Portal direct root and exact trigger route cannot acquire the helper pair by current native capsule alone',async()=>{
    const pair=[(await native(reader.oid)).observation,(await native(kernel.oid)).observation];
    for(const root of [calendar,triggerFunction])await mutation('SD08',async()=>{await capture({[root.oid]:pair});const actual=await admitted(root);expect(actual).toBe(false);expect(await admitted()).toBe(true);record({caseId:'SD08',root,actual});});
  },45000);
  it('SD09 stale native dependency owner source and descriptor fields cannot be substituted by clone or name-only claims',async()=>{
    const pair=[(await native(reader.oid)).observation,(await native(kernel.oid)).observation];
    for(const delta of [{oid:kernel.oid},{ownerOid:ownerRole.oid},{definition:'name-only'},{supportFunctionOid:'1'}])await mutation('SD09',async()=>{
      await capture({[portal.oid]:[{...pair[0],...delta},pair[1]]});const actual=await admitted();expect(actual).toBe(false);record({caseId:'SD09',delta,actual});
    });
  },45000);
  it('SD10 actual same-name helper replacement rejects the old OID descriptor and rollback restores original identity',async()=>{
    await mutation('SD10',async()=>{
      expect((await query(admin,'SELECT pg_catalog.to_regprocedure($1)::oid::text oid',['nevora_tenancy.read_portal_source_rows(text,text,bpchar)'])).rows).toEqual([{oid:reader.oid}]);
      await query(admin,'DROP FUNCTION nevora_tenancy.read_portal_source_rows(text,text,bpchar)');await query(admin,helperFragment('portal-source-observation.sql','$portal_source_observation$'));
      await query(admin,'REVOKE ALL ON FUNCTION nevora_tenancy.read_portal_source_rows(text,text,bpchar) FROM PUBLIC');await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.read_portal_source_rows(text,text,bpchar) TO '+q(ownerRole.name));
      const replacement=(await query(admin,'SELECT pg_catalog.to_regprocedure($1)::oid::text oid',['nevora_tenancy.read_portal_source_rows(text,text,bpchar)'])).rows[0].oid;expect(replacement).not.toBe(reader.oid);
      const actual=await admitted();record({caseId:'SD10',original:reader,replacement,oldRows:await registryRows(),nativeReplacement:await native(replacement),actual});expect(actual).toBe(false);
    });
  },45000);
  it('SD11 unsafe declaring owner native LOGIN and membership observations deny without fabricated safe flags',async()=>{
    for(const change of ['ALTER ROLE '+q(ownerRole.name)+' LOGIN','GRANT '+q(outsiderRole.name)+' TO '+q(ownerRole.name)])await mutation('SD11',async()=>{
      await query(admin,change);await capture();const actual=await admitted();expect(actual).toBe(false);record({caseId:'SD11',changeKind:change.startsWith('ALTER')?'OWNER_LOGIN':'MEMBERSHIP',actual,ownerNative:(await native(portal.oid)).owner_observation});
    });
  },45000);
  it('SD12 helper overload is refused even with exact accepted primary body and honestly refreshed declarations',async()=>{
    await mutation('SD12',async()=>{
      const fragment=helperFragment('portal-source-locks.sql','$portal_source_locks$').replace('p_session_token_hash pg_catalog.bpchar','p_session_token_hash pg_catalog.bpchar, p_fixture_extra pg_catalog.text');
      await query(admin,fragment);const signature='nevora_tenancy.lock_portal_source_rows(text,text,bpchar,text)';
      await query(admin,'REVOKE ALL ON FUNCTION '+signature+' FROM PUBLIC');const extra=(await query(admin,'SELECT pg_catalog.to_regprocedure($1)::oid::text oid',[signature])).rows[0].oid;
      await capture();const actual=await admitted();expect(actual).toBe(false);expect((await query(admin,nativeQuery('SELECT name FROM audit_portal_source_native ORDER BY name'))).rows).toEqual([{name:'read_portal_source_rows'}]);record({caseId:'SD12',signature,extra,fragmentSHA256:hash(fragment),actual});
    });
  },45000);
  it('SD13 each genuinely STRICT helper is rejected after complete native descriptor and declaring-owner recapture',async()=>{
    for(const helper of [reader,kernel])await mutation('SD13',async()=>{
      await query(admin,'ALTER FUNCTION nevora_tenancy.'+helper.name+'(text,text,bpchar) STRICT');
      const strict=(await query(admin,'SELECT proisstrict FROM pg_catalog.pg_proc WHERE oid=$1::oid',[helper.oid])).rows[0].proisstrict;
      await capture();const actual=await admitted();const matched=(await query(admin,nativeQuery('SELECT name FROM audit_portal_source_native ORDER BY name'))).rows;
      record({caseId:'SD13',helper,strict,actual,matched,recapturedNative:await native(helper.oid)});
      expect(strict).toBe(true);expect(actual).toBe(false);expect(matched).toEqual([{name:helper===reader?kernel.name:reader.name}]);
    });
  },45000);
  it('SD14 either bound runtime role owning either helper is rejected including WORKER owner with APP-only declarations',async()=>{
    for(const helper of [reader,kernel])for(const owned of [appRole,workerRole])await mutation('SD14',async()=>{
      await query(admin,'ALTER FUNCTION nevora_tenancy.'+helper.name+'(text,text,bpchar) OWNER TO '+q(owned.name));
      const current=(await query(admin,'SELECT proowner::text owner_oid FROM pg_catalog.pg_proc WHERE oid=$1::oid',[helper.oid])).rows[0];
      const rows=await capture();const actual=await admitted();const matched=(await query(admin,nativeQuery('SELECT name FROM audit_portal_source_native ORDER BY name'))).rows;
      record({caseId:'SD14',helper,owned,current,rows,actual,matched,scope:'RAW_RUNTIME_BINDING_OWNER_DENIAL_NOT_CURRENT_BINDING_AUTHORITY'});
      expect(current).toEqual({owner_oid:owned.oid});expect(rows.every(row=>row.runtime_kind==='APP')).toBe(true);
      expect(actual).toBe(false);expect(matched).toEqual([{name:helper===reader?kernel.name:reader.name}]);
    });
  },45000);
  it('SD15 an unrelated NOLOGIN grantee cannot acquire helper dependency admission through faithfully captured EXECUTE',async()=>{
    for(const helper of [reader,kernel])await mutation('SD15',async()=>{
      await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.'+helper.name+'(text,text,bpchar) TO '+q(unrelatedOwnerRole.name));
      const roleState=(await query(admin,'SELECT oid::text oid,rolcanlogin,rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE oid=$1::oid',[unrelatedOwnerRole.oid])).rows[0];
      const rows=await capture();const actual=await admitted();
      const dependencyRows=(await query(admin,nativeQuery('SELECT function_oid::text function_oid FROM audit_portal_source_dependency_current'))).rows;
      record({caseId:'SD15',helper,roleState,rows,actual,dependencyRows,nativeHelper:await native(helper.oid)});
      expect(roleState).toEqual({oid:unrelatedOwnerRole.oid,rolcanlogin:false,rolsuper:false,rolbypassrls:false});
      expect(rows.every(row=>(row.owner_observation as {oid:string}).oid!==unrelatedOwnerRole.oid)).toBe(true);
      expect(actual).toBe(false);expect(dependencyRows).toEqual([]);
    });
  },45000);
  it('SD16 a real parsed SQL custom edge plus changed helper body metadata is rejected without an isolated callgraph claim',async()=>{
    await mutation('SD16',async()=>{
      const replacement=`CREATE OR REPLACE FUNCTION nevora_tenancy.read_portal_source_rows(p_workspace_id pg_catalog.text,p_employee_id pg_catalog.text,p_session_token_hash pg_catalog.bpchar)
        RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog
        BEGIN ATOMIC SELECT nevora_tenancy.resolve_calendar(p_workspace_id); END`;
      await query(admin,replacement);
      const edges=(await query(admin,`SELECT d.classid::text classid,d.objid::text object_oid,d.refclassid::text refclassid,d.refobjid::text target_oid,d.deptype
        FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=$1::oid
        AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid=$2::oid ORDER BY d.deptype`,[reader.oid,calendar.oid])).rows;
      await capture();const actual=await admitted();const matched=(await query(admin,nativeQuery('SELECT name FROM audit_portal_source_native ORDER BY name'))).rows;
      record({caseId:'SD16',replacement,replacementSHA256:hash(replacement),edges,actual,matched,scope:'COMBINED_BODY_METADATA_AND_NATIVE_EDGE_REJECTION_NOT_ISOLATED_DAG_OR_HIDDEN_PLPGSQL_CALLGRAPH_PROOF'});
      expect(edges).toHaveLength(1);expect(edges[0]).toMatchObject({object_oid:reader.oid,target_oid:calendar.oid,deptype:'n'});
      expect((await native(reader.oid)).observation.language).toBe('sql');expect(actual).toBe(false);expect(matched).toEqual([{name:kernel.name}]);
    });
  },45000);
  afterAll(async()=>{
    let cleaned=false;
    const closure:{client:'ADMIN'|'FICTIONAL_LOGIN';status:string|null;closed:boolean}[]=[];
    try{
      for(const client of clients)if(client!==admin){
        const status=client.getTransactionStatus()??null;if(['T','E'].includes(status??''))await query(client,'ROLLBACK');
        await client.end();closedClients.add(client);closure.push({client:'FICTIONAL_LOGIN',status,closed:true});
      }
      if(verified&&admin){
        if(['T','E'].includes(admin.getTransactionStatus()??''))await query(admin,'ROLLBACK');await checkBase();
        expect(repairs.size).toBe(0);
        if(finalCatalog){
          const currentCatalog=await controlCatalog(),currentRows=await registryRows(),currentBindings=await bindingRows(),currentRoles=await roleCatalog();
          const emptyRoute=(await query(admin,'SELECT id FROM '+business())).rows;
          record({operation:'FINAL_GRAPH_SOURCE_BEFORE_EXACT_DROP',originalCatalog:finalCatalog,currentCatalog,originalRows:finalRows,currentRows,originalBindings:finalBindings,currentBindings,originalRoles:finalRoles,currentRoles,emptyRoute,sourcePins});
          expect(canonicalAclCatalog(currentCatalog)).toEqual(canonicalAclCatalog(finalCatalog));expect(currentRows).toEqual(finalRows);expect(currentBindings).toEqual(finalBindings);expect(currentRoles).toEqual(finalRoles);expect(emptyRoute).toEqual([]);
          expect(objects).toHaveLength(10);expect(roles).toHaveLength(5);expect(clients.size).toBe(4);
        }
        for(const object of [...objects].reverse())if(!object.dropped)await dropObject(object);
        for(const owned of [...roles].reverse()){
          const current=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[owned.name])).rows[0];
          if(!current&&!fixtureSetupCommitted)continue;expect(current).toEqual({oid:owned.oid});
          await query(admin,'REVOKE CONNECT ON DATABASE '+q(lease.database)+' FROM '+q(owned.name));await query(admin,'DROP ROLE '+q(owned.name));
          expect((await query(admin,'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2',[owned.oid,owned.name])).rows).toEqual([]);record({operation:'EXACT_FICTIONAL_ROLE_DROPPED',...owned});
        }
        expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin,`SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')`)).rows).toEqual([]);
        for(const [path,pin] of Object.entries(sourcePins))expect(hash(readFileSync(resolve(path)))).toBe(pin);
        cleaned=true;record({operation:'EXACT_OWN_GRAPH_OBJECTS_AND_ROLES_ABSENT',objects,roles,sourcePins});
      }
    }finally{
      for(const client of clients)if(!closedClients.has(client)){
        const status=client.getTransactionStatus()??null;
        try{await client.end();closedClients.add(client);closure.push({client:client===admin?'ADMIN':'FICTIONAL_LOGIN',status,closed:true});}
        catch{closure.push({client:client===admin?'ADMIN':'FICTIONAL_LOGIN',status,closed:false});}
      }
      password='';
      if(runVerified){
        const operationsPath=join(runPath!,'portal-source-dependency-operations.jsonl');
        if(!existsSync(operationsPath))writeFileSync(operationsPath,'',{flag:'wx',mode:0o600});
        const bytes=readFileSync(operationsPath),lines=bytes.toString('utf8').split('\n');expect(lines.pop()).toBe('');expect(Buffer.from(bytes.toString('utf8'),'utf8').equals(bytes)).toBe(true);
        const parsed=lines.map(line=>JSON.parse(line));expect(parsed.length).toBe(records.length);
        for(let index=0;index<parsed.length;index++)expect(JSON.stringify(parsed[index])).toBe(JSON.stringify(records[index]));
        writeFileSync(join(runPath!,'portal-source-dependency-cleanup.json'),JSON.stringify({verified,fixtureSetupCommitted,cleaned,roles,objects,closure,
          connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingRepairs:repairs.size,pendingFenceAttempts:0,
          actualSQLAttempted:sqlAttempted,operations:{filename:'portal-source-dependency-operations.jsonl',count:parsed.length,bytes:bytes.length,SHA256:hash(bytes),completeUTF8JSONL:true},sourcePins,
          scope:'EXACT_OWN_EMPTY_BASE_GRAPH_CAPSULE_ONLY_NO_DATABASE_DROP_CLUSTER_CONTROL_PRIVATE_SOURCE_POLICY_OR_SUCCESSFUL_HELPER_CALL',
          claim:'PREPARED_SUITE_NOT_ACTUAL_NATIVE_SUCCESS_DOMAIN_AUTHORITY_CURRENT_PROOF_RLS_NEON_FULL_F10_OR_INDEPENDENT_F12'},null,2),{flag:'wx',mode:0o600});
      }
    }
  },60000);
});
