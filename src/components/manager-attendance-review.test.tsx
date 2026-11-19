import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, rs } from '@rstest/core';
import { OPEN_ENTRY_REVIEW_LIMIT_HOURS } from '@/lib/attendance/project';
import type { Observation } from '@/lib/attendance/types';
import { AttendanceReviewSurface } from './manager-attendance-review';

rs.mock('next/link', () => ({
  default: ({ href, children, ...props }: ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

function readyState() {
  return {
    review: {
      state: 'ready' as const,
      engineVersion: 1 as const,
      workspaceId: 'workspace-fuel',
      timeZone: 'America/Puerto_Rico',
      observedAt: '2030-10-07T16:00:00Z',
      validForMs: 30_000,
      scope: {
        kind: 'TODAY_AND_OPEN' as const,
        localDate: '2030-10-07',
        dayStartAt: '2030-10-07T04:00:00Z',
      },
      groups: [
        {
          entryId: 'entry-1',
          employeeId: 'employee-1',
          locationId: 'location-1',
          sourceVersion: 1,
          observations: [
            {
              id: 'signal-1',
              kind: 'CLOCK_IN_AFTER_SCHEDULE_START' as const,
              breakId: null,
              message: 'Clock-in recorded after scheduled start.',
              evidence: { differenceNanoseconds: '900000000000' },
            },
          ],
        },
      ],
      recordCount: 1,
      signalCount: 1,
      affectedEmployeeCount: 1,
      pendingCorrectionCount: 0,
      labels: {
        employees: [{ id: 'employee-1', name: 'Alex Morgan' }],
        locations: [{ id: 'location-1', name: 'Northside' }],
      },
      coverage: {
        state: 'complete' as const,
        limitations: [],
        deferredCapabilities: [
          'missing_clock_in' as const,
          'policy_lateness' as const,
          'policy_early_departure' as const,
          'unusually_long_entry' as const,
          'correction_review' as const,
          'overtime_risk' as const,
        ],
      },
    },
    refreshing: false,
    paused: false,
  };
}

it('renders verified attendance signals with manager-readable names and factual wording', () => {
  const html = renderToStaticMarkup(
    <AttendanceReviewSurface
      state={readyState()}
      onRefresh={() => {}}
    />,
  );
  expect(html).toContain('Alex Morgan');
  expect(html).toContain('Northside');
  expect(html).toContain('Clock-in after scheduled start');
  // Review 30 (D31): one quiet summary line, the kit's chip per flag. Final verification F (F26): the count to review is
  // the title's; the line says who is affected and the time corrections waiting, as the kit's facts line.
  const words = html.replace(/<[^>]+>/g, '');
  expect(words).toContain('1\u00a0person affected · 0\u00a0time corrections waiting');
  expect(html).toContain('<span class="b-sr">1 to review</span>');
  expect(html).toContain('<span class="b-chip b-chip--amber">Clock-in after scheduled start</span>');
  expect(html).toContain('15 min');
  expect(html).not.toContain('Late');
  expect(html).not.toContain('employee-1');
});

it('distinguishes a healthy empty snapshot from unavailable data', () => {
  const empty = readyState();
  empty.review.groups = [];
  empty.review.recordCount = 0;
  empty.review.signalCount = 0;
  empty.review.affectedEmployeeCount = 0;
  const emptyHtml = renderToStaticMarkup(
    <AttendanceReviewSurface
      state={empty}
      onRefresh={() => {}}
    />,
  );
  expect(emptyHtml).toContain('Nothing to review');

  const unavailableHtml = renderToStaticMarkup(
    <AttendanceReviewSurface
      state={{
        review: { state: 'unavailable', reason: 'read_failed' },
        refreshing: false,
        paused: false,
      }}
      onRefresh={() => {}}
    />,
  );
  expect(unavailableHtml).toContain('Attendance unavailable');
  expect(unavailableHtml).not.toContain('Nothing to review');
  // A failed read isn't busy, so the desktop layout keeps its footer and the Refresh button visible.
  expect(unavailableHtml).not.toContain('aria-busy');
  expect(unavailableHtml).toContain('aria-label="Refresh attendance review"');
});

it('shows access denial as a sign-in state and never retains people', () => {
  const html = renderToStaticMarkup(
    <AttendanceReviewSurface
      state={{
        review: { state: 'unavailable', reason: 'access_denied' },
        refreshing: false,
        paused: false,
      }}
      onRefresh={() => {}}
    />,
  );
  expect(html).toContain('Sign in again');
  expect(html).toContain('href="/login"');
  expect(html).not.toContain('Alex Morgan');
});

it('marks the summary busy only while loading, so desktop keeps Refresh after a failed read', () => {
  const render = (state: ComponentProps<typeof AttendanceReviewSurface>['state']) =>
    renderToStaticMarkup(<AttendanceReviewSurface state={state} onRefresh={() => {}} />);
  expect(render({ review: null, refreshing: false, paused: false })).toContain('aria-busy="true"');
  for (const state of [
    { review: { state: 'unavailable', reason: 'read_failed' }, refreshing: false, paused: false },
    { review: { state: 'unavailable', reason: 'access_denied' }, refreshing: false, paused: false },
    { review: null, refreshing: false, paused: true },
  ] as const) {
    expect(render(state)).not.toContain('aria-busy');
  }
});

it('labels a long open unscheduled entry as a critical missing clock-out with the time it has been open', () => {
  const state = readyState();
  const flag: Observation = {
    id: 'signal-open',
    kind: 'OPEN_PAST_LIMIT',
    breakId: null,
    message: 'No clock-out recorded · open more than 12 hours.',
    evidence: { differenceNanoseconds: '2160000000000' },
  };
  const review = { ...state.review, groups: [{ ...state.review.groups[0], observations: [flag] }] };
  const html = renderToStaticMarkup(
    <AttendanceReviewSurface state={{ ...state, review }} onRefresh={() => {}} />,
  );
  // The client label is plain copy; keep it in step with the engine's documented review threshold.
  expect(html).toContain(
    `<span class="b-chip b-chip--red">No clock-out after ${OPEN_ENTRY_REVIEW_LIMIT_HOURS} hours</span>`,
  );
  // Review 30 (D31): the figure is how long the punch has been open (the limit plus the 36 min past it), never the time past
  // the limit alone.
  expect(html.replace(/[\u00a0\u202f]/g, ' ')).toContain('Open 12 h 36 min');
  expect(html).toContain('1 to review');
  expect(html).not.toMatch(/\b(late|absent|unpaid|closed)\b/i);
});

it('says since when a long open punch has been open, with its day when it began before today', () => {
  const state = readyState();
  const flag: Observation = {
    id: 'signal-open-since',
    kind: 'OPEN_PAST_LIMIT',
    breakId: null,
    message: 'No clock-out recorded · open more than 12 hours.',
    // Clocked in at 10:40 PM the evening before (AST), so the limit passed at 10:40 AM and 1 h 20 min have gone since.
    evidence: { recordedAt: '2030-10-07T16:00:00Z', expectedAt: '2030-10-07T14:40:00Z', differenceNanoseconds: String(BigInt(80) * BigInt(60_000_000_000)) },
  };
  const review = { ...state.review, groups: [{ ...state.review.groups[0], observations: [flag] }] };
  const html = renderToStaticMarkup(<AttendanceReviewSurface state={{ ...state, review }} onRefresh={() => {}} />).replace(/[\u00a0\u202f]/g, ' ');
  expect(html).toContain('Open 13 h 20 min, since 10:40 PM yesterday');
  expect(html).not.toContain('>1 h 20 min<');
});
