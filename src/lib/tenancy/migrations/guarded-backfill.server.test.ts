import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { readFileSync, writeFileSync, realpathSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { executeGuardedLocalBackfill, ownedLocalBackfillFenceBinding, type GuardedBackfillRequest } from './guarded-backfill.server';
import { captureTenantMigrationFacts, observeMigrationCatalog } from './capture.server';
import { getOwnershipRegistry, OWNERSHIP_SOURCE, ownershipDigest, canonicalOwnershipJson, type JsonValue } from './ownership';
import { preflightTenantBackfill, type BackfillCapture, type LeafBinding } from './backfill';

const disconnected = () => new Client({ host: '127.0.0.1', port: 1, user: 'fictional-unconnected', database: 'fictional-unconnected', password: 'fictional-unused' });

describe('owned local guarded backfill request boundary', () => {
  it('denies non-local mode before any client or resource access', async () => {
    const client = disconnected(); const query = vi.spyOn(client, 'query');
    expect(await executeGuardedLocalBackfill(client, { mode: 'PRODUCTION' })).toEqual({ status: 'BLOCKED', code: 'OWNED_LOCAL_MODE_REQUIRED' });
    expect(query).not.toHaveBeenCalled();
  });
  it('refuses an ambient caller transaction without rolling it back', async () => {
    const client = disconnected(); const query = vi.spyOn(client, 'query');
    vi.spyOn(client, 'getTransactionStatus').mockReturnValue('T');
    expect(await executeGuardedLocalBackfill(client, { mode: 'OWNED_LOCAL' })).toEqual({ status: 'BLOCKED', code: 'CLIENT_NOT_IDLE' });
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects an accessor envelope without invoking it or returning its error', async () => {
    const client = disconnected(); const query = vi.spyOn(client, 'query'); let invoked = 0;
    const request = Object.defineProperty({}, 'mode', { enumerable: true, get() { invoked++; throw new Error('PRIVATE_PAYLOAD'); } });
    expect(await executeGuardedLocalBackfill(client, request)).toEqual({ status: 'BLOCKED', code: 'UNSUPPORTED_REQUEST' });
    expect(invoked).toBe(0); expect(query).not.toHaveBeenCalled();
  });
});

// Explicit opt-in only. This suite does not start a cluster, discover a database,
// or read application credentials. Each case creates/drops its own marked DB on
// the exact newly owned loopback lease supplied by the one-shot manual fixture.
const leasePath = process.env.F_BACKFILL_OWNED_LEASE;
describe.skipIf(!leasePath)('owned PostgreSQL whole-plan guarded backfill', () => {
  type Lease = { root: string; data: string; port: number; pid: number; pidStart: string; systemIdentifier: string; database: string; databaseOid: string;
    marker: string; closed: false; scope: string; authorizationReference: string; user: string; credentialFile: string;
    operatorRoles: { name: string; catalog: string[] }[] };
  type Fixture = { client: Client; second: Client; observer: Client; request: GuardedBackfillRequest; name: string; oid: string; marker: string; original: unknown; queries: string[] };
  let lease: Lease, admin: Client;
  const run = process.env.F_BACKFILL_RUN_DIR!;
  const registry = getOwnershipRegistry(), q = (v: string) => '"' + v.replace(/"/g, '""') + '"';
  const clients = new Set<Client>(), databases: { name: string; oid: string; marker: string }[] = [];
  const records: unknown[] = [];
  const password = () => readFileSync(lease.credentialFile, 'utf8');
  async function connect(database: string, user = lease.user) {
    const c = new Client({ host: '127.0.0.1', port: lease.port, database, user, password: password(), connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.add(c); await c.connect(); await c.query('SET search_path=pg_catalog'); return c;
  }
  async function originals(c: Client) {
    const rows: Record<string, unknown> = {};
    for (const t of registry.tables) rows[t.table] = (await c.query('SELECT to_jsonb(s)::text row FROM (SELECT ' + t.columns.map(col => q(col.name)).join(',') + ' FROM public.' + q(t.table) + ') s ORDER BY to_jsonb(s)::text COLLATE "C"')).rows;
    return rows;
  }
  function leaves(value: JsonValue, path: string[] = []): LeafBinding[] {
    if (value !== null && typeof value === 'object' && Object.keys(value).length) return Object.keys(value).flatMap(k => leaves((value as Record<string, JsonValue>)[k], [...path, k]));
    return [{ path, kind: 'DATA' }]; // Closed fictional defaults contain no identity leaves.
  }
  async function fixture(): Promise<Fixture> {
    const name = lease.database + '_case_' + randomBytes(5).toString('hex'), marker = lease.marker + ':case:' + name;
    expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount).toBe(0);
    appendFileSync(join(run, 'case-custody.jsonl'), JSON.stringify({ name, marker, stage: 'BEFORE_OWN_CREATE' }) + '\n', { mode: 0o600 });
    await admin.query('CREATE DATABASE ' + q(name));
    const oid = (await admin.query('SELECT oid::text oid FROM pg_database WHERE datname=$1', [name])).rows[0].oid;
    databases.push({ name, oid, marker }); await admin.query('COMMENT ON DATABASE ' + q(name) + " IS '" + marker + "'");
    appendFileSync(join(run, 'case-custody.jsonl'), JSON.stringify({ name, oid, marker, stage: 'OWN_OID_MARKED' }) + '\n');
    const observer = await connect(name), migrations = OWNERSHIP_SOURCE.map(s => ({ path: s.path, text: readFileSync(resolve(s.path), 'utf8') }));
    await observer.query('SET search_path=public');
    for (const m of migrations) await observer.query(m.text);
    await observer.query("INSERT INTO public.employees(id,first_name,last_name,phone,role,primary_location_id,active,email,created_at) VALUES(' fixture-owner ','Fictional','Owner','000','OWNER','loc-1',false,'Fixture@Example.invalid','2026-10-09 01:02:03.123456+00'),('fixture-empty','Fictional','Empty','000','EMPLOYEE','loc-1',false,'','2026-10-09 01:02:03.000001+00'),('fixture-null','Fictional','Null','000','EMPLOYEE','loc-1',false,NULL,'2026-10-09 01:02:03.000002+00')");
    await observer.query("INSERT INTO public.employee_scheduling_settings(employee_id,maximum_weekly_hours) VALUES(' fixture-owner ',39.10)");
    await observer.query("INSERT INTO public.clocker_pin_events(id,employee_id,actor_employee_id,pin_version) VALUES('fixture-pin',' fixture-owner ',' fixture-owner ',1)");
    await observer.query("INSERT INTO public.schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('fixture-revision','2026-10-05',1,'MANAGER_MUTATION',NULL,' fixture-owner ')");
    await observer.query("INSERT INTO public.schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES('fixture-history','fixture-revision','deleted-source','deleted-schedule','retired-location','retired-employee','2026-10-06','08:00:00.123456','09:00:00.123456','Historical literal Ω')");
    await observer.query("INSERT INTO public.password_recovery_limits(scope,bucket,attempts) VALUES('global',9223372036854775807,7)");
    await observer.query(readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8'));
    // Separate narrowly granted migration operator: no ownership, superuser,
    // role creation, replication, RLS bypass or trigger/DDL privilege.
    const roles = lease.operatorRoles.map(r => q(r.name)).join(',');
    await observer.query('GRANT USAGE ON SCHEMA public,nevora_tenancy TO ' + roles);
    await observer.query('GRANT SELECT,UPDATE ON ' + registry.tables.map(t => 'public.' + q(t.table)).join(',') + ' TO ' + roles);
    await observer.query('GRANT SELECT,INSERT,UPDATE ON public.clocker_pin_events_tenant_ownership,public.schedule_publication_revision_shifts_tenant_ownership TO ' + roles);
    await observer.query('GRANT SELECT,UPDATE ON nevora_tenancy.expansion_protocol TO ' + roles);
    await observer.query('GRANT SELECT ON nevora_tenancy.source_migration_contract,nevora_tenancy.owned_table_contract TO ' + roles);
    await observer.query('SET search_path=pg_catalog');
    const client = await connect(name, lease.operatorRoles[0].name), second = await connect(name, lease.operatorRoles[1].name);
    const privileges = (await client.query("SELECT has_schema_privilege(session_user,'public','CREATE') public_create,has_schema_privilege(session_user,'nevora_tenancy','CREATE') tenancy_create,has_table_privilege(session_user,'public.employees','TRIGGER') trigger_privilege,(SELECT relowner<>(SELECT oid FROM pg_roles WHERE rolname=session_user) FROM pg_class WHERE oid='public.employees'::regclass) nonowner")).rows[0];
    expect(privileges).toEqual({ public_create: false, tenancy_create: false, trigger_privilege: false, nonowner: true });
    records.push({ database: name, actualOperatorPrivileges: privileges });
    const source = JSON.parse(readFileSync(join(run, 'pre-invocation-source.json'), 'utf8'));
    const observed = await observeMigrationCatalog(client);
    const identity = { database: name, databaseOid: oid, marker, systemIdentifier: lease.systemIdentifier, dataDirectory: lease.data, role: lease.operatorRoles[0].name, port: lease.port,
      clusterRoot: lease.root, leasePath: leasePath!, postmasterPid: lease.pid, postmasterStart: lease.pidStart, roleOid: lease.operatorRoles[0].catalog[0] };
    const captured = await captureTenantMigrationFacts(client, { identity, migrations, sourceDigest: source.sourceDigest,
      catalogBaseline: { sourceDigest: source.sourceDigest, expansionSha256: 'fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb', registryDigest: registry.digest, catalogDigest: observed.digest }, expectedFenceGeneration: '0' });
    expect(captured.status, JSON.stringify(captured)).toBe('CAPTURED');
    if (captured.status !== 'CAPTURED') throw new Error('Owned facts required');
    const facts = captured.facts, workspaceId = 'workspace-fuel'; // Explicit fixture provenance, never executor fallback.
    const evidence = ownershipDigest({ fixture: name, workspaceId, capturedFacts: facts.factsDigest });
    const backfill: BackfillCapture = { migrations, registryDigest: facts.registryDigest, sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest,
      snapshot: facts.snapshot, tables: facts.tables, namespaceComparators: facts.namespaceComparators, mappings: [], historicalReferences: [], payloadCaptures: [], chunkSize: 2,
      installation: { workspaceId, evidenceDigest: evidence, coveredRows: [] },
      // The last field binds absence of changed source rows in this whole-plan
      // fixture. It is NOT evidence that a durable chunk journal exists.
      writeFence: { mode: 'EXCLUSIVE_FENCED', sourceDigest: facts.sourceDigest, schemaDigest: facts.currentSchemaDigest, databaseFenceToken: ownedLocalBackfillFenceBinding(identity, facts),
        allWritersCovered: true, immutableOwnershipEnabled: true, registeredWriterDigest: ownershipDigest(facts.catalog), newWriteJournalDigest: ownershipDigest({ mode: 'WHOLE_PLAN_NO_CHUNK_JOURNAL', factsDigest: facts.factsDigest }), newWritesReconciled: true } };
    for (const table of registry.tables) for (const row of facts.tables.find(t => t.table === table.table)!.rows) {
      const key = table.primaryKey.map(k => row.values[k]);
      if (table.anchor.kind === 'CAPTURED_IMMUTABLE') backfill.mappings.push({ table: table.table, key, workspaceId, rowChecksum: row.originalChecksum, evidenceDigest: evidence });
      if (table.anchor.kind === 'INSTALLATION_PROVENANCE') backfill.installation!.coveredRows.push({ table: table.table, key, rowChecksum: row.originalChecksum });
      for (const p of table.payloads) if (row.values[p.column] !== null) backfill.payloadCaptures.push({ table: table.table, key, column: p.column, contractId: p.contractId,
        valueDigest: ownershipDigest(row.values[p.column]), bindings: leaves(row.values[p.column]), unresolvedPaths: [], reviewEvidenceDigest: evidence });
      if (table.table === 'schedule_publication_revision_shifts') for (const [target, field] of [['shifts', 'source_shift_id'], ['schedules', 'schedule_id'], ['locations', 'location_id'], ['employees', 'employee_id']])
        backfill.historicalReferences.push({ target, targetColumns: ['id'], key: [row.values[field]], workspaceId, evidenceDigest: evidence, sourceRowChecksum: row.originalChecksum });
    }
    const plan = preflightTenantBackfill(backfill);
    expect(plan.status, JSON.stringify(plan.diagnostics)).toBe('READY_FOR_GUARDED_EXECUTION');
    const request: GuardedBackfillRequest = { mode: 'OWNED_LOCAL', identity, facts, backfill, authority: { reference: lease.authorizationReference, operatorRole: identity.role, factsDigest: facts.factsDigest, planDigest: plan.digest } };
    const queries: string[] = [], originalQuery = client.query.bind(client);
    vi.spyOn(client, 'query').mockImplementation(((...args: unknown[]) => { queries.push(typeof args[0] === 'string' ? args[0] : (args[0] as { text: string }).text); return Reflect.apply(originalQuery, client, args); }) as typeof client.query);
    const original = await originals(observer);
    records.push({ database: name, oid, marker, factsDigest: facts.factsDigest, planDigest: plan.digest, originalDigest: ownershipDigest(original), schemaDigest: facts.currentSchemaDigest, sourceRows: facts.tables.reduce((n, t) => n + t.expectedCount, 0) });
    return { client, second, observer, request, name, oid, marker, original, queries };
  }
  async function metadata(f: Fixture) { return (await f.observer.query("SELECT phase,fence_generation::text generation,backfill_actor::text actor,capture_manifest_sha256 manifest FROM nevora_tenancy.expansion_protocol")).rows[0]; }
  async function expectUnapplied(f: Fixture) {
    expect(await originals(f.observer)).toEqual(f.original);
    expect(await metadata(f)).toEqual({ phase: 'FENCED', generation: f.request.facts.fence.generation, actor: null, manifest: null });
    for (const t of registry.tables) if (t.storage === 'DIRECT_IMMUTABLE' && t.anchor.kind !== 'ROOT' && !t.columns.some(c => c.name === 'workspace_id'))
      expect((await f.observer.query('SELECT count(*)::int n FROM public.' + q(t.table) + ' WHERE workspace_id IS NOT NULL')).rows[0].n).toBe(0);
    for (const t of registry.tables.filter(t => t.sidecar)) expect((await f.observer.query('SELECT count(*)::int n FROM public.' + q(t.sidecar!))).rows[0].n).toBe(0);
  }
  beforeAll(async () => {
    // Never include a forbidden ambient credential in an assertion diff.
    expect(process.env.DATABASE_URL === undefined).toBe(true); expect(process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true); expect(run).toBeTruthy();
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')); expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(realpathSync(lease.data)).toBe(join(realpathSync(lease.root), 'data'));
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    admin = await connect(lease.database);
    const identity = (await admin.query("SELECT current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_id,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
    expect(identity).toEqual({ data: lease.data, system_id: lease.systemIdentifier, oid: lease.databaseOid, marker: lease.marker });
  });
  afterAll(async () => {
    // All these connections were freshly created by this test invocation. Only
    // fixture-owned failed setup/test transactions are rolled back on teardown.
    for (const c of clients) { if (c === admin) continue; if (['T', 'E'].includes(c.getTransactionStatus() ?? '')) await c.query('ROLLBACK'); await c.end(); }
    for (const d of databases) {
      expect((await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1", [d.name])).rows[0]).toEqual({ oid: d.oid, marker: d.marker });
      await admin.query('DROP DATABASE ' + q(d.name));
    }
    if (admin) await admin.end();
    writeFileSync(join(run, 'database-custody.json'), JSON.stringify({ records, databases: databases.map(d => ({ ...d, createdByThisInvocation: true, closed: true })), allClientsClosed: true }, null, 2), { flag: 'wx' });
  });
  it('attributes only new direct metadata and exact typed history, preserving all original rows; identical retry is a no-op', async () => {
    const f = await fixture(), outcome = await executeGuardedLocalBackfill(f.client, f.request);
    expect(outcome, JSON.stringify(outcome)).toMatchObject({ status: 'APPLIED', mode: 'WHOLE_PLAN_ATOMIC', planDigest: f.request.authority.planDigest });
    expect(await originals(f.observer)).toEqual(f.original);
    expect(await metadata(f)).toMatchObject({ actor: null, manifest: f.request.authority.planDigest });
    expect((await f.observer.query('SELECT workspace_id,employee_id,actor_employee_id,capture_manifest_sha256 FROM public.clocker_pin_events_tenant_ownership')).rows).toEqual([{ workspace_id: 'workspace-fuel', employee_id: ' fixture-owner ', actor_employee_id: ' fixture-owner ', capture_manifest_sha256: f.request.authority.planDigest }]);
    expect((await f.observer.query('SELECT source_shift_id,employee_id,location_id FROM public.schedule_publication_revision_shifts_tenant_ownership')).rows).toEqual([{ source_shift_id: 'deleted-source', employee_id: 'retired-employee', location_id: 'retired-location' }]);
    const boundary = f.queries.length;
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toMatchObject({ status: 'UNCHANGED', planDigest: f.request.authority.planDigest });
    expect(f.queries.slice(boundary).some(s => /^(INSERT|UPDATE)/.test(s))).toBe(false);
    const lock = f.queries.findIndex(s => /^LOCK TABLE/.test(s)), protocol = f.queries.findIndex(s => /FOR UPDATE$/.test(s));
    expect(lock).toBeGreaterThan(-1); expect(lock).toBeLessThan(protocol); expect(f.queries[lock]).toContain('SHARE ROW EXCLUSIVE MODE');
  }, 30000);
  it('rolls back every attribution and operator binding after an actual mid-plan SQL failure', async () => {
    const f = await fixture(), original = Client.prototype.query.bind(f.client); let inserted = false;
    const spy = vi.spyOn(f.client, 'query').mockImplementation(((...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) { inserted = true; return original('SELECT 1/0'); }
      return Reflect.apply(original, f.client, args);
    }) as typeof f.client.query);
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'GUARDED_BACKFILL_FAILED' });
    expect(inserted).toBe(true); spy.mockRestore(); await expectUnapplied(f);
  }, 30000);
  it('refuses a caller transaction without issuing a query or rolling it back', async () => {
    const f = await fixture(); await f.client.query('BEGIN'); const before = f.queries.length;
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'CLIENT_NOT_IDLE' });
    expect(f.queries).toHaveLength(before); expect(f.client.getTransactionStatus()).toBe('T'); await f.client.query('ROLLBACK'); await expectUnapplied(f);
  }, 30000);
  it('denies changed capture payload and changed mapping without attribution', async () => {
    const f = await fixture(), changed = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest;
    changed.backfill.tables[0].expectedCount++;
    expect(await executeGuardedLocalBackfill(f.client, changed)).toEqual({ status: 'BLOCKED', code: 'CAPTURE_BINDING_DRIFT' });
    const changedOwner = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest; changedOwner.backfill.mappings[0].workspaceId = 'unproved-workspace';
    expect(await executeGuardedLocalBackfill(f.client, changedOwner)).toEqual({ status: 'BLOCKED', code: 'PREFLIGHT_BLOCKED' }); await expectUnapplied(f);
  }, 30000);
  it('denies database/PID/system identity and unapproved operator bindings before beginning', async () => {
    const f = await fixture();
    for (const field of ['postmasterPid', 'systemIdentifier', 'databaseOid', 'roleOid'] as const) {
      const changed = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest;
      if (field === 'postmasterPid') changed.identity[field]++; else changed.identity[field] += '1';
      expect((await executeGuardedLocalBackfill(f.client, changed)).status).toBe('BLOCKED');
    }
    const changed = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest; changed.authority.reference = 'foreign-custody';
    expect(await executeGuardedLocalBackfill(f.client, changed)).toEqual({ status: 'BLOCKED', code: 'OWNED_LOCAL_IDENTITY_DRIFT' }); await expectUnapplied(f);
  }, 30000);
  it('denies actual source row drift with an unchanged protocol generation', async () => {
    const f = await fixture();
    await f.observer.query("SET search_path=pg_catalog,public; UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'; UPDATE public.employees SET first_name='Changed fictional source' WHERE id=' fixture-owner '; UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'; SET search_path=pg_catalog");
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_SOURCE_DRIFT' });
    expect(await metadata(f)).toMatchObject({ actor: null, manifest: null }); expect((await f.observer.query('SELECT workspace_id FROM public.employees WHERE id=$1', [' fixture-owner '])).rows[0].workspace_id).toBeNull();
  }, 30000);
  it('denies catalog and fence generation changes before attribution', async () => {
    const f = await fixture(); await f.observer.query('CREATE INDEX fixture_catalog_drift ON public.employees(first_name)');
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_CATALOG_DRIFT' });
    await f.observer.query('DROP INDEX public.fixture_catalog_drift'); await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET fence_generation=fence_generation+1');
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'FENCE_PROTOCOL_DRIFT' });
    expect(await originals(f.observer)).toEqual(f.original);
  }, 30000);
  it('does not claim rollback after COMMIT outcome uncertainty; a fresh client reconciles the exact original plan', async () => {
    const f = await fixture(), original = Client.prototype.query.bind(f.client);
    const spy = vi.spyOn(f.client, 'query').mockImplementation((async (...args: unknown[]) => {
      f.queries.push(typeof args[0] === 'string' ? args[0] : (args[0] as { text: string }).text);
      const result = await Reflect.apply(original, f.client, args);
      if (args[0] === 'COMMIT') throw new Error('Fictional lost acknowledgement with PRIVATE_PAYLOAD'); return result;
    }) as typeof f.client.query);
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'UNCERTAIN', code: 'COMMIT_OUTCOME_UNKNOWN', planDigest: f.request.authority.planDigest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    expect(f.queries.filter(s => s === 'ROLLBACK')).toHaveLength(0); spy.mockRestore();
    const fresh = await connect(f.name, lease.operatorRoles[0].name);
    expect(await executeGuardedLocalBackfill(fresh, f.request)).toMatchObject({ status: 'UNCHANGED' }); expect(await originals(f.observer)).toEqual(f.original);
  }, 30000);
  it('serializes competing operators so they cannot both arm or attribute the same plan', async () => {
    const f = await fixture(), second = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest;
    second.identity.role = lease.operatorRoles[1].name; second.identity.roleOid = lease.operatorRoles[1].catalog[0]; second.authority.operatorRole = second.identity.role;
    const outcomes = await Promise.all([executeGuardedLocalBackfill(f.client, f.request), executeGuardedLocalBackfill(f.second, second)]);
    expect(outcomes.filter(o => o.status === 'APPLIED')).toHaveLength(1);
    expect(outcomes.filter(o => o.status === 'UNCHANGED' || o.status === 'BLOCKED')).toHaveLength(1);
    expect(await originals(f.observer)).toEqual(f.original); expect(await metadata(f)).toMatchObject({ actor: null, manifest: f.request.authority.planDigest });
  }, 30000);
  it('rejects a nonlocal configured client before issuing even identity SQL', async () => {
    const f = await fixture(), host = f.client.host, before = f.queries.length;
    try { f.client.host = 'fictional.remote.invalid';
      expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'CLIENT_CONNECTION_NOT_OWNED' });
      expect(f.queries).toHaveLength(before);
    } finally { f.client.host = host; }
    await expectUnapplied(f);
  }, 30000);
  it('rejects an in-flight query even when the last transaction status is idle', async () => {
    const f = await fixture(), pending = f.client.query('SELECT pg_sleep(0.05)'), before = f.queries.length;
    try { expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'CLIENT_NOT_IDLE' }); expect(f.queries).toHaveLength(before); }
    finally { await pending; }
    await expectUnapplied(f);
  }, 30000);
  it('rejects changed operator memberships despite unchanged source catalog and role flags', async () => {
    const f = await fixture(), operator = q(f.request.identity.role);
    await admin.query('GRANT pg_write_all_data TO ' + operator + ' WITH INHERIT TRUE');
    try { expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'OPERATOR_ROLE_DRIFT' }); }
    finally { await admin.query('REVOKE pg_write_all_data FROM ' + operator); }
    await expectUnapplied(f);
  }, 30000);
  it('rejects recomputed but fabricated SQL comparator witnesses against actual current database results', async () => {
    const outcomes = [];
    for (const field of ['expressionValue', 'serverVersion', 'serverEncoding']) {
      const f = await fixture(), changed = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest, ns = changed.facts.namespaceComparators;
      if (field === 'expressionValue') ns.rows.find(r => r.contractId === 'employees.email_ci' && r.key[0] === ' fixture-owner ')!.expressionValue = 'fabricated@example.invalid';
      else {
        const c = ns.catalogs[0];
        if (field === 'serverVersion') c.definition.serverVersion = '18.4 fictional-other-build'; else c.definition.serverEncoding = 'LATIN1';
        const { checksum: _checksum, ...value } = c; void _checksum; c.checksum = ownershipDigest(value);
      }
      ns.captureChecksum = ownershipDigest({ binding: ns.binding, catalogs: ns.catalogs, rows: ns.rows });
      const { factsDigest: _old, ...facts } = changed.facts; void _old; changed.facts.factsDigest = ownershipDigest(facts);
      changed.backfill.namespaceComparators = ns; changed.backfill.writeFence.databaseFenceToken = ownedLocalBackfillFenceBinding(changed.identity, changed.facts);
      changed.authority.factsDigest = changed.facts.factsDigest; changed.authority.planDigest = preflightTenantBackfill(changed.backfill).digest;
      const outcome = await executeGuardedLocalBackfill(f.client, changed);
      outcomes.push({ field, outcome }); records.push({ field, forgedWitnessOutcome: outcome });
      if (outcome.status === 'BLOCKED') await expectUnapplied(f);
    }
    expect(outcomes, JSON.stringify(outcomes)).toEqual([
      { field: 'expressionValue', outcome: { status: 'BLOCKED', code: 'CURRENT_COMPARATOR_ROW_DRIFT' } },
      { field: 'serverVersion', outcome: { status: 'BLOCKED', code: 'CURRENT_COMPARATOR_CATALOG_DRIFT' } },
      { field: 'serverEncoding', outcome: { status: 'BLOCKED', code: 'CURRENT_COMPARATOR_CATALOG_DRIFT' } },
    ]);
  }, 30000);
  it('refuses partial committed metadata and does not fabricate chunk resume', async () => {
    const f = await fixture();
    await f.observer.query('BEGIN'); await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user,capture_manifest_sha256=$1", [f.request.authority.planDigest]);
    await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET workspace_id='workspace-fuel' WHERE id=' fixture-owner '");
    await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL'); await f.observer.query('COMMIT');
    const before = await metadata(f);
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'DIRECT_OWNERSHIP_STATE_DRIFT' });
    expect(await metadata(f)).toEqual(before); expect(await originals(f.observer)).toEqual(f.original);
    expect((await f.observer.query('SELECT count(*)::int n FROM public.clocker_pin_events_tenant_ownership')).rows[0].n).toBe(0);
  }, 30000);
  it('denies changed plan, catalog and generation on a previously applied retry', async () => {
    const f = await fixture(); expect((await executeGuardedLocalBackfill(f.client, f.request)).status).toBe('APPLIED');
    const changed = JSON.parse(JSON.stringify(f.request)) as GuardedBackfillRequest; changed.backfill.chunkSize++;
    changed.authority.planDigest = preflightTenantBackfill(changed.backfill).digest;
    expect(await executeGuardedLocalBackfill(f.client, changed)).toEqual({ status: 'BLOCKED', code: 'FENCE_PROTOCOL_DRIFT' });
    await f.observer.query('CREATE INDEX fixture_retry_catalog ON public.employees(first_name)');
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_CATALOG_DRIFT' });
    await f.observer.query('DROP INDEX public.fixture_retry_catalog'); await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET fence_generation=fence_generation+1');
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'FENCE_PROTOCOL_DRIFT' }); expect(await originals(f.observer)).toEqual(f.original);
  }, 30000);
  it('cleans only its own attempted BEGIN when an acknowledgement is lost before attribution', async () => {
    const f = await fixture(), original = Client.prototype.query.bind(f.client), commands: string[] = [];
    const spy = vi.spyOn(f.client, 'query').mockImplementation((async (...args: unknown[]) => {
      const text = typeof args[0] === 'string' ? args[0] : (args[0] as { text: string }).text; commands.push(text);
      const result = await Reflect.apply(original, f.client, args);
      if (text === 'BEGIN ISOLATION LEVEL SERIALIZABLE') throw new Error('Fictional BEGIN acknowledgement loss'); return result;
    }) as typeof f.client.query);
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(s => s === 'ROLLBACK')).toHaveLength(1); expect(f.client.getTransactionStatus()).toBe('I'); spy.mockRestore(); await expectUnapplied(f);
  }, 30000);
  it('reports rollback uncertainty without claiming completion or exposing raw failure payloads', async () => {
    const f = await fixture(), original = Client.prototype.query.bind(f.client);
    const spy = vi.spyOn(f.client, 'query').mockImplementation(((...args: unknown[]) => {
      if (args[0] === 'ROLLBACK') return Promise.reject(new Error('PRIVATE_ROLLBACK_PAYLOAD'));
      if (typeof args[0] === 'string' && args[0].startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) return original('SELECT 1/0');
      return Reflect.apply(original, f.client, args);
    }) as typeof f.client.query);
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'UNCERTAIN', code: 'ROLLBACK_UNCONFIRMED', planDigest: f.request.authority.planDigest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    spy.mockRestore(); await f.client.query('ROLLBACK'); await expectUnapplied(f);
  }, 30000);
  it('detaches the supplied capture before awaits so a caller cannot rewrite a waiting request', async () => {
    const f = await fixture(), operation = executeGuardedLocalBackfill(f.client, f.request), expected = f.request.authority.planDigest;
    f.request.backfill.tables[0].expectedCount++; f.request.authority.planDigest = 'a'.repeat(64); f.request.facts.fence.generation = '999';
    expect(await operation).toMatchObject({ status: 'APPLIED', planDigest: expected }); expect(await originals(f.observer)).toEqual(f.original);
  }, 30000);
  it('blocks lossless JSON wire limitations before changing any metadata', async () => {
    const f = await fixture();
    await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'; UPDATE public.workspaces SET shift_change_policy='{\"unsupported\":9007199254740993}'::jsonb; UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'");
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toEqual({ status: 'BLOCKED', code: 'LOSSLESS_JSON_NUMBER_UNSUPPORTED' });
    expect(await metadata(f)).toMatchObject({ actor: null, manifest: null }); expect((await f.observer.query('SELECT count(*)::int n FROM public.employees WHERE workspace_id IS NOT NULL')).rows[0].n).toBe(0);
    expect((await f.observer.query('SELECT shift_change_policy::text raw FROM public.workspaces')).rows[0].raw).toContain('9007199254740993');
  }, 30000);
  it('validates the actual captured and atomically backfilled source without rewriting original history', async () => {
    const f = await fixture();
    expect(await executeGuardedLocalBackfill(f.client, f.request)).toMatchObject({ status: 'APPLIED', planDigest: f.request.authority.planDigest });
    expect(await originals(f.observer)).toEqual(f.original);
    await f.observer.query('SET search_path=pg_catalog,public');
    await f.observer.query(readFileSync(resolve('db/migrations/0027_tenant_ownership_validate.sql'), 'utf8'));
    const validation = (await f.observer.query('SELECT capture_manifest_sha256,scoped_references FROM nevora_tenancy.ownership_validation')).rows;
    expect(validation).toEqual([{ capture_manifest_sha256: f.request.authority.planDigest, scoped_references: 89 }]);
    const references = (await f.observer.query("SELECT count(*)::int n,bool_and(convalidated AND conenforced) valid FROM pg_constraint WHERE conname LIKE 'f10_scoped_%' AND contype='f'")).rows[0];
    expect(references).toEqual({ n: 89, valid: true });
    expect(await originals(f.observer)).toEqual(f.original);
    expect(await metadata(f)).toMatchObject({ actor: null, manifest: f.request.authority.planDigest });
    await expect(f.observer.query("UPDATE public.employees SET first_name='Forbidden after validation' WHERE id=' fixture-owner '")).rejects.toMatchObject({ code: '55000' });
    expect(await originals(f.observer)).toEqual(f.original);
    records.push({ actualCaptureBackfillValidation: { planDigest: f.request.authority.planDigest, references: references.n, originalRowsPreserved: true, fenceRetained: true } });
  }, 30000);

});
