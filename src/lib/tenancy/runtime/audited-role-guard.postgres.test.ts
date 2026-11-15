import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

// Keep prior byte custody checks while allowing only the reviewed marked additions.
function beforePortalDependencyInsertions(text: string): string {
  for (const name of ['PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION', 'PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES', 'PORTAL_SOURCE_DEPENDENCY_ADMISSION', 'PORTAL_SOURCE_DEPENDENCY_CTES']) {
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
  "audited-role-guard.sql": "5469198859b10441ffdcfe0150624cbccec9862c13b5a20ba77614d6d19f1414",
  "audited-role-guard-installer.sql": "6cfcdf18fcf4eb9099b2b6b86f1c9d42cb0757fd2b20c1eeee5bb51a63f8297d",
  "original-runtime-login.sql": "e44dbeca8c034b0b92a8af595d3c3fcb932215ea09c8a8394b9bf7bd28c96da4",
  "original-runtime-login-installer.sql": "ba6053428fe34020c26f0e7e1e724a7fc9fa41018532875bbfb8e1909e6c8607"
};
function expectFrozenSql(text: string, name: string, historicalPin: string): void {
  expect(hash(beforePortalDependencyInsertions(text))).toBe(historicalPin);
  expect(hash(text)).toBe(portalDependencyCurrentPins[name] ?? historicalPin);
}
const sourcePath = resolve('src/lib/tenancy/runtime/control-storage.sql');
const helperPath = resolve('src/lib/tenancy/runtime/role-guard.sql');
const oldTestPath = resolve('src/lib/tenancy/runtime/role-guard.test.ts');
const testPath = resolve('src/lib/tenancy/runtime/audited-role-guard.postgres.test.ts');
const source = readFileSync(sourcePath, 'utf8');
const helper = readFileSync(helperPath, 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
// Reused accepted fixture custody. Final preparation separately pins both new audited artifacts. These hashes are source custody,
// never authentication, installation authority, runtime proof or tenant authority.
const expectedSourceSHA256 = '4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66';
const expectedHelperSHA256 = '7c0ce83b99d401aac9a31db391cb750b676a22bf3c76e440194de986299bbd6a';
const expectedOldTestSHA256 = '0d4be75794a63927d94148b2cc8ce6931dfdaf72672ce04b07467b51744f783a';
const auditedStoragePath = resolve('src/lib/tenancy/runtime/audited-helper-storage.sql');
const auditedGuardPath = resolve('src/lib/tenancy/runtime/audited-role-guard.sql');
// Actual root invocation is held until final preparation pins frozen source.
const expectedAuditedStorageSHA256 = '2a7d8c979e5e854ddd0e516a07ce20eed15365efcfb1c21812ffffe9e31d9603';
const expectedAuditedGuardSHA256 = '28ce7c57e59426c12437fb4c14ded3e48c074ff67c9051ac36ae3e180c83443f';
const counterSourcePath = resolve('src/lib/tenancy/runtime/workspace-incarnation-storage.sql');
const parentSourcePath = resolve('db/migrations/0008_workspace_positions.sql');
const expectedCounterSourceSHA256 = 'b3d8c8ecf96fb4ff72255e85a53a50ddc97a1633dfdf94cea19b4496382a07f9';
const expectedParentSourceSHA256 = 'f517e18d468556c25814141a959427c969f620fa4ac6e98cc709b31ee1d88756';
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
  kind: 'schema' | 'table' | 'sequence' | 'function' | 'trigger' | 'policy'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; dropped: boolean;
  relation?: string;
};
type Settings = { oid: string; definition: string; rules: string[] };

// HOLD by default: no lease discovery, ambient URL, fixture startup or SQL.
// One supplied variable without the other fails before connections. Only root's
// explicit source-bound fresh fictional fixture invocation may execute this file.
describe.skipIf(!leasePath && !runPath)('owned PostgreSQL audited runtime helper successor', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client;
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


  let fenceInstaller: Client | undefined;
  const pendingFenceAttempts = new Set<Promise<unknown>>();
  async function fenceIdentity(client: Client, expectedName: string, expectedOid: string) {
    const native = (await query(client, `SELECT pg_catalog.pg_backend_pid() pid,session_user::text session,
      current_user::text current_role,pg_catalog.current_setting('role') role,
      (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid`)).rows[0];
    expect(native).toMatchObject({ session: expectedName, current_role: expectedName, role: 'none', original_oid: expectedOid });
    return native;
  }
  function fenceKeyTuple(pid: number, mode: string, granted: boolean) {
    const bits = BigInt('0x' + hash('nevora.runtime.catalog-fence.v1:' + String(lease.databaseOid)).slice(0, 16));
    return { database: String(lease.databaseOid), classid: (bits >> BigInt(32)).toString(),
      objid: (bits & BigInt('4294967295')).toString(), objsubid: 1, pid, mode, granted };
  }
  async function fenceLocks(pids: number[]) {
    return (await query(admin, `SELECT database::text database,classid::text classid,objid::text objid,objsubid,pid,mode,granted
      FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=ANY($1::int4[]) ORDER BY pid,mode`, [pids])).rows;
  }
  async function fencePoll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_installer_fence_observation_timeout_' + label);
  }
  async function exactNewDrop(object: ObjectReceipt) {
    if (object.kind === 'table') expect((await query(admin,
      'SELECT pg_catalog.to_regclass($1)::oid::text oid', [q(object.schema) + '.' + q(object.name)])).rows).toEqual([{ oid: object.oid }]);
    await dropObject(object);
  }
  function stagedArtifact(artifact: string) {
    const begin = 'BEGIN ISOLATION LEVEL READ COMMITTED;';
    expect(artifact.split(begin)).toHaveLength(2);
    const end = artifact.indexOf(begin) + begin.length, opening = artifact.slice(0, end), tail = artifact.slice(end);
    expect(tail.startsWith('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text + '\n')).toBe(true);
    const remaining = tail.slice(1 + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text.length);
    expect(opening + '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text + remaining).toBe(artifact);
    expect(remaining.startsWith('\nSET LOCAL search_path = pg_catalog;')).toBe(true);
    return { opening, remaining };
  }
  async function installerFenceAttempt(caseId: string, artifact: string, staged: boolean, expectedCode: string,
    changeWhileWaiting?: () => Promise<void>) {
    fenceInstaller ??= await connect(lease.user);
    const installer = fenceInstaller;
    expect(installer.getTransactionStatus()).toBe('I'); expect(app.getTransactionStatus()).toBe('I');
    const installerIdentity = await fenceIdentity(installer, lease.user, installerOid), readerIdentity = await fenceIdentity(app, appRole.name, appRole.oid);
    const pids = [installerIdentity.pid as number, readerIdentity.pid as number];
    const beforeDefault = (await query(installer, 'SHOW default_transaction_isolation')).rows[0].default_transaction_isolation as string;
    expect(['read committed', 'repeatable read', 'serializable']).toContain(beforeDefault);
    let pending: Promise<{ sqlstate: string; commands: string[]; nativeRows: unknown[] }> | undefined;
    let blocked: unknown, nativeIsolation: unknown, outcome: unknown, failed: unknown;
    try {
      await query(installer, "SET default_transaction_isolation='repeatable read'");
      expect((await query(installer, 'SHOW default_transaction_isolation')).rows).toEqual([{ default_transaction_isolation: 'repeatable read' }]);
      await query(app, 'BEGIN ISOLATION LEVEL READ COMMITTED');
      await query(app, RUNTIME_CATALOG_SHARED_FENCE_SQL.text, [...RUNTIME_CATALOG_SHARED_FENCE_SQL.values]);
      expect(await fenceLocks(pids)).toEqual([fenceKeyTuple(readerIdentity.pid as number, 'ShareLock', true)]);
      const parts = staged ? stagedArtifact(artifact) : null;
      if (parts) await query(installer, parts.opening);
      // Entire-source mode deliberately remains ONE original native query call.
      // Staged mode sends the exact first source statements and inserts only a
      // test observation after acquire, before the unchanged prerequisite body.
      pending = installer.query(parts ? INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text : artifact).then(result => ({
        sqlstate: 'NO_ERROR', commands: Array.isArray(result) ? result.map(row => row.command as string) : [result.command],
        nativeRows: Array.isArray(result) ? result.map(row => row.rows) : [result.rows],
      }), error => ({ sqlstate: sqlstate(error), commands: [], nativeRows: [] }));
      pendingFenceAttempts.add(pending);
      await fencePoll(async () => {
        const locks = await fenceLocks(pids);
        if (!locks.some(row => JSON.stringify(row) === JSON.stringify(fenceKeyTuple(installerIdentity.pid as number, 'ExclusiveLock', false)))) return false;
        const activity = (await query(admin, `SELECT pid,usename::text name,usesysid::text original_oid,state,wait_event_type,wait_event,
          pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1`, [installerIdentity.pid])).rows;
        expect(activity).toMatchObject([{ pid: installerIdentity.pid, name: lease.user, original_oid: installerOid,
          state: 'active', wait_event_type: 'Lock', wait_event: 'advisory' }]);
        expect(activity[0].blockers).toContain(readerIdentity.pid);
        expect(locks).toContainEqual(fenceKeyTuple(readerIdentity.pid as number, 'ShareLock', true));
        const relations = (await query(admin, `SELECT l.database::text database,l.relation::text oid,l.mode,l.granted,n.nspname,c.relname
          FROM pg_catalog.pg_locks l LEFT JOIN pg_catalog.pg_class c ON c.oid=l.relation
          LEFT JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE l.pid=$1 AND l.locktype='relation' ORDER BY l.relation,l.mode`, [installerIdentity.pid])).rows;
        const prerequisites = ['pg_namespace', 'pg_class', 'pg_attribute', 'pg_constraint', 'pg_trigger', 'pg_rewrite', 'pg_roles'];
        expect(relations.filter(row => row.nspname === 'nevora_tenancy' || prerequisites.includes(row.relname))).toEqual([]);
        blocked = { locks, activity, relations, assertion: 'NO_PREREQUISITE_OR_FIXTURE_RELATION_LOCK_BEFORE_EXCLUSIVE_ACQUIRE' };
        return true;
      }, 'EXCLUSIVE_WAIT');
      record({ caseId, stage: 'ACTUAL_BLOCKED_BEFORE_PREREQUISITES', invocation: staged ? 'STAGED_EXACT_SOURCE_OBSERVATION_SEAM' : 'ENTIRE_FROZEN_ARTIFACT_SINGLE_QUERY',
        sourceSHA256: hash(artifact), installerIdentity, readerIdentity, beforeDefault, blocked });
      if (changeWhileWaiting) await changeWhileWaiting();
      await query(app, 'COMMIT'); outcome = await pending; pendingFenceAttempts.delete(pending); pending = undefined;
      if (parts) {
        expect(outcome).toMatchObject({ sqlstate: 'NO_ERROR', commands: ['SELECT'], nativeRows: [[{ catalog_fence: '' }]] }); expect(installer.getTransactionStatus()).toBe('T');
        expect(await fenceLocks(pids)).toEqual([fenceKeyTuple(installerIdentity.pid as number, 'ExclusiveLock', true)]);
        nativeIsolation = (await query(installer, `SELECT pg_catalog.current_setting('transaction_isolation') isolation,
          pg_catalog.current_setting('default_transaction_isolation') session_default,session_user::text session,current_user::text current_role`)).rows;
        expect(nativeIsolation).toEqual([{ isolation: 'read committed', session_default: 'repeatable read', session: lease.user, current_role: lease.user }]);
        record({ caseId, stage: 'NATIVE_READ_COMMITTED_AFTER_WAIT_BEFORE_PREREQUISITES', nativeIsolation, acquireOutcome: outcome, sourceReconstructionSHA256: hash(parts.opening + '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text + parts.remaining) });
        const code = await rejected(installer, parts.remaining); outcome = { sqlstate: code };
      }
      expect(outcome).toMatchObject({ sqlstate: expectedCode });
      if (expectedCode !== 'NO_ERROR') {
        const immediateStatus = installer.getTransactionStatus();
        await fencePoll(async () => {
          const activity = (await query(admin, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [installerIdentity.pid])).rows;
          return activity.length === 1 && activity[0].state === 'idle in transaction (aborted)' && installer.getTransactionStatus() === 'E';
        }, 'ABORTED_NATIVE_AND_READY_FOR_QUERY');
        expect(installer.getTransactionStatus()).toBe('E'); expect(await rejected(installer, 'SELECT 1')).toBe('25P02');
        failed = { immediateStatus, synchronizedStatus: installer.getTransactionStatus(), locksBeforeRollback: await fenceLocks(pids),
          backend: (await query(admin, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [installerIdentity.pid])).rows, subsequentSQLstate: '25P02' };
        await query(installer, 'ROLLBACK');
      }
      expect(installer.getTransactionStatus()).toBe('I'); expect(await fenceLocks(pids)).toEqual([]);
      record({ caseId, stage: 'SOURCE_ATTEMPT_FINISHED', outcome, nativeIsolation, failed, locksAfterEnd: await fenceLocks(pids),
        claim: 'SINGLE_OWNED_DATABASE_INSTALLER_PROTOCOL_ONLY_NOT_ALL_WRITER_ADOPTION_OR_RUNTIME_AUTHORITY' });
    } finally {
      if (['T', 'E'].includes(app.getTransactionStatus() ?? '')) await query(app, 'ROLLBACK');
      if (pending) { const reconciled = await pending; pendingFenceAttempts.delete(pending); record({ caseId, stage: 'PENDING_OWN_ATTEMPT_RECONCILED', reconciled }); }
      if (['T', 'E'].includes(installer.getTransactionStatus() ?? '')) await query(installer, 'ROLLBACK');
      await query(installer, "SELECT pg_catalog.set_config('default_transaction_isolation',$1,false)", [beforeDefault]);
      expect((await query(installer, 'SHOW default_transaction_isolation')).rows).toEqual([{ default_transaction_isolation: beforeDefault }]);
      expect(await fenceIdentity(installer, lease.user, installerOid)).toEqual(installerIdentity);
      expect(await fenceIdentity(app, appRole.name, appRole.oid)).toEqual(readerIdentity);
      expect(await fenceLocks(pids)).toEqual([]); record({ caseId, stage: 'OWN_CLIENT_DEFAULT_AND_NATIVE_IDENTITY_RESTORED', beforeDefault, pending: pendingFenceAttempts.size });
    }
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
    expectFrozenSql(auditedGuard, 'audited-role-guard.sql', expectedAuditedGuardSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/catalog-fence.server.ts')))).toBe('2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f');
    expect(hash(readFileSync(counterSourcePath))).toBe(expectedCounterSourceSHA256);
    expect(hash(readFileSync(parentSourcePath))).toBe(expectedParentSourceSHA256);
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
    app = await connect(appRole.name); worker = await connect(workerRole.name); await connect(outsiderRole.name);
    writeFileSync(join(runPath!, 'control-fixture-custody.json'), JSON.stringify({ base: actual, roles, installerOid,
      fixtureSetupCommitted, sourceSHA256: hash(source), helperSHA256: hash(helper),
      claim: 'EXPLICIT_FICTIONAL_TEST_ROLES_ONLY_NO_RUNTIME_AUTHORITY' }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 30000);


  // Added cases restore the exact original installed fixture before A01-A20.
  // Temporary names are own-object observation seams, never object adoption.
  it('AFI01 waits then installs from exact staged READ COMMITTED source and restores the original capability OID', async () => {
    const before = await controlCatalog(), beforeRows = await registryRows(), binding = await controlRows();
    const original = objects.find(object => object.kind === 'table' && object.name === 'audited_helper_capability' && !object.dropped)!;
    const shadow = lease.invocation + '_cap_fence_shadow', undo = 'ALTER TABLE nevora_tenancy.' + q(shadow) + ' RENAME TO audited_helper_capability';
    expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.audited_helper_capability'])).rows).toEqual([{ oid: original.oid }]);
    expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.' + q(shadow)])).rows).toEqual([{ oid: null }]);
    repairs.add(undo); await query(admin, 'ALTER TABLE nevora_tenancy.audited_helper_capability RENAME TO ' + q(shadow));
    let replacement: ObjectReceipt | undefined;
    try {
      await installerFenceAttempt('AFI01', auditedStorage, true, 'NO_ERROR');
      replacement = await remember('table', 'nevora_tenancy', 'audited_helper_capability', installerOid);
      expect(replacement.oid).not.toBe(original.oid); expect(await registryRows()).toEqual([]);
      expect((await controlCatalog()).columns.filter(column => column.relname === 'audited_helper_capability')).toHaveLength(12);
      record({ caseId: 'AFI01', original, shadow, replacement, emptyRows: [], catalog: await controlCatalog(), stagedObservationOnly: true });
    } finally {
      if (replacement) await exactNewDrop(replacement);
      expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.' + q(shadow)])).rows).toEqual([{ oid: original.oid }]);
      await query(admin, undo); repairs.delete(undo);
    }
    expect(canonicalAclCatalog(await controlCatalog())).toEqual(canonicalAclCatalog(before)); expect(await registryRows()).toEqual(beforeRows); expect(await controlRows()).toEqual(binding);
    record({ caseId: 'AFI01', stage: 'EXACT_ORIGINAL_NATIVE_CAPABILITY_RESTORED', original, before, after: await controlCatalog(), beforeRows, afterRows: await registryRows() });
  });
  it('AFI02 whole-source installer sees changed own schema owner after wait despite repeatable-read default', async () => {
    const before = await controlCatalog(), rows = await registryRows(), binding = await controlRows();
    const schema = objects.find(object => object.kind === 'schema' && !object.dropped)!;
    const undo = 'ALTER SCHEMA nevora_tenancy OWNER TO ' + q(lease.user);
    try {
      await installerFenceAttempt('AFI02', auditedStorage, false, '42501', async () => {
        expect(before.schema.filter(row => row.nspname === 'nevora_tenancy')).toMatchObject([{ oid: schema.oid, owner: installerOid }]); repairs.add(undo);
        await query(admin, 'ALTER SCHEMA nevora_tenancy OWNER TO ' + q(outsiderRole.name));
        expect((await controlCatalog()).schema.filter(row => row.nspname === 'nevora_tenancy')).toMatchObject([{ oid: schema.oid, owner: outsiderRole.oid }]);
        record({ caseId: 'AFI02', stage: 'DELIBERATE_NONCOOPERATING_OWN_SCHEMA_OWNER_DELTA', schema, before, changed: await controlCatalog() });
      });
    } finally { if (repairs.has(undo)) { await query(admin, undo); repairs.delete(undo); } }
    expect(canonicalAclCatalog(await controlCatalog())).toEqual(canonicalAclCatalog(before)); expect(await registryRows()).toEqual(rows); expect(await controlRows()).toEqual(binding);
    record({ caseId: 'AFI02', stage: 'EXACT_SCHEMA_AND_SOURCE_RESTORED', before, after: await controlCatalog(), rows, binding });
  });
  it('AFI03 whole-source duplicate rejection after a native wait preserves every original registry row and source tuple', async () => {
    const before = await controlCatalog(), rows = await registryRows(), binding = await controlRows();
    await installerFenceAttempt('AFI03', auditedStorage, false, '42P07');
    expect(await controlCatalog()).toEqual(before); expect(await registryRows()).toEqual(rows); expect(await controlRows()).toEqual(binding);
    record({ caseId: 'AFI03', before, after: await controlCatalog(), rows, binding });
  });
  it('AFI04 whole-source missing binding after a wait fails before duplicate/adoption then restores its exact OID', async () => {
    const before = await controlCatalog(), rows = await registryRows(), binding = await controlRows();
    const original = objects.find(object => object.kind === 'table' && object.name === 'runtime_role_binding' && !object.dropped)!;
    const shadow = lease.invocation + '_binding_fence_shadow', undo = 'ALTER TABLE nevora_tenancy.' + q(shadow) + ' RENAME TO runtime_role_binding';
    expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.' + q(shadow)])).rows).toEqual([{ oid: null }]);
    try {
      await installerFenceAttempt('AFI04', auditedStorage, false, '55000', async () => {
        expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.runtime_role_binding'])).rows).toEqual([{ oid: original.oid }]);
        repairs.add(undo); await query(admin, 'ALTER TABLE nevora_tenancy.runtime_role_binding RENAME TO ' + q(shadow));
        expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.' + q(shadow)])).rows).toEqual([{ oid: original.oid }]);
        record({ caseId: 'AFI04', stage: 'EXACT_OWN_BINDING_NAME_DELTA_WHILE_WAITING', original, shadow, changed: await controlCatalog() });
      });
    } finally {
      if (repairs.has(undo)) {
        expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['nevora_tenancy.' + q(shadow)])).rows).toEqual([{ oid: original.oid }]);
        await query(admin, undo); repairs.delete(undo);
      }
    }
    expect(await controlCatalog()).toEqual(before); expect(await registryRows()).toEqual(rows); expect(await controlRows()).toEqual(binding);
    record({ caseId: 'AFI04', stage: 'EXACT_ORIGINAL_BINDING_RESTORED', original, before, after: await controlCatalog(), rows, binding });
  });

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
    const originalBackend = await fenceIdentity(app, appRole.name, appRole.oid);
    await query(app, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      expect((await query(app, wrapper)).rows).toEqual([{ guard: 1 }]);
      expect((await query(app, 'UPDATE ' + business() + ' SET id=2 WHERE id=1 RETURNING id')).rows).toEqual([{ id: 2 }]);
      await mutateGrant('GRANT CREATE ON DATABASE ' + q(lease.database) + ' TO ' + q(appRole.name), 'REVOKE CREATE ON DATABASE ' + q(lease.database) + ' FROM ' + q(appRole.name), async () => {
        expect(await rejected(app, wrapper)).toBe('22012');
        const immediateStatus = app.getTransactionStatus();
        let nativeAborted: Record<string, unknown>[] = [];
        await fencePoll(async () => {
          nativeAborted = (await query(admin, `SELECT pid,usename::text name,usesysid::text original_oid,state
            FROM pg_catalog.pg_stat_activity WHERE pid=$1`, [originalBackend.pid])).rows;
          return nativeAborted.length === 1 && nativeAborted[0].state === 'idle in transaction (aborted)' && app.getTransactionStatus() === 'E';
        }, 'A16_NATIVE_ABORT_AND_READY_FOR_QUERY');
        expect(nativeAborted).toEqual([{ pid: originalBackend.pid, name: appRole.name,
          original_oid: appRole.oid, state: 'idle in transaction (aborted)' }]);
        expect(app.getTransactionStatus()).toBe('E');
        record({ caseId: 'A16', stage: 'NATIVE_ABORT_AND_READY_STATUS_SYNCHRONIZED', immediateStatus,
          synchronizedStatus: app.getTransactionStatus(), nativeAborted, originalBackend });
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
      record({ caseId: 'A18', stage: 'PREREQUISITE_ERROR_BEFORE_READY_STATUS_SYNCHRONIZATION',
        sqlstate: code, immediateStatus: admin.getTransactionStatus(),
        note: 'The error promise may settle before native ReadyForQuery updates client status.' });
      try { expect(code).toBe('55000'); }
      finally {
        // This exact artifact owns BEGIN, invoked above from verified idle.
        // Queue ROLLBACK even if the early error leaves the cached status idle.
        await query(admin, 'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I');
      }
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

  it('A21 binds exact native counter policies to genuinely captured lock columns and denies every stale registration', async () => {
    // Only root may invoke this sparse fixture. Literal reviewed functions remain
    // literal fixtures; neither this registry nor a true guard issues a proof.
    const beforeCatalog = await controlCatalog(), beforeRows = await registryRows(), beforeRoles = await roleCatalog();
    const originalBinding = await controlRows(), firstObject = objects.length;
    const counter = 'nevora_tenancy.workspace_incarnation_counter';
    const workspaceId = ' ' + lease.invocation + '_counter_workspace ';
    const selectName = lease.invocation + '_counter_select', updateName = lease.invocation + '_counter_update';
    let selectPolicy: ObjectReceipt | undefined, updatePolicy: ObjectReceipt | undefined;
    let sourceCounter: ObjectReceipt | undefined, sourceParent: ObjectReceipt | undefined;
    let ownerUsageGranted = false;
    const fixturePolicy = (name: string, command: 'SELECT' | 'UPDATE' | 'ALL', permissive = true, target = ownerRole.name) =>
      'CREATE POLICY ' + q(name) + ' ON ' + counter + ' AS ' + (permissive ? 'PERMISSIVE' : 'RESTRICTIVE') +
      ' FOR ' + command + ' TO ' + q(target) + ' USING (true)' + (command === 'SELECT' ? '' : ' WITH CHECK (false)');
    const counterRows = async () => (await query(admin, 'SELECT workspace_id,incarnation::text incarnation FROM ' + counter + ' ORDER BY workspace_id COLLATE pg_catalog."C"')).rows;
    const parentRows = async () => (await query(admin, 'SELECT pg_catalog.to_jsonb(w) value FROM public.workspaces w ORDER BY id COLLATE pg_catalog."C"')).rows;
    async function fenced<T>(body: () => Promise<T>): Promise<T> {
      expect(admin.getTransactionStatus()).toBe('I');
      await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
      try {
        await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text, [...INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.values]);
        const result = await body(); await query(admin, 'COMMIT'); return result;
      } finally { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); }
    }
    async function rememberPolicy(name: string) {
      const current = (await query(admin, `SELECT p.oid::text oid,c.relowner::text owner,p.polname name
        FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid
        WHERE p.polrelid=pg_catalog.to_regclass($1) AND p.polname=$2`, [counter, name])).rows;
      expect(current).toEqual([{ oid: expect.stringMatching(/^[0-9]+$/), owner: installerOid, name }]);
      const receipt: ObjectReceipt = { kind: 'policy', schema: 'nevora_tenancy', name,
        oid: current[0].oid as string, ownerOid: installerOid, relation: counter, dropped: false };
      objects.push(receipt); record({ operation: 'EXACT_OWN_COUNTER_POLICY_OBSERVED', ...receipt }); return receipt;
    }
    async function independentPolicies() {
      // Independent native catalog read, not an expected-value constructor or
      // a copied registration. OID/role ordering is performed by PostgreSQL.
      return (await query(admin, `SELECT pg_catalog.jsonb_build_object(
        'oid',p.oid::text,'name',p.polname::text,'command',p.polcmd::text,'permissive',p.polpermissive,
        'roleOids',pg_catalog.to_jsonb(ARRAY(SELECT r::text FROM pg_catalog.unnest(p.polroles) AS r ORDER BY r)),
        'using',pg_catalog.pg_get_expr(p.polqual,p.polrelid,false),
        'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false)) AS observation
        FROM pg_catalog.pg_policy p WHERE p.polrelid=pg_catalog.to_regclass($1) ORDER BY p.oid`, [counter])).rows
        .map(row => row.observation as Record<string, unknown>);
    }
    async function counterNative() {
      return { catalog: await controlCatalog(), policies: await independentPolicies(),
        indexes: (await query(admin, `SELECT i.indexrelid::text oid,i.indrelid::text relation_oid,
          c.relowner::text owner,c.relname,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indislive,
          i.indimmediate,i.indnullsnotdistinct,i.indnatts,i.indnkeyatts,i.indkey::text keys,
          i.indclass::text opclasses,i.indcollation::text collations,i.indoption::text options,c.reloptions,
          pg_catalog.pg_get_indexdef(i.indexrelid) definition FROM pg_catalog.pg_index i
          JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid
          WHERE i.indrelid=pg_catalog.to_regclass($1) OR i.indrelid='public.workspaces'::regclass ORDER BY i.indexrelid`, [counter])).rows,
        columnAcls: (await query(admin, `SELECT a.attrelid::text relation_oid,a.attnum,a.attname,
          x.grantor::text grantor,x.grantee::text grantee,x.privilege_type,x.is_grantable
          FROM pg_catalog.pg_attribute a CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) x
          WHERE a.attrelid=pg_catalog.to_regclass($1) AND a.attnum>0 AND NOT a.attisdropped
          ORDER BY a.attnum,x.grantee,x.privilege_type,x.grantor`, [counter])).rows,
        counterRows: await counterRows(), originalParentRows: await parentRows() };
    }
    async function captureCounterCapabilities() {
      return fenced(async () => {
        const original = await registryRows(); expect(original).toHaveLength(2);
        const command = nativeQuery(`SELECT lock_column.observation FROM audit_lock_columns lock_column
          WHERE lock_column.relation_oid=pg_catalog.to_regclass($1) AND lock_column.observation->>'column'='workspace_id'`);
        const observed = (await query(admin, command.sql, [counter])).rows;
        expect(observed).toHaveLength(1); const lockColumn = observed[0].observation as Record<string, unknown>;
        expect(lockColumn).toMatchObject({ relationOid: sourceCounter!.oid, schema: 'nevora_tenancy',
          name: 'workspace_incarnation_counter', column: 'workspace_id', typeOid: '25' });
        const independent = await counterNative();
        // Keep precisely the old/new helper's actually returned shape. Adding
        // expected policy fields here would make the old RED a setup failure.
        const provisional: Record<string, unknown>[] = original.map(row => ({ ...row, owner_lock_columns: [lockColumn],
          owner_observation: {}, owner_acl_observation: {} }));
        await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability');
        for (const row of provisional) await writeCapability(row);
        const direct = await functionObservation(directFunction.oid), trigger = await functionObservation(triggerFunction.oid);
        expect(direct.review_source_sha256).toBe(reviewedDirectSHA256);
        expect(trigger.review_source_sha256).toBe(reviewedTriggerSHA256);
        expect(direct.owner_observation).toEqual(trigger.owner_observation);
        expect(direct.owner_acl_observation).toEqual(trigger.owner_acl_observation);
        const captured: Record<string, unknown>[] = provisional.map(row => ({ ...row, owner_observation: direct.owner_observation,
          owner_acl_observation: direct.owner_acl_observation }));
        for (const row of captured) await query(admin, `UPDATE nevora_tenancy.audited_helper_capability
          SET owner_observation=$1::jsonb,owner_acl_observation=$2::jsonb
          WHERE runtime_kind=$3 AND route_kind=$4 AND function_oid=$5::oid AND route_oid=$6::oid`,
        [JSON.stringify(row.owner_observation), JSON.stringify(row.owner_acl_observation), row.runtime_kind, row.route_kind, row.function_oid, row.route_oid]);
        expect(await registryRows()).toEqual(captured);
        record({ caseId: 'A21', stage: 'GENUINE_FENCED_NATIVE_LOCK_AND_ALL_OWNER_PROFILES',
          helperSourceSHA256: hash(auditedGuard), nativeCTESHA256: command.blockSHA256,
          originalRows: original, nativeLockColumn: lockColumn, independentNative: independent,
          provisional, captured, noExpectedPolicyFieldsAdded: true, noFalseEffectiveChecksConstructor: true });
        return { captured, lockColumn, independentPolicies: independent.policies };
      });
    }
    async function replacePolicy(which: 'SELECT' | 'UPDATE', command: 'SELECT' | 'UPDATE' | 'ALL', permissive: boolean) {
      const prior = which === 'SELECT' ? selectPolicy : updatePolicy; expect(prior).toBeDefined();
      await dropObject(prior!);
      const name = which === 'SELECT' ? selectName : updateName;
      await query(admin, fixturePolicy(name, command, permissive));
      const next = await rememberPolicy(name);
      if (which === 'SELECT') selectPolicy = next; else updatePolicy = next;
    }
    try {
      expect(await guard(app, 'APP')).toBe(true);
      await fenced(async () => {
        expect((await query(admin, 'SELECT pg_catalog.to_regclass(\'public.workspaces\')::oid::text oid')).rows).toEqual([{ oid: null }]);
        const original = readFileSync(parentSourcePath, 'utf8');
        expect(hash(original)).toBe(expectedParentSourceSHA256);
        const fragments = original.match(/CREATE TABLE workspaces \([\s\S]*?\n\);/g); expect(fragments).toHaveLength(1);
        await query(admin, 'SET LOCAL search_path=public,pg_catalog'); await query(admin, fragments![0]);
        sourceParent = await remember('table', 'public', 'workspaces', installerOid);
        await query(admin, `INSERT INTO public.workspaces(id,name,time_zone) VALUES($1,'Fictional counter policy workspace','UTC')`, [workspaceId]);
        record({ caseId: 'A21', stage: 'EXACT_ORIGINAL_0008_SPARSE_PARENT', sourceParent,
          sourceSHA256: hash(original), fragment: fragments![0], fragmentSHA256: hash(fragments![0]),
          originalParentRows: await parentRows(), sparseOnlyNotCutover: true });
      });
      // This unchanged artifact owns its own RC/exclusive-first transaction.
      await query(admin, readFileSync(counterSourcePath, 'utf8'));
      sourceCounter = await remember('table', 'nevora_tenancy', 'workspace_incarnation_counter', installerOid);
      await remember('function', 'nevora_tenancy', 'guard_workspace_incarnation_counter', installerOid, '()');
      const nativeTriggers = (await query(admin, `SELECT t.oid::text oid,t.tgname name,c.relowner::text owner
        FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        WHERE t.tgrelid=pg_catalog.to_regclass($1) AND NOT t.tgisinternal ORDER BY t.oid`, [counter])).rows;
      expect(nativeTriggers).toHaveLength(2);
      for (const trigger of nativeTriggers) {
        expect(trigger.owner).toBe(installerOid);
        const receipt: ObjectReceipt = { kind: 'trigger', schema: 'nevora_tenancy', name: trigger.name as string,
          oid: trigger.oid as string, ownerOid: installerOid, relation: counter, dropped: false };
        objects.push(receipt); record({ operation: 'EXACT_OWN_COUNTER_TRIGGER_OBSERVED', ...receipt });
      }
      await fenced(async () => {
        expect(await counterRows()).toEqual([]);
        await query(admin, 'INSERT INTO ' + counter + '(workspace_id,incarnation) VALUES($1,1)', [workspaceId]);
        await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + q(ownerRole.name)); ownerUsageGranted = true;
        await query(admin, 'GRANT SELECT,UPDATE(workspace_id) ON ' + counter + ' TO ' + q(ownerRole.name));
        await query(admin, fixturePolicy(selectName, 'SELECT')); selectPolicy = await rememberPolicy(selectName);
        await query(admin, fixturePolicy(updateName, 'UPDATE')); updatePolicy = await rememberPolicy(updateName);
      });
      const established = await counterNative(), originalParent = established.originalParentRows;
      expect(established.counterRows).toEqual([{ workspace_id: workspaceId, incarnation: '1' }]);
      expect(established.policies).toEqual([
        { oid: selectPolicy!.oid, name: selectName, command: 'r', permissive: true, roleOids: [ownerRole.oid], using: 'true', withCheck: null },
        { oid: updatePolicy!.oid, name: updateName, command: 'w', permissive: true, roleOids: [ownerRole.oid], using: 'true', withCheck: 'false' },
      ]);
      expect((await query(admin, `SELECT pg_catalog.has_table_privilege($1,$2::oid,'SELECT') read,
        pg_catalog.has_table_privilege($1,$2::oid,'UPDATE') table_update,
        pg_catalog.has_column_privilege($1,$2::oid,'workspace_id','UPDATE') identity_update,
        pg_catalog.has_column_privilege($1,$2::oid,'incarnation','UPDATE') counter_update`, [ownerRole.name, sourceCounter.oid])).rows)
        .toEqual([{ read: true, table_update: false, identity_update: true, counter_update: false }]);
      await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
      try {
        await query(admin, 'SET LOCAL ROLE ' + q(ownerRole.name));
        const identity = (await query(admin, 'SELECT pg_catalog.pg_backend_pid() pid,session_user::text session,current_user::text current_role')).rows[0];
        expect(identity).toMatchObject({ session: lease.user, current_role: ownerRole.name });
        const held = (await query(admin, 'SELECT workspace_id,incarnation::text incarnation FROM ' + counter + ' WHERE workspace_id=$1 FOR SHARE', [workspaceId])).rows;
        expect(held).toEqual(established.counterRows); expect(admin.getTransactionStatus()).toBe('T');
        const denials: { label: string; code: string }[] = [];
        for (const [label, sql, values, expected] of [
          ['IDENTITY_SAME_NO_INCARNATION_ADVANCE', 'UPDATE ' + counter + ' SET workspace_id=$1 WHERE workspace_id=$1', [workspaceId], '23514'],
          ['IMMUTABLE_IDENTITY', 'UPDATE ' + counter + ' SET workspace_id=$2 WHERE workspace_id=$1', [workspaceId, workspaceId + 'x'], '55000'],
          ['NO_INCARNATION_COLUMN_GRANT', 'UPDATE ' + counter + ' SET incarnation=2 WHERE workspace_id=$1', [workspaceId], '42501'],
          ['NO_INSERT_GRANT', 'INSERT INTO ' + counter + '(workspace_id,incarnation) VALUES($1,2)', [workspaceId], '42501'],
          ['NO_DELETE_GRANT', 'DELETE FROM ' + counter + ' WHERE workspace_id=$1', [workspaceId], '42501'],
          ['NO_TRUNCATE_GRANT', 'TRUNCATE ' + counter, [], '42501'],
        ] as const) {
          await query(admin, 'SAVEPOINT counter_owner_probe');
          const code = await rejected(admin, sql, [...values]); denials.push({ label, code });
          await query(admin, 'ROLLBACK TO SAVEPOINT counter_owner_probe'); await query(admin, 'RELEASE SAVEPOINT counter_owner_probe');
          expect(code).toBe(expected);
        }
        await query(admin, 'RESET ROLE');
        const nativeLocks = (await query(admin, `SELECT pid,relation::text relation_oid,mode,granted FROM pg_catalog.pg_locks
          WHERE pid=$1 AND relation=$2::oid ORDER BY mode`, [identity.pid, sourceCounter.oid])).rows;
        expect(nativeLocks).toContainEqual({ pid: identity.pid, relation_oid: sourceCounter.oid, mode: 'RowShareLock', granted: true });
        record({ caseId: 'A21', stage: 'NATIVE_FOR_SHARE_AND_EXACT_OWNER_NONMUTATION', identity, held, nativeLocks, denials,
          withCheckFalseNativeSource: established.policies, triggerDenialsNotMislabelledAsRlsCheck: true });
      } finally { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); await query(admin, 'RESET ROLE'); }
      for (const [client, role] of [[app, appRole], [worker, workerRole]] as const) {
        const outcomes: string[] = [];
        for (const sql of ['SELECT * FROM ' + counter, 'UPDATE ' + counter + ' SET workspace_id=workspace_id WHERE false',
          'DELETE FROM ' + counter + ' WHERE false', 'INSERT INTO ' + counter + '(workspace_id,incarnation) VALUES(\'fictional\',1)', 'TRUNCATE ' + counter]) {
          const code = await rejected(client, sql); outcomes.push(code); expect(code).toBe('42501');
        }
        record({ caseId: 'A21', stage: 'NO_DIRECT_APP_WORKER_COUNTER_ACCESS', role, outcomes });
      }
      let captured = await captureCounterCapabilities();
      expect(await guard(app, 'APP')).toBe(true); expect(await guard(worker, 'WORKER')).toBe(true);
      const changes = [
        { label: 'USING', apply: () => query(admin, 'ALTER POLICY ' + q(updateName) + ' ON ' + counter + ' USING (false)'), undo: () => query(admin, 'ALTER POLICY ' + q(updateName) + ' ON ' + counter + ' USING (true)') },
        { label: 'ROLE_TARGET', apply: () => query(admin, 'ALTER POLICY ' + q(selectName) + ' ON ' + counter + ' TO ' + q(outsiderRole.name)), undo: () => query(admin, 'ALTER POLICY ' + q(selectName) + ' ON ' + counter + ' TO ' + q(ownerRole.name)) },
        { label: 'COMMAND', apply: () => replacePolicy('SELECT', 'ALL', true), undo: () => replacePolicy('SELECT', 'SELECT', true) },
        { label: 'PERMISSIVENESS', apply: () => replacePolicy('UPDATE', 'UPDATE', false), undo: () => replacePolicy('UPDATE', 'UPDATE', true) },
        { label: 'WITH_CHECK', apply: () => query(admin, 'ALTER POLICY ' + q(updateName) + ' ON ' + counter + ' WITH CHECK (true)'), undo: () => query(admin, 'ALTER POLICY ' + q(updateName) + ' ON ' + counter + ' WITH CHECK (false)') },
      ];
      for (const change of changes) {
        const priorRows = await registryRows(), priorNative = await counterNative();
        expect(priorRows).toEqual(captured.captured); expect(await guard(app, 'APP')).toBe(true);
        let applied = false;
        try {
          await fenced(async () => { await change.apply(); }); applied = true;
          const changed = await counterNative(), actualAppAllowed = await guard(app, 'APP');
          expect(changed.policies).not.toEqual(priorNative.policies);
          expect(await registryRows()).toEqual(priorRows);
          record({ caseId: 'A21', stage: 'STALE_POLICY_REGISTRATION_MEASUREMENT_BEFORE_EXPECTATION', variant: change.label,
            priorNative, changedNative: changed, priorRows, actualAppAllowed,
            capturedOldShapeHasPolicies: Object.prototype.hasOwnProperty.call(captured.lockColumn.sourceObservation, 'policies'),
            claim: 'SOURCE_METADATA_STALENESS_ONLY_NOT_ISSUER_PROOF_OR_MUTATION_AUTHORITY' });
          // Old helper native observations omit policies, so its true baseline
          // incorrectly remains true here. Root executes that cause-bearing RED.
          expect(actualAppAllowed).toBe(false);
        } finally {
          if (applied) await fenced(async () => { await change.undo(); });
          captured = await captureCounterCapabilities();
          expect(await guard(app, 'APP')).toBe(true); expect(await guard(worker, 'WORKER')).toBe(true);
          expect(await parentRows()).toEqual(originalParent);
          expect(await counterRows()).toEqual(established.counterRows);
          record({ caseId: 'A21', stage: 'EXACT_CONSISTENT_NATIVE_RECAPTURE_TECHNICAL_GUARD_ONLY', variant: change.label, captured });
        }
      }
      // This belongs after the drift behavior, never before the genuine old RED.
      expect((captured.lockColumn.sourceObservation as Record<string, unknown>).policies).toEqual(captured.independentPolicies);
      expect(await registryRows()).toEqual(captured.captured);
      record({ caseId: 'A21', stage: 'NEW_NATIVE_POLICY_CLOSURE_EQUALS_INDEPENDENT_CATALOG', captured,
        noProofIssuerOrSemanticApproval: true, counterSourceSHA256: expectedCounterSourceSHA256 });
    } finally {
      if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); await query(admin, 'RESET ROLE');
      await fenced(async () => {
        if (ownerUsageGranted) { await query(admin, 'REVOKE USAGE ON SCHEMA nevora_tenancy FROM ' + q(ownerRole.name)); ownerUsageGranted = false; }
        // Every new object is invocation-owned. A failed setup's rollback may
        // already remove its exact OID; record native absence rather than DROP
        // an unrelated object or pretend a failed transaction was committed.
        for (const object of objects.slice(firstObject).reverse()) if (!object.dropped || object.kind === 'policy') {
          const catalog = object.kind === 'policy' ? 'pg_catalog.pg_policy' : object.kind === 'trigger' ? 'pg_catalog.pg_trigger' : object.kind === 'function' ? 'pg_catalog.pg_proc' : 'pg_catalog.pg_class';
          const remaining = (await query(admin, 'SELECT oid FROM ' + catalog + ' WHERE oid=$1::oid', [object.oid])).rows;
          if (remaining.length) {
            // DROP/CREATE in a failed own transaction can restore a previously
            // dropped policy OID. Reconcile that exact owned receipt before
            // cleanup instead of trusting its earlier mutable dropped flag.
            if (object.dropped) { object.dropped = false; record({ operation: 'EXACT_OWN_POLICY_OID_RESTORED_BY_ROLLBACK', ...object }); }
            await dropObject(object);
          } else if (!object.dropped) { object.dropped = true; record({ operation: 'EXACT_OWN_SETUP_ROLLBACK_OBJECT_ABSENCE', ...object }); }
        }
        await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability');
        for (const row of beforeRows) await writeCapability(row);
        const currentDirect = await functionObservation(directFunction.oid), currentTrigger = await functionObservation(triggerFunction.oid);
        expect(currentDirect.owner_observation).toEqual(currentTrigger.owner_observation);
        expect(currentDirect.owner_acl_observation).toEqual(currentTrigger.owner_acl_observation);
        expect(beforeRows.every(row => JSON.stringify(row.owner_observation) === JSON.stringify(currentDirect.owner_observation)
          && JSON.stringify(row.owner_acl_observation) === JSON.stringify(currentDirect.owner_acl_observation))).toBe(true);
      });
      expect(canonicalAclCatalog(await controlCatalog())).toEqual(canonicalAclCatalog(beforeCatalog));
      expect(await registryRows()).toEqual(beforeRows); expect(await controlRows()).toEqual(originalBinding);
      expect(await roleCatalog()).toEqual(beforeRoles); expect(await guard(app, 'APP')).toBe(true);
      expect((await query(admin, 'SELECT id FROM ' + business())).rows).toEqual([{ id: 1 }]);
      record({ caseId: 'A21', stage: 'ALL_OWN_COUNTER_OBJECTS_AND_GRANTS_REMOVED_ORIGINAL_FIXTURE_RESTORED',
        ownedObjects: objects.slice(firstObject), beforeCatalog, afterCatalog: await controlCatalog(),
        beforeRows, afterRows: await registryRows(), sourceParent, sourceCounter });
    }
  }, 30_000);

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
        connectedOrAttemptedClients: clients.size, closedClients: closedClients.size, pendingRepairs: repairs.size,
        extraInstallerFenceClients: fenceInstaller ? 1 : 0, pendingFenceAttempts: pendingFenceAttempts.size, actualSQLAttempted: sqlAttempted,
        scope: 'EXACT_NEW_FICTIONAL_SCHEMA_TABLE_HELPERS_ROLES_ROUTES_ONLY_NO_DATABASE_DROP_OR_CLUSTER_CONTROL',
        claim: 'PREPARED_SUITE_IS_NOT_ACTUAL_EXECUTION_HELPER_SEMANTICS_AUTHORITY_RUNTIME_PROOF_RLS_CUTOVER_FULL_F10_OR_EXTERNAL_REVIEW' }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 60000);

});
