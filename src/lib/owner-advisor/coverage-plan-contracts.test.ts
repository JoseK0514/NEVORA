import { expect, it } from "vitest";
import { parseCommand, parseTool } from "./contracts";
it("admits a selected-date joint comparison without allowing business actions or compute overrides", () => {
  const tool = { name: "coverage_plan", args: { date: "2026-10-05" } };
  expect(parseTool(tool.name, JSON.stringify(tool.args))).toEqual(tool);
  expect(parseCommand({ op: "inspect", requestId: "10000000-0000-0000-0000-000000000001", tool })).toMatchObject({ op: "inspect", tool });
  for (const args of [{ date: "2026-02-30" }, { date: "2026-10-05", save: true }, { date: "2026-10-05", maxNodes: 1000000 }])
    expect(() => parseTool(tool.name, JSON.stringify(args))).toThrow();
});
