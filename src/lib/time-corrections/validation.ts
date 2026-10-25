import { Temporal } from '@js-temporal/polyfill';

export type CorrectionKind = 'ENTRY_BOUNDARY' | 'BREAK_BOUNDARY' | 'MISSING_ENTRY';

export type CorrectionRequestCommand =
  | {
      operationId: string;
      kind: 'ENTRY_BOUNDARY';
      timeEntryId: string;
      proposedStartAt: string;
      proposedEndAt: string;
      reason: string;
    }
  | {
      operationId: string;
      kind: 'BREAK_BOUNDARY';
      timeEntryId: string;
      breakEntryId: string;
      proposedStartAt: string;
      proposedEndAt: string;
      reason: string;
    }
  | {
      operationId: string;
      kind: 'MISSING_ENTRY';
      locationId: string;
      targetAdjustmentId?: string;
      expectedBaseRevision?: number;
      proposedStartAt: string;
      proposedEndAt: string;
      reason: string;
    };

export type CorrectionReviewCommand = {
  operationId: string;
  requestId: string;
  expectedRevision: number;
  decision: 'APPROVE' | 'REJECT';
  note?: string;
};

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' &&
  value === value.trim() &&
  value.length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const expected = new Set(keys);
  return Object.keys(value).every((key) => expected.has(key)) &&
    keys.every((key) => Object.hasOwn(value, key));
};

function instant(value: unknown): string {
  if (!text(value, 100)) throw new Error('Invalid correction timestamp');
  try {
    return Temporal.Instant.from(value).toString();
  } catch {
    throw new Error('Invalid correction timestamp');
  }
}

function interval(startValue: unknown, endValue: unknown) {
  const startAt = instant(startValue);
  const endAt = instant(endValue);
  if (Temporal.Instant.compare(Temporal.Instant.from(startAt), Temporal.Instant.from(endAt)) >= 0) {
    throw new Error('Correction end must be after start');
  }
  return { proposedStartAt: startAt, proposedEndAt: endAt };
}

function reason(value: unknown): string {
  if (!text(value, 500)) throw new Error('Correction reason is required');
  return value;
}

function id(value: unknown): string {
  if (!text(value, 200)) throw new Error('Invalid correction target');
  return value;
}

/**
 * Accept only the fields for one correction kind and normalize explicit instants.
 * A missing-entry supersession requires both base identity and revision; location,
 * ownership and overlap authority are deliberately left to the server/SQL boundary.
 */
export function parseCorrectionRequestCommand(value: unknown): CorrectionRequestCommand {
  if (!object(value) || !uuid(value.operationId)) throw new Error('Invalid correction request');
  const kind = value.kind;
  if (kind === 'ENTRY_BOUNDARY') {
    const keys = ['operationId', 'kind', 'timeEntryId', 'proposedStartAt', 'proposedEndAt', 'reason'] as const;
    if (!exactKeys(value, keys)) throw new Error('Invalid correction request');
    return {
      operationId: value.operationId,
      kind,
      timeEntryId: id(value.timeEntryId),
      ...interval(value.proposedStartAt, value.proposedEndAt),
      reason: reason(value.reason),
    };
  }
  if (kind === 'BREAK_BOUNDARY') {
    const keys = ['operationId', 'kind', 'timeEntryId', 'breakEntryId', 'proposedStartAt', 'proposedEndAt', 'reason'] as const;
    if (!exactKeys(value, keys)) throw new Error('Invalid correction request');
    return {
      operationId: value.operationId,
      kind,
      timeEntryId: id(value.timeEntryId),
      breakEntryId: id(value.breakEntryId),
      ...interval(value.proposedStartAt, value.proposedEndAt),
      reason: reason(value.reason),
    };
  }
  if (kind === 'MISSING_ENTRY') {
    const targeted = Object.hasOwn(value, 'targetAdjustmentId') || Object.hasOwn(value, 'expectedBaseRevision');
    const keys = ['operationId', 'kind', 'locationId', 'proposedStartAt', 'proposedEndAt', 'reason',
      ...(targeted ? ['targetAdjustmentId', 'expectedBaseRevision'] : [])];
    if (!exactKeys(value, keys)) throw new Error('Invalid correction request');
    if (targeted && (!uuid(value.targetAdjustmentId) || !Number.isSafeInteger(value.expectedBaseRevision) || Number(value.expectedBaseRevision) < 1)) {
      throw new Error('Invalid correction base');
    }
    return {
      operationId: value.operationId,
      kind,
      locationId: id(value.locationId),
      ...(targeted ? { targetAdjustmentId: value.targetAdjustmentId as string, expectedBaseRevision: Number(value.expectedBaseRevision) } : {}),
      ...interval(value.proposedStartAt, value.proposedEndAt),
      reason: reason(value.reason),
    };
  }
  throw new Error('Invalid correction request');
}

export function parseCorrectionReviewCommand(value: unknown): CorrectionReviewCommand {
  if (!object(value)) throw new Error('Invalid correction review');
  const hasNote = Object.hasOwn(value, 'note');
  const keys = hasNote
    ? ['operationId', 'requestId', 'expectedRevision', 'decision', 'note'] as const
    : ['operationId', 'requestId', 'expectedRevision', 'decision'] as const;
  if (!exactKeys(value, keys) || !uuid(value.operationId) || !uuid(value.requestId) ||
      !Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 1 ||
      !['APPROVE', 'REJECT'].includes(String(value.decision))) {
    throw new Error('Invalid correction review');
  }
  const note = hasNote ? (text(value.note, 500) ? value.note : (() => { throw new Error('Invalid correction review note'); })()) : undefined;
  return {
    operationId: value.operationId,
    requestId: value.requestId,
    expectedRevision: Number(value.expectedRevision),
    decision: value.decision as 'APPROVE' | 'REJECT',
    ...(note ? { note } : {}),
  };
}
