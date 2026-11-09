import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';

const sqlPath = resolve('src/lib/tenancy/runtime/role-guard.sql');
const testPath = resolve('src/lib/tenancy/runtime/role-guard.test.ts');
const source = readFileSync(sqlPath, 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";

// Root diagnostic of this exact closed helper source, never a general SQL input
// parser or a production decision. Individual predicates expose a baseline
// rejection instead of calling every denied input meaningful coverage.
function predicateDiagnosticSql() {
  const body = source.replace(/--[^\n]*/g, '').split('$role_guard$')[1];
  const marker = /SELECT EXISTS \(\s*SELECT 1 FROM caller AS r CROSS JOIN controlled_catalog AS control\s*WHERE/;
  const parts = body.split(marker);
  if (parts.length !== 2) throw new Error('owned_role_diagnostic_shape_changed');
  const condition = parts[1].replace(/\)\s*;\s*$/, '').trim();
  const expressions: string[] = []; let depth = 0, quoted = false, start = 0;
  for (let i = 0; i < condition.length; i++) {
    if (condition[i] === "'") {
      if (quoted && condition[i + 1] === "'") { i++; continue; }
      quoted = !quoted; continue;
    }
    if (quoted) continue;
    if (condition[i] === '(') depth++; else if (condition[i] === ')') depth--;
    if (depth === 0 && /^AND\b/.test(condition.slice(i)) && /\s/.test(condition[i - 1] ?? '')) {
      expressions.push(condition.slice(start, i).trim()); start = i + 3; i += 2;
    }
  }
  expressions.push(condition.slice(start).trim());
  return (parts[0] + ' SELECT ' + expressions.map((value, i) => value + ' AS predicate_' + i).join(',') + ' FROM caller AS r CROSS JOIN controlled_catalog AS control').replace(/\brequested_kind\b/g, '$1::text');
}

// Scaffold constraints are not PostgreSQL parsing or privilege verification.
// Actual behavior is tested only in the separately opted-in owned suite below.
describe('runtime-role helper source boundary (not SQL execution)', () => {
  const body = source.replace(/--[^\n]*/g, '');
  const statements = body.replace(/'(?:''|[^'])*'/g, "''");
  it('defines only the exact invoker helper with the closed catalog path', () => {
    expect(body).toMatch(/CREATE OR REPLACE FUNCTION nevora_tenancy\.assert_runtime_role\(requested_kind pg_catalog\.text\)/);
    expect(body).toMatch(/RETURNS pg_catalog\.bool/); expect(body).toMatch(/SECURITY INVOKER/);
    expect(body).toMatch(/SET search_path = pg_catalog/);
    expect(body.match(/CREATE OR REPLACE FUNCTION/g)?.length).toBe(1);
    // Privilege names inside SQL string values are not executable statements.
    expect(statements).not.toMatch(/\b(?:GRANT|REVOKE|CREATE TABLE|CREATE ROLE|ALTER ROLE|SECURITY DEFINER|TRUNCATE|DROP)\b/i);
  });
  it('retains catalog-based identity, memberships, ownership and effective privilege checks', () => {
    for (const name of ['pg_roles', 'pg_auth_members', 'pg_shdepend', 'pg_namespace', 'pg_class', 'pg_attribute', 'pg_proc', 'pg_init_privs', 'pg_parameter_acl']) expect(body).toContain('pg_catalog.' + name);
    for (const name of ['has_table_privilege', 'has_any_column_privilege', 'has_schema_privilege', 'has_database_privilege', 'has_function_privilege', 'aclexplode']) expect(body).toContain('pg_catalog.' + name);
    expect(body).toContain('session_user = current_user'); expect(body).toContain("pg_catalog.current_setting('role') = 'none'");
  });
});

type Lease = { scope: string; closed: boolean; invocation: string; root: string; data: string; pid: number; pidStart: string; port: number;
  systemIdentifier: string; database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string };
type ObjectReceipt = { kind: 'schema' | 'table' | 'view' | 'function'; schema: string; name: string; oid: string; signature?: string };
const leasePath = process.env.F_ROLE_OWNED_LEASE, runPath = process.env.F_ROLE_RUN_DIR;

// No lease discovery, cluster startup, application URL, external transport or
// credential store. Root alone invokes these tests on its new fictional lease.
// One partial opt-in fails in beforeAll; absence of both skips every SQL case.
describe.skipIf(!leasePath && !runPath)('owned PostgreSQL direct runtime-role helper', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, password: string;
  let appRole: Role, workerRole: Role, groupRole: Role, outsiderRole: Role;
  let verified = false, setupCommitted = false, sqlAttempted = false;
  const clients = new Set<Client>(), roles: Role[] = [], objects: ObjectReceipt[] = [], records: unknown[] = [];
  const repairs = new Set<string>();
  const sqlstate = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN';
  };
  async function query(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { return await client.query(text, values); } catch (error) { throw new Error('owned_role_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    sqlAttempted = true;
    try { await client.query(text, values); return 'NO_ERROR'; } catch (error) { return sqlstate(error); }
  }
  function record(value: unknown) { records.push(value); appendFileSync(join(runPath!, 'operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 }); }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database, user, password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw new Error('owned_role_connection_failed'); }
    await query(client, 'SET search_path = pg_catalog');
    return client;
  }
  async function checkBase() {
    const actual = (await query(admin, "SELECT current_database() db,(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) oid,pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database') marker,pg_catalog.current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,session_user::text role,current_user::text current_role,pg_catalog.host(pg_catalog.inet_server_addr()) host,pg_catalog.inet_server_port() port,pg_catalog.current_setting('server_version') version,pg_catalog.current_setting('server_encoding') encoding")).rows[0];
    expect(actual).toMatchObject({ db: lease.database, oid: String(lease.databaseOid), marker: lease.marker, data: lease.data, system_id: lease.systemIdentifier,
      role: lease.user, current_role: lease.user, host: '127.0.0.1', port: lease.port, encoding: 'UTF8' });
    expect(actual.version).toMatch(/^18\.4(?:\s|$)/); expect(admin.getTransactionStatus()).toBe('I');
    return actual;
  }
  async function role(name: string) {
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    record({ operation: 'BEFORE_OWN_ROLE_CREATE', name });
    // Root-generated fictional password is used only inside this invocation.
    // The query adapter never emits SQL/error text; root disables server SQL logs.
    await query(admin, 'CREATE ROLE ' + q(name) + ' LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT PASSWORD ' + literal(password));
    const receipt = { name, oid: (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(receipt); record({ operation: 'OWN_ROLE_CREATED', ...receipt }); return receipt;
  }
  async function remember(kind: ObjectReceipt['kind'], schema: string, name: string, signature?: string) {
    const oid = kind === 'schema' ? (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_namespace WHERE nspname=$1', [name])).rows[0].oid :
      kind === 'table' || kind === 'view' ? (await query(admin, 'SELECT pg_catalog.to_regclass($1)::oid::text oid', [q(schema) + '.' + q(name)])).rows[0].oid :
        (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [q(schema) + '.' + q(name) + signature])).rows[0].oid;
    const receipt = { kind, schema, name, oid: oid as string, ...(signature ? { signature } : {}) };
    objects.push(receipt); record({ operation: 'OWN_OBJECT_CREATED', ...receipt }); return receipt;
  }
  async function guard(client: Client, kind: string | null) {
    return (await query(client, 'SELECT nevora_tenancy.assert_runtime_role($1::text) allowed', [kind])).rows[0].allowed as boolean;
  }
  async function mutate(change: string, undo: string, body: () => Promise<void>) {
    repairs.add(undo);
    try { await query(admin, change); await body(); } finally { await query(admin, undo); repairs.delete(undo); }
  }
  const rowsName = () => lease.invocation + '_rows';
  const rowsTable = () => 'public.' + q(rowsName());
  const named = () => [appRole.name, workerRole.name].map(q).join(',');

  beforeAll(async () => {
    // Boolean assertions avoid accidental disclosure of ambient credential text.
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true); expect(realpathSync(runPath!)).toBe(runPath);
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/); expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data'));
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    expect(lstatSync(lease.credentialFile).isFile() && !lstatSync(lease.credentialFile).isSymbolicLink()).toBe(true);
    expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile); expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    expect(statSync(lease.credentialFile).mode & 0o777).toBe(0o600);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user); const actual = await checkBase(); verified = true;
    expect((await query(admin, "SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, "SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
    expect((await query(admin, 'SELECT datdba=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1) owned FROM pg_catalog.pg_database WHERE oid=$2::oid', [lease.user, String(lease.databaseOid)])).rows[0].owned).toBe(true);
    record({ operation: 'BASE_IDENTITY_VERIFIED', actual, helperSourceSHA256: hash(source), testSourceSHA256: hash(readFileSync(testPath)), claim: 'DIRECT_ROLE_HELPER_ONLY_NOT_RLS_OR_F10' });
    await query(admin, 'BEGIN');
    try {
      appRole = await role(lease.invocation + '_app'); workerRole = await role(lease.invocation + '_worker');
      groupRole = await role(lease.invocation + '_group'); outsiderRole = await role(lease.invocation + '_outsider');
      await query(admin, 'ALTER ROLE ' + q(groupRole.name) + ' NOLOGIN');
      // Root invocation acts as the controlled fixture installer. The production
      // SQL file itself creates no table, role, grant or privilege exception.
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + roles.map(r => q(r.name)).join(','));
      await query(admin, 'CREATE SCHEMA nevora_tenancy'); await remember('schema', '', 'nevora_tenancy');
      await query(admin, "CREATE TABLE nevora_tenancy.runtime_role_binding(kind pg_catalog.text PRIMARY KEY CHECK(kind IN ('APP','WORKER')),role_name pg_catalog.name UNIQUE NOT NULL,role_oid pg_catalog.oid UNIQUE NOT NULL,pg_settings_oid pg_catalog.oid NOT NULL,pg_settings_definition pg_catalog.text NOT NULL,pg_settings_rules pg_catalog.text[] NOT NULL)"); await remember('table', 'nevora_tenancy', 'runtime_role_binding');
      await query(admin, 'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC'); await query(admin, 'REVOKE ALL ON TABLE nevora_tenancy.runtime_role_binding FROM PUBLIC');
      const settings = (await query(admin, `SELECT 'pg_catalog.pg_settings'::pg_catalog.regclass::oid::text oid,
        pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::pg_catalog.regclass,false) definition,
        ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite w WHERE w.ev_class='pg_catalog.pg_settings'::pg_catalog.regclass ORDER BY w.rulename COLLATE pg_catalog."C") rules`)).rows[0];
      record({ operation: 'OWN_PG18_STOCK_SETTINGS_SOURCE_BOUND', settings, claim: 'EXACT_OWN_NATIVE_PG18_SOURCE_ONLY_NOT_NEON_OR_GENERAL_CATALOG_APPROVAL' });
      await query(admin, 'INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules) VALUES($1,$2,$3::oid,$7::oid,$8,$9::text[]),($4,$5,$6::oid,$7::oid,$8,$9::text[])', ['APP', appRole.name, appRole.oid, 'WORKER', workerRole.name, workerRole.oid, settings.oid, settings.definition, settings.rules]);
      await query(admin, source); await remember('function', 'nevora_tenancy', 'assert_runtime_role', '(text)');
      await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM PUBLIC');
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + named()); await query(admin, 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding TO ' + named());
      await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) TO ' + named());
      const definer = 'nevora_tenancy.' + q(lease.invocation + '_definer') + '()';
      await query(admin, 'CREATE FUNCTION ' + definer + ' RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT true $$');
      await remember('function', 'nevora_tenancy', lease.invocation + '_definer', '()');
      await query(admin, 'REVOKE ALL ON FUNCTION ' + definer + ' FROM PUBLIC');
      await query(admin, 'CREATE TABLE ' + rowsTable() + '(id pg_catalog.int4 PRIMARY KEY)'); await remember('table', 'public', rowsName());
      await query(admin, 'INSERT INTO ' + rowsTable() + '(id) VALUES(1)');
      await query(admin, 'CREATE TABLE nevora_tenancy.' + q(lease.invocation + '_effects') + '(operation pg_catalog.text NOT NULL)');
      await remember('table', 'nevora_tenancy', lease.invocation + '_effects');
      await query(admin, 'GRANT SELECT ON TABLE ' + rowsTable() + ' TO ' + named());
      await query(admin, 'COMMIT'); setupCommitted = true;
    } catch { if (admin.getTransactionStatus() !== 'I') await query(admin, 'ROLLBACK'); throw new Error('owned_role_fixture_install_failed'); }
    app = await connect(appRole.name); worker = await connect(workerRole.name); outsider = await connect(outsiderRole.name);
    writeFileSync(join(runPath!, 'fixture-custody.json'), JSON.stringify({ roles, objects, setupCommitted, base: actual, sourceSHA256: hash(source), claim: 'FICTIONAL_LOCAL_ROLE_HELPER_ONLY' }, null, 2), { flag: 'wx', mode: 0o600 });
  }, 20000);

  afterAll(async () => {
    let cleaned = false;
    try {
      for (const client of clients) if (client !== admin) {
        if (['T', 'E'].includes(client.getTransactionStatus() ?? '')) await query(client, 'ROLLBACK'); await client.end();
      }
      if (verified && admin) {
        if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
        await query(admin, 'RESET ROLE'); await checkBase();
        for (const undo of repairs) { await query(admin, undo); repairs.delete(undo); }
        if (setupCommitted) {
          for (const object of [...objects].reverse()) {
            const current = object.kind === 'schema' ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [object.name])).rows[0] :
              object.kind === 'table' || object.kind === 'view' ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows[0] :
                (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows[0];
            const adminOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid;
            expect(current).toEqual({ oid: object.oid, owner: adminOid });
            await query(admin, 'DROP ' + (object.kind === 'schema' ? 'SCHEMA ' + q(object.name) : object.kind === 'table' || object.kind === 'view' ? object.kind.toUpperCase() + ' ' + q(object.schema) + '.' + q(object.name) : 'FUNCTION ' + q(object.schema) + '.' + q(object.name) + object.signature));
            record({ operation: 'OWN_OBJECT_DROPPED', ...object });
          }
          for (const owned of [...roles].reverse()) {
            expect((await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [owned.name])).rows[0]).toEqual({ oid: owned.oid });
            await query(admin, 'REVOKE CONNECT ON DATABASE ' + q(lease.database) + ' FROM ' + q(owned.name));
            await query(admin, 'DROP ROLE ' + q(owned.name)); expect((await query(admin, 'SELECT 1 FROM pg_catalog.pg_roles WHERE oid=$1::oid', [owned.oid])).rows).toEqual([]);
            record({ operation: 'OWN_ROLE_DROPPED', ...owned });
          }
        }
        if (setupCommitted) cleaned = true;
        else {
          // An unacknowledged COMMIT is not treated as rollback/completion.
          // Unexpected remaining objects are held for root's owned reconciliation.
          const remainingRoles = roles.length ? (await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE oid=ANY($1::oid[])', [roles.map(r => r.oid)])).rows : [];
          const remainingSchema = (await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows;
          cleaned = remainingRoles.length === 0 && remainingSchema.length === 0;
          if (!cleaned) throw new Error('owned_role_install_outcome_requires_root_reconciliation');
        }
      }
    } finally {
      if (admin) await admin.end(); password = '';
      if (runPath) writeFileSync(join(runPath, 'cleanup.json'), JSON.stringify({ verified, setupCommitted, cleaned, roles, objects, pendingRepairs: repairs.size, records,
        scope: 'ONLY_NEW_OWN_OBJECTS_AND_ROLES_NO_CLUSTER_STOP_OR_DB_DROP', actualSQLAttempted: sqlAttempted }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 20000);

  it('allows only the exact APP and WORKER direct LOGIN bindings', async () => {
    const diagnostics = (await query(app, `SELECT session_user::text session,current_user::text current_role,pg_catalog.current_setting('role') role,
      (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_role_oid,
      (SELECT oid::text FROM pg_catalog.pg_roles WHERE rolname=session_user) role_oid,
      (SELECT pg_catalog.json_agg(n.nspname) FROM pg_catalog.pg_namespace n WHERE pg_catalog.has_schema_privilege(session_user,n.oid,'CREATE')) create_schemas,
      (SELECT pg_catalog.json_agg(p.oid::pg_catalog.regprocedure::text) FROM pg_catalog.pg_proc p WHERE p.prosecdef AND pg_catalog.has_function_privilege(session_user,p.oid,'EXECUTE') AND pg_catalog.has_schema_privilege(session_user,p.pronamespace,'USAGE')) callable_definers,
      (SELECT pg_catalog.json_agg(pg_catalog.json_build_object('relation',c.oid::pg_catalog.regclass::text,
        'destructive',pg_catalog.has_table_privilege(session_user,c.oid,'TRUNCATE,TRIGGER,MAINTAIN'),
        'control_dml',pg_catalog.has_table_privilege(session_user,c.oid,'INSERT,UPDATE,DELETE,REFERENCES'),
        'control_column_dml',pg_catalog.has_any_column_privilege(session_user,c.oid,'INSERT,UPDATE,REFERENCES')))
       FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE c.relkind IN ('r','p','v','m','f') AND (pg_catalog.has_table_privilege(session_user,c.oid,'TRUNCATE,TRIGGER,MAINTAIN') OR
         (n.nspname IN ('pg_catalog','information_schema','nevora_tenancy') AND (pg_catalog.has_table_privilege(session_user,c.oid,'INSERT,UPDATE,DELETE,REFERENCES') OR pg_catalog.has_any_column_privilege(session_user,c.oid,'INSERT,UPDATE,REFERENCES'))))) blocked_relations,
      (SELECT pg_catalog.json_agg(p.oid::pg_catalog.regprocedure::text) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='pg_catalog' AND pg_catalog.has_function_privilege(session_user,p.oid,'EXECUTE') AND NOT EXISTS (
          SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=p.oid AND i.objsubid=0),pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) initial
          WHERE initial.grantee=0 AND initial.privilege_type='EXECUTE')) newly_executable_catalog
    `)).rows[0];
    record({ operation: 'ACTUAL_SAFE_BASELINE_DIAGNOSTICS', diagnostics });
    record({ operation: 'ACTUAL_SAFE_BASELINE_PREDICATES', rows: (await query(app, predicateDiagnosticSql(), ['APP'])).rows });
    expect(await guard(app, 'APP')).toBe(true); expect(await guard(app, 'WORKER')).toBe(false);
    expect(await guard(worker, 'WORKER')).toBe(true); expect(await guard(worker, 'APP')).toBe(false);
    const facts = (await query(admin, 'SELECT oid::text oid,rolname,rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication,rolinherit FROM pg_catalog.pg_roles WHERE oid IN ($1::oid,$2::oid) ORDER BY oid', [appRole.oid, workerRole.oid])).rows;
    record({ operation: 'ACTUAL_ROLE_FLAGS', facts });
  });
  it.each([null, '', 'app', 'worker', ' APP', 'APP ', 'PROVISIONER', 'OWNER'])('denies undeclared input %s', async kind => { expect(await guard(app, kind)).toBe(false); });
  it('denies an unbound direct login even with exact helper/table read grants', async () => {
    await mutate('GRANT USAGE ON SCHEMA nevora_tenancy TO ' + q(outsiderRole.name), 'REVOKE USAGE ON SCHEMA nevora_tenancy FROM ' + q(outsiderRole.name), async () => {
      await mutate('GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding TO ' + q(outsiderRole.name), 'REVOKE SELECT ON TABLE nevora_tenancy.runtime_role_binding FROM ' + q(outsiderRole.name), async () => {
        await mutate('GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) TO ' + q(outsiderRole.name), 'REVOKE EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM ' + q(outsiderRole.name), async () => { expect(await guard(outsider, 'APP')).toBe(false); });
      });
    });
  });
  it.each([['NOLOGIN', 'LOGIN'], ['SUPERUSER', 'NOSUPERUSER'], ['BYPASSRLS', 'NOBYPASSRLS'], ['CREATEROLE', 'NOCREATEROLE'], ['CREATEDB', 'NOCREATEDB'], ['REPLICATION', 'NOREPLICATION'], ['INHERIT', 'NOINHERIT']])('denies current unsafe role flag %s', async (unsafe, restore) => {
    await mutate('ALTER ROLE ' + q(appRole.name) + ' ' + unsafe, 'ALTER ROLE ' + q(appRole.name) + ' ' + restore, async () => { expect(await guard(app, 'APP')).toBe(false); });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it.each(['role_name', 'role_oid'] as const)('denies changed binding %s', async field => {
    await mutate('UPDATE nevora_tenancy.runtime_role_binding SET ' + field + '=' + (field === 'role_oid' ? outsiderRole.oid + '::oid' : literal(outsiderRole.name)) + " WHERE kind='APP'",
      'UPDATE nevora_tenancy.runtime_role_binding SET ' + field + '=' + (field === 'role_oid' ? appRole.oid + '::oid' : literal(appRole.name)) + " WHERE kind='APP'", async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it('denies membership even with inherit and SET options explicitly disabled', async () => {
    await mutate('GRANT ' + q(groupRole.name) + ' TO ' + q(appRole.name) + ' WITH INHERIT FALSE, SET FALSE', 'REVOKE ' + q(groupRole.name) + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it('denies the role being granted to another principal and admin SET ROLE impersonation', async () => {
    await mutate('GRANT ' + q(appRole.name) + ' TO ' + q(outsiderRole.name), 'REVOKE ' + q(appRole.name) + ' FROM ' + q(outsiderRole.name), async () => {
      expect(await guard(app, 'APP')).toBe(false); await query(outsider, 'SET ROLE ' + q(appRole.name));
      try { expect(await guard(outsider, 'APP')).toBe(false); } finally { await query(outsider, 'RESET ROLE'); }
    });
    await query(admin, 'SET ROLE ' + q(appRole.name)); try { expect(await guard(admin, 'APP')).toBe(false); } finally { await query(admin, 'RESET ROLE'); }
  });
  it('rejects SET ROLE to the same login and recovers after RESET ROLE', async () => {
    await query(app, 'SET ROLE ' + q(appRole.name)); try { expect(await guard(app, 'APP')).toBe(false); } finally { await query(app, 'RESET ROLE'); }
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('denies substituted session authorization despite matching apparent APP identity', async () => {
    const original = (await query(admin, 'SELECT SYSTEM_USER::text identity,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid')).rows[0];
    await query(admin, 'SET SESSION AUTHORIZATION ' + q(appRole.name));
    try {
      const facts = (await query(admin, "SELECT session_user::text session,current_user::text current_role,SYSTEM_USER::text identity,pg_catalog.current_setting('role') role,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid")).rows[0];
      expect(facts).toEqual({ session: appRole.name, current_role: appRole.name, identity: original.identity, original_oid: original.original_oid, role: 'none' });
      expect(facts.original_oid).not.toBe(appRole.oid);
      const allowed = await guard(admin, 'APP'); record({ operation: 'ACTUAL_SUBSTITUTED_SESSION', facts, allowed });
      expect(allowed).toBe(false);
    } finally { await query(admin, 'RESET SESSION AUTHORIZATION'); }
    expect(await rejected(app, 'SET SESSION AUTHORIZATION ' + q(lease.user))).toBe('42501');
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('allows stock user configuration but rejects administrative pg_settings changes', async () => {
    const prior = (await query(app, "SELECT pg_catalog.current_setting('application_name') value")).rows[0].value as string;
    try {
      await query(app, "UPDATE pg_catalog.pg_settings SET setting=$1 WHERE name='application_name'", [lease.invocation]);
      expect((await query(app, "SELECT pg_catalog.current_setting('application_name') value")).rows[0].value).toBe(lease.invocation);
      expect(await guard(app, 'APP')).toBe(true);
      expect(await rejected(app, "UPDATE pg_catalog.pg_settings SET setting='replica' WHERE name='session_replication_role'")).toBe('42501');
    } finally { await query(app, "UPDATE pg_catalog.pg_settings SET setting=$1 WHERE name='application_name'", [prior]); }
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('rejects drift from the exact installer-bound settings view source', async () => {
    await mutate("UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=pg_settings_definition||E'\\n' WHERE kind='APP'",
      "UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=pg_catalog.pg_get_viewdef(pg_settings_oid,false) WHERE kind='APP'",
      async () => { expect(await guard(app, 'APP')).toBe(false); });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('denies an owner-executing writable view exposing protected binding columns', async () => {
    const name = lease.invocation + '_binding_view', target = 'public.' + q(name);
    await query(admin, 'CREATE VIEW ' + target + " AS SELECT kind FROM nevora_tenancy.runtime_role_binding WHERE kind='APP'");
    await remember('view', 'public', name);
    await mutate('GRANT UPDATE(kind),SELECT(kind) ON TABLE ' + target + ' TO ' + q(appRole.name), 'REVOKE UPDATE(kind),SELECT(kind) ON TABLE ' + target + ' FROM ' + q(appRole.name), async () => {
      const allowed = await guard(app, 'APP'); await query(app, 'BEGIN');
      try {
        const changed = await query(app, 'UPDATE ' + target + ' SET kind=kind RETURNING kind');
        expect(changed.rows).toEqual([{ kind: 'APP' }]);
        record({ operation: 'ACTUAL_INDIRECT_BINDING_VIEW_MUTATION', allowed, changedRows: changed.rowCount, rolledBackOwnedTransaction: true });
      } finally { await query(app, 'ROLLBACK'); }
      expect(allowed).toBe(false);
    });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('denies a grant option on an exact own empty large object', async () => {
    const oid = (await query(admin, 'SELECT pg_catalog.lo_create(0)::text oid')).rows[0].oid as string;
    const owner = (await query(admin, 'SELECT lomowner::text owner FROM pg_catalog.pg_largeobject_metadata WHERE oid=$1::oid', [oid])).rows[0].owner;
    record({ operation: 'OWN_LARGE_OBJECT_CREATED', oid, owner });
    try {
      await mutate('GRANT SELECT ON LARGE OBJECT ' + oid + ' TO ' + q(appRole.name) + ' WITH GRANT OPTION', 'REVOKE SELECT ON LARGE OBJECT ' + oid + ' FROM ' + q(appRole.name), async () => {
        const allowed = await guard(app, 'APP'); record({ operation: 'ACTUAL_LARGE_OBJECT_GRANT_OPTION', oid, allowed });
        expect(allowed).toBe(false);
      });
    } finally {
      expect((await query(admin, 'SELECT lomowner::text owner FROM pg_catalog.pg_largeobject_metadata WHERE oid=$1::oid', [oid])).rows[0]).toEqual({ owner });
      expect((await query(admin, 'SELECT pg_catalog.lo_unlink($1::oid) removed', [oid])).rows[0].removed).toBe(1);
      expect((await query(admin, 'SELECT 1 FROM pg_catalog.pg_largeobject_metadata WHERE oid=$1::oid', [oid])).rows).toEqual([]);
      record({ operation: 'OWN_LARGE_OBJECT_DELETED', oid, owner });
    }
    expect(await guard(app, 'APP')).toBe(true);
  });
  it.each(['RULE', 'DEFINER_TRIGGER'] as const)('denies indirect control writes via %s without direct function EXECUTE', async category => {
    const name = lease.invocation + '_indirect_' + (category === 'RULE' ? 'rule' : 'trigger');
    const effects = 'nevora_tenancy.' + q(lease.invocation + '_effects');
    let oid: string | undefined, functionOid: string | undefined;
    if (category === 'RULE') {
      await query(admin, 'CREATE RULE ' + q(name) + ' AS ON UPDATE TO ' + rowsTable() + ' DO ALSO INSERT INTO ' + effects + "(operation) VALUES('RULE')");
      oid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_rewrite WHERE ev_class=$1::regclass AND rulename=$2', [rowsTable(), name])).rows[0].oid;
    } else {
      const fn = 'nevora_tenancy.' + q(name) + '()';
      await query(admin, 'CREATE FUNCTION ' + fn + ' RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $body$ BEGIN INSERT INTO ' + effects + "(operation) VALUES('DEFINER_TRIGGER'); RETURN NEW; END $body$");
      functionOid = (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [fn])).rows[0].oid;
      await query(admin, 'REVOKE ALL ON FUNCTION ' + fn + ' FROM PUBLIC');
      expect((await query(admin, 'SELECT pg_catalog.has_function_privilege($1,$2::oid,$3) allowed', [appRole.name, functionOid, 'EXECUTE'])).rows[0].allowed).toBe(false);
      await query(admin, 'CREATE TRIGGER ' + q(name) + ' AFTER UPDATE ON ' + rowsTable() + ' FOR EACH ROW EXECUTE FUNCTION ' + fn);
      oid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_trigger WHERE tgrelid=$1::regclass AND tgname=$2', [rowsTable(), name])).rows[0].oid;
    }
    record({ operation: 'OWN_INDIRECT_ROUTE_CREATED', category, name, oid, functionOid });
    try {
      await mutate('GRANT UPDATE(id) ON TABLE ' + rowsTable() + ' TO ' + q(appRole.name), 'REVOKE UPDATE(id) ON TABLE ' + rowsTable() + ' FROM ' + q(appRole.name), async () => {
        const allowed = await guard(app, 'APP');
        expect((await query(app, 'UPDATE ' + rowsTable() + ' SET id=id RETURNING id')).rows).toEqual([{ id: 1 }]);
        expect((await query(admin, 'SELECT operation FROM ' + effects + ' WHERE operation=$1', [category])).rows).toEqual([{ operation: category }]);
        record({ operation: 'ACTUAL_INDIRECT_ROUTE_EFFECT', category, allowed, actualEffectRows: 1 });
        expect(allowed).toBe(false);
      });
    } finally {
      const actual = category === 'RULE' ? (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_rewrite WHERE ev_class=$1::regclass AND rulename=$2', [rowsTable(), name])).rows[0] :
        (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_trigger WHERE tgrelid=$1::regclass AND tgname=$2', [rowsTable(), name])).rows[0];
      expect(actual).toEqual({ oid });
      await query(admin, 'DROP ' + (category === 'RULE' ? 'RULE ' : 'TRIGGER ') + q(name) + ' ON ' + rowsTable());
      if (category === 'DEFINER_TRIGGER') {
        const fn = 'nevora_tenancy.' + q(name) + '()';
        expect((await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [fn])).rows[0]).toEqual({ oid: functionOid });
        await query(admin, 'DROP FUNCTION ' + fn);
      }
      record({ operation: 'OWN_INDIRECT_ROUTE_DROPPED', category, name, oid, functionOid });
    }
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('permits an invoker view only with ordinary own underlying DML grants', async () => {
    const name = lease.invocation + '_invoker_view', target = 'public.' + q(name);
    await query(admin, 'CREATE VIEW ' + target + ' WITH (security_invoker=true) AS SELECT id FROM ' + rowsTable());
    await remember('view', 'public', name);
    await mutate('GRANT UPDATE(id) ON TABLE ' + rowsTable() + ' TO ' + q(appRole.name), 'REVOKE UPDATE(id) ON TABLE ' + rowsTable() + ' FROM ' + q(appRole.name), async () => {
      await mutate('GRANT UPDATE(id),SELECT(id) ON TABLE ' + target + ' TO ' + q(appRole.name), 'REVOKE UPDATE(id),SELECT(id) ON TABLE ' + target + ' FROM ' + q(appRole.name), async () => {
        expect(await guard(app, 'APP')).toBe(true);
        expect((await query(app, 'UPDATE ' + target + ' SET id=id RETURNING id')).rows).toEqual([{ id: 1 }]);
      });
    });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it.each(['CREATE', 'TEMPORARY'])('rejects current database %s authority', async privilege => {
    await mutate('GRANT ' + privilege + ' ON DATABASE ' + q(lease.database) + ' TO ' + q(appRole.name), 'REVOKE ' + privilege + ' ON DATABASE ' + q(lease.database) + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it('rejects PUBLIC schema CREATE inherited independently of NOINHERIT', async () => {
    expect((await query(admin, "SELECT pg_catalog.has_schema_privilege('public','public','CREATE') allowed")).rows[0].allowed).toBe(false);
    await mutate('GRANT CREATE ON SCHEMA public TO PUBLIC', 'REVOKE CREATE ON SCHEMA public FROM PUBLIC', async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it.each(['TRUNCATE', 'TRIGGER', 'MAINTAIN'])('rejects table %s even on an unrelated fictional relation', async privilege => {
    await mutate('GRANT ' + privilege + ' ON TABLE ' + rowsTable() + ' TO ' + q(appRole.name), 'REVOKE ' + privilege + ' ON TABLE ' + rowsTable() + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it('rejects effective table and column grant options', async () => {
    await mutate('GRANT SELECT ON TABLE ' + rowsTable() + ' TO ' + q(appRole.name) + ' WITH GRANT OPTION', 'REVOKE GRANT OPTION FOR SELECT ON TABLE ' + rowsTable() + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
    await mutate('GRANT SELECT(id) ON TABLE ' + rowsTable() + ' TO ' + q(appRole.name) + ' WITH GRANT OPTION', 'REVOKE SELECT(id) ON TABLE ' + rowsTable() + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it.each(['INSERT', 'UPDATE', 'REFERENCES'])('rejects binding column %s authority', async privilege => {
    await mutate('GRANT ' + privilege + '(kind) ON TABLE nevora_tenancy.runtime_role_binding TO ' + q(appRole.name), 'REVOKE ' + privilege + '(kind) ON TABLE nevora_tenancy.runtime_role_binding FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it('proves the safe runtime cannot mutate its binding or perform DDL', async () => {
    expect(await rejected(app, "UPDATE nevora_tenancy.runtime_role_binding SET kind=kind WHERE false")).toBe('42501');
    expect(await rejected(app, 'CREATE TABLE public.' + q(lease.invocation + '_forbidden') + '(id int)')).toBe('42501');
    expect(await rejected(app, 'TRUNCATE ' + rowsTable())).toBe('42501');
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('fails closed when the named role loses mandatory binding SELECT or helper EXECUTE', async () => {
    await mutate('REVOKE SELECT ON TABLE nevora_tenancy.runtime_role_binding FROM ' + q(appRole.name), 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding TO ' + q(appRole.name), async () => {
      expect(await rejected(app, "SELECT nevora_tenancy.assert_runtime_role('APP')")).toBe('42501');
    });
    await mutate('REVOKE EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM ' + q(appRole.name), 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) TO ' + q(appRole.name), async () => {
      expect(await rejected(app, "SELECT nevora_tenancy.assert_runtime_role('APP')")).toBe('42501');
    });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('enforces the fixture installer closed kind and unique role OID/name constraints', async () => {
    expect(await rejected(admin, "INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules) SELECT $1,$2,$3::oid,pg_settings_oid,pg_settings_definition,pg_settings_rules FROM nevora_tenancy.runtime_role_binding WHERE kind='APP'", ['OWNER', outsiderRole.name, outsiderRole.oid])).toBe('23514');
    expect(await rejected(admin, 'UPDATE nevora_tenancy.runtime_role_binding SET role_oid=$1::oid WHERE kind=$2', [workerRole.oid, 'APP'])).toBe('23505');
    expect(await rejected(admin, 'UPDATE nevora_tenancy.runtime_role_binding SET role_name=$1 WHERE kind=$2', [workerRole.name, 'APP'])).toBe('23505');
    expect(await guard(app, 'APP')).toBe(true);
  });
  it.each(['SCHEMA', 'TABLE', 'FUNCTION'])('denies PUBLIC privilege on controlled %s', async category => {
    const target = category === 'SCHEMA' ? 'SCHEMA nevora_tenancy' : category === 'TABLE' ? 'TABLE nevora_tenancy.runtime_role_binding' : 'FUNCTION nevora_tenancy.assert_runtime_role(text)';
    const privilege = category === 'SCHEMA' ? 'USAGE' : category === 'TABLE' ? 'SELECT' : 'EXECUTE';
    await mutate('GRANT ' + privilege + ' ON ' + target + ' TO PUBLIC', 'REVOKE ' + privilege + ' ON ' + target + ' FROM PUBLIC', async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it('denies ownership independently of safe role flags', async () => {
    await mutate('ALTER TABLE ' + rowsTable() + ' OWNER TO ' + q(appRole.name), 'ALTER TABLE ' + rowsTable() + ' OWNER TO ' + q(lease.user), async () => { expect(await guard(app, 'APP')).toBe(false); });
    await query(admin, 'GRANT SELECT ON TABLE ' + rowsTable() + ' TO ' + named());
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('denies privileged parameter grants without setting the parameter', async () => {
    await mutate('GRANT SET ON PARAMETER session_replication_role TO ' + q(appRole.name), 'REVOKE SET ON PARAMETER session_replication_role FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
  });
  it.each([false, true])('denies newly executable restricted built-in via PUBLIC=%s without reading any file', async publicGrant => {
    const target = 'pg_catalog.pg_read_file(text,bigint,bigint)', grantee = publicGrant ? 'PUBLIC' : q(appRole.name);
    expect((await query(admin, "SELECT pg_catalog.has_function_privilege('public',$1,'EXECUTE') allowed", [target])).rows[0].allowed).toBe(false);
    const before = (await query(admin, 'SELECT proacl::text acl FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [target])).rows[0].acl;
    await mutate('GRANT EXECUTE ON FUNCTION ' + target + ' TO ' + grantee, 'REVOKE EXECUTE ON FUNCTION ' + target + ' FROM ' + grantee, async () => { expect(await guard(app, 'APP')).toBe(false); });
    expect((await query(admin, 'SELECT proacl::text acl FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [target])).rows[0].acl).toBe(before);
  });
  it('denies accessible unaudited security-definer functions and allows after exact revoke', async () => {
    const name = lease.invocation + '_definer', target = 'nevora_tenancy.' + q(name) + '()';
    const owned = objects.find(o => o.kind === 'function' && o.name === name)!;
    expect((await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [target])).rows[0].oid).toBe(owned.oid);
    await mutate('GRANT EXECUTE ON FUNCTION ' + target + ' TO PUBLIC', 'REVOKE EXECUTE ON FUNCTION ' + target + ' FROM PUBLIC', async () => { expect(await guard(app, 'APP')).toBe(false); });
    await mutate('GRANT EXECUTE ON FUNCTION ' + target + ' TO ' + q(appRole.name), 'REVOKE EXECUTE ON FUNCTION ' + target + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('rechecks current catalog grants on successive calls instead of caching a flag result', async () => {
    expect(await guard(app, 'APP')).toBe(true);
    await mutate('GRANT TRUNCATE ON TABLE ' + rowsTable() + ' TO ' + q(appRole.name), 'REVOKE TRUNCATE ON TABLE ' + rowsTable() + ' FROM ' + q(appRole.name), async () => { expect(await guard(app, 'APP')).toBe(false); });
    expect(await guard(app, 'APP')).toBe(true);
  });
  it('matches the accepted executor boolean wrapper with actual transaction abort on denial', async () => {
    const wrapper = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
    expect((await query(app, wrapper, ['APP'])).rows).toEqual([{ guard: 1 }]);
    await query(app, 'BEGIN');
    try { expect(await rejected(app, wrapper, ['WORKER'])).toBe('22012'); expect(app.getTransactionStatus()).toBe('E'); expect(await rejected(app, 'SELECT 1')).toBe('25P02'); }
    finally { await query(app, 'ROLLBACK'); }
    expect(app.getTransactionStatus()).toBe('I'); expect(await guard(app, 'APP')).toBe(true);
  });
  it('aborts and rolls back own business writes when a final current-role check rejects catalog drift', async () => {
    const wrapper='SELECT 1 / CASE WHEN nevora_tenancy.assert_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
    await mutate('GRANT UPDATE(id) ON TABLE '+rowsTable()+' TO '+q(appRole.name),'REVOKE UPDATE(id) ON TABLE '+rowsTable()+' FROM '+q(appRole.name),async()=>{
      await query(app,'BEGIN ISOLATION LEVEL READ COMMITTED');
      try {
        expect((await query(app,wrapper,['APP'])).rows).toEqual([{guard:1}]);
        expect((await query(app,'UPDATE '+rowsTable()+' SET id=2 WHERE id=1 RETURNING id')).rows).toEqual([{id:2}]);
        await mutate('GRANT TRUNCATE ON TABLE '+rowsTable()+' TO '+q(appRole.name),'REVOKE TRUNCATE ON TABLE '+rowsTable()+' FROM '+q(appRole.name),async()=>{
          expect(await rejected(app,wrapper,['APP'])).toBe('22012');expect(app.getTransactionStatus()).toBe('E');
          expect(await rejected(app,'COMMIT')).toBe('NO_ERROR');
          // COMMIT in an aborted PostgreSQL transaction acknowledges ROLLBACK;
          // independently inspect the original row rather than infer a write.
          expect(app.getTransactionStatus()).toBe('I');
          expect((await query(admin,'SELECT id FROM '+rowsTable())).rows).toEqual([{id:1}]);
          record({operation:'ACTUAL_FINAL_ROLE_DRIFT_ROLLBACK',beginningGuard:1,ownObservedWrite:2,finalSQLstate:'22012',independentlyObservedOriginalRows:[1]});
        });
      } finally {if(app.getTransactionStatus()!=='I')await query(app,'ROLLBACK');}
    });
    expect(await guard(app,'APP')).toBe(true);
  });
});
