import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { appendFileSync, existsSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
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
import { compileLegacyEmployeeNumberEnrollment } from './employee-number-enrollment';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from '../runtime/catalog-fence.server';
import { EMPLOYEE_NUMBER_INSTALLATION_CAPSULE_SQL, CONTROLLED_ENROLLMENT_INSTALLER_MEMBERSHIPS_SQL } from './employee-number-enrollment-binding.server';
import { executeGuardedTypedLocalEmployeeNumberEnrollment, executeGuardedTypedLocalBackfill, executeGuardedTypedLocalBackfillWithJournal, reconcileGuardedTypedLocalBackfillJournal } from './typed-guarded-backfill.server';
import {getControlledEnrollmentInstallerBinding} from './employee-number-enrollment-binding.server';
import {executeGuardedTypedLocalPortalLegacyAccessEnrollment} from './typed-guarded-backfill.server';
import {PORTAL_LEGACY_SOURCE_BINDINGS,PORTAL_LEGACY_ENROLLMENT_CATALOG_SQL,
 PORTAL_LEGACY_ENROLLMENT_PRIVATE_LOCK_SQL} from './portal-legacy-access-enrollment.server';
import {PORTAL_SOURCE_IMAGE_BYTES} from '../runtime/portal-source-image.generated';
import {decodeTypedMigrationWireValue} from './typed-wire';
import type {Capability} from '../../capabilities/types';
import type {UserRole} from '../../domain';

import { describeTypedBackfillJournal, validateTypedBackfillJournalObservation, type TypedBackfillJournalDescriptor } from './typed-journal-contract';
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
    credentialFile: string; user: string; database: string; databaseOid: string | number; systemIdentifier: string; marker: string;
    authorizationReference: string; operatorRoles: { name: string; catalog: string[] }[]; invocation?: string; typedJournalInstallations?: JournalInstallation[] };
  type JournalInstallation = { format: 'OWNED_TYPED_JOURNAL_INSTALLATION_V1'; sourceSHA256: string; database: string; databaseOid: string;
    marker: string; invocation: string; schemaOid: string; ownerRoleOid: string; tables: { name: string; oid: string }[];
    functions: { signature: string; oid: string; definitionSHA256: string }[];
    triggers: { name: string; table: string; oid: string; definitionSHA256: string; enabled: 'O'; constraint: boolean; deferrable: boolean; initiallyDeferred: boolean }[];
    operators: { name: string; oid: string }[] };
  type OriginalRows = Record<string, { columns: string[]; rows: (string | null)[][] }>;
  type Chain = { facts: TypedMigrationCaptureFacts; snapshot: InspectedTypedSnapshot; ownership: TypedOwnershipSourceObservations;
    namespaces: TypedDatabaseNamespaceObservations; keys: TypedKeyComparatorObservations; constraints: TypedSourceConstraintWithKeysObservations;
    assignments: TypedOwnershipAssignments; plan: TypedTenantBackfillPlan };
  type Request = { mode: 'OWNED_LOCAL'; identity: OwnedLocalBackfillIdentity; facts: TypedMigrationCaptureFacts;
    captureRequest: MigrationCaptureRequest; plan: TypedTenantBackfillPlan; authority: { reference: string; operatorRole: string; factsDigest: string; planDigest: string } };
  type Fixture = { id: string; name: string; oid: string; marker: string; observer: Client; first: Client; second: Client;
    original: OriginalRows; chain: Chain; request: Request; queries: string[]; finalCatalogChanges?: '0027_VALIDATION' | 'JOURNAL_INSTALLATION'; permittedJournalCatalogDigest?: string;
    journal?: { installation: JournalInstallation; descriptor: TypedBackfillJournalDescriptor } };
  let lease: Lease, runDirectory: string, admin: Client | undefined;
  const clients = new Map<Client, string>(), databases: { name: string; oid: string; marker: string }[] = [];
  const journalInstallCatalogs = new Map<string, { before: JsonValue; after: JsonValue; beforeDigest: string; afterDigest: string }>();
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

  // These fixtures execute only within root's explicit one-shot owned lease.
  // They install the accepted artifact before capture; the application API never installs or adopts objects.
  const journalSourceSHA256 = 'fd9bdfb4f2b8c36fd8cc97917a97d1945164290a04978fa5d214a71eb27f8fb9';
  const journalTables = ['typed_backfill_journal_chunk', 'typed_backfill_journal_plan'];
  const journalFunctionSignatures = [
    '_typed_journal_canonical_json(json)', '_typed_journal_fields(jsonb, text[])', '_typed_journal_digest(jsonb)',
    '_typed_journal_key(jsonb, integer)', '_typed_journal_validate_description(text)', '_typed_journal_plan_identity()',
    '_typed_journal_chunk_identity()', '_typed_journal_assert_coverage(text)', '_typed_journal_coverage_trigger()', '_typed_journal_no_truncate()',
    'read_typed_backfill_journal(text)', 'register_typed_backfill_journal(text)', 'observe_typed_backfill_journal(text, text, text, text)',
  ];
  const journalGuards = [
    { name: 'typed_journal_chunk_coverage', table: journalTables[0], constraint: true, deferrable: true, initiallyDeferred: true },
    { name: 'typed_journal_chunk_identity', table: journalTables[0], constraint: false, deferrable: false, initiallyDeferred: false },
    { name: 'typed_journal_chunk_no_truncate', table: journalTables[0], constraint: false, deferrable: false, initiallyDeferred: false },
    { name: 'typed_journal_plan_coverage', table: journalTables[1], constraint: true, deferrable: true, initiallyDeferred: true },
    { name: 'typed_journal_plan_identity', table: journalTables[1], constraint: false, deferrable: false, initiallyDeferred: false },
    { name: 'typed_journal_plan_no_truncate', table: journalTables[1], constraint: false, deferrable: false, initiallyDeferred: false },
  ];
  const hashText = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
  function verifiedParentLeaseBytes(): string {
    const exact = realpathSync(leasePath!), info = statSync(exact);
    expect(exact).toBe(join(lease.root, 'ownership.json')); expect(resolve(leasePath!)).toBe(exact); expect(info.isFile()).toBe(true);
    expect(info.mode & 0o777).toBe(0o600); expect(info.uid).toBe(process.getuid!());
    const bytes = readFileSync(exact, 'utf8'), current: Lease = JSON.parse(bytes);
    expect(current.closed).toBe(false); expect(current.scope).toBe('OWNED_LOCAL_F10');
    expect(current.invocation).toMatch(/^[a-f0-9]{16}$/); expect(current.invocation).toBe(process.env.F_BACKFILL_ROOT_INVOCATION);
    expect(current.marker).toBe('f10-owned:' + current.invocation);
    expect(current.authorizationReference).toBe('F-DEV-COMPLETE-001:typed-capture:' + current.invocation);
    for (const field of ['root','data','port','pid','pidStart','credentialFile','user','database','databaseOid','systemIdentifier','marker','authorizationReference','operatorRoles','invocation'] as const) {
      expect(current[field]).toEqual(lease[field]);
    }
    expect(realpathSync(current.root)).toBe(lease.root); expect(realpathSync(current.data)).toBe(join(lease.root, 'data'));
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data); expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    return bytes;
  }
  function privateAtomicLeaseReplacement(expected: string, replacement: string) {
    expect(verifiedParentLeaseBytes()).toBe(expected);
    const temporary = join(lease.root, '.journal-fixture-' + randomBytes(8).toString('hex') + '.json');
    try {
      writeFileSync(temporary, replacement, { flag: 'wx', mode: 0o600 });
      expect(readFileSync(leasePath!, 'utf8')).toBe(expected); renameSync(temporary, leasePath!);
      expect(statSync(leasePath!).mode & 0o777).toBe(0o600); expect(statSync(leasePath!).uid).toBe(process.getuid!());
      expect(readFileSync(leasePath!, 'utf8')).toBe(replacement);
    } finally { if (existsSync(temporary)) unlinkSync(temporary); }
  }
  async function verifyActualParentAndChild(name: string, oid: string, marker: string) {
    if (!admin || !databases.some(d => d.name === name && d.oid === oid && d.marker === marker)) throw Error('Only invocation-created marked child allowed');
    verifiedParentLeaseBytes();
    const base = (await admin.query("SELECT current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_control_system()) system_identifier,(SELECT oid::text FROM pg_database WHERE datname=current_database()) oid,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') marker")).rows[0];
    expect(realpathSync(base.data)).toBe(lease.data); expect(base.system_identifier).toBe(lease.systemIdentifier);
    expect(base.oid).toBe(String(lease.databaseOid)); expect(base.marker).toBe(lease.marker);
    expect((await admin.query("SELECT oid::text oid,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=$1", [name])).rows)
      .toEqual([{ oid, marker }]);
  }
  async function installJournalForRootFixture(id: string, name: string, oid: string, marker: string, observer: Client, ordering: 'BEFORE_CAPTURE' | 'INTENTIONAL_AFTER_CAPTURE_DENIAL' = 'BEFORE_CAPTURE'): Promise<JournalInstallation> {
    if (ordering === 'INTENTIONAL_AFTER_CAPTURE_DENIAL') expect(id).toBe('J12-late-install');
    await verifyActualParentAndChild(name, oid, marker);
    const sql = readFileSync(resolve('src/lib/tenancy/migrations/typed-journal-storage.sql'), 'utf8');
    expect(hashText(sql)).toBe(journalSourceSHA256);
    const beforeCatalog = await observeMigrationCatalog(observer);
    expect((await observer.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[])", [journalTables])).rows[0].n).toBe(0);
    await observer.query(sql);
    const roles = lease.operatorRoles.map(r => quoted(r.name)).join(','), tables = journalTables.map(t => 'nevora_tenancy.' + quoted(t)).join(',');
    await observer.query('GRANT USAGE ON SCHEMA nevora_tenancy TO ' + roles);
    await observer.query('GRANT SELECT,INSERT,UPDATE ON TABLE ' + tables + ' TO ' + roles);
    await observer.query('GRANT EXECUTE ON FUNCTION ' + journalFunctionSignatures.map(s => 'nevora_tenancy.' + s).join(',') + ' TO ' + roles);
    const schema = (await observer.query("SELECT n.oid::text oid,n.nspowner::text owner,(SELECT oid::text FROM pg_roles WHERE rolname=current_user) current_owner FROM pg_namespace n WHERE n.nspname='nevora_tenancy'")).rows[0];
    expect(schema.owner).toBe(schema.current_owner); expect(lease.operatorRoles.map(r => r.catalog[0])).not.toContain(schema.owner);
    const tableRows = (await observer.query("SELECT c.relname name,c.oid::text oid,c.relowner::text owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[]) ORDER BY c.relname", [journalTables])).rows;
    expect(tableRows.map(t => t.name)).toEqual(journalTables); expect(tableRows.every(t => t.owner === schema.owner)).toBe(true);
    const functionRows = (await observer.query("SELECT p.oid::text oid,p.proname||'('||pg_catalog.oidvectortypes(p.proargtypes)||')' signature,pg_get_functiondef(p.oid) definition,p.proowner::text owner,p.prosecdef,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='nevora_tenancy' AND p.proname=ANY($1::text[]) ORDER BY signature", [journalFunctionSignatures.map(s => s.slice(0, s.indexOf('(')))])).rows;
    expect(functionRows).toHaveLength(13); expect(functionRows.map(f => f.signature)).toEqual([...journalFunctionSignatures].sort());
    expect(functionRows.every(f => f.owner === schema.owner && f.prosecdef === false && same(f.proconfig, ['search_path=pg_catalog']))).toBe(true);
    const triggerRows = (await observer.query("SELECT t.tgname name,c.relname \"table\",t.oid::text oid,pg_get_triggerdef(t.oid) definition,t.tgenabled enabled,(t.tgconstraint<>0) \"constraint\",t.tgdeferrable deferrable,t.tginitdeferred \"initiallyDeferred\" FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal ORDER BY t.tgname", [journalTables])).rows;
    expect(triggerRows).toHaveLength(6);
    expect(triggerRows.map(t => ({ name: t.name, table: t.table, constraint: t.constraint, deferrable: t.deferrable, initiallyDeferred: t.initiallyDeferred }))).toEqual(journalGuards);
    expect(triggerRows.every(t => t.enabled === 'O')).toBe(true);
    const privileges: unknown[] = [];
    for (const operator of lease.operatorRoles) {
      for (const table of journalTables) {
        const row = (await observer.query("SELECT has_table_privilege($1,$2,'SELECT') sel,has_table_privilege($1,$2,'INSERT') ins,has_table_privilege($1,$2,'UPDATE') upd,has_table_privilege($1,$2,'DELETE') del,has_table_privilege($1,$2,'TRUNCATE') trunc,has_table_privilege($1,$2,'TRIGGER') trig,has_column_privilege($1,$2,$3,'UPDATE') exact_update", [operator.name, 'nevora_tenancy.' + table, table === journalTables[0] ? 'state' : 'plan_digest'])).rows[0];
        expect(row).toEqual({ sel: true, ins: true, upd: true, del: false, trunc: false, trig: false, exact_update: true }); privileges.push({ operator: operator.name, table, row });
      }
      expect((await observer.query("SELECT has_function_privilege($1,p.oid,'EXECUTE') allowed FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='nevora_tenancy' AND p.proname=ANY($2::text[])", [operator.name, journalFunctionSignatures.map(s => s.slice(0, s.indexOf('(')))])).rows.every(r => r.allowed === true)).toBe(true);
    }
    const publicPrivileges = (await observer.query("SELECT count(*)::int n FROM (SELECT a.grantee FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[]) UNION ALL SELECT a.grantee FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname='nevora_tenancy' AND p.proname=ANY($2::text[])) x WHERE grantee=0", [journalTables, journalFunctionSignatures.map(s => s.slice(0, s.indexOf('(')))])).rows[0].n;
    expect(publicPrivileges).toBe(0);
    const aclRows = (await observer.query<(string | null)[]>({
      text: "SELECT 'TABLE',c.relname,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=ANY($1::oid[]) AND a.grantee<>$3::oid UNION ALL SELECT 'COLUMN',c.relname,v.attname,a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_class c JOIN pg_attribute v ON v.attrelid=c.oid CROSS JOIN LATERAL aclexplode(v.attacl) a WHERE c.oid=ANY($1::oid[]) AND a.grantee<>$3::oid UNION ALL SELECT 'FUNCTION',p.proname,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=ANY($2::oid[]) AND a.grantee<>$3::oid UNION ALL SELECT 'SCHEMA','nevora_tenancy','',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.oid=$4::oid AND a.grantee<>$3::oid",
      values: [tableRows.map(t => t.oid), functionRows.map(f => f.oid), schema.owner, schema.oid], rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire },
    })).rows;
    const expectedAcl: string[][] = [];
    for (const role of lease.operatorRoles) {
      const grant = (kind: string, name: string, column: string, privilege: string) => expectedAcl.push([kind, name, column, role.catalog[0], schema.owner, privilege, 'false']);
      for (const table of journalTables) for (const privilege of ['INSERT','SELECT','UPDATE']) grant('TABLE', table, '', privilege);
      for (const signature of journalFunctionSignatures) grant('FUNCTION', signature.slice(0, signature.indexOf('(')), '', 'EXECUTE');
      grant('SCHEMA', 'nevora_tenancy', '', 'USAGE');
    }
    expect(aclRows.map(canonicalOwnershipJson).sort()).toEqual(expectedAcl.map(canonicalOwnershipJson).sort());
    const installation: JournalInstallation = { format: 'OWNED_TYPED_JOURNAL_INSTALLATION_V1', sourceSHA256: journalSourceSHA256,
      database: name, databaseOid: oid, marker, invocation: lease.invocation!, schemaOid: schema.oid, ownerRoleOid: schema.owner,
      tables: tableRows.map(t => ({ name: t.name, oid: t.oid })),
      functions: functionRows.map(f => ({ signature: 'nevora_tenancy.' + f.signature.replace(/, /g, ','), oid: f.oid, definitionSHA256: hashText(f.definition) })),
      triggers: triggerRows.map(t => ({ name: t.name, table: t.table, oid: t.oid, definitionSHA256: hashText(t.definition), enabled: t.enabled,
        constraint: t.constraint, deferrable: t.deferrable, initiallyDeferred: t.initiallyDeferred })),
      operators: lease.operatorRoles.map(r => ({ name: r.name, oid: r.catalog[0] })) };
    const afterCatalog = await observeMigrationCatalog(observer);
    journalInstallCatalogs.set(name, { before: beforeCatalog.catalog, after: afterCatalog.catalog, beforeDigest: beforeCatalog.digest, afterDigest: afterCatalog.digest });
    assertJournalOnlyCatalogDelta(beforeCatalog.catalog, afterCatalog.catalog, journalInstallCatalogs.get(name)!);
    await verifyActualParentAndChild(name, oid, marker);
    const before = verifiedParentLeaseBytes(), current = JSON.parse(before) as Lease;
    if (current.typedJournalInstallations !== undefined && !Array.isArray(current.typedJournalInstallations)) throw Error('Malformed prior journal custody');
    const prior = current.typedJournalInstallations ?? [];
    expect(prior.some(r => r.database === name || r.databaseOid === oid)).toBe(false);
    const replacement = JSON.stringify({ ...current, typedJournalInstallations: [...prior, installation] }, null, 2) + '\n';
    privateAtomicLeaseReplacement(before, replacement);
    expect(JSON.parse(readFileSync(leasePath!, 'utf8')).typedJournalInstallations.slice(0, prior.length)).toEqual(prior);
    receipt('case-' + id + '-journal-installation-custody.json', { installation, privilegeObservations: privileges, exactMinimalNonOwnerACL: aclRows, functions: functionRows, guards: triggerRows,
      completeCatalogBeforeInstallation: beforeCatalog, completeCatalogAfterInstallation: afterCatalog,
      completeJournalCatalogDeltaIndependentlyRetained: true, parentBeforeSHA256: hashText(before), parentAfterSHA256: hashText(replacement), unrelatedRecordsPreserved: true,
      installedAndIndependentlyObservedBeforeOriginalCapture: ordering === 'BEFORE_CAPTURE', ordering, rootOnlyActualInvocation: true });
    return installation;
  }
  function assertJournalOnlyCatalogDelta(original: JsonValue, current: JsonValue, retained: { before: JsonValue; after: JsonValue }) {
    // Complete catalogs are independently read immediately around the pinned
    // artifact and exact named grants, rather than synthesized from table names.
    expect(original).toEqual(retained.before); expect(current).toEqual(retained.after);
    const before = original as Record<string, JsonValue>, after = current as Record<string, JsonValue>;
    expect(Object.keys(after)).toEqual(Object.keys(before));
    const tableSections = ['columns', 'constraints', 'not_null', 'indexes', 'triggers'];
    for (const section of Object.keys(before)) {
      if (!['relations', 'functions', ...tableSections].includes(section)) { expect(after[section]).toEqual(before[section]); continue; }
      const rows = after[section] as Record<string, JsonValue>[];
      const isJournal = (r: Record<string, JsonValue>) => r.schema === 'nevora_tenancy' && (section === 'relations' ? journalTables.includes(r.name as string)
        : section === 'functions' ? journalFunctionSignatures.some(s => s.slice(0, s.indexOf('(')) === r.name) : journalTables.includes(r.table_name as string));
      expect(rows.filter(r => !isJournal(r))).toEqual(before[section]);
      if (section === 'relations') expect(rows.filter(isJournal)).toHaveLength(2);
      if (section === 'functions') expect(rows.filter(isJournal)).toHaveLength(13);
      if (section === 'triggers') expect(rows.filter(r => isJournal(r) && r.internal === false)).toHaveLength(6);
    }
  }
  function journalDescriptor(f: Fixture) {
    if (!f.journal) throw Error('Explicit journal-enabled root fixture required'); return f.journal.descriptor;
  }
  async function journalRows(f: Fixture) {
    const result: Record<string, (string | null)[][]> = {};
    for (const table of journalTables) result[table] = (await f.observer.query<(string | null)[]>({
      text: 'SELECT * FROM nevora_tenancy.' + quoted(table) + ' ORDER BY plan_digest' + (table === journalTables[0] ? ',ordinal' : ''),
      rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } })).rows;
    return result;
  }
  async function journalObservation(f: Fixture) {
    const observation = (await f.observer.query('SELECT nevora_tenancy.read_typed_backfill_journal($1) observation', [canonicalOwnershipJson(journalDescriptor(f))])).rows[0].observation;
    const validated = validateTypedBackfillJournalObservation(f.chain.plan, journalDescriptor(f), observation);
    expect(validated.status, JSON.stringify(validated)).toBe('STRUCTURAL_OBSERVATIONS_ONLY');
    expect(observation.effectsVerified).toBe(false); expect(observation.reconciliation).toBeNull();
    expect(observation.rows).toHaveLength(journalDescriptor(f).chunks.length); return observation;
  }
  async function expectJournalEmpty(f: Fixture) {
    expect(await journalRows(f)).toEqual({ typed_backfill_journal_chunk: [], typed_backfill_journal_plan: [] });
  }
  async function expectJournalApplied(f: Fixture) {
    await expectApplied(f); const observed = await journalObservation(f);
    expect(observed.rows.every((r: { state: string }) => r.state === 'STARTED' || r.state === 'UNKNOWN')).toBe(true);
    expect((await journalRows(f)).typed_backfill_journal_plan).toHaveLength(1);
  }
  async function registerFixtureJournal(f: Fixture, state?: 'UNKNOWN') {
    const canonical = canonicalOwnershipJson(journalDescriptor(f));
    await f.observer.query('BEGIN');
    try {
      await f.observer.query('SELECT nevora_tenancy.register_typed_backfill_journal($1)', [canonical]);
      if (state) for (const chunk of journalDescriptor(f).chunks) await f.observer.query('SELECT nevora_tenancy.observe_typed_backfill_journal($1,$2,$3,$4)', [canonical, chunk.id, chunk.retryIdentity, state]);
      await f.observer.query('SET CONSTRAINTS ALL IMMEDIATE'); await f.observer.query('COMMIT');
    } catch (error) { await f.observer.query('ROLLBACK'); throw error; }
  }
  function journalCase(id: string, name: string, check: (f: Fixture) => Promise<void>) {
    it(name, async () => {
      let status: 'PASS' | 'FAIL' = 'FAIL', f: Fixture | undefined;
      try { f = await fixture(id, true); await expectJournalEmpty(f); await check(f);
        expect(await originalRows(f.observer)).toEqual(f.original); expect((await metadata(f)).actor).toBeNull(); status = 'PASS'; }
      finally { const record = { id, name, status }; cases.push(record);
        receipt('case-' + id + '-outcome.json', { ...record, fixturePrepared: !!f, originalPlanDigest: f?.chain.plan.digest,
          factsDigest: f?.chain.facts.factsDigest, sourceBoundary: f?.chain.ownership.boundary, actualRootInvocation: true,
          scope: 'WHOLE_PLAN_ATOMIC_STRUCTURAL_JOURNAL_NOT_EFFECTS_VERIFICATION_RUNTIME_RLS_OR_F10_COMPLETE' }); }
    }, 60000);
  }
  function anyDml(commands: string[]) {
    return commands.some(sql => /^(?:\/\*.*?\*\/\s*)?(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/.test(sql) || /F10_TYPED_JOURNAL_(REGISTER|START)/.test(sql));
  }
  async function withOwnInstallationMutation(f: Fixture, label: string, change: (records: JournalInstallation[]) => JournalInstallation[], check: () => Promise<void>) {
    await verifyActualParentAndChild(f.name, f.oid, f.marker);
    const before = verifiedParentLeaseBytes(), parsed: Lease = JSON.parse(before), records = parsed.typedJournalInstallations!;
    const unrelated = records.filter(r => r.database !== f.name), mutated = change(records);
    expect(mutated.filter(r => r.database !== f.name)).toEqual(unrelated);
    const replacement = JSON.stringify({ ...parsed, typedJournalInstallations: mutated }, null, 2) + '\n';
    privateAtomicLeaseReplacement(before, replacement);
    try { await check(); }
    finally { privateAtomicLeaseReplacement(replacement, before);
      receipt('case-' + f.id + '-custody-mutation-' + label + '.json', { label, ownChild: f.name, ownOid: f.oid, originalSHA256: hashText(before),
        mutatedSHA256: hashText(replacement), restoredOriginalBytes: readFileSync(leasePath!, 'utf8') === before, parentAndUnrelatedRecordsPreserved: true }); }
  }

  // ENROLLMENT_FIXTURE_ADMISSION_BEGIN
  // UNEXECUTED root-owned fixture amendment only. No installer authority is
  // manufactured by these records; Root's actual controller admission is separate.
  type EnrollmentInstallerRole = { name: string; catalog: string[]; memberships: string[][]; originalLogin: {
    sessionUser: string; currentUser: string; systemUser: string; backendRoleOid: string } };
  type EnrollmentInstallation = { format: 'OWNED_EMPLOYEE_LOGIN_IDENTITY_INSTALLATION_V1'; sourceSHA256: string;
    database: string; databaseOid: string; marker: string; invocation: string; installer: EnrollmentInstallerRole;
    schemaOid: string; tableOid: string; guardOid: string; guards: { oid: string; name: string }[];
    beforeNamedGrants: Awaited<ReturnType<typeof enrollmentNativeCatalog>>;
    capturedNativeCatalog: Awaited<ReturnType<typeof enrollmentNativeCatalog>> };
  type EnrollmentLedgerEntry={format:'OWNED_LOCAL_EMPLOYEE_NUMBER_INSTALLATION_V1';invocation:string;database:string;databaseOid:string;marker:string;sourceSHA256:string;sourceText:string;captureCatalogDigest:string;installer:{catalog:string[];memberships:string[][]};capsuleText:string};
  type EnrollmentLease = Lease & { installerRole?: EnrollmentInstallerRole; employeeNumberEnrollmentInstallations?: EnrollmentLedgerEntry[] };
  const enrollmentInstallations = new Map<string, EnrollmentInstallation>();
  const enrollmentExpectedFinal = new Map<string, (string | null)[][]>();
  const enrollmentMappingSourceSHA256 = '4bfb8494d4ee7407a34da9a38bebcc268a3f2ca7ba5a9309d3d441873af6a330';
  const enrollmentTable = 'nevora_tenancy.employee_login_identity';
  const enrollmentGuard = 'nevora_tenancy.guard_employee_login_identity()';
  async function enrollmentInstaller(c: Client): Promise<EnrollmentInstallerRole> {
    const parent = JSON.parse(verifiedParentLeaseBytes()) as EnrollmentLease;
    const retained = parent.installerRole;
    expect(retained).toBeDefined(); if (!retained) throw Error('Controller must first record actual original installer role');
    expect(retained.name).toBe(lease.user); expect(parent.employeeNumberEnrollmentInstallations).toEqual(expect.any(Array));
    expect(retained.name).not.toBe(lease.operatorRoles[0].name); expect(retained.name).not.toBe(lease.operatorRoles[1].name);
    const rows = (await c.query<string[]>({ text: 'SELECT oid::text,rolname,rolsuper::text,rolinherit::text,rolcreaterole::text,rolcreatedb::text,rolcanlogin::text,rolreplication::text,rolbypassrls::text FROM pg_catalog.pg_roles WHERE rolname=session_user', rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } })).rows;
    expect(rows).toEqual([retained.catalog]); expect(rows[0][1]).toBe(lease.user);
    const memberships=(await c.query<string[]>({text:CONTROLLED_ENROLLMENT_INSTALLER_MEMBERSHIPS_SQL.text,rowMode:'array',types:{getTypeParser:()=>(wire:string)=>wire}})).rows;
    expect(memberships).toEqual(retained.memberships);
    // This is the EXISTING initdb original installer. No new bypass role/policy.
    expect(rows[0][2]).toBe('true'); expect(rows[0][6]).toBe('true'); expect(rows[0][8]).toBe('true');
    const login = (await c.query('SELECT session_user::text "sessionUser",current_user::text "currentUser",SYSTEM_USER::text "systemUser",(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) "backendRoleOid",current_setting(\'role\') role,current_setting(\'session_replication_role\') replication')).rows[0];
    expect(login).toEqual({ ...retained.originalLogin, role: 'none', replication: 'origin' });
    expect(retained.originalLogin).toEqual({ sessionUser: lease.user, currentUser: lease.user,
      systemUser: 'scram-sha-256:' + lease.user, backendRoleOid: retained.catalog[0] });
    return retained;
  }
  async function enrollmentNativeCatalog(c: Client) {
    const condition = "(n.nspname='nevora_tenancy' OR (n.nspname='public' AND c.relname IN ('workspaces','employees','locations')))";
    const schemas = (await c.query(`SELECT oid::text oid,nspname,nspowner::text owner,nspacl::text acl FROM pg_catalog.pg_namespace
      WHERE nspname='nevora_tenancy' ORDER BY oid`)).rows;
    const relations = (await c.query(`SELECT c.oid::text oid,n.nspname,c.relname,c.relowner::text owner,c.relkind,c.relpersistence,
      c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid`)).rows;
    const columns = (await c.query(`SELECT c.oid::text relation_oid,a.attnum,a.attname,a.atttypid::text type_oid,a.atttypmod,
      a.attnotnull,a.attcollation::text collation_oid,a.attndims,a.attnotnull IS TRUE native_notnull,a.atthasdef,a.attidentity,a.attgenerated,a.attacl::text acl,pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_source
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE ${condition} AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.oid,a.attnum`)).rows;
    const constraints = (await c.query(`SELECT c.oid::text relation_oid,co.oid::text oid,co.conname,co.contype::text contype,co.conkey,
      co.confrelid::text parent_oid,co.confkey,co.confupdtype::text update_action,co.confdeltype::text delete_action,
      co.convalidated,co.conenforced,co.condeferrable,co.condeferred,co.conindid::text index_oid,pg_catalog.pg_get_constraintdef(co.oid,false) definition
      FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE ${condition} ORDER BY c.oid,co.oid`)).rows;
    const indexes = (await c.query(`SELECT c.oid::text relation_oid,i.indexrelid::text oid,i.indisunique,i.indisprimary,i.indisvalid,i.indisready,i.indislive,i.indimmediate,i.indclass::text opclasses,i.indcollation::text collations,i.indkey::text keys,i.indoption::text options,pg_catalog.pg_get_expr(i.indpred,i.indrelid) predicate,pg_catalog.pg_get_expr(i.indexprs,i.indrelid) expressions,(SELECT ci.reloptions FROM pg_catalog.pg_class ci WHERE ci.oid=i.indexrelid) reloptions,
      pg_catalog.pg_get_indexdef(i.indexrelid) definition FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid,i.indexrelid`)).rows;
    const functions = (await c.query(`SELECT p.oid::text oid,p.proname,p.proowner::text owner,p.prosecdef,p.proconfig,p.prorettype::text return_oid,
      p.proargtypes::text arg_oids,p.proretset,l.lanname,p.proacl::text acl,pg_catalog.pg_get_functiondef(p.oid) definition
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang
      WHERE n.nspname='nevora_tenancy' ORDER BY p.oid`)).rows;
    const triggers = (await c.query(`SELECT c.oid::text relation_oid,t.oid::text oid,t.tgname,t.tgfoid::text function_oid,
      t.tgtype,t.tgenabled,t.tgisinternal,t.tgconstraint::text constraint_oid,t.tgdeferrable,t.tginitdeferred,
      pg_catalog.pg_get_triggerdef(t.oid,false) definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE ${condition} ORDER BY c.oid,t.oid`)).rows;
    const policies = (await c.query(`SELECT c.oid::text relation_oid,p.oid::text oid,p.polname,p.polcmd::text command,p.polroles,p.polpermissive,
      pg_catalog.pg_get_expr(p.polqual,p.polrelid) using_source,pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid) check_source
      FROM pg_catalog.pg_policy p JOIN pg_catalog.pg_class c ON c.oid=p.polrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE ${condition} ORDER BY p.oid`)).rows;
    const columnAcls = (await c.query(`SELECT c.oid::text relation_oid,a.attnum,x.grantor::text grantor,x.grantee::text grantee,x.privilege_type,x.is_grantable
      FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) x WHERE ${condition} AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY c.oid,a.attnum,x.grantee,x.privilege_type`)).rows;
    const expandedAcls = (await c.query(`SELECT 'SCHEMA' kind,n.oid::text oid,a.grantor::text grantor,a.grantee::text grantee,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a WHERE n.nspname='nevora_tenancy'
      UNION ALL SELECT 'TABLE',c.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a WHERE ${condition}
      UNION ALL SELECT 'FUNCTION',p.oid::text,a.grantor::text,a.grantee::text,a.privilege_type,a.is_grantable
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='nevora_tenancy' ORDER BY kind,oid,grantee,privilege_type`)).rows;
    return { schemas, relations, columns, constraints, indexes, functions, triggers, policies, columnAcls, expandedAcls };
  }

  async function enrollmentRows(c: Client): Promise<(string | null)[][]> {
    return (await c.query<(string | null)[]>({ text: 'SELECT employee_id,workspace_id,employee_number,normalized_number FROM nevora_tenancy.employee_login_identity ORDER BY pg_catalog.convert_to(employee_id,\'UTF8\')', rowMode: 'array', types: { getTypeParser: () => (wire: string) => wire } })).rows;
  }
  function enrollmentOrdered(rows: readonly (readonly (string | null)[])[]): (string | null)[][] {
    return rows.map(row => [...row]).sort((a,b) => canonicalOwnershipJson(a)<canonicalOwnershipJson(b)?-1:canonicalOwnershipJson(a)>canonicalOwnershipJson(b)?1:0);
  }
  function expectedEnrollment(f: Fixture): (string | null)[][] {
    const compiled = compileLegacyEmployeeNumberEnrollment(f.chain.plan); expect(compiled.status).toBe('COMPILED');
    if (compiled.status !== 'COMPILED') throw Error('Real original compiler required');
    expect(compiled.enrollment.originalPlan).toBe(f.chain.plan);
    const rows=enrollmentOrdered(compiled.enrollment.rows.map(row => [row.employeeId,row.workspaceId,row.employeeNumber,row.normalizedNumber]));
    // Independent fictional source literals, not an expectation obtained only
    // from the executor/normalizer under test. Padded raw identity is preserved.
    expect(rows).toEqual(enrollmentOrdered([
      [' typed-employee-a ','workspace-fuel',' typed-employee-a ','TYPED-EMPLOYEE-A'],
      ['typed-employee-b','workspace-fuel','typed-employee-b','TYPED-EMPLOYEE-B'],
    ]));
    return rows;
  }
  async function installEnrollmentBeforeNamedGrants(id: string, name: string, oid: string, marker: string, observer: Client): Promise<EnrollmentInstallation> {
    await verifyActualParentAndChild(name, oid, marker); expect(observer.getTransactionStatus()).toBe('I');
    const installer = await enrollmentInstaller(observer), source = readFileSync(resolve('src/lib/tenancy/runtime/employee-login-identity-storage.sql'),'utf8');
    expect(hashText(source)).toBe(enrollmentMappingSourceSHA256);
    // New opt-in fixture only: exact native catalog rendering context before all retained observations.
    await observer.query("SET search_path=pg_catalog");
    const before = await observeMigrationCatalog(observer), nativeBefore = await enrollmentNativeCatalog(observer), original = await originalRows(observer);
    expect((await observer.query('SELECT to_regclass($1)::text table_oid,to_regprocedure($2)::text guard_oid',[enrollmentTable,enrollmentGuard])).rows).toEqual([{table_oid:null,guard_oid:null}]);
    // One unchanged whole artifact call. It installs no rows, grants or policies.
    await observer.query(source); expect(observer.getTransactionStatus()).toBe('I');
    const after = await observeMigrationCatalog(observer), current = await enrollmentNativeCatalog(observer);
    expect(await originalRows(observer)).toEqual(original); expect(await enrollmentRows(observer)).toEqual([]);
    const schema = current.schemas.find(r=>r.nspname==='nevora_tenancy'); expect(schema?.owner).toBe(installer.catalog[0]);
    const table = current.relations.find(r=>r.nspname==='nevora_tenancy'&&r.relname==='employee_login_identity');
    expect(table).toMatchObject({owner:installer.catalog[0],relkind:'r',relpersistence:'p',relrowsecurity:true,relforcerowsecurity:true});
    if(!schema||!table)throw Error('Observed exact owned mapping table required');
    const columns = current.columns.filter(r=>r.relation_oid===table.oid);
    expect(columns.map(r=>r.attname)).toEqual(['employee_id','workspace_id','employee_number','normalized_number']);
    expect(columns.every(r=>r.type_oid==='25'&&r.attnotnull===true&&r.atthasdef===false&&r.default_source===null&&r.attidentity===''&&r.attgenerated==='')).toBe(true);
    const collation = (await observer.query('SELECT oid::text oid FROM pg_catalog.pg_collation WHERE collname=\'C\' AND collnamespace=\'pg_catalog\'::regnamespace')).rows;
    expect(collation).toHaveLength(1); expect(columns[3].collation_oid).toBe(collation[0].oid);
    expect(current.policies.filter(r=>r.relation_oid===table.oid)).toEqual([]);
    const functionRows = current.functions.filter(r=>r.proname==='guard_employee_login_identity');
    expect(functionRows).toHaveLength(1); const guard=functionRows[0];
    expect(guard).toMatchObject({owner:installer.catalog[0],prosecdef:false,proconfig:['search_path=pg_catalog'],return_oid:'2279',arg_oids:'',proretset:false,lanname:'plpgsql'});
    const prosrc = (await observer.query("SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') source_sha,prosupport::oid::text support_oid FROM pg_catalog.pg_proc WHERE oid=$1::oid",[guard.oid])).rows[0];
    const expectedBody=source.split('AS $employee_login_identity_guard$')[1].split('$employee_login_identity_guard$;')[0];
    expect(prosrc).toEqual({source_sha:hashText(expectedBody),support_oid:'0'});
    const guards = current.triggers.filter(r=>r.relation_oid===table.oid&&!r.tgisinternal);
    expect(guards.map(r=>r.tgname).sort()).toEqual(['employee_login_identity_row_guard','employee_login_identity_truncate_guard']);
    expect(guards.every(r=>r.function_oid===guard.oid&&r.tgenabled==='O'&&r.constraint_oid==='0'&&!r.tgdeferrable&&!r.tginitdeferred)).toBe(true);
    const foreign = current.constraints.filter(r=>r.relation_oid===table.oid&&r.contype==='f'); expect(foreign).toHaveLength(2);
    expect(foreign.every(r=>r.convalidated&&r.conenforced&&!r.condeferrable&&!r.condeferred&&r.update_action==='r'&&r.delete_action==='r')).toBe(true);
    const keys=current.constraints.filter(r=>r.relation_oid===table.oid&&['p','u'].includes(r.contype));expect(keys).toHaveLength(2);
    expect(keys.find(r=>r.contype==='p')?.conkey).toEqual([1]);expect(keys.find(r=>r.contype==='u')?.conkey).toEqual([2,4]);
    expect(current.indexes.filter(r=>r.relation_oid===table.oid).every(r=>r.indisunique&&r.indisvalid&&r.indisready&&r.indislive&&r.indimmediate&&r.expressions===null&&r.predicate===null&&r.reloptions===null)).toBe(true);
    const nonowner=current.expandedAcls.filter(r=>r.grantee!==installer.catalog[0]&&(['SCHEMA','TABLE','FUNCTION'].includes(r.kind)));
    expect(nonowner).toEqual([]);expect(current.columnAcls.filter(r=>r.relation_oid===table.oid)).toEqual([]);
    const installation: EnrollmentInstallation={format:'OWNED_EMPLOYEE_LOGIN_IDENTITY_INSTALLATION_V1',sourceSHA256:enrollmentMappingSourceSHA256,
      database:name,databaseOid:oid,marker,invocation:lease.invocation!,installer,schemaOid:schema.oid,tableOid:table.oid,guardOid:guard.oid,
      guards:guards.map(r=>({oid:r.oid,name:r.tgname})),beforeNamedGrants:current,capturedNativeCatalog:current};
    receipt('case-'+id+'-mapping-installation-before-grants.json',{installation,source,sourceSHA256:hashText(source),before,after,nativeBefore,nativeAfter:current,originalBefore:original,originalAfter:await originalRows(observer),zeroPolicies:true,rows:await enrollmentRows(observer),
      expectedNormalizerBuild:{node:process.versions.node,v8:process.versions.v8,unicode:process.versions.unicode,icu:process.versions.icu},mechanicsNotRuntimeAuthority:true});
    return installation;
  }
  async function sealEnrollmentBeforeCapture(id: string, installation: EnrollmentInstallation, observer: Client) {
    await verifyActualParentAndChild(installation.database,installation.databaseOid,installation.marker);await enrollmentInstaller(observer);
    const current=await enrollmentNativeCatalog(observer);
    // Preserve every OID/native property and compare complete expanded ACLs.
    // Raw schema/table ACL spelling changes only through the already accepted
    // named operator grants. No mapping grant, column grant or policy is added.
    const beforeNative=installation.beforeNamedGrants;
    const immutable=(value:typeof current)=>({...value,schemas:value.schemas.map(r=>({...r,acl:null})),
      relations:value.relations.map(r=>({...r,acl:null})),expandedAcls:[]});
    expect(immutable(current)).toEqual(immutable(beforeNative));
    const owner=installation.installer.catalog[0],added:typeof current.expandedAcls=[];
    for(const role of lease.operatorRoles){
      added.push({kind:'SCHEMA',oid:installation.schemaOid,grantor:owner,grantee:role.catalog[0],privilege_type:'USAGE',is_grantable:false});
      for(const relation of current.relations){
        const privileges=relation.nspname==='public'&&['workspaces','employees','locations'].includes(relation.relname)?['SELECT','UPDATE']:
          relation.nspname==='nevora_tenancy'&&relation.relname==='expansion_protocol'?['SELECT','UPDATE']:
          relation.nspname==='nevora_tenancy'&&['source_migration_contract','owned_table_contract'].includes(relation.relname)?['SELECT']:[];
        for(const privilege_type of privileges)added.push({kind:'TABLE',oid:relation.oid,grantor:owner,grantee:role.catalog[0],privilege_type,is_grantable:false});
      }
    }
    const orderedAcls=(rows:typeof current.expandedAcls)=>[...rows].sort((a,b)=>canonicalOwnershipJson(a)<canonicalOwnershipJson(b)?-1:canonicalOwnershipJson(a)>canonicalOwnershipJson(b)?1:0);
    expect(orderedAcls(current.expandedAcls)).toEqual(orderedAcls([...beforeNative.expandedAcls,...added]));
    expect(current.columnAcls).toEqual(beforeNative.columnAcls);
    const mappingObjects=new Set([installation.tableOid,installation.guardOid]);
    expect(current.expandedAcls.filter(r=>mappingObjects.has(r.oid)&&r.grantee!==owner)).toEqual([]);
    const sealed={...installation,capturedNativeCatalog:current};
    const sourceText=readFileSync(resolve('src/lib/tenancy/runtime/employee-login-identity-storage.sql'),'utf8');expect(hashText(sourceText)).toBe(enrollmentMappingSourceSHA256);
    const profile=await observer.query(EMPLOYEE_NUMBER_INSTALLATION_CAPSULE_SQL.text);
    expect(profile.fields.map(r=>[r.name,r.dataTypeID])).toEqual([['capsule',25]]);expect(profile.rows).toHaveLength(1);
    expect(Object.keys(profile.rows[0])).toEqual(['capsule']);expect(typeof profile.rows[0].capsule).toBe('string');
    const captured=await observeMigrationCatalog(observer);
    const entry:EnrollmentLedgerEntry={format:'OWNED_LOCAL_EMPLOYEE_NUMBER_INSTALLATION_V1',invocation:lease.invocation!,database:installation.database,
      databaseOid:installation.databaseOid,marker:installation.marker,sourceSHA256:enrollmentMappingSourceSHA256,sourceText,captureCatalogDigest:captured.digest,
      installer:{catalog:installation.installer.catalog,memberships:installation.installer.memberships},capsuleText:profile.rows[0].capsule};
    const before=verifiedParentLeaseBytes(),parent=JSON.parse(before) as EnrollmentLease;
    expect(parent.installerRole).toEqual(installation.installer);expect(parent.employeeNumberEnrollmentInstallations).toEqual(expect.any(Array));
    expect(parent.employeeNumberEnrollmentInstallations!.some(r=>r.database===installation.database)).toBe(false);
    parent.employeeNumberEnrollmentInstallations!.push(entry);privateAtomicLeaseReplacement(before,JSON.stringify(parent,null,2)+'\n');
    enrollmentInstallations.set(installation.database,sealed);enrollmentExpectedFinal.set(installation.database,[]);
    receipt('case-'+id+'-mapping-installation-before-capture.json',{installation:sealed,ledger:entry,nativeCapsuleText:profile.rows[0].capsule,fullNativeCatalog:current,fullGenericCatalog:captured,rows:await enrollmentRows(observer),recordedAfterExplicitOldGrantsBeforeWorkerConnectionsAndCapture:true,exactOldNamedGrantDelta:added,rawACLSpellingBefore:beforeNative,rawACLSpellingAfter:current});
  }
  async function expectEnrollmentPreserved(f: Fixture) {
    const installation=enrollmentInstallations.get(f.name);if(!installation)return;
    await verifyActualParentAndChild(f.name,f.oid,f.marker);await enrollmentInstaller(f.observer);
    expect(await enrollmentNativeCatalog(f.observer)).toEqual(installation.capturedNativeCatalog);
    const ledger=(JSON.parse(verifiedParentLeaseBytes()) as EnrollmentLease).employeeNumberEnrollmentInstallations!.filter(r=>r.database===f.name);expect(ledger).toHaveLength(1);
    expect((await f.observer.query(EMPLOYEE_NUMBER_INSTALLATION_CAPSULE_SQL.text)).rows).toEqual([{capsule:ledger[0].capsuleText}]);
    expect((await observeMigrationCatalog(f.observer)).digest).toBe(ledger[0].captureCatalogDigest);
    expect(enrollmentOrdered(await enrollmentRows(f.observer))).toEqual(enrollmentExpectedFinal.get(f.name));
    receipt('case-'+f.id+'-mapping-final-custody.json',{installation,nativeCatalog:await enrollmentNativeCatalog(f.observer),mapping:await enrollmentRows(f.observer),originalRows:await originalRows(f.observer),metadata:await metadata(f),targets:await targets(f),planDigest:f.chain.plan.digest,
      targetRowsCauseOrPriorAtomicityClaim:false});
  }
  function enrollmentInstallerRequest(f: Fixture): Request {
    if(!enrollmentInstallations.has(f.name))throw Error('Original native installation custody required');
    // The original captured operator request/authority stays BYTE-EXACT. The
    // distinct actual installer Client is independently admitted by Security's
    // producer. No caller-selected role substitution or approved flag.
    return f.request;
  }
  function enrollmentCase(id: string,name: string,check: (f:Fixture)=>Promise<void>) {
    it(name,async()=>{
      let f:Fixture|undefined,status:'PASS'|'FAIL'='FAIL';
      try{f=await fixture(id,false,true);await check(f);expect(await originalRows(f.observer)).toEqual(f.original);expect((await metadata(f)).actor).toBeNull();status='PASS';}
      finally{cases.push({id,name,status});receipt('case-'+id+'-enrollment-outcome.json',{id,name,status,fixturePrepared:!!f,originalPlanDigest:f?.chain.plan.digest,
        originalNativeAdmissionNeeded:true,scope:'OWNED_LOCAL_COMPLETE_MAPPING_NOT_AUTH_CUTOVER_OR_F10'});}
    },45000);
  }
  // ENROLLMENT_FIXTURE_ADMISSION_END

// ROOT_PORTAL_WHOLE_ENROLLMENT_ADDITION_BEGIN
// No new connection, database, role, runner or process constructor.
type PortalWorkspaceCommand=Readonly<{workspaceId:string;incarnation:string;policyId:string;policyRevision:string;installationEpoch:string}>;
type PortalSubjectCommand=Readonly<{workspaceId:string;employeeId:string;sourceEmployeeChecksum:string;sourceCredentialChecksum:string|null;
 sourceRole:UserRole;initialAuthorizationVersion:string;initialPortalAccessVersion:string;legacyAccess:'PRESERVED'|'ABSENT';
 capabilities:readonly Capability[];administrativeCapabilities:readonly Capability[]}>;
type RootReviewedPortalLegacyCommand=Readonly<{workspaces:readonly PortalWorkspaceCommand[];subjects:readonly PortalSubjectCommand[]}>;
type PortalLedgerEntry={format:'CONTROLLED_LOCAL_CAPTURED_LEGACY_PORTAL_ACCESS_V1';invocation:string;database:string;databaseOid:string;
 marker:string;installerRole:string;installerRoleOid:string;binding:ReturnType<typeof getControlledEnrollmentInstallerBinding>;
 sourceBindings:typeof PORTAL_LEGACY_SOURCE_BINDINGS;currentPrivateCatalogText:string;
 workspaces:readonly PortalWorkspaceCommand[];subjects:readonly PortalSubjectCommand[]};
type PortalEnrollmentLease=EnrollmentLease&{portalLegacyAccessEnrollments:PortalLedgerEntry[]};
const portalPrivateNames=['workspace_incarnation_counter','capability_policy_definition','workspace_capability_policy_installation',
 'portal_authority','portal_session_issuance','portal_administrative_authority','portal_administrative_capability',
 'portal_administrative_location','portal_access_lineage'] as const;
const portalEmptySourcePaths=[
 'src/lib/tenancy/runtime/workspace-incarnation-storage.sql',
 'src/lib/tenancy/runtime/capability-policy-definition-storage.sql',
 'src/lib/tenancy/runtime/portal-authority-storage.sql',
 'src/lib/tenancy/runtime/portal-administrative-authority-storage.sql',
 'src/lib/tenancy/runtime/portal-session-issuance-storage.sql',
 'src/lib/tenancy/runtime/portal-access-lineage-storage.sql',
] as const;
const portalInstallations=new Map<string,{nativeCatalog:Awaited<ReturnType<typeof enrollmentNativeCatalog>>;privateCatalogText:string}>();
const portalExpectedFinal=new Map<string,unknown>();
async function portalPrivateCatalog(c:Client):Promise<string>{
 const r=await c.query<(string|null)[]>({...PORTAL_LEGACY_ENROLLMENT_CATALOG_SQL,rowMode:'array',
  values:[...PORTAL_LEGACY_ENROLLMENT_CATALOG_SQL.values],types:{getTypeParser:()=>((s:string)=>s)}});
 expect(r.fields.map(f=>[f.name,f.dataTypeID])).toEqual([['jsonb_build_object',25]]);
 expect(r.rows).toHaveLength(1);expect(r.rows[0]).toHaveLength(1);
 if(typeof r.rows[0][0]!=='string')throw Error('Actual private catalog text required');return r.rows[0][0];
}
async function installEmptyPortalBeforeMapping(id:string,name:string,oid:string,marker:string,observer:Client){
 await verifyActualParentAndChild(name,oid,marker);expect(observer.getTransactionStatus()).toBe('I');
 // Match the exact original installer binding and later native deparser context.
 // Establish it before either capsule capture; never normalize away a delta.
 await observer.query('SET search_path=pg_catalog');
 const installer=await enrollmentInstaller(observer),original=await originalRows(observer),before=await enrollmentNativeCatalog(observer);
 const artifacts:{path:string;sha256:string}[]=[];
 for(const path of portalEmptySourcePaths){
  const sql=readFileSync(resolve(path),'utf8');
  const key=path.endsWith('/portal-access-lineage-storage.sql')?'NEW:'+path:path;
  expect(hashText(sql)).toBe(PORTAL_LEGACY_SOURCE_BINDINGS[key as keyof typeof PORTAL_LEGACY_SOURCE_BINDINGS]);
  // Each unchanged artifact owns its own RC BEGIN/exclusive-FIRST/COMMIT.
  // Never place these whole installers inside another BEGIN.
  expect(observer.getTransactionStatus()).toBe('I');await observer.query(sql);
  expect(observer.getTransactionStatus()).toBe('I');artifacts.push({path,sha256:hashText(sql)});
 }
 const after=await enrollmentNativeCatalog(observer),catalogText=await portalPrivateCatalog(observer),capsule=JSON.parse(catalogText);
 expect(await originalRows(observer)).toEqual(original);await enrollmentInstaller(observer);
 expect(capsule.relations.map((r:{name:string})=>r.name).sort()).toEqual([...portalPrivateNames].sort());
 expect(capsule.relations.every((r:{owner:string;kind:string;persistence:string;rls:boolean;forceRls:boolean})=>
  r.owner===installer.catalog[0]&&r.kind==='r'&&r.persistence==='p'&&r.rls===true&&r.forceRls===true)).toBe(true);
 expect(capsule.policies).toEqual([]);expect(capsule.rules).toEqual([]);
 expect(capsule.acls.every((a:{grantee:string})=>a.grantee===installer.catalog[0])).toBe(true);
 for(const table of portalPrivateNames)expect((await observer.query('SELECT count(*)::text n FROM nevora_tenancy.'+quoted(table))).rows).toEqual([{n:'0'}]);
 portalInstallations.set(name,{nativeCatalog:after,privateCatalogText:catalogText});
 receipt('case-'+id+'-portal-empty-before-mapping.json',{name,oid,marker,installer,artifacts,before,after,privateCatalogText:catalogText,
  originalBefore:original,originalAfter:await originalRows(observer),allEmpty:true,installedBeforeMappingBeforeGrantsBeforeFullCapture:true,
  sourceEqualityNotInstallerAuthentication:true});
}

// The original named operator schema-USAGE grants occur after empty installation.
// Seal their exact already-verified delta before full capture. Private relation/
// column/function ACLs, policies and every non-schema capsule byte stay unchanged.
async function sealEmptyPortalAfterOriginalGrantsBeforeCapture(id:string,name:string,observer:Client){
 const installation=portalInstallations.get(name);if(!installation)throw Error('Empty original Portal installation required');
 const mapping=enrollmentInstallations.get(name);if(!mapping)throw Error('Mapping before-capture seal required');
 const currentNative=await enrollmentNativeCatalog(observer);expect(currentNative).toEqual(mapping.capturedNativeCatalog);
 const privateCatalogText=await portalPrivateCatalog(observer),before=JSON.parse(installation.privateCatalogText),after=JSON.parse(privateCatalogText);
 const schemaAcl=(c:typeof before)=>({...c,schema:{...c.schema,nspacl:null}});
 expect(schemaAcl(after)).toEqual(schemaAcl(before));
 expect(after.acls).toEqual(before.acls);expect(after.policies).toEqual([]);
 expect(after.schema.oid).toBe(before.schema.oid);expect(after.schema.nspowner).toBe(before.schema.nspowner);
 portalInstallations.set(name,{nativeCatalog:currentNative,privateCatalogText});
 receipt('case-'+id+'-portal-private-seal-before-capture.json',{beforePrivateCatalogText:installation.privateCatalogText,
  currentPrivateCatalogText:privateCatalogText,currentNative,onlyAlreadyAssertedOriginalSchemaUsageDelta:true,
  noPrivateNamedGrantOrPolicy:true,recordedBeforeWorkerConnectionsAndFullCapture:true});
}

// Fixture-only initial technical definitions. Explicit values are ROOT-reviewed
// command inputs: no revision/epoch/incarnation defaults or inferred grants.
// It writes no original source, mapping, Portal, admin, LIVE or lineage rows.
// Catalog was installed BEFORE genuine capture; these data rows do not substitute
// a catalog successor or original plan. Same maintenance Client, own native RC.
async function installRootReviewedPortalPrerequisites(f:Fixture,command:RootReviewedPortalLegacyCommand){
 await verifyActualParentAndChild(f.name,f.oid,f.marker);await enrollmentInstaller(f.observer);
 expect(portalInstallations.has(f.name)).toBe(true);expect(f.observer.getTransactionStatus()).toBe('I');await expectApplied(f);
 expect(isIssuedTypedTenantBackfillPlan(f.chain.plan)).toBe(true);
 const compiled=compileLegacyEmployeeNumberEnrollment(f.chain.plan);if(compiled.status!=='COMPILED')throw Error('Genuine whole compiler required');
 expect([...command.workspaces.map(w=>w.workspaceId)].sort()).toEqual([...new Set(compiled.enrollment.rows.map(r=>r.workspaceId))].sort());
 for(const w of command.workspaces)for(const v of [w.incarnation,w.policyRevision,w.installationEpoch]){
  expect(decodeTypedMigrationWireValue('bigint',v).status).toBe('DECODED');expect(v[0]).not.toBe('-');expect(v).not.toBe('0');
 }
 const retained=(name:keyof typeof PORTAL_SOURCE_IMAGE_BYTES)=>Buffer.from(PORTAL_SOURCE_IMAGE_BYTES[name]);
 const policy=retained('canonicalPolicySource'),vocabulary=retained('vocabularySource'),prd=retained('approvedPRDSource');
 expect(createHash('sha256').update(policy).digest('hex')).toBe(PORTAL_LEGACY_SOURCE_BINDINGS['src/lib/capabilities/policy.ts']);
 expect(createHash('sha256').update(vocabulary).digest('hex')).toBe(PORTAL_LEGACY_SOURCE_BINDINGS['src/lib/capabilities/types.ts']);
 expect(createHash('sha256').update(prd).digest('hex')).toBe('35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7');
 const original=await originalRows(f.observer);let committing=false,began=false;
 try{
  began=true;await f.observer.query('BEGIN ISOLATION LEVEL READ COMMITTED');await f.observer.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
  await f.observer.query("SET LOCAL search_path=pg_catalog; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL TimeZone='UTC'");
  const locks=[...new Set([...registry.tables.map(t=>t.table),...registry.tables.flatMap(t=>t.sidecar?[t.sidecar]:[])])].sort();
  expect(locks).toHaveLength(70);await f.observer.query('LOCK TABLE '+locks.map(t=>'public.'+quoted(t)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  await f.observer.query(PORTAL_LEGACY_ENROLLMENT_PRIVATE_LOCK_SQL.text);
  expect(await originalRows(f.observer)).toEqual(original);
  for(const table of ['workspace_incarnation_counter','capability_policy_definition','workspace_capability_policy_installation'])
   expect((await f.observer.query('SELECT count(*)::text n FROM nevora_tenancy.'+quoted(table))).rows).toEqual([{n:'0'}]);
  const definitions=new Set<string>();
  for(const w of [...command.workspaces].sort((a,b)=>Buffer.compare(Buffer.from(a.workspaceId),Buffer.from(b.workspaceId)))){
   expect((await f.observer.query('SELECT id FROM public.workspaces WHERE convert_to(id,\'UTF8\')=convert_to($1::text,\'UTF8\') FOR SHARE',[w.workspaceId])).rows).toEqual([{id:w.workspaceId}]);
   await f.observer.query('INSERT INTO nevora_tenancy.workspace_incarnation_counter(workspace_id,incarnation) VALUES($1::text,$2::bigint)',[w.workspaceId,w.incarnation]);
   const key=canonicalOwnershipJson([w.policyId,w.policyRevision]);
   if(!definitions.has(key)){
    await f.observer.query(`INSERT INTO nevora_tenancy.capability_policy_definition
     (policy_id,revision,definition,canonical_policy_source,canonical_policy_source_sha256,vocabulary_source,vocabulary_source_sha256,approved_prd_source,approved_prd_source_sha256)
     SELECT $1::text,$2::bigint,pg_catalog.jsonb_build_object('format','NEVORA_CAPABILITY_SOURCE_BUNDLE_V1','policyId',$1::text,'revision',$2::text,
      'canonicalPolicySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/policy.ts','sha256',pg_catalog.encode(pg_catalog.sha256($3::bytea),'hex')),
      'vocabularySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/types.ts','sha256',pg_catalog.encode(pg_catalog.sha256($4::bytea),'hex')),
      'approvedPRD',pg_catalog.jsonb_build_object('path','F_IMPLEMENTATION_PRD.md','sha256',pg_catalog.encode(pg_catalog.sha256($5::bytea),'hex'))),
      $3::bytea,pg_catalog.encode(pg_catalog.sha256($3::bytea),'hex'),$4::bytea,pg_catalog.encode(pg_catalog.sha256($4::bytea),'hex'),$5::bytea,pg_catalog.encode(pg_catalog.sha256($5::bytea),'hex')`,
     [w.policyId,w.policyRevision,policy,vocabulary,prd]);definitions.add(key);
   }
   await f.observer.query('INSERT INTO nevora_tenancy.workspace_capability_policy_installation(workspace_id,workspace_incarnation,installation_epoch,policy_id,policy_revision) VALUES($1::text,$2::bigint,$3::bigint,$4::text,$5::bigint)',[w.workspaceId,w.incarnation,w.installationEpoch,w.policyId,w.policyRevision]);
  }
  await f.observer.query('SET CONSTRAINTS ALL IMMEDIATE');expect(await originalRows(f.observer)).toEqual(original);
  expect(await portalPrivateCatalog(f.observer)).toBe(portalInstallations.get(f.name)!.privateCatalogText);
  committing=true;await f.observer.query('COMMIT');began=false;
 }catch(error){
  // Actual uncertain ACK is not repaired/replayed here. Root retains the stage,
  // closes the owning Client, then reads the full prerequisite tuple separately.
  if(!committing&&began)await f.observer.query('ROLLBACK');throw error;
 }
 receipt('case-'+f.id+'-portal-root-prerequisite-data.json',{commandWorkspaces:command.workspaces,privateCatalogText:await portalPrivateCatalog(f.observer),
  originalBefore:original,originalAfter:await originalRows(f.observer),notAuthenticationOrPermissionApproval:true});
}
async function sealPortalLegacyCommandBeforeAdmission(f:Fixture,command:RootReviewedPortalLegacyCommand){
 expect(isIssuedTypedTenantBackfillPlan(f.chain.plan)).toBe(true);expect(f.request.plan).toBe(f.chain.plan);
 await verifyActualParentAndChild(f.name,f.oid,f.marker);const installer=await enrollmentInstaller(f.observer);
 expect(f.observer.getTransactionStatus()).toBe('I');await expectApplied(f);expect(await enrollmentRows(f.observer)).toEqual([]);
 const rows=f.chain.plan.entries.filter(r=>r.table==='employees'),credentials=f.chain.plan.entries.filter(r=>r.table==='employee_credentials');
 expect(command.subjects).toHaveLength(rows.length);
 // Completeness/checksums are derived from genuine original plan. Rights and
 // generations stay the deliberate independently reviewed ROOT command.
 for(const s of command.subjects){
  const employee=rows.filter(r=>r.source.columns.find(c=>c.name==='id')?.wire===s.employeeId),credential=credentials.filter(r=>r.source.columns.find(c=>c.name==='employee_id')?.wire===s.employeeId);
  expect(employee).toHaveLength(1);expect(credential.length).toBeLessThanOrEqual(1);
  expect(employee[0].source.workspaceId).toBe(s.workspaceId);expect(employee[0].sourceChecksum).toBe(s.sourceEmployeeChecksum);
  expect(employee[0].source.columns.find(c=>c.name==='role')?.wire).toBe(s.sourceRole);
  expect(s.sourceCredentialChecksum).toBe(credential[0]?.sourceChecksum??null);
 }
 const currentPrivateCatalogText=await portalPrivateCatalog(f.observer),before=verifiedParentLeaseBytes(),parent=JSON.parse(before) as PortalEnrollmentLease;
 expect(parent.installerRole).toEqual(installer);expect(parent.portalLegacyAccessEnrollments).toEqual(expect.any(Array));
 expect(parent.portalLegacyAccessEnrollments.some(r=>r.database===f.name)).toBe(false);
 const entry:PortalLedgerEntry={format:'CONTROLLED_LOCAL_CAPTURED_LEGACY_PORTAL_ACCESS_V1',invocation:lease.invocation!,database:f.name,databaseOid:f.oid,
  marker:f.marker,installerRole:installer.name,installerRoleOid:installer.catalog[0],binding:getControlledEnrollmentInstallerBinding(f.request),
  sourceBindings:PORTAL_LEGACY_SOURCE_BINDINGS,currentPrivateCatalogText,workspaces:command.workspaces,subjects:command.subjects};
 parent.portalLegacyAccessEnrollments.push(entry);privateAtomicLeaseReplacement(before,JSON.stringify(parent,null,2)+'\n');
 receipt('case-'+f.id+'-portal-ledger-before-admission.json',{entry,sourceSuccessorManifest:JSON.parse(readFileSync(join(runDirectory,'pre-invocation-source.json'),'utf8')),
  installedSourcesIndependentlyReviewedByRootRequired:true,notAnOrdinaryDataCertification:true});
 // Do not replace the lease again while the owning witness/transaction is live.
 return entry;
}
async function portalWholeTarget(f:Fixture){
 const read=async(table:string)=>(await f.observer.query<(string|null)[]>({text:'SELECT * FROM nevora_tenancy.'+quoted(table),
  rowMode:'array',types:{getTypeParser:()=>((s:string)=>s)}})).rows.sort((a,b)=>Buffer.compare(Buffer.from(canonicalOwnershipJson(a)),Buffer.from(canonicalOwnershipJson(b))));
 const privateRows:Record<string,(string|null)[][]>={};for(const table of portalPrivateNames)privateRows[table]=await read(table);
 return {source:await originalRows(f.observer),targets:await targets(f),metadata:await metadata(f),mapping:enrollmentOrdered(await enrollmentRows(f.observer)),
  privateRows,privateCatalogText:await portalPrivateCatalog(f.observer),fullCatalog:await observeMigrationCatalog(f.observer),nativeCatalog:await enrollmentNativeCatalog(f.observer)};
}
// Callable finite native case; Root registers it only after reviewing the exact
// command in its existing controller source/custody. No success/default stub.
async function PLB01WholeOriginalAbsentDisabled(f:Fixture,command:RootReviewedPortalLegacyCommand){
 await enrollmentApplied(f);expect(command.subjects.every(s=>s.legacyAccess==='ABSENT'&&s.sourceCredentialChecksum===null&&s.capabilities.length===0&&s.administrativeCapabilities.length===0)).toBe(true);
 expect(command.subjects).toHaveLength(2);expect(f.chain.plan.entries.filter(r=>r.table==='employee_credentials'||r.table==='employee_sessions')).toEqual([]);
 await installRootReviewedPortalPrerequisites(f,command);const entry=await sealPortalLegacyCommandBeforeAdmission(f,command),before=await portalWholeTarget(f);
 const outcome=await executeGuardedTypedLocalPortalLegacyAccessEnrollment(f.observer,f.request);
 expect(outcome).toMatchObject({status:'ENROLLED_LOCAL_CAPTURED_LEGACY_ACCESS_NOT_PORTAL_PROOF',mode:'WHOLE_PLAN_ATOMIC',planDigest:f.chain.plan.digest,mappingRows:2,
  receipt:{status:'ENROLLED_IN_OWNING_TRANSACTION_NOT_PORTAL_PROOF',subjects:2,administrativeSubjects:0,capabilityRows:0,liveRows:0}});
 enrollmentExpectedFinal.set(f.name,expectedEnrollment(f));await expectApplied(f);const after=await portalWholeTarget(f);
 expect(after.source).toEqual(before.source);expect(after.targets).toEqual(before.targets);expect(after.metadata).toEqual(before.metadata);
 expect(after.fullCatalog).toEqual(before.fullCatalog);expect(after.nativeCatalog).toEqual(before.nativeCatalog);expect(after.privateCatalogText).toBe(before.privateCatalogText);
 expect((await f.observer.query('SELECT workspace_id,employee_id,portal_state,proof_provenance FROM nevora_tenancy.portal_authority ORDER BY pg_catalog.convert_to(employee_id,\'UTF8\')')).rows)
  .toEqual(command.subjects.slice().sort((a,b)=>Buffer.compare(Buffer.from(a.employeeId),Buffer.from(b.employeeId))).map(s=>({workspace_id:s.workspaceId,employee_id:s.employeeId,portal_state:'DISABLED',proof_provenance:'LEGACY_UNVERIFIED'})));
 expect(after.privateRows.portal_access_lineage).toHaveLength(2);expect(after.privateRows.portal_session_issuance).toEqual([]);
 expect(after.privateRows.portal_administrative_authority).toEqual([]);expect(after.privateRows.portal_administrative_capability).toEqual([]);expect(after.privateRows.portal_administrative_location).toEqual([]);
 portalExpectedFinal.set(f.name,after.privateRows);receipt('case-'+f.id+'-portal-whole-enrollment.json',{outcome,entry,before,after,
  scope:'ABSENT_DISABLED_WHOLE_ENROLLMENT_NOT_CREDENTIALED_PORTAL_NOT_SAME_APP_A_B',allOriginalAssertionsRetained:true});
}
async function expectPortalEnrollmentFinalPreserved(f:Fixture){
 if(!portalInstallations.has(f.name))return;
 await verifyActualParentAndChild(f.name,f.oid,f.marker);await enrollmentInstaller(f.observer);
 const entry=(JSON.parse(verifiedParentLeaseBytes()) as PortalEnrollmentLease).portalLegacyAccessEnrollments.filter(r=>r.database===f.name);
 expect(entry).toHaveLength(1);const current=await portalWholeTarget(f);expect(current.privateCatalogText).toBe(entry[0].currentPrivateCatalogText);
 expect(current.privateRows).toEqual(portalExpectedFinal.get(f.name));expect(current.source).toEqual(f.original);expect(current.metadata.actor).toBeNull();
 receipt('case-'+f.id+'-portal-final-custody.json',{database:f.name,oid:f.oid,marker:f.marker,current,ledgerEntry:entry[0],notRuntimeAuthority:true});
}
// Root-only additive registration seam; NOT invoked in the default source.
// ROOT supplies the physical independently reviewed command before invocation,
// never a generic environment/role/source/approval switch.
function rootReviewedAbsentPortalCommand(f:Fixture):RootReviewedPortalLegacyCommand{
 // ROOT-fixed fictional technical initialization; no business permission is
 // inferred from captured active/password metadata. Original issued-plan
 // source identities/checksums are data inputs, never admission authority.
 expect(isIssuedTypedTenantBackfillPlan(f.chain.plan)).toBe(true);
 const rows=f.chain.plan.entries.filter(row=>row.table==='employees');
 expect(rows).toHaveLength(2);
 expect(f.chain.plan.entries.filter(row=>row.table==='employee_credentials'||row.table==='employee_sessions')).toEqual([]);
 const workspaces=[...new Set(rows.map(row=>row.source.workspaceId))];
 expect(workspaces).toHaveLength(1);
 if(typeof workspaces[0]!=='string')throw Error('Genuine original workspace source required');
 return {workspaces:[{workspaceId:workspaces[0],incarnation:'9007199254740993',
  policyId:'phase-f-fictional-legacy-enrollment-policy',policyRevision:'9007199254740995',installationEpoch:'9007199254740997'}],
  subjects:rows.map(row=>{
   const employeeId=row.source.columns.find(column=>column.name==='id')?.wire;
   expect(row.source.columns.find(column=>column.name==='role')?.wire).toBe('EMPLOYEE');
   if(typeof employeeId!=='string'||typeof row.source.workspaceId!=='string')throw Error('Genuine original employment source required');
   return {workspaceId:row.source.workspaceId,employeeId,sourceEmployeeChecksum:row.sourceChecksum,sourceCredentialChecksum:null,
    sourceRole:'EMPLOYEE',initialAuthorizationVersion:'9007199254740999',initialPortalAccessVersion:'9007199254741001',
    legacyAccess:'ABSENT',capabilities:[],administrativeCapabilities:[]};
  })};
}
function registerPortalWholeOriginalCase(){
 it('PLB01 whole original ABSENT access enrolls atomically as DISABLED without runtime authority',async()=>{
  let f:Fixture|undefined,status:'PASS'|'FAIL'='FAIL';
  try{f=await fixture('PLB01',false,true,true);await PLB01WholeOriginalAbsentDisabled(f,rootReviewedAbsentPortalCommand(f));status='PASS';}
  finally{cases.push({id:'PLB01',name:'whole original ABSENT/DISABLED enrollment',status});
   receipt('case-PLB01-outcome.json',{status,fixturePrepared:!!f,originalPlanDigest:f?.chain.plan.digest,
    scope:'LOCAL_ABSENT_DISABLED_ENROLLMENT_NOT_PORTAL_REQUEST_OR_A_B',executionReceiptNotAuthority:true});}
 },60000);
}

// ROOT_PORTAL_WHOLE_ENROLLMENT_ADDITION_END
registerPortalWholeOriginalCase();

  async function fixture(id: string, withJournal = false, withEnrollment = false, withPortalLegacyStorage = false): Promise<Fixture> {
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
    if(withPortalLegacyStorage){if(!withEnrollment||withJournal)throw Error('Distinct mapping/Portal fixture only');await installEmptyPortalBeforeMapping(id,name,oid,marker,observer);}
    const enrollmentInstallation = withEnrollment ? await installEnrollmentBeforeNamedGrants(id, name, oid, marker, observer) : undefined;
    const roles = lease.operatorRoles.map(r => quoted(r.name)).join(',');
    await observer.query('GRANT USAGE ON SCHEMA public,nevora_tenancy TO ' + roles);
    await observer.query('GRANT SELECT,UPDATE ON ' + registry.tables.map(t => 'public.' + quoted(t.table)).join(',') + ' TO ' + roles);
    await observer.query('GRANT SELECT,INSERT,UPDATE ON public.clocker_pin_events_tenant_ownership,public.schedule_publication_revision_shifts_tenant_ownership TO ' + roles);
    await observer.query('GRANT SELECT,UPDATE ON nevora_tenancy.expansion_protocol TO ' + roles);
    await observer.query('GRANT SELECT ON nevora_tenancy.source_migration_contract,nevora_tenancy.owned_table_contract TO ' + roles);
    await observer.query('SET search_path=pg_catalog');
    if (enrollmentInstallation) await sealEnrollmentBeforeCapture(id, enrollmentInstallation, observer);
    if(withPortalLegacyStorage)await sealEmptyPortalAfterOriginalGrantsBeforeCapture(id,name,observer);
    const journalInstallation = withJournal ? await installJournalForRootFixture(id, name, oid, marker, observer) : undefined;
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
    if (journalInstallation) {
      const described = describeTypedBackfillJournal(plan); expect(described.status).toBe('DESCRIBED');
      if (described.status !== 'DESCRIBED') throw Error('Genuine original typed journal descriptor required');
      f.journal = { installation: journalInstallation, descriptor: described.descriptor };
      const catalog = facts.catalog as { relations: { schema: string; name: string }[]; functions: { schema: string; name: string }[]; triggers: { schema: string; name: string }[] };
      expect(catalog.relations.filter(t => t.schema === 'nevora_tenancy' && journalTables.includes(t.name))).toHaveLength(2);
      expect(catalog.functions.filter(t => t.schema === 'nevora_tenancy' && journalFunctionSignatures.some(s => s.slice(0, s.indexOf('(')) === t.name))).toHaveLength(13);
      expect(catalog.triggers.filter(t => t.schema === 'nevora_tenancy' && journalGuards.some(g => g.name === t.name))).toHaveLength(6);
      receipt('case-' + id + '-journal-before-original-capture.json', { installation: journalInstallation, descriptor: described.descriptor,
        originalCatalogDigest: facts.currentSchemaDigest, installedBeforeWorkerConnectionsAndOriginalCapture: true });
    }
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
        await expectEnrollmentPreserved(f);
        await expectPortalEnrollmentFinalPreserved(f);
        await f.observer.query('SET search_path=pg_catalog'); const finalCatalog = await observeMigrationCatalog(f.observer);
        if (!f.finalCatalogChanges) expect(finalCatalog.digest).toBe(f.request.captureRequest.catalogBaseline.catalogDigest);
        else if (f.finalCatalogChanges === '0027_VALIDATION') expect((await f.observer.query("SELECT count(*)::int n,bool_and(convalidated AND conenforced) valid FROM pg_constraint WHERE conname LIKE 'f10_scoped_%' AND contype='f'")).rows[0]).toEqual({ n: 89, valid: true });
        else { expect(finalCatalog.digest).toBe(f.permittedJournalCatalogDigest); assertJournalOnlyCatalogDelta(f.chain.facts.catalog, finalCatalog.catalog, journalInstallCatalogs.get(f.name)!); }
        receipt('case-' + f.id + '-final-source.json', { originals: await originalRows(f.observer), metadata: await metadata(f), targets: await targets(f),
          finalCatalog, permittedCatalogChange: f.finalCatalogChanges ?? null,
          ...(f.journal ? { journalInstallation: f.journal.installation, journalRows: await journalRows(f) } : {}) });
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
  }, 120000);


  // ENROLLMENT_GREEN_BEGIN
  // UNEXECUTED Root adoption only, AFTER the distinct implementation/admission
  // is real and pinned. Import its actual symbol, never a fake issuer/helper.
  async function enrollmentApplied(f:Fixture){
    expect(await executeGuardedTypedLocalBackfill(f.first,f.request)).toMatchObject({status:'APPLIED',planDigest:f.chain.plan.digest});
    await expectApplied(f);expect(await enrollmentRows(f.observer)).toEqual([]);
  }
  async function enrollmentTuple(f:Fixture){return {source:await originalRows(f.observer),targets:await targets(f),metadata:await metadata(f),
    mapping:enrollmentOrdered(await enrollmentRows(f.observer)),catalog:await observeMigrationCatalog(f.observer),native:await enrollmentNativeCatalog(f.observer)};}
  function enrollmentRecord(c:Client,after?:(sql:string,args:unknown[],native:Client['query'],result:unknown)=>Promise<void>){
    const native=Client.prototype.query.bind(c),commands:string[]=[];
    const spy=vi.spyOn(c,'query').mockImplementation((async(...args:unknown[])=>{
      const sql=queryText(args[0]);commands.push(sql);const result=await Reflect.apply(native,c,args);if(after)await after(sql,args,native,result);return result;
    }) as Client['query']);return {commands,restore:()=>spy.mockRestore()};
  }
  async function enrollmentFresh<T>(f:Fixture,label:string,check:(c:Client)=>Promise<T>):Promise<T>{
    const fresh=await connect(f.name,lease.user);let closed=false;
    try{return await check(fresh);}finally{
      try{if(fresh.getTransactionStatus()!=='I')await fresh.query('ROLLBACK');}finally{await fresh.end();closed=true;}
      receipt('case-'+f.id+'-'+label+'-fresh.json',{database:f.name,oid:f.oid,role:lease.user,closed,retainedInOriginalClientMap:clients.has(fresh)});
    }
  }
  function enrollmentNoSourceEffects(commands:string[]){
    expect(commands.filter(sql=>/^(?:\/\*.*?\*\/\s*)?(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/.test(sql))
      .every(sql=>sql.includes('F10_EMPLOYEE_NUMBER_INSERT')&&sql.includes('INSERT INTO nevora_tenancy.employee_login_identity'))).toBe(true);
    expect(commands.some(sql=>/F10_TYPED_JOURNAL_(REGISTER|START)/.test(sql))).toBe(false);
    expect(commands.some(sql=>/^(?:\/\*.*?\*\/\s*)?(?:UPDATE|DELETE|TRUNCATE)\b/.test(sql))).toBe(false);
  }
  function enrollmentLockOrder(commands:string[]){
    const begin=commands.indexOf('BEGIN ISOLATION LEVEL READ COMMITTED');expect(begin).toBeGreaterThan(-1);
    expect(commands[begin+1]).toBe(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    const source=commands.findIndex((sql,i)=>i>begin&&sql.startsWith('LOCK TABLE public.'));
    const mapping=commands.indexOf('LOCK TABLE nevora_tenancy.employee_login_identity IN SHARE ROW EXCLUSIVE MODE');
    expect(source).toBeGreaterThan(begin+1);expect(mapping).toBeGreaterThan(source);
    expect(commands[source].match(/public\."/g)).toHaveLength(70);
    expect(commands.slice(begin+2,mapping).every(sql=>sql.startsWith('SET LOCAL ')||sql.startsWith('LOCK TABLE public.'))).toBe(true);
    const firstRead=commands.findIndex((sql,i)=>i>begin+1&&/^(?:\/\*.*?\*\/\s*)?(?:SELECT|WITH)\b/.test(sql));
    expect(firstRead).toBeGreaterThan(mapping);enrollmentNoSourceEffects(commands);
  }
  function enrollmentSuccess(f:Fixture,outcome:unknown,status:'ENROLLED'|'OBSERVED_IDENTICAL'){
    expect(outcome).toMatchObject({status,planDigest:f.chain.plan.digest,verification:'CONTROLLED_LOCAL_MAPPING_OBSERVATIONS_NOT_AUTH_OR_CUTOVER'});
  }
  async function enrollmentComplete(f:Fixture){const expected=expectedEnrollment(f);enrollmentExpectedFinal.set(f.name,expected);
    expect(enrollmentOrdered(await enrollmentRows(f.observer))).toEqual(expected);await expectApplied(f);}

  enrollmentCase('EN01','EN01 enrolls every inactive original employee and a fresh identical observation writes nothing',async f=>{
    await enrollmentApplied(f);const before=await enrollmentTuple(f),record=enrollmentRecord(f.observer);let outcome:unknown;
    try{outcome=await executeGuardedTypedLocalEmployeeNumberEnrollment(f.observer,enrollmentInstallerRequest(f));}finally{record.restore();}
    enrollmentSuccess(f,outcome,'ENROLLED');enrollmentLockOrder(record.commands);await enrollmentComplete(f);
    expect(record.commands.filter(sql=>sql.includes('F10_EMPLOYEE_NUMBER_INSERT'))).toHaveLength(2);
    const applied=await enrollmentTuple(f);expect(applied.source).toEqual(before.source);expect(applied.targets).toEqual(before.targets);
    expect(applied.metadata).toEqual(before.metadata);expect(applied.catalog).toEqual(before.catalog);expect(applied.native).toEqual(before.native);
    await enrollmentFresh(f,'identical',async fresh=>{const retry=enrollmentRecord(fresh);let observed:unknown;
      try{observed=await executeGuardedTypedLocalEmployeeNumberEnrollment(fresh,enrollmentInstallerRequest(f));}finally{retry.restore();}
      enrollmentSuccess(f,observed,'OBSERVED_IDENTICAL');enrollmentLockOrder(retry.commands);expect(anyDml(retry.commands)).toBe(false);
      expect(await enrollmentTuple(f)).toEqual(applied);receipt('case-EN01-results.json',{outcome,observed,commands:record.commands,retryCommands:retry.commands,before,after:applied});});
  });

  enrollmentCase('EN02','EN02 preserves old installer denial and ordinary nonowner mapping denial and requires original APPLIED metadata',async f=>{
    const unapplied=await enrollmentTuple(f),unarmed=enrollmentRecord(f.observer);let absent:unknown;
    try{absent=await executeGuardedTypedLocalEmployeeNumberEnrollment(f.observer,enrollmentInstallerRequest(f));}finally{unarmed.restore();}
    expect(absent).toEqual({status:'BLOCKED',code:'ENROLLMENT_APPLIED_REQUIRED'});expect(anyDml(unarmed.commands)).toBe(false);
    expect(await enrollmentTuple(f)).toEqual(unapplied);await expectUnapplied(f);
    await enrollmentApplied(f);const before=await enrollmentTuple(f),old=enrollmentRecord(f.observer);let oldOutcome:unknown;
    try{oldOutcome=await executeGuardedTypedLocalBackfill(f.observer,enrollmentInstallerRequest(f));}finally{old.restore();}
    expect(oldOutcome).toEqual({status:'BLOCKED',code:'CLIENT_CONNECTION_NOT_OWNED'});expect(old.commands).toEqual([]);
    const ordinary=enrollmentRecord(f.second);let denied:unknown;
    try{denied=await executeGuardedTypedLocalEmployeeNumberEnrollment(f.second,secondRequest(f));}finally{ordinary.restore();}
    expect(denied).toEqual({status:'BLOCKED',code:'ENROLLMENT_INSTALLER_IDENTITY_DRIFT'});expect(anyDml(ordinary.commands)).toBe(false);
    await expect(f.second.query('SELECT employee_id FROM nevora_tenancy.employee_login_identity')).rejects.toMatchObject({code:'42501'});
    expect((await f.second.query('SELECT session_user::text name')).rows).toEqual([{name:lease.operatorRoles[1].name}]);
    expect(await enrollmentTuple(f)).toEqual(before);receipt('case-EN02-results.json',{absent,oldOutcome,denied,oldCommands:old.commands,ordinaryCommands:ordinary.commands,before,after:await enrollmentTuple(f)});
  });

  enrollmentCase('EN03','EN03 rolls back a real second-insert failure and preserves uncertainty when the actual ROLLBACK acknowledgement is lost',async f=>{
    await enrollmentApplied(f);const before=await enrollmentTuple(f),attempts:unknown[]=[];
    for(const loseAck of [false,true]){
      const native=Client.prototype.query.bind(f.observer),commands:string[]=[];let inserts=0,rolledBack=false;
      const spy=vi.spyOn(f.observer,'query').mockImplementation((async(...args:unknown[])=>{
        const sql=queryText(args[0]);commands.push(sql);
        if(sql.includes('F10_EMPLOYEE_NUMBER_INSERT')&&++inserts===2)return native('SELECT 1/0');
        const result=await Reflect.apply(native,f.observer,args);if(sql==='ROLLBACK'){rolledBack=true;if(loseAck)throw Error('PRIVATE_ENROLLMENT_ROLLBACK_ACK');}return result;
      }) as Client['query']);let outcome:unknown;
      try{outcome=await executeGuardedTypedLocalEmployeeNumberEnrollment(f.observer,enrollmentInstallerRequest(f));}finally{spy.mockRestore();}
      expect(inserts).toBe(2);expect(rolledBack).toBe(true);expect(commands.filter(sql=>sql==='ROLLBACK')).toHaveLength(1);expect(commands).not.toContain('COMMIT');
      expect(outcome).toEqual(loseAck?{status:'UNCERTAIN',code:'ROLLBACK_UNCONFIRMED',planDigest:f.chain.plan.digest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'}:
        {status:'BLOCKED',code:'TYPED_GUARDED_BACKFILL_FAILED'});
      expect(await enrollmentTuple(f)).toEqual(before);attempts.push({loseAck,outcome,commands,nativeRollbackExecuted:rolledBack});
    }
    await enrollmentFresh(f,'after-rollback-ack',async fresh=>{const record=enrollmentRecord(fresh);let outcome:unknown;
      try{outcome=await executeGuardedTypedLocalEmployeeNumberEnrollment(fresh,enrollmentInstallerRequest(f));}finally{record.restore();}
      enrollmentSuccess(f,outcome,'ENROLLED');enrollmentLockOrder(record.commands);await enrollmentComplete(f);
      receipt('case-EN03-results.json',{before,attempts,freshOutcome:outcome,freshCommands:record.commands,after:await enrollmentTuple(f),uncertaintyWasNotACommitDisposition:true});});
  });

  enrollmentCase('EN04','EN04 suppresses a real COMMIT acknowledgement and fresh original input observes complete mappings without replay',async f=>{
    await enrollmentApplied(f);const before=await enrollmentTuple(f);let committed=false;
    const record=enrollmentRecord(f.observer,async sql=>{if(sql==='COMMIT'){committed=true;throw Error('PRIVATE_ENROLLMENT_COMMIT_ACK');}});let outcome:unknown;
    try{outcome=await executeGuardedTypedLocalEmployeeNumberEnrollment(f.observer,enrollmentInstallerRequest(f));}finally{record.restore();}
    expect(committed).toBe(true);expect(outcome).toEqual({status:'UNCERTAIN',code:'COMMIT_OUTCOME_UNKNOWN',planDigest:f.chain.plan.digest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'});
    expect(record.commands.at(-1)).toBe('COMMIT');expect(record.commands.filter(sql=>sql==='COMMIT')).toHaveLength(1);expect(record.commands).not.toContain('ROLLBACK');
    await enrollmentComplete(f);const applied=await enrollmentTuple(f);
    await enrollmentFresh(f,'after-commit-ack',async fresh=>{const retry=enrollmentRecord(fresh);let observed:unknown;
      try{observed=await executeGuardedTypedLocalEmployeeNumberEnrollment(fresh,enrollmentInstallerRequest(f));}finally{retry.restore();}
      enrollmentSuccess(f,observed,'OBSERVED_IDENTICAL');expect(anyDml(retry.commands)).toBe(false);enrollmentLockOrder(retry.commands);
      expect(await enrollmentTuple(f)).toEqual(applied);receipt('case-EN04-results.json',{outcome,observed,commands:record.commands,retryCommands:retry.commands,before,applied,
        identicalObservationIsNotCausalProducerOrDurableProvenance:true});});
  });

  enrollmentCase('EN05','EN05 refuses partial and fully conflicting native mappings without repair or guard bypass',async f=>{
    const foreign=await fixture('EN05_foreign',false,true),variants=[{fixture:f,rows:expectedEnrollment(f).slice(0,1),kind:'partial'},
      {fixture:foreign,rows:expectedEnrollment(foreign).map((row,i)=>i===0?[row[0],row[1],row[2],'fictional-conflicting-selector']:row),kind:'complete-conflicting'}];
    for(const variant of variants){const current=variant.fixture;await enrollmentApplied(current);
      for(const row of variant.rows)await current.observer.query('INSERT INTO nevora_tenancy.employee_login_identity(employee_id,workspace_id,employee_number,normalized_number) VALUES($1,$2,$3,$4)',row);
      enrollmentExpectedFinal.set(current.name,enrollmentOrdered(variant.rows));const before=await enrollmentTuple(current),record=enrollmentRecord(current.observer);let outcome:unknown;
      try{outcome=await executeGuardedTypedLocalEmployeeNumberEnrollment(current.observer,enrollmentInstallerRequest(current));}finally{record.restore();}
      expect(outcome).toEqual({status:'BLOCKED',code:'EMPLOYEE_NUMBER_TARGET_DRIFT'});expect(anyDml(record.commands)).toBe(false);
      expect(await enrollmentTuple(current)).toEqual(before);await expectApplied(current);
      receipt('case-EN05-'+variant.kind+'.json',{outcome,commands:record.commands,originalPlan:current.chain.plan,expectedCompleteMapping:expectedEnrollment(current),
        deliberatelyRetainedNativeTuple:variant.rows,before,after:await enrollmentTuple(current),guardsDisabled:false,cleanupByExactChildDatabaseNotDeleteRepair:true});}
  });

  enrollmentCase('EN06','EN06 rejects current source catalog and retained own-child installation drift without mapping effects',async f=>{
    await enrollmentApplied(f);const before=await enrollmentTuple(f),outcomes:unknown[]=[];
    async function denied(code:string,label:string){const record=enrollmentRecord(f.observer);let outcome:unknown;
      try{outcome=await executeGuardedTypedLocalEmployeeNumberEnrollment(f.observer,enrollmentInstallerRequest(f));}finally{record.restore();}
      expect(outcome).toEqual({status:'BLOCKED',code});expect(anyDml(record.commands)).toBe(false);outcomes.push({label,outcome,commands:record.commands,mapping:await enrollmentRows(f.observer)});}
    await f.observer.query('BEGIN');await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',capture_manifest_sha256=NULL WHERE migration_id=26 AND phase='FENCED' AND backfill_actor IS NULL AND capture_manifest_sha256=$1",[f.chain.plan.digest]);
    await f.observer.query('SET LOCAL search_path=pg_catalog,public');await f.observer.query("UPDATE public.employees SET first_name='Changed fictional enrollment source' WHERE id=$1",[ownedEmployee]);
    await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',capture_manifest_sha256=$1 WHERE migration_id=26 AND phase='EXPANDED_LEGACY' AND backfill_actor IS NULL AND capture_manifest_sha256 IS NULL",[f.chain.plan.digest]);await f.observer.query('COMMIT');
    try{await denied('CURRENT_SOURCE_DRIFT','full original source');}finally{
      await f.observer.query('BEGIN');await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY',capture_manifest_sha256=NULL WHERE migration_id=26 AND phase='FENCED' AND backfill_actor IS NULL AND capture_manifest_sha256=$1",[f.chain.plan.digest]);
      await f.observer.query('SET LOCAL search_path=pg_catalog,public');await f.observer.query("UPDATE public.employees SET first_name='Fictional' WHERE id=$1",[ownedEmployee]);
      await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',capture_manifest_sha256=$1 WHERE migration_id=26 AND phase='EXPANDED_LEGACY' AND backfill_actor IS NULL AND capture_manifest_sha256 IS NULL",[f.chain.plan.digest]);await f.observer.query('COMMIT');}
    await f.observer.query('CREATE INDEX enrollment_fixture_catalog_delta ON nevora_tenancy.employee_login_identity(employee_number)');
    const index=(await f.observer.query("SELECT oid::text oid,relowner::text owner FROM pg_class WHERE oid='nevora_tenancy.enrollment_fixture_catalog_delta'::regclass")).rows[0];
    try{await denied('ENROLLMENT_INSTALLATION_DRIFT','mapping native physical catalog before original catalog read');}finally{
      expect((await f.observer.query('SELECT to_regclass($1)::oid::text oid',['nevora_tenancy.enrollment_fixture_catalog_delta'])).rows).toEqual([{oid:index.oid}]);
      expect(index.owner).toBe(enrollmentInstallations.get(f.name)!.installer.catalog[0]);await f.observer.query('DROP INDEX nevora_tenancy.enrollment_fixture_catalog_delta');}
    // Alter only this child's closed native custody source fingerprint and
    // restore exact original bytes, preserving every unrelated child record.
    const originalLease=verifiedParentLeaseBytes(),parent=JSON.parse(originalLease) as EnrollmentLease;
    const records=parent.employeeNumberEnrollmentInstallations!;expect(records.filter(r=>r.database===f.name)).toHaveLength(1);
    const changed=JSON.stringify({...parent,employeeNumberEnrollmentInstallations:records.map(r=>r.database===f.name?{...r,sourceSHA256:'0'.repeat(64)}:r)},null,2)+'\n';
    try{privateAtomicLeaseReplacement(originalLease,changed);await denied('ENROLLMENT_INSTALLATION_DRIFT','exact own child installation custody');}
    finally{privateAtomicLeaseReplacement(changed,originalLease);}
    expect(await enrollmentTuple(f)).toEqual(before);receipt('case-EN06-results.json',{outcomes,before,after:await enrollmentTuple(f),sourceAndCatalogRestored:true,noPoliciesOrPrivilegeExpansion:true});
  });

  enrollmentCase('EN07','EN07 serializes two original installer requests and immutable native mapping guards refuse every rewrite delete and truncate',async f=>{
    await enrollmentApplied(f);const before=await enrollmentTuple(f),monitor=admin;if(!monitor)throw Error('Independent owned base monitor required');
    await enrollmentFresh(f,'concurrent',async fresh=>{
      const pid=(await fresh.query('SELECT pg_backend_pid() pid')).rows[0].pid,holder=(await f.observer.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      let release!:()=>void,notify!:()=>void;const held=new Promise<void>(r=>{notify=r;}),released=new Promise<void>(r=>{release=r;});
      const first=enrollmentRecord(f.observer,async sql=>{if(sql==='LOCK TABLE nevora_tenancy.employee_login_identity IN SHARE ROW EXCLUSIVE MODE'){notify();await released;}});
      const second=enrollmentRecord(fresh),one=executeGuardedTypedLocalEmployeeNumberEnrollment(f.observer,enrollmentInstallerRequest(f));let two:ReturnType<typeof executeGuardedTypedLocalEmployeeNumberEnrollment>|undefined;
      let waitEvidence:unknown,outcomes:unknown;
      try{await Promise.race([held,one.then(()=>{throw Error('Original attempt must hold all sources and mapping before first MVCC read');})]);
        two=executeGuardedTypedLocalEmployeeNumberEnrollment(fresh,enrollmentInstallerRequest(f));
        for(let i=0;i<100;i++){
          const rows=(await monitor.query("SELECT a.pid,a.datname,a.usename,a.query,a.wait_event_type,a.wait_event,pg_blocking_pids(a.pid) blockers,l.locktype,l.database::text database_oid,l.classid::text classid,l.objid::text objid,l.objsubid,l.mode,l.granted FROM pg_stat_activity a JOIN pg_locks l ON l.pid=a.pid WHERE a.pid=$1 AND a.datname=$2 AND a.usename=$3 AND a.wait_event_type='Lock' AND NOT l.granted AND l.locktype='advisory'",[pid,f.name,lease.user])).rows;
          if(rows.some(r=>r.blockers.includes(holder)&&r.mode==='ExclusiveLock'&&r.query===INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text)){waitEvidence=rows;break;}
          await new Promise(r=>setTimeout(r,10));}
        expect(waitEvidence).toBeDefined();expect(second.commands.at(-1)).toBe(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
        release();outcomes=await Promise.all([one,two]);expect((outcomes as {status:string}[]).map(r=>r.status).sort()).toEqual(['ENROLLED','OBSERVED_IDENTICAL']);
      }finally{release();await Promise.allSettled(two?[one,two]:[one]);first.restore();second.restore();}
      enrollmentLockOrder(first.commands);enrollmentLockOrder(second.commands);expect(anyDml(second.commands)).toBe(false);await enrollmentComplete(f);
      const after=await enrollmentTuple(f);expect(after.source).toEqual(before.source);expect(after.targets).toEqual(before.targets);expect(after.metadata).toEqual(before.metadata);
      receipt('case-EN07-concurrency.json',{outcomes,waitEvidence,holderPid:holder,waiterPid:pid,firstCommands:first.commands,secondCommands:second.commands,before,after,
        noMultiTenantOrProductionThroughputClaim:true});
    });
    const beforeGuards=await enrollmentTuple(f),commands=[
      {sql:"UPDATE nevora_tenancy.employee_login_identity SET employee_id=employee_id||'changed'",message:'employee_login_identity_immutable'},
      {sql:"UPDATE nevora_tenancy.employee_login_identity SET workspace_id=workspace_id||'changed'",message:'employee_login_identity_immutable'},
      {sql:"UPDATE nevora_tenancy.employee_login_identity SET employee_number=employee_number||'changed'",message:'employee_login_identity_immutable'},
      {sql:"UPDATE nevora_tenancy.employee_login_identity SET normalized_number=normalized_number||'changed'",message:'employee_login_identity_immutable'},
      {sql:'DELETE FROM nevora_tenancy.employee_login_identity',message:'employee_login_identity_delete_forbidden'},
      {sql:'TRUNCATE nevora_tenancy.employee_login_identity',message:'employee_login_identity_truncate_forbidden'}];
    const originalPid=(await f.observer.query('SELECT pg_backend_pid() pid')).rows[0].pid;
    for(const {sql,message} of commands){await f.observer.query('BEGIN');try{await expect(f.observer.query(sql)).rejects.toMatchObject({code:'55000',message});
      await expect(f.observer.query('SELECT 1')).rejects.toMatchObject({code:'25P02'});
      let aborted:unknown;for(let attempt=0;attempt<100;attempt++){
        const row=(await admin!.query("SELECT pid,datname,usename,state FROM pg_stat_activity WHERE pid=$1 AND datname=$2 AND usename=$3",[originalPid,f.name,lease.user])).rows[0];
        if(row?.state==='idle in transaction (aborted)'&&f.observer.getTransactionStatus()==='E'){aborted=row;break;}await new Promise(r=>setTimeout(r,10));}
      expect(aborted).toBeDefined();expect(f.observer.getTransactionStatus()).toBe('E');}
      finally{await f.observer.query('ROLLBACK');}expect(await enrollmentTuple(f)).toEqual(beforeGuards);}
    receipt('case-EN07-immutable-guards.json',{commands,before:beforeGuards,after:await enrollmentTuple(f),noGuardDisableOrRowRepair:true});
  });
  // ENROLLMENT_GREEN_END

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

  journalCase('J01', 'atomically persists only structural STARTED journal and exact ownership, then fresh retries perform no DML anywhere', async f => {
    const outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request);
    expect(outcome).toEqual({ status: 'APPLIED', mode: 'WHOLE_PLAN_ATOMIC', planDigest: f.chain.plan.digest,
      sourceRows: f.chain.facts.tables.reduce((n, t) => n + t.expectedCount, 0), verification: 'OWNED_LOCAL_ATOMIC_TYPED_JOURNAL_BACKFILL_NOT_F10_COMPLETE',
      journal: { descriptorChecksum: journalDescriptor(f).descriptorChecksum, chunkCount: journalDescriptor(f).chunks.length,
        effectsVerified: false, verification: 'ATOMIC_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION', integration: 'SAME_TRANSACTION_STRUCTURAL_WRITES' } });
    const begin = f.queries.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE'), commit = f.queries.indexOf('COMMIT');
    const register = f.queries.findIndex(sql => sql.includes('F10_TYPED_JOURNAL_REGISTER'));
    const start = f.queries.findIndex(sql => sql.includes('F10_TYPED_JOURNAL_START'));
    const arm = f.queries.findIndex(sql => sql.startsWith('UPDATE nevora_tenancy.expansion_protocol'));
    expect(register).toBeGreaterThan(begin); expect(start).toBeGreaterThan(register); expect(arm).toBeGreaterThan(start); expect(commit).toBeGreaterThan(arm);
    expect(f.queries.slice(0, begin).some(sql => /F10_TYPED_JOURNAL_(REGISTER|START)/.test(sql))).toBe(false);
    await expectJournalApplied(f); const firstJournal = await journalRows(f), firstTargets = await targets(f), firstMetadata = await metadata(f);
    const observation = await journalObservation(f); expect(observation.rows.every((r: { state: string }) => r.state === 'STARTED')).toBe(true);
    const fresh = await connect(f.name, f.request.identity.role), native = fresh.query.bind(fresh), commands: string[] = [];
    const spy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => { commands.push(queryText(args[0])); return Reflect.apply(native, fresh, args); }) as Client['query']);
    try { expect(await executeGuardedTypedLocalBackfillWithJournal(fresh, f.request)).toEqual({ ...outcome, status: 'UNCHANGED',
      journal: { descriptorChecksum: journalDescriptor(f).descriptorChecksum, chunkCount: journalDescriptor(f).chunks.length, effectsVerified: false,
        verification: 'ATOMIC_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION', integration: 'MATCHING_EXISTING_OBSERVATIONS_NO_PRIOR_ATOMICITY_CLAIM' } }); }
    finally { spy.mockRestore(); }
    expect(anyDml(commands)).toBe(false); expect(commands.some(sql => sql.includes('F10_TYPED_JOURNAL_READ'))).toBe(true);
    expect(await journalRows(f)).toEqual(firstJournal); expect(await targets(f)).toEqual(firstTargets); expect(await metadata(f)).toEqual(firstMetadata);
    await expectJournalApplied(f);
    const sourceNames = [...new Set([...registry.tables.map(t => t.table), ...registry.tables.flatMap(t => t.sidecar ? [t.sidecar] : [])])].sort();
    const sourceLockSql = 'LOCK TABLE ' + sourceNames.map(t => 'public.' + quoted(t)).join(',') + ' IN SHARE ROW EXCLUSIVE MODE';
    const journalLockSql = 'LOCK TABLE nevora_tenancy.typed_backfill_journal_chunk,nevora_tenancy.typed_backfill_journal_plan IN SHARE ROW EXCLUSIVE MODE';
    let lockRows: unknown[] = [];
    await fresh.query('BEGIN');
    try {
      // Native success under exact nonowner table UPDATE is observed only
      // after all70 original source locks, before the first transaction read.
      await fresh.query(sourceLockSql); await fresh.query(journalLockSql);
      lockRows = (await fresh.query("SELECT n.nspname schema,c.relname name,l.mode,l.granted FROM pg_locks l JOIN pg_class c ON c.oid=l.relation JOIN pg_namespace n ON n.oid=c.relnamespace WHERE l.pid=pg_backend_pid() AND l.mode='ShareRowExclusiveLock' AND ((n.nspname='public' AND c.relname=ANY($1::text[])) OR (n.nspname='nevora_tenancy' AND c.relname=ANY($2::text[]))) ORDER BY n.nspname,c.relname", [sourceNames, journalTables])).rows;
      expect(lockRows).toHaveLength(72); expect(lockRows.every(r => (r as { granted: boolean }).granted)).toBe(true);
      await fresh.query('SAVEPOINT immutable_journal_probe');
      await expect(fresh.query('UPDATE nevora_tenancy.typed_backfill_journal_plan SET chunk_count=chunk_count+1 WHERE plan_digest=$1', [f.chain.plan.digest])).rejects.toMatchObject({ code: 'P0001' });
      await fresh.query('ROLLBACK TO SAVEPOINT immutable_journal_probe');
      await expect(fresh.query('UPDATE nevora_tenancy.typed_backfill_journal_chunk SET retry_identity=$1 WHERE plan_digest=$2 AND chunk_id=$3', ['f'.repeat(64), f.chain.plan.digest, journalDescriptor(f).chunks[0].id])).rejects.toMatchObject({ code: 'P0001' });
    } finally { await fresh.query('ROLLBACK'); }
    expect(await journalRows(f)).toEqual(firstJournal); expect(await targets(f)).toEqual(firstTargets); expect(await metadata(f)).toEqual(firstMetadata);
    await expectJournalApplied(f);
    receipt('case-J01-corrected-lock-grants-immutable-guards.json', { sourceLockSql, journalLockSql, lockRows,
      effectiveJournalTableGrants: ['SELECT','INSERT','UPDATE'], explicitColumnGrants: [], immutablePlanCountAndChunkRetryUpdates: 'P0001',
      journalTargetSourceMetadataUnchanged: true, noAdditionalSourceGrants: true });
    receipt('case-J01-atomic-tuple.json', { outcome, firstCommands: f.queries, commands, originalRows: f.original, targets: firstTargets, metadata: firstMetadata, journal: firstJournal,
      observation, effectsVerificationClaim: false, chunkCompletionClaim: false, freshRetryDmlCount: 0 });
  });
  journalCase('J02', 'serializes a concurrent original-plan retry on all source locks before MVCC and journal reads', async f => {
    const native = Client.prototype.query.bind(f.first), firstCommands: string[] = [];
    let release!: () => void, acquired!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; }), locked = new Promise<void>(resolve => { acquired = resolve; });
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); firstCommands.push(sql); const result = await Reflect.apply(native, f.first, args);
      if (sql.startsWith('LOCK TABLE public.')) { acquired(); await gate; } return result;
    }) as Client['query']);
    const secondCommands: string[] = [], secondNative = Client.prototype.query.bind(f.second);
    const secondSpy = vi.spyOn(f.second, 'query').mockImplementation(((...args: unknown[]) => { secondCommands.push(queryText(args[0])); return Reflect.apply(secondNative, f.second, args); }) as Client['query']);
    const one = executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); let two: ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal> | undefined;
    try {
      await Promise.race([locked, one.then(() => { throw Error('First source-lock acquisition required'); })]);
      two = executeGuardedTypedLocalBackfillWithJournal(f.second, secondRequest(f));
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        waiting = (await f.observer.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=$1 AND usename=$2 AND wait_event_type='Lock' AND query LIKE 'LOCK TABLE public.%') waiting", [f.name, lease.operatorRoles[1].name])).rows[0].waiting;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      const secondBegin = secondCommands.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE');
      expect(secondCommands.slice(secondBegin + 1).every(sql => sql.startsWith('SET LOCAL ') || sql.startsWith('LOCK TABLE public.'))).toBe(true);
      release(); const outcomes = await Promise.all([one, two]); expect(outcomes.map(o => o.status).sort()).toEqual(['APPLIED','UNCHANGED']);
      await expectJournalApplied(f); expect(anyDml(secondCommands.slice(secondBegin + 1))).toBe(false);
      receipt('case-J02-concurrent-tuple.json', { outcomes, waitingOnOriginal70SourceLocks: waiting, firstCommands, secondCommands,
        targets: await targets(f), metadata: await metadata(f), journal: await journalRows(f) });
    } finally { release(); await Promise.allSettled(two ? [one, two] : [one]); spy.mockRestore(); secondSpy.mockRestore(); }
    for (const commands of [firstCommands, secondCommands]) {
      const begin = commands.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE'), sourceLock = commands.findIndex(sql => sql.startsWith('LOCK TABLE public.'));
      const journalLock = commands.findIndex(sql => sql.includes('F10_TYPED_JOURNAL_LOCK'));
      expect(sourceLock).toBeGreaterThan(begin); expect(journalLock).toBeGreaterThan(sourceLock);
      expect(commands[sourceLock].match(/public\."/g)).toHaveLength(70);
      expect(commands[journalLock]).toContain('typed_backfill_journal_chunk'); expect(commands[journalLock]).toContain('typed_backfill_journal_plan');
      expect(commands[journalLock].indexOf('typed_backfill_journal_chunk')).toBeLessThan(commands[journalLock].indexOf('typed_backfill_journal_plan'));
      expect(commands.slice(begin + 1, journalLock).every(sql => sql.startsWith('SET LOCAL ') || sql.startsWith('LOCK TABLE public.'))).toBe(true);
      expect(commands[journalLock]).toContain('SHARE ROW EXCLUSIVE MODE');
    }
  });
  journalCase('J03', 'rolls back STARTED journal and all earlier direct effects on actual mid-attribution failure', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = []; let failed = false, directWrites = 0;
    const spy = vi.spyOn(f.first, 'query').mockImplementation(((...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); if (sql.startsWith('UPDATE public.')) directWrites++;
      if (sql.startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) { failed = true; return native('SELECT 1/0'); }
      return Reflect.apply(native, f.first, args);
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>;
    try { outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); } finally { spy.mockRestore(); }
    expect(failed).toBe(true); expect(directWrites).toBeGreaterThan(0);
    expect(commands.some(sql => sql.includes('F10_TYPED_JOURNAL_REGISTER'))).toBe(true); expect(commands.some(sql => sql.includes('F10_TYPED_JOURNAL_START'))).toBe(true);
    expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT');
    await expectUnapplied(f); await expectJournalEmpty(f); receipt('case-J03-rollback.json', { outcome, commands, directWrites, allJournalAndTargetEffectsAbsent: true });
  });
  journalCase('J04', 'real deferred journal coverage failure rolls back the already written journal and ownership tuple', async f => {
    const alternate = compileTypedTenantBackfill(f.chain.snapshot, f.chain.ownership, f.chain.constraints, { chunkSize: 3 });
    expect(alternate.status).toBe('PLANNED'); if (alternate.status !== 'PLANNED') throw Error('Genuine distinct technical plan required');
    const described = describeTypedBackfillJournal(alternate.plan); expect(described.status).toBe('DESCRIBED');
    if (described.status !== 'DESCRIBED') throw Error('Genuine distinct descriptor required');
    const native = Client.prototype.query.bind(f.first), commands: string[] = []; let injected = false, directWrites = 0, deferredCode = '';
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); if (sql.startsWith('UPDATE public.')) directWrites++;
      if (sql === 'SET CONSTRAINTS ALL IMMEDIATE' && !injected) {
        injected = true;
        // Real invoker/identity triggers validate this genuine descriptor. Its
        // deliberately absent chunks violate the unchanged deferred guards.
        await native('INSERT INTO nevora_tenancy.typed_backfill_journal_plan(plan_digest,descriptor_canonical,boundary,chunk_count) VALUES($1,$2,$3::jsonb,$4)',
          [alternate.plan.digest, canonicalOwnershipJson(described.descriptor), canonicalOwnershipJson(described.descriptor.boundary), described.descriptor.chunks.length]);
        try { return await Reflect.apply(native, f.first, args); } catch (error) { deferredCode = (error as { code: string }).code; throw error; }
      }
      return Reflect.apply(native, f.first, args);
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>;
    try { outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); } finally { spy.mockRestore(); }
    expect(injected).toBe(true); expect(directWrites).toBeGreaterThan(0); expect(deferredCode).toBe('P0001');
    expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT');
    await expectUnapplied(f); await expectJournalEmpty(f);
    receipt('case-J04-real-deferred-coverage.json', { outcome, commands, injectedGenuineDifferentPlanDigest: alternate.plan.digest, deferredCode,
      originalGuardsUnchanged: true, originalAndInjectedJournalRowsAbsentAfterRollback: true });
  });
  journalCase('J05', 'lost real BEGIN acknowledgement rolls back only its own attempt, then a fresh original-plan request applies safely', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); const result = await Reflect.apply(native, f.first, args);
      if (sql === 'BEGIN ISOLATION LEVEL SERIALIZABLE') throw Error('PRIVATE_FICTIONAL_JOURNAL_BEGIN_ACK'); return result;
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>;
    try { outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); } finally { spy.mockRestore(); }
    expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_GUARDED_BACKFILL_FAILED' });
    expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT');
    await expectUnapplied(f); await expectJournalEmpty(f);
    const fresh = await connect(f.name, f.request.identity.role);
    expect(await executeGuardedTypedLocalBackfillWithJournal(fresh, f.request)).toMatchObject({ status: 'APPLIED', planDigest: f.chain.plan.digest }); await expectJournalApplied(f);
    receipt('case-J05-begin-ack.json', { outcome, commands, independentOriginalTupleObservedBeforeFreshApply: true });
  });
  journalCase('J06', 'lost real COMMIT acknowledgement remains uncertain, performs no later SQL, and fresh retry leaves the entire tuple identical', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = [];
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql); const result = await Reflect.apply(native, f.first, args);
      if (sql === 'COMMIT') throw Error('PRIVATE_FICTIONAL_JOURNAL_COMMIT_ACK'); return result;
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>;
    try { outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); } finally { spy.mockRestore(); }
    expect(outcome).toEqual({ status: 'UNCERTAIN', code: 'COMMIT_OUTCOME_UNKNOWN', planDigest: f.chain.plan.digest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    expect(commands[commands.length - 1]).toBe('COMMIT'); expect(commands).not.toContain('ROLLBACK'); await expectJournalApplied(f);
    const tuple = { journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) };
    const fresh = await connect(f.name, f.request.identity.role), freshNative = fresh.query.bind(fresh), freshCommands: string[] = [];
    const freshSpy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => { freshCommands.push(queryText(args[0])); return Reflect.apply(freshNative, fresh, args); }) as Client['query']);
    try { expect(await executeGuardedTypedLocalBackfillWithJournal(fresh, f.request)).toMatchObject({ status: 'UNCHANGED', planDigest: f.chain.plan.digest }); }
    finally { freshSpy.mockRestore(); }
    expect(anyDml(freshCommands)).toBe(false); expect({ journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }).toEqual(tuple);
    receipt('case-J06-commit-ack.json', { outcome, commands, freshCommands, tuple, noAdapterEffectVerificationClaim: true });
  });
  journalCase('J07', 'lost real ROLLBACK acknowledgement remains uncertain and a fresh original-plan request safely applies exactly once', async f => {
    const native = Client.prototype.query.bind(f.first), commands: string[] = []; let dmlFailed = false;
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql);
      if (sql.startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) { dmlFailed = true; return native('SELECT 1/0'); }
      const result = await Reflect.apply(native, f.first, args);
      if (sql === 'ROLLBACK') throw Error('PRIVATE_FICTIONAL_JOURNAL_ROLLBACK_ACK'); return result;
    }) as Client['query']);
    let outcome: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>;
    try { outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); } finally { spy.mockRestore(); }
    expect(dmlFailed).toBe(true); expect(outcome).toEqual({ status: 'UNCERTAIN', code: 'ROLLBACK_UNCONFIRMED', planDigest: f.chain.plan.digest,
      reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    expect(commands[commands.length - 1]).toBe('ROLLBACK'); expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1);
    await expectUnapplied(f); await expectJournalEmpty(f);
    const fresh = await connect(f.name, f.request.identity.role), freshNative = fresh.query.bind(fresh), freshCommands: string[] = [];
    const freshSpy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => { freshCommands.push(queryText(args[0])); return Reflect.apply(freshNative, fresh, args); }) as Client['query']);
    try {
      expect(await executeGuardedTypedLocalBackfillWithJournal(fresh, f.request)).toMatchObject({ status: 'APPLIED', planDigest: f.chain.plan.digest });
      await expectJournalApplied(f); const tuple = { journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }, boundary = freshCommands.length;
      expect(await executeGuardedTypedLocalBackfillWithJournal(fresh, f.request)).toMatchObject({ status: 'UNCHANGED', planDigest: f.chain.plan.digest });
      expect(anyDml(freshCommands.slice(boundary))).toBe(false); expect({ journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }).toEqual(tuple);
    } finally { freshSpy.mockRestore(); }
    receipt('case-J07-rollback-ack.json', { outcome, commands, freshCommands, adapterDefiniteRollbackClaim: false, independentUnappliedTupleBeforeFreshOriginalPlanApply: true });
  });
  journalCase('J08', 'denies legacy applied metadata without an atomic journal and never creates a retrospective record', async f => {
    expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toMatchObject({ status: 'APPLIED' }); await expectApplied(f); await expectJournalEmpty(f);
    const targetBefore = await targets(f), metadataBefore = await metadata(f), boundary = f.queries.length;
    expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_RETRY_STATE_DRIFT' });
    expect(anyDml(f.queries.slice(boundary))).toBe(false); expect(await targets(f)).toEqual(targetBefore); expect(await metadata(f)).toEqual(metadataBefore); await expectJournalEmpty(f);
    receipt('case-J08-no-retrospective-journal.json', { legacyApplied: true, newModeDenied: true, noJournalOrTargetDml: true });
  });
  journalCase('J09', 'denies NOT_STARTED and partial or foreign journal ownership tuples without repairing them', async f => {
    await registerFixtureJournal(f); const observation = await journalObservation(f);
    expect(observation.rows.every((r: { state: string }) => r.state === 'NOT_STARTED')).toBe(true);
    expect(await executeGuardedTypedLocalBackfill(f.first, f.request)).toMatchObject({ status: 'APPLIED' });
    const tuple = { journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }, boundary = f.queries.length;
    expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_RETRY_STATE_DRIFT' });
    expect(anyDml(f.queries.slice(boundary))).toBe(false); expect({ journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }).toEqual(tuple);
    const partial = await fixture('J09-partial', true); await registerFixtureJournal(partial, 'UNKNOWN');
    await partial.observer.query('BEGIN');
    await partial.observer.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user,capture_manifest_sha256=$1', [partial.chain.plan.digest]);
    await partial.observer.query('SET LOCAL search_path=pg_catalog,public');
    await partial.observer.query('UPDATE public.employees SET workspace_id=$1 WHERE id=$2', ['workspace-fuel', ownedEmployee]);
    await partial.observer.query('UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL'); await partial.observer.query('COMMIT');
    const partialBefore = { journal: await journalRows(partial), targets: await targets(partial), metadata: await metadata(partial) }, partialBoundary = partial.queries.length;
    expect(await executeGuardedTypedLocalBackfillWithJournal(partial.first, partial.request)).toEqual({ status: 'BLOCKED', code: 'DIRECT_OWNERSHIP_STATE_DRIFT' });
    expect(anyDml(partial.queries.slice(partialBoundary))).toBe(false); expect({ journal: await journalRows(partial), targets: await targets(partial), metadata: await metadata(partial) }).toEqual(partialBefore);
    const foreign = await fixture('J09-foreign', true), alternate = compileTypedTenantBackfill(foreign.chain.snapshot, foreign.chain.ownership, foreign.chain.constraints, { chunkSize: 3 });
    expect(alternate.status).toBe('PLANNED'); if (alternate.status !== 'PLANNED') throw Error('Genuine distinct technical descriptor required');
    const described = describeTypedBackfillJournal(alternate.plan); expect(described.status).toBe('DESCRIBED'); if (described.status !== 'DESCRIBED') throw Error('Genuine alternate journal description required');
    await foreign.observer.query('SELECT nevora_tenancy.register_typed_backfill_journal($1)', [canonicalOwnershipJson(described.descriptor)]);
    expect(await executeGuardedTypedLocalBackfill(foreign.first, foreign.request)).toMatchObject({ status: 'APPLIED' });
    const foreignTuple = { journal: await journalRows(foreign), targets: await targets(foreign), metadata: await metadata(foreign) }, foreignBoundary = foreign.queries.length;
    expect(await executeGuardedTypedLocalBackfillWithJournal(foreign.first, foreign.request)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_RETRY_STATE_DRIFT' });
    expect(anyDml(foreign.queries.slice(foreignBoundary))).toBe(false); expect({ journal: await journalRows(foreign), targets: await targets(foreign), metadata: await metadata(foreign) }).toEqual(foreignTuple);
    receipt('case-J09-denied-tuples.json', {
      notStarted: { originalPlan: f.chain.plan, originalDescriptor: journalDescriptor(f), before: tuple,
        after: { journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) } },
      partial: { child: partial.name, originalPlan: partial.chain.plan, originalDescriptor: journalDescriptor(partial), before: partialBefore,
        after: { journal: await journalRows(partial), targets: await targets(partial), metadata: await metadata(partial) } },
      foreign: { child: foreign.name, originalPlan: foreign.chain.plan, originalDescriptor: journalDescriptor(foreign), alternatePlan: alternate.plan,
        alternateDescriptor: described.descriptor, before: foreignTuple,
        after: { journal: await journalRows(foreign), targets: await targets(foreign), metadata: await metadata(foreign) } },
      noRetrospectiveRepair: true });
  });
  journalCase('J10', 'preserves UNKNOWN terminal observations while independently rechecking all source and target effects on fresh retry', async f => {
    await registerFixtureJournal(f, 'UNKNOWN'); const before = await journalRows(f);
    expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toMatchObject({ status: 'APPLIED' });
    await expectJournalApplied(f); expect(await journalRows(f)).toEqual(before);
    const observation = await journalObservation(f); expect(observation.rows.every((r: { state: string }) => r.state === 'UNKNOWN')).toBe(true);
    const firstChunk = journalDescriptor(f).chunks[0]; expect(firstChunk).toBeDefined();
    await expect(f.observer.query('SELECT nevora_tenancy.observe_typed_backfill_journal($1,$2,$3,$4)', [canonicalOwnershipJson(journalDescriptor(f)), firstChunk.id, firstChunk.retryIdentity, 'STARTED']))
      .rejects.toMatchObject({ code: 'P0001' });
    expect(await journalRows(f)).toEqual(before);
    const fresh = await connect(f.name, f.request.identity.role), native = fresh.query.bind(fresh), commands: string[] = [];
    const spy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => { commands.push(queryText(args[0])); return Reflect.apply(native, fresh, args); }) as Client['query']);
    try { expect(await executeGuardedTypedLocalBackfillWithJournal(fresh, f.request)).toMatchObject({ status: 'UNCHANGED' }); } finally { spy.mockRestore(); }
    expect(anyDml(commands)).toBe(false); expect(commands.some(sql => sql.includes('FROM public."employees"'))).toBe(true);
    expect(commands.some(sql => sql.includes('clocker_pin_events_tenant_ownership'))).toBe(true); expect(commands.some(sql => sql.includes('F10_TYPED_JOURNAL_READ'))).toBe(true);
    expect(await journalRows(f)).toEqual(before); await expectJournalApplied(f);
    receipt('case-J10-terminal-unknown.json', { observation, commands, journalRowsUnchanged: true, independentSourceAndTargetRecheck: true, completionOrEffectsVerifiedClaim: false });
  });
  journalCase('J11', 'rejects absent or changed exact own child installation custody before BEGIN and before every effect', async f => {
    const originalTuple = { journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }, results: unknown[] = [];
    const mutations: { name: string; code: string; alter: (record: JournalInstallation) => JournalInstallation }[] = [
      { name: 'source', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, sourceSHA256: 'f'.repeat(64) }) },
      { name: 'database-oid', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, databaseOid: r.databaseOid + '1' }) },
      { name: 'marker', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, marker: r.marker + ':foreign' }) },
      { name: 'invocation', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, invocation: 'f'.repeat(16) }) },
      { name: 'schema-oid', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, schemaOid: r.schemaOid + '1' }) },
      { name: 'owner-oid', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, ownerRoleOid: r.operators[0].oid }) },
      { name: 'table-oid', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, tables: r.tables.map((t, i) => i ? t : { ...t, oid: t.oid + '1' }) }) },
      { name: 'function-definition', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, functions: r.functions.map((t, i) => i ? t : { ...t, definitionSHA256: 'f'.repeat(64) }) }) },
      { name: 'trigger-definition', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, triggers: r.triggers.map((t, i) => i ? t : { ...t, definitionSHA256: 'f'.repeat(64) }) }) },
      { name: 'operators', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT', alter: r => ({ ...r, operators: r.operators.slice(0, 1) }) },
    ];
    await withOwnInstallationMutation(f, 'missing', rows => rows.filter(r => r.database !== f.name), async () => {
      const boundary = f.queries.length, outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request);
      expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_INSTALLATION_REQUIRED' });
      expect(f.queries.slice(boundary)).not.toContain('BEGIN ISOLATION LEVEL SERIALIZABLE'); expect(anyDml(f.queries.slice(boundary))).toBe(false); results.push({ name: 'missing', outcome });
    });
    for (const mutation of mutations) await withOwnInstallationMutation(f, mutation.name, rows => rows.map(r => r.database === f.name ? mutation.alter(r) : r), async () => {
      const boundary = f.queries.length, outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request);
      expect(outcome).toEqual({ status: 'BLOCKED', code: mutation.code }); expect(f.queries.slice(boundary)).not.toContain('BEGIN ISOLATION LEVEL SERIALIZABLE');
      expect(anyDml(f.queries.slice(boundary))).toBe(false); expect({ journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }).toEqual(originalTuple); results.push({ name: mutation.name, outcome });
    });
    const signature = 'nevora_tenancy.register_typed_backfill_journal(text)';
    await f.observer.query('REVOKE EXECUTE ON FUNCTION ' + signature + ' FROM ' + quoted(f.request.identity.role));
    try { const boundary = f.queries.length; expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_INSTALLATION_DRIFT' });
      expect(f.queries.slice(boundary)).not.toContain('BEGIN ISOLATION LEVEL SERIALIZABLE'); expect(anyDml(f.queries.slice(boundary))).toBe(false); }
    finally {
      // Regranting the first principal alone changes raw proacl ordering.
      // Restore the exact original named grants, without catalog exemptions.
      await f.observer.query('REVOKE EXECUTE ON FUNCTION ' + signature + ' FROM ' + lease.operatorRoles.map(r => quoted(r.name)).join(','));
      for (const role of lease.operatorRoles) await f.observer.query('GRANT EXECUTE ON FUNCTION ' + signature + ' TO ' + quoted(role.name));
    }
    const restoredCatalog = await observeMigrationCatalog(f.observer);
    expect(restoredCatalog.catalog).toEqual(f.chain.facts.catalog);
    expect(restoredCatalog.digest).toBe(f.request.captureRequest.catalogBaseline.catalogDigest);
    receipt('case-J11-exact-grant-catalog-restoration.json', { signature, restoredCatalog, exactOriginalCatalogRestored: true, noCatalogAssertionExemptions: true });
    expect({ journal: await journalRows(f), targets: await targets(f), metadata: await metadata(f) }).toEqual(originalTuple);
    receipt('case-J11-custody-denials.json', { results, ownChildRecordOnly: true, exactLeaseBytesRestored: true, actualNamedGrantRevokeRestored: true });
  });
  journalCase('J12', 'denies request descriptor injection, cloned plans, namespace and authority drift without reissuing provenance', async f => {
    const mutations = [
      { name: 'descriptor injection', request: { ...f.request, journal: journalDescriptor(f) }, code: 'UNSUPPORTED_REQUEST' },
      { name: 'clone plan', request: { ...f.request, plan: JSON.parse(JSON.stringify(f.chain.plan)) }, code: 'TYPED_PLAN_REQUIRED' },
      { name: 'foreign metadata clone', request: { ...f.request, plan: { ...f.chain.plan, digest: 'f'.repeat(64) } }, code: 'TYPED_PLAN_REQUIRED' },
      { name: 'namespace source', request: { ...f.request, captureRequest: { ...f.request.captureRequest, sourceDigest: 'f'.repeat(64) } }, code: 'CAPTURE_BINDING_DRIFT' },
      { name: 'authority manifest', request: { ...f.request, authority: { ...f.request.authority, planDigest: 'f'.repeat(64) } }, code: 'OPERATOR_CUSTODY_BINDING_DRIFT' },
      { name: 'operator oid', request: { ...f.request, identity: { ...f.request.identity, roleOid: f.request.identity.roleOid + '1' } }, code: 'OWNED_LOCAL_IDENTITY_DRIFT' },
    ];
    const results: unknown[] = [];
    for (const m of mutations) { const boundary = f.queries.length, outcome = await executeGuardedTypedLocalBackfillWithJournal(f.first, m.request);
      expect(outcome).toEqual({ status: 'BLOCKED', code: m.code }); expect(f.queries).toHaveLength(boundary); results.push({ name: m.name, outcome }); }
    await expectUnapplied(f); await expectJournalEmpty(f);
    // Root-approved negative setup: installing after a genuine capture must
    // not retrofit that earlier catalog/plan into journal integration authority.
    const late = await fixture('J12-late-install');
    const originalCaptureChecksum = ownershipDigest(late.chain.facts), originalPlanDigest = late.chain.plan.digest;
    const installed = await installJournalForRootFixture(late.id, late.name, late.oid, late.marker, late.observer, 'INTENTIONAL_AFTER_CAPTURE_DENIAL');
    const described = describeTypedBackfillJournal(late.chain.plan); expect(described.status).toBe('DESCRIBED');
    if (described.status !== 'DESCRIBED') throw Error('Genuine unchanged original descriptor required');
    late.journal = { installation: installed, descriptor: described.descriptor };
    const current = await observeMigrationCatalog(late.observer); assertJournalOnlyCatalogDelta(late.chain.facts.catalog, current.catalog, journalInstallCatalogs.get(late.name)!);
    late.finalCatalogChanges = 'JOURNAL_INSTALLATION'; late.permittedJournalCatalogDigest = current.digest;
    const boundary = late.queries.length;
    expect(await executeGuardedTypedLocalBackfillWithJournal(late.first, late.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_CATALOG_DRIFT' });
    expect(late.queries.slice(boundary)).not.toContain('BEGIN ISOLATION LEVEL SERIALIZABLE'); expect(anyDml(late.queries.slice(boundary))).toBe(false);
    expect(ownershipDigest(late.chain.facts)).toBe(originalCaptureChecksum); expect(late.chain.plan.digest).toBe(originalPlanDigest);
    await expectUnapplied(late); await expectJournalEmpty(late);
    receipt('case-J12-late-install-denied.json', { originalCaptureChecksum, originalPlanDigest, installation: installed,
      originalCatalog: late.chain.facts.catalog, currentCatalog: current, independentlyRetainedInstallationCatalogs: journalInstallCatalogs.get(late.name), exactJournalOnlyCatalogDelta: true, noOwnedBeginOrEffects: true,
      expectedClosedDenial: 'CURRENT_CATALOG_DRIFT', retrospectiveRegistrationOrRepair: false });
    receipt('case-J12-unissued-input-denials.json', results);
  });
  journalCase('J13', 'denies current source catalog and role drift without any journal or metadata effects', async f => {
    await f.observer.query('BEGIN'); await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'");
    await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET first_name='Journal source drift' WHERE id=$1", [ownedEmployee]);
    await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'"); await f.observer.query('COMMIT');
    try { const boundary = f.queries.length; expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_SOURCE_DRIFT' });
      expect(anyDml(f.queries.slice(boundary))).toBe(false); await expectJournalEmpty(f); }
    finally { await f.observer.query('BEGIN'); await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'");
      await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET first_name='Fictional' WHERE id=$1", [ownedEmployee]);
      await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'"); await f.observer.query('COMMIT'); }
    await f.observer.query('CREATE INDEX typed_journal_fixture_drift ON public.employees(first_name)');
    try { const boundary = f.queries.length; expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CURRENT_CATALOG_DRIFT' }); expect(anyDml(f.queries.slice(boundary))).toBe(false); }
    finally { await f.observer.query('DROP INDEX public.typed_journal_fixture_drift'); }
    if (!admin) throw Error('Root base role unavailable');
    await admin.query('GRANT pg_write_all_data TO ' + quoted(f.request.identity.role) + ' WITH INHERIT TRUE');
    try { const boundary = f.queries.length; expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'OPERATOR_ROLE_DRIFT' }); expect(anyDml(f.queries.slice(boundary))).toBe(false); }
    finally { await admin.query('REVOKE pg_write_all_data FROM ' + quoted(f.request.identity.role)); }
    await expectUnapplied(f); await expectJournalEmpty(f);
    receipt('case-J13-current-drift-denials.json', { currentSourceRestored: true, catalogIndexRemoved: true, namedRoleMembershipRestored: true, noJournalOrTargetDml: true });
  });
  journalCase('J14', 'refuses the caller transaction without rolling it back or reading the journal', async f => {
    await f.first.query('BEGIN'); await f.first.query("SET LOCAL application_name='fictional-caller-journal-transaction'"); const boundary = f.queries.length;
    try {
      expect(await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request)).toEqual({ status: 'BLOCKED', code: 'CLIENT_NOT_IDLE' });
      expect(f.queries).toHaveLength(boundary); expect(f.first.getTransactionStatus()).toBe('T');
      expect((await f.first.query("SELECT current_setting('application_name') marker")).rows[0].marker).toBe('fictional-caller-journal-transaction');
    } finally { await f.first.query('ROLLBACK'); }
    await expectUnapplied(f); await expectJournalEmpty(f); receipt('case-J14-caller-transaction.json', { callerRollbackOnly: true, noEntrypointQueries: true });
  });

  // JR_RECONCILIATION_NATIVE_BEGIN
  // Root-only opt-in additions. A genuine uncertain executor result is retained
  // by identity; public fields and observed native idle never establish its
  // original disposition. No reconciliation callback invokes apply/retry DML.
  type JRUncertain = Extract<Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>, { status: 'UNCERTAIN' }>;
  async function jrMintUncertain(f: Fixture, ack: 'COMMIT' | 'ROLLBACK'): Promise<{ attempt: JRUncertain; commands: string[] }> {
    const native = Client.prototype.query.bind(f.first), commands: string[] = []; let failedDml = false, acknowledgedNative = false;
    const spy = vi.spyOn(f.first, 'query').mockImplementation((async (...args: unknown[]) => {
      const sql = queryText(args[0]); commands.push(sql);
      if (ack === 'ROLLBACK' && sql.startsWith('INSERT INTO public."clocker_pin_events_tenant_ownership"')) {
        failedDml = true; return native('SELECT 1/0');
      }
      const result = await Reflect.apply(native, f.first, args);
      if (sql === ack) { acknowledgedNative = true; throw Error('PRIVATE_FICTIONAL_JR_' + ack + '_ACK'); }
      return result;
    }) as Client['query']);
    let attempt: Awaited<ReturnType<typeof executeGuardedTypedLocalBackfillWithJournal>>;
    try { attempt = await executeGuardedTypedLocalBackfillWithJournal(f.first, f.request); } finally { spy.mockRestore(); }
    expect(acknowledgedNative).toBe(true); expect(failedDml).toBe(ack === 'ROLLBACK');
    expect(attempt).toEqual({ status: 'UNCERTAIN', code: ack === 'COMMIT' ? 'COMMIT_OUTCOME_UNKNOWN' : 'ROLLBACK_UNCONFIRMED',
      planDigest: f.chain.plan.digest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
    if (attempt.status !== 'UNCERTAIN') throw Error('A genuine original uncertain journal attempt is required');
    expect(commands[commands.length - 1]).toBe(ack); expect(commands.filter(sql => sql === ack)).toHaveLength(1);
    if (ack === 'COMMIT') { expect(commands).not.toContain('ROLLBACK'); await expectJournalApplied(f); }
    else { expect(commands).not.toContain('COMMIT'); await expectUnapplied(f); await expectJournalEmpty(f); }
    return { attempt, commands };
  }
  async function jrTuple(f: Fixture) {
    return { originalRows: await originalRows(f.observer), metadata: await metadata(f), targets: await targets(f), journal: await journalRows(f) };
  }
  function jrNoEffects(commands: string[]) {
    expect(anyDml(commands)).toBe(false);
    expect(commands.some(sql => /(?:register|observe)_typed_backfill_journal\s*\(/i.test(sql))).toBe(false);
    expect(commands.some(sql => /F10_TYPED_JOURNAL_(REGISTER|START)/.test(sql))).toBe(false);
  }
  function jrExpected(f: Fixture, metadataState: 'APPLIED_METADATA_PRESENT' | 'ORIGINAL_METADATA_ABSENT') {
    return { status: 'OBSERVED', mode: 'WHOLE_PLAN_ATOMIC', metadata: metadataState, planDigest: f.chain.plan.digest,
      sourceRows: f.chain.facts.tables.reduce((n, t) => n + t.expectedCount, 0),
      verification: 'OWNED_LOCAL_ORIGINAL_ATTEMPT_OBSERVATION_NOT_COMMIT_DISPOSITION',
      journal: { descriptorChecksum: journalDescriptor(f).descriptorChecksum, chunkCount: journalDescriptor(f).chunks.length, effectsVerified: false,
        observation: metadataState === 'APPLIED_METADATA_PRESENT' ? 'MATCHING_EXISTING_OBSERVATIONS' : 'NO_JOURNAL_OBSERVED' } };
  }
  async function jrWithFreshClient<T>(f: Fixture, label: string, check: (client: Client, commands: string[]) => Promise<T>): Promise<T> {
    const fresh = await connect(f.name, f.request.identity.role), native = Client.prototype.query.bind(fresh), commands: string[] = [];
    const spy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => {
      commands.push(queryText(args[0])); return Reflect.apply(native, fresh, args);
    }) as Client['query']);
    let closed = false;
    try { expect(fresh).not.toBe(f.first); return await check(fresh, commands); }
    finally {
      spy.mockRestore();
      try { if (fresh.getTransactionStatus() !== 'I') await fresh.query('ROLLBACK'); }
      finally { await fresh.end(); closed = true; }
      // Keep the original clients map so unchanged afterAll independently
      // accounts for this ended native client and exact child deletion.
      receipt('case-' + f.id + '-' + label + '-fresh-client.json', { database: f.name, databaseOid: f.oid,
        role: f.request.identity.role, commands, closed, retainedInOriginalCleanupMap: clients.has(fresh) });
    }
  }
  function jrLockOrder(commands: string[]) {
    const begin = commands.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const source = commands.findIndex((sql, i) => i > begin && sql.startsWith('LOCK TABLE public.'));
    const journal = commands.findIndex((sql, i) => i > begin && sql.includes('F10_TYPED_JOURNAL_LOCK'));
    const firstRead = commands.findIndex((sql, i) => i > begin && /^(?:\/\*.*?\*\/\s*)?SELECT\b/.test(sql));
    expect(begin).toBeGreaterThan(-1); expect(source).toBeGreaterThan(begin); expect(journal).toBeGreaterThan(source); expect(firstRead).toBeGreaterThan(journal);
    expect(commands[source].match(/public\."/g)).toHaveLength(70);
    expect(commands[journal]).toContain('typed_backfill_journal_chunk'); expect(commands[journal]).toContain('typed_backfill_journal_plan');
    expect(commands[journal].indexOf('typed_backfill_journal_chunk')).toBeLessThan(commands[journal].indexOf('typed_backfill_journal_plan'));
    jrNoEffects(commands);
  }
  async function jrJournalCorruption(f: Fixture, label: string, change: () => Promise<void>, check: () => Promise<void>) {
    // Explicit root-authorized corruption of this exact fictional child only.
    // Native trigger definitions/flags stay unchanged. Replica setting is local
    // to the installer transaction, restored before the original-role observer.
    const before = await jrTuple(f), catalog = await observeMigrationCatalog(f.observer);
    const settings = (await f.observer.query('SELECT current_user,session_user,current_setting(\'session_replication_role\') replication')).rows[0];
    expect(settings.current_user).toBe(lease.user); expect(settings.session_user).toBe(lease.user); expect(settings.replication).toBe('origin');
    let changed: Awaited<ReturnType<typeof jrTuple>> | undefined, afterDenial: Awaited<ReturnType<typeof jrTuple>> | undefined;
    try {
      await f.observer.query('BEGIN');
      try { await f.observer.query("SET LOCAL session_replication_role='replica'"); await change(); await f.observer.query('COMMIT'); }
      catch (error) { await f.observer.query('ROLLBACK'); throw error; }
      expect((await f.observer.query("SELECT current_setting('session_replication_role') replication")).rows[0].replication).toBe('origin');
      changed = await jrTuple(f); await check(); afterDenial = await jrTuple(f); expect(afterDenial).toEqual(changed);
    } finally {
      if (f.observer.getTransactionStatus() !== 'I') await f.observer.query('ROLLBACK');
      await f.observer.query('BEGIN');
      try {
        await f.observer.query("SET LOCAL session_replication_role='replica'");
        await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_chunk');
        await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_plan');
        for (const row of before.journal.typed_backfill_journal_plan) await f.observer.query(
          'INSERT INTO nevora_tenancy.typed_backfill_journal_plan(plan_digest,descriptor_canonical,boundary,chunk_count) VALUES($1,$2,$3::jsonb,$4::int8)', row);
        for (const row of before.journal.typed_backfill_journal_chunk) await f.observer.query(
          'INSERT INTO nevora_tenancy.typed_backfill_journal_chunk(plan_digest,chunk_id,ordinal,chunk_canonical,retry_identity,state) VALUES($1,$2,$3::int8,$4,$5,$6)', row);
        await f.observer.query('COMMIT');
      } catch (error) { await f.observer.query('ROLLBACK'); throw error; }
      const restoredSettings = (await f.observer.query('SELECT current_user,session_user,current_setting(\'session_replication_role\') replication')).rows[0];
      expect(restoredSettings).toEqual(settings); expect(await jrTuple(f)).toEqual(before);
      expect(await observeMigrationCatalog(f.observer)).toEqual(catalog);
      receipt('case-' + f.id + '-' + label + '-journal-corruption.json', { before, changed, afterDenial, restored: await jrTuple(f),
        originalCatalogDigest: catalog.digest, nativeSettingsBefore: settings, nativeSettingsAfter: restoredSettings,
        corruptionIsRootFixtureOnly: true, guardDefinitionOrFlagChanges: false, reconciliationRepair: false });
    }
  }

  journalCase('JR01', 'JR01 observes applied metadata after actual COMMIT ACK loss, waits on original source locks and performs no effect SQL', async f => {
    const original = await jrMintUncertain(f, 'COMMIT'), before = await jrTuple(f);
    await jrWithFreshClient(f, 'applied', async (fresh, commands) => {
      if (!admin) throw Error('Independent owned base monitor required');
      const pid = (await fresh.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      const holderPid = (await f.observer.query('SELECT pg_backend_pid() pid')).rows[0].pid;
      commands.length = 0; await f.observer.query('BEGIN'); await f.observer.query('LOCK TABLE public.employees IN SHARE ROW EXCLUSIVE MODE');
      const pending = reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt); let waitEvidence: unknown, outcome: unknown;
      try {
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = (await admin.query("SELECT a.pid,a.datname,a.usename,a.wait_event_type,a.wait_event,a.query,pg_blocking_pids(a.pid) blockers,l.relation::text relation_oid,l.mode,l.granted FROM pg_stat_activity a JOIN pg_locks l ON l.pid=a.pid WHERE a.pid=$1 AND a.datname=$2 AND a.usename=$3 AND a.wait_event_type='Lock' AND NOT l.granted AND l.locktype='relation'", [pid, f.name, f.request.identity.role])).rows;
          if (rows.some(r => r.blockers.includes(holderPid) && r.mode === 'ShareRowExclusiveLock' && r.query.startsWith('LOCK TABLE public.'))) { waitEvidence = rows; break; }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waitEvidence).toBeDefined();
        const begin = commands.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE');
        expect(commands.slice(begin + 1).every(sql => sql.startsWith('SET LOCAL ') || sql.startsWith('LOCK TABLE public.'))).toBe(true);
        await f.observer.query('COMMIT'); outcome = await pending; expect(outcome).toEqual(jrExpected(f, 'APPLIED_METADATA_PRESENT'));
      } finally { if (f.observer.getTransactionStatus() !== 'I') await f.observer.query('ROLLBACK'); await Promise.allSettled([pending]); }
      jrLockOrder(commands); expect(await jrTuple(f)).toEqual(before); await expectJournalApplied(f);
      receipt('case-JR01-reconciliation.json', { originalAttempt: original.attempt, originalCommands: original.commands, outcome, waitEvidence,
        sourceLockHolderPid: holderPid, reconciliationPid: pid, commands, before, after: await jrTuple(f),
        originalAttemptStillUncertain: original.attempt.status === 'UNCERTAIN', commitDispositionClaim: false, effectsVerified: false });
    });
  });
  journalCase('JR02', 'JR02 observes original metadata and journal wholly absent after actual ROLLBACK ACK loss without replay', async f => {
    const original = await jrMintUncertain(f, 'ROLLBACK'), before = await jrTuple(f);
    await jrWithFreshClient(f, 'absent', async (fresh, commands) => {
      const outcome = await reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt);
      expect(outcome).toEqual(jrExpected(f, 'ORIGINAL_METADATA_ABSENT')); jrLockOrder(commands);
      expect(await jrTuple(f)).toEqual(before); await expectUnapplied(f); await expectJournalEmpty(f);
      expect(commands.some(sql => sql.includes('F10_TYPED_JOURNAL_CHUNKS_EXIST'))).toBe(true);
      receipt('case-JR02-reconciliation.json', { originalAttempt: original.attempt, originalCommands: original.commands, outcome, commands,
        before, after: await jrTuple(f), definiteRollbackDispositionClaim: false, replayOrApply: false });
    });
  });
  journalCase('JR03', 'JR03 rejects copied serialized accessor Proxy and same-client uncertain handles before any SQL or input effects', async f => {
    const original = await jrMintUncertain(f, 'COMMIT'), before = await jrTuple(f);
    await jrWithFreshClient(f, 'identity', async (fresh, commands) => {
      let getterCalls = 0, proxyTraps = 0, clientReads = 0;
      const accessor = Object.defineProperty({}, 'status', { enumerable: true, get() { getterCalls++; throw Error('Untrusted receipt getter'); } });
      const proxy = new Proxy(original.attempt, { get() { proxyTraps++; throw Error('Untrusted receipt get'); },
        getPrototypeOf() { proxyTraps++; throw Error('Untrusted receipt prototype'); }, ownKeys() { proxyTraps++; throw Error('Untrusted receipt keys'); },
        getOwnPropertyDescriptor() { proxyTraps++; throw Error('Untrusted receipt descriptor'); } });
      const hostileClient = new Proxy(fresh, { get() { clientReads++; throw Error('No client reads before receipt admission'); } });
      const invalid: { name: string; value: unknown }[] = [
        { name: 'plain clone', value: { ...original.attempt } }, { name: 'serialized roundtrip', value: JSON.parse(JSON.stringify(original.attempt)) },
        { name: 'serialized text', value: JSON.stringify(original.attempt) }, { name: 'inherited fields', value: Object.create(original.attempt) },
        { name: 'own accessor', value: accessor }, { name: 'Proxy identity', value: proxy }, { name: 'null', value: null },
      ];
      const results: unknown[] = [];
      for (const item of invalid) {
        const boundary = commands.length;
        const outcome = await reconcileGuardedTypedLocalBackfillJournal(hostileClient, item.value);
        expect(outcome).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED' });
        expect(commands).toHaveLength(boundary); results.push({ name: item.name, outcome });
      }
      const native = Client.prototype.query.bind(f.first), sameCommands: string[] = [];
      const spy = vi.spyOn(f.first, 'query').mockImplementation(((...args: unknown[]) => { sameCommands.push(queryText(args[0])); return Reflect.apply(native, f.first, args); }) as Client['query']);
      try { expect(await reconcileGuardedTypedLocalBackfillJournal(f.first, original.attempt)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_FRESH_CLIENT_REQUIRED' }); }
      finally { spy.mockRestore(); }
      expect(sameCommands).toEqual([]); expect(commands).toEqual([]); expect(getterCalls).toBe(0); expect(proxyTraps).toBe(0); expect(clientReads).toBe(0);
      expect(await jrTuple(f)).toEqual(before); await expectJournalApplied(f);
      receipt('case-JR03-admission.json', { results, sameCommands, commands, getterCalls, proxyTraps, clientReads, before, after: await jrTuple(f) });
    });
  });
  journalCase('JR04', 'JR04 retains matching terminal UNKNOWN without downgrade or completion on original-attempt observation', async f => {
    await registerFixtureJournal(f, 'UNKNOWN'); const unknownBefore = await journalRows(f), original = await jrMintUncertain(f, 'COMMIT');
    expect(await journalRows(f)).toEqual(unknownBefore); const before = await jrTuple(f);
    await jrWithFreshClient(f, 'unknown', async (fresh, commands) => {
      const outcome = await reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt);
      expect(outcome).toEqual(jrExpected(f, 'APPLIED_METADATA_PRESENT')); jrLockOrder(commands);
      expect(await jrTuple(f)).toEqual(before); const observation = await journalObservation(f);
      expect(observation.rows.every((r: { state: string }) => r.state === 'UNKNOWN')).toBe(true);
      expect(observation.effectsVerified).toBe(false); expect(observation.reconciliation).toBeNull();
      const first = journalDescriptor(f).chunks[0]; expect(first).toBeDefined();
      await expect(f.observer.query('SELECT nevora_tenancy.observe_typed_backfill_journal($1,$2,$3,$4)', [canonicalOwnershipJson(journalDescriptor(f)), first.id, first.retryIdentity, 'STARTED'])).rejects.toMatchObject({ code: 'P0001' });
      expect(await jrTuple(f)).toEqual(before);
      receipt('case-JR04-unknown.json', { originalAttempt: original.attempt, originalCommands: original.commands, outcome, commands, observation,
        before, after: await jrTuple(f), downgradeOrCompletion: false });
    });
  });
  journalCase('JR05', 'JR05 refuses absent NOT_STARTED partial foreign and unapplied journal tuples without retrospective repair', async f => {
    const absentAttempt = await jrMintUncertain(f, 'ROLLBACK');
    await jrWithFreshClient(f, 'tuples', async (fresh, commands) => {
      const results: unknown[] = [];
      const blocked = async (attempt: JRUncertain, label: string, code: string) => {
        const before = await jrTuple(f), boundary = commands.length, outcome = await reconcileGuardedTypedLocalBackfillJournal(fresh, attempt);
        expect(outcome).toEqual({ status: 'BLOCKED', code }); jrNoEffects(commands.slice(boundary));
        expect(await jrTuple(f)).toEqual(before); results.push({ label, outcome, commands: commands.slice(boundary), before, after: await jrTuple(f) });
      };
      await jrJournalCorruption(f, 'unapplied-plan', async () => {
        await f.observer.query('SELECT nevora_tenancy.register_typed_backfill_journal($1)', [canonicalOwnershipJson(journalDescriptor(f))]);
      }, async () => blocked(absentAttempt.attempt, 'unapplied matching header+chunks', 'TYPED_JOURNAL_UNAPPLIED_JOURNAL_DRIFT'));
      // An orphan chunk still blocks an unapplied tuple even without its header;
      // this explicitly exercises the separate native chunk-absence query.
      await jrJournalCorruption(f, 'unapplied-chunk', async () => {
        await f.observer.query('SELECT nevora_tenancy.register_typed_backfill_journal($1)', [canonicalOwnershipJson(journalDescriptor(f))]);
        await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_plan');
      }, async () => blocked(absentAttempt.attempt, 'unapplied orphan chunks', 'TYPED_JOURNAL_UNAPPLIED_JOURNAL_DRIFT'));
      await expectUnapplied(f); await expectJournalEmpty(f);
      const appliedAttempt = await jrMintUncertain(f, 'COMMIT');
      await jrJournalCorruption(f, 'applied-missing', async () => {
        await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_chunk'); await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_plan');
      }, async () => blocked(appliedAttempt.attempt, 'applied missing journal', 'TYPED_JOURNAL_RETRY_STATE_DRIFT'));
      await jrJournalCorruption(f, 'applied-not-started', async () => {
        await f.observer.query("UPDATE nevora_tenancy.typed_backfill_journal_chunk SET state='NOT_STARTED'");
      }, async () => blocked(appliedAttempt.attempt, 'applied NOT_STARTED', 'TYPED_JOURNAL_RETRY_STATE_DRIFT'));
      await jrJournalCorruption(f, 'applied-partial', async () => {
        await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_chunk WHERE plan_digest=$1 AND chunk_id=$2', [f.chain.plan.digest, journalDescriptor(f).chunks[0].id]);
      }, async () => blocked(appliedAttempt.attempt, 'applied missing chunk', 'TYPED_JOURNAL_STORAGE_FAILED'));
      const alternate = compileTypedTenantBackfill(f.chain.snapshot, f.chain.ownership, f.chain.constraints, { chunkSize: 3 });
      expect(alternate.status).toBe('PLANNED'); if (alternate.status !== 'PLANNED') throw Error('Genuine alternate compiler plan required');
      const described = describeTypedBackfillJournal(alternate.plan); expect(described.status).toBe('DESCRIBED');
      if (described.status !== 'DESCRIBED') throw Error('Genuine alternate descriptor required');
      await jrJournalCorruption(f, 'applied-foreign', async () => {
        await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_chunk'); await f.observer.query('DELETE FROM nevora_tenancy.typed_backfill_journal_plan');
        await f.observer.query('SELECT nevora_tenancy.register_typed_backfill_journal($1)', [canonicalOwnershipJson(described.descriptor)]);
      }, async () => blocked(appliedAttempt.attempt, 'applied foreign plan descriptor', 'TYPED_JOURNAL_RETRY_STATE_DRIFT'));
      await expectJournalApplied(f);
      receipt('case-JR05-denied-tuples.json', { absentAttempt: absentAttempt.attempt, absentCommands: absentAttempt.commands,
        appliedAttempt: appliedAttempt.attempt, appliedCommands: appliedAttempt.commands, originalPlan: f.chain.plan, originalDescriptor: journalDescriptor(f),
        alternatePlan: alternate.plan, alternateDescriptor: described.descriptor, results, noReconciliationRepair: true });
    });
  });
  journalCase('JR06', 'JR06 denies original source catalog operator and owned-installation drift without journal or attribution writes', async f => {
    const original = await jrMintUncertain(f, 'ROLLBACK'), baseline = await jrTuple(f), baselineCatalog = await observeMigrationCatalog(f.observer);
    await jrWithFreshClient(f, 'drift', async (fresh, commands) => {
      const results: unknown[] = [];
      const blocked = async (label: string, code: string) => {
        const before = await jrTuple(f), boundary = commands.length, outcome = await reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt);
        expect(outcome).toEqual({ status: 'BLOCKED', code }); jrNoEffects(commands.slice(boundary));
        expect(await jrTuple(f)).toEqual(before); results.push({ label, outcome, before, after: await jrTuple(f), commands: commands.slice(boundary) });
      };
      await f.observer.query('BEGIN');
      try { await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'");
        await f.observer.query('SET LOCAL search_path=pg_catalog,public'); await f.observer.query("UPDATE public.employees SET first_name='JR fictional source drift' WHERE id=$1", [ownedEmployee]);
        await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'"); await f.observer.query('COMMIT');
      } catch (error) { await f.observer.query('ROLLBACK'); throw error; }
      try { await blocked('current original source', 'CURRENT_SOURCE_DRIFT'); }
      finally { await f.observer.query('BEGIN');
        try { await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='EXPANDED_LEGACY'"); await f.observer.query('SET LOCAL search_path=pg_catalog,public');
          await f.observer.query('UPDATE public.employees SET first_name=$1 WHERE id=$2', [f.original.employees.rows.find(row => row[f.original.employees.columns.indexOf('id')] === ownedEmployee)![f.original.employees.columns.indexOf('first_name')], ownedEmployee]);
          await f.observer.query("UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED'"); await f.observer.query('COMMIT');
        } catch (error) { await f.observer.query('ROLLBACK'); throw error; } }
      await f.observer.query('CREATE INDEX typed_jr_fixture_drift ON public.employees(first_name)');
      const index = (await f.observer.query("SELECT c.oid::text oid,c.relowner::text owner,i.indrelid::text table_oid FROM pg_class c JOIN pg_index i ON i.indexrelid=c.oid WHERE c.oid=to_regclass('public.typed_jr_fixture_drift') AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) AND i.indrelid=to_regclass('public.employees')")).rows[0];
      expect(index).toBeDefined();
      try { await blocked('current catalog index', 'CURRENT_CATALOG_DRIFT'); }
      finally { const current = (await f.observer.query("SELECT c.oid::text oid,c.relowner::text owner,i.indrelid::text table_oid FROM pg_class c JOIN pg_index i ON i.indexrelid=c.oid WHERE c.oid=to_regclass('public.typed_jr_fixture_drift') AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) AND i.indrelid=to_regclass('public.employees')")).rows;
        expect(current).toEqual([index]); await f.observer.query('DROP INDEX public.typed_jr_fixture_drift');
        expect((await f.observer.query("SELECT to_regclass('public.typed_jr_fixture_drift') oid")).rows[0].oid).toBeNull(); }
      if (!admin) throw Error('Owned base operator-role controller required');
      await admin.query('GRANT pg_write_all_data TO ' + quoted(f.request.identity.role) + ' WITH INHERIT TRUE');
      try { await blocked('actual original operator membership', 'OPERATOR_ROLE_DRIFT'); }
      finally { await admin.query('REVOKE pg_write_all_data FROM ' + quoted(f.request.identity.role)); }
      await withOwnInstallationMutation(f, 'JR06-missing', rows => rows.filter(row => row.database !== f.name),
        async () => blocked('missing exact child installation custody', 'TYPED_JOURNAL_INSTALLATION_REQUIRED'));
      await withOwnInstallationMutation(f, 'JR06-source', rows => rows.map(row => row.database === f.name ? { ...row, sourceSHA256: 'f'.repeat(64) } : row),
        async () => blocked('child installed source digest', 'TYPED_JOURNAL_INSTALLATION_DRIFT'));
      expect(await jrTuple(f)).toEqual(baseline); expect(await observeMigrationCatalog(f.observer)).toEqual(baselineCatalog);
      await expectUnapplied(f); await expectJournalEmpty(f);
      receipt('case-JR06-drift.json', { originalAttempt: original.attempt, originalCommands: original.commands, results,
        removedOwnedIndex: index, before: baseline, restored: await jrTuple(f), originalCatalog: baselineCatalog,
        exactOriginalSourceAndCatalogRestored: true, noReconciliationDml: true });
    });
  });
  journalCase('JR07', 'JR07 keeps lost reconciliation COMMIT and ROLLBACK acknowledgements uncertain and only the original handle can be observed again', async f => {
    const original = await jrMintUncertain(f, 'COMMIT'), before = await jrTuple(f);
    let uncertainCommit: Awaited<ReturnType<typeof reconcileGuardedTypedLocalBackfillJournal>> | undefined;
    await jrWithFreshClient(f, 'observe-commit-ack', async (fresh, commands) => {
      const native = Client.prototype.query.bind(fresh); let realCommit = false;
      const spy = vi.spyOn(fresh, 'query').mockImplementation((async (...args: unknown[]) => {
        const sql = queryText(args[0]); commands.push(sql); const result = await Reflect.apply(native, fresh, args);
        if (sql === 'COMMIT') { realCommit = true; throw Error('PRIVATE_FICTIONAL_JR_RECONCILIATION_COMMIT_ACK'); } return result;
      }) as Client['query']);
      try { uncertainCommit = await reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt); } finally { spy.mockRestore(); }
      expect(realCommit).toBe(true); expect(uncertainCommit).toEqual({ status: 'UNCERTAIN', code: 'RECONCILIATION_COMMIT_OUTCOME_UNKNOWN',
        planDigest: f.chain.plan.digest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
      expect(commands[commands.length - 1]).toBe('COMMIT'); expect(commands).not.toContain('ROLLBACK'); jrLockOrder(commands);
      expect(await jrTuple(f)).toEqual(before);
      receipt('case-JR07-reconciliation-commit-ack.json', { originalAttempt: original.attempt, outcome: uncertainCommit, commands, before, after: await jrTuple(f), commitDispositionClaim: false });
    });
    await jrWithFreshClient(f, 'observe-rollback-ack', async (fresh, commands) => {
      const invalidBoundary = commands.length;
      expect(await reconcileGuardedTypedLocalBackfillJournal(fresh, uncertainCommit)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED' });
      expect(commands).toHaveLength(invalidBoundary);
      const native = Client.prototype.query.bind(fresh); let actualReadFailure = false, realRollback = false;
      const spy = vi.spyOn(fresh, 'query').mockImplementation((async (...args: unknown[]) => {
        const sql = queryText(args[0]); commands.push(sql);
        if (!actualReadFailure && sql.includes('F10_TYPED_JOURNAL_READ')) { actualReadFailure = true; return native('SELECT 1/0'); }
        const result = await Reflect.apply(native, fresh, args);
        if (sql === 'ROLLBACK') { realRollback = true; throw Error('PRIVATE_FICTIONAL_JR_RECONCILIATION_ROLLBACK_ACK'); } return result;
      }) as Client['query']);
      let uncertainRollback: Awaited<ReturnType<typeof reconcileGuardedTypedLocalBackfillJournal>>;
      try { uncertainRollback = await reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt); } finally { spy.mockRestore(); }
      expect(actualReadFailure).toBe(true); expect(realRollback).toBe(true);
      expect(uncertainRollback).toEqual({ status: 'UNCERTAIN', code: 'ROLLBACK_UNCONFIRMED', planDigest: f.chain.plan.digest,
        reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' });
      expect(commands[commands.length - 1]).toBe('ROLLBACK'); expect(commands.filter(sql => sql === 'ROLLBACK')).toHaveLength(1); expect(commands).not.toContain('COMMIT'); jrLockOrder(commands);
      const failureCommands = [...commands]; expect(await jrTuple(f)).toEqual(before);
      const boundary = commands.length, retryNative = Client.prototype.query.bind(fresh);
      // Restore a recorder after the fault spy has restored the native method.
      // The successful original-handle observation must have its own actual SQL.
      const retrySpy = vi.spyOn(fresh, 'query').mockImplementation(((...args: unknown[]) => {
        commands.push(queryText(args[0])); return Reflect.apply(retryNative, fresh, args);
      }) as Client['query']);
      try {
        expect(await reconcileGuardedTypedLocalBackfillJournal(fresh, uncertainRollback)).toEqual({ status: 'BLOCKED', code: 'TYPED_JOURNAL_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED' });
        expect(commands).toHaveLength(boundary);
        const outcome = await reconcileGuardedTypedLocalBackfillJournal(fresh, original.attempt);
        expect(outcome).toEqual(jrExpected(f, 'APPLIED_METADATA_PRESENT')); jrLockOrder(commands.slice(boundary));
        expect(await jrTuple(f)).toEqual(before); await expectJournalApplied(f);
        receipt('case-JR07-reconciliation-rollback-ack.json', { originalAttempt: original.attempt, originalCommands: original.commands,
          uncertainCommit, uncertainRollback, failureCommands, successfulOriginalHandleOutcome: outcome, successfulOriginalHandleCommands: commands.slice(boundary),
          before, after: await jrTuple(f), reconciliationUncertaintyReissuedAsHandle: false, definiteRollbackDispositionClaim: false, effectsVerified: false });
      } finally { retrySpy.mockRestore(); }
    });
  });
  // JR_RECONCILIATION_NATIVE_END
});
