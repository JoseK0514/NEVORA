import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import {CAPABILITIES} from '../../capabilities/types';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/portal-source-observation.sql');
const kernelPath = resolve('src/lib/tenancy/runtime/portal-source-locks.sql');
const kernelSource = readFileSync(kernelPath, 'utf8');
const expectedKernelSHA256 = 'fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03';
let source = ''; // Loaded only after explicit owned opt-in and custody checks.
const parentPath = resolve('db/migrations/0008_workspace_positions.sql');
const parentSource = readFileSync(parentPath, 'utf8');
const employeeSource = readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8');
const expansionSource = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const expectedSourceSHA256 = '72b6509933ca2bbd73fbb11eae7232db40bf5f5eafd94be56e291f236ff83dc7';
const expectedSourceTestSHA256 = '301240e3a2212ad7a33124af36102a27144c612e61162a790af20e03c83aebe1';
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
const table = 'nevora_tenancy.portal_administrative_authority';
const childTables=['nevora_tenancy.portal_administrative_capability','nevora_tenancy.portal_administrative_location'] as const;
const allTables=[table,...childTables] as const;
const communicationSource=readFileSync(resolve('db/migrations/0024_contextual_communications.sql'),'utf8');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_PO_OWNED_LEASE, runPath = process.env.F_PO_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string; login: boolean };
type OwnObject = { kind: 'schema' | 'table' | 'function' | 'trigger'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; relationOid?: string; dropped: boolean };

// HOLD without explicit root-owned lease+run directory. No discovery, ambient URL,
// startup, constructor side effect or SQL before the opt-in fixture checks.
// Exact sparse original0008 singleton parent and original0001/0024/0026 fragments.
// Positive installer mechanics only: no auth/current-proof/final comparison or full68/runtime/cutover proof.
describe.skipIf(!leasePath && !runPath)('owned PG18 unused portal-source observation and locking mechanics only', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, installer: Client, writer: Client;
  let appRole: Role, workerRole: Role, outsiderRole: Role;
  let password = '', installerOid = '', workspaceId = '', verified = false, runVerified = false;
  let installed = false, setupCommitted = false, sqlAttempted = false;
  let originalRows: unknown, originalCatalog: unknown;
  let credentialParent: OwnObject, sessionParent: OwnObject, live: OwnObject, kernel: OwnObject;
  let parent: OwnObject, employeeParent: OwnObject, schema: OwnObject, counter: OwnObject, contracts: OwnObject, protocol: OwnObject, location: OwnObject, portalParent: OwnObject;
  let employeeA = '', employeeB = '', nullOwnerEmployee = '';
  const exactEmployeeIds: string[] = [], exactLocationIds: string[] = [];
  let locationA = '';

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
    catch (error) { throw Error('owned_portal_source_observation_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    recordCount++;
    appendFileSync(join(runPath!, 'portal-source-observation-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_portal_source_observation_connection_failed'); }
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
    const condition = namespaceOnly ? "n.nspname='nevora_tenancy'" : "(n.nspname='nevora_tenancy' OR (n.nspname='public' AND c.relname IN ('workspaces','employees','locations','employee_credentials','employee_sessions')))";
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

  const observerCall = 'SELECT nevora_tenancy.read_portal_source_rows($1::text,$2::text,$3::bpchar) AS observation';
  type Observation = { kind: string; workspace: Record<string, unknown>; employee: Record<string, unknown>; credential: Record<string, unknown>; incarnation: Record<string, unknown>; portal: Record<string, unknown>; session: Record<string, unknown>; issuance: Record<string, unknown>; administrative: Record<string, unknown> | null };
  let expectedCounter = '9007199254740993';
  const createdAt = '2026-10-09T00:00:00.123456Z', expiry = '2000-01-01T00:00:00.654321Z';
  const token = () => hash('fictional-kernel-session:' + employeeA);
  const sourceTables = ['public.workspaces', 'public.locations', 'public.employees', 'public.employee_credentials', 'public.employee_sessions'] as const;
  const privateTables = ['nevora_tenancy.workspace_incarnation_counter', 'nevora_tenancy.portal_authority', 'nevora_tenancy.portal_session_issuance', ...allTables] as const;
  const completeTables = [...sourceTables, 'nevora_tenancy.owned_table_contract', 'nevora_tenancy.expansion_protocol', ...privateTables] as const;
  function oneFragment(bytes: string, pattern: RegExp) { const found = bytes.match(pattern); expect(found).toHaveLength(1); return found![0]; }
  const identitySource = oneFragment(expansionSource, /CREATE FUNCTION nevora_tenancy\.source_identity_guard\(\)[\s\S]*?\$identity_guard\$;/g);
  const fenceSource = oneFragment(expansionSource, /CREATE FUNCTION nevora_tenancy\.source_write_fence\(\)[\s\S]*?\$write_fence\$;/g);
  const storage = [
    ['workspace-incarnation-storage', 'b3d8c8ecf96fb4ff72255e85a53a50ddc97a1633dfdf94cea19b4496382a07f9'],
    ['portal-authority-storage', 'e8afeff01d13775eeecd462e7a6e2bb662e1279ce44fd3ded2b383e34821a094'],
    ['portal-session-issuance-storage', '4625ff35db3c4c3b63ef9e575468af75f4e4935c8af9934ec5b99e3cf346397e'],
    ['portal-administrative-authority-storage', '06d78b8e7e6118109312d07d48d56231266b38853bcdd8792e1e298836af42a4'],
  ] as const;
  async function rows() {
    const result: Record<string, unknown> = {};
    for (const name of completeTables) {
      // Native text keeps every original value, unsafe int8 and UTC timestamp
      // bytes losslessly. Credential material is an explicit fictional literal.
      result[name] = (await query(admin, 'SELECT pg_catalog.to_jsonb(t)::text wire FROM ' + name + ' t ORDER BY pg_catalog.to_jsonb(t)::text COLLATE pg_catalog."C"')).rows;
    }
    return result;
  }
  async function preserve() {
    expect(await rows()).toEqual(originalRows); expect(canonicalAcl(await catalog())).toEqual(originalCatalog);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
  }
  async function poll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_portal_source_observation_timeout_' + label);
  }
  async function begin(client: Client) {
    expect(client.getTransactionStatus()).toBe('I'); await query(client, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    // This caller-owned fixture explicitly acquires the catalog fence FIRST.
    await query(client, RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
  }
  async function call(client: Client, workspace: unknown = workspaceId, employee: unknown = employeeA, session: unknown = token()) {
    const result = (await query(client, observerCall, [workspace, employee, session])).rows;
    expect(result).toHaveLength(1); expect(Object.keys(result[0])).toEqual(['observation']);
    expect(result[0].observation).toHaveProperty('kind', 'PORTAL_SOURCE_OBSERVATION_V1');
    return result[0].observation as Observation;
  }
  async function aborted(client: Client, code: string, expected: string) {
    const pid = (client as Client & { processID: number }).processID;
    const immediate = client.getTransactionStatus();
    await poll(async () => (await query(admin, 'SELECT state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid])).rows[0]?.state === 'idle in transaction (aborted)' && client.getTransactionStatus() === 'E', 'aborted');
    const activity = (await query(admin, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid])).rows[0];
    const next = await rejected(client, 'SELECT 1');
    record({ operation: 'SYNCHRONIZED_NATIVE_ERROR', code, expected, immediate, activity, clientStatus: client.getTransactionStatus(), subsequentSQLSTATE: next });
    expect(code).toBe(expected); expect(next).toBe('25P02'); expect(client.getTransactionStatus()).toBe('E');
  }
  async function waitEvidence(client: Client, blocker: Client, caseId: string) {
    const pid = (client as Client & { processID: number }).processID, blockerPid = (blocker as Client & { processID: number }).processID;
    await poll(async () => (await query(admin, `SELECT pg_catalog.pg_blocking_pids($1) blockers`, [pid])).rows[0].blockers.includes(blockerPid), caseId);
    const activity = (await query(admin, `SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers,usesysid::text original_oid
      FROM pg_catalog.pg_stat_activity WHERE pid=ANY($1::int4[]) ORDER BY pid`, [[pid, blockerPid]])).rows;
    const locks = (await query(admin, `SELECT pid,locktype,mode,granted,relation::text relation_oid,transactionid::text transaction_id,page,tuple
      FROM pg_catalog.pg_locks WHERE pid=ANY($1::int4[]) ORDER BY pid,locktype,mode,relation,page,tuple`, [[pid, blockerPid]])).rows;
    record({ operation: 'NATIVE_ROW_WAIT', caseId, pid, blockerPid, activity, locks });
    expect(activity.find(row => row.pid === pid)).toMatchObject({ state: 'active', wait_event_type: 'Lock' });
    expect(activity.find(row => row.pid === pid)?.blockers).toContain(blockerPid);
    expect(locks.some(row => row.pid === pid && !row.granted)).toBe(true);
    return { activity, locks };
  }
  async function rollback(client: Client) { await query(client, 'ROLLBACK'); expect(client.getTransactionStatus()).toBe('I'); }
  async function rollbackBody(body: () => Promise<void>) {
    const before = await rows(), beforeCatalog = canonicalAcl(await catalog()); await begin(admin);
    try { await body(); } finally { await rollback(admin); }
    expect(await rows()).toEqual(before); expect(canonicalAcl(await catalog())).toEqual(beforeCatalog);
  }
  async function credential(client: Client) {
    await query(client, `INSERT INTO public.employee_credentials(employee_id,password_hash,must_change_password,password_updated_at)
      VALUES($1,'fictional-not-a-password',true,$2::timestamptz)`, [employeeA, createdAt]);
  }
  async function session(client: Client) {
    await query(client, 'INSERT INTO public.employee_sessions(token_hash,employee_id,expires_at,created_at) VALUES($1::bpchar(64),$2,$3::timestamptz,$4::timestamptz)', [token(), employeeA, expiry, createdAt]);
  }
  async function liveRow(client: Client) {
    await query(client, `INSERT INTO nevora_tenancy.portal_session_issuance(token_hash,workspace_id,employee_id,workspace_incarnation,portal_access_version,session_created_at)
      VALUES($1::bpchar(64),$2,$3,1,1,$4::timestamptz)`, [token(), workspaceId, employeeA, createdAt]);
  }
  async function seedThrough(count: number) {
    if (count >= 3) await credential(admin);
    if (count >= 4) await query(admin, 'INSERT INTO nevora_tenancy.workspace_incarnation_counter(workspace_id,incarnation) VALUES($1,9007199254740993)', [workspaceId]);
    if (count >= 5) await query(admin, `INSERT INTO nevora_tenancy.portal_authority(workspace_id,employee_id,authorization_version,portal_access_version,capability_policy_revision,portal_state,proof_provenance,provenance_reference)
      VALUES($1,$2,1,1,1,'DISABLED','UNVERIFIED','fictional:unverified')`, [workspaceId, employeeA]);
    if (count >= 6) await session(admin);
    if (count >= 7) await liveRow(admin);
  }
  async function adminHeader(client: Client) { await query(client, `INSERT INTO ${table}(workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision)
    VALUES($1,$2,'LOCATIONS','EXPLICIT_GRANT','fictional:unverified',1)`, [workspaceId, employeeA]); }
  async function rememberStorage(bytes: string) {
    for (const match of bytes.matchAll(/^CREATE TABLE nevora_tenancy\.(\w+)/gm)) await remember('table', 'nevora_tenancy', match[1], installerOid);
    for (const match of bytes.matchAll(/^CREATE FUNCTION nevora_tenancy\.(\w+)\(\)/gm)) await remember('function', 'nevora_tenancy', match[1], installerOid, '()');
    for (const match of bytes.matchAll(/^CREATE TRIGGER (\w+)\n[\s\S]*?ON nevora_tenancy\.(\w+)\n/gm)) await remember('trigger', 'nevora_tenancy', match[1], installerOid, 'nevora_tenancy.' + match[2]);
  }
  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid = process.getuid?.(); expect(uid !== undefined).toBe(true);
    const leaseStat = lstatSync(leasePath!); expect(leaseStat.isFile() && !leaseStat.isSymbolicLink()).toBe(true);
    expect(leaseStat.uid).toBe(uid); expect(leaseStat.mode & 0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(uid); runVerified = true;
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:portal-source-observation:' + lease.invocation);
    expect(lease.marker).toBe('f10-owned:' + lease.invocation);
    expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data'));
    expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data);
    expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credentialFile = lstatSync(lease.credentialFile);
    expect(credentialFile.isFile() && !credentialFile.isSymbolicLink()).toBe(true); expect(credentialFile.uid).toBe(uid);
    expect(credentialFile.mode & 0o777).toBe(0o600); expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);
    expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    source = readFileSync(sourcePath, 'utf8'); expect(hash(source)).toBe(expectedSourceSHA256);
    expect(hash(kernelSource)).toBe(expectedKernelSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-source-observation.test.ts')))).toBe(expectedSourceTestSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/catalog-fence.server.ts')))).toBe(expectedFenceSHA256);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
    for (const [name, pin] of storage) expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/' + name + '.sql')))).toBe(pin);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user); const base = await checkBase();
    installerOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid as string;
    expect((await query(admin, 'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid', [String(lease.databaseOid)])).rows).toEqual([{ owner: installerOid }]);
    expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, "SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
    verified = true;
    record({ operation: 'EXACT_OWN_ROOT_BASE_VERIFIED', base, sourceSHA256: hash(source), migrationPins });
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      appRole = await role(lease.invocation + '_app', true); workerRole = await role(lease.invocation + '_worker', true); outsiderRole = await role(lease.invocation + '_outsider', true);
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + roles.map(x => q(x.name)).join(','));
      await query(admin, 'CREATE SCHEMA nevora_tenancy'); schema = await remember('schema', '', 'nevora_tenancy', installerOid);
      await query(admin, 'SET LOCAL search_path=public,pg_catalog');
      const parentFragment = oneFragment(parentSource, /CREATE TABLE workspaces \([\s\S]*?\n\);/g);
      await query(admin, parentFragment); parent = await remember('table', 'public', 'workspaces', installerOid);
      const locationFragment = oneFragment(employeeSource, /CREATE TABLE IF NOT EXISTS locations \([\s\S]*?\n\);/g);
      await query(admin, locationFragment); location = await remember('table', 'public', 'locations', installerOid);
      const locationStatements = [...parentSource.matchAll(/^ALTER TABLE locations[^;]*;/gm)].map(x => x[0]); expect(locationStatements).toHaveLength(8);
      for (const statement of locationStatements) await query(admin, statement);
      await query(admin, oneFragment(communicationSource, /^ALTER TABLE locations ADD CONSTRAINT communication_location_workspace_key[^;]*;/gm));
      const employeeFragment = oneFragment(employeeSource, /CREATE TABLE IF NOT EXISTS employees \([\s\S]*?\n\);/g);
      await query(admin, employeeFragment); employeeParent = await remember('table', 'public', 'employees', installerOid);
      await query(admin, oneFragment(expansionSource, /ALTER TABLE public\."employees" ADD COLUMN workspace_id text;\nALTER TABLE public\."employees" ADD CONSTRAINT f10_workspace_reference[^\n]*\nALTER TABLE public\."employees" ADD CONSTRAINT f10_tenant_c49de3d265fb[^\n]*/g));
      for (const name of ['employee_credentials', 'employee_sessions']) {
        await query(admin, oneFragment(employeeSource, new RegExp('CREATE TABLE IF NOT EXISTS ' + name + ' \\([\\s\\S]*?\\n\\);', 'g')));
        const item = await remember('table', 'public', name, installerOid); if (name === 'employee_credentials') credentialParent = item; else sessionParent = item;
      }
      for (const name of ['employee_sessions_employee_idx', 'employee_sessions_expires_idx']) await query(admin, oneFragment(employeeSource, new RegExp('^CREATE INDEX IF NOT EXISTS ' + name + '[^;]*;', 'gm')));
      await query(admin, oneFragment(expansionSource, /CREATE TABLE nevora_tenancy\.expansion_protocol \([\s\S]*?\n\);/g)); protocol = await remember('table', 'nevora_tenancy', 'expansion_protocol', installerOid);
      await query(admin, oneFragment(expansionSource, /CREATE TABLE nevora_tenancy\.owned_table_contract \([\s\S]*?\n\);/g)); contracts = await remember('table', 'nevora_tenancy', 'owned_table_contract', installerOid);
      await query(admin, oneFragment(expansionSource, /INSERT INTO nevora_tenancy\.expansion_protocol\([^\n]*;/g));
      const contractValues = oneFragment(expansionSource, /^INSERT INTO nevora_tenancy\.owned_table_contract VALUES\n[\s\S]*?;$/gm);
      const contractRows = sourceTables.map(name => oneFragment(contractValues, new RegExp("^\\('" + name.split('.')[1] + "',[^\\n]*", 'gm')).replace(/[,;]$/, ''));
      await query(admin, 'INSERT INTO nevora_tenancy.owned_table_contract VALUES\n' + contractRows.join(',\n') + ';');
      workspaceId = ' ' + lease.invocation + '_workspace_位置 '; employeeA = ' ' + lease.invocation + '_employee_β ';
      employeeB = lease.invocation + '_history_inactive'; nullOwnerEmployee = lease.invocation + '_unattributed';
      exactEmployeeIds.push(employeeA, employeeB, nullOwnerEmployee);
      exactLocationIds.push(' ' + lease.invocation + '_loc_β ', lease.invocation + '_loc_e\u0301', lease.invocation + '_loc_é'); locationA = exactLocationIds[0];
      await query(admin, "INSERT INTO public.workspaces(id,name,time_zone,active,created_at,updated_at) VALUES($1,'Fictional workspace','UTC',true,$2::timestamptz,$2::timestamptz)", [workspaceId, createdAt]);
      for (const [index, id] of exactLocationIds.entries()) await query(admin, `INSERT INTO public.locations(id,name,short_name,workspace_id,clocker_key,active,created_at,updated_at)
        VALUES($1,'Fictional','Fixture',$2,$3,false,$4::timestamptz,$4::timestamptz)`, [id, workspaceId, 'fixture-' + index, createdAt]);
      for (const id of exactEmployeeIds) await query(admin, `INSERT INTO public.employees(id,first_name,last_name,phone,email,role,primary_location_id,active,created_at,updated_at,workspace_id)
        VALUES($1,'Fictional','Employee','0000000000',NULL,'EMPLOYEE',$2,$3,$4::timestamptz,$4::timestamptz,$5)`, [id, locationA, id === employeeA, createdAt, id === nullOwnerEmployee ? null : workspaceId]);
      await query(admin, fenceSource); await remember('function', 'nevora_tenancy', 'source_write_fence', installerOid, '()');
      await query(admin, identitySource); await remember('function', 'nevora_tenancy', 'source_identity_guard', installerOid, '()');
      for (const name of sourceTables.map(x => x.split('.')[1])) for (const guard of ['f10_write_fence', 'f10_identity_guard']) {
        await query(admin, oneFragment(expansionSource, new RegExp('^CREATE TRIGGER ' + guard + '[^\\n]*ON public\\."' + name + '"[^\\n]*;', 'gm')));
        await remember('trigger', 'public', guard, installerOid, 'public.' + name);
      }
      await query(admin, 'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC'); await query(admin, 'REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin, 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin, 'COMMIT'); setupCommitted = true;
      record({ operation: 'SPARSE_UNCHANGED_SINGLETON_SOURCE_FIXTURE', parentFragment, parentSHA256: hash(parentFragment), locationFragment, locationStatements,
        employeeFragmentSHA256: hash(employeeFragment), contractRows, identitySourceSHA256: hash(identitySource), sourceFenceSHA256: hash(fenceSource),
        claim: 'ONE_FICTIONAL_WORKSPACE_NOT_FULL68_OR_CUTOVER_NO_SOURCE_GUARD_REWRITE' });
    } finally { await rollback(admin); }
    for (const [name] of storage) {
      const bytes = readFileSync(resolve('src/lib/tenancy/runtime/' + name + '.sql'), 'utf8'); await query(admin, bytes); await rollback(admin); await rememberStorage(bytes);
    }
    counter = objects.find(x => x.kind === 'table' && x.name === 'workspace_incarnation_counter')!;
    portalParent = objects.find(x => x.kind === 'table' && x.name === 'portal_authority')!;
    live = objects.find(x => x.kind === 'table' && x.name === 'portal_session_issuance')!;
    originalRows = await rows(); originalCatalog = canonicalAcl(await catalog());
    app = await connect(appRole.name); worker = await connect(workerRole.name); outsider = await connect(outsiderRole.name);
    installer = await connect(lease.user); writer = await connect(lease.user);
    record({ operation: 'EMPTY_PRIVATE_STORAGE_NATIVE_BEFORE_OBSERVER', roles, objects, rows: originalRows, catalog: originalCatalog, clients: clients.size });
    writeFileSync(join(runPath!, 'portal-source-observation-fixture-custody.json'), JSON.stringify({ base, roles, objects, originalRows, originalCatalog,
      sourceObjects: { parent, location, employeeParent, credentialParent, sessionParent, protocol, contracts, counter, portalParent, live }, expectedClients: 6, storage, migrationPins, kernelSourceSHA256: hash(kernelSource), observerSourceSHA256: hash(source), scope: 'INSTALLER_SOURCE_OBSERVATIONS_NOT_RUNTIME_OR_AUTHORIZATION' }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 60000);

  function baseline(): Observation {
    return {
      kind: 'PORTAL_SOURCE_OBSERVATION_V1',
      workspace: { id: workspaceId, active: true, version: '2026-10-09 00:00:00.123456+00' },
      employee: { id: employeeA, workspaceId, active: true, role: 'EMPLOYEE', version: '2026-10-09 00:00:00.123456+00' },
      credential: { employeeId: employeeA, version: '2026-10-09 00:00:00.123456+00', mustChangePassword: true },
      incarnation: { workspaceId, version: expectedCounter },
      portal: { workspaceId, employeeId: employeeA, authorizationVersion: '1', portalAccessVersion: '1', capabilityPolicyRevision: '1', state: 'DISABLED', proofProvenance: 'UNVERIFIED', provenanceReference: 'fictional:unverified' },
      session: { tokenHash: token(), employeeId: employeeA, expiresAt: '2000-01-01 00:00:00.654321+00', createdAt: '2026-10-09 00:00:00.123456+00' },
      issuance: { tokenHash: token(), workspaceId, employeeId: employeeA, workspaceIncarnation: '1', portalAccessVersion: '1', sessionCreatedAt: '2026-10-09 00:00:00.123456+00' },
      administrative: null,
    };
  }
  async function observeOwn() {
    await begin(installer);
    try { return await call(installer); } finally { await rollback(installer); }
  }
  async function withAdministrative(body: () => Promise<void>, children = false, scope = 'LOCATIONS') {
    const before = await rows(); await begin(admin);
    try {
      await query(admin, `INSERT INTO ${table}(workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision)
        VALUES($1,$2,$3,'EXPLICIT_GRANT','fictional:unverified',1)`, [workspaceId, employeeA, scope]);
      if (children) {
        for (const code of [CAPABILITIES[1], CAPABILITIES[0]]) await query(admin, 'INSERT INTO ' + childTables[0] + '(workspace_id,employee_id,capability) VALUES($1,$2,$3)', [workspaceId, employeeA, code]);
        for (const id of [...exactLocationIds].reverse()) await query(admin, 'INSERT INTO ' + childTables[1] + '(workspace_id,employee_id,location_id) VALUES($1,$2,$3)', [workspaceId, employeeA, id]);
      }
      await query(admin, 'COMMIT');
    } finally { await rollback(admin); }
    try { await body(); }
    finally {
      await rollback(installer); await rollback(writer);
      for (const pending of pendingFenceAttempts) { await pending; pendingFenceAttempts.delete(pending); }
      await begin(admin);
      try { for (const name of [...childTables, table]) await query(admin, 'DELETE FROM ' + name + ' WHERE workspace_id=$1 AND employee_id=$2', [workspaceId, employeeA]); await query(admin, 'COMMIT'); }
      finally { await rollback(admin); }
      expect(await rows()).toEqual(before); await preserve();
    }
  }
  it('PO01 whole artifact installs an ungranted invoker observer retaining every original source and private storage row', async () => {
    const before = await rows(), beforeNative = await catalog();
    await query(installer, kernelSource); await rollback(installer);
    const lock = await remember('function', 'nevora_tenancy', 'lock_portal_source_rows', installerOid, '(text,text,bpchar)');
    const beforeObserver = await catalog();
    await query(installer, source); await rollback(installer); installed = true;
    kernel = await remember('function', 'nevora_tenancy', 'read_portal_source_rows', installerOid, '(text,text,bpchar)');
    const native = await catalog(), fn = native.functions.find(x => x.oid === kernel.oid)!;
    record({ caseId: 'PO01', beforeNative, beforeObserver, native, beforeRows: before, afterRows: await rows(), lock, observer: kernel, definitionSHA256: hash(fn.definition) });
    expect(fn).toMatchObject({ owner: installerOid, prosecdef: false, proconfig: ['search_path=pg_catalog'], return_oid: '3802',
      arg_oids: '25 25 1042', proretset: false, provolatile: 'v', proparallel: 'u', lanname: 'plpgsql' });
    const body = (await query(admin, 'SELECT prosrc FROM pg_catalog.pg_proc WHERE oid=$1::oid', [kernel.oid])).rows[0].prosrc;
    expect(body).toBe(source.split('$portal_source_observation$')[1]);
    expect(await rows()).toEqual(before); expect(native.relations).toEqual(beforeNative.relations);
    expect(native.columns).toEqual(beforeNative.columns); expect(native.constraints).toEqual(beforeNative.constraints);
    expect(native.triggers).toEqual(beforeNative.triggers); expect(native.policies).toEqual([]);
    expect(native.functions.filter(x => x.oid !== kernel.oid)).toEqual(beforeObserver.functions);
    expect(native.expandedAcls.filter(x => x.kind === 'FUNCTION' && x.oid === kernel.oid && x.grantee !== installerOid)).toEqual([]);
    expect(objects).toHaveLength(43); originalCatalog = canonicalAcl(native); await preserve();
  });
  it('PO02 every missing required source preserves fixed lock-kernel55000 and seeds no optional administrative data', async () => {
    const names = ['workspace', 'attributed-employee', 'credential', 'counter', 'persistent-portal', 'original-session', 'LIVE'];
    for (const [index, name] of names.entries()) await rollbackBody(async () => {
      await seedThrough(index); await query(admin, 'SAVEPOINT exact_missing');
      const args = [index === 0 ? 'nonexistent-tenant' : workspaceId, index === 1 ? 'nonexistent-employee' : employeeA, token()];
      let code = 'NO_ERROR', message = '';
      try { await admin.query(observerCall, args); } catch (error) { code = sqlstate(error); message = (error as { message: string }).message; }
      await query(admin, 'ROLLBACK TO SAVEPOINT exact_missing'); await query(admin, 'RELEASE SAVEPOINT exact_missing');
      record({ caseId: 'PO02', required: name, index, code, message, rows: await rows(), args });
      expect(code).toBe('55000'); expect(message).toBe('portal_source_lock_missing');
      expect((await query(admin, 'SELECT * FROM ' + table)).rows).toEqual([]);
    });
    await preserve();
  });
  it('PO03 required raw groups are exact and absent administration is JSONnull with native bpchar padding preserved', async () => {
    const emptyBefore = await rows(); await begin(admin);
    try { await seedThrough(7); await query(admin, 'COMMIT'); } finally { await rollback(admin); }
    originalRows = await rows(); await begin(installer);
    try {
      const observed = await call(installer, workspaceId, employeeA, token() + '   ');
      record({ caseId: 'PO03', emptyBefore, explicitlySeededRows: originalRows, observed, expected: baseline() });
      expect(observed).toEqual(baseline());
      expect(Object.keys(observed).sort()).toEqual(['kind', 'workspace', 'employee', 'credential', 'incarnation', 'portal', 'session', 'issuance', 'administrative'].sort());
      expect(observed.administrative).toBe(null);
      expect(observed.issuance.workspaceIncarnation).not.toBe(observed.incarnation.version);
      const native = (await query(installer, 'SELECT token_hash::text token_hash,token_hash=$1::bpchar padded_equal FROM public.employee_sessions WHERE employee_id=$2', [token() + '   ', employeeA])).rows;
      expect(native).toEqual([{ token_hash: token(), padded_equal: true }]);
      const text = JSON.stringify(observed);
      for (const forbidden of ['password_hash', 'passwordHash', 'fictional-not-a-password', 'firstName', 'lastName', 'phone', 'email', 'primaryLocationId', 'allowedLocationIds', 'ALLOW', 'authorityCurrent']) expect(text).not.toContain(forbidden);
    } finally { await rollback(installer); }
    await preserve();
  });
  it('PO04 explicit empty LOCATIONS remains a header with empty arrays and no inferred employee eligibility', async () => {
    await withAdministrative(async () => {
      const observed = await observeOwn();
      expect(observed).toEqual({ ...baseline(), administrative: { workspaceId, employeeId: employeeA, scopeKind: 'LOCATIONS', scopeOrigin: 'EXPLICIT_GRANT', provenanceReference: 'fictional:unverified', capabilityPolicyRevision: '1', capabilities: [], locationIds: [] } });
      record({ caseId: 'PO04', observed });
    });
  });
  it('PO05 ALL_TENANT with contradictory retained child rows is reported raw without grant repair or inferred authority', async () => {
    await withAdministrative(async () => {
      const observed = await observeOwn();
      expect(observed.administrative).toMatchObject({ scopeKind: 'ALL_TENANT', scopeOrigin: 'EXPLICIT_GRANT' });
      expect(observed.administrative?.capabilities).toEqual([CAPABILITIES[0], CAPABILITIES[1]].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));
      expect(observed.administrative?.locationIds).toEqual([...exactLocationIds].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));
      record({ caseId: 'PO05', observed, claim: 'RAW_CONTRADICTION_NOT_ALL_TENANT_PERMISSION' });
    }, true, 'ALL_TENANT');
  });
  it('PO06 complete UTF8-byte-ordered children retain Unicode distinctions and exclude a different same-workspace employee', async () => {
    await rollbackBody(async () => {
      await adminHeader(admin);
      for (const code of [CAPABILITIES[1], CAPABILITIES[0]]) await query(admin, 'INSERT INTO ' + childTables[0] + '(workspace_id,employee_id,capability) VALUES($1,$2,$3)', [workspaceId, employeeA, code]);
      for (const id of [...exactLocationIds].reverse()) await query(admin, 'INSERT INTO ' + childTables[1] + '(workspace_id,employee_id,location_id) VALUES($1,$2,$3)', [workspaceId, employeeA, id]);
      await query(admin, `INSERT INTO nevora_tenancy.portal_authority(workspace_id,employee_id,authorization_version,portal_access_version,capability_policy_revision,portal_state,proof_provenance,provenance_reference)
        VALUES($1,$2,1,1,1,'DISABLED','UNVERIFIED','fictional:other')`, [workspaceId, employeeB]);
      await query(admin, `INSERT INTO ${table}(workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision) VALUES($1,$2,'LOCATIONS','EXPLICIT_GRANT','fictional:other',1)`, [workspaceId, employeeB]);
      await query(admin, 'INSERT INTO ' + childTables[0] + '(workspace_id,employee_id,capability) VALUES($1,$2,$3)', [workspaceId, employeeB, CAPABILITIES[2]]);
      const observed = await call(admin);
      expect(observed.administrative).toEqual({ workspaceId, employeeId: employeeA, scopeKind: 'LOCATIONS', scopeOrigin: 'EXPLICIT_GRANT', provenanceReference: 'fictional:unverified', capabilityPolicyRevision: '1', capabilities: [CAPABILITIES[0], CAPABILITIES[1]].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))), locationIds: [...exactLocationIds].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))) });
      expect(observed.administrative?.capabilities).not.toContain(CAPABILITIES[2]);
      record({ caseId: 'PO06', observed, nativeRows: await rows(), claim: 'COMPLETE_EXACT_SUBJECT_SOURCE_CHILDREN_NO_NAMES_OR_ELIGIBILITY' });
    }); await preserve();
  });
  it('PO07 foreign unattributed absent NULL and normalized text inputs never disclose another source', async () => {
    for (const args of [[null, employeeA, token()], [workspaceId, null, token()], [workspaceId, employeeA, null],
      ['foreign-workspace', employeeA, token()], [workspaceId, nullOwnerEmployee, token()], [workspaceId, employeeB, token()],
      [workspaceId.trim(), employeeA, token()], [workspaceId, employeeA.trim(), token()], [workspaceId, employeeA, 'different-session']]) {
      await begin(installer);
      try { const code = await rejected(installer, observerCall, args); await aborted(installer, code, '55000'); record({ caseId: 'PO07', args, code }); }
      finally { await rollback(installer); }
    } await preserve();
  });
  it('PO08 disabled unverified inactive expired stale epoch and policy mismatch remain literal observations', async () => {
    await rollbackBody(async () => {
      await query(admin, 'UPDATE public.workspaces SET active=false WHERE id=$1', [workspaceId]);
      await query(admin, 'UPDATE public.employees SET active=false WHERE id=$1', [employeeA]);
      await query(admin, `UPDATE nevora_tenancy.portal_authority SET authorization_version=2,portal_access_version=2,capability_policy_revision=2 WHERE workspace_id=$1 AND employee_id=$2`, [workspaceId, employeeA]);
      await adminHeader(admin);
      const observed = await call(admin);
      expect(observed.workspace.active).toBe(false); expect(observed.employee.active).toBe(false);
      expect(observed.portal).toMatchObject({ authorizationVersion: '2', portalAccessVersion: '2', capabilityPolicyRevision: '2', state: 'DISABLED', proofProvenance: 'UNVERIFIED' });
      expect(observed.administrative?.capabilityPolicyRevision).toBe('1'); expect(observed.issuance.portalAccessVersion).toBe('1');
      expect(observed.issuance.workspaceIncarnation).toBe('1'); expect(observed.session.expiresAt).toBe('2000-01-01 00:00:00.654321+00');
      record({ caseId: 'PO08', observed, claim: 'RAW_DENIAL_INPUTS_NOT_FILTERED_OR_REPAIRED_NOT_AUTHORIZATION' });
    }); await preserve();
  });
  it('PO09 every native int8 field preserves both above-JS-safe and max text with exact native microseconds', async () => {
    await rollbackBody(async () => {
      await adminHeader(admin);
      for (const value of ['9007199254740993', '9223372036854775807']) {
        if (value === '9223372036854775807') await query(admin, 'UPDATE nevora_tenancy.workspace_incarnation_counter SET incarnation=$2::int8 WHERE workspace_id=$1', [workspaceId, value]);
        await query(admin, `UPDATE nevora_tenancy.portal_authority SET authorization_version=$3::int8,portal_access_version=$3::int8,capability_policy_revision=$3::int8 WHERE workspace_id=$1 AND employee_id=$2`, [workspaceId, employeeA, value]);
        await query(admin, 'DELETE FROM nevora_tenancy.portal_session_issuance WHERE token_hash=$1::bpchar', [token()]);
        await query(admin, `INSERT INTO nevora_tenancy.portal_session_issuance(token_hash,workspace_id,employee_id,workspace_incarnation,portal_access_version,session_created_at) VALUES($1::bpchar(64),$2,$3,$4::int8,$4::int8,$5::timestamptz)`, [token(), workspaceId, employeeA, value, createdAt]);
        await query(admin, 'UPDATE ' + table + ' SET capability_policy_revision=$3::int8 WHERE workspace_id=$1 AND employee_id=$2', [workspaceId, employeeA, value]);
        const observed = await call(admin);
        for (const field of [observed.incarnation.version, observed.portal.authorizationVersion, observed.portal.portalAccessVersion, observed.portal.capabilityPolicyRevision, observed.issuance.workspaceIncarnation, observed.issuance.portalAccessVersion, observed.administrative?.capabilityPolicyRevision]) {
          expect(field).toBe(value); expect(typeof field).toBe('string');
        }
        expect(observed.workspace.version).toBe('2026-10-09 00:00:00.123456+00'); expect(observed.employee.version).toBe('2026-10-09 00:00:00.123456+00'); expect(observed.credential.version).toBe('2026-10-09 00:00:00.123456+00');
        expect(observed.session.createdAt).toBe('2026-10-09 00:00:00.123456+00'); expect(observed.issuance.sessionCreatedAt).toBe('2026-10-09 00:00:00.123456+00'); expect(observed.session.expiresAt).toBe('2000-01-01 00:00:00.654321+00');
        record({ caseId: 'PO09', value, observed, nativeRows: await rows(), claim: 'NATIVE_TEXT_PRECISION_NOT_PORTAL_POLICY_OR_GENERATION_AUTHORITY' });
      }
    }); await preserve();
  });
  it('PO10 original LOGIN runtime roles have no schema execute or private-table privileges and receive native42501', async () => {
    const native = await catalog(); expect(native.policies).toEqual([]);
    for (const name of privateTables) expect(native.relations.find(x => x.relname === name.split('.')[1])).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true });
    for (const [client, principal] of [[app, appRole], [worker, workerRole], [outsider, outsiderRole]] as const) {
      const before = await identity(client, principal.name, principal.oid);
      const effective = (await query(admin, `SELECT pg_catalog.has_schema_privilege($1,$2::oid,'USAGE,CREATE') schema_access,pg_catalog.has_function_privilege($1,$3::oid,'EXECUTE') execute`, [principal.name, schema.oid, kernel.oid])).rows[0];
      expect(effective).toEqual({ schema_access: false, execute: false }); expect(await rejected(client, observerCall, [workspaceId, employeeA, token()])).toBe('42501');
      for (const name of privateTables) expect((await query(admin, `SELECT pg_catalog.has_table_privilege($1,$2::regclass,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') access`, [principal.name, name])).rows).toEqual([{ access: false }]);
      expect(await identity(client, principal.name, principal.oid)).toEqual(before); record({ caseId: 'PO10', principal, before, effective });
    } await preserve();
  });
  it('PO11 non-RC isolation rejects and leaves no held source relation locks after abort while autocommit retains none', async () => {
    for (const isolation of ['REPEATABLE READ', 'SERIALIZABLE']) {
      await query(installer, 'BEGIN ISOLATION LEVEL ' + isolation);
      try {
        const pid = (installer as Client & { processID: number }).processID;
        let code = 'NO_ERROR', message = '';
        try { await installer.query(observerCall, [workspaceId, employeeA, token()]); } catch (error) { code = sqlstate(error); message = (error as { message: string }).message; }
        await aborted(installer, code, '55000'); expect(message).toBe('portal_source_observation_isolation_required');
        const locks = (await query(admin, `SELECT relation::text relation_oid,mode,granted FROM pg_catalog.pg_locks WHERE pid=$1 AND relation=ANY($2::oid[])`, [pid, objects.filter(x => x.kind === 'table').map(x => x.oid)])).rows;
        expect(locks).toEqual([]); record({ caseId: 'PO11', isolation, code, message, locks });
      } finally { await rollback(installer); }
    }
    expect(await call(installer)).toEqual(baseline()); await begin(writer);
    try { await query(writer, 'SELECT id FROM public.employees WHERE id=$1 FOR UPDATE NOWAIT', [employeeA]); }
    finally { await rollback(writer); }
    record({ caseId: 'PO11', claim: 'AUTOCOMMIT_OBSERVATION_IS_NOT_HELD_SOURCE_LOCK_OR_AUTHORITY' }); await preserve();
  });
  async function metadataChange(client: Client, family: string) {
    if (family === 'workspace') await query(client, 'UPDATE public.workspaces SET active=false,updated_at=$2::timestamptz WHERE id=$1', [workspaceId, '2026-10-09T00:00:00.123457Z']);
    else if (family === 'employee') await query(client, 'UPDATE public.employees SET active=false,updated_at=$2::timestamptz WHERE id=$1', [employeeA, '2026-10-09T00:00:00.123457Z']);
    else if (family === 'credential') await query(client, 'UPDATE public.employee_credentials SET must_change_password=false,password_updated_at=$2::timestamptz WHERE employee_id=$1', [employeeA, '2026-10-09T00:00:00.123457Z']);
    else await query(client, 'UPDATE nevora_tenancy.workspace_incarnation_counter SET incarnation=incarnation+1 WHERE workspace_id=$1', [workspaceId]);
  }
  async function restoreMetadata(family: string) {
    await begin(admin);
    try {
      if (family === 'workspace') await query(admin, 'UPDATE public.workspaces SET active=true,updated_at=$2::timestamptz WHERE id=$1', [workspaceId, createdAt]);
      else if (family === 'employee') await query(admin, 'UPDATE public.employees SET active=true,updated_at=$2::timestamptz WHERE id=$1', [employeeA, createdAt]);
      else await query(admin, 'UPDATE public.employee_credentials SET must_change_password=true,password_updated_at=$2::timestamptz WHERE employee_id=$1', [employeeA, createdAt]);
      await query(admin, 'COMMIT');
    } finally { await rollback(admin); }
  }
  it('PO12 writer-first COMMIT is freshly observed after native row wait including one monotonic fixture-only counter advance', async () => {
    for (const family of ['workspace', 'employee', 'credential', 'incarnation']) {
      const before = await rows(); await begin(writer); await metadataChange(writer, family); await begin(installer);
      const pending = call(installer); pendingFenceAttempts.add(pending);
      try {
        await waitEvidence(installer, writer, 'PO12-' + family); expect(await rows()).toEqual(before); await query(writer, 'COMMIT');
        const observed = await pending; pendingFenceAttempts.delete(pending);
        if (family === 'incarnation') {
          const native = (await query(admin, 'SELECT incarnation::text version FROM nevora_tenancy.workspace_incarnation_counter WHERE workspace_id=$1', [workspaceId])).rows[0].version;
          expect(native).toBe('9007199254740994'); expect(observed.incarnation.version).toBe(native); expect(observed.issuance.workspaceIncarnation).toBe('1');
          const prior = expectedCounter; expectedCounter = native; originalRows = await rows();
          record({ caseId: 'PO12', family, prior, before, observed, afterRows: originalRows, claim: 'ONE_APPROVED_FICTIONAL_MONOTONIC_COUNTER_ADVANCE_NO_LOWER_NO_LIVE_REPAIR' });
        } else {
          const group = family === 'workspace' ? observed.workspace : family === 'employee' ? observed.employee : observed.credential;
          expect(group.version).toBe('2026-10-09 00:00:00.123457+00'); expect(group[family === 'credential' ? 'mustChangePassword' : 'active']).toBe(false);
          record({ caseId: 'PO12', family, before, observed, afterRows: await rows(), claim: 'FRESH_SEPARATE_QUERY_AFTER_REAL_WAIT_NO_AUTHORITY' });
        }
      } finally { await rollback(writer); await rollback(installer); await pending; pendingFenceAttempts.delete(pending); if (family !== 'incarnation') await restoreMetadata(family); }
      await preserve();
    }
  }, 30000);
  it('PO13 reader-first observation holds source locks until COMMIT then a fresh RC observation sees committed credential change', async () => {
    await begin(installer); const observed = await call(installer); expect(observed).toEqual(baseline()); await begin(writer);
    const pending = metadataChange(writer, 'credential'); pendingFenceAttempts.add(pending);
    try {
      await waitEvidence(writer, installer, 'PO13'); expect(await rows()).toEqual(originalRows);
      await query(installer, 'COMMIT'); await pending; pendingFenceAttempts.delete(pending); await query(writer, 'COMMIT');
      const fresh = await observeOwn(); expect(fresh.credential).toMatchObject({ version: '2026-10-09 00:00:00.123457+00', mustChangePassword: false });
      record({ caseId: 'PO13', originalObservation: observed, freshObservation: fresh, changedRows: await rows() });
    } finally { await rollback(installer); await rollback(writer); await pending; pendingFenceAttempts.delete(pending); await restoreMetadata('credential'); }
    await preserve();
  });
  it('PO14 writer-first ROLLBACK returns exact original observation after observed wait without source effects', async () => {
    const before = await rows(); await begin(writer); await metadataChange(writer, 'workspace'); await begin(installer);
    const pending = call(installer); pendingFenceAttempts.add(pending);
    try { await waitEvidence(installer, writer, 'PO14'); await rollback(writer); const observed = await pending; pendingFenceAttempts.delete(pending); expect(observed).toEqual(baseline()); record({ caseId: 'PO14', observed, before }); }
    finally { await rollback(writer); await rollback(installer); await pending; pendingFenceAttempts.delete(pending); }
    await preserve();
  });
  it('PO15 native top-level error releases held row locks but requires explicit rollback of the aborted caller block', async () => {
    await begin(installer); expect(await call(installer)).toEqual(baseline());
    try {
      const code = await rejected(installer, 'SELECT 1/0'); await aborted(installer, code, '22012');
      await begin(writer); await query(writer, 'SELECT id FROM public.employees WHERE id=$1 FOR UPDATE NOWAIT', [employeeA]); await rollback(writer);
      expect(installer.getTransactionStatus()).toBe('E'); record({ caseId: 'PO15', code, sourceLockReleased: true, callerStillAborted: installer.getTransactionStatus() });
    } finally { await rollback(installer); await rollback(writer); }
    await preserve();
  });
  it('PO16 exact duplicate overload refusal preserves observer OID source ACL and all source rows', async () => {
    const before = await rows(), native = canonicalAcl(await catalog());
    try { const code = await rejected(installer, source); await aborted(installer, code, '42723'); }
    finally { await rollback(installer); }
    expect(await rows()).toEqual(before); expect(canonicalAcl(await catalog())).toEqual(native); await preserve();
  });
  // APPEND ONLY after PO16 and before the unchanged outer afterAll.
  // SOURCE PREPARATION ONLY: no producer invocation, resources or native result.
  // These cases exercise installer-owned locking mechanics, not authorization.
  describe('unused joint Portal and installed-policy lock kernel, root-owned fictional mechanics', () => {
    const jointPath = resolve('src/lib/tenancy/runtime/portal-policy-joint-locks.sql');
    const policyStoragePath = resolve('src/lib/tenancy/runtime/capability-policy-definition-storage.sql');
    const policyObserverPath = resolve('src/lib/tenancy/runtime/portal-installed-policy-observation.sql');
    const policyFixturePath = resolve('src/lib/tenancy/runtime/fixtures/installed-policy-source.json');
    const jointSHA = 'a1394da4b29c86dbf9c87a2968325d359f2bbe4137cf4004e4e4d81245f1f79e';
    const policyStorageSHA = '75e8f70dbd5e2381cdde2c425aa634fafe0fe420392b07ab858cf9900382a386';
    const policyObserverSHA = 'd25be72e0bede3e2ded9ce0ba782b060e41260b79db00e202e1db1d6c965573a';
    const policyFixtureSHA = '52bd2a10cc91dd62d31e8fef66e8bec4c56450a977227b5a0698768a3afff1a7';
    const definitionTable = 'nevora_tenancy.capability_policy_definition';
    const headTable = 'nevora_tenancy.workspace_capability_policy_installation';
    const jointSignature = 'nevora_tenancy.lock_portal_policy_source_rows(text,text,bpchar)';
    const jointSQL = 'SELECT nevora_tenancy.lock_portal_policy_source_rows($1::text,$2::text,$3::bpchar) AS locked';
    let jointSource = '', jointObject: OwnObject, policyObserverObject: OwnObject;
    let jointRole: Role, policyId = '', policyRevision = '', expectedEpoch = '';
    let jointSetupComplete = false, jointInstalled = false;
    let retainedPolicyRows: Awaited<ReturnType<typeof jointPolicyRows>> | undefined;
    const policySourceBytes: Buffer[] = [];

    async function jointPolicyRows() {
      const output: Record<string, unknown> = {};
      for (const name of [definitionTable, headTable]) output[name] = (await query(admin,
        'SELECT pg_catalog.to_jsonb(t)::text wire FROM ' + name + ' t ORDER BY pg_catalog.to_jsonb(t)::text COLLATE pg_catalog."C"')).rows;
      return output;
    }
    async function jointPreserve() {
      await preserve(); expect(await jointPolicyRows()).toEqual(retainedPolicyRows);
      expect(hash(readFileSync(jointPath))).toBe(jointSHA);
      expect(hash(readFileSync(policyStoragePath))).toBe(policyStorageSHA);
      expect(hash(readFileSync(policyObserverPath))).toBe(policyObserverSHA);
      expect(hash(readFileSync(policyFixturePath))).toBe(policyFixtureSHA);
    }
    async function jointCall(client: Client, workspace: unknown = workspaceId, employee: unknown = employeeA, sessionHash: unknown = token()) {
      const result = (await query(client, jointSQL, [workspace, employee, sessionHash])).rows;
      expect(result).toEqual([{ locked: '' }]); // Native void wire only; not a proof or lock authority token.
      return result;
    }
    async function jointFailure(client: Client, text: string, values: unknown[] = []) {
      sqlAttempted = true;
      try { await client.query(text, values); return { code: 'NO_ERROR', message: '' }; }
      catch (error) { return { code: sqlstate(error), message: (error as { message: string }).message }; }
    }
    async function headObservation(client: Client = admin) {
      return (await query(client, 'SELECT workspace_id,workspace_incarnation::text,installation_epoch::text,policy_id,policy_revision::text FROM ' + headTable + ' ORDER BY pg_catalog.convert_to(workspace_id,\'UTF8\')')).rows;
    }
    async function reconcileJoint(pending: Promise<unknown>) {
      try { await pending; } finally { pendingFenceAttempts.delete(pending); }
    }

    beforeAll(async () => {
      // This child hook is registered after PO16, so old 16 callbacks run against
      // the original 43 objects/3 roles/6 clients before any new setup occurs.
      expect(verified && setupCommitted && installed).toBe(true); await checkBase();
      expect(objects).toHaveLength(43); expect(roles).toHaveLength(3); expect(clients.size).toBe(6);
      expect(expectedCounter).toBe('9007199254740994'); await preserve();
      jointSource = readFileSync(jointPath, 'utf8'); const storageBytes = readFileSync(policyStoragePath, 'utf8');
      const observerBytes = readFileSync(policyObserverPath, 'utf8'), fixtureBytes = readFileSync(policyFixturePath);
      expect(hash(jointSource)).toBe(jointSHA); expect(hash(storageBytes)).toBe(policyStorageSHA);
      expect(hash(observerBytes)).toBe(policyObserverSHA); expect(hash(fixtureBytes)).toBe(policyFixtureSHA);
      const fixture = JSON.parse(fixtureBytes.toString('utf8')) as { expected: {
        policyRevision: string; installationEpoch: string; canonicalPolicySource: number[]; vocabularySource: number[]; approvedPRDSource: number[] } };
      policySourceBytes.push(Buffer.from(fixture.expected.canonicalPolicySource), Buffer.from(fixture.expected.vocabularySource), Buffer.from(fixture.expected.approvedPRDSource));
      expect(policySourceBytes.map(hash)).toEqual(['2c8b81fdbb5a790f778f6de18062e788e312bf38bc873171c23fee8150940df8',
        '1a58a71719cc656ffa2830a0ffcc075668d1d10593f9556bb3dc03dd8cca0444', '35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7']);
      policyId = ' ' + lease.invocation + '_joint_policy_β '; policyRevision = fixture.expected.policyRevision; expectedEpoch = fixture.expected.installationEpoch;
      // Explicit fictional identity/revision/epoch, not defaults or installed executing-code authentication.
      const beforeRows = await rows(), beforeCatalog = await catalog();
      await query(admin, storageBytes); await rollback(admin); await rememberStorage(storageBytes);
      expect(objects).toHaveLength(50);
      await query(admin, observerBytes); await rollback(admin);
      policyObserverObject = await remember('function', 'nevora_tenancy', 'read_portal_installed_policy', installerOid, '(text)');
      expect(objects).toHaveLength(51);
      jointRole = await role('po_' + lease.invocation + '_joint_reader', false);
      await begin(admin);
      try {
        await query(admin, `INSERT INTO ${definitionTable}(policy_id,revision,definition,canonical_policy_source,canonical_policy_source_sha256,vocabulary_source,vocabulary_source_sha256,approved_prd_source,approved_prd_source_sha256)
          VALUES($1,$2::int8,pg_catalog.jsonb_build_object('format','NEVORA_CAPABILITY_SOURCE_BUNDLE_V1','policyId',$1::text,'revision',($2::int8)::text,
            'canonicalPolicySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/policy.ts','sha256',$4::text),
            'vocabularySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/types.ts','sha256',$6::text),
            'approvedPRD',pg_catalog.jsonb_build_object('path','F_IMPLEMENTATION_PRD.md','sha256',$8::text)),$3::bytea,$4,$5::bytea,$6,$7::bytea,$8)`,
        [policyId, policyRevision, policySourceBytes[0], hash(policySourceBytes[0]), policySourceBytes[1], hash(policySourceBytes[1]), policySourceBytes[2], hash(policySourceBytes[2])]);
        await query(admin, `INSERT INTO ${headTable}(workspace_id,workspace_incarnation,installation_epoch,policy_id,policy_revision) VALUES($1,$2::int8,$3::int8,$4,$5::int8)`,
          [workspaceId, expectedCounter, expectedEpoch, policyId, policyRevision]);
        for (const name of allTables) expect((await query(admin, 'SELECT * FROM ' + name)).rows).toEqual([]);
        await adminHeader(admin);
        // Explicit fictional complete children solely to witness individual native row order.
        for (const code of [CAPABILITIES[1], CAPABILITIES[0]]) await query(admin, 'INSERT INTO ' + childTables[0] + '(workspace_id,employee_id,capability) VALUES($1,$2,$3)', [workspaceId, employeeA, code]);
        for (const id of [...exactLocationIds].reverse()) await query(admin, 'INSERT INTO ' + childTables[1] + '(workspace_id,employee_id,location_id) VALUES($1,$2,$3)', [workspaceId, employeeA, id]);
        await query(admin, 'COMMIT');
      } finally { await rollback(admin); }
      const afterRows = await rows(); for (const name of completeTables) if (!allTables.includes(name as typeof allTables[number])) expect(afterRows[name]).toEqual(beforeRows[name]);
      originalRows = afterRows; originalCatalog = canonicalAcl(await catalog()); retainedPolicyRows = await jointPolicyRows(); jointSetupComplete = true;
      expect(roles).toHaveLength(4); expect(clients.size).toBe(6);
      record({ operation: 'JOINT_EXPLICIT_AFTER_PO16_SETUP', beforeRows, afterRows, beforeCatalog, afterCatalog: await catalog(),
        policyRows: retainedPolicyRows, policyId, policyRevision, expectedEpoch, expectedCounter, policySourceSHAs: policySourceBytes.map(hash),
        observer: policyObserverObject, safeNonloginRole: jointRole, objects, roles,
        claim: 'EXPLICIT_FICTIONAL_STORAGE_AND_CHILD_ROWS_NOT_GRANTS_OR_SOURCE_AUTHENTICATION' });
    }, 45000);

    it('JP01 whole fresh installer rejects STRICT dependency profiles then installs exact ungranted void body', async () => {
      for (const signature of ['nevora_tenancy.lock_portal_source_rows(text,text,bpchar)', 'nevora_tenancy.read_portal_installed_policy(text)']) {
        const beforeNative = canonicalAcl(await catalog()), undo = 'ALTER FUNCTION ' + signature + ' CALLED ON NULL INPUT';
        repairs.add(undo);
        try {
          await query(admin, 'ALTER FUNCTION ' + signature + ' STRICT');
          const outcome = await jointFailure(installer, jointSource);
          record({ caseId: 'JP01', variant: 'STRICT_DEPENDENCY', signature, outcome, native: await catalog() });
          await aborted(installer, outcome.code, '55000'); expect(outcome.message).toBe('portal_policy_source_lock_dependency_invalid');
        } finally { await rollback(installer); await query(admin, undo); repairs.delete(undo); }
        expect(canonicalAcl(await catalog())).toEqual(beforeNative); await jointPreserve();
      }
      const before = await rows(), beforePolicy = await jointPolicyRows(), beforeNative = await catalog();
      await query(installer, jointSource); await rollback(installer);
      jointObject = await remember('function', 'nevora_tenancy', 'lock_portal_policy_source_rows', installerOid, '(text,text,bpchar)'); jointInstalled = true;
      const native = await catalog(), fn = native.functions.find(row => row.oid === jointObject.oid)!;
      const profile = (await query(admin, 'SELECT prosrc,proisstrict,prosupport::oid::text support_oid,proleakproof,pronargdefaults,provariadic::oid::text variadic_oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [jointObject.oid])).rows[0];
      expect(profile).toEqual({ prosrc: jointSource.split('$portal_policy_source_locks$')[1], proisstrict: false, support_oid: '0', proleakproof: false, pronargdefaults: 0, variadic_oid: '0' });
      expect(fn).toMatchObject({ owner: installerOid, prosecdef: false, proconfig: ['search_path=pg_catalog'], return_oid: '2278', arg_oids: '25 25 1042', proretset: false, provolatile: 'v', proparallel: 'u', lanname: 'plpgsql' });
      expect(native.functions.filter(row => row.oid !== jointObject.oid)).toEqual(beforeNative.functions);
      for (const field of ['schemas', 'relations', 'columns', 'constraints', 'indexes', 'triggers', 'policies', 'columnAcls'] as const) expect(native[field]).toEqual(beforeNative[field]);
      expect(native.expandedAcls.filter(row => row.kind === 'FUNCTION' && row.oid === jointObject.oid && row.grantee !== installerOid)).toEqual([]);
      expect(await rows()).toEqual(before); expect(await jointPolicyRows()).toEqual(beforePolicy); expect(objects).toHaveLength(52);
      originalCatalog = canonicalAcl(native);
      record({ caseId: 'JP01', variant: 'FRESH_WHOLE_INSTALL', jointObject, profile, native, beforeNative, policyRows: beforePolicy, functionSourceSHA256: hash(profile.prosrc), voidIsNotProof: true });
      await jointPreserve();
    }, 45000);

    it('JP02 duplicate whole installer42723 keeps exact original function OID body controls and policy rows', async () => {
      const native = canonicalAcl(await catalog());
      try { const outcome = await jointFailure(installer, jointSource); record({ caseId: 'JP02', outcome });
        await aborted(installer, outcome.code, '42723'); expect(outcome.message).toBe('portal_policy_source_lock_already_installed'); }
      finally { await rollback(installer); }
      expect(canonicalAcl(await catalog())).toEqual(native); await jointPreserve();
    }, 45000);

    it('JP03 original APP WORKER outsider LOGINs cannot execute joint or policy observer and keep exact identities', async () => {
      for (const [client, principal] of [[app, appRole], [worker, workerRole], [outsider, outsiderRole]] as const) {
        await identity(client, principal.name, principal.oid);
        for (const [statement, values] of [[jointSQL, [workspaceId, employeeA, token()]], ['SELECT nevora_tenancy.read_portal_installed_policy($1::text)', [workspaceId]]] as const) {
          await begin(client);
          try { const outcome = await jointFailure(client, statement, [...values]); await aborted(client, outcome.code, '42501'); record({ caseId: 'JP03', role: principal, statement, outcome }); }
          finally { await rollback(client); }
          await identity(client, principal.name, principal.oid);
        }
      }
      await jointPreserve();
    }, 45000);

    it('JP04 rollback-only minimal safe NOLOGIN lock grants do not bypass private FORCE zero-policy rows', async () => {
      const beforeNative = canonicalAcl(await catalog()); await begin(admin);
      try {
        await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + q(jointRole.name));
        await query(admin, 'GRANT EXECUTE ON FUNCTION ' + jointSignature + ',nevora_tenancy.read_portal_installed_policy(text) TO ' + q(jointRole.name));
        const lockColumns = [['public.workspaces', 'id'], ['public.employees', 'id'], ['public.employee_credentials', 'employee_id'],
          ['nevora_tenancy.workspace_incarnation_counter', 'workspace_id'], [definitionTable, 'policy_id'], [headTable, 'workspace_id'],
          ['nevora_tenancy.portal_authority', 'workspace_id'], ['public.employee_sessions', 'token_hash'], ['nevora_tenancy.portal_session_issuance', 'token_hash'],
          [table, 'workspace_id'], [childTables[0], 'capability'], [childTables[1], 'location_id']] as const;
        for (const [name, column] of lockColumns) { await query(admin, 'GRANT SELECT ON TABLE ' + name + ' TO ' + q(jointRole.name)); await query(admin, 'GRANT UPDATE(' + q(column) + ') ON TABLE ' + name + ' TO ' + q(jointRole.name)); }
        const grantedNative = await catalog(); const roleFlags = (await query(admin, 'SELECT oid::text,rolname,rolcanlogin,rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE oid=$1::oid', [jointRole.oid])).rows;
        expect(roleFlags).toEqual([{ oid: jointRole.oid, rolname: jointRole.name, rolcanlogin: false, rolsuper: false, rolbypassrls: false }]);
        await query(admin, 'SAVEPOINT exact_safe_nonlogin'); await query(admin, 'SET LOCAL ROLE ' + q(jointRole.name));
        expect((await query(admin, 'SELECT workspace_id FROM nevora_tenancy.workspace_incarnation_counter')).rows).toEqual([]);
        const outcome = await jointFailure(admin, jointSQL, [workspaceId, employeeA, token()]);
        const safePid = (admin as Client & { processID: number }).processID;
        // An independent fixture client observes the aborted SAVEPOINT owner.
        await poll(async () => (await query(installer, 'SELECT state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [safePid])).rows[0]?.state === 'idle in transaction (aborted)' && admin.getTransactionStatus() === 'E', 'JP04_safe_owner_aborted');
        const abortedActivity = (await query(installer, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [safePid])).rows[0];
        expect(admin.getTransactionStatus()).toBe('E');
        const followup = await rejected(admin, 'SELECT 1');
        expect(outcome).toEqual({ code: '55000', message: 'portal_source_lock_missing' }); expect(followup).toBe('25P02');
        await query(admin, 'ROLLBACK TO SAVEPOINT exact_safe_nonlogin'); await query(admin, 'RESET ROLE');
        expect((await query(admin, 'SELECT current_user,session_user')).rows).toEqual([{ current_user: lease.user, session_user: lease.user }]);
        record({ caseId: 'JP04', roleFlags, lockColumns, grantedNative, outcome, followup, abortedActivity, abortedStatus: 'E', seam: 'ROLLBACK_BOUND_NONLOGIN_FORCE0_NOT_RUNTIME_OWNER_ADOPTION' });
      } finally { await rollback(admin); }
      expect(canonicalAcl(await catalog())).toEqual(beforeNative); await jointPreserve();
    }, 45000);

    it('JP05 only owning RC reaches void; native errors require E25P02 and rollback without retained top-level row locks', async () => {
      for (const isolation of ['REPEATABLE READ', 'SERIALIZABLE']) {
        await query(installer, 'BEGIN ISOLATION LEVEL ' + isolation); await query(installer, RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
        try { const outcome = await jointFailure(installer, jointSQL, [workspaceId, employeeA, token()]);
          await aborted(installer, outcome.code, '55000'); expect(outcome.message).toBe('portal_policy_source_lock_isolation_required'); record({ caseId: 'JP05', isolation, outcome }); }
        finally { await rollback(installer); }
      }
      await begin(installer); expect(await jointCall(installer)).toEqual([{ locked: '' }]);
      try { const code = await rejected(installer, 'SELECT 1/0'); await aborted(installer, code, '22012');
        await begin(writer); await query(writer, 'SELECT id FROM public.employees WHERE id=$1 FOR UPDATE NOWAIT', [employeeA]); await rollback(writer);
        record({ caseId: 'JP05', code, clientStatus: installer.getTransactionStatus(), nativeTopLevelLocksReleased: true }); expect(installer.getTransactionStatus()).toBe('E'); }
      finally { await rollback(writer); await rollback(installer); }
      await jointPreserve();
    }, 45000);

    it('JP06 null foreign unattributed and exact UTF8 mismatches refuse; native bpchar padding remains accepted', async () => {
      const cases: unknown[][] = [[null, employeeA, token()], [workspaceId.trim(), employeeA, token()], ['nonexistent-tenant', employeeA, token()],
        [workspaceId, null, token()], [workspaceId, employeeA.trim(), token()], [workspaceId, nullOwnerEmployee, token()], [workspaceId, employeeB, token()],
        [workspaceId, employeeA, null], [workspaceId, employeeA, hash('fictional-foreign-session')]];
      for (const args of cases) {
        await begin(installer);
        try { const outcome = await jointFailure(installer, jointSQL, args); record({ caseId: 'JP06', args, outcome });
          await aborted(installer, outcome.code, '55000'); expect(outcome.message).toBe('portal_source_lock_missing'); }
        finally { await rollback(installer); }
      }
      await begin(installer);
      try { await jointCall(installer, workspaceId, employeeA, token() + '   '); const observed = await call(installer);
        expect(observed.workspace.id).toBe(workspaceId); expect(observed.employee.id).toBe(employeeA);
        expect(observed.portal.state).toBe('DISABLED'); expect(observed.portal.proofProvenance).toBe('UNVERIFIED');
        expect(observed.credential.mustChangePassword).toBe(true); expect(observed.session.expiresAt).toBe('2000-01-01 00:00:00.654321+00');
        expect(observed.issuance.workspaceIncarnation).toBe('1'); expect(observed.incarnation.version).toBe('9007199254740994');
        record({ caseId: 'JP06', variant: 'EXACT_PADDED_UTF8_AND_NATIVE_CHAR', observed, claim: 'RAW_DISABLED_EXPIRED_UNVERIFIED_STALE_ISSUANCE_NOT_AUTHORIZATION' }); }
      finally { await rollback(installer); }
      await jointPreserve();
    }, 45000);

    it('JP07 adjacent two-blocker witnesses mechanically retain every source and complete bytewise child row order', async () => {
      const caps = (await query(admin, 'SELECT capability FROM ' + childTables[0] + ' WHERE workspace_id=$1 AND employee_id=$2 ORDER BY pg_catalog.convert_to(capability,\'UTF8\')', [workspaceId, employeeA])).rows.map(row => row.capability as string);
      const locations = (await query(admin, 'SELECT location_id FROM ' + childTables[1] + ' WHERE workspace_id=$1 AND employee_id=$2 ORDER BY pg_catalog.convert_to(location_id,\'UTF8\')', [workspaceId, employeeA])).rows.map(row => row.location_id as string);
      expect(caps).toHaveLength(2); expect(locations).toHaveLength(3);
      const locks: { label: string; text: string; values: unknown[] }[] = [
        { label: 'workspace', text: 'SELECT id FROM public.workspaces WHERE id=$1 FOR UPDATE', values: [workspaceId] },
        { label: 'employee', text: 'SELECT id FROM public.employees WHERE id=$1 FOR UPDATE', values: [employeeA] },
        { label: 'credential', text: 'SELECT employee_id FROM public.employee_credentials WHERE employee_id=$1 FOR UPDATE', values: [employeeA] },
        { label: 'counter', text: 'SELECT workspace_id FROM nevora_tenancy.workspace_incarnation_counter WHERE workspace_id=$1 FOR UPDATE', values: [workspaceId] },
        { label: 'definition', text: 'SELECT policy_id FROM ' + definitionTable + ' WHERE policy_id=$1 AND revision=$2::int8 FOR UPDATE', values: [policyId, policyRevision] },
        { label: 'head', text: 'SELECT workspace_id FROM ' + headTable + ' WHERE workspace_id=$1 FOR UPDATE', values: [workspaceId] },
        { label: 'Portal', text: 'SELECT employee_id FROM nevora_tenancy.portal_authority WHERE workspace_id=$1 AND employee_id=$2 FOR UPDATE', values: [workspaceId, employeeA] },
        { label: 'session', text: 'SELECT token_hash FROM public.employee_sessions WHERE token_hash=$1::bpchar FOR UPDATE', values: [token()] },
        { label: 'LIVE', text: 'SELECT token_hash FROM nevora_tenancy.portal_session_issuance WHERE token_hash=$1::bpchar FOR UPDATE', values: [token()] },
        { label: 'admin', text: 'SELECT employee_id FROM ' + table + ' WHERE workspace_id=$1 AND employee_id=$2 FOR UPDATE', values: [workspaceId, employeeA] },
        ...caps.map(code => ({ label: 'capability:' + code, text: 'SELECT capability FROM ' + childTables[0] + ' WHERE workspace_id=$1 AND employee_id=$2 AND capability=$3 FOR UPDATE', values: [workspaceId, employeeA, code] })),
        ...locations.map(id => ({ label: 'location:' + id, text: 'SELECT location_id FROM ' + childTables[1] + ' WHERE workspace_id=$1 AND employee_id=$2 AND location_id=$3 FOR UPDATE', values: [workspaceId, employeeA, id] })),
      ];
      for (let index = 0; index < locks.length - 1; index++) {
        const first = locks[index], second = locks[index + 1]; await begin(admin); await begin(writer);
        await query(admin, first.text, first.values); await query(writer, second.text, second.values); await begin(installer);
        const pending = jointCall(installer); pendingFenceAttempts.add(pending);
        try {
          const firstWait = await waitEvidence(installer, admin, 'JP07:first:' + first.label);
          expect(firstWait.activity.find(row => row.pid === (installer as Client & { processID: number }).processID)?.blockers).not.toContain((writer as Client & { processID: number }).processID);
          await query(admin, 'COMMIT'); const secondWait = await waitEvidence(installer, writer, 'JP07:second:' + second.label);
          await query(writer, 'COMMIT'); expect(await pending).toEqual([{ locked: '' }]); pendingFenceAttempts.delete(pending);
          record({ caseId: 'JP07', index, first: first.label, second: second.label, firstWait, secondWait, orderedRows: locks.map(row => row.label), claim: 'SINGLE_EMPLOYMENT_ROW_LOCK_ORDER_NOT_COMPLETE_SET_WRITER_INTEGRATION' });
        } finally { await rollback(admin); await rollback(writer); await reconcileJoint(pending); await rollback(installer); }
      }
      await jointPreserve();
    }, 45000);

    it('JP08 repeated joint call retains source and head locks until COMMIT and blocks real rollback-only writers', async () => {
      const statements = [
        ['credential', 'UPDATE public.employee_credentials SET must_change_password=false WHERE employee_id=$1', [employeeA]],
        ['head', 'UPDATE ' + headTable + ' SET installation_epoch=installation_epoch+1 WHERE workspace_id=$1', [workspaceId]],
        ['Portal-row-probe', 'SELECT employee_id FROM nevora_tenancy.portal_authority WHERE workspace_id=$1 AND employee_id=$2 FOR UPDATE', [workspaceId, employeeA]],
      ] as const;
      for (const [label, text, values] of statements) {
        await begin(installer); await jointCall(installer); await jointCall(installer); await begin(writer);
        const pending = query(writer, text, [...values]); pendingFenceAttempts.add(pending);
        try { const wait = await waitEvidence(writer, installer, 'JP08:' + label); await query(installer, 'COMMIT');
          const result = await pending; pendingFenceAttempts.delete(pending); expect(result.rowCount).toBe(1);
          record({ caseId: 'JP08', label, wait, writerResultRows: result.rows, headWhileOwnWriter: await headObservation(writer), repeatedVoidNotProof: true }); }
        finally { await rollback(installer); await reconcileJoint(pending); await rollback(writer); }
      }
      await jointPreserve();
    }, 45000);

    it('JP09 reader waits for real source and head writers and rollback returns exact unchanged fixture tuples', async () => {
      for (const [label, text, values] of [
        ['credential', 'UPDATE public.employee_credentials SET must_change_password=false WHERE employee_id=$1', [employeeA]],
        ['head', 'UPDATE ' + headTable + ' SET installation_epoch=installation_epoch+1 WHERE workspace_id=$1', [workspaceId]],
      ] as const) {
        await begin(writer); await query(writer, text, [...values]); await begin(installer);
        const pending = jointCall(installer); pendingFenceAttempts.add(pending);
        try { const wait = await waitEvidence(installer, writer, 'JP09:' + label); await rollback(writer);
          expect(await pending).toEqual([{ locked: '' }]); pendingFenceAttempts.delete(pending);
          record({ caseId: 'JP09', label, wait, headAfterWriterRollback: await headObservation(installer) }); }
        finally { await rollback(writer); await reconcileJoint(pending); await rollback(installer); }
      }
      await jointPreserve();
    }, 45000);

    it('JP10 changed selected head after definition wait55000 refuses without retry and retains monotonic fictional epoch', async () => {
      const beforeHead = await headObservation(), beforeRows = await rows(), beforePolicy = await jointPolicyRows();
      await begin(writer); await query(writer, 'SELECT policy_id FROM ' + definitionTable + ' WHERE policy_id=$1 AND revision=$2::int8 FOR UPDATE', [policyId, policyRevision]);
      await begin(installer); const pending = jointFailure(installer, jointSQL, [workspaceId, employeeA, token()]); pendingFenceAttempts.add(pending);
      try {
        const wait = await waitEvidence(installer, writer, 'JP10:definition');
        // The SAME definition-locking writer advances its own head. Its guard
        // takes the unchanged definition SHARE lock self-compatibly; no bypass.
        const changed = (await query(writer, 'UPDATE ' + headTable + ' SET installation_epoch=installation_epoch+1 WHERE workspace_id=$1 RETURNING installation_epoch::text', [workspaceId])).rows;
        expect(changed).toHaveLength(1); await query(writer, 'COMMIT'); expectedEpoch = changed[0].installation_epoch;
        const outcome = await pending; pendingFenceAttempts.delete(pending); await aborted(installer, outcome.code, '55000');
        expect(outcome.message).toBe('portal_installed_policy_source_drift');
        const afterHead = await headObservation(), afterPolicy = await jointPolicyRows();
        expect(afterPolicy[definitionTable]).toEqual(beforePolicy[definitionTable]); expect(await rows()).toEqual(beforeRows);
        expect(afterHead).toEqual([{ ...beforeHead[0], installation_epoch: expectedEpoch }]);
        retainedPolicyRows = afterPolicy;
        record({ caseId: 'JP10', beforeHead, afterHead, beforePolicy, afterPolicy, wait, outcome, explicitFixtureEpochAdvance: true,
          claim: 'MONOTONIC_FICTIONAL_HEAD_CHANGE_NO_RECOVERY_HIGH_WATER_OR_SOURCE_AUTHENTICATION' });
      } finally { await rollback(writer); await reconcileJoint(pending); await rollback(installer); }
      await jointPreserve();
    }, 45000);

    it('JP11 existing child row locks alone do not exclude a noncooperating new-child phantom', async () => {
      await begin(installer); await jointCall(installer); await begin(writer);
      try {
        const inserted = (await query(writer, 'INSERT INTO ' + childTables[0] + '(workspace_id,employee_id,capability) VALUES($1,$2,$3) RETURNING capability', [workspaceId, employeeA, CAPABILITIES[2]])).rows;
        expect(inserted).toEqual([{ capability: CAPABILITIES[2] }]);
        const native = (await query(admin, 'SELECT pid,state,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1', [(writer as Client & { processID: number }).processID])).rows;
        expect(native[0].blockers).toEqual([]);
        record({ caseId: 'JP11', inserted, native, seam: 'DELIBERATELY_NONCOOPERATING_ROLLBACK_ONLY_CHILD_INSERT',
          limitation: 'Kernel locks existing rows only; protected complete-set replacement requires persistent Portal writer serialization and fresh/final source equality.' });
      } finally { await rollback(writer); await rollback(installer); }
      await jointPreserve();
    }, 45000);

    afterAll(async () => {
      // The inherited outer teardown stays byte-identical and remains sole object,
      // role/client cleanup. New policy rows have their own retained final proof.
      if (!jointSetupComplete) return;
      await rollback(installer); await rollback(writer); await rollback(admin);
      for (const pending of pendingFenceAttempts) await reconcileJoint(pending);
      await jointPreserve(); const finalPolicyRows = await jointPolicyRows();
      record({ operation: 'JOINT_FINAL_POLICY_ROWS_AND_SOURCE_PRESERVATION', jointInstalled, policyRows: finalPolicyRows,
        retainedPolicyRows, originalRows, originalCatalog, policyId, policyRevision, expectedEpoch, expectedCounter,
        objects, roles, clients: clients.size, pendingRepairs: [...repairs], pendingFenceAttempts: pendingFenceAttempts.size,
        verification: 'OWNED_FICTIONAL_LOCK_MECHANICS_NOT_AUTHORITY_CURRENT_PROOF_RLS_ADOPTION_OR_FULL_F10' });
      expect(objects).toHaveLength(jointInstalled ? 52 : 51); expect(roles).toHaveLength(4); expect(clients.size).toBe(6);
      expect(repairs.size).toBe(0); expect(pendingFenceAttempts.size).toBe(0);
      writeFileSync(join(runPath!, 'portal-policy-joint-locks-final-rows.json'), JSON.stringify({ jointInstalled, policyRows: finalPolicyRows,
        retainedPolicyRows, expectedEpoch, expectedCounter, sourceRows: await rows(), sourceCatalog: await catalog(), objects, roles,
        claim: 'PRE_DROP_FICTIONAL_SOURCE_PRESERVATION_NOT_EFFECTS_OR_RUNTIME_AUTHORITY' }, null, 2), { flag: 'wx', mode: 0o600 });
    }, 45000);
  });

  afterAll(async () => {
    let cleaned = false;
    const closure: { client: string; status: string | null; finalStatus: string | null; closed: boolean }[] = [];
    try {
      if (verified && admin) await rollback(admin);
      if (installer) await rollback(installer); if (writer) await rollback(writer);
      for (const pending of pendingFenceAttempts) { await pending; pendingFenceAttempts.delete(pending); }
      for (const client of clients) if (client !== admin) {
        const status = client.getTransactionStatus() ?? null; await rollback(client);
        await client.end(); closedClients.add(client); closure.push({ client: 'OWN_FIXTURE_CLIENT', status, finalStatus: client.getTransactionStatus() ?? null, closed: true });
      }
      if (verified && admin) {
        await query(admin, 'RESET ROLE'); await checkBase();
        for (const undo of repairs) { await query(admin, undo); repairs.delete(undo); }
        if (setupCommitted) {
          if (originalRows && originalCatalog) await preserve();
          record({ operation: 'FINAL_NATIVE_ALL_SOURCE_STORAGE_ROWS_AND_CATALOG', rows: await rows(), catalog: await catalog(), objects, roles, originalRows, originalCatalog });
          for (const object of [...objects].reverse()) if (!object.dropped) await dropObject(object);
        } else for (const object of objects) {
          const name = object.kind === 'schema' ? 'pg_namespace' : object.kind === 'function' ? 'pg_proc' : object.kind === 'trigger' ? 'pg_trigger' : 'pg_class';
          expect((await query(admin, 'SELECT oid FROM pg_catalog.' + name + ' WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
          object.dropped = true; record({ operation: 'SETUP_ROLLBACK_EXACT_OBJECT_ABSENCE', ...object });
        }
        for (const principal of [...roles].reverse()) {
          const current = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [principal.name])).rows[0];
          if (!current && !setupCommitted) { record({ operation: 'SETUP_ROLLBACK_EXACT_ROLE_ABSENCE', ...principal }); continue; }
          expect(current).toEqual({ oid: principal.oid }); await query(admin, 'REVOKE CONNECT ON DATABASE ' + q(lease.database) + ' FROM ' + q(principal.name));
          await query(admin, 'DROP ROLE ' + q(principal.name));
          expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2', [principal.oid, principal.name])).rows).toEqual([]);
          record({ operation: 'EXACT_FICTIONAL_ROLE_DROPPED', ...principal });
        }
        expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin, "SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
        for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
        expect(hash(readFileSync(sourcePath))).toBe(expectedSourceSHA256); cleaned = true;
      }
    } finally {
      for (const client of clients) if (!closedClients.has(client)) {
        const status = client.getTransactionStatus() ?? null;
        try { await client.end(); closedClients.add(client); closure.push({ client: client === admin ? 'ADMIN' : 'OWN_FIXTURE_CLIENT', status, finalStatus: client.getTransactionStatus() ?? null, closed: true }); }
        catch { closure.push({ client: client === admin ? 'ADMIN' : 'OWN_FIXTURE_CLIENT', status, finalStatus: null, closed: false }); }
      }
      password = '';
      if (runVerified) {
        const path = join(runPath!, 'portal-source-observation-operations.jsonl'), bytes = recordCount ? readFileSync(path) : Buffer.alloc(0);
        const text = bytes.toString('utf8'); expect(Buffer.from(text, 'utf8')).toEqual(bytes);
        const lines = text ? text.split('\n') : []; if (text) expect(lines.pop()).toBe(''); expect(lines).toHaveLength(recordCount);
        for (const line of lines) JSON.parse(line);
        writeFileSync(join(runPath!, 'portal-source-observation-cleanup.json'), JSON.stringify({ verified, setupCommitted, installed, cleaned, roles, objects, closure,
          clients: clients.size, closedClients: closedClients.size, pendingRepairs: [...repairs], pendingFenceAttempts: pendingFenceAttempts.size, sqlAttempted,
          finalFixtureCounter: expectedCounter, completeJsonl: { recordCount, bytes: bytes.length, sha256: hash(bytes), validUTF8: true },
          assertionScope: 'SPARSE_SINGLETON_INSTALLER_RAW_OBSERVATION_NOT_AUTHORITY_OR_FULL_F10', errorFailuresRetained: true }, null, 2), { flag: 'wx', mode: 0o600 });
      }
    }
  }, 60000);
});
