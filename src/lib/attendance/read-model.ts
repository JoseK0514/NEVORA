import type { ReadyProjection, UnavailableProjection } from './types';

export const ATTENDANCE_MAX_VALID_MS = 45_000;

export type AttendanceReadUnavailableReason =
  | UnavailableProjection['reason']
  | 'access_denied'
  | 'not_configured'
  | 'schema_missing'
  | 'read_failed';

export type AttendanceReview =
  | (ReadyProjection & { validForMs: number })
  | { state: 'unavailable'; reason: AttendanceReadUnavailableReason };

export type AttendanceDisplayLabel = {
  id: string;
  name: string;
};

export type AttendanceDisplayReview =
  | (ReadyProjection & {
      validForMs: number;
      labels: {
        employees: readonly AttendanceDisplayLabel[];
        locations: readonly AttendanceDisplayLabel[];
      };
    })
  | { state: 'unavailable'; reason: AttendanceReadUnavailableReason };
