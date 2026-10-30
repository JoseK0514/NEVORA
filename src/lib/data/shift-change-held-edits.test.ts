import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [{ id: 'legacy' }] }), queryRows: (value: unknown) => value }));
import { approveCalloutAndOpenCoverage, approveCoverageExchange, claimCoverage, createCallout, createCoverageOffer, fixture, verifyReadOnlyFences } from './shift-change-compat.test-support';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-10-07T12:00:00Z')); });
afterEach(() => { try { verifyReadOnlyFences(); } finally { vi.useRealTimers(); } });

// Publish changes (Jose, 2026-10-29): people must never consent to, or be
// approved into, terms they were not shown. A shift whose live row differs from
// its latest published row (here a held notes-only edit, which leaves the
// material terms fingerprint unchanged) is refused before any business write.
const hold = (r: ReturnType<typeof fixture>) => { r.state.shifts[0].notes = 'Held, not yet published'; };
it.each([
  ['callout submission', 'CALLOUT', 'PENDING', () => createCallout, { shiftId: 's1', employeeId: 'E', reasonCode: 'ILLNESS' }],
  ['callout approval', 'CALLOUT', 'PENDING', () => approveCalloutAndOpenCoverage, { calloutId: 'request-1', managerId: 'M' }],
  ['coverage offer', 'EXCHANGE', 'OPEN', () => createCoverageOffer, { sourceShiftId: 's1', requestedByEmployeeId: 'E' }],
  ['coverage claim', 'EXCHANGE', 'OPEN', () => claimCoverage, { exchangeId: 'request-1', employeeId: 'F' }],
  ['coverage approval', 'EXCHANGE', 'MANAGER_PENDING', () => approveCoverageExchange, { exchangeId: 'request-1', managerId: 'M' }],
] as const)('%s on a shift with held edits is refused without a business write', async (_name, kind, status, run, input) => {
  const control = fixture(kind, status);
  expect(await run()(input as never, control.executor)).toBeTruthy();
  expect(control.businessBatches).toHaveLength(1);
  const r = fixture(kind, status); hold(r);
  // Compatibility adapters report a refusal as false, or (offers) as a thrown refusal.
  const refused = await run()(input as never, r.executor).then(result => !result, (error: Error) => /Current reviewed command/.test(error.message));
  expect(refused).toBe(true);
  expect(r.businessBatches).toEqual([]);
});

// This SQL-assembly fixture models admission I/O only, as in callouts-notifications.test.ts.
vi.mock('@/lib/company-access/operational-scope.server', async original => ({
 ...await original<Record<string,unknown>>(),
 assertOperationalAccess: async () => ({
  scope:{mode:'COMPANY',locationIds:[]},authority:'b'.repeat(64),
  observedAt:'2030-10-07T12:00:00.000Z',validForMs:15000,
  workspace:{id:'northside',name:'Northside',active:true,timeZone:'America/New_York',createdAt:'2030-01-01 00:00:00+00',updatedAt:'2030-01-01 00:00:00.123456+00'},
 }),
}));
