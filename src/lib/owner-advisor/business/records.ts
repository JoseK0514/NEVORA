import type { AdmittedBusinessScope, BusinessCurrency, BusinessRecord } from './contracts';
import { checkpoint } from './parse';
export type AdmittedRow = { record: BusinessRecord; currency: BusinessCurrency; namespace: string; sourceAsOf: string; sourceId: string; versionId: string; timeZone: string };
const same = (a: BusinessRecord, b: BusinessRecord) => JSON.stringify(Object.keys(a).sort().map(k => [k, a[k as keyof typeof a]])) === JSON.stringify(Object.keys(b).sort().map(k => [k, b[k as keyof typeof b]]));
/** Latest observations replace identities, never sum successive snapshots. Revision
 * tokens are opaque: unequal tokens at equal observation time are a conflict. */
export function admittedRows(input: AdmittedBusinessScope, signal?: AbortSignal): { rows: AdmittedRow[]; excluded: number } {
  checkpoint(signal); const rows = new Map<string, AdmittedRow>(); const visited = new Map<string, boolean>();
  for (const entry of input.versions) for (const r of entry.version.input.records) {
    checkpoint(signal); const meta = entry.version.input;
    const metric = r.kind === 'BALANCE' || r.kind === 'CASH' ? 'CASH' : r.kind === 'OBLIGATION' ? 'OBLIGATIONS' : r.kind === 'RECEIVABLE' ? 'RECEIVABLES' : 'SALES';
    const identity = JSON.stringify([entry.version.versionId, r.recordId]);
    const at = 'at' in r ? r.at : 'occurredAt' in r ? r.state === 'POSTED' && r.postedAt ? r.postedAt : r.occurredAt : r.recordedAt;
    if (!entry.metrics.includes(metric) || ('accountRef' in r ? !entry.accountRefs.includes(r.accountRef) : !entry.locationIds.includes(r.locationId)) ||
      at < input.query.window.fromAt || at < entry.window.fromAt || (r.kind === 'BALANCE' ? at > input.query.window.toAt || at > entry.window.toAt : at >= input.query.window.toAt || at >= entry.window.toAt)) { if (!visited.has(identity)) visited.set(identity, false); continue; }
    visited.set(identity, true);
    const key = JSON.stringify([meta.source.namespace, meta.source.currency, r.recordId]); const previous = rows.get(key);
    if (previous) {
      if (previous.record.revision === r.revision && !same(previous.record, r)) throw Error('IDENTITY_CONFLICT');
      if (previous.sourceAsOf === meta.sourceAsOf && !same(previous.record, r)) throw Error('IDENTITY_CONFLICT');
      if (previous.sourceAsOf >= meta.sourceAsOf) continue;
    }
    rows.set(key, { record: r, currency: meta.source.currency, namespace: meta.source.namespace, sourceAsOf: meta.sourceAsOf, sourceId: entry.version.sourceId, versionId: entry.version.versionId, timeZone: entry.version.timeZone });
  }
  return { rows: [...rows.values()], excluded: [...visited.values()].filter(v => !v).length };
}
