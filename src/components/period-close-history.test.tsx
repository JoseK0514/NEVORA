import { expect, it } from '@rstest/core';
import { appendPeriodHistory, type LoadedPeriodHistory } from './period-close-history';
import { shiftDraftText } from './shift-review-recovery';

const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
function page(offset: number, total: number) {
  const events = Array.from({ length: Math.min(50, total - offset) }, (_, i) => ({ id: String(offset + i), manifestId: 'manifest', kind: 'ARTIFACT_SERVED', actorId: 'fictional', createdAt: '2026-09-28', payload: { filename: 'fixture.csv' } }));
  const hasMore = offset + events.length < total;
  return { period, events, nextCursor: hasMore ? `opaque-${offset + 50}` : null, coverage: { kind: 'PAGE' as const, order: 'createdAt DESC, id DESC' as const, totalEvents: total, returnedEvents: events.length, hasMore, complete: offset === 0 && !hasMore, through: total ? { at: '2026-09-28', id: '0' } : null } };
}

it.each([0, 1000, 1001, 3507])('loads every event across explicit pages for a %i-event period', total => {
  let history: LoadedPeriodHistory | null = null;
  for (let offset = 0; offset === 0 || offset < total; offset += 50) history = appendPeriodHistory(history, page(offset, total));
  expect(history?.events).toHaveLength(total);
  expect(history?.nextCursor).toBeNull();
});
it('rejects repeated pages, missing final rows and changed snapshot watermarks', () => {
  const first = appendPeriodHistory(null, page(0, 101));
  expect(() => appendPeriodHistory(first, page(0, 101))).toThrow();
  expect(() => appendPeriodHistory(first, page(100, 101))).toThrow();
  const changed = page(50, 101); changed.coverage.totalEvents++;
  expect(() => appendPeriodHistory(first, changed)).toThrow();
});
it('copies only recoverable submitted shift fields, without hidden proof or request metadata', () => {
  const data = new FormData(); data.set('notes', 'Retained <draft>'); data.set('expectedReviewVersion', 'private-token'); data.set('csrf', 'secret');
  expect(shiftDraftText(data)).toContain('Notes: Retained <draft>');
  expect(shiftDraftText(data)).not.toMatch(/private-token|secret|csrf/);
});
it.each([0, 1, 1000, 1001, 3456])('accumulates every one of %s events without confusing a last page with whole-history coverage', total => {
  let history: LoadedPeriodHistory | null = null;
  for (let offset = 0; offset === 0 || offset < total; offset += 50) history = appendPeriodHistory(history, page(offset, total));
  expect(history?.events).toHaveLength(total);
  expect(history?.nextCursor).toBeNull();
  expect(history?.coverage.complete).toBe(total <= 50);
});
it('rejects duplicate, missing, different-watermark and inconsistent-total pages instead of silently truncating', () => {
  const first = appendPeriodHistory(null, page(0, 101));
  const duplicate = page(50, 101); duplicate.events[0].id = first.events[0].id;
  expect(() => appendPeriodHistory(first, duplicate)).toThrow();
  expect(() => appendPeriodHistory(first, page(100, 101))).toThrow();
  const shifted = page(50, 101); shifted.coverage.through!.id = 'new-watermark';
  expect(() => appendPeriodHistory(first, shifted)).toThrow();
  expect(() => appendPeriodHistory(first, page(50, 102))).toThrow();
});
it('recovery copies only editable shift values, keeping tokens and other hidden fields out', () => {
  const data = new FormData(); data.set('notes', 'Retained unsaved note'); data.set('expectedReviewVersion', 'secret-token'); data.set('unrelated', 'private-other-field');
  const text = shiftDraftText(data);
  expect(text).toContain('Notes: Retained unsaved note');
  expect(text).not.toContain('secret-token'); expect(text).not.toContain('private-other-field');
});
