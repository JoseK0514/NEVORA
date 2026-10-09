import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { appendFileSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { captureTypedTenantMigrationFactsWithKeyComparators, observeMigrationCatalog, type MigrationCaptureRequest, type TypedMigrationCaptureFacts } from './capture.server';
import { canonicalOwnershipJson, getOwnershipRegistry, ownershipDigest, OWNERSHIP_SOURCE, verifyOwnershipSource, type JsonValue } from './ownership';
import { inspectTypedMigrationSnapshot, isIssuedInspectedTypedSnapshot, type InspectedTypedSnapshot, type InspectedTypedSnapshotRow } from './typed-snapshot';
import { getTypedKeyComparatorContracts, isIssuedTypedKeyComparatorObservations, validateTypedKeyComparators, type TypedKeyComparatorObservations } from './typed-key-comparators';
import { isIssuedTypedDatabaseNamespaceObservations, validateTypedDatabaseNamespaceComparators, type TypedDatabaseNamespaceObservations } from './namespace-comparators';
import { getTypedReferenceColumnContract, isIssuedTypedMigrationCellReferences, validateTypedMigrationCellReferences, type TypedReferenceClassificationInput } from './typed-reference';
import { isIssuedTypedOwnershipSourceObservations, validateTypedSnapshotOwnership, type TypedOwnershipAssignments, type TypedOwnershipSourceObservations } from './typed-ownership';
import { isIssuedTypedSourceConstraintObservations, validateTypedSourceConstraints, type TypedSourceConstraintWithKeysObservations } from './typed-constraints';
import { compileTypedTenantBackfill, isIssuedTypedTenantBackfillPlan, type TypedTenantBackfillPlan } from './typed-backfill';
import { executeGuardedTypedLocalBackfill } from './typed-guarded-backfill.server';
import type { OwnedLocalBackfillIdentity } from './guarded-backfill.server';

// Opt-in root invocation only. No fixture startup, ambient URL, role creation,
// foreign database, provider, runtime tenant authority or F10 completion claim.
// Root supplies two exact pre-created nonowner operators and the owned lease.
const leasePath = process.env.F_BACKFILL_OWNED_LEASE;
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

const detachedPushId = 'fictional-detached-key-comparator-push';
const same = (a: unknown, b: unknown) => canonicalOwnershipJson(a) === canonicalOwnershipJson(b);
const quoted = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";


describe.skipIf(!leasePath)('owned PostgreSQL18 typed whole-plan atomic backfill', () => {
  type Lease = { closed: false; scope: 'OWNED_LOCAL_F10'; root: string; data: string; port: number; pid: number; pidStart: string;
    credentialFile: string; user: string; database: string; databaseOid: string; systemIdentifier: string; marker: string;
    authorizationReference: string; operatorRoles: { name: string; catalog: string[] }[] };
  type OriginalRows = Record<string, { columns: string[]; rows: (string | null)[][] }>;
  type Chain = { facts: TypedMigrationCaptureFacts; snapshot: InspectedTypedSnapshot; ownership: TypedOwnershipSourceObservations;
    namespaces: TypedDatabaseNamespaceObservations; keys: TypedKeyComparatorObservations; constraints: TypedSourceConstraintWithKeysObservations;
    assignments: TypedOwnershipAssignments; plan: TypedTenantBackfillPlan };
  type Request = { mode: 'OWNED_LOCAL'; identity: OwnedLocalBackfillIdentity; facts: TypedMigrationCaptureFacts;
    captureRequest: MigrationCaptureRequest; plan: TypedTenantBackfillPlan; authority: { reference: string; operatorRole: string; factsDigest: string; planDigest: string } };
  type Fixture = { id: string; name: string; oid: string; marker: string; observer: Client; first: Client; second: Client;
    original: OriginalRows; chain: Chain; request: Request; queries: string[]; finalCatalogChanges?: '0027_VALIDATION' };
  let lease: Lease, runDirectory: string, admin: Client | undefined;
  const clients = new Map<Client, string>(), databases: { name: string; oid: string; marker: string }[] = [];
  const fixtures: Fixture[] = [], cases: { id: string; name: string; status: 'PASS' | 'FAIL' }[] = [];
  const receipt = (name: string, value: unknown) => writeFileSync(join(runDirectory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  function sourceRow(snapshot: InspectedTypedSnapshot, table: string, key: readonly JsonValue[]): InspectedTypedSnapshotRow {
    const rows = snapshot.tables.find(t => t.table === table)?.rows.filter(r => same(r.key, key));
    if (rows?.length !== 1) throw Error('Exact named fictional source row required'); return rows[0];
  }
  async function connect(name: string, role = lease.user) {
    const c = new Client({ host: '127.0.0.1', port: lease.port, user: role, password: readFileSync(lease.credentialFile, 'utf8'),
      database: name, connectionTimeoutMillis: 3000, statement_timeout: 15000 });
    clients.set(c, name + ':' + role); await c.connect(); await c.query("SET search_path=pg_catalog; SET DateStyle='ISO, YMD'; SET TimeZone='UTC'"); return c;
  }
  async function originalRows(c: Client): Promise<OriginalRows> {
    const tables: OriginalRows = {};
    for (const t of registry.tables) {
      const result = await c.query<(string | null)[]>({ text: 'SELECT ' + t.columns.map(col => quoted(col.name)).join(',') + ' FROM public.' + quoted(t.table),
        rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } });
      expect(result.fields.map(f => f.name)).toEqual(t.columns.map(c => c.name));
      tables[t.table] = { columns: t.columns.map(col => col.name), rows: result.rows.sort((a, b) => {
        const x = canonicalOwnershipJson(a), y = canonicalOwnershipJson(b); return x < y ? -1 : x > y ? 1 : 0;
      }) };
    }
    return tables;
  }
  async function metadata(f: Fixture) {
    const rows = (await f.observer.query('SELECT phase,fence_generation::text generation,backfill_actor::text actor,capture_manifest_sha256 manifest FROM nevora_tenancy.expansion_protocol WHERE migration_id=26')).rows;
    expect(rows).toHaveLength(1); return rows[0];
  }
  async function targets(f: Fixture) {
    const result: Record<string, (string | null)[][]> = {};
    for (const t of registry.tables) {
      if (t.storage === 'DIRECT_IMMUTABLE' && t.anchor.kind !== 'ROOT' && !t.columns.some(c => c.name === 'workspace_id')) {
        const rows = await f.observer.query<(string | null)[]>({ text: 'SELECT ' + [...t.primaryKey, 'workspace_id'].map(quoted).join(',') + ' FROM public.' + quoted(t.table),
          rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } });
        result[t.table] = rows.rows.sort((a, b) => canonicalOwnershipJson(a) < canonicalOwnershipJson(b) ? -1 : canonicalOwnershipJson(a) > canonicalOwnershipJson(b) ? 1 : 0);
      }
      if (t.sidecar) {
        const columns = [...new Set([...t.primaryKey, ...t.mirroredIdentityColumns])].sort();
        const rows = await f.observer.query<(string | null)[]>({ text: 'SELECT ' + [...columns, 'workspace_id', 'source_checksum_sha256', 'capture_manifest_sha256'].map(quoted).join(',') + ' FROM public.' + quoted(t.sidecar),
          rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } });
        result[t.sidecar] = rows.rows.sort((a, b) => canonicalOwnershipJson(a) < canonicalOwnershipJson(b) ? -1 : canonicalOwnershipJson(a) > canonicalOwnershipJson(b) ? 1 : 0);
      }
    }
    return result;
  }
  async function expectUnapplied(f: Fixture) {
    expect(await originalRows(f.observer)).toEqual(f.original);
    expect(await metadata(f)).toEqual({ phase: 'FENCED', generation: f.chain.facts.fence.generation, actor: null, manifest: null });
    const observed = await targets(f);
    for (const t of registry.tables) {
      if (Object.hasOwn(observed, t.table)) expect(observed[t.table].every(r => r[r.length - 1] === null)).toBe(true);
      if (t.sidecar) expect(observed[t.sidecar]).toEqual([]);
    }
  }
  async function expectApplied(f: Fixture) {
    expect(await originalRows(f.observer)).toEqual(f.original);
    expect(await metadata(f)).toEqual({ phase: 'FENCED', generation: f.chain.facts.fence.generation, actor: null, manifest: f.chain.plan.digest });
    const observed = await targets(f);
    for (const t of registry.tables) {
      const rows = f.chain.snapshot.tables.find(s => s.table === t.table)!.rows;
      if (Object.hasOwn(observed, t.table)) {
        const expected = rows.map(r => [...t.primaryKey.map(k => r.columns.find(c => c.name === k)!.wire), 'workspace-fuel'])
          .sort((a, b) => canonicalOwnershipJson(a) < canonicalOwnershipJson(b) ? -1 : canonicalOwnershipJson(a) > canonicalOwnershipJson(b) ? 1 : 0);
        expect(observed[t.table]).toEqual(expected);
      }
      if (t.sidecar) {
        const columns = [...new Set([...t.primaryKey, ...t.mirroredIdentityColumns])].sort();
        const expected = rows.map(r => [...columns.map(k => r.columns.find(c => c.name === k)!.wire), 'workspace-fuel', r.originalChecksum, f.chain.plan.digest])
          .sort((a, b) => canonicalOwnershipJson(a) < canonicalOwnershipJson(b) ? -1 : canonicalOwnershipJson(a) > canonicalOwnershipJson(b) ? 1 : 0);
        expect(observed[t.sidecar]).toEqual(expected);
      }
    }
    expect(observed.clocker_pin_events_tenant_ownership).toHaveLength(1);
    expect(observed.schedule_publication_revision_shifts_tenant_ownership).toHaveLength(1);
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
      const row = sourceRow(snapshot, witness.table, witness.key);
      result.historicalReferences.push({ target: witness.target, targetColumns: ['id'], key: [{ kind: 'TEXT', text: witness.literal }], workspaceId: 'workspace-fuel',
        sourceRowChecksum: row.originalChecksum, evidenceDigest: ownershipDigest({ fictionalRetainedWitness: witness, referencingRowChecksum: row.originalChecksum }) });
    }
    return result;
  }

  async function fixture(id: string): Promise<Fixture> {
    if (!admin) throw Error('Root owned base connection required');
    const name = lease.database + '_case_' + randomBytes(5).toString('hex'), marker = lease.marker + ':case:' + name;
    expect(Buffer.byteLength(name)).toBeLessThanOrEqual(63); expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount).toBe(0);
    appendFileSync(join(runDirectory, 'child-custody.jsonl'), JSON.stringify({ id, name, marker, stage: 'BEFORE_OWN_CREATE' }) + '\n', { mode: 0o600 });
    await admin.query('CREATE DATABASE ' + quoted(name));
    const oid = (await admin.query('SELECT oid::text oid FROM pg_database WHERE datname=$1', [name])).rows[0].oid;
    databases.push({ name, oid, marker }); await admin.query('COMMENT ON DATABASE ' + quoted(name) + ' IS ' + literal(marker));
    appendFileSync(join(runDirectory, 'child-custody.jsonl'), JSON.stringify({ id, name, oid, marker, stage: 'OWN_OID_MARKED' }) + '\n');
    const observer = await connect(name); await observer.query('SET search_path=public');
    const migrations = OWNERSHIP_SOURCE.map(s => ({ path: s.path, text: readFileSync(resolve(s.path), 'utf8') }));
    expect(verifyOwnershipSource(migrations)).toEqual([]); expect(migrations).toHaveLength(25);
    for (const migration of migrations) await observer.query(migration.text);
    await observer.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active,email,created_at) VALUES($1,'Fictional','Typed A','000','EMPLOYEE','loc-1',false,'TypedA@Example.invalid','2026-10-09 01:02:03.123456+00'),($2,'Fictional','Typed B','000','EMPLOYEE','loc-2',false,NULL,'2026-10-09 01:02:03.000001+00')", [ownedEmployee, otherEmployee]);
    await observer.query("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES($1,39.10,'{\"numberA\":9007199254740993,\"numberB\":9007199254740994,\"fraction\":0.123456789012345678901,\"scale\":1.00}'::jsonb),($2,40.00,NULL)", [ownedEmployee, otherEmployee]);
    await observer.query("INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2026-10-05',NULL,$1),('2026-10-12',NULL,$1)", [ownedEmployee]);
    await observer.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,source_id,created_by) VALUES('typed-revision','2026-10-05',1,'MANAGER_MUTATION',NULL,$1),('typed-revision-b','2026-10-12',2,'MANAGER_MUTATION',NULL,$1)", [ownedEmployee]);
    await observer.query("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES($1,'typed-revision','deleted typed shift','deleted typed schedule','loc-1','retired typed employee','2026-10-06','08:00:00.123456','09:00:00.123456','Fictional retained literal Ω')", [historyId]);
    await observer.query("INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids,revoked_at,revocation_reason) VALUES($1,'workspace-fuel',$2,$3,'00000000-0000-4000-8000-000000000072','[0:1]={loc-1,NULL}'::text[],clock_timestamp(),'fictional retired history')", [subscriptionId, ownedEmployee, 'e'.repeat(64)]);
    await observer.query("INSERT INTO calendar_operations(workspace_id,actor_employee_id,operation_id,authority,payload_hash,result) VALUES('workspace-fuel',$1,$2,$3,$3,'null'::jsonb)", [ownedEmployee, operationId, 'a'.repeat(64)]);
    await observer.query("INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',9223372036854775807,7),('global',9223372036854775806,7)");
    await observer.query("INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status) VALUES($1,$2,'fictional-key-installation','test','fictional-key-endpoint',NULL,'fictional-key-generation','fictional-noncredential-session-marker','detached')", [detachedPushId, ownedEmployee]);
    await observer.query("INSERT INTO public.clocker_pin_events(id,employee_id,actor_employee_id,pin_version,occurred_at) VALUES('typed-fixture-pin',$1,$1,1,'2026-10-09 01:02:03.123456+00')", [ownedEmployee]);

    const expansion = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
    const expansionSha256 = createHash('sha256').update(expansion).digest('hex');
    expect(expansionSha256).toBe('fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb');
    await observer.query(expansion);
    const roles = lease.operatorRoles.map(r => quoted(r.name)).join(',');
    await observer.query('GRANT USAGE ON SCHEMA public,nevora_tenancy TO ' + roles);
    await observer.query('GRANT SELECT,UPDATE ON ' + registry.tables.map(t => 'public.' + quoted(t.table)).join(',') + ' TO ' + roles);
    await observer.query('GRANT SELECT,INSERT,UPDATE ON public.clocker_pin_events_tenant_ownership,public.schedule_publication_revision_shifts_tenant_ownership TO ' + roles);
    await observer.query('GRANT SELECT,UPDATE ON nevora_tenancy.expansion_protocol TO ' + roles);
    await observer.query('GRANT SELECT ON nevora_tenancy.source_migration_contract,nevora_tenancy.owned_table_contract TO ' + roles);
    await observer.query('SET search_path=pg_catalog');
    const first = await connect(name, lease.operatorRoles[0].name), second = await connect(name, lease.operatorRoles[1].name);
    expect((await first.query("SELECT has_schema_privilege(session_user,'public','CREATE') public_create,has_schema_privilege(session_user,'nevora_tenancy','CREATE') tenancy_create,has_table_privilege(session_user,'public.employees','TRIGGER') trigger_privilege,(SELECT relowner<>(SELECT oid FROM pg_roles WHERE rolname=session_user) FROM pg_class WHERE oid='public.employees'::regclass) nonowner")).rows[0])
      .toEqual({ public_create: false, tenancy_create: false, trigger_privilege: false, nonowner: true });
    const initial = await originalRows(observer), observed = await observeMigrationCatalog(first);
    expect(Object.keys(initial)).toHaveLength(68); expect((await observer.query('SELECT count(*)::int n FROM public.workspaces')).rows[0].n).toBe(1);
    for (const table of ['employee_credentials', 'employee_sessions', 'notifications', 'push_deliveries', 'communications']) expect((await observer.query('SELECT count(*)::int n FROM public.' + quoted(table))).rows[0].n).toBe(0);
    const manifest = JSON.parse(readFileSync(join(runDirectory, 'pre-invocation-source.json'), 'utf8'));
    const identity: OwnedLocalBackfillIdentity = { database: name, databaseOid: oid, marker, systemIdentifier: lease.systemIdentifier, dataDirectory: lease.data,
      role: lease.operatorRoles[0].name, port: lease.port, clusterRoot: lease.root, leasePath: leasePath!, postmasterPid: lease.pid,
      postmasterStart: lease.pidStart, roleOid: lease.operatorRoles[0].catalog[0] };
    const captureRequest: MigrationCaptureRequest = { identity: { database: name, databaseOid: oid, marker, systemIdentifier: lease.systemIdentifier,
      dataDirectory: lease.data, role: identity.role, port: lease.port }, migrations, sourceDigest: manifest.sourceDigest,
      catalogBaseline: { sourceDigest: manifest.sourceDigest, expansionSha256, registryDigest: registry.digest, catalogDigest: observed.digest }, expectedFenceGeneration: '0' };
    // Independent actual equality on padded/inactive SQL keys is read through
    // this own client immediately before the capture's real COMMIT. It returns
    // native results; no source facts, issuers, comparator classes or rows mock.
    const nativeCapture = first.query.bind(first); let captureSnapshot = '', sqlPairs: unknown[] = [];
    const captureSpy = vi.spyOn(first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]);
      if (sql === 'COMMIT') {
        captureSnapshot = (await nativeCapture('SELECT pg_current_snapshot()::text snapshot')).rows[0].snapshot;
        sqlPairs = (await nativeCapture("SELECT a.id left_id,b.id right_id,(a.id=b.id) equal,(a.id<b.id) less FROM public.employees a CROSS JOIN public.employees b ORDER BY a.id COLLATE \"C\",b.id COLLATE \"C\"")).rows;
      }
      return Reflect.apply(nativeCapture, first, args);
    }) as Client['query']);
    let captured: Awaited<ReturnType<typeof captureTypedTenantMigrationFactsWithKeyComparators>>;
    try { captured = await captureTypedTenantMigrationFactsWithKeyComparators(first, captureRequest); } finally { captureSpy.mockRestore(); }
    expect(captured.status, JSON.stringify(captured)).toBe('CAPTURED_WITH_KEYS'); if (captured.status !== 'CAPTURED_WITH_KEYS') throw Error('Genuine accepted capture required');
    const facts = captured.facts, retainedChecksum = captured.keyComparators.captureChecksum;
    receipt('case-' + id + '-retained-key-checksum.json', { retainedChecksum, factsDigest: facts.factsDigest, retainedBeforePureValidation: true });
    const inspected = inspectTypedMigrationSnapshot(facts, { sourceDigest: facts.sourceDigest, currentSchemaDigest: facts.currentSchemaDigest,
      snapshotId: facts.snapshot.id, fenceGeneration: facts.fence.generation, factsDigest: facts.factsDigest });
    expect(inspected.status, JSON.stringify(inspected)).toBe('INSPECTED'); if (inspected.status !== 'INSPECTED') throw Error('Genuine typed source required');
    const snapshot = inspected.snapshot, assignments = reviewedFixtureAssignments(snapshot);
    const owner = validateTypedSnapshotOwnership(snapshot, assignments), ns = validateTypedDatabaseNamespaceComparators(snapshot, facts.namespaceComparators, migrations);
    const key = validateTypedKeyComparators(snapshot, captured.keyComparators, retainedChecksum);
    expect(owner.status, JSON.stringify(owner)).toBe('RESOLVED_SOURCE_OBSERVATIONS'); if (owner.status !== 'RESOLVED_SOURCE_OBSERVATIONS') throw Error('Genuine reviewed ownership required');
    expect(ns.status, JSON.stringify(ns)).toBe('VALIDATED'); if (ns.status !== 'VALIDATED') throw Error('Genuine original SQL namespace required');
    expect(key.status, JSON.stringify(key)).toBe('VALIDATED'); if (key.status !== 'VALIDATED') throw Error('Genuine original SQL key classes required');
    const constrained = validateTypedSourceConstraints(snapshot, owner.observations, ns.observations, key.observations);
    expect(constrained.status, JSON.stringify(constrained)).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');
    if (constrained.status !== 'VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS' || constrained.observations.format !== 'TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V2') throw Error('Genuine V2 constraints required');
    const compiled = compileTypedTenantBackfill(snapshot, owner.observations, constrained.observations, { chunkSize: 2 });
    expect(compiled.status, JSON.stringify(compiled)).toBe('PLANNED'); if (compiled.status !== 'PLANNED') throw Error('Genuine typed compiler plan required');
    expect(isIssuedInspectedTypedSnapshot(snapshot)).toBe(true); expect(isIssuedTypedOwnershipSourceObservations(owner.observations)).toBe(true);
    expect(isIssuedTypedDatabaseNamespaceObservations(ns.observations)).toBe(true); expect(isIssuedTypedKeyComparatorObservations(key.observations)).toBe(true);
    expect(isIssuedTypedSourceConstraintObservations(constrained.observations)).toBe(true); expect(isIssuedTypedTenantBackfillPlan(compiled.plan)).toBe(true);
    expect(constrained.observations.originalKeys).toHaveLength(99); expect(key.observations.catalogs).toHaveLength(104);
    expect(captureSnapshot).toBe(facts.snapshot.id);
    const employeeContract = getTypedKeyComparatorContracts().find(c => c.table === 'employees' && c.kind === 'PRIMARY_KEY')!;
    for (const p of sqlPairs) {
      const pair = p as { left_id: string; right_id: string; equal: boolean; less: boolean };
      const left = key.observations.rows.find(r => r.contractId === employeeContract.contractId && same(r.key, [pair.left_id]))!.comparisonClass!;
      const right = key.observations.rows.find(r => r.contractId === employeeContract.contractId && same(r.key, [pair.right_id]))!.comparisonClass!;
      expect(left === right).toBe(pair.equal); expect(BigInt(left) < BigInt(right)).toBe(pair.less);
    }
    const plan = compiled.plan;
    const request: Request = { mode: 'OWNED_LOCAL', identity, facts, captureRequest, plan,
      authority: { reference: lease.authorizationReference, operatorRole: identity.role, factsDigest: facts.factsDigest, planDigest: plan.digest } };
    const chain: Chain = { facts, snapshot, ownership: owner.observations, namespaces: ns.observations, keys: key.observations,
      constraints: constrained.observations, assignments, plan };
    const queries: string[] = [], native = first.query.bind(first);
    vi.spyOn(first, 'query').mockImplementation(((...args: unknown[]) => { queries.push(queryText(args[0])); return Reflect.apply(native, first, args); }) as Client['query']);
    const f: Fixture = { id, name, oid, marker, observer, first, second, original: initial, chain, request, queries }; fixtures.push(f);
    receipt('case-' + id + '-source-evidence.json', { facts, assignments, ownership: owner.observations, namespaces: ns.observations, keyObservations: key.observations,
      constraints: constrained.observations, plan, original: initial, independentPairs: { captureSnapshot, pairs: sqlPairs },
      note: 'Explicit fictional review dictionaries are not human review or database operator approval' });
    await expectUnapplied(f); return f;
  }
  function queryText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && typeof (value as { text?: unknown }).text === 'string') return (value as { text: string }).text;
    throw Error('Own fixture supports only explicit query text');
  }
  function secondRequest(f: Fixture): Request {
    const role = lease.operatorRoles[1];
    return { ...f.request, identity: { ...f.request.identity, role: role.name, roleOid: role.catalog[0] },
      captureRequest: { ...f.request.captureRequest, identity: { ...f.request.captureRequest.identity, role: role.name } },
      authority: { ...f.request.authority, operatorRole: role.name } };
  }
  function actualCase(id: string, name: string, check: (f: Fixture) => Promise<void>) {
    it(name, async () => {
      let status: 'PASS' | 'FAIL' = 'FAIL', f: Fixture | undefined;
      try { f = await fixture(id); await check(f); expect(await originalRows(f.observer)).toEqual(f.original);
        expect((await metadata(f)).actor).toBeNull(); status = 'PASS'; }
      finally { const record = { id, name, status }; cases.push(record);
        receipt('case-' + id + '-outcome.json', { ...record, fixturePrepared: !!f, originalPlanDigest: f?.chain.plan.digest, factsDigest: f?.chain.facts.factsDigest,
          sourceBoundary: f?.chain.ownership.boundary, actualRootInvocation: true, scope: 'WHOLE_PLAN_ATOMIC_LOCAL_NOT_DURABLE_JOURNAL_RUNTIME_RLS_OR_F10_COMPLETE' }); }
    }, 45000);
  }
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== undefined || process.env.FUEL_TEST_DATABASE_URL !== undefined) throw Error('Ambient application database configuration forbidden');
    if (!process.env.F_BACKFILL_RUN_DIR) throw Error('Explicit one-shot evidence directory required');
    runDirectory = realpathSync(process.env.F_BACKFILL_RUN_DIR); lease = JSON.parse(readFileSync(leasePath!, 'utf8'));
    expect(lease.closed).toBe(false); expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.operatorRoles).toHaveLength(2);
    expect(lease.operatorRoles[0].name).not.toBe(lease.operatorRoles[1].name); expect(lease.user).not.toBe(lease.operatorRoles[0].name);
    lease.root = realpathSync(lease.root); lease.data = realpathSync(lease.data); expect(lease.data).toBe(join(lease.root, 'data'));
    expect(realpathSync(leasePath!)).toBe(join(lease.root, 'ownership.json'));
    const credentialRelative = relative(lease.root, realpathSync(lease.credentialFile));
    if (!credentialRelative || credentialRelative.startsWith('..') || credentialRelative.startsWith('/')) throw Error('Fictional lease credential must stay inside owned root');
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    expect(existsSync(join(runDirectory, 'database-custody.json'))).toBe(false);
    admin = await connect(lease.database);
    const base = (await admin.query("SELECT current_setting('data_directory') data,current_setting('server_version') version,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
    expect(realpathSync(base.data)).toBe(lease.data); expect(base.version).toMatch(/^18\.4(?:\s|$)/); expect(base.system_identifier).toBe(lease.systemIdentifier);
    expect(base.oid).toBe(String(lease.databaseOid)); expect(base.marker).toBe(lease.marker);
    for (const role of lease.operatorRoles) {
      const rows = (await admin.query({ text: 'SELECT oid::text,rolname,rolsuper::text,rolinherit::text,rolcreaterole::text,rolcreatedb::text,rolcanlogin::text,rolreplication::text,rolbypassrls::text FROM pg_roles WHERE rolname=$1',
        values: [role.name], rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } })).rows;
      expect(rows).toEqual([role.catalog]); expect(role.catalog.slice(2)).toEqual(['false','false','false','false','true','false','false']);
    }
    receipt('base-custody.json', { database: lease.database, oid: base.oid, marker: base.marker, systemIdentifier: base.system_identifier, roleCatalogs: lease.operatorRoles, rootInvocation: true });
  }, 15000);
  afterAll(async () => {
    const failures: string[] = [], closedClients: string[] = [], drops: unknown[] = [];
    for (const f of fixtures) {
      try {
        if (f.observer.getTransactionStatus() !== 'I') await f.observer.query('ROLLBACK');
        expect(await originalRows(f.observer)).toEqual(f.original); expect((await metadata(f)).actor).toBeNull();
        await f.observer.query('SET search_path=pg_catalog'); const finalCatalog = await observeMigrationCatalog(f.observer);
        if (!f.finalCatalogChanges) expect(finalCatalog.digest).toBe(f.request.captureRequest.catalogBaseline.catalogDigest);
        else expect((await f.observer.query("SELECT count(*)::int n,bool_and(convalidated AND conenforced) valid FROM pg_constraint WHERE conname LIKE 'f10_scoped_%' AND contype='f'")).rows[0]).toEqual({ n: 89, valid: true });
        receipt('case-' + f.id + '-final-source.json', { originals: await originalRows(f.observer), metadata: await metadata(f), targets: await targets(f),
          finalCatalog, permittedCatalogChange: f.finalCatalogChanges ?? null });
      } catch { failures.push('SOURCE_OR_UNARMED_OPERATOR_CHECK_FAILED:' + f.id); }
    }
    for (const [c, name] of clients) {
      if (c === admin) continue;
      try { if (c.getTransactionStatus() !== 'I') await c.query('ROLLBACK'); }
      catch { failures.push('OWN_CHILD_TEARDOWN_ROLLBACK_UNCONFIRMED:' + name); }
      finally { try { await c.end(); closedClients.push(name); } catch { failures.push('OWN_CHILD_CLIENT_CLOSE_FAILED:' + name); } }
    }
    if (admin) {
      try {
        const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
        expect(Number(pid[0])).toBe(lease.pid); expect(pid[2]).toBe(lease.pidStart); expect(realpathSync(pid[1])).toBe(lease.data); expect(Number(pid[3])).toBe(lease.port);
        const base = (await admin.query("SELECT current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
        expect(realpathSync(base.data)).toBe(lease.data); expect(base.system_identifier).toBe(lease.systemIdentifier); expect(base.oid).toBe(String(lease.databaseOid)); expect(base.marker).toBe(lease.marker);
        for (const d of databases) {
          const exact = (await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1", [d.name])).rows;
          expect(exact).toEqual([{ oid: d.oid, marker: d.marker }]); await admin.query('DROP DATABASE ' + quoted(d.name));
          expect((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [d.name])).rowCount).toBe(0); drops.push({ ...d, exactDropVerified: true });
        }
      } catch { failures.push('EXACT_OWNED_CHILD_DROP_UNCONFIRMED'); }
      finally { try { await admin.end(); closedClients.push('base-admin'); } catch { failures.push('BASE_ADMIN_CLIENT_CLOSE_FAILED'); } }
    }
    if (runDirectory) receipt('database-custody.json', { cases, databases, drops, closedClients, allClientsClosed: closedClients.length === clients.size, failures, actualRootInvocation: true,
      open: ['ACTUAL_A_B_POST_CUTOVER', 'DURABLE_JOURNAL_AND_CHUNK_RESUME', 'PG17_AND_ACTUAL_NEON', 'RUNTIME_RLS_AND_FULL_F10'] });
    if (failures.length) throw Error('Owned source/cleanup unconfirmed; preserve exact custody and failure receipts');
  }, 30000);

  actualCase('01', 'writes only added direct ownership and both exact typed sidecars, then retries without any DML', async f => {
    const outcome = await executeGuardedTypedLocalBackfill(f.first, f.request);
    expect(outcome).toEqual({ status: 'APPLIED', mode: 'WHOLE_PLAN_ATOMIC', planDigest: f.chain.plan.digest,
      sourceRows: f.chain.facts.tables.reduce((n, t) => n + t.expectedCount, 0), verification: 'OWNED_LOCAL_ATOMIC_TYPED_BACKFILL_NOT_F10_COMPLETE' });
    await expectApplied(f); const firstTargets = await targets(f), boundary = f.queries.length;
    expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ ...outcome, status: 'UNCHANGED' });
    expect(f.queries.slice(boundary).some(sql => /^(INSERT|UPDATE|DELETE|TRUNCATE)\b/.test(sql))).toBe(false);
    expect(await targets(f)).toEqual(firstTargets); await expectApplied(f);
    const alternate = compileTypedTenantBackfill(f.chain.snapshot, f.chain.ownership, f.chain.constraints, { chunkSize: 3 });
    expect(alternate.status).toBe('PLANNED'); if (alternate.status !== 'PLANNED') throw Error('Genuine alternative technical plan required');
    expect(isIssuedTypedTenantBackfillPlan(alternate.plan)).toBe(true); expect(alternate.plan.digest).not.toBe(f.chain.plan.digest);
    expect(await executeGuardedTypedLocalBackfill(f.first, { ...f.request, plan: alternate.plan,
      authority: { ...f.request.authority, planDigest: alternate.plan.digest } })).toEqual({ status: 'BLOCKED', code: 'FENCE_PROTOCOL_DRIFT' });
    expect(await targets(f)).toEqual(firstTargets); await expectApplied(f);
    const lock = f.queries.findIndex(sql => sql.startsWith('LOCK TABLE ')), firstSnapshotRead = f.queries.findIndex((sql, i) => i > lock && sql.includes('FOR UPDATE'));
    expect(lock).toBeGreaterThan(-1); expect(firstSnapshotRead).toBeGreaterThan(lock); expect(f.queries[lock]).toContain('SHARE ROW EXCLUSIVE MODE');
    // Full native wires and byte spellings survive the attributed source.
    const profile = sourceRow(f.chain.snapshot, 'employee_scheduling_settings', [ownedEmployee]).columns.find(c => c.name === 'operational_rule_profile')!;
    expect(profile.lineage.nodes.filter(n => n.value.kind === 'JSON_NUMBER').map(n => n.value)).toEqual(expect.arrayContaining([
      { kind: 'JSON_NUMBER', lexeme: '9007199254740993' }, { kind: 'JSON_NUMBER', lexeme: '9007199254740994' },
      { kind: 'JSON_NUMBER', lexeme: '0.123456789012345678901' }, { kind: 'JSON_NUMBER', lexeme: '1.00' }]));
    expect(sourceRow(f.chain.snapshot, 'calendar_operations', ['workspace-fuel', ownedEmployee, operationId]).columns.find(c => c.name === 'result')!.lineage.nodes[0].value.kind).toBe('JSON_NULL');
    expect(sourceRow(f.chain.snapshot, 'employee_scheduling_settings', [otherEmployee]).columns.find(c => c.name === 'operational_rule_profile')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');
    expect(sourceRow(f.chain.snapshot, 'calendar_subscriptions', [subscriptionId]).columns.find(c => c.name === 'allowed_location_ids')!.wire).toBe('[0:1]={loc-1,NULL}');
    expect(f.chain.plan.entries.filter(e => e.table === 'password_recovery_limits').every(e => e.action === 'GLOBAL_NO_WRITE' && e.source.workspaceId === null)).toBe(true);
    expect(f.chain.plan.entries.find(e => e.table === 'workspaces')!.action).toBe('PRESERVE_EXISTING_NO_WRITE');
    expect(f.chain.plan.entries.filter(e => e.action === 'INSERT_TYPED_SIDECAR')).toHaveLength(2);
    receipt('case-01-applied-targets.json', firstTargets);
  });
  actualCase('02', 'rolls back every earlier direct attribution and actor manifest after an actual mid-plan DML failure', async f => {
    const native = Client.prototype.query.bind(f.first); let failed = false, earlierWrites = 0; const commands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation(((...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql);
      if (/^UPDATE public\./.test(sql)) earlierWrites++;
      if (sql.startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) { failed = true; return native('SELECT 1/0'); }
      return Reflect.apply(native, f.first, args);
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfill>>;
    try { outcome = await executeGuardedTypedLocalBackfill(f.first, f.request); } finally { spy.mockRestore(); }
    expect(failed).toBe(true); expect(earlierWrites).toBeGreaterThan(0); expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT'); expect(f.first.getTransactionStatus()).toBe('I'); await expectUnapplied(f);
  });
  actualCase('03', 'rolls back its attempt after a real source read fails before attribution and hides SQL error detail', async f => {
    const native = Client.prototype.query.bind(f.first); const commands: string[] = []; let readFailed = false, ownedBegin = false;
    const spy = vi.spyOn(f.first, 'query').mockImplementation(((...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); if (sql === 'BEGIN ISOLATION LEVEL SERIALIZABLE') ownedBegin = true;
      if (ownedBegin && !readFailed && /^SELECT /.test(sql) && sql.includes(' FROM public."employees"')) { readFailed = true; return native('SELECT 1/0'); }
      return Reflect.apply(native, f.first, args);
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfill>>;
    try { outcome = await executeGuardedTypedLocalBackfill(f.first, f.request); } finally { spy.mockRestore(); }
    expect(readFailed).toBe(true); expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT'); expect(f.first.getTransactionStatus()).toBe('I'); await expectUnapplied(f);
  });
  actualCase('04', 'cleans only its own real BEGIN after its acknowledgement is lost', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); const result = await Reflect.apply(native, f.first, args);
      if (sql === 'BEGIN ISOLATION LEVEL SERIALIZABLE') throw Error('PRIVATE_FICTIONAL_BEGIN_ACK'); return result;
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfill>>;
    try { outcome = await executeGuardedTypedLocalBackfill(f.first, f.request); } finally { spy.mockRestore(); }
    expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT'); expect(f.first.getTransactionStatus()).toBe('I'); await expectUnapplied(f);
  });
  actualCase('05', 'reports uncertain real COMMIT acknowledgement without rollback and reconciles the original plan with a fresh owned connection', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); const result = await Reflect.apply(native, f.first, args);
      if (sql === 'COMMIT') throw Error('PRIVATE_FICTIONAL_COMMIT_ACK'); return result;
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfill>>;
    try { outcome = await executeGuardedTypedLocalBackfill(f.first, f.request); } finally { spy.mockRestore(); }
    expect(outcome).toEqual({ status: 'UNCERTAIN', code: 'COMMIT_OUTCOME_UNKNOWN', planDigest: f.chain.plan.digest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    expect(commands.filter(sql => sql === 'COMMIT')).toHaveLength(1); expect(commands).not.toContain('ROLLBACK'); await expectApplied(f);
    const fresh = await connect(f.name, f.request.identity.role), before = await targets(f), nativeFresh = fresh.query.bind(fresh), retrySql: string[] = [];
    const retrySpy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => { retrySql.push(queryText(args[0])); return Reflect.apply(nativeFresh, fresh, args); }) as Client['query']);
    try { expect(await executeGuardedTypedLocalBackfill(fresh, f.request)).toMatchObject({ status: 'UNCHANGED', planDigest: f.chain.plan.digest }); }
    finally { retrySpy.mockRestore(); }
    expect(retrySql.some(sql => /^(INSERT|UPDATE|DELETE|TRUNCATE)\b/.test(sql))).toBe(false); expect(await targets(f)).toEqual(before); await expectApplied(f);
  });
  actualCase('06', 'leaves an ambient caller transaction and its own marker under caller control', async f => {
    await f.first.query('BEGIN'); await f.first.query('SET LOCAL application_name=\'caller-owned-fictional-marker\'');
    const native = f.first.query.bind(f.first), commands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation(((...args: unknown[]) => { commands.push(queryText(args[0])); return Reflect.apply(native, f.first, args); }) as Client['query']);
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CLIENT_NOT_IDLE' }); expect(commands).toEqual([]); }
    finally { spy.mockRestore(); }
    expect(f.first.getTransactionStatus()).toBe('T'); expect((await f.first.query("SELECT current_setting('application_name') name")).rows[0].name).toBe('caller-owned-fictional-marker');
    await f.first.query('ROLLBACK'); await expectUnapplied(f);
  });
  actualCase('07', 'serializes two original requests before MVCC reads so one applies and the other sees an exact no-op', async f => {
    const native = Client.prototype.query.bind(f.first); let releaseLock!: () => void, notifyLock!: () => void;
    const locked = new Promise<void>(resolve => { notifyLock = resolve; }), released = new Promise<void>(resolve => { releaseLock = resolve; });
    const firstCommands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); firstCommands.push(sql); const result = await Reflect.apply(native, f.first, args);
      if (sql.startsWith('LOCK TABLE ')) { notifyLock(); await released; } return result;
    }) as Client['query']);
    const one = executeGuardedTypedLocalBackfill(f.first, f.request); let two: ReturnType<typeof executeGuardedTypedLocalBackfill> | undefined;
    try {
      await Promise.race([locked, one.then(() => { throw Error('First request must acquire owned source lock before completing'); })]);
      two = executeGuardedTypedLocalBackfill(f.second, secondRequest(f));
      let observedWait = false;
      for (let attempt = 0; attempt < 100 && !observedWait; attempt++) {
        observedWait = (await f.observer.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=$1 AND usename=$2 AND wait_event_type='Lock' AND query LIKE 'LOCK TABLE %') waiting", [f.name, lease.operatorRoles[1].name])).rows[0].waiting;
        if (!observedWait) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(observedWait).toBe(true); releaseLock();
      const outcomes = await Promise.all([one, two]);
      expect(outcomes.map(o => o.status).sort()).toEqual(['APPLIED','UNCHANGED']); await expectApplied(f);
      receipt('case-07-concurrent-outcomes.json', { outcomes, secondActuallyWaitedOnSourceLock: observedWait, sameOriginalPlan: f.chain.plan.digest });
    } finally { releaseLock(); await Promise.allSettled(two ? [one, two] : [one]); spy.mockRestore(); }
    const begin = firstCommands.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE'), lock = firstCommands.findIndex(sql => sql.startsWith('LOCK TABLE '));
    expect(begin).toBeGreaterThan(-1); expect(lock).toBeGreaterThan(begin);
    expect(firstCommands.slice(begin + 1, lock).every(sql => sql.startsWith('SET LOCAL '))).toBe(true); // No MVCC read may precede the owned source locks.
  });
  actualCase('08', 'rejects changed current source, catalog and fence before attribution', async f => {
    await f.observer.query('BEGIN'); await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'");
    await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET first_name='Changed fictional source' WHERE id=$1", [ownedEmployee]);
    await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'"); await f.observer.query('COMMIT');
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_SOURCE_DRIFT' }); }
    finally {
      await f.observer.query('BEGIN'); await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'");
      await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET first_name='Fictional' WHERE id=$1", [ownedEmployee]);
      await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'"); await f.observer.query('COMMIT');
    }
    await expectUnapplied(f); await f.observer.query('CREATE INDEX typed_fixture_catalog_drift ON public.employees(first_name)');
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_CATALOG_DRIFT' }); }
    finally { await f.observer.query('DROP INDEX public.typed_fixture_catalog_drift'); }
    await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET fence_generation=fence_generation+1');
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'FENCE_PROTOCOL_DRIFT' }); }
    finally { await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET fence_generation=$1', [f.chain.facts.fence.generation]); }
    await expectUnapplied(f);
  });
  actualCase('09', 'denies changed request authority, source boundary and cloned foreign metadata plans before issuing SQL', async f => {
    const outcomes: unknown[] = [];
    const mutations: { name: string; request: unknown; code: string }[] = [
      { name: 'wrong custody reference', request: { ...f.request, authority: { ...f.request.authority, reference: 'foreign-fictional-custody' } }, code: 'OWNED_LOCAL_IDENTITY_DRIFT' },
      { name: 'wrong operator OID', request: { ...f.request, identity: { ...f.request.identity, roleOid: f.request.identity.roleOid + '1' } }, code: 'OWNED_LOCAL_IDENTITY_DRIFT' },
      { name: 'authority plan manifest', request: { ...f.request, authority: { ...f.request.authority, planDigest: 'f'.repeat(64) } }, code: 'OPERATOR_CUSTODY_BINDING_DRIFT' },
      { name: 'source request digest', request: { ...f.request, captureRequest: { ...f.request.captureRequest, sourceDigest: 'f'.repeat(64) } }, code: 'CAPTURE_BINDING_DRIFT' },
      { name: 'facts source digest', request: { ...f.request, facts: { ...f.request.facts, sourceDigest: 'f'.repeat(64) } }, code: 'CAPTURE_BINDING_DRIFT' },
      { name: 'cloned foreign-workspace plan', request: { ...f.request, plan: { ...f.chain.plan, entries: f.chain.plan.entries.map(e => e.table === 'employees' ? { ...e, effect: { ...e.effect, workspaceId: 'foreign-nonexistent-workspace' } } : e) } }, code: 'TYPED_PLAN_REQUIRED' },
    ];
    for (const item of mutations) {
      const before = f.queries.length, outcome = await executeGuardedTypedLocalBackfill(f.first, item.request);
      expect(outcome).toEqual({ status: 'BLOCKED', code: item.code }); expect(f.queries).toHaveLength(before); outcomes.push({ name: item.name, outcome });
    }
    await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET capture_manifest_sha256=$1', ['f'.repeat(64)]);
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'FENCE_PROTOCOL_DRIFT' }); }
    finally { await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET capture_manifest_sha256=NULL'); }
    await expectUnapplied(f); receipt('case-09-rejected-bindings.json', outcomes);
  });
  actualCase('10', 'denies an operator membership or grant change even with unchanged captured source rows', async f => {
    if (!admin) throw Error('Root admin unavailable');
    await admin.query('GRANT pg_write_all_data TO ' + quoted(f.request.identity.role) + ' WITH INHERIT TRUE');
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'OPERATOR_ROLE_DRIFT' }); }
    finally { await admin.query('REVOKE pg_write_all_data FROM ' + quoted(f.request.identity.role)); }
    await f.observer.query('REVOKE UPDATE ON public.employees FROM ' + quoted(f.request.identity.role));
    try { expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_CATALOG_DRIFT' }); }
    finally { await f.observer.query('GRANT UPDATE ON public.employees TO ' + quoted(f.request.identity.role)); }
    await expectUnapplied(f);
  });
  actualCase('11', 'rejects a foreign nonexistent workspace and refuses partial committed attribution as a whole-plan retry', async f => {
    await f.observer.query('BEGIN');
    try {
      await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user,capture_manifest_sha256=$1', [f.chain.plan.digest]);
      await f.observer.query('SET LOCAL search_path=pg_catalog,public');
      await expect(f.observer.query("UPDATE public.employees SET workspace_id='foreign-nonexistent-workspace' WHERE id=$1", [ownedEmployee])).rejects.toMatchObject({ code: '23503' });
    } finally { await f.observer.query('ROLLBACK'); }
    await expectUnapplied(f);
    await f.observer.query('BEGIN'); await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user,capture_manifest_sha256=$1', [f.chain.plan.digest]);
    await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET workspace_id='workspace-fuel' WHERE id=$1", [ownedEmployee]);
    await f.observer.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL'); await f.observer.query('COMMIT');
    const beforeTargets = await targets(f), beforeMetadata = await metadata(f);
    expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'DIRECT_OWNERSHIP_STATE_DRIFT' });
    expect(await targets(f)).toEqual(beforeTargets); expect(await metadata(f)).toEqual(beforeMetadata);
    expect(beforeTargets.clocker_pin_events_tenant_ownership).toEqual([]); expect(beforeTargets.schedule_publication_revision_shifts_tenant_ownership).toEqual([]);
    receipt('case-11-retained-partial-state.json', { beforeTargets, beforeMetadata, chunkResumeClaim: false, actualSecondTenantCoverage: 'OPEN_POST_CUTOVER' });
  });
  actualCase('12', 'validates 0027 scoped physical references after typed backfill without rewriting retained historical literals', async f => {
    expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toMatchObject({ status: 'APPLIED', planDigest: f.chain.plan.digest }); await expectApplied(f);
    await f.observer.query("SET search_path=pg_catalog,public");
    await f.observer.query(readFileSync(resolve('db/migrations/0027_tenant_ownership_validate.sql'), 'utf8'));
    f.finalCatalogChanges = '0027_VALIDATION';
    expect((await f.observer.query('SELECT capture_manifest_sha256,scoped_references FROM nevora_tenancy.ownership_validation')).rows)
      .toEqual([{ capture_manifest_sha256: f.chain.plan.digest, scoped_references: 89 }]);
    expect((await f.observer.query("SELECT count(*)::int n,bool_and(convalidated AND conenforced) valid FROM pg_constraint WHERE conname LIKE 'f10_scoped_%' AND contype='f'")).rows[0])
      .toEqual({ n: 89, valid: true });
    expect((await f.observer.query('SELECT source_shift_id,schedule_id,employee_id,location_id FROM public.schedule_publication_revision_shifts_tenant_ownership')).rows)
      .toEqual([{ source_shift_id: 'deleted typed shift', schedule_id: 'deleted typed schedule', employee_id: 'retired typed employee', location_id: 'loc-1' }]);
    await expect(f.observer.query("UPDATE public.employees SET first_name='Forbidden after validation' WHERE id=$1", [ownedEmployee])).rejects.toMatchObject({ code: '55000' });
    await f.observer.query('SET search_path=pg_catalog'); await expectApplied(f);
    receipt('case-12-validation.json', { originalPlanDigest: f.chain.plan.digest, validatedPhysicalReferences: 89, originalRowsRetained: true,
      historyNotConvertedToCurrentRows: true, unarmedFenceRetained: true, runtimeRlsCutoverNeonAndF10Complete: false });
  });

  actualCase('13', 'reports uncertain real ROLLBACK acknowledgement and reconciles safely with the original plan on a fresh owned client', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = []; let failedDml = false;
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql);
      if (sql.startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) { failedDml = true; return native('SELECT 1/0'); }
      const result = await Reflect.apply(native, f.first, args);
      if (sql === 'ROLLBACK') throw Error('PRIVATE_FICTIONAL_ROLLBACK_ACK'); return result;
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfill>>;
    try { outcome = await executeGuardedTypedLocalBackfill(f.first, f.request); } finally { spy.mockRestore(); }
    expect(failedDml).toBe(true); expect(outcome).toEqual({ status: 'UNCERTAIN', code: 'ROLLBACK_UNCONFIRMED', planDigest: f.chain.plan.digest,
      reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT');
    // Native idle is an observation, never a substitute for the adapter's
    // uncertain response or an assertion that it received a rollback ACK.
    expect(f.first.getTransactionStatus()).toBe('I'); await expectUnapplied(f);
    const fresh = await connect(f.name, f.request.identity.role), nativeFresh = fresh.query.bind(fresh), freshCommands: string[] = [];
    const freshSpy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => { freshCommands.push(queryText(args[0])); return Reflect.apply(nativeFresh, fresh, args); }) as Client['query']);
    try {
      expect(await executeGuardedTypedLocalBackfill(fresh, f.request)).toMatchObject({ status: 'APPLIED', planDigest: f.chain.plan.digest });
      await expectApplied(f); const appliedTargets = await targets(f), boundary = freshCommands.length;
      expect(await executeGuardedTypedLocalBackfill(fresh, f.request)).toMatchObject({ status: 'UNCHANGED', planDigest: f.chain.plan.digest });
      expect(freshCommands.slice(boundary).some(sql => /^(INSERT|UPDATE|DELETE|TRUNCATE)\b/.test(sql))).toBe(false); expect(await targets(f)).toEqual(appliedTargets);
      await expectApplied(f);
    } finally { freshSpy.mockRestore(); }
    receipt('case-13-rollback-ack-reconciliation.json', { outcome, commands, nativeIdleObservedAfterLostAck: true, freshCommands,
      sameOriginalPlan: f.chain.plan.digest, independentUnappliedObservationBeforeReconciliation: true,
      freshApplyThenNoDmlRetry: true, adapterDefiniteRollbackClaim: false });
  });
});
