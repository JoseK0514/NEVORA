import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/control-storage.sql');
const helperPath = resolve('src/lib/tenancy/runtime/role-guard.sql');
const oldTestPath = resolve('src/lib/tenancy/runtime/role-guard.test.ts');
const testPath = resolve('src/lib/tenancy/runtime/control-storage.postgres.test.ts');
const source = readFileSync(sourcePath, 'utf8');
const helper = readFileSync(helperPath, 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
// Final preparation pins the accepted artifact. These hashes are source custody,
// never authentication, installation authority, runtime proof or tenant authority.
const expectedSourceSHA256 = '4d098ae63c85ebc4e774ab4f17aafa05cedc303d3700005a6f2e72ef59635f20';
const expectedHelperSHA256 = '7c0ce83b99d401aac9a31db391cb750b676a22bf3c76e440194de986299bbd6a';
const expectedOldTestSHA256 = '0d4be75794a63927d94148b2cc8ce6931dfdaf72672ce04b07467b51744f783a';
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_ROLE_OWNED_LEASE;
const runPath = process.env.F_ROLE_RUN_DIR;

type Lease = {
  scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number;
  systemIdentifier: string; database: string; databaseOid: string | number;
  marker: string; user: string; credentialFile: string;
};
type Role = { name: string; oid: string };
type ObjectReceipt = {
  kind: 'schema' | 'table' | 'function'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; dropped: boolean;
};
type Settings = { oid: string; definition: string; rules: string[] };

// HOLD by default: no lease discovery, ambient URL, fixture startup or SQL.
// One supplied variable without the other fails before connections. Only root's
// explicit source-bound fresh fictional fixture invocation may execute this file.
describe.skipIf(!leasePath && !runPath)('owned PostgreSQL runtime control-storage extraction', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client;
  let password = '', installerOid = '', verified = false, runVerified = false, fixtureSetupCommitted = false;
  let artifactInstalled = false, helperInstalled = false, sqlAttempted = false;
  let appRole: Role, workerRole: Role, outsiderRole: Role, settings: Settings;
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
    catch (error) { throw new Error('owned_control_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    records.push(value);
    appendFileSync(join(runPath!, 'control-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); }
    catch { throw new Error('owned_control_connection_failed'); }
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
  async function role(name: string) {
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    record({ operation: 'BEFORE_EXACT_FICTIONAL_ROLE_CREATE', name });
    // Root-generated fictional password is never recorded in SQL/error receipts.
    await query(admin, 'CREATE ROLE ' + q(name) + ' LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT PASSWORD ' + literal(password));
    const receipt = { name, oid: (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(receipt); record({ operation: 'EXACT_FICTIONAL_ROLE_CREATED', ...receipt });
    return receipt;
  }
  async function remember(kind: ObjectReceipt['kind'], schema: string, name: string, ownerOid: string, signature?: string) {
    const row = kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [name])).rows[0]
      : kind === 'table'
        ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(schema) + '.' + q(name)])).rows[0]
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(schema) + '.' + q(name) + signature])).rows[0];
    expect(row).toEqual({ oid: expect.stringMatching(/^[0-9]+$/), owner: ownerOid });
    const receipt: ObjectReceipt = { kind, schema, name, oid: row.oid as string, ownerOid,
      ...(signature ? { signature } : {}), dropped: false };
    objects.push(receipt); record({ operation: 'EXACT_OWN_OBJECT_OBSERVED', ...receipt });
    return receipt;
  }
  async function dropObject(object: ObjectReceipt) {
    const current = object.kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [object.name])).rows[0]
      : object.kind === 'table'
        ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows[0]
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows[0];
    expect(current).toEqual({ oid: object.oid, owner: object.ownerOid });
    const target = object.kind === 'schema' ? q(object.name) : q(object.schema) + '.' + q(object.name) + (object.signature ?? '');
    await query(admin, 'DROP ' + object.kind.toUpperCase() + ' ' + target);
    const remaining = object.kind === 'schema'
      ? (await query(admin, 'SELECT oid FROM pg_catalog.pg_namespace WHERE oid=$1::oid', [object.oid])).rows
      : object.kind === 'table'
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
      FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'`)).rows;
    const relations = (await query(admin, `SELECT c.oid::text oid,c.relname,c.relowner::text owner,c.relkind,
      c.relpersistence,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='nevora_tenancy' ORDER BY c.relname COLLATE pg_catalog."C"`)).rows;
    const columns = (await query(admin, `SELECT a.attnum,a.attname,a.atttypid::text type_oid,
      pg_catalog.format_type(a.atttypid,a.atttypmod) native_type,a.attnotnull,
      a.atthasdef,a.attidentity,a.attgenerated,a.attacl::text acl
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='nevora_tenancy' AND c.relname='runtime_role_binding' AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY a.attnum`)).rows;
    const constraints = (await query(admin, `SELECT co.oid::text oid,co.conname,co.contype,co.conkey,
      co.convalidated,co.condeferrable,co.condeferred,pg_catalog.pg_get_constraintdef(co.oid,false) definition
      FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='nevora_tenancy' AND c.relname='runtime_role_binding'
      ORDER BY co.contype::text COLLATE pg_catalog."C",co.conname COLLATE pg_catalog."C"`)).rows;
    const functions = (await query(admin, `SELECT p.oid::text oid,p.proname,p.proowner::text owner,
      p.prosecdef,p.proconfig,p.proacl::text acl,pg_catalog.pg_get_functiondef(p.oid) definition
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='nevora_tenancy' ORDER BY p.oid`)).rows;
    const memberships = (await query(admin, 'SELECT roleid::text roleid,member::text member,grantor::text grantor,admin_option,inherit_option,set_option FROM pg_catalog.pg_auth_members ORDER BY roleid,member,grantor')).rows;
    const expandedAcls = (await query(admin, `SELECT 'SCHEMA' kind,n.oid::text oid,a.grantor::text grantor,a.grantee::text grantee,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) a WHERE n.nspname='nevora_tenancy'
      UNION ALL SELECT 'TABLE',c.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) a
      WHERE n.nspname='nevora_tenancy' AND c.relname='runtime_role_binding'
      UNION ALL SELECT 'FUNCTION',p.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL pg_catalog.aclexplode(p.proacl) a
      WHERE n.nspname='nevora_tenancy' ORDER BY kind,oid,grantee,privilege_type`)).rows;
    return { schema, relations, columns, constraints, functions, memberships, expandedAcls };
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
  async function controlRows() {
    return (await query(admin, `SELECT kind,role_name::text role_name,role_oid::text role_oid,
      pg_settings_oid::text pg_settings_oid,pg_settings_definition,pg_settings_rules,
      pg_catalog.array_dims(pg_settings_rules) rules_dimensions
      FROM nevora_tenancy.runtime_role_binding ORDER BY kind COLLATE pg_catalog."C"`)).rows;
  }
  async function settingsSource(): Promise<Settings> {
    return (await query(admin, `SELECT 'pg_catalog.pg_settings'::pg_catalog.regclass::oid::text oid,
      pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::pg_catalog.regclass,false) definition,
      ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite w
      WHERE w.ev_class='pg_catalog.pg_settings'::pg_catalog.regclass ORDER BY w.rulename COLLATE pg_catalog."C") rules`)).rows[0] as Settings;
  }
  async function installRejection(expected: string) {
    expect(admin.getTransactionStatus()).toBe('I');
    const code = await rejected(admin, source);
    try { expect(code).toBe(expected); expect(admin.getTransactionStatus()).toBe('E'); }
    finally { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); }
    expect(admin.getTransactionStatus()).toBe('I');
    return code;
  }
  const named = () => [appRole.name, workerRole.name].map(q).join(',');
  async function seedBindings() {
    await query(admin, `INSERT INTO nevora_tenancy.runtime_role_binding
      (kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules)
      VALUES($1,$2,$3::oid,$7::oid,$8,$9::text[]),($4,$5,$6::oid,$7::oid,$8,$9::text[])`,
    ['APP', appRole.name, appRole.oid, 'WORKER', workerRole.name, workerRole.oid, settings.oid, settings.definition, settings.rules]);
  }
  async function guard(client: Client, kind: string | null) {
    return (await query(client, 'SELECT nevora_tenancy.assert_runtime_role($1::text) allowed', [kind])).rows[0].allowed as boolean;
  }
  async function mutateGrant(change: string, undo: string, body: () => Promise<void>) {
    repairs.add(undo);
    try { await query(admin, change); await body(); }
    finally { await query(admin, undo); repairs.delete(undo); }
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
    expect(hash(source)).toBe(expectedSourceSHA256); expect(hash(helper)).toBe(expectedHelperSHA256);
    expect(hash(readFileSync(oldTestPath))).toBe(expectedOldTestSHA256);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user);
    const actual = await checkBase();
    installerOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid as string;
    expect((await query(admin, 'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid', [String(lease.databaseOid)])).rows).toEqual([{ owner: installerOid }]);
    expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, `SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')`)).rows).toEqual([]);
    verified = true;
    record({ operation: 'EXACT_ROOT_BASE_VERIFIED', actual, sourceSHA256: hash(source), helperSHA256: hash(helper),
      testSHA256: hash(readFileSync(testPath)), claim: 'CONTROL_STORAGE_ONLY_NOT_RUNTIME_PROOF_RLS_CUTOVER_OR_F10' });
    await query(admin, 'BEGIN');
    try {
      appRole = await role(lease.invocation + '_app');
      workerRole = await role(lease.invocation + '_worker');
      outsiderRole = await role(lease.invocation + '_outsider');
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + roles.map(r => q(r.name)).join(','));
      await query(admin, 'COMMIT'); fixtureSetupCommitted = true;
    } catch {
      if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
      throw new Error('owned_control_fictional_role_setup_failed');
    }
    settings = await settingsSource();
    record({ operation: 'NATIVE_PG18_SETTINGS_OBSERVED_NOT_BOUND', settings, roles,
      assertion: 'ARTIFACT_HAS_NOT_INSTALLED_AND_NO_BINDING_ROWS_OR_HELPER_GRANTS_EXIST' });
    app = await connect(appRole.name); worker = await connect(workerRole.name); outsider = await connect(outsiderRole.name);
    writeFileSync(join(runPath!, 'control-fixture-custody.json'), JSON.stringify({ base: actual, roles, installerOid,
      fixtureSetupCommitted, sourceSHA256: hash(source), helperSHA256: hash(helper),
      claim: 'EXPLICIT_FICTIONAL_TEST_ROLES_ONLY_NO_RUNTIME_AUTHORITY' }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 30000);

  it('C01 rejects a missing prerequisite schema atomically without creating any relation', async () => {
    const beforeRoles = await roleCatalog();
    expect((await controlCatalog()).schema).toEqual([]);
    expect(await installRejection('3F000')).toBe('3F000');
    const after = await controlCatalog();
    expect(after.schema).toEqual([]); expect(after.relations).toEqual([]); expect(after.functions).toEqual([]);
    expect(await roleCatalog()).toEqual(beforeRoles);
    record({ caseId: 'C01', sqlstate: '3F000', after, roleCatalogUnchanged: true });
  });

  it('C02 rejects a foreign-owned schema without changing its owner or installing storage', async () => {
    await query(admin, 'CREATE SCHEMA nevora_tenancy AUTHORIZATION ' + q(outsiderRole.name));
    const temporarySchema = await remember('schema', '', 'nevora_tenancy', outsiderRole.oid);
    const before = await controlCatalog();
    try {
      expect(await installRejection('42501')).toBe('42501');
      expect(await controlCatalog()).toEqual(before);
      record({ caseId: 'C02', sqlstate: '42501', exactCreatedForeignOwnerFixture: temporarySchema, before, after: await controlCatalog() });
    } finally { await dropObject(temporarySchema); }
  });

  it('C03 installs the exact empty six-column table with owned native constraints and no implicit grants, roles or seed', async () => {
    await query(admin, 'CREATE SCHEMA nevora_tenancy');
    const schema = await remember('schema', '', 'nevora_tenancy', installerOid);
    const beforeRoles = await roleCatalog(); const before = await controlCatalog();
    expect(before.relations).toEqual([]); expect(before.functions).toEqual([]);
    expect(admin.getTransactionStatus()).toBe('I');
    await query(admin, source); expect(admin.getTransactionStatus()).toBe('I');
    artifactInstalled = true;
    const table = await remember('table', 'nevora_tenancy', 'runtime_role_binding', installerOid);
    const catalog = await controlCatalog();
    expect(catalog.schema).toMatchObject([{ oid: schema.oid, nspname: 'nevora_tenancy', owner: installerOid }]);
    expect(catalog.relations.filter(r => r.relkind === 'r')).toEqual([{
      oid: table.oid, relname: 'runtime_role_binding', owner: installerOid, relkind: 'r', relpersistence: 'p',
      relrowsecurity: false, relforcerowsecurity: false, acl: expect.any(String),
    }]);
    expect(catalog.relations.filter(r => r.relkind !== 'r').map(r => r.relkind)).toEqual(['i', 'i', 'i']);
    expect(catalog.columns.map(c => ({ name: c.attname, type: c.native_type, oid: c.type_oid, notnull: c.attnotnull,
      hasDefault: c.atthasdef, identity: c.attidentity, generated: c.attgenerated, acl: c.acl }))).toEqual([
      { name: 'kind', type: 'text', oid: '25', notnull: true, hasDefault: false, identity: '', generated: '', acl: null },
      { name: 'role_name', type: 'name', oid: '19', notnull: true, hasDefault: false, identity: '', generated: '', acl: null },
      { name: 'role_oid', type: 'oid', oid: '26', notnull: true, hasDefault: false, identity: '', generated: '', acl: null },
      { name: 'pg_settings_oid', type: 'oid', oid: '26', notnull: true, hasDefault: false, identity: '', generated: '', acl: null },
      { name: 'pg_settings_definition', type: 'text', oid: '25', notnull: true, hasDefault: false, identity: '', generated: '', acl: null },
      { name: 'pg_settings_rules', type: 'text[]', oid: '1009', notnull: true, hasDefault: false, identity: '', generated: '', acl: null },
    ]);
    const keys = catalog.constraints.filter(c => ['p', 'u'].includes(c.contype));
    expect(keys.map(c => [c.contype, c.conkey])).toEqual([['p', [1]], ['u', [2]], ['u', [3]]]);
    const checks = catalog.constraints.filter(c => c.contype === 'c');
    expect(checks).toHaveLength(1); expect(checks[0].conkey).toEqual([1]);
    expect(checks[0].definition).toContain("'APP'::text"); expect(checks[0].definition).toContain("'WORKER'::text");
    expect(catalog.constraints.filter(c => c.contype === 'n').map(c => c.conkey)).toEqual([[1], [5], [4], [6], [2], [3]]);
    expect(catalog.constraints.every(c => c.convalidated && !c.condeferrable && !c.condeferred)).toBe(true);
    expect(catalog.functions).toEqual([]); expect(catalog.memberships).toEqual(before.memberships);
    expect(catalog.expandedAcls.every(a => a.grantee === installerOid && !a.is_grantable)).toBe(true);
    expect(await roleCatalog()).toEqual(beforeRoles); expect(await controlRows()).toEqual([]);
    record({ caseId: 'C03', artifactSHA256: hash(source), before, catalog, beforeRoles, afterRoles: await roleCatalog(), rows: [],
      claim: 'ACTUAL_NATIVE_STORAGE_INSTALLATION_ONLY_NO_BINDING_SEED_GRANT_OR_RUNTIME_AUTHORITY' });
  });

  it('C04 refuses an existing exact relation without replacing it or modifying catalog/rows', async () => {
    expect(artifactInstalled).toBe(true);
    const before = await controlCatalog(), rows = await controlRows();
    expect(await installRejection('42P07')).toBe('42P07');
    expect(await controlCatalog()).toEqual(before); expect(await controlRows()).toEqual(rows);
    record({ caseId: 'C04', sqlstate: '42P07', before, after: await controlCatalog(), rows });
  });

  it('C05 enforces exact kinds, all six NOT NULL fields and independent kind/name/OID uniqueness', async () => {
    expect(artifactInstalled).toBe(true); expect(await controlRows()).toEqual([]);
    const outcomes: { label: string; sqlstate: string }[] = [];
    await query(admin, 'BEGIN');
    try {
      await seedBindings();
      const original = await controlRows();
      const attempt = async (label: string, text: string, values: unknown[], expected: string) => {
        await query(admin, 'SAVEPOINT exact_control_negative');
        const code = await rejected(admin, text, values);
        try { expect(code).toBe(expected); }
        finally { await query(admin, 'ROLLBACK TO SAVEPOINT exact_control_negative'); await query(admin, 'RELEASE SAVEPOINT exact_control_negative'); }
        expect(await controlRows()).toEqual(original); outcomes.push({ label, sqlstate: code });
      };
      for (const kind of ['app', 'WORKER ', 'OWNER', '']) await attempt('closed-kind:' + kind,
        'INSERT INTO nevora_tenancy.runtime_role_binding VALUES($1,$2,$3::oid,$4::oid,$5,$6::text[])',
        [kind, outsiderRole.name, outsiderRole.oid, settings.oid, settings.definition, settings.rules], '23514');
      for (const column of ['kind', 'role_name', 'role_oid', 'pg_settings_oid', 'pg_settings_definition', 'pg_settings_rules']) {
        await attempt('not-null:' + column, 'UPDATE nevora_tenancy.runtime_role_binding SET ' + q(column) + '=NULL WHERE kind=\'APP\'', [], '23502');
      }
      await attempt('duplicate-kind', 'INSERT INTO nevora_tenancy.runtime_role_binding VALUES(\'APP\',$1,$2::oid,$3::oid,$4,$5::text[])',
        [outsiderRole.name, outsiderRole.oid, settings.oid, settings.definition, settings.rules], '23505');
      await attempt('duplicate-role-name', 'UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind=\'WORKER\'', [appRole.name], '23505');
      await attempt('duplicate-role-oid', 'UPDATE nevora_tenancy.runtime_role_binding SET role_oid=$1::oid WHERE kind=\'WORKER\'', [appRole.oid], '23505');
      record({ caseId: 'C05', original, outcomes, fixtureRowsWillRollback: true });
    } finally { await query(admin, 'ROLLBACK'); }
    expect(await controlRows()).toEqual([]);
  });

  it('C06 grants no nonowner reads, writes, maintenance or DDL through storage installation', async () => {
    const before = await controlCatalog();
    for (const [name, client] of [[appRole.name, app], [workerRole.name, worker], [outsiderRole.name, outsider]] as const) {
      const outcomes = [];
      for (const [label, statement] of [
        ['read', 'SELECT * FROM nevora_tenancy.runtime_role_binding'],
        ['update', 'UPDATE nevora_tenancy.runtime_role_binding SET kind=kind WHERE false'],
        ['create-control', 'CREATE TABLE nevora_tenancy.forbidden_control(id integer)'],
        ['create-public', 'CREATE TABLE public.forbidden_control(id integer)'],
      ]) { const code = await rejected(client, statement); expect(code).toBe('42501'); outcomes.push({ label, sqlstate: code }); }
      record({ caseId: 'C06', name, outcomes });
    }
    expect(await controlCatalog()).toEqual(before); expect(await controlRows()).toEqual([]);
  });

  it('C07 binds only explicitly observed fictional roles/settings and minimal reads/helper execution after the artifact', async () => {
    expect(artifactInstalled).toBe(true); expect(helperInstalled).toBe(false);
    const before = await controlCatalog(); expect(before.functions).toEqual([]); expect(await controlRows()).toEqual([]);
    expect(await settingsSource()).toEqual(settings);
    await query(admin, 'BEGIN');
    try {
      await seedBindings();
      await query(admin, helper);
      await remember('function', 'nevora_tenancy', 'assert_runtime_role', installerOid, '(text)');
      await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM PUBLIC');
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + named());
      await query(admin, 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding TO ' + named());
      await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) TO ' + named());
      await query(admin, 'COMMIT'); helperInstalled = true;
    } catch {
      if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
      throw new Error('owned_control_explicit_compatibility_setup_failed');
    }
    const catalog = await controlCatalog(), rows = await controlRows();
    expect(rows).toHaveLength(2);
    expect(rows.map(r => ({ kind: r.kind, name: r.role_name, oid: r.role_oid }))).toEqual([
      { kind: 'APP', name: appRole.name, oid: appRole.oid }, { kind: 'WORKER', name: workerRole.name, oid: workerRole.oid },
    ]);
    expect(rows.every(r => r.pg_settings_oid === settings.oid && r.pg_settings_definition === settings.definition)).toBe(true);
    for (const row of rows) expect(row.pg_settings_rules).toEqual(settings.rules);
    expect(catalog.columns).toEqual(before.columns); expect(catalog.constraints).toEqual(before.constraints);
    expect(catalog.functions).toHaveLength(1);
    expect(catalog.functions[0]).toMatchObject({ proname: 'assert_runtime_role', owner: installerOid,
      prosecdef: false, proconfig: ['search_path=pg_catalog'] });
    for (const role of [appRole, workerRole]) expect(catalog.expandedAcls.filter(a => a.grantee === role.oid).map(a => [a.kind, a.privilege_type, a.is_grantable])).toEqual([
      ['FUNCTION', 'EXECUTE', false], ['SCHEMA', 'USAGE', false], ['TABLE', 'SELECT', false],
    ]);
    expect(catalog.expandedAcls.filter(a => ['0', outsiderRole.oid].includes(a.grantee))).toEqual([]);
    expect(catalog.memberships).toEqual(before.memberships);
    record({ caseId: 'C07', settings, rows, catalog, sourceSHA256: hash(source), unchangedHelperSHA256: hash(helper),
      claim: 'EXPLICIT_ROOT_FICTIONAL_TEST_SETUP_NOT_ARTIFACT_SEEDS_OR_RUNTIME_APPROVAL' });
  });

  it('C08 remains callable by exact direct APP/WORKER logins using the unchanged helper only after explicit setup', async () => {
    expect(helperInstalled).toBe(true);
    const observations = [];
    for (const [role, client, kind] of [[appRole, app, 'APP'], [workerRole, worker, 'WORKER']] as const) {
      const identity = (await query(client, `SELECT session_user::text session,current_user::text current_role,
        pg_catalog.current_setting('role') role,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity
        WHERE pid=pg_catalog.pg_backend_pid()) original_login_oid`)).rows[0];
      expect(identity).toEqual({ session: role.name, current_role: role.name, role: 'none', original_login_oid: role.oid });
      expect(await guard(client, kind)).toBe(true);
      const wrong = kind === 'APP' ? 'WORKER' : 'APP'; expect(await guard(client, wrong)).toBe(false);
      for (const invalid of [kind.toLowerCase(), kind + ' ', 'OWNER', null]) expect(await guard(client, invalid)).toBe(false);
      observations.push({ identity, kind, directGuard: true, oppositeKind: false, aliasesAndNull: false });
    }
    expect(await rejected(outsider, 'SELECT nevora_tenancy.assert_runtime_role(\'APP\')')).toBe('42501');
    record({ caseId: 'C08', observations, outsiderSQLstate: '42501', claim: 'BOUNDED_HELPER_COMPATIBILITY_NOT_RUNTIME_PROOF_RLS_OR_F10' });
  });

  it('C09 keeps explicit runtime readers unable to mutate, replace or maintain the control table', async () => {
    const before = await controlCatalog(), rows = await controlRows();
    for (const [role, client] of [[appRole, app], [workerRole, worker]] as const) {
      const effective = (await query(admin, `SELECT pg_catalog.has_schema_privilege($1,'nevora_tenancy','CREATE') schema_create,
        pg_catalog.has_table_privilege($1,'nevora_tenancy.runtime_role_binding','SELECT') table_select,
        pg_catalog.has_table_privilege($1,'nevora_tenancy.runtime_role_binding','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') table_write,
        pg_catalog.has_any_column_privilege($1,'nevora_tenancy.runtime_role_binding','INSERT,UPDATE,REFERENCES') column_write,
        pg_catalog.has_database_privilege($1,current_database(),'CREATE,TEMPORARY') database_create`, [role.name])).rows[0];
      expect(effective).toEqual({ schema_create: false, table_select: true, table_write: false, column_write: false, database_create: false });
      const outcomes = [];
      for (const [label, statement] of [
        ['insert', 'INSERT INTO nevora_tenancy.runtime_role_binding SELECT * FROM nevora_tenancy.runtime_role_binding WHERE false'],
        ['update', 'UPDATE nevora_tenancy.runtime_role_binding SET kind=kind WHERE false'],
        ['delete', 'DELETE FROM nevora_tenancy.runtime_role_binding WHERE false'],
        ['truncate', 'TRUNCATE nevora_tenancy.runtime_role_binding'],
        ['alter', 'ALTER TABLE nevora_tenancy.runtime_role_binding ADD COLUMN forbidden integer'],
        ['drop', 'DROP TABLE nevora_tenancy.runtime_role_binding'],
        ['create', 'CREATE TABLE nevora_tenancy.forbidden_control(id integer)'],
      ]) { const code = await rejected(client, statement); expect(code).toBe('42501'); outcomes.push({ label, sqlstate: code }); }
      expect(await guard(client, role === appRole ? 'APP' : 'WORKER')).toBe(true);
      record({ caseId: 'C09', role, effective, outcomes });
    }
    expect(await controlCatalog()).toEqual(before); expect(await controlRows()).toEqual(rows);
  });

  it('C10 fails closed when an explicitly required grant is removed and resumes only after its exact restoration', async () => {
    const before = await controlCatalog(), rows = await controlRows();
    const outcomes: { kind: string; sqlstate: string }[] = [];
    for (const [kind, revoke, grant] of [
      ['SCHEMA', 'REVOKE USAGE ON SCHEMA nevora_tenancy FROM ', 'GRANT USAGE ON SCHEMA nevora_tenancy TO '],
      ['TABLE', 'REVOKE SELECT ON TABLE nevora_tenancy.runtime_role_binding FROM ', 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding TO '],
      ['FUNCTION', 'REVOKE EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM ', 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) TO '],
    ]) {
      await mutateGrant(revoke + q(appRole.name), grant + q(appRole.name), async () => {
        const code = await rejected(app, 'SELECT nevora_tenancy.assert_runtime_role(\'APP\')');
        expect(code).toBe('42501'); outcomes.push({ kind, sqlstate: code });
        expect(await guard(worker, 'WORKER')).toBe(true); expect(await controlRows()).toEqual(rows);
      });
      expect(await guard(app, 'APP')).toBe(true);
    }
    const after = await controlCatalog();
    // PostgreSQL can reorder a raw ACL array upon revoke/regrant. Retain both
    // raw catalogs and compare every property with only ACL spelling normalized.
    expect(canonicalAclCatalog(after)).toEqual(canonicalAclCatalog(before));
    expect(await controlRows()).toEqual(rows);
    record({ caseId: 'C10', outcomes, rows, before, after, nativeRawAclsRetained: true,
      expandedAclAuthorityUnchanged: true, claim: 'NO_CACHED_HELPER_RESULT_OR_NEW_PRIVILEGE' });
  });

  afterAll(async () => {
    let cleaned = false;
    const closure: { client: 'ADMIN' | 'FICTIONAL_LOGIN'; status: string | null; closed: boolean }[] = [];
    try {
      for (const client of clients) if (client !== admin) {
        const status = client.getTransactionStatus() ?? null;
        if (['T', 'E'].includes(status ?? '')) await query(client, 'ROLLBACK');
        await client.end(); closedClients.add(client); closure.push({ client: 'FICTIONAL_LOGIN', status, closed: true });
      }
      if (verified && admin) {
        if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
        await query(admin, 'RESET ROLE'); await checkBase();
        for (const undo of repairs) { await query(admin, undo); repairs.delete(undo); }
        if (artifactInstalled) record({ operation: 'FINAL_CONTROL_SOURCE_BEFORE_EXACT_DROP', catalog: await controlCatalog(), rows: await controlRows() });
        for (const object of [...objects].reverse()) if (!object.dropped) await dropObject(object);
        for (const owned of [...roles].reverse()) {
          const current = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [owned.name])).rows[0];
          if (!current && !fixtureSetupCommitted) continue;
          expect(current).toEqual({ oid: owned.oid });
          await query(admin, 'REVOKE CONNECT ON DATABASE ' + q(lease.database) + ' FROM ' + q(owned.name));
          await query(admin, 'DROP ROLE ' + q(owned.name));
          expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2', [owned.oid, owned.name])).rows).toEqual([]);
          record({ operation: 'EXACT_FICTIONAL_ROLE_DROPPED', ...owned });
        }
        expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin, `SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')`)).rows).toEqual([]);
        cleaned = true;
      }
    } finally {
      // A failed cleanup is retained for root's exact reconciliation. Always
      // attempt to close every owned client without treating closure as cleanup.
      for (const client of clients) if (!closedClients.has(client)) {
        const status = client.getTransactionStatus() ?? null;
        try { await client.end(); closedClients.add(client); closure.push({ client: client === admin ? 'ADMIN' : 'FICTIONAL_LOGIN', status, closed: true }); }
        catch { closure.push({ client: client === admin ? 'ADMIN' : 'FICTIONAL_LOGIN', status, closed: false }); }
      }
      password = '';
      if (runVerified) writeFileSync(join(runPath!, 'control-cleanup.json'), JSON.stringify({ verified,
        fixtureSetupCommitted, artifactInstalled, helperInstalled, cleaned, roles, objects, records, closure,
        connectedOrAttemptedClients: clients.size, closedClients: closedClients.size, pendingRepairs: repairs.size,
        actualSQLAttempted: sqlAttempted, scope: 'EXACT_NEW_SCHEMA_TABLE_HELPER_ROLES_ONLY_NO_DATABASE_DROP_OR_CLUSTER_CONTROL',
        claim: 'PREPARED_SUITE_IS_NOT_ACTUAL_EXECUTION_RUNTIME_PROOF_RLS_CUTOVER_OR_FULL_F10' }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 60000);
});
