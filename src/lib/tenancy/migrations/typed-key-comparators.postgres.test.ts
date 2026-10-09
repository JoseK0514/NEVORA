import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { captureTypedTenantMigrationFactsWithKeyComparators, observeMigrationCatalog, type MigrationCaptureRequest, type TypedMigrationCaptureFacts } from './capture.server';
import { canonicalOwnershipJson, getOwnershipRegistry, ownershipDigest, OWNERSHIP_SOURCE, verifyOwnershipSource, type JsonValue } from './ownership';
import { inspectTypedMigrationSnapshot, isIssuedInspectedTypedSnapshot, type InspectedTypedSnapshot, type InspectedTypedSnapshotRow } from './typed-snapshot';

import { getTypedKeyComparatorContracts, getTypedKeyComparatorStockDescriptors, isIssuedTypedKeyComparatorObservations, validateTypedKeyComparators, type TypedKeyComparatorCapture, type TypedKeyComparatorContract } from './typed-key-comparators';

// Root alone starts/stops the fictional cluster and invokes this opt-in suite.
// No ambient application URL, cluster startup, foreign DB, role installation or
// F10/RLS/cutover claim. The original singleton guard remains untouched; actual
// two-tenant/current physical/array cross-owner coverage is OPEN post-cutover.
const leasePath = process.env.F_CAPTURE_OWNED_LEASE;
const registry = getOwnershipRegistry();
const ownedEmployee = ' typed-employee-a ';
const otherEmployee = 'typed-employee-b';
const subscriptionId = '00000000-0000-4000-8000-000000000071';
const operationId = '00000000-0000-4000-8000-000000000073';
const historyId = 'typed-history';
const contracts = getTypedKeyComparatorContracts();
const detachedPushId = 'fictional-detached-key-comparator-push';
const same = (a: unknown, b: unknown) => canonicalOwnershipJson(a) === canonicalOwnershipJson(b);
const quoted = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";

describe.skipIf(!leasePath)('owned PostgreSQL18 complete typed key comparator observations', () => {
  type Lease = { closed: boolean; root: string; data: string; port: number; pid: number; pidStart: string; credentialFile: string; user: string;
    database: string; databaseOid: number; systemIdentifier: string; marker: string };
  let lease: Lease, runDirectory: string;
  let admin: Client | undefined, client: Client | undefined;
  let database: { name: string; oid: string; marker: string } | undefined;
  let request: MigrationCaptureRequest, facts: TypedMigrationCaptureFacts, snapshot: InspectedTypedSnapshot;
  let keyComparators: TypedKeyComparatorCapture;
  let firstCapture: TypedKeyComparatorCapture | undefined;
  let retainedChecksum: string;
  let currentCaseBinding: Record<string, string> = {};
  type SqlPair = { contractId: string; left: (string | null)[]; right: (string | null)[]; equal: boolean; less: boolean };
  let sqlPairs: SqlPair[] = [], referenceSnapshot: string | undefined;
  const closedReconciliationClients: string[] = [];
  let initialRows: Record<string, { columns: string[]; rows: (string | null)[][] }> | undefined;
  const caseReceipts: { id: string; name: string; status: 'PASS' | 'FAIL' }[] = [];
  const receipt = (name: string, value: unknown) => writeFileSync(join(runDirectory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const connect = (name: string) => new Client({ host: '127.0.0.1', port: lease.port, user: lease.user,
    password: readFileSync(lease.credentialFile, 'utf8'), database: name, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
  const sourceRow = (table: string, key: readonly JsonValue[]): InspectedTypedSnapshotRow => {
    const rows = snapshot.tables.find(t => t.table === table)?.rows.filter(r => same(r.key, key));
    if (rows?.length !== 1) throw Error('Exact named fictional source row required'); return rows[0];
  };
  async function originalRows(readClient = client) {
    if (!readClient) throw Error('Owned client unavailable');
    const rows: NonNullable<typeof initialRows> = {};
    for (const table of registry.tables) {
      // Native PostgreSQL text-wire parsers retain bpchar padding, timestamps,
      // JSON numeric spelling and array lower bounds; never to_jsonb/Number.
      const result = await readClient.query<(string | null)[]>({ text: 'SELECT ' + table.columns.map(c => quoted(c.name)).join(',') + ' FROM public.' + quoted(table.table),
        rowMode: 'array', types: { getTypeParser: () => (value: string) => value } });
      rows[table.table] = { columns: table.columns.map(c => c.name), rows: result.rows.sort((a, b) => {
        const x = canonicalOwnershipJson(a), y = canonicalOwnershipJson(b); return x < y ? -1 : x > y ? 1 : 0;
      }) };
    }
    return rows;
  }
  async function unarmedFence(requireCaptured = false) {
    if (!client) throw Error('Owned client unavailable');
    const rows = (await client.query('SELECT phase,fence_generation::text generation,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows;
    expect(rows).toHaveLength(1); expect(['EXPANDED_LEGACY', 'FENCED']).toContain(rows[0].phase);
    expect(rows[0].generation).toMatch(/^(0|[1-9][0-9]*)$/);
    expect(rows[0].backfill_actor).toBeNull(); expect(rows[0].capture_manifest_sha256).toBeNull();
    if (requireCaptured) expect(rows[0]).toEqual({ phase: 'FENCED', generation: facts.fence.generation, backfill_actor: null, capture_manifest_sha256: null });
    return rows[0].generation as string;
  }
  // This copy is ordinary captured metadata, not reissued source provenance.
  const copiedCapture = () => JSON.parse(canonicalOwnershipJson(keyComparators)) as TypedKeyComparatorCapture;
  function rechecksum(capture: TypedKeyComparatorCapture) {
    for (const catalog of capture.catalogs) { const { checksum, ...body } = catalog; void checksum; catalog.checksum = ownershipDigest(body); }
    const { captureChecksum, ...body } = capture; void captureChecksum; capture.captureChecksum = ownershipDigest(body);
    return capture;
  }
  function blocked(capture: unknown, checksum: unknown = retainedChecksum) {
    const result = validateTypedKeyComparators(snapshot, capture, checksum);
    expect(result.status, JSON.stringify(result)).toBe('BLOCKED'); expect(result).not.toHaveProperty('observations');
  }
  function contractFor(table: string, kind: TypedKeyComparatorContract['kind'], columns: readonly string[]) {
    const found = contracts.filter(c => c.table === table && c.kind === kind && same(c.columns, columns));
    if (found.length !== 1) throw Error('One closed source key contract required'); return found[0];
  }
  async function sameSnapshotSql(query: Client['query']) {
    const selected = [contractFor('employees', 'PRIMARY_KEY', ['id']), contractFor('locations', 'PRIMARY_KEY', ['id']),
      contractFor('locations', 'CANDIDATE', ['clocker_key']), contractFor('schedule_week_settings', 'CANDIDATE', ['week_start']),
      contractFor('schedule_publication_revisions', 'CANDIDATE', ['week_start', 'revision_number']),
      contractFor('password_recovery_limits', 'PRIMARY_KEY', ['scope', 'bucket'])];
    referenceSnapshot = (await query('SELECT pg_current_snapshot()::text snapshot')).rows[0].snapshot;
    for (const contract of selected) {
      const rule = registry.tables.find(t => t.table === contract.table)!;
      const keys = (alias: string) => rule.primaryKey.map(c => alias + '.' + quoted(c));
      const tuple = (alias: string) => 'ROW(' + contract.columns.map(c => alias + '.' + quoted(c)).join(',') + ')';
      // Built-in operators on original SQL columns use the actual indexed
      // column collation. No JS normalization, text-wire inequality or rank
      // duplication substitutes for equality/order in this same transaction.
      const values = await query<(string | null)[]>({ text: 'SELECT ' + [...keys('a'), ...keys('b'),
        '(' + tuple('a') + ' = ' + tuple('b') + ')::text', '(' + tuple('a') + ' < ' + tuple('b') + ')::text'].join(',') +
        ' FROM public.' + quoted(contract.table) + ' a CROSS JOIN public.' + quoted(contract.table) + ' b',
        rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } });
      for (const row of values.rows) {
        const n = rule.primaryKey.length;
        if (!['true', 'false'].includes(row[2 * n]!) || !['true', 'false'].includes(row[2 * n + 1]!)) throw Error('Reference SQL pair is not an included nonnull source key');
        sqlPairs.push({ contractId: contract.contractId, left: row.slice(0, n), right: row.slice(n, 2 * n), equal: row[2 * n] === 'true', less: row[2 * n + 1] === 'true' });
      }
    }
  }
  async function invokeCapture(referenceSql: boolean, fault?: 'COMMIT_ACK_LOSS' | 'COLLECTOR_QUERY') {
    if (!client) throw Error('Owned client unavailable');
    const expectedFenceGeneration = await unarmedFence(); sqlPairs = []; referenceSnapshot = undefined;
    const native = client.query.bind(client); let beforeCommitCalls = 0, rollbackCalls = 0, collectorFaultTriggered = false;
    const spy = vi.spyOn(client, 'query');
    spy.mockImplementation((async (...args: unknown[]) => {
      const query = args[0], text = typeof query === 'string' ? query : query && typeof query === 'object' ? (query as { text?: unknown }).text : undefined;
      if (typeof text === 'string' && text.trim().toUpperCase() === 'ROLLBACK') rollbackCalls++;
      // Stable closed marker owned by key-comparator-capture.server.ts. The
      // first new constraint lookup is faulted, never a core/setup query.
      if (fault === 'COLLECTOR_QUERY' && typeof text === 'string' && text.includes('/* F10_KEY_CONSTRAINT */')) {
        collectorFaultTriggered = true; throw Error('fictional-secret-key-collector-payload');
      }
      if (typeof text === 'string' && text.trim().toUpperCase() === 'COMMIT') {
        beforeCommitCalls++; expect(beforeCommitCalls).toBe(1);
        if (referenceSql) await sameSnapshotSql(native);
        if (fault === 'COMMIT_ACK_LOSS') { await Reflect.apply(native, client, args); throw Error('fictional-key-commit-ack-lost'); }
      }
      return Reflect.apply(native, client, args);
    }) as Client['query']);
    let captured: Awaited<ReturnType<typeof captureTypedTenantMigrationFactsWithKeyComparators>>;
    try { captured = await captureTypedTenantMigrationFactsWithKeyComparators(client, { ...request, expectedFenceGeneration }); }
    finally { spy.mockRestore(); }
    return { captured, expectedFenceGeneration, beforeCommitCalls, rollbackCalls, collectorFaultTriggered };
  }
  async function captureCase(id: string, referenceSql: boolean) {
    const { captured, beforeCommitCalls } = await invokeCapture(referenceSql);
    receipt('case-' + id + '-capture-outcome.json', captured);
    // Kept inside every actual it: the closed NOT_IMPLEMENTED API produces
    // genuine feature failures, never a beforeAll failure with skipped cases.
    expect(captured.status, JSON.stringify(captured)).toBe('CAPTURED_WITH_KEYS');
    if (captured.status !== 'CAPTURED_WITH_KEYS') throw Error('Root-owned same-transaction key collection required');
    expect(beforeCommitCalls).toBe(1); facts = captured.facts; keyComparators = captured.keyComparators;
    currentCaseBinding = { sourceDigest: facts.sourceDigest, factsDigest: facts.factsDigest,
      namespaceCaptureChecksum: facts.namespaceComparators.captureChecksum, keyCaptureChecksum: keyComparators.captureChecksum,
      snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation };
    retainedChecksum = keyComparators.captureChecksum;
    receipt('case-' + id + '-independently-retained-checksum.json', { captureChecksum: retainedChecksum, source: 'ACTUAL_CAPTURE_RETURN_RECORDED_BEFORE_PURE_VALIDATION_OR_MUTATION',
      sourceDigest: facts.sourceDigest, factsDigest: facts.factsDigest, snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation });
    const inspected = inspectTypedMigrationSnapshot(facts, { sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest, snapshotId: facts.snapshot.id,
      fenceGeneration: facts.fence.generation, factsDigest: facts.factsDigest }); expect(inspected.status, JSON.stringify(inspected)).toBe('INSPECTED');
    if (inspected.status !== 'INSPECTED') throw Error('Complete actual typed snapshot required'); snapshot = inspected.snapshot;
    expect(isIssuedInspectedTypedSnapshot(snapshot)).toBe(true);
    receipt('case-' + id + '-captured-facts.json', facts); receipt('case-' + id + '-key-comparators.json', keyComparators);
    if (referenceSql) receipt('case-' + id + '-same-snapshot-sql.json', { snapshotId: referenceSnapshot, beforeCommitCalls, pairs: sqlPairs });
    await unarmedFence(true);
  }
  function actualCase(id: string, name: string, check: () => Promise<void> | void, automaticCapture = true) {
    it(name, async () => {
      let status: 'PASS' | 'FAIL' = 'FAIL'; currentCaseBinding = {};
      try { if (automaticCapture) await captureCase(id, id === '02'); await check(); expect(await originalRows()).toEqual(initialRows); await unarmedFence(automaticCapture); status = 'PASS'; }
      finally { const item = { id, name, status }; caseReceipts.push(item); receipt('case-' + id + '.json', { ...item, actualRootInvocation: true,
        ...currentCaseBinding, claim: 'OWNED_SINGLE_WORKSPACE_SQL_KEY_WITNESS_NOT_TARGET_UNIQUENESS_F10_OR_RLS' }); }
    }, 15000);
  }
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== undefined || process.env.FUEL_TEST_DATABASE_URL !== undefined) throw Error('Ambient application database configuration forbidden');
    if (!process.env.F_CAPTURE_RUN_DIR) throw Error('Explicit one-shot evidence directory required');
    runDirectory = realpathSync(process.env.F_CAPTURE_RUN_DIR); lease = JSON.parse(readFileSync(leasePath!, 'utf8'));
    expect(lease.closed).toBe(false); lease.root = realpathSync(lease.root); lease.data = realpathSync(lease.data);
    expect(lease.data).toBe(join(lease.root, 'data'));
    const credentialRelative = relative(lease.root, realpathSync(lease.credentialFile));
    if (!credentialRelative || credentialRelative.startsWith('..') || credentialRelative.startsWith('/')) throw Error('Exact fictional lease credential must stay inside its owned root');
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port); expect(realpathSync(pid[1])).toBe(lease.data);
    admin = connect(lease.database); await admin.connect();
    const identity = (await admin.query("SELECT current_setting('data_directory') data,current_setting('server_version') version,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
    expect(realpathSync(identity.data)).toBe(lease.data); expect(identity.version).toMatch(/^18\./); expect(identity.system_identifier).toBe(lease.systemIdentifier);
    expect(identity.oid).toBe(lease.databaseOid); expect(identity.marker).toBe(lease.marker);
    expect(existsSync(join(runDirectory, 'database-custody.json'))).toBe(false);
    const name = lease.database + '_run_' + randomBytes(4).toString('hex'), marker = lease.marker + ':run:' + name;
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(63); expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount).toBe(0);
    await admin.query('CREATE DATABASE ' + quoted(name));
    const oid = (await admin.query('SELECT oid::text oid FROM pg_database WHERE datname=$1', [name])).rows[0].oid;
    database = { name, oid, marker }; await admin.query('COMMENT ON DATABASE ' + quoted(name) + ' IS ' + literal(marker));
    receipt('database-custody.json', { systemIdentifier: lease.systemIdentifier, ...database, createdByThisInvocation: true, closed: false });
    client = connect(name); await client.connect();
    const migrations = OWNERSHIP_SOURCE.map(s => ({ path: s.path, text: readFileSync(resolve(s.path), 'utf8') })); expect(verifyOwnershipSource(migrations)).toEqual([]);
    expect(migrations).toHaveLength(25); for (const source of migrations) await client.query(source.text);
    // Untouched migrations create the exact singleton workspace and locations.
    // These are fictional records in this marked child; no second workspace is
    // fabricated and no singleton/foreign-key/history guard is removed.
    await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active,email,created_at) VALUES($1,'Fictional','Typed A','000','EMPLOYEE','loc-1',false,'TypedA@Example.invalid','2026-10-09 01:02:03.123456+00'),($2,'Fictional','Typed B','000','EMPLOYEE','loc-2',false,NULL,'2026-10-09 01:02:03.000001+00')", [ownedEmployee, otherEmployee]);
    await client.query("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES($1,39.10,'{\"numberA\":9007199254740993,\"numberB\":9007199254740994,\"fraction\":0.123456789012345678901,\"scale\":1.00}'::jsonb),($2,40.00,NULL)", [ownedEmployee, otherEmployee]);
    await client.query("INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2026-10-05',NULL,$1),('2026-10-12',NULL,$1)", [ownedEmployee]);
    await client.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('typed-revision','2026-10-05',1,'MANAGER_MUTATION',NULL,$1),('typed-revision-b','2026-10-12',2,'MANAGER_MUTATION',NULL,$1)", [ownedEmployee]);
    await client.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES($1,'typed-revision','deleted typed shift','deleted typed schedule','loc-1','retired typed employee','2026-10-06','08:00:00.123456','09:00:00.123456','Fictional retained literal Ω')", [historyId]);
    await client.query("INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids,revoked_at,revocation_reason) VALUES($1,'workspace-fuel',$2,$3,'00000000-0000-4000-8000-000000000072','[0:1]={loc-1,NULL}'::text[],clock_timestamp(),'fictional retired history')", [subscriptionId, ownedEmployee, 'e'.repeat(64)]);
    await client.query("INSERT INTO calendar_operations(workspace_id,actor_employee_id,operation_id,authority,payload_hash,result) VALUES('workspace-fuel',$1,$2,$3,$3,'null'::jsonb)", [ownedEmployee, operationId, 'a'.repeat(64)]);
    await client.query("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',9223372036854775807,7),('global',9223372036854775806,7)");
    await client.query("INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status) VALUES($1,$2,'fictional-key-installation','test','fictional-key-endpoint',NULL,'fictional-key-generation','fictional-noncredential-session-marker','detached')", [detachedPushId, ownedEmployee]);
    const expansion = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
    const expansionSha256 = createHash('sha256').update(expansion).digest('hex'); expect(expansionSha256).toBe('fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb');
    await client.query(expansion); initialRows = await originalRows();
    expect((await client.query('SELECT count(*)::int n FROM workspaces')).rows[0].n).toBe(1);
    for (const table of ['employee_credentials', 'employee_sessions', 'notifications', 'push_deliveries', 'communications']) expect((await client.query('SELECT count(*)::int n FROM ' + quoted(table))).rows[0].n).toBe(0);
    await client.query('SET search_path=pg_catalog'); const catalog = await observeMigrationCatalog(client); await client.query('SET search_path=public');
    const sourceManifest = JSON.parse(readFileSync(join(runDirectory, 'pre-invocation-source.json'), 'utf8'));
    request = { identity: { database: name, databaseOid: oid, marker, systemIdentifier: lease.systemIdentifier, dataDirectory: lease.data, role: lease.user, port: lease.port }, migrations,
      sourceDigest: sourceManifest.sourceDigest, catalogBaseline: { sourceDigest: sourceManifest.sourceDigest, expansionSha256, registryDigest: registry.digest, catalogDigest: catalog.digest }, expectedFenceGeneration: '0' };
    await unarmedFence();
    receipt('source-generated-catalog.json', { ...catalog, binding: request.catalogBaseline }); receipt('initial-original-rows.json', initialRows);
    receipt('fixture-setup.json', { originalMigrations: 25, expansionSha256, originalTables: registry.tables.length, singleWorkspace: true,
      scope: 'KEY_METADATA_ONLY_NOT_OWNERSHIP_OR_CLASSIFICATION_APPROVAL',
      additions: ['explicit second week/revision', 'second exact unsafe bigint recovery bucket', 'one detached push tombstone with SQLNULL encrypted material'],
      noPortalCredentialsSessionsDeliveriesOrCommunication: true, captureCallsBeforeActualCases: 0 });
    receipt('open-fixture-gates.json', { singleWorkspaceOnly: true, preservedGuard: '0008 CHECK(singleton) + UNIQUE(singleton)',
      open: ['ACTUAL_POST_CUTOVER_A_B_TENANT_CAPTURE', 'ACTUAL_CURRENT_PHYSICAL_CROSS_OWNER_REJECTION', 'ACTUAL_ARRAY_CROSS_OWNER_REJECTION'],
      distinction: 'No altered/pure invented two-workspace capture substitutes for actual database coverage.' });
  }, 30000);

  afterAll(async () => {
    const failures: string[] = [], closedClients: string[] = [];
    try {
      if (client) { if (client.getTransactionStatus() !== 'I') await client.query('ROLLBACK');
        if (initialRows) { const finalRows = await originalRows(); receipt('final-original-rows.json', finalRows); expect(finalRows).toEqual(initialRows); }
        if (request) { await client.query('SET search_path=pg_catalog');
          const finalCatalog = await observeMigrationCatalog(client); await client.query('SET search_path=public');
          receipt('final-source-catalog.json', finalCatalog); expect(finalCatalog.digest).toBe(request.catalogBaseline.catalogDigest); }
        await unarmedFence(); }
    } catch { failures.push('SOURCE_PRESERVATION_OR_FENCE_CHECK_FAILED'); }
    finally {
      if (client) try { await client.end(); closedClients.push('child'); } catch { failures.push('CHILD_CLIENT_CLOSE_FAILED'); }
      if (admin) {
        try {
          if (database) {
            const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n'); expect(Number(pid[0])).toBe(lease.pid); expect(pid[2]).toBe(lease.pidStart);
            const identity = (await admin.query("SELECT current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
            expect(realpathSync(identity.data)).toBe(lease.data); expect(identity.system_identifier).toBe(lease.systemIdentifier); expect(identity.oid).toBe(lease.databaseOid); expect(identity.marker).toBe(lease.marker);
            const current = (await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1", [database.name])).rows[0];
            expect(current).toEqual({ oid: database.oid, marker: database.marker });
            await admin.query('DROP DATABASE ' + quoted(database.name)); expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [database.name])).rowCount).toBe(0);
            receipt('database-closed.json', { ...database, systemIdentifier: lease.systemIdentifier, closed: true, exactDropVerified: true });
          }
        } catch { failures.push('EXACT_MARKED_CHILD_DROP_UNCONFIRMED'); }
        finally { try { await admin.end(); closedClients.push('admin'); } catch { failures.push('ADMIN_CLIENT_CLOSE_FAILED'); } }
      }
    }
    if (runDirectory) receipt('typed-key-comparator-case-receipts.json', { cases: caseReceipts, closedClients: [...closedClients, ...closedReconciliationClients], failures, actualRootInvocation: true, crossOwnerFixtureGates: 'OPEN_POST_CUTOVER' });
    if (failures.length) throw Error('Owned fixture preservation/cleanup unconfirmed; retain the exact custody and failure receipts');
  });

  actualCase('01', 'collects every original key and five projected candidates against the complete actual source catalog', () => {
    const originalCount = registry.tables.reduce((n, t) => n + t.declaredKeys.length, 0);
    expect(originalCount).toBe(99); expect(contracts).toHaveLength(104); expect(facts.tables).toHaveLength(68);
    expect(facts.format).toBe('TYPED_SQL_WIRE_V1'); expect(facts).not.toHaveProperty('keyComparators');
    expect(keyComparators.catalog).toEqual(facts.catalog); expect(ownershipDigest(keyComparators.catalog)).toBe(facts.currentSchemaDigest);
    expect(keyComparators.binding).toEqual({ registryDigest: snapshot.registryDigest, sourceDigest: snapshot.sourceDigest,
      currentSchemaDigest: snapshot.currentSchemaDigest, snapshotId: snapshot.snapshotId, fenceGeneration: snapshot.fenceGeneration, factsDigest: snapshot.factsDigest });
    expect(keyComparators.catalogs.map(c => c.contractId)).toEqual(contracts.map(c => c.contractId));
    const stock = getTypedKeyComparatorStockDescriptors(); expect(stock).toHaveLength(9);
    for (const contract of contracts) {
      const catalog = keyComparators.catalogs.find(c => c.contractId === contract.contractId)!;
      expect(catalog.columns).toEqual(contract.columns); expect(catalog.indexColumns).toEqual(contract.indexColumns);
      expect(catalog.projectedPositions).toEqual(contract.projectedPositions); expect(catalog.source).toEqual(contract.source);
      expect(catalog.components.map(c => c.column)).toEqual(contract.columns);
      for (const component of catalog.components) {
        const descriptor = stock.find(s => s.type === component.type)!; expect(descriptor).toBeDefined();
        const { oid, ...opclass } = component.opclass; expect(oid).toMatch(/^[1-9][0-9]*$/);
        expect(opclass).toEqual(descriptor.opclass); expect(component.typeOid).toBe(descriptor.typeOid);
        if (descriptor.collatable) expect(component.collation).not.toBeNull(); else expect(component.collation).toBeNull();
      }
      const { checksum, ...catalogBody } = catalog; expect(checksum).toBe(ownershipDigest(catalogBody));
      const table = snapshot.tables.find(t => t.table === contract.table)!;
      const rows = keyComparators.rows.filter(r => r.contractId === contract.contractId);
      expect(rows).toHaveLength(table.rows.length); expect(rows.map(r => r.key)).toEqual(table.rows.map(r => r.key));
      for (const row of rows) {
        const source = table.rows.find(r => same(r.key, row.key))!; expect(row.rowChecksum).toBe(source.originalChecksum);
        const included = contract.columns.every(c => source.columns.find(v => v.name === c)!.wire !== null)
          && (contract.label !== 'active_endpoint_global' || source.columns.find(c => c.name === 'status')!.wire === 'active');
        expect(row.included).toBe(included);
        if (included) expect(row.comparisonClass).toMatch(/^[1-9][0-9]*$/); else expect(row.comparisonClass).toBeNull();
      }
    }
    const { captureChecksum, ...body } = keyComparators; expect(captureChecksum).toBe(ownershipDigest(body));
    const outcome = validateTypedKeyComparators(snapshot, keyComparators, retainedChecksum);
    expect(outcome.status, JSON.stringify(outcome)).toBe('VALIDATED');
    if (outcome.status !== 'VALIDATED') throw Error('Complete actual key observations required');
    expect(isIssuedTypedKeyComparatorObservations(outcome.observations)).toBe(true);
    expect(outcome.observations.verification).toBe('PURE_NOT_DATABASE_OPERATOR_OR_TENANT_AUTHORITY');
    expect(outcome.observations).not.toHaveProperty('chunks'); expect(outcome.observations).not.toHaveProperty('effectsVerified');
    firstCapture = copiedCapture();
  });
  actualCase('02', 'matches captured rank classes to independent SQL equality and ordering before the same COMMIT', () => {
    expect(referenceSnapshot).toBe(facts.snapshot.id); expect(new Set(sqlPairs.map(p => p.contractId)).size).toBe(6);
    expect(sqlPairs.some(p => p.equal)).toBe(true); expect(sqlPairs.some(p => !p.equal)).toBe(true); expect(sqlPairs.some(p => p.less)).toBe(true);
    for (const pair of sqlPairs) {
      const contract = contracts.find(c => c.contractId === pair.contractId)!;
      const rule = registry.tables.find(t => t.table === contract.table)!;
      const find = (keyWire: (string | null)[]) => {
        const source = snapshot.tables.find(t => t.table === contract.table)!.rows.find(r => same(rule.primaryKey.map(c => r.columns.find(v => v.name === c)!.wire), keyWire))!;
        expect(source).toBeDefined();
        const row = keyComparators.rows.find(r => r.contractId === pair.contractId && same(r.key, source.key))!;
        expect(row.included).toBe(true); return row;
      };
      const left = find(pair.left), right = find(pair.right);
      expect(left.comparisonClass === right.comparisonClass).toBe(pair.equal);
      expect(BigInt(left.comparisonClass!) < BigInt(right.comparisonClass!)).toBe(pair.less);
    }
    expect(validateTypedKeyComparators(snapshot, keyComparators, retainedChecksum).status).toBe('VALIDATED');
  });
  actualCase('03', 'retains inactive, excluded and lossless source rows without normalizing identity or payload cells', () => {
    const employee = sourceRow('employees', [ownedEmployee]); expect(employee.key).toEqual([ownedEmployee]);
    expect(employee.columns.find(c => c.name === 'active')!.wire).toBe('f');
    const employeesKey = contractFor('employees', 'PRIMARY_KEY', ['id']);
    expect(keyComparators.rows.find(r => r.contractId === employeesKey.contractId && same(r.key, [ownedEmployee]))!.included).toBe(true);
    const profile = sourceRow('employee_scheduling_settings', [ownedEmployee]).columns.find(c => c.name === 'operational_rule_profile')!;
    expect(profile.lineage.nodes.filter(n => n.value.kind === 'JSON_NUMBER').map(n => n.value)).toEqual(expect.arrayContaining([
      { kind: 'JSON_NUMBER', lexeme: '9007199254740993' }, { kind: 'JSON_NUMBER', lexeme: '9007199254740994' },
      { kind: 'JSON_NUMBER', lexeme: '0.123456789012345678901' }, { kind: 'JSON_NUMBER', lexeme: '1.00' }]));
    expect(sourceRow('employee_scheduling_settings', [otherEmployee]).columns.find(c => c.name === 'operational_rule_profile')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');
    expect(sourceRow('calendar_operations', ['workspace-fuel', ownedEmployee, operationId]).columns.find(c => c.name === 'result')!.lineage.nodes[0].value.kind).toBe('JSON_NULL');
    const array = sourceRow('calendar_subscriptions', [subscriptionId]).columns.find(c => c.name === 'allowed_location_ids')!;
    expect(array.wire).toBe('[0:1]={loc-1,NULL}'); expect(array.lineage.nodes[1].address).toEqual([{ kind: 'SQL_ARRAY_ELEMENT', ordinal: 0, subscripts: [0] }]);
    expect(array.lineage.nodes[2].value.kind).toBe('SQL_ARRAY_NULL');
    expect(sourceRow('schedule_publication_revision_shifts', [historyId]).columns.find(c => c.name === 'start_time')!.wire).toBe('08:00:00.123456');
    expect(sourceRow('password_recovery_limits', ['global', '9223372036854775807']).columns.find(c => c.name === 'bucket')!.wire).toBe('9223372036854775807');
    expect(sourceRow('push_subscriptions', [detachedPushId]).columns.find(c => c.name === 'encrypted_material')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');
    const excluded = keyComparators.rows.find(r => r.contractId === contractFor('push_subscriptions', 'CANDIDATE', ['endpoint_fingerprint', 'environment']).contractId && same(r.key, [detachedPushId]))!;
    expect(excluded).toMatchObject({ included: false, comparisonClass: null });
    expect(validateTypedKeyComparators(snapshot, keyComparators, retainedChecksum).status).toBe('VALIDATED');
  });
  actualCase('04', 'rejects independent checksum and every exact source, catalog, facts, snapshot and fence binding drift', () => {
    blocked(keyComparators, 'f'.repeat(64)); blocked(keyComparators, null);
    for (const field of ['registryDigest', 'sourceDigest', 'currentSchemaDigest', 'snapshotId', 'fenceGeneration', 'factsDigest'] as const) {
      const changed = copiedCapture(); changed.binding[field] = field === 'snapshotId' ? 'fictional-other-snapshot' : field === 'fenceGeneration' ? '999999' : 'f'.repeat(64);
      rechecksum(changed); blocked(changed, changed.captureChecksum);
    }
  });
  actualCase('05', 'rejects complete catalog, projected index, stock operator, default opclass and effective collation drift', () => {
    const full = copiedCapture(); full.catalog = {}; rechecksum(full); blocked(full, full.captureChecksum);
    const omitted = copiedCapture(); omitted.catalogs.pop(); rechecksum(omitted); blocked(omitted, omitted.captureChecksum);
    const mutate = (change: (capture: TypedKeyComparatorCapture) => void) => { const c = copiedCapture(); change(c); rechecksum(c); blocked(c, c.captureChecksum); };
    mutate(c => { c.catalogs[0].components[0].type = 'jsonb'; });
    mutate(c => { c.catalogs[0].components[0].opclass.default = false; });
    mutate(c => { c.catalogs[0].components[0].opclass.equality.functionOid = '0'; });
    mutate(c => { c.catalogs[0].components[0].opclass.ordering.source = 'fictional-operator'; });
    mutate(c => { c.catalogs.find(v => v.kind === 'CANDIDATE' && v.label === 'clocker_key')!.projectedPositions = [0]; });
    mutate(c => { c.catalogs.find(v => v.components.some(s => s.collation))!.components.find(s => s.collation)!.collation!.actualVersion = 'fictional-drift'; });
    mutate(c => { c.databaseCollation.actualVersion = 'fictional-drift'; });
  });
  actualCase('06', 'requires every original row and checksum, including excluded rows, with exact untrimmed key attachment', () => {
    const target = contractFor('employees', 'PRIMARY_KEY', ['id']);
    const mutate = (change: (capture: TypedKeyComparatorCapture) => void) => { const c = copiedCapture(); change(c); rechecksum(c); blocked(c, c.captureChecksum); };
    mutate(c => { c.rows.find(r => r.contractId === target.contractId && same(r.key, [ownedEmployee]))!.key = [ownedEmployee.trim()]; });
    mutate(c => { c.rows.find(r => r.contractId === target.contractId)!.rowChecksum = 'f'.repeat(64); });
    mutate(c => { c.rows = c.rows.filter(r => !(r.contractId === target.contractId && same(r.key, [ownedEmployee]))); });
    mutate(c => { c.rows.push({ ...c.rows.find(r => r.contractId === target.contractId)!, key: [ownedEmployee] }); });
    mutate(c => { c.rows = c.rows.filter(r => !(r.contractId === contractFor('push_subscriptions', 'CANDIDATE', ['endpoint_fingerprint', 'environment']).contractId && same(r.key, [detachedPushId]))); });
  });
  actualCase('07', 'rejects class and inclusion metadata drift without promoting a rewritten checksum to SQL authority', () => {
    const target = contractFor('employees', 'PRIMARY_KEY', ['id']);
    for (const rank of [null, '', '0', '-1', '1.0', '01']) {
      const c = copiedCapture(); c.rows.find(r => r.contractId === target.contractId)!.comparisonClass = rank;
      rechecksum(c); blocked(c, c.captureChecksum);
    }
    const excluded = copiedCapture(); excluded.rows.find(r => !r.included)!.comparisonClass = '1'; rechecksum(excluded); blocked(excluded, excluded.captureChecksum);
    const included = copiedCapture(); included.rows.find(r => r.contractId === target.contractId)!.included = false; rechecksum(included); blocked(included, included.captureChecksum);
    const plausible = copiedCapture(); plausible.rows.find(r => r.contractId === target.contractId)!.comparisonClass = '999'; rechecksum(plausible);
    blocked(plausible); // independently retained original capture checksum
  });
  actualCase('08', 'issues immutable supplied observations and keeps cloned or proxied outputs unissued without evaluating traps', () => {
    const outcome = validateTypedKeyComparators(snapshot, keyComparators, retainedChecksum);
    expect(outcome.status, JSON.stringify(outcome)).toBe('VALIDATED'); if (outcome.status !== 'VALIDATED') throw Error('Actual supplied comparator observations required');
    const observation = outcome.observations;
    const deeplyFrozen = (value: unknown): boolean => !value || typeof value !== 'object' || Object.isFrozen(value)
      && Object.values(Object.getOwnPropertyDescriptors(value)).every(d => !('value' in d) || deeplyFrozen(d.value));
    expect(deeplyFrozen(observation)).toBe(true); expect(isIssuedTypedKeyComparatorObservations(observation)).toBe(true);
    expect(isIssuedTypedKeyComparatorObservations({ ...observation })).toBe(false);
    expect(() => { (observation.rows[0] as { comparisonClass: string | null }).comparisonClass = '999'; }).toThrow();
    let traps = 0;
    const proxy = new Proxy(observation, { get() { traps++; throw Error('Unexpected proxy read'); }, getPrototypeOf() { traps++; throw Error('Unexpected proxy reflection'); }, ownKeys() { traps++; throw Error('Unexpected proxy reflection'); } });
    expect(isIssuedTypedKeyComparatorObservations(proxy)).toBe(false); expect(traps).toBe(0);
  });
  actualCase('09', 'rejects previous-capture reuse, cloned snapshots and changed original wire cells against genuine current source', () => {
    expect(firstCapture).toBeDefined(); blocked(firstCapture, firstCapture!.captureChecksum);
    expect(validateTypedKeyComparators({ ...snapshot }, keyComparators, retainedChecksum).status).toBe('BLOCKED');
    const boundary = { sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest, snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation, factsDigest: facts.factsDigest };
    const changed = { ...facts, tables: facts.tables.map(t => t.table === 'employees' ? { ...t, rows: t.rows.map(r => same(r.key, [ownedEmployee])
      ? { ...r, columns: r.columns.map(c => c.name === 'id' ? { ...c, wire: ownedEmployee.trim() } : c) } : r) } : t) };
    expect(inspectTypedMigrationSnapshot(changed, boundary)).toEqual({ status: 'BLOCKED', code: 'TYPED_SNAPSHOT_CELL_DRIFT' });
  });
  actualCase('10', 'retains unknown COMMIT outcome after a real lost acknowledgement and reconciles only the exact owned source', async () => {
    const { captured, expectedFenceGeneration, beforeCommitCalls, rollbackCalls } = await invokeCapture(false, 'COMMIT_ACK_LOSS');
    receipt('case-10-fault-outcome.json', { captured, expectedFenceGeneration, beforeCommitCalls, rollbackCalls });
    expect(captured).toEqual({ status: 'UNCERTAIN', code: 'CAPTURE_COMMIT_OUTCOME_UNKNOWN', reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_REQUEST_REQUIRED' });
    expect(beforeCommitCalls).toBe(1); expect(rollbackCalls).toBe(0); expect(captured).not.toHaveProperty('facts'); expect(captured).not.toHaveProperty('keyComparators');
    if (!database) throw Error('Exact marked child required');
    const fresh = connect(database.name);
    try {
      await fresh.connect();
      const i = (await fresh.query("SELECT current_database() database,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,current_setting('data_directory') data,session_user::text role,host(inet_server_addr()) host,inet_server_port() port")).rows[0];
      expect(i).toEqual({ database: request.identity.database, oid: request.identity.databaseOid, marker: request.identity.marker, system_identifier: request.identity.systemIdentifier,
        data: request.identity.dataDirectory, role: request.identity.role, host: '127.0.0.1', port: request.identity.port });
      const fence = (await fresh.query('SELECT phase,fence_generation::text generation,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows;
      expect(fence).toEqual([{ phase: 'FENCED', generation: (BigInt(expectedFenceGeneration) + BigInt(1)).toString(), backfill_actor: null, capture_manifest_sha256: null }]);
      expect(await originalRows(fresh)).toEqual(initialRows);
      receipt('case-10-fresh-reconciliation.json', { originalRequestIdentity: request.identity, fence, originalRowsUnchanged: true,
        claim: 'OWNED_SOURCE_READ_ONLY_RECONCILIATION_NOT_BACKFILL_EFFECTS_VERIFICATION' });
    } finally { await fresh.end(); closedReconciliationClients.push('case-10-fresh-owned-reconciliation'); }
  }, false);
  actualCase('11', 'rolls back a new collector read failure before COMMIT and keeps the exact prior source fence unarmed', async () => {
    if (!client) throw Error('Owned client unavailable');
    const before = (await client.query('SELECT phase,fence_generation::text generation,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows;
    const { captured, beforeCommitCalls, rollbackCalls, collectorFaultTriggered } = await invokeCapture(false, 'COLLECTOR_QUERY');
    receipt('case-11-fault-outcome.json', { captured, beforeCommitCalls, rollbackCalls, collectorFaultTriggered });
    expect(collectorFaultTriggered).toBe(true); expect(beforeCommitCalls).toBe(0); expect(rollbackCalls).toBe(1);
    expect(captured).toEqual({ status: 'BLOCKED', code: 'KEY_COMPARATOR_READ_FAILED' });
    expect(JSON.stringify(captured)).not.toContain('fictional-secret-key-collector-payload');
    expect((await client.query('SELECT phase,fence_generation::text generation,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows).toEqual(before);
  }, false);
});
