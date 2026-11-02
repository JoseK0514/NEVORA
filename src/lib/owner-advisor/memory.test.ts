import { expect, it } from "vitest";
import { applyMemoryCommand, emptyMemory, ownerMemoryContext, parseMemory, parseMemoryCommand, purgeMemory } from "./memory";
const now = "2026-11-01T12:00:00.000Z", id = "20000000-0000-4000-8000-000000000002";
const command = (change: unknown, expectedRevision = 0) => parseMemoryCommand({ op: "memory", requestId: id, expectedRevision, change });
const intent = { kind: "save_intent", intentId: id, kindOfIntent: "preference", text: "Stable teams", focus: { kind: "general" }, effectiveDate: "2026-11-01", expiryDate: "2026-11-30" };
it("bounds strict explicit memory fields and rejects inference/verification inputs", () => {
    for (const change of [{ ...intent, source: "inferred" }, { ...intent, text: "x".repeat(1001) }, { ...intent, focus: { kind: "general", date: "2026-11-01" } }, { ...intent, expiryDate: "2026-02-30" }, { ...intent, expiryDate: "2026-10-31" }, { kind: "report_outcome", decisionId: id, text: "Done", verified: true }])
        expect(() => command(change)).toThrow();
    expect(() => parseMemory({ ...emptyMemory(), surprise: true })).toThrow();
});
it("retains only explicit submissions, corrects in place and removes intent", () => {
    expect(ownerMemoryContext(emptyMemory(), now).intents).toEqual([]);
    const first = applyMemoryCommand(emptyMemory(), command(intent), now);
    const corrected = applyMemoryCommand(first, command({ ...intent, text: "Prefer rotation" }, 1), now);
    expect(corrected.intents).toHaveLength(1);
    expect(corrected.intents[0]).toMatchObject({ text: "Prefer rotation", source: "explicit_owner", createdAt: now, updatedAt: now });
    expect(JSON.stringify(ownerMemoryContext(corrected, now))).not.toContain("Stable teams");
    expect(applyMemoryCommand(corrected, command({ kind: "delete_intent", intentId: id }, 2), now).intents).toEqual([]);
});
it("enforces 12 intents and 20 decisions with UUID identities", () => {
    let m = emptyMemory();
    for (let i = 0; i < 12; i++)
        m = applyMemoryCommand(m, command({ ...intent, intentId: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}` }, i), now);
    expect(() => applyMemoryCommand(m, command(intent, 12), now)).not.toThrow(); // existing id
    expect(() => applyMemoryCommand(m, command({ ...intent, intentId: "30000000-0000-4000-8000-000000000099" }, 12), now)).toThrow("limit");
    m = emptyMemory();
    for (let i = 0; i < 20; i++)
        m = applyMemoryCommand(m, command({ kind: "save_decision", decisionId: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`, summary: "Review", course: "Keep draft", reason: "Availability unknown", focus: { kind: "general" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" }, i), now);
    expect(() => applyMemoryCommand(m, command({ kind: "save_decision", decisionId: "30000000-0000-4000-8000-000000000099", summary: "Review", course: "Keep", reason: "Unknown", focus: { kind: "general" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" }, 20), now)).toThrow("limit");
});
it("applies inclusive effective/expiry dates and exact scope without extending retention for future scope or edits", () => {
    const m = applyMemoryCommand(emptyMemory(), command({ ...intent, focus: { kind: "coverage", date: "2026-11-02" }, effectiveDate: "2026-11-02", expiryDate: "2026-11-03" }), now);
    expect(ownerMemoryContext(m, now, { kind: "coverage", date: "2026-11-02" }).intents).toHaveLength(1);
    expect(ownerMemoryContext(m, "2026-11-03T23:59:59.000Z", { kind: "coverage", date: "2026-11-02" }).intents).toHaveLength(1);
    expect(ownerMemoryContext(m, "2026-11-03T12:00:00.000Z", { kind: "coverage", date: "2026-11-04" }).intents).toEqual([]);
    expect(purgeMemory(m, "2026-11-04T00:00:00.000Z").intents).toEqual([]);
    expect(() => applyMemoryCommand(emptyMemory(), command({ ...intent, effectiveDate: "2027-11-01", expiryDate: "2027-11-30" }), now)).toThrow();
    const long = applyMemoryCommand(emptyMemory(), command({ ...intent, expiryDate: "2027-10-31" }), now);
    expect(() => applyMemoryCommand(long, command({ ...intent, expiryDate: "2027-11-01" }, 1), "2027-01-01T00:00:00.000Z")).toThrow();
});
it("bounds inference projection without silently dropping an active constraint", () => {
    let m = emptyMemory();
    for (let i = 0; i < 12; i++)
        m = applyMemoryCommand(m, command({ ...intent, intentId: `40000000-0000-4000-8000-${String(i).padStart(12, "0")}`, kindOfIntent: "owner_constraint", text: "\\".repeat(1000) }, m.revision), now);
    for (let i = 0; i < 20; i++)
        m = applyMemoryCommand(m, command({ kind: "save_decision", decisionId: `50000000-0000-4000-8000-${String(i).padStart(12, "0")}`, summary: "x".repeat(1000), course: "x".repeat(1000), reason: "x".repeat(1000), focus: { kind: "general" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" }, m.revision), now);
    const c = ownerMemoryContext(m, now);
    expect(c.intents).toHaveLength(12);
    expect(JSON.stringify(c).length).toBeLessThanOrEqual(32768);
    expect(c.omittedDecisions).toBeGreaterThan(0);
});
it("uses the investigated date for scoped applicability while purging by current workspace day", () => {
    const m = applyMemoryCommand(emptyMemory(), command({ ...intent, effectiveDate: "2026-11-02", expiryDate: "2026-11-02", focus: { kind: "coverage", date: "2026-11-02" } }), now);
    expect(ownerMemoryContext(m, now, { kind: "coverage", date: "2026-11-02" }).intents).toHaveLength(1);
    const local = applyMemoryCommand(emptyMemory(), command({ ...intent, expiryDate: "2026-11-01" }), now);
    expect(purgeMemory(local, "2026-11-02T02:00:00.000Z", "America/Puerto_Rico").intents).toHaveLength(1);
    expect(purgeMemory(local, "2026-11-02T04:00:00.000Z", "America/Puerto_Rico").intents).toHaveLength(0);
});
it("preserves the server coverage observation timestamp and exact progress without claiming verification", () => {
    const m = applyMemoryCommand(emptyMemory(), command({ kind: "save_decision", decisionId: id, summary: "Draft", course: "Keep", reason: "Review", focus: { kind: "coverage", date: "2026-11-01" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" }), now);
    const progress = { state: "current" as const, observedAt: "2026-11-01T12:00:00.123456+00:00", timeZone: "America/Puerto_Rico", assignmentsPresent: 1, assignmentsTotal: 1, publishedAssignments: 0, coverage: { requiredMinutes: 60, coveredMinutes: 60, requiredObligationMinutes: 0, fulfilledObligationMinutes: 0, remainingBlocks: 0 }, scopeComplete: true };
    const next = applyMemoryCommand(m, command({ kind: "check_outcome", decisionId: id, reviewId: id }, 1), now, progress);
    expect(next.decisions[0].outcome).toEqual({ kind: "coverage_checked", reviewId: id, progress });
});
