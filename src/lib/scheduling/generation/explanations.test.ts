import { it, expect } from "vitest";
import { aggregateGenerationRejections } from "./explanations";
it("counts distinct rejected people per code rather than failed candidates", () => {
  const issue = {
    code: "MAX_WEEKLY_HOURS" as const,
    severity: "error" as const,
    message: "Cap",
  };
  const result = aggregateGenerationRejections([
    { employeeId: "a", issues: [issue] },
    { employeeId: "a", issues: [issue] },
    { employeeId: "b", issues: [issue] },
  ]);
  expect(result[0].distinctEmployeeCount).toBe(2);
  expect(result[0].employeeIds).toEqual(["a", "b"]);
});
