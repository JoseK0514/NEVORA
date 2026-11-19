import { describe, expect, it } from '@rstest/core';
import { fictionalBusinessScope } from '@/test/fixtures/rondo-business';
import { calculateFinance } from './finance';
import { calculateSales } from './sales';
const scenario = { anchorRecordId: 'closing', throughDate: '2026-02-10', obligationRecordIds: ['rent'], receivableRecordIds: ['invoice'] };
describe('worked business arithmetic', () => {
  it('reconciles posted cash exactly and explicitly excludes pending and void cash', () => {
    const got = calculateFinance(fictionalBusinessScope(), scenario);
    expect(got.currencies).toEqual([{ currency: 'USD', scale: 2, openingMinor: '100000', postedDeltaMinor: '43500', postedInflowMinor:'50000',postedOutflowMinor:'6500',postedCount:3,postedInflowCount:1,postedOutflowCount:2, calculatedClosingMinor: '143500', reportedClosingMinor: '143500', differenceMinor: '0', reconciled: true, obligationsMinor: '20000', receivablesMinor: '10000', scenarioMinor: '133500', scenarioConditional: true, scenarioAccountRef: 'operating', scenarioAnchorAt: '2026-02-01T00:00:00.000Z' }]);
    expect(got.excludedRows).toBe(2);
  });
  it('exposes actual candidate identities before the model selects a conditional scenario', () => {
    const got = calculateFinance(fictionalBusinessScope(), null);
    expect(got.scenarioInputs).toMatchObject({ state: 'ready', reason: null, anchors: [{ recordId: 'closing', accountRef: 'operating', currency: 'USD', at: '2026-02-01T00:00:00.000Z', amountMinor: '143500' }], obligations: [{ recordId: 'rent', accountRef: 'operating', dueDate: '2026-02-05', amountMinor: '20000', confirmation: 'SOURCE_CONFIRMED' }], receivables: [{ recordId: 'invoice', amountMinor: '10000', confirmation: 'OWNER_REPORTED' }] });
    expect(got.findings).toContainEqual({ code: 'PENDING_CASH_EXCLUDED', accountRef: 'operating', recordIds: [], differenceMinor: null, count: 1 });
    expect(got.findings).toContainEqual({ code: 'VOID_CASH_EXCLUDED', accountRef: 'operating', recordIds: [], differenceMinor: null, count: 1 });
  });
  it('keeps an explicitly named account scenario distinct from a reconciled multi-account cash total', () => {
    const scope = fictionalBusinessScope(); scope.versions[0].accountRefs.push('reserve');
    scope.versions[0].version.input.records.push({ kind: 'BALANCE', recordId: 'reserve-open', revision: '1', accountRef: 'reserve', at: scope.query.window.fromAt, amountMinor: '50000' }, { kind: 'BALANCE', recordId: 'reserve-close', revision: '1', accountRef: 'reserve', at: scope.query.window.toAt, amountMinor: '50000' });
    expect(calculateFinance(scope, scenario).currencies[0]).toMatchObject({ calculatedClosingMinor: '193500', scenarioMinor: '133500', scenarioAccountRef: 'operating', scenarioAnchorAt: '2026-02-01T00:00:00.000Z' });
  });
  it('does not truncate candidate lists, or present unconfirmed open records as confirmed obligations', () => {
    const scope = fictionalBusinessScope(); const rent = scope.versions[0].version.input.records.find(r => r.recordId === 'rent')!; if (rent.kind !== 'OBLIGATION') throw Error('Fixture');
    rent.confirmation = 'UNCONFIRMED'; const result = calculateFinance(scope, null);
    expect(result.scenarioInputs.obligations).toEqual([]); expect(result.findings).toContainEqual({ code: 'UNCONFIRMED_OBLIGATION', accountRef: 'operating', recordIds: [], differenceMinor: null, count: 1 });
    scope.versions[0].version.input.records.push(...Array.from({ length: 101 }, (_, i) => ({ ...rent, confirmation: 'SOURCE_CONFIRMED' as const, recordId: `o${i}` })));
    expect(calculateFinance(scope, null).scenarioInputs).toEqual({ state: 'unavailable', reason: 'INPUT_LIMIT', anchors: [], obligations: [], receivables: [] });
  });
  it('reports a real discrepancy but blocks scenarios and does not substitute zero for a missing anchor', () => {
    const scope = fictionalBusinessScope(); const close = scope.versions[0].version.input.records.find(r => r.recordId === 'closing')!;
    if (close.kind !== 'BALANCE') throw Error('Fixture'); close.amountMinor = '143000';
    const got = calculateFinance(scope, scenario);
    expect(got.currencies[0]).toMatchObject({ calculatedClosingMinor: '143500', reportedClosingMinor: '143000', differenceMinor: '-500', reconciled: false, scenarioMinor: null });
    expect(got.findings).toContainEqual({ code: 'RECONCILIATION_DIFFERENCE', accountRef: 'operating', recordIds: ['closing'], differenceMinor: '-500' });
    scope.versions[0].version.input.records = scope.versions[0].version.input.records.filter(r => r.recordId !== 'opening');
    expect(calculateFinance(scope, null).currencies[0]).toMatchObject({ openingMinor: null, calculatedClosingMinor: null, reconciled: false });
  });
  it('rejects missing, unconfirmed, late and wrong-anchor scenario selections', () => {
    for (const selection of [{ ...scenario, anchorRecordId: 'opening' }, { ...scenario, obligationRecordIds: ['missing'] }, { ...scenario, throughDate: '2026-02-01' }]) expect(calculateFinance(fictionalBusinessScope(), selection).currencies[0].scenarioMinor).toBeNull();
    const scope = fictionalBusinessScope(); const rent = scope.versions[0].version.input.records.find(r => r.recordId === 'rent')!;
    if (rent.kind !== 'OBLIGATION') throw Error('Fixture'); rent.confirmation = 'UNCONFIRMED';
    expect(calculateFinance(scope, scenario).currencies[0].scenarioMinor).toBeNull();
  });
  it('does not allocate a shared bank account to a selected location', () => {
    const scope = fictionalBusinessScope(); scope.query.locationScope = { kind: 'SELECTED', locationIds: ['loc'] };
    expect(calculateFinance(scope, scenario).currencies[0]).toMatchObject({ calculatedClosingMinor: null, scenarioMinor: null });
  });
  it('uses the latest observed obligation once and includes selected overdue open liabilities', () => {
    const scope = fictionalBusinessScope(); const newer = structuredClone(scope.versions[0]); newer.version.versionId = '20000000-0000-4000-8000-000000000001'; newer.version.input.sourceAsOf = '2026-02-02T00:00:00.000Z';
    const rent = newer.version.input.records.find(r => r.recordId === 'rent')!;
    if (rent.kind !== 'OBLIGATION') throw Error('Fixture'); rent.revision = '2'; rent.amountMinor = '30000'; rent.dueDate = '2026-01-20';
    scope.versions.push(newer);
    expect(calculateFinance(scope, scenario).currencies[0]).toMatchObject({ obligationsMinor: '30000', scenarioMinor: '123500' });
  });
  it('separates merchandise, tax, collections and fees without calling receipts profit', () => {
    const got = calculateSales(fictionalBusinessScope('SALES'));
    expect(got.currencies).toEqual([{ currency: 'USD', scale: 2, merchandiseMinor: '8000', discountsMinor: '800', netMerchandiseMinor: '7200', taxMinor: '720', collectionsMinor: '7920', feesMinor: '300', netReceiptsMinor: '7620', cancellations: 1,sales:{count:1,merchandiseMinor:'10000',discountsMinor:'1000',netMerchandiseMinor:'9000',taxMinor:'900',collectionsMinor:'9900'},refunds:{count:1,merchandiseMinor:'2000',discountsMinor:'200',netMerchandiseMinor:'1800',taxMinor:'180',collectionsMinor:'1980'} }]);
  });
  it('keeps complete zero periods, huge values and currencies separate', () => {
    const scope = fictionalBusinessScope('SALES'); scope.versions[0].version.input.records = [];
    expect(calculateSales(scope).currencies[0].collectionsMinor).toBe('0');
    const huge = fictionalBusinessScope('SALES'); const sale = huge.versions[0].version.input.records[0]; if (sale.kind !== 'SALE') throw Error('Fixture');
    sale.merchandiseMinor = '999999999999999999'; sale.discountMinor = '0'; sale.taxMinor = '0'; sale.collectedMinor = '999999999999999999';
    huge.versions[0].version.input.records = [sale]; const eur = structuredClone(huge.versions[0]); eur.version.input.source.currency = 'EUR'; eur.version.input.source.namespace = 'fixture-eur'; eur.version.versionId = '20000000-0000-4000-8000-000000000001'; huge.versions.push(eur);
    expect(calculateSales(huge).currencies.map(c => [c.currency, c.collectionsMinor])).toEqual([['EUR', '999999999999999999'], ['USD', '999999999999999999']]);
  });
  it('counts each identity once, handles boundaries and rejects conflicting same revisions', () => {
    const scope = fictionalBusinessScope('SALES'); const copy = structuredClone(scope.versions[0]); copy.version.versionId = '20000000-0000-4000-8000-000000000001'; scope.versions.push(copy);
    expect(calculateSales(scope).currencies[0].collectionsMinor).toBe('7920');
    const sale = copy.version.input.records[0]; if (sale.kind !== 'SALE') throw Error('Fixture'); sale.collectedMinor = '10000';
    expect(() => calculateSales(scope)).toThrow(/IDENTITY_CONFLICT/);
    const edges = fictionalBusinessScope('SALES'); const r = edges.versions[0].version.input.records[0]; if (r.kind !== 'SALE') throw Error('Fixture');
    r.at = edges.query.window.fromAt; edges.versions[0].version.input.records = [r, { ...r, recordId: 'end', at: edges.query.window.toAt }];
    expect(calculateSales(edges).currencies[0].collectionsMinor).toBe('9900');
  });
  it('handles a DST-spanning exact instant window and cancellation at maximum rows', () => {
    const scope = fictionalBusinessScope('SALES'); scope.query.window = { fromAt: '2026-03-08T05:00:00.000Z', toAt: '2026-03-09T04:00:00.000Z' };
    scope.versions[0].window = { ...scope.query.window };
    const sale = scope.versions[0].version.input.records[0]; if (sale.kind !== 'SALE') throw Error('Fixture'); sale.at = '2026-03-08T07:00:00.000Z';
    scope.versions[0].version.input.records = Array.from({ length: 1000 }, (_, i) => ({ ...sale, recordId: `r${i}` }));
    expect(calculateSales(scope).currencies[0].collectionsMinor).toBe('9900000');
    const abort = new AbortController(); abort.abort(); expect(() => calculateSales(scope, abort.signal)).toThrow(); expect(() => calculateFinance(fictionalBusinessScope(), null, abort.signal)).toThrow();
  });
});

it('preserves gross cash inflow/outflow and sale/refund amounts and counts alongside net figures',()=>{
 expect(calculateFinance(fictionalBusinessScope(),null).currencies[0]).toMatchObject({postedInflowMinor:'50000',postedOutflowMinor:'6500',postedCount:3,postedInflowCount:1,postedOutflowCount:2,postedDeltaMinor:'43500'});
 expect(calculateSales(fictionalBusinessScope('SALES')).currencies[0]).toMatchObject({sales:{count:1,merchandiseMinor:'10000',discountsMinor:'1000',netMerchandiseMinor:'9000',taxMinor:'900',collectionsMinor:'9900'},refunds:{count:1,merchandiseMinor:'2000',discountsMinor:'200',netMerchandiseMinor:'1800',taxMinor:'180',collectionsMinor:'1980'},collectionsMinor:'7920',netReceiptsMinor:'7620'});
});
it('does not let opposite constituent-window discrepancies cancel into cash clearance or a scenario',()=>{
 const scope=fictionalBusinessScope();scope.query.window={fromAt:'2026-01-01T00:00:00.000Z',toAt:'2026-03-01T00:00:00.000Z'};const first=scope.versions[0];first.version.input.records=[{kind:'BALANCE',recordId:'open-a',revision:'1',accountRef:'operating',at:first.window.fromAt,amountMinor:'10000'},{kind:'BALANCE',recordId:'close-a',revision:'1',accountRef:'operating',at:first.window.toAt,amountMinor:'9000'}];
 const next=structuredClone(first);next.version.versionId='20000000-0000-4000-8000-000000000001';next.window={fromAt:first.window.toAt,toAt:scope.query.window.toAt};next.version.input.window={...next.window};next.version.input.sourceAsOf=next.window.toAt;next.version.input.records=[{kind:'BALANCE',recordId:'open-b',revision:'1',accountRef:'operating',at:next.window.fromAt,amountMinor:'9000'},{kind:'BALANCE',recordId:'close-b',revision:'1',accountRef:'operating',at:next.window.toAt,amountMinor:'10000'}];scope.versions.push(next);
 const selection={anchorRecordId:'close-b',throughDate:'2026-03-10',obligationRecordIds:[],receivableRecordIds:[]},got=calculateFinance(scope,selection);expect(got.currencies[0]).toMatchObject({differenceMinor:'0',reconciled:false,scenarioMinor:null});expect(got.findings.filter(f=>f.code==='RECONCILIATION_DIFFERENCE').map(f=>f.differenceMinor).sort()).toEqual(['-1000','1000']);expect(got.scenarioInputs.reason).toBe('NO_RECONCILED_ANCHOR');
 for(const entry of scope.versions)for(const r of entry.version.input.records)if(r.kind==='BALANCE')r.amountMinor='10000';expect(calculateFinance(scope,selection).currencies[0]).toMatchObject({reconciled:true,scenarioMinor:'10000'});
});
it('counts a cross-month posted movement once in the posting period and in a combined query',()=>{
 const scope=fictionalBusinessScope();const jan=scope.versions[0];jan.version.input.records=[];const feb=structuredClone(jan);feb.version.versionId='20000000-0000-4000-8000-000000000001';feb.window={fromAt:jan.window.toAt,toAt:'2026-03-01T00:00:00.000Z'};feb.version.input.window={...feb.window};feb.version.input.sourceAsOf=feb.window.toAt;feb.version.input.records=[{kind:'CASH',recordId:'cross-month',revision:'1',accountRef:'operating',occurredAt:'2026-01-31T23:59:00.000Z',postedAt:'2026-02-01T00:01:00.000Z',state:'POSTED',deltaMinor:'50000',reconciliationRef:null}];scope.versions.push(feb);
 expect(calculateFinance(scope,null).currencies[0].postedDeltaMinor).toBe('0');scope.query.window={...feb.window};expect(calculateFinance(scope,null).currencies[0]).toMatchObject({postedDeltaMinor:'50000',postedCount:1});scope.query.window={fromAt:jan.window.fromAt,toAt:feb.window.toAt};expect(calculateFinance(scope,null).currencies[0]).toMatchObject({postedDeltaMinor:'50000',postedCount:1});
});
it('rejects conflicting shared-boundary anchors even when each window balances and outer differences cancel',()=>{
 const scope=fictionalBusinessScope(),ends=['2026-01-01T00:00:00.000Z','2026-02-01T00:00:00.000Z','2026-03-01T00:00:00.000Z','2026-04-01T00:00:00.000Z'],base=scope.versions[0];scope.versions=[];scope.query.window={fromAt:ends[0],toAt:ends[3]};
 for(let i=0;i<3;i++){const entry=structuredClone(base),amount=i===1?'11000':'10000';entry.version.versionId=`${i+1}0000000-0000-4000-8000-000000000001`;entry.window={fromAt:ends[i],toAt:ends[i+1]};entry.version.input.window={...entry.window};entry.version.input.sourceAsOf=entry.window.toAt;entry.version.input.records=[{kind:'BALANCE',recordId:'open-'+i,revision:'1',accountRef:'operating',at:entry.window.fromAt,amountMinor:amount},{kind:'BALANCE',recordId:'close-'+i,revision:'1',accountRef:'operating',at:entry.window.toAt,amountMinor:amount}];scope.versions.push(entry);}
 const result=calculateFinance(scope,{anchorRecordId:'close-2',throughDate:'2026-04-10',obligationRecordIds:[],receivableRecordIds:[]});expect(result.currencies[0]).toMatchObject({differenceMinor:'0',reconciled:false,scenarioMinor:null});expect(result.findings.filter(f=>f.code==='BOUNDARY_ANCHOR_CONFLICT').map(f=>f.boundaryAt)).toEqual([ends[1],ends[2]]);
});
it('reconciles every reported intermediate balance inside a single source window',()=>{
 const scope=fictionalBusinessScope(),entry=scope.versions[0];entry.version.input.records=[{kind:'BALANCE',recordId:'opening',revision:'1',accountRef:'operating',at:scope.query.window.fromAt,amountMinor:'10000'},{kind:'BALANCE',recordId:'middle',revision:'1',accountRef:'operating',at:'2026-01-16T00:00:00.000Z',amountMinor:'9000'},{kind:'BALANCE',recordId:'closing',revision:'1',accountRef:'operating',at:scope.query.window.toAt,amountMinor:'10000'}];
 const selection={anchorRecordId:'closing',throughDate:'2026-02-10',obligationRecordIds:[],receivableRecordIds:[]},result=calculateFinance(scope,selection);expect(result.currencies[0]).toMatchObject({differenceMinor:'0',reconciled:false,scenarioMinor:null});expect(result.findings.filter(f=>f.code==='RECONCILIATION_DIFFERENCE').map(f=>f.differenceMinor).sort()).toEqual(['-1000','1000']);
 for(const r of entry.version.input.records)if(r.kind==='BALANCE')r.amountMinor='10000';expect(calculateFinance(scope,selection).currencies[0]).toMatchObject({reconciled:true,scenarioMinor:'10000'});
});
