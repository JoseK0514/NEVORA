import { describe, expect, it } from '@rstest/core';
import { normalizeBusinessVersion, parseBusinessCommand, parseBusinessMap, parseBusinessQuery } from './parse';
import { businessDigest } from './digest.server';

const id = '10000000-0000-4000-8000-000000000001';
export const window = { fromAt: '2026-01-01T00:00:00.000Z', toAt: '2026-02-01T00:00:00.000Z' };
export const input = () => ({ source: { sourceId: null, expectedRevision: 0, name: 'Fictional bank', domain: 'FINANCE', namespace: 'fictional-bank', currency: 'USD', scale: 2, maxAgeMinutes: 1440 }, window, sourceAsOf: window.toAt, completeness: 'COMPLETE', records: [
  { kind: 'BALANCE', recordId: 'open', revision: '1', accountRef: 'operating', at: window.fromAt, amountMinor: '100000' },
  { kind: 'CASH', recordId: 'cash', revision: '1', accountRef: 'operating', occurredAt: window.fromAt, postedAt: window.fromAt, state: 'POSTED', deltaMinor: '500', reconciliationRef: null },
  { kind: 'OBLIGATION', recordId: 'rent', revision: '1', accountRef: 'operating', recordedAt: window.fromAt, dueDate: '2026-03-01', amountMinor: '20000', state: 'OPEN', confirmation: 'OWNER_REPORTED' },
  { kind: 'RECEIVABLE', recordId: 'invoice', revision: '2', accountRef: 'operating', recordedAt: window.fromAt, dueDate: '2026-03-02', amountMinor: '3000', state: 'OPEN', confirmation: 'UNCONFIRMED' },
] });
const query = () => ({ window, selection: { kind: 'PRIMARY_PERIMETER' }, locationScope: { kind: 'ALL' }, temporalUse: 'HISTORICAL' });
const map = () => ({ expectedRevision: 0, accounts: [{ accountRef: 'operating', ownership: { kind: 'COMPANY_SHARED' } }], cells: [{ sourceId: id, domain: 'FINANCE', metric: 'CASH', currency: 'USD', window, role: 'PRIMARY', accountRefs: ['operating'], locationIds: [] }] });

describe('business input admission', () => {
  it('copies and canonically orders valid variants without carrying authority', () => {
    const original = input(); const got = normalizeBusinessVersion(original);
    expect(got.records).toHaveLength(4);
    expect(got.records.map(r => r.recordId)).toEqual(['cash', 'invoice', 'open', 'rent']);
    original.records[0].recordId = 'changed';
    expect(got.records.some(r => r.recordId === 'open')).toBe(true);
  });
  it.each([
    (v: ReturnType<typeof input>) => ({ ...v, workspaceId: id }),
    (v: ReturnType<typeof input>) => ({ ...v, source: { ...v.source, provenance: 'CONNECTOR' } }),
    (v: ReturnType<typeof input>) => ({ ...v, source: { ...v.source, sourceId: 'nope' } }),
    (v: ReturnType<typeof input>) => ({ ...v, source: { ...v.source, expectedRevision: Number.MAX_SAFE_INTEGER + 1 } }),
    (v: ReturnType<typeof input>) => ({ ...v, source: { ...v.source, currency: 'JPY' } }),
    (v: ReturnType<typeof input>) => ({ ...v, source: { ...v.source, scale: 3 } }),
    (v: ReturnType<typeof input>) => ({ ...v, source: { ...v.source, maxAgeMinutes: null } }),
    (v: ReturnType<typeof input>) => ({ ...v, records: [...v.records, v.records[0]] }),
    (v: ReturnType<typeof input>) => ({ ...v, records: [{ ...v.records[0], customerEmail: 'private@example.test' }] }),
    (v: ReturnType<typeof input>) => ({ ...v, records: [{ ...v.records[0], at: '2026-11-01T01:30' }] }),
    (v: ReturnType<typeof input>) => ({ ...v, records: [{ ...v.records[1], occurredAt: v.window.toAt }] }),
    (v: ReturnType<typeof input>) => ({ ...v, sourceAsOf: v.window.fromAt }),
  ])('rejects invalid or forged import fields', mutate => expect(() => normalizeBusinessVersion(mutate(input()))).toThrow());
  it('validates all sales bodies and rejects inconsistent equations and irrelevant money', () => {
    const sale = { kind: 'SALE', recordId: 'sale', revision: '1', orderRef: 'order', locationId: 'location-1', at: window.fromAt, merchandiseMinor: '10000', discountMinor: '1000', taxMinor: '900', collectedMinor: '9900' };
    const v = { ...input(), source: { ...input().source, domain: 'SALES' }, records: [sale, { ...sale, kind: 'REFUND', recordId: 'refund' }, { kind: 'CANCELLATION', recordId: 'cancel', revision: '1', orderRef: 'order', locationId: 'location-1', at: window.fromAt }, { kind: 'FEE', recordId: 'fee', revision: '1', orderRef: 'order', locationId: 'location-1', at: window.fromAt, feeMinor: '300' }] };
    expect(normalizeBusinessVersion(v).records).toHaveLength(4);
    expect(() => normalizeBusinessVersion({ ...v, records: [{ ...sale, collectedMinor: '9901' }] })).toThrow();
    expect(() => normalizeBusinessVersion({ ...v, records: [{ ...v.records[2], amountMinor: '0' }] })).toThrow();
    expect(() => normalizeBusinessVersion({ ...input(), records: [sale] })).toThrow();
  });
  it('enforces record and byte bounds and honors cancellation', () => {
    expect(() => normalizeBusinessVersion({ ...input(), records: Array.from({ length: 1001 }, (_, i) => ({ ...input().records[0], recordId: `r${i}` })) })).toThrow(/INPUT_LIMIT/);
    expect(() => normalizeBusinessVersion({ ...input(), extra: 'é'.repeat(262144) })).toThrow(/INPUT_LIMIT/);
    const abort = new AbortController(); abort.abort();
    expect(() => normalizeBusinessVersion(input(), abort.signal)).toThrow();
  });
  it('canonical digest is insensitive to object key and row order', () => {
    const v = input();
    expect(businessDigest(normalizeBusinessVersion(v))).toBe(businessDigest(normalizeBusinessVersion({ ...v, records: [...v.records].reverse() })));
    expect(businessDigest({ b: 2, a: 1 })).toBe(businessDigest({ a: 1, b: 2 }));
  });
  it('orders case-sensitive opaque identifiers by stable code units rather than runtime locale', () => {
    const v = input(); const records = ['a_1','a:1','A','a.1','a-1'].map(recordId => ({ ...v.records[0], recordId }));
    expect(normalizeBusinessVersion({ ...v, records }).records.map(r => r.recordId)).toEqual(['A','a-1','a.1','a:1','a_1']);
  });
  it('rejects escaped lone surrogates before PostgreSQL JSON admission and preserves valid Unicode labels', () => {
    const v = input(); expect(() => normalizeBusinessVersion({ ...v, source: { ...v.source, name: 'bad\ud800' } })).toThrow(/unicode/);
    expect(normalizeBusinessVersion({ ...v, source: { ...v.source, name: 'Café ☕' } }).source.name).toBe('Café ☕');
  });
});

describe('strict business commands and reporting maps', () => {
  it('admits every command and strips no unknown fields', () => {
    const shared = { requestId: id }; const exact = { expectedRevision: 1, digest: 'a'.repeat(64), acknowledged: true };
    const commands = [
      { ...shared, op: 'stage_source_version', format: 'JSON', input: input() },
      { ...shared, op: 'read_source_version', sourceId: id, versionId: id },
      { ...shared, op: 'publish_source_version', sourceId: id, versionId: id, ...exact, readReceiptId: id },
      { ...shared, op: 'discard_source_version', sourceId: id, versionId: id, ...exact },
      { ...shared, op: 'stage_coverage_map', map: map() },
      { ...shared, op: 'read_coverage_map', mapVersionId: id },
      { ...shared, op: 'publish_coverage_map', mapVersionId: id, ...exact, readReceiptId: id },
      { ...shared, op: 'discard_coverage_map', mapVersionId: id, ...exact },
      ...['withdraw_source', 'delete_source'].map(op => ({ ...shared, op, sourceId: id, ...exact })),
      { ...shared, op: 'check_source_operation', operationId: id },
      { ...shared, op: 'query_finance', query: { ...query(), scenario: null } },
      { ...shared, op: 'query_sales', query: query() },
    ];
    for (const command of commands) {
      expect(parseBusinessCommand(command).op).toBe(command.op);
      expect(() => parseBusinessCommand({ ...command, companyId: id })).toThrow();
      expect(() => parseBusinessCommand({ ...command, requestId: 'x' })).toThrow();
    }
  });
  it('requires exact acknowledgements, digest and UUID read receipts', () => {
    const v = { requestId: id, op: 'publish_source_version', sourceId: id, versionId: id, expectedRevision: 1, digest: 'a'.repeat(64), readReceiptId: id, acknowledged: true };
    for (const patch of [{ acknowledged: false }, { expectedRevision: -1 }, { digest: 'bad' }, { readReceiptId: 'bad' }]) expect(() => parseBusinessCommand({ ...v, ...patch })).toThrow();
  });
  it('rejects empty or repeated scopes, arbitrary query fields, bad dates and too many scenario records', () => {
    for (const q of [{ ...query(), locationScope: { kind: 'SELECTED', locationIds: [] } }, { ...query(), locationScope: { kind: 'SELECTED', locationIds: ['a', 'a'] } }, { ...query(), window: { fromAt: window.toAt, toAt: window.fromAt } }, { ...query(), currentBalance: '123' }]) expect(() => parseBusinessQuery(q)).toThrow();
    expect(() => parseBusinessQuery({ ...query(), scenario: { anchorRecordId: 'open', throughDate: '2026-02-31', obligationRecordIds: [], receivableRecordIds: [] } }, true)).toThrow();
    expect(() => parseBusinessQuery({ ...query(), scenario: { anchorRecordId: 'open', throughDate: '2026-02-28', obligationRecordIds: Array.from({ length: 101 }, (_, i) => `r${i}`), receivableRecordIds: [] } }, true)).toThrow();
  });
  it('bounds map cells and declared accounts and rejects duplicate or mismatched map scopes', () => {
    expect(parseBusinessMap(map()).cells).toHaveLength(1);
    expect(() => parseBusinessMap({ ...map(), cells: Array(401).fill(map().cells[0]) })).toThrow(/INPUT_LIMIT/);
    expect(() => parseBusinessMap({ ...map(), accounts: [...map().accounts, ...map().accounts] })).toThrow();
    expect(() => parseBusinessMap({ ...map(), cells: [{ ...map().cells[0], metric: 'SALES' }] })).toThrow();
    expect(() => parseBusinessMap({ ...map(), accounts: [{ accountRef: 'a', ownership: { kind: 'EXCLUSIVE_LOCATION', locationId: 'x', ratio: 0.5 } }] })).toThrow();
  });
});
it('assigns a month-end posted movement by posting time while validating its actual occurrence',()=>{
 const base=input(),cash={kind:'CASH',recordId:'cross-month',revision:'1',accountRef:'operating',occurredAt:'2026-01-31T23:59:00.000Z',postedAt:'2026-02-01T00:01:00.000Z',state:'POSTED',deltaMinor:'50000',reconciliationRef:null};
 expect(()=>normalizeBusinessVersion({...base,records:[cash]})).toThrow(/record_window/);
 const feb={...base,window:{fromAt:window.toAt,toAt:'2026-03-01T00:00:00.000Z'},sourceAsOf:'2026-03-01T00:00:00.000Z',records:[cash]};expect(normalizeBusinessVersion(feb).records).toEqual([cash]);
 expect(()=>normalizeBusinessVersion({...feb,records:[{...cash,occurredAt:'2026-02-02T00:00:00.000Z'}]})).toThrow();
});
it('reports the original JSON record row for a duplicate identity',()=>{const value=input();value.records.push({...value.records[0]});expect(()=>normalizeBusinessVersion(value)).toThrow(/^INVALID_INPUT:duplicate_record:row 5$/);});
