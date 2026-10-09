import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/control-storage.sql');
const helperPath = resolve('src/lib/tenancy/runtime/role-guard.sql');
const oldTestPath = resolve('src/lib/tenancy/runtime/role-guard.test.ts');
const testPath = resolve('src/lib/tenancy/runtime/audited-role-guard.postgres.test.ts');
const source = readFileSync(sourcePath, 'utf8');
const helper = readFileSync(helperPath, 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
// Reused accepted fixture custody. Final preparation separately pins both new audited artifacts. These hashes are source custody,
// never authentication, installation authority, runtime proof or tenant authority.
const expectedSourceSHA256 = '4d098ae63c85ebc4e774ab4f17aafa05cedc303d3700005a6f2e72ef59635f20';
const expectedHelperSHA256 = '7c0ce83b99d401aac9a31db391cb750b676a22bf3c76e440194de986299bbd6a';
const expectedOldTestSHA256 = '0d4be75794a63927d94148b2cc8ce6931dfdaf72672ce04b07467b51744f783a';
const auditedStoragePath = resolve('src/lib/tenancy/runtime/audited-helper-storage.sql');
const auditedGuardPath = resolve('src/lib/tenancy/runtime/audited-role-guard.sql');
// Actual root invocation is held until final preparation pins frozen source.
const expectedAuditedStorageSHA256 = 'd166719958a2892a9c9fb1f28ecacc225631a65e4de4f86f4b0dbac488ce4c79';
const expectedAuditedGuardSHA256 = '46857b02d424eb6d7939b609517b67e26549e07af7d1d44ae250a332be770f96';
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
  kind: 'schema' | 'table' | 'sequence' | 'function' | 'trigger'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; dropped: boolean;
  relation?: string;
};
type Settings = { oid: string; definition: string; rules: string[] };

// HOLD by default: no lease discovery, ambient URL, fixture startup or SQL.
// One supplied variable without the other fails before connections. Only root's
// explicit source-bound fresh fictional fixture invocation may execute this file.
describe.skipIf(!leasePath && !runPath)('owned PostgreSQL audited runtime helper successor', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client;
  let password = '', installerOid = '', verified = false, runVerified = false, fixtureSetupCommitted = false;
  let artifactInstalled = false, helperInstalled = false, sqlAttempted = false;
  let appRole: Role, workerRole: Role, outsiderRole: Role, ownerRole: Role, settings: Settings;
  let auditedStorage = '', auditedGuard = '';
  let reviewedDirectSHA256 = '', reviewedTriggerSHA256 = '';
  let directFunction: ObjectReceipt, triggerFunction: ObjectReceipt, route: ObjectReceipt;
  let installationCatalog: Awaited<ReturnType<typeof controlCatalog>>;
  let capabilities: Record<string, unknown>[] = [];
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
    return { schema, relations, columns, constraints, functions, triggers, rules, memberships, expandedAcls };
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
  function replacementCatalog(catalog: Awaited<ReturnType<typeof controlCatalog>>, replacedOid: string, originalOid: string) {
    // The one deliberate identity change is this exact function's OID and its
    // function ACL object identity. Every other native row/property is retained.
    const normalized = canonicalAclCatalog(catalog);
    const aclIdentity = (row: typeof catalog.expandedAcls[number]) => row.kind === 'FUNCTION' && row.oid === replacedOid
      ? { ...row, oid: originalOid } : row;
    const ordered = <T>(rows: T[]) => [...rows].sort((left, right) => {
      const a = JSON.stringify(left), b = JSON.stringify(right); return a < b ? -1 : a > b ? 1 : 0;
    });
    return { ...normalized,
      functions: ordered(normalized.functions.map(row => ({ ...row,
        oid: row.oid === replacedOid ? originalOid : row.oid, acl: ordered(row.acl.map(aclIdentity)),
      }))),
      expandedAcls: ordered(normalized.expandedAcls.map(aclIdentity)),
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
  async function legacyGuard(client: Client, kind: string | null) {
    return (await query(client, 'SELECT nevora_tenancy.assert_runtime_role($1::text) allowed', [kind])).rows[0].allowed as boolean;
  }
  async function guard(client: Client, kind: string | null) {
    return (await query(client, 'SELECT nevora_tenancy.assert_audited_runtime_role($1::text) allowed', [kind])).rows[0].allowed as boolean;
  }
  async function mutateGrant(change: string, undo: string, body: () => Promise<void>) {
    repairs.add(undo);
    try { await query(admin, change); await body(); }
    finally { await query(admin, undo); repairs.delete(undo); }
  }
  const businessName = () => lease.invocation + '_rows';
  const business = () => 'public.' + q(businessName());
  const directSignature = 'nevora_tenancy.resolve_portal(text,text)';
  const triggerSignature = 'nevora_tenancy.source_write_fence()';
  const directSource = `CREATE FUNCTION nevora_tenancy.resolve_portal(pg_catalog.text,pg_catalog.text)
    RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
    AS $fictional_direct$ SELECT '{"fixture":"audited-direct-only"}'::pg_catalog.jsonb $fictional_direct$`;
  const triggerSource = `CREATE FUNCTION nevora_tenancy.source_write_fence()
    RETURNS pg_catalog.trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
    AS $fictional_trigger$ BEGIN RETURN NULL; END $fictional_trigger$`;

  async function nativeFunction(oid: string) {
    const native = (await query(admin, `SELECT p.oid::text oid,p.proowner::text owner,
      pg_catalog.pg_get_functiondef(p.oid) definition,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex') sha256,
      l.lanname,p.proconfig,p.proacl::text raw_acl,p.proretset,p.proargtypes::text argtypes,p.prorettype::text return_oid
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=$1::oid`, [oid])).rows[0];
    expect(native.oid).toBe(oid); expect(native.sha256).toBe(hash(native.definition as string));
    return native;
  }
  async function registryRows() {
    return (await query(admin, `SELECT pg_catalog.to_jsonb(c) value FROM nevora_tenancy.audited_helper_capability c
      ORDER BY c.runtime_kind COLLATE pg_catalog."C",c.route_kind COLLATE pg_catalog."C",c.function_oid,c.route_oid`)).rows.map(row => row.value as Record<string, unknown>);
  }
  async function writeCapability(row: Record<string, unknown>) {
    const columns = ['runtime_kind', 'route_kind', 'function_oid', 'route_oid', 'function_observation', 'owner_observation',
      'owner_acl_observation', 'dependencies', 'route_observation', 'review_reference', 'review_source_sha256', 'owner_lock_columns'];
    await query(admin, 'INSERT INTO nevora_tenancy.audited_helper_capability(' + columns.map(q).join(',') + ') VALUES(' +
      columns.map((column, i) => '$' + (i + 1) + (['function_observation', 'owner_observation', 'owner_acl_observation', 'dependencies', 'route_observation', 'owner_lock_columns'].includes(column) ? '::jsonb' : '')).join(',') + ')',
    columns.map(column => ['function_observation', 'owner_observation', 'owner_acl_observation', 'dependencies', 'route_observation', 'owner_lock_columns'].includes(column)
      ? row[column] === null ? null : JSON.stringify(row[column]) : row[column]));
  }
  async function restoreCapabilities(rows: Record<string, unknown>[]) {
    expect(admin.getTransactionStatus()).toBe('I');
    await query(admin, 'BEGIN');
    try {
      await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability');
      for (const row of rows) await writeCapability(row);
      await query(admin, 'COMMIT');
    } catch { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); throw new Error('owned_audited_restore_failed'); }
    expect(await registryRows()).toEqual(rows);
  }
  async function withRegistryMutation(change: string, values: unknown[], body: () => Promise<void>) {
    const before = await registryRows(), beforeCatalog = await controlCatalog();
    try { await query(admin, change, values); await body(); }
    finally { await restoreCapabilities(before); }
    expect(canonicalAclCatalog(await controlCatalog())).toEqual(canonicalAclCatalog(beforeCatalog));
    expect(await registryRows()).toEqual(before); expect(await guard(app, 'APP')).toBe(true);
    record({ operation: 'EXACT_REGISTRY_MUTATION_AND_RESTORATION', before, after: await registryRows() });
  }
  function nativeQuery(select: string) {
    const begin = '-- AUDITED_NATIVE_CTES_BEGIN', end = '-- AUDITED_NATIVE_CTES_END';
    expect(auditedGuard.split(begin)).toHaveLength(2); expect(auditedGuard.split(end)).toHaveLength(2);
    const block = auditedGuard.slice(auditedGuard.indexOf(begin) + begin.length, auditedGuard.indexOf(end)).trim();
    expect(block.endsWith(',')).toBe(false);
    return { sql: 'WITH ' + block + '\n' + select, blockSHA256: hash(block), guardSHA256: hash(auditedGuard) };
  }
  async function functionObservation(oid: string) {
    const command = nativeQuery(`SELECT f.observation AS function_observation,f.source_sha256 AS review_source_sha256,
      o.observation AS owner_observation,o.acl_observation AS owner_acl_observation
      FROM audit_functions AS f JOIN audit_owners AS o ON o.oid=f.owner_oid WHERE f.oid=$1::pg_catalog.oid`);
    const rows = (await query(admin, command.sql, [oid])).rows;
    expect(rows).toHaveLength(1); expect(rows[0].function_observation.oid).toBe(oid);
    expect(rows[0].review_source_sha256).toBe(hash(rows[0].function_observation.definition as string));
    return rows[0] as { function_observation: Record<string, unknown>; review_source_sha256: string;
      owner_observation: Record<string, unknown>; owner_acl_observation: Record<string, unknown> };
  }
  async function captureReviewedCapabilities(directKind: 'APP' | 'WORKER' | 'APP_PLUS_WRONG_WORKER' = 'APP'): Promise<Record<string, unknown>[]> {
    expect(admin.getTransactionStatus()).toBe('I');
    const original = await registryRows(), command = nativeQuery('SELECT 1');
    const direct = await functionObservation(directFunction.oid), trigger = await functionObservation(triggerFunction.oid);
    expect(direct.review_source_sha256).toBe(reviewedDirectSHA256); expect(trigger.review_source_sha256).toBe(reviewedTriggerSHA256);
    const routeQuery = nativeQuery('SELECT route.observation AS route_observation FROM audit_routes AS route WHERE route.oid=$1::pg_catalog.oid');
    const routeRows = (await query(admin, routeQuery.sql, [route.oid])).rows;
    expect(routeRows).toHaveLength(1); expect(routeRows[0].route_observation.oid).toBe(route.oid);
    const sourceBound = (kind: 'APP' | 'WORKER', routeKind: 'DIRECT_CALL' | 'TRIGGER_ROUTE', functionOid: string,
      routeOid: string, observation: typeof direct, nativeRoute: Record<string, unknown> | null) => ({
      runtime_kind: kind, route_kind: routeKind, function_oid: functionOid, route_oid: routeOid,
      function_observation: observation.function_observation,
      // Invalid interim objects contain no permissive booleans. They cannot
      // satisfy the external guard and are invisible outside the own transaction.
      owner_observation: {}, owner_acl_observation: {}, dependencies: [], route_observation: nativeRoute,
      review_reference: 'F-DEV-COMPLETE-001:root-fictional-literal-source:' + lease.invocation,
      review_source_sha256: observation.review_source_sha256, owner_lock_columns: [],
    });
    const provisional: Record<string, unknown>[] = [
      sourceBound(directKind === 'WORKER' ? 'WORKER' : 'APP', 'DIRECT_CALL', directFunction.oid, '0', direct, null),
      sourceBound('APP', 'TRIGGER_ROUTE', triggerFunction.oid, route.oid, trigger, routeRows[0].route_observation as Record<string, unknown>),
    ];
    if (directKind === 'APP_PLUS_WRONG_WORKER') provisional.push(sourceBound('WORKER', 'DIRECT_CALL', directFunction.oid, '0', direct, null));
    let captured: Record<string, unknown>[] = [];
    await query(admin, 'BEGIN');
    try {
      await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability');
      for (const row of provisional) await writeCapability(row);
      const uncommitted = await registryRows();
      if (original.length === 0) expect(await guard(app, 'APP')).toBe(false);
      const directCurrent = await functionObservation(directFunction.oid), triggerCurrent = await functionObservation(triggerFunction.oid);
      expect(directCurrent.owner_observation).toEqual(triggerCurrent.owner_observation);
      expect(directCurrent.owner_acl_observation).toEqual(triggerCurrent.owner_acl_observation);
      // Preserve every true unsafe native fact. These are ordinary SQL
      // observations and not a proof constructor, privilege grant or approval.
      captured = provisional.map(row => ({ ...row, owner_observation: directCurrent.owner_observation,
        owner_acl_observation: directCurrent.owner_acl_observation }));
      for (const row of captured) await query(admin, `UPDATE nevora_tenancy.audited_helper_capability
        SET owner_observation=$1::jsonb,owner_acl_observation=$2::jsonb
        WHERE runtime_kind=$3 AND route_kind=$4 AND function_oid=$5::oid AND route_oid=$6::oid`,
      [JSON.stringify(row.owner_observation), JSON.stringify(row.owner_acl_observation), row.runtime_kind, row.route_kind, row.function_oid, row.route_oid]);
      const completed = await registryRows();
      expect(completed.every(row => JSON.stringify(row.owner_observation) === JSON.stringify(directCurrent.owner_observation)
        && JSON.stringify(row.owner_acl_observation) === JSON.stringify(directCurrent.owner_acl_observation))).toBe(true);
      record({ operation: 'ONE_OWN_TRANSACTION_NATIVE_PROFILE_BOOTSTRAP_OBSERVATION', directKind,
        nativeCTESHA256: command.blockSHA256, guardSourceSHA256: command.guardSHA256,
        originalCommittedRows: original, rawBeforeRegistration: { direct, trigger }, provisionalSourceBoundRows: uncommitted,
        freshOwnerNative: directCurrent, completedUncommittedRows: completed,
        noFalseBooleanConstructor: true, explicitLiteralDependenciesAndLockColumns: [],
        claim: 'ROOT_FICTIONAL_INSTALLER_OBSERVATIONS_ONLY_NO_ISSUER_BUSINESS_SOURCE_AUTHORITY_OR_HIDDEN_DEPENDENCY_PROOF' });
      // Only this explicit root fixture initializer commits the complete native
      // rows, including deliberately unsafe profiles in adversarial cases.
      // Provisional rows and full profiles are installed in the same transaction.
      await query(admin, 'COMMIT'); captured = completed;
    } finally { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); }
    expect(await registryRows()).toEqual(captured);
    return captured;
  }
  async function bindReviewedCapabilities() {
    const captured = await captureReviewedCapabilities();
    capabilities = await registryRows(); expect(capabilities).toEqual(captured);
    return capabilities;
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
    auditedStorage = readFileSync(auditedStoragePath, 'utf8'); auditedGuard = readFileSync(auditedGuardPath, 'utf8');
    expect(hash(auditedStorage)).toBe(expectedAuditedStorageSHA256);
    expect(hash(auditedGuard)).toBe(expectedAuditedGuardSHA256);
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
      ownerRole = await role(lease.invocation + '_owner', false);
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + roles.filter(r => r !== ownerRole).map(r => q(r.name)).join(','));
      await query(admin, 'COMMIT'); fixtureSetupCommitted = true;
    } catch {
      if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
      throw new Error('owned_control_fictional_role_setup_failed');
    }
    settings = await settingsSource();
    record({ operation: 'NATIVE_PG18_SETTINGS_OBSERVED_NOT_BOUND', settings, roles,
      assertion: 'AUDITED_ARTIFACTS_HAVE_NOT_INSTALLED_AND_NO_CAPABILITY_ROWS_OR_HELPER_GRANTS_EXIST' });
    await query(admin, 'CREATE SCHEMA nevora_tenancy'); await remember('schema', '', 'nevora_tenancy', installerOid);
    await query(admin, source); artifactInstalled = true;
    await remember('table', 'nevora_tenancy', 'runtime_role_binding', installerOid);
    const beforeStorage = await controlCatalog(), beforeRoles = await roleCatalog();
    await query(admin, auditedStorage);
    await remember('table', 'nevora_tenancy', 'audited_helper_capability', installerOid);
    expect(await registryRows()).toEqual([]); expect(await roleCatalog()).toEqual(beforeRoles);
    const afterStorage = await controlCatalog();
    record({ operation: 'EXACT_EMPTY_AUDITED_STORAGE_INSTALL', beforeStorage, afterStorage, beforeRoles,
      afterRoles: await roleCatalog(), rows: [], sourceSHA256: hash(auditedStorage), noSeedsRolesNamedGrants: true });
    await query(admin, 'BEGIN');
    try {
      await seedBindings(); await query(admin, helper);
      await remember('function', 'nevora_tenancy', 'assert_runtime_role', installerOid, '(text)');
      await query(admin, auditedGuard);
      await remember('function', 'nevora_tenancy', 'assert_audited_runtime_role', installerOid, '(text)');
      for (const fn of ['assert_runtime_role', 'assert_audited_runtime_role']) {
        await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.' + fn + '(text) FROM PUBLIC');
        await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.' + fn + '(text) TO ' + named());
      }
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + named());
      await query(admin, 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding,nevora_tenancy.audited_helper_capability TO ' + named());
      await query(admin, 'CREATE TABLE ' + business() + '(id pg_catalog.int4 PRIMARY KEY)');
      await remember('table', 'public', businessName(), installerOid); await query(admin, 'INSERT INTO ' + business() + '(id) VALUES(1)');
      await query(admin, 'GRANT SELECT(id),UPDATE(id) ON TABLE ' + business() + ' TO ' + q(appRole.name));
      await query(admin, directSource); await query(admin, 'ALTER FUNCTION ' + directSignature + ' OWNER TO ' + q(ownerRole.name));
      await query(admin, 'REVOKE ALL ON FUNCTION ' + directSignature + ' FROM PUBLIC');
      await query(admin, 'GRANT EXECUTE ON FUNCTION ' + directSignature + ' TO ' + q(appRole.name));
      directFunction = await remember('function', 'nevora_tenancy', 'resolve_portal', ownerRole.oid, '(text,text)');
      await query(admin, triggerSource); await query(admin, 'ALTER FUNCTION ' + triggerSignature + ' OWNER TO ' + q(ownerRole.name));
      await query(admin, 'REVOKE ALL ON FUNCTION ' + triggerSignature + ' FROM PUBLIC');
      triggerFunction = await remember('function', 'nevora_tenancy', 'source_write_fence', ownerRole.oid, '()');
      const name = lease.invocation + '_audited_trigger';
      await query(admin, 'CREATE TRIGGER ' + q(name) + ' AFTER UPDATE ON ' + business() + ' FOR EACH STATEMENT EXECUTE FUNCTION ' + triggerSignature);
      const nativeRoute = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_trigger WHERE tgrelid=pg_catalog.to_regclass($1) AND tgname=$2', [business(), name])).rows[0];
      route = { kind: 'trigger', schema: 'public', name, oid: nativeRoute.oid as string, ownerOid: installerOid, relation: business(), dropped: false };
      objects.push(route); record({ operation: 'EXACT_FICTIONAL_TRIGGER_CREATED', ...route });
      await query(admin, 'COMMIT'); helperInstalled = true;
    } catch { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); throw new Error('owned_audited_fixture_setup_failed'); }
    installationCatalog = await controlCatalog();
    record({ operation: 'EXACT_FICTIONAL_FUNCTION_SOURCES_BEFORE_REVIEWED_REGISTRY', direct: await nativeFunction(directFunction.oid),
      trigger: await nativeFunction(triggerFunction.oid), ownerRole, route, registry: await registryRows(), installationCatalog,
      claim: 'ROOT_CONFIRMED_LITERAL_FIXTURES_ONLY_NO_RESOLVER_OR_FENCE_BUSINESS_BEHAVIOR' });
    reviewedDirectSHA256 = (await nativeFunction(directFunction.oid)).sha256 as string;
    reviewedTriggerSHA256 = (await nativeFunction(triggerFunction.oid)).sha256 as string;
    app = await connect(appRole.name); worker = await connect(workerRole.name); outsider = await connect(outsiderRole.name);
    writeFileSync(join(runPath!, 'control-fixture-custody.json'), JSON.stringify({ base: actual, roles, installerOid,
      fixtureSetupCommitted, sourceSHA256: hash(source), helperSHA256: hash(helper),
      claim: 'EXPLICIT_FICTIONAL_TEST_ROLES_ONLY_NO_RUNTIME_AUTHORITY' }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 30000);

  it('A01 retains an empty no-seed registry and denies reachable unaudited direct/trigger helpers', async () => {
    expect(artifactInstalled && helperInstalled).toBe(true);
    expect(await registryRows()).toEqual([]);
    const fields = (await query(admin, `SELECT a.attname,pg_catalog.format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.atthasdef
      FROM pg_catalog.pg_attribute a WHERE a.attrelid='nevora_tenancy.audited_helper_capability'::pg_catalog.regclass
      AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`)).rows;
    expect(fields.map(row => row.attname)).toEqual(['runtime_kind', 'route_kind', 'function_oid', 'route_oid',
      'function_observation', 'owner_observation', 'owner_acl_observation', 'dependencies', 'route_observation',
      'review_reference', 'review_source_sha256', 'owner_lock_columns']);
    expect(fields.every(row => !row.atthasdef)).toBe(true);
    expect(await guard(app, 'APP')).toBe(false); expect(await legacyGuard(app, 'APP')).toBe(false);
    expect(await guard(worker, 'WORKER')).toBe(true); expect(await legacyGuard(worker, 'WORKER')).toBe(true);
    record({ caseId: 'A01', rows: [], fields, installationCatalog, auditedApp: false, legacyApp: false,
      claim: 'NO_IMPLICIT_EXCEPTION_OR_BUSINESS_AUTHORITY' });
  });

  it('A02 accepts exact reviewed native DIRECT_CALL and TRIGGER_ROUTE observations while the old helper keeps denying', async () => {
    const rows = await bindReviewedCapabilities(); expect(rows).toHaveLength(2);
    expect(await guard(app, 'APP')).toBe(true); expect(await legacyGuard(app, 'APP')).toBe(false);
    expect(await guard(worker, 'WORKER')).toBe(true); expect(await guard(worker, 'APP')).toBe(false);
    expect((await query(app, 'SELECT nevora_tenancy.resolve_portal($1::text,$2::text) value', ['fictional-workspace', 'fictional-identity'])).rows).toEqual([{ value: { fixture: 'audited-direct-only' } }]);
    expect((await query(app, 'UPDATE ' + business() + ' SET id=id RETURNING id')).rows).toEqual([{ id: 1 }]);
    expect((await query(admin, 'SELECT id FROM ' + business())).rows).toEqual([{ id: 1 }]);
    expect((await query(admin, 'SELECT pg_catalog.has_function_privilege($1,$2::oid,\'EXECUTE\') allowed', [appRole.name, triggerFunction.oid])).rows).toEqual([{ allowed: false }]);
    record({ caseId: 'A02', rows, directNative: await nativeFunction(directFunction.oid), triggerNative: await nativeFunction(triggerFunction.oid),
      directLiteral: { fixture: 'audited-direct-only' }, actualOwnUpdateCount: 1, directTriggerExecute: false,
      oldHelperDeniesSameDefinerAndRoute: true, claim: 'NATIVE_EXCEPTION_OBSERVATIONS_ONLY_NOT_RESOLVER_FENCE_TENANT_OR_RUNTIME_PROOF' });
  });

  it('A03 refuses each missing selected capability rather than borrowing the other route', async () => {
    for (const kind of ['DIRECT_CALL', 'TRIGGER_ROUTE']) await withRegistryMutation(
      'DELETE FROM nevora_tenancy.audited_helper_capability WHERE runtime_kind=\'APP\' AND route_kind=$1', [kind], async () => {
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A03', missingRoute: kind, observedRows: await registryRows(), allowed: false });
      });
  });

  it('A04 denies foreign OIDs, names, runtime kinds and stale function/owner/review envelopes', async () => {
    const mutations = [
      ['foreign-function-oid', 'function_oid=$1::oid', [triggerFunction.oid]],
      ['function-name-only', "function_observation=pg_catalog.jsonb_set(function_observation,'{name}',pg_catalog.to_jsonb('resolve_calendar'::text))", []],
      ['foreign-owner-oid', "owner_observation=pg_catalog.jsonb_set(owner_observation,'{oid}',pg_catalog.to_jsonb($1::text))", [outsiderRole.oid]],
      ['owner-name-only', "owner_observation=pg_catalog.jsonb_set(owner_observation,'{name}',pg_catalog.to_jsonb($1::text))", [outsiderRole.name]],
      ['wrong-runtime-kind', "runtime_kind='WORKER'", []],
      ['native-definition-stale', "function_observation=pg_catalog.jsonb_set(function_observation,'{definition}',pg_catalog.to_jsonb((function_observation->>'definition')||E'\\n'))", []],
      ['review-sha-stale', 'review_source_sha256=$1', ['0'.repeat(64)]],
      ['missing-returns-set', "function_observation=function_observation-'returnsSet'", []],
      ['extra-function-field', "function_observation=function_observation||'{\"extra\":true}'::jsonb", []],
      ['altered-dependencies', "dependencies='[{\"oid\":\"0\"}]'::jsonb", []],
    ] as const;
    for (const [label, change, values] of mutations) await withRegistryMutation(
      'UPDATE nevora_tenancy.audited_helper_capability SET ' + change + " WHERE runtime_kind='APP' AND route_kind='DIRECT_CALL'", [...values], async () => {
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A04', label, rows: await registryRows(), allowed: false });
      });
  });

  it('A05 does not turn trigger registration into callable EXECUTE or grant a DIRECT_CALL to an unregistered runtime role', async () => {
    const before = await registryRows();
    for (const [target, role] of [[triggerSignature, appRole], [directSignature, workerRole]] as const) {
      await mutateGrant('GRANT EXECUTE ON FUNCTION ' + target + ' TO ' + q(role.name), 'REVOKE EXECUTE ON FUNCTION ' + target + ' FROM ' + q(role.name), async () => {
        // Fresh observations remove a stale-descriptor explanation: the exact
        // current rights still cannot be approved by the wrong route/kind row.
        const observed = await captureReviewedCapabilities(role === workerRole ? 'APP_PLUS_WRONG_WORKER' : 'APP');
        expect(await guard(role === appRole ? app : worker, role === appRole ? 'APP' : 'WORKER')).toBe(false);
        expect(await guard(app, 'APP')).toBe(false);
        record({ caseId: 'A05', target, role, nativeRows: observed, allowed: false });
      });
      await restoreCapabilities(before); expect(await guard(app, 'APP')).toBe(true); expect(await guard(worker, 'WORKER')).toBe(true);
    }
  });

  it('A06 denies actual enabled trigger route source/name/state drift and restores every tuple', async () => {
    for (const [label, change, undo] of [
      ['rename', 'ALTER TRIGGER ' + q(route.name) + ' ON ' + business() + ' RENAME TO ' + q(route.name + '_changed'), 'ALTER TRIGGER ' + q(route.name + '_changed') + ' ON ' + business() + ' RENAME TO ' + q(route.name)],
      ['enabled-mode', 'ALTER TABLE ' + business() + ' ENABLE ALWAYS TRIGGER ' + q(route.name), 'ALTER TABLE ' + business() + ' ENABLE TRIGGER ' + q(route.name)],
    ]) {
      const before = await registryRows();
      await mutateGrant(change, undo, async () => {
        expect(await guard(app, 'APP')).toBe(false);
        const actual = (await query(admin, 'SELECT oid::text oid,tgname,tgenabled,pg_catalog.pg_get_triggerdef(oid,false) definition FROM pg_catalog.pg_trigger WHERE oid=$1::oid', [route.oid])).rows[0];
        record({ caseId: 'A06', label, actual, retainedRegistry: before, allowed: false });
      });
      expect(await registryRows()).toEqual(before); expect(await guard(app, 'APP')).toBe(true);
    }
  });

  it('A07 denies changed actual function definition with preserved OID and exact restoration', async () => {
    const before = await nativeFunction(directFunction.oid), rows = await registryRows();
    try {
      await query(admin, (before.definition as string).replace('audited-direct-only', 'audited-source-changed'));
      const changed = await nativeFunction(directFunction.oid);
      expect(changed.oid).toBe(before.oid); expect(changed.sha256).not.toBe(before.sha256);
      expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A07', before, changed, retainedRegistry: rows, allowed: false });
    } finally { await query(admin, before.definition as string); }
    expect(await nativeFunction(directFunction.oid)).toEqual(before); expect(await registryRows()).toEqual(rows);
    expect(await guard(app, 'APP')).toBe(true);
  });

  it('A08 rejects actual same-name replacement OID until the root fixture explicitly recaptures consistent observations', async () => {
    const before = await nativeFunction(directFunction.oid), beforeRows = await registryRows(), oldObject = directFunction;
    const beforeCatalog = await controlCatalog();
    expect(before.owner).toBe(ownerRole.oid); expect(before.sha256).toBe(hash(before.definition as string));
    await query(admin, 'DROP FUNCTION ' + directSignature); oldObject.dropped = true;
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [oldObject.oid])).rows).toEqual([]);
    await query(admin, directSource); await query(admin, 'ALTER FUNCTION ' + directSignature + ' OWNER TO ' + q(ownerRole.name));
    await query(admin, 'REVOKE ALL ON FUNCTION ' + directSignature + ' FROM PUBLIC');
    await query(admin, 'GRANT EXECUTE ON FUNCTION ' + directSignature + ' TO ' + q(appRole.name));
    directFunction = await remember('function', 'nevora_tenancy', 'resolve_portal', ownerRole.oid, '(text,text)');
    const replacement = await nativeFunction(directFunction.oid);
    expect(replacement.oid).not.toBe(before.oid); expect(replacement.definition).toBe(before.definition);
    expect(replacement.sha256).toBe(before.sha256); expect(await registryRows()).toEqual(beforeRows);
    expect(await guard(app, 'APP')).toBe(false);
    record({ caseId: 'A08', stage: 'STALE_NATIVE_OID_DENIED', before, replacement, beforeRows, staleRows: await registryRows(), allowed: false });
    const rebound = await bindReviewedCapabilities(); expect(await guard(app, 'APP')).toBe(true);
    expect(rebound.every(row => row.function_oid !== Number(oldObject.oid))).toBe(true);
    const afterCatalog = await controlCatalog();
    expect(replacementCatalog(afterCatalog, directFunction.oid, oldObject.oid)).toEqual(replacementCatalog(beforeCatalog, oldObject.oid, oldObject.oid));
    record({ caseId: 'A08', stage: 'EXPLICIT_OWN_ROOT_FIXTURE_RECAPTURE_NOT_NAME_ADOPTION', before, replacement, beforeRows, rebound,
      beforeCatalog, afterCatalog, fullCatalogEqualityModuloOnlyExactFunctionAndAclObjectOid: true,
      deliberateDelta: { oldFunctionOid: oldObject.oid, newFunctionOid: directFunction.oid, functionBodySHA256Unchanged: before.sha256,
        sharedOwnerAndFunctionAclEnvelopesRecaptured: true }, exactCleanupReceipt: directFunction });
  });

  it('A09 denies fresh matching native unsafe owner grants rather than accepting constructor false checks', async () => {
    const before = await registryRows();
    for (const [label, change, undo] of [
      ['control-table-update', 'GRANT UPDATE ON TABLE nevora_tenancy.audited_helper_capability TO ' + q(ownerRole.name), 'REVOKE UPDATE ON TABLE nevora_tenancy.audited_helper_capability FROM ' + q(ownerRole.name)],
      ['database-create', 'GRANT CREATE ON DATABASE ' + q(lease.database) + ' TO ' + q(ownerRole.name), 'REVOKE CREATE ON DATABASE ' + q(lease.database) + ' FROM ' + q(ownerRole.name)],
      ['parameter-set', 'GRANT SET ON PARAMETER session_replication_role TO ' + q(ownerRole.name), 'REVOKE SET ON PARAMETER session_replication_role FROM ' + q(ownerRole.name)],
    ]) {
      await mutateGrant(change, undo, async () => {
        const unsafe = await captureReviewedCapabilities();
        expect(await guard(app, 'APP')).toBe(false);
        const acl = unsafe[0].owner_acl_observation as { effectiveChecks: Record<string, boolean> };
        expect(Object.values(acl.effectiveChecks).some(value => value === true)).toBe(true);
        record({ caseId: 'A09', label, freshNativeUnsafeRows: unsafe, allowed: false, noManufacturedFalseChecks: true });
      });
      await restoreCapabilities(before); expect(await guard(app, 'APP')).toBe(true);
    }
  });

  it('A10 denies unsafe owner flags and both membership directions using real catalog mutations', async () => {
    const beforeRows = await registryRows();
    for (const [unsafe, safe] of [['LOGIN', 'NOLOGIN'], ['SUPERUSER', 'NOSUPERUSER'], ['BYPASSRLS', 'NOBYPASSRLS'],
      ['CREATEROLE', 'NOCREATEROLE'], ['CREATEDB', 'NOCREATEDB'], ['REPLICATION', 'NOREPLICATION'], ['INHERIT', 'NOINHERIT']]) {
      await mutateGrant('ALTER ROLE ' + q(ownerRole.name) + ' ' + unsafe, 'ALTER ROLE ' + q(ownerRole.name) + ' ' + safe, async () => {
        const unsafeRows = await captureReviewedCapabilities();
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A10', unsafeOwnerFlag: unsafe, freshNativeRows: unsafeRows, allowed: false });
      });
      await restoreCapabilities(beforeRows); expect(await guard(app, 'APP')).toBe(true);
    }
    for (const [parent, member] of [[ownerRole, outsiderRole], [outsiderRole, ownerRole]] as const) {
      await mutateGrant('GRANT ' + q(parent.name) + ' TO ' + q(member.name) + ' WITH INHERIT FALSE, SET FALSE', 'REVOKE ' + q(parent.name) + ' FROM ' + q(member.name), async () => {
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A10', ownerMembership: { parent, member }, allowed: false });
      });
      expect(await guard(app, 'APP')).toBe(true);
    }
  });

  it('A11 retains exact direct original backend login and denies SET ROLE/session substitution/definer context', async () => {
    for (const invalid of [null, '', 'app', 'worker', ' APP', 'APP ', 'PROVISIONER', 'OWNER']) expect(await guard(app, invalid)).toBe(false);
    const identity = (await query(app, `SELECT session_user::text session,current_user::text current_role,
      pg_catalog.current_setting('role') role,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid`)).rows[0];
    expect(identity).toEqual({ session: appRole.name, current_role: appRole.name, role: 'none', original_oid: appRole.oid });
    await query(app, 'SET ROLE ' + q(appRole.name));
    try { expect(await guard(app, 'APP')).toBe(false); } finally { await query(app, 'RESET ROLE'); }
    const original = (await query(admin, 'SELECT (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) oid')).rows[0];
    await query(admin, 'SET SESSION AUTHORIZATION ' + q(appRole.name));
    try { expect(await guard(admin, 'APP')).toBe(false); }
    finally { await query(admin, 'RESET SESSION AUTHORIZATION'); }
    expect(original.oid).toBe(installerOid);
    const wrapperName = lease.invocation + '_inner_guard', wrapper = 'nevora_tenancy.' + q(wrapperName) + '()';
    await query(admin, 'CREATE FUNCTION ' + wrapper + " RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT nevora_tenancy.assert_audited_runtime_role('APP') $$");
    const object = await remember('function', 'nevora_tenancy', wrapperName, installerOid, '()');
    try {
      await query(admin, 'REVOKE ALL ON FUNCTION ' + wrapper + ' FROM PUBLIC');
      await query(admin, 'GRANT EXECUTE ON FUNCTION ' + wrapper + ' TO ' + q(appRole.name));
      expect((await query(app, 'SELECT ' + wrapper + ' allowed')).rows).toEqual([{ allowed: false }]);
      expect(await guard(app, 'APP')).toBe(false);
      record({ caseId: 'A11', originalDirectIdentity: identity, substitutedBackendOid: original.oid, wrapperNative: await nativeFunction(object.oid),
        insideDefinerAllowed: false, claim: 'NO_INNER_OWNER_CONTEXT_GATE_IMPLEMENTED' });
    } finally { await dropObject(object); }
    expect(await guard(app, 'APP')).toBe(true);
  });

  it('A12 retains runtime unsafe flags, memberships, ownership and current source/settings denials', async () => {
    for (const [unsafe, safe] of [['NOLOGIN', 'LOGIN'], ['SUPERUSER', 'NOSUPERUSER'], ['BYPASSRLS', 'NOBYPASSRLS'],
      ['CREATEROLE', 'NOCREATEROLE'], ['CREATEDB', 'NOCREATEDB'], ['REPLICATION', 'NOREPLICATION'], ['INHERIT', 'NOINHERIT']]) {
      await mutateGrant('ALTER ROLE ' + q(appRole.name) + ' ' + unsafe, 'ALTER ROLE ' + q(appRole.name) + ' ' + safe, async () => {
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A12', runtimeUnsafeFlag: unsafe, allowed: false });
      }); expect(await guard(app, 'APP')).toBe(true);
    }
    for (const [parent, member] of [[appRole, outsiderRole], [outsiderRole, appRole]] as const) await mutateGrant(
      'GRANT ' + q(parent.name) + ' TO ' + q(member.name) + ' WITH INHERIT FALSE, SET FALSE', 'REVOKE ' + q(parent.name) + ' FROM ' + q(member.name), async () => {
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A12', runtimeMembership: { parent, member }, allowed: false });
      });
    await mutateGrant('ALTER TABLE ' + business() + ' OWNER TO ' + q(appRole.name), 'ALTER TABLE ' + business() + ' OWNER TO ' + q(lease.user), async () => {
      expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A12', runtimeOwnedRelation: business(), allowed: false });
    });
    await query(admin, 'GRANT SELECT(id),UPDATE(id) ON TABLE ' + business() + ' TO ' + q(appRole.name));
    await mutateGrant("UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=pg_settings_definition||E'\\n' WHERE kind='APP'",
      "UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=pg_catalog.pg_get_viewdef(pg_settings_oid,false) WHERE kind='APP'", async () => {
        expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A12', actualSettingsBindingDrift: true, allowed: false });
      });
    expect(await guard(app, 'APP')).toBe(true);
  });

  it('A13 retains PUBLIC/outsider/grant-option/control-mutation/catalog broadening denials', async () => {
    const changes = [
      ['PUBLIC-capability-read', 'GRANT SELECT ON TABLE nevora_tenancy.audited_helper_capability TO PUBLIC', 'REVOKE SELECT ON TABLE nevora_tenancy.audited_helper_capability FROM PUBLIC'],
      ['PUBLIC-helper-execute', 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_audited_runtime_role(text) TO PUBLIC', 'REVOKE EXECUTE ON FUNCTION nevora_tenancy.assert_audited_runtime_role(text) FROM PUBLIC'],
      ['PUBLIC-definer-execute', 'GRANT EXECUTE ON FUNCTION ' + directSignature + ' TO PUBLIC', 'REVOKE EXECUTE ON FUNCTION ' + directSignature + ' FROM PUBLIC'],
      ['outsider-definer-execute', 'GRANT EXECUTE ON FUNCTION ' + directSignature + ' TO ' + q(outsiderRole.name), 'REVOKE EXECUTE ON FUNCTION ' + directSignature + ' FROM ' + q(outsiderRole.name)],
      ['grant-option', 'GRANT SELECT(id) ON TABLE ' + business() + ' TO ' + q(appRole.name) + ' WITH GRANT OPTION', 'REVOKE GRANT OPTION FOR SELECT(id) ON TABLE ' + business() + ' FROM ' + q(appRole.name)],
      ['control-column-update', 'GRANT UPDATE(runtime_kind) ON TABLE nevora_tenancy.audited_helper_capability TO ' + q(appRole.name), 'REVOKE UPDATE(runtime_kind) ON TABLE nevora_tenancy.audited_helper_capability FROM ' + q(appRole.name)],
      ['maintenance', 'GRANT MAINTAIN ON TABLE ' + business() + ' TO ' + q(appRole.name), 'REVOKE MAINTAIN ON TABLE ' + business() + ' FROM ' + q(appRole.name)],
      ['database-create', 'GRANT CREATE ON DATABASE ' + q(lease.database) + ' TO ' + q(appRole.name), 'REVOKE CREATE ON DATABASE ' + q(lease.database) + ' FROM ' + q(appRole.name)],
      ['PUBLIC-schema-create', 'GRANT CREATE ON SCHEMA public TO PUBLIC', 'REVOKE CREATE ON SCHEMA public FROM PUBLIC'],
      ['parameter-set', 'GRANT SET ON PARAMETER session_replication_role TO ' + q(appRole.name), 'REVOKE SET ON PARAMETER session_replication_role FROM ' + q(appRole.name)],
      ['restricted-catalog-execute', 'GRANT EXECUTE ON FUNCTION pg_catalog.pg_read_file(text,bigint,bigint) TO ' + q(appRole.name), 'REVOKE EXECUTE ON FUNCTION pg_catalog.pg_read_file(text,bigint,bigint) FROM ' + q(appRole.name)],
    ];
    for (const [label, change, undo] of changes) {
      await mutateGrant(change, undo, async () => { expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A13', label, allowed: false, noRestrictedFunctionWasInvoked: true }); });
      expect(await guard(app, 'APP')).toBe(true);
    }
  });

  it('A14 denies owner-executing writable views and rules despite valid unrelated audited helper rows', async () => {
    const name = lease.invocation + '_unsafe_view', view = 'public.' + q(name);
    await query(admin, 'CREATE VIEW ' + view + ' AS SELECT id FROM ' + business());
    const oid = (await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', [view])).rows[0].oid;
    try {
      await query(admin, 'GRANT SELECT(id),UPDATE(id) ON TABLE ' + view + ' TO ' + q(appRole.name));
      expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A14', unsafeView: { name, oid }, allowed: false });
    } finally {
      expect((await query(admin, 'SELECT relowner::text owner FROM pg_catalog.pg_class WHERE oid=$1::oid', [oid])).rows).toEqual([{ owner: installerOid }]);
      expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', [view])).rows).toEqual([{ oid }]);
      await query(admin, 'DROP VIEW ' + view);
    }
    expect(await guard(app, 'APP')).toBe(true);
    const ruleName = lease.invocation + '_unsafe_rule';
    await query(admin, 'CREATE RULE ' + q(ruleName) + ' AS ON UPDATE TO ' + business() + ' DO ALSO SELECT 1');
    const ruleOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_rewrite WHERE ev_class=pg_catalog.to_regclass($1) AND rulename=$2', [business(), ruleName])).rows[0].oid;
    try { expect(await guard(app, 'APP')).toBe(false); record({ caseId: 'A14', unsafeRule: { ruleName, ruleOid }, allowed: false }); }
    finally {
      expect((await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_rewrite WHERE ev_class=pg_catalog.to_regclass($1) AND rulename=$2', [business(), ruleName])).rows).toEqual([{ oid: ruleOid }]);
      await query(admin, 'DROP RULE ' + q(ruleName) + ' ON ' + business());
    }
    expect(await guard(app, 'APP')).toBe(true);
  });

  it('A15 keeps named runtime registries read-only and fails closed on missing mandatory read/execute grants', async () => {
    const before = await registryRows(), beforeCatalog = await controlCatalog();
    for (const client of [app, worker]) {
      for (const statement of ['UPDATE nevora_tenancy.audited_helper_capability SET review_reference=review_reference WHERE false',
        'DELETE FROM nevora_tenancy.audited_helper_capability WHERE false',
        'CREATE TABLE nevora_tenancy.forbidden_audited_runtime(id integer)']) expect(await rejected(client, statement)).toBe('42501');
    }
    for (const [revoke, grant] of [
      ['REVOKE SELECT ON TABLE nevora_tenancy.audited_helper_capability FROM ', 'GRANT SELECT ON TABLE nevora_tenancy.audited_helper_capability TO '],
      ['REVOKE EXECUTE ON FUNCTION nevora_tenancy.assert_audited_runtime_role(text) FROM ', 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_audited_runtime_role(text) TO '],
    ]) await mutateGrant(revoke + q(appRole.name), grant + q(appRole.name), async () => {
      expect(await rejected(app, "SELECT nevora_tenancy.assert_audited_runtime_role('APP')")).toBe('42501');
    });
    expect(await registryRows()).toEqual(before); expect(canonicalAclCatalog(await controlCatalog())).toEqual(canonicalAclCatalog(beforeCatalog));
    expect(await guard(app, 'APP')).toBe(true); record({ caseId: 'A15', unchangedRows: before, mandatoryGrantMissingSQLstate: '42501' });
  });

  it('A16 current final denial aborts and rolls back only the own fictional UPDATE', async () => {
    const wrapper = "SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role('APP') IS TRUE THEN 1 ELSE 0 END AS guard";
    expect((await query(app, wrapper)).rows).toEqual([{ guard: 1 }]);
    await query(app, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      expect((await query(app, wrapper)).rows).toEqual([{ guard: 1 }]);
      expect((await query(app, 'UPDATE ' + business() + ' SET id=2 WHERE id=1 RETURNING id')).rows).toEqual([{ id: 2 }]);
      await mutateGrant('GRANT CREATE ON DATABASE ' + q(lease.database) + ' TO ' + q(appRole.name), 'REVOKE CREATE ON DATABASE ' + q(lease.database) + ' FROM ' + q(appRole.name), async () => {
        expect(await rejected(app, wrapper)).toBe('22012'); expect(app.getTransactionStatus()).toBe('E');
        expect(await rejected(app, 'SELECT 1')).toBe('25P02');
        await query(app, 'COMMIT'); expect(app.getTransactionStatus()).toBe('I');
        expect((await query(admin, 'SELECT id FROM ' + business())).rows).toEqual([{ id: 1 }]);
        record({ caseId: 'A16', beginningGuard: 1, actualOwnUpdate: 2, finalSQLstate: '22012', originalRowsIndependentlyObserved: [1],
          claim: 'OWN_STATEMENT_CURRENT_DENIAL_ONLY_TRUSTED_CHANGE_FENCING_AND_FULL_F10_STILL_OPEN' });
      });
    } finally { if (['T', 'E'].includes(app.getTransactionStatus() ?? '')) await query(app, 'ROLLBACK'); }
    expect(await guard(app, 'APP')).toBe(true);
  });

  it('A17 rejects SQL NULL trigger-route observations independently of JSON null', async () => {
    const before = await registryRows(), outcomes = [];
    for (const [label, expression] of [['SQL_NULL', 'NULL'], ['JSON_NULL', "'null'::jsonb"]]) {
      await query(admin, 'BEGIN');
      try {
        const code = await rejected(admin, 'UPDATE nevora_tenancy.audited_helper_capability SET route_observation=' + expression + " WHERE route_kind='TRIGGER_ROUTE'");
        expect(code).toBe('23514'); outcomes.push({ label, sqlstate: code });
      } finally { await query(admin, 'ROLLBACK'); }
      expect(await registryRows()).toEqual(before);
    }
    expect(await guard(app, 'APP')).toBe(true); record({ caseId: 'A17', outcomes, rowsPreserved: before });
  });

  it('A18 rejects superficially matching binding storage lacking the original keys and kind constraint', async () => {
    const beforeCatalog = await controlCatalog(), beforeRows = await controlRows(), beforeCaps = await registryRows();
    const original = objects.find(object => object.kind === 'table' && object.name === 'runtime_role_binding' && !object.dropped)!;
    const shadow = lease.invocation + '_binding_shadow';
    expect((await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass(\'nevora_tenancy.runtime_role_binding\')')).rows).toEqual([{ oid: original.oid, owner: installerOid }]);
    expect(admin.getTransactionStatus()).toBe('I');
    await query(admin, 'ALTER TABLE nevora_tenancy.runtime_role_binding RENAME TO ' + q(shadow));
    let bad: ObjectReceipt | undefined;
    try {
      await query(admin, `CREATE TABLE nevora_tenancy.runtime_role_binding(kind pg_catalog.text NOT NULL,
        role_name pg_catalog.name NOT NULL,role_oid pg_catalog.oid NOT NULL,pg_settings_oid pg_catalog.oid NOT NULL,
        pg_settings_definition pg_catalog.text NOT NULL,pg_settings_rules pg_catalog.text[] NOT NULL)`);
      bad = await remember('table', 'nevora_tenancy', 'runtime_role_binding', installerOid);
      const malformed = await controlCatalog();
      expect(malformed.constraints.filter(constraint => constraint.relname === 'runtime_role_binding' && ['p', 'u', 'c'].includes(constraint.contype))).toEqual([]);
      expect(admin.getTransactionStatus()).toBe('I');
      const code = await rejected(admin, auditedStorage);
      try { expect(code).toBe('55000'); }
      finally { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); }
      expect(await registryRows()).toEqual(beforeCaps);
      record({ caseId: 'A18', original, beforeCatalog, beforeRows, bad, malformed, sqlstate: code,
        noRuntimeCallsWhileSubstituted: true, assertion: 'PREREQUISITE_DENIAL_BEFORE_DUPLICATE_OR_ADOPTION' });
    } finally {
      if (bad) await dropObject(bad);
      expect((await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', ['nevora_tenancy.' + q(shadow)])).rows).toEqual([{ oid: original.oid, owner: installerOid }]);
      await query(admin, 'ALTER TABLE nevora_tenancy.' + q(shadow) + ' RENAME TO runtime_role_binding');
    }
    expect(await controlCatalog()).toEqual(beforeCatalog); expect(await controlRows()).toEqual(beforeRows);
    expect(await registryRows()).toEqual(beforeCaps); expect(await guard(app, 'APP')).toBe(true);
    record({ caseId: 'A18', stage: 'EXACT_ORIGINAL_BINDING_RESTORED', original, catalog: await controlCatalog(), rows: await controlRows(), capabilities: await registryRows() });
  });

  it('A19 does not approve a valid WORKER login/native grant/row for the APP-only portal signature', async () => {
    const before = await registryRows(), beforeCatalog = await controlCatalog(), direct = await nativeFunction(directFunction.oid);
    // Remove APP EXECUTE as well: an unmatched APP grantee must not be the
    // explanation for denying the independently valid wrong-kind WORKER tuple.
    await query(admin, 'REVOKE EXECUTE ON FUNCTION ' + directSignature + ' FROM ' + q(appRole.name));
    try {
      await mutateGrant('GRANT EXECUTE ON FUNCTION ' + directSignature + ' TO ' + q(workerRole.name), 'REVOKE EXECUTE ON FUNCTION ' + directSignature + ' FROM ' + q(workerRole.name), async () => {
        const wrongKind = await captureReviewedCapabilities('WORKER');
        expect((await query(admin, 'SELECT pg_catalog.has_function_privilege($1,$2::oid,\'EXECUTE\') worker,pg_catalog.has_function_privilege($3,$2::oid,\'EXECUTE\') app', [workerRole.name, directFunction.oid, appRole.name])).rows).toEqual([{ worker: true, app: false }]);
        expect(wrongKind.some(row => row.runtime_kind === 'WORKER' && row.route_kind === 'DIRECT_CALL')).toBe(true);
        expect(await guard(worker, 'WORKER')).toBe(false);
        record({ caseId: 'A19', directSource: direct, wrongKindRows: wrongKind, workerExecute: true, appExecute: false,
          workerAllowed: false, claim: 'CLOSED_SERVICE_KIND_MAPPING_INDEPENDENT_OF_STALE_OR_UNMATCHED_GRANTEE' });
      });
    } finally {
      await query(admin, 'GRANT EXECUTE ON FUNCTION ' + directSignature + ' TO ' + q(appRole.name));
      await restoreCapabilities(before);
    }
    expect(canonicalAclCatalog(await controlCatalog())).toEqual(canonicalAclCatalog(beforeCatalog));
    expect(await registryRows()).toEqual(before); expect(await guard(app, 'APP')).toBe(true); expect(await guard(worker, 'WORKER')).toBe(true);
  });

  it('A20 denies trusted-owner sequence USAGE from fresh native profiles and records its isolated native effect', async () => {
    const beforeCatalog = await controlCatalog(), beforeRows = await registryRows(), beforeRoles = await roleCatalog();
    const sequenceName = lease.invocation + '_owner_usage_sequence', sequence = 'public.' + q(sequenceName);
    let ownedSequence: ObjectReceipt | undefined;
    const sequenceObservation = async (oid: string) => ({
      native: (await query(admin, `SELECT c.oid::text oid,c.relname,c.relowner::text owner,c.relkind,c.relpersistence,c.relacl::text acl,
        s.seqtypid::text type_oid,s.seqstart::text start,s.seqincrement::text increment,s.seqmax::text maximum,
        s.seqmin::text minimum,s.seqcache::text cache,s.seqcycle
        FROM pg_catalog.pg_class c JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid WHERE c.oid=$1::oid`, [oid])).rows[0],
      value: (await query(admin, 'SELECT last_value::text last_value,is_called FROM ' + sequence)).rows[0],
    });
    try {
      expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', [sequence])).rows).toEqual([{ oid: null }]);
      await query(admin, 'CREATE SEQUENCE ' + sequence + ' AS bigint START WITH 41');
      ownedSequence = await remember('sequence', 'public', sequenceName, installerOid);
      const initial = await sequenceObservation(ownedSequence.oid);
      expect(initial.native.owner).toBe(installerOid); expect(initial.value).toEqual({ last_value: '41', is_called: false });
      await query(admin, 'GRANT USAGE ON SEQUENCE ' + sequence + ' TO ' + q(ownerRole.name));
      const rights = (await query(admin, `SELECT pg_catalog.has_sequence_privilege($1,$2::oid,'USAGE') usage,
        pg_catalog.has_sequence_privilege($1,$2::oid,'SELECT') read,
        pg_catalog.has_sequence_privilege($1,$2::oid,'UPDATE') update`, [ownerRole.name, ownedSequence.oid])).rows[0];
      expect(rights).toEqual({ usage: true, read: false, update: false });
      let effect: Record<string, unknown> | undefined;
      await query(admin, 'SET ROLE ' + q(ownerRole.name));
      try {
        effect = (await query(admin, 'SELECT current_user::text role,pg_catalog.nextval($1::regclass)::text next_value', [sequence])).rows[0];
      } finally { await query(admin, 'RESET ROLE'); }
      expect((await query(admin, 'SELECT session_user::text session,current_user::text current_role')).rows).toEqual([{ session: lease.user, current_role: lease.user }]);
      const afterEffect = await sequenceObservation(ownedSequence.oid);
      const unsafeRows = await captureReviewedCapabilities();
      const nativeMutationFlag = (unsafeRows[0].owner_acl_observation as { effectiveChecks: Record<string, boolean> }).effectiveChecks.destructiveOrTriggerOrMaintain;
      const actualAppAllowed = await guard(app, 'APP');
      // Preserve both measurements even when the frozen UPDATE-only guard is
      // run for the root's expected USAGE regression RED. No producer PG ran.
      record({ caseId: 'A20', stage: 'MEASUREMENTS_BEFORE_EXPECTATIONS', ownedSequence, initial, rights, effect,
        afterEffect, unsafeRows, nativeMutationFlag, actualAppAllowed,
        claim: 'ROOT_ONLY_FICTIONAL_SEQUENCE_EFFECT_NOT_CUSTOMER_DATA_OR_RUNTIME_AUTHORITY' });
      expect(effect).toEqual({ role: ownerRole.name, next_value: '41' });
      expect(afterEffect.value).toEqual({ last_value: '41', is_called: true });
      expect(afterEffect.native).toMatchObject({ ...initial.native, acl: expect.any(String) });
      expect(nativeMutationFlag).toBe(true); expect(actualAppAllowed).toBe(false);
    } finally {
      // Restore installer identity before native capture, revocation or cleanup.
      await query(admin, 'RESET ROLE');
      if (ownedSequence && !ownedSequence.dropped) {
        await query(admin, 'REVOKE USAGE ON SEQUENCE ' + sequence + ' FROM ' + q(ownerRole.name));
        await dropObject(ownedSequence);
      }
      await restoreCapabilities(beforeRows);
      const afterCatalog = await controlCatalog();
      expect(canonicalAclCatalog(afterCatalog)).toEqual(canonicalAclCatalog(beforeCatalog));
      expect(await roleCatalog()).toEqual(beforeRoles); expect(await registryRows()).toEqual(beforeRows);
      expect(await guard(app, 'APP')).toBe(true);
      record({ caseId: 'A20', stage: 'EXACT_OWN_SEQUENCE_DROP_AND_NATIVE_RESTORATION', ownedSequence,
        beforeCatalog, afterCatalog, beforeRows, afterRows: await registryRows(), beforeRoles, afterRoles: await roleCatalog(),
        ordinaryRuntimeSequenceRightsUnchanged: true });
    }
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
        await query(admin, 'RESET SESSION AUTHORIZATION'); await query(admin, 'RESET ROLE'); await checkBase();
        for (const undo of repairs) { await query(admin, undo); repairs.delete(undo); }
        if (artifactInstalled && helperInstalled) record({ operation: 'FINAL_AUDITED_SOURCE_BEFORE_EXACT_DROP', catalog: await controlCatalog(),
          bindingRows: await controlRows(), capabilityRows: await registryRows(), approvedCapabilities: capabilities,
          originalBusinessRows: (await query(admin, 'SELECT id FROM ' + business())).rows,
          directNative: await nativeFunction(directFunction.oid), triggerNative: await nativeFunction(triggerFunction.oid), roles: await roleCatalog() });
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
      for (const client of clients) if (!closedClients.has(client)) {
        const status = client.getTransactionStatus() ?? null;
        try { await client.end(); closedClients.add(client); closure.push({ client: client === admin ? 'ADMIN' : 'FICTIONAL_LOGIN', status, closed: true }); }
        catch { closure.push({ client: client === admin ? 'ADMIN' : 'FICTIONAL_LOGIN', status, closed: false }); }
      }
      password = '';
      if (runVerified) writeFileSync(join(runPath!, 'audited-cleanup.json'), JSON.stringify({ verified, fixtureSetupCommitted,
        artifactInstalled, helperInstalled, cleaned, roles, objects, records, closure, installationCatalog,
        connectedOrAttemptedClients: clients.size, closedClients: closedClients.size, pendingRepairs: repairs.size, actualSQLAttempted: sqlAttempted,
        scope: 'EXACT_NEW_FICTIONAL_SCHEMA_TABLE_HELPERS_ROLES_ROUTES_ONLY_NO_DATABASE_DROP_OR_CLUSTER_CONTROL',
        claim: 'PREPARED_SUITE_IS_NOT_ACTUAL_EXECUTION_HELPER_SEMANTICS_AUTHORITY_RUNTIME_PROOF_RLS_CUTOVER_FULL_F10_OR_EXTERNAL_REVIEW' }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 60000);

});
