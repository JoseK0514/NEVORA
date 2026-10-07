import { describe, expect, it } from 'vitest';
import { parseCorrectionRequestCommand, parseCorrectionReviewCommand } from './validation';

describe('D2 correction command validation', () => {
  it('accepts explicit missing-time base identity and rejects incomplete or injected identity', () => {
    const command = {
      operationId: '11111111-1111-4111-8111-111111111111', kind: 'MISSING_ENTRY', locationId: 'loc-1',
      proposedStartAt: '2026-01-05T08:05:00Z', proposedEndAt: '2026-01-05T09:00:00Z', reason: 'Fictional replacement.',
      targetAdjustmentId: '22222222-2222-4222-8222-222222222222', expectedBaseRevision: 2,
    };
    expect(parseCorrectionRequestCommand(command)).toEqual(command);
    for (const malformed of [
      { ...command, expectedBaseRevision: undefined }, { ...command, targetAdjustmentId: null },
      { ...command, expectedBaseRevision: 0 }, { ...command, expectedBaseRevision: 1.5 },
      { ...command, employeeId: 'someone-else' }, { ...command, kind: 'ENTRY_BOUNDARY', timeEntryId: 'raw' },
    ]) expect(() => parseCorrectionRequestCommand(malformed)).toThrow();
  });
  it('accepts a bounded completed-entry correction without caller-supplied employee identity', () => {
    expect(parseCorrectionRequestCommand({
      operationId: '11111111-1111-4111-8111-111111111111',
      kind: 'ENTRY_BOUNDARY',
      timeEntryId: 'entry-1',
      proposedStartAt: '2030-10-07T12:05:00Z',
      proposedEndAt: '2030-10-07T16:02:00Z',
      reason: 'Clock-out was recorded after I had already left.',
    })).toEqual({
      operationId: '11111111-1111-4111-8111-111111111111',
      kind: 'ENTRY_BOUNDARY',
      timeEntryId: 'entry-1',
      proposedStartAt: '2030-10-07T12:05:00Z',
      proposedEndAt: '2030-10-07T16:02:00Z',
      reason: 'Clock-out was recorded after I had already left.',
    });
  });

  it('accepts a bounded break correction and preserves classification outside the command', () => {
    expect(parseCorrectionRequestCommand({
      operationId: '22222222-2222-4222-8222-222222222222',
      kind: 'BREAK_BOUNDARY',
      timeEntryId: 'entry-1',
      breakEntryId: 'break-1',
      proposedStartAt: '2030-10-07T14:00:00Z',
      proposedEndAt: '2030-10-07T14:17:00Z',
      reason: 'I ended the break at 10:17.',
    })).toMatchObject({ kind: 'BREAK_BOUNDARY', breakEntryId: 'break-1' });
  });

  it('accepts a missing-entry request without pretending it is a captured Clocker punch', () => {
    expect(parseCorrectionRequestCommand({
      operationId: '33333333-3333-4333-8333-333333333333',
      kind: 'MISSING_ENTRY',
      locationId: 'loc-1',
      proposedStartAt: '2030-10-06T12:00:00Z',
      proposedEndAt: '2030-10-06T16:00:00Z',
      reason: 'I could not access the tablet.',
    })).toMatchObject({ kind: 'MISSING_ENTRY', locationId: 'loc-1' });
  });

  it('rejects identity injection, reversed time, open-ended proposals and unsafe text', () => {
    expect(() => parseCorrectionRequestCommand({
      operationId: '44444444-4444-4444-8444-444444444444',
      kind: 'ENTRY_BOUNDARY',
      employeeId: 'someone-else',
      timeEntryId: 'entry-1',
      proposedStartAt: '2030-10-07T16:00:00Z',
      proposedEndAt: '2030-10-07T12:00:00Z',
      reason: 'bad\u0000reason',
    })).toThrow();
    expect(() => parseCorrectionRequestCommand({
      operationId: '44444444-4444-4444-8444-444444444444',
      kind: 'ENTRY_BOUNDARY',
      timeEntryId: 'entry-1',
      proposedStartAt: '2030-10-07T12:00:00Z',
      proposedEndAt: null,
      reason: 'Open live state',
    })).toThrow();
  });

  it('validates review identity, revision and one explicit decision', () => {
    expect(parseCorrectionReviewCommand({
      operationId: '55555555-5555-4555-8555-555555555555',
      requestId: '66666666-6666-4666-8666-666666666666',
      expectedRevision: 1,
      decision: 'APPROVE',
      note: 'Compared with the employee request.',
    })).toMatchObject({ decision: 'APPROVE', expectedRevision: 1 });
    expect(() => parseCorrectionReviewCommand({
      operationId: '55555555-5555-4555-8555-555555555555',
      requestId: '66666666-6666-4666-8666-666666666666',
      expectedRevision: 0,
      decision: 'APPROVE',
    })).toThrow();
  });
});
