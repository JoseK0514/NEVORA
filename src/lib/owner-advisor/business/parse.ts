import type { BusinessCommand, BusinessCoverageMap, BusinessFinanceQuery, BusinessQuery, BusinessRecord, BusinessSourceSpec, BusinessVersionInput, BusinessWindow, BusinessValidationField } from './contracts';
import { minor } from './money';
import { parseBusinessCsv, parseCsvMapping } from './csv';
export const BUSINESS_INPUT_BYTES = 512 * 1024;
export function checkpoint(signal?: AbortSignal): void { signal?.throwIfAborted(); }
export function invalid(field: BusinessValidationField = 'input'): never { throw Error(`INVALID_INPUT:${field}`); }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return invalid();
  return value as Record<string, unknown>;
}
export function exact(value: Record<string, unknown>, fields: string, optional = ''): void {
  const required = fields.split(' ').filter(Boolean), allowed = new Set([...required, ...optional.split(' ').filter(Boolean)]);
  if (required.some(k => !Object.hasOwn(value, k)) || Object.keys(value).some(k => !allowed.has(k))) invalid('fields');
}
export function wellFormed(value: string): void {
  for (const char of value) { const code = char.charCodeAt(0); if (char.length === 1 && code >= 0xd800 && code <= 0xdfff) invalid('unicode'); }
}
export function inputBound(value: unknown): void {
  let encoded: string, minimumBytes = 0; const encoder = new TextEncoder();
  try { encoded = JSON.stringify(value, (key, entry) => {
    if (key.length > BUSINESS_INPUT_BYTES || typeof entry === 'string' && entry.length > BUSINESS_INPUT_BYTES) throw Error('INPUT_LIMIT');
    minimumBytes += encoder.encode(key).byteLength;
    if (typeof entry === 'string') { wellFormed(entry); minimumBytes += encoder.encode(entry).byteLength; }
    else if (entry === null) minimumBytes += 4;
    else if (typeof entry === 'number' || typeof entry === 'boolean') minimumBytes += String(entry).length;
    if (minimumBytes > BUSINESS_INPUT_BYTES) throw Error('INPUT_LIMIT'); return entry;
  }); }
  catch (error) { if (error instanceof Error && ['INVALID_INPUT:unicode', 'INPUT_LIMIT'].includes(error.message)) throw error; return invalid(); }
  if (typeof encoded !== 'string') return invalid();
  if (new TextEncoder().encode(encoded).byteLength > BUSINESS_INPUT_BYTES) throw Error('INPUT_LIMIT');
}
export function opaque(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value) || new TextEncoder().encode(value).byteLength > 128) return invalid('reference');
  return value;
}
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) return invalid('id');
  return value.toLowerCase();
}
export function revision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value >= Number.MAX_SAFE_INTEGER) return invalid('revision'); return value;
}
export function instant(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return invalid('instant');
  const d = new Date(value); if (!Number.isFinite(d.getTime()) || d.toISOString() !== value) return invalid('instant'); return value;
}
export function date(value: unknown): string {
  if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(value)) return invalid('date');
  const d = new Date(`${value}T00:00:00.000Z`); if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) return invalid('date'); return value;
}
function choice<T extends string>(value: unknown, allowed: readonly T[]): T { if (!allowed.includes(value as T)) return invalid('enum'); return value as T; }
export function parseWindow(value: unknown): BusinessWindow {
  const v = object(value); exact(v, 'fromAt toAt'); const fromAt = instant(v.fromAt), toAt = instant(v.toAt);
  if (fromAt >= toAt) return invalid('window'); return { fromAt, toAt };
}
function references(value: unknown, max: number, min = 0): string[] {
  if (!Array.isArray(value) || value.length < min) return invalid('references'); if (value.length > max) throw Error('INPUT_LIMIT');
  const result = value.map(opaque); if (new Set(result).size !== result.length) return invalid('duplicate_reference'); return result.sort();
}
export function parseBusinessSourceSpec(value: unknown): BusinessSourceSpec {
  const v = object(value); exact(v, 'sourceId expectedRevision name domain namespace currency scale', 'maxAgeMinutes');
  if (typeof v.name !== 'string' || !v.name.trim() || /[\x00-\x1f\x7f]/.test(v.name) || new TextEncoder().encode(v.name).byteLength > 240) return invalid('name');
  const maxAgeMinutes = Object.hasOwn(v, 'maxAgeMinutes') ? v.maxAgeMinutes : 1440;
  if (typeof maxAgeMinutes !== 'number' || !Number.isInteger(maxAgeMinutes) || maxAgeMinutes < 15 || maxAgeMinutes > 10080 || v.scale !== 2) return invalid('policy');
  const sourceId = v.sourceId === null ? null : uuid(v.sourceId), expectedRevision = revision(v.expectedRevision);
  if (sourceId === null && expectedRevision !== 0) return invalid('revision');
  return { sourceId, expectedRevision, name: v.name, domain: choice(v.domain, ['FINANCE', 'SALES']), namespace: opaque(v.namespace), currency: choice(v.currency, ['USD', 'EUR']), scale: 2, maxAgeMinutes };
}
function record(value: unknown, version: Omit<BusinessVersionInput, 'records'>): BusinessRecord {
  const v = object(value), base = { recordId: opaque(v.recordId), revision: opaque(v.revision) }, finance = version.source.domain === 'FINANCE';
  function at(value: unknown, endpoint = false): string {
    const t = instant(value); if (t < version.window.fromAt || (endpoint ? t > version.window.toAt : t >= version.window.toAt) || t > version.sourceAsOf) return invalid('record_window'); return t;
  }
  if (finance && v.kind === 'BALANCE') {
    exact(v, 'kind recordId revision accountRef at amountMinor'); minor(v.amountMinor);
    return { ...base, kind: v.kind, accountRef: opaque(v.accountRef), at: at(v.at, true), amountMinor: v.amountMinor as string };
  }
  if (finance && v.kind === 'CASH') {
    exact(v, 'kind recordId revision accountRef occurredAt postedAt state deltaMinor reconciliationRef'); minor(v.deltaMinor);
    const state = choice(v.state, ['POSTED', 'PENDING', 'REVERSED']), postedAt = v.postedAt === null ? null : state === 'POSTED' ? at(v.postedAt) : instant(v.postedAt);
    const occurredAt = state === 'POSTED' ? instant(v.occurredAt) : at(v.occurredAt);
    if (occurredAt > version.sourceAsOf || postedAt && (postedAt > version.sourceAsOf || state === 'POSTED' && occurredAt > postedAt)) return invalid('postedAt');
    if (state === 'POSTED' && postedAt === null) return invalid('postedAt');
    return { ...base, kind: v.kind, accountRef: opaque(v.accountRef), occurredAt, postedAt, state, deltaMinor: v.deltaMinor as string, reconciliationRef: v.reconciliationRef === null ? null : opaque(v.reconciliationRef) };
  }
  if (finance && (v.kind === 'OBLIGATION' || v.kind === 'RECEIVABLE')) {
    exact(v, 'kind recordId revision accountRef recordedAt dueDate amountMinor state confirmation'); minor(v.amountMinor, true);
    return { ...base, kind: v.kind, accountRef: opaque(v.accountRef), recordedAt: at(v.recordedAt), dueDate: date(v.dueDate), amountMinor: v.amountMinor as string, state: choice(v.state, ['OPEN', 'SETTLED', 'CANCELLED']), confirmation: choice(v.confirmation, ['SOURCE_CONFIRMED', 'OWNER_REPORTED', 'UNCONFIRMED']) };
  }
  if (!finance && ['SALE', 'REFUND', 'CANCELLATION', 'FEE'].includes(String(v.kind))) {
    const common = { ...base, orderRef: opaque(v.orderRef), locationId: opaque(v.locationId), at: at(v.at) };
    if (v.kind === 'CANCELLATION') { exact(v, 'kind recordId revision orderRef locationId at'); return { ...common, kind: v.kind }; }
    if (v.kind === 'FEE') { exact(v, 'kind recordId revision orderRef locationId at feeMinor'); minor(v.feeMinor, true); return { ...common, kind: v.kind, feeMinor: v.feeMinor as string }; }
    exact(v, 'kind recordId revision orderRef locationId at merchandiseMinor discountMinor taxMinor collectedMinor');
    const merchandise = minor(v.merchandiseMinor, true), discount = minor(v.discountMinor, true), tax = minor(v.taxMinor, true), collected = minor(v.collectedMinor, true);
    if (discount > merchandise || collected !== merchandise - discount + tax) return invalid('row_equation');
    return { ...common, kind: v.kind as 'SALE' | 'REFUND', merchandiseMinor: v.merchandiseMinor as string, discountMinor: v.discountMinor as string, taxMinor: v.taxMinor as string, collectedMinor: v.collectedMinor as string };
  }
  return invalid('record_kind');
}
export function normalizeBusinessVersion(value: unknown, signal?: AbortSignal): BusinessVersionInput {
  checkpoint(signal); inputBound(value); const v = object(value); exact(v, 'source window sourceAsOf completeness records');
  const metadata = { source: parseBusinessSourceSpec(v.source), window: parseWindow(v.window), sourceAsOf: instant(v.sourceAsOf), completeness: choice(v.completeness, ['COMPLETE', 'PARTIAL']) };
  if (metadata.completeness === 'COMPLETE' && metadata.window.toAt > metadata.sourceAsOf) return invalid('sourceAsOf');
  if (!Array.isArray(v.records)) return invalid('records'); if (v.records.length > 1000) throw Error('INPUT_LIMIT');
  const ids = new Set<string>(); const records = v.records.map((row, index) => { checkpoint(signal); const r = record(row, metadata); if (ids.has(r.recordId)) throw Error(`INVALID_INPUT:duplicate_record:row ${index+1}`); ids.add(r.recordId); return r; }).sort((a, b) => a.recordId < b.recordId ? -1 : a.recordId > b.recordId ? 1 : 0);
  return { ...metadata, records };
}
export function parseBusinessQuery(value: unknown, finance: true): BusinessFinanceQuery;
export function parseBusinessQuery(value: unknown, finance?: false): BusinessQuery;
export function parseBusinessQuery(value: unknown, finance = false): BusinessQuery | BusinessFinanceQuery {
  const v = object(value); exact(v, 'window selection locationScope temporalUse' + (finance ? ' scenario' : ''));
  const s = object(v.selection); let selection: BusinessQuery['selection'];
  if (s.kind === 'PRIMARY_PERIMETER') { exact(s, 'kind'); selection = { kind: s.kind }; }
  else { exact(s, 'kind sourceId'); if (s.kind !== 'SOURCE') return invalid('selection'); selection = { kind: s.kind, sourceId: uuid(s.sourceId) }; }
  const l = object(v.locationScope); let locationScope: BusinessQuery['locationScope'];
  if (l.kind === 'ALL') { exact(l, 'kind'); locationScope = { kind: 'ALL' }; }
  else { exact(l, 'kind locationIds'); if (l.kind !== 'SELECTED') return invalid('scope'); locationScope = { kind: l.kind, locationIds: references(l.locationIds, 20, 1) }; }
  const result: BusinessQuery = { window: parseWindow(v.window), selection, locationScope, temporalUse: choice(v.temporalUse, ['CURRENT', 'HISTORICAL']) };
  if (!finance) return result; if (v.scenario === null) return { ...result, scenario: null };
  const scenario = object(v.scenario); exact(scenario, 'anchorRecordId throughDate obligationRecordIds receivableRecordIds');
  const obligationRecordIds = references(scenario.obligationRecordIds, 100), receivableRecordIds = references(scenario.receivableRecordIds, 100);
  if (obligationRecordIds.length + receivableRecordIds.length > 100) throw Error('INPUT_LIMIT');
  return { ...result, scenario: { anchorRecordId: opaque(scenario.anchorRecordId), throughDate: date(scenario.throughDate), obligationRecordIds, receivableRecordIds } };
}
export function parseBusinessMap(value: unknown): BusinessCoverageMap {
  inputBound(value); const v = object(value); exact(v, 'expectedRevision accounts cells');
  if (!Array.isArray(v.accounts) || !Array.isArray(v.cells)) return invalid('map'); if (v.accounts.length > 100 || v.cells.length > 400) throw Error('INPUT_LIMIT');
  const accounts = v.accounts.map(value => { const a = object(value); exact(a, 'accountRef ownership'); const o = object(a.ownership);
    if (o.kind === 'COMPANY_SHARED') { exact(o, 'kind'); return { accountRef: opaque(a.accountRef), ownership: { kind: 'COMPANY_SHARED' as const } }; }
    exact(o, 'kind locationId'); if (o.kind !== 'EXCLUSIVE_LOCATION') return invalid('ownership');
    return { accountRef: opaque(a.accountRef), ownership: { kind: 'EXCLUSIVE_LOCATION' as const, locationId: opaque(o.locationId) } };
  }).sort((a, b) => a.accountRef < b.accountRef ? -1 : a.accountRef > b.accountRef ? 1 : 0);
  if (new Set(accounts.map(a => a.accountRef)).size !== accounts.length) return invalid('duplicate_account');
  const cells = v.cells.map(value => { const c = object(value); exact(c, 'sourceId domain metric currency window role accountRefs locationIds');
    const domain = choice(c.domain, ['FINANCE', 'SALES']), metric = choice(c.metric, ['CASH', 'OBLIGATIONS', 'RECEIVABLES', 'SALES']);
    const accountRefs = references(c.accountRefs, 100), locationIds = references(c.locationIds, 200);
    if (domain === 'SALES' ? metric !== 'SALES' || accountRefs.length !== 0 || !locationIds.length : metric === 'SALES' || locationIds.length !== 0 || !accountRefs.length) return invalid('metric_scope');
    return { sourceId: uuid(c.sourceId), domain, metric, currency: choice(c.currency, ['USD', 'EUR']), window: parseWindow(c.window), role: choice(c.role, ['PRIMARY', 'CORROBORATING']), accountRefs, locationIds };
  });
  cells.sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
  return { expectedRevision: revision(v.expectedRevision), accounts, cells };
}
export function parseBusinessCommand(value: unknown): BusinessCommand {
  inputBound(value); const v = object(value), requestId = uuid(v.requestId);
  if (v.op === 'stage_source_version') {
    if (v.format === 'JSON') { exact(v, 'op requestId format input'); return { op: v.op, requestId, format: v.format, input: normalizeBusinessVersion(v.input) }; }
    exact(v, 'op requestId format csv mapping metadata'); if (v.format !== 'CSV' || typeof v.csv !== 'string') return invalid('format');
    const mapping = parseCsvMapping(v.mapping), parsed = parseBusinessCsv(v.csv, mapping, v.metadata as Omit<BusinessVersionInput, 'records'>); const { records: _records, ...metadata } = parsed;
    return { op: v.op, requestId, format: v.format, csv: v.csv, mapping, metadata };
  }
  if (v.op === 'stage_coverage_map') { exact(v, 'op requestId map'); return { op: v.op, requestId, map: parseBusinessMap(v.map) }; }
  if (v.op === 'check_source_operation') { exact(v, 'op requestId operationId'); return { op: v.op, requestId, operationId: uuid(v.operationId) }; }
  if (v.op === 'query_finance') { exact(v, 'op requestId query'); return { op: v.op, requestId, query: parseBusinessQuery(v.query, true) }; }
  if (v.op === 'query_sales') { exact(v, 'op requestId query'); return { op: v.op, requestId, query: parseBusinessQuery(v.query) }; }
  const mapOp = ['read_coverage_map', 'publish_coverage_map', 'discard_coverage_map'].includes(String(v.op));
  if (!mapOp && !['read_source_version', 'publish_source_version', 'discard_source_version', 'withdraw_source', 'delete_source'].includes(String(v.op))) return invalid('command');
  const ids = mapOp ? { mapVersionId: uuid(v.mapVersionId) } : ['withdraw_source', 'delete_source'].includes(String(v.op)) ? { sourceId: uuid(v.sourceId) } : { sourceId: uuid(v.sourceId), versionId: uuid(v.versionId) };
  const fields = 'op requestId ' + Object.keys(ids).join(' ');
  if (String(v.op).startsWith('read_')) { exact(v, fields); return { op: v.op, requestId, ...ids } as BusinessCommand; }
  const publish = String(v.op).startsWith('publish_'); exact(v, fields + ' expectedRevision digest acknowledged' + (publish ? ' readReceiptId' : ''));
  if (v.acknowledged !== true || typeof v.digest !== 'string' || !/^[a-f0-9]{64}$/.test(v.digest)) return invalid('acknowledgement');
  return { op: v.op, requestId, ...ids, expectedRevision: revision(v.expectedRevision), digest: v.digest, acknowledged: true, ...(publish ? { readReceiptId: uuid(v.readReceiptId) } : {}) } as BusinessCommand;
}
