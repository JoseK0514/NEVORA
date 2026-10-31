import { expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [] }), queryRows: (value: unknown) => value }));
import { getCallout, shownCalloutTerms, type CalloutRecord } from './callouts';
import { PUBLISH_CHANGES_FIRST, publishFirstHref } from '../shift-changes/publish-first';
import type { SqlExecutor } from '../notifications/types';

// Jose, 2026-10-31: the reporting employee never sees a held (unpublished)
// edit on their own report; Owner/Manager reads keep the live terms.
const row = {
  id: 'c1', release_applies: false, request_revision: 1, shift_id: 's1', employee_id: 'ana', employee_name: 'Ana Fictional', location_id: 'loc-1', location_name: 'Northside',
  week_start: '2030-10-07', date: '2030-10-08', start_time: '09:00:00', end_time: '17:00:00', reason_code: 'ILLNESS', reason_note: null, status: 'PENDING', created_at: '2030-10-07T12:00:00Z',
  display_held: true, live_date: '2030-10-08', live_start_time: '10:00:00', live_end_time: '17:00:00', live_location_id: 'loc-1', live_position_id: null, live_is_designated_lead: false,
  shown_position_id: null, shown_is_designated_lead: false,
};
const executor = (rows: unknown[]) => { const query = vi.fn(async () => rows); return { executor: { query, transaction: vi.fn() } as unknown as SqlExecutor, query }; };

it('the employee view reads the published version and pairs it with the live terms; the default read stays live', async () => {
  const own = executor([row]);
  const record = (await getCallout('c1', own.executor, { employeeView: true }))!;
  expect(record).toMatchObject({ date: '2030-10-08', startTime: '09:00', endTime: '17:00', locationId: 'loc-1' });
  expect(record.heldDisplay).toEqual({
    live: { date: '2030-10-08', startTime: '10:00', endTime: '17:00', locationId: 'loc-1', positionId: null, isDesignatedLead: false },
    shown: { date: '2030-10-08', startTime: '09:00', endTime: '17:00', locationId: 'loc-1', positionId: null, isDesignatedLead: false },
  });
  const employeeSql = ((own.query.mock.calls[0] as unknown[])[0] as { text: string }).text;
  expect(employeeSql).toContain('schedule_publication_revision_shifts');
  expect(employeeSql).toContain('rs.employee_id=c.employee_id');
  // Owner/Manager and notification reads: the live join, no overlay.
  const managed = executor([{ ...row, display_held: undefined }]);
  expect((await getCallout('c1', managed.executor))!.heldDisplay).toBeUndefined();
  expect(((managed.query.mock.calls[0] as unknown[])[0] as { text: string }).text).not.toContain('schedule_publication_revision_shifts');
  // Not held: nothing to pair.
  expect((await getCallout('c1', executor([{ ...row, display_held: false }]).executor, { employeeView: true }))!.heldDisplay).toBeUndefined();
});

const held: Pick<CalloutRecord, 'heldDisplay'> = { heldDisplay: {
  live: { date: '2030-10-08', startTime: '10:00', endTime: '17:00', locationId: 'loc-1', positionId: null, isDesignatedLead: false },
  shown: { date: '2030-10-08', startTime: '09:00', endTime: '17:00', locationId: 'loc-1', positionId: null, isDesignatedLead: false },
} };
it('history slots recorded from the held live terms are shown as published', () => {
  const recorded = { shiftId: 's1', date: '2030-10-08', startTime: '10:00', endTime: '17:00', locationId: 'loc-1', positionId: null, isDesignatedLead: false, termsRevision: 2 };
  expect(shownCalloutTerms(held, recorded)).toEqual({ ...recorded, startTime: '09:00' });
  // Legacy snake_case snapshots are matched and shown the same way.
  expect(shownCalloutTerms(held, { date: '2030-10-08', start_time: '10:00:00', end_time: '17:00:00', location_id: 'loc-1' }))
    .toMatchObject({ date: '2030-10-08', startTime: '09:00', endTime: '17:00', locationId: 'loc-1' });
  expect(shownCalloutTerms(held, { date: '2030-10-08', start_time: '10:00:00', end_time: '17:00:00', location_id: 'loc-1' })).not.toHaveProperty('start_time');
  // Terms recorded under an earlier published version stay as recorded.
  const earlier = { ...recorded, startTime: '08:00' };
  expect(shownCalloutTerms(held, earlier)).toBe(earlier);
  // A different position or Lead than the live row is not the held edit.
  const otherLead = { ...recorded, isDesignatedLead: true };
  expect(shownCalloutTerms(held, otherLead)).toBe(otherLead);
  // Not held, or nothing recorded: unchanged.
  expect(shownCalloutTerms({}, recorded)).toBe(recorded);
  expect(shownCalloutTerms(held, null)).toBeNull();
});

it('the Owner notice links to that week’s Publish changes only for the publish-first refusal', () => {
  expect(publishFirstHref(PUBLISH_CHANGES_FIRST, '2030-10-07')).toBe('/app/schedule/publish?week=2030-10-07#publish-changes');
  expect(publishFirstHref('This shift changed. Reload to see the latest.', '2030-10-07')).toBeNull();
  expect(publishFirstHref(undefined, '2030-10-07')).toBeNull();
  expect(publishFirstHref(PUBLISH_CHANGES_FIRST, 'not-a-week')).toBeNull();
});
