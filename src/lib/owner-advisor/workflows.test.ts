import { expect, it } from "vitest";
import { parseCommand, parseTool } from "./contracts";
const requestId = "11111111-1111-4111-8111-111111111111";
it("admits bounded explicit inspections and both bilingual period tools", () => {
  const tool = { name: "attendance_payroll_review", args: { startDate: "2026-10-01", endDate: "2026-10-31", language: "es" } };
  expect(parseTool(tool.name, JSON.stringify(tool.args))).toEqual(tool);
  expect(parseCommand({ op: "inspect", requestId, tool })).toEqual({ op: "inspect", requestId, tool });
  expect(parseTool("coverage_proposals", '{"date":"2026-10-22"}')).toEqual({ name: "coverage_proposals", args: { date: "2026-10-22" } });
});
it.each([
  { startDate: "2026-10-01", endDate: "2026-11-01", language: "en" },
  { startDate: "2026-10-22", endDate: "2026-10-01", language: "es" },
  { startDate: "2026-02-30", endDate: "2026-03-01", language: "en" },
  { startDate: "2026-10-01", endDate: "2026-10-02", language: "fr" },
  { startDate: "2026-10-01", endDate: "2026-10-02", language: "en", approve: true },
])("rejects invalid periods/languages and attempted write authority: %j", args => {
  expect(() => parseTool("attendance_payroll_review", JSON.stringify(args))).toThrow();
});
