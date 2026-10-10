import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/portal-session-issuance-storage.sql');
let source = ''; // Loaded only after explicit owned opt-in and custody checks.
const parentPath = resolve('db/migrations/0008_workspace_positions.sql');
const parentSource = readFileSync(parentPath, 'utf8');
const employeeSource = readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8');
const expansionSource = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const expectedSourceSHA256 = '4625ff35db3c4c3b63ef9e575468af75f4e4935c8af9934ec5b99e3cf346397e';
const expectedSourceTestSHA256 = '0ee51f5f2e5b191feb38cf71938cc80d11941984ae9783ac881dab2440cec265';
const expectedFenceSHA256 = '2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f';
const migrationPins: Readonly<Record<string, string>> = {
  "db/migrations/0001_initial.sql": "330e125060422506f92403307224b739b73f5fc8697ed43039b22e56bcba61a1",
  "db/migrations/0002_schedule_health.sql": "0dd019d1658c22763d11531ef72b39db9e5a106bb418b1a4fc63f5caaff7f9f0",
  "db/migrations/0003_schedule_assistance.sql": "d82513ab58c0e8a84f976a05c2be0e342309467c586ded8347cce4ef9001900a",
  "db/migrations/0004_assistance_layer.sql": "c0263d1e40bbfe3aa646a4740b0fe345728783eac39dfda916495ccf7a1ab7e5",
  "db/migrations/0005_time_clock.sql": "fc4afbdf4770bd7a3a718cd54fd204bc8df1b96296c04cb676dab3f4f6d0c4e5",
  "db/migrations/0006_scheduling_rule_inputs.sql": "4a0eb437395a5f4d1873c9b06b3c1104da5a23319e968d422a5a14f3c310483a",
  "db/migrations/0007_portal_web_push.sql": "020c45cbeb1c5000be22b3ce240f94225fc0c88471e540a67246dd54085440d2",
  "db/migrations/0008_workspace_positions.sql": "f517e18d468556c25814141a959427c969f620fa4ac6e98cc709b31ee1d88756",
  "db/migrations/0009_schedule_generation.sql": "aadde6a1f5d3167ed4f346817d1feeb0c9f99f28d50adcf904a989b86120f007",
  "db/migrations/0010_shift_coverage_automation.sql": "0d8b55abe49995204bda9e63492026158b91b8dc4ca414d05c77b595a6474d8e",
  "db/migrations/0011_clocker_devices.sql": "788b748bbbd995c44f40d130ea079296aa3e6affcad86c78cbb3857e866c0cd0",
  "db/migrations/0012_clocker_pins.sql": "9b607ca2e9e111953695ba5cf1a1dbc87f65ae483caeccc3d8056f19aab8c90f",
  "db/migrations/0013_clocker_punches.sql": "f222d8b52e5cace6698f22b8d4a10fa5ffcd93db1d8c7d5cfd551a02b74216e5",
  "db/migrations/0014_clocker_breaks.sql": "c20cd86b16fe2f82c05b69687402c52f37a648eb1d79c8f1418436ed8e4c5508",
  "db/migrations/0015_clocker_schedule_context.sql": "5b5160bff760e17d4e235c35e4936271fba0b8124f5da8a8989e01478fff6796",
  "db/migrations/0016_time_corrections.sql": "36532a3efc7c641a96b447f5caf2efbd3c4184cbfae2c6e080b548fa3fac4b35",
  "db/migrations/0017_missing_time_supersession.sql": "2a35c4e3180c3294c7197af56415b231bf66a0b30417000e08de17d161ef8fea",
  "db/migrations/0018_timecards.sql": "0221827d5faa0670a85661b6a15e59882382703a42bb9800576c30a1f66c1a81",
  "db/migrations/0019_payroll_export_mappings.sql": "1610d1018824ec84ba9cdbe2f42f3ae36c12ba509a735ea10dce3ee21b594262",
  "db/migrations/0020_account_recovery.sql": "26bc594863f1950588250be50a1ae66ba2191f90e8a908aea6a41a6ac76c61db",
  "db/migrations/0021_timecard_reassignment_interlock.sql": "c5e9f1df923c67d4764427cca9f005fed93a4cb148c4a469866d15d4253b4918",
  "db/migrations/0022_timecard_reopen_revision_authority.sql": "616dc741d8b48679b05958cfbd9dcf3ece018a356892034f2f1ad6a644ba584b",
  "db/migrations/0023_employee_attention_receipts.sql": "2758fd0dd5567839537483bb49eba8f4e5618b67a9a77c1deccf0e550cefcef1",
  "db/migrations/0024_contextual_communications.sql": "f130df4238379aa50347decbc863c51f37b108a9f5975b49ca8696b49fc08277",
  "db/migrations/0025_calendar_subscriptions.sql": "357bce5c806af4f3f0d9ff8a5b48e09a90b1342e8168206efce4f949072d824b",
  "db/migrations/0026_tenant_ownership_expand.sql": "fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb"
};
const table = 'nevora_tenancy.portal_session_issuance';
const functionName = 'guard_portal_session_issuance';
const rowGuard = 'portal_session_issuance_row_guard';
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_SI_OWNED_LEASE, runPath = process.env.F_SI_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string; login: boolean };
type OwnObject = { kind: 'schema' | 'table' | 'function' | 'trigger'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; relationOid?: string; dropped: boolean };

// HOLD without explicit root-owned lease+run directory. No discovery, ambient URL,
// startup, constructor side effect or SQL before the opt-in fixture checks.
// Fixture-only minimal workspace parent + exact original employee/session/control/guard fragments.
// Native fictional A/B storage controls are NOT full68/cutover/application isolation.
describe.skipIf(!leasePath && !runPath)('owned PG18 LIVE portal-session issuance storage only', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, installer: Client;
  let appRole: Role, workerRole: Role, outsiderRole: Role, forceOwner: Role;
  let password = '', installerOid = '', workspaceId = '', verified = false, runVerified = false;
  let installed = false, setupCommitted = false, sqlAttempted = false;
  let parent: OwnObject, employeeParent: OwnObject, schema: OwnObject, counter: OwnObject, contracts: OwnObject, protocol: OwnObject, location: OwnObject, sessionParent: OwnObject;
  let workspaceB = '', employeeA = '', employeeB = '', nullOwnerEmployee = '';
  const exactEmployeeIds: string[] = [];
  const createdAt='2026-10-09T00:00:00.123456Z', expiresAt='2030-01-01T00:00:00.654321Z';
  const tokenFor=(employee:string)=>hash('fictional-session:'+employee);
  const pendingSessionAttempts=new Set<Promise<string>>();
  let originalParentRows: Awaited<ReturnType<typeof parentRows>>, originalParentCatalog: unknown;
  const clients = new Set<Client>(), closedClients = new Set<Client>();
  const objects: OwnObject[] = [], roles: Role[] = [];
  let recordCount = 0;
  const repairs = new Set<string>(), pendingFenceAttempts = new Set<Promise<unknown>>();
  const sqlstate = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN';
  };
  async function query(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { return await client.query(text, values); }
    catch (error) { throw Error('owned_portal_session_issuance_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    recordCount++;
    appendFileSync(join(runPath!, 'portal_session_issuance-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_portal_session_issuance_connection_failed'); }
    await query(client, 'SET search_path=pg_catalog');
    await query(client, "SET TIME ZONE 'UTC'");
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
  async function remember(kind: OwnObject['kind'], namespace: string, name: string, ownerOid: string, signature?: string) {
    const found = kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [name])).rows[0]
      : kind === 'function'
        ? (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(namespace) + '.' + q(name) + signature])).rows[0]
        : kind === 'trigger'
          ? (await query(admin, `SELECT t.oid::text oid,c.relowner::text owner,c.oid::text relation_oid
              FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
              WHERE t.tgname=$1 AND t.tgrelid=pg_catalog.to_regclass($2) AND NOT t.tgisinternal`, [name, signature ?? table])).rows[0]
          : (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(namespace) + '.' + q(name)])).rows[0];
    expect(found).toMatchObject({ oid: expect.stringMatching(/^[0-9]+$/), owner: ownerOid });
    const result: OwnObject = { kind, schema: namespace, name, oid: found.oid as string, ownerOid,
      ...(kind === 'function' && signature ? { signature } : {}), ...(kind === 'trigger' ? { relationOid: found.relation_oid as string } : {}), dropped: false };
    objects.push(result); record({ operation: 'EXACT_OWN_OBJECT_OBSERVED', ...result }); return result;
  }
  async function dropObject(object: OwnObject) {
    let found;
    if (object.kind === 'schema') found = (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [object.name])).rows[0];
    else if (object.kind === 'function') found = (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(object.schema) + '.' + q(object.name) + object.signature])).rows[0];
    else if (object.kind === 'trigger') found = (await query(admin, `SELECT t.oid::text oid,c.relowner::text owner,t.tgrelid::text relation_oid
      FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      WHERE t.oid=$1::oid AND t.tgname=$2 AND c.oid=$3::oid`, [object.oid, object.name, object.relationOid])).rows[0];
    else found = (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(object.schema) + '.' + q(object.name)])).rows[0];
    expect(found).toEqual({ oid: object.oid, owner: object.ownerOid, ...(object.kind === 'trigger' ? { relation_oid: object.relationOid } : {}) });
    const target = object.kind === 'schema' ? q(object.name) : object.kind === 'trigger'
      ? q(object.name) + ' ON ' + (await query(admin,`SELECT pg_catalog.quote_ident(n.nspname)||'.'||pg_catalog.quote_ident(c.relname) target FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=$1::oid`,[object.relationOid])).rows[0].target : q(object.schema) + '.' + q(object.name) + (object.signature ?? '');
    await query(admin, 'DROP ' + object.kind.toUpperCase() + ' ' + target);
    const catalogName = object.kind === 'schema' ? 'pg_namespace' : object.kind === 'function' ? 'pg_proc' : object.kind === 'trigger' ? 'pg_trigger' : 'pg_class';
    expect((await query(admin, 'SELECT oid FROM pg_catalog.' + catalogName + ' WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
    object.dropped = true; record({ operation: 'EXACT_OWN_OBJECT_DROPPED', ...object });
  }
  async function catalog(namespaceOnly = false) {
    const condition = namespaceOnly ? "n.nspname='nevora_tenancy'" : "(n.nspname='nevora_tenancy' OR (n.nspname='public' AND c.relname IN ('workspaces','employees','locations','employee_sessions')))";
    const schemas = (await query(admin, `SELECT oid::text oid,nspname,nspowner::text owner,nspacl::text acl FROM pg_catalog.pg_namespace
      WHERE nspname='nevora_tenancy' ORDER BY oid`)).rows;
    const relations = (await query(admin, `SELECT c.oid::text oid,n.nspname,c.relname,c.relowner::text owner,c.relkind,c.relpersistence,
      c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid`)).rows;
    const columns = (await query(admin, `SELECT c.oid::text relation_oid,a.attnum,a.attname,a.atttypid::text type_oid,a.atttypmod,
      a.attnotnull,a.atthasdef,a.attidentity,a.attgenerated,a.attacl::text acl,pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_source
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE ${condition} AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.oid,a.attnum`)).rows;
    const constraints = (await query(admin, `SELECT c.oid::text relation_oid,co.oid::text oid,co.conname,co.contype::text contype,co.conkey,
      co.confrelid::text parent_oid,co.confkey,co.confupdtype::text update_action,co.confdeltype::text delete_action,
      co.convalidated,co.conenforced,co.condeferrable,co.condeferred,co.conindid::text index_oid,pg_catalog.pg_get_constraintdef(co.oid,false) definition
      FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE ${condition} ORDER BY c.oid,co.oid`)).rows;
    const indexes = (await query(admin, `SELECT c.oid::text relation_oid,i.indexrelid::text oid,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indimmediate,i.indislive,i.indnullsnotdistinct,i.indclass::text opclasses,i.indcollation::text collations,i.indoption::text options,
      pg_catalog.pg_get_indexdef(i.indexrelid) definition FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid,i.indexrelid`)).rows;
    const functions = (await query(admin, `SELECT p.oid::text oid,p.proname,p.proowner::text owner,p.prosecdef,p.proconfig,p.prorettype::text return_oid,
      p.proargtypes::text arg_oids,p.proretset,p.provolatile,p.proparallel,l.lanname,p.proacl::text acl,pg_catalog.pg_get_functiondef(p.oid) definition
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
    const columnAcls = (await query(admin,`SELECT c.oid::text relation_oid,a.attnum,x.grantor::text grantor,x.grantee::text grantee,x.privilege_type,x.is_grantable
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) x WHERE ${condition} AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY c.oid,a.attnum,x.grantee,x.privilege_type`)).rows;
    const expandedAcls = (await query(admin, `SELECT 'SCHEMA' kind,n.oid::text oid,a.grantor::text grantor,a.grantee::text grantee,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a WHERE n.nspname='nevora_tenancy'
      UNION ALL SELECT 'TABLE',c.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a WHERE ${condition}
      UNION ALL SELECT 'FUNCTION',p.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='nevora_tenancy' ORDER BY kind,oid,grantee,privilege_type`)).rows;
    return { schemas, relations, columns, constraints, indexes, functions, triggers, policies, columnAcls, expandedAcls };
  }
  function canonicalAcl(value: Awaited<ReturnType<typeof catalog>>) {
    return { ...value, columns:value.columns.map(row=>({...row,acl:value.columnAcls.filter(x=>x.relation_oid===row.relation_oid&&x.attnum===row.attnum)})), schemas: value.schemas.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'SCHEMA' && x.oid === row.oid) })),
      relations: value.relations.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'TABLE' && x.oid === row.oid) })),
      functions: value.functions.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'FUNCTION' && x.oid === row.oid) })) };
  }
  async function nativeName(object: OwnObject) {
    const row=(await query(admin,`SELECT pg_catalog.quote_ident(n.nspname)||'.'||pg_catalog.quote_ident(c.relname) target,c.relowner::text owner
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=$1::oid`,[object.oid])).rows[0];
    expect(row?.target).toEqual(expect.any(String)); return row.target as string;
  }
  async function parentRows() {
    return { workspaces: (await query(admin,'SELECT id,pg_catalog.to_jsonb(w) native_row FROM '+await nativeName(parent)+' w ORDER BY id COLLATE pg_catalog."C"')).rows,
      employees: (await query(admin,'SELECT id,workspace_id,pg_catalog.to_jsonb(e) native_row FROM '+await nativeName(employeeParent)+' e ORDER BY id COLLATE pg_catalog."C"')).rows,
      sessions: (await query(admin,'SELECT token_hash::text token_hash,employee_id,expires_at::text expires_at,created_at::text created_at FROM '+await nativeName(sessionParent)+' ORDER BY token_hash COLLATE pg_catalog."C"')).rows,
      locations: (await query(admin,'SELECT id FROM '+await nativeName(location)+' ORDER BY id COLLATE pg_catalog."C"')).rows,
      contracts: (await query(admin,'SELECT pg_catalog.to_jsonb(c) row FROM '+await nativeName(contracts)+' c ORDER BY table_name COLLATE pg_catalog."C"')).rows,
      protocol: (await query(admin,'SELECT pg_catalog.to_jsonb(p) row FROM '+await nativeName(protocol)+' p')).rows };
  }
  async function counterRows() {
    return (await query(admin,'SELECT token_hash::text token_hash,workspace_id,employee_id,workspace_incarnation::text workspace_incarnation,portal_access_version::text portal_access_version,session_created_at::text session_created_at FROM '+table+' ORDER BY token_hash COLLATE pg_catalog."C"')).rows;
  }
  function parentProjection(value: Awaited<ReturnType<typeof catalog>>) {
    return { relations: value.relations.filter(x => [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.oid)), columns: value.columns.filter(x => [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.relation_oid)),
      constraints: value.constraints.filter(x => [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.relation_oid)), indexes: value.indexes.filter(x => [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.relation_oid)),
      // New FK enforcement creates native internal triggers on the parent; these
      // are retained separately, not silently claimed equal to pre-install state.
      noninternalTriggers: value.triggers.filter(x => [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.relation_oid) && !x.tgisinternal),
      columnAcls:value.columnAcls.filter(x=>[parent.oid,employeeParent.oid,sessionParent.oid].includes(x.relation_oid)), acls: value.expandedAcls.filter(x => x.kind === 'TABLE' && [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.oid)) };
  }
  async function preserveParent() {
    expect(await parentRows()).toEqual(originalParentRows);
    expect(parentProjection(await catalog())).toEqual(originalParentCatalog);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
  }
  async function poll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_portal_session_issuance_observation_timeout_' + label);
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
  async function installReject(expectedCode: string) {
    expect(installer.getTransactionStatus()).toBe('I');
    const before = await catalog(), beforeRows = await parentRows();
    try { const code = await rejected(installer, source); await finishRejected(installer, code, expectedCode); }
    finally { await query(installer,'ROLLBACK'); expect(installer.getTransactionStatus()).toBe('I'); }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); expect(await parentRows()).toEqual(beforeRows);
  }
  async function inRollback(body: () => Promise<void>) {
    expect(admin.getTransactionStatus()).toBe('I');
    const before = await catalog(), rows = await counterRows(), parentBefore = await parentRows();
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try { await body(); }
    finally { await query(admin, 'ROLLBACK'); await query(admin, 'RESET ROLE'); expect(admin.getTransactionStatus()).toBe('I'); }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); expect(await counterRows()).toEqual(rows); expect(await parentRows()).toEqual(parentBefore);
    await preserveParent();
  }
  async function rejectedSavepoint(text: string, values: unknown[], expected: string) {
    await query(admin, 'SAVEPOINT own_negative');
    const code = await rejected(admin, text, values);
    record({ operation: 'EXACT_OWN_SAVEPOINT_REJECTION', sqlstate: code, expected });
    await query(admin, 'ROLLBACK TO SAVEPOINT own_negative'); await query(admin, 'RELEASE SAVEPOINT own_negative');
    expect(code).toBe(expected); expect(admin.getTransactionStatus()).toBe('T'); return code;
  }
  async function fenceAttempt(staged: boolean, changeWhileWaiting?: () => Promise<void>, wholePositive = false) {
    expect(staged && wholePositive).toBe(false);
    const expectedCode = staged || wholePositive ? 'NO_ERROR' : '42501';
    const original = await identity(installer, lease.user, installerOid), reader = await identity(app, appRole.name, appRole.oid);
    const pids = [original.pid as number, reader.pid as number];
    const beforeDefault = (await query(installer, 'SHOW default_transaction_isolation')).rows[0].default_transaction_isolation as string;
    const begin = 'BEGIN ISOLATION LEVEL READ COMMITTED;', end = source.indexOf(begin) + begin.length;
    const opening = source.slice(0, end), tail = source.slice(end);
    expect(tail.startsWith('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text + '\n')).toBe(true);
    const remaining = tail.slice(1 + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text.length);
    expect(opening + '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text + remaining).toBe(source);
    let pending: Promise<{ code: string; rows: unknown[]; commands: string[] }> | undefined;
    let readerTransaction = false, installerTransaction = false;
    try {
      await query(installer, "SET default_transaction_isolation='repeatable read'");
      await query(app, 'BEGIN ISOLATION LEVEL READ COMMITTED'); readerTransaction = true;
      await query(app, RUNTIME_CATALOG_SHARED_FENCE_SQL.text, [...RUNTIME_CATALOG_SHARED_FENCE_SQL.values]);
      expect(await locks(pids)).toEqual([keyTuple(reader.pid as number, 'ShareLock', true)]);
      if (staged) await query(installer, opening);
      installerTransaction = true;
      // Whole source is ONE native query for actual post-wait prerequisite
      // freshness; staged success inserts only the explicit isolation observation.
      pending = installer.query(staged ? INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text : source).then(result => ({ code: 'NO_ERROR',
        rows: Array.isArray(result) ? result.map(x => x.rows) : [result.rows], commands: Array.isArray(result) ? result.map(x => x.command) : [result.command] }), error => ({ code: sqlstate(error), rows: [], commands: [] }));
      pendingFenceAttempts.add(pending);
      await poll(async () => (await locks(pids)).some(x => x.pid === original.pid && x.mode === 'ExclusiveLock' && !x.granted), 'installer_wait');
      const nativeLocks = await locks(pids), activity = (await query(admin, `SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers
        FROM pg_catalog.pg_stat_activity WHERE pid=$1`, [original.pid])).rows[0];
      const relationLocks = (await query(admin, `SELECT c.oid::text oid,n.nspname,c.relname,l.mode,l.granted FROM pg_catalog.pg_locks l
        JOIN pg_catalog.pg_class c ON c.oid=l.relation JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE l.pid=$1 AND l.locktype='relation' ORDER BY c.oid,l.mode`, [original.pid])).rows;
      record({ operation: 'NATIVE_INSTALLER_BLOCKED_BEFORE_PREREQUISITES', staged, nativeLocks, activity, relationLocks, original, reader });
      expect(nativeLocks).toContainEqual(keyTuple(original.pid as number, 'ExclusiveLock', false));
      expect(activity).toMatchObject({ state: 'active', wait_event_type: 'Lock', wait_event: 'advisory' }); expect(activity.blockers).toContain(reader.pid);
      expect(relationLocks.filter(x => x.nspname === 'nevora_tenancy' || [parent.oid,employeeParent.oid,sessionParent.oid].includes(x.oid) ||
        ['pg_namespace','pg_class','pg_attribute','pg_constraint','pg_index','pg_proc','pg_trigger'].includes(x.relname))).toEqual([]);
      expect((await catalog()).relations.some(x => x.relname==='portal_session_issuance')).toBe(false);
      if (changeWhileWaiting) await changeWhileWaiting();
      await query(app, 'COMMIT');
      const outcome = await pending; pendingFenceAttempts.delete(pending); record({ operation: 'NATIVE_INSTALLER_RELEASED_OUTCOME', staged, outcome });
      expect(outcome.code).toBe(expectedCode);
      if (staged) {
        expect(outcome.rows).toEqual([[{ catalog_fence: '' }]]);
        expect(await locks(pids)).toContainEqual(keyTuple(original.pid as number, 'ExclusiveLock', true));
        const isolation = (await query(installer, "SELECT pg_catalog.current_setting('transaction_isolation') isolation,pg_catalog.current_setting('default_transaction_isolation') session_default")).rows[0];
        record({ operation: 'STAGED_NATIVE_READ_COMMITTED_OBSERVATION_NOT_WHOLE_SOURCE_BATCH', isolation });
        expect(isolation).toEqual({ isolation: 'read committed', session_default: 'repeatable read' });
        await query(installer, remaining); expect(installer.getTransactionStatus()).toBe('I');
      } else if (wholePositive) {
        expect(outcome.commands[0]).toBe('BEGIN'); expect(outcome.commands.at(-1)).toBe('COMMIT');
        expect(outcome.commands).toContain('CREATE');
        expect(installer.getTransactionStatus()).toBe('I');
        record({ operation: 'WHOLE_SOURCE_ONE_NATIVE_QUERY_POSITIVE', sourceSHA256: hash(source), outcome,
          claim: 'ONE_UNMODIFIED_ARTIFACT_QUERY_AFTER_FIRST_EXCLUSIVE_WAIT_UNDER_RR_SESSION_DEFAULT' });
      } else await finishRejected(installer, outcome.code, '42501');
      expect(await locks(pids)).toEqual([]);
    } finally {
      if (readerTransaction) await query(app, 'ROLLBACK');
      if (pending && pendingFenceAttempts.has(pending)) { await pending; pendingFenceAttempts.delete(pending); }
      if (installerTransaction) await query(installer, 'ROLLBACK');
      await query(installer, "SELECT pg_catalog.set_config('default_transaction_isolation',$1,false)", [beforeDefault]);
      expect((await query(installer, 'SHOW default_transaction_isolation')).rows).toEqual([{ default_transaction_isolation: beforeDefault }]);
      expect(await identity(installer, lease.user, installerOid)).toEqual(original); expect(await identity(app, appRole.name, appRole.oid)).toEqual(reader);
      expect(await locks(pids)).toEqual([]);
    }
  }
  function oneFragment(bytes:string,pattern:RegExp) {
    const matches=bytes.match(pattern); expect(matches).toHaveLength(1); return matches![0];
  }
  const sourceIdentityFunction=oneFragment(expansionSource,/CREATE FUNCTION nevora_tenancy\.source_identity_guard\(\)[\s\S]*?\$identity_guard\$;/g);
  const sourceFenceFunction=oneFragment(expansionSource,/CREATE FUNCTION nevora_tenancy\.source_write_fence\(\)[\s\S]*?\$write_fence\$;/g);
  const insertSql='INSERT INTO '+table+'(token_hash,workspace_id,employee_id,workspace_incarnation,portal_access_version,session_created_at) VALUES($1::bpchar(64),$2,$3,$4::int8,$5::int8,$6::timestamptz)';
  const values=(workspace:string|null,employee:string|null,incarnation:string|null='1',access:string|null='1',created:string|null=createdAt,token:string|null=employee===null?null:tokenFor(employee))=>[token,workspace,employee,incarnation,access,created];
  async function session(client:Client,token:string,employee:string,created=createdAt,expiry=expiresAt) {
    await query(client,'INSERT INTO public.employee_sessions(token_hash,employee_id,expires_at,created_at) VALUES($1::bpchar(64),$2,$3::timestamptz,$4::timestamptz)',[token,employee,expiry,created]);
  }
  async function ownMutation(change:()=>Promise<void>,undo:()=>Promise<void>,body:()=>Promise<void>) {
    expect(admin.getTransactionStatus()).toBe('I');
    const before=await catalog(),beforeRows=await parentRows(); let changed=false;
    await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try { await query(admin,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text); await change(); await query(admin,'COMMIT'); changed=true; }
    finally { await query(admin,'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I'); }
    try { await body(); }
    finally {
      if(changed) { await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
        try { await query(admin,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text); await undo(); await query(admin,'COMMIT'); }
        finally { await query(admin,'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I'); }
      }
      expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); expect(await parentRows()).toEqual(beforeRows);
    }
  }
  beforeAll(async()=>{
    expect(leasePath!==undefined&&runPath!==undefined).toBe(true);
    expect(process.env.DATABASE_URL===undefined&&process.env.FUEL_TEST_DATABASE_URL===undefined).toBe(true);
    expect(isAbsolute(leasePath!)&&isAbsolute(runPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid=process.getuid?.(); expect(uid!==undefined).toBe(true);
    const leaseStat=lstatSync(leasePath!); expect(leaseStat.isFile()&&!leaseStat.isSymbolicLink()).toBe(true);
    expect(leaseStat.uid).toBe(uid); expect(leaseStat.mode&0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(uid); runVerified=true;
    lease=JSON.parse(readFileSync(leasePath!,'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:portal-session-issuance-storage:'+lease.invocation);
    expect(lease.marker).toBe('f10-owned:'+lease.invocation);
    expect(Number.isSafeInteger(lease.port)&&lease.port>1024&&lease.port<65536).toBe(true);
    expect(Number.isSafeInteger(lease.pid)&&lease.pid>0).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root,'data'));
    expect(leasePath!.startsWith(lease.root+sep)).toBe(true);
    const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data);
    expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credential=lstatSync(lease.credentialFile);
    expect(credential.isFile()&&!credential.isSymbolicLink()).toBe(true); expect(credential.uid).toBe(uid);
    expect(credential.mode&0o777).toBe(0o600); expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);
    expect(lease.credentialFile.startsWith(lease.root+sep)).toBe(true);
    source=readFileSync(sourcePath,'utf8'); expect(hash(source)).toBe(expectedSourceSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-session-issuance-storage.test.ts')))).toBe(expectedSourceTestSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/catalog-fence.server.ts')))).toBe(expectedFenceSHA256);
    for(const [path,pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
    expect(hash(sourceIdentityFunction.split('$identity_guard$')[1])).toBe('2434a5c2e3e22460f2363f4cdab2d7230759c15f05405f6bd7e6936cab6793e6');
    expect(hash(sourceFenceFunction.split('$write_fence$')[1])).toBe('28e074dcd7476327c72cc59ed4d97a6354ff90dfff17125a0f6adfe283653a45');
    password=readFileSync(lease.credentialFile,'utf8'); expect(password.length>0).toBe(true);
    admin=await connect(lease.user); const base=await checkBase();
    installerOid=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[lease.user])).rows[0].oid as string;
    expect((await query(admin,'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid',[String(lease.databaseOid)])).rows).toEqual([{owner:installerOid}]);
    expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
    verified=true;
    record({operation:'EXACT_OWN_ROOT_BASE_VERIFIED',base,testSHA256:hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-session-issuance-storage.postgres.test.ts'))),sourceSHA256:hash(source),migrationPins});
    await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      appRole=await role(lease.invocation+'_app',true); workerRole=await role(lease.invocation+'_worker',true);
      outsiderRole=await role(lease.invocation+'_outsider',true); forceOwner=await role(lease.invocation+'_force_owner',false);
      await query(admin,'REVOKE CREATE,TEMPORARY ON DATABASE '+q(lease.database)+' FROM PUBLIC');
      await query(admin,'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin,'GRANT CONNECT ON DATABASE '+q(lease.database)+' TO '+[appRole,workerRole,outsiderRole].map(x=>q(x.name)).join(','));
      await query(admin,'CREATE SCHEMA nevora_tenancy'); schema=await remember('schema','','nevora_tenancy',installerOid);
      await query(admin,'SET LOCAL search_path=public,pg_catalog');
      const minimalWorkspace='CREATE TABLE public.workspaces(id text PRIMARY KEY)';
      const minimalLocation='CREATE TABLE public.locations(id text PRIMARY KEY)';
      await query(admin,minimalWorkspace); parent=await remember('table','public','workspaces',installerOid);
      await query(admin,minimalLocation); location=await remember('table','public','locations',installerOid);
      const employeeFragment=oneFragment(employeeSource,/CREATE TABLE IF NOT EXISTS employees \([\s\S]*?\n\);/g);
      await query(admin,employeeFragment); employeeParent=await remember('table','public','employees',installerOid);
      const employeeAdditive=oneFragment(expansionSource,/ALTER TABLE public\."employees" ADD COLUMN workspace_id text;\nALTER TABLE public\."employees" ADD CONSTRAINT f10_workspace_reference[^\n]*\nALTER TABLE public\."employees" ADD CONSTRAINT f10_tenant_c49de3d265fb[^\n]*/g);
      await query(admin,employeeAdditive);
      const sessionFragment=oneFragment(employeeSource,/CREATE TABLE IF NOT EXISTS employee_sessions \([\s\S]*?\n\);/g);
      const sessionIndexes=['employee_sessions_employee_idx','employee_sessions_expires_idx'].map(name=>oneFragment(employeeSource,new RegExp('^CREATE INDEX IF NOT EXISTS '+name+'[^;]*;','gm')));
      await query(admin,sessionFragment); sessionParent=await remember('table','public','employee_sessions',installerOid);
      for(const statement of sessionIndexes) await query(admin,statement);
      const protocolFragment=oneFragment(expansionSource,/CREATE TABLE nevora_tenancy\.expansion_protocol \([\s\S]*?\n\);/g);
      const contractsFragment=oneFragment(expansionSource,/CREATE TABLE nevora_tenancy\.owned_table_contract \([\s\S]*?\n\);/g);
      await query(admin,protocolFragment); protocol=await remember('table','nevora_tenancy','expansion_protocol',installerOid);
      await query(admin,contractsFragment); contracts=await remember('table','nevora_tenancy','owned_table_contract',installerOid);
      const protocolInsert=oneFragment(expansionSource,/INSERT INTO nevora_tenancy\.expansion_protocol\([^\n]*;/g);
      await query(admin,protocolInsert);
      const contractValues=oneFragment(expansionSource,/^INSERT INTO nevora_tenancy\.owned_table_contract VALUES\n[\s\S]*?;$/gm);
      const contractRows=['employees','workspaces','employee_sessions'].map(name=>oneFragment(contractValues,new RegExp("^\\('"+name+"',[^\\n]*","gm")).replace(/[,;]$/,''));
      await query(admin,'INSERT INTO nevora_tenancy.owned_table_contract VALUES\n'+contractRows.join(',\n')+';');
      workspaceId=' '+lease.invocation+'_workspace_A '; workspaceB=''; employeeA=' '+lease.invocation+'_employee_A ';
      employeeB=lease.invocation+'_employee_B'; nullOwnerEmployee=lease.invocation+'_employee_NULL';
      exactEmployeeIds.push(employeeA,'',lease.invocation+'_long_'+ 'x'.repeat(4096));
      await query(admin,'INSERT INTO public.workspaces(id) VALUES($1),($2)',[workspaceId,workspaceB]);
      await query(admin,'INSERT INTO public.locations(id) VALUES($1)',[lease.invocation+'_location']);
      for(const [id,workspace] of [...exactEmployeeIds.map(id=>[id,workspaceId]),[employeeB,workspaceB],[nullOwnerEmployee,null]])
        await query(admin,`INSERT INTO public.employees(id,first_name,last_name,phone,email,role,primary_location_id,active,created_at,updated_at,workspace_id)
          VALUES($1,'Fictional','Employee','0000000000',NULL,'EMPLOYEE',$2,false,'2026-10-09T00:00:00.000000Z','2026-10-09T00:00:00.000000Z',$3)`,[id,lease.invocation+'_location',workspace]);
      for(const id of [...exactEmployeeIds,employeeB,nullOwnerEmployee]) await session(admin,tokenFor(id),id);
      await query(admin,sourceFenceFunction); await remember('function','nevora_tenancy','source_write_fence',installerOid,'()');
      await query(admin,sourceIdentityFunction); await remember('function','nevora_tenancy','source_identity_guard',installerOid,'()');
      for(const name of ['employees','workspaces','employee_sessions']) for(const trigger of ['f10_write_fence','f10_identity_guard']) {
        const fragment=oneFragment(expansionSource,new RegExp('^CREATE TRIGGER '+trigger+'[^\\n]*ON public\\."'+name+'"[^\\n]*;','gm'));
        await query(admin,fragment); await remember('trigger','public',trigger,installerOid,'public.'+name);
      }
      await query(admin,'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'COMMIT'); setupCommitted=true;
      record({operation:'FIXTURE_ONLY_SOURCE_BOUND_PARENT_AND_GUARD_FRAGMENTS',minimalWorkspace,minimalLocation,
        original0008SourceSHA256:hash(parentSource),employeeFragment,employeeFragmentSHA256:hash(employeeFragment),employeeAdditive,sessionFragment,sessionIndexes,
        protocolFragment,contractsFragment,protocolInsert,contractRows,sourceIdentitySHA256:hash(sourceIdentityFunction),sourceFenceSHA256:hash(sourceFenceFunction),
        claim:'MINIMAL_A_B_PARENTS_NOT_ORIGINAL_0008_SINGLETON_MIGRATION_CAPTURE_FULL68_CUTOVER_OR_APPLICATION_ISOLATION'});
    } finally { await query(admin,'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I'); }
    originalParentRows=await parentRows(); originalParentCatalog=parentProjection(await catalog());
    app=await connect(appRole.name); worker=await connect(workerRole.name); outsider=await connect(outsiderRole.name); installer=await connect(lease.user);
    writeFileSync(join(runPath!,'portal-session-issuance-fixture-custody.json'),JSON.stringify({base,roles,objects,originalParentRows,originalParentCatalog,
      sourceSHA256:hash(source),migrationPins,expectedClients:5,claim:'EMPTY_STORAGE_SOURCE_PREREQUISITES_FICTIONAL_NATIVE_ONLY_NO_CURRENT_PROOF_OR_ACTIVATION'},null,2),{flag:'wx',mode:0o600});
  },60000);
  it('SI01 missing private schema and each actual source parent reject atomically',async()=>{
    const shadow=lease.invocation+'_schema_shadow';
    await ownMutation(async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy RENAME TO '+q(shadow));},
      async()=>{await query(admin,'ALTER SCHEMA '+q(shadow)+' RENAME TO nevora_tenancy');},async()=>{await installReject('3F000');});
    for(const name of ['workspaces','employees','employee_sessions']) {
      const renamed=lease.invocation+'_'+name+'_shadow';
      await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' RENAME TO '+q(renamed));},
        async()=>{await query(admin,'ALTER TABLE public.'+q(renamed)+' RENAME TO '+q(name));},async()=>{await installReject('55000');});
    }
    await preserveParent();
  },30000);
  it('SI02 foreign schema and source table owners are not silently adopted',async()=>{
    await ownMutation(async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));},
      async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user));},async()=>{await installReject('42501');});
    for(const name of ['workspaces','employees','employee_sessions'])
      await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' OWNER TO '+q(outsiderRole.name));},
        async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' OWNER TO '+q(lease.user));},async()=>{await installReject('55000');});
    await preserveParent();
  },30000);
  it('SI03 native source keys session columns defaults and both lookup indexes must match',async()=>{
    for(const [change,undo] of [
      ['ALTER TABLE public.employees RENAME CONSTRAINT f10_tenant_c49de3d265fb TO own_wrong_candidate_name','ALTER TABLE public.employees RENAME CONSTRAINT own_wrong_candidate_name TO f10_tenant_c49de3d265fb'],
      ["ALTER TABLE public.employees ALTER COLUMN id SET DEFAULT 'fixture-default'",'ALTER TABLE public.employees ALTER COLUMN id DROP DEFAULT'],
      ["ALTER TABLE public.employee_sessions ALTER COLUMN token_hash SET DEFAULT 'fixture-default'",'ALTER TABLE public.employee_sessions ALTER COLUMN token_hash DROP DEFAULT'],
      ['ALTER TABLE public.employee_sessions ALTER COLUMN created_at SET DEFAULT statement_timestamp()','ALTER TABLE public.employee_sessions ALTER COLUMN created_at SET DEFAULT now()'],
      ['ALTER INDEX public.employee_sessions_employee_idx RENAME TO own_wrong_employee_lookup','ALTER INDEX public.own_wrong_employee_lookup RENAME TO employee_sessions_employee_idx'],
      ['ALTER INDEX public.employee_sessions_expires_idx RENAME TO own_wrong_expiry_lookup','ALTER INDEX public.own_wrong_expiry_lookup RENAME TO employee_sessions_expires_idx'],
    ]) await ownMutation(async()=>{await query(admin,change);},async()=>{await query(admin,undo);},async()=>{await installReject('55000');});
    const before=await catalog(),rows=await parentRows(),shadow=lease.invocation+'_sessions_shadow'; let temporary:OwnObject|undefined;
    const restore='ALTER TABLE public.'+q(shadow)+' RENAME TO employee_sessions'; repairs.add(restore);
    try {
      await query(admin,'ALTER TABLE public.employee_sessions RENAME TO '+q(shadow));
      await query(admin,'ALTER INDEX public.employee_sessions_pkey RENAME TO own_original_session_key');
      await query(admin,`CREATE TABLE public.employee_sessions(token_hash char(32) PRIMARY KEY,employee_id text NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`);
      temporary=await remember('table','public','employee_sessions',installerOid);
      const native=await catalog();record({caseId:'SI03',actualMalformedSession:native.columns.filter(x=>x.relation_oid===temporary!.oid),temporary});
      expect(native.columns.find(x=>x.relation_oid===temporary!.oid&&x.attname==='token_hash')).toMatchObject({type_oid:'1042',atttypmod:36});
      await installReject('55000');
    } finally {
      if(temporary&&!temporary.dropped)await dropObject(temporary);
      await query(admin,'ALTER INDEX public.own_original_session_key RENAME TO employee_sessions_pkey');
      await query(admin,restore);repairs.delete(restore);
    }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));expect(await parentRows()).toEqual(rows);await preserveParent();
  },30000);
  it('SI04 exact original two guard bodies and all six enabled routes reject drift',async()=>{
    for(const [original,tag] of [[sourceIdentityFunction,'$identity_guard$;'],[sourceFenceFunction,'$write_fence$;']] as const) {
      const replacement=original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace(tag,'\n-- fictional source drift\n'+tag);
      await ownMutation(async()=>{await query(admin,replacement);},async()=>{await query(admin,original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));},async()=>{await installReject('55000');});
    }
    for(const name of ['workspaces','employees','employee_sessions']) for(const trigger of ['f10_identity_guard','f10_write_fence'])
      await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' DISABLE TRIGGER '+q(trigger));},
        async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' ENABLE TRIGGER '+q(trigger));},async()=>{await installReject('55000');});
    await preserveParent();
  },30000);
  it('SI05 actual source ancestry and original protocol source bindings are prerequisites',async()=>{
    for(const name of ['employees','workspaces','employee_sessions']) {
      const anchor=originalParentRows.contracts.find(x=>x.row.table_name===name)!.row.anchor;
      await ownMutation(async()=>{await query(admin,"UPDATE nevora_tenancy.owned_table_contract SET anchor='{}'::jsonb WHERE table_name=$1",[name]);},
        async()=>{await query(admin,'UPDATE nevora_tenancy.owned_table_contract SET anchor=$1::jsonb WHERE table_name=$2',[JSON.stringify(anchor),name]);},async()=>{await installReject('55000');});
    }
    const registry=originalParentRows.protocol[0].row.registry_sha256 as string;
    await ownMutation(async()=>{await query(admin,'UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=$1',['0'.repeat(64)]);},
      async()=>{await query(admin,'UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=$1',[registry]);},async()=>{await installReject('55000');});
    expect(originalParentRows.protocol[0].row).toMatchObject({phase:'EXPANDED_LEGACY',backfill_actor:null,capture_manifest_sha256:null});
    await preserveParent();
  });
  it('SI06 any same-name guard overload rejects before adoption',async()=>{
    const before=await catalog();let overload:OwnObject|undefined;
    try {
      await query(admin,"CREATE FUNCTION nevora_tenancy.guard_portal_session_issuance(text) RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS 'SELECT $1'");
      overload=await remember('function','nevora_tenancy',functionName,installerOid,'(text)');await installReject('42723');
    } finally {if(overload&&!overload.dropped)await dropObject(overload);}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await preserveParent();
  });
  it('SI07 named ambient table or function defaults reject with exact atomic catalog rollback',async()=>{
    for(const kind of ['TABLES','FUNCTIONS']) {
      const before=await catalog();const defaults=async()=>(await query(admin,`SELECT oid::text oid,defaclrole::text owner,defaclnamespace::text namespace,defaclobjtype::text type,defaclacl::text acl FROM pg_catalog.pg_default_acl WHERE defaclrole=$1::oid ORDER BY oid`,[installerOid])).rows;
      const oldDefaults=await defaults(),grant=kind==='TABLES'?'TRIGGER,TRUNCATE':'EXECUTE';
      try {await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy GRANT '+grant+' ON '+kind+' TO '+q(outsiderRole.name));record({caseId:'SI07',kind,nativeDefaults:await defaults()});await installReject('42501');}
      finally {await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy REVOKE '+grant+' ON '+kind+' FROM '+q(outsiderRole.name));}
      expect(await defaults()).toEqual(oldDefaults);expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));
    }
    await preserveParent();
  });
  it('SI08 final column ACL gate rejects a disclosed staged same-own-transaction grant',async()=>{
    const before=await catalog(),rows=await parentRows();const boundary=source.indexOf('DO $portal_session_issuance_acl$');expect(boundary).toBeGreaterThan(0);
    const opening=source.slice(0,boundary),final=source.slice(boundary);expect(opening+final).toBe(source);
    const pendingObjects:OwnObject[]=[];
    try {
      await query(installer,opening);expect(installer.getTransactionStatus()).toBe('T');
      const native=(await query(installer,`SELECT 'table' kind,c.oid::text oid,c.relowner::text owner,c.relname name,NULL::text relation_oid FROM pg_catalog.pg_class c WHERE c.oid='nevora_tenancy.portal_session_issuance'::regclass
        UNION ALL SELECT 'function',p.oid::text,p.proowner::text,p.proname,NULL::text FROM pg_catalog.pg_proc p WHERE p.oid='nevora_tenancy.guard_portal_session_issuance()'::regprocedure
        UNION ALL SELECT 'trigger',t.oid::text,c.relowner::text,t.tgname,c.oid::text FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid WHERE c.oid='nevora_tenancy.portal_session_issuance'::regclass AND NOT t.tgisinternal ORDER BY kind,name`)).rows;
      expect(native).toHaveLength(3);
      for(const row of native){expect(row.owner).toBe(installerOid);const object:OwnObject={kind:row.kind as OwnObject['kind'],schema:'nevora_tenancy',name:row.name as string,oid:row.oid as string,ownerOid:installerOid,dropped:false,...(row.kind==='function'?{signature:'()'}:{}),...(row.kind==='trigger'?{relationOid:row.relation_oid as string}:{})};objects.push(object);pendingObjects.push(object);record({operation:'EXACT_OWN_UNCOMMITTED_OBJECT_OBSERVED',...object});}
      await query(installer,'GRANT UPDATE(portal_access_version) ON '+table+' TO '+q(outsiderRole.name));
      const acl=(await query(installer,`SELECT a.attname,x.grantee::text grantee,x.privilege_type FROM pg_catalog.pg_attribute a CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl)x WHERE a.attrelid='nevora_tenancy.portal_session_issuance'::regclass ORDER BY a.attnum,x.grantee,x.privilege_type`)).rows;
      expect(acl).toEqual([{attname:'portal_access_version',grantee:outsiderRole.oid,privilege_type:'UPDATE'}]);
      record({caseId:'SI08',native,acl,openingSHA256:hash(opening),finalSHA256:hash(final),claim:'STAGED_COLUMN_NEGATIVE_NOT_UNMODIFIED_WHOLE_ARTIFACT'});
      const code=await rejected(installer,final);await finishRejected(installer,code,'42501');
    } finally {
      await query(installer,'ROLLBACK');
      for(const object of pendingObjects){const name=object.kind==='table'?'pg_class':object.kind==='function'?'pg_proc':'pg_trigger';expect((await query(admin,'SELECT oid FROM pg_catalog.'+name+' WHERE oid=$1::oid',[object.oid])).rows).toEqual([]);object.dropped=true;record({operation:'EXACT_OWN_INSTALLATION_ROLLBACK_ABSENCE',...object});}
    }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));expect(await parentRows()).toEqual(rows);await preserveParent();
  });
  it('SI09 preexisting named schema ACL rejects without silently removing the named grant',async()=>{
    const before=await catalog();try{await query(admin,'GRANT USAGE,CREATE ON SCHEMA nevora_tenancy TO '+q(outsiderRole.name));await installReject('42501');}
    finally{await query(admin,'REVOKE USAGE,CREATE ON SCHEMA nevora_tenancy FROM '+q(outsiderRole.name));}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await preserveParent();
  });
  it('SI10 whole source waits first and sees changed owner fresh under RR session default',async()=>{
    const before=await catalog(),undo='ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user);
    try{await fenceAttempt(false,async()=>{repairs.add(undo);await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));record({caseId:'SI10',deliberatelyNoncooperatingOwnFixtureDelta:await catalog()});});}
    finally{if(repairs.has(undo)){await query(admin,undo);repairs.delete(undo);}}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await preserveParent();
  },30000);
  it('SI11 one whole unmodified installer installs empty after first exclusive wait and commits RC',async()=>{
    await fenceAttempt(false,undefined,true);installed=true;
    counter=await remember('table','nevora_tenancy','portal_session_issuance',installerOid);
    await remember('function','nevora_tenancy',functionName,installerOid,'()');await remember('trigger','nevora_tenancy',rowGuard,installerOid);
    expect(await counterRows()).toEqual([]);await preserveParent();record({caseId:'SI11',native:await catalog(),sourceSHA256:hash(source),claim:'WHOLE_SOURCE_ONE_QUERY_NOT_ISSUER_ACTIVATION'});
  },30000);
  it('SI12 six exact fields native keys actions guards and zero FORCE RLS preserve original sources',async()=>{
    const native=await catalog(),columns=native.columns.filter(x=>x.relation_oid===counter.oid);
    expect(columns.map(x=>[x.attnum,x.attname,x.type_oid,x.atttypmod,x.attnotnull,x.atthasdef,x.attidentity,x.attgenerated,x.default_source])).toEqual([
      [1,'token_hash','1042',68,true,false,'','',null],[2,'workspace_id','25',-1,true,false,'','',null],[3,'employee_id','25',-1,true,false,'','',null],
      [4,'workspace_incarnation','20',-1,true,false,'','',null],[5,'portal_access_version','20',-1,true,false,'','',null],[6,'session_created_at','1184',-1,true,false,'','',null]]);
    expect(native.relations.find(x=>x.oid===counter.oid)).toMatchObject({owner:installerOid,relkind:'r',relpersistence:'p',relrowsecurity:true,relforcerowsecurity:true});
    const constraints=native.constraints.filter(x=>x.relation_oid===counter.oid);
    expect(constraints.filter(x=>x.contype==='p')).toMatchObject([{conkey:[1],convalidated:true,conenforced:true,condeferrable:false,condeferred:false}]);
    const fks=constraints.filter(x=>x.contype==='f');expect(fks).toHaveLength(3);
    expect(fks.find(x=>x.parent_oid===sessionParent.oid)).toMatchObject({conkey:[1],confkey:[1],update_action:'r',delete_action:'c',convalidated:true,conenforced:true,condeferrable:false,condeferred:false});
    expect(fks.find(x=>x.parent_oid===parent.oid)).toMatchObject({conkey:[2],confkey:[1],update_action:'r',delete_action:'r',convalidated:true,conenforced:true,condeferrable:false,condeferred:false});
    const employeeColumns=native.columns.filter(x=>x.relation_oid===employeeParent.oid);
    expect(fks.find(x=>x.parent_oid===employeeParent.oid)).toMatchObject({conkey:[2,3],confkey:[employeeColumns.find(x=>x.attname==='workspace_id')!.attnum,employeeColumns.find(x=>x.attname==='id')!.attnum],update_action:'r',delete_action:'c',convalidated:true,conenforced:true,condeferrable:false,condeferred:false});
    expect(employeeColumns.find(x=>x.attname==='workspace_id')).toMatchObject({attnotnull:false,atthasdef:false});
    expect(native.constraints.find(x=>x.relation_oid===employeeParent.oid&&x.conname==='f10_workspace_reference')).toMatchObject({convalidated:false});
    expect(constraints.filter(x=>x.contype==='c')).toHaveLength(2);
    const guard=native.functions.find(x=>x.proname===functionName)!;
    expect(guard).toMatchObject({owner:installerOid,prosecdef:false,proconfig:['search_path=pg_catalog'],return_oid:'2279',arg_oids:'',proretset:false,lanname:'plpgsql',provolatile:'v',proparallel:'u'});
    expect((await query(admin,"SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(prosrc,'UTF8')),'hex') body FROM pg_catalog.pg_proc WHERE oid=$1::oid",[guard.oid])).rows).toEqual([{body:hash(source.split('$portal_session_issuance_guard$')[1])}]);
    const triggers=native.triggers.filter(x=>x.relation_oid===counter.oid&&!x.tgisinternal);expect(triggers).toMatchObject([{tgname:rowGuard,tgtype:23,function_oid:guard.oid,tgenabled:'O',constraint_oid:'0',tgdeferrable:false,tginitdeferred:false}]);expect(triggers).toHaveLength(1);
    expect(native.policies).toEqual([]);expect(native.columnAcls).toEqual([]);expect(native.expandedAcls.filter(x=>x.grantee==='0')).toEqual([]);
    const privateOids=new Set([schema.oid,counter.oid,guard.oid]);expect(native.expandedAcls.filter(x=>privateOids.has(x.oid)&&x.grantee!==installerOid)).toEqual([]);
    record({caseId:'SI12',native,sourceRows:await parentRows(),claim:'NATIVE_STORAGE_ONLY_NOT_CURRENT_SESSION_PROOF_OR_DOMAIN_RLS'});await preserveParent();
  });
  it('SI13 duplicate installer keeps all original and installed OIDs unchanged',async()=>{
    const before=await catalog();await installReject('42P07');expect(await catalog()).toEqual(before);expect(await counterRows()).toEqual([]);await preserveParent();
  });
  it('SI14 source session scope created microseconds and absent or NULL ownership cannot be invented',async()=>{
    await inRollback(async()=>{
      for(const row of [values(workspaceId,employeeB),values(workspaceB,employeeA),values(workspaceId,nullOwnerEmployee),values(workspaceId.trim(),employeeA),values(workspaceId,employeeA.trim(),'1','1',createdAt,tokenFor(employeeA)),values(workspaceId,employeeA,'1','1','2026-10-09T00:00:00.123457Z'),values(workspaceId,employeeA,'1','1',createdAt,'missing-native-session'),values(null,employeeA),values(workspaceId,null),values(workspaceId,employeeA,'1','1',null),values(workspaceId,employeeA,'1','1',createdAt,null)])
        await rejectedSavepoint(insertSql,row,'55000');
      for(const id of exactEmployeeIds)await query(admin,insertSql,values(workspaceId,id));
      await query(admin,insertSql,values(workspaceB,employeeB));
      const rows=await counterRows();expect(rows).toHaveLength(4);expect(rows.map(x=>x.employee_id).sort()).toEqual([...exactEmployeeIds,employeeB].sort());
      for(const row of rows)expect(row.session_created_at).toBe('2026-10-09 00:00:00.123456+00');
      record({caseId:'SI14',rows,claim:'BYTE_EXACT_FICTIONAL_SCOPE_AND_MICROSECONDS_NO_CURRENT_ELIGIBILITY_OR_REVIVAL_PROOF'});
    });
  });
  it('SI15 native char64 equality is retained without a new hex or original-string policy',async()=>{
    await inRollback(async()=>{
      const token='nonhex native token';await session(admin,token,employeeA);await query(admin,insertSql,values(workspaceId,employeeA,'1','1',createdAt,token+'   '));
      const native=(await query(admin,'SELECT token_hash::text token_hash,pg_catalog.octet_length(token_hash) length,token_hash=$1::bpchar(64) native_equal FROM '+table,[token])).rows;
      expect(native).toEqual([{token_hash:token,length:64,native_equal:true}]);
      await rejectedSavepoint(insertSql,values(workspaceId,employeeA,'1','1',createdAt,token),'23505');
      await query(admin,'UPDATE '+table+" SET token_hash=token_hash::text || '   '");expect((await query(admin,'SELECT token_hash::text token_hash FROM '+table)).rows).toEqual([{token_hash:token}]);
      record({caseId:'SI15',native,claim:'ORIGINAL_BPCHAR_SQL_EQUALITY_NOT_TEXT_BYTE_IDENTITY_OR_NEW_TOKEN_FORMAT'});
    });
  });
  it('SI16 all six immutable fields positive native int8 and unchanged assignments are exact',async()=>{
    await inRollback(async()=>{
      for(const index of [3,4])for(const number of [null,'0','-1','9223372036854775808']){const row=values(workspaceId,employeeA);row[index]=number;await rejectedSavepoint(insertSql,row,number===null?'23502':number==='9223372036854775808'?'22003':'23514');}
      await query(admin,insertSql,values(workspaceId,employeeA,'9007199254740993','9223372036854775807'));
      const before=await counterRows();expect(before[0]).toMatchObject({workspace_incarnation:'9007199254740993',portal_access_version:'9223372036854775807'});
      for(const [column,value,cast] of [['token_hash','different-native-token','bpchar(64)'],['workspace_id',workspaceB,'text'],['employee_id',employeeB,'text'],['workspace_incarnation','9007199254740994','int8'],['portal_access_version','9223372036854775806','int8'],['session_created_at','2026-10-09T00:00:00.123457Z','timestamptz']])
        await rejectedSavepoint('UPDATE '+table+' SET '+q(column)+'=$1::'+cast+' WHERE token_hash=$2::bpchar(64)',[value,tokenFor(employeeA)],'55000');
      await query(admin,'UPDATE '+table+' SET token_hash=token_hash,workspace_id=workspace_id,employee_id=employee_id,workspace_incarnation=workspace_incarnation,portal_access_version=portal_access_version,session_created_at=session_created_at');
      expect(await counterRows()).toEqual(before);record({caseId:'SI16',before,noNumberRounding:true});
    });
  });
  it('SI17 actual expiry is uncopied and may change without rewriting immutable issuance snapshots',async()=>{
    await inRollback(async()=>{
      await query(admin,insertSql,values(workspaceId,employeeA));const before=await counterRows();
      await query(admin,"UPDATE public.employee_sessions SET expires_at='2000-01-01T00:00:00.000001Z' WHERE token_hash=$1::bpchar(64)",[tokenFor(employeeA)]);
      const current=(await query(admin,'SELECT expires_at::text expires_at,created_at::text created_at FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)',[tokenFor(employeeA)])).rows;
      expect(current).toEqual([{expires_at:'2000-01-01 00:00:00.000001+00',created_at:'2026-10-09 00:00:00.123456+00'}]);expect(await counterRows()).toEqual(before);
      expect((await catalog()).columns.filter(x=>x.relation_oid===counter.oid).map(x=>x.attname)).not.toContain('expires_at');record({caseId:'SI17',current,binding:before,claim:'STORAGE_IS_NOT_SESSION_EXPIRY_OR_ACCESS_AUTHORITY'});
    });
  });
  it('SI18 all existing hard DELETE families cascade live bindings and rollback restores originals',async()=>{
    await inRollback(async()=>{
      const families=[{name:'logout',path:'src/lib/notifications/logout.ts',sql:'DELETE FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)',args:[tokenFor(employeeA)]},
        {name:'password-reset',path:'src/lib/auth/recovery.server.ts',sql:'DELETE FROM public.employee_sessions WHERE employee_id=$1',args:[employeeA]},
        {name:'recovery-revocation',path:'src/lib/auth/recovery.server.ts',sql:'DELETE FROM public.employee_sessions WHERE employee_id=$1',args:[employeeA]},
        {name:'employment-deactivation',path:'src/lib/data/employees.ts',sql:'DELETE FROM public.employee_sessions WHERE employee_id=$1 AND NOT $2::bool',args:[employeeA,false]},
        {name:'tablet-handover',path:'src/app/api/clocker/[location]/setup/route.ts',sql:'DELETE FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)',args:[tokenFor(employeeA)]}];
      for(const family of families){await query(admin,'SAVEPOINT own_revoke');
        const extraToken=hash('second-session:'+family.name);await session(admin,extraToken,employeeA);
        await query(admin,insertSql,values(workspaceId,employeeA));await query(admin,insertSql,values(workspaceId,employeeA,'1','1',createdAt,extraToken));await query(admin,insertSql,values(workspaceB,employeeB));
        if(family.name==='employment-deactivation')await query(admin,'UPDATE public.employees SET active=false WHERE id=$1',[employeeA]);
        const allEmployee=family.sql.includes('employee_id=$1'),effect=await query(admin,family.sql,family.args);expect(effect.rowCount).toBe(allEmployee?2:1);
        const retained=(await query(admin,'SELECT token_hash::text token_hash FROM public.employee_sessions WHERE employee_id=$1',[employeeA])).rows;
        expect(retained).toEqual(allEmployee?[]:[{token_hash:extraToken}]);
        const remaining=await counterRows();expect(remaining).toHaveLength(allEmployee?1:2);expect(remaining.filter(x=>x.employee_id===employeeB)).toHaveLength(1);
        if(family.name==='employment-deactivation'){await query(admin,'UPDATE public.employees SET active=true WHERE id=$1',[employeeA]);expect((await query(admin,'SELECT token_hash FROM public.employee_sessions WHERE employee_id=$1',[employeeA])).rows).toEqual([]);}
        record({caseId:'SI18',family:family.name,sourcePath:family.path,sourceSHA256:hash(readFileSync(resolve(family.path))),effectCount:effect.rowCount,remaining:await counterRows(),claim:'EXACT_EXISTING_DELETE_SHAPE_NOT_REAL_PASSWORD_OR_COOKIE_FLOW'});
        await query(admin,'ROLLBACK TO SAVEPOINT own_revoke');await query(admin,'RELEASE SAVEPOINT own_revoke');expect(await counterRows()).toEqual([]);}
      await query(admin,insertSql,values(workspaceId,employeeA));await query(admin,'DELETE FROM '+table+' WHERE token_hash=$1::bpchar(64)',[tokenFor(employeeA)]);expect(await counterRows()).toEqual([]);
      await query(admin,insertSql,values(workspaceId,employeeA));await query(admin,'TRUNCATE '+table);expect(await counterRows()).toEqual([]);record({caseId:'SI18',deliberateNoSidecarDeleteTruncateRefusal:true});
    });
  });
  it('SI19 employee deletion cascades both paths while workspace identity stays restricted',async()=>{
    await inRollback(async()=>{
      await query(admin,insertSql,values(workspaceId,employeeA));
      // The preserved original NO ACTION employment FK rejects first; keep
      // both its exact native diagnostic and the sidecar RESTRICT catalog check.
      await query(admin,'SAVEPOINT own_workspace_delete');
      let denial: { code: string; constraint?: string; schema?: string; table?: string };
      try { await admin.query('DELETE FROM public.workspaces WHERE id=$1',[workspaceId]); denial={code:'NO_ERROR'}; }
      catch(error) {
        const native=error as {constraint?:string;schema?:string;table?:string};
        denial={code:sqlstate(error),constraint:native.constraint,schema:native.schema,table:native.table};
      }
      await query(admin,'ROLLBACK TO SAVEPOINT own_workspace_delete');await query(admin,'RELEASE SAVEPOINT own_workspace_delete');
      record({caseId:'SI19',nativeWorkspaceDeletionDenial:denial});
      expect(denial).toEqual({code:'23503',constraint:'f10_workspace_reference',schema:'public',table:'employees'});
      await rejectedSavepoint('UPDATE public.employees SET workspace_id=$1 WHERE id=$2',[workspaceB,employeeA],'23514');
      await rejectedSavepoint('UPDATE public.employee_sessions SET employee_id=$1 WHERE token_hash=$2::bpchar(64)',[employeeB,tokenFor(employeeA)],'23514');
      const deleted=await query(admin,'DELETE FROM public.employees WHERE id=$1',[employeeA]);expect(deleted.rowCount).toBe(1);expect(await counterRows()).toEqual([]);
      expect((await query(admin,'SELECT token_hash FROM public.employee_sessions WHERE employee_id=$1',[employeeA])).rows).toEqual([]);
      record({caseId:'SI19',sourceEmployeeCascade:true,workspaceRestrict:true});
    });
  });
  it('SI20 ungranted APP WORKER outsider and PUBLIC have no direct storage authority',async()=>{
    const guard=(await catalog()).functions.find(x=>x.proname===functionName)!;
    for(const [principal,client] of [[appRole,app],[workerRole,worker],[outsiderRole,outsider]] as const){const id=await identity(client,principal.name,principal.oid);
      const effective=(await query(admin,`SELECT pg_catalog.has_schema_privilege($1,$2::oid,'USAGE,CREATE') schema_access,pg_catalog.has_table_privilege($1,$3::oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') table_access,pg_catalog.has_function_privilege($1,$4::oid,'EXECUTE') execute`,[principal.name,schema.oid,counter.oid,guard.oid])).rows[0];
      const read=await rejected(client,'SELECT * FROM '+table),call=await rejected(client,'SELECT nevora_tenancy.guard_portal_session_issuance()');record({caseId:'SI20',principal,id,effective,read,call});
      expect(effective).toEqual({schema_access:false,table_access:false,execute:false});expect(read).toBe('42501');expect(call).toBe('42501');}
    await preserveParent();
  });
  it('SI21 zero-policy FORCE RLS hides rows from ordinary and NOLOGIN table owner without granting mutation',async()=>{
    await inRollback(async()=>{
      await query(admin,insertSql,values(workspaceId,employeeA));
      for(const principal of [appRole,workerRole,outsiderRole,forceOwner])await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+q(principal.name));
      for(const [principal,client] of [[appRole,app],[workerRole,worker],[outsiderRole,outsider]] as const){
        // Grants remain invisible until commit; use exact SET ROLE on the owning
        // fictional superuser transaction, never pretend these are runtime grants.
        await query(admin,'GRANT SELECT,UPDATE,DELETE ON '+table+' TO '+q(principal.name));await query(admin,'SET LOCAL ROLE '+q(principal.name));
        expect((await query(admin,'SELECT * FROM '+table)).rows).toEqual([]);expect((await query(admin,'UPDATE '+table+' SET portal_access_version=portal_access_version')).rowCount).toBe(0);expect((await query(admin,'DELETE FROM '+table)).rowCount).toBe(0);
        await query(admin,'RESET ROLE');expect(client.getTransactionStatus()).toBe('I');}
      await query(admin,'ALTER TABLE '+table+' OWNER TO '+q(forceOwner.name));await query(admin,'SET LOCAL ROLE '+q(forceOwner.name));
      expect((await query(admin,'SELECT * FROM '+table)).rows).toEqual([]);expect((await query(admin,'UPDATE '+table+' SET portal_access_version=portal_access_version')).rowCount).toBe(0);await query(admin,'RESET ROLE');
      expect(await counterRows()).toHaveLength(1);record({caseId:'SI21',fictionalRollbackOnlyRoleChecks:true,NOLOGINOwnerStillForced:true,noPolicies:true});
    });
  });
  async function sessionRace(order:'BIND_FIRST'|'DELETE_COMMIT'|'DELETE_ROLLBACK') {
    const token=hash('race:'+order+':'+lease.invocation),before=await parentRows(),nativeBefore=await catalog();
    await session(admin,token,employeeA);const binding=values(workspaceId,employeeA,'1','1',createdAt,token);
    const adminIdentity=await identity(admin,lease.user,installerOid),otherIdentity=await identity(installer,lease.user,installerOid);
    let pending:Promise<string>|undefined;
    try {
      await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
      if(order==='BIND_FIRST')await query(admin,insertSql,binding);
      else await query(admin,'DELETE FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)',[token]);
      await query(installer,'BEGIN ISOLATION LEVEL READ COMMITTED');
      pending=rejected(installer,order==='BIND_FIRST'?'DELETE FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)':insertSql,order==='BIND_FIRST'?[token]:binding);pendingSessionAttempts.add(pending);
      await poll(async()=>{const row=(await query(admin,'SELECT state,wait_event_type,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[otherIdentity.pid])).rows[0];return row?.state==='active'&&row.wait_event_type==='Lock'&&row.blockers.includes(adminIdentity.pid);},'session_'+order);
      const waiting=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[otherIdentity.pid])).rows[0];
      const nativeLocks=(await query(admin,`SELECT locktype,relation::text relation,page,tuple,transactionid::text transactionid,mode,granted,pid FROM pg_catalog.pg_locks WHERE pid=ANY($1::int4[]) AND locktype IN ('relation','tuple','transactionid') ORDER BY pid,locktype,relation,page,tuple,mode`,[[adminIdentity.pid,otherIdentity.pid]])).rows;
      record({operation:'ACTUAL_SESSION_LOCK_WAIT',order,waiting,nativeLocks,originalSourceGuardUnmodified:true,noReverseAuthorityLocksClaimed:true});
      await query(admin,order==='DELETE_ROLLBACK'?'ROLLBACK':'COMMIT');
      const code=await pending;pendingSessionAttempts.delete(pending);record({operation:'ACTUAL_SESSION_LOCK_RELEASE',order,code});
      expect(code).toBe(order==='DELETE_COMMIT'?'55000':'NO_ERROR');
      if(order==='DELETE_COMMIT'){await query(installer,'ROLLBACK');expect(installer.getTransactionStatus()).toBe('I');expect((await query(admin,'SELECT token_hash FROM '+table+' WHERE token_hash=$1::bpchar(64)',[token])).rows).toEqual([]);}
      else {await query(installer,'COMMIT');expect(installer.getTransactionStatus()).toBe('I');const rows=(await query(admin,'SELECT token_hash FROM '+table+' WHERE token_hash=$1::bpchar(64)',[token])).rows;expect(rows).toHaveLength(order==='BIND_FIRST'?0:1);}
    } finally {
      await query(admin,'ROLLBACK');
      if(pending&&pendingSessionAttempts.has(pending)){await pending;pendingSessionAttempts.delete(pending);}
      await query(installer,'ROLLBACK');await query(admin,'DELETE FROM public.employee_sessions WHERE token_hash=$1::bpchar(64)',[token]);
      expect(admin.getTransactionStatus()).toBe('I');expect(installer.getTransactionStatus()).toBe('I');
      expect((await query(admin,'SELECT token_hash FROM '+table+' WHERE token_hash=$1::bpchar(64)',[token])).rows).toEqual([]);
    }
    expect(await parentRows()).toEqual(before);expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(nativeBefore));await preserveParent();
  }
  it('SI22 binding source FOR SHARE first safely serializes concurrent native hard deletion',async()=>{await sessionRace('BIND_FIRST');},30000);
  it('SI23 deletion first commits and missing-at-lock binding refuses without resurrection',async()=>{await sessionRace('DELETE_COMMIT');},30000);
  it('SI24 deletion first rolls back and waiting binding observes retained native session',async()=>{await sessionRace('DELETE_ROLLBACK');},30000);
  afterAll(async()=>{
    let cleaned=false;
    const closure:{client:string;status:string|null;finalStatus:string|null;closed:boolean}[]=[];
    try {
      // Every connection is invocation-owned. Always reconcile each transaction
      // with ROLLBACK rather than trusting the driver's immediate cached status.
      if(verified&&admin) await query(admin,'ROLLBACK');
      if(app) await query(app,'ROLLBACK');
      if(installer) await query(installer,'ROLLBACK');
      for(const pending of pendingSessionAttempts){await pending;pendingSessionAttempts.delete(pending);}
      for(const pending of pendingFenceAttempts){await pending;pendingFenceAttempts.delete(pending);}
      for(const client of clients) if(client!==admin) {
        const status=client.getTransactionStatus()??null; await query(client,'ROLLBACK');
        expect(client.getTransactionStatus()).toBe('I'); const finalStatus=client.getTransactionStatus()??null;
        await client.end();closedClients.add(client);closure.push({client:'OWN_FIXTURE_CLIENT',status,finalStatus,closed:true});
      }
      if(verified&&admin) {
        await query(admin,'RESET ROLE'); await checkBase();
        for(const undo of repairs){await query(admin,undo);repairs.delete(undo);}
        if(setupCommitted) {
          await preserveParent();
          record({operation:'FINAL_NATIVE_ORIGINALS_AND_METADATA_BEFORE_EXACT_DROP',objects,catalog:await catalog(),parentRows:await parentRows(),authority:installed?await counterRows():[],originalParentRows,originalParentCatalog});
          for(const object of [...objects].reverse()) if(!object.dropped) await dropObject(object);
        } else {
          // Setup is wholly atomic. No DROP of a name merely because an earlier
          // in-transaction observation was recorded before rollback.
          for(const object of objects) {
            const name=object.kind==='schema'?'pg_namespace':object.kind==='function'?'pg_proc':object.kind==='trigger'?'pg_trigger':'pg_class';
            expect((await query(admin,'SELECT oid FROM pg_catalog.'+name+' WHERE oid=$1::oid',[object.oid])).rows).toEqual([]);
            object.dropped=true;record({operation:'SETUP_ROLLBACK_EXACT_OBJECT_ABSENCE',...object});
          }
        }
        for(const principal of [...roles].reverse()) {
          const found=(await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[principal.name])).rows[0];
          if(!found&&!setupCommitted){record({operation:'SETUP_ROLLBACK_EXACT_ROLE_ABSENCE',...principal});continue;}
          expect(found).toEqual({oid:principal.oid});
          if(principal.login) await query(admin,'REVOKE CONNECT ON DATABASE '+q(lease.database)+' FROM '+q(principal.name));
          await query(admin,'DROP ROLE '+q(principal.name));
          expect((await query(admin,'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2',[principal.oid,principal.name])).rows).toEqual([]);
          record({operation:'EXACT_FICTIONAL_ROLE_DROPPED',...principal});
        }
        expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
        for(const [path,pin] of Object.entries(migrationPins))expect(hash(readFileSync(resolve(path)))).toBe(pin);
        expect(hash(readFileSync(sourcePath))).toBe(expectedSourceSHA256);
        cleaned=true;
      }
    } finally {
      for(const client of clients) if(!closedClients.has(client)) {
        const status=client.getTransactionStatus()??null;
        try { await client.end();closedClients.add(client);closure.push({client:client===admin?'ADMIN':'OWN_FIXTURE_CLIENT',status,finalStatus:client.getTransactionStatus()??null,closed:true}); }
        catch { closure.push({client:client===admin?'ADMIN':'OWN_FIXTURE_CLIENT',status,finalStatus:null,closed:false}); }
      }
      password='';
      if(runVerified) {
        const path=join(runPath!,'portal_session_issuance-operations.jsonl');
        const bytes=recordCount?readFileSync(path):Buffer.alloc(0);
        const fullUtf8=bytes.toString('utf8'); expect(Buffer.from(fullUtf8,'utf8')).toEqual(bytes);
        const lines=fullUtf8?fullUtf8.split('\n'):[]; if(fullUtf8)expect(lines.pop()).toBe('');
        expect(lines).toHaveLength(recordCount); for(const line of lines)JSON.parse(line);
        writeFileSync(join(runPath!,'portal-session-issuance-cleanup.json'),JSON.stringify({verified,setupCommitted,installed,cleaned,roles,objects,closure,
          connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingRepairs:repairs.size,pendingFenceAttempts:pendingFenceAttempts.size,pendingSessionAttempts:pendingSessionAttempts.size,actualSQLAttempted:sqlAttempted,
          sourceSHA256:hash(source),originalParentSourceSHA256:hash(parentSource),migrationPins,
          completeHistoricalJsonl:{path,sha256:hash(bytes),bytes:bytes.byteLength,recordCount,utf8Verified:true,referenceOnly:true},
          provenance:'APPEND_ONLY_JSONL_EARLIER_DROPPED_FALSE_OBSERVATIONS_AND_FINAL_OBJECT_DROPPED_TRUE_ARE_DISTINCT_NOT_BYTE_EQUIVALENT',
          claim:'MINIMAL_FICTIONAL_NATIVE_EMPTY_AUTHORITY_STORAGE_ONLY_NOT_REAL_RESOLVER_CURRENT_PROOF_ACTIVATION_RLS_DOMAIN_NEON_CUTOVER_OR_FULL_F10',rootOnlyDatabaseAndPostmasterCleanup:true},null,2),{flag:'wx',mode:0o600});
      }
    }
  },60000);
});
