import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL, type CatalogFenceSqlPlan } from './catalog-fence.server';

// Match existing server-only test handling; SQL, clients and locks are real when
// root explicitly invokes the owned fixture. This mocks only the build marker.
vi.mock('server-only', () => ({}));
const sourcePath = resolve('src/lib/tenancy/runtime/catalog-fence.server.ts');
const testPath = resolve('src/lib/tenancy/runtime/catalog-fence.postgres.test.ts');
const expectedSourceSHA256 = '2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f';
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const leasePath = process.env.F_ROLE_OWNED_LEASE, runPath = process.env.F_ROLE_RUN_DIR;
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Identity = { session: string; current_role: string; role: string; backend: number; original_oid: string; isolation: string };
type Lock = { database: string; classid: string; objid: string; objsubid: number; pid: number; mode: string; granted: boolean };
type OwnObject = { kind: 'table' | 'function'; name: string; oid: string; owner: string; target: string; dropped: boolean };
type Acquire = { settled: boolean; done: Promise<{ status: 'ACQUIRED' } | { status: 'ERROR'; code: string }> };

// HOLD by default. No ambient URLs, lease search, connections or resources are
// started on import. Root owns every native fixture/SQL operation and cleanup.
describe.skipIf(!leasePath && !runPath)('owned PG18 catalog fence transaction semantics', () => {
  let lease: Lease, control: Client, readerA: Client, readerB: Client, writer: Client;
  let password = '', installerOid = '', verified = false, runVerified = false, fixtureCommitted = false;
  let helper: OwnObject, table: OwnObject, originalCatalog: Awaited<ReturnType<typeof catalog>>;
  let key: { signed: string; high: string; low: string; database: string };
  const clients = new Set<Client>(), closed = new Set<Client>(), pids = new Map<Client, number>();
  const objects: OwnObject[] = [], pending = new Map<Client, Acquire>(), records: unknown[] = [];
  let sqlCount = 0;
  const relation = () => 'public.' + q(lease.invocation + '_catalog_rows');
  const signature = () => 'public.' + q(lease.invocation + '_catalog_helper') + '()';
  const helperDDL = (value: 1 | 2) => 'CREATE OR REPLACE FUNCTION ' + signature() +
    ' RETURNS pg_catalog.int4 LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $$ SELECT ' + value + '::pg_catalog.int4 $$';
  const state = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN';
  };
  function record(value: unknown) {
    records.push(value);
    appendFileSync(join(runPath!, 'catalog-fence-operations.jsonl'), JSON.stringify(value) + '\n', { mode: 0o600 });
  }
  async function identity(client: Client): Promise<Identity> {
    sqlCount++;
    const row = (await client.query(`SELECT session_user::text session,current_user::text current_role,
      pg_catalog.current_setting('role') role,pg_catalog.pg_backend_pid() backend,
      (SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid,
      pg_catalog.current_setting('transaction_isolation') isolation`)).rows[0] as Identity;
    expect(row).toMatchObject({ session: lease.user, current_role: lease.user, role: 'none', original_oid: installerOid });
    if (pids.has(client)) expect(row.backend).toBe(pids.get(client));
    return row;
  }
  async function sql(client: Client, text: string, values: unknown[] = [], kind: 'NORMAL' | 'BEGIN' | 'ACQUIRE' | 'ABORTED' = 'NORMAL') {
    // BEGIN's identity observation is outside the transaction; the acquire is
    // its first statement. No identity/helper/catalog SELECT is inserted before
    // the first acquire. After it succeeds, observations use separate statements.
    const before = kind === 'ACQUIRE' || kind === 'ABORTED' ? null : await identity(client);
    sqlCount++;
    try {
      const result = await client.query(text, values);
      const after = kind === 'BEGIN' || client.getTransactionStatus() === 'E' ? null : await identity(client);
      record({ operation: 'OWNED_SQL', backend: pids.get(client), query: text, before, after, command: result.command,
        transaction: client.getTransactionStatus(), omittedIdentityReason: kind === 'BEGIN' ? 'ACQUIRE_MUST_BE_FIRST_STATEMENT' : kind === 'ABORTED' ? 'FAILED_TRANSACTION_NO_ADDITIONAL_SQL' : null });
      return result;
    } catch (error) {
      record({ operation: 'OWNED_SQL_ERROR', backend: pids.get(client), query: text, before, sqlstate: state(error), transaction: client.getTransactionStatus() });
      throw new Error('owned_catalog_fence_sql_' + state(error));
    }
  }
  async function rejected(client: Client, text: string) {
    sqlCount++;
    try { await client.query(text); return 'NO_ERROR'; }
    catch (error) { const code = state(error); record({ operation: 'OWNED_EXPECTED_ERROR', backend: pids.get(client), query: text, code, transaction: client.getTransactionStatus() }); return code; }
  }
  async function failedBlock(client: Client) {
    // pg rejects at ErrorResponse; getTransactionStatus changes at the later
    // ReadyForQuery message. Retain the immediate value, then synchronize with
    // the independently observed native failed block and the exact E response.
    const immediate = client.getTransactionStatus(), end = Date.now() + 8000;
    let native: Record<string, unknown>[] = [];
    do {
      native = (await sql(control, `SELECT pid,usename::text name,usesysid::text original_oid,state
        FROM pg_catalog.pg_stat_activity WHERE pid=$1`, [pids.get(client)])).rows;
      if (native.length === 1 && native[0].state === 'idle in transaction (aborted)' && client.getTransactionStatus() === 'E') break;
      await new Promise(resolveWait => setTimeout(resolveWait, 10));
    } while (Date.now() < end);
    record({ operation: 'NATIVE_FAILED_BLOCK_AND_READY_RESPONSE', backend: pids.get(client), immediate, native, readyStatus: client.getTransactionStatus() });
    expect(native).toEqual([{ pid: pids.get(client), name: lease.user, original_oid: installerOid, state: 'idle in transaction (aborted)' }]);
    expect(client.getTransactionStatus()).toBe('E');
  }
  async function begin(client: Client) {
    expect(client.getTransactionStatus()).toBe('I');
    await sql(client, 'BEGIN ISOLATION LEVEL READ COMMITTED', [], 'BEGIN');
  }
  async function acquire(client: Client, plan: CatalogFenceSqlPlan<'RUNTIME_SHARED' | 'INSTALLER_EXCLUSIVE'>) {
    expect(client.getTransactionStatus()).toBe('T');
    const result = await sql(client, plan.text, [...plan.values], 'ACQUIRE');
    expect(result.rows).toHaveLength(1); expect(result.command).toBe('SELECT');
  }
  function startAcquire(client: Client, plan: CatalogFenceSqlPlan<'RUNTIME_SHARED' | 'INSTALLER_EXCLUSIVE'>) {
    const item: Acquire = { settled: false, done: Promise.resolve({ status: 'ACQUIRED' }) };
    item.done = acquire(client, plan).then(() => { item.settled = true; return { status: 'ACQUIRED' as const }; }, error => {
      item.settled = true; return { status: 'ERROR' as const, code: (error as Error).message };
    });
    pending.set(client, item); return item;
  }
  async function finishAcquire(client: Client, item: Acquire) {
    const result = await item.done; pending.delete(client); expect(result).toEqual({ status: 'ACQUIRED' });
  }
  async function locks(): Promise<Lock[]> {
    return (await sql(control, `SELECT database::text database,classid::text classid,objid::text objid,objsubid,pid,mode,granted
      FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=ANY($1::int4[]) ORDER BY pid,mode`, [[...pids.values()]])).rows as Lock[];
  }
  const lockFor = (client: Client, mode: 'ShareLock' | 'ExclusiveLock', granted: boolean): Lock =>
    ({ database: key.database, classid: key.high, objid: key.low, objsubid: 1, pid: pids.get(client)!, mode, granted });
  async function waiting(client: Client, mode: 'ShareLock' | 'ExclusiveLock', holders: Client[], item: Acquire) {
    const end = Date.now() + 8000;
    let observation: { locks: Lock[]; activity: Record<string, unknown>[] } | undefined;
    do {
      const current = await locks();
      const activity = (await sql(control, `SELECT pid,usename::text name,usesysid::text original_oid,state,wait_event_type,wait_event,
        pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1`, [pids.get(client)])).rows;
      observation = { locks: current, activity };
      if (current.some(row => JSON.stringify(row) === JSON.stringify(lockFor(client, mode, false)))) {
        expect(item.settled).toBe(false);
        expect(activity).toHaveLength(1); expect(activity[0]).toMatchObject({ name: lease.user, original_oid: installerOid,
          state: 'active', wait_event_type: 'Lock', wait_event: 'advisory' });
        for (const holder of holders) expect(activity[0].blockers).toContain(pids.get(holder));
        record({ operation: 'NATIVE_GRANTED_AND_BLOCKED_OBSERVATION', waiter: pids.get(client), observation }); return observation;
      }
      if (item.settled) break;
      await new Promise(resolveWait => setTimeout(resolveWait, 10));
    } while (Date.now() < end);
    record({ operation: 'NATIVE_WAIT_NOT_OBSERVED', waiter: pids.get(client), observation, settled: item.settled });
    throw new Error('owned_catalog_fence_native_wait_not_observed');
  }
  async function catalog() {
    const relations = (await sql(control, `SELECT c.oid::text oid,c.relname,c.relowner::text owner,c.relkind,c.relacl::text acl
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname COLLATE pg_catalog."C"`)).rows;
    const columns = (await sql(control, `SELECT c.oid::text relation_oid,a.attnum,a.attname,a.atttypid::text type_oid,a.attnotnull,
      pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname COLLATE pg_catalog."C",a.attnum`)).rows;
    const constraints = (await sql(control, `SELECT c.oid::text oid,c.conrelid::text relation_oid,pg_catalog.pg_get_constraintdef(c.oid,false) definition
      FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY c.oid`)).rows;
    const functions = (await sql(control, `SELECT p.oid::text oid,p.proname,p.proowner::text owner,p.prosecdef,p.proconfig,p.proacl::text acl,
      pg_catalog.pg_get_functiondef(p.oid) definition FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' ORDER BY p.oid`)).rows;
    return { relations, columns, constraints, functions };
  }
  async function observation(client: Client) {
    const held = (await sql(client, `SELECT database::text database,classid::text classid,objid::text objid,objsubid,pid,mode,granted
      FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=pg_catalog.pg_backend_pid() ORDER BY mode`)).rows;
    expect(held).toContainEqual(lockFor(client, 'ShareLock', true));
    const tuple = (await sql(client, `SELECT p.oid::text oid,p.proowner::text owner,p.prosecdef,p.proconfig,p.proacl::text acl,
      pg_catalog.pg_get_functiondef(p.oid) definition,
      pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex') source_sha256,
      session_user::text session,current_user::text current_role,pg_catalog.current_setting('transaction_isolation') isolation
      FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)`, [signature()])).rows[0];
    expect(tuple).toMatchObject({ oid: helper.oid, owner: installerOid, prosecdef: false, session: lease.user,
      current_role: lease.user, isolation: 'read committed' });
    expect(tuple.source_sha256).toBe(hash(tuple.definition as string));
    const result = (await sql(client, 'SELECT ' + signature() + ' value')).rows;
    const rows = (await sql(client, 'SELECT id,value FROM ' + relation() + ' ORDER BY id')).rows;
    return { held, tuple, result, rows };
  }
  async function restoreOriginal() {
    await begin(writer); await acquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    await sql(writer, helperDDL(1)); await sql(writer, 'UPDATE ' + relation() + ' SET value=1 WHERE id=1');
    await sql(writer, 'COMMIT');
    expect(await catalog()).toEqual(originalCatalog);
  }
  async function releaseOwnTransactions() {
    // Release granted holders first, so rollback is never queued behind a
    // blocked acquire while its blocker waits for that same cleanup.
    for (const client of clients) if (!pending.has(client) || pending.get(client)!.settled) {
      if (['T', 'E'].includes(client.getTransactionStatus() ?? '')) await sql(client, 'ROLLBACK', [], 'ABORTED');
    }
    for (const [client, item] of [...pending]) {
      const result = await item.done; record({ operation: 'OWN_PENDING_ACQUIRE_RECONCILIATION', backend: pids.get(client), result });
      pending.delete(client);
      if (['T', 'E'].includes(client.getTransactionStatus() ?? '')) await sql(client, 'ROLLBACK', [], 'ABORTED');
    }
  }
  async function connect() {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database, user: lease.user,
      password, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(client);
    try { await client.connect(); } catch { throw new Error('owned_catalog_fence_connection_failed'); }
    sqlCount++; await client.query('SET search_path=pg_catalog');
    const native = await identity(client); pids.set(client, native.backend);
    expect(client.getTransactionStatus()).toBe('I'); record({ operation: 'OWN_ORIGINAL_LOGIN_CONNECTED', native }); return client;
  }

  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid = process.getuid?.(); expect(uid !== undefined).toBe(true);
    const leaseStat = lstatSync(leasePath!);
    expect(leaseStat.isFile() && !leaseStat.isSymbolicLink()).toBe(true); expect(leaseStat.uid).toBe(uid); expect(leaseStat.mode & 0o777).toBe(0o600);
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(statSync(runPath!).uid).toBe(uid); runVerified = true;
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false); expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);
    expect(lease.marker).toBe('f10-owned:' + lease.invocation); expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:runtime-role:' + lease.invocation);
    expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true); expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data')); expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credential = lstatSync(lease.credentialFile);
    expect(credential.isFile() && !credential.isSymbolicLink()).toBe(true); expect(credential.uid).toBe(uid); expect(credential.mode & 0o777).toBe(0o600);
    expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile); expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    expect(hash(readFileSync(sourcePath))).toBe(expectedSourceSHA256);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    // First connection independently checks root identity before generic query
    // instrumentation can use the retained installer OID.
    control = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database, user: lease.user, password,
      connectionTimeoutMillis: 3000, statement_timeout: 15000 }); clients.add(control);
    try { await control.connect(); } catch { throw new Error('owned_catalog_fence_connection_failed'); }
    sqlCount++;
    const base = (await control.query(`SELECT current_database() db,(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) oid,
      pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database') marker,
      pg_catalog.current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,
      pg_catalog.current_setting('server_version') version,pg_catalog.current_setting('server_encoding') encoding,
      pg_catalog.host(pg_catalog.inet_server_addr()) host,pg_catalog.inet_server_port() port,session_user::text role,current_user::text current_role,
      (SELECT oid::text FROM pg_catalog.pg_roles WHERE rolname=session_user) role_oid,
      (SELECT datdba::text FROM pg_catalog.pg_database WHERE datname=current_database()) owner`)).rows[0];
    expect(base).toMatchObject({ db: lease.database, oid: String(lease.databaseOid), marker: lease.marker, data: lease.data,
      system_id: lease.systemIdentifier, encoding: 'UTF8', host: '127.0.0.1', port: lease.port, role: lease.user, current_role: lease.user });
    expect(base.version).toMatch(/^18\.4(?:\s|$)/); installerOid = base.role_oid as string; expect(base.owner).toBe(installerOid);
    sqlCount++; await control.query('SET search_path=pg_catalog');
    const initialIdentity = await identity(control); pids.set(control, initialIdentity.backend); expect(control.getTransactionStatus()).toBe('I'); verified = true;
    const empty = await catalog(); expect(empty).toEqual({ relations: [], columns: [], constraints: [], functions: [] });
    const digest = createHash('sha256').update('nevora.runtime.catalog-fence.v1:' + String(lease.databaseOid), 'utf8').digest('hex').slice(0, 16);
    const unsigned = BigInt('0x' + digest);
    key = { signed: BigInt.asIntN(64, unsigned).toString(), high: (unsigned >> BigInt(32)).toString(), low: (unsigned & BigInt('4294967295')).toString(), database: String(lease.databaseOid) };
    readerA = await connect(); readerB = await connect(); writer = await connect();
    await begin(control); await acquire(control, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    await sql(control, 'CREATE TABLE ' + relation() + '(id pg_catalog.int4 PRIMARY KEY,value pg_catalog.int4 NOT NULL)');
    const tableRow = (await sql(control, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [relation()])).rows[0];
    expect(tableRow.owner).toBe(installerOid);
    table = { kind: 'table', name: lease.invocation + '_catalog_rows', target: relation(), ...tableRow, dropped: false }; objects.push(table);
    await sql(control, 'INSERT INTO ' + relation() + '(id,value) VALUES(1,1)'); await sql(control, helperDDL(1));
    const helperRow = (await sql(control, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [signature()])).rows[0];
    expect(helperRow.owner).toBe(installerOid);
    helper = { kind: 'function', name: lease.invocation + '_catalog_helper', target: signature(), ...helperRow, dropped: false }; objects.push(helper);
    await sql(control, 'COMMIT'); fixtureCommitted = true; originalCatalog = await catalog(); expect(await locks()).toEqual([]);
    record({ operation: 'ROOT_CONFIRMED_FICTIONAL_FIXTURE', base, key, originalCatalog, objects,
      claim: 'FOUR_ORIGINAL_INSTALLER_CLIENTS_NO_ROLE_GRANT_CHANGE_CHILD_DB_RUNTIME_AUTHORITY_OR_BUSINESS_SEMANTICS' });
  }, 30000);

  it('CF01 derives one exact native database lock tuple for both plans without JS number coercion', async () => {
    const original = await catalog();
    for (const [client, plan, mode] of [[readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL, 'ShareLock'], [writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL, 'ExclusiveLock']] as const) {
      await begin(client); await acquire(client, plan);
      const native = await locks(); expect(native).toEqual([lockFor(client, mode, true)]);
      const reconstructed = (await sql(control, `SELECT ((classid::bigint << 32) | objid::bigint)::text signed,
        pg_catalog.pg_typeof((classid::bigint << 32) | objid::bigint)::text native_type FROM pg_catalog.pg_locks
        WHERE locktype='advisory' AND pid=$1 AND granted`, [pids.get(client)])).rows;
      expect(reconstructed).toEqual([{ signed: key.signed, native_type: 'bigint' }]);
      record({ caseId: 'CF01', plan: plan.mode, key, native, reconstructed });
      await sql(client, 'COMMIT'); expect(await locks()).toEqual([]);
    }
    expect(await catalog()).toEqual(original);
  });

  it('CF02 grants two overlapping shared transactions on the same native tuple', async () => {
    await begin(readerA); await begin(readerB);
    await Promise.all([acquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL), acquire(readerB, RUNTIME_CATALOG_SHARED_FENCE_SQL)]);
    const native = await locks(); expect(native).toHaveLength(2);
    expect(native).toContainEqual(lockFor(readerA, 'ShareLock', true)); expect(native).toContainEqual(lockFor(readerB, 'ShareLock', true));
    record({ caseId: 'CF02', native, observations: [await observation(readerA), await observation(readerB)] });
    await sql(readerA, 'COMMIT'); expect(await locks()).toEqual([lockFor(readerB, 'ShareLock', true)]);
    await sql(readerB, 'COMMIT'); expect(await locks()).toEqual([]);
  });

  it('CF03 blocks exclusive behind shared until commit and retains the final native observation', async () => {
    await begin(readerA); await acquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL); await begin(writer);
    const attempt = startAcquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    const blocked = await waiting(writer, 'ExclusiveLock', [readerA], attempt);
    const finalObservation = await observation(readerA); expect(finalObservation.result).toEqual([{ value: 1 }]);
    await sql(readerA, 'COMMIT'); await finishAcquire(writer, attempt);
    const granted = await locks(); expect(granted).toEqual([lockFor(writer, 'ExclusiveLock', true)]);
    record({ caseId: 'CF03', blocked, finalObservation, granted, release: 'COMMIT' }); await sql(writer, 'ROLLBACK');
  });

  it('CF04 blocks shared behind fenced DDL and observes the fresh committed source in a later READ COMMITTED statement', async () => {
    await begin(writer); await acquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    const nativeBeforeDDL = await locks(); expect(nativeBeforeDDL).toEqual([lockFor(writer, 'ExclusiveLock', true)]);
    await sql(writer, helperDDL(2)); await sql(writer, 'UPDATE ' + relation() + ' SET value=2 WHERE id=1');
    await begin(readerA); const attempt = startAcquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL);
    const blocked = await waiting(readerA, 'ShareLock', [writer], attempt);
    await sql(writer, 'COMMIT'); await finishAcquire(readerA, attempt);
    const fresh = await observation(readerA); expect(fresh.result).toEqual([{ value: 2 }]); expect(fresh.rows).toEqual([{ id: 1, value: 2 }]);
    expect(fresh.tuple.definition).not.toBe(originalCatalog.functions[0].definition);
    record({ caseId: 'CF04', nativeBeforeDDL, blocked, fresh, retainedOldSource: originalCatalog.functions,
      claim: 'SEPARATE_POST_WAIT_READ_COMMITTED_STATEMENT_NO_REPEATABLE_READ_FRESHNESS_OR_RUNTIME_INTEGRATION_CLAIM' });
    await sql(readerA, 'COMMIT'); await restoreOriginal();
  });

  it('CF05 releases exclusive by rollback and the waiting shared transaction sees the unchanged native source and rows', async () => {
    await begin(writer); await acquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    await sql(writer, helperDDL(2)); await sql(writer, 'UPDATE ' + relation() + ' SET value=2 WHERE id=1');
    await begin(readerA); const attempt = startAcquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL);
    const blocked = await waiting(readerA, 'ShareLock', [writer], attempt);
    await sql(writer, 'ROLLBACK'); await finishAcquire(readerA, attempt);
    const fresh = await observation(readerA); expect(fresh.result).toEqual([{ value: 1 }]); expect(fresh.rows).toEqual([{ id: 1, value: 1 }]);
    expect(fresh.tuple.definition).toBe(originalCatalog.functions[0].definition);
    record({ caseId: 'CF05', blocked, fresh, release: 'ROLLBACK' }); await sql(readerA, 'COMMIT'); expect(await catalog()).toEqual(originalCatalog);
  });

  it('CF06 distinguishes a failed subtransaction retaining its parent hold from top-level abort releasing transaction locks', async () => {
    await begin(readerA); await acquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL); await sql(readerA, 'SAVEPOINT owned_error');
    await begin(writer); const saved = startAcquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    await waiting(writer, 'ExclusiveLock', [readerA], saved);
    expect(await rejected(readerA, 'SELECT 1/0')).toBe('22012'); await failedBlock(readerA);
    expect(await rejected(readerA, 'SELECT ' + signature())).toBe('25P02');
    const parentStillHeld = await waiting(writer, 'ExclusiveLock', [readerA], saved);
    await sql(readerA, 'ROLLBACK TO SAVEPOINT owned_error', [], 'ABORTED'); expect(readerA.getTransactionStatus()).toBe('T');
    expect(await locks()).toContainEqual(lockFor(readerA, 'ShareLock', true));
    await sql(readerA, 'ROLLBACK'); await finishAcquire(writer, saved); await sql(writer, 'ROLLBACK');
    await begin(readerA); await acquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL); await begin(writer);
    const top = startAcquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL); await waiting(writer, 'ExclusiveLock', [readerA], top);
    expect(await rejected(readerA, 'SELECT 1/0')).toBe('22012'); await failedBlock(readerA);
    expect(await rejected(readerA, 'SELECT ' + signature())).toBe('25P02');
    await finishAcquire(writer, top); const afterAbort = await locks(); expect(afterAbort).toEqual([lockFor(writer, 'ExclusiveLock', true)]);
    record({ caseId: 'CF06', parentStillHeld, topLevelFailedBlockStatus: readerA.getTransactionStatus(), afterAbort,
      subtransactionHelperSQLstate: '25P02', topLevelHelperSQLstate: '25P02', claim: 'FAILED_BLOCK_E_DOES_NOT_PROVE_A_NATIVE_TRANSACTION_LOCK_STILL_HELD' });
    await sql(readerA, 'ROLLBACK', [], 'ABORTED'); await sql(writer, 'ROLLBACK');
  });

  it('CF07 exposes autocommit insufficiency rather than claiming the following operation is fenced', async () => {
    for (const plan of [RUNTIME_CATALOG_SHARED_FENCE_SQL, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL]) {
      expect(readerA.getTransactionStatus()).toBe('I');
      await sql(readerA, plan.text, [...plan.values], 'ACQUIRE'); expect(readerA.getTransactionStatus()).toBe('I'); expect(await locks()).toEqual([]);
      await begin(writer); await acquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
      expect(await locks()).toEqual([lockFor(writer, 'ExclusiveLock', true)]);
      record({ caseId: 'CF07', autocommitPlan: plan.mode, followingRuntimeHoldAbsent: true, exclusivePeer: await locks(),
        claim: 'AUTOCOMMIT_CALL_CANNOT_FENCE_A_SUBSEQUENT_HELPER_OPERATION' }); await sql(writer, 'ROLLBACK');
    }
  });

  it('CF08 retains exclusive blocking until both native shared holders finish', async () => {
    await begin(readerA); await begin(readerB); await acquire(readerA, RUNTIME_CATALOG_SHARED_FENCE_SQL); await acquire(readerB, RUNTIME_CATALOG_SHARED_FENCE_SQL);
    await begin(writer); const attempt = startAcquire(writer, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
    const both = await waiting(writer, 'ExclusiveLock', [readerA, readerB], attempt);
    await sql(readerA, 'COMMIT'); const remaining = await waiting(writer, 'ExclusiveLock', [readerB], attempt);
    expect(remaining.locks).not.toContainEqual(lockFor(readerA, 'ShareLock', true));
    const final = await observation(readerB); await sql(readerB, 'ROLLBACK'); await finishAcquire(writer, attempt);
    record({ caseId: 'CF08', both, remaining, final, granted: await locks(), firstRelease: 'COMMIT', finalRelease: 'ROLLBACK' });
    expect(await locks()).toEqual([lockFor(writer, 'ExclusiveLock', true)]); await sql(writer, 'COMMIT');
  });

  afterEach(async () => {
    if (verified) { await releaseOwnTransactions(); expect(await locks()).toEqual([]); }
  }, 20000);
  afterAll(async () => {
    let cleaned = false;
    try {
      if (verified) {
        await releaseOwnTransactions(); expect(await locks()).toEqual([]);
        if (fixtureCommitted && helper && table) {
          await restoreOriginal(); const finalCatalog = await catalog(); expect(finalCatalog).toEqual(originalCatalog);
          record({ operation: 'FINAL_NATIVE_SOURCE_BEFORE_EXACT_DROP', originalCatalog, finalCatalog,
            rows: (await sql(control, 'SELECT id,value FROM ' + relation())).rows });
          await begin(control); await acquire(control, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL);
          for (const object of [...objects].reverse()) {
            const native = object.kind === 'table'
              ? (await sql(control, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [object.target])).rows
              : (await sql(control, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [object.target])).rows;
            expect(native).toEqual([{ oid: object.oid, owner: object.owner }]); expect(object.owner).toBe(installerOid);
            await sql(control, 'DROP ' + object.kind.toUpperCase() + ' ' + object.target);
            const absence = object.kind === 'table'
              ? (await sql(control, 'SELECT oid FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows
              : (await sql(control, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows;
            expect(absence).toEqual([]); object.dropped = true; record({ operation: 'EXACT_OWN_OBJECT_DROPPED', ...object });
          }
          await sql(control, 'COMMIT'); expect(await catalog()).toEqual({ relations: [], columns: [], constraints: [], functions: [] }); cleaned = true;
        } else if (!fixtureCommitted) {
          for (const object of objects) {
            const absence = object.kind === 'table'
              ? (await sql(control, 'SELECT oid FROM pg_catalog.pg_class WHERE oid=$1::oid OR oid=pg_catalog.to_regclass($2)', [object.oid, object.target])).rows
              : (await sql(control, 'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid OR oid=pg_catalog.to_regprocedure($2)', [object.oid, object.target])).rows;
            expect(absence).toEqual([]); object.dropped = true;
            record({ operation: 'EXACT_OWN_SETUP_ROLLBACK_ABSENCE', ...object });
          }
          expect(await catalog()).toEqual({ relations: [], columns: [], constraints: [], functions: [] }); cleaned = true;
        }
      }
    } finally {
      for (const client of clients) {
        try { await client.end(); closed.add(client); } catch { record({ operation: 'OWN_CLIENT_CLOSE_UNCONFIRMED', backend: pids.get(client) }); }
      }
      password = '';
      if (runVerified) writeFileSync(join(runPath!, 'catalog-fence-cleanup.json'), JSON.stringify({ verified, fixtureCommitted, cleaned, objects,
        originalCatalog, records, clients: clients.size, closedClients: closed.size, pending: pending.size, actualSQLStatements: sqlCount,
        producerClaim: 'PREPARED_TEST_NOT_NATIVE_EXECUTION', scope: 'ONE_ROOT_BASE_NO_CHILD_DB_ROLE_GRANT_CHANGE_DATABASE_DROP_CLUSTER_CONTROL',
        claim: 'NATIVE_LOCK_PROTOCOL_ONLY_NOT_RUNTIME_INSTALLER_AUTHORITY_BUSINESS_HELPERS_RLS_FULL_F10_NEON_OR_EXTERNAL_REVIEW' }, null, 2), { flag: 'wx', mode: 0o600 });
    }
  }, 30000);
});
