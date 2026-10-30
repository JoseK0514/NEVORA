import { expect, it } from 'vitest';
import { buildSchedulePendingChanges } from './pending-changes';

const base = { sourceShiftId: 's1', scheduleId: 'a', locationId: 'loc-1', employeeId: 'E', date: '2030-10-11', startTime: '09:00', endTime: '17:00', isDesignatedLead: false, isCalloutApproved: false };
const input = {
  weekStart: '2030-10-07', neverCaptured: false, latestRevision: { id: 'r1', revisionNumber: 1, createdAt: '2030-10-06T12:00:00.000Z' },
  locationIds: null, canPublish: true,
  employeeNames: new Map([['E', 'Ana Fictional'], ['F', 'Ben Fictional']]), locationNames: new Map([['loc-1', 'Northside'], ['loc-2', 'Harbor']]),
  positionNames: new Map([['barista', 'Barista']]),
  history: [
    { shiftId: 's1', actorId: 'M', actorName: 'Mia Manager', createdAt: '2030-10-07 10:00:00+00' },
    { shiftId: 's1', actorId: 'O', actorName: 'Omar Owner', createdAt: '2030-10-07 11:00:00+00' },
  ],
  changes: [
    { sourceShiftId: 's3', before: { ...base, sourceShiftId: 's3', locationId: 'loc-2', date: '2030-10-09', positionId: 'barista', positionName: 'Captured Barista' }, after: null },
    { sourceShiftId: 's1', before: { ...base }, after: { ...base, employeeId: 'F', startTime: '10:00' } },
    { sourceShiftId: 's2', before: { ...base, sourceShiftId: 's2', date: '2030-10-12' }, after: { ...base, sourceShiftId: 's2', date: '2030-10-12', notes: 'Bring keys' } },
    { sourceShiftId: 's4', before: null, after: { ...base, sourceShiftId: 's4', date: '2030-10-08', positionId: 'barista' } },
  ],
};

it('lists each pending assignment with person, day, what changed and its held-edit history', () => {
  const data = buildSchedulePendingChanges(input);
  expect(data).toMatchObject({ hasPendingChanges: true, pendingCount: 4, truncated: false, canPublish: true,
    locations: [{ locationId: 'loc-2', locationName: 'Harbor', pendingCount: 1 }, { locationId: 'loc-1', locationName: 'Northside', pendingCount: 3 }] });
  expect(data.changes.map(c => [c.shiftId, c.kind, c.employeeName, c.date, c.fields])).toEqual([
    ['s4', 'ADDED', 'Ana Fictional', '2030-10-08', ['ADDED']],
    ['s3', 'REMOVED', 'Ana Fictional', '2030-10-09', ['REMOVED']],
    ['s1', 'CHANGED', 'Ben Fictional', '2030-10-11', ['EMPLOYEE', 'TIME']],
    ['s2', 'CHANGED', 'Ana Fictional', '2030-10-12', ['NOTES']],
  ]);
  const s1 = data.changes.find(c => c.shiftId === 's1')!;
  expect(s1).toMatchObject({ editCount: 2, lastEditedAt: '2030-10-07 11:00:00+00', lastEditedBy: { id: 'O', name: 'Omar Owner' },
    before: { employeeName: 'Ana Fictional', startTime: '09:00' }, after: { employeeName: 'Ben Fictional', startTime: '10:00' } });
  expect(data.changes.find(c => c.shiftId === 's3')!.before!.positionName).toBe('Captured Barista');
  expect(data.changes.find(c => c.shiftId === 's4')!.after!.positionName).toBe('Barista');
});

it('a location-scoped reader sees only its locations and cannot publish', () => {
  const data = buildSchedulePendingChanges({ ...input, locationIds: ['loc-2'], canPublish: false });
  expect(data).toMatchObject({ pendingCount: 1, canPublish: false, locations: [{ locationId: 'loc-2', pendingCount: 1 }] });
  expect(data.changes.map(c => c.shiftId)).toEqual(['s3']);
});

it('caps the list but keeps the full count, and reports an empty week as nothing pending', () => {
  expect(buildSchedulePendingChanges({ ...input, limit: 2 })).toMatchObject({ pendingCount: 4, truncated: true, changes: [{ shiftId: 's4' }, { shiftId: 's3' }] });
  expect(buildSchedulePendingChanges({ ...input, changes: [] })).toMatchObject({ hasPendingChanges: false, pendingCount: 0, locations: [], changes: [] });
  expect(buildSchedulePendingChanges({ ...input, changes: [], neverCaptured: true, latestRevision: null }).hasPendingChanges).toBe(true);
});
