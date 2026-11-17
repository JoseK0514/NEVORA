import type { AdmittedBusinessScope, BusinessRecord, BusinessVersionInput } from '@/lib/owner-advisor/business/contracts';
export const businessJanuary = { fromAt: '2026-01-01T00:00:00.000Z', toAt: '2026-02-01T00:00:00.000Z' };
export const fictionalBusinessId = '10000000-0000-4000-8000-000000000001';
export function fictionalBusinessInput(domain: 'FINANCE' | 'SALES' = 'FINANCE'): BusinessVersionInput {
  const finance: BusinessRecord[] = [
    { kind: 'BALANCE', recordId: 'opening', revision: '1', accountRef: 'operating', at: businessJanuary.fromAt, amountMinor: '100000' },
    { kind: 'BALANCE', recordId: 'closing', revision: '1', accountRef: 'operating', at: businessJanuary.toAt, amountMinor: '143500' },
    ...[['deposit', '50000', 'POSTED'], ['fee', '-1500', 'POSTED'], ['refund', '-5000', 'POSTED'], ['pending', '7000', 'PENDING'], ['void', '10000', 'REVERSED']].map(([recordId, deltaMinor, state]) => ({ kind: 'CASH' as const, recordId, revision: '1', accountRef: 'operating', occurredAt: '2026-01-15T12:00:00.000Z', postedAt: '2026-01-15T12:00:00.000Z', deltaMinor, state: state as 'POSTED' | 'PENDING' | 'REVERSED', reconciliationRef: null })),
    { kind: 'OBLIGATION', recordId: 'rent', revision: '1', accountRef: 'operating', recordedAt: businessJanuary.fromAt, dueDate: '2026-02-05', amountMinor: '20000', state: 'OPEN', confirmation: 'SOURCE_CONFIRMED' },
    { kind: 'RECEIVABLE', recordId: 'invoice', revision: '1', accountRef: 'operating', recordedAt: businessJanuary.fromAt, dueDate: '2026-02-05', amountMinor: '10000', state: 'OPEN', confirmation: 'OWNER_REPORTED' },
  ];
  const sales: BusinessRecord[] = [
    { kind: 'SALE', recordId: 'sale', revision: '1', orderRef: 'order', locationId: 'loc', at: '2026-01-15T12:00:00.000Z', merchandiseMinor: '10000', discountMinor: '1000', taxMinor: '900', collectedMinor: '9900' },
    { kind: 'REFUND', recordId: 'refund', revision: '1', orderRef: 'order', locationId: 'loc', at: '2026-01-16T12:00:00.000Z', merchandiseMinor: '2000', discountMinor: '200', taxMinor: '180', collectedMinor: '1980' },
    { kind: 'FEE', recordId: 'fee', revision: '1', orderRef: 'order', locationId: 'loc', at: '2026-01-16T12:00:00.000Z', feeMinor: '300' },
    { kind: 'CANCELLATION', recordId: 'cancel', revision: '1', orderRef: 'unpaid', locationId: 'loc', at: '2026-01-16T12:00:00.000Z' },
  ];
  return { source: { sourceId: null, expectedRevision: 0, name: `Fictional ${domain}`, domain, namespace: `fixture-${domain}`, currency: 'USD', scale: 2, maxAgeMinutes: 1440 }, window: { ...businessJanuary }, sourceAsOf: businessJanuary.toAt, completeness: 'COMPLETE', records: domain === 'FINANCE' ? finance : sales };
}
export function fictionalBusinessScope(domain: 'FINANCE' | 'SALES' = 'FINANCE'): AdmittedBusinessScope {
  const input = fictionalBusinessInput(domain);
  return { domain, timeZone: 'UTC', query: { window: { ...businessJanuary }, selection: { kind: 'PRIMARY_PERIMETER' }, locationScope: { kind: 'ALL' }, temporalUse: 'HISTORICAL' }, versions: [{ version: { timeZone: 'UTC', sourceId: fictionalBusinessId, versionId: fictionalBusinessId, digest: 'a'.repeat(64), status: 'PUBLISHED', current: true, input, publishedAt: businessJanuary.toAt }, window: { ...businessJanuary }, accountRefs: domain === 'FINANCE' ? ['operating'] : [], locationIds: domain === 'SALES' ? ['loc'] : [], metrics: domain === 'FINANCE' ? ['CASH', 'OBLIGATIONS', 'RECEIVABLES'] : ['SALES'] }], accounts: [{ accountRef: 'operating', ownership: { kind: 'COMPANY_SHARED' } }], locationIds: ['loc'], completeScope: true, sourceSubtotal: false, observedAt: '2026-02-01T00:00:01.000Z', expiresAt: '2026-02-01T00:00:16.000Z', qualifiers: ['OWNER_REPORTED_COMPLETENESS', 'OWNER_DECLARED_ACCOUNT_PERIMETER'] };
}
