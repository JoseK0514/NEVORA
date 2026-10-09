import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { captureTypedTenantMigrationFactsWithKeyComparators, observeMigrationCatalog, type MigrationCaptureRequest, type TypedMigrationCaptureFacts } from './capture.server';
import { canonicalOwnershipJson, getOwnershipRegistry, ownershipDigest, OWNERSHIP_SOURCE, verifyOwnershipSource, type JsonValue } from './ownership';
import { inspectTypedMigrationSnapshot, isIssuedInspectedTypedSnapshot, type InspectedTypedSnapshot, type InspectedTypedSnapshotRow } from './typed-snapshot';

import { getTypedKeyComparatorContracts, isIssuedTypedKeyComparatorObservations, validateTypedKeyComparators, type TypedKeyComparatorObservations, type TypedKeyComparatorContract } from './typed-key-comparators';

import { DATABASE_NAMESPACES, isIssuedTypedDatabaseNamespaceObservations, validateTypedDatabaseNamespaceComparators, type TypedDatabaseNamespaceObservations } from './namespace-comparators';
import { getTypedReferenceColumnContract, isIssuedTypedMigrationCellReferences, validateTypedMigrationCellReferences, type TypedReferenceClassificationInput } from './typed-reference';
import { isIssuedTypedOwnershipSourceObservations, validateTypedSnapshotOwnership, type TypedOwnershipAssignments, type TypedOwnershipSourceObservations } from './typed-ownership';
import { isIssuedTypedSourceConstraintObservations, validateTypedSourceConstraints, type TypedSourceConstraintWithKeysObservations } from './typed-constraints';

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
const fixtureEmployeeOwners: Readonly<Record<string, string>> = Object.freeze({ [ownedEmployee]: 'workspace-fuel', [otherEmployee]: 'workspace-fuel' });
const fixtureInstallationRows = [{ table: 'calendar_clock', key: [true] }, { table: 'schedule_week_settings', key: ['2026-10-05'] }, { table: 'schedule_week_settings', key: ['2026-10-12'] }];
const fixtureHistoricalLiterals = [
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'shifts', literal: 'deleted typed shift' },
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'schedules', literal: 'deleted typed schedule' },
  // This source family requires history even when the location still exists.
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'locations', literal: 'loc-1' },
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'employees', literal: 'retired typed employee' },
];
const contracts = getTypedKeyComparatorContracts();
const detachedPushId = 'fictional-detached-key-comparator-push';
const same = (a: unknown, b: unknown) => canonicalOwnershipJson(a) === canonicalOwnershipJson(b);
const quoted = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";

describe.skipIf(!leasePath)('owned PostgreSQL18 typed constraint successor with genuine SQL key observations', () => {
  type Lease = { closed: boolean; root: string; data: string; port: number; pid: number; pidStart: string; credentialFile: string; user: string;
    database: string; databaseOid: number; systemIdentifier: string; marker: string };
  let lease: Lease, runDirectory: string;
  let admin: Client | undefined, client: Client | undefined;
  let database: { name: string; oid: string; marker: string } | undefined;
  let request: MigrationCaptureRequest;
  type CaptureChain = { facts: TypedMigrationCaptureFacts; snapshot: InspectedTypedSnapshot; keyObservations: TypedKeyComparatorObservations;
    ownership: TypedOwnershipSourceObservations; namespaces: TypedDatabaseNamespaceObservations; assignments: TypedOwnershipAssignments };
  let chain: CaptureChain, currentFenceGeneration = '0';
  type SqlPair = { contractId: string; left: (string | null)[]; right: (string | null)[]; equal: boolean; less: boolean };
  let sqlPairs: SqlPair[] = [], referenceSnapshot: string | undefined;
  let initialRows: Record<string, { columns: string[]; rows: (string | null)[][] }> | undefined;
  const caseReceipts: { id: string; name: string; status: 'PASS' | 'FAIL' }[] = [];
  const receipt = (name: string, value: unknown) => writeFileSync(join(runDirectory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const connect = (name: string) => new Client({ host: '127.0.0.1', port: lease.port, user: lease.user,
    password: readFileSync(lease.credentialFile, 'utf8'), database: name, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
  const sourceRow = (table: string, key: readonly JsonValue[], source = chain.snapshot): InspectedTypedSnapshotRow => {
    const rows = source.tables.find(t => t.table === table)?.rows.filter(r => same(r.key, key));
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
    if (requireCaptured) expect(rows[0]).toEqual({ phase: 'FENCED', generation: currentFenceGeneration, backfill_actor: null, capture_manifest_sha256: null });
    return rows[0].generation as string;
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
  function reviewedFixtureAssignments(snapshot: InspectedTypedSnapshot): TypedOwnershipAssignments {
    const result: TypedOwnershipAssignments = { boundary: { registryDigest: snapshot.registryDigest, sourceDigest: snapshot.sourceDigest,
      currentSchemaDigest: snapshot.currentSchemaDigest, snapshotId: snapshot.snapshotId, fenceGeneration: snapshot.fenceGeneration, factsDigest: snapshot.factsDigest },
      mappings: [], historicalReferences: [], installation: { workspaceId: 'workspace-fuel', evidenceDigest: ownershipDigest({ fixtureInstallationRows, source: snapshot.factsDigest }), coveredRows: [] }, columns: [] };
    for (const table of snapshot.tables) for (const row of table.rows) {
      const rule = registry.tables.find(t => t.table === table.table)!;
      if (rule.anchor.kind === 'CAPTURED_IMMUTABLE') {
        if (table.table !== 'employees' || row.key.length !== 1 || typeof row.key[0] !== 'string' || !Object.hasOwn(fixtureEmployeeOwners, row.key[0])) throw Error('No default immutable owner');
        result.mappings.push({ table: table.table, key: [...row.key], workspaceId: fixtureEmployeeOwners[row.key[0]], rowChecksum: row.originalChecksum,
          evidenceDigest: ownershipDigest({ fictionalDictionary: fixtureEmployeeOwners, table: table.table, key: row.key, rowChecksum: row.originalChecksum }) });
      }
      if (rule.anchor.kind === 'INSTALLATION_PROVENANCE') {
        if (!fixtureInstallationRows.some(c => c.table === table.table && same(c.key, row.key))) throw Error('No inferred singleton installation coverage');
        result.installation!.coveredRows.push({ table: table.table, key: [...row.key], rowChecksum: row.originalChecksum });
      }
      for (const field of new Set([...rule.payloads.map(p => p.column), ...rule.typedFields])) {
        const cell = row.columns.find(c => c.name === field)!;
        const known = getTypedReferenceColumnContract(table.table, field); if (known.status !== 'CONTRACT') throw Error('Missing declared source field contract');
        const contract = known.contract, classifications: TypedReferenceClassificationInput[] = [];
        for (const node of cell.lineage.nodes) {
          if (node.value.kind === 'JSON_OBJECT' && node.value.memberCount > 0 || node.value.kind === 'JSON_ARRAY' && node.value.length > 0 || node.value.kind === 'SQL_ARRAY' && node.value.elementCount > 0) continue;
          if (node.value.kind === 'SQL_NULL' || node.value.kind === 'SQL_ARRAY_NULL') { classifications.push({ address: node.address, kind: 'ABSENCE' }); continue; }
          if (node.value.kind === 'JSON_NULL' && table.table === 'calendar_operations' && field === 'result' && same(row.key, ['workspace-fuel', ownedEmployee, operationId])) {
            classifications.push({ address: node.address, kind: 'ABSENCE' }); continue;
          }
          if (node.value.kind === 'SQL_ARRAY_TEXT' && table.table === 'calendar_subscriptions' && field === 'allowed_location_ids' && same(row.key, [subscriptionId]) && node.value.text === 'loc-1') {
            classifications.push({ address: node.address, kind: 'REFERENCE', target: 'locations', targetColumns: ['id'], key: [{ kind: 'TEXT', text: node.value.text }], historical: false }); continue;
          }
          const segment = node.address[0];
          if (node.value.kind === 'JSON_NUMBER' && table.table === 'employee_scheduling_settings' && field === 'operational_rule_profile'
            && same(row.key, [ownedEmployee]) && node.address.length === 1 && segment.kind === 'JSON_MEMBER' && ['numberA', 'numberB', 'fraction', 'scale'].includes(segment.name)) {
            classifications.push({ address: node.address, kind: 'DATA' }); continue;
          }
          throw Error('Unreviewed actual fixture occurrence; no default DATA or identity-erasing absence');
        }
        const reviewed = validateTypedMigrationCellReferences(cell.lineage, { binding: { schemaCommit: contract.source.schemaCommit, schemaTree: contract.source.schemaTree,
          schemaDigest: contract.source.schemaDigest, registryDigest: contract.source.registryDigest, table: table.table, column: field,
          contractChecksum: contract.checksum, sourceChecksum: cell.lineage.source.checksum }, reviewEvidenceDigest: ownershipDigest({ fictionalNamedField: table.table + '.' + field,
          rowChecksum: row.originalChecksum, source: cell.lineage.source.checksum, classifications }), classifications, unresolvedAddresses: [] });
        expect(reviewed.status, JSON.stringify(reviewed)).toBe('VALIDATED'); if (reviewed.status !== 'VALIDATED') throw Error('Complete explicit source-cell review required');
        expect(isIssuedTypedMigrationCellReferences(reviewed.classification)).toBe(true);
        result.columns.push({ table: table.table, key: [...row.key], rowChecksum: row.originalChecksum, column: field, classification: reviewed.classification });
      }
    }
    // Individually named fictional retained witnesses bind the referencing
    // captured row checksum. No traversal invents a witness from current rows.
    for (const witness of fixtureHistoricalLiterals) {
      const row = sourceRow(witness.table, witness.key, snapshot);
      result.historicalReferences.push({ target: witness.target, targetColumns: ['id'], key: [{ kind: 'TEXT', text: witness.literal }], workspaceId: 'workspace-fuel',
        sourceRowChecksum: row.originalChecksum, evidenceDigest: ownershipDigest({ fictionalRetainedWitness: witness, referencingRowChecksum: row.originalChecksum }) });
    }
    return result;
  }
  async function captureChain(label: string, referenceSql: boolean): Promise<CaptureChain> {
    if (!client) throw Error('Owned client unavailable');
    const expectedFenceGeneration = await unarmedFence();
    const native = client.query.bind(client); let commits = 0;
    const spy = vi.spyOn(client, 'query');
    spy.mockImplementation((async (...args: unknown[]) => {
      const q = args[0], text = typeof q === 'string' ? q : q && typeof q === 'object' ? (q as { text?: unknown }).text : undefined;
      if (typeof text === 'string' && text.trim().toUpperCase() === 'COMMIT') { commits++; if (referenceSql) await sameSnapshotSql(native); }
      return Reflect.apply(native, client, args);
    }) as Client['query']);
    let capture: Awaited<ReturnType<typeof captureTypedTenantMigrationFactsWithKeyComparators>>;
    try { capture = await captureTypedTenantMigrationFactsWithKeyComparators(client, { ...request, expectedFenceGeneration }); }
    finally { spy.mockRestore(); }
    expect(capture.status, JSON.stringify(capture)).toBe('CAPTURED_WITH_KEYS');
    if (capture.status !== 'CAPTURED_WITH_KEYS') throw Error('Previously accepted actual typed/key capture required');
    expect(commits).toBe(1); const facts = capture.facts, retainedChecksum = capture.keyComparators.captureChecksum; currentFenceGeneration = facts.fence.generation;
    receipt(label + '-independently-retained-checksum.json', { captureChecksum: retainedChecksum,
      source: 'ACTUAL_RETURN_RECORDED_BEFORE_PURE_VALIDATION', factsDigest: facts.factsDigest, snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation });
    const inspected = inspectTypedMigrationSnapshot(facts, { sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest,
      snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation, factsDigest: facts.factsDigest });
    expect(inspected.status, JSON.stringify(inspected)).toBe('INSPECTED'); if (inspected.status !== 'INSPECTED') throw Error('Genuine inspected source required');
    const snapshot = inspected.snapshot; expect(isIssuedInspectedTypedSnapshot(snapshot)).toBe(true);
    const oldNamespaces = validateTypedDatabaseNamespaceComparators(snapshot, facts.namespaceComparators, request.migrations);
    expect(oldNamespaces.status, JSON.stringify(oldNamespaces)).toBe('VALIDATED'); if (oldNamespaces.status !== 'VALIDATED') throw Error('Genuine old-expression namespace observations required');
    expect(isIssuedTypedDatabaseNamespaceObservations(oldNamespaces.observations)).toBe(true);
    const keys = validateTypedKeyComparators(snapshot, capture.keyComparators, retainedChecksum);
    expect(keys.status, JSON.stringify(keys)).toBe('VALIDATED'); if (keys.status !== 'VALIDATED') throw Error('Genuine SQL key observations required');
    expect(isIssuedTypedKeyComparatorObservations(keys.observations)).toBe(true);
    const assignments = reviewedFixtureAssignments(snapshot), owners = validateTypedSnapshotOwnership(snapshot, assignments);
    expect(owners.status, JSON.stringify(owners)).toBe('RESOLVED_SOURCE_OBSERVATIONS');
    if (owners.status !== 'RESOLVED_SOURCE_OBSERVATIONS') throw Error('Genuine complete explicit source references/ownership required');
    expect(isIssuedTypedOwnershipSourceObservations(owners.observations)).toBe(true);
    receipt(label + '-captured-facts.json', facts); receipt(label + '-key-observations.json', keys.observations);
    receipt(label + '-ownership-review.json', assignments); receipt(label + '-ownership-observations.json', owners.observations);
    receipt(label + '-namespace-observations.json', oldNamespaces.observations);
    if (referenceSql) receipt(label + '-independent-sql-pairs.json', { snapshotId: referenceSnapshot, commits, pairs: sqlPairs });
    await unarmedFence(true);
    return { facts, snapshot, keyObservations: keys.observations, ownership: owners.observations, namespaces: oldNamespaces.observations, assignments };
  }
  function v2(source = chain): TypedSourceConstraintWithKeysObservations {
    const result = validateTypedSourceConstraints(source.snapshot, source.ownership, source.namespaces, source.keyObservations);
    expect(result.status, JSON.stringify(result)).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');
    if (result.status !== 'VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS') throw Error('Actual fourth-input successor must consume genuine SQL key observations');
    expect(result.observations.format).toBe('TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V2');
    if (result.observations.format !== 'TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V2') throw Error('Explicit successor format required');
    return result.observations;
  }
  function actualCase(id: string, name: string, check: () => Promise<void> | void) {
    it(name, async () => {
      let status: 'PASS' | 'FAIL' = 'FAIL';
      try { await check(); expect(await originalRows()).toEqual(initialRows); await unarmedFence(true); status = 'PASS'; }
      finally { const item = { id, name, status }; caseReceipts.push(item); receipt('case-' + id + '.json', { ...item, actualRootInvocation: true,
        sourceDigest: chain?.facts.sourceDigest, factsDigest: chain?.facts.factsDigest, snapshotId: chain?.facts.snapshot.id,
        observedFenceGeneration: chain?.facts.fence.generation, currentUnarmedFenceGeneration: currentFenceGeneration,
        keyCaptureChecksum: chain?.keyObservations.captureChecksum, claim: 'PURE_TYPED_CONSTRAINT_SUCCESSOR_FROM_OWNED_SOURCE_NOT_TARGET_UNIQUENESS_F10_OR_RLS' }); }
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
      scope: 'EXPLICIT_FICTIONAL_REVIEW_DICTIONARIES_NOT_HUMAN_REVIEWER_OR_OPERATOR_APPROVAL',
      additions: ['explicit second week/revision with exact installation review coverage', 'second exact unsafe bigint recovery bucket', 'one detached push tombstone with SQLNULL encrypted material'],
      noPortalCredentialsSessionsDeliveriesOrCommunication: true, captureCallsAtReceipt: 0,
      establishedSourceCapture: 'BEFORE_SUCCESSOR_ASSERTIONS_USING_ACCEPTED_PIPELINE' });
    chain = await captureChain('source-a', true);
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
    if (runDirectory) receipt('typed-constraints-with-keys-case-receipts.json', { cases: caseReceipts, closedClients, failures, actualRootInvocation: true, crossOwnerFixtureGates: 'OPEN_POST_CUTOVER' });
    if (failures.length) throw Error('Owned fixture preservation/cleanup unconfirmed; retain the exact custody and failure receipts');
  });

  actualCase('01', 'keeps unsupported three-input comparisons blocked and consumes the same genuine SQL source in explicit V2', () => {
    const old = validateTypedSourceConstraints(chain.snapshot, chain.ownership, chain.namespaces);
    expect(old.status, JSON.stringify(old)).toBe('BLOCKED');
    if (old.status !== 'BLOCKED') throw Error('Legacy three-input source comparisons must remain fail closed');
    expect(old.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'UNSUPPORTED_SQL_COMPARATOR', table: 'employees', scope: 'GLOBAL' }),
      expect.objectContaining({ code: 'UNSUPPORTED_SQL_COMPARATOR', table: 'locations', scope: 'GLOBAL' }),
      expect.objectContaining({ code: 'UNSUPPORTED_SQL_COMPARATOR', table: 'schedule_week_settings', scope: 'GLOBAL' }),
    ]));
    expect(validateTypedSourceConstraints(chain.snapshot, chain.ownership, chain.namespaces, undefined)).toEqual(old);
    const observation = v2(); expect(isIssuedTypedSourceConstraintObservations(observation)).toBe(true);
    expect(observation.tables).toHaveLength(68); expect(observation.originalKeys).toHaveLength(99);
    expect(observation.tables).toEqual(chain.facts.tables.map(t => ({ table: t.table, count: t.expectedCount, checksum: t.expectedChecksum })));
    expect(observation.rows).toBe(chain.ownership.rows); expect(observation.rows).toHaveLength(chain.facts.tables.reduce((n, t) => n + t.expectedCount, 0));
    expect(observation.keyCaptureChecksum).toBe(chain.keyObservations.captureChecksum);
    expect(observation.keyComparatorDigest).toBe(chain.keyObservations.digest); expect(observation.keyComparators).toBe(chain.keyObservations);
    expect(observation.keyComparators.catalogs).toHaveLength(104); expect(isIssuedTypedKeyComparatorObservations(observation.keyComparators)).toBe(true);
    expect(observation.boundary).toEqual(chain.ownership.boundary); expect(observation.keyComparators.binding).toEqual(chain.ownership.boundary);
    expect(observation.namespaceCaptureChecksum).toBe(chain.snapshot.namespaceCaptureChecksum);
    expect(observation.ownershipDigest).toBe(chain.ownership.digest); expect(observation.namespaceDigest).toBe(chain.namespaces.digest);
    expect(observation.verification).toBe('PURE_SOURCE_CONSTRAINT_OBSERVATIONS_NOT_DATABASE_UNIQUENESS_OPERATOR_OR_TENANT_AUTHORITY');
    expect(observation).not.toHaveProperty('chunks'); expect(observation).not.toHaveProperty('effectsVerified');
    const { digest, ...body } = observation; expect(digest).toBe(ownershipDigest(body)); receipt('case-01-v2-observations.json', observation);
  });
  actualCase('02', 'links every original and projected key comparison to the actual SQL classes and independent same-transaction pairs', () => {
    const observation = v2();
    const projectedLabels = ['clocker_key', 'week', 'publication_number', 'installation_global', 'active_endpoint_global'];
    expect(new Set(observation.namespaces.filter(n => projectedLabels.includes(n.label)).map(n => n.label))).toEqual(new Set(projectedLabels));
    for (const contract of contracts) {
      const group = contract.kind === 'CANDIDATE' ? observation.namespaces.find(n => n.table === contract.table && n.label === contract.label)
        : observation.originalKeys.find(k => k.table === contract.table && k.kind === contract.kind && k.name === contract.indexName && same(k.columns, contract.columns));
      expect(group).toBeDefined();
      const catalog = chain.keyObservations.catalogs.find(c => c.contractId === contract.contractId)!;
      const sourceRows = chain.snapshot.tables.find(t => t.table === contract.table)!.rows;
      expect(group!.rows).toHaveLength(sourceRows.length);
      for (const row of group!.rows) {
        const source = sourceRows.find(r => same(r.key, row.key))!, key = chain.keyObservations.rows.find(r => r.contractId === contract.contractId && same(r.key, row.key))!;
        expect(row.rowChecksum).toBe(source.originalChecksum); expect(row.included).toBe(key.included);
        expect(row.components).toEqual(contract.columns.map(column => { const c = source.columns.find(v => v.name === column)!;
          return { column, type: c.type, wire: c.wire, sqlNull: c.lineage.nodes[0].value.kind === 'SQL_NULL', lineageChecksum: c.lineage.source.checksum }; }));
        expect(row.comparison).toEqual({ kind: 'DATABASE_KEY_EQUALITY_CLASS', contractId: contract.contractId, comparisonClass: key.comparisonClass,
          captureChecksum: chain.keyObservations.captureChecksum, observationsDigest: chain.keyObservations.digest, catalogChecksum: catalog.checksum });
      }
    }
    expect(referenceSnapshot).toBe(chain.facts.snapshot.id); expect(new Set(sqlPairs.map(p => p.contractId)).size).toBe(6);
    expect(sqlPairs.some(p => p.equal)).toBe(true); expect(sqlPairs.some(p => !p.equal)).toBe(true); expect(sqlPairs.some(p => p.less)).toBe(true);
    for (const pair of sqlPairs) {
      const contract = contracts.find(c => c.contractId === pair.contractId)!;
      const rule = registry.tables.find(t => t.table === contract.table)!;
      const group = contract.kind === 'CANDIDATE' ? observation.namespaces.find(n => n.table === contract.table && n.label === contract.label)!
        : observation.originalKeys.find(k => k.table === contract.table && k.kind === contract.kind && k.name === contract.indexName && same(k.columns, contract.columns))!;
      const findClass = (wire: (string | null)[]) => {
        const source = chain.snapshot.tables.find(t => t.table === contract.table)!.rows.find(r => same(rule.primaryKey.map(c => r.columns.find(v => v.name === c)!.wire), wire))!;
        const row = group.rows.find(r => same(r.key, source.key))!;
        expect(row.comparison.kind).toBe('DATABASE_KEY_EQUALITY_CLASS');
        if (row.comparison.kind !== 'DATABASE_KEY_EQUALITY_CLASS') throw Error('Exact source-bound SQL key comparison required');
        return row.comparison.comparisonClass!;
      };
      const left = findClass(pair.left), right = findClass(pair.right);
      expect(left === right).toBe(pair.equal); expect(BigInt(left) < BigInt(right)).toBe(pair.less);
    }
  });
  actualCase('03', 'preserves full source columns, explicit null/history reviews and the existing selector and expression namespaces', () => {
    const observation = v2();
    for (const row of observation.rows) {
      const source = sourceRow(row.table, row.key); expect(row.rowChecksum).toBe(source.originalChecksum); expect(row.columns).toEqual(source.columns);
      expect(row.columns.map(c => c.name)).toEqual(registry.tables.find(t => t.table === row.table)!.columns.map(c => c.name));
      expect(row.columnReviews.every(isIssuedTypedMigrationCellReferences)).toBe(true);
    }
    const requiredReviews = chain.snapshot.tables.reduce((count, t) => count + t.rows.length * new Set([
      ...registry.tables.find(r => r.table === t.table)!.payloads.map(p => p.column), ...registry.tables.find(r => r.table === t.table)!.typedFields]).size, 0);
    expect(chain.assignments.columns).toHaveLength(requiredReviews);
    expect(chain.assignments.installation!.coveredRows.map(r => ({ table: r.table, key: r.key }))).toEqual(fixtureInstallationRows);
    expect(chain.assignments.mappings.map(m => m.key)).toEqual([[ownedEmployee], [otherEmployee]]);
    const original = sourceRow('employees', [ownedEmployee]); expect(original.columns.find(c => c.name === 'active')!.wire).toBe('f');
    expect(observation.rows.find(r => r.table === 'employees' && same(r.key, [ownedEmployee]))!.key).toEqual([ownedEmployee]);
    const selector = observation.namespaces.find(n => n.table === 'employees' && n.label === 'normalized_number')!;
    expect(selector.scope).toBe('TENANT'); expect(selector.rows.find(r => same(r.key, [ownedEmployee]))!.comparison)
      .toEqual({ kind: 'APP_SELECTOR', original: ownedEmployee, normalized: 'TYPED-EMPLOYEE-A' });
    expect(chain.namespaces.catalogs.map(c => c.contractId)).toEqual(DATABASE_NAMESPACES.map(c => c.contractId).sort());
    for (const raw of chain.namespaces.rows) {
      const contract = DATABASE_NAMESPACES.find(c => c.contractId === raw.contractId)!;
      const group = observation.namespaces.find(n => n.table === contract.table && n.label === contract.label);
      expect(group!.scope).toBe('TENANT'); const row = group!.rows.find(r => same(r.key, raw.key))!;
      expect(row.included).toBe(raw.included); expect(row.comparison).toEqual({ kind: 'DATABASE_EQUALITY_CLASS', contractId: raw.contractId,
        expressionValue: raw.expressionValue, comparisonClass: raw.comparisonClass, captureChecksum: chain.namespaces.captureChecksum });
    }
    const ownedProfile = observation.rows.find(r => r.table === 'employee_scheduling_settings' && same(r.key, [ownedEmployee]))!.columns.find(c => c.name === 'operational_rule_profile')!;
    expect(ownedProfile.lineage.nodes.filter(n => n.value.kind === 'JSON_NUMBER').map(n => n.value)).toEqual(expect.arrayContaining([
      { kind: 'JSON_NUMBER', lexeme: '9007199254740993' }, { kind: 'JSON_NUMBER', lexeme: '9007199254740994' },
      { kind: 'JSON_NUMBER', lexeme: '0.123456789012345678901' }, { kind: 'JSON_NUMBER', lexeme: '1.00' }]));
    expect(observation.rows.find(r => r.table === 'employee_scheduling_settings' && same(r.key, [otherEmployee]))!.columns.find(c => c.name === 'operational_rule_profile')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');
    expect(observation.rows.find(r => r.table === 'calendar_operations')!.columns.find(c => c.name === 'result')!.lineage.nodes[0].value.kind).toBe('JSON_NULL');
    const calendar = observation.rows.find(r => r.table === 'calendar_subscriptions')!, array = calendar.columns.find(c => c.name === 'allowed_location_ids')!;
    expect(array.wire).toBe('[0:1]={loc-1,NULL}'); expect(array.lineage.nodes[1].address).toEqual([{ kind: 'SQL_ARRAY_ELEMENT', ordinal: 0, subscripts: [0] }]);
    expect(array.lineage.nodes[2].value.kind).toBe('SQL_ARRAY_NULL'); expect(calendar.references.filter(r => r.field === 'allowed_location_ids').every(r => !r.historical)).toBe(true);
    const history = observation.rows.find(r => r.table === 'schedule_publication_revision_shifts')!;
    expect(history.references.filter(r => r.historical).map(r => r.key)).toEqual(expect.arrayContaining(fixtureHistoricalLiterals.map(h => [{ kind: 'TEXT', text: h.literal }])));
    expect(chain.assignments.historicalReferences.every(h => h.sourceRowChecksum === history.rowChecksum)).toBe(true);
    expect(observation.rows.filter(r => r.table === 'password_recovery_limits').every(r => r.workspaceId === null)).toBe(true);
    const excluded = observation.namespaces.find(n => n.table === 'push_subscriptions' && n.label === 'active_endpoint_global')!;
    expect(excluded.scope).toBe('GLOBAL'); expect(excluded.rows[0].included).toBe(false);
    expect(excluded.rows[0].comparison).toMatchObject({ kind: 'DATABASE_KEY_EQUALITY_CLASS', comparisonClass: null });
    expect(excluded.rows[0].components.every(c => !c.sqlNull)).toBe(true);
    expect(observation.namespaces.find(n => n.label === 'installation_global')!.scope).toBe('GLOBAL');
    expect(observation.remainingGates).toContain('FRESH_DATABASE_SOURCE_FENCE_AND_OPERATOR_AUTHORITY');
    expect(observation.remainingGates).toContain('TYPED_EXECUTABLE_PLAN_AND_ATOMIC_EFFECT_VERIFICATION');
  });
  actualCase('04', 'retains immutable genuine key observations and issues only pure successor provenance', () => {
    const observation = v2();
    const deeplyFrozen = (value: unknown): boolean => !value || typeof value !== 'object' || Object.isFrozen(value)
      && Object.values(Object.getOwnPropertyDescriptors(value)).every(d => !('value' in d) || deeplyFrozen(d.value));
    expect(deeplyFrozen(observation)).toBe(true); expect(isIssuedTypedSourceConstraintObservations(observation)).toBe(true);
    expect(isIssuedTypedKeyComparatorObservations(observation.keyComparators)).toBe(true);
    expect(Reflect.set(observation, 'keyCaptureChecksum', 'f'.repeat(64))).toBe(false);
    expect(Reflect.set(observation.rows[0], 'rowChecksum', 'f'.repeat(64))).toBe(false);
    expect(Reflect.set(observation.keyComparators.rows[0], 'comparisonClass', '999')).toBe(false);
    expect(isIssuedTypedSourceConstraintObservations({ ...observation })).toBe(false);
    let traps = 0; const proxy = new Proxy(observation, { get() { traps++; throw Error('Unexpected result read'); },
      getPrototypeOf() { traps++; throw Error('Unexpected result reflection'); }, ownKeys() { traps++; throw Error('Unexpected result reflection'); } });
    expect(isIssuedTypedSourceConstraintObservations(proxy)).toBe(false); expect(traps).toBe(0);
    expect(observation.keyComparatorDigest).toBe(chain.keyObservations.digest); expect(observation.keyCaptureChecksum).toBe(chain.keyObservations.captureChecksum);
    expect(observation.keyComparators.verification).toBe('PURE_NOT_DATABASE_OPERATOR_OR_TENANT_AUTHORITY');
  });
  actualCase('05', 'rejects malformed, cloned or proxied prerequisite observations without reading unissued input', () => {
    const inputs: { snapshot: unknown; ownership: unknown; namespaces: unknown; keys: unknown; code: string }[] = [
      { snapshot: { ...chain.snapshot }, ownership: chain.ownership, namespaces: chain.namespaces, keys: chain.keyObservations, code: 'UNISSUED_TYPED_SNAPSHOT' },
      { snapshot: chain.snapshot, ownership: { ...chain.ownership }, namespaces: chain.namespaces, keys: chain.keyObservations, code: 'UNISSUED_TYPED_OWNERSHIP' },
      { snapshot: chain.snapshot, ownership: chain.ownership, namespaces: { ...chain.namespaces }, keys: chain.keyObservations, code: 'UNISSUED_TYPED_NAMESPACES' },
      ...[null, false, {}, { ...chain.keyObservations }, { status: 'VALIDATED', observations: chain.keyObservations }, JSON.parse(canonicalOwnershipJson(chain.keyObservations))]
        .map(keys => ({ snapshot: chain.snapshot, ownership: chain.ownership, namespaces: chain.namespaces, keys, code: 'UNISSUED_TYPED_KEY_COMPARATORS' })),
    ];
    let traps = 0; const proxy = new Proxy(chain.keyObservations, { get() { traps++; throw Error('Unexpected key read'); },
      getPrototypeOf() { traps++; throw Error('Unexpected key reflection'); }, ownKeys() { traps++; throw Error('Unexpected key reflection'); },
      getOwnPropertyDescriptor() { traps++; throw Error('Unexpected key reflection'); } });
    inputs.push({ snapshot: chain.snapshot, ownership: chain.ownership, namespaces: chain.namespaces, keys: proxy, code: 'UNISSUED_TYPED_KEY_COMPARATORS' });
    for (const input of inputs) {
      const result = validateTypedSourceConstraints(input.snapshot, input.ownership, input.namespaces, input.keys);
      expect(result, JSON.stringify(result)).toEqual({ status: 'BLOCKED', diagnostics: [{ code: input.code }] }); expect(result).not.toHaveProperty('observations');
    }
    expect(traps).toBe(0);
  });
  actualCase('06', 'rejects genuinely issued observations from another capture while accepting its own complete new boundary', async () => {
    const other = await captureChain('source-b', false);
    expect(other.facts.fence.generation).not.toBe(chain.facts.fence.generation); expect(other.facts.factsDigest).not.toBe(chain.facts.factsDigest);
    expect(other.keyObservations.captureChecksum).not.toBe(chain.keyObservations.captureChecksum);
    expect(other.facts.sourceDigest).toBe(chain.facts.sourceDigest); expect(other.facts.currentSchemaDigest).toBe(chain.facts.currentSchemaDigest);
    expect(other.facts.tables).toEqual(chain.facts.tables); expect(other.facts.wireRows).toEqual(chain.facts.wireRows);
    for (const [snapshot, ownership, namespaces, keys, code] of [
      [chain.snapshot, chain.ownership, chain.namespaces, other.keyObservations, 'KEY_COMPARATOR_BOUNDARY_DRIFT'],
      [chain.snapshot, other.ownership, chain.namespaces, chain.keyObservations, 'OWNERSHIP_BOUNDARY_DRIFT'],
      [chain.snapshot, chain.ownership, other.namespaces, chain.keyObservations, 'NAMESPACE_BOUNDARY_DRIFT'],
      [other.snapshot, other.ownership, other.namespaces, chain.keyObservations, 'KEY_COMPARATOR_BOUNDARY_DRIFT'],
    ]) {
      const result = validateTypedSourceConstraints(snapshot, ownership, namespaces, keys);
      expect(result, JSON.stringify(result)).toEqual({ status: 'BLOCKED', diagnostics: [{ code }] }); expect(result).not.toHaveProperty('observations');
    }
    const observation = v2(other); expect(observation.boundary).toEqual(other.ownership.boundary);
    expect(observation.keyComparators).toBe(other.keyObservations); expect(observation.keyCaptureChecksum).toBe(other.keyObservations.captureChecksum);
    receipt('case-06-second-v2-observations.json', observation);
  });
});
