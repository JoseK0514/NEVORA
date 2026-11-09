import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { createTenantExecutor } from '../executor.server';
import { resolvePortalProof } from '../resolve.server';
import { workspaceSnapshot, portalEmploymentSnapshot, tenantBatch } from '../query-contract';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';

type Plan = { text: string; values: unknown[]; then: () => never };
type LocalTransport = { query: (text: string, values: unknown[]) => unknown; transaction: (plans: Plan[], options: Record<string, unknown>) => Promise<unknown[]> };
const transport = vi.hoisted(() => ({ value: null as LocalTransport | null }));
vi.mock('server-only', () => ({}));
// This is an explicit local transport adapter, never actual Neon. Only the
// resolver lookup returns fictional facts; executor plans execute on owned PG.
vi.mock('../../db', () => ({ getDb: () => { throw Error('legacy_transport_forbidden'); },
  getTenantRuntimeDb: (kind: string) => { if (kind !== 'APP' || !transport.value) throw Error('native_fixture_transport_unavailable'); return transport.value; } }));

const leasePath = process.env.F_ROLE_OWNED_LEASE, runPath = process.env.F_ROLE_RUN_DIR;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const pinnedSources = {
  'src/lib/tenancy/runtime/control-storage.sql': '4d098ae63c85ebc4e774ab4f17aafa05cedc303d3700005a6f2e72ef59635f20',
  'src/lib/tenancy/runtime/role-guard.sql': '7c0ce83b99d401aac9a31db391cb750b676a22bf3c76e440194de986299bbd6a',
  'src/lib/tenancy/runtime/role-guard.test.ts': '0d4be75794a63927d94148b2cc8ce6931dfdaf72672ce04b07467b51744f783a',
  'src/lib/tenancy/runtime/catalog-fence.server.ts': '2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f',
  'src/lib/tenancy/executor.server.ts': '26745ac03e23d6d43bfc5ecd2495de9ffd51b6fa83101b430c22e36c73f7800f',
  'src/lib/tenancy/resolve.server.ts': '0d450b2d2ea1df95816af588e6540f90913640364fb687c91e8e22830278ce0b',
} as const;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string };
type OwnObject = { kind: 'schema' | 'table' | 'function'; target: string; oid: string; owner: string; dropped: boolean };
type TransactionReceipt = { id: number; plans: { text: string; values: unknown[] }[]; dispatched: number[];
  nativeResults: unknown[]; committed: boolean; rolledBack: boolean; sqlstate: string | null; probe: unknown };

// Default HOLD. No DB, resolver lookup, fixture, startup, ambient URL or SQL is
// performed on import. Root alone supplies/runs/cleans the marked local fixture.
describe.skipIf(!leasePath && !runPath)('owned native executor catalog fence prefix', () => {
  let lease: Lease, admin: Client, app: Client, writer: Client, password = '', installerOid = '';
  let appRole: Role, workerRole: Role, outsiderRole: Role;
  let runVerified = false, verified = false, fixtureCommitted = false, phase: 'LOOKUP' | 'EXECUTE' = 'EXECUTE';
  let lookupFacts: Record<string, unknown>, originalBinding: Record<string, unknown>[], originalCatalog: Awaited<ReturnType<typeof catalog>>;
  let waitingTransaction: Promise<unknown> | null = null;
  let hook: 'NONE' | 'FINAL_DENIAL' = 'NONE', transactionCount = 0;
  const clients = new Set<Client>(), closed = new Set<Client>(), pids = new Map<Client, number>();
  const roles: Role[] = [], objects: OwnObject[] = [], transactions: TransactionReceipt[] = [], records: unknown[] = [];
  const plans = new WeakSet<object>();
  const probe = () => 'public.' + q(lease.invocation + '_executor_probe');
  const state = (error: unknown) => { const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN'; };
  function record(value: unknown) { records.push(value); appendFileSync(join(runPath!, 'executor-native-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 }); }
  async function query(client: Client, text: string, values: unknown[] = [], label = 'OWNED_SQL') {
    try { const result = await client.query(text, values); record({ operation: label, backend: pids.get(client),
      query: label === 'ROLE_CREATE_PRIVATE' ? 'REDACTED_FICTIONAL_ROLE_CREATE' : text, command: result.command }); return result; }
    catch (error) { record({ operation: 'OWNED_SQL_ERROR', backend: pids.get(client), label, sqlstate: state(error) }); throw Error('owned_executor_sql_' + state(error)); }
  }
  async function identity(client: Client) {
    const row = (await query(client, `SELECT session_user::text session,current_user::text current_role,
      pg_catalog.current_setting('role') role,pg_catalog.pg_backend_pid() backend,
      (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid,
      pg_catalog.current_setting('transaction_isolation') isolation`, [], 'NATIVE_IDENTITY')).rows[0];
    const expectedOid = client === app ? appRole.oid : installerOid;
    const expectedName = client === app ? appRole.name : lease.user;
    expect(row).toMatchObject({ session: expectedName, current_role: expectedName, role: 'none', original_oid: expectedOid });
    if (pids.has(client)) expect(row.backend).toBe(pids.get(client)); return row;
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database, user, password,
      connectionTimeoutMillis: 3000, statement_timeout: 15000 }); clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_executor_connection_failed'); }
    await query(client, 'SET search_path=pg_catalog'); expect(client.getTransactionStatus()).toBe('I'); return client;
  }
  async function remember(kind: OwnObject['kind'], target: string) {
    const row = kind === 'schema' ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [target])).rows[0]
      : kind === 'table' ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [target])).rows[0]
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [target])).rows[0];
    expect(row).toEqual({ oid: expect.stringMatching(/^[0-9]+$/), owner: installerOid });
    const object: OwnObject = { kind, target, ...row, dropped: false }; objects.push(object); record({ operation: 'EXACT_OWN_OBJECT', object }); return object;
  }
  async function createRole(name: string) {
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    await query(admin, 'CREATE ROLE ' + q(name) + ' LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT PASSWORD ' + literal(password), [], 'ROLE_CREATE_PRIVATE');
    const role = { name, oid: (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(role); record({ operation: 'EXACT_FICTIONAL_ROLE', role }); return role;
  }
  async function bindingRows() { return (await query(admin, `SELECT kind,role_name::text role_name,role_oid::text role_oid,
    pg_settings_oid::text pg_settings_oid,pg_settings_definition,pg_settings_rules FROM nevora_tenancy.runtime_role_binding ORDER BY kind COLLATE pg_catalog."C"`)).rows; }
  async function catalog() {
    const schemas = (await query(admin, "SELECT oid::text oid,nspname,nspowner::text owner,nspacl::text acl FROM pg_catalog.pg_namespace WHERE nspname IN ('public','nevora_tenancy') ORDER BY nspname")).rows;
    const relations = (await query(admin, `SELECT c.oid::text oid,n.nspname,c.relname,c.relowner::text owner,c.relacl::text acl,c.relkind
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','nevora_tenancy') ORDER BY n.nspname,c.relname`)).rows;
    const columns = (await query(admin, `SELECT a.attrelid::text relation_oid,a.attnum,a.attname,a.atttypid::text type_oid,a.attnotnull,a.attacl::text acl,
      pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE n.nspname IN ('public','nevora_tenancy') AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attrelid,a.attnum`)).rows;
    const constraints = (await query(admin, `SELECT c.oid::text oid,c.conrelid::text relation_oid,pg_catalog.pg_get_constraintdef(c.oid,false) definition
      FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace WHERE n.nspname IN ('public','nevora_tenancy') ORDER BY c.oid`)).rows;
    const functions = (await query(admin, `SELECT p.oid::text oid,p.proowner::text owner,p.proacl::text acl,p.proconfig,p.prosecdef,
      pg_catalog.pg_get_functiondef(p.oid) definition FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('public','nevora_tenancy') ORDER BY p.oid`)).rows;
    const nativeRoles = (await query(admin, `SELECT oid::text oid,rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls
      FROM pg_catalog.pg_roles WHERE oid=ANY($1::oid[]) ORDER BY oid`, [roles.map(role => role.oid)])).rows;
    const memberships = (await query(admin, 'SELECT roleid::text roleid,member::text member,grantor::text grantor,admin_option,inherit_option,set_option FROM pg_catalog.pg_auth_members ORDER BY roleid,member,grantor')).rows;
    return { schemas, relations, columns, constraints, functions, nativeRoles, memberships };
  }
  async function nativeLocks() { return (await query(admin, `SELECT database::text database,classid::text classid,objid::text objid,objsubid,pid,mode,granted
    FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=ANY($1::int4[]) ORDER BY pid,mode`, [[...pids.values()]])).rows; }
  function expectedLock(client: Client, mode: string, granted: boolean) {
    const bits = BigInt('0x' + createHash('sha256').update('nevora.runtime.catalog-fence.v1:' + String(lease.databaseOid)).digest('hex').slice(0, 16));
    return { database: String(lease.databaseOid), classid: (bits >> BigInt(32)).toString(), objid: (bits & BigInt('4294967295')).toString(),
      objsubid: 1, pid: pids.get(client), mode, granted };
  }
  async function exclusive() {
    expect(writer.getTransactionStatus()).toBe('I'); const before = await identity(writer);
    await query(writer, 'BEGIN ISOLATION LEVEL READ COMMITTED'); await query(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text, [...INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.values]);
    expect(await nativeLocks()).toContainEqual(expectedLock(writer, 'ExclusiveLock', true));
    record({ operation: 'EXCLUSIVE_BEFORE_FIXTURE_CHANGE', before, after: await identity(writer), native: await nativeLocks() });
  }
  async function restoreBinding() {
    await exclusive();
    const original = originalBinding.find(row => row.kind === 'APP')!;
    await query(writer, "UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=$1 WHERE kind='APP'", [original.pg_settings_definition]);
    await query(writer, 'COMMIT'); expect(await bindingRows()).toEqual(originalBinding);
  }
  async function waitFor(predicate: () => Promise<boolean>, label: string) {
    const end = Date.now() + 8000;
    do { if (await predicate()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < end);
    throw Error('owned_executor_observation_timeout_' + label);
  }
  async function observedWait(receipt: TransactionReceipt) {
    let observation: unknown;
    await waitFor(async () => {
      const locks = await nativeLocks();
      const activity = (await query(admin, `SELECT pid,usename::text name,usesysid::text original_oid,state,wait_event_type,wait_event,
        pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1`, [pids.get(app)])).rows;
      observation = { locks, activity };
      if (!locks.some(row => JSON.stringify(row) === JSON.stringify(expectedLock(app, 'ShareLock', false)))) return false;
      expect(activity).toHaveLength(1); expect(activity[0]).toMatchObject({ name: appRole.name, original_oid: appRole.oid,
        state: 'active', wait_event_type: 'Lock', wait_event: 'advisory' }); expect(activity[0].blockers).toContain(pids.get(writer));
      expect(receipt.dispatched).toEqual([0]); return true;
    }, 'SHARED_PREFIX_WAIT');
    record({ operation: 'ACTUAL_PREFIX_BLOCKED_BEFORE_ROLE', receiptId: receipt.id, observation }); return observation;
  }
  async function synchronizeAborted() {
    let native: unknown;
    await waitFor(async () => {
      native = (await query(admin, 'SELECT pid,usename::text name,usesysid::text original_oid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [pids.get(app)])).rows;
      return Array.isArray(native) && native.length === 1 && native[0].state === 'idle in transaction (aborted)' && app.getTransactionStatus() === 'E';
    }, 'READY_FOR_QUERY_ABORTED');
    record({ operation: 'SAME_BACKEND_NATIVE_ABORT_AND_CLIENT_E', native, clientState: app.getTransactionStatus() }); expect(app.getTransactionStatus()).toBe('E');
  }
  async function issueFictionalProof() {
    const now = Date.now(), expiry = new Date(now + 120000).toISOString();
    lookupFacts = { authorityCurrent: true, kind: 'PORTAL', workspaceId: 'tenant-a', workspaceVersion: '2026-10-08 10:00:00.123456+00',
      workspaceIncarnation: '9007199254740993', resolvedAt: new Date(now).toISOString(), expiresAt: expiry, locator: 'tenant-aa',
      employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00', authorizationVersion: '4', portalAccessVersion: '2',
      sessionTokenHash: 'a'.repeat(64), sessionExpiresAt: expiry, role: 'EMPLOYEE', capabilityPolicyRevision: '3', capabilities: [],
      allowedLocationIds: [], administrativeLocationIds: [], administrativeScope: null };
    phase = 'LOOKUP';
    try { const resolved = await resolvePortalProof('tenant-aa', 'a'.repeat(64)); if (resolved.status !== 'ALLOW') throw Error('fictional_parser_fixture_denied');
      record({ operation: 'MOCKED_LITERAL_FACTS_REAL_PARSER_PRIVATE_ISSUER', facts: lookupFacts, claim: 'NO_DATABASE_ISSUER_AUTHORITY_OR_CURRENT_DOMAIN_PROOF' }); return resolved.proof;
    } finally { phase = 'EXECUTE'; }
  }
  function installAdapter() {
    transport.value = {
      query(text, values) {
        const plan: Plan = { text, values: [...values], then() { throw Error('native_query_awaited_outside_atomic_batch'); } }; plans.add(plan); return plan;
      },
      async transaction(batch, options) {
        expect(options).toMatchObject({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
        expect(batch.every(plan => plans.has(plan))).toBe(true);
        if (phase === 'LOOKUP') {
          // Literal fixture facts only. This resolver batch is intercepted in
          // full; no database issuer/fence/current-domain authority is claimed.
          expect(batch).toHaveLength(3); expect(batch[0].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
          expect(batch[1].text).toContain('resolve_portal'); expect(batch[2].text).toContain('assert_runtime_role');
          record({ operation: 'MOCKED_LITERAL_RESOLVER_THREE_PLAN_BATCH', plans: batch,
            claim: 'NO_NATIVE_RESOLVER_OR_DATABASE_ISSUER_AUTHORITY' });
          return [[{ catalog_fence: '' }], [{ facts: lookupFacts }], [{ guard: 1 }]];
        }
        expect(app.getTransactionStatus()).toBe('I');
        const receipt: TransactionReceipt = { id: ++transactionCount, plans: batch.map(plan => ({ text: plan.text, values: [...plan.values] })),
          dispatched: [], nativeResults: [], committed: false, rolledBack: false, sqlstate: null, probe: null }; transactions.push(receipt);
        const before = await identity(app); await query(app, 'BEGIN ISOLATION LEVEL READ COMMITTED');
        try {
          for (const [index, plan] of batch.entries()) {
            receipt.dispatched.push(index);
            // The exact first production statement, without prior TX identity,
            // role/helper/catalog reads. Native queries below are real owned PG.
            try { receipt.nativeResults.push((await app.query(plan.text, plan.values)).rows); }
            catch (error) { receipt.sqlstate = state(error); throw error; }
            record({ operation: 'ACTUAL_EXECUTOR_STATEMENT', receiptId: receipt.id, index, text: plan.text, values: plan.values,
              rows: receipt.nativeResults[index] });
            if (index === 0) {
              expect(plan.text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
              const native = await nativeLocks(); expect(native).toContainEqual(expectedLock(app, 'ShareLock', true));
              record({ operation: 'NATIVE_PREFIX_GRANTED_BEFORE_ROLE', receiptId: receipt.id, before, after: await identity(app), native });
            }
            if (hook === 'FINAL_DENIAL' && index === batch.length - 3) {
              // Explicit root-authorized harness-only probe, never a registered
              // production statement or competing application write boundary.
              receipt.probe = (await query(app, 'UPDATE ' + probe() + ' SET value=2 WHERE id=1 RETURNING id,value', [], 'HARNESS_ONLY_SAME_TX_ROW_PROBE')).rows;
              expect(receipt.probe).toEqual([{ id: 1, value: 2 }]);
              const held = await nativeLocks(); expect(held).toContainEqual(expectedLock(app, 'ShareLock', true));
              expect(held.filter(row => row.pid === pids.get(admin))).toEqual([]);
              // Deliberately noncooperating own-fixture writer: tests final-role
              // rollback wiring, not successful privileged-writer adoption.
              await query(admin, "UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=pg_settings_definition||E'\\n' WHERE kind='APP'", [], 'HARNESS_ONLY_UNFENCED_FINAL_ROLE_DRIFT');
              record({ operation: 'EXPLICIT_NONCOOPERATING_FIXTURE_DRIFT', receiptId: receipt.id, held, binding: await bindingRows() });
            }
          }
          expect(await nativeLocks()).toContainEqual(expectedLock(app, 'ShareLock', true));
          record({ operation: 'CURRENT_FINAL_NATIVE_IDENTITY', receiptId: receipt.id, native: await identity(app), held: await nativeLocks() });
          await query(app, 'COMMIT'); receipt.committed = true; return receipt.nativeResults;
        } catch (error) {
          record({ operation: 'NATIVE_ATOMIC_ERROR_BEFORE_ROLLBACK', receipt });
          if (receipt.sqlstate) {
            await synchronizeAborted();
            try { await app.query('SELECT 1'); throw Error('failed_transaction_accepted_query'); }
            catch (failed) { expect(state(failed)).toBe('25P02'); }
          }
          if (['T', 'E'].includes(app.getTransactionStatus() ?? '')) { await query(app, 'ROLLBACK'); receipt.rolledBack = true; }
          expect(app.getTransactionStatus()).toBe('I');
          record({ operation: 'NATIVE_ATOMIC_ROLLBACK_CONFIRMED', receipt, heldAfter: await nativeLocks() }); throw error;
        }
      },
    };
  }

  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true); expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid = process.getuid?.(); expect(uid !== undefined).toBe(true); const ls = lstatSync(leasePath!);
    expect(ls.isFile() && !ls.isSymbolicLink()).toBe(true); expect(ls.uid).toBe(uid); expect(ls.mode & 0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(uid); runVerified = true;
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease; expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/); expect(lease.marker).toBe('f10-owned:' + lease.invocation);
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:runtime-role:' + lease.invocation);
    expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true); expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data')); expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n'); expect(Number(pid[0])).toBe(lease.pid);
    expect(realpathSync(pid[1])).toBe(lease.data); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credential = lstatSync(lease.credentialFile); expect(credential.isFile() && !credential.isSymbolicLink()).toBe(true);
    expect(credential.uid).toBe(uid); expect(credential.mode & 0o777).toBe(0o600); expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);
    expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    for (const [path, digest] of Object.entries(pinnedSources)) expect(hash(readFileSync(resolve(path)))).toBe(digest);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user);
    const base = (await query(admin, `SELECT current_database() db,(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) oid,
      pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database') marker,
      pg_catalog.current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,
      pg_catalog.current_setting('server_version') version,pg_catalog.current_setting('server_encoding') encoding,
      pg_catalog.host(pg_catalog.inet_server_addr()) host,pg_catalog.inet_server_port() port,session_user::text role,current_user::text current_role,
      (SELECT oid::text FROM pg_catalog.pg_roles WHERE rolname=session_user) role_oid,
      (SELECT datdba::text FROM pg_catalog.pg_database WHERE datname=current_database()) owner`)).rows[0];
    expect(base).toMatchObject({ db: lease.database, oid: String(lease.databaseOid), marker: lease.marker, data: lease.data, system_id: lease.systemIdentifier,
      encoding: 'UTF8', host: '127.0.0.1', port: lease.port, role: lease.user, current_role: lease.user }); expect(base.version).toMatch(/^18\.4(?:\s|$)/);
    installerOid = base.role_oid as string; expect(base.owner).toBe(installerOid); pids.set(admin, (await identity(admin)).backend as number); verified = true;
    expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, `SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`)).rows).toEqual([]);
    expect((await query(admin, `SELECT p.oid FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'`)).rows).toEqual([]);
    await query(admin, 'BEGIN');
    appRole = await createRole(lease.invocation + '_app'); workerRole = await createRole(lease.invocation + '_worker'); outsiderRole = await createRole(lease.invocation + '_outsider');
    await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC'); await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + roles.map(role => q(role.name)).join(','));
    await query(admin, 'CREATE SCHEMA nevora_tenancy'); await remember('schema', 'nevora_tenancy'); await query(admin, 'COMMIT');
    await query(admin, readFileSync(resolve('src/lib/tenancy/runtime/control-storage.sql'), 'utf8')); await remember('table', 'nevora_tenancy.runtime_role_binding');
    await query(admin, 'BEGIN');
    const settings = (await query(admin, `SELECT 'pg_catalog.pg_settings'::regclass::oid::text oid,
      pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::regclass,false) definition,
      ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite w WHERE w.ev_class='pg_catalog.pg_settings'::regclass ORDER BY w.rulename COLLATE pg_catalog."C") rules`)).rows[0];
    for (const [kind, role] of [['APP', appRole], ['WORKER', workerRole]] as const) await query(admin,
      'INSERT INTO nevora_tenancy.runtime_role_binding VALUES($1,$2,$3::oid,$4::oid,$5,$6::text[])', [kind, role.name, role.oid, settings.oid, settings.definition, settings.rules]);
    await query(admin, readFileSync(resolve('src/lib/tenancy/runtime/role-guard.sql'), 'utf8')); await remember('function', 'nevora_tenancy.assert_runtime_role(text)');
    await query(admin, 'REVOKE ALL ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM PUBLIC');
    const named = [appRole, workerRole].map(role => q(role.name)).join(',');
    await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + named); await query(admin, 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding TO ' + named);
    await query(admin, 'GRANT EXECUTE ON FUNCTION nevora_tenancy.assert_runtime_role(text) TO ' + named);
    await query(admin, 'CREATE TABLE public.workspaces(id text PRIMARY KEY,name text NOT NULL,time_zone text NOT NULL,active boolean NOT NULL)'); await remember('table', 'public.workspaces');
    await query(admin, 'CREATE TABLE public.employees(id text PRIMARY KEY,workspace_id text NOT NULL,first_name text NOT NULL,last_name text NOT NULL,role text NOT NULL,active boolean NOT NULL)'); await remember('table', 'public.employees');
    await query(admin, 'CREATE TABLE ' + probe() + '(id int4 PRIMARY KEY,value int4 NOT NULL)'); await remember('table', probe());
    await query(admin, "INSERT INTO public.workspaces VALUES('tenant-a','Fictional','UTC',true)"); await query(admin, "INSERT INTO public.employees VALUES('employee-a','tenant-a','Fictional','Employee','EMPLOYEE',true)");
    await query(admin, 'INSERT INTO ' + probe() + ' VALUES(1,1)');
    await query(admin, 'GRANT SELECT ON TABLE public.workspaces,public.employees TO ' + q(appRole.name));
    await query(admin, 'GRANT SELECT(id,value),UPDATE(value) ON TABLE ' + probe() + ' TO ' + q(appRole.name));
    for (const name of ['lock_and_assert_current_proof', 'assert_current_proof']) {
      const signature = 'nevora_tenancy.' + name + '(jsonb)';
      await query(admin, 'CREATE FUNCTION ' + signature + ' RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT true $$');
      await remember('function', signature); await query(admin, 'REVOKE ALL ON FUNCTION ' + signature + ' FROM PUBLIC'); await query(admin, 'GRANT EXECUTE ON FUNCTION ' + signature + ' TO ' + q(appRole.name));
    }
    await query(admin, 'COMMIT'); fixtureCommitted = true; originalBinding = await bindingRows(); originalCatalog = await catalog();
    app = await connect(appRole.name); pids.set(app, (await identity(app)).backend as number); writer = await connect(lease.user); pids.set(writer, (await identity(writer)).backend as number);
    installAdapter(); expect((await query(app, "SELECT nevora_tenancy.assert_runtime_role('APP') allowed")).rows).toEqual([{ allowed: true }]);
    const outsiderRights = (await query(admin, `SELECT pg_catalog.has_schema_privilege($1,'nevora_tenancy','USAGE') schema_usage,
      pg_catalog.has_table_privilege($1,'nevora_tenancy.runtime_role_binding','SELECT') binding_read,
      pg_catalog.has_function_privilege($1,'nevora_tenancy.assert_runtime_role(text)','EXECUTE') role_execute`, [outsiderRole.name])).rows;
    expect(outsiderRights).toEqual([{ schema_usage: false, binding_read: false, role_execute: false }]);
    record({ operation: 'SOURCE_BOUND_ROOT_FICTIONAL_EXECUTOR_FIXTURE', base, roles, objects, originalBinding, originalCatalog, settings,
      outsiderRights,
      claim: 'LITERAL_PROOF_STUBS_AND_MOCKED_LOOKUP_NOT_DOMAIN_CURRENT_PROOF_RLS_NEON_OR_DATABASE_ISSUER_AUTHORITY' });
  }, 30000);

  it('EA01 preserves native fence/context/guard offsets for one and two genuine business builders', async () => {
    for (const count of [1, 2]) {
      const proof = await issueFictionalProof(), executor = createTenantExecutor(proof), before = transactionCount;
      const result = count === 1 ? await executor.query(workspaceSnapshot(proof)) : await executor.transaction(tenantBatch(proof, [workspaceSnapshot(proof), portalEmploymentSnapshot(proof)]));
      expect(transactionCount).toBe(before + 1); const receipt = transactions.at(-1)!;
      expect(receipt.plans).toHaveLength(count + 6); expect(receipt.nativeResults).toHaveLength(count + 6);
      expect(receipt.nativeResults[0]).toEqual([{ catalog_fence: '' }]); expect(receipt.plans[1].text).toContain('assert_runtime_role');
      expect(receipt.plans[2].text).toContain("set_config('nevora.workspace_id'"); expect(receipt.plans[3].text).toContain('lock_and_assert_current_proof');
      expect(receipt.nativeResults[4]).toEqual([{ id: 'tenant-a', name: 'Fictional', time_zone: 'UTC', active: true }]);
      if (count === 1) expect(result).toEqual({ id: 'tenant-a', name: 'Fictional', timeZone: 'UTC', active: true });
      else expect(result).toEqual([{ id: 'tenant-a', name: 'Fictional', timeZone: 'UTC', active: true },
        { id: 'employee-a', firstName: 'Fictional', lastName: 'Employee', role: 'EMPLOYEE', active: true }]);
      expect(receipt.committed).toBe(true); expect(receipt.rolledBack).toBe(false); expect(await nativeLocks()).toEqual([]);
      record({ caseId: 'EA01', count, result, receipt });
    }
  });
  it('EA02 blocks first shared acquisition then sees a fresh committed fictional row in READ COMMITTED', async () => {
    const proof = await issueFictionalProof(); await exclusive(); await query(writer, "UPDATE public.workspaces SET name='AfterWait' WHERE id='tenant-a'");
    const count = transactionCount, promise = createTenantExecutor(proof).query(workspaceSnapshot(proof)); waitingTransaction = promise;
    await waitFor(async () => transactions.length > count, 'TRANSACTION_STARTED'); const receipt = transactions.at(-1)!;
    const blocked = await observedWait(receipt); await query(writer, 'COMMIT'); const result = await promise; waitingTransaction = null;
    expect(result).toEqual({ id: 'tenant-a', name: 'AfterWait', timeZone: 'UTC', active: true }); expect(transactionCount).toBe(count + 1);
    record({ caseId: 'EA02', blocked, result, receipt, freshness: 'FIRST_SHARED_WAIT_THEN_SEPARATE_READ_COMMITTED_ROLE_AND_BUSINESS_STATEMENTS' });
    await exclusive(); await query(writer, "UPDATE public.workspaces SET name='Fictional' WHERE id='tenant-a'"); await query(writer, 'COMMIT');
  });
  it('EA03 first fresh ROLE denies a fenced binding delta before context/proof/business dispatch without replay', async () => {
    const proof = await issueFictionalProof(); await exclusive(); await query(writer, "UPDATE nevora_tenancy.runtime_role_binding SET pg_settings_definition=pg_settings_definition||E'\\n' WHERE kind='APP'");
    const count = transactionCount; const outcome = createTenantExecutor(proof).query(workspaceSnapshot(proof)).then(value => ({ value }), error => ({ error: (error as Error).message })); waitingTransaction = outcome;
    await waitFor(async () => transactions.length > count, 'TRANSACTION_STARTED'); const receipt = transactions.at(-1)!;
    const blocked = await observedWait(receipt); await query(writer, 'COMMIT'); expect(await outcome).toEqual({ error: 'tenant_execution_unavailable' }); waitingTransaction = null;
    expect(transactionCount).toBe(count + 1); expect(receipt.dispatched).toEqual([0, 1]); expect(receipt.sqlstate).toBe('22012');
    expect(receipt.rolledBack).toBe(true); expect(receipt.committed).toBe(false); expect(await nativeLocks()).toEqual([]);
    record({ caseId: 'EA03', blocked, receipt, noContextProofBusinessSQLDispatched: true }); await restoreBinding();
  });
  it('EA04 final real ROLE denial rolls back the harness-only same-transaction probe without exposing business DTOs', async () => {
    const proof = await issueFictionalProof(), before = transactionCount; hook = 'FINAL_DENIAL';
    await expect(createTenantExecutor(proof).transaction(tenantBatch(proof, [workspaceSnapshot(proof), portalEmploymentSnapshot(proof)]))).rejects.toThrow('tenant_execution_unavailable');
    hook = 'NONE'; const receipt = transactions.at(-1)!; expect(transactionCount).toBe(before + 1); expect(receipt.plans).toHaveLength(8);
    expect(receipt.dispatched).toEqual([0, 1, 2, 3, 4, 5, 6, 7]); expect(receipt.sqlstate).toBe('22012');
    expect(receipt.nativeResults).toHaveLength(7); expect(receipt.nativeResults[6]).toEqual([{ guard: 1 }]);
    expect(receipt.probe).toEqual([{ id: 1, value: 2 }]); expect(receipt.rolledBack).toBe(true); expect(receipt.committed).toBe(false);
    const independentlyOriginal = (await query(admin, 'SELECT id,value FROM ' + probe())).rows; expect(independentlyOriginal).toEqual([{ id: 1, value: 1 }]);
    record({ caseId: 'EA04', receipt, independentlyOriginal, claim: 'CONTROLLED_NONCOOPERATING_FIXTURE_WRITER_AND_PROBE_NOT_APPLICATION_WRITE_CONSTRUCTOR_OR_FULL_ADOPTION' }); await restoreBinding();
  });
  afterEach(async () => {
    hook = 'NONE';
    if (verified) {
      // End the owned writer first so any queued APP acquire can settle.
      if (writer && ['T', 'E'].includes(writer.getTransactionStatus() ?? '')) await query(writer, 'ROLLBACK');
      if (waitingTransaction) { await waitingTransaction.catch(() => undefined); waitingTransaction = null; }
      if (app && ['T', 'E'].includes(app.getTransactionStatus() ?? '')) await query(app, 'ROLLBACK');
    }
  }, 20000);
  afterAll(async () => {
    let cleaned = false;
    try {
      if (verified) {
        if (writer && ['T', 'E'].includes(writer.getTransactionStatus() ?? '')) await query(writer, 'ROLLBACK');
        if (waitingTransaction) { await waitingTransaction.catch(() => undefined); waitingTransaction = null; }
        if (app && ['T', 'E'].includes(app.getTransactionStatus() ?? '')) await query(app, 'ROLLBACK');
        if (['T', 'E'].includes(admin.getTransactionStatus() ?? '')) await query(admin, 'ROLLBACK');
        if (fixtureCommitted) {
          await restoreBinding(); await exclusive(); await query(writer, "UPDATE public.workspaces SET name='Fictional' WHERE id='tenant-a'"); await query(writer, 'COMMIT');
          expect(await catalog()).toEqual(originalCatalog); expect(await bindingRows()).toEqual(originalBinding);
          expect((await query(admin, 'SELECT id,value FROM ' + probe())).rows).toEqual([{ id: 1, value: 1 }]);
          record({ operation: 'FINAL_NATIVE_FIXTURE_SOURCE_AND_ROWS', catalog: await catalog(), binding: await bindingRows(),
            workspaces: (await query(admin, 'SELECT * FROM public.workspaces')).rows, employees: (await query(admin, 'SELECT * FROM public.employees')).rows,
            probe: (await query(admin, 'SELECT * FROM ' + probe())).rows, transactions });
        }
        for (const client of clients) if (client !== admin) { await client.end(); closed.add(client); }
        for (const object of [...objects].reverse()) {
          const current = object.kind === 'schema' ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [object.target])).rows
            : object.kind === 'table' ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [object.target])).rows
              : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [object.target])).rows;
          if (!current.length && !fixtureCommitted) { object.dropped = true; record({ operation: 'OWN_SETUP_ROLLBACK_ABSENCE', object }); continue; }
          expect(current).toEqual([{ oid: object.oid, owner: object.owner }]); expect(object.owner).toBe(installerOid);
          await query(admin, 'DROP ' + object.kind.toUpperCase() + ' ' + (object.kind === 'schema' ? q(object.target) : object.target));
          const gone = object.kind === 'schema' ? (await query(admin, 'SELECT oid FROM pg_catalog.pg_namespace WHERE oid=$1::oid', [object.oid])).rows
            : object.kind === 'table' ? (await query(admin, 'SELECT oid FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows
              : (await query(admin, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows;
          expect(gone).toEqual([]); object.dropped = true; record({ operation: 'EXACT_OWN_OBJECT_DROPPED', object });
        }
        for (const role of [...roles].reverse()) {
          const current = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [role.name])).rows;
          if (!current.length && !fixtureCommitted) continue;
          expect(current).toEqual([{ oid: role.oid }]); await query(admin, 'REVOKE CONNECT ON DATABASE ' + q(lease.database) + ' FROM ' + q(role.name));
          await query(admin, 'DROP ROLE ' + q(role.name)); expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2', [role.oid, role.name])).rows).toEqual([]);
          record({ operation: 'EXACT_OWN_ROLE_DROPPED', role });
        }
        expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin, `SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`)).rows).toEqual([]); cleaned = true;
      }
    } finally {
      transport.value = null; password = '';
      for (const client of clients) if (!closed.has(client)) { try { await client.end(); closed.add(client); } catch { record({ operation: 'OWN_CLIENT_CLOSE_UNCONFIRMED', backend: pids.get(client) }); } }
      if (runVerified) writeFileSync(join(runPath!, 'executor-catalog-fence-cleanup.json'), JSON.stringify({ verified, fixtureCommitted, cleaned,
        clients: clients.size, closedClients: closed.size, pendingRepairs: 0, pendingTransactions: waitingTransaction === null ? 0 : 1,
        roles, objects, records, transactions, sourcePins: pinnedSources,
        claim: 'NATIVE_EXECUTOR_PREFIX_ADAPTER_ONLY_NOT_DOMAIN_CURRENT_PROOF_RLS_NEON_FULL_F10_F6_F9_OR_INDEPENDENT_CERTIFICATION' }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 30000);
});
