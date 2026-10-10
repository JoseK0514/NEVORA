import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { unlinkSync, appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';

// UNEXECUTED preparation. Only ROOT may opt in, create the fresh PG18.4 lease,
// adopt the fixed modules/generated source image, run SQL and close the cluster.
// No argv/hash/review label authenticates that authority. This fixture never
// calls resolve_portal, starts a build or emits the generated installation file.
const leasePath = process.env.F_CI_OWNED_LEASE;
const runPath = process.env.F_CI_RUN_DIR;
const stage = process.env.F_CI_SOURCE_STAGE;
const prep = '/Users/josek0514/Documents/Codex/2026-10-08/files-pasted-by-the-user-nevora/work/f-dev/root/portal-controlled-installation/native-query-source-007';
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const fixturePath = resolve('src/lib/tenancy/runtime/portal-native-installation-producer.postgres.test.ts');
const OLD_PRODUCER_PIN = '17f630edc500d40cb929e95a325246cf169ad913d4c16bd3348b14dfbc1a60af';
// Root retains exact source lineage for every bounded successor below.
// These are pending source pins, never runtime authority or a permissive switch.
const SUCCESSOR_PINS: Readonly<Record<string, string>> = Object.freeze({
  RENDER_ONLY: 'c474d30df7829b372838d5d7f25456cc5915b34f31b43d4d63dd05617d8cc7a7',
  MARKER_ONLY: 'b1f1748bd9e1a413714242694120c147ba3cd9e304f6a15d7b29100ea7287171',
  FINAL_INTENT: '971e1ba23570cb2239a2297f1f8559aaf59545a938f728e4c50807f4e1ed4055',
});
const PINNED_SOURCES: Readonly<Record<string, string>> = Object.freeze({
  'db/migrations/0001_initial.sql': '330e125060422506f92403307224b739b73f5fc8697ed43039b22e56bcba61a1',
  'db/migrations/0008_workspace_positions.sql': 'f517e18d468556c25814141a959427c969f620fa4ac6e98cc709b31ee1d88756',
  'db/migrations/0024_contextual_communications.sql': 'f130df4238379aa50347decbc863c51f37b108a9f5975b49ca8696b49fc08277',
  'db/migrations/0026_tenant_ownership_expand.sql': 'fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb',
  'src/lib/tenancy/runtime/catalog-fence.server.ts': '2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f',
  'src/lib/tenancy/runtime/control-storage.sql': '4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66',
  'src/lib/tenancy/runtime/audited-helper-storage.sql': '2a7d8c979e5e854ddd0e516a07ce20eed15365efcfb1c21812ffffe9e31d9603',
  'src/lib/tenancy/runtime/audited-role-guard-installer.sql': '6cfcdf18fcf4eb9099b2b6b86f1c9d42cb0757fd2b20c1eeee5bb51a63f8297d',
  'src/lib/tenancy/runtime/original-runtime-login-installer.sql': 'ba6053428fe34020c26f0e7e1e724a7fc9fa41018532875bbfb8e1909e6c8607',
  'src/lib/tenancy/runtime/workspace-incarnation-storage.sql': 'b3d8c8ecf96fb4ff72255e85a53a50ddc97a1633dfdf94cea19b4496382a07f9',
  'src/lib/tenancy/runtime/portal-authority-storage.sql': 'e8afeff01d13775eeecd462e7a6e2bb662e1279ce44fd3ded2b383e34821a094',
  'src/lib/tenancy/runtime/portal-session-issuance-storage.sql': '4625ff35db3c4c3b63ef9e575468af75f4e4935c8af9934ec5b99e3cf346397e',
  'src/lib/tenancy/runtime/portal-administrative-authority-storage.sql': '06d78b8e7e6118109312d07d48d56231266b38853bcdd8792e1e298836af42a4',
  'src/lib/tenancy/runtime/workspace-locator-storage.sql': '618c1a08ad0efcc814593504b6d3c01e4df628a9fbca9b159f17bded762dc9a5',
  'src/lib/tenancy/runtime/capability-policy-definition-storage.sql': '75e8f70dbd5e2381cdde2c425aa634fafe0fe420392b07ab858cf9900382a386',
  'src/lib/tenancy/runtime/portal-source-locks.sql': 'fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03',
  'src/lib/tenancy/runtime/portal-source-observation.sql': '72b6509933ca2bbd73fbb11eae7232db40bf5f5eafd94be56e291f236ff83dc7',
  'src/lib/tenancy/runtime/portal-installed-policy-observation.sql': 'd25be72e0bede3e2ded9ce0ba782b060e41260b79db00e202e1db1d6c965573a',
  'src/lib/tenancy/runtime/portal-policy-joint-locks.sql': 'a1394da4b29c86dbf9c87a2968325d359f2bbe4137cf4004e4e4d81245f1f79e',
  'src/lib/tenancy/runtime/portal-policy-joint-observation.sql': '40283f6d7834a2dd01cbe4c418a8a12e6b4a8569d4680cf734c746e1cb55c9e3',
  'src/lib/tenancy/runtime/portal-native-installation-capture.server.ts': '54e8e45f6a763ba81b42f559e32a710d07ea5ba0b3de53b1d9d970f361138283',
});
const QUERY_PINS: Readonly<Record<string, string>> = Object.freeze({
  // Filled from these frozen source copies before READY; no query from lease.
  'independent-before-catalog.candidate.sql': '0d5245c009008517c97c4274f33464653d9e4c15b9470abfe6e180810601bf4f',
  'independent-current-catalog.candidate.sql': '200dc2c8d2eb560344d8e78cdfb0f315dbc1c881f3e0f151386b63f7eb81aff3',
  'independent-policy-definitions.candidate.sql': 'f6ce0beea310f73842e7381baa3d23b5eef8d5427e140b653336d7aae46a7eac',
  'reviewed-policy-template.candidate.sql': '1fd3a947b3217e67ca2e354b0a5b872633c9c4e1e3f4217344de1a4c639cedc9',
});
const publicTables = ['workspaces', 'locations', 'employees', 'employee_credentials', 'employee_sessions'] as const;
const privateTables = ['workspace_incarnation_counter', 'portal_authority', 'portal_session_issuance',
  'portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location',
  'capability_policy_definition', 'workspace_capability_policy_installation', 'workspace_locator'] as const;
const tablesToDrop = ['nevora_tenancy.portal_administrative_location', 'nevora_tenancy.portal_administrative_capability',
  'nevora_tenancy.portal_administrative_authority', 'nevora_tenancy.portal_session_issuance', 'nevora_tenancy.portal_authority',
  'nevora_tenancy.workspace_capability_policy_installation', 'nevora_tenancy.capability_policy_definition',
  'nevora_tenancy.workspace_locator', 'nevora_tenancy.workspace_incarnation_counter',
  'public.employee_sessions', 'public.employee_credentials', 'public.employees', 'public.locations', 'public.workspaces',
  'nevora_tenancy.audited_helper_capability', 'nevora_tenancy.runtime_role_binding',
  'nevora_tenancy.owned_table_contract', 'nevora_tenancy.expansion_protocol'] as const;
const functionNames = ['source_write_fence', 'source_identity_guard', 'guard_workspace_incarnation_counter',
  'guard_portal_authority', 'guard_portal_session_issuance', 'guard_portal_administrative_authority',
  'guard_workspace_locator', 'guard_capability_policy_storage', 'assert_audited_runtime_role',
  'require_original_runtime_login_kind', 'lock_portal_source_rows', 'read_portal_source_rows',
  'read_portal_installed_policy', 'lock_portal_policy_source_rows', 'read_portal_policy_source_rows', 'resolve_portal'] as const;
type Lease = Readonly<{ scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string; marker: string; user: string; credentialFile: string }>;
type Role = { name: string; oid: string; login: boolean };
type ObjectRow = { kind: 'SCHEMA' | 'TABLE' | 'FUNCTION' | 'TRIGGER'; schema: string; name: string;
  oid: string; owner: string; signature: string | null; relationOid: string | null };
type PolicyDefinition = { schema: string; relationName: string; relationOid: string; policyName: string;
  command: 'r' | 'w'; permissive: boolean; roleOids: string[]; using: string; withCheck: string | null };
type Intent = Readonly<{ format: 'PORTAL_PRIVATE_POLICY_INTENT_NATIVE_V1'; serverVersionNum: '180004';
  databaseOid: string; readerOwner: string; readerOwnerOid: string; policyTemplateSource: string; renderedPolicySource: string;
  reviewedBeforeCatalogCapsuleText: string; definitions: PolicyDefinition[] }>;

// No connection or credential read on ordinary Vitest discovery/default HOLD.
// An incomplete opt-in enters beforeAll and fails before resource access.
describe.skipIf(!leasePath && !runPath && !stage)('root-owned PG18.4 Portal install intended-policy binding only', () => {
  let lease: Lease, admin: Client, installer: Client, app: Client;
  let appRole: Role, workerRole: Role, readerRole: Role, installerOid = '', password = '';
  let verified = false, runVerified = false, faultCount = 0, sqlAttempted = false;
  let finalCatalogCaptureCount = 0, installerCommitAttempts = 0;
  const producerQueries: { sqlSHA256: string; result: 'ACK' | 'ERROR'; sqlstate?: string }[] = [];
  let beforeCatalog = '', rendered = '', intended: Intent;
  let sourcePin = '', originalQuery: Client['query'] | null = null;
  let compiledPolicyOids: string[] = [];
  let api: typeof import('./portal-native-installation-producer.server');
  const sources: Record<string, string> = {}, queries: Record<string, string> = {};
  const clients = new Set<Client>(), closedClients = new Set<Client>(), roles: Role[] = [];
  const objects = new Map<string, ObjectRow>(), operations: string[] = [];
  let basePrivileges: unknown, originalEmptyCatalog: unknown;
  let originalPublicSchema: { oid: string; owner: string };
  function record(value: unknown) {
    if (!runVerified) return;
    const line = JSON.stringify({ sequence: operations.length + 1, data: value });
    operations.push(line); appendFileSync(join(runPath!, 'portal-controlled-install-operations.jsonl'), line + '\n', { mode: 0o600 });
  }
  function code(error: unknown) {
    const value = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
    return typeof value === 'string' && /^[0-9A-Z]{5}$/.test(value) ? value : 'UNKNOWN';
  }
  async function query(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { return await client.query(text, values); }
    catch (error) { record({ operation: 'NATIVE_QUERY_FAILED', sqlSHA256: hash(text), sqlstate: code(error) }); throw error; }
  }
  async function rollback(client: Client) {
    await query(client, 'ROLLBACK'); expect(client.getTransactionStatus()).toBe('I');
  }
  async function fenced(body: () => Promise<void>) {
    expect(admin.getTransactionStatus()).toBe('I'); await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try { await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text); await body(); await query(admin, 'COMMIT'); }
    finally { await rollback(admin); }
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database, user, password, ssl: false });
    clients.add(client); await client.connect();
    const native = (await query(client, `SELECT pg_catalog.pg_backend_pid() AS pid,session_user::text AS login,
      current_user::text AS effective,pg_catalog.current_setting('role') AS role,
      (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) AS original_oid`)).rows[0];
    const oid = (await query(client, 'SELECT oid::text AS oid FROM pg_catalog.pg_roles WHERE rolname=$1', [user])).rows[0].oid;
    expect(native).toMatchObject({ login: user, effective: user, role: 'none', original_oid: oid });
    record({ operation: 'OWN_ORIGINAL_LOGIN_CONNECTED', native }); return client;
  }
  async function checkBase() {
    const row = (await query(admin, `SELECT pg_catalog.current_database() AS database,d.oid::text AS database_oid,
      pg_catalog.shobj_description(d.oid,'pg_database') AS marker,pg_catalog.current_setting('data_directory') AS data,
      (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) AS system_id,
      session_user::text AS login,current_user::text AS effective,pg_catalog.current_setting('role') AS role,
      pg_catalog.current_setting('server_version_num') AS version,pg_catalog.current_setting('server_encoding') AS encoding,
      pg_catalog.host(pg_catalog.inet_server_addr()) AS host,pg_catalog.inet_server_port() AS port,d.datdba::text AS owner
      FROM pg_catalog.pg_database AS d WHERE d.datname=pg_catalog.current_database()`)).rows[0];
    expect(row).toMatchObject({ database: lease.database, database_oid: lease.databaseOid, marker: lease.marker,
      data: lease.data, system_id: lease.systemIdentifier, login: lease.user, effective: lease.user, role: 'none',
      version: '180004', encoding: 'UTF8', host: '127.0.0.1', port: lease.port, owner: installerOid });
    return row;
  }
  function fragment(source: string, pattern: RegExp) {
    const matches = [...source.matchAll(pattern)]; expect(matches).toHaveLength(1); return matches[0][0];
  }
  async function createRole(name: string, login: boolean) {
    expect(name).toMatch(/^[a-z][a-z0-9_]{1,62}$/);
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    record({ operation: 'BEFORE_OWN_ROLE_CREATE', name, login });
    await query(admin, 'CREATE ROLE ' + q(name) + (login ? ' LOGIN' : ' NOLOGIN') +
      ' NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT' + (login ? ' PASSWORD ' + literal(password) : ''));
    const role = { name, login, oid: (await query(admin, 'SELECT oid::text AS oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(role); record({ operation: 'OWN_ROLE_OID_CAPTURED', role }); return role;
  }
  async function observedObjects(): Promise<ObjectRow[]> {
    return (await query(admin, `SELECT 'SCHEMA' AS kind,''::text AS schema,n.nspname::text AS name,n.oid::text AS oid,
        n.nspowner::text AS owner,NULL::text AS signature,NULL::text AS "relationOid"
      FROM pg_catalog.pg_namespace AS n WHERE n.nspname='nevora_tenancy'
      UNION ALL SELECT 'TABLE',n.nspname::text,c.relname::text,c.oid::text,c.relowner::text,NULL::text,NULL::text
        FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','nevora_tenancy') AND c.relkind='r'
      UNION ALL SELECT 'FUNCTION',n.nspname::text,p.proname::text,p.oid::text,p.proowner::text,
        pg_catalog.pg_get_function_identity_arguments(p.oid),NULL::text
        FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace WHERE n.nspname='nevora_tenancy'
      UNION ALL SELECT 'TRIGGER',n.nspname::text,t.tgname::text,t.oid::text,c.relowner::text,NULL::text,c.oid::text
        FROM pg_catalog.pg_trigger AS t JOIN pg_catalog.pg_class AS c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','nevora_tenancy') AND NOT t.tgisinternal
      ORDER BY kind,schema,name,oid`)).rows as ObjectRow[];
  }
  async function retainObjects() {
    for (const row of await observedObjects()) {
      expect(row.kind === 'SCHEMA' || row.kind === 'TRIGGER' || row.kind === 'FUNCTION' || row.kind === 'TABLE').toBe(true);
      if (row.kind === 'TABLE') expect(tablesToDrop).toContain(row.schema + '.' + row.name);
      if (row.kind === 'FUNCTION') expect(functionNames).toContain(row.name);
      expect(row.owner).toBe(row.kind === 'FUNCTION' && row.name === 'resolve_portal' ? readerRole.oid : installerOid);
      const old = objects.get(row.kind + ':' + row.oid); if (old) expect(row).toEqual(old);
      objects.set(row.kind + ':' + row.oid, row);
    }
    record({ operation: 'OWN_OBJECT_OID_RECEIPTS', objects: [...objects.values()] });
  }
  async function catalog() {
    const rows = (await query(admin, `SELECT pg_catalog.jsonb_build_object(
      'schemas',COALESCE((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.oid) FROM pg_catalog.pg_namespace AS n WHERE n.nspname='nevora_tenancy'),'[]'::jsonb),
      'relations',COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.oid) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'columns',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'defaults',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_catalog.pg_attrdef d JOIN pg_catalog.pg_class c ON c.oid=d.adrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'constraints',COALESCE((SELECT jsonb_agg(to_jsonb(k) ORDER BY k.oid) FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_namespace n ON n.oid=k.connamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'indexes',COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.indexrelid) FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'functions',COALESCE((SELECT jsonb_agg(jsonb_build_object('catalog',to_jsonb(p),'definition',pg_catalog.pg_get_functiondef(p.oid)) ORDER BY p.oid) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='nevora_tenancy'),'[]'::jsonb),
      'triggers',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'rules',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.oid) FROM pg_catalog.pg_rewrite r JOIN pg_catalog.pg_class c ON c.oid=r.ev_class JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'policies',COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.oid) FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy')),'[]'::jsonb),
      'defaultAcl',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.oid) FROM pg_catalog.pg_default_acl d),'[]'::jsonb),
      'membership',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.oid) FROM pg_catalog.pg_auth_members m WHERE m.roleid=ANY($1::oid[]) OR m.member=ANY($1::oid[]) OR m.grantor=ANY($1::oid[])),'[]'::jsonb),
      'largeObjects',COALESCE((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.oid) FROM pg_catalog.pg_largeobject_metadata l WHERE l.lomowner=ANY($1::oid[])),'[]'::jsonb),
      'roleTuples',COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.oid) FROM pg_catalog.pg_roles r WHERE r.oid=ANY($1::oid[])),'[]'::jsonb)
    )::text AS catalog`, [roles.map(role => role.oid)])).rows[0].catalog as string;
    return rows;
  }
  async function privileges() {
    return (await query(admin, `SELECT 'DATABASE' AS kind,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_database d CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(d.datacl,pg_catalog.acldefault('d',d.datdba))) a WHERE d.datname=pg_catalog.current_database()
      UNION ALL SELECT 'PUBLIC_SCHEMA',a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable FROM pg_catalog.pg_namespace n
        CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a WHERE n.nspname='public'
      ORDER BY kind,grantor,grantee,privilege_type,is_grantable`)).rows;
  }
  async function assertEmptyOriginalAndPrivate() {
    for (const table of [...publicTables.map(name => 'public.' + name), ...privateTables.map(name => 'nevora_tenancy.' + name)]) {
      const [schema, name] = table.split('.');
      expect((await query(admin, 'SELECT count(*)::text AS count FROM ' + q(schema) + '.' + q(name))).rows).toEqual([{ count: '0' }]);
    }
  }
  async function beforeText() {
    const rows = (await query(admin, queries['independent-before-catalog.candidate.sql'],
      [installerOid, readerRole.oid, appRole.oid, readerRole.name, appRole.name])).rows;
    expect(rows).toHaveLength(1); expect(Object.keys(rows[0])).toEqual(['before_catalog']); return rows[0].before_catalog as string;
  }
  async function nativeDefinitions(): Promise<PolicyDefinition[]> {
    const rows = (await query(admin, queries['independent-policy-definitions.candidate.sql'])).rows;
    expect(rows).toHaveLength(1); return rows[0].definitions as PolicyDefinition[];
  }
  async function compileIntent() {
    const fullBefore = await catalog(); beforeCatalog = await beforeText();
    expect(admin.getTransactionStatus()).toBe('I');
    await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      expect(await beforeText()).toBe(beforeCatalog);
      await query(admin, rendered);
      const definitions = await nativeDefinitions();
      compiledPolicyOids = (await query(admin, `SELECT p.oid::text AS oid FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' ORDER BY p.oid`)).rows.map(row => row.oid as string);
      expect(compiledPolicyOids).toHaveLength(17);
      expect(definitions).toHaveLength(17); expect(definitions.filter(p => p.command === 'w')).toHaveLength(8);
      expect(new Set(definitions.map(p => p.relationName)).size).toBe(9);
      for (const definition of definitions) {
        expect(definition.schema).toBe('nevora_tenancy'); expect(definition.roleOids).toEqual([readerRole.oid]);
        expect(definition.permissive).toBe(true); expect(definition.using).toEqual(expect.any(String));
        expect(definition.withCheck).toBe(definition.command === 'w' ? 'false' : null);
        const relation = (await observedObjects()).find(row => row.kind === 'TABLE' && row.name === definition.relationName);
        expect(definition.relationOid).toBe(relation?.oid);
      }
      intended = { format: 'PORTAL_PRIVATE_POLICY_INTENT_NATIVE_V1', serverVersionNum: '180004', databaseOid: lease.databaseOid,
        readerOwner: readerRole.name, readerOwnerOid: readerRole.oid, policyTemplateSource: queries['reviewed-policy-template.candidate.sql'],
        renderedPolicySource: rendered, reviewedBeforeCatalogCapsuleText: beforeCatalog, definitions };
      record({ operation: 'ROOT_COMPILED_NATIVE_17_POLICY_INTENT_BEFORE_ENROLLMENT', intended,
        compilerClaim: 'NATIVE_OBSERVATIONS_ONLY_ROOT_CUSTODY_IS_SEPARATE', sourcePin, fullBeforeCatalog: fullBefore, compiledCatalog: await catalog() });
    } finally { await rollback(admin); }
    expect(await nativeDefinitions()).toEqual([]);
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_policy WHERE oid=ANY($1::oid[])', [compiledPolicyOids])).rows).toEqual([]);
    expect(await catalog()).toBe(fullBefore); expect(await beforeText()).toBe(beforeCatalog);
    record({ operation: 'POLICY_COMPILATION_ROLLED_BACK_FULL_NATIVE_BEFORE_CATALOG_RESTORED', beforeCatalog, fullBeforeCatalog: fullBefore });
  }
  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined && stage !== undefined).toBe(true);
    expect(['ORIGINAL_993', 'RENDER_ONLY', 'MARKER_ONLY', 'FINAL_INTENT']).toContain(stage);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid = process.getuid?.(); expect(uid !== undefined).toBe(true);
    const ls = lstatSync(leasePath!); expect(ls.isFile() && !ls.isSymbolicLink()).toBe(true);
    expect(ls.uid).toBe(uid); expect(ls.mode & 0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(uid);
    runVerified = true; lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:portal-controlled-install:' + lease.invocation);
    expect(lease.marker).toBe('f10-owned:' + lease.invocation);
    expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true);
    expect(lease.databaseOid).toMatch(/^[1-9][0-9]*$/); expect(lease.systemIdentifier).toMatch(/^[1-9][0-9]*$/);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data'));
    expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data);
    expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credential = lstatSync(lease.credentialFile);
    expect(credential.isFile() && !credential.isSymbolicLink()).toBe(true); expect(credential.uid).toBe(uid);
    expect(credential.mode & 0o777).toBe(0o600); expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);
    expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    for (const [path, pin] of Object.entries(PINNED_SOURCES)) {
      sources[path] = readFileSync(resolve(path), 'utf8'); expect(hash(sources[path])).toBe(pin);
    }
    for (const [name, pin] of Object.entries(QUERY_PINS)) {
      queries[name] = readFileSync(join(prep, name), 'utf8'); expect(hash(queries[name])).toBe(pin);
    }
    sourcePin = stage === 'ORIGINAL_993' ? OLD_PRODUCER_PIN : SUCCESSOR_PINS[stage!];
    expect(sourcePin).toMatch(/^[a-f0-9]{64}$/);
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-native-installation-producer.server.ts')))).toBe(sourcePin);
    // Real fixed generated-source import only. Root must retain its actual fixed
    // generator/source inputs; this fixture does not fabricate image or approval.
    api = await import('./portal-native-installation-producer.server');
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user);
    // Canonical metadata deparsing uses the same pg_catalog path as producer.
    // Root admin only; no role change, current proof or runtime authority.
    await query(admin, 'SET search_path=pg_catalog');
    expect((await query(admin, "SELECT current_setting('search_path') AS path")).rows).toEqual([{ path: 'pg_catalog' }]);
    installerOid = (await query(admin, 'SELECT oid::text AS oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid as string;
    const base = await checkBase();
    const publicSchemaRows = (await query(admin, "SELECT n.oid::text AS oid,n.nspowner::text AS owner FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles r ON r.oid=n.nspowner WHERE n.nspname='public' AND r.rolname='pg_database_owner'")).rows;
    expect(publicSchemaRows).toHaveLength(1); originalPublicSchema = publicSchemaRows[0] as typeof originalPublicSchema;
    record({ operation: 'ORIGINAL_PUBLIC_SCHEMA_NATIVE_OWNER_RETAINED', originalPublicSchema });
    expect(await observedObjects()).toEqual([]); originalEmptyCatalog = await catalog(); basePrivileges = await privileges(); verified = true;
    record({ operation: 'EXACT_ROOT_OWNED_EMPTY_NATIVE_BASE_VERIFIED', base, sourcePin, stage,
      fixtureSHA256: hash(readFileSync(fixturePath)), sourcePins: PINNED_SOURCES, queryPins: QUERY_PINS,
      initialCatalog: originalEmptyCatalog, initialExpandedPrivileges: basePrivileges });
    await fenced(async () => {
      appRole = await createRole(lease.invocation + '_ci_app', true);
      workerRole = await createRole(lease.invocation + '_ci_worker', true);
      readerRole = await createRole(lease.invocation + '_ci_reader', false);
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + q(appRole.name) + ',' + q(workerRole.name));
      await query(admin, 'CREATE SCHEMA nevora_tenancy'); await query(admin, 'SET LOCAL search_path=public,pg_catalog');
      const initial = sources['db/migrations/0001_initial.sql'], workspace = sources['db/migrations/0008_workspace_positions.sql'];
      const communication = sources['db/migrations/0024_contextual_communications.sql'];
      const expand = sources['db/migrations/0026_tenant_ownership_expand.sql'];
      await query(admin, fragment(workspace, /CREATE TABLE workspaces \([\s\S]*?\n\);/g));
      await query(admin, fragment(initial, /CREATE TABLE IF NOT EXISTS locations \([\s\S]*?\n\);/g));
      const locationAlter = [...workspace.matchAll(/^ALTER TABLE locations[^;]*;/gm)].map(match => match[0]);
      expect(locationAlter).toHaveLength(8); for (const statement of locationAlter) await query(admin, statement);
      await query(admin, fragment(communication, /^ALTER TABLE locations ADD CONSTRAINT communication_location_workspace_key[^;]*;/gm));
      await query(admin, fragment(initial, /CREATE TABLE IF NOT EXISTS employees \([\s\S]*?\n\);/g));
      await query(admin, fragment(expand, /ALTER TABLE public\."employees" ADD COLUMN workspace_id text;\nALTER TABLE public\."employees" ADD CONSTRAINT f10_workspace_reference[^\n]*\nALTER TABLE public\."employees" ADD CONSTRAINT f10_tenant_c49de3d265fb[^\n]*/g));
      for (const name of ['employee_credentials', 'employee_sessions'])
        await query(admin, fragment(initial, new RegExp('CREATE TABLE IF NOT EXISTS ' + name + ' \\([\\s\\S]*?\\n\\);', 'g')));
      for (const name of ['employee_sessions_employee_idx', 'employee_sessions_expires_idx'])
        await query(admin, fragment(initial, new RegExp('^CREATE INDEX IF NOT EXISTS ' + name + '[^;]*;', 'gm')));
      for (const name of ['expansion_protocol', 'owned_table_contract'])
        await query(admin, fragment(expand, new RegExp('CREATE TABLE nevora_tenancy\\.' + name + ' \\([\\s\\S]*?\\n\\);', 'g')));
      await query(admin, fragment(expand, /INSERT INTO nevora_tenancy\.expansion_protocol\([^\n]*;/g));
      const values = fragment(expand, /^INSERT INTO nevora_tenancy\.owned_table_contract VALUES\n[\s\S]*?;$/gm);
      const rows = publicTables.map(name => fragment(values, new RegExp("^\\('" + name + "',[^\\n]*", 'gm')).replace(/[,;]$/, ''));
      await query(admin, 'INSERT INTO nevora_tenancy.owned_table_contract VALUES\n' + rows.join(',\n') + ';');
      await query(admin, fragment(expand, /CREATE FUNCTION nevora_tenancy\.source_write_fence\(\)[\s\S]*?\$write_fence\$;/g));
      await query(admin, fragment(expand, /CREATE FUNCTION nevora_tenancy\.source_identity_guard\(\)[\s\S]*?\$identity_guard\$;/g));
      for (const name of publicTables) for (const guard of ['f10_write_fence', 'f10_identity_guard'])
        await query(admin, fragment(expand, new RegExp('^CREATE TRIGGER ' + guard + '[^\\n]*ON public\\."' + name + '"[^\\n]*;', 'gm')));
      await query(admin, 'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin, 'REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin, 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC');
    });
    // Each whole unmodified installer owns explicit RC/exclusive first. No nesting
    // and no access/grants before its fresh-only private prerequisite checks.
    const installers = ['control-storage', 'audited-helper-storage', 'workspace-incarnation-storage',
      'portal-authority-storage', 'portal-session-issuance-storage', 'portal-administrative-authority-storage',
      'workspace-locator-storage', 'capability-policy-definition-storage', 'audited-role-guard-installer',
      'original-runtime-login-installer', 'portal-source-locks', 'portal-source-observation',
      'portal-installed-policy-observation', 'portal-policy-joint-locks', 'portal-policy-joint-observation'];
    for (const name of installers) {
      const path = 'src/lib/tenancy/runtime/' + name + '.sql';
      try { await query(admin, sources[path]); }
      finally { await rollback(admin); await retainObjects(); }
      record({ operation: 'WHOLE_SOURCE_PINNED_INSTALLER_ACKNOWLEDGED', path, sourceSHA256: PINNED_SOURCES[path], catalog: await catalog() });
    }
    await fenced(async () => {
      const settings = (await query(admin, `SELECT 'pg_catalog.pg_settings'::regclass::oid::text AS oid,
        pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::regclass,false) AS definition,
        ARRAY(SELECT pg_catalog.pg_get_ruledef(r.oid,false) FROM pg_catalog.pg_rewrite r
          WHERE r.ev_class='pg_catalog.pg_settings'::regclass ORDER BY r.rulename COLLATE pg_catalog."C") AS rules`)).rows[0];
      for (const [kind, role] of [['APP', appRole], ['WORKER', workerRole]] as const)
        await query(admin, 'INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules) VALUES($1,$2,$3::oid,$4::oid,$5,$6::text[])',
          [kind, role.name, role.oid, settings.oid, settings.definition, settings.rules]);
      for (const role of [appRole, workerRole]) {
        await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + q(role.name));
        await query(admin, 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding,nevora_tenancy.audited_helper_capability TO ' + q(role.name));
        await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_audited_runtime_role(text) TO ' + q(role.name));
      }
    });
    await retainObjects();
    const currentObjects = await observedObjects();
    expect(currentObjects.filter(row => row.kind === 'SCHEMA')).toHaveLength(1);
    expect(currentObjects.filter(row => row.kind === 'TABLE')).toHaveLength(18);
    expect(currentObjects.filter(row => row.kind === 'FUNCTION')).toHaveLength(15);
    expect(currentObjects.filter(row => row.kind === 'TRIGGER')).toHaveLength(27);
    expect(currentObjects).toHaveLength(61); expect(roles).toHaveLength(3);
    expect((await query(admin, 'SELECT * FROM nevora_tenancy.audited_helper_capability')).rows).toEqual([]);
    await assertEmptyOriginalAndPrivate();
    rendered = queries['reviewed-policy-template.candidate.sql'].replaceAll('"__BOUND_PORTAL_READER_OWNER__"', q(readerRole.name));
    // The approved comments retain the bare placeholder description. Check the
    // exact quoted SQL identifier token and all17 exact rendered role targets.
    expect(queries['reviewed-policy-template.candidate.sql'].split('"__BOUND_PORTAL_READER_OWNER__"').length - 1).toBe(17);
    expect(rendered).not.toContain('"__BOUND_PORTAL_READER_OWNER__"');
    expect(rendered.split(q(readerRole.name)).length - 1).toBe(17);
    await compileIntent();
    installer = await connect(lease.user); app = await connect(appRole.name);
    expect(clients.size).toBe(3); expect(installer.getTransactionStatus()).toBe('I'); expect(app.getTransactionStatus()).toBe('I');
    writeFileSync(join(runPath!, 'portal-controlled-install-fixture-custody.json'), JSON.stringify({
      base, stage, sourcePin, sources: PINNED_SOURCES, queries: QUERY_PINS, objects: [...objects.values()], roles,
      selectedEnrollmentRelations: 15, physicalTables: 18, prerequisiteExtras: ['public.locations', 'nevora_tenancy.owned_table_contract', 'nevora_tenancy.expansion_protocol'],
      intendedPolicyDefinitionObservation: intended, clientCount: 3, maximumNamedObjects: 62,
      sourceBusinessRows: 0, privateRows: 0, controlRows: 'EXACT_PROTOCOL_FIVE_CONTRACTS_TWO_ROLE_BINDINGS_ONLY',
      claim: 'ROOT_OWNED_NATIVE_INSTALL_SOURCE_OBSERVATIONS_NOT_RUNTIME_PROOF_OR_EXECUTING_BUILD_AUTHORITY',
    }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 120000);

  it('CI-P01 coherently altered USING before producer capture must reject instead of retaining altered policy as intended source', async () => {
    const fullBefore = await catalog(); const retainedBefore = await beforeText();
    expect(retainedBefore).toBe(beforeCatalog); expect(installer.getTransactionStatus()).toBe('I'); expect(app.getTransactionStatus()).toBe('I');
    const oldInput = { mode: 'OWNED_LOCAL_SOURCE_ENROLLMENT', database: lease.database, databaseOid: lease.databaseOid,
      marker: lease.marker, systemIdentifier: lease.systemIdentifier, dataDirectory: lease.data, port: lease.port,
      installerRole: lease.user, installerRoleOid: installerOid, readerOwner: readerRole.name, readerOwnerOid: readerRole.oid,
      appRole: appRole.name, appRoleOid: appRole.oid,
      reviewReference: 'F-DEV-COMPLETE-001:portal-controlled-install-native-review:' + lease.invocation,
      reviewedBeforeCatalogCapsuleText: retainedBefore } as const;
    const input = stage === 'FINAL_INTENT' ? { ...oldInput, intendedPolicyDefinitionObservation: intended } : oldInput;
    originalQuery = installer.query;
    const transport = originalQuery.bind(installer);
    // Explicit ROOT-ONLY fixture fault, never part of the producer/capture API.
    // It uses the SAME real Client and acknowledged SQL; no mocked pg result,
    // fake plan/capsule/identity or root-helper success is supplied. It changes
    // one policy USING after the fixed policy batch but before subsequent grants
    // and native capture. Always restore this own method in finally.
    installer.query = (async (text: unknown, values?: unknown[]) => {
      try {
        if (text === 'COMMIT') installerCommitAttempts += 1;
        const result = await transport(text as string, values);
        producerQueries.push({ sqlSHA256: hash(text as string), result: 'ACK' });
        if (typeof text === 'string' && text.startsWith('SELECT p.oid::pg_catalog.text AS oid FROM pg_catalog.pg_proc')) {
          record({ operation: 'FIXED_BODY_CONTRACT_NATIVE_SELECTOR_RESULT', name: values?.[0], language: values?.[5], rows: result.rows });
        }
        if (text === queries['independent-before-catalog.candidate.sql']) {
          record({ operation: 'PRODUCER_BEFORE_CATALOG_ACTUALLY_CAPTURED', rows: result.rows,
            independentlyRetainedBeforeCatalog: retainedBefore, exactMatch: result.rows.length === 1 && result.rows[0].before_catalog === retainedBefore });
        }
        if (text === queries['independent-current-catalog.candidate.sql']) {
          finalCatalogCaptureCount += 1;
          record({ operation: 'CI_P01_PRECOMMIT_NATIVE_CATALOG_ACTUALLY_REACHED', rows: result.rows, finalCatalogCaptureCount });
        }
        if (text === rendered) {
          expect(faultCount).toBe(0); faultCount += 1;
          await transport('ALTER POLICY portal_reader_workspace_locator_select ON nevora_tenancy.workspace_locator USING (true)');
          const definitions = (await transport(queries['independent-policy-definitions.candidate.sql'])).rows[0].definitions as PolicyDefinition[];
          const changed = definitions.find(value => value.policyName === 'portal_reader_workspace_locator_select');
          record({ operation: 'CI_P01_EXPLICIT_COHERENT_USING_FAULT_BEFORE_FINAL_CAPTURE', intended,
            observedDefinitions: definitions, changed, faultCount, oldSourceRequested: stage !== 'FINAL_INTENT' });
          expect(definitions).toHaveLength(17); expect(changed?.using).toBe('true');
          expect(changed?.using).not.toBe(intended.definitions.find(value => value.policyName === changed?.policyName)?.using);
        }
        return result;
      } catch (error) {
        producerQueries.push({ sqlSHA256: typeof text === 'string' ? hash(text) : 'NON_TEXT', result: 'ERROR', sqlstate: code(error) });
        record({ operation: 'PRODUCER_REAL_TRANSPORT_ERROR', sqlstate: code(error),
          sqlSHA256: typeof text === 'string' ? hash(text) : null, faultCount }); throw error;
      }
    }) as Client['query'];
    let outcome: Awaited<ReturnType<typeof api.prepareControlledLocalPortalInstallation>>;
    try { outcome = await api.prepareControlledLocalPortalInstallation(installer, app, input); }
    finally { installer.query = originalQuery; originalQuery = null; }
    // Capture observations BEFORE feature assertions, including coherent old
    // RETAINED output. Original993's unreached fault/source SQL error is a setup
    // blocker, never evidence that CI-P01's intended-policy defect was reached.
    const after = await catalog(); const currentDefinitions = await nativeDefinitions(); await retainObjects();
    const rawBytes = 'bytes' in outcome ? Buffer.from(outcome.bytes) : null;
    if (rawBytes) {
      expect(Buffer.from(rawBytes.toString('utf8'), 'utf8').equals(rawBytes)).toBe(true);
      writeFileSync(join(runPath!, 'portal-controlled-install-unexpected-retained-source-bytes.json'), rawBytes, { flag: 'wx', mode: 0o600 });
    }
    record({ caseId: 'CI-P01', stage, sourcePin, faultCount, finalCatalogCaptureCount, installerCommitAttempts, producerQueries, outcome: rawBytes ? { status: outcome.status,
      byteLength: rawBytes.length, sha256: hash(rawBytes) } : outcome,
      currentDefinitions, afterCatalog: after,
      classification: faultCount === 0 ? 'SOURCE_OR_SETUP_BLOCKER_NOT_POLICY_FEATURE_RED' :
        finalCatalogCaptureCount === 0 ? 'EARLIER_NATIVE_GATE_FAILURE_NOT_INTENDED_POLICY_FEATURE_RED' :
        outcome.status === 'RETAINED_SOURCE_INSTALLATION_NOT_AUTHORITY' ? 'INTENDED_POLICY_DRIFT_REACHED_UNEXPECTED_RETAIN' : 'DRIFT_REACHED_CHECK_ACTUAL_OUTCOME',
      claim: 'NO_PROOF_OR_ROOT_BODY_INVOKED_NO_GENERATED_INSTALLATION_WRITER_CALLED' });
    expect(faultCount, 'Policy fault must be reached; otherwise retain source/setup failure separately').toBe(1);
    expect(finalCatalogCaptureCount, 'Current catalog must be actually reached; other enrollment gate failures are not this feature').toBe(1);
    expect(outcome.status).toBe('ROLLED_BACK');
    expect(installerCommitAttempts).toBe(0);
    expect('bytes' in outcome).toBe(false);
    expect(installer.getTransactionStatus()).toBe('I'); expect(app.getTransactionStatus()).toBe('I');
    expect(currentDefinitions).toEqual([]); expect(after).toBe(fullBefore); expect(await beforeText()).toBe(retainedBefore);
    await assertEmptyOriginalAndPrivate();
  }, 120000);

  // CI-P02 BEGIN: additive, UNEXECUTED clean source-enrollment vector only.
  // The unchanged CI-P01 must first establish exact rollback. Only the final
  // mandatory-intent producer can run this case; prior defect stages skip it.
  it.skipIf(stage !== 'FINAL_INTENT')('CI-P02 clean enrollment retains exact independent policy intent and fresh APP source observations only', async () => {
    const retainedBefore = await beforeText();
    expect(retainedBefore).toBe(beforeCatalog); expect(await nativeDefinitions()).toEqual([]);
    expect(installer.getTransactionStatus()).toBe('I'); expect(app.getTransactionStatus()).toBe('I');
    await assertEmptyOriginalAndPrivate();
    const { RUNTIME_CATALOG_SHARED_FENCE_SQL } = await import('./catalog-fence.server');
    const { PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL } = await import('./portal-native-installation-capture.server');
    const { PORTAL_SOURCE_IMAGE_BYTES } = await import('./portal-source-image.generated');
    const { loadPortalRuntimeSourceImage } = await import('./portal-runtime-startup-loader');
    const generatedInstallation = resolve('src/lib/tenancy/runtime/portal-native-installation.generated.json');
    const requireNoGeneratedInstallation = () => {
      try { lstatSync(generatedInstallation); throw new Error('CI_P02_GENERATED_INSTALLATION_UNEXPECTED'); }
      catch (error) { expect((error as NodeJS.ErrnoException).code).toBe('ENOENT'); }
    };
    requireNoGeneratedInstallation();
    const input = { mode: 'OWNED_LOCAL_SOURCE_ENROLLMENT', database: lease.database, databaseOid: lease.databaseOid,
      marker: lease.marker, systemIdentifier: lease.systemIdentifier, dataDirectory: lease.data, port: lease.port,
      installerRole: lease.user, installerRoleOid: installerOid, readerOwner: readerRole.name, readerOwnerOid: readerRole.oid,
      appRole: appRole.name, appRoleOid: appRole.oid,
      reviewReference: 'F-DEV-COMPLETE-001:portal-controlled-install-native-review:' + lease.invocation,
      reviewedBeforeCatalogCapsuleText: retainedBefore, intendedPolicyDefinitionObservation: intended } as const;
    type FreshCapture = { startup: Record<string, unknown>; privateEnrollment: {
      format: string; nativeCatalogCapsuleText: string; nativeCatalogCapsuleSha256: string } };
    const installerStatements: string[] = [], appStatements: string[] = [];
    const observations: { client: 'INSTALLER' | 'APP'; sqlSHA256: string; result: 'ACK' | 'ERROR'; sqlstate?: string }[] = [];
    let installerCommitAcknowledged = 0, appCommitAcknowledged = 0, captureCount = 0, catalogCount = 0;
    let committedCatalog: string | undefined, freshCapture: FreshCapture | undefined, finalGuardRows: unknown;
    const savedInstallerQuery = installer.query, savedAppQuery = app.query;
    const installerTransport = savedInstallerQuery.bind(installer), appTransport = savedAppQuery.bind(app);
    // Observe unchanged actual Client calls/results. No policy fault, fake row,
    // source result, caller authorization flag or replay is introduced here.
    installer.query = (async (text: unknown, values?: unknown[]) => {
      installerStatements.push(text as string);
      try {
        const result = await installerTransport(text as string, values);
        observations.push({ client: 'INSTALLER', sqlSHA256: hash(text as string), result: 'ACK' });
        if (text === 'COMMIT') installerCommitAcknowledged += 1;
        if (text === queries['independent-current-catalog.candidate.sql']) {
          catalogCount += 1; committedCatalog = result.rows[0]?.before_catalog as string | undefined;
          record({ operation: 'CI_P02_REAL_PRECOMMIT_CATALOG', rows: result.rows });
        }
        return result;
      } catch (error) {
        observations.push({ client: 'INSTALLER', sqlSHA256: hash(text as string), result: 'ERROR', sqlstate: code(error) }); throw error;
      }
    }) as Client['query'];
    app.query = (async (text: unknown, values?: unknown[]) => {
      appStatements.push(text as string);
      try {
        const result = await appTransport(text as string, values);
        observations.push({ client: 'APP', sqlSHA256: hash(text as string), result: 'ACK' });
        if (text === 'COMMIT') appCommitAcknowledged += 1;
        if (text === PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text) {
          captureCount += 1; expect(result.rows).toHaveLength(1);
          expect(Object.keys(result.rows[0]).sort()).toEqual(['privateEnrollment', 'startup']);
          freshCapture = result.rows[0] as FreshCapture;
          record({ operation: 'CI_P02_REAL_FRESH_ORIGINAL_APP_CAPTURE', rows: result.rows });
        }
        if (text === "SELECT 1/CASE WHEN nevora_tenancy.assert_audited_runtime_role('APP'::pg_catalog.text) IS TRUE THEN 1 ELSE 0 END AS guard;") finalGuardRows = result.rows;
        return result;
      } catch (error) {
        observations.push({ client: 'APP', sqlSHA256: hash(text as string), result: 'ERROR', sqlstate: code(error) }); throw error;
      }
    }) as Client['query'];
    let outcome: Awaited<ReturnType<typeof api.prepareControlledLocalPortalInstallation>>;
    try { outcome = await api.prepareControlledLocalPortalInstallation(installer, app, input); }
    finally { installer.query = savedInstallerQuery; app.query = savedAppQuery; }
    // Retain the real clean outcome/catalog before feature assertions. The fixed
    // run artifact is evidence, not the create-only generated installation writer.
    const definitions = await nativeDefinitions(), fullAfter = await catalog(); await retainObjects();
    const bytes = 'bytes' in outcome ? Buffer.from(outcome.bytes) : null;
    if (bytes) writeFileSync(join(runPath!, 'portal-controlled-install-clean-retained-source-bytes.json'), bytes, { flag: 'wx', mode: 0o600 });
    record({ caseId: 'CI-P02', stage, sourcePin, installerCommitAcknowledged, appCommitAcknowledged, captureCount, catalogCount,
      observations, outcome: bytes ? { status: outcome.status, byteLength: bytes.length, sha256: hash(bytes) } : outcome,
      independentlyCompiledIntent: intended, currentDefinitions: definitions, afterCatalog: fullAfter,
      claim: 'CLEAN_LOCAL_RETAINED_SOURCE_OBSERVATIONS_NOT_PROOF_ROOT_BODY_BUILD_CURRENT_AUTHORITY_OR_ACTIVATION' });
    expect(outcome.status).toBe('RETAINED_SOURCE_INSTALLATION_NOT_AUTHORITY');
    if (outcome.status !== 'RETAINED_SOURCE_INSTALLATION_NOT_AUTHORITY' || !bytes || !freshCapture || !committedCatalog)
      throw new Error('CI_P02_CLEAN_SOURCE_OBSERVATIONS_NOT_RETAINED');
    expect(Object.isFrozen(outcome)).toBe(true); expect(Object.isFrozen(outcome.bytes)).toBe(true);
    expect(installerCommitAcknowledged).toBe(1); expect(appCommitAcknowledged).toBe(1);
    expect(captureCount).toBe(1); expect(catalogCount).toBe(1);
    expect(observations.every(value => value.result === 'ACK')).toBe(true);
    expect(installerStatements.slice(0, 3)).toEqual(['BEGIN ISOLATION LEVEL READ COMMITTED', INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text, 'SET LOCAL search_path=pg_catalog']);
    expect(installerStatements.slice(-2)).toEqual([queries['independent-current-catalog.candidate.sql'], 'COMMIT']);
    expect(appStatements.slice(0, 3)).toEqual(['BEGIN ISOLATION LEVEL READ COMMITTED', RUNTIME_CATALOG_SHARED_FENCE_SQL.text, 'SET LOCAL search_path=pg_catalog']);
    expect(appStatements.slice(-3)).toEqual([PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text,
      "SELECT 1/CASE WHEN nevora_tenancy.assert_audited_runtime_role('APP'::pg_catalog.text) IS TRUE THEN 1 ELSE 0 END AS guard;", 'COMMIT']);
    expect(finalGuardRows).toEqual([{ guard: 1 }]);
    expect(installerStatements.filter(text => text === rendered)).toHaveLength(1);
    expect([...installerStatements, ...appStatements].some(text => /^ALTER POLICY\b/.test(text))).toBe(false);
    expect(installer.getTransactionStatus()).toBe('I'); expect(app.getTransactionStatus()).toBe('I');
    expect(definitions).toEqual(intended.definitions); expect(definitions).toHaveLength(17);
    expect(definitions.filter(value => value.command === 'w')).toHaveLength(8);
    expect(new Set(definitions.map(value => value.relationName)).size).toBe(9);
    const currentCatalog = (await query(admin, queries['independent-current-catalog.candidate.sql'], [installerOid, readerRole.oid, appRole.oid])).rows;
    expect(currentCatalog).toEqual([{ before_catalog: committedCatalog }]);
    expect(Buffer.from(bytes.toString('utf8'), 'utf8').equals(bytes)).toBe(true);
    const retained = JSON.parse(bytes.toString('utf8')) as { format: string; sourceImageSha256: string; producerSourceBytes: number[];
      installationSourceBundle: Record<string, number[]>; catalogFenceProtocolSha256: string; startup: Record<string, unknown>;
      privateEnrollment: FreshCapture['privateEnrollment'] };
    expect(Buffer.from(JSON.stringify(retained) + '\n').equals(bytes)).toBe(true);
    expect(Object.keys(retained).sort()).toEqual(['catalogFenceProtocolSha256', 'format', 'installationSourceBundle', 'privateEnrollment', 'producerSourceBytes', 'sourceImageSha256', 'startup']);
    expect(retained.format).toBe('PORTAL_NATIVE_INSTALLATION_RETAINED_V1');
    expect(retained.sourceImageSha256).toBe(hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-source-image.generated.ts'))));
    expect(retained.producerSourceBytes).toEqual([...readFileSync(resolve('src/lib/tenancy/runtime/portal-native-installation-producer.server.ts'))]);
    expect(retained.catalogFenceProtocolSha256).toBe(hash(RUNTIME_CATALOG_SHARED_FENCE_SQL.text + '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text));
    const fixedFiles = { auditedRoleGuardInstallerSource: 'audited-role-guard-installer.sql', originalRuntimeLoginInstallerSource: 'original-runtime-login-installer.sql',
      portalSourceLocksSource: 'portal-source-locks.sql', portalSourceObservationSource: 'portal-source-observation.sql',
      portalInstalledPolicyObservationSource: 'portal-installed-policy-observation.sql', portalPolicyJointLocksSource: 'portal-policy-joint-locks.sql',
      portalPolicyJointObservationSource: 'portal-policy-joint-observation.sql', privateEnrollmentCaptureSource: 'portal-native-installation-capture.server.ts' };
    const bundle = retained.installationSourceBundle;
    expect(Object.keys(bundle).sort()).toEqual([...Object.keys(fixedFiles), 'resolvePortalSource', 'privatePoliciesTemplateSource', 'privateGrantsTemplateSource', 'privatePoliciesRenderedSource', 'privateGrantsRenderedSource'].sort());
    for (const value of Object.values(bundle)) {
      expect(Array.isArray(value)).toBe(true); expect(value.length).toBeGreaterThan(0);
      expect(value.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)).toBe(true);
      const raw = Buffer.from(value); expect(Buffer.from(raw.toString('utf8'), 'utf8').equals(raw)).toBe(true);
    }
    for (const [name, file] of Object.entries(fixedFiles)) expect(bundle[name]).toEqual([...readFileSync(resolve('src/lib/tenancy/runtime/' + file))]);
    expect(hash(Buffer.from(bundle.resolvePortalSource))).toBe('068776a706cebc22d5b402f433a7e4ca5756d836948f42dacd1d9c5d4d928873');
    expect(Buffer.from(bundle.privatePoliciesTemplateSource).toString('utf8')).toBe(intended.policyTemplateSource);
    expect(hash(Buffer.from(bundle.privateGrantsTemplateSource))).toBe('7b292d5d46b82c7befcd8e990cab5543609a70cc5bf97617103ad18a022dbf5c');
    expect(Buffer.from(bundle.privatePoliciesRenderedSource).toString('utf8')).toBe(intended.renderedPolicySource);
    expect(Buffer.from(bundle.privateGrantsRenderedSource).toString('utf8')).toBe(Buffer.from(bundle.privateGrantsTemplateSource).toString('utf8').replaceAll('"__BOUND_PORTAL_READER_OWNER__"', q(readerRole.name)));
    const image = loadPortalRuntimeSourceImage(PORTAL_SOURCE_IMAGE_BYTES);
    expect(image.status).toBe('SOURCE_IMAGE_LOADED_NOT_EXECUTION_ATTESTATION');
    if (image.status !== 'SOURCE_IMAGE_LOADED_NOT_EXECUTION_ATTESTATION') throw new Error('CI_P02_REAL_FIXED_IMAGE_NOT_LOADED');
    expect(retained.startup).toEqual({ ...freshCapture.startup, format: 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1',
      canonicalPolicySource: image.image.sources.canonicalPolicySource.text, vocabularySource: image.image.sources.vocabularySource.text,
      approvedPRDSource: image.image.sources.approvedPRDSource.text });
    expect(retained.startup.databaseOid).toBe(lease.databaseOid); expect(retained.startup.ownerOid).toBe(readerRole.oid);
    expect(retained.startup.rootDefinitionSha256).toBe(hash(retained.startup.rootDefinition as string));
    expect(retained.startup.nativeAuditCapsuleSha256).toBe(hash(retained.startup.nativeAuditCapsuleText as string));
    const root = (JSON.parse(fullAfter) as { functions: { catalog: { oid: string; proname: string; proowner: string; prosrc: string }; definition: string }[] }).functions.filter(value => value.catalog.proname === 'resolve_portal');
    expect(root).toHaveLength(1); expect(String(root[0].catalog.oid)).toBe(retained.startup.rootOid);
    expect(String(root[0].catalog.proowner)).toBe(readerRole.oid); expect(root[0].definition).toBe(retained.startup.rootDefinition);
    const rootBody = Buffer.from(bundle.resolvePortalSource).toString('utf8').split('$protected_portal_source_resolver$')[1];
    expect(root[0].catalog.prosrc).toBe(rootBody);
    expect(retained.privateEnrollment).toEqual(freshCapture.privateEnrollment);
    expect(retained.privateEnrollment.format).toBe('PORTAL_PRIVATE_READER_ENROLLMENT_SOURCE_V1');
    expect(retained.privateEnrollment.nativeCatalogCapsuleSha256).toBe(hash(retained.privateEnrollment.nativeCatalogCapsuleText));
    expect((JSON.parse(retained.privateEnrollment.nativeCatalogCapsuleText) as { installationCatalogText: string }).installationCatalogText).toBe(committedCatalog);
    requireNoGeneratedInstallation(); await assertEmptyOriginalAndPrivate();
    expect(readFileSync(join(runPath!, 'portal-controlled-install-clean-retained-source-bytes.json')).equals(bytes)).toBe(true);
    record({ operation: 'CI_P02_CLEAN_SOURCE_BYTE_POLICY_AND_FRESH_NATIVE_EQUALITIES', sourceImageSha256: retained.sourceImageSha256,
      retainedBytesSha256: hash(bytes), rootOid: retained.startup.rootOid, ownerOid: readerRole.oid,
      policyCount: definitions.length, producerSourceSha256: hash(Buffer.from(retained.producerSourceBytes)),
      generatedInstallationWritten: false, rootBodyInvoked: false, executingBuildAuthenticated: false, currentAuthorityIssued: false });
    // UNEXECUTED additive block AFTER every original CI-P02 assertion/receipt.
    // Original F_CI lease/fixture/role/native-input/preimage/controller required;
    // root alone stages/executes this, preserves original CI-P01/default HOLD.
    // No second enrollment, fabricated outcome/capture, generated input copy,
    // root body invocation, build/start or private source/effect authority.
    const publicationAPI=await import('./portal-native-installation-producer.server');
    const generated=resolve('src/lib/tenancy/runtime/portal-native-installation.generated.json');
    const assertAbsent=()=>{try{lstatSync(generated);}catch(error){if(error instanceof Error&&Object.getOwnPropertyDescriptor(error,'code')?.value==='ENOENT')return;throw error;}throw Error('GENERATED_FILE_UNEXPECTED');};
    assertAbsent();
    const copied=JSON.parse(JSON.stringify(outcome));
    expect(await publicationAPI.writeCurrentControlledPortalInstallationBytes(installer,app,copied)).toEqual({status:'BLOCKED',code:'CONTROLLED_PORTAL_PUBLICATION_UNAVAILABLE',reconciliation:'FRESH_ROOT_OWNED_ORIGINAL_INPUT_RECHECK_REQUIRED'});
    assertAbsent();
    // Original real outcome remains genuine: the rejected clone does not consume it.
    let generatedOid:Readonly<{dev:number;ino:number}>|null=null;
    try{
      // Observe the actual original Client transport, preserving native ACKs
      // and fixed SQLSTATE/bind arity only. No response, identity or SQL mock.
      const publicationObservations:{client:'INSTALLER'|'APP';sqlSHA256:string;bindCount:number;result:'ACK'|'ERROR';sqlstate?:string}[]=[];
      const priorInstallerQuery=installer.query,priorAPPQuery=app.query;
      for(const [client,kind,original] of [[installer,'INSTALLER',priorInstallerQuery],[app,'APP',priorAPPQuery]] as const){
        const transport=original.bind(client);
        client.query=(async(text:unknown,values?:unknown[])=>{
          const observed={client:kind,sqlSHA256:hash(text as string),bindCount:values?.length??0};
          try{const result=await transport(text as string,values);publicationObservations.push({...observed,result:'ACK'});return result;}
          catch(error){publicationObservations.push({...observed,result:'ERROR',sqlstate:code(error)});throw error;}
        }) as Client['query'];
      }
      let published:Awaited<ReturnType<typeof publicationAPI.writeCurrentControlledPortalInstallationBytes>>;
      try{published=await publicationAPI.writeCurrentControlledPortalInstallationBytes(installer,app,outcome);}
      finally{installer.query=priorInstallerQuery;app.query=priorAPPQuery;}
      record({operation:'CI_P02_ACTUAL_PUBLICATION_TRANSPORT',observations:publicationObservations,
        installerTransactionStatus:installer.getTransactionStatus(),appTransactionStatus:app.getTransactionStatus()});
      record({operation:'CI_P02_GENUINE_CURRENT_CREATE_ONLY_PUBLICATION',result:published,rootBodyInvoked:false,executingBuildAuthenticated:false,currentAuthorityIssued:false});
      expect(published.status).toBe('GENERATED_SOURCE_PUBLISHED_NOT_AUTHORITY');
      if(published.status!=='GENERATED_SOURCE_PUBLISHED_NOT_AUTHORITY')throw Error('CURRENT_PUBLICATION_REQUIRED');
      // Causal regression from actual native08P01: the unchanged AFTER query
      // has precisely3 OID slots, with actual ACKs on both owning transactions.
      expect(publicationObservations.every(observed=>observed.result==='ACK')).toBe(true);
      const installerCalls=publicationObservations.filter(observed=>observed.client==='INSTALLER');
      const appCalls=publicationObservations.filter(observed=>observed.client==='APP');
      const first=['BEGIN ISOLATION LEVEL READ COMMITTED',RUNTIME_CATALOG_SHARED_FENCE_SQL.text,'SET LOCAL search_path=pg_catalog'].map(hash);
      expect(installerCalls.slice(0,3).map(observed=>observed.sqlSHA256)).toEqual(first);
      expect(appCalls.slice(0,3).map(observed=>observed.sqlSHA256)).toEqual(first);
      expect(installerCalls.filter(observed=>observed.sqlSHA256===hash(queries['independent-current-catalog.candidate.sql']))).toEqual([
        {client:'INSTALLER',sqlSHA256:hash(queries['independent-current-catalog.candidate.sql']),bindCount:3,result:'ACK'},
      ]);
      for(const calls of [installerCalls,appCalls]){
        expect(calls.filter(observed=>observed.sqlSHA256===hash('COMMIT'))).toHaveLength(1);
        expect(calls.at(-1)!.sqlSHA256).toBe(hash('COMMIT'));
      }
      expect(appCalls.filter(observed=>observed.sqlSHA256===hash(PORTAL_CONTROLLED_INSTALL_CAPTURE_SQL.text))).toHaveLength(1);

      const installed=lstatSync(generated);generatedOid={dev:installed.dev,ino:installed.ino};
      expect(installed.isSymbolicLink()).toBe(false);expect(installed.uid).toBe(process.getuid?.());expect(installed.mode&0o777).toBe(0o600);expect(installed.nlink).toBe(1);
      expect(readFileSync(generated).equals(bytes)).toBe(true);expect(published.sha256).toBe(hash(bytes));expect(published.byteLength).toBe(bytes.length);
      expect(publicationAPI.isControlledPortalGeneratedPublication(published)).toBe(true);expect(publicationAPI.isControlledPortalGeneratedPublication(JSON.parse(JSON.stringify(published)))).toBe(false);
      const before=readFileSync(generated);
      expect(await publicationAPI.writeCurrentControlledPortalInstallationBytes(installer,app,outcome)).toEqual({status:'BLOCKED',code:'CONTROLLED_PORTAL_PUBLICATION_UNAVAILABLE',reconciliation:'FRESH_ROOT_OWNED_ORIGINAL_INPUT_RECHECK_REQUIRED'});
      expect(readFileSync(generated).equals(before)).toBe(true);
      expect(installer.getTransactionStatus()).toBe('I');expect(app.getTransactionStatus()).toBe('I');
      expect(await catalog()).toBe(fullAfter);expect(await nativeDefinitions()).toEqual(intended.definitions);await assertEmptyOriginalAndPrivate();
    }finally{
      // ROOT ONLY exact-own inode deletion. If publication failed before its
      // inode was acknowledged, leave partial bytes for explicit reconciliation;
      // do not erase a preexisting/foreign/raced file or claim clean closure.
      if(generatedOid){const now=lstatSync(generated);if(now.isSymbolicLink()||now.dev!==generatedOid.dev||now.ino!==generatedOid.ino)throw Error('GENERATED_CLEANUP_IDENTITY_DRIFT');unlinkSync(generated);assertAbsent();}
    }
  }, 120000);
  // CI-P02 END.
  afterAll(async () => {
    const closure: { pid?: number; closed: boolean; status: string | null }[] = [];
    let cleaned = false, cleanupError: string | null = null;
    try {
      if (originalQuery && installer) { installer.query = originalQuery; originalQuery = null; }
      // The producer has finished (including uncertain result). A DIFFERENT
      // verified root-owned admin client reconciles observed exact fixture OIDs;
      // this does not add SQL to a producer client after attempted COMMIT.
      for (const client of clients) if (client !== admin) {
        try {
          const status = client.getTransactionStatus() ?? null;
          const pid = (client as Client & { processID?: number }).processID;
          await client.end(); closedClients.add(client); closure.push({ pid, status, closed: true });
        } catch { closure.push({ status: client.getTransactionStatus() ?? null, closed: false }); }
      }
      if (verified && admin) {
        await rollback(admin); await checkBase(); await retainObjects();
        record({ operation: 'ROOT_FRESH_OWNED_CLEANUP_RECONCILIATION', stage, sourcePin,
          catalog: await catalog(), objects: [...objects.values()], roles });
        await fenced(async () => {
          const current = await observedObjects();
          const root = current.find(row => row.kind === 'FUNCTION' && row.name === 'resolve_portal');
          if (root) {
            expect(root.owner).toBe(readerRole.oid); expect(root.signature).toBe('p_locator text, p_session_token_hash text');
            // Exact own uncommitted/committed root tuple is deleted only from the
            // fixture registry. No source/private business rows are repaired.
            await query(admin, "DELETE FROM nevora_tenancy.audited_helper_capability WHERE runtime_kind='APP' AND route_kind='DIRECT_CALL' AND route_oid=0 AND function_oid=$1::oid", [root.oid]);
            await query(admin, 'DROP FUNCTION nevora_tenancy.resolve_portal(text,text)');
            expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [root.oid])).rows).toEqual([]);
            record({ operation: 'EXACT_OWN_ROOT_OID_DROPPED', root });
          }
          // CI-NF02: native010 proved two definition policies depend on the
          // installation head, whose FK requires this existing table order.
          // Remove only these exact fixture-owned policy tuples before tables;
          // no CASCADE or deletion of policies selected from unknown objects.
          const dependencyNames = ['portal_reader_capability_policy_definition_select', 'portal_reader_capability_policy_definition_lock'] as const;
          const policyTuples = (JSON.parse(await catalog()) as { policies: { oid: string; polrelid: string; polname: string; polcmd: string; polpermissive: boolean; polroles: string[] }[] }).policies;
          const dependencies = policyTuples.filter(value => dependencyNames.includes(value.polname as typeof dependencyNames[number]));
          expect([0, 2]).toContain(dependencies.length);
          const definitions = await nativeDefinitions();
          for (const policy of dependencies) {
            const relation = objects.get('TABLE:' + policy.polrelid);
            expect(relation).toMatchObject({ schema: 'nevora_tenancy', name: 'capability_policy_definition', owner: installerOid, oid: String(policy.polrelid) });
            expect(policy.polpermissive).toBe(true); expect(policy.polroles).toEqual([readerRole.oid]);
            expect(policy.polcmd).toBe(policy.polname.endsWith('_select') ? 'r' : 'w');
            const definition = definitions.find(value => value.policyName === policy.polname);
            expect(definition).toEqual(intended.definitions.find(value => value.policyName === policy.polname));
            expect(definition?.relationOid).toBe(String(policy.polrelid));
            expect((await query(admin, 'SELECT pg_catalog.to_jsonb(p)::text AS tuple FROM pg_catalog.pg_policy p WHERE p.oid=$1::oid', [String(policy.oid)])).rows.map(row => JSON.parse(row.tuple))).toEqual([policy]);
            record({ operation: 'EXACT_OWN_DEPENDENCY_POLICY_OID_BEFORE_DROP', policy, relation, definition });
            await query(admin, 'DROP POLICY ' + q(policy.polname) + ' ON nevora_tenancy.capability_policy_definition');
            expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_policy WHERE oid=$1::oid', [String(policy.oid)])).rows).toEqual([]);
            record({ operation: 'EXACT_OWN_DEPENDENCY_POLICY_OID_DROPPED', policy });
          }
          // Table order is fixed from original physical foreign keys. Dropping
          // own table removes only its internal indexes/constraints/policies and
          // exact owned trigger OIDs; no CASCADE, DROP OWNED or broad enumeration
          // deletion of unknown objects is allowed.
          for (const target of tablesToDrop) {
            const [schema, name] = target.split('.');
            const rows = (await query(admin, 'SELECT c.oid::text AS oid,c.relowner::text AS owner FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2', [schema, name])).rows;
            if (rows.length === 0) continue;
            expect(rows).toHaveLength(1); const object = objects.get('TABLE:' + rows[0].oid);
            expect(object).toMatchObject({ schema, name, owner: installerOid, oid: rows[0].oid });
            await query(admin, 'DROP TABLE ' + q(schema) + '.' + q(name));
            expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_class WHERE oid=$1::oid', [object!.oid])).rows).toEqual([]);
            record({ operation: 'EXACT_OWN_TABLE_OID_DROPPED', object });
          }
          const functions = (await observedObjects()).filter(row => row.kind === 'FUNCTION');
          for (const object of functions.reverse()) {
            expect(functionNames).toContain(object.name); expect(object.owner).toBe(installerOid);
            expect(objects.get('FUNCTION:' + object.oid)).toEqual(object);
            await query(admin, 'DROP FUNCTION ' + q(object.schema) + '.' + q(object.name) + '(' + object.signature + ')');
            expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
            record({ operation: 'EXACT_OWN_HELPER_OID_DROPPED', object });
          }
          const schema = (await observedObjects()).find(row => row.kind === 'SCHEMA');
          if (schema) {
            expect(schema.owner).toBe(installerOid); expect(objects.get('SCHEMA:' + schema.oid)).toEqual(schema);
            await query(admin, 'DROP SCHEMA nevora_tenancy');
            expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_namespace WHERE oid=$1::oid', [schema.oid])).rows).toEqual([]);
            record({ operation: 'EXACT_OWN_SCHEMA_OID_DROPPED', schema });
          }
          for (const role of [...roles].reverse()) {
            const currentRole = (await query(admin, 'SELECT oid::text AS oid,rolname::text AS name FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2', [role.oid, role.name])).rows;
            if (currentRole.length === 0) continue; // Root-owned setup rolled back.
            expect(currentRole).toEqual([{ oid: role.oid, name: role.name }]);
            const publicRoleAcl = (await query(admin, `SELECT a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
              FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) a
              WHERE n.nspname='public' AND a.grantee=$1::oid ORDER BY a.privilege_type`, [role.oid])).rows;
            if (publicRoleAcl.length > 0) {
              expect(role.oid).toBe(readerRole.oid);
              expect((await query(admin, "SELECT oid::text AS oid,nspowner::text AS owner FROM pg_catalog.pg_namespace WHERE nspname='public'")).rows).toEqual([originalPublicSchema]);
              record({ operation: 'EXACT_OWN_READER_PUBLIC_SCHEMA_NATIVE_ACL_BEFORE_REVOKE', originalPublicSchema, role, publicRoleAcl });
              expect(publicRoleAcl).toEqual([{ grantor: originalPublicSchema.owner, grantee: role.oid, privilege_type: 'USAGE', is_grantable: false }]);
              await query(admin, 'REVOKE USAGE ON SCHEMA public FROM ' + q(role.name));
              expect((await query(admin, `SELECT a.grantee FROM pg_catalog.pg_namespace n
                CROSS JOIN LATERAL pg_catalog.aclexplode(n.nspacl) a WHERE n.nspname='public' AND a.grantee=$1::oid`, [role.oid])).rows).toEqual([]);
              record({ operation: 'EXACT_OWN_READER_PUBLIC_SCHEMA_USAGE_REVOKED', role, publicRoleAcl });
            }
            await query(admin, 'REVOKE CONNECT ON DATABASE ' + q(lease.database) + ' FROM ' + q(role.name));
            await query(admin, 'DROP ROLE ' + q(role.name));
            expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2', [role.oid, role.name])).rows).toEqual([]);
            record({ operation: 'EXACT_OWN_ROLE_OID_DROPPED', role });
          }
          // Restore ONLY the initial PUBLIC privileges changed by this fixture.
          // Expanded native semantic ACL equality is checked; GRANT/REVOKE can
          // change a null/default ACL's physical representation, reported below.
          for (const row of basePrivileges as { kind: string; grantee: string; privilege_type: string; is_grantable: boolean }[]) {
            if (row.grantee !== '0') continue;
            expect(row.is_grantable).toBe(false);
            if (row.kind === 'DATABASE' && ['CREATE', 'TEMPORARY'].includes(row.privilege_type))
              await query(admin, 'GRANT ' + row.privilege_type + ' ON DATABASE ' + q(lease.database) + ' TO PUBLIC');
            if (row.kind === 'PUBLIC_SCHEMA' && row.privilege_type === 'CREATE') await query(admin, 'GRANT CREATE ON SCHEMA public TO PUBLIC');
          }
        });
        expect(await observedObjects()).toEqual([]); expect(await catalog()).toBe(originalEmptyCatalog);
        expect(await privileges()).toEqual(basePrivileges);
        for (const object of objects.values()) {
          const catalogName = object.kind === 'SCHEMA' ? 'pg_namespace' : object.kind === 'TABLE' ? 'pg_class' : object.kind === 'FUNCTION' ? 'pg_proc' : 'pg_trigger';
          expect((await query(admin, 'SELECT oid FROM pg_catalog.' + catalogName + ' WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
        }
        const closedPids = closure.flatMap(item => item.pid === undefined ? [] : [item.pid]);
        expect((await query(admin, 'SELECT pid FROM pg_catalog.pg_stat_activity WHERE pid=ANY($1::int4[])', [closedPids])).rows).toEqual([]);
        for (const [path, pin] of Object.entries(PINNED_SOURCES)) expect(hash(readFileSync(resolve(path)))).toBe(pin);
        expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/portal-native-installation-producer.server.ts')))).toBe(sourcePin);
        cleaned = true; record({ operation: 'EXACT_NATIVE_OBJECT_ROLE_CLIENT_ABSENCE_AND_SOURCE_PRESERVATION',
          objects: [...objects.values()], roles, closedPids, originalEmptyCatalog, finalCatalog: await catalog(),
          finalExpandedPrivileges: await privileges(), privilegeRepresentationNote: 'EXPANDED_SEMANTICS_RESTORED_PHYSICAL_NULL_ACL_FORM_NOT_CLAIMED' });
      }
    } catch (error) {
      cleanupError = code(error); record({ operation: 'CLEANUP_UNCONFIRMED', sqlstate: cleanupError }); throw error;
    } finally {
      for (const client of clients) if (!closedClients.has(client)) {
        const pid = (client as Client & { processID?: number }).processID, status = client.getTransactionStatus() ?? null;
        try { await client.end(); closedClients.add(client); closure.push({ pid, status, closed: true }); }
        catch { closure.push({ pid, status, closed: false }); }
      }
      password = '';
      if (runVerified) {
        const path = join(runPath!, 'portal-controlled-install-operations.jsonl');
        if (operations.length === 0) writeFileSync(path, '', { flag: 'wx', mode: 0o600 });
        const bytes = readFileSync(path), text = bytes.toString('utf8');
        expect(Buffer.from(text, 'utf8').equals(bytes)).toBe(true);
        expect(text).toBe(operations.length === 0 ? '' : operations.join('\n') + '\n');
        const lines = operations.map(line => { const value = JSON.parse(line); expect(JSON.stringify(value)).toBe(line); return value; });
        expect(lines.map(line => line.sequence)).toEqual(lines.map((_, index) => index + 1));
        const jsonl = { byteLength: bytes.length, sha256: hash(bytes), count: lines.length, fullCanonicalUtf8: true };
        writeFileSync(join(runPath!, 'portal-controlled-install-cleanup.json'), JSON.stringify({
          verified, cleaned, cleanupError, stage, sourcePin, faultCount, roles, objects: [...objects.values()], closure,
          connectedOrAttemptedClients: clients.size, closedClients: closedClients.size, sqlAttempted, jsonl,
          clusterCustodyAndCleanup: 'ROOT_DRIVER_MUST_STOP_EXACT_PID_START_SYSTEM_ID_AND_VERIFY_DATA_CREDENTIAL_ABSENCE',
          authority: 'STRUCTURAL_INSTALL_OBSERVATIONS_ONLY_NO_ROOT_CALL_PROOF_EXECUTING_BUILD_OR_ACTIVATION',
        }, null, 2), { flag: 'wx', mode: 0o600 });
        expect(closedClients.size).toBe(clients.size); expect(cleaned || !verified).toBe(true);
      }
    }
  }, 120000);
});
