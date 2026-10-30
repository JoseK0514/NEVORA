import { expect, it } from "vitest";
import { parseCommand, parseTool } from "./contracts";
const id = "10000000-0000-4000-8000-000000000001";
const term = { employeeId: "ana", locationId: "north", startTime: "08:00", endTime: "12:00", positionId: null, isDesignatedLead: false };
const prepare = () => ({ op: "prepare_coverage_draft", requestId: id, date: "2026-10-22", sourceVersion: "a".repeat(64), assignments: [term] });
it("accepts an explicit exact draft review without granting a model tool", () => {
  expect(parseCommand(prepare())).toEqual(prepare());
  expect(() => parseTool("prepare_coverage_draft", JSON.stringify(prepare()))).toThrow();
});
it("requires deliberate acknowledgement for a bounded apply and accepts a read-only check", () => {
  const apply = { op: "apply_coverage_draft", requestId: id, reviewId: id, acknowledged: true };
  expect(parseCommand(apply)).toEqual(apply);
  expect(parseCommand({ op: "check_coverage_draft", requestId: id, reviewId: id })).toMatchObject({ op: "check_coverage_draft" });
  expect(() => parseCommand({ ...apply, acknowledged: false })).toThrow();
});
it.each([
  { assignments: [] }, { assignments: Array.from({ length: 13 }, () => term) },
  { assignments: [term, term] }, { assignments: [{ ...term, startTime: "25:00" }] },
  { assignments: [{ ...term, positionId: "" }] }, { assignments: [{ ...term, date: "2026-10-23" }] },
  { assignments: [{ ...term, employeeId: "x".repeat(129) }] },
  { date: "2026-02-30" }, { sourceVersion: "not-a-hash" }, { publish: true },
])("rejects malformed or expanded review input (%#)", override => expect(() => parseCommand({ ...prepare(), ...override })).toThrow());
