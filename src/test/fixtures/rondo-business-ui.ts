/* Fictional business records for the Rondo business page and evidence card (UI tests and browser captures only).
 * Totals come from the backend's own calculators, shaped the way the service shapes a full review, so the screens are
 * exercised with what the server emits. Nothing here is real data. */
import type {
  AdmittedBusinessScope, BusinessApiResult, BusinessCatalog, BusinessReadResult, BusinessRecord, BusinessSourceView, BusinessVersionInput, BusinessVersionView, BusinessWindow,
} from '@/lib/owner-advisor/business/contracts';
import type { BusinessModelEvidence } from '@/lib/owner-advisor/business/model-contracts';
import { calculateFinance } from '@/lib/owner-advisor/business/finance';
import { calculateSales } from '@/lib/owner-advisor/business/sales';
import { normalizeBusinessVersion, parseBusinessMap } from '@/lib/owner-advisor/business/parse';

export const uiNow = Date.parse('2026-11-17T15:00:00.000Z');
export const uiZone = 'America/Puerto_Rico';
const id = (n: number, kind = 1) => `${kind}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const uiIds = { sales: id(1), cash: id(2), draftOnly: id(3), withdrawn: id(4),
  salesCurrent: id(11, 2), salesReplaced: id(12, 2), cashOctober: id(13, 2), cashDraft: id(14, 2), draftOnlyDraft: id(15, 2), withdrawnVersion: id(16, 2), salesPartial: id(17, 2), mapCurrent: id(21, 3), mapDraft: id(22, 3) };
const hex = (c: string) => c.repeat(64);
export const uiLocations = [{ id: 'loc-1', name: 'Condado Café' }, { id: 'loc-2', name: 'Santurce Bakery' }];
const week: BusinessWindow = { fromAt: '2026-11-09T04:00:00.000Z', toAt: '2026-11-16T04:00:00.000Z' };
const october: BusinessWindow = { fromAt: '2026-10-01T04:00:00.000Z', toAt: '2026-11-01T04:00:00.000Z' };
const november: BusinessWindow = { fromAt: '2026-11-01T04:00:00.000Z', toAt: '2026-11-16T04:00:00.000Z' };

const sources: BusinessSourceView[] = [
  { sourceId: uiIds.sales, revision: 3, name: 'Square sales', domain: 'SALES', namespace: 'square', currency: 'USD', scale: 2, maxAgeMinutes: 4320, active: true, deleted: false, scopeDigest: hex('1') },
  { sourceId: uiIds.cash, revision: 2, name: 'Operating account', domain: 'FINANCE', namespace: 'banco-popular', currency: 'USD', scale: 2, maxAgeMinutes: 1440, active: true, deleted: false, scopeDigest: hex('2') },
  { sourceId: uiIds.draftOnly, revision: 1, name: 'Catering invoices', domain: 'FINANCE', namespace: 'quickbooks', currency: 'USD', scale: 2, maxAgeMinutes: 1440, active: true, deleted: false, scopeDigest: hex('3') },
  { sourceId: uiIds.withdrawn, revision: 4, name: 'Old register', domain: 'SALES', namespace: 'old-register', currency: 'USD', scale: 2, maxAgeMinutes: 1440, active: false, deleted: false, scopeDigest: hex('4') },
];
const spec = (source: BusinessSourceView) => ({ sourceId: source.sourceId, expectedRevision: source.revision - 1, name: source.name, domain: source.domain, namespace: source.namespace, currency: source.currency, scale: 2 as const, maxAgeMinutes: source.maxAgeMinutes });
function salesRows(window: BusinessWindow, count: number): BusinessRecord[] {
  const start = Date.parse(window.fromAt), rows: BusinessRecord[] = [];
  for (let i = 0; i < count; i++) {
    const at = new Date(start + (i * 5 + 9) * 3600000).toISOString(), locationId = uiLocations[i % 2].id, n = String(i + 1).padStart(3, '0');
    const merchandise = 1800 + i * 245, discount = i % 4 === 0 ? 150 : 0, tax = Math.round((merchandise - discount) * 0.115);
    if (i % 9 === 7) rows.push({ kind: 'REFUND', recordId: `r-${n}`, revision: '1', orderRef: `A-${1000 + i - 1}`, locationId, at, merchandiseMinor: '950', discountMinor: '0', taxMinor: '109', collectedMinor: '1059' });
    else if (i % 11 === 10) rows.push({ kind: 'CANCELLATION', recordId: `r-${n}`, revision: '1', orderRef: `A-${1000 + i}`, locationId, at });
    else if (i % 6 === 5) rows.push({ kind: 'FEE', recordId: `r-${n}`, revision: '1', orderRef: `A-${1000 + i - 1}`, locationId, at, feeMinor: String(40 + i) });
    else rows.push({ kind: 'SALE', recordId: `r-${n}`, revision: '1', orderRef: `A-${1000 + i}`, locationId, at, merchandiseMinor: String(merchandise), discountMinor: String(discount), taxMinor: String(tax), collectedMinor: String(merchandise - discount + tax) });
  }
  return rows;
}
function cashRows(window: BusinessWindow, closing: string): BusinessRecord[] {
  const at = (day: number) => new Date(Date.parse(window.fromAt) + day * 86400000 + 15 * 3600000).toISOString();
  return [
    { kind: 'BALANCE', recordId: 'bal-open', revision: '1', accountRef: 'operating', at: window.fromAt, amountMinor: '1250000' },
    { kind: 'BALANCE', recordId: 'bal-close', revision: '1', accountRef: 'operating', at: window.toAt, amountMinor: closing },
    { kind: 'CASH', recordId: 'dep-1', revision: '1', accountRef: 'operating', occurredAt: at(2), postedAt: at(2), state: 'POSTED', deltaMinor: '486250', reconciliationRef: null },
    { kind: 'CASH', recordId: 'dep-2', revision: '1', accountRef: 'operating', occurredAt: at(9), postedAt: at(9), state: 'POSTED', deltaMinor: '512400', reconciliationRef: null },
    { kind: 'CASH', recordId: 'pay-rent', revision: '1', accountRef: 'operating', occurredAt: at(3), postedAt: at(3), state: 'POSTED', deltaMinor: '-320000', reconciliationRef: null },
    { kind: 'CASH', recordId: 'pay-supplier', revision: '1', accountRef: 'operating', occurredAt: at(10), postedAt: at(10), state: 'POSTED', deltaMinor: '-184500', reconciliationRef: null },
    { kind: 'CASH', recordId: 'pending-card', revision: '1', accountRef: 'operating', occurredAt: at(12), postedAt: null, state: 'PENDING', deltaMinor: '64300', reconciliationRef: null },
    { kind: 'OBLIGATION', recordId: 'bill-power', revision: '1', accountRef: 'operating', recordedAt: at(5), dueDate: '2026-11-28', amountMinor: '41875', state: 'OPEN', confirmation: 'SOURCE_CONFIRMED' },
    { kind: 'OBLIGATION', recordId: 'bill-flour', revision: '1', accountRef: 'operating', recordedAt: at(6), dueDate: '2026-11-30', amountMinor: '96000', state: 'OPEN', confirmation: 'UNCONFIRMED' },
    { kind: 'RECEIVABLE', recordId: 'inv-catering', revision: '1', accountRef: 'operating', recordedAt: at(7), dueDate: '2026-12-05', amountMinor: '150000', state: 'OPEN', confirmation: 'OWNER_REPORTED' },
  ];
}
function input(source: BusinessSourceView, window: BusinessWindow, sourceAsOf: string, records: BusinessRecord[], completeness: 'COMPLETE' | 'PARTIAL' = 'COMPLETE'): BusinessVersionInput {
  return normalizeBusinessVersion({ source: spec(source), window, sourceAsOf, completeness, records });
}
const [sales, cash, draftOnly, withdrawn] = sources;
type Entry = { versionId: string; source: BusinessSourceView; status: BusinessVersionView['status']; current: boolean; publishedAt: string | null; publishEligible: boolean; digest: string; input: BusinessVersionInput };
const entries: Entry[] = [
  { versionId: uiIds.salesCurrent, source: sales, status: 'PUBLISHED', current: true, publishedAt: '2026-11-16T13:05:00.000Z', publishEligible: false, digest: hex('a'), input: input(sales, week, '2026-11-16T12:00:00.000Z', salesRows(week, 32)) },
  { versionId: uiIds.salesReplaced, source: sales, status: 'PUBLISHED', current: false, publishedAt: '2026-11-16T12:20:00.000Z', publishEligible: false, digest: hex('b'), input: input(sales, week, '2026-11-16T11:00:00.000Z', salesRows(week, 30)) },
  { versionId: uiIds.salesPartial, source: sales, status: 'DRAFT', current: false, publishedAt: null, publishEligible: false, digest: hex("7"), input: input(sales, { fromAt: '2026-11-16T04:00:00.000Z', toAt: '2026-11-23T04:00:00.000Z' }, '2026-11-17T12:00:00.000Z', salesRows({ fromAt: '2026-11-16T04:00:00.000Z', toAt: '2026-11-17T04:00:00.000Z' }, 4), 'PARTIAL') },
  { versionId: uiIds.cashOctober, source: cash, status: 'PUBLISHED', current: true, publishedAt: '2026-11-02T14:00:00.000Z', publishEligible: false, digest: hex('c'), input: input(cash, october, '2026-11-02T13:00:00.000Z', cashRows(october, '1744150')) },
  { versionId: uiIds.cashDraft, source: cash, status: 'DRAFT', current: false, publishedAt: null, publishEligible: true, digest: hex('d'), input: input(cash, november, '2026-11-16T13:00:00.000Z', cashRows(november, '1739150')) },
  { versionId: uiIds.draftOnlyDraft, source: draftOnly, status: 'DRAFT', current: false, publishedAt: null, publishEligible: true, digest: hex('e'), input: input(draftOnly, november, '2026-11-16T13:00:00.000Z', cashRows(november, '1744150').slice(0, 6)) },
  { versionId: uiIds.withdrawnVersion, source: withdrawn, status: 'PUBLISHED', current: true, publishedAt: '2026-10-05T14:00:00.000Z', publishEligible: false, digest: hex('f'), input: input(withdrawn, october, '2026-11-01T12:00:00.000Z', salesRows(october, 12)) },
];
const listed = (entry: Entry): BusinessVersionView => ({ sourceId: entry.source.sourceId, versionId: entry.versionId, timeZone: uiZone, digest: entry.digest, status: entry.status, current: entry.current, input: null,
  publishEligible: entry.publishEligible, publishedAt: entry.publishedAt,
  metadata: { window: entry.input.window, sourceAsOf: entry.input.sourceAsOf, completeness: entry.input.completeness, rowCount: entry.input.records.length, payloadBytes: JSON.stringify(entry.input).length } });
export function uiCatalog(which: 'full' | 'empty' = 'full'): BusinessCatalog {
  const base = { revision: 12, evidenceRevision: 7, mapRevision: 1, timeZone: uiZone, activeLocationIds: uiLocations.map(l => l.id), activeLocations: uiLocations.map(l => ({ ...l })) };
  if (which === 'empty') return { ...base, revision: 0, evidenceRevision: 0, mapRevision: 0, sources: [], versions: [], maps: [] };
  return { ...base, sources: sources.map(s => ({ ...s })), versions: entries.map(listed),
    maps: [{ mapVersionId: uiIds.mapDraft, digest: hex('8'), status: 'DRAFT', current: false, input: null }, { mapVersionId: uiIds.mapCurrent, digest: hex('9'), status: 'PUBLISHED', current: true, input: { expectedRevision: 0, accounts: [{ accountRef: 'operating', ownership: { kind: 'COMPANY_SHARED' } }],
      cells: [{ sourceId: uiIds.cash, domain: 'FINANCE', metric: 'CASH', currency: 'USD', window: october, role: 'PRIMARY', accountRefs: ['operating'], locationIds: [] },
        { sourceId: uiIds.sales, domain: 'SALES', metric: 'SALES', currency: 'USD', window: week, role: 'PRIMARY', accountRefs: [], locationIds: ['loc-1', 'loc-2'] }] } }] };
}
function scopeOf(entry: Entry, observedAt: string): AdmittedBusinessScope {
  const records = entry.input.records;
  const accountRefs = [...new Set(records.flatMap(r => 'accountRef' in r ? [r.accountRef] : []))], locationIds = [...new Set(records.flatMap(r => 'locationId' in r ? [r.locationId] : []))];
  const view = { ...listed(entry), input: entry.input };
  return { domain: entry.source.domain, timeZone: uiZone, query: { window: entry.input.window, selection: { kind: 'SOURCE', sourceId: entry.source.sourceId }, locationScope: { kind: 'ALL' }, temporalUse: 'HISTORICAL' },
    versions: [{ version: view, window: entry.input.window, accountRefs, locationIds, metrics: ['CASH', 'OBLIGATIONS', 'RECEIVABLES', 'SALES'] }], accounts: [], locationIds, completeScope: false, sourceSubtotal: true,
    observedAt, expiresAt: new Date(Date.parse(observedAt) + 15000).toISOString(), qualifiers: [] };
}
/** A full review answer for one version, as `read_source_version` returns it (rows, the server's totals, a review receipt). */
export function uiFullRead(versionId: string, observedAt = new Date(uiNow).toISOString(), extra: Partial<BusinessApiResult> = {}): BusinessApiResult {
  const entry = entries.find(e => e.versionId === versionId)!, scope = scopeOf(entry, observedAt), finance = entry.source.domain === 'FINANCE';
  const { metadata: _metadata, ...view } = listed(entry);
  return { state: 'ready', reason: null, catalog: null, map: null, result: null,
    version: { ...view, input: entry.input, validation: { finance: finance ? calculateFinance(scope, null) : null, sales: finance ? null : calculateSales(scope),
      qualifiers: ['SOURCE_SUBTOTAL', 'OWNER_IMPORT_NOT_INDEPENDENTLY_VERIFIED', entry.input.completeness === 'PARTIAL' ? 'PARTIAL_NOT_PUBLISHABLE' : 'OWNER_REPORTED_COMPLETENESS', ...(entry.status === 'DRAFT' ? ['DRAFT_VALIDATION_ONLY'] as const : [])] } },
    receipt: { operationId: id(31, 4), kind: 'read_source_version', sourceId: entry.source.sourceId, versionId, mapVersionId: null, revision: entry.source.revision, savedAt: observedAt },
    readReceiptId: id(41, 5), readReceiptExpiresAt: new Date(Date.parse(observedAt) + 300000).toISOString(), authority: 'owner-authority-fixture', observedAt, validForMs: 15000, ...extra };
}
export function uiCatalogResult(which: 'full' | 'empty' = 'full', observedAt = new Date(uiNow).toISOString()): BusinessApiResult {
  return { state: 'ready', reason: null, catalog: uiCatalog(which), version: null, map: null, receipt: null, result: null, readReceiptId: null, readReceiptExpiresAt: null, authority: 'owner-authority-fixture', observedAt, validForMs: 15000 };
}
export function uiReceipt(kind: NonNullable<BusinessApiResult['receipt']>['kind'], operationId: string, sourceId: string | null, versionId: string | null, state: 'saved' | 'not_saved' = 'saved', observedAt = new Date(uiNow).toISOString()): BusinessApiResult {
  return { state, reason: null, catalog: null, version: null, map: null, result: null, readReceiptId: null, readReceiptExpiresAt: null, authority: 'owner-authority-fixture', observedAt, validForMs: 15000,
    receipt: state === 'saved' ? { operationId, kind, sourceId, versionId, mapVersionId: null, revision: 4, savedAt: observedAt } : null };
}
/** The evidence an answer carries for one cited version (public form: exactly what the answer parser accepts). */
export function uiEvidence(domain: 'SALES' | 'FINANCE', extra: Partial<BusinessModelEvidence> = {}): BusinessModelEvidence {
  const entry = entries.find(e => e.versionId === (domain === 'SALES' ? uiIds.salesCurrent : uiIds.cashOctober))!, observedAt = '2026-11-17T14:59:50.000Z', scope = scopeOf(entry, observedAt);
  return { state: 'ready', reason: null, domain, completeScope: false, sourceSubtotal: true, window: entry.input.window, selection: { kind: 'SOURCE', sourceId: entry.source.sourceId }, locationScope: { kind: 'ALL' },
    temporalUse: domain === 'SALES' ? 'CURRENT' : 'HISTORICAL', scenario: null, observedAt, expiresAt: '2026-11-17T15:00:05.000Z',
    qualifiers: domain === 'SALES' ? ['OWNER_REPORTED_COMPLETENESS', 'NO_FX_OR_PROFIT_INFERENCE', 'CURRENT_ACTIVE_LOCATION_PERIMETER', 'SOURCE_SUBTOTAL', 'CURRENT_WITHIN_PUBLISHED_FRESHNESS_POLICY']
      : ['OWNER_REPORTED_COMPLETENESS', 'NO_FX_OR_PROFIT_INFERENCE', 'SOURCE_RECORDS_ONLY', 'SOURCE_SUBTOTAL', 'HISTORICAL_AS_OF_RECORDS'],
    finance: domain === 'FINANCE' ? calculateFinance(scope, null) : null, sales: domain === 'SALES' ? calculateSales(scope) : null,
    citations: [{ sourceId: entry.source.sourceId, versionId: entry.versionId, digest: entry.digest, name: entry.source.name, namespace: entry.source.namespace, timeZone: uiZone, currency: 'USD', window: entry.input.window,
      sourceAsOf: entry.input.sourceAsOf, origin: 'OWNER_IMPORT', href: `/api/owner/advisor/business/sources/${entry.source.sourceId}/versions/${entry.versionId}` }],
    timeZone: uiZone, queryHash: hex('5'), sourceDigest: hex('6'), ...extra };
}
export const uiCitationHref = (domain: 'SALES' | 'FINANCE') => uiEvidence(domain).citations[0].href;
/** A full read of a staged or published map, as `read_coverage_map` returns it. */
export function uiMapRead(mapVersionId: string = uiIds.mapDraft, observedAt = new Date(uiNow).toISOString()): BusinessApiResult {
  const current = uiCatalog().maps.find(m => m.current)!, draft = mapVersionId === uiIds.mapDraft;
  const input = parseBusinessMap({ ...current.input!, expectedRevision: draft ? 1 : 0, cells: draft ? [...current.input!.cells, { sourceId: uiIds.sales, domain: 'SALES', metric: 'SALES', currency: 'USD', window: october, role: 'CORROBORATING', accountRefs: [], locationIds: ['loc-1'] }] : current.input!.cells,
    accounts: draft ? [...current.input!.accounts, { accountRef: 'till-condado', ownership: { kind: 'EXCLUSIVE_LOCATION', locationId: 'loc-1' } }] : current.input!.accounts });
  return { state: 'ready', reason: null, catalog: null, version: null, result: null, map: { mapVersionId, digest: draft ? hex('8') : hex('9'), status: draft ? 'DRAFT' : 'PUBLISHED', current: !draft, input },
    receipt: { operationId: id(32, 4), kind: 'read_coverage_map', sourceId: null, versionId: null, mapVersionId, revision: draft ? 2 : 1, savedAt: observedAt },
    readReceiptId: id(42, 5), readReceiptExpiresAt: new Date(Date.parse(observedAt) + 300000).toISOString(), authority: 'owner-authority-fixture', observedAt, validForMs: 15000 };
}
/** A query's answer, as `query_sales` / `query_finance` return it (the evidence without the model-only fields). */
export function uiQueryResult(domain: 'SALES' | 'FINANCE', extra: Partial<BusinessReadResult> = {}, observedAt = new Date(uiNow).toISOString()): BusinessApiResult {
  const { timeZone: _zone, queryHash: _hash, sourceDigest: _digest, ...result } = uiEvidence(domain, { observedAt, expiresAt: new Date(Date.parse(observedAt) + 15000).toISOString() });
  return { state: 'ready', reason: null, catalog: null, version: null, map: null, receipt: null, result: { ...result, ...extra }, readReceiptId: null, readReceiptExpiresAt: null, authority: 'owner-authority-fixture', observedAt, validForMs: 15000 };
}
