import type { AdmittedBusinessScope, AdmittedBusinessVersion, BusinessCatalog, BusinessCoverageMap, BusinessMetricFamily, BusinessQuery, BusinessScopeAdmission, BusinessUnavailable, BusinessVersionView, BusinessWindow, ValidatedBusinessMap } from './contracts';
import { checkpoint, instant, parseBusinessMap } from './parse';
import { admittedRows } from './records';
const overlap = (a: BusinessWindow, b: BusinessWindow) => a.fromAt < b.toAt && b.fromAt < a.toAt;
const clip = (a: BusinessWindow, b: BusinessWindow): BusinessWindow | null => overlap(a, b) ? { fromAt: a.fromAt > b.fromAt ? a.fromAt : b.fromAt, toAt: a.toAt < b.toAt ? a.toAt : b.toAt } : null;
export function validateBusinessMap(map: BusinessCoverageMap, catalog: BusinessCatalog): ValidatedBusinessMap {
  const input = parseBusinessMap(map), locations = new Set(catalog.activeLocationIds), accountCurrencies = new Map<string, string>();
  for (const account of input.accounts) if (account.ownership.kind === 'EXCLUSIVE_LOCATION' && !locations.has(account.ownership.locationId)) throw Error('INCOMPLETE_SCOPE');
  for (const [i, cell] of input.cells.entries()) {
    const source = catalog.sources.find(s => s.sourceId === cell.sourceId && s.active && !s.deleted);
    if (!source || source.domain !== cell.domain || source.currency !== cell.currency) throw Error('MISSING_SOURCE');
    if (cell.locationIds.some(id => !locations.has(id)) || cell.accountRefs.some(ref => !input.accounts.some(a => a.accountRef === ref))) throw Error('INCOMPLETE_SCOPE');
    for (const account of cell.accountRefs) { if (accountCurrencies.has(account) && accountCurrencies.get(account) !== cell.currency) throw Error('ACCOUNT_CURRENCY_CONFLICT'); accountCurrencies.set(account, cell.currency); }
    if (cell.role !== 'PRIMARY') continue;
    for (const previous of input.cells.slice(0, i)) if (previous.role === 'PRIMARY' && previous.domain === cell.domain && previous.metric === cell.metric && previous.currency === cell.currency && overlap(previous.window, cell.window) &&
      (cell.domain === 'SALES' ? previous.locationIds.some(l => cell.locationIds.includes(l)) : previous.accountRefs.some(a => cell.accountRefs.includes(a)))) throw Error('OVERLAP');
  }
  return { input, catalogRevision: catalog.evidenceRevision };
}
function coverage(windows: BusinessWindow[], target: BusinessWindow): boolean {
  let cursor = target.fromAt;
  for (const w of windows.map(w => clip(w, target)).filter((w): w is BusinessWindow => w !== null).sort((a, b) => a.fromAt.localeCompare(b.fromAt))) {
    if (w.fromAt !== cursor) return false; cursor = w.toAt;
  }
  return cursor === target.toAt;
}
export function selectBusinessScope(query: BusinessQuery, catalog: BusinessCatalog, map: ValidatedBusinessMap, observedAt: string, signal?: AbortSignal): BusinessScopeAdmission {
  checkpoint(signal); instant(observedAt);
  const unavailable = (reason: BusinessUnavailable): BusinessScopeAdmission => ({ state: 'unavailable', reason });
  const domain = 'scenario' in query ? 'FINANCE' : 'SALES';
  if (catalog.evidenceRevision !== map.catalogRevision) return unavailable('STALE');
  if (query.window.toAt > observedAt) return unavailable('INCOMPLETE_SCOPE');
  if (domain === 'SALES' && query.locationScope.kind === 'ALL' && catalog.activeLocationIds.length > 200) return unavailable('INPUT_LIMIT');
  const locationIds = query.locationScope.kind === 'ALL' ? [...catalog.activeLocationIds].sort() : [...query.locationScope.locationIds];
  if ((domain === 'SALES' || query.locationScope.kind === 'SELECTED') && !locationIds.length || locationIds.some(l => !catalog.activeLocationIds.includes(l))) return unavailable('INCOMPLETE_SCOPE');
  const sourceSelection = query.selection.kind === 'SOURCE' ? query.selection.sourceId : null;
  const sources = catalog.sources.filter(s => s.active && !s.deleted && s.domain === domain && (!sourceSelection || s.sourceId === sourceSelection));
  if (!sources.length) return unavailable('MISSING_SOURCE');
  const active = catalog.versions.filter((v): v is BusinessVersionView & { input: NonNullable<BusinessVersionView['input']> } => v.current && v.status === 'PUBLISHED' && v.input !== null && sources.some(s => s.sourceId === v.sourceId) && overlap(v.input.window, query.window));
  if (active.some(v => v.timeZone !== catalog.timeZone)) return unavailable('STALE');
  if (active.some(v => v.input.completeness !== 'COMPLETE' || v.input.sourceAsOf > observedAt)) return unavailable('INCOMPLETE_SCOPE');
  for (const [i, version] of active.entries()) for (const previous of active.slice(0, i)) if (version.sourceId === previous.sourceId && overlap(version.input.window, previous.input.window)) return unavailable('OVERLAP');
  const shared = domain === 'FINANCE' && query.locationScope.kind === 'SELECTED' && map.input.accounts.some(a => a.ownership.kind === 'COMPANY_SHARED');
  const accounts = query.locationScope.kind === 'ALL' ? map.input.accounts : map.input.accounts.filter(a => a.ownership.kind === 'EXCLUSIVE_LOCATION' && locationIds.includes(a.ownership.locationId));
  const entries: AdmittedBusinessVersion[] = [];
  if (sourceSelection) {
    if (!coverage(active.map(v => v.input.window), query.window)) return unavailable('INCOMPLETE_SCOPE');
    for (const version of active) {
      const refs = [...new Set(version.input.records.flatMap(r => 'accountRef' in r ? [r.accountRef] : []))];
      if (domain === 'FINANCE' && query.locationScope.kind === 'SELECTED' && refs.some(ref => !accounts.some(a => a.accountRef === ref))) return unavailable('SHARED_ACCOUNT');
      entries.push({ version, window: clip(version.input.window, query.window)!, accountRefs: refs, locationIds, metrics: domain === 'SALES' ? ['SALES'] : ['CASH', 'OBLIGATIONS', 'RECEIVABLES'] });
    }
  } else {
    if (domain === 'FINANCE' && !accounts.length) return unavailable(shared ? 'SHARED_ACCOUNT' : 'INCOMPLETE_SCOPE');
    const cells = map.input.cells.filter(c => c.role === 'PRIMARY' && c.domain === domain && overlap(c.window, query.window));
    const units = domain === 'SALES' ? locationIds : accounts.map(a => a.accountRef);
    const metrics: BusinessMetricFamily[] = domain === 'SALES' ? ['SALES'] : ['CASH', 'OBLIGATIONS', 'RECEIVABLES'];
    for (const unit of units) for (const metric of metrics) {
      checkpoint(signal);
      const relevant = cells.filter(c => c.metric === metric && (domain === 'SALES' ? c.locationIds : c.accountRefs).includes(unit));
      if (!relevant.length) return unavailable('INCOMPLETE_SCOPE');
      for (const currency of new Set(relevant.map(c => c.currency))) {
        const inCurrency = relevant.filter(c => c.currency === currency);
        if (!coverage(inCurrency.map(c => c.window), query.window)) return unavailable('INCOMPLETE_SCOPE');
        for (const cell of inCurrency) {
          const target = clip(cell.window, query.window)!;
          const versions = active.filter(v => v.sourceId === cell.sourceId && overlap(v.input.window, target));
          if (!coverage(versions.map(v => v.input.window), target)) return unavailable('INCOMPLETE_SCOPE');
          for (const version of versions) entries.push({ version, window: clip(version.input.window, target)!, accountRefs: domain === 'FINANCE' ? [unit] : [], locationIds: domain === 'SALES' ? [unit] : [], metrics: [metric] });
        }
      }
    }
  }
  const unique = [...new Map(entries.map(e => [e.version.versionId, e.version])).values()];
  if (unique.length > 200 || unique.reduce((n, v) => n + v.input.records.length, 0) > 100000 || unique.reduce((n, v) => n + new TextEncoder().encode(JSON.stringify(v.input)).byteLength, 0) > 2 * 1024 * 1024) return unavailable('INPUT_LIMIT');
  let expires = Date.parse(observedAt) + 15000;
  if (query.temporalUse === 'CURRENT') for (const v of unique) {
    const boundary = Math.min(Date.parse(v.input.sourceAsOf), Date.parse(v.input.window.toAt), Date.parse(query.window.toAt)) + v.input.source.maxAgeMinutes * 60000;
    if (boundary <= Date.parse(observedAt)) return unavailable('STALE'); expires = Math.min(expires, boundary);
  }
  const scope: AdmittedBusinessScope = { domain, timeZone: catalog.timeZone, query, versions: compact(entries), accounts, locationIds,
    completeScope: !sourceSelection && !shared, sourceSubtotal: !!sourceSelection || shared, ...(shared ? { incompleteReason: 'SHARED_ACCOUNT' as const } : {}), observedAt,
    expiresAt: new Date(expires).toISOString(), qualifiers: ['OWNER_REPORTED_COMPLETENESS', 'NO_FX_OR_PROFIT_INFERENCE', ...(domain === 'FINANCE' ? [sourceSelection ? 'SOURCE_RECORDS_ONLY' : 'OWNER_DECLARED_ACCOUNT_PERIMETER'] : ['CURRENT_ACTIVE_LOCATION_PERIMETER']), ...(sourceSelection ? ['SOURCE_SUBTOTAL'] : []), ...(shared ? ['EXCLUSIVE_ACCOUNT_SUBTOTAL_ONLY', 'COMPLETE_LOCATION_CASH_UNAVAILABLE_SHARED_ACCOUNT'] : []), ...(query.temporalUse === 'HISTORICAL' ? ['HISTORICAL_AS_OF_RECORDS'] : ['CURRENT_WITHIN_PUBLISHED_FRESHNESS_POLICY'])] };
  try { admittedRows(scope, signal); } catch (error) { checkpoint(signal); if (error instanceof Error && error.message === 'IDENTITY_CONFLICT') return unavailable('IDENTITY_CONFLICT'); throw error; }
  return { state: 'ready', scope };
}
/** Merge only identical metric/account scope; never cross-product different map cells. */
function compact(entries: AdmittedBusinessVersion[]): AdmittedBusinessVersion[] {
  const result = new Map<string, AdmittedBusinessVersion>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.version.versionId, entry.window, entry.metrics, entry.accountRefs]); const old = result.get(key);
    if (old) old.locationIds = [...new Set([...old.locationIds, ...entry.locationIds])].sort(); else result.set(key, { ...entry, locationIds: [...entry.locationIds] });
  }
  return [...result.values()];
}
