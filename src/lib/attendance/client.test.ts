import { describe, expect, it, vi } from 'vitest';
import {
  createAttendanceReviewController,
  parseAttendanceReview,
  type AttendancePanelState,
} from './client';

function ready() {
  return {
    state: 'ready',
    engineVersion: 1,
    workspaceId: 'workspace-fuel',
    timeZone: 'America/Puerto_Rico',
    observedAt: '2030-10-07T16:00:00Z',
    validForMs: 30_000,
    scope: {
      kind: 'TODAY_AND_OPEN',
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
            kind: 'CLOCK_IN_AFTER_SCHEDULE_START',
            breakId: null,
            message: 'Clock-in recorded after scheduled start.',
            evidence: {
              recordedAt: '2030-10-07T12:15:00Z',
              expectedAt: '2030-10-07T12:00:00Z',
              differenceNanoseconds: '900000000000',
              revisionId: 'revision-1',
              publishedShiftId: 'shift-1',
            },
          },
        ],
      },
    ],
    recordCount: 1,
    signalCount: 1,
    affectedEmployeeCount: 1,
    pendingCorrectionCount: 2,
    labels: {
      employees: [{ id: 'employee-1', name: 'Alex Morgan' }],
      locations: [{ id: 'location-1', name: 'Northside' }],
    },
    coverage: {
      state: 'complete',
      limitations: [],
      deferredCapabilities: [
        'missing_clock_in',
        'policy_lateness',
        'policy_early_departure',
        'unusually_long_entry',
        'correction_review',
        'overtime_risk',
      ],
    },
  };
}

describe('D1.3 attendance private response parser', () => {
  it('accepts the bounded D1.2 projection without adding browser scope', () => {
    const result = parseAttendanceReview(ready());
    expect(result).toMatchObject({
      state: 'ready',
      recordCount: 1,
      signalCount: 1,
      affectedEmployeeCount: 1,
      pendingCorrectionCount: 2,
      scope: { kind: 'TODAY_AND_OPEN', localDate: '2030-10-07' },
    });
  });

  it('fails closed when aggregate counts do not match the authorized groups', () => {
    expect(() => parseAttendanceReview({ ...ready(), signalCount: 2 }))
      .toThrow('Invalid attendance review');
  });

  it('fails closed when server-resolved labels are missing, extra, or mismatched', () => {
    const value = ready();
    expect(() => parseAttendanceReview({ ...value, labels: undefined }))
      .toThrow('Invalid attendance review');
    expect(() => parseAttendanceReview({
      ...value,
      labels: { ...value.labels, locations: [] },
    })).toThrow('Invalid attendance review');
    expect(() => parseAttendanceReview({
      ...value,
      labels: {
        ...value.labels,
        employees: [...value.labels.employees, { id: 'other', name: 'Other Person' }],
      },
    })).toThrow('Invalid attendance review');
  });

  it('fails closed for unrecognized unavailable reasons', () => {
    expect(() => parseAttendanceReview({ state: 'unavailable', reason: 'client_filter' }))
      .toThrow('Invalid attendance review');
  });

  it('accepts bounded unavailable states without reflecting source details', () => {
    expect(parseAttendanceReview({ state: 'unavailable', reason: 'access_denied' }))
      .toEqual({ state: 'unavailable', reason: 'access_denied' });
    expect(parseAttendanceReview({ state: 'unavailable', reason: 'read_failed' }))
      .toEqual({ state: 'unavailable', reason: 'read_failed' });
  });

  it('expires source freshness as read_failed instead of inventing an authorization failure', async () => {
    vi.useFakeTimers();
    const states: AttendancePanelState[] = [];
    const controller = createAttendanceReviewController(
      (state) => states.push(state),
      async () => ({ ...ready(), validForMs: 100 }),
    );
    try {
      controller.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(states.at(-1)?.review?.state).toBe('ready');
      await vi.advanceTimersByTimeAsync(101);
      expect(states.at(-1)).toMatchObject({
        review: { state: 'unavailable', reason: 'read_failed' },
      });
    } finally {
      controller.stop();
      vi.useRealTimers();
    }
  });

  it('starts in loading and lets only the latest refresh publish protected attendance', async () => {
    vi.useFakeTimers();
    const states: AttendancePanelState[] = [];
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const first = new Promise<unknown>((resolve) => { resolveFirst = resolve; });
    const second = new Promise<unknown>((resolve) => { resolveSecond = resolve; });
    const signals: AbortSignal[] = [];
    const request = vi.fn()
      .mockImplementationOnce((signal: AbortSignal) => {
        signals.push(signal);
        return first;
      })
      .mockImplementationOnce((signal: AbortSignal) => {
        signals.push(signal);
        return second;
      });
    const controller = createAttendanceReviewController(
      (state) => states.push(state),
      request,
    );
    try {
      controller.start();
      expect(states.at(-1)).toMatchObject({ review: null, refreshing: true, paused: false });
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledTimes(1);

      controller.refresh();
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledTimes(2);
      expect(signals[0]?.aborted).toBe(true);

      resolveSecond({ ...ready(), observedAt: '2030-10-07T16:01:00Z' });
      await vi.advanceTimersByTimeAsync(0);
      expect(states.at(-1)).toMatchObject({
        review: { state: 'ready', observedAt: '2030-10-07T16:01:00Z' },
        refreshing: false,
      });

      resolveFirst({ ...ready(), observedAt: '2030-10-07T16:00:00Z' });
      await vi.advanceTimersByTimeAsync(0);
      expect(states.at(-1)).toMatchObject({
        review: { state: 'ready', observedAt: '2030-10-07T16:01:00Z' },
      });
    } finally {
      controller.stop();
      vi.useRealTimers();
    }
  });

  it('pause clears identities immediately and resume requires a new authorized snapshot', async () => {
    vi.useFakeTimers();
    const states: AttendancePanelState[] = [];
    let resolveFresh!: (value: unknown) => void;
    const fresh = new Promise<unknown>((resolve) => { resolveFresh = resolve; });
    const request = vi.fn()
      .mockResolvedValueOnce(ready())
      .mockReturnValueOnce(fresh);
    const controller = createAttendanceReviewController(
      (state) => states.push(state),
      request,
    );
    try {
      controller.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(JSON.stringify(states.at(-1))).toContain('employee-1');

      controller.pause();
      expect(states.at(-1)).toEqual({ review: null, refreshing: false, paused: true });
      expect(JSON.stringify(states.at(-1))).not.toContain('employee-1');

      controller.start();
      expect(states.at(-1)).toEqual({ review: null, refreshing: true, paused: false });
      await vi.advanceTimersByTimeAsync(0);
      expect(request).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(states.at(-1))).not.toContain('employee-1');

      resolveFresh({ ...ready(), observedAt: '2030-10-07T16:02:00Z' });
      await vi.advanceTimersByTimeAsync(0);
      expect(states.at(-1)).toMatchObject({
        review: { state: 'ready', observedAt: '2030-10-07T16:02:00Z' },
      });
    } finally {
      controller.stop();
      vi.useRealTimers();
    }
  });
});
