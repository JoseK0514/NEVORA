import { expect, it } from "vitest";
import { parseCommand } from "./contracts";
it("accepts only an explicit bounded memory submission, never a verified client outcome", () => {
    const command = { op: "memory", requestId: "20000000-0000-4000-8000-000000000001", expectedRevision: 0, change: { kind: "save_intent", intentId: "20000000-0000-4000-8000-000000000002", kindOfIntent: "preference", text: "Prefer stable teams", focus: { kind: "general" }, effectiveDate: "2026-11-01", expiryDate: "2026-11-30" } };
    expect(parseCommand(command)).toEqual(command);
    expect(() => parseCommand({ ...command, change: { ...command.change, source: "inferred" } })).toThrow();
    expect(() => parseCommand({ ...command, change: { kind: "report_outcome", decisionId: command.change.intentId, text: "Done", verified: true } })).toThrow();
});
