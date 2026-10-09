import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { validCalendarCommand } from './service.server';

const command = {
  kind: 'ISSUE',
  operationId: '11111111-1111-4111-8111-111111111111',
  authority: 'a'.repeat(64),
  expectedGeneration: null,
};

it.each(['ISSUE', 'ROTATE', 'REVOKE'])('accepts the exact scalar calendar action %s', kind => {
  expect(validCalendarCommand({ ...command, kind })).toBe(true);
});

it.each([
  ['single ISSUE array', ['ISSUE']],
  ['single ROTATE array', ['ROTATE']],
  ['single REVOKE array', ['REVOKE']],
  ['empty array', []],
  ['multiple action array', ['ISSUE', 'REVOKE']],
  ['null', null],
  ['number', 1],
  ['boolean', true],
  ['object', {}],
  ['shadowed toString', { toString: null }],
  ['lowercase action', 'issue'],
  ['padded action', ' ISSUE'],
  ['unknown action', 'DELETE'],
])('rejects malformed JSON calendar action %s without throwing', (_name, kind) => {
  expect(validCalendarCommand({ ...command, kind })).toBe(false);
});

it('rejects extra selectors, malformed generation and missing fields', () => {
  for (const input of [
    { ...command, employeeId: 'other' },
    { ...command, expectedGeneration: [] },
    { ...command, authority: 'A'.repeat(64) },
    { kind: 'ISSUE' }, null, [],
  ]) expect(validCalendarCommand(input)).toBe(false);
});
