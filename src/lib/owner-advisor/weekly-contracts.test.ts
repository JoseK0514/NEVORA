import { describe, expect, it } from '@rstest/core';
import { parseWeeklyCommand, parseWeeklyScope, parseWeeklyToolArgs } from './weekly-contracts';

const requestId = 'c74f4629-9643-4a81-9247-8fb757c7c38f';
const reviewId = 'd0937f83-b064-4f30-819d-01f91e8ad8ee';
const readReceiptId = '4d5219ac-d664-42a7-bad2-92626240707e';
const termsDigest = 'a'.repeat(64);
const compare = { op: 'compare_week', requestId, weekStart: '2026-11-16', mode: 'FILL_GAPS_ONLY', locationScope: { kind: 'ALL' } };
const apply = { op: 'apply_week_plan', requestId, reviewId, termsDigest, readReceiptId, acknowledged: true };

describe('weekly Owner commands', () => {
  it('admits a joint Monday scope and canonicalizes only location ordering and UUID case', () => {
    expect(parseWeeklyCommand({ ...compare, requestId: requestId.toUpperCase(), mode: 'BUILD_WEEK', locationScope: { kind: 'SELECTED', locationIds: ['site-b', 'site-a'] } }))
      .toEqual({ ...compare, mode: 'BUILD_WEEK', locationScope: { kind: 'SELECTED', locationIds: ['site-a', 'site-b'] } });
  });
  it.each(['2026-11-17', '2026-02-30', '2026-11-16T00:00:00Z', '2026-1-05', 'not-a-date'])('rejects noncanonical week %s', weekStart => {
    expect(() => parseWeeklyCommand({ ...compare, weekStart })).toThrow();
  });
  it.each([
    { ...compare, requestId: 'c74f4629-9643-1a81-9247-8fb757c7c38f' },
    { ...compare, mode: 'PUBLISH' }, { ...compare, assignments: [] },
    { ...compare, acknowledged: true }, { ...compare, locationScope: { kind: 'ALL', locationIds: [] } },
  ])('rejects forged/unsupported comparison fields %#', command => {
    expect(() => parseWeeklyCommand(command)).toThrow();
  });
  it('requires the complete-read receipt, exact digest and explicit acknowledgement', () => {
    expect(parseWeeklyCommand(apply)).toEqual(apply);
    const { readReceiptId: _read, ...unread } = apply;
    const { termsDigest: _digest, ...unbound } = apply;
    for (const bad of [unread, unbound, { ...apply, acknowledged: false }, { ...apply, termsDigest: 'a'.repeat(63) }, { ...apply, assignments: [] }, { ...apply, subset: ['worker-1'] }])
      expect(() => parseWeeklyCommand(bad)).toThrow();
  });
  it.each(['read_week_plan', 'decline_week_plan', 'check_week_plan'])('admits only the reference for %s', op => {
    expect(parseWeeklyCommand({ op, requestId, reviewId })).toEqual({ op, requestId, reviewId });
    expect(() => parseWeeklyCommand({ op, requestId, reviewId, acknowledged: true })).toThrow();
    expect(() => parseWeeklyCommand({ op, requestId, reviewId: '../another-owner' })).toThrow();
  });
});

describe('weekly scope and read-only model args', () => {
  it('rejects empty, duplicate, control-containing, oversized and unknown scopes', () => {
    for (const scope of [null, { kind: 'SELECTED', locationIds: [] }, { kind: 'SELECTED', locationIds: ['a', 'a'] },
      { kind: 'SELECTED', locationIds: ['line\nbreak'] }, { kind: 'SELECTED', locationIds: [' x'] },
      { kind: 'SELECTED', locationIds: ['x'.repeat(129)] },
      { kind: 'SELECTED', locationIds: Array.from({ length: 21 }, (_, i) => `site-${i}`) }, { kind: 'OTHER' }])
      expect(() => parseWeeklyScope(scope)).toThrow();
  });
  it('gives the model a weekly comparison without rebuild, apply or arbitrary terms', () => {
    const args = { weekStart: '2026-11-16', locationScope: { kind: 'ALL' } };
    expect(parseWeeklyToolArgs(args)).toEqual(args);
    for (const extra of [{ mode: 'BUILD_WEEK' }, { op: 'apply_week_plan' }, { readReceiptId }, { assignments: [] }])
      expect(() => parseWeeklyToolArgs({ ...args, ...extra })).toThrow();
  });
});
