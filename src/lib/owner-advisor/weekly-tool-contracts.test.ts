import { expect, it } from 'vitest';
import { parseTool } from './contracts';
const args = { weekStart: '2026-11-16', locationScope: { kind: 'SELECTED', locationIds: ['b', 'a'] } };
it('admits only a canonical read-only weekly comparison and sorts explicit scope', () => {
  expect(parseTool('weekly_plan', JSON.stringify(args))).toEqual({ name: 'weekly_plan', args: { ...args, locationScope: { kind: 'SELECTED', locationIds: ['a', 'b'] } } });
  expect(parseTool('weekly_plan', JSON.stringify({ ...args, locationScope: { kind: 'ALL' } }))).toEqual({ name: 'weekly_plan', args: { ...args, locationScope: { kind: 'ALL' } } });
});
it.each([
  { ...args, mode: 'BUILD_WEEK' }, { ...args, op: 'apply_week_plan' }, { ...args, acknowledged: true },
  { ...args, requestId: '11111111-1111-4111-8111-111111111111' }, { ...args, occurrence: 0 },
  { ...args, reviewId: '11111111-1111-4111-8111-111111111111' }, { ...args, readReceiptId: '11111111-1111-4111-8111-111111111111' },
  { ...args, assignments: [] }, { ...args, termsDigest: 'a'.repeat(64) }, { ...args, weekStart: '2026-11-17' },
  { ...args, locationScope: { kind: 'SELECTED', locationIds: ['a', 'a'] } },
])('rejects model-supplied write authority, identity or invalid scope: %j', value => {
  expect(() => parseTool('weekly_plan', JSON.stringify(value))).toThrow();
});
it('retains the existing global model argument budget even for a valid large weekly scope', () => {
  const value = { ...args, locationScope: { kind: 'SELECTED', locationIds: Array.from({ length: 20 }, (_, i) => `${i}-${'x'.repeat(100)}`) } };
  expect(JSON.stringify(value).length).toBeGreaterThan(1024);
  expect(() => parseTool('weekly_plan', JSON.stringify(value))).toThrow();
});
