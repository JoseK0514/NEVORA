import { describe, expect, it } from 'vitest';
import { parseBusinessCsv } from './csv';
import { normalizeBusinessVersion } from './parse';
import { businessDigest } from './digest.server';
const metadata = { source: { sourceId: null, expectedRevision: 0, name: 'Fictional POS', domain: 'SALES' as const, namespace: 'fictional-pos', currency: 'USD' as const, scale: 2 as const, maxAgeMinutes: 1440 }, window: { fromAt: '2026-01-01T00:00:00.000Z', toAt: '2026-02-01T00:00:00.000Z' }, sourceAsOf: '2026-02-01T00:00:00.000Z', completeness: 'COMPLETE' as const };
const mapping = { amountUnit: 'DECIMAL_MAJOR' as const, columns: { recordId: 'id', merchandiseMinor: 'gross', discountMinor: 'discount', taxMinor: 'tax', collectedMinor: 'paid' }, constants: { kind: 'SALE', revision: '1', orderRef: 'order', locationId: 'loc', at: metadata.window.fromAt } };
describe('explicit business CSV', () => {
  it('converts decimal money exactly and has the same digest as canonical JSON', () => {
    const got = parseBusinessCsv('id,gross,discount,tax,paid\r\nsale,10.10,1.00,0.91,10.01\r\n', mapping, metadata);
    expect(got.records[0]).toMatchObject({ merchandiseMinor: '1010', discountMinor: '100', taxMinor: '91', collectedMinor: '1001' });
    expect(businessDigest(got)).toBe(businessDigest(normalizeBusinessVersion({ ...metadata, records: [{ kind: 'SALE', recordId: 'sale', revision: '1', orderRef: 'order', locationId: 'loc', at: metadata.window.fromAt, merchandiseMinor: '1010', discountMinor: '100', taxMinor: '91', collectedMinor: '1001' }] })));
  });
  it.each(['10.001', '1e2', '=SUM(A1)', '+10.00', '1,000.00', ' 10.10', '-0.00'])('rejects guessed or executable amounts %s with a row location', amount => {
    expect(() => parseBusinessCsv(`id,gross,discount,tax,paid\na,"${amount}",0,0,${amount.includes(',') ? '1000' : amount}`, mapping, metadata)).toThrow(/row 2.*line 2/);
  });
  it('parses escaped quotes and embedded lines without losing physical error locations', () => {
    expect(() => parseBusinessCsv('id,gross,discount,tax,paid\n"bad\nref",x,0,0,x', mapping, metadata)).toThrow(/row 2.*line 2/);
    expect(() => parseBusinessCsv('id,gross,discount,tax,paid\n"a""b",10,0,0,10', mapping, metadata)).toThrow(/row 2/);
    expect(() => parseBusinessCsv('id,gross,discount,tax,paid\n"a,10,0,0,10', mapping, metadata)).toThrow(/CSV/);
  });
  it('requires exact mappings and rejects unknown or duplicate headers and ragged rows', () => {
    for (const csv of ['id,id,gross,discount,tax,paid', 'id,gross,discount,tax,paid,privateCustomer\na,1,0,0,1,x', 'id,gross,discount,tax\na,1,0,0', 'id,gross,discount,tax,paid\na,1,0']) expect(() => parseBusinessCsv(csv, mapping, metadata)).toThrow();
    expect(() => parseBusinessCsv('id\na', { ...mapping, amountUnit: 'GUESS' } as never, metadata)).toThrow();
    expect(() => parseBusinessCsv('id\na', { ...mapping, columns: { recordId: 'id', workspaceId: 'id' } }, metadata)).toThrow();
    expect(() => parseBusinessCsv('id,gross,discount,tax,paid\na,1,0,0,1', mapping, { ...metadata, records: [] } as never)).toThrow();
  });
  it('bounds decoded bytes and rows before materializing and supports abort', () => {
    const csv = 'id,gross,discount,tax,paid\n' + Array.from({ length: 1000 }, (_, i) => `r${i},1,0,0,1`).join('\n');
    expect(parseBusinessCsv(csv, mapping, metadata).records).toHaveLength(1000);
    expect(() => parseBusinessCsv(csv + '\nr1000,1,0,0,1', mapping, metadata)).toThrow(/INPUT_LIMIT/);
    expect(() => parseBusinessCsv('é'.repeat(262145), mapping, metadata)).toThrow(/INPUT_LIMIT/);
    const abort = new AbortController(); abort.abort();
    expect(() => parseBusinessCsv(csv, mapping, metadata, abort.signal)).toThrow();
  });
  it('does not convert local ambiguous or nonexistent times into canonical instants', () => {
    for (const at of ['2026-11-01T01:30', '2026-03-08T02:30', '2026-01-01T00:00:00-04:00']) expect(() => parseBusinessCsv('id,gross,discount,tax,paid\na,1,0,0,1', { ...mapping, constants: { ...mapping.constants, at } }, metadata)).toThrow();
  });
  it('rejects a lone surrogate even inside an explicitly mapped CSV header', () => {
    expect(() => parseBusinessCsv('id\ud800,gross,discount,tax,paid\na,1,0,0,1', { ...mapping, columns: { ...mapping.columns, recordId: 'id\ud800' } }, metadata)).toThrow(/unicode/);
  });
});
it('locates a duplicate identity at the offending CSV record and physical line',()=>{expect(()=>parseBusinessCsv('id,gross,discount,tax,paid\na,1,0,0,1\na,1,0,0,1',mapping,metadata)).toThrow(/^INVALID_CSV_RECORD:row 3:line 3$/);});
