import { beforeEach, expect, it, vi } from 'vitest';
import { managementProof } from '../../../test/fixtures/management';
import { CoverageRepairConflictError, type CoverageRepairLocator } from '../../../lib/scheduling/coverage-repair';
const m = vi.hoisted(() => ({ role: 'MANAGER', repair: vi.fn(), ordinary: vi.fn(), ensure: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => managementProof('M') }));
vi.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['MANAGER','OWNER'], requireRoles: async (roles: string[]) => { if (!roles.includes(m.role)) throw { destination: '/app' }; return { id: 'M' }; } }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw { destination }; } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/data/schedules', () => ({ createCoverageRepairShift: m.repair, insertShift: m.ordinary, ensureSchedule: m.ensure }));
import { createShiftAction } from './actions';
const locator: CoverageRepairLocator = { version: 1, weekStart: '2030-10-07', gapKey: 'loc-1|2030-10-07|08:00|12:00', locationId: 'loc-1', date: '2030-10-07', startTime: '08:00', endTime: '12:00', target: 'POSITION', positionId: 'barista', reported: { missingStaff: 2, requiresLead: true, positions: [{ positionId: 'barista', missing: 1 }] } };
function form() { const f = new FormData(); Object.entries({ coverageRepairReview: 'untrusted-retained-hint', actorEmployeeId: 'FORGED', weekStart: locator.weekStart, employeeId: 'E', locationId: locator.locationId, date: locator.date, startTime: locator.startTime, endTime: locator.endTime, positionId: 'barista', isDesignatedLead: 'on' }).forEach(([k,v]) => f.set(k,v)); return f; }
beforeEach(() => { vi.clearAllMocks(); m.role = 'MANAGER'; m.repair.mockResolvedValue({ id: 'saved', locator }); });

it('save invokes only the atomic repair writer with current server actor/proof and returns the exact gap', async () => {
  const outcome = await createShiftAction(form()).then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
  expect(outcome.error).toMatchObject({ destination: expect.stringContaining('/app/schedule/coverage?') });
  const url = new URL(outcome.error.destination, 'http://localhost');
  expect(url.pathname).toBe('/app/schedule/coverage'); expect(url.searchParams.get('saved')).toBe('1'); expect(url.searchParams.get('refresh')).toBe('1');
  expect(JSON.parse(url.searchParams.get('repair')!)).toEqual(locator);
  expect(m.repair).toHaveBeenCalledWith(expect.objectContaining({ actorEmployeeId: 'M', proof: managementProof('M'), positionId: 'barista', isDesignatedLead: true, startTime: '08:00', endTime: '12:00' }));
  expect(m.ensure).not.toHaveBeenCalled(); expect(m.ordinary).not.toHaveBeenCalled();
});

it('a stale save and repeated click preserve the original hint and require explicit refreshed review', async () => {
  m.repair.mockRejectedValue(new CoverageRepairConflictError());
  for (let i = 0; i < 2; i++) expect(await createShiftAction(form())).toEqual({ error: expect.stringContaining('refresh the review'), issueCode: 'COVERAGE_REVIEW_STALE' });
  expect(m.repair.mock.calls.every(([input]) => input.review === 'untrusted-retained-hint')).toBe(true);
  expect(m.ensure).not.toHaveBeenCalled(); expect(m.ordinary).not.toHaveBeenCalled();
});

it.each(['EMPLOYEE','LEAD'])('%s cannot reach the repair writer', async role => {
  m.role = role; await expect(createShiftAction(form())).rejects.toMatchObject({ destination: '/app' }); expect(m.repair).not.toHaveBeenCalled();
});

it('an infrastructure failure is never converted into a known successful save', async () => {
  m.repair.mockRejectedValue(new Error('owned fictional transport failure'));
  await expect(createShiftAction(form())).rejects.toThrow('owned fictional transport failure');
  expect(m.repair).toHaveBeenCalledTimes(1); expect(m.ensure).not.toHaveBeenCalled(); expect(m.ordinary).not.toHaveBeenCalled();
});
