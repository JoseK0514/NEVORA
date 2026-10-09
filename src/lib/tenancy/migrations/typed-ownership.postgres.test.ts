import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { captureTypedTenantMigrationFacts, observeMigrationCatalog, type MigrationCaptureRequest, type TypedMigrationCaptureFacts } from './capture.server';
import { canonicalOwnershipJson, getOwnershipRegistry, ownershipDigest, OWNERSHIP_SOURCE, verifyOwnershipSource, type JsonValue } from './ownership';
import { inspectTypedMigrationSnapshot, isIssuedInspectedTypedSnapshot, type InspectedTypedSnapshot, type InspectedTypedSnapshotRow } from './typed-snapshot';
import { isIssuedTypedDatabaseNamespaceObservations, validateTypedDatabaseNamespaceComparators } from './namespace-comparators';
import { getTypedReferenceColumnContract, isIssuedTypedMigrationCellReferences, validateTypedMigrationCellReferences, type TypedReferenceClassificationInput } from './typed-reference';
import { isIssuedTypedOwnershipSourceObservations, validateTypedSnapshotOwnership, type TypedOwnershipAssignments } from './typed-ownership';

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
const fixtureInstallationRows = [{ table: 'calendar_clock', key: [true] }, { table: 'schedule_week_settings', key: ['2026-10-05'] }];
const fixtureHistoricalLiterals = [
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'shifts', literal: 'deleted typed shift' },
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'schedules', literal: 'deleted typed schedule' },
  // This source family requires history even when the location still exists.
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'locations', literal: 'loc-1' },
  { table: 'schedule_publication_revision_shifts', key: [historyId], target: 'employees', literal: 'retired typed employee' },
];
const same = (a: unknown, b: unknown) => canonicalOwnershipJson(a) === canonicalOwnershipJson(b);
const quoted = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";

describe.skipIf(!leasePath)('owned PostgreSQL18 complete typed ownership observations', () => {
  type Lease = { closed: boolean; root: string; data: string; port: number; pid: number; pidStart: string; credentialFile: string; user: string;
    database: string; databaseOid: number; systemIdentifier: string; marker: string };
  let lease: Lease, runDirectory: string;
  let admin: Client | undefined, client: Client | undefined;
  let database: { name: string; oid: string; marker: string } | undefined;
  let request: MigrationCaptureRequest, facts: TypedMigrationCaptureFacts, snapshot: InspectedTypedSnapshot, assignments: TypedOwnershipAssignments;
  let initialRows: Record<string, { columns: string[]; rows: (string | null)[][] }> | undefined;
  const caseReceipts: { id: string; name: string; status: 'PASS' | 'FAIL' }[] = [];
  const receipt = (name: string, value: unknown) => writeFileSync(join(runDirectory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const connect = (name: string) => new Client({ host: '127.0.0.1', port: lease.port, user: lease.user,
    password: readFileSync(lease.credentialFile, 'utf8'), database: name, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
  const sourceRow = (table: string, key: readonly JsonValue[]): InspectedTypedSnapshotRow => {
    const rows = snapshot.tables.find(t => t.table === table)?.rows.filter(r => same(r.key, key));
    if (rows?.length !== 1) throw Error('Exact named fictional source row required'); return rows[0];
  };
  async function originalRows() {
    if (!client) throw Error('Owned client unavailable');
    const rows: NonNullable<typeof initialRows> = {};
    for (const table of registry.tables) {
      // Native PostgreSQL text-wire parsers retain bpchar padding, timestamps,
      // JSON numeric spelling and array lower bounds; never to_jsonb/Number.
      const result = await client.query<(string | null)[]>({ text: 'SELECT ' + table.columns.map(c => quoted(c.name)).join(',') + ' FROM public.' + quoted(table.table),
        rowMode: 'array', types: { getTypeParser: () => (value: string) => value } });
      rows[table.table] = { columns: table.columns.map(c => c.name), rows: result.rows.sort((a, b) => {
        const x = canonicalOwnershipJson(a), y = canonicalOwnershipJson(b); return x < y ? -1 : x > y ? 1 : 0;
      }) };
    }
    return rows;
  }
  async function unarmedFence() {
    if (!client) throw Error('Owned client unavailable');
    expect((await client.query('SELECT phase,fence_generation::text generation,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol')).rows)
      .toEqual([{ phase: 'FENCED', generation: facts.fence.generation, backfill_actor: null, capture_manifest_sha256: null }]);
  }
  function copiedAssignments(): TypedOwnershipAssignments {
    return { boundary: { ...assignments.boundary }, mappings: assignments.mappings.map(m => ({ ...m, key: [...m.key] })),
      historicalReferences: assignments.historicalReferences.map(h => ({ ...h, targetColumns: [...h.targetColumns], key: h.key.map(k => ({ ...k })) })),
      installation: assignments.installation === null ? null : { ...assignments.installation, coveredRows: assignments.installation.coveredRows.map(c => ({ ...c, key: [...c.key] })) },
      // Retain genuine private issuance; cloning classifications would not
      // test ancestry and could accidentally replace the intended negative.
      columns: assignments.columns.map(c => ({ ...c, key: [...c.key] })) };
  }
  function blocked(input: TypedOwnershipAssignments, code: string) {
    const result = validateTypedSnapshotOwnership(snapshot, input);
    expect(result).toEqual({ status: 'BLOCKED', code }); expect(result).not.toHaveProperty('observations');
  }
  function reviewedFixtureAssignments(): TypedOwnershipAssignments {
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
      const row = sourceRow(witness.table, witness.key);
      result.historicalReferences.push({ target: witness.target, targetColumns: ['id'], key: [{ kind: 'TEXT', text: witness.literal }], workspaceId: 'workspace-fuel',
        sourceRowChecksum: row.originalChecksum, evidenceDigest: ownershipDigest({ fictionalRetainedWitness: witness, referencingRowChecksum: row.originalChecksum }) });
    }
    return result;
  }
  function actualCase(id: string, name: string, check: () => Promise<void> | void) {
    it(name, async () => {
      let status: 'PASS' | 'FAIL' = 'FAIL';
      try { await check(); expect(await originalRows()).toEqual(initialRows); await unarmedFence(); status = 'PASS'; }
      finally { const item = { id, name, status }; caseReceipts.push(item); receipt('case-' + id + '.json', { ...item, actualRootInvocation: true,
        sourceDigest: facts.sourceDigest, factsDigest: facts.factsDigest, namespaceCaptureChecksum: snapshot.namespaceCaptureChecksum,
        snapshotId: snapshot.snapshotId, fenceGeneration: snapshot.fenceGeneration, claim: 'OWNED_SINGLE_WORKSPACE_CAPTURE_AND_PURE_BOUND_CHECKS_NOT_F10_OR_RLS' }); }
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
    await client.query("INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2026-10-05',NULL,$1)", [ownedEmployee]);
    await client.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('typed-revision','2026-10-05',1,'MANAGER_MUTATION',NULL,$1)", [ownedEmployee]);
    await client.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES($1,'typed-revision','deleted typed shift','deleted typed schedule','loc-1','retired typed employee','2026-10-06','08:00:00.123456','09:00:00.123456','Fictional retained literal Ω')", [historyId]);
    await client.query("INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids,revoked_at,revocation_reason) VALUES($1,'workspace-fuel',$2,$3,'00000000-0000-4000-8000-000000000072','[0:1]={loc-1,NULL}'::text[],clock_timestamp(),'fictional retired history')", [subscriptionId, ownedEmployee, 'e'.repeat(64)]);
    await client.query("INSERT INTO calendar_operations(workspace_id,actor_employee_id,operation_id,authority,payload_hash,result) VALUES('workspace-fuel',$1,$2,$3,$3,'null'::jsonb)", [ownedEmployee, operationId, 'a'.repeat(64)]);
    await client.query("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',9223372036854775807,7)");
    const expansion = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
    const expansionSha256 = createHash('sha256').update(expansion).digest('hex'); expect(expansionSha256).toBe('fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb');
    await client.query(expansion); initialRows = await originalRows();
    expect((await client.query('SELECT count(*)::int n FROM workspaces')).rows[0].n).toBe(1);
    for (const table of ['employee_credentials', 'employee_sessions', 'notifications', 'push_deliveries', 'communications']) expect((await client.query('SELECT count(*)::int n FROM ' + quoted(table))).rows[0].n).toBe(0);
    await client.query('SET search_path=pg_catalog'); const catalog = await observeMigrationCatalog(client); await client.query('SET search_path=public');
    const sourceManifest = JSON.parse(readFileSync(join(runDirectory, 'pre-invocation-source.json'), 'utf8'));
    request = { identity: { database: name, databaseOid: oid, marker, systemIdentifier: lease.systemIdentifier, dataDirectory: lease.data, role: lease.user, port: lease.port }, migrations,
      sourceDigest: sourceManifest.sourceDigest, catalogBaseline: { sourceDigest: sourceManifest.sourceDigest, expansionSha256, registryDigest: registry.digest, catalogDigest: catalog.digest }, expectedFenceGeneration: '0' };
    const captured = await captureTypedTenantMigrationFacts(client, request); expect(captured.status, JSON.stringify(captured)).toBe('CAPTURED');
    if (captured.status !== 'CAPTURED') throw Error('Root-owned actual typed capture required'); facts = captured.facts;
    const inspected = inspectTypedMigrationSnapshot(facts, { sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest, snapshotId: facts.snapshot.id,
      fenceGeneration: facts.fence.generation, factsDigest: facts.factsDigest }); expect(inspected.status, JSON.stringify(inspected)).toBe('INSPECTED');
    if (inspected.status !== 'INSPECTED') throw Error('Complete actual typed snapshot required'); snapshot = inspected.snapshot;
    expect(isIssuedInspectedTypedSnapshot(snapshot)).toBe(true);
    const namespace = validateTypedDatabaseNamespaceComparators(snapshot, facts.namespaceComparators, migrations); expect(namespace.status, JSON.stringify(namespace)).toBe('VALIDATED');
    if (namespace.status !== 'VALIDATED') throw Error('Actual captured namespace validation required'); expect(isIssuedTypedDatabaseNamespaceObservations(namespace.observations)).toBe(true);
    assignments = reviewedFixtureAssignments(); await unarmedFence();
    receipt('source-generated-catalog.json', { ...catalog, binding: request.catalogBaseline }); receipt('captured-facts.json', facts);
    receipt('explicit-fixture-review.json', assignments);
    receipt('open-fixture-gates.json', { singleWorkspaceOnly: true, preservedGuard: '0008 CHECK(singleton) + UNIQUE(singleton)',
      open: ['ACTUAL_POST_CUTOVER_A_B_TENANT_CAPTURE', 'ACTUAL_CURRENT_PHYSICAL_CROSS_OWNER_REJECTION', 'ACTUAL_ARRAY_CROSS_OWNER_REJECTION'],
      distinction: 'No altered/pure invented two-workspace capture substitutes for actual database coverage.' });
  }, 30000);

  afterAll(async () => {
    const failures: string[] = [], closedClients: string[] = [];
    try {
      if (client) { await client.query('ROLLBACK'); if (initialRows) { const finalRows = await originalRows(); receipt('final-original-rows.json', finalRows); expect(finalRows).toEqual(initialRows); }
        if (facts) await unarmedFence(); }
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
    if (runDirectory) receipt('typed-ownership-case-receipts.json', { cases: caseReceipts, closedClients, failures, actualRootInvocation: true, crossOwnerFixtureGates: 'OPEN_POST_CUTOVER' });
    if (failures.length) throw Error('Owned fixture preservation/cleanup unconfirmed; retain the exact custody and failure receipts');
  });

  actualCase('01', 'resolves all68 actual source tables with explicit immutable/installation ownership and complete issued reviews', () => {
    const outcome = validateTypedSnapshotOwnership(snapshot, assignments); expect(outcome.status, JSON.stringify(outcome)).toBe('RESOLVED_SOURCE_OBSERVATIONS');
    if (outcome.status !== 'RESOLVED_SOURCE_OBSERVATIONS') throw Error('Expected exact actual source ancestry'); const o = outcome.observations;
    expect(isIssuedTypedOwnershipSourceObservations(o)).toBe(true); expect(o.tables).toHaveLength(68); expect(o.tables).toEqual(facts.tables.map(t => ({ table: t.table, count: t.expectedCount, checksum: t.expectedChecksum })));
    expect(o.rows).toHaveLength(facts.tables.reduce((n, t) => n + t.expectedCount, 0)); expect(o.rows.find(r => r.table === 'password_recovery_limits')?.workspaceId).toBeNull();
    expect(o.rows.filter(r => r.table !== 'password_recovery_limits').every(r => r.workspaceId === 'workspace-fuel')).toBe(true);
    expect(o.verification).toBe('PURE_NOT_DB_OPERATOR_TENANT_AUTHORITY'); expect(o.remainingGates).toContain('FRESH_DATABASE_SOURCE_FENCE_AND_OPERATOR_AUTHORITY');
    expect(o.namespaceCaptureChecksum).toBe(facts.namespaceComparators.captureChecksum); expect(o).not.toHaveProperty('chunks'); expect(o).not.toHaveProperty('effectsVerified');
  });
  actualCase('02', 'preserves actual unsafe JSON numeric differences, SQLNULL/JSONnull, padded keys and native array bounds', () => {
    const profile = sourceRow('employee_scheduling_settings', [ownedEmployee]).columns.find(c => c.name === 'operational_rule_profile')!;
    expect(profile.lineage.nodes.filter(n => n.value.kind === 'JSON_NUMBER').map(n => n.value)).toEqual(expect.arrayContaining([
      { kind: 'JSON_NUMBER', lexeme: '9007199254740993' }, { kind: 'JSON_NUMBER', lexeme: '9007199254740994' },
      { kind: 'JSON_NUMBER', lexeme: '0.123456789012345678901' }, { kind: 'JSON_NUMBER', lexeme: '1.00' }]));
    expect(sourceRow('employees', [ownedEmployee]).key).toEqual([ownedEmployee]); expect(sourceRow('employees', [ownedEmployee]).columns.find(c => c.name === 'active')?.wire).toBe('f');
    expect(sourceRow('employee_scheduling_settings', [otherEmployee]).columns.find(c => c.name === 'operational_rule_profile')?.lineage.nodes[0].value.kind).toBe('SQL_NULL');
    expect(sourceRow('calendar_operations', ['workspace-fuel', ownedEmployee, operationId]).columns.find(c => c.name === 'result')?.lineage.nodes[0].value.kind).toBe('JSON_NULL');
    const array = sourceRow('calendar_subscriptions', [subscriptionId]).columns.find(c => c.name === 'allowed_location_ids')!;
    expect(array.wire).toBe('[0:1]={loc-1,NULL}'); expect(array.lineage.nodes[1].address).toEqual([{ kind: 'SQL_ARRAY_ELEMENT', ordinal: 0, subscripts: [0] }]);
    expect(array.lineage.nodes[2].value.kind).toBe('SQL_ARRAY_NULL'); expect(sourceRow('password_recovery_limits', ['global', '9223372036854775807']).columns.find(c => c.name === 'bucket')?.wire).toBe('9223372036854775807');
    expect(sourceRow('schedule_publication_revision_shifts', [historyId]).columns.find(c => c.name === 'start_time')?.wire).toBe('08:00:00.123456');
  });
  actualCase('03', 'uses explicit row-checksum retained witnesses for deleted literals and never substitutes current location data', () => {
    for (const [table, id] of [['shifts', 'deleted typed shift'], ['schedules', 'deleted typed schedule'], ['employees', 'retired typed employee']])
      expect(snapshot.tables.find(t => t.table === table)!.rows.some(r => same(r.key, [id]))).toBe(false);
    const result = validateTypedSnapshotOwnership(snapshot, assignments); if (result.status !== 'RESOLVED_SOURCE_OBSERVATIONS') throw Error(result.code);
    const history = result.observations.rows.find(r => r.table === 'schedule_publication_revision_shifts')!;
    expect(history.references.filter(r => r.historical).map(r => r.key)).toEqual(expect.arrayContaining([[{ kind: 'TEXT', text: 'retired typed employee' }], [{ kind: 'TEXT', text: 'deleted typed shift' }]]));
    expect(history.references.some(r => r.historical && same(r.key, [{ kind: 'TEXT', text: 'loc-1' }]))).toBe(true);
    const noCurrentSubstitute = copiedAssignments(); noCurrentSubstitute.historicalReferences = noCurrentSubstitute.historicalReferences.filter(h => !(h.target === 'locations' && h.sourceRowChecksum === sourceRow('schedule_publication_revision_shifts', [historyId]).originalChecksum));
    expect(snapshot.tables.find(t => t.table === 'locations')!.rows.some(r => same(r.key, ['loc-1']))).toBe(true); blocked(noCurrentSubstitute, 'RETAINED_HISTORY_REQUIRED');
  });
  actualCase('04', 'rejects absent, wrong-owner and wrong-row-checksum historical witnesses against the real capture', () => {
    const missing = copiedAssignments(); missing.historicalReferences = []; blocked(missing, 'RETAINED_HISTORY_REQUIRED');
    const wrongOwner = copiedAssignments(); wrongOwner.historicalReferences[0].workspaceId = 'fictional-foreign-workspace'; blocked(wrongOwner, 'RETAINED_HISTORY_OWNER_CONFLICT');
    const checksum = copiedAssignments(); checksum.historicalReferences[0].sourceRowChecksum = 'f'.repeat(64); blocked(checksum, 'RETAINED_HISTORY_REQUIRED');
  });
  actualCase('05', 'requires every source field review including SQLNULL and rejects cloned or wrong-row issued reviews', () => {
    const missing = copiedAssignments(); missing.columns = missing.columns.filter(c => !(c.table === 'employee_scheduling_settings' && same(c.key, [otherEmployee]))); blocked(missing, 'COLUMN_REVIEW_REQUIRED');
    const forged = copiedAssignments(); forged.columns[0].classification = { ...forged.columns[0].classification }; blocked(forged, 'UNISSUED_COLUMN_REVIEW');
    const attached = copiedAssignments(), row = attached.columns.find(c => c.table === 'employee_scheduling_settings' && same(c.key, [otherEmployee]))!;
    row.classification = attached.columns.find(c => c.table === 'employee_scheduling_settings' && same(c.key, [ownedEmployee]))!.classification; blocked(attached, 'COLUMN_REVIEW_SOURCE_DRIFT');
    const changed = copiedAssignments(); changed.columns[0].rowChecksum = 'f'.repeat(64); blocked(changed, 'COLUMN_REVIEW_SOURCE_DRIFT');
  });
  actualCase('06', 'rejects absent/drifted/foreign nonexistent immutable owners and preserves the exact padded SQL key', () => {
    const missing = copiedAssignments(); missing.mappings = []; blocked(missing, 'IMMUTABLE_MAPPING_REQUIRED');
    const owner = copiedAssignments(); owner.mappings[0].workspaceId = 'fictional-foreign-workspace'; blocked(owner, 'OWNERSHIP_WORKSPACE_MISSING');
    const checksum = copiedAssignments(); checksum.mappings[0].rowChecksum = 'f'.repeat(64); blocked(checksum, 'IMMUTABLE_MAPPING_DRIFT');
    const normalized = copiedAssignments(); normalized.mappings.find(m => same(m.key, [ownedEmployee]))!.key = [ownedEmployee.trim()]; blocked(normalized, 'IMMUTABLE_MAPPING_REQUIRED');
  });
  actualCase('07', 'requires exact singleton row coverage and rejects wrong/unused installation evidence without default inference', () => {
    const missing = copiedAssignments(); missing.installation = null; blocked(missing, 'INSTALLATION_PROVENANCE_REQUIRED');
    const checksum = copiedAssignments(); checksum.installation!.coveredRows[0].rowChecksum = 'f'.repeat(64); blocked(checksum, 'INSTALLATION_PROVENANCE_DRIFT');
    const owner = copiedAssignments(); owner.installation!.workspaceId = 'fictional-foreign-workspace'; blocked(owner, 'OWNERSHIP_WORKSPACE_MISSING');
    const extra = copiedAssignments(); extra.installation!.coveredRows.push({ table: 'employees', key: [ownedEmployee], rowChecksum: sourceRow('employees', [ownedEmployee]).originalChecksum }); blocked(extra, 'UNCONSUMED_INSTALLATION');
  });
  actualCase('08', 'rejects independently retained boundary, original wire/checksum and namespace witness drift', () => {
    for (const key of ['registryDigest', 'sourceDigest', 'currentSchemaDigest', 'factsDigest', 'snapshotId', 'fenceGeneration'] as const) {
      const changed = copiedAssignments(); changed.boundary[key] = key === 'snapshotId' ? 'other-snapshot' : key === 'fenceGeneration' ? '999' : 'f'.repeat(64); blocked(changed, 'OWNERSHIP_BOUNDARY_DRIFT');
    }
    const boundary = { sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest, snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation, factsDigest: facts.factsDigest };
    expect(inspectTypedMigrationSnapshot(facts, { ...boundary, sourceDigest: 'f'.repeat(64) })).toEqual({ status: 'BLOCKED', code: 'TYPED_SNAPSHOT_BOUNDARY_DRIFT' });
    const changedFacts = { ...facts, tables: facts.tables.map(t => t.table === 'employees' ? { ...t, rows: t.rows.map((r, i) => i === 0 ? { ...r, originalChecksum: 'f'.repeat(64) } : r) } : t) };
    expect(inspectTypedMigrationSnapshot(changedFacts, boundary)).toEqual({ status: 'BLOCKED', code: 'TYPED_SNAPSHOT_ROW_CHECKSUM_DRIFT' });
    const namespace = { ...facts.namespaceComparators, binding: { ...facts.namespaceComparators.binding, sourceDigest: 'f'.repeat(64) } };
    expect(validateTypedDatabaseNamespaceComparators(snapshot, namespace, request.migrations).status).toBe('BLOCKED');
    expect(validateTypedSnapshotOwnership({ ...snapshot }, assignments)).toEqual({ status: 'BLOCKED', code: 'UNISSUED_TYPED_SNAPSHOT' });
  });
  actualCase('09', 'keeps revoked calendar scope as current location references and rejects historical substitution', () => {
    const row = sourceRow('calendar_subscriptions', [subscriptionId]);
    const cell = row.columns.find(c => c.name === 'allowed_location_ids')!;
    const attached = assignments.columns.find(c => c.table === 'calendar_subscriptions' && c.column === 'allowed_location_ids')!.classification;
    expect(attached.references.every(r => !r.historicalRequired && !r.historicalRequested)).toBe(true);
    const c = attached.contract;
    const claims = attached.classifications.map(o => o.classification.kind === 'REFERENCE' ? { ...o.classification, historical: true } : o.classification);
    expect(validateTypedMigrationCellReferences(cell.lineage, { binding: { schemaCommit: c.source.schemaCommit, schemaTree: c.source.schemaTree,
      schemaDigest: c.source.schemaDigest, registryDigest: c.source.registryDigest, table: c.table, column: c.column,
      contractChecksum: c.checksum, sourceChecksum: cell.lineage.source.checksum }, reviewEvidenceDigest: attached.reviewEvidenceDigest,
      classifications: claims, unresolvedAddresses: [] })).toEqual({ status: 'BLOCKED', code: 'CALENDAR_HISTORY_CONFLICT' });
  });
});
