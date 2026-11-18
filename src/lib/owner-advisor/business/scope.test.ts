import {renderBusinessMetric} from './metrics';
import type {BusinessModelEvidence} from './model-contracts';
import { describe, expect, it, rs } from '@rstest/core';
import type { BusinessCatalog, BusinessCoverageMap, BusinessFinanceQuery, BusinessQuery, BusinessVersionView } from './contracts';
import { fictionalBusinessInput, fictionalBusinessId, businessJanuary } from '@/test/fixtures/rondo-business';
import { validateBusinessMap, selectBusinessScope } from './scope';
import { calculateFinance } from './finance';
import { calculateSales } from './sales';
const other = '20000000-0000-4000-8000-000000000001';
function fixture(domain: 'FINANCE' | 'SALES' = 'SALES') {
  const input = fictionalBusinessInput(domain);
  const version: BusinessVersionView = { timeZone: 'UTC', sourceId: fictionalBusinessId, versionId: fictionalBusinessId, digest: 'a'.repeat(64), current: true, status: 'PUBLISHED', input, publishedAt: businessJanuary.toAt };
  const { sourceId: _id, expectedRevision: _rev, ...spec } = input.source;
  const catalog: BusinessCatalog = { revision: 1, evidenceRevision: 1, timeZone: 'UTC', activeLocationIds: ['loc'], activeLocations: [{ id: 'loc', name: 'Fictional location' }], sources: [{ ...spec, sourceId: fictionalBusinessId, revision: 1, active: true, deleted: false, scopeDigest: 'b'.repeat(64) }], versions: [version], maps: [] };
  const map: BusinessCoverageMap = { expectedRevision: 0, accounts: domain === 'FINANCE' ? [{ accountRef: 'operating', ownership: { kind: 'COMPANY_SHARED' } }] : [], cells: (domain === 'FINANCE' ? ['CASH', 'OBLIGATIONS', 'RECEIVABLES'] as const : ['SALES'] as const).map(metric => ({ sourceId: fictionalBusinessId, domain, metric, currency: 'USD', window: { ...businessJanuary }, role: 'PRIMARY', accountRefs: domain === 'FINANCE' ? ['operating'] : [], locationIds: domain === 'SALES' ? ['loc'] : [] })) };
  const query: BusinessQuery | BusinessFinanceQuery = { window: { ...businessJanuary }, selection: { kind: 'PRIMARY_PERIMETER' }, locationScope: { kind: 'ALL' }, temporalUse: 'HISTORICAL', ...(domain === 'FINANCE' ? { scenario: null } : {}) };
  return { catalog, map, query };
}
const run = (f: ReturnType<typeof fixture>, observedAt = '2026-02-01T00:00:01.000Z') => selectBusinessScope(f.query, f.catalog, validateBusinessMap(f.map, f.catalog), observedAt);
describe('whole reporting perimeter admission', () => {
  it('selects disjoint January/February and only the exact corrected January pointer', () => {
    const f = fixture(); const feb = structuredClone(f.catalog.versions[0]); feb.versionId = other; feb.input!.window = { fromAt: businessJanuary.toAt, toAt: '2026-03-01T00:00:00.000Z' }; feb.input!.sourceAsOf = feb.input!.window.toAt; feb.input!.records = [];
    const old = structuredClone(f.catalog.versions[0]); old.current = false; old.versionId = '30000000-0000-4000-8000-000000000001'; f.catalog.versions.push(feb, old);
    f.map.cells.push({ ...f.map.cells[0], window: feb.input!.window }); f.query.window.toAt = feb.input!.window.toAt;
    const got = run(f, '2026-03-01T00:00:01.000Z'); expect(got.state).toBe('ready');
    if (got.state === 'ready') expect(got.scope.versions.map(v => v.version.versionId).sort()).toEqual([fictionalBusinessId, other]);
  });
  it('rejects active changed-boundary overlaps, period gaps and partial data', () => {
    const overlap = fixture(); const v = structuredClone(overlap.catalog.versions[0]); v.versionId = other; v.input!.window.toAt = '2026-01-20T00:00:00.000Z'; overlap.catalog.versions.push(v);
    expect(run(overlap)).toEqual({ state: 'unavailable', reason: 'OVERLAP' });
    const gap = fixture(); gap.catalog.versions[0].input!.window.toAt = '2026-01-20T00:00:00.000Z'; expect(run(gap)).toEqual({ state: 'unavailable', reason: 'INCOMPLETE_SCOPE' });
    const partial = fixture(); partial.catalog.versions[0].input!.completeness = 'PARTIAL'; expect(run(partial).state).toBe('unavailable');
  });
  it('clips each source to its reviewed primary map window before totaling records', () => {
    const f = fixture(); const split = '2026-01-16T00:00:00.000Z';
    const copy = structuredClone(f.catalog.versions[0]); copy.sourceId = other; copy.versionId = other; copy.input!.source.namespace = 'second-pos'; copy.input!.records = [];
    f.catalog.sources.push({ ...f.catalog.sources[0], sourceId: other, namespace: 'second-pos' }); f.catalog.versions.push(copy);
    f.map.cells[0].window.toAt = split; f.map.cells.push({ ...f.map.cells[0], sourceId: other, window: { fromAt: split, toAt: businessJanuary.toAt } });
    const got = run(f); expect(got.state).toBe('ready'); if (got.state === 'ready') expect(calculateSales(got.scope).currencies[0]).toMatchObject({ collectionsMinor: '9900', feesMinor: '0', cancellations: 0 });
  });
  it('clips posted cash by its posted instant even when its occurrence is in another primary interval', () => {
    const f = fixture('FINANCE'), split = '2026-01-16T00:00:00.000Z';
    const copy = structuredClone(f.catalog.versions[0]); copy.sourceId = other; copy.versionId = other; copy.input!.source.namespace = 'second-bank'; copy.input!.records = [];
    f.catalog.sources.push({ ...f.catalog.sources[0], sourceId: other, namespace: 'second-bank' }); f.catalog.versions.push(copy);
    f.map.cells[0].window.toAt = split; f.map.cells.push({ ...f.map.cells[0], sourceId: other, window: { fromAt: split, toAt: businessJanuary.toAt } });
    const deposit = f.catalog.versions[0].input!.records.find(r => r.recordId === 'deposit')!; if (deposit.kind !== 'CASH') throw Error('Fixture'); deposit.postedAt = '2026-01-20T00:00:00.000Z';
    const got = run(f); expect(got.state).toBe('ready'); if (got.state === 'ready') expect(calculateFinance(got.scope, null).currencies[0].postedDeltaMinor).toBe('-6500');
  });
  it('does not invalidate published reads for an unrelated draft catalog change', () => {
    const f = fixture(); const map = validateBusinessMap(f.map, f.catalog); f.catalog.revision++;
    expect(selectBusinessScope(f.query, f.catalog, map, '2026-02-01T00:00:01.000Z').state).toBe('ready');
    f.catalog.evidenceRevision++; expect(selectBusinessScope(f.query, f.catalog, map, '2026-02-01T00:00:01.000Z')).toEqual({ state: 'unavailable', reason: 'STALE' });
  });
  it('never sums overlapping primary POS/accounting or corroborating-only data', () => {
    const f = fixture(); f.catalog.sources.push({ ...f.catalog.sources[0], sourceId: other, namespace: 'accounting' });
    f.map.cells.push({ ...f.map.cells[0], sourceId: other }); expect(() => validateBusinessMap(f.map, f.catalog)).toThrow(/OVERLAP/);
    f.map.cells[1].role = 'CORROBORATING'; expect(run(f).state).toBe('ready');
    f.map.cells[0].role = 'CORROBORATING'; expect(run(f)).toEqual({ state: 'unavailable', reason: 'INCOMPLETE_SCOPE' });
  });
  it('requires current active locations and keeps SOURCE selection a subtotal', () => {
    const f = fixture(); f.catalog.activeLocationIds.push('new-location'); expect(run(f)).toEqual({ state: 'unavailable', reason: 'INCOMPLETE_SCOPE' });
    f.query.selection = { kind: 'SOURCE', sourceId: fictionalBusinessId }; f.query.locationScope = { kind: 'SELECTED', locationIds: ['loc'] };
    const got = run(f); expect(got.state).toBe('ready'); if (got.state === 'ready') expect(got.scope).toMatchObject({ sourceSubtotal: true, completeScope: false });
    f.query.locationScope = { kind: 'SELECTED', locationIds: ['unknown'] }; expect(run(f).state).toBe('unavailable');
  });
  it('labels the Owner-declared account perimeter, does not infer omitted accounts or shared allocation', () => {
    const f = fixture('FINANCE'); const got = run(f); expect(got.state).toBe('ready');
    if (got.state === 'ready') { expect(got.scope.qualifiers).toContain('OWNER_DECLARED_ACCOUNT_PERIMETER'); expect(calculateFinance(got.scope, null).currencies[0].calculatedClosingMinor).toBe('143500'); }
    f.query.locationScope = { kind: 'SELECTED', locationIds: ['loc'] }; expect(run(f)).toEqual({ state: 'unavailable', reason: 'SHARED_ACCOUNT' });
    f.map.accounts[0].ownership = { kind: 'EXCLUSIVE_LOCATION', locationId: 'loc' }; expect(run(f).state).toBe('ready');
  });
  it('makes missing declared finance families unavailable rather than zero', () => {
    const f = fixture('FINANCE'); f.map.cells = f.map.cells.filter(c => c.metric !== 'RECEIVABLES'); expect(run(f)).toEqual({ state: 'unavailable', reason: 'INCOMPLETE_SCOPE' });
  });
  it('keeps currencies separate and rejects cross-currency ownership of one account', () => {
    const f = fixture('FINANCE'); f.catalog.sources.push({ ...f.catalog.sources[0], sourceId: other, currency: 'EUR' }); f.map.cells.push({ ...f.map.cells[0], sourceId: other, currency: 'EUR' });
    expect(() => validateBusinessMap(f.map, f.catalog)).toThrow(/CURRENCY/);
  });
  it('does not turn an old corrected/uploaded report into current evidence and expires at the exact boundary', () => {
    const f = fixture(); f.query.temporalUse = 'CURRENT';
    expect(run(f, '2026-02-01T23:59:59.999Z').state).toBe('ready');
    expect(run(f, '2026-02-02T00:00:00.000Z')).toEqual({ state: 'unavailable', reason: 'STALE' });
    f.catalog.versions[0].input!.sourceAsOf = '2026-11-16T00:00:00.000Z';
    expect(run(f, '2026-11-16T00:00:01.000Z')).toEqual({ state: 'unavailable', reason: 'STALE' });
    f.query.temporalUse = 'HISTORICAL'; expect(run(f, '2026-11-16T00:00:01.000Z').state).toBe('ready');
  });
  it('rejects equal-identity/revision conflicts and accepts unchanged boundary anchors', () => {
    const f = fixture('FINANCE'); const next = structuredClone(f.catalog.versions[0]); next.versionId = other; next.input!.window = { fromAt: businessJanuary.toAt, toAt: '2026-03-01T00:00:00.000Z' }; next.input!.sourceAsOf = next.input!.window.toAt;
    next.input!.records = structuredClone(f.catalog.versions[0].input!.records.filter(r => r.recordId === 'closing')); f.catalog.versions.push(next); f.map.cells.push(...f.map.cells.map(c => ({ ...c, window: next.input!.window })));
    f.query.window.toAt = next.input!.window.toAt; expect(run(f, '2026-03-01T00:00:01.000Z').state).toBe('ready');
    const close = next.input!.records[0]; if (close.kind !== 'BALANCE') throw Error('Fixture'); close.amountMinor = '143000';
    expect(run(f, '2026-03-01T00:00:01.000Z')).toEqual({ state: 'unavailable', reason: 'IDENTITY_CONFLICT' });
  });
  it('enforces all-location, map-cell, materialization and cancellation limits without a sample', () => {
    const f = fixture(); f.catalog.activeLocationIds = ['loc', ...Array.from({ length: 199 }, (_, i) => `loc${i}`)]; f.map.cells[0].locationIds = [...f.catalog.activeLocationIds]; expect(run(f).state).toBe('ready');
    f.catalog.activeLocationIds.push('loc200'); expect(run(f)).toEqual({ state: 'unavailable', reason: 'INPUT_LIMIT' });
    const tooMany = fixture(); tooMany.map.cells = Array.from({ length: 400 }, () => ({ ...tooMany.map.cells[0], role: 'CORROBORATING' })); expect(validateBusinessMap(tooMany.map, tooMany.catalog).input.cells).toHaveLength(400); tooMany.map.cells.push(tooMany.map.cells[0]); expect(() => validateBusinessMap(tooMany.map, tooMany.catalog)).toThrow(/INPUT_LIMIT/);
    const abort = new AbortController(); abort.abort(); const base = fixture(); expect(() => selectBusinessScope(base.query, base.catalog, validateBusinessMap(base.map, base.catalog), '2026-02-01T00:00:01.000Z', abort.signal)).toThrow();
  });
  it('rejects a complete materialization over two MiB instead of using a row sample', () => {
    const f = fixture(); const base = structuredClone(f.catalog.versions[0]); f.catalog.versions = [];
    for (let month = 1; month <= 10; month++) {
      const version = structuredClone(base); version.versionId = `${String(month).padStart(8, '0')}-0000-4000-8000-000000000001`;
      version.input!.window = { fromAt: `2026-${String(month).padStart(2, '0')}-01T00:00:00.000Z`, toAt: `2026-${String(month + 1).padStart(2, '0')}-01T00:00:00.000Z` }; version.input!.sourceAsOf = version.input!.window.toAt;
      const sale = version.input!.records[0]; if (sale.kind !== 'SALE') throw Error('Fixture');
      version.input!.records = Array.from({ length: 1000 }, (_, i) => ({ ...sale, recordId: `${month}-${i}`, at: version.input!.window.fromAt })); f.catalog.versions.push(version);
    }
    f.query.window.toAt = '2026-11-01T00:00:00.000Z'; f.map.cells[0].window.toAt = f.query.window.toAt;
    expect(run(f, '2026-11-01T00:00:01.000Z')).toEqual({ state: 'unavailable', reason: 'INPUT_LIMIT' });
  });
});

it.each(['FINANCE','SALES'] as const)('does not label an old requested subwindow CURRENT just because its containing %s import is recent',domain=>{
 const f=fixture(domain);f.query={...f.query,window:{fromAt:businessJanuary.fromAt,toAt:'2026-01-02T00:00:00.000Z'},temporalUse:'CURRENT'};
 if(domain==='FINANCE')f.catalog.versions[0].input!.records.push({kind:'BALANCE',recordId:'jan-2-anchor',revision:'1',accountRef:'operating',at:f.query.window.toAt,amountMinor:'100000'});
 const got=run(f);expect(got).toEqual({state:'unavailable',reason:'STALE'});
 f.query.temporalUse='HISTORICAL';const historical=run(f);expect(historical.state).toBe('ready');if(historical.state==='ready'&&domain==='FINANCE')expect(calculateFinance(historical.scope,null).currencies[0]).toMatchObject({reconciled:true,calculatedClosingMinor:'100000'});
 f.query={...f.query,window:{...businessJanuary},temporalUse:'CURRENT'};expect(run(f,'2026-02-01T23:59:59.999Z').state).toBe('ready');expect(run(f,'2026-02-02T00:00:00.000Z')).toEqual({state:'unavailable',reason:'STALE'});
});
it('cannot render a historical subwindow balance as a current cash metric',()=>{
 rs.useFakeTimers({toFake:['Date']});rs.setSystemTime(new Date('2026-02-01T00:00:01.000Z'));
 try{const f=fixture('FINANCE');f.query={...f.query,window:{fromAt:businessJanuary.fromAt,toAt:'2026-01-02T00:00:00.000Z'},temporalUse:'CURRENT'};f.catalog.versions[0].input!.records.push({kind:'BALANCE',recordId:'jan-2-anchor',revision:'1',accountRef:'operating',at:f.query.window.toAt,amountMinor:'100000'});
 const got=run(f),model:BusinessModelEvidence={...f.query,scenario:null,state:got.state,reason:got.state==='ready'?null:got.reason,domain:'FINANCE',completeScope:got.state==='ready'&&got.scope.completeScope,sourceSubtotal:false,observedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+15000).toISOString(),qualifiers:[],finance:got.state==='ready'?calculateFinance(got.scope,null):null,sales:null,citations:[],timeZone:'UTC',queryHash:'a'.repeat(64),sourceDigest:'b'.repeat(64)};
 expect(renderBusinessMetric('business_cash_balance',{queryHash:model.queryHash,sourceDigest:model.sourceDigest,currency:'USD',unit:'MINOR',scale:2},{call:{name:'business_finance',args:f.query},result:{businessEvidence:[model]}},'en')).toBeNull();
 }finally{rs.useRealTimers();}
});
