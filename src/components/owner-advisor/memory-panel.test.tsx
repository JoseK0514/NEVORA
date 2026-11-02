import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryPanel, newMemoryDraft } from "./memory-panel";
import { applyMemoryCommand, emptyMemory, parseMemoryCommand } from "@/lib/owner-advisor/memory";
const id = "20000000-0000-4000-8000-000000000001", now = "2026-11-01T12:00:00.000Z";
it("offers explicit scoped memory controls, escapes text and distinguishes reported outcomes", () => {
    let m = applyMemoryCommand(emptyMemory(), parseMemoryCommand({ op: "memory", requestId: id, expectedRevision: 0, change: { kind: "save_intent", intentId: id, kindOfIntent: "owner_constraint", text: "<script>Private constraint</script>", focus: { kind: "coverage", date: "2026-11-02" }, effectiveDate: "2026-11-01", expiryDate: "2026-11-30" } }), now);
    const d = "30000000-0000-4000-8000-000000000001";
    m = applyMemoryCommand(m, parseMemoryCommand({ op: "memory", requestId: id, expectedRevision: 1, change: { kind: "save_decision", decisionId: d, summary: "Choose draft", course: "Keep draft", reason: "Await availability", focus: { kind: "general" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" } }), now);
    m = applyMemoryCommand(m, parseMemoryCommand({ op: "memory", requestId: id, expectedRevision: 2, change: { kind: "report_outcome", decisionId: d, text: "Owner says done" } }), now);
    const html = renderToStaticMarkup(<MemoryPanel memory={m} date="2026-11-01" disabled={false} change={async () => false}/>);
    expect(html).toContain("&lt;script&gt;Private constraint&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    for (const label of ["Add preference", "Add constraint", "Edit constraint", "Remove constraint", "Record decision", "Owner-reported", "2026-11-30", "2026-11-02", "Explicit Owner submission"])
        expect(html).toContain(label);
    expect(html).not.toContain("Verified success");
});
it("requires a matching current saved draft instead of asking for a technical receipt ID", () => {
    const m = applyMemoryCommand(emptyMemory(), parseMemoryCommand({ op: "memory", requestId: id, expectedRevision: 0, change: { kind: "save_decision", decisionId: id, summary: "Keep draft", course: "Review allocation", reason: "Coverage", focus: { kind: "coverage", date: "2026-11-02" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" } }), now);
    const html = renderToStaticMarkup(<MemoryPanel memory={m} date="2026-11-01" disabled={false} change={async () => false}/>);
    expect(html).toMatch(/disabled=""[^>]*>Check current saved draft/);
    expect(html).toContain("No matching saved draft in this session");
    expect(html).not.toContain("Coverage draft review ID");
});
it("defaults explicit new intent and decision drafts to the visible maximum retention day", () => {
    for (const kind of ["preference", "owner_constraint", "decision"] as const) {
        expect(newMemoryDraft(kind, "2026-11-01", id)).toMatchObject({ expiryDate: "2027-10-31", focus: { kind: "general" } });
    }
});
it("offers a check only for the matching saved coverage date in current session context", () => {
    const m = applyMemoryCommand(emptyMemory(), parseMemoryCommand({ op: "memory", requestId: id, expectedRevision: 0, change: { kind: "save_decision", decisionId: id, summary: "Keep draft", course: "Review allocation", reason: "Coverage", focus: { kind: "coverage", date: "2026-11-02" }, decisionDate: "2026-11-01", expiryDate: "2026-11-30" } }), now);
    const savedDraft: import("@/lib/owner-advisor/coverage-actions").CoverageActionResult = { state: "coverage_saved", progress: null, receipt: { operationId: id, reviewId: id, savedAt: now, count: 1 }, review: { id, date: "2026-11-02", timeZone: "America/Puerto_Rico", sourceVersion: "a".repeat(64), preparedAt: now, expiresAt: "2026-11-01T12:05:00.000Z", assignments: [{ employeeId: "fictional", employeeName: "Fictional Worker", locationId: "fictional-place", locationName: "Fictional Place", startTime: "08:00", endTime: "12:00", positionId: null, positionName: null, isDesignatedLead: false }], coverage: { requiredMinutes: 240, coveredMinutes: 240, requiredObligationMinutes: 0, fulfilledObligationMinutes: 0, remainingBlocks: 0 }, partial: false } };
    const render = (value: typeof savedDraft) => renderToStaticMarkup(<MemoryPanel memory={m} date="2026-11-01" disabled={false} change={async () => false} savedDraft={value}/>);
    expect(render(savedDraft)).not.toMatch(/disabled=""[^>]*>Check current saved draft/);
    expect(render({ ...savedDraft, review: { ...savedDraft.review, date: "2026-11-03" } })).toMatch(/disabled=""[^>]*>Check current saved draft/);
    expect(render({ ...savedDraft, receipt: null })).toMatch(/disabled=""[^>]*>Check current saved draft/);
});
