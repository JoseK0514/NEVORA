import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { AttendanceReviewSurface } from './manager-attendance-review';

vi.mock('./quiet/u1.css', () => ({}));
vi.mock('next/link', () => ({
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
  expect(html).toContain('<b>Alex Morgan</b>');
  expect(html).toContain('Northside');
  expect(html).toContain('Clocked in 15 min after the shift began');
  expect(html).toContain('>To review</h2>');
  expect(html).toContain('href="/app/timecards#timecard-employee-1"');
  expect(html).toContain('id="attendance-entry-1"');
  // Quiet (T-1): no counters line.
  expect(html).not.toContain('to review<');
  expect(html).not.toContain('Late');
  expect(html).not.toContain('>employee-1<');
});

it('distinguishes a healthy empty snapshot (nothing shown) from unavailable data', () => {
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
  expect(emptyHtml).toBe('');

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
  expect(unavailableHtml).toContain('Clock-in checks aren’t available right now.');
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

it('says a limited comparison once, even with nothing to list', () => {
  const limited = readyState();
  limited.review.groups = [];
  (limited.review.coverage as { state: string }).state = 'limited';
  const html = renderToStaticMarkup(<AttendanceReviewSurface state={limited} onRefresh={() => {}} />);
  expect(html).toContain('Some clock-ins couldn’t be fully checked');
  expect(html).not.toContain('Alex Morgan');
});

it('marks the section busy only while loading', () => {
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
