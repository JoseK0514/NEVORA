import { expect, it } from 'vitest';
import { decisionTool, weeklyDecisionTool } from './decision';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function schemas(value: unknown, visit: (value: Record<string, unknown>) => void) {
  if (Array.isArray(value)) value.forEach(v => schemas(v, visit));
  else if (object(value)) { visit(value); Object.values(value).forEach(v => schemas(v, visit)); }
}
it('adds full weekly identity and source-owned metrics only to the opt-in decision schema', () => {
  const legacy = JSON.stringify(decisionTool), weekly = JSON.stringify(weeklyDecisionTool);
  expect(legacy).not.toContain('weekly_added_minutes'); expect(legacy).not.toContain('termsDigest');
  expect(weekly).toContain('weekly_added_minutes'); expect(weekly).toContain('termsDigest'); expect(weekly).toContain('locationScope'); expect(weekly).toContain('reviewId');
  expect(decisionTool.name).toBe(weeklyDecisionTool.name); expect(decisionTool.strict).toBe(true); expect(weeklyDecisionTool.strict).toBe(true);
  schemas(weeklyDecisionTool.parameters, schema => {
    if (schema.type === 'object') {
      expect(schema.additionalProperties).toBe(false);
      expect([...(schema.required as string[])].sort()).toEqual(Object.keys(schema.properties as object).sort());
    }
  });
});
