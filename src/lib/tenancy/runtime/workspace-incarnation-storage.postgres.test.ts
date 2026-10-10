import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/workspace-incarnation-storage.sql');
const source = readFileSync(sourcePath, 'utf8');
const policyStoragePath = resolve('src/lib/tenancy/runtime/capability-policy-definition-storage.sql');
const policyStorage = readFileSync(policyStoragePath, 'utf8');
const installedPolicyPath = resolve('src/lib/tenancy/runtime/portal-installed-policy-observation.sql');
const installedPolicySource = readFileSync(installedPolicyPath, 'utf8');
const parentPath = resolve('db/migrations/0008_workspace_positions.sql');
const parentSource = readFileSync(parentPath, 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const expectedSourceSHA256 = 'b3d8c8ecf96fb4ff72255e85a53a50ddc97a1633dfdf94cea19b4496382a07f9';
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
const table = 'nevora_tenancy.workspace_incarnation_counter';
const functionName = 'guard_workspace_incarnation_counter';
const rowGuard = 'workspace_incarnation_counter_row_guard';
const truncateGuard = 'workspace_incarnation_counter_truncate_guard';
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_INC_OWNED_LEASE, runPath = process.env.F_INC_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string; login: boolean };
type OwnObject = { kind: 'schema' | 'table' | 'function' | 'trigger'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; relationOid?: string; dropped: boolean };

// HOLD without explicit root-owned lease+run directory. No discovery, ambient URL,
// startup, constructor side effect or SQL before the opt-in fixture checks.
// Sparse original 0008 parent fragment, one workspace, NOT full68/cutover/A-B.
describe.skipIf(!leasePath && !runPath)('owned PG18 workspace incarnation storage only', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, installer: Client;
  let appRole: Role, workerRole: Role, outsiderRole: Role, forceOwner: Role;
  let password = '', installerOid = '', workspaceId = '', verified = false, runVerified = false;
  let installed = false, setupCommitted = false, sqlAttempted = false;
  let parent: OwnObject, schema: OwnObject, counter: OwnObject;
  let originalParentRows: unknown[], originalParentCatalog: unknown;
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
    catch (error) { throw Error('owned_incarnation_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    records.push(value);
    appendFileSync(join(runPath!, 'incarnation-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_incarnation_connection_failed'); }
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
  async function remember(kind: OwnObject['kind'], namespace: string, name: string, ownerOid: string, signature?: string) {
    const found = kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [name])).rows[0]
      : kind === 'function'
        ? (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(namespace) + '.' + q(name) + signature])).rows[0]
        : kind === 'trigger'
          ? (await query(admin, `SELECT t.oid::text oid,c.relowner::text owner,c.oid::text relation_oid
              FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
              WHERE t.tgname=$1 AND t.tgrelid=pg_catalog.to_regclass($2) AND NOT t.tgisinternal`, [name, table])).rows[0]
          : (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(namespace) + '.' + q(name)])).rows[0];
    expect(found).toMatchObject({ oid: expect.stringMatching(/^[0-9]+$/), owner: ownerOid });
    const result: OwnObject = { kind, schema: namespace, name, oid: found.oid as string, ownerOid,
      ...(signature ? { signature } : {}), ...(kind === 'trigger' ? { relationOid: found.relation_oid as string } : {}), dropped: false };
    objects.push(result); record({ operation: 'EXACT_OWN_OBJECT_OBSERVED', ...result }); return result;
  }
  async function dropObject(object: OwnObject) {
    let found;
    if (object.kind === 'schema') found = (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [object.name])).rows[0];
    else if (object.kind === 'function') found = (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(object.schema) + '.' + q(object.name) + object.signature])).rows[0];
    else if (object.kind === 'trigger') found = (await query(admin, `SELECT t.oid::text oid,c.relowner::text owner,t.tgrelid::text relation_oid
      FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      WHERE t.oid=$1::oid AND t.tgname=$2 AND c.oid=pg_catalog.to_regclass($3)`, [object.oid, object.name, table])).rows[0];
    else found = (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(object.schema) + '.' + q(object.name)])).rows[0];
    expect(found).toEqual({ oid: object.oid, owner: object.ownerOid, ...(object.kind === 'trigger' ? { relation_oid: object.relationOid } : {}) });
    const target = object.kind === 'schema' ? q(object.name) : object.kind === 'trigger'
      ? q(object.name) + ' ON ' + table : q(object.schema) + '.' + q(object.name) + (object.signature ?? '');
    await query(admin, 'DROP ' + object.kind.toUpperCase() + ' ' + target);
    const catalogName = object.kind === 'schema' ? 'pg_namespace' : object.kind === 'function' ? 'pg_proc' : object.kind === 'trigger' ? 'pg_trigger' : 'pg_class';
    expect((await query(admin, 'SELECT oid FROM pg_catalog.' + catalogName + ' WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
    object.dropped = true; record({ operation: 'EXACT_OWN_OBJECT_DROPPED', ...object });
  }
  async function catalog(namespaceOnly = false) {
    const condition = namespaceOnly ? "n.nspname='nevora_tenancy'" : "(n.nspname='nevora_tenancy' OR (n.nspname='public' AND c.relname='workspaces'))";
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
    const indexes = (await query(admin, `SELECT c.oid::text relation_oid,i.indexrelid::text oid,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indimmediate,
      pg_catalog.pg_get_indexdef(i.indexrelid) definition FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid,i.indexrelid`)).rows;
    const functions = (await query(admin, `SELECT p.oid::text oid,p.proname,p.proowner::text owner,p.prosecdef,p.proconfig,p.prorettype::text return_oid,
      p.proargtypes::text arg_oids,p.proretset,l.lanname,p.proacl::text acl,pg_catalog.pg_get_functiondef(p.oid) definition
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
    return { schemas, relations, columns, constraints, indexes, functions, triggers, policies, expandedAcls };
  }
  function canonicalAcl(value: Awaited<ReturnType<typeof catalog>>) {
    return { ...value, schemas: value.schemas.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'SCHEMA' && x.oid === row.oid) })),
      relations: value.relations.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'TABLE' && x.oid === row.oid) })),
      functions: value.functions.map(row => ({ ...row, acl: value.expandedAcls.filter(x => x.kind === 'FUNCTION' && x.oid === row.oid) })) };
  }
  async function parentRows() {
    const current = (await query(admin, 'SELECT n.nspname,c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=$1::oid', [parent.oid])).rows[0];
    expect(current?.nspname).toBe('public');
    const exactTarget = q(current.nspname as string) + '.' + q(current.relname as string);
    return (await query(admin, `SELECT id,name,time_zone,active,singleton,created_at::text created_wire,updated_at::text updated_wire,
      pg_catalog.to_jsonb(w) native_row FROM ${exactTarget} w ORDER BY id COLLATE pg_catalog."C"`)).rows;
  }
  async function counterRows() {
    return (await query(admin, 'SELECT workspace_id,incarnation::text incarnation FROM ' + table + ' ORDER BY workspace_id COLLATE pg_catalog."C"')).rows;
  }
  function parentProjection(value: Awaited<ReturnType<typeof catalog>>) {
    return { relations: value.relations.filter(x => x.oid === parent.oid), columns: value.columns.filter(x => x.relation_oid === parent.oid),
      constraints: value.constraints.filter(x => x.relation_oid === parent.oid), indexes: value.indexes.filter(x => x.relation_oid === parent.oid),
      // New FK enforcement creates native internal triggers on the parent; these
      // are retained separately, not silently claimed equal to pre-install state.
      noninternalTriggers: value.triggers.filter(x => x.relation_oid === parent.oid && !x.tgisinternal),
      acls: value.expandedAcls.filter(x => x.kind === 'TABLE' && x.oid === parent.oid) };
  }
  async function preserveParent() {
    expect(await parentRows()).toEqual(originalParentRows);
    expect(parentProjection(await catalog())).toEqual(originalParentCatalog);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
  }
  async function poll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_incarnation_observation_timeout_' + label);
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
    const code = await rejected(installer, source);
    await finishRejected(installer, code, expectedCode);
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); expect(await parentRows()).toEqual(beforeRows);
  }
  async function inRollback(body: () => Promise<void>) {
    const before = await catalog(), rows = await counterRows(), parentBefore = await parentRows();
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try { await body(); }
    finally { if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); await query(admin, 'RESET ROLE'); }
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
    try {
      await query(installer, "SET default_transaction_isolation='repeatable read'");
      await query(app, 'BEGIN ISOLATION LEVEL READ COMMITTED');
      await query(app, RUNTIME_CATALOG_SHARED_FENCE_SQL.text, [...RUNTIME_CATALOG_SHARED_FENCE_SQL.values]);
      expect(await locks(pids)).toEqual([keyTuple(reader.pid as number, 'ShareLock', true)]);
      if (staged) await query(installer, opening);
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
      expect(relationLocks.filter(x => x.nspname === 'nevora_tenancy' || x.oid === parent.oid ||
        ['pg_namespace','pg_class','pg_attribute','pg_constraint','pg_index'].includes(x.relname))).toEqual([]);
      expect((await catalog(true)).relations).toEqual([]);
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
      if (['T', 'E'].includes(app.getTransactionStatus() ?? '')) await query(app, 'ROLLBACK');
      if (pending && pendingFenceAttempts.has(pending)) { await pending; pendingFenceAttempts.delete(pending); }
      if (['T', 'E'].includes(installer.getTransactionStatus() ?? '')) await query(installer, 'ROLLBACK');
      await query(installer, "SELECT pg_catalog.set_config('default_transaction_isolation',$1,false)", [beforeDefault]);
      expect((await query(installer, 'SHOW default_transaction_isolation')).rows).toEqual([{ default_transaction_isolation: beforeDefault }]);
      expect(await identity(installer, lease.user, installerOid)).toEqual(original); expect(await identity(app, appRole.name, appRole.oid)).toEqual(reader);
      expect(await locks(pids)).toEqual([]);
    }
  }
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
    expect(hash(source)).toBe(expectedSourceSHA256); expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/catalog-fence.server.ts')))).toBe(expectedFenceSHA256);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user); const base = await checkBase(); installerOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid as string;
    expect((await query(admin, 'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid', [String(lease.databaseOid)])).rows).toEqual([{ owner: installerOid }]);
    expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, "SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
    verified = true; record({ operation: 'EXACT_OWN_ROOT_BASE_VERIFIED', base, testSHA256: hash(readFileSync(resolve('src/lib/tenancy/runtime/workspace-incarnation-storage.postgres.test.ts'))), sourceSHA256: hash(source), migrationPins });
    await query(admin, 'BEGIN');
    try {
      appRole = await role(lease.invocation + '_app', true); workerRole = await role(lease.invocation + '_worker', true);
      outsiderRole = await role(lease.invocation + '_outsider', true); forceOwner = await role(lease.invocation + '_force_owner', false);
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC'); await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + [appRole,workerRole,outsiderRole].map(x => q(x.name)).join(','));
      await query(admin, 'CREATE SCHEMA nevora_tenancy'); schema = await remember('schema', '', 'nevora_tenancy', installerOid);
      const matches = parentSource.match(/CREATE TABLE workspaces \([\s\S]*?\n\);/g); expect(matches).toHaveLength(1);
      const fragment = matches![0]; expect(fragment.startsWith('CREATE TABLE workspaces (\n')).toBe(true);
      await query(admin, 'SET LOCAL search_path=public,pg_catalog'); await query(admin, fragment);
      parent = await remember('table', 'public', 'workspaces', installerOid);
      workspaceId = ' ' + lease.invocation + '_workspace '; // Exact original padded text key, never normalized.
      await query(admin, 'INSERT INTO public.workspaces(id,name,time_zone,created_at,updated_at) VALUES($1,$2,$3,$4::timestamptz,$4::timestamptz)',
        [workspaceId,'Fictional Workspace','UTC','2026-10-09T00:00:00.000000Z']);
      await query(admin, 'COMMIT'); setupCommitted = true;
      record({ operation: 'EXACT_ORIGINAL_0008_CREATE_FRAGMENT_EXECUTED', sourceSHA256: hash(parentSource), fragment, fragmentSHA256: hash(fragment), installedParent: parent,
        claim: 'SPARSE_FRAGMENT_ONE_FICTIONAL_WORKSPACE_NOT_FULL68_SOURCE_OR_CUTOVER_OR_A_B' });
    } catch (error) { if (['T','E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK'); throw error; }
    originalParentRows = await parentRows(); originalParentCatalog = parentProjection(await catalog());
    app = await connect(appRole.name); worker = await connect(workerRole.name); outsider = await connect(outsiderRole.name); installer = await connect(lease.user);
    writeFileSync(join(runPath!, 'incarnation-fixture-custody.json'), JSON.stringify({ base, roles, objects, parentRows: originalParentRows, parentCatalog: originalParentCatalog,
      sourceSHA256: hash(source), parentSourceSHA256: hash(parentSource), sourceMigrationPins: migrationPins,
      claim: 'EMPTY_TECHNICAL_COUNTER_SOURCE_ONLY_SPARSE_PARENT_NO_CALLER_AUTHORITY' }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 30000);

  it('WI01 rejects missing owned schema and missing original parent without adoption or effects', async () => {
    const shadowSchema = lease.invocation + '_schema_shadow', shadowParent = lease.invocation + '_parent_shadow';
    const schemaUndo = 'ALTER SCHEMA ' + q(shadowSchema) + ' RENAME TO nevora_tenancy';
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_namespace WHERE nspname=$1', [shadowSchema])).rows).toEqual([]);
    repairs.add(schemaUndo);
    try { await query(admin, 'ALTER SCHEMA nevora_tenancy RENAME TO ' + q(shadowSchema)); await installReject('3F000'); }
    finally { await query(admin, schemaUndo); repairs.delete(schemaUndo); }
    const parentUndo = 'ALTER TABLE public.' + q(shadowParent) + ' RENAME TO workspaces';
    expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['public.' + q(shadowParent)])).rows).toEqual([{ oid: null }]);
    repairs.add(parentUndo);
    try { await query(admin, 'ALTER TABLE public.workspaces RENAME TO ' + q(shadowParent)); await installReject('55000'); }
    finally { await query(admin, parentUndo); repairs.delete(parentUndo); }
    await preserveParent(); expect((await catalog(true)).relations).toEqual([]);
  });
  it('WI02 rejects foreign schema or original parent owner and restores exact native source', async () => {
    const before = await catalog();
    for (const [change, undo] of [
      ['ALTER SCHEMA nevora_tenancy OWNER TO ' + q(outsiderRole.name), 'ALTER SCHEMA nevora_tenancy OWNER TO ' + q(lease.user)],
      ['ALTER TABLE public.workspaces OWNER TO ' + q(outsiderRole.name), 'ALTER TABLE public.workspaces OWNER TO ' + q(lease.user)],
    ]) { repairs.add(undo); try { await query(admin, change); await installReject('42501'); } finally { await query(admin, undo); repairs.delete(undo); } }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); await preserveParent();
  });
  it('WI03 rejects an own malformed same-name parent without PK rather than adopting it', async () => {
    const before = await catalog(), shadow = lease.invocation + '_parent_shadow'; let bad: OwnObject | undefined;
    const undo = 'ALTER TABLE public.' + q(shadow) + ' RENAME TO workspaces'; repairs.add(undo);
    try {
      await query(admin, 'ALTER TABLE public.workspaces RENAME TO ' + q(shadow));
      expect((await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', ['public.' + q(shadow)])).rows).toEqual([{ oid: parent.oid }]);
      await query(admin, 'CREATE TABLE public.workspaces(id text NOT NULL)'); bad = await remember('table','public','workspaces',installerOid);
      expect(bad.oid).not.toBe(parent.oid); await installReject('55000');
      record({ caseId: 'WI03', originalParent: parent, exactOwnMalformedParent: bad, malformedCatalog: await catalog() });
    } finally { if (bad) await dropObject(bad); await query(admin, undo); repairs.delete(undo); }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); await preserveParent();
  });
  it('WI03b refuses a same-name guard overload without replacing its exact native source', async () => {
    const before = await catalog(); let overload: OwnObject | undefined;
    try {
      await query(admin, 'CREATE FUNCTION nevora_tenancy.guard_workspace_incarnation_counter(integer) RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS ' + literal('SELECT true'));
      overload = await remember('function','nevora_tenancy',functionName,installerOid,'(integer)');
      const retained = await catalog(); await installReject('42723'); expect(await catalog()).toEqual(retained);
      record({ caseId: 'WI03b', exactOwnOverload: overload, retained, after: await catalog() });
    } finally { if (overload) await dropObject(overload); }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); await preserveParent();
  });
  it('WI03c rejects ambient named default table or function grants atomically and restores all native defaults', async () => {
    async function defaults() {
      return (await query(admin, `SELECT d.oid::text oid,d.defaclrole::text owner,d.defaclnamespace::text namespace_oid,
        d.defaclobjtype::text kind,d.defaclacl::text acl,
        ARRAY(SELECT pg_catalog.row_to_json(a)::text FROM pg_catalog.aclexplode(d.defaclacl) a
          ORDER BY a.grantee,a.privilege_type,a.grantor,a.is_grantable) native_expanded
        FROM pg_catalog.pg_default_acl d ORDER BY d.oid`)).rows;
    }
    const originalDefaults = await defaults(), before = await catalog();
    expect(originalDefaults).toEqual([]); // Fresh own fixture; no ambient adoption.
    for (const [kind, privileges] of [['TABLES','TRIGGER,TRUNCATE'],['FUNCTIONS','EXECUTE']] as const) {
      const grant = 'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy GRANT ' + privileges + ' ON ' + kind + ' TO ' + q(outsiderRole.name);
      const undo = 'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy REVOKE ' + privileges + ' ON ' + kind + ' FROM ' + q(outsiderRole.name);
      repairs.add(undo);
      try {
        await query(admin,grant); const actualDefaults = await defaults(); expect(actualDefaults).toHaveLength(1);
        await installReject('42501');
        expect((await catalog(true)).relations).toEqual([]); expect((await catalog()).functions).toEqual([]);
        record({ caseId: 'WI03c', kind, originalDefaults, actualDefaults, afterAttempt: await catalog(), sourceRows: await parentRows(),
          claim: 'NATIVE_DEFAULT_GRANT_ATOMIC_DENIAL_NO_REPAIR_OR_RLS_SUBSTITUTE' });
      } finally { await query(admin,undo); repairs.delete(undo); }
      expect(await defaults()).toEqual(originalDefaults); expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); await preserveParent();
    }
  });
  it('WI04 whole artifact waits first and reads changed schema owner fresh despite RR default', async () => {
    const before = await catalog(), undo = 'ALTER SCHEMA nevora_tenancy OWNER TO ' + q(lease.user);
    try { await fenceAttempt(false, async () => { repairs.add(undo); await query(admin, 'ALTER SCHEMA nevora_tenancy OWNER TO ' + q(outsiderRole.name));
      expect((await catalog()).schemas).toMatchObject([{ oid: schema.oid, owner: outsiderRole.oid }]); record({ caseId: 'WI04', deliberatelyNoncooperatingOwnFixtureDelta: await catalog() }); }); }
    finally { if (repairs.has(undo)) { await query(admin, undo); repairs.delete(undo); } }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); await preserveParent();
  });
  it('WI04b whole unmodified artifact succeeds in one native query after first exclusive wait', async () => {
    const before = await catalog(), originalCount = objects.length;
    await fenceAttempt(false, undefined, true);
    const temporaryCounter = await remember('table','nevora_tenancy','workspace_incarnation_counter',installerOid);
    await remember('function','nevora_tenancy',functionName,installerOid,'()');
    await remember('trigger','nevora_tenancy',rowGuard,installerOid);
    await remember('trigger','nevora_tenancy',truncateGuard,installerOid);
    expect((await query(admin, 'SELECT workspace_id,incarnation::text FROM ' + table)).rows).toEqual([]);
    record({ caseId: 'WI04b', installedObjects: objects.slice(originalCount), native: await catalog(), counter: temporaryCounter,
      claim: 'WHOLE_ARTIFACT_ONE_NATIVE_QUERY_SUCCESS_NO_SOURCE_SEEDS' });
    for (const object of [...objects.slice(originalCount)].reverse()) await dropObject(object);
    expect(before.schemas).toHaveLength(1); expect(before.schemas[0].acl).toBe(null); expect(before.expandedAcls).toEqual([]);
    // Successful REVOKE materializes native owner-only schema ACLs. Assert that
    // exact intended change while retaining every other original catalog field.
    const expectedAfter = { ...before, schemas: before.schemas.map(row => ({ ...row, acl: '{' + lease.user + '=UC/' + lease.user + '}' })),
      expandedAcls: ['CREATE','USAGE'].map(privilege_type => ({ kind: 'SCHEMA', oid: schema.oid,
        grantor: installerOid, grantee: installerOid, privilege_type, is_grantable: false })) };
    const after = await catalog(); expect(after).toEqual(expectedAfter); await preserveParent();
    record({ operation: 'WHOLE_POSITIVE_AFTER_EXACT_DROP', before, expectedAfter, after,
      claim: 'ONLY_EXACT_OWNER_SCHEMA_ACL_MATERIALIZATION_ALL_OTHER_ORIGINAL_FIELDS_PRESERVED' });
  });
  it('WI05 staged exact installer waits before prerequisites then installs empty from owning RC', async () => {
    await fenceAttempt(true); installed = true;
    counter = await remember('table','nevora_tenancy','workspace_incarnation_counter',installerOid);
    await remember('function','nevora_tenancy',functionName,installerOid,'()');
    await remember('trigger','nevora_tenancy',rowGuard,installerOid);
    await remember('trigger','nevora_tenancy',truncateGuard,installerOid);
    expect(await counterRows()).toEqual([]); await preserveParent();
    record({ caseId: 'WI05', installedObjects: objects, catalog: await catalog(), nativeParentRows: await parentRows(), emptyCounter: await counterRows(),
      claim: 'STAGED_EXACT_SOURCE_NOT_WHOLE_SOURCE_BATCH_SUCCESS' });
  });
  it('WI06 native shape binds original text PK RESTRICT FK positive bigint no default invoker guards forced RLS no policies', async () => {
    const native = await catalog(); record({ caseId: 'WI06', native, parent: originalParentRows, counter: await counterRows() });
    expect(native.relations.find(x => x.oid === counter.oid)).toMatchObject({ owner: installerOid, relkind: 'r', relpersistence: 'p', relrowsecurity: true, relforcerowsecurity: true });
    expect(native.columns.filter(x => x.relation_oid === counter.oid)).toMatchObject([
      { attnum: 1, attname: 'workspace_id', type_oid: '25', attnotnull: true, atthasdef: false, attidentity: '', attgenerated: '', default_source: null },
      { attnum: 2, attname: 'incarnation', type_oid: '20', attnotnull: true, atthasdef: false, attidentity: '', attgenerated: '', default_source: null },
    ]); expect(native.columns.filter(x => x.relation_oid === counter.oid)).toHaveLength(2);
    const constraints = native.constraints.filter(x => x.relation_oid === counter.oid);
    expect(constraints.filter(x => x.contype === 'p')).toMatchObject([{ conkey: [1], convalidated: true, conenforced: true, condeferrable: false, condeferred: false }]);
    expect(constraints.filter(x => x.contype === 'f')).toMatchObject([{ conkey: [1], parent_oid: parent.oid, confkey: [1], update_action: 'r', delete_action: 'r', convalidated: true, conenforced: true, condeferrable: false }]);
    expect(constraints.filter(x => x.contype === 'c')).toHaveLength(1);
    expect(native.indexes.filter(x => x.relation_oid === counter.oid && x.indisprimary)).toMatchObject([{ indisunique: true, indisvalid: true, indisready: true, indimmediate: true }]);
    const guard = native.functions; expect(guard).toHaveLength(1);
    expect(guard[0]).toMatchObject({ proname: functionName, owner: installerOid, prosecdef: false, proconfig: ['search_path=pg_catalog'], return_oid: '2279', arg_oids: '', proretset: false, lanname: 'plpgsql' });
    const triggers = native.triggers.filter(x => x.relation_oid === counter.oid && !x.tgisinternal); expect(triggers).toHaveLength(2);
    expect(triggers.find(x => x.tgname === rowGuard)).toMatchObject({ tgtype: 27, function_oid: guard[0].oid, tgenabled: 'O', tgdeferrable: false, tginitdeferred: false });
    expect(triggers.find(x => x.tgname === truncateGuard)).toMatchObject({ tgtype: 34, function_oid: guard[0].oid, tgenabled: 'O', tgdeferrable: false, tginitdeferred: false });
    expect(native.policies).toEqual([]); expect(native.expandedAcls.filter(x => x.grantee === '0')).toEqual([]);
    for (const role of roles) {
      const acl = (await query(admin, `SELECT pg_catalog.has_schema_privilege($1,'nevora_tenancy','USAGE,CREATE') schema_access,
        pg_catalog.has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') table_access,
        pg_catalog.has_function_privilege($1,'nevora_tenancy.guard_workspace_incarnation_counter()','EXECUTE') execute`, [role.name,table])).rows[0];
      expect(acl).toEqual({ schema_access: false, table_access: false, execute: false });
    } expect(await counterRows()).toEqual([]); await preserveParent();
  });
  it('WI07 duplicate artifact refuses replacement and retains all native OIDs source ACL rows', async () => {
    const before = await catalog(); await installReject('42P07'); expect(await catalog()).toEqual(before); expect(await counterRows()).toEqual([]); await preserveParent();
  });
  it('WI08 rejects orphan SQLNULL nonpositive omitted counters and preserves original singleton', async () => {
    await inRollback(async () => {
      const outcomes = [];
      for (const [id, incarnation, expected] of [[workspaceId + '_missing','1','23503'],[null,'1','23502'],[workspaceId,null,'23502'],[workspaceId,'0','23514'],[workspaceId,'-1','23514']] as const)
        outcomes.push({ id, incarnation, expected, code: await rejectedSavepoint('INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,$2::int8)', [id,incarnation], expected) });
      await rejectedSavepoint('INSERT INTO ' + table + '(workspace_id) VALUES($1)', [workspaceId], '23502');
      await rejectedSavepoint('INSERT INTO public.workspaces(id,name,time_zone) VALUES($1,$2,$3)', [workspaceId + '_second','Second Fictional','UTC'], '23505');
      expect(await parentRows()).toEqual(originalParentRows); expect(await counterRows()).toEqual([]); record({ caseId: 'WI08', outcomes, singletonStillOne: await parentRows() });
    });
  });
  it('WI09 enforces increasing value immutable key no delete no truncate and FK RESTRICT', async () => {
    await inRollback(async () => {
      await query(admin, 'INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,1)', [workspaceId]);
      await rejectedSavepoint('INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,1)', [workspaceId], '23505');
      for (const value of ['1','0','-1',null]) await rejectedSavepoint('UPDATE ' + table + ' SET incarnation=$1::int8 WHERE workspace_id=$2', [value,workspaceId], '23514');
      await rejectedSavepoint('UPDATE ' + table + ' SET workspace_id=$1 WHERE workspace_id=$2', [workspaceId + '_changed',workspaceId], '55000');
      await rejectedSavepoint('UPDATE ' + table + ' SET workspace_id=$1 WHERE workspace_id=$2', [workspaceId.trim(),workspaceId], '55000');
      await rejectedSavepoint('DELETE FROM ' + table + ' WHERE workspace_id=$1', [workspaceId], '55000');
      await rejectedSavepoint('TRUNCATE ' + table, [], '55000');
      await rejectedSavepoint('DELETE FROM public.workspaces WHERE id=$1', [workspaceId], '23001');
      await rejectedSavepoint('UPDATE public.workspaces SET id=$1 WHERE id=$2', [workspaceId + '_changed',workspaceId], '23001');
      expect((await query(admin, 'UPDATE ' + table + ' SET incarnation=2 WHERE workspace_id=$1 RETURNING incarnation::text incarnation', [workspaceId])).rows).toEqual([{ incarnation: '2' }]);
      record({ caseId: 'WI09', increasingThenRolledBack: await counterRows(), parentPreserved: await parentRows() });
    });
  });
  it('WI10 retains native int8 strings beyond JS safety and fails explicit max exhaustion without wrap', async () => {
    await inRollback(async () => {
      await query(admin, 'INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,$2::int8)', [workspaceId,'9007199254740993']);
      const unsafe = (await query(admin, 'SELECT incarnation,incarnation::text wire FROM ' + table)).rows;
      expect(unsafe).toEqual([{ incarnation: '9007199254740993', wire: '9007199254740993' }]);
      await query(admin, 'UPDATE ' + table + ' SET incarnation=$1::int8 WHERE workspace_id=$2', ['9223372036854775807',workspaceId]);
      const maximum = await counterRows(); expect(maximum).toEqual([{ workspace_id: workspaceId, incarnation: '9223372036854775807' }]);
      await rejectedSavepoint('UPDATE ' + table + ' SET incarnation=incarnation+1 WHERE workspace_id=$1', [workspaceId], '22003');
      await rejectedSavepoint('UPDATE ' + table + ' SET incarnation=$1::int8 WHERE workspace_id=$2', ['9223372036854775808',workspaceId], '22003');
      expect(await counterRows()).toEqual(maximum); record({ caseId: 'WI10', unsafe, maximum, afterExhaustion: await counterRows(), noImplicitIncrementOrWrap: true });
    });
  });
  it('WI11 zero policies hide existing native row and deny broadly granted nonowner writes without caller authority', async () => {
    await query(admin, 'INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,1)', [workspaceId]);
    const before = await catalog(), rows = await counterRows(), grantees = [appRole,workerRole].map(x => q(x.name)).join(',');
    const revokeTable = 'REVOKE SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON ' + table + ' FROM ' + grantees;
    const revokeSchema = 'REVOKE USAGE ON SCHEMA nevora_tenancy FROM ' + grantees;
    repairs.add(revokeTable); repairs.add(revokeSchema);
    try {
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + grantees);
      await query(admin, 'GRANT SELECT,INSERT,UPDATE,DELETE,TRUNCATE ON ' + table + ' TO ' + grantees);
      for (const [role,client] of [[appRole,app],[workerRole,worker]] as const) {
        const original = await identity(client,role.name,role.oid);
        const effective = (await query(admin, `SELECT pg_catalog.has_table_privilege($1,$2,'SELECT') read,
          pg_catalog.has_table_privilege($1,$2,'INSERT') insert,pg_catalog.has_table_privilege($1,$2,'UPDATE') update,
          pg_catalog.has_table_privilege($1,$2,'DELETE') delete,pg_catalog.has_table_privilege($1,$2,'TRUNCATE') truncate`, [role.name,table])).rows[0];
        expect(effective).toEqual({ read: true, insert: true, update: true, delete: true, truncate: true });
        expect((await query(client, 'SELECT * FROM ' + table)).rows).toEqual([]);
        const insert = await rejected(client, 'INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,2)', [workspaceId]);
        const update = (await query(client, 'UPDATE ' + table + ' SET incarnation=2 WHERE workspace_id=$1 RETURNING *', [workspaceId])).rows;
        const deletion = (await query(client, 'DELETE FROM ' + table + ' WHERE workspace_id=$1 RETURNING *', [workspaceId])).rows;
        const truncate = await rejected(client,'TRUNCATE ' + table);
        record({ caseId: 'WI11', role, original, effective, insert, update, deletion, truncate, nativeVisibleToInstaller: await counterRows(),
          claim: 'ROOT_FICTIONAL_BROAD_GRANTS_ONLY_ZERO_POLICIES_NOT_RUNTIME_CALLER_AUTHORITY' });
        expect(insert).toBe('42501'); expect(update).toEqual([]); expect(deletion).toEqual([]); expect(truncate).toBe('55000');
        expect(await identity(client,role.name,role.oid)).toEqual(original);
      }
    } finally { await query(admin,revokeTable); repairs.delete(revokeTable); await query(admin,revokeSchema); repairs.delete(revokeSchema); }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); expect(await counterRows()).toEqual(rows); await preserveParent();
  });
  it('WI12 FORCE RLS also hides existing rows from exact nonlogin owner SET ROLE seam and restores native owner', async () => {
    const original = await identity(admin,lease.user,installerOid);
    await inRollback(async () => {
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + q(forceOwner.name));
      await query(admin, 'ALTER TABLE ' + table + ' OWNER TO ' + q(forceOwner.name));
      expect((await catalog()).relations.find(x => x.oid === counter.oid)).toMatchObject({ owner: forceOwner.oid, relrowsecurity: true, relforcerowsecurity: true });
      await query(admin, 'SET ROLE ' + q(forceOwner.name));
      try {
        const native = (await query(admin, `SELECT session_user::text original_login,current_user::text effective_role,
          (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid,
          (SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) superuser,
          (SELECT rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) bypass,
          pg_catalog.row_security_active($1::regclass) rls`, [table])).rows[0];
        const visible = (await query(admin, 'SELECT * FROM ' + table)).rows;
        record({ caseId: 'WI12', native, visible, claim: 'ROOT_SET_ROLE_NEGATIVE_ORIGINAL_LOGIN_RETAINED_NOT_RUNTIME_AUTHORITY' });
        expect(native).toEqual({ original_login: lease.user, effective_role: forceOwner.name, original_oid: installerOid, superuser: false, bypass: false, rls: true });
        expect(visible).toEqual([]);
        await rejectedSavepoint('INSERT INTO ' + table + '(workspace_id,incarnation) VALUES($1,2)', [workspaceId], '42501');
        expect((await query(admin, 'UPDATE ' + table + ' SET incarnation=2 WHERE workspace_id=$1 RETURNING *', [workspaceId])).rows).toEqual([]);
        await rejectedSavepoint('TRUNCATE ' + table, [], '55000');
      } finally { await query(admin, 'RESET ROLE'); }
    });
    expect(await identity(admin,lease.user,installerOid)).toEqual(original); expect(await counterRows()).toEqual([{ workspace_id: workspaceId, incarnation: '1' }]);
  });
  it('WI13 expected-version fixture update serializes same existing row into one change and one no-row result', async () => {
    const before = await catalog(), rows = await counterRows(); expect(rows).toEqual([{ workspace_id: workspaceId, incarnation: '1' }]);
    const left = await identity(admin,lease.user,installerOid), right = await identity(installer,lease.user,installerOid);
    let pending: Promise<unknown> | undefined;
    try {
      await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED'); await query(installer,'BEGIN ISOLATION LEVEL READ COMMITTED');
      const first = (await query(admin,'UPDATE ' + table + ' SET incarnation=2 WHERE workspace_id=$1 AND incarnation=1 RETURNING incarnation::text incarnation',[workspaceId])).rows;
      pending = installer.query('UPDATE ' + table + ' SET incarnation=2 WHERE workspace_id=$1 AND incarnation=1 RETURNING incarnation::text incarnation',[workspaceId]).then(result => ({ code: 'NO_ERROR', rows: result.rows }), error => ({ code: sqlstate(error), rows: [] }));
      pendingFenceAttempts.add(pending);
      await poll(async () => (await query(admin, 'SELECT pg_catalog.pg_blocking_pids($1) blockers',[right.pid])).rows[0].blockers.includes(left.pid), 'counter_expected_version_wait');
      const blocking = (await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[right.pid])).rows;
      expect(first).toEqual([{ incarnation: '2' }]); expect(blocking).toMatchObject([{ state: 'active', wait_event_type: 'Lock', blockers: [left.pid] }]);
      await query(admin,'COMMIT'); const second = await pending; pendingFenceAttempts.delete(pending); await query(installer,'COMMIT');
      record({ caseId: 'WI13', first, second, blocking, after: await counterRows(), claim: 'EXPLICIT_FICTIONAL_EXPECTED_VERSION_SQL_NOT_CALLER_ISSUER_OR_INCARNATION_POLICY' });
      expect(second).toEqual({ code: 'NO_ERROR', rows: [] }); expect(await counterRows()).toEqual([{ workspace_id: workspaceId, incarnation: '2' }]);
    } finally {
      if (['T','E'].includes(admin.getTransactionStatus() ?? '')) await query(admin,'ROLLBACK');
      if (pending && pendingFenceAttempts.has(pending)) { await pending; pendingFenceAttempts.delete(pending); }
      if (['T','E'].includes(installer.getTransactionStatus() ?? '')) await query(installer,'ROLLBACK');
    }
    expect(await identity(admin,lease.user,installerOid)).toEqual(left); expect(await identity(installer,lease.user,installerOid)).toEqual(right);
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); await preserveParent();
  });

  // Same exact leased sparse parent/counter fixture; no second resource owner or
  // issuer. Fictional source bundles below prove coherence only, not an approved
  // installer, executing code, permissions, authenticated policy or tenant proof.
  const definitionTable = 'nevora_tenancy.capability_policy_definition';
  const installationTable = 'nevora_tenancy.workspace_capability_policy_installation';
  const testPolicyId = ' fictional explicit policy '; // Preserve exact UTF8 bytes.
  const testRevision = '9007199254740993';
  let policyStorageInstalled = false;
  function bundle(revision = testRevision): unknown[] {
    const bytes = [Buffer.from('Fictional policy source ' + revision), Buffer.from('Fictional vocabulary'), Buffer.from('Fictional PRD; not an approved or executing source')];
    const digests = bytes.map(hash);
    return [testPolicyId, revision, { format: 'NEVORA_CAPABILITY_SOURCE_BUNDLE_V1', policyId: testPolicyId, revision,
      canonicalPolicySource: { path: 'src/lib/capabilities/policy.ts', sha256: digests[0] },
      vocabularySource: { path: 'src/lib/capabilities/types.ts', sha256: digests[1] },
      approvedPRD: { path: 'F_IMPLEMENTATION_PRD.md', sha256: digests[2] } }, bytes[0],digests[0],bytes[1],digests[1],bytes[2],digests[2]];
  }
  const insertDefinition = 'INSERT INTO ' + definitionTable +
    '(policy_id,revision,definition,canonical_policy_source,canonical_policy_source_sha256,vocabulary_source,vocabulary_source_sha256,approved_prd_source,approved_prd_source_sha256) VALUES($1,$2::int8,$3::jsonb,$4,$5,$6,$7,$8,$9)';
  const insertInstallation = 'INSERT INTO ' + installationTable +
    '(workspace_id,workspace_incarnation,installation_epoch,policy_id,policy_revision) VALUES($1,$2::int8,$3::int8,$4,$5::int8)';
  const policyRows = async () => (await query(admin, 'SELECT workspace_id,workspace_incarnation::text incarnation,installation_epoch::text epoch,policy_id,policy_revision::text revision FROM '+installationTable)).rows;
  async function policyReject(expected: string) {
    const before = await catalog();
    const code = await rejected(installer, policyStorage);
    record({ operation: 'EXACT_WHOLE_POLICY_STORAGE_REJECTION', sourceSHA256: hash(policyStorage), code, expected });
    try { await finishRejected(installer,code,expected); }
    finally { await query(installer,'ROLLBACK'); }
    expect(code).toBe(expected); expect(await catalog()).toEqual(before);
  }
  it('CP00 rejects missing parent key and altered guard while native PostgreSQL refuses a nondefault PK', async () => {
    const prerequisite = policyStorage.match(/DO \$capability_policy_prerequisites\$[\s\S]*?\$capability_policy_prerequisites\$;/);
    expect(prerequisite).not.toBeNull();
    await inRollback(async () => {
      await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      await query(admin,'ALTER FUNCTION nevora_tenancy.guard_workspace_incarnation_counter() STRICT');
      await rejectedSavepoint(prerequisite![0],[],'55000');
    });
    await inRollback(async () => {
      await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      await query(admin,'ALTER TABLE '+table+' DROP CONSTRAINT workspace_incarnation_counter_pkey');
      await query(admin,'CREATE UNIQUE INDEX fictional_nondefault_policy_key ON '+table+'(workspace_id text_pattern_ops)');
      await rejectedSavepoint('ALTER TABLE '+table+' ADD PRIMARY KEY USING INDEX fictional_nondefault_policy_key',[],'42809');
      await rejectedSavepoint(prerequisite![0],[],'55000');
    });
    record({ caseId:'CP00', guards:'altered strict guard and absent operative parent key; native42809 rejects nondefault opclass PK', originalRestored:true });
  });
  it('CP01 installs the exact whole source as empty private controls without runtime adoption', async () => {
    const code = await rejected(installer, policyStorage);
    record({ caseId:'CP01', operation:'EXACT_WHOLE_POLICY_STORAGE_INSTALL', sourceSHA256:hash(policyStorage), code });
    if (code !== 'NO_ERROR') await query(installer,'ROLLBACK');
    expect(code).toBe('NO_ERROR'); policyStorageInstalled = true;
    // Record in dependency order so existing exact-OID cleanup drops both tables
    // (and their native triggers) before the referenced trigger function.
    await remember('function','nevora_tenancy','guard_capability_policy_storage',installerOid,'()');
    await remember('table','nevora_tenancy','capability_policy_definition',installerOid);
    await remember('table','nevora_tenancy','workspace_capability_policy_installation',installerOid);
    expect((await query(admin,'SELECT * FROM '+definitionTable)).rows).toEqual([]);
    expect(await policyRows()).toEqual([]); await preserveParent();
  });
  it('CP02 observes native forced RLS zero policies no defaults operative keys and exact invoker guard', async () => {
    expect(policyStorageInstalled).toBe(true); const native = await catalog();
    const keyProfiles = (await query(admin, `SELECT c.relname,o.opcname,o.opcdefault,i.indoption[0] options,
      i.indcollation[0]=a.attcollation collation_matches FROM pg_catalog.pg_index i
      JOIN pg_catalog.pg_class c ON c.oid=i.indrelid JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=i.indkey[0]
      JOIN pg_catalog.pg_opclass o ON o.oid=i.indclass[0]
      WHERE i.indisprimary AND c.oid IN ('public.workspaces'::regclass,'nevora_tenancy.workspace_incarnation_counter'::regclass) ORDER BY c.relname`)).rows;
    expect(keyProfiles).toEqual(['workspace_incarnation_counter','workspaces'].map(relname=>({relname,opcname:'text_ops',opcdefault:true,options:0,collation_matches:true})));
    const owned = native.relations.filter(x=>[definitionTable,installationTable].includes(x.nspname+'.'+x.relname));
    expect(owned).toHaveLength(2); const oids = owned.map(x=>x.oid);
    for (const row of owned) expect(row).toMatchObject({owner:installerOid,relkind:'r',relpersistence:'p',relrowsecurity:true,relforcerowsecurity:true});
    const columns = native.columns.filter(x=>oids.includes(x.relation_oid)); expect(columns).toHaveLength(14);
    expect(columns.every(x=>x.attnotnull && !x.atthasdef && !x.attidentity && !x.attgenerated && x.acl===null)).toBe(true);
    expect(native.policies.filter(x=>oids.includes(x.relation_oid))).toEqual([]);
    const constraints = native.constraints.filter(x=>oids.includes(x.relation_oid));
    expect(constraints.every(x=>x.convalidated && x.conenforced && !x.condeferrable && !x.condeferred)).toBe(true);
    const triggers = native.triggers.filter(x=>oids.includes(x.relation_oid)&&!x.tgisinternal); expect(triggers).toHaveLength(4);
    expect(triggers.every(x=>x.tgenabled==='O' && !x.tgdeferrable && !x.tginitdeferred)).toBe(true);
    const guard = native.functions.find(x=>x.proname==='guard_capability_policy_storage');
    expect(guard).toMatchObject({owner:installerOid,prosecdef:false,proconfig:['search_path=pg_catalog'],arg_oids:'',proretset:false,lanname:'plpgsql'});
    expect(native.expandedAcls.filter(x=>oids.includes(x.oid)||x.oid===guard!.oid).every(x=>x.grantee===installerOid)).toBe(true);
    record({caseId:'CP02',native,keyProfiles,sourceSHA256:hash(policyStorage),claim:'EMPTY_STORAGE_COHERENCE_ONLY_NOT_AUTHENTICATED_INSTALLATION'});
  });
  it('CP03 duplicate whole installer refuses adoption and preserves all native objects and data', async () => {
    await policyReject('42P07'); expect(await policyRows()).toEqual([]); record({caseId:'CP03',empty:true});
  });
  it('CP04 rejects mismatched digest open manifests empty and invalid UTF8 source bytes', async () => {
    await inRollback(async () => {
      const badDigest = bundle();badDigest[4]='0'.repeat(64); await rejectedSavepoint(insertDefinition,badDigest,'23514');
      const extra = bundle();extra[2]={...(extra[2] as object),authorityCurrent:true};await rejectedSavepoint(insertDefinition,extra,'23514');
      const empty = bundle();empty[3]=Buffer.alloc(0);empty[4]=hash(Buffer.alloc(0));(empty[2] as {canonicalPolicySource:{sha256:string}}).canonicalPolicySource.sha256=empty[4] as string;await rejectedSavepoint(insertDefinition,empty,'23514');
      const invalid = bundle();invalid[3]=Buffer.from([0xff]);invalid[4]=hash(Buffer.from([0xff]));(invalid[2] as {canonicalPolicySource:{sha256:string}}).canonicalPolicySource.sha256=invalid[4] as string;await rejectedSavepoint(insertDefinition,invalid,'22021');
      expect((await query(admin,'SELECT * FROM '+definitionTable)).rows).toEqual([]);
    }); record({caseId:'CP04',invalidPayloadsRejected:true});
  });
  it('CP05 stores explicit coherent source bytes and native int8 without treating them as authenticated policy', async () => {
    const values=bundle();await query(admin,insertDefinition,values);
    const rows=(await query(admin,'SELECT policy_id,revision::text revision,definition,canonical_policy_source,vocabulary_source,approved_prd_source FROM '+definitionTable)).rows;
    expect(rows).toEqual([{policy_id:testPolicyId,revision:testRevision,definition:values[2],canonical_policy_source:values[3],vocabulary_source:values[5],approved_prd_source:values[7]}]);
    record({caseId:'CP05',revision:testRevision,byteDigest:hash(values[3] as Buffer),claim:'FICTIONAL_COHERENT_BYTES_ACCEPTED_DO_NOT_ESTABLISH_REVIEWED_OR_EXECUTING_SOURCE'});
  });
  it('CP06 definitions deny noop mutation delete truncate and revision overflow without rewriting source', async () => {
    await inRollback(async () => {
      const before=(await query(admin,'SELECT * FROM '+definitionTable)).rows;
      await rejectedSavepoint('UPDATE '+definitionTable+' SET revision=revision',[],'55000');
      await rejectedSavepoint('DELETE FROM '+definitionTable,[],'55000');
      await rejectedSavepoint('TRUNCATE '+definitionTable+' CASCADE',[],'55000');
      const overflow=bundle('9223372036854775808');await rejectedSavepoint(insertDefinition,overflow,'22003');
      expect((await query(admin,'SELECT * FROM '+definitionTable)).rows).toEqual(before);
    });record({caseId:'CP06',immutable:true});
  });
  it('CP07 full duplicate installer waits on its first exclusive fence and sees changed guard fresh', async () => {
    const left=await identity(admin,lease.user,installerOid),right=await identity(installer,lease.user,installerOid);
    let pending: Promise<string>|undefined;
    try {
      await query(installer,"SET default_transaction_isolation='repeatable read'");
      await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(admin,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      pending=rejected(installer,policyStorage);pendingFenceAttempts.add(pending);
      await poll(async()=> (await query(admin,'SELECT pg_catalog.pg_blocking_pids($1) blockers',[right.pid])).rows[0].blockers.includes(left.pid),'policy_storage_first_fence');
      const wait=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[right.pid])).rows;
      expect(wait).toMatchObject([{state:'active',wait_event_type:'Lock',wait_event:'advisory',blockers:[left.pid]}]);
      await query(admin,'ALTER FUNCTION nevora_tenancy.guard_workspace_incarnation_counter() STRICT');await query(admin,'COMMIT');
      const code=await pending;pendingFenceAttempts.delete(pending);await finishRejected(installer,code,'55000');expect(code).toBe('55000');
      record({caseId:'CP07',wait,code,defaultWasRepeatableRead:true,sourceUsesReadCommitted:true});
    } finally {
      await query(admin,'ROLLBACK');
      if(pending&&pendingFenceAttempts.has(pending)){await pending;pendingFenceAttempts.delete(pending);}
      await query(installer,'ROLLBACK');
      await query(admin,'ALTER FUNCTION nevora_tenancy.guard_workspace_incarnation_counter() CALLED ON NULL INPUT');
      await query(installer,"SET default_transaction_isolation='read committed'");
    } await preserveParent();
  });
  it('CP08 rejects missing or mismatched incarnation definition and implicit installation values', async () => {
    await inRollback(async () => {
      await rejectedSavepoint(insertInstallation,[workspaceId,'1','1',testPolicyId,testRevision],'55000');
      await rejectedSavepoint(insertInstallation,[workspaceId,'2','1',testPolicyId,'9007199254740994'],'55000');
      await rejectedSavepoint(insertInstallation,[workspaceId+'_missing','2','1',testPolicyId,testRevision],'55000');
      await rejectedSavepoint('INSERT INTO '+installationTable+'(workspace_id,workspace_incarnation,policy_id,policy_revision) VALUES($1,2,$2,$3::int8)',[workspaceId,testPolicyId,testRevision],'23502');
      expect(await policyRows()).toEqual([]);
    });record({caseId:'CP08',noDefaults:true});
  });
  it('CP09 binds an explicit installation then rejects noops decreases rekeys and destructive changes', async () => {
    await query(admin,insertInstallation,[workspaceId,'2','9007199254740993',testPolicyId,testRevision]);
    const before=await policyRows();expect(before).toEqual([{workspace_id:workspaceId,incarnation:'2',epoch:'9007199254740993',policy_id:testPolicyId,revision:testRevision}]);
    await inRollback(async () => {
      for(const value of ['9007199254740993','1','0',null])await rejectedSavepoint('UPDATE '+installationTable+' SET installation_epoch=$1::int8',[value],'23514');
      await rejectedSavepoint('UPDATE '+installationTable+' SET workspace_id=$1,installation_epoch=installation_epoch+1',[workspaceId.trim()],'55000');
      await rejectedSavepoint('UPDATE '+installationTable+' SET policy_id=$1,installation_epoch=installation_epoch+1',[testPolicyId.trim()],'55000');
      await rejectedSavepoint('UPDATE '+installationTable+' SET workspace_incarnation=1,installation_epoch=installation_epoch+1',[],'23514');
      await rejectedSavepoint('UPDATE '+installationTable+' SET policy_revision=1,installation_epoch=installation_epoch+1',[],'23514');
      await rejectedSavepoint('DELETE FROM '+installationTable,[],'55000');await rejectedSavepoint('TRUNCATE '+installationTable,[],'55000');
      expect(await policyRows()).toEqual(before);
    });record({caseId:'CP09',before});
  });
  it('CP10 native epoch exhaustion fails without wrap or reseed', async () => {
    await inRollback(async()=>{
      await query(admin,'UPDATE '+installationTable+' SET installation_epoch=9223372036854775807');
      const before=await policyRows();expect(before[0].epoch).toBe('9223372036854775807');
      await rejectedSavepoint('UPDATE '+installationTable+' SET installation_epoch=installation_epoch+1',[],'22003');
      expect(await policyRows()).toEqual(before);record({caseId:'CP10',before,noWrap:true});
    });
  });
  it('CP11 real application worker outsider lack private read and trigger-function privilege', async () => {
    for(const [owned,client] of [[appRole,app],[workerRole,worker],[outsiderRole,outsider]] as const){
      const before=await identity(client,owned.name,owned.oid);
      for(const target of [definitionTable,installationTable])expect(await rejected(client,'SELECT * FROM '+target)).toBe('42501');
      expect(await rejected(client,'SELECT nevora_tenancy.guard_capability_policy_storage()')).toBe('42501');
      expect(await identity(client,owned.name,owned.oid)).toEqual(before);
    }record({caseId:'CP11',nonownersNoGrants:true});
  });
  it('CP12 FORCE RLS hides both controls from their exact nonlogin nonbypass owner', async () => {
    await inRollback(async()=>{
      await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+q(forceOwner.name));
      for(const target of [definitionTable,installationTable])await query(admin,'ALTER TABLE '+target+' OWNER TO '+q(forceOwner.name));
      await query(admin,'SET ROLE '+q(forceOwner.name));
      try{for(const target of [definitionTable,installationTable]){
        expect((await query(admin,'SELECT pg_catalog.row_security_active($1::regclass) active',[target])).rows).toEqual([{active:true}]);
        expect((await query(admin,'SELECT * FROM '+target)).rows).toEqual([]);
      }}finally{await query(admin,'RESET ROLE');}
    });record({caseId:'CP12',ownerRowsExcluded:true,claim:'FORCE_RLS_ROW_EXCLUSION_NOT_PRIVILEGE_ERROR'});
  });
  it('CP13 current counter lock serializes a waiting stale installation update and denies after commit', async () => {
    const before=await policyRows(),left=await identity(admin,lease.user,installerOid),right=await identity(installer,lease.user,installerOid);let pending:Promise<string>|undefined;
    try{
      await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(installer,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(admin,'UPDATE '+table+' SET incarnation=3 WHERE workspace_id=$1',[workspaceId]);
      pending=rejected(installer,'UPDATE '+installationTable+' SET installation_epoch=installation_epoch+1 WHERE workspace_id=$1',[workspaceId]);pendingFenceAttempts.add(pending);
      await poll(async()=> (await query(admin,'SELECT pg_catalog.pg_blocking_pids($1) blockers',[right.pid])).rows[0].blockers.includes(left.pid),'policy_counter_wait');
      const wait=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[right.pid])).rows;
      expect(wait).toMatchObject([{state:'active',wait_event_type:'Lock',blockers:[left.pid]}]);
      await query(admin,'COMMIT');const code=await pending;pendingFenceAttempts.delete(pending);await finishRejected(installer,code,'55000');expect(code).toBe('55000');expect(await policyRows()).toEqual(before);
      record({caseId:'CP13',wait,code,before,after:await policyRows(),counter:await counterRows(),claim:'FRESH_GUARD_EQUALITY_AFTER_WAIT_NOT_COMPLETE_WRITER_ORDER_OR_RECOVERY'});
    }finally{
      await query(admin,'ROLLBACK');if(pending&&pendingFenceAttempts.has(pending)){await pending;pendingFenceAttempts.delete(pending);}await query(installer,'ROLLBACK');
    }
  });

  // Root-owned installed-policy observer extension. The unchanged earlier thirty
  // callbacks remain historical storage checks. Root superuser positive calls
  // exercise observations, never protected runtime invocation or source authority.
  const readInstalledPolicy = 'SELECT nevora_tenancy.read_portal_installed_policy($1::text) observation';
  async function installedPolicyObservation(client = admin, id: string | null = workspaceId) {
    return (await query(client,readInstalledPolicy,[id])).rows[0].observation;
  }
  async function installedPolicyPrerequisiteReject(change: string, expected = '55000') {
    const prerequisite = installedPolicySource.match(/DO \$portal_installed_policy_prerequisites\$[\s\S]*?\$portal_installed_policy_prerequisites\$;/);
    expect(prerequisite).not.toBeNull();
    await inRollback(async()=>{
      await query(admin,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      await query(admin,change); await rejectedSavepoint(prerequisite![0],[],expected);
    });
  }
  it('IP00 installer rejects altered guards constraints defaults RLS triggers and private ACLs', async()=>{
    for(const change of [
      'ALTER FUNCTION nevora_tenancy.guard_capability_policy_storage() STRICT',
      'ALTER TABLE '+definitionTable+' DROP CONSTRAINT capability_policy_definition_revision_check',
      'ALTER TABLE '+installationTable+' ALTER COLUMN installation_epoch SET DEFAULT 1',
      'ALTER TABLE '+definitionTable+' NO FORCE ROW LEVEL SECURITY',
      'ALTER TABLE '+installationTable+' DISABLE TRIGGER workspace_capability_policy_installation_row_guard',
      'GRANT SELECT ON '+definitionTable+' TO '+q(outsiderRole.name),
    ])await installedPolicyPrerequisiteReject(change);
    record({caseId:'IP00',alteredSourcePrerequisitesDenied:6,restored:true});
  });
  it('IP01 installs the exact complete fresh observer without private runtime grants or source adoption', async()=>{
    const code=await rejected(installer,installedPolicySource);
    record({caseId:'IP01',operation:'EXACT_WHOLE_INSTALLED_POLICY_SOURCE_INSTALL',sourceSHA256:hash(installedPolicySource),code});
    if(code!=='NO_ERROR')await query(installer,'ROLLBACK');expect(code).toBe('NO_ERROR');
    await remember('function','nevora_tenancy','read_portal_installed_policy',installerOid,'(text)');
    expect(installer.getTransactionStatus()).toBe('I');await preserveParent();
  });
  it('IP02 observes exact native invoker metadata and rejects a duplicate without effects or failed-transaction replay', async()=>{
    const before=await catalog();const fn=before.functions.find(x=>x.proname==='read_portal_installed_policy');
    expect(fn).toMatchObject({owner:installerOid,prosecdef:false,proretset:false,proconfig:['search_path=pg_catalog'],arg_oids:'25',lanname:'plpgsql'});
    expect(before.expandedAcls.filter(x=>x.oid===fn!.oid).every(x=>x.grantee===installerOid)).toBe(true);
    const code=await rejected(installer,installedPolicySource);try{await finishRejected(installer,code,'42723');}finally{await query(installer,'ROLLBACK');}
    expect(await catalog()).toEqual(before);record({caseId:'IP02',fn,code,noEffects:true});
  });
  it('IP03 emits closed lossless source observations and keeps coherent fictional bytes unauthenticated', async()=>{
    await query(admin,'UPDATE '+installationTable+' SET workspace_incarnation=3,installation_epoch=installation_epoch+1 WHERE workspace_id=$1',[workspaceId]);
    await inRollback(async()=>{
      const next=bundle('9007199254740994');const bytes=Buffer.from((' Fictional π policy bytes; no executing-source authority.\n').repeat(8));
      next[3]=bytes;next[4]=hash(bytes);(next[2] as {canonicalPolicySource:{sha256:string}}).canonicalPolicySource.sha256=hash(bytes);
      await query(admin,insertDefinition,next);await query(admin,'UPDATE '+installationTable+' SET policy_revision=$1::int8,installation_epoch=installation_epoch+1',[next[1]]);
      await query(admin,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);await query(admin,'SET LOCAL search_path=pg_temp,public');
      const observation=await installedPolicyObservation();
      expect(Object.keys(observation).sort()).toEqual(['kind','workspaceId','workspaceIncarnation','installation','definition','verification'].sort());
      expect(observation).toMatchObject({kind:'PORTAL_INSTALLED_POLICY_OBSERVATION_V1',workspaceId,workspaceIncarnation:'3',
        installation:{workspaceId,workspaceIncarnation:'3',installationEpoch:'9007199254740995',policyId:testPolicyId,policyRevision:'9007199254740994'},
        verification:'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION'});
      expect(Object.keys(observation.installation).sort()).toEqual(['workspaceId','workspaceIncarnation','installationEpoch','policyId','policyRevision'].sort());
      expect(Object.keys(observation.definition).sort()).toEqual(['policyId','revision','sourceBundle','sourceBundleWire','canonicalPolicySource','vocabularySource','approvedPRDSource'].sort());
      expect(observation.definition.sourceBundle).toEqual(next[2]);
      for(const [field,offset]of [['canonicalPolicySource',3],['vocabularySource',5],['approvedPRDSource',7]] as const){
        const retained=observation.definition[field],original=next[offset] as Buffer;
        expect(Object.keys(retained).sort()).toEqual(['encoding','bytesBase64','byteLength','sha256'].sort());
        expect(retained.encoding).toBe('UTF8');expect(Buffer.from(retained.bytesBase64,'base64')).toEqual(original);
        expect(retained.byteLength).toBe(String(original.length));expect(retained.sha256).toBe(hash(original));
      }
      expect(observation.definition.canonicalPolicySource.bytesBase64).toContain('\n');
      const wire=observation.definition.sourceBundleWire;expect(Object.keys(wire).sort()).toEqual(['encoding','text','bytesBase64','byteLength','sha256'].sort());
      const nativeBytes=Buffer.from(wire.text,'utf8');expect(JSON.parse(wire.text)).toEqual(next[2]);
      expect(Buffer.from(wire.bytesBase64,'base64')).toEqual(nativeBytes);expect(wire.byteLength).toBe(String(nativeBytes.length));expect(wire.sha256).toBe(hash(nativeBytes));
      record({caseId:'IP03',observation,claim:'NATIVE_SOURCE_OBSERVATION_ONLY_NOT_REVIEWED_OR_EXECUTING_SOURCE_AUTHENTICATION'});
    });
  });
  it('IP04 original fictional application worker outsider cannot invoke the private helper', async()=>{
    for(const [owned,client]of [[appRole,app],[workerRole,worker],[outsiderRole,outsider]] as const){
      const before=await identity(client,owned.name,owned.oid);expect(await rejected(client,readInstalledPolicy,[workspaceId])).toBe('42501');
      expect(await identity(client,owned.name,owned.oid)).toEqual(before);
    }record({caseId:'IP04',noRuntimeEnrollment:true});
  });
  it('IP05 explicitly granted nonbypass NOLOGIN owner seam is denied by zero-policy counter RLS', async()=>{
    await inRollback(async()=>{
      await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+q(forceOwner.name));
      await query(admin,'ALTER FUNCTION nevora_tenancy.read_portal_installed_policy(text) OWNER TO '+q(forceOwner.name));
      await query(admin,'GRANT SELECT ON public.workspaces,'+table+' TO '+q(forceOwner.name));
      await query(admin,'GRANT UPDATE(id) ON public.workspaces TO '+q(forceOwner.name));
      await query(admin,'GRANT UPDATE(workspace_id) ON '+table+' TO '+q(forceOwner.name));
      await query(admin,'SET ROLE '+q(forceOwner.name));
      try{
        const native=(await query(admin,'SELECT pg_catalog.row_security_active($1::regclass) rls,(SELECT rolsuper FROM pg_catalog.pg_roles WHERE rolname=current_user) superuser,(SELECT rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=current_user) bypass',[table])).rows;
        expect(native).toEqual([{rls:true,superuser:false,bypass:false}]);
        await rejectedSavepoint(readInstalledPolicy,[workspaceId],'55000');record({caseId:'IP05',native,claim:'ROOT_SET_ROLE_NEGATIVE_NO_PROTECTED_RUNTIME_ACCESS'});
      }finally{await query(admin,'RESET ROLE');}
    });
  });
  it('IP06 rejects repeatable-read and serializable before accepting any observation', async()=>{
    for(const level of ['REPEATABLE READ','SERIALIZABLE']){
      await query(installer,'BEGIN ISOLATION LEVEL '+level);
      const code=await rejected(installer,readInstalledPolicy,[workspaceId]);try{await finishRejected(installer,code,'55000');}finally{await query(installer,'ROLLBACK');}
      record({caseId:'IP06',level,code});
    }
  });
  it('IP07 refuses NULL normalized missing workspace counter and installation without inserting a replacement', async()=>{
    await inRollback(async()=>{
      for(const id of [null,workspaceId.trim(),workspaceId+'_missing'])await rejectedSavepoint(readInstalledPolicy,[id],'55000');
      // The original 0008 singleton workspace constraint stays operative. Only
      // this root-owned rollback fixture suspends its own private row guards to
      // represent absent initialization rows; no runtime writer or bypass grant.
      await query(admin,'ALTER TABLE '+installationTable+' DISABLE TRIGGER USER');
      await query(admin,'DELETE FROM '+installationTable+' WHERE workspace_id=$1',[workspaceId]);
      await rejectedSavepoint(readInstalledPolicy,[workspaceId],'55000');
      await query(admin,'ALTER TABLE '+table+' DISABLE TRIGGER USER');
      await query(admin,'DELETE FROM '+table+' WHERE workspace_id=$1',[workspaceId]);
      await rejectedSavepoint(readInstalledPolicy,[workspaceId],'55000');
      expect((await query(admin,'SELECT * FROM '+installationTable)).rows).toEqual([]);
      expect(await counterRows()).toEqual([]);
    });record({caseId:'IP07',noReplacementOrNormalization:true,scope:'ROOT_ONLY_PRIVATE_ABSENCE_ROLLBACK_SEAM_ORIGINAL_SINGLETON_UNCHANGED'});
  });
  it('IP08 refuses an unchanged installation after its actual counter advances', async()=>{
    await inRollback(async()=>{
      await query(admin,'UPDATE '+table+' SET incarnation=4 WHERE workspace_id=$1',[workspaceId]);
      await rejectedSavepoint(readInstalledPolicy,[workspaceId],'55000');
    });record({caseId:'IP08',staleIncarnationDenied:true});
  });
  async function waitedPolicyRead(kind:'DEFINITION_EPOCH'|'DEFINITION_REVISION'|'HEAD_EPOCH'|'COUNTER'|'HEAD_ROLLBACK'){
    const left=await identity(admin,lease.user,installerOid),right=await identity(installer,lease.user,installerOid);
    let pending:Promise<{code:string;rows:unknown[]}>|undefined;
    try{
      await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(admin,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      if(kind.startsWith('DEFINITION'))await query(admin,'SELECT policy_id FROM '+definitionTable+' WHERE policy_id=$1 AND revision=$2::int8 FOR UPDATE',[testPolicyId,testRevision]);
      else if(kind==='COUNTER')await query(admin,'UPDATE '+table+' SET incarnation=incarnation+1 WHERE workspace_id=$1',[workspaceId]);
      else await query(admin,'UPDATE '+installationTable+' SET installation_epoch=installation_epoch+1 WHERE workspace_id=$1',[workspaceId]);
      await query(installer,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(installer,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      pending=installer.query(readInstalledPolicy,[workspaceId]).then(r=>({code:'NO_ERROR',rows:r.rows}),e=>({code:sqlstate(e),rows:[]}));pendingFenceAttempts.add(pending);
      await poll(async()=> (await query(admin,'SELECT pg_catalog.pg_blocking_pids($1) blockers',[right.pid])).rows[0].blockers.includes(left.pid),'installed_policy_'+kind);
      const wait=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[right.pid])).rows;
      expect(wait).toMatchObject([{state:'active',wait_event_type:'Lock',blockers:[left.pid]}]);
      if(kind==='DEFINITION_EPOCH')await query(admin,'UPDATE '+installationTable+' SET installation_epoch=installation_epoch+1 WHERE workspace_id=$1',[workspaceId]);
      if(kind==='DEFINITION_REVISION'){
        const next=bundle('9007199254740994');await query(admin,insertDefinition,next);
        await query(admin,'UPDATE '+installationTable+' SET policy_revision=$1::int8,installation_epoch=installation_epoch+1 WHERE workspace_id=$2',[next[1],workspaceId]);
      }
      await query(admin,kind==='HEAD_ROLLBACK'?'ROLLBACK':'COMMIT');const result=await pending;pendingFenceAttempts.delete(pending);
      if(kind==='HEAD_ROLLBACK'){
        expect(result.code).toBe('NO_ERROR');expect(result.rows).toHaveLength(1);await query(installer,'COMMIT');
      }else{await finishRejected(installer,result.code,'55000');expect(result.rows).toEqual([]);}
      record({caseId:'IP_WAIT_'+kind,wait,result,claim:'NATIVE_WAIT_THEN_FRESH_FULL_SELECTED_HEAD_COMPARISON_NOT_PROTECTED_RUNTIME_PROOF'});
    }finally{
      await query(admin,'ROLLBACK');if(pending&&pendingFenceAttempts.has(pending)){await pending;pendingFenceAttempts.delete(pending);}await query(installer,'ROLLBACK');
    }
    if(kind==='DEFINITION_REVISION'){
      // Later fixture cases use the actual new revision, never reset/decrease it.
      expect((await policyRows())[0].revision).toBe('9007199254740994');
    }
    if(kind==='COUNTER')await query(admin,'UPDATE '+installationTable+' SET workspace_incarnation=(SELECT incarnation FROM '+table+' WHERE workspace_id=$1),installation_epoch=installation_epoch+1 WHERE workspace_id=$1',[workspaceId]);
    await preserveParent();
  }
  it('IP09 definition wait refuses the changed epoch instead of silently rebinding',async()=>{await waitedPolicyRead('DEFINITION_EPOCH');});
  it('IP10 head wait refuses the changed epoch after commit',async()=>{await waitedPolicyRead('HEAD_EPOCH');});
  it('IP11 counter wait observes the committed incarnation and refuses the stale head',async()=>{await waitedPolicyRead('COUNTER');});
  it('IP12 head wait accepts the unchanged exact source after writer rollback',async()=>{await waitedPolicyRead('HEAD_ROLLBACK');});
  it('IP13 definition wait refuses replacement revision and retained bytes rather than reselecting',async()=>{await waitedPolicyRead('DEFINITION_REVISION');});
  it('IP14 duplicate installer waits at first exclusive fence and checks changed catalog fresh under RR default',async()=>{
    const left=await identity(admin,lease.user,installerOid),right=await identity(installer,lease.user,installerOid);let pending:Promise<string>|undefined;
    try{
      await query(installer,"SET default_transaction_isolation='repeatable read'");await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');await query(admin,RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      pending=rejected(installer,installedPolicySource);pendingFenceAttempts.add(pending);
      await poll(async()=> (await query(admin,'SELECT pg_catalog.pg_blocking_pids($1) blockers',[right.pid])).rows[0].blockers.includes(left.pid),'installed_policy_first_fence');
      const wait=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[right.pid])).rows;
      expect(wait).toMatchObject([{state:'active',wait_event_type:'Lock',wait_event:'advisory',blockers:[left.pid]}]);
      await query(admin,'ALTER FUNCTION nevora_tenancy.guard_workspace_incarnation_counter() STRICT');await query(admin,'COMMIT');
      const code=await pending;pendingFenceAttempts.delete(pending);await finishRejected(installer,code,'55000');record({caseId:'IP14',wait,code,sessionDefaultWasRR:true,installerSourceRC:true});
    }finally{
      await query(admin,'ROLLBACK');if(pending&&pendingFenceAttempts.has(pending)){await pending;pendingFenceAttempts.delete(pending);}await query(installer,'ROLLBACK');
      await query(admin,'ALTER FUNCTION nevora_tenancy.guard_workspace_incarnation_counter() CALLED ON NULL INPUT');await query(installer,"SET default_transaction_isolation='read committed'");
    }await preserveParent();
  });

  it('IP15 retains exact native base64 boundary formatting including full-triplet terminal newlines',async()=>{
    const observations:unknown[]=[];
    for(const length of [0,1,2,54,55,56,57,58,111,112,113,114,115]){
      const bytes=Buffer.alloc(length,97),plain=bytes.toString('base64'),fullTripletLength=Math.floor(length/3)*4;
      const expected=plain.slice(0,fullTripletLength).replace(/.{76}/g,'$&\n')+plain.slice(fullTripletLength);
      const native=(await query(admin,"SELECT pg_catalog.encode($1::bytea,'base64') encoded,pg_catalog.octet_length($1::bytea)::text byte_length",[bytes])).rows[0];
      expect(native).toEqual({encoded:expected,byte_length:String(length)});
      expect(Buffer.from(native.encoded,'base64')).toEqual(bytes);
      observations.push({inputByteLength:String(length),nativeEncoded:native.encoded,nativeEncodedLength:native.encoded.length,
        terminalLF:native.encoded.endsWith('\n'),lineLengths:native.encoded.split('\n').map((line:string)=>line.length)});
    }
    record({caseId:'IP15',observations,claim:'OWNED_PG18_4_NATIVE_FORMAT_BOUNDARIES_NOT_PROTECTED_WIRE_AUTHENTICATION',
      documentation:'https://www.postgresql.org/docs/18/functions-binarystring.html',
      nativeSource:'https://raw.githubusercontent.com/postgres/postgres/REL_18_STABLE/src/backend/utils/adt/encode.c'});
  });

  afterAll(async () => {
    let cleaned = false;
    const closure: { client: string; status: string | null; closed: boolean }[] = [];
    try {
      // Reconcile exact own pending queries before closing; no foreign cancel,
      // process control, database drop or broad catalog cleanup is permitted.
      if (app && ['T','E'].includes(app.getTransactionStatus() ?? '')) await query(app,'ROLLBACK');
      if (admin && ['T','E'].includes(admin.getTransactionStatus() ?? '')) await query(admin,'ROLLBACK');
      for (const pending of pendingFenceAttempts) { await pending; pendingFenceAttempts.delete(pending); }
      for (const client of clients) if (client !== admin) {
        const status = client.getTransactionStatus() ?? null;
        if (['T','E'].includes(status ?? '')) await query(client,'ROLLBACK');
        await client.end(); closedClients.add(client); closure.push({ client: 'OWN_FIXTURE_CLIENT', status, closed: true });
      }
      if (verified && admin) {
        await query(admin,'RESET ROLE'); await checkBase();
        for (const undo of repairs) { await query(admin,undo); repairs.delete(undo); }
        if (setupCommitted) {
          await preserveParent();
          record({ operation: 'FINAL_NATIVE_SOURCE_BEFORE_EXACT_DROP', objects, catalog: await catalog(), parentRows: await parentRows(), counterRows: installed ? await counterRows() : [], originalParentRows, originalParentCatalog });
        }
        for (const object of [...objects].reverse()) if (!object.dropped) await dropObject(object);
        for (const role of [...roles].reverse()) {
          const found = (await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[role.name])).rows[0];
          if (!found && !setupCommitted) continue;
          expect(found).toEqual({ oid: role.oid });
          if (role.login) await query(admin,'REVOKE CONNECT ON DATABASE ' + q(lease.database) + ' FROM ' + q(role.name));
          await query(admin,'DROP ROLE ' + q(role.name));
          expect((await query(admin,'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2',[role.oid,role.name])).rows).toEqual([]);
          record({ operation: 'EXACT_FICTIONAL_ROLE_DROPPED', ...role });
        }
        expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
        for (const [path,pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
        cleaned = true;
      }
    } finally {
      for (const client of clients) if (!closedClients.has(client)) {
        const status = client.getTransactionStatus() ?? null;
        try { await client.end(); closedClients.add(client); closure.push({ client: client === admin ? 'ADMIN' : 'OWN_FIXTURE_CLIENT', status, closed: true }); }
        catch { closure.push({ client: client === admin ? 'ADMIN' : 'OWN_FIXTURE_CLIENT', status, closed: false }); }
      }
      password = '';
      if (runVerified) writeFileSync(join(runPath!,'incarnation-cleanup.json'), JSON.stringify({ verified, setupCommitted, installed, cleaned, roles, objects, records, closure,
        connectedOrAttemptedClients: clients.size, closedClients: closedClients.size, extraInstallerFenceClients: installer ? 1 : 0,
        pendingRepairs: repairs.size, pendingFenceAttempts: pendingFenceAttempts.size, actualSQLAttempted: sqlAttempted,
        sourceSHA256: hash(source), originalParentSourceSHA256: hash(parentSource), migrationPins,
        claim: 'SPARSE_OWNED_NATIVE_TECHNICAL_STORAGE_ONLY_NOT_FULL_F10_CURRENT_PROOF_RLS_POLICIES_NEON_OR_CUTOVER',
        rootOnlyDatabaseAndPostmasterCleanup: true }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 60000);
});
