import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { Client } from 'pg';
import {CAPABILITIES} from '../../capabilities/types';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sourcePath = resolve('src/lib/tenancy/runtime/portal-administrative-authority-storage.sql');
let source = ''; // Loaded only after explicit owned opt-in and custody checks.
const parentPath = resolve('db/migrations/0008_workspace_positions.sql');
const parentSource = readFileSync(parentPath, 'utf8');
const employeeSource = readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8');
const expansionSource = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const expectedSourceSHA256 = '06d78b8e7e6118109312d07d48d56231266b38853bcdd8792e1e298836af42a4';
const expectedSourceTestSHA256 = 'f69b5ac35b691d981cc82b43ff70c4ae2a94f86cf50711aa4ff2592a79d1a105';
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
const functionName = 'guard_portal_administrative_authority';
const childTables=['nevora_tenancy.portal_administrative_capability','nevora_tenancy.portal_administrative_location'] as const;
const allTables=[table,...childTables] as const;
const portalSourcePath=resolve('src/lib/tenancy/runtime/portal-authority-storage.sql');
const expectedPortalSHA256='e8afeff01d13775eeecd462e7a6e2bb662e1279ce44fd3ded2b383e34821a094';
let portalSource='';
const communicationSource=readFileSync(resolve('db/migrations/0024_contextual_communications.sql'),'utf8');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const leasePath = process.env.F_PA_OWNED_LEASE, runPath = process.env.F_PA_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string; login: boolean };
type OwnObject = { kind: 'schema' | 'table' | 'function' | 'trigger'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; relationOid?: string; dropped: boolean };

// HOLD without explicit root-owned lease+run directory. No discovery, ambient URL,
// startup, constructor side effect or SQL before the opt-in fixture checks.
// Fixture-only minimal workspace parent + exact original location/employment/control/guard fragments and accepted private portal artifact.
// Native fictional A/B storage controls are NOT full68/cutover/application isolation.
describe.skipIf(!leasePath && !runPath)('owned PG18 empty portal-administrative-authority storage only', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, installer: Client;
  let appRole: Role, workerRole: Role, outsiderRole: Role, forceOwner: Role;
  let password = '', installerOid = '', workspaceId = '', verified = false, runVerified = false;
  let installed = false, setupCommitted = false, sqlAttempted = false;
  let parent: OwnObject, employeeParent: OwnObject, schema: OwnObject, counter: OwnObject, contracts: OwnObject, protocol: OwnObject, location: OwnObject, portalParent: OwnObject;
  let workspaceB = '', employeeA = '', employeeB = '', nullOwnerEmployee = '';
  const exactEmployeeIds: string[] = [],exactLocationIds:string[]=[];
  let locationA='',locationB='';
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
    catch (error) { throw Error('owned_portal_administrative_authority_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; }
    catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) {
    recordCount++;
    appendFileSync(join(runPath!, 'portal_administrative_authority-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database,
      user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_portal_administrative_authority_connection_failed'); }
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
    const condition = namespaceOnly ? "n.nspname='nevora_tenancy'" : "(n.nspname='nevora_tenancy' OR (n.nspname='public' AND c.relname IN ('workspaces','employees','locations')))";
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
      locations: (await query(admin,'SELECT id,workspace_id,pg_catalog.to_jsonb(l) native_row FROM '+await nativeName(location)+' l ORDER BY id COLLATE pg_catalog."C"')).rows,
      portal: portalParent?(await query(admin,'SELECT workspace_id,employee_id,authorization_version::text authorization_version,portal_access_version::text portal_access_version,capability_policy_revision::text capability_policy_revision,portal_state,proof_provenance,provenance_reference FROM '+await nativeName(portalParent)+' ORDER BY workspace_id COLLATE pg_catalog."C",employee_id COLLATE pg_catalog."C"')).rows:[],
      contracts: (await query(admin,'SELECT pg_catalog.to_jsonb(c) row FROM '+await nativeName(contracts)+' c ORDER BY table_name COLLATE pg_catalog."C"')).rows,
      protocol: (await query(admin,'SELECT pg_catalog.to_jsonb(p) row FROM '+await nativeName(protocol)+' p')).rows };
  }
  async function counterRows() {
    return {headers:(await query(admin,'SELECT workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision::text capability_policy_revision FROM '+table+' ORDER BY workspace_id COLLATE pg_catalog."C",employee_id COLLATE pg_catalog."C"')).rows,
      capabilities:(await query(admin,'SELECT workspace_id,employee_id,capability FROM '+childTables[0]+' ORDER BY workspace_id COLLATE pg_catalog."C",employee_id COLLATE pg_catalog."C",capability COLLATE pg_catalog."C"')).rows,
      locations:(await query(admin,'SELECT workspace_id,employee_id,location_id FROM '+childTables[1]+' ORDER BY workspace_id COLLATE pg_catalog."C",employee_id COLLATE pg_catalog."C",location_id COLLATE pg_catalog."C"')).rows};
  }
  function parentProjection(value: Awaited<ReturnType<typeof catalog>>) {
    // Expanded ACLs retain exact grantees/privileges while treating native NULL
    // versus empty ACL after an own GRANT/REVOKE as the same effective closure.
    // Raw catalog observations remain retained separately in the JSONL evidence.
    value=canonicalAcl(value);
    return { relations: value.relations.filter(x => [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.oid)), columns: value.columns.filter(x => [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.relation_oid)),
      constraints: value.constraints.filter(x => [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.relation_oid)), indexes: value.indexes.filter(x => [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.relation_oid)),
      // New FK enforcement creates native internal triggers on the parent; these
      // are retained separately, not silently claimed equal to pre-install state.
      noninternalTriggers: value.triggers.filter(x => [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.relation_oid) && !x.tgisinternal),
      columnAcls:value.columnAcls.filter(x=>[parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.relation_oid)), acls: value.expandedAcls.filter(x => x.kind === 'TABLE' && [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.oid)) };
  }
  async function preserveParent() {
    expect(await parentRows()).toEqual(originalParentRows);
    expect(parentProjection(await catalog())).toEqual(originalParentCatalog);
    for (const [path, pin] of Object.entries(migrationPins)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
  }
  async function poll(predicate: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < deadline);
    throw Error('owned_portal_administrative_authority_observation_timeout_' + label);
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
      expect(relationLocks.filter(x => x.nspname === 'nevora_tenancy' || [parent.oid,employeeParent.oid,location.oid,portalParent.oid].includes(x.oid) ||
        ['pg_namespace','pg_class','pg_attribute','pg_constraint','pg_index','pg_proc','pg_trigger'].includes(x.relname))).toEqual([]);
      expect((await catalog()).relations.some(x => x.relname==='portal_administrative_authority')).toBe(false);
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
  const insertSql='INSERT INTO '+table+'(workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision) VALUES($1,$2,$3,$4,$5,$6::int8)';
  const values=(workspace:string|null,employee:string|null,scope:string|null='ALL_TENANT',origin:string|null='EXPLICIT_GRANT',reference:string|null='fictional:unverified',revision:string|null='1')=>[workspace,employee,scope,origin,reference,revision];
  async function portal(workspace:string,employee:string) {
    await query(admin,`INSERT INTO nevora_tenancy.portal_authority(workspace_id,employee_id,authorization_version,portal_access_version,capability_policy_revision,portal_state,proof_provenance,provenance_reference)
      VALUES($1,$2,1,1,1,'DISABLED','UNVERIFIED','fictional:unverified')`,[workspace,employee]);
  }
  async function capability(workspace:string,employee:string,code:string) {await query(admin,'INSERT INTO '+childTables[0]+'(workspace_id,employee_id,capability) VALUES($1,$2,$3)',[workspace,employee,code]);}
  async function locationGrant(workspace:string,employee:string,id:string) {await query(admin,'INSERT INTO '+childTables[1]+'(workspace_id,employee_id,location_id) VALUES($1,$2,$3)',[workspace,employee,id]);}
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
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:portal-administrative-authority-storage:'+lease.invocation);
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
    portalSource=readFileSync(portalSourcePath,'utf8');expect(hash(portalSource)).toBe(expectedPortalSHA256);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-administrative-authority-storage.test.ts')))).toBe(expectedSourceTestSHA256);
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
    record({operation:'EXACT_OWN_ROOT_BASE_VERIFIED',base,testSHA256:hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-administrative-authority-storage.postgres.test.ts'))),sourceSHA256:hash(source),migrationPins});
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
      await query(admin,minimalWorkspace); parent=await remember('table','public','workspaces',installerOid);
      const locationFragment=oneFragment(employeeSource,/CREATE TABLE IF NOT EXISTS locations \([\s\S]*?\n\);/g);
      await query(admin,locationFragment); location=await remember('table','public','locations',installerOid);
      const locationStatements=[...parentSource.matchAll(/^ALTER TABLE locations[^;]*;/gm)].map(match=>match[0]);
      expect(locationStatements).toHaveLength(8);
      // Apply only unchanged source DDL to the empty own fixture, never Fuel seed/UPDATE.
      for(const statement of locationStatements)await query(admin,statement);
      const locationComposite=oneFragment(communicationSource,/^ALTER TABLE locations ADD CONSTRAINT communication_location_workspace_key[^;]*;/gm);
      await query(admin,locationComposite);
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
      const contractRows=['employees','workspaces','locations'].map(name=>oneFragment(contractValues,new RegExp("^\\('"+name+"',[^\\n]*","gm")).replace(/[,;]$/,''));
      await query(admin,'INSERT INTO nevora_tenancy.owned_table_contract VALUES\n'+contractRows.join(',\n')+';');
      workspaceId=' '+lease.invocation+'_workspace_A '; workspaceB=''; employeeA=' '+lease.invocation+'_employee_A ';
      employeeB=lease.invocation+'_employee_B'; nullOwnerEmployee=lease.invocation+'_employee_NULL';
      exactEmployeeIds.push(employeeA,'',lease.invocation+'_long_'+ 'x'.repeat(4096));
      locationA=' '+lease.invocation+'_location_A ';locationB=lease.invocation+'_location_B';
      exactLocationIds.push(locationA,'',lease.invocation+'_location_long_'+ 'x'.repeat(4096));
      await query(admin,'INSERT INTO public.workspaces(id) VALUES($1),($2)',[workspaceId,workspaceB]);
      for(const [index,id] of exactLocationIds.entries())await query(admin,"INSERT INTO public.locations(id,name,short_name,workspace_id,clocker_key,active) VALUES($1,'Fictional','Fixture',$2,$3,false)",[id,workspaceId,'fixture-'+index]);
      await query(admin,"INSERT INTO public.locations(id,name,short_name,workspace_id,clocker_key,active) VALUES($1,'Fictional','Fixture',$2,'fixture-b',false)",[locationB,workspaceB]);
      for(const [id,workspace] of [...exactEmployeeIds.map(id=>[id,workspaceId]),[employeeB,workspaceB],[nullOwnerEmployee,null]])
        await query(admin,`INSERT INTO public.employees(id,first_name,last_name,phone,email,role,primary_location_id,active,created_at,updated_at,workspace_id)
          VALUES($1,'Fictional','Employee','0000000000',NULL,'EMPLOYEE',$2,false,'2026-10-09T00:00:00.000000Z','2026-10-09T00:00:00.000000Z',$3)`,[id,workspace===workspaceB?locationB:locationA,workspace]);
      await query(admin,sourceFenceFunction); await remember('function','nevora_tenancy','source_write_fence',installerOid,'()');
      await query(admin,sourceIdentityFunction); await remember('function','nevora_tenancy','source_identity_guard',installerOid,'()');
      for(const name of ['employees','workspaces','locations']) for(const trigger of ['f10_write_fence','f10_identity_guard']) {
        const fragment=oneFragment(expansionSource,new RegExp('^CREATE TRIGGER '+trigger+'[^\\n]*ON public\\."'+name+'"[^\\n]*;','gm'));
        await query(admin,fragment); await remember('trigger','public',trigger,installerOid,'public.'+name);
      }
      await query(admin,'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin,'COMMIT'); setupCommitted=true;
      record({operation:'FIXTURE_ONLY_SOURCE_BOUND_PARENT_AND_GUARD_FRAGMENTS',minimalWorkspace,locationFragment,locationStatements,locationComposite,
        original0008SourceSHA256:hash(parentSource),employeeFragment,employeeFragmentSHA256:hash(employeeFragment),employeeAdditive,
        protocolFragment,contractsFragment,protocolInsert,contractRows,sourceIdentitySHA256:hash(sourceIdentityFunction),sourceFenceSHA256:hash(sourceFenceFunction),
        claim:'MINIMAL_A_B_PARENTS_NOT_ORIGINAL_0008_SINGLETON_MIGRATION_CAPTURE_FULL68_CUTOVER_OR_APPLICATION_ISOLATION'});
    } finally { await query(admin,'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I'); }
    // Exact accepted portal artifact installed before the administrative snapshot.
    // No seeded authority: positive metadata below remains rollback-only fictional observations.
    await query(admin,portalSource);await query(admin,'ROLLBACK');
    portalParent=await remember('table','nevora_tenancy','portal_authority',installerOid);
    await remember('function','nevora_tenancy','guard_portal_authority',installerOid,'()');
    await remember('trigger','nevora_tenancy','portal_authority_row_guard',installerOid,'nevora_tenancy.portal_authority');
    await remember('trigger','nevora_tenancy','portal_authority_truncate_guard',installerOid,'nevora_tenancy.portal_authority');
    originalParentRows=await parentRows(); originalParentCatalog=parentProjection(await catalog());
    app=await connect(appRole.name); worker=await connect(workerRole.name); outsider=await connect(outsiderRole.name); installer=await connect(lease.user);
    writeFileSync(join(runPath!,'portal-administrative-authority-fixture-custody.json'),JSON.stringify({base,roles,objects,originalParentRows,originalParentCatalog,
      sourceSHA256:hash(source),migrationPins,expectedClients:5,claim:'EMPTY_STORAGE_SOURCE_PREREQUISITES_FICTIONAL_NATIVE_ONLY_NO_CURRENT_PROOF_OR_ACTIVATION'},null,2),{flag:'wx',mode:0o600});
  },60000);
  it('AA01 missing schema native public parents or private portal prerequisite reject atomically',async()=>{
    const shadow=lease.invocation+'_schema_shadow';await ownMutation(async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy RENAME TO '+q(shadow));},async()=>{await query(admin,'ALTER SCHEMA '+q(shadow)+' RENAME TO nevora_tenancy');},async()=>{await installReject('3F000');});
    for(const name of ['workspaces','employees','locations']){const renamed=lease.invocation+'_'+name+'_shadow';await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' RENAME TO '+q(renamed));},async()=>{await query(admin,'ALTER TABLE public.'+q(renamed)+' RENAME TO '+q(name));},async()=>{await installReject('55000');});}
    await ownMutation(async()=>{await query(admin,'ALTER TABLE nevora_tenancy.portal_authority RENAME TO own_portal_shadow');},async()=>{await query(admin,'ALTER TABLE nevora_tenancy.own_portal_shadow RENAME TO portal_authority');},async()=>{await installReject('55000');});await preserveParent();
  },30000);
  it('AA02 foreign schema source parent or private portal owner cannot be adopted',async()=>{
    await ownMutation(async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));},async()=>{await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user));},async()=>{await installReject('42501');});
    for(const name of ['public.workspaces','public.employees','public.locations','nevora_tenancy.portal_authority'])await ownMutation(async()=>{await query(admin,'ALTER TABLE '+name+' OWNER TO '+q(outsiderRole.name));},async()=>{await query(admin,'ALTER TABLE '+name+' OWNER TO '+q(lease.user));},async()=>{await installReject('55000');});await preserveParent();
  },30000);
  it('AA03 exact existing composite keys and original native text identities reject drift',async()=>{
    for(const [change,undo] of [
      ['ALTER TABLE public.employees RENAME CONSTRAINT f10_tenant_c49de3d265fb TO own_wrong_employee_key','ALTER TABLE public.employees RENAME CONSTRAINT own_wrong_employee_key TO f10_tenant_c49de3d265fb'],
      ['ALTER TABLE public.locations RENAME CONSTRAINT communication_location_workspace_key TO own_wrong_location_key','ALTER TABLE public.locations RENAME CONSTRAINT own_wrong_location_key TO communication_location_workspace_key'],
      ["ALTER TABLE public.employees ALTER COLUMN id SET DEFAULT 'fixture-default'",'ALTER TABLE public.employees ALTER COLUMN id DROP DEFAULT'],
      ["ALTER TABLE public.locations ALTER COLUMN workspace_id SET DEFAULT 'fixture-default'",'ALTER TABLE public.locations ALTER COLUMN workspace_id DROP DEFAULT'],
      ["ALTER TABLE nevora_tenancy.portal_authority ALTER COLUMN employee_id SET DEFAULT 'fixture-default'",'ALTER TABLE nevora_tenancy.portal_authority ALTER COLUMN employee_id DROP DEFAULT'],
    ])await ownMutation(async()=>{await query(admin,change);},async()=>{await query(admin,undo);},async()=>{await installReject('55000');});await preserveParent();
  });
  it('AA04 both original source guard bodies and all six enabled native routes reject drift',async()=>{
    for(const [original,tag] of [[sourceIdentityFunction,'$identity_guard$;'],[sourceFenceFunction,'$write_fence$;']] as const){const replacement=original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace(tag,'\n-- fictional source drift\n'+tag);await ownMutation(async()=>{await query(admin,replacement);},async()=>{await query(admin,original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));},async()=>{await installReject('55000');});}
    for(const name of ['workspaces','employees','locations'])for(const trigger of ['f10_identity_guard','f10_write_fence'])await ownMutation(async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' DISABLE TRIGGER '+q(trigger));},async()=>{await query(admin,'ALTER TABLE public.'+q(name)+' ENABLE TRIGGER '+q(trigger));},async()=>{await installReject('55000');});await preserveParent();
  },30000);
  it('AA05 exact source anchor rows and unimpersonated original protocol are retained',async()=>{
    for(const name of ['employees','workspaces','locations']){const anchor=originalParentRows.contracts.find(x=>x.row.table_name===name)!.row.anchor;await ownMutation(async()=>{await query(admin,"UPDATE nevora_tenancy.owned_table_contract SET anchor='{}'::jsonb WHERE table_name=$1",[name]);},async()=>{await query(admin,'UPDATE nevora_tenancy.owned_table_contract SET anchor=$1::jsonb WHERE table_name=$2',[JSON.stringify(anchor),name]);},async()=>{await installReject('55000');});}
    const registry=originalParentRows.protocol[0].row.registry_sha256 as string;await ownMutation(async()=>{await query(admin,'UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=$1',['0'.repeat(64)]);},async()=>{await query(admin,'UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=$1',[registry]);},async()=>{await installReject('55000');});
    expect(originalParentRows.protocol[0].row).toMatchObject({phase:'EXPANDED_LEGACY',backfill_actor:null,capture_manifest_sha256:null});await preserveParent();
  });
  it('AA06 accepted portal flags body routes and private ACL are genuine native prerequisites',async()=>{
    for(const [change,undo] of [
      ['ALTER TABLE nevora_tenancy.portal_authority DISABLE ROW LEVEL SECURITY','ALTER TABLE nevora_tenancy.portal_authority ENABLE ROW LEVEL SECURITY'],
      ['ALTER TABLE nevora_tenancy.portal_authority NO FORCE ROW LEVEL SECURITY','ALTER TABLE nevora_tenancy.portal_authority FORCE ROW LEVEL SECURITY'],
      ['ALTER TABLE nevora_tenancy.portal_authority DISABLE TRIGGER portal_authority_row_guard','ALTER TABLE nevora_tenancy.portal_authority ENABLE TRIGGER portal_authority_row_guard'],
      ['ALTER TABLE nevora_tenancy.portal_authority DISABLE TRIGGER portal_authority_truncate_guard','ALTER TABLE nevora_tenancy.portal_authority ENABLE TRIGGER portal_authority_truncate_guard'],
    ])await ownMutation(async()=>{await query(admin,change);},async()=>{await query(admin,undo);},async()=>{await installReject('55000');});
    const original=oneFragment(portalSource,/CREATE FUNCTION nevora_tenancy\.guard_portal_authority\(\)[\s\S]*?\$portal_authority_guard\$;/g);
    const changed=original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace('$portal_authority_guard$;','\n-- fictional body drift\n$portal_authority_guard$;');
    await ownMutation(async()=>{await query(admin,changed);},async()=>{await query(admin,original.replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION'));},async()=>{await installReject('55000');});
    for(const [grant,revoke] of [
      ['GRANT SELECT ON nevora_tenancy.portal_authority TO ','REVOKE SELECT ON nevora_tenancy.portal_authority FROM '],
      ['GRANT UPDATE(portal_state) ON nevora_tenancy.portal_authority TO ','REVOKE UPDATE(portal_state) ON nevora_tenancy.portal_authority FROM '],
      ['GRANT EXECUTE ON FUNCTION nevora_tenancy.guard_portal_authority() TO ','REVOKE EXECUTE ON FUNCTION nevora_tenancy.guard_portal_authority() FROM '],
    ])await ownMutation(async()=>{await query(admin,grant+q(outsiderRole.name));},async()=>{await query(admin,revoke+q(outsiderRole.name));},async()=>{await installReject('42501');});await preserveParent();
  },30000);
  it('AA07 fresh installer rejects any same-name overload without replacement',async()=>{
    const before=await catalog();let overload:OwnObject|undefined;
    try{await query(admin,"CREATE FUNCTION nevora_tenancy.guard_portal_administrative_authority(text) RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog AS 'SELECT $1'");overload=await remember('function','nevora_tenancy',functionName,installerOid,'(text)');await installReject('42723');}
    finally{if(overload&&!overload.dropped)await dropObject(overload);}expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await preserveParent();
  });
  it('AA08 named schema and ambient table or function default grants reject without ACL repair',async()=>{
    const before=await catalog();try{await query(admin,'GRANT USAGE,CREATE ON SCHEMA nevora_tenancy TO '+q(outsiderRole.name));await installReject('42501');}finally{await query(admin,'REVOKE USAGE,CREATE ON SCHEMA nevora_tenancy FROM '+q(outsiderRole.name));}expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));
    for(const kind of ['TABLES','FUNCTIONS']){const defaults=async()=>(await query(admin,`SELECT oid::text oid,defaclrole::text owner,defaclnamespace::text namespace,defaclobjtype::text type,defaclacl::text acl FROM pg_catalog.pg_default_acl WHERE defaclrole=$1::oid ORDER BY oid`,[installerOid])).rows;const previous=await defaults(),grant=kind==='TABLES'?'TRIGGER,TRUNCATE':'EXECUTE';
      try{await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy GRANT '+grant+' ON '+kind+' TO '+q(outsiderRole.name));record({caseId:'AA08',kind,nativeDefaults:await defaults()});await installReject('42501');}
      finally{await query(admin,'ALTER DEFAULT PRIVILEGES IN SCHEMA nevora_tenancy REVOKE '+grant+' ON '+kind+' FROM '+q(outsiderRole.name));}expect(await defaults()).toEqual(previous);expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));}
    await preserveParent();
  });
  it('AA09 final column ACL closure rolls back all ten staged own new objects',async()=>{
    const before=await catalog(),rows=await parentRows(),boundary=source.indexOf('DO $portal_administrative_acl$');expect(boundary).toBeGreaterThan(0);const opening=source.slice(0,boundary),final=source.slice(boundary);expect(opening+final).toBe(source);const pendingObjects:OwnObject[]=[];
    try{await query(installer,opening);expect(installer.getTransactionStatus()).toBe('T');
      const native=(await query(installer,`SELECT 'table' kind,c.oid::text oid,c.relowner::text owner,c.relname name,NULL::text relation_oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[])
        UNION ALL SELECT 'function',p.oid::text,p.proowner::text,p.proname,NULL::text FROM pg_catalog.pg_proc p WHERE p.oid='nevora_tenancy.guard_portal_administrative_authority()'::regprocedure
        UNION ALL SELECT 'trigger',t.oid::text,c.relowner::text,t.tgname,c.oid::text FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal ORDER BY kind,name`,[allTables.map(x=>x.split('.')[1])])).rows;expect(native).toHaveLength(10);
      for(const row of native){expect(row.owner).toBe(installerOid);const object:OwnObject={kind:row.kind as OwnObject['kind'],schema:'nevora_tenancy',name:row.name as string,oid:row.oid as string,ownerOid:installerOid,dropped:false,...(row.kind==='function'?{signature:'()'}:{}),...(row.kind==='trigger'?{relationOid:row.relation_oid as string}:{})};objects.push(object);pendingObjects.push(object);record({operation:'EXACT_OWN_UNCOMMITTED_OBJECT_OBSERVED',...object});}
      await query(installer,'GRANT UPDATE(scope_kind) ON '+table+' TO '+q(outsiderRole.name));const acl=(await query(installer,`SELECT a.attname,x.grantee::text grantee,x.privilege_type FROM pg_catalog.pg_attribute a CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl)x WHERE a.attrelid='nevora_tenancy.portal_administrative_authority'::regclass ORDER BY a.attnum,x.grantee,x.privilege_type`)).rows;expect(acl).toEqual([{attname:'scope_kind',grantee:outsiderRole.oid,privilege_type:'UPDATE'}]);record({caseId:'AA09',native,acl,openingSHA256:hash(opening),finalSHA256:hash(final),claim:'STAGED_COLUMN_NEGATIVE_NOT_UNMODIFIED_WHOLE_ARTIFACT'});const code=await rejected(installer,final);await finishRejected(installer,code,'42501');
    }finally{await query(installer,'ROLLBACK');for(const object of pendingObjects){const name=object.kind==='table'?'pg_class':object.kind==='function'?'pg_proc':'pg_trigger';expect((await query(admin,'SELECT oid FROM pg_catalog.'+name+' WHERE oid=$1::oid',[object.oid])).rows).toEqual([]);object.dropped=true;record({operation:'EXACT_OWN_INSTALLATION_ROLLBACK_ABSENCE',...object});}}
    expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));expect(await parentRows()).toEqual(rows);await preserveParent();
  });
  it('AA10 whole source sees changed owner fresh after FIRST exclusive wait despite RR default',async()=>{
    const before=await catalog(),undo='ALTER SCHEMA nevora_tenancy OWNER TO '+q(lease.user);try{await fenceAttempt(false,async()=>{repairs.add(undo);await query(admin,'ALTER SCHEMA nevora_tenancy OWNER TO '+q(outsiderRole.name));record({caseId:'AA10',deliberatelyNoncooperatingOwnFixtureDelta:await catalog()});});}
    finally{if(repairs.has(undo)){await query(admin,undo);repairs.delete(undo);}}expect(canonicalAcl(await catalog())).toEqual(canonicalAcl(before));await preserveParent();
  },30000);
  it('AA11 one unmodified whole artifact query installs three empty private relations after FIRST wait',async()=>{
    await fenceAttempt(false,undefined,true);installed=true;counter=await remember('table','nevora_tenancy','portal_administrative_authority',installerOid);
    await remember('table','nevora_tenancy','portal_administrative_capability',installerOid);await remember('table','nevora_tenancy','portal_administrative_location',installerOid);await remember('function','nevora_tenancy',functionName,installerOid,'()');
    for(const relation of allTables)for(const suffix of ['identity_guard','truncate_guard'])await remember('trigger','nevora_tenancy',relation.split('.')[1]+'_'+suffix,installerOid,relation);
    expect(await counterRows()).toEqual({headers:[],capabilities:[],locations:[]});await preserveParent();record({caseId:'AA11',native:await catalog(),sourceSHA256:hash(source),claim:'WHOLE_SOURCE_ONE_QUERY_EMPTY_STORAGE_NOT_ACTIVATED_AUTHORITY'});
  },30000);
  it('AA12 exact three-table native keys RESTRICT FKs invoker guards and FORCE zero-policy metadata',async()=>{
    const native=await catalog(),oids=allTables.map(name=>native.relations.find(x=>x.relname===name.split('.')[1])!.oid);const shapes=[['workspace_id','employee_id','scope_kind','scope_origin','provenance_reference','capability_policy_revision'],['workspace_id','employee_id','capability'],['workspace_id','employee_id','location_id']];
    for(const [index,oid]of oids.entries()){expect(native.relations.find(x=>x.oid===oid)).toMatchObject({owner:installerOid,relkind:'r',relpersistence:'p',relrowsecurity:true,relforcerowsecurity:true});const columns=native.columns.filter(x=>x.relation_oid===oid);expect(columns.map(x=>x.attname)).toEqual(shapes[index]);for(const column of columns)expect(column).toMatchObject({type_oid:column.attname==='capability_policy_revision'?'20':'25',atttypmod:-1,attnotnull:true,atthasdef:false,attidentity:'',attgenerated:'',default_source:null});
      const constraints=native.constraints.filter(x=>x.relation_oid===oid);expect(constraints.filter(x=>x.contype==='p')).toMatchObject([{conkey:index===0?[1,2]:[1,2,3],convalidated:true,conenforced:true,condeferrable:false,condeferred:false}]);
      const fks=constraints.filter(x=>x.contype==='f');expect(fks).toHaveLength([3,1,2][index]);for(const fk of fks)expect(fk).toMatchObject({update_action:'r',delete_action:'r',convalidated:true,conenforced:true,condeferrable:false,condeferred:false});
      if(index===0){expect(fks.find(x=>x.parent_oid===parent.oid)).toMatchObject({conkey:[1],confkey:[1]});expect(fks.find(x=>x.parent_oid===portalParent.oid)).toMatchObject({conkey:[1,2],confkey:[1,2]});const employeeColumns=native.columns.filter(x=>x.relation_oid===employeeParent.oid);expect(fks.find(x=>x.parent_oid===employeeParent.oid)).toMatchObject({conkey:[1,2],confkey:[employeeColumns.find(x=>x.attname==='workspace_id')!.attnum,employeeColumns.find(x=>x.attname==='id')!.attnum]});}
      else expect(fks.find(x=>x.parent_oid===counter.oid)).toMatchObject({conkey:[1,2],confkey:[1,2]});
      if(index===2){const locationColumns=native.columns.filter(x=>x.relation_oid===location.oid);expect(fks.find(x=>x.parent_oid===location.oid)).toMatchObject({conkey:[1,3],confkey:[locationColumns.find(x=>x.attname==='workspace_id')!.attnum,locationColumns.find(x=>x.attname==='id')!.attnum]});}
      const triggers=native.triggers.filter(x=>x.relation_oid===oid&&!x.tgisinternal);expect(triggers).toHaveLength(2);expect(triggers.find(x=>x.tgname.endsWith('_identity_guard'))).toMatchObject({tgtype:19,tgenabled:'O',constraint_oid:'0',tgdeferrable:false,tginitdeferred:false});expect(triggers.find(x=>x.tgname.endsWith('_truncate_guard'))).toMatchObject({tgtype:34,tgenabled:'O',constraint_oid:'0',tgdeferrable:false,tginitdeferred:false});}
    const guard=native.functions.find(x=>x.proname===functionName)!;expect(guard).toMatchObject({owner:installerOid,prosecdef:false,proconfig:['search_path=pg_catalog'],return_oid:'2279',arg_oids:'',proretset:false,lanname:'plpgsql',provolatile:'v',proparallel:'u'});
    expect((await query(admin,"SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(prosrc,'UTF8')),'hex') body FROM pg_catalog.pg_proc WHERE oid=$1::oid",[guard.oid])).rows).toEqual([{body:hash(source.split('$portal_administrative_guard$')[1])}]);for(const trigger of native.triggers.filter(x=>oids.includes(x.relation_oid)&&!x.tgisinternal))expect(trigger.function_oid).toBe(guard.oid);
    expect(native.policies).toEqual([]);expect(native.columnAcls).toEqual([]);expect(native.expandedAcls.filter(x=>x.grantee==='0')).toEqual([]);expect(native.expandedAcls.filter(x=>[schema.oid,...oids,guard.oid].includes(x.oid)&&x.grantee!==installerOid)).toEqual([]);
    expect(native.columns.find(x=>x.relation_oid===employeeParent.oid&&x.attname==='workspace_id')).toMatchObject({attnotnull:false});expect(native.constraints.find(x=>x.relation_oid===employeeParent.oid&&x.conname==='f10_workspace_reference')).toMatchObject({convalidated:false});record({caseId:'AA12',native,sourceRows:await parentRows(),claim:'CURRENT_METADATA_STORAGE_NOT_CURRENT_PROOF_FULL_SET_OR_GENERATION_WRITER'});await preserveParent();
  });
  it('AA13 repeated whole installer refuses without replacing any native object or seeding rows',async()=>{const before=await catalog();await installReject('42P07');expect(await catalog()).toEqual(before);expect(await counterRows()).toEqual({headers:[],capabilities:[],locations:[]});await preserveParent();});
  it('AA14 header portal employment location and child tuples reject cross-workspace or missing keys',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await portal(workspaceB,employeeB);
      for(const [workspace,employee,code]of [[workspaceId,employeeB,'23503'],[workspaceB,employeeA,'23503'],[workspaceId,nullOwnerEmployee,'23503'],[workspaceId,exactEmployeeIds[1],'23503'],[null,employeeA,'23502'],[workspaceId,null,'23502']]as const)await rejectedSavepoint(insertSql,values(workspace,employee),code);
      await query(admin,insertSql,values(workspaceId,employeeA));await query(admin,insertSql,values(workspaceB,employeeB));
      await rejectedSavepoint('INSERT INTO '+childTables[0]+' VALUES($1,$2,$3)',[workspaceId,employeeB,CAPABILITIES[0]],'23503');
      await rejectedSavepoint('INSERT INTO '+childTables[1]+' VALUES($1,$2,$3)',[workspaceId,employeeA,locationB],'23503');await rejectedSavepoint('INSERT INTO '+childTables[1]+' VALUES($1,$2,$3)',[workspaceB,employeeB,locationA],'23503');await rejectedSavepoint('INSERT INTO '+childTables[1]+' VALUES($1,$2,$3)',[workspaceId,employeeA,locationA+'_missing'],'23503');
      await capability(workspaceId,employeeA,CAPABILITIES[0]);await locationGrant(workspaceId,employeeA,locationA);await locationGrant(workspaceB,employeeB,locationB);record({caseId:'AA14',rows:await counterRows(),claim:'FICTIONAL_SCOPED_KEYS_ONLY_NO_SOURCE_ELIGIBILITY_OR_CAPABILITY_AUTHORITY'});
    });
  });
  it('AA15 closed unchanged capability vocabulary and C comparison exclude wildcard and casing changes',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA));for(const code of CAPABILITIES)await capability(workspaceId,employeeA,code);
      const rows=(await counterRows()).capabilities;expect(rows.map(x=>x.capability)).toEqual([...CAPABILITIES].sort());
      for(const code of ['*','management.*','unknown.capability',CAPABILITIES[0].toUpperCase(),CAPABILITIES[0]+' ',null])await rejectedSavepoint('INSERT INTO '+childTables[0]+' VALUES($1,$2,$3)',[workspaceId,employeeA,code],code===null?'23502':'23514');
      await rejectedSavepoint('INSERT INTO '+childTables[0]+' VALUES($1,$2,$3)',[workspaceId,employeeA,CAPABILITIES[0]],'23505');record({caseId:'AA15',codes:rows.map(x=>x.capability),claim:'CLOSED_STORAGE_VOCABULARY_NOT_EFFECTIVE_GRANTS'});
    });
  });
  it('AA16 exact scope origin evidence and positive int8 have no defaults or normalized evidence policy',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);
      for(const [scope,origin,reference,revision,expected]of [['UNKNOWN','EXPLICIT_GRANT','x','1','23514'],['all_tenant','EXPLICIT_GRANT','x','1','23514'],['LOCATIONS','LEGACY_COMPATIBILITY','x','1','23514'],['ALL_TENANT','UNKNOWN','x','1','23514'],['ALL_TENANT','explicit_grant','x','1','23514'],[null,'EXPLICIT_GRANT','x','1','23502'],['ALL_TENANT',null,'x','1','23502'],['ALL_TENANT','EXPLICIT_GRANT',null,'1','23502'],['ALL_TENANT','EXPLICIT_GRANT','x',null,'23502'],['ALL_TENANT','EXPLICIT_GRANT','x','0','23514'],['ALL_TENANT','EXPLICIT_GRANT','x','-1','23514'],['ALL_TENANT','EXPLICIT_GRANT','x','9223372036854775808','22003']]as const)await rejectedSavepoint(insertSql,values(workspaceId,employeeA,scope,origin,reference,revision),expected);
      await query(admin,insertSql,values(workspaceId,employeeA,'ALL_TENANT','LEGACY_COMPATIBILITY','','9007199254740993'));expect((await counterRows()).headers[0]).toMatchObject({provenance_reference:'',capability_policy_revision:'9007199254740993'});await query(admin,'UPDATE '+table+' SET capability_policy_revision=$1::int8,provenance_reference=$2',['9223372036854775807',' '+ 'x'.repeat(4096)+' ']);
      const maximum=await counterRows();await rejectedSavepoint('UPDATE '+table+' SET capability_policy_revision=capability_policy_revision+1',[],'22003');expect(await counterRows()).toEqual(maximum);record({caseId:'AA16',maximum,claim:'LABEL_AND_POSITIVE_NATIVE_INT8_NOT_APPROVAL_OR_GENERATION_AUTHORITY'});
    });
  });
  it('AA17 workspace employment capability and location identities remain immutable on UPDATE',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA));await capability(workspaceId,employeeA,CAPABILITIES[0]);await locationGrant(workspaceId,employeeA,locationA);const before=await counterRows();
      for(const target of allTables){await rejectedSavepoint('UPDATE '+target+' SET workspace_id=$1',[workspaceB],'55000');await rejectedSavepoint('UPDATE '+target+' SET employee_id=$1',[employeeB],'55000');await query(admin,'UPDATE '+target+' SET workspace_id=workspace_id,employee_id=employee_id');}
      await rejectedSavepoint('UPDATE '+childTables[0]+' SET capability=$1',[CAPABILITIES[1]],'55000');await rejectedSavepoint('UPDATE '+childTables[1]+' SET location_id=$1',[exactLocationIds[1]],'55000');await query(admin,'UPDATE '+childTables[0]+' SET capability=capability');await query(admin,'UPDATE '+childTables[1]+' SET location_id=location_id');expect(await counterRows()).toEqual(before);record({caseId:'AA17',before,exactOriginalKeys:true});
    });
  });
  it('AA18 current scope origin reference and nondecreasing revision remain mutable metadata only',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA,'ALL_TENANT','LEGACY_COMPATIBILITY','fictional-old','5'));
      for(const revision of [null,'4','0'])await rejectedSavepoint('UPDATE '+table+' SET capability_policy_revision=$1::int8',[revision],'23514');
      await query(admin,'UPDATE '+table+" SET scope_kind='LOCATIONS',scope_origin='EXPLICIT_GRANT',provenance_reference='',capability_policy_revision=5");await query(admin,'UPDATE '+table+' SET provenance_reference=$1,capability_policy_revision=6',[' exact evidence bytes ']);expect((await counterRows()).headers[0]).toMatchObject({scope_kind:'LOCATIONS',scope_origin:'EXPLICIT_GRANT',provenance_reference:' exact evidence bytes ',capability_policy_revision:'6'});
      const portalVersions=(await parentRows()).portal;expect(portalVersions[0]).toMatchObject({authorization_version:'1',capability_policy_revision:'1',portal_state:'DISABLED'});record({caseId:'AA18',rows:await counterRows(),portalVersions,claim:'PHYSICAL_MUTABILITY_ONLY_ATOMIC_FULL_SET_AND_GENERATION_WRITERS_UNIMPLEMENTED'});
    });
  });
  it('AA19 child deletion permits exact replacement and header deletion only after full child removal',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA));await capability(workspaceId,employeeA,CAPABILITIES[0]);await locationGrant(workspaceId,employeeA,locationA);
      await rejectedSavepoint('DELETE FROM '+table,[],'23001');await query(admin,'DELETE FROM '+childTables[0]);await query(admin,'DELETE FROM '+childTables[1]);await capability(workspaceId,employeeA,CAPABILITIES[1]);await locationGrant(workspaceId,employeeA,exactLocationIds[1]);expect((await counterRows()).capabilities.map(x=>x.capability)).toEqual([CAPABILITIES[1]]);
      await query(admin,'DELETE FROM '+childTables[0]);await query(admin,'DELETE FROM '+childTables[1]);expect((await query(admin,'DELETE FROM '+table)).rowCount).toBe(1);expect(await counterRows()).toEqual({headers:[],capabilities:[],locations:[]});expect((await parentRows()).portal).toHaveLength(1);record({caseId:'AA19',claim:'ROLLBACK_SCOPED_CURRENT_METADATA_REPLACEMENT_NOT_PROTECTED_ATOMIC_SERVICE_OR_HISTORY'});
    });
  });
  it('AA20 native RESTRICT references preserve parents and unscoped TRUNCATE remains refused',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA));await locationGrant(workspaceId,employeeA,locationA);
      // Original NO ACTION references precede the new RESTRICT constraints.
      // Record only fixed native error identity, never messages or row values.
      async function originalParentDenial(text:string,values:unknown[],expected:{code:string;constraint:string;schema:string;table:string}) {
        await query(admin,'SAVEPOINT original_parent_denial');
        let diagnostic:{code:string;constraint:unknown;schema:unknown;table:unknown}|null=null;
        try { sqlAttempted=true;await admin.query(text,values); }
        catch(error) { const e=error as {constraint?:unknown;schema?:unknown;table?:unknown};diagnostic={code:sqlstate(error),constraint:e.constraint,schema:e.schema,table:e.table}; }
        finally { await query(admin,'ROLLBACK TO SAVEPOINT original_parent_denial');await query(admin,'RELEASE SAVEPOINT original_parent_denial'); }
        record({caseId:'AA20',operation:'ORIGINAL_PARENT_NATIVE_FK_DENIAL',diagnostic});expect(diagnostic).toEqual(expected);
      }
      await originalParentDenial('DELETE FROM public.locations WHERE id=$1',[locationA],{code:'23503',constraint:'employees_primary_location_id_fkey',schema:'public',table:'employees'});
      // This separate source location has no original employment reference and
      // therefore reaches the new administrative location RESTRICT constraint.
      await locationGrant(workspaceId,employeeA,exactLocationIds[1]);
      await rejectedSavepoint('DELETE FROM public.locations WHERE id=$1',[exactLocationIds[1]],'23001');await rejectedSavepoint('DELETE FROM nevora_tenancy.portal_authority WHERE workspace_id=$1 AND employee_id=$2',[workspaceId,employeeA],'55000');
      await rejectedSavepoint('DELETE FROM public.employees WHERE id=$1',[employeeA],'23001');await originalParentDenial('DELETE FROM public.workspaces WHERE id=$1',[workspaceId],{code:'23503',constraint:'locations_workspace_id_fkey',schema:'public',table:'locations'});
      // PostgreSQL first rejects parent-only TRUNCATE on native FK topology;
      // explicit full closed relation list and each child reach the custom guard.
      await rejectedSavepoint('TRUNCATE '+table,[],'0A000');for(const target of childTables)await rejectedSavepoint('TRUNCATE '+target,[],'55000');await rejectedSavepoint('TRUNCATE '+allTables.join(','),[],'55000');record({caseId:'AA20',rows:await counterRows(),nativeFKAndGuardCodesDistinct:true});
    });
  });
  it('AA21 native padded empty long identities and location bytes survive without trim or case inference',async()=>{
    await inRollback(async()=>{for(const id of exactEmployeeIds){await portal(workspaceId,id);await query(admin,insertSql,values(workspaceId,id));for(const locationId of exactLocationIds)await locationGrant(workspaceId,id,locationId);}
      const rows=await counterRows();expect(rows.headers.map(x=>x.employee_id)).toEqual([...exactEmployeeIds].sort());expect(rows.locations).toHaveLength(9);for(const id of exactEmployeeIds)expect(rows.locations.filter(x=>x.employee_id===id).map(x=>x.location_id)).toEqual([...exactLocationIds].sort());
      await rejectedSavepoint('UPDATE '+table+' SET workspace_id=$1 WHERE employee_id=$2',[workspaceId.trim(),employeeA],'55000');await rejectedSavepoint('UPDATE '+childTables[1]+' SET location_id=$1 WHERE location_id=$2',[locationA.trim(),locationA],'55000');record({caseId:'AA21',rows,claim:'EXACT_SOURCE_TEXT_IDENTITIES_NOT_LOCATOR_PARSER_OR_PERMISSION_NORMALIZATION'});
    });
  });
  it('AA22 ungranted APP WORKER outsider PUBLIC cannot read mutate or call private current controls',async()=>{
    const native=await catalog(),guard=native.functions.find(x=>x.proname===functionName)!;for(const [principal,client]of [[appRole,app],[workerRole,worker],[outsiderRole,outsider]]as const){await identity(client,principal.name,principal.oid);
      for(const target of allTables){const relation=native.relations.find(x=>x.relname===target.split('.')[1])!;const effective=(await query(admin,`SELECT pg_catalog.has_schema_privilege($1,$2::oid,'USAGE,CREATE') schema_access,pg_catalog.has_table_privilege($1,$3::oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') table_access,pg_catalog.has_function_privilege($1,$4::oid,'EXECUTE') execute`,[principal.name,schema.oid,relation.oid,guard.oid])).rows[0];const read=await rejected(client,'SELECT * FROM '+target),mutation=await rejected(client,'DELETE FROM '+target);expect(effective).toEqual({schema_access:false,table_access:false,execute:false});expect(read).toBe('42501');expect(mutation).toBe('42501');record({caseId:'AA22',principal,target,effective,read,mutation});}
      expect(await rejected(client,'SELECT nevora_tenancy.guard_portal_administrative_authority()')).toBe('42501');}expect(native.expandedAcls.filter(x=>x.grantee==='0')).toEqual([]);await preserveParent();
  });
  it('AA23 zero-policy FORCE RLS holds even for fictional grants and safe NOLOGIN table ownership',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA));await capability(workspaceId,employeeA,CAPABILITIES[0]);await locationGrant(workspaceId,employeeA,locationA);
      for(const principal of [appRole,workerRole,outsiderRole,forceOwner])await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+q(principal.name));
      for(const principal of [appRole,workerRole,outsiderRole]){for(const target of allTables)await query(admin,'GRANT SELECT,UPDATE,DELETE ON '+target+' TO '+q(principal.name));await query(admin,'SET LOCAL ROLE '+q(principal.name));for(const target of allTables){expect((await query(admin,'SELECT * FROM '+target)).rows).toEqual([]);expect((await query(admin,'UPDATE '+target+' SET employee_id=employee_id')).rowCount).toBe(0);expect((await query(admin,'DELETE FROM '+target)).rowCount).toBe(0);}await query(admin,'RESET ROLE');}
      for(const target of allTables)await query(admin,'ALTER TABLE '+target+' OWNER TO '+q(forceOwner.name));await query(admin,'SET LOCAL ROLE '+q(forceOwner.name));for(const target of allTables){expect((await query(admin,'SELECT * FROM '+target)).rows).toEqual([]);expect((await query(admin,'UPDATE '+target+' SET employee_id=employee_id')).rowCount).toBe(0);}await query(admin,'RESET ROLE');expect((await counterRows()).headers).toHaveLength(1);record({caseId:'AA23',rollbackOnlyGrantsAndOwnership:true,NOLOGINOwnerForced:true,noRuntimeEnrollment:true});
    });
  });
  it('AA24 physical storage never pretends to enforce full-set policy equality or generation invalidation',async()=>{
    await inRollback(async()=>{await portal(workspaceId,employeeA);await query(admin,insertSql,values(workspaceId,employeeA,'ALL_TENANT','EXPLICIT_GRANT','fictional:unverified','2'));await locationGrant(workspaceId,employeeA,locationA);let rows=await counterRows();expect(rows.headers[0]).toMatchObject({scope_kind:'ALL_TENANT',capability_policy_revision:'2'});expect(rows.locations).toHaveLength(1);
      await query(admin,'DELETE FROM '+childTables[1]);await query(admin,'UPDATE '+table+" SET scope_kind='LOCATIONS'");rows=await counterRows();expect(rows.locations).toEqual([]);expect((await parentRows()).portal[0]).toMatchObject({authorization_version:'1',capability_policy_revision:'1',portal_state:'DISABLED'});
      record({caseId:'AA24',rows,portal:(await parentRows()).portal,claim:'PARTIAL_PHYSICAL_STATES_ALLOWED_ONLY_AS_UNACTIVATED_STORAGE; PROTECTED_FULL_SET_POLICY_EQUALITY_GENERATION_INVALIDATION_SERVICES_NOT_IMPLEMENTED_OR_CERTIFIED'});
    });
  });
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
          if(originalParentRows)await preserveParent();
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
        const path=join(runPath!,'portal_administrative_authority-operations.jsonl');
        const bytes=recordCount?readFileSync(path):Buffer.alloc(0);
        const fullUtf8=bytes.toString('utf8'); expect(Buffer.from(fullUtf8,'utf8')).toEqual(bytes);
        const lines=fullUtf8?fullUtf8.split('\n'):[]; if(fullUtf8)expect(lines.pop()).toBe('');
        expect(lines).toHaveLength(recordCount); for(const line of lines)JSON.parse(line);
        writeFileSync(join(runPath!,'portal-administrative-authority-cleanup.json'),JSON.stringify({verified,setupCommitted,installed,cleaned,roles,objects,closure,
          connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingRepairs:repairs.size,pendingFenceAttempts:pendingFenceAttempts.size,actualSQLAttempted:sqlAttempted,
          sourceSHA256:hash(source),portalSourceSHA256:hash(portalSource),originalParentSourceSHA256:hash(parentSource),migrationPins,
          completeHistoricalJsonl:{path,sha256:hash(bytes),bytes:bytes.byteLength,recordCount,utf8Verified:true,referenceOnly:true},
          provenance:'APPEND_ONLY_JSONL_EARLIER_DROPPED_FALSE_OBSERVATIONS_AND_FINAL_OBJECT_DROPPED_TRUE_ARE_DISTINCT_NOT_BYTE_EQUIVALENT',
          claim:'MINIMAL_FICTIONAL_NATIVE_EMPTY_AUTHORITY_STORAGE_ONLY_NOT_REAL_RESOLVER_CURRENT_PROOF_ACTIVATION_RLS_DOMAIN_NEON_CUTOVER_OR_FULL_F10',rootOnlyDatabaseAndPostmasterCleanup:true},null,2),{flag:'wx',mode:0o600});
      }
    }
  },60000);
});
