import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { verifyCompleteNativeJsonl } from '../../../test/evidence/complete-native-jsonl';
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
const expectedCompleteAuditedGuardSHA256 = '5469198859b10441ffdcfe0150624cbccec9862c13b5a20ba77614d6d19f1414';
const sourcePins: Readonly<Record<string, string>> = {
  'src/lib/tenancy/runtime/portal-installed-policy-observation.sql': 'd25be72e0bede3e2ded9ce0ba782b060e41260b79db00e202e1db1d6c965573a',
  'src/lib/tenancy/runtime/portal-policy-joint-locks.sql': 'a1394da4b29c86dbf9c87a2968325d359f2bbe4137cf4004e4e4d81245f1f79e',
  'src/lib/tenancy/runtime/portal-policy-joint-observation.sql': '40283f6d7834a2dd01cbe4c418a8a12e6b4a8569d4680cf734c746e1cb55c9e3',
  'src/lib/tenancy/runtime/control-storage.sql': '4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66',
  'src/lib/tenancy/runtime/audited-helper-storage.sql': expectedAuditedStorageSHA256,
  'src/lib/tenancy/runtime/portal-source-locks.sql': 'fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03',
  'src/lib/tenancy/runtime/portal-source-observation.sql': '72b6509933ca2bbd73fbb11eae7232db40bf5f5eafd94be56e291f236ff83dc7',
  'src/lib/tenancy/runtime/audited-role-guard.sql': expectedCompleteAuditedGuardSHA256,
  'src/lib/tenancy/runtime/audited-role-guard-installer.sql': '6cfcdf18fcf4eb9099b2b6b86f1c9d42cb0757fd2b20c1eeee5bb51a63f8297d',
  'src/lib/tenancy/runtime/original-runtime-login.sql': 'e44dbeca8c034b0b92a8af595d3c3fcb932215ea09c8a8394b9bf7bd28c96da4',
  'src/lib/tenancy/runtime/original-runtime-login-installer.sql': 'ba6053428fe34020c26f0e7e1e724a7fc9fa41018532875bbfb8e1909e6c8607',
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
  let auditedStorage = '', auditedGuard = '', completeAuditedGuard = '', sqlAttempted = false;
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
    expect(completeAuditedGuard.split(start)).toHaveLength(2); expect(completeAuditedGuard.split(end)).toHaveLength(2);
    return 'WITH ' + completeAuditedGuard.slice(completeAuditedGuard.indexOf(start) + start.length, completeAuditedGuard.indexOf(end)).trim() + '\n' + select;
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
  // PREPARED ONLY. These helpers create exact new3 functions solely inside the
  // existing admin-owned rollback mutation. No objects.push/role/client/commit.
  type CompletePortalGroupMember = { file: string; name: string; signature: string; delimiter: string; oid: string };
  function beforeCompletePortalPolicyAdditions(value: string) {
    for (const marker of ['PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION', 'PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES']) {
      const start = '-- ' + marker + '_BEGIN', end = '-- ' + marker + '_END';
      expect(value.split(start)).toHaveLength(2); expect(value.split(end)).toHaveLength(2);
      const after = value.indexOf(end) + end.length; expect(value.slice(after, after + 1)).toBe('\n');
      value = value.slice(0, value.indexOf(start)) + value.slice(after + 1);
    }
    expect(hash(value)).toBe(expectedAuditedGuardSHA256); return value;
  }
  function priorPolicyNativeQuery(select: string) {
    const start = '-- AUDITED_NATIVE_CTES_BEGIN', end = '-- AUDITED_NATIVE_CTES_END';
    // auditedGuard is exactly the accepted prior source, independently pinned.
    return 'WITH ' + auditedGuard.slice(auditedGuard.indexOf(start) + start.length, auditedGuard.indexOf(end)).trim() + '\n' + select;
  }
  const completePortalGroupSources = [
    ['portal-installed-policy-observation.sql', 'read_portal_installed_policy', '(text)', '$portal_installed_policy_observation$'],
    ['portal-policy-joint-locks.sql', 'lock_portal_policy_source_rows', '(text,text,bpchar)', '$portal_policy_source_locks$'],
    ['portal-policy-joint-observation.sql', 'read_portal_policy_source_rows', '(text,text,bpchar)', '$portal_policy_source_observation$'],
  ] as const;
  async function completeGroupDependencies(group: readonly CompletePortalGroupMember[]) {
    const dependencies = [(await native(reader.oid)).observation, (await native(kernel.oid)).observation];
    for (const member of group) {
      const rows = (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', ['nevora_tenancy.' + member.name + member.signature])).rows;
      expect(rows).toHaveLength(1); expect(rows[0].oid).toMatch(/^[1-9][0-9]*$/);
      dependencies.push((await native(rows[0].oid)).observation);
    }
    return dependencies;
  }
  async function captureCompleteGroup(group: readonly CompletePortalGroupMember[], overrides: Record<string, unknown[]> = {}) {
    const dependencies = await completeGroupDependencies(group);
    return capture({ [portal.oid]: dependencies, ...overrides });
  }
  async function withCompletePortalGroup(caseId: string, body: (group: readonly CompletePortalGroupMember[]) => Promise<void>) {
    const priorCatalog = canonicalAclCatalog(await controlCatalog()), priorRows = await registryRows(), priorBindings = await bindingRows(), priorRoles = await roleCatalog();
    const group: CompletePortalGroupMember[] = [];
    try {
      await mutation(caseId, async () => {
        expect(admin.getTransactionStatus()).toBe('T');
        for (const [file, name, signature, delimiter] of completePortalGroupSources) {
          expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE pronamespace=pg_catalog.to_regnamespace($1) AND proname=$2', ['nevora_tenancy', name])).rows).toEqual([]);
          const fragment = helperFragment(file, delimiter); await query(admin, fragment);
          await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.' + name + signature + ' FROM PUBLIC');
          await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.' + name + signature + ' TO ' + q(ownerRole.name));
          const oid = (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', ['nevora_tenancy.' + name + signature])).rows[0].oid as string;
          const member = { file, name, signature, delimiter, oid }; group.push(member);
          const observed = await native(oid);
          expect(observed.observation.ownerOid).toBe(installerOid);
          record({ caseId, operation: 'ROLLBACK_ONLY_EXACT_NEW_HELPER_OBSERVED', member,
            wholeSourceSHA256: sourcePins['src/lib/tenancy/runtime/' + file], fragmentSHA256: hash(fragment), fragment,
            native: observed, neverCalled: true, noPersistentObjectReceipt: true });
        }
        await captureCompleteGroup(group); await body(group);
      });
    } finally {
      // Even a failed feature assertion must verify rollback-owned catalog/role/
      // registry/binding identity and absence, rather than losing those checks.
      expect(admin.getTransactionStatus()).toBe('I');
      for (const [, name] of completePortalGroupSources) expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE pronamespace=pg_catalog.to_regnamespace($1) AND proname=$2', ['nevora_tenancy', name])).rows).toEqual([]);
      expect(canonicalAclCatalog(await controlCatalog())).toEqual(priorCatalog);
      expect(await registryRows()).toEqual(priorRows); expect(await bindingRows()).toEqual(priorBindings); expect(await roleCatalog()).toEqual(priorRoles);
      expect(objects).toHaveLength(10); expect(roles).toHaveLength(5); expect(clients.size).toBe(4);
      record({ caseId, operation: 'ROLLBACK_ONLY_NEW3_ABSENT_FULL_BASE_RECONCILED', group,
        catalogSHA256: hash(JSON.stringify(priorCatalog)), registrySHA256: hash(JSON.stringify(priorRows)),
        bindingsSHA256: hash(JSON.stringify(priorBindings)), rolesSHA256: hash(JSON.stringify(priorRoles)),
        fullBeforeAfterCatalogRetainedByMutation: true, persistentObjects: 10, roles: 5, clients: 4 });
    }
  }
  async function completeGroupVariant(caseId: string, label: string, body: () => Promise<void>) {
    expect(admin.getTransactionStatus()).toBe('T');
    const before = canonicalAclCatalog(await controlCatalog()), rows = await registryRows(), bindings = await bindingRows(), roleRows = await roleCatalog();
    await query(admin, 'SAVEPOINT f10_complete_portal_variant');
    try { await body(); }
    finally {
      // This is a fixed local test savepoint, not an application callback seam.
      await query(admin, 'ROLLBACK TO SAVEPOINT f10_complete_portal_variant'); await query(admin, 'RELEASE SAVEPOINT f10_complete_portal_variant');
      expect(canonicalAclCatalog(await controlCatalog())).toEqual(before); expect(await registryRows()).toEqual(rows);
      expect(await bindingRows()).toEqual(bindings); expect(await roleCatalog()).toEqual(roleRows);
      record({ caseId, operation: 'EXACT_VARIANT_ROLLBACK_RECONCILIATION', label,
        catalogSHA256: hash(JSON.stringify(before)), registrySHA256: hash(JSON.stringify(rows)),
        bindingsSHA256: hash(JSON.stringify(bindings)), rolesSHA256: hash(JSON.stringify(roleRows)),
        fullParentMutationCatalogRetained: true });
    }
  }
  async function completeGroupRows() {
    return (await query(admin, nativeQuery(`SELECT d.runtime_kind,d.route_kind,d.root_function_oid::text root_function_oid,d.route_oid::text route_oid,d.function_oid::text function_oid,d.observation
      FROM audit_portal_policy_dependency_current d JOIN audit_capabilities c
        ON c.runtime_kind=d.runtime_kind AND c.route_kind=d.route_kind AND c.function_oid=d.root_function_oid AND c.route_oid=d.route_oid
      WHERE d.root_function_oid=$1::oid ORDER BY d.function_oid`), [portal.oid])).rows;
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
    auditedStorage = readFileSync(auditedStoragePath, 'utf8'); completeAuditedGuard = readFileSync(auditedGuardPath, 'utf8');
    expect(hash(completeAuditedGuard)).toBe(expectedCompleteAuditedGuardSHA256);
    auditedGuard = beforeCompletePortalPolicyAdditions(completeAuditedGuard);
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
  // NEW callbacks: PREPARED/UNEXECUTED. Original SD01-SD16 stay byte-identical.
  it('CG01 same genuine complete five-member capsule is denied by prior graph and admitted by fixed new graph', async () => {
    await withCompletePortalGroup('CG01', async group => {
      const beforeRows = await registryRows();
      const oldRows = (await query(admin, priorPolicyNativeQuery('SELECT function_oid::text function_oid FROM audit_capabilities WHERE function_oid=$1::oid'), [portal.oid])).rows;
      const actual = await admitted(), dependencyRows = await completeGroupRows();
      record({ caseId: 'CG01', oldGuardSHA256: hash(auditedGuard), fullCurrentGuardSHA256: hash(completeAuditedGuard), oldRows, actual, dependencyRows,
        rows: beforeRows, group, rootBodiesNeverCalled: true, scope: 'SAME_GENUINE_CAPSULE_METADATA_CONTROL_NOT_AUTHORITY_OR_NATIVE_RED_BEFORE_IMPLEMENTATION' });
      expect(oldRows).toEqual([]); expect(actual).toBe(true); expect(dependencyRows).toHaveLength(3);
      expect(dependencyRows.map(row => row.function_oid).sort()).toEqual(group.map(member => member.oid).sort());
      expect(dependencyRows.every(row => row.root_function_oid === portal.oid && row.runtime_kind === 'APP' && row.route_kind === 'DIRECT_CALL' && row.route_oid === '0')).toBe(true);
      expect(await registryRows()).toEqual(beforeRows); expect(await admitted(calendar)).toBe(true); expect(await admitted(triggerFunction)).toBe(true);
    });
  }, 45000);
  it('CG02 each incomplete declaration denies new group while historical old-pair-only behavior remains', async () => {
    await withCompletePortalGroup('CG02', async group => {
      const full = await completeGroupDependencies(group);
      for (let omitted = 0; omitted < full.length; omitted++) await completeGroupVariant('CG02', 'OMIT_' + omitted, async () => {
        await capture({ [portal.oid]: full.filter((_, index) => index !== omitted) });
        const actual = await admitted(), rows = await completeGroupRows(); record({ caseId: 'CG02', omitted, actual, rows });
        expect(actual).toBe(false); expect(rows).toEqual([]);
      });
      for (const [label, deps] of [['OLD_PAIR_ONLY', full.slice(0, 2)], ['EMPTY_DECLARATION', []]] as const) await completeGroupVariant('CG02', label, async () => {
        await capture({ [portal.oid]: [...deps] }); const actual = await admitted(), rows = await completeGroupRows();
        record({ caseId: 'CG02', label, actual, rows, scope: 'UNCHANGED_ROOT_METADATA_NOT_SOURCE_OR_NEW_GROUP_AUTHORITY' });
        expect(actual).toBe(true); expect(rows).toEqual([]);
      });
    });
  }, 45000);
  it('CG03 new group cannot be borrowed by a calendar root trigger route or wrong runtime kind', async () => {
    await withCompletePortalGroup('CG03', async group => {
      const full = await completeGroupDependencies(group);
      for (const root of [calendar, triggerFunction]) await completeGroupVariant('CG03', root.name, async () => {
        await captureCompleteGroup(group, { [root.oid]: full }); const actual = await admitted(root);
        record({ caseId: 'CG03', root, actual, genuinelyRecapturedRows: await registryRows() }); expect(actual).toBe(false);
      });
      await completeGroupVariant('CG03', 'WRONG_WORKER_PORTAL_KIND', async () => {
        await query(admin, "UPDATE nevora_tenancy.audited_helper_capability SET runtime_kind='WORKER' WHERE function_oid=$1::oid", [portal.oid]);
        const actual = await admitted(), rows = await completeGroupRows(); record({ caseId: 'CG03', actual, rows, scope: 'NO_NEW_BOOL_ROOT_OR_KIND_GRANT_FIXTURE' });
        expect(actual).toBe(false); expect(rows).toEqual([]);
      });
    });
  }, 45000);
  it('CG04 each changed exact source body denies both retained and honestly recaptured descriptors', async () => {
    await withCompletePortalGroup('CG04', async group => {
      for (const member of group) await completeGroupVariant('CG04', member.name, async () => {
        const fragment = helperFragment(member.file, member.delimiter).replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION').replace(member.delimiter, member.delimiter + '\n-- fictional negative prosrc delta');
        await query(admin, fragment); const staleActual = await admitted();
        await captureCompleteGroup(group); const freshActual = await admitted(), observed = await native(member.oid);
        record({ caseId: 'CG04', member, fragmentSHA256: hash(fragment), staleActual, freshActual, observed, bodiesNeverCalled: true });
        expect(staleActual).toBe(false); expect(freshActual).toBe(false);
      });
    });
  }, 45000);
  it('CG05 actual rollback-owned replacement OID and each same-name overload refuse stale or widened tuples', async () => {
    await withCompletePortalGroup('CG05', async group => {
      for (const member of group) {
        await completeGroupVariant('CG05', member.name + ':REPLACE', async () => {
          const target = 'nevora_tenancy.' + member.name + member.signature;
          await query(admin, 'DROP FUNCTION ' + target); const fragment = helperFragment(member.file, member.delimiter); await query(admin, fragment);
          await query(admin, 'REVOKE ALL ON FUNCTION ' + target + ' FROM PUBLIC'); await query(admin, 'GRANT EXECUTE ON FUNCTION ' + target + ' TO ' + q(ownerRole.name));
          const replacement = (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [target])).rows[0].oid;
          const staleActual = await admitted(); await captureCompleteGroup(group); const reboundActual = await admitted();
          record({ caseId: 'CG05', member, replacement, staleActual, reboundActual, nativeReplacement: await native(replacement),
            scope: 'ROLLBACK_OWNED_IDENTITY_CHANGE_NOT_COMMITTED_REPLACEMENT_OR_SOURCE_APPROVAL' });
          expect(replacement).not.toBe(member.oid); expect(staleActual).toBe(false); expect(reboundActual).toBe(true);
        });
        await completeGroupVariant('CG05', member.name + ':OVERLOAD', async () => {
          const original = helperFragment(member.file, member.delimiter), returns = original.indexOf('\nRETURNS'), close = original.lastIndexOf(')', returns);
          expect(close).toBeGreaterThan(0); const fragment = original.slice(0, close) + ', p_fixture_extra pg_catalog.text' + original.slice(close);
          await query(admin, fragment); const signature = member.signature.slice(0, -1) + ',text)';
          await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.' + member.name + signature + ' FROM PUBLIC');
          const extra = (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', ['nevora_tenancy.' + member.name + signature])).rows[0].oid;
          await captureCompleteGroup(group); const actual = await admitted();
          record({ caseId: 'CG05', member, signature, extra, fragmentSHA256: hash(fragment), nativeExtra: await native(extra), actual }); expect(actual).toBe(false);
        });
      }
    });
  }, 45000);
  it('CG06 each supported real native metadata change denies after fresh complete owner and capsule capture', async () => {
    await withCompletePortalGroup('CG06', async group => {
      for (const member of group) for (const change of ['STRICT', 'SECURITY DEFINER', 'SET search_path=pg_catalog,nevora_tenancy', 'STABLE', 'PARALLEL SAFE']) await completeGroupVariant('CG06', member.name + ':' + change, async () => {
        await query(admin, 'ALTER FUNCTION nevora_tenancy.' + member.name + member.signature + ' ' + change);
        await captureCompleteGroup(group); const actual = await admitted(), observed = await native(member.oid);
        record({ caseId: 'CG06', member, change, actual, observed }); expect(actual).toBe(false);
      });
      for (const member of group) await completeGroupVariant('CG06', member.name + ':LAST_ARGUMENT_DEFAULT_NULL', async () => {
        const original = helperFragment(member.file, member.delimiter), returns = original.indexOf('\nRETURNS');
        expect(returns).toBeGreaterThan(0);
        const parameter = member.signature === '(text)' ? 'p_workspace_id pg_catalog.text' : 'p_session_token_hash pg_catalog.bpchar';
        const header = original.slice(0, returns); expect(header.split(parameter)).toHaveLength(2);
        const fragment = header.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION').replace(parameter, parameter + ' DEFAULT NULL') + original.slice(returns);
        expect(fragment.split(member.delimiter)[1]).toBe(original.split(member.delimiter)[1]);
        await query(admin, fragment); await captureCompleteGroup(group);
        const actual = await admitted(), observed = await native(member.oid);
        record({ caseId: 'CG06', member, change: 'HEADER_ONLY_LAST_ARGUMENT_DEFAULT_NULL', fragmentSHA256: hash(fragment), actual, observed, rawBodyUnchanged: true });
        expect(observed.observation.defaultArgumentCount).toBe(1);
        expect(observed.observation.argumentTypeOids).toEqual(member.signature === '(text)' ? ['25'] : ['25', '25', '1042']);
        expect(actual).toBe(false);
      });
      record({ caseId: 'CG06', status: 'UNEXECUTED_UNSUPPORTED_SUBVECTORS', gaps: ['NO_NATIVE_SUPPORT_FUNCTION_OR_VARIADIC_ISOLATED_CASE_PREPARED_WITHIN_EXACT3_OBJECT_BUDGET'], noSystemCatalogWrites: true });
    });
  }, 45000);
  it('CG07 either raw bound original runtime role owning each helper denies despite honest observations', async () => {
    await withCompletePortalGroup('CG07', async group => {
      for (const member of group) for (const owned of [appRole, workerRole]) await completeGroupVariant('CG07', member.name + ':' + owned.name, async () => {
        await query(admin, 'ALTER FUNCTION nevora_tenancy.' + member.name + member.signature + ' OWNER TO ' + q(owned.name));
        await captureCompleteGroup(group); const actual = await admitted(), observed = await native(member.oid);
        record({ caseId: 'CG07', member, owned, actual, observed, scope: 'RAW_BINDING_OWNER_EXCLUSION_NOT_SAFE_RUNTIME_AUTHORITY' });
        expect(observed.observation.ownerOid).toBe(owned.oid); expect(actual).toBe(false);
      });
    });
  }, 45000);
  it('CG08 each helper ACL denies PUBLIC runtime unrelated rootless and grant-option grantees', async () => {
    await withCompletePortalGroup('CG08', async group => {
      for (const member of group) for (const grantee of ['PUBLIC', q(appRole.name), q(workerRole.name), q(outsiderRole.name), q(unrelatedOwnerRole.name), q(ownerRole.name) + ' WITH GRANT OPTION']) await completeGroupVariant('CG08', member.name + ':' + grantee, async () => {
        await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.' + member.name + member.signature + ' TO ' + grantee);
        await captureCompleteGroup(group); const actual = await admitted(), observed = await native(member.oid);
        record({ caseId: 'CG08', member, grantee, actual, observed }); expect(actual).toBe(false);
      });
      for (const member of group) await completeGroupVariant('CG08', member.name + ':NATIVE_DEFAULT_NULL_ACL', async () => {
        const target = 'nevora_tenancy.' + member.name + member.signature; await query(admin, 'DROP FUNCTION ' + target);
        await query(admin, helperFragment(member.file, member.delimiter));
        const current = (await query(admin, 'SELECT p.oid::text oid,p.proacl::text acl FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)', [target])).rows[0];
        await captureCompleteGroup(group); const actual = await admitted();
        record({ caseId: 'CG08', member, current, actual, observed: await native(current.oid), scope: 'NATIVE_DEFAULT_ACL_NOT_CATALOG_ASSIGNMENT' });
        expect(current.acl).toBe(null); expect(actual).toBe(false);
      });
    });
  }, 45000);
  it('CG09 actual unsafe declaring owner and inconsistent sibling profiles cannot authorize group capsules', async () => {
    await withCompletePortalGroup('CG09', async group => {
      for (const change of ['ALTER ROLE ' + q(ownerRole.name) + ' LOGIN', 'GRANT ' + q(outsiderRole.name) + ' TO ' + q(ownerRole.name)]) await completeGroupVariant('CG09', change.startsWith('ALTER') ? 'OWNER_LOGIN' : 'MEMBERSHIP', async () => {
        await query(admin, change); await captureCompleteGroup(group); const actual = await admitted(), observed = await native(portal.oid);
        record({ caseId: 'CG09', changeKind: change.startsWith('ALTER') ? 'OWNER_LOGIN' : 'MEMBERSHIP', actual, nativeOwner: observed.owner_observation, nativeAcl: observed.owner_acl_observation }); expect(actual).toBe(false);
      });
      await completeGroupVariant('CG09', 'INCONSISTENT_SIBLING_OWNER_CAPSULE', async () => {
        await query(admin, "UPDATE nevora_tenancy.audited_helper_capability SET owner_observation=pg_catalog.jsonb_set(owner_observation,'{canLogin}','true'::jsonb,false) WHERE function_oid=$1::oid", [calendar.oid]);
        const actual = await admitted(); record({ caseId: 'CG09', actual, rows: await registryRows() }); expect(actual).toBe(false);
      });
      record({ caseId: 'CG09', inheritedSequenceAndControlAndGlobalPrivilegeTestsRetainedInOtherAcceptedSuites: true,
        newDangerousPrivilegeFixtureNotCreated: true, noClaimOfNewActualCoverage: true });
    });
  }, 45000);
  it('CG10 every transitive helper needs exact declaring-owner EXECUTE and current schema USAGE', async () => {
    await withCompletePortalGroup('CG10', async group => {
      for (const member of group) await completeGroupVariant('CG10', member.name, async () => {
        await query(admin, 'REVOKE EXECUTE ON FUNCTION nevora_tenancy.' + member.name + member.signature + ' FROM ' + q(ownerRole.name));
        await captureCompleteGroup(group); const actual = await admitted(), observed = await native(member.oid);
        record({ caseId: 'CG10', member, actual, observed }); expect(actual).toBe(false);
      });
      await completeGroupVariant('CG10', 'REVOKE_DECLARING_OWNER_SCHEMA_USAGE', async () => {
        await query(admin, 'REVOKE USAGE ON SCHEMA nevora_tenancy FROM ' + q(ownerRole.name)); await captureCompleteGroup(group);
        const actual = await admitted(); record({ caseId: 'CG10', actual, owner: await native(portal.oid) }); expect(actual).toBe(false);
      });
    });
  }, 45000);
  it('CG11 stale changed duplicate and contradictory retained helper observations deny without value defaults', async () => {
    await withCompletePortalGroup('CG11', async group => {
      const full = await completeGroupDependencies(group);
      for (const delta of [{ oid: kernel.oid }, { ownerOid: ownerRole.oid }, { definition: 'name-only' }, { argumentTypeOids: ['1042'] }, { acl: [] }]) await completeGroupVariant('CG11', JSON.stringify(delta), async () => {
        const altered = full.map((entry, index) => index === 2 ? { ...entry, ...delta } : entry);
        expect(altered[2]).not.toEqual(full[2]);
        await capture({ [portal.oid]: altered }); const actual = await admitted(); record({ caseId: 'CG11', delta, actual, retained: altered }); expect(actual).toBe(false);
      });
      await completeGroupVariant('CG11', 'DUPLICATE_CAPSULE', async () => {
        await capture({ [portal.oid]: [...full, full[2]] }); const actual = await admitted(); record({ caseId: 'CG11', actual }); expect(actual).toBe(false);
      });
      await completeGroupVariant('CG11', 'UNDECLARED_OWNER_NAMED_GRANTEE', async () => {
        await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.' + group[0].name + group[0].signature + ' TO ' + q(unrelatedOwnerRole.name));
        await captureCompleteGroup(group); const actual = await admitted(); record({ caseId: 'CG11', actual, rows: await registryRows() }); expect(actual).toBe(false);
      });
    });
  }, 45000);
  it('CG12 parsed SQL custom target self and backward edge plus source metadata delta deny honestly', async () => {
    await withCompletePortalGroup('CG12', async group => {
      const [installed, joint, combined] = group;
      const replacements = [
        { member: combined, args: 'p_workspace_id pg_catalog.text,p_employee_id pg_catalog.text,p_session_token_hash pg_catalog.bpchar', result: 'jsonb', expression: 'nevora_tenancy.resolve_calendar(p_workspace_id)', target: calendar.oid },
        { member: installed, args: 'p_workspace_id pg_catalog.text', result: 'jsonb', expression: 'nevora_tenancy.read_portal_installed_policy(p_workspace_id)', target: installed.oid },
        { member: installed, args: 'p_workspace_id pg_catalog.text', result: 'jsonb', expression: "nevora_tenancy.read_portal_policy_source_rows(p_workspace_id,'fictional-unread-employee'::pg_catalog.text,'a'::pg_catalog.bpchar)", target: combined.oid },
        { member: joint, args: 'p_workspace_id pg_catalog.text,p_employee_id pg_catalog.text,p_session_token_hash pg_catalog.bpchar', result: 'void', expression: 'nevora_tenancy.resolve_calendar(p_workspace_id)', target: calendar.oid },
      ];
      for (const replacement of replacements) await completeGroupVariant('CG12', replacement.member.name + ':' + replacement.target, async () => {
        const last = replacement.result === 'void' ? ' SELECT pg_catalog.pg_sleep(0);' : '';
        const fragment = 'CREATE OR REPLACE FUNCTION nevora_tenancy.' + replacement.member.name + '(' + replacement.args + ') RETURNS pg_catalog.' + replacement.result +
          ' LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog BEGIN ATOMIC SELECT ' + replacement.expression + ';' + last + ' END';
        await query(admin, fragment);
        const edges = (await query(admin, `SELECT d.objid::text object_oid,d.refobjid::text target_oid,d.deptype FROM pg_catalog.pg_depend d
          WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=$1::oid AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid=$2::oid ORDER BY d.deptype`, [replacement.member.oid, replacement.target])).rows;
        await captureCompleteGroup(group); const actual = await admitted();
        record({ caseId: 'CG12', fragment, fragmentSHA256: hash(fragment), edges, actual,
          scope: 'COMBINED_REAL_SQL_BODY_LANGUAGE_AND_NATIVE_EDGE_NEGATIVE_NOT_ISOLATED_PG_DEPEND_OR_HIDDEN_PLPGSQL_CALLGRAPH_PROOF' });
        expect(edges).toHaveLength(1); expect(edges[0]).toMatchObject({ object_oid: replacement.member.oid, target_oid: replacement.target, deptype: 'n' }); expect(actual).toBe(false);
      });
    });
  }, 45000);
  it('CG13 root-authorized temporary committed private helpers refuse each original LOGIN before their bodies', async () => {
    // ROOT-ONLY amended fixture lifecycle: temporarily at most13 objects; exact
    // persistent10-object baseline/5roles/4clients and all old callbacks remain.
    // This committed negative is distinct from rollback-only CG01-CG12.
    expect(admin.getTransactionStatus()).toBe('I');
    const beforeCatalog = canonicalAclCatalog(await controlCatalog()), beforeRows = await registryRows(), beforeBindings = await bindingRows(), beforeRoles = await roleCatalog();
    const temporary: (CompletePortalGroupMember & { ownerOid: string; definition: string; definitionSHA256: string })[] = [];
    let createCommitted = false, temporaryCleanupVerified = false;
    repairs.add('CG13_EXACT_TEMPORARY_NEW3');
    record({ caseId: 'CG13', operation: 'BEFORE_ROOT_AUTHORIZED_EXACT_TEMPORARY_COMMITTED_GROUP', sourcePins,
      originalObjects: objects, originalRoles: roles, expectedMaximumObjects: 13,
      beforeCatalog, beforeRows, beforeBindings, beforeRoles,
      rootOnlyAdoptedFixtureCustodyRequired: true, noRuntimeExecuteGrantOrHelperSuccess: true });
    try {
      await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED'); await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      for (const [file, name, signature, delimiter] of completePortalGroupSources) {
        expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE pronamespace=pg_catalog.to_regnamespace($1) AND proname=$2', ['nevora_tenancy', name])).rows).toEqual([]);
        const fragment = helperFragment(file, delimiter); await query(admin, fragment);
        const target = 'nevora_tenancy.' + name + signature;
        await query(admin, 'REVOKE ALL ON FUNCTION ' + target + ' FROM PUBLIC');
        // No named grant is added. Reject unexpected named defaults rather than
        // silently granting the helper to a declared owner or runtime role.
        const row = (await query(admin, `SELECT p.oid::text oid,p.proowner::text owner,pg_catalog.pg_get_functiondef(p.oid) definition,
          COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('grantee',a.grantee::text,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type)
          FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a),'[]'::jsonb) acl
          FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)`, [target])).rows[0];
        expect(row.owner).toBe(installerOid); expect(row.acl).toEqual([{ grantee: installerOid, privilege: 'EXECUTE', grantable: false }]);
        const member = { file, name, signature, delimiter, oid: row.oid as string, ownerOid: installerOid, definition: row.definition as string, definitionSHA256: hash(row.definition) };
        temporary.push(member); record({ caseId: 'CG13', operation: 'EXACT_TEMPORARY_PRIVATE_FUNCTION_OBSERVED', member, fragmentSHA256: hash(fragment), native: await native(member.oid), acl: row.acl, neverCalled: true });
      }
      await query(admin, 'COMMIT'); createCommitted = true;
      expect(admin.getTransactionStatus()).toBe('I');
      expect(await registryRows()).toEqual(beforeRows); expect(await bindingRows()).toEqual(beforeBindings); expect(await roleCatalog()).toEqual(beforeRoles);
      record({ caseId: 'CG13', operation: 'EXACT_TEMPORARY_PRIVATE_GROUP_COMMITTED', temporary, maximumObjects: 13, runtimeExecuteGrantsAdded: 0, sourceOrRlsPolicyInstalled: false });
      for (const [client, owned] of [[app, appRole], [worker, workerRole], [outsider, outsiderRole]] as const) for (const member of temporary) {
        const before = await originalLogin(client, owned);
        const privileges = (await query(admin, `SELECT pg_catalog.has_function_privilege($1::oid,$2::oid,'EXECUTE') allowed,
          pg_catalog.has_schema_privilege($1::oid,'nevora_tenancy','USAGE') schema_usage`, [owned.oid, member.oid])).rows[0];
        await query(client, 'BEGIN ISOLATION LEVEL READ COMMITTED');
        let code = 'NOT_ATTEMPTED', replayCode = 'NOT_ATTEMPTED', immediateStatus: ReturnType<Client['getTransactionStatus']> | undefined;
        let nativeAbort: Awaited<ReturnType<typeof synchronizedNativeAbort>> | undefined, replayNativeAbort: Awaited<ReturnType<typeof synchronizedNativeAbort>> | undefined;
        try {
          const call = member.signature === '(text)' ? 'SELECT nevora_tenancy.' + member.name + '($1::text)' : 'SELECT nevora_tenancy.' + member.name + '($1::text,$2::text,$3::bpchar)';
          const values = member.signature === '(text)' ? ['fictional-unread-workspace'] : ['fictional-unread-workspace', 'fictional-unread-employee', 'a'.repeat(64)];
          code = await rejected(client, call, values); immediateStatus = client.getTransactionStatus();
          nativeAbort = await synchronizedNativeAbort(client, owned, before.pid);
          replayCode = await rejected(client, 'SELECT 1'); replayNativeAbort = await synchronizedNativeAbort(client, owned, before.pid);
        } finally {
          // Unconditional own ROLLBACK acknowledges ReadyForQuery even if pg's
          // error promise preceded its cached transaction-status update.
          await query(client, 'ROLLBACK');
        }
        const after = await originalLogin(client, owned);
        record({ caseId: 'CG13', operation: 'TEMPORARY_COMMITTED_HELPER_ORIGINAL_LOGIN_DENIED', member, owned, privileges, code, replayCode, immediateStatus, nativeAbort, replayNativeAbort, before, after, noSuccessfulHelperCall: true });
        expect(privileges.allowed).toBe(false); expect(code).toBe('42501'); expect(['T', 'E']).toContain(immediateStatus);
        expect(nativeAbort?.clientStatus).toBe('E'); expect(nativeAbort?.rows[0].state).toBe('idle in transaction (aborted)');
        expect(replayCode).toBe('25P02'); expect(replayNativeAbort?.clientStatus).toBe('E'); expect(replayNativeAbort?.rows[0].state).toBe('idle in transaction (aborted)');
        expect(after).toEqual(before); expect(client.getTransactionStatus()).toBe('I');
      }
    } finally {
      for (const client of [app, worker, outsider]) await query(client, 'ROLLBACK');
      await query(admin, 'ROLLBACK');
      try {
        await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED'); await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
        for (const member of [...temporary].reverse()) {
          const current = (await query(admin, `SELECT p.oid::text oid,p.proowner::text owner,pg_catalog.pg_get_functiondef(p.oid) definition
            FROM pg_catalog.pg_proc p WHERE p.pronamespace=pg_catalog.to_regnamespace($1) AND p.proname=$2 ORDER BY p.oid`, ['nevora_tenancy', member.name])).rows;
          if (current.length === 0) continue;
          // COMMIT acknowledgement loss cannot be interpreted as absence.
          // Only an exact retained OID/owner/body receipt permits own cleanup.
          expect(current).toEqual([{ oid: member.oid, owner: installerOid, definition: member.definition }]);
          expect(hash(current[0].definition)).toBe(member.definitionSHA256);
          await query(admin, 'DROP FUNCTION nevora_tenancy.' + member.name + member.signature);
          expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [member.oid])).rows).toEqual([]);
          record({ caseId: 'CG13', operation: 'EXACT_TEMPORARY_COMMITTED_FUNCTION_DROPPED', member });
        }
        await query(admin, 'COMMIT');
      } finally { await query(admin, 'ROLLBACK'); }
      for (const [, name] of completePortalGroupSources) expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE pronamespace=pg_catalog.to_regnamespace($1) AND proname=$2', ['nevora_tenancy', name])).rows).toEqual([]);
      const afterCatalog = canonicalAclCatalog(await controlCatalog()), afterRows = await registryRows(), afterBindings = await bindingRows(), afterRoles = await roleCatalog();
      expect(afterCatalog).toEqual(beforeCatalog); expect(afterRows).toEqual(beforeRows); expect(afterBindings).toEqual(beforeBindings); expect(afterRoles).toEqual(beforeRoles);
      expect(objects).toHaveLength(10); expect(roles).toHaveLength(5); expect(clients.size).toBe(4);
      repairs.delete('CG13_EXACT_TEMPORARY_NEW3'); temporaryCleanupVerified = true;
      record({ caseId: 'CG13', operation: 'EXACT_TEMPORARY_COMMITTED_GROUP_ABSENT_FULL_BASE_RECONCILED', temporary, createCommitted, temporaryCleanupVerified,
        beforeCatalog, afterCatalog, beforeRows, afterRows, beforeBindings, afterBindings, beforeRoles, afterRoles,
        persistentObjects: 10, maximumTemporaryObjects: 13, roles: 5, clients: 4, allClaimsPreparedUntilRootActualQA: true });
    }
    expect(temporaryCleanupVerified).toBe(true);
  }, 45000);
  it('CG14 full current four-copy source pins and exact historical source restoration remain mandatory', async () => {
    const copies = [
      ['audited-role-guard.sql', 'ba0b4617d66892ad350e42221e9ad1dc27b406c35d5103b9eba28b08ea6a02e0'],
      ['audited-role-guard-installer.sql', 'cfbe111978adc37a1ce0025ce843fb37e7e43b71f568c3dd01c68b126c23f7d5'],
      ['original-runtime-login.sql', '0993c3ba476cc8dab6d80ee2e0287ba9d18072b3dab99aee8bcab23814c4e6b8'],
      ['original-runtime-login-installer.sql', 'a63f71569af622928d879c1b6759440a42f20f9f599efd24eb80bfb2e1be584f'],
    ] as const;
    const rows = [];
    for (const [file, historical] of copies) {
      const whole = readFileSync(resolve('src/lib/tenancy/runtime/' + file), 'utf8'); expect(hash(whole)).toBe(sourcePins['src/lib/tenancy/runtime/' + file]);
      let erased = whole;
      for (const marker of ['PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION', 'PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES']) {
        const start = '-- ' + marker + '_BEGIN', end = '-- ' + marker + '_END'; expect(erased.split(start)).toHaveLength(2); expect(erased.split(end)).toHaveLength(2);
        const after = erased.indexOf(end) + end.length; expect(erased.slice(after, after + 1)).toBe('\n'); erased = erased.slice(0, erased.indexOf(start)) + erased.slice(after + 1);
      }
      expect(hash(erased)).toBe(historical); rows.push({ file, fullSHA256: hash(whole), erasedSHA256: hash(erased), historical });
    }
    expect(objects).toHaveLength(10); expect(roles).toHaveLength(5); expect(clients.size).toBe(4);
    record({ caseId: 'CG14', rows, sourcePins, persistentObjects: 10, roles: 5, clients: 4,
      noRuntimeSourceInstallationOrPrivatePolicyClaim: true });
  }, 45000);
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
        const operations = await verifyCompleteNativeJsonl(operationsPath, records, { requireCanonicalLines: true });
        expect(operations.count).toBe(records.length);
        writeFileSync(join(runPath!,'portal-source-dependency-cleanup.json'),JSON.stringify({verified,fixtureSetupCommitted,cleaned,roles,objects,closure,
          connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingRepairs:repairs.size,pendingFenceAttempts:0,
          actualSQLAttempted:sqlAttempted,operations,sourcePins,
          scope:'EXACT_OWN_EMPTY_BASE_GRAPH_CAPSULE_ONLY_NO_DATABASE_DROP_CLUSTER_CONTROL_PRIVATE_SOURCE_POLICY_OR_SUCCESSFUL_HELPER_CALL',
          claim:'PREPARED_SUITE_NOT_ACTUAL_NATIVE_SUCCESS_DOMAIN_AUTHORITY_CURRENT_PROOF_RLS_NEON_FULL_F10_OR_INDEPENDENT_F12'},null,2),{flag:'wx',mode:0o600});
      }
    }
  },60000);
});
