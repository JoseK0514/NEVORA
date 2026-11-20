import type { ValidationIssueCode } from './validate-shift';

export type OpenShiftState = 'open' | 'filled' | 'expired' | 'withdrawn';
export type OpenShiftCommand =
  | { kind: 'post'; id: string; locationId: string; positionId: string; date: string; startTime: string; endTime: string }
  | { kind: 'claim'; id: string }
  | { kind: 'withdraw'; id: string };

export type OpenShiftResult =
  | { state: 'posted' | 'withdrawn' | 'filled' | 'expired' | 'conflict' | 'outcome_unknown'; id: string }
  | { state: 'claimed'; id: string; assignmentId: string; visibility: 'published' | 'draft' }
  | { state: 'ineligible'; id: string; reason: ValidationIssueCode | 'SCHEDULE_ARCHIVED' | 'POSTING_TIME_CHANGED' }
  | { state: 'invalid' | 'forbidden' | 'unavailable' };

export type OpenShiftView = {
  id: string;
  locationId: string;
  locationName: string;
  positionId: string;
  positionName: string;
  date: string;
  startTime: string;
  endTime: string;
  state: OpenShiftState;
};

const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const catalogId = (value: unknown): value is string => typeof value === 'string' &&
  value.length > 0 && value.length <= 200 && value.trim() === value && !/[\p{Cc}\p{Cf}]/u.test(value);

export function parseOpenShiftCommand(input: unknown): OpenShiftCommand | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  if (typeof row.id !== 'string' || !idPattern.test(row.id)) return null;
  const id = row.id.toLowerCase();
  if ((row.kind === 'claim' || row.kind === 'withdraw') && Object.keys(row).length === 2) {
    return { kind: row.kind, id };
  }
  if (row.kind !== 'post' || Object.keys(row).length !== 7 || !catalogId(row.locationId) ||
    !catalogId(row.positionId) || typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
    typeof row.startTime !== 'string' || !time.test(row.startTime) ||
    typeof row.endTime !== 'string' || (!time.test(row.endTime) && row.endTime !== '24:00')) return null;
  return { kind: 'post', id, locationId: row.locationId, positionId: row.positionId,
    date: row.date, startTime: row.startTime, endTime: row.endTime };
}
