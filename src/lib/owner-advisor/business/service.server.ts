import 'server-only';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlExecutor, SqlStatement } from '@/lib/notifications/types';
import { AdvisorError } from '../contracts';
import { admitOwner } from '../authority.server';
import { AdvisorStore } from '../store.server';
import { readFeatureFlags } from '@/lib/feature-flags';
import type { AdmittedBusinessScope, BusinessApiResult, BusinessCommand, BusinessFinanceQuery, BusinessQuery, BusinessReadResult, BusinessUnavailable, BusinessVersionView, ValidatedBusinessMap } from './contracts';
import { BusinessStore } from './store.server';
import { isBusinessValidationCode, isBusinessValidationField, type BusinessValidationCode, type BusinessValidationDetail } from './contracts';
import { checkpoint, normalizeBusinessVersion, parseBusinessCommand, uuid } from './parse';
import { parseBusinessCsv } from './csv';
import { businessDigest } from './digest.server';
import { calculateFinance } from './finance';
import { calculateSales } from './sales';
import { selectBusinessScope, validateBusinessMap } from './scope';
import { businessFlags, captureBusinessContext, captureBusinessSnapshot, businessContextGuards, businessSnapshotGuards, type BusinessContext, type BusinessOrigin, type BusinessSnapshot } from './context.server';
type Body = Omit<BusinessApiResult, 'authority' | 'observedAt' | 'validForMs'>;
const body = (state: Body['state'], extra: Partial<Body> = {}): Body => ({ state, reason: null, catalog: null, version: null, map: null, receipt: null, result: null, readReceiptId: null, readReceiptExpiresAt: null, ...extra });
export function businessExecution(raw: SqlExecutor, incoming: AbortSignal) {
  const signal = AbortSignal.any([incoming, AbortSignal.timeout(20000)]), combine = (other?: AbortSignal) => other ? AbortSignal.any([signal, other]) : signal;
  const settings: SqlStatement[] = [{ text: "SET LOCAL lock_timeout='1500ms'", values: [] }, { text: "SET LOCAL statement_timeout='5000ms'", values: [] }];
  const transaction: SqlExecutor['transaction'] = async (statements, other) => (await raw.transaction([...settings, ...statements], combine(other))).slice(settings.length);
  const ex: SqlExecutor = { async query<T>(statement: SqlStatement, other?: AbortSignal): Promise<T[]> { return (await transaction([statement], other))[0] as T[]; }, transaction };
  return { signal, ex };
}
export class BusinessValidationError extends AdvisorError {
  constructor(readonly detail: BusinessValidationDetail, limit = false) { super(limit ? 'limit' : 'invalid'); }
}
function validationFailure(error: unknown): never {
  const message = error instanceof Error ? error.message : '';
  const csv = /^(INVALID_CSV_RECORD|INPUT_LIMIT):row ([0-9]+):line ([0-9]+)$/.exec(message);
  const field = /^INVALID_INPUT:([A-Za-z_]{1,64})(?::row ([0-9]+))?$/.exec(message);
  throw new BusinessValidationError({ code: csv ? csv[1] as 'INVALID_CSV_RECORD' | 'INPUT_LIMIT' : message === 'INPUT_LIMIT' ? 'INPUT_LIMIT' : message === 'INVALID_MONEY' ? 'INVALID_MONEY' : 'INVALID_INPUT', field: isBusinessValidationField(field?.[1]) ? field[1] : null, row: csv ? Number(csv[2]) : field?.[2] ? Number(field[2]) : null, line: csv ? Number(csv[3]) : null }, message.startsWith('INPUT_LIMIT'));
}
function flagsCheck(env: Record<string,string|undefined>, context?: BusinessContext) {
  if (!businessFlags(env).parent) throw new AdvisorError('disabled');
  if (context && context.knowledgeEnabled !== readFeatureFlags(env).ownerAdvisorKnowledge) throw new AdvisorError('conflict');
}
async function stamp(store: BusinessStore, signal: AbortSignal, env: Record<string,string|undefined>, context?: BusinessContext, assertions: SqlStatement[] = [], expiresAt?: string): Promise<Pick<BusinessApiResult,'authority'|'observedAt'|'validForMs'>> {
  flagsCheck(env, context);
  const checks = [...(context ? businessContextGuards(store.advisor, context) : []), ...assertions];
  const [row] = await store.guarded<{ at: string; ms: number }>({ text: `WITH clock AS MATERIALIZED(SELECT clock_timestamp() at) SELECT clock.at::text AS at,
    GREATEST(0,LEAST(15000,floor(EXTRACT(epoch FROM(LEAST(expires_at,COALESCE($2::timestamptz,expires_at),COALESCE($3::timestamptz,expires_at))-clock.at))*1000)))::int AS ms
    FROM employee_sessions CROSS JOIN clock WHERE token_hash=$1`, values: [store.advisor.proof.sessionTokenHash, context?.validUntil ?? null, expiresAt ?? null] }, signal, checks, checks);
  flagsCheck(env, context); if (!row || row.ms <= 0) throw new AdvisorError('conflict');
  return { authority: store.advisor.original.authority, observedAt: new Date(row.at).toISOString(), validForMs: row.ms };
}
function versionGuard(store: BusinessStore, view: BusinessVersionView): SqlStatement {
  return { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_business_versions v JOIN owner_advisor_business_sources s USING(workspace_id,source_id)
    WHERE v.workspace_id=$1 AND v.version_id=$2::uuid AND v.source_id=$3::uuid AND v.digest=$4 AND v.payload IS NOT NULL AND NOT s.deleted) THEN '1' ELSE 'advisor_business_source_changed' END)::integer`, values: [store.workspaceId, view.versionId, view.sourceId, view.digest] };
}
function reviewedVersion(view: BusinessVersionView, timeZone: string, observedAt: string): BusinessVersionView {
  if (!view.input) throw new AdvisorError('forbidden'); const input = view.input;
  const accountRefs = [...new Set(input.records.flatMap(r => 'accountRef' in r ? [r.accountRef] : []))];
  const locationIds = [...new Set(input.records.flatMap(r => 'locationId' in r ? [r.locationId] : []))];
  const scope: AdmittedBusinessScope = { domain: input.source.domain, timeZone: view.timeZone, query: { window: input.window, selection: { kind: 'SOURCE', sourceId: view.sourceId }, locationScope: { kind: 'ALL' }, temporalUse: 'HISTORICAL' },
    versions: [{ version: { ...view, input }, window: input.window, accountRefs, locationIds, metrics: ['CASH','OBLIGATIONS','RECEIVABLES','SALES'] }], accounts: [], locationIds, completeScope: false, sourceSubtotal: true, observedAt, expiresAt: new Date(Date.parse(observedAt)+15000).toISOString(), qualifiers: [] };
  return { ...view, validation: { finance: input.source.domain === 'FINANCE' ? calculateFinance(scope, null) : null, sales: input.source.domain === 'SALES' ? calculateSales(scope) : null,
    qualifiers: ['SOURCE_SUBTOTAL','OWNER_IMPORT_NOT_INDEPENDENTLY_VERIFIED', ...(view.timeZone !== timeZone ? ['SOURCE_TIMEZONE_CHANGED_RESTAGE_REQUIRED'] as const : []), ...(input.completeness === 'PARTIAL' ? ['PARTIAL_NOT_PUBLISHABLE'] as const : ['OWNER_REPORTED_COMPLETENESS'] as const), ...(view.status === 'DRAFT' ? ['DRAFT_VALIDATION_ONLY'] as const : [])] } };
}
export type BusinessEvidenceInspection = { result: BusinessReadResult; snapshot: BusinessSnapshot; context: BusinessContext };
/** Internal counterpart retains private provenance; only result is a public DTO. */
export async function inspectBusinessEvidence(advisor: AdvisorStore, query: BusinessQuery | BusinessFinanceQuery, env: Record<string,string|undefined>, signal: AbortSignal, options: { origin?: BusinessOrigin; occurrence?: number; sourceSlots?: number } = {}): Promise<BusinessEvidenceInspection> {
  checkpoint(signal); const flags = businessFlags(env); if (!flags.parent || (!flags.imports && !flags.retrieval) || options.origin && !flags.retrieval) throw new AdvisorError('disabled');
  const store = new BusinessStore(advisor, env); await store.available(signal);
  const context = await captureBusinessContext(advisor, options.origin, env, signal), snapshot = await captureBusinessSnapshot(store, signal);
  const domain = 'scenario' in query ? 'FINANCE' : 'SALES';
  const empty: BusinessReadResult = { state: 'unavailable', reason: 'MISSING_MAP', domain, completeScope: false, sourceSubtotal: query.selection.kind === 'SOURCE', window: query.window, selection: query.selection, locationScope: query.locationScope, temporalUse: query.temporalUse, scenario: 'scenario' in query ? query.scenario : null, observedAt: snapshot.observedAt, expiresAt: new Date(Math.min(Date.parse(snapshot.observedAt)+15000,context.validUntil ? Date.parse(context.validUntil) : Infinity)).toISOString(), qualifiers: [], finance: null, sales: null, citations: [] };
  let result = empty;
  try {
  const catalog = await store.catalog(signal);
  const current = catalog.maps.find(m => m.current), mapInput = current?.input ?? { expectedRevision: catalog.mapRevision ?? 0, accounts: [], cells: [] };
  if (query.selection.kind === 'SOURCE' || current?.input) {
    let map: ValidatedBusinessMap | undefined;
    try { map = query.selection.kind === 'SOURCE' ? { input: { ...mapInput, cells: [] }, catalogRevision: catalog.evidenceRevision } : validateBusinessMap(mapInput, catalog); }
    catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (!['MISSING_SOURCE','INCOMPLETE_SCOPE','OVERLAP','INPUT_LIMIT'].includes(reason)) throw error;
      result = { ...empty, reason: reason as BusinessUnavailable };
    }
    if (map) {
    const sourceId = query.selection.kind === 'SOURCE' ? query.selection.sourceId : null;
    const ids = catalog.versions.filter(v => v.current && v.status === 'PUBLISHED' && v.metadata && v.metadata.window.fromAt < query.window.toAt && query.window.fromAt < v.metadata.window.toAt && catalog.sources.some(s => s.sourceId === v.sourceId && s.active && s.domain === domain) &&
      (sourceId ? v.sourceId === sourceId : map.input.cells.some(c => c.role === 'PRIMARY' && c.domain === domain && c.sourceId === v.sourceId && c.window.fromAt < query.window.toAt && query.window.fromAt < c.window.toAt && (domain === 'FINANCE' || c.locationIds.some(l => query.locationScope.kind === 'ALL' || query.locationScope.locationIds.includes(l)))))).map(v => v.versionId);
    const full = await store.materialize(catalog, ids, signal), admission = selectBusinessScope(query, full, map, snapshot.observedAt, signal);
    if (admission.state === 'unavailable') result = { ...empty, reason: admission.reason };
    else {
      const scope = admission.scope, unique = [...new Map(scope.versions.map(v => [v.version.versionId, v.version])).values()];
      const cites = unique.map(v => ({ sourceId: v.sourceId, versionId: v.versionId, digest: v.digest, name: v.input.source.name, namespace: v.input.source.namespace, timeZone: v.timeZone, currency: v.input.source.currency, window: v.input.window, sourceAsOf: v.input.sourceAsOf, origin: 'OWNER_IMPORT' as const, href: `/api/owner/advisor/business/sources/${v.sourceId}/versions/${v.versionId}` }));
      result = { ...empty, state: scope.incompleteReason ? 'unavailable' : 'ready', reason: scope.incompleteReason ?? null, completeScope: scope.completeScope, sourceSubtotal: scope.sourceSubtotal, expiresAt: new Date(Math.min(Date.parse(scope.expiresAt),Date.parse(empty.expiresAt!))).toISOString(), qualifiers: scope.qualifiers,
        finance: domain === 'FINANCE' ? calculateFinance(scope, (query as BusinessFinanceQuery).scenario, signal) : null, sales: domain === 'SALES' ? calculateSales(scope, signal) : null, citations: cites };
    }
    }
  }
  } catch (error) { if (error instanceof AdvisorError && error.code === 'limit') result = { ...empty, reason: 'INPUT_LIMIT' }; else throw error; }
  if (options.origin && result.finance && Buffer.byteLength(JSON.stringify(result)) > 12288 && result.finance.scenarioInputs.state === 'ready') result = { ...result, finance: { ...result.finance, scenarioInputs: { state: 'unavailable', reason: 'RESULT_LIMIT', anchors: [], obligations: [], receivables: [] } } };
  if (options.sourceSlots !== undefined && result.citations.length > options.sourceSlots || Buffer.byteLength(JSON.stringify(result)) > (options.origin ? 12288 : 2*1024*1024)) result = { ...empty, reason: 'RESULT_LIMIT' };
  const assertions = [...businessContextGuards(advisor, context), ...businessSnapshotGuards(store, snapshot, result.expiresAt!)];
  await store.guarded({ text: 'SELECT 1', values: [] }, signal, assertions, assertions); flagsCheck(env, context);
  if (options.origin && !businessFlags(env).retrieval || !businessFlags(env).imports && !businessFlags(env).retrieval) throw new AdvisorError('disabled');
  return { result, snapshot, context };
}
export async function readBusinessEvidence(advisor: AdvisorStore, query: BusinessQuery | BusinessFinanceQuery, env: Record<string,string|undefined>, signal: AbortSignal, options: { origin?: BusinessOrigin; occurrence?: number; sourceSlots?: number } = {}): Promise<BusinessReadResult> {
  return (await inspectBusinessEvidence(advisor, query, env, signal, options)).result;
}
export async function businessSourceService(proof: SessionMutationProof, raw: SqlExecutor, env: Record<string,string|undefined>, incoming: AbortSignal, value?: unknown): Promise<BusinessApiResult> {
  const { signal, ex } = businessExecution(raw, incoming); let command: BusinessCommand | undefined;
  try { command = value === undefined ? undefined : parseBusinessCommand(value); } catch (error) { validationFailure(error); }
  const advisor = new AdvisorStore(proof, await admitOwner(proof, ex), ex), store = new BusinessStore(advisor, env); flagsCheck(env);
  const finish = async (result: Body, context?: BusinessContext, assertions: SqlStatement[] = [], expiresAt?: string): Promise<BusinessApiResult> => {
    const observation = await stamp(store, signal, env, context, assertions, expiresAt), flags = businessFlags(env);
    if (!flags.imports && result.receipt) result = body(result.state, { receipt: result.receipt });
    return { ...result, ...observation };
  };
  if (command?.op === 'check_source_operation') {
    try { const saved = await store.readOperation(command.operationId, signal); return finish(body(saved.state === 'completed' ? 'saved' : 'not_saved', { receipt: saved.receipt })); }
    catch (error) { if (error instanceof AdvisorError && error.code === 'forbidden') return finish(body('not_saved')); throw error; }
  }
  if (command?.op === 'query_finance' || command?.op === 'query_sales') {
    const inspection = await inspectBusinessEvidence(advisor, command.query, env, signal);
    return finish(body('ready', { result: inspection.result }), inspection.context, businessSnapshotGuards(store, inspection.snapshot, inspection.result.expiresAt!), inspection.result.expiresAt!);
  }
  // Completed writes recover before feature gates without returning prior payloads.
  if (command) {
    try { const saved = await store.readOperation(command.requestId, signal); if (saved.command_hash !== businessDigest(command)) throw new AdvisorError('conflict');
      if (saved.state === 'completed' && !command.op.startsWith('read_')) return finish(body('saved', { receipt: saved.receipt }));
    } catch (error) { if (!(error instanceof AdvisorError && error.code === 'forbidden')) throw error; }
  }
  if (!businessFlags(env).imports) throw new AdvisorError('disabled');
  await store.available(signal);
  const context = await captureBusinessContext(advisor, undefined, env, signal), snapshot = await captureBusinessSnapshot(store, signal);
  const contextDigest = businessDigest({ context, fingerprint: snapshot.fingerprint });
  const assertions = [...businessContextGuards(advisor, context)], stable = businessSnapshotGuards(store, snapshot, new Date(Date.parse(snapshot.observedAt)+15000).toISOString());
  if (!command) { const catalog = await store.catalog(signal); return finish(body('ready', { catalog }), context, stable); }
  let view: BusinessVersionView | undefined, map: Body['map'] = null;
  if (command.op === 'stage_source_version') {
    const input = command.format === 'JSON' ? command.input : parseBusinessCsv(command.csv, command.mapping, command.metadata, signal);
    const normalized = normalizeBusinessVersion(input, signal);
    const ids = [...new Set(normalized.records.flatMap(r => 'locationId' in r ? [r.locationId] : []))];
    const [locations] = await store.guarded<{ n: number }>({ text: 'SELECT count(*)::int n FROM locations WHERE workspace_id=$1 AND active AND id=ANY($2::text[])', values: [store.workspaceId, ids] }, signal);
    if (locations?.n !== ids.length) throw new AdvisorError('invalid');
  }
  if (command.op === 'stage_coverage_map') {
    try { validateBusinessMap(command.map, await store.catalog(signal)); } catch (error) {
      if (error instanceof AdvisorError) throw error; const code: BusinessValidationCode = error instanceof Error && isBusinessValidationCode(error.message) && ['MISSING_SOURCE','INCOMPLETE_SCOPE','OVERLAP','ACCOUNT_CURRENCY_CONFLICT','INPUT_LIMIT'].includes(error.message) ? error.message : 'INVALID_MAP';
      throw new BusinessValidationError({ code, field: 'map', row: null, line: null }, code === 'INPUT_LIMIT');
    }
  }
  if (command.op === 'read_source_version' || command.op === 'publish_source_version') {
    view = await store.readVersion(command.versionId, signal); if (view.sourceId !== command.sourceId) throw new AdvisorError('forbidden');
    if (command.op === 'read_source_version') view = reviewedVersion(view, advisor.original.workspace.timeZone, snapshot.observedAt);
  }
  if (command.op === 'read_coverage_map' || command.op === 'publish_coverage_map') {
    map = await store.readMap(command.mapVersionId, signal); if (command.op === 'publish_coverage_map') { try { validateBusinessMap(map.input!, await store.catalog(signal)); } catch (error) { if (error instanceof AdvisorError) throw error; throw new AdvisorError('conflict'); } }
  }
  const hash = businessDigest(command); await store.reserveOperation(command, hash, signal);
  const receipt = await store.execute(command, hash, signal, { contextDigest, validUntil: context.validUntil, before: [...assertions, ...stable], after: assertions });
  if (command.op === 'read_source_version' || command.op === 'read_coverage_map') return finish(body('ready', { version: view ?? null, map, receipt, ...await store.reviewReceipt(command.requestId, signal) }), context, [...stable, ...(view ? [versionGuard(store, view)] : [])]);
  return finish(body('saved', { receipt }), context);
}
export async function readBusinessVersion(proof: SessionMutationProof, raw: SqlExecutor, env: Record<string,string|undefined>, incoming: AbortSignal, sourceId: string, versionId: string): Promise<BusinessVersionView> {
  const { ex, signal } = businessExecution(raw, incoming), advisor = new AdvisorStore(proof, await admitOwner(proof, ex), ex), store = new BusinessStore(advisor, env);
  sourceId = uuid(sourceId); flagsCheck(env); const flags = businessFlags(env); if (!flags.imports && !flags.retrieval) throw new AdvisorError('disabled');
  const context = await captureBusinessContext(advisor, undefined, env, signal), view = await store.readVersion(uuid(versionId), signal);
  if (view.sourceId !== uuid(sourceId)) throw new AdvisorError('forbidden');
  const catalog = await store.catalog(signal, { includeLocations: false }); if (!flags.imports && (view.status !== 'PUBLISHED' || !view.current || !catalog.sources.some(s => s.sourceId === sourceId && s.active))) throw new AdvisorError('disabled');
  const eligible: SqlStatement = { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_business_windows x JOIN owner_advisor_business_sources s USING(workspace_id,source_id) WHERE x.workspace_id=$1 AND x.version_id=$2::uuid AND s.active AND NOT s.deleted) THEN '1' ELSE 'advisor_business_source_changed' END)::integer`, values: [store.workspaceId, view.versionId] };
  let observation = await stamp(store, signal, env, context, [versionGuard(store, view), ...(!flags.imports ? [eligible] : [])]);
  const fresh = businessFlags(env); if (!fresh.imports && (!fresh.retrieval || view.status !== 'PUBLISHED' || !view.current)) throw new AdvisorError('disabled');
  if (flags.imports && !fresh.imports) { observation = await stamp(store, signal, env, context, [versionGuard(store, view), eligible]); if (!businessFlags(env).retrieval) throw new AdvisorError('disabled'); }
  return reviewedVersion(view, advisor.original.workspace.timeZone, observation.observedAt);
}
