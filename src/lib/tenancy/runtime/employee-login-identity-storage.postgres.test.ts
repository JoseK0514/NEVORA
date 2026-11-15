import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import { newEmployeeNumber, normalizeEmployeeNumber } from '../identity';
import { existsSync, appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/employee-login-identity-storage.sql');
let source = ''; // Loaded only after explicit owned opt-in and custody checks.
const parentPath = resolve('db/migrations/0008_workspace_positions.sql');
const parentSource = readFileSync(parentPath, 'utf8');
const employeeSource = readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8');
const expansionSource = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const expectedSourceSHA256 = '4bfb8494d4ee7407a34da9a38bebcc268a3f2ca7ba5a9309d3d441873af6a330';
let sourcePresent = false;
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
const table = 'nevora_tenancy.employee_login_identity';
const functionName = 'guard_employee_login_identity';
const rowGuard = 'employee_login_identity_row_guard';
const truncateGuard = 'employee_login_identity_truncate_guard';
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_ELI_OWNED_LEASE, runPath = process.env.F_ELI_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string; login: boolean };
type OwnObject = { kind: 'schema' | 'table' | 'function' | 'trigger'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; relationOid?: string; dropped: boolean };

// HOLD without explicit root-owned lease+run directory. No discovery, ambient URL,
// startup, constructor side effect or SQL before the opt-in fixture checks.
// Fixture-only minimal workspace parent + exact original employee/control/guard fragments.
// MECHANICAL_STORAGE_NOT_ORIGINAL_POST_CUTOVER_A_B_AUTH. Original singleton
// and global-email source bytes remain pinned but are not installed in this sparse fixture.
describe.skipIf(!leasePath && !runPath)('owned PG18 employee-login-identity storage mechanics only', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, installer: Client;
  let appRole: Role, workerRole: Role, outsiderRole: Role, forceOwner: Role;
  let password = '', installerOid = '', workspaceId = '', verified = false, runVerified = false;
  let installed = false, setupCommitted = false, sqlAttempted = false;
  let parent: OwnObject, employeeParent: OwnObject, counter: OwnObject, contracts: OwnObject, protocol: OwnObject, location: OwnObject;
  let workspaceB = '', employeeA = '', employeeB = '', nullOwnerEmployee = '';
  const exactEmployeeIds: string[] = [];
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
    catch (error) { throw Error('owned_employee_login_identity_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    recordCount++;
    appendFileSync(join(runPath!, 'employee_login_identity-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_employee_login_identity_connection_failed'); }
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
    const condition = namespaceOnly ? "n.nspname='nevora_tenancy'" : "(n.nspname='nevora_tenancy' OR (n.nspname='public' AND c.relname IN ('workspaces','employees','locations')))";
    const schemas = (await query(admin, `SELECT oid::text oid,nspname,nspowner::text owner,nspacl::text acl FROM pg_catalog.pg_namespace
      WHERE nspname='nevora_tenancy' ORDER BY oid`)).rows;
    const relations = (await query(admin, `SELECT c.oid::text oid,n.nspname,c.relname,c.relowner::text owner,c.relkind,c.relpersistence,
      c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid`)).rows;
    const columns = (await query(admin, `SELECT c.oid::text relation_oid,a.attnum,a.attname,a.atttypid::text type_oid,a.atttypmod,
      a.attnotnull,a.attcollation::text collation_oid,a.attndims,a.attnotnull IS TRUE native_notnull,a.atthasdef,a.attidentity,a.attgenerated,a.attacl::text acl,pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_source
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE ${condition} AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.oid,a.attnum`)).rows;
    const constraints = (await query(admin, `SELECT c.oid::text relation_oid,co.oid::text oid,co.conname,co.contype::text contype,co.conkey,
      co.confrelid::text parent_oid,co.confkey,co.confupdtype::text update_action,co.confdeltype::text delete_action,
      co.convalidated,co.conenforced,co.condeferrable,co.condeferred,co.conindid::text index_oid,pg_catalog.pg_get_constraintdef(co.oid,false) definition
      FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE ${condition} ORDER BY c.oid,co.oid`)).rows;
    const indexes = (await query(admin, `SELECT c.oid::text relation_oid,i.indexrelid::text oid,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indislive,i.indimmediate,i.indclass::text opclasses,i.indcollation::text collations,i.indkey::text keys,i.indoption::text options,pg_catalog.pg_get_expr(i.indpred,i.indrelid) predicate,pg_catalog.pg_get_expr(i.indexprs,i.indrelid) expressions,(SELECT ci.reloptions FROM pg_catalog.pg_class ci WHERE ci.oid=i.indexrelid) reloptions,
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
      locations: (await query(admin,'SELECT id FROM '+await nativeName(location)+' ORDER BY id COLLATE pg_catalog."C"')).rows,
      contracts: (await query(admin,'SELECT pg_catalog.to_jsonb(c) row FROM '+await nativeName(contracts)+' c ORDER BY table_name COLLATE pg_catalog."C"')).rows,
      protocol: (await query(admin,'SELECT pg_catalog.to_jsonb(p) row FROM '+await nativeName(protocol)+' p')).rows };
  }
  async function counterRows() {
    return (await query(admin,`SELECT employee_id,workspace_id,employee_number,normalized_number,
      pg_catalog.encode(pg_catalog.convert_to(employee_number,'UTF8'),'hex') raw_hex,
      pg_catalog.encode(pg_catalog.convert_to(normalized_number,'UTF8'),'hex') normalized_hex
      FROM ${table} ORDER BY employee_id COLLATE pg_catalog."C"`)).rows;
  }
  function parentProjection(value: Awaited<ReturnType<typeof catalog>>) {
    return { relations: value.relations.filter(x => [parent.oid,employeeParent.oid].includes(x.oid)), columns: value.columns.filter(x => [parent.oid,employeeParent.oid].includes(x.relation_oid)),
      constraints: value.constraints.filter(x => [parent.oid,employeeParent.oid].includes(x.relation_oid)), indexes: value.indexes.filter(x => [parent.oid,employeeParent.oid].includes(x.relation_oid)),
      // New FK enforcement creates native internal triggers on the parent; these
      // are retained separately, not silently claimed equal to pre-install state.
      noninternalTriggers: value.triggers.filter(x => [parent.oid,employeeParent.oid].includes(x.relation_oid) && !x.tgisinternal),
      columnAcls:value.columnAcls.filter(x=>[parent.oid,employeeParent.oid].includes(x.relation_oid)), acls: value.expandedAcls.filter(x => x.kind === 'TABLE' && [parent.oid,employeeParent.oid].includes(x.oid)) };
  }
  async function preserveParent() {
    expect(await parentRows()).toEqual(originalParentRows);
    expect(parentProjection(await catalog())).toEqual(originalParentCatalog);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
  }
  async function poll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_employee_login_identity_observation_timeout_' + label);
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
    const monitor = client === admin ? installer : admin;
    await poll(async () => (await query(monitor, 'SELECT state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid])).rows[0]?.state === 'idle in transaction (aborted)' && client.getTransactionStatus() === 'E', 'aborted_' + expectedCode);
    const native = (await query(monitor, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pid])).rows[0];
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
      expect(relationLocks.filter(x => x.nspname === 'nevora_tenancy' || [parent.oid,employeeParent.oid].includes(x.oid) ||
        ['pg_namespace','pg_class','pg_attribute','pg_constraint','pg_index','pg_proc','pg_trigger'].includes(x.relname))).toEqual([]);
      expect((await catalog()).relations.some(x => x.relname==='employee_login_identity')).toBe(false);
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
  async function requireArtifact() {
    if (sourcePresent) return;
    const result = await query(installer, source); // Deliberate empty-source own installation attempt.
    const observed = (await query(admin,'SELECT pg_catalog.to_regclass($1)::text installed',[table])).rows;
    record({operation:'MISSING_ARTIFACT_NATIVE_FEATURE_CONTROL',sourcePresent,sourceSHA256:hash(source),command:result.command,observed});
    expect(observed).toEqual([{installed:table}]);
  }
  function oneFragment(bytes:string,pattern:RegExp) {
    const matches=bytes.match(pattern); expect(matches).toHaveLength(1); return matches![0];
  }
  const sourceIdentityFunction=oneFragment(expansionSource,/CREATE FUNCTION nevora_tenancy\.source_identity_guard\(\)[\s\S]*?\$identity_guard\$;/g);
  const sourceFenceFunction=oneFragment(expansionSource,/CREATE FUNCTION nevora_tenancy\.source_write_fence\(\)[\s\S]*?\$write_fence\$;/g);
  const insertSql='INSERT INTO '+table+'(employee_id,workspace_id,employee_number,normalized_number) VALUES($1,$2,$3,$4)';
  const values=(employee:string|null,workspace:string|null,raw:string|null,key:string|null)=>[employee,workspace,raw,key];
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
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:employee-login-identity-storage:'+lease.invocation);
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
    sourcePresent=existsSync(sourcePath); source=sourcePresent?readFileSync(sourcePath,'utf8'):'';
    if(sourcePresent)expect(hash(source)).toBe(expectedSourceSHA256);
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
    record({operation:'EXACT_OWN_ROOT_BASE_VERIFIED',base,testSHA256:hash(readFileSync(resolve('src/lib/tenancy/runtime/employee-login-identity-storage.postgres.test.ts'))),sourceSHA256:hash(source),migrationPins});
    await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      appRole=await role(lease.invocation+'_app',true); workerRole=await role(lease.invocation+'_worker',true);
      outsiderRole=await role(lease.invocation+'_outsider',true); forceOwner=await role(lease.invocation+'_force_owner',false);
      await query(admin,'REVOKE CREATE,TEMPORARY ON DATABASE '+q(lease.database)+' FROM PUBLIC');
      await query(admin,'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin,'GRANT CONNECT ON DATABASE '+q(lease.database)+' TO '+[appRole,workerRole,outsiderRole].map(x=>q(x.name)).join(','));
      await query(admin,'CREATE SCHEMA nevora_tenancy'); await remember('schema','','nevora_tenancy',installerOid);
      await query(admin,'SET LOCAL search_path=public,pg_catalog');
      const minimalWorkspace='CREATE TABLE public.workspaces(id text PRIMARY KEY)';
      const minimalLocation='CREATE TABLE public.locations(id text PRIMARY KEY)';
      await query(admin,minimalWorkspace); parent=await remember('table','public','workspaces',installerOid);
      await query(admin,minimalLocation); location=await remember('table','public','locations',installerOid);
      const employeeFragment=oneFragment(employeeSource,/CREATE TABLE IF NOT EXISTS employees \([\s\S]*?\n\);/g);
      await query(admin,employeeFragment); employeeParent=await remember('table','public','employees',installerOid);
      const employeeAdditive=oneFragment(expansionSource,/ALTER TABLE public\."employees" ADD COLUMN workspace_id text;\nALTER TABLE public\."employees" ADD CONSTRAINT f10_workspace_reference[^\n]*\nALTER TABLE public\."employees" ADD CONSTRAINT f10_tenant_c49de3d265fb[^\n]*/g);
      await query(admin,employeeAdditive);
      const protocolFragment=oneFragment(expansionSource,/CREATE TABLE nevora_tenancy\.expansion_protocol \([\s\S]*?\n\);/g);
      const contractsFragment=oneFragment(expansionSource,/CREATE TABLE nevora_tenancy\.owned_table_contract \([\s\S]*?\n\);/g);
      await query(admin,protocolFragment); protocol=await remember('table','nevora_tenancy','expansion_protocol',installerOid);
      await query(admin,contractsFragment); contracts=await remember('table','nevora_tenancy','owned_table_contract',installerOid);
      const protocolInsert=oneFragment(expansionSource,/INSERT INTO nevora_tenancy\.expansion_protocol\([^\n]*;/g);
      await query(admin,protocolInsert);
      const contractValues=oneFragment(expansionSource,/^INSERT INTO nevora_tenancy\.owned_table_contract VALUES\n[\s\S]*?;$/gm);
      const contractRows=['employees','workspaces'].map(name=>oneFragment(contractValues,new RegExp("^\\('"+name+"',[^\\n]*","gm")).replace(/[,;]$/,''));
      await query(admin,'INSERT INTO nevora_tenancy.owned_table_contract VALUES\n'+contractRows.join(',\n')+';');
      workspaceId=' '+lease.invocation+'_workspace_A '; workspaceB=''; employeeA=' '+lease.invocation+'_employee_A ';
      employeeB=lease.invocation+'_employee_B'; nullOwnerEmployee=lease.invocation+'_employee_NULL';
      exactEmployeeIds.push(employeeA,'',lease.invocation+'_long_'+ 'x'.repeat(4096),'\u00a0straße-2\u00a0',' e\u0301 ','é','00002');
      await query(admin,'INSERT INTO public.workspaces(id) VALUES($1),($2)',[workspaceId,workspaceB]);
      await query(admin,'INSERT INTO public.locations(id) VALUES($1)',[lease.invocation+'_location']);
      for(const [id,workspace] of [...exactEmployeeIds.map(id=>[id,workspaceId]),[employeeB,workspaceB],[nullOwnerEmployee,null]])
        await query(admin,`INSERT INTO public.employees(id,first_name,last_name,phone,email,role,primary_location_id,active,created_at,updated_at,workspace_id)
          VALUES($1,'Fictional','Employee','0000000000',NULL,'EMPLOYEE',$2,false,'2026-10-09T00:00:00.000000Z','2026-10-09T00:00:00.000000Z',$3)`,[id,lease.invocation+'_location',workspace]);
      await query(admin,sourceFenceFunction); await remember('function','nevora_tenancy','source_write_fence',installerOid,'()');
      await query(admin,sourceIdentityFunction); await remember('function','nevora_tenancy','source_identity_guard',installerOid,'()');
      for(const name of ['employees','workspaces']) for(const trigger of ['f10_write_fence','f10_identity_guard']) {
        const fragment=oneFragment(expansionSource,new RegExp('^CREATE TRIGGER '+trigger+'[^\\n]*ON public\\."'+name+'"[^\\n]*;','gm'));
        await query(admin,fragment); await remember('trigger','public',trigger,installerOid,'public.'+name);
      }
      await query(admin,'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'COMMIT'); setupCommitted=true;
      record({operation:'FIXTURE_ONLY_SOURCE_BOUND_PARENT_AND_GUARD_FRAGMENTS',minimalWorkspace,minimalLocation,
        original0008SourceSHA256:hash(parentSource),employeeFragment,employeeFragmentSHA256:hash(employeeFragment),employeeAdditive,
        protocolFragment,contractsFragment,protocolInsert,contractRows,sourceIdentitySHA256:hash(sourceIdentityFunction),sourceFenceSHA256:hash(sourceFenceFunction),
        claim:'MECHANICAL_STORAGE_NOT_ORIGINAL_POST_CUTOVER_A_B_AUTH'});
    } finally { await query(admin,'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I'); }
    originalParentRows=await parentRows(); originalParentCatalog=parentProjection(await catalog());
    app=await connect(appRole.name); worker=await connect(workerRole.name); outsider=await connect(outsiderRole.name); installer=await connect(lease.user);
    writeFileSync(join(runPath!,'employee-login-identity-fixture-custody.json'),JSON.stringify({base,roles,objects,originalParentRows,originalParentCatalog,
      sourceSHA256:hash(source),sourcePresent,migrationPins,expectedClients:5,claim:'EMPTY_NUMBER_STORAGE_FICTIONAL_NATIVE_NO_NORMALIZATION_AUTHENTICATION_ENROLLMENT_LOGIN_OR_ACTIVATION'},null,2),{flag:'wx',mode:0o600});
  },60000);
  it('EL01 missing schema and missing source parents deny without adoption',async()=>{
    await requireArtifact();
    const shadow=lease.invocation+'_schema_shadow';
    await ownMutation(async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy RENAME TO '+q(shadow));},
      async()=>{await query(admin,'ALTER SCHEMA '+q(shadow)+' RENAME TO nevora_tenancy');},async()=>{await installReject('3F000');});
    for(const name of ['workspaces','employees']) {
      const renamed=lease.invocation+'_'+name+'_shadow';
      await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' RENAME TO '+q(renamed));},
        async()=>{await query(admin,'ALTER TABLE public.'+q(renamed)+' RENAME TO '+q(name));},async()=>{await installReject('55000');});
    }
    await preserveParent();
  },30000);
  it('EL02 foreign ownership malformed physical keys and source defaults deny with exact restoration',async()=>{
    await requireArtifact();
    await ownMutation(async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));},
      async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user));},async()=>{await installReject('42501');});
    for(const name of ['workspaces','employees']) {
      await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' OWNER TO '+q(outsiderRole.name));},
        async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' OWNER TO '+q(lease.user));},async()=>{await installReject('55000');});
      const renamed=lease.invocation+'_'+name+'_original'; let temporary:OwnObject|undefined;
      const before=await catalog(),rows=await parentRows();
      const originalIndex=name==='employees'?(await catalog()).indexes.find(x=>x.relation_oid===employeeParent.oid&&x.indisprimary):undefined;
      const indexShadow=lease.invocation+'_employee_pk_original';
      const restore='ALTER TABLE public.'+q(renamed)+' RENAME TO '+q(name); repairs.add(restore);
      await query(admin,'ALTER TABLE public.'+q(name)+' RENAME TO '+q(renamed));
      try {
        if(originalIndex)await query(admin,'ALTER INDEX public.employees_pkey RENAME TO '+q(indexShadow));
        await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
        try {
          await query(admin,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text); await query(admin,'SET LOCAL search_path=public,pg_catalog');
          await query(admin,name==='workspaces'?'CREATE TABLE public.workspaces(id varchar(128) NOT NULL)':oneFragment(employeeSource,/CREATE TABLE IF NOT EXISTS employees \([\s\S]*?\n\);/g));
          await query(admin,'COMMIT');
        } finally {await query(admin,'ROLLBACK');}
        temporary=await remember('table','public',name,installerOid); await installReject('55000');
      } finally {
        if(temporary&&!temporary.dropped)await dropObject(temporary);
        if(originalIndex)await query(admin,'ALTER INDEX public.'+q(indexShadow)+' RENAME TO employees_pkey');
        await query(admin,restore);repairs.delete(restore);
      }
      expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before)); expect(await parentRows()).toEqual(rows);
    }
    await ownMutation(async()=>{await query(admin,'ALTER TABLE public.employees RENAME CONSTRAINT f10_tenant_c49de3d265fb TO own_wrong_candidate');},
      async()=>{await query(admin,'ALTER TABLE public.employees RENAME CONSTRAINT own_wrong_candidate TO f10_tenant_c49de3d265fb');},async()=>{await installReject('55000');});
    await ownMutation(async()=>{await query(admin,"ALTER TABLE public.employees ALTER COLUMN id SET DEFAULT 'fixture-default'");},
      async()=>{await query(admin,'ALTER TABLE public.employees ALTER COLUMN id DROP DEFAULT');},async()=>{await installReject('55000');});
    await preserveParent();
  },45000);
  it('EL03 exact source guard bodies enabled routes and dropped route deny',async()=>{
    await requireArtifact();
    const replacement=sourceIdentityFunction.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('$identity_guard$;','\n-- own fictional body drift\n$identity_guard$;');
    await ownMutation(async()=>{await query(admin,replacement);},async()=>{await query(admin,sourceIdentityFunction.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));},async()=>{await installReject('55000');});
    for(const name of ['workspaces','employees'])for(const trigger of ['f10_identity_guard','f10_write_fence'])
      await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' DISABLE TRIGGER '+q(trigger));},
        async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' ENABLE TRIGGER '+q(trigger));},async()=>{await installReject('55000');});
    // Negative-only outer transaction: never installation success/transaction ownership proof.
    // Real DROP is rolled back, restoring the ORIGINAL trigger OID and definition.
    const before=await catalog(),rows=await parentRows();
    await query(admin,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      const original=before.triggers.find(x=>x.relation_oid===employeeParent.oid&&x.tgname==='f10_identity_guard')!;
      await query(admin,'DROP TRIGGER f10_identity_guard ON public.employees');
      record({caseId:'EL03',operation:'ROLLBACK_ONLY_EXACT_SOURCE_ROUTE_DROP',original});
      const code=await rejected(admin,source); await finishRejected(admin,code,'55000');
    } finally {await query(admin,'ROLLBACK');}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));expect(await parentRows()).toEqual(rows);await preserveParent();
  },45000);
  it('EL04 captured anchors and registry bindings reject invented source ancestry',async()=>{
    await requireArtifact();
    const anchor=originalParentRows.contracts.find(x=>x.row.table_name==='employees')!.row.anchor;
    await ownMutation(async()=>{await query(admin,"UPDATE nevora_tenancy.owned_table_contract SET anchor='{}'::jsonb WHERE table_name='employees'");},
      async()=>{await query(admin,"UPDATE nevora_tenancy.owned_table_contract SET anchor=$1::jsonb WHERE table_name='employees'",[JSON.stringify(anchor)]);},async()=>{await installReject('55000');});
    const registry=originalParentRows.protocol[0].row.registry_sha256 as string;
    await ownMutation(async()=>{await query(admin,'UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=$1',['0'.repeat(64)]);},
      async()=>{await query(admin,'UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=$1',[registry]);},async()=>{await installReject('55000');});
    await preserveParent();
  },30000);
  it('EL05 any guard overload and ambient named default grants deny atomically',async()=>{
    await requireArtifact();const before=await catalog();let overload:OwnObject|undefined;
    try {
      await query(admin,"CREATE FUNCTION nevora_tenancy.guard_employee_login_identity(text) RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS 'SELECT $1'");
      overload=await remember('function','nevora_tenancy',functionName,installerOid,'(text)');await installReject('42723');
    } finally {if(overload&&!overload.dropped)await dropObject(overload);}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));
    for(const kind of ['TABLES','FUNCTIONS']) {
      const defaults=async()=>(await query(admin,`SELECT oid::text oid,defaclrole::text owner,defaclnamespace::text namespace,defaclobjtype::text type,defaclacl::text acl
        FROM pg_catalog.pg_default_acl WHERE defaclrole=$1::oid ORDER BY oid`,[installerOid])).rows;
      const oldDefaults=await defaults(),grant=kind==='TABLES'?'TRIGGER,TRUNCATE':'EXECUTE';
      try {
        await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy GRANT '+grant+' ON '+kind+' TO '+q(outsiderRole.name));
        record({caseId:'EL05',kind,nativeDefaults:await defaults()});await installReject('42501');
      } finally {await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy REVOKE '+grant+' ON '+kind+' FROM '+q(outsiderRole.name));}
      expect(await defaults()).toEqual(oldDefaults);
    }
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await preserveParent();
  },30000);
  it('EL06 whole installer waits first and sees fresh owner denial then installs under RR session default',async()=>{
    await requireArtifact();const before=await catalog();
    const restore='ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user);repairs.add(restore);
    try {await fenceAttempt(false,async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));});}
    finally {await query(admin,restore);repairs.delete(restore);}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));
    await fenceAttempt(false,undefined,true);
    counter=await remember('table','nevora_tenancy','employee_login_identity',installerOid);
    await remember('function','nevora_tenancy',functionName,installerOid,'()');
    await remember('trigger','nevora_tenancy',rowGuard,installerOid,table);
    await remember('trigger','nevora_tenancy',truncateGuard,installerOid,table);
    installed=true;await preserveParent();
  },45000);
  it('EL07 empty four-field native shape exact keys RLS INVOKER and closed ACL plus duplicate refusal',async()=>{
    await requireArtifact();expect(installed).toBe(true);const native=await catalog();
    expect(await counterRows()).toEqual([]);
    expect(native.relations.find(x=>x.oid===counter.oid)).toMatchObject({relkind:'r',relpersistence:'p',relrowsecurity:true,relforcerowsecurity:true,owner:installerOid});
    const columns=native.columns.filter(x=>x.relation_oid===counter.oid);
    expect(columns.map(x=>x.attname)).toEqual(['employee_id','workspace_id','employee_number','normalized_number']);
    for(const column of columns)expect(column).toMatchObject({type_oid:'25',atttypmod:-1,attndims:0,attnotnull:true,atthasdef:false,attidentity:'',attgenerated:'',default_source:null});
    const c=(await query(admin,"SELECT oid::text oid FROM pg_catalog.pg_collation WHERE oid='pg_catalog.\"C\"'::regcollation")).rows[0].oid;
    expect(columns[3].collation_oid).toBe(c);
    const keys=native.constraints.filter(x=>x.relation_oid===counter.oid);
    expect(keys.filter(x=>x.contype==='p').map(x=>x.conkey)).toEqual([[1]]);
    expect(keys.filter(x=>x.contype==='u').map(x=>x.conkey)).toEqual([[2,4]]);
    expect(keys.filter(x=>x.contype==='f').map(x=>({keys:x.conkey,parent:x.parent_oid,parentKeys:x.confkey,update:x.update_action,delete:x.delete_action,validated:x.convalidated,deferrable:x.condeferrable})))
      .toEqual([{keys:[2],parent:parent.oid,parentKeys:[1],update:'r',delete:'r',validated:true,deferrable:false},{keys:[2,1],parent:employeeParent.oid,parentKeys:[11,1],update:'r',delete:'r',validated:true,deferrable:false}]);
    for(const index of native.indexes.filter(x=>x.relation_oid===counter.oid))expect(index).toMatchObject({indisunique:true,indisvalid:true,indisready:true,indislive:true,indimmediate:true,predicate:null,expressions:null,reloptions:null});
    const guard=native.functions.find(x=>x.proname===functionName)!;
    expect(guard).toMatchObject({owner:installerOid,prosecdef:false,proconfig:['search_path=pg_catalog'],return_oid:'2279',arg_oids:'',proretset:false,lanname:'plpgsql'});
    const body=(await query(admin,'SELECT prosrc FROM pg_catalog.pg_proc WHERE oid=$1::oid',[guard.oid])).rows[0].prosrc;
    expect(hash(body)).toBe(hash(source.split('$employee_login_identity_guard$')[1]));
    expect(native.triggers.filter(x=>x.relation_oid===counter.oid&&!x.tgisinternal).map(x=>({name:x.tgname,type:x.tgtype,enabled:x.tgenabled,function:x.function_oid})))
      .toEqual([{name:rowGuard,type:27,enabled:'O',function:guard.oid},{name:truncateGuard,type:34,enabled:'O',function:guard.oid}]);
    expect(native.policies.filter(x=>x.relation_oid===counter.oid)).toEqual([]);
    expect(native.columnAcls.filter(x=>x.relation_oid===counter.oid)).toEqual([]);
    expect(native.expandedAcls.filter(x=>(x.kind==='SCHEMA'||x.oid===counter.oid||x.oid===guard.oid)&&x.grantee!==installerOid)).toEqual([]);
    record({caseId:'EL07',native,guardBodySHA256:hash(body),mappingRows:await counterRows(),claim:'EMPTY_STORAGE_ONLY_NOT_AUTHORITY'});
    await installReject('42P07');await preserveParent();
  },30000);
  it('EL08 simultaneous A B number namespace inactive collision global alias mixed FK and null boundaries',async()=>{
    await requireArtifact();expect(installed).toBe(true);
    await inRollback(async()=>{
      const raw=' 002 ',key=normalizeEmployeeNumber(raw);
      await query(admin,insertSql,values(employeeA,workspaceId,raw,key));await query(admin,insertSql,values(employeeB,workspaceB,raw,key));
      const mapped=await counterRows();expect(mapped.map(x=>[x.employee_id,x.workspace_id,x.employee_number,x.normalized_number])).toEqual([[employeeA,workspaceId,raw,'002'],[employeeB,workspaceB,raw,'002']].sort((a,b)=>Buffer.compare(Buffer.from(a[0]),Buffer.from(b[0]))));
      expect((await query(admin,'SELECT id,active FROM public.employees WHERE id=ANY($1::text[]) ORDER BY id COLLATE pg_catalog."C"',[[employeeA,employeeB]])).rows.every(x=>x.active===false)).toBe(true);
      await rejectedSavepoint(insertSql,values(exactEmployeeIds[1],workspaceId,'002','002'),'23505');
      await rejectedSavepoint(insertSql,values(employeeA,workspaceId,'other','OTHER'),'23505');
      await rejectedSavepoint(insertSql,values(exactEmployeeIds[2],workspaceB,'3','3'),'23503');
      await rejectedSavepoint(insertSql,values(nullOwnerEmployee,workspaceId,'4','4'),'23503');
      await rejectedSavepoint(insertSql,values('missing_employee',workspaceId,'5','5'),'23503');
      await rejectedSavepoint(insertSql,values(exactEmployeeIds[2],'missing_workspace','6','6'),'23503');
      for(let field=0;field<4;field++){const input=values(exactEmployeeIds[2],workspaceId,'7','7');input[field]=null;await rejectedSavepoint(insertSql,input,'23502');}
      await rejectedSavepoint(insertSql,values(exactEmployeeIds[2],workspaceId,'','7'),'23514');
      await rejectedSavepoint(insertSql,values(exactEmployeeIds[2],workspaceId,'7',''),'23514');
      record({caseId:'EL08',mapped,sourceRows:await parentRows(),claim:'MECHANICAL_STORAGE_NOT_ORIGINAL_POST_CUTOVER_A_B_AUTH'});
    });
  },30000);
  it('EL09 captured JS legacy Unicode preimages zero padding long values and no implicit SQL normalization',async()=>{
    await requireArtifact();expect(installed).toBe(true);
    await inRollback(async()=>{
      const selected=exactEmployeeIds.slice(2);
      const expected=[selected[0].trim().toUpperCase(),'STRASSE-2','E\u0301','É','00002'];
      for(let i=0;i<selected.length;i++){
        const raw=selected[i],normalized=normalizeEmployeeNumber(raw);expect(normalized).toBe(expected[i]);
        await query(admin,insertSql,values(raw,workspaceId,raw,normalized));
        const stored=(await query(admin,'SELECT employee_number,normalized_number FROM '+table+' WHERE employee_id=$1',[raw])).rows;
        expect(stored).toEqual([{employee_number:raw,normalized_number:normalized}]);
      }
      expect(newEmployeeNumber('é')).toBeNull();expect(newEmployeeNumber('ß')).toBe('SS');
      expect(newEmployeeNumber('A'.repeat(128))).toBe('A'.repeat(128));expect(newEmployeeNumber('A'.repeat(129))).toBeNull();
      const distinct=(await query(admin,'SELECT normalized_number,pg_catalog.encode(pg_catalog.convert_to(normalized_number,\'UTF8\'),\'hex\') wire FROM '+table+' WHERE employee_id=ANY($1::text[]) ORDER BY normalized_number COLLATE pg_catalog."C"',[[' e\u0301 ','é']])).rows;
      expect(distinct.map(x=>x.wire)).toEqual(['45cc81','c389']);
      // Deliberately noncanonical supplied key proves STORAGE does not issue/verify a normalization preimage.
      await query(admin,insertSql,values(employeeB,workspaceB,'straße','STRAẞE'));
      expect((await query(admin,'SELECT employee_number,normalized_number FROM '+table+' WHERE employee_id=$1',[employeeB])).rows).toEqual([{employee_number:'straße',normalized_number:'STRAẞE'}]);
      record({caseId:'EL09',mappingRows:await counterRows(),normalizerSourceSHA256:hash(readFileSync(resolve('src/lib/tenancy/identity.ts'))),claim:'EXPLICIT_PREIMAGE_STORAGE_REQUIRES_SEPARATE_CONTROLLED_NORMALIZATION_ENROLLMENT'});
    });
  },30000);
  it('EL10 all identity fields immutable no alias deletion truncation or referenced employment deletion',async()=>{
    await requireArtifact();expect(installed).toBe(true);
    await inRollback(async()=>{
      await query(admin,insertSql,values(employeeA,workspaceId,'2','2'));
      const original=await counterRows();
      for(const [column,next] of [['employee_id',employeeB],['workspace_id',workspaceB],['employee_number',' 2'],['normalized_number','02']]){
        await rejectedSavepoint('UPDATE '+table+' SET '+q(column)+'=$1 WHERE employee_id=$2',[next,employeeA],'55000');expect(await counterRows()).toEqual(original);
      }
      await query(admin,'UPDATE '+table+' SET employee_number=employee_number WHERE employee_id=$1',[employeeA]);expect(await counterRows()).toEqual(original);
      await rejectedSavepoint('DELETE FROM '+table+' WHERE employee_id=$1',[employeeA],'55000');
      await rejectedSavepoint('TRUNCATE '+table,[],'55000');
      await rejectedSavepoint('DELETE FROM public.employees WHERE id=$1',[employeeA],'23001');
      expect(await counterRows()).toEqual(original);
    });
  },30000);
  it('EL11 original runtime LOGINS deny and FORCE RLS denies even a nonbypass owner under explicit fixture grants',async()=>{
    await requireArtifact();expect(installed).toBe(true);
    for(const [client,principal] of [[app,appRole],[worker,workerRole],[outsider,outsiderRole]] as const){
      const original=await identity(client,principal.name,principal.oid);
      const native=(await query(admin,'SELECT rolcanlogin,rolsuper,rolbypassrls,rolinherit FROM pg_catalog.pg_roles WHERE oid=$1::oid',[principal.oid])).rows[0];
      expect(native).toEqual({rolcanlogin:true,rolsuper:false,rolbypassrls:false,rolinherit:false});
      for(const text of ['SELECT * FROM '+table,'TRUNCATE '+table,'ALTER TABLE '+table+' DISABLE ROW LEVEL SECURITY','DROP TABLE '+table,'SELECT nevora_tenancy.guard_employee_login_identity()'])expect(await rejected(client,text)).toBe('42501');
      expect(await rejected(client,insertSql,values(employeeA,workspaceId,'2','2'))).toBe('42501');expect(await identity(client,principal.name,principal.oid)).toEqual(original);
    }
    await inRollback(async()=>{
      await query(admin,insertSql,values(employeeA,workspaceId,'2','2'));
      await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+q(forceOwner.name));
      await query(admin,'ALTER TABLE '+table+' OWNER TO '+q(forceOwner.name));
      await query(admin,'SET LOCAL ROLE '+q(forceOwner.name));
      expect((await query(admin,'SELECT count(*)::text count FROM '+table)).rows).toEqual([{count:'0'}]);
      await rejectedSavepoint(insertSql,values(employeeB,workspaceB,'3','3'),'42501');
      expect((await query(admin,'UPDATE '+table+' SET employee_number=employee_number')).rowCount).toBe(0);
      expect((await query(admin,'DELETE FROM '+table)).rowCount).toBe(0);
      await rejectedSavepoint('TRUNCATE '+table,[],'55000');
      await query(admin,'RESET ROLE');expect(await counterRows()).toHaveLength(1);
      record({caseId:'EL11',forceOwner,nativeOriginalLoginDenials:true,claim:'ROLLBACK_ONLY_RLS_OWNER_SEAM_NOT_RUNTIME_AUTHENTICATION_OR_BYPASS_ROLE_SAFETY'});
    });
  },30000);
  it('EL12 original singleton email uniqueness and FENCED source controls remain independently retained',async()=>{
    await requireArtifact();expect(installed).toBe(true);
    const workspaceFragment=oneFragment(parentSource,/CREATE TABLE workspaces \([\s\S]*?\n\);/g);
    const emailIndexFragment=oneFragment(employeeSource,/CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique\n[\s\S]*?WHERE email IS NOT NULL;/g);
    let probe:OwnObject|undefined;
    await inRollback(async()=>{
      await query(admin,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      await query(admin,'ALTER TABLE public.workspaces RENAME TO '+q(lease.invocation+'_original_workspaces'));
      await query(admin,'ALTER INDEX public.workspaces_pkey RENAME TO '+q(lease.invocation+'_original_workspace_pk'));
      await query(admin,'SET LOCAL search_path=public,pg_catalog');
      await query(admin,workspaceFragment);probe=await remember('table','public','workspaces',installerOid);
      await query(admin,"INSERT INTO public.workspaces(id,name,time_zone) VALUES('first','Fictional one','America/Puerto_Rico')");
      await rejectedSavepoint("INSERT INTO public.workspaces(id,name,time_zone) VALUES('second','Fictional two','America/Puerto_Rico')",[],'23505');
      record({caseId:'EL12',operation:'EXACT_ORIGINAL_SINGLETON_FRAGMENT_NATIVE_CONTROL',workspaceFragment,workspaceSourceSHA256:hash(parentSource),probe,rows:(await query(admin,'SELECT pg_catalog.to_jsonb(w) row FROM public.workspaces w')).rows});
    });
    expect(probe).toBeDefined();expect((await query(admin,'SELECT oid FROM pg_catalog.pg_class WHERE oid=$1::oid',[probe!.oid])).rows).toEqual([]);probe!.dropped=true;record({operation:'ROLLBACK_ONLY_PROBE_EXACT_OID_ABSENT',...probe});
    await inRollback(async()=>{
      await query(admin,'SET LOCAL search_path=public,pg_catalog');await query(admin,emailIndexFragment);
      const rows=await query(admin,`INSERT INTO public.employees(id,first_name,last_name,phone,email,role,primary_location_id,active,workspace_id)
        VALUES($1,'Fictional','Email','0000000000','Same@fictional.invalid','EMPLOYEE',$2,false,$3) RETURNING id,email`,[lease.invocation+'_email_A',lease.invocation+'_location',workspaceId]);
      await rejectedSavepoint(`INSERT INTO public.employees(id,first_name,last_name,phone,email,role,primary_location_id,active,workspace_id)
        VALUES($1,'Fictional','Email','0000000000','same@fictional.invalid','EMPLOYEE',$2,false,$3)`,[lease.invocation+'_email_B',lease.invocation+'_location',workspaceB],'23505');
      record({caseId:'EL12',operation:'EXACT_ORIGINAL_GLOBAL_EMAIL_INDEX_NATIVE_CONTROL',emailIndexFragment,emailSourceSHA256:hash(employeeSource),firstRows:rows.rows});
    });
    await inRollback(async()=>{
      await query(admin,"UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED' WHERE migration_id=26");
      await rejectedSavepoint(`INSERT INTO public.employees(id,first_name,last_name,phone,role,primary_location_id,workspace_id)
        VALUES($1,'Fictional','Fenced','0000000000','EMPLOYEE',$2,$3)`,[lease.invocation+'_fenced',lease.invocation+'_location',workspaceId],'55000');
      await rejectedSavepoint('UPDATE public.employees SET active=true WHERE id=$1',[employeeA],'55000');
      record({caseId:'EL12',operation:'ORIGINAL_FENCED_SOURCE_INSERT_AND_UPDATE_DENIED',protocol:(await parentRows()).protocol,claim:'NO_BACKFILL_OR_ORDINARY_WRITER_BYPASS'});
    });
    await preserveParent();
  },45000);
  afterAll(async()=>{
    let cleaned=false;
    const closure:{client:string;status:string|null;finalStatus:string|null;closed:boolean}[]=[];
    try {
      // Every connection is invocation-owned. Always reconcile each transaction
      // with ROLLBACK rather than trusting the driver's immediate cached status.
      if(verified&&admin) await query(admin,'ROLLBACK');
      if(app) await query(app,'ROLLBACK');
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
          record({operation:'FINAL_NATIVE_ORIGINALS_AND_METADATA_BEFORE_EXACT_DROP',objects,catalog:await catalog(),parentRows:await parentRows(),identityMappings:installed?await counterRows():[],originalParentRows,originalParentCatalog});
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
        expect(existsSync(sourcePath)).toBe(sourcePresent); if(sourcePresent)expect(hash(readFileSync(sourcePath))).toBe(expectedSourceSHA256);
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
        const path=join(runPath!,'employee_login_identity-operations.jsonl');
        const bytes=recordCount?readFileSync(path):Buffer.alloc(0);
        const fullUtf8=bytes.toString('utf8'); expect(Buffer.from(fullUtf8,'utf8')).toEqual(bytes);
        const lines=fullUtf8?fullUtf8.split('\n'):[]; if(fullUtf8)expect(lines.pop()).toBe('');
        expect(lines).toHaveLength(recordCount); for(const line of lines)JSON.parse(line);
        writeFileSync(join(runPath!,'employee-login-identity-cleanup.json'),JSON.stringify({verified,setupCommitted,installed,cleaned,roles,objects,closure,
          connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingRepairs:repairs.size,pendingFenceAttempts:pendingFenceAttempts.size,actualSQLAttempted:sqlAttempted,
          sourceSHA256:hash(source),sourcePresent,expectedCandidateSourceSHA256:expectedSourceSHA256,originalParentSourceSHA256:hash(parentSource),migrationPins,
          completeHistoricalJsonl:{path,sha256:hash(bytes),bytes:bytes.byteLength,recordCount,utf8Verified:true,referenceOnly:true},
          provenance:'APPEND_ONLY_JSONL_EARLIER_DROPPED_FALSE_OBSERVATIONS_AND_FINAL_OBJECT_DROPPED_TRUE_ARE_DISTINCT_NOT_BYTE_EQUIVALENT',
          claim:'MECHANICAL_STORAGE_NOT_ORIGINAL_POST_CUTOVER_A_B_AUTH_NO_LOOKUP_ENROLLMENT_SESSION_CURRENT_PROOF_NEON_OR_F10_COMPLETE',rootOnlyDatabaseAndPostmasterCleanup:true},null,2),{flag:'wx',mode:0o600});
      }
    }
  },60000);
});
