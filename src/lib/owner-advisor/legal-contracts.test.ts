import { expect, it } from "vitest";
import { parseCommand, parseTool } from "./contracts";
it("admits explicit legal research and private inspections without private outbound arguments", () => {
  const tool = { name: "legal_research", args: { jurisdiction: "PR_US", topic: "working_time" } };
  expect(parseTool(tool.name, JSON.stringify(tool.args))).toEqual(tool);
  expect(parseCommand({ op: "inspect", requestId: "11111111-1111-4111-8111-111111111111", tool })).toMatchObject({ tool });
});
it.each([{ jurisdiction: "PR_US", topic: "working_time", query: "private employee" }, { jurisdiction: "UK", topic: "working_time" }, { jurisdiction: "PR_US", topic: "arbitrary" }, { jurisdiction: "PR_US", topic: "working_time", url: "https://evil.test" }])("rejects outbound input expansion %j", args => expect(() => parseTool("legal_research", JSON.stringify(args))).toThrow());
