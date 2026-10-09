import { readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Socket } from 'node:net';
import { Client, type QueryResult } from 'pg';
import { canonicalOwnershipJson, getOwnershipRegistry, OWNERSHIP_SCHEMA_COMMIT, OWNERSHIP_SOURCE, ownershipDigest, verifyOwnershipSource } from './ownership';
import type { JsonValue, TableOwnership } from './ownership';
import { preflightTenantBackfill } from './backfill';
import type { BackfillCapture, BackfillEntry, BackfillPlan, DatabaseComparatorRow } from './backfill';
import { decodeMigrationWireValue, observeMigrationCatalog } from './capture.server';
import type { MigrationCaptureFacts, OwnedCaptureIdentity } from './capture.server';

export type OwnedLocalBackfillIdentity = OwnedCaptureIdentity & {
  clusterRoot: string; leasePath: string; postmasterPid: number; postmasterStart: string;
  roleOid: string;
};
export type GuardedBackfillRequest = {
  mode: 'OWNED_LOCAL'; identity: OwnedLocalBackfillIdentity;
  facts: MigrationCaptureFacts; backfill: BackfillCapture;
  /** Root-controlled local custody reference and explicitly selected DB role.
   * Digests bind evidence; they never grant an operator database privileges. */
  authority: { reference: string; operatorRole: string; factsDigest: string; planDigest: string };
};
export type GuardedBackfillOutcome =
  | { status: 'APPLIED' | 'UNCHANGED'; mode: 'WHOLE_PLAN_ATOMIC'; planDigest: string; sourceRows: number;
      verification: 'OWNED_LOCAL_ATOMIC_BACKFILL_NOT_F10_COMPLETE' }
  | { status: 'BLOCKED'; code: string }
  | { status: 'UNCERTAIN'; code: 'COMMIT_OUTCOME_UNKNOWN' | 'ROLLBACK_UNCONFIRMED'; planDigest: string;
      reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' };

/** Evidence binding only, never an authorization capability or journal receipt. */
export function ownedLocalBackfillFenceBinding(identity: OwnedLocalBackfillIdentity, facts: MigrationCaptureFacts): string {
  return ownershipDigest({ kind: 'OWNED_LOCAL_WHOLE_PLAN_BOUNDARY', systemIdentifier: identity.systemIdentifier,
    databaseOid: identity.databaseOid, database: identity.database, marker: identity.marker,
    generation: facts.fence.generation, factsDigest: facts.factsDigest });
}

const active = new WeakSet<Client>();
const SHA = /^[a-f0-9]{64}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const ident = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const same = (a: unknown, b: unknown) => canonicalOwnershipJson(a) === canonicalOwnershipJson(b);
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const key = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(v);
const wireTypes = { getTypeParser: () => ((value: string) => value) };
const wireOids: Record<string, number> = { text: 25, date: 1082, time: 1083, smallint: 21, timestamptz: 1184, integer: 23,
  jsonb: 3802, boolean: 16, uuid: 2950, 'text[]': 25, 'char(64)': 1042, 'numeric(5,2)': 1700, bigint: 20, timestamp: 1114, 'char(32)': 1042 };
class GuardFailure extends Error { constructor(readonly code: string) { super(code); } }
const fail = (code: string): never => { throw new GuardFailure(code); };
async function raw(client: Client, text: string, values: unknown[] = []): Promise<QueryResult<string[]>> {
  return client.query<string[]>({ text, values, rowMode: 'array', types: wireTypes });
}
function requireIdle(client: Client) {
  // Installed pg8 exposes the last transaction status independently of current
  // query execution. Check its data-only internal idle descriptors as well;
  // an unsupported future client implementation refuses rather than queues.
  const d = Object.getOwnPropertyDescriptors(client);
  if (client.getTransactionStatus() !== 'I' || d._activeQuery?.value !== null || !Array.isArray(d._queryQueue?.value) ||
    d._queryQueue.value.length !== 0 || d._connected?.value !== true || d._connecting?.value !== false ||
    d._ending?.value !== false || d.readyForQuery?.value !== true) fail('CLIENT_NOT_IDLE');
}
function localConnection(client: Client, identity: OwnedLocalBackfillIdentity) {
  const socket = client.connection.stream;
  if (client.host !== '127.0.0.1' || client.port !== identity.port || client.database !== identity.database || client.user !== identity.role ||
    client.ssl !== false || client.pipeline !== false || !(socket instanceof Socket) || socket.destroyed ||
    socket.remoteAddress !== '127.0.0.1' || socket.remotePort !== identity.port || socket.localAddress !== '127.0.0.1') fail('CLIENT_CONNECTION_NOT_OWNED');
}

function requestBinding(value: unknown): { request: GuardedBackfillRequest; plan: BackfillPlan } {
  if (!object(value) || !object(value.identity) || !object(value.authority) || !object(value.facts) || !object(value.backfill)) fail('REQUEST_BINDING_REQUIRED');
  const request = value as unknown as GuardedBackfillRequest;
  const { facts, backfill, identity, authority } = request;
  const { factsDigest, ...factsValue } = facts;
  const registry = getOwnershipRegistry();
  if (facts.verification !== 'OWNED_LOCAL_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY' || !SHA.test(factsDigest) || ownershipDigest(factsValue) !== factsDigest ||
    facts.registryDigest !== registry.digest || !SHA.test(facts.sourceDigest) || !SHA.test(facts.currentSchemaDigest) ||
    ownershipDigest(facts.catalog) !== facts.currentSchemaDigest || facts.fence.phase !== 'FENCED' || !UINT.test(facts.fence.generation) ||
    facts.fence.actor !== null || facts.fence.manifest !== null || !same(facts.snapshot, backfill.snapshot) ||
    facts.sourceDigest !== backfill.sourceDigest || facts.registryDigest !== backfill.registryDigest || facts.currentSchemaDigest !== backfill.currentSchemaDigest ||
    !same(facts.tables, backfill.tables) || !same(facts.namespaceComparators, backfill.namespaceComparators) || verifyOwnershipSource(backfill.migrations).length ||
    backfill.writeFence.mode !== 'EXCLUSIVE_FENCED' || backfill.writeFence.databaseFenceToken !== ownedLocalBackfillFenceBinding(identity, facts)) fail('CAPTURE_BINDING_DRIFT');
  const plan = preflightTenantBackfill(backfill);
  if (plan.status !== 'READY_FOR_GUARDED_EXECUTION' || !plan.manifest) fail('PREFLIGHT_BLOCKED');
  if (!key(authority.reference) || authority.operatorRole !== identity.role || authority.factsDigest !== factsDigest || authority.planDigest !== plan.digest) fail('OPERATOR_CUSTODY_BINDING_DRIFT');
  if (!key(identity.database) || !key(identity.role) || !key(identity.clusterRoot) || !key(identity.leasePath) || !key(identity.dataDirectory) ||
    !/^[1-9][0-9]*$/.test(identity.databaseOid) || !/^[1-9][0-9]*$/.test(identity.systemIdentifier) || !/^[1-9][0-9]*$/.test(identity.roleOid) ||
    !Number.isSafeInteger(identity.port) || identity.port < 1 || identity.port > 65535 || !Number.isSafeInteger(identity.postmasterPid) || identity.postmasterPid < 1 ||
    !/^[1-9][0-9]*$/.test(identity.postmasterStart) || !identity.marker.startsWith('f10-owned:')) fail('OWNED_LOCAL_IDENTITY_REQUIRED');
  return { request, plan };
}
type LocalLease = { root: string; data: string; port: number; pid: number; pidStart: string; systemIdentifier: string;
  closed: false; scope: 'OWNED_LOCAL_F10'; database: string; marker: string; authorizationReference: string;
  operatorRoles: { name: string; catalog: string[] }[] };
function ownedLease(request: GuardedBackfillRequest): LocalLease {
  try {
    const i = request.identity, root = realpathSync(i.clusterRoot), data = realpathSync(i.dataDirectory);
    if (root !== i.clusterRoot || data !== i.dataDirectory || data !== join(root, 'data') || realpathSync(i.leasePath) !== join(root, 'ownership.json')) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    const info = statSync(i.leasePath);
    if (!info.isFile() || (info.mode & 0o077) !== 0 || process.getuid && info.uid !== process.getuid()) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    const lease = JSON.parse(readFileSync(i.leasePath, 'utf8')) as LocalLease;
    canonicalOwnershipJson(lease);
    if (lease.closed !== false || lease.scope !== 'OWNED_LOCAL_F10' || lease.root !== root || lease.data !== data || lease.port !== i.port || lease.pid !== i.postmasterPid ||
      lease.pidStart !== i.postmasterStart || lease.systemIdentifier !== i.systemIdentifier || lease.authorizationReference !== request.authority.reference ||
      !key(lease.database) || !key(lease.marker) || i.database.indexOf(lease.database + '_case_') !== 0 || i.marker !== lease.marker + ':case:' + i.database ||
      !Array.isArray(lease.operatorRoles) || !lease.operatorRoles.some(r => r.name === i.role && Array.isArray(r.catalog) && r.catalog[0] === i.roleOid)) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    const pid = readFileSync(join(data, 'postmaster.pid'), 'utf8').split('\n');
    if (Number(pid[0]) !== i.postmasterPid || realpathSync(pid[1]) !== data || pid[2] !== i.postmasterStart || Number(pid[3]) !== i.port) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    process.kill(i.postmasterPid, 0); // Presence check only; never stop/terminate a process.
    return lease;
  } catch { return fail('OWNED_LOCAL_IDENTITY_DRIFT'); }
}
async function databaseIdentity(client: Client, request: GuardedBackfillRequest, lease: LocalLease) {
  const i = request.identity;
  const result = await raw(client, "SELECT current_database(),(SELECT oid::text FROM pg_database WHERE datname=current_database()),shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database'),(SELECT system_identifier::text FROM pg_control_system()),current_setting('data_directory'),session_user::text,current_user::text,host(inet_server_addr()),inet_server_port()::text,current_setting('server_version'),current_setting('server_encoding'),current_setting('session_replication_role'),floor(extract(epoch FROM pg_postmaster_start_time()))::bigint::text,current_setting('search_path'),current_setting('unix_socket_directories')");
  const row = result.rows[0];
  if (result.rows.length !== 1 || !same(row.slice(0, 6), [i.database, i.databaseOid, i.marker, i.systemIdentifier, i.dataDirectory, i.role]) ||
    row[6] !== i.role || row[7] !== '127.0.0.1' || row[8] !== String(i.port) || !/^18\.4(?:\s|$)/.test(row[9]) || row[10] !== 'UTF8' || row[11] !== 'origin' ||
    row[12] !== i.postmasterStart || row[13] !== 'pg_catalog' || row[14] !== '') fail('OWNED_DATABASE_IDENTITY_DRIFT');
  const role = (await raw(client, 'SELECT oid::text,rolname,rolsuper::text,rolinherit::text,rolcreaterole::text,rolcreatedb::text,rolcanlogin::text,rolreplication::text,rolbypassrls::text FROM pg_roles WHERE rolname=session_user')).rows;
  const allowed = lease.operatorRoles.find(r => r.name === i.role)!;
  if (role.length !== 1 || !same(role[0], allowed.catalog) || role[0][0] !== i.roleOid || !same(role[0].slice(2), ['false', 'false', 'false', 'false', 'true', 'false', 'false'])) fail('OPERATOR_ROLE_DRIFT');
  const membership = (await raw(client, 'SELECT p.rolname,m.admin_option::text,m.inherit_option::text,m.set_option::text FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles p ON p.oid=m.roleid WHERE r.rolname=session_user ORDER BY p.rolname')).rows;
  if (!same(membership, [['pg_read_all_settings', 'false', 'true', 'true']])) fail('OPERATOR_ROLE_DRIFT');
  const privileges = (await raw(client, "SELECT has_schema_privilege(session_user,'public','CREATE')::text,has_schema_privilege(session_user,'nevora_tenancy','CREATE')::text,EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','nevora_tenancy') AND (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=session_user) OR has_table_privilege(session_user,c.oid,'TRIGGER')))::text")).rows;
  if (!same(privileges, [['false', 'false', 'false']])) fail('OPERATOR_ROLE_DRIFT');
}
async function installedContracts(client: Client) {
  const registry = getOwnershipRegistry();
  const installed = (await raw(client, 'SELECT path,source_sha256 FROM nevora_tenancy.source_migration_contract ORDER BY path')).rows;
  if (!same(installed, OWNERSHIP_SOURCE.map(s => [s.path, s.sha256]))) fail('INSTALLED_SOURCE_DRIFT');
  const rows = (await raw(client, "SELECT COALESCE(jsonb_agg(to_jsonb(q)),'[]'::jsonb)::text FROM (SELECT table_name,storage,anchor,primary_key_columns,sidecar_name,mirror_columns,original_columns,source_path,source_line FROM nevora_tenancy.owned_table_contract ORDER BY table_name) q")).rows;
  const expected = registry.tables.map(t => ({ table_name: t.table, storage: t.storage, anchor: t.anchor, primary_key_columns: t.primaryKey,
    sidecar_name: t.sidecar, mirror_columns: t.mirroredIdentityColumns, original_columns: t.columns.map(c => c.name), source_path: t.source.path, source_line: t.source.line }));
  if (rows.length !== 1 || rows[0].length !== 1 || !same(decodeMigrationWireValue('jsonb', rows[0][0]), expected)) fail('INSTALLED_REGISTRY_DRIFT');
}
async function catalog(client: Client, facts: MigrationCaptureFacts) {
  const observed = await observeMigrationCatalog(client);
  if (observed.digest !== facts.currentSchemaDigest || !same(observed.catalog, facts.catalog)) fail('CURRENT_CATALOG_DRIFT');
}
const comparatorContracts = [
  { id: 'employees.email_ci', table: 'employees', column: 'email', index: 'employees_email_unique', expression: 'lower(email)', predicate: '(email IS NOT NULL)' },
  { id: 'positions.name_ci', table: 'positions', column: 'name', index: 'positions_workspace_name_unique', expression: 'lower(name)', predicate: null },
  { id: 'clocker_break_types.name_ci', table: 'clocker_break_types', column: 'name', index: 'clocker_break_type_name', expression: 'lower(name)', predicate: null },
  { id: 'schedule_templates.active_name_ci', table: 'schedule_templates', column: 'name', index: 'schedule_templates_name_unique', expression: 'lower(name)', predicate: '(active = true)' },
] as const;
/** Re-evaluate the exact closed SQL comparators using the current DB collation.
 * No JavaScript normalization, inferred locale, or tenant grouping is used. */
async function namespaceWitnesses(client: Client, facts: MigrationCaptureFacts) {
  const rows: DatabaseComparatorRow[] = [];
  const engine = (await raw(client, "SELECT current_setting('server_version'),current_setting('server_encoding')")).rows;
  for (const contract of comparatorContracts) {
    const captured = facts.namespaceComparators.catalogs.find(c => c.contractId === contract.id)!;
    const d = captured.definition;
    if (!same(engine, [[d.serverVersion, d.serverEncoding]])) fail('CURRENT_COMPARATOR_CATALOG_DRIFT');
    const observed = (await raw(client, "SELECT pg_get_indexdef(i.indexrelid),pg_get_expr(i.indexprs,i.indrelid),pg_get_expr(i.indpred,i.indrelid),a.attcollation::text,i.indcollation[(i.indnkeyatts-1)]::text,i.indisunique::text,i.indisvalid::text,i.indisready::text,i.indislive::text,am.amname FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_namespace n ON n.oid=x.relnamespace JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attname=$2 JOIN pg_am am ON am.oid=x.relam WHERE n.nspname='public' AND x.relname=$1 AND i.indrelid=$3::regclass", [contract.index, contract.column, 'public.' + contract.table])).rows;
    if (observed.length !== 1 || d.expression !== contract.expression || d.predicate !== contract.predicate || !same(observed[0], [d.indexDefinition, d.expression, d.predicate, d.expressionCollation.oid, d.indexCollation.oid, 'true', 'true', 'true', 'true', 'btree'])) fail('CURRENT_COMPARATOR_CATALOG_DRIFT');
    for (const c of [d.expressionCollation, d.indexCollation]) {
      const actual = (await raw(client, "SELECT c.oid::text,n.nspname,c.collname,c.collprovider,c.collisdeterministic::text,c.collencoding::text,c.collcollate,c.collctype,COALESCE(to_jsonb(c)->>'colllocale',to_jsonb(c)->>'colliculocale'),c.collversion,pg_collation_actual_version(c.oid) FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace WHERE c.oid=$1::oid", [c.oid])).rows;
      if (c.version !== c.actualVersion || actual.length !== 1 || !same(actual[0], [c.oid, c.schema, c.name, c.provider, String(c.deterministic), String(c.encoding), c.lcCollate, c.lcCtype, c.locale, c.version, c.actualVersion])) fail('CURRENT_COLLATION_DRIFT');
    }
    const rule = getOwnershipRegistry().tables.find(t => t.table === contract.table)!;
    const predicate = contract.predicate ?? 'true';
    const compared = contract.expression + ' COLLATE ' + ident(d.indexCollation.schema) + '.' + ident(d.indexCollation.name);
    const results = (await raw(client, 'SELECT ' + rule.primaryKey.map(ident).join(',') + ',(' + predicate + ')::text,' + contract.expression + ',CASE WHEN ' + predicate + ' THEN dense_rank() OVER (ORDER BY CASE WHEN ' + predicate + ' THEN ' + compared + ' END)::text ELSE NULL END FROM public.' + ident(contract.table))).rows;
    const source = facts.tables.find(t => t.table === contract.table)!;
    for (const result of results) {
      const k = rule.primaryKey.map((name, i) => decodeMigrationWireValue(rule.columns.find(c => c.name === name)!.type, result[i]));
      const row = source.rows.find(r => same(rule.primaryKey.map(name => r.values[name]), k)) ?? fail('CURRENT_COMPARATOR_ROW_DRIFT');
      if (!['true', 'false'].includes(result[k.length])) fail('CURRENT_COMPARATOR_ROW_DRIFT');
      rows.push({ contractId: contract.id, key: k, rowChecksum: row.originalChecksum, included: result[k.length] === 'true', expressionValue: result[k.length + 1], comparisonClass: result[k.length + 2] });
    }
  }
  rows.sort((a, b) => order(canonicalOwnershipJson([a.contractId, a.key]), canonicalOwnershipJson([b.contractId, b.key])));
  if (!same(rows, facts.namespaceComparators.rows)) fail('CURRENT_COMPARATOR_ROW_DRIFT');
}
async function protocol(client: Client, request: GuardedBackfillRequest, plan: BackfillPlan, lock: boolean) {
  const rows = (await raw(client, 'SELECT phase,fence_generation::text,backfill_actor::text,capture_manifest_sha256,schema_source_commit,registry_sha256 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26' + (lock ? ' FOR UPDATE' : ''))).rows;
  const row = rows[0];
  if (rows.length !== 1 || row[0] !== 'FENCED' || row[1] !== request.facts.fence.generation || row[2] !== null ||
    row[3] !== null && row[3] !== plan.digest || row[4] !== OWNERSHIP_SCHEMA_COMMIT || row[5] !== plan.registryDigest) fail('FENCE_PROTOCOL_DRIFT');
  return row[3] === plan.digest;
}
function checkedValues(rule: TableOwnership, result: QueryResult<string[]>): JsonValue[] {
  if (result.fields.length !== rule.columns.length || result.fields.some((f, index) => f.name !== rule.columns[index].name || f.format !== 'text' || f.dataTypeID !== wireOids[rule.columns[index].type])) fail('SOURCE_COLUMN_TYPE_DRIFT');
  return result.rows.map(values => {
    if (values.length !== rule.columns.length) fail('SOURCE_ROW_SHAPE_DRIFT');
    const row: Record<string, JsonValue> = {};
    rule.columns.forEach((column, index) => {
      if (values[index] === null && !column.nullable) fail('SOURCE_NULLABILITY_DRIFT');
      if (column.type === 'jsonb' && values[index] === 'null') fail('SQL_JSON_NULL_REPRESENTATION_UNSUPPORTED');
      row[column.name] = decodeMigrationWireValue(column.type, values[index]);
    });
    const checksum = ownershipDigest(row), key = rule.primaryKey.map(k => row[k]);
    return { table: rule.table, key, values, originalChecksum: checksum, wireChecksum: ownershipDigest(values) };
  });
}
async function originalRows(client: Client, facts: MigrationCaptureFacts) {
  const wire: JsonValue[] = [];
  for (const rule of getOwnershipRegistry().tables) {
    const arrays = rule.columns.filter(c => c.type === 'text[]');
    if (arrays.length) {
      const invalid = arrays.map(c => '(' + ident(c.name) + ' IS NOT NULL AND COALESCE(array_ndims(' + ident(c.name) + '),1)<>1 OR COALESCE(array_lower(' + ident(c.name) + ',1),1)<>1)').join(' OR ');
      if ((await raw(client, 'SELECT 1 FROM public.' + ident(rule.table) + ' WHERE ' + invalid + ' LIMIT 1')).rowCount) fail('UNSUPPORTED_ARRAY_DIMENSIONS');
    }
    const columns = rule.columns.map(c => c.type === 'text[]' ? 'to_jsonb(' + ident(c.name) + ')::text AS ' + ident(c.name) : ident(c.name)).join(',');
    const rows = checkedValues(rule, await raw(client, 'SELECT ' + columns + ' FROM public.' + ident(rule.table)));
    const observed = rows.map(r => ({ key: (r as Record<string, JsonValue>).key, checksum: (r as Record<string, JsonValue>).originalChecksum }))
      .sort((a, b) => order(canonicalOwnershipJson(a.key), canonicalOwnershipJson(b.key)));
    const expected = facts.tables.find(t => t.table === rule.table)!;
    if (rows.length !== expected.expectedCount || ownershipDigest(observed) !== expected.expectedChecksum) fail('CURRENT_SOURCE_DRIFT');
    wire.push(...rows);
  }
  wire.sort((a, b) => order(canonicalOwnershipJson([(a as Record<string, JsonValue>).table, (a as Record<string, JsonValue>).key]), canonicalOwnershipJson([(b as Record<string, JsonValue>).table, (b as Record<string, JsonValue>).key])));
  if (!same(wire, facts.wireRows)) fail('CURRENT_WIRE_SOURCE_DRIFT');
}
function extraDirect(rule: TableOwnership) {
  return rule.storage === 'DIRECT_IMMUTABLE' && rule.anchor.kind !== 'ROOT' && !rule.columns.some(c => c.name === 'workspace_id');
}
function sidecarColumns(rule: TableOwnership) {
  return [...new Set([...rule.primaryKey, ...rule.mirroredIdentityColumns])].sort(order);
}
async function ownershipState(client: Client, plan: BackfillPlan, applied: boolean) {
  for (const rule of getOwnershipRegistry().tables) {
    const entries = plan.entries.filter(e => e.table === rule.table);
    if (extraDirect(rule)) {
      const rows = (await raw(client, 'SELECT ' + rule.primaryKey.map(ident).join(',') + ',workspace_id FROM public.' + ident(rule.table))).rows;
      const actual = rows.map(row => ({ key: row.slice(0, -1).map((v, index) => decodeMigrationWireValue(rule.columns.find(c => c.name === rule.primaryKey[index])!.type, v)), workspaceId: row[row.length - 1] }))
        .sort((a, b) => order(canonicalOwnershipJson(a.key), canonicalOwnershipJson(b.key)));
      const expected = entries.map(e => ({ key: e.key, workspaceId: applied ? e.workspaceId : null })).sort((a, b) => order(canonicalOwnershipJson(a.key), canonicalOwnershipJson(b.key)));
      if (!same(actual, expected)) fail('DIRECT_OWNERSHIP_STATE_DRIFT');
    }
    if (rule.sidecar) {
      const columns = sidecarColumns(rule);
      const rows = (await raw(client, 'SELECT ' + columns.map(ident).join(',') + ',workspace_id,source_checksum_sha256,capture_manifest_sha256 FROM public.' + ident(rule.sidecar))).rows;
      const actual = rows.map(row => [...row.slice(0, columns.length).map((v, index) => decodeMigrationWireValue(rule.columns.find(c => c.name === columns[index])!.type, v)), ...row.slice(columns.length)])
        .sort((a, b) => order(canonicalOwnershipJson(a), canonicalOwnershipJson(b)));
      const expected = (applied ? entries : []).map(e => [...columns.map(c => e.mirroredIdentity[c]), e.workspaceId, e.sourceChecksum, plan.digest])
        .sort((a, b) => order(canonicalOwnershipJson(a), canonicalOwnershipJson(b)));
      if (!same(actual, expected)) fail('SIDECAR_OWNERSHIP_STATE_DRIFT');
    }
  }
}
async function attribute(client: Client, rule: TableOwnership, entry: BackfillEntry, planDigest: string) {
  if (extraDirect(rule)) {
    const where = rule.primaryKey.map((c, index) => ident(c) + '=$' + (index + 2)).join(' AND ');
    const result = await client.query('UPDATE public.' + ident(rule.table) + ' SET workspace_id=$1 WHERE ' + where + ' AND workspace_id IS NULL', [entry.workspaceId, ...entry.key]);
    if (result.rowCount !== 1) fail('DIRECT_ATTRIBUTION_NOT_EXACT');
  } else if (rule.sidecar) {
    const columns = sidecarColumns(rule), values = [...columns.map(c => entry.mirroredIdentity[c]), entry.workspaceId, entry.sourceChecksum, planDigest];
    const result = await client.query('INSERT INTO public.' + ident(rule.sidecar) + '(' + [...columns, 'workspace_id', 'source_checksum_sha256', 'capture_manifest_sha256'].map(ident).join(',') + ') VALUES(' + values.map((_, i) => '$' + (i + 1)).join(',') + ')', values);
    if (result.rowCount !== 1) fail('SIDECAR_ATTRIBUTION_NOT_EXACT');
  }
}
/** Exact, newly owned fictional LOCAL resources only. This creates no connection,
 * role, schema, journal, chunk receipt, cutover or runtime authority. Root retains
 * the CLI/custody and approves the exact source/catalog/capture/plan externally.
 * Never rollback a caller transaction; never claim rollback after COMMIT begins. */
export async function executeGuardedLocalBackfill(client: Client, value: unknown): Promise<GuardedBackfillOutcome> {
  if (!(client instanceof Client)) return { status: 'BLOCKED', code: 'OWNED_PG_CLIENT_REQUIRED' };
  if (active.has(client)) return { status: 'BLOCKED', code: 'CLIENT_ALREADY_IN_USE' };
  active.add(client);
  let began = false, committing = false, planDigest = '';
  try {
    let capturedRequest: unknown;
    try { capturedRequest = JSON.parse(canonicalOwnershipJson(value)); } catch { fail('UNSUPPORTED_REQUEST'); }
    if (!object(capturedRequest) || capturedRequest.mode !== 'OWNED_LOCAL') fail('OWNED_LOCAL_MODE_REQUIRED');
    requireIdle(client);
    // Detach caller-owned data before the first await; evidence cannot change
    // while identity checks or source/protocol locks wait.
    const { request, plan } = requestBinding(capturedRequest); planDigest = plan.digest;
    localConnection(client, request.identity);
    const lease = ownedLease(request);
    await databaseIdentity(client, request, lease); await installedContracts(client); await catalog(client, request.facts);
    await protocol(client, request, plan, false);
    requireIdle(client); localConnection(client, request.identity);
    // Idle/exclusive connection was checked above. This is our BEGIN attempt,
    // including a lost acknowledgement; cleanup may rollback only this attempt.
    began = true; await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await client.query("SET LOCAL search_path=pg_catalog; SET LOCAL row_security=off; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL TimeZone='UTC'; SET LOCAL lock_timeout='5000ms'; SET LOCAL statement_timeout='15000ms'");
    const registry = getOwnershipRegistry();
    const locks = [...new Set([...registry.tables.map(t => t.table), ...registry.tables.flatMap(t => t.sidecar ? [t.sidecar] : [])])].sort(order);
    // Self-conflicting source locks BEFORE any SERIALIZABLE MVCC SELECT or
    // protocol lock. SHARE alone would allow two backfills to deadlock upgrading.
    await client.query('LOCK TABLE ' + locks.map(t => 'public.' + ident(t)).join(',') + ' IN SHARE ROW EXCLUSIVE MODE');
    const retry = await protocol(client, request, plan, true);
    ownedLease(request); await databaseIdentity(client, request, lease); await installedContracts(client); await catalog(client, request.facts);
    await originalRows(client, request.facts); await namespaceWitnesses(client, request.facts); await ownershipState(client, plan, retry);
    if (!retry) {
      const armed = await client.query("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user,capture_manifest_sha256=$1 WHERE migration_id=26 AND phase='FENCED' AND fence_generation=$2::bigint AND backfill_actor IS NULL AND capture_manifest_sha256 IS NULL", [plan.digest, request.facts.fence.generation]);
      if (armed.rowCount !== 1) fail('OPERATOR_ARM_NOT_EXACT');
      // Existing immutable business triggers use unqualified public relations.
      // Preserve their execution; never disable/rewrite them. Catalog rendering
      // is restored to pg_catalog before exact checks. All our DML is qualified.
      await client.query('SET LOCAL search_path=pg_catalog,public');
      const rules = new Map(registry.tables.map(t => [t.table, t]));
      for (const entry of plan.entries) await attribute(client, rules.get(entry.table)!, entry, plan.digest);
      await client.query('SET CONSTRAINTS ALL IMMEDIATE');
      await client.query('SET LOCAL search_path=pg_catalog');
      await originalRows(client, request.facts); await namespaceWitnesses(client, request.facts); await ownershipState(client, plan, true); await catalog(client, request.facts); await installedContracts(client);
      const cleared = await client.query("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL WHERE migration_id=26 AND phase='FENCED' AND fence_generation=$2::bigint AND backfill_actor=session_user AND capture_manifest_sha256=$1", [plan.digest, request.facts.fence.generation]);
      if (cleared.rowCount !== 1) fail('OPERATOR_CLEAR_NOT_EXACT');
    }
    if (!await protocol(client, request, plan, true)) fail('COMMITTED_MANIFEST_REQUIRED');
    committing = true; await client.query('COMMIT'); began = false;
    return { status: retry ? 'UNCHANGED' : 'APPLIED', mode: 'WHOLE_PLAN_ATOMIC', planDigest: plan.digest,
      sourceRows: request.facts.tables.reduce((n, t) => n + t.expectedCount, 0), verification: 'OWNED_LOCAL_ATOMIC_BACKFILL_NOT_F10_COMPLETE' };
  } catch (error) {
    if (committing) return { status: 'UNCERTAIN', code: 'COMMIT_OUTCOME_UNKNOWN', planDigest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' };
    if (began) { try { await client.query('ROLLBACK'); } catch { return { status: 'UNCERTAIN', code: 'ROLLBACK_UNCONFIRMED', planDigest, reconciliation: 'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' }; } }
    const codecCodes = ['LOSSLESS_JSON_NUMBER_UNSUPPORTED', 'UNSUPPORTED_ARRAY_VALUE', 'INVALID_JSON_WIRE', 'UNSUPPORTED_SOURCE_TYPE', 'INVALID_INTEGER_WIRE', 'INVALID_BIGINT_WIRE', 'UNSUPPORTED_NUMERIC_WIRE'];
    const code = error instanceof GuardFailure ? error.code : object(error) && typeof error.code === 'string' && codecCodes.includes(error.code) ? error.code : 'GUARDED_BACKFILL_FAILED';
    return { status: 'BLOCKED', code };
  } finally { active.delete(client); }
}
