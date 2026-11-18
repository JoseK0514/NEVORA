import { describe, expect, it } from '@rstest/core';
import { parseAnswer } from "./public-response";

// Fictional IDs only. The forms are the backend's own: reviewHref(id) in weekly-tool.server.ts and
// knowledgeSourceHref(documentId, versionId) in company-knowledge.ts (Codex dfaa5447).
const REVIEW = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", DOC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const COMPARISON = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const weeklyHref = (id: string) => `/app/ai-manager/weekly?review=${id}`;
const knowledgeHref = (documentId: string, versionId: string) => `/api/owner/advisor/knowledge/entries/${documentId}/versions/${versionId}`;
const measure = (covered: number) => ({ requiredMinutes: 960, coveredMinutes: covered, requiredObligationMinutes: 960, fulfilledObligationMinutes: covered, remainingBlocks: covered < 960 ? 1 : 0 });
const option = (id = REVIEW, extra: Record<string, unknown> = {}) => ({ id, termsDigest: "e".repeat(64), search: "STANDARD", status: "COMPLETE", applyEligible: true, inspectionReasons: [],
  added: 2, removed: 0, preservedAssignments: 3, addedMinutes: 480, removedMinutes: 0, coverage: measure(960),
  remaining: { total: 1, items: [{ date: "2026-11-16", locationId: "loc-1", locationName: "Fictional Bakery", startTime: "20:00", endTime: "24:00", missingStaff: 1, requiresLead: null, positions: [], positionsOmitted: 0 }] },
  issues: { total: 0, items: [] }, reviewHref: weeklyHref(id), ...extra });
const weeklyPlans = (extra: Record<string, unknown> = {}) => ({ state: "ready", reason: null, weekStart: "2026-11-16", timeZone: "America/Puerto_Rico", observedAt: "2026-11-16T12:00:00.000Z",
  sourceVersion: "src-1", locationScope: { kind: "ALL" }, mode: "FILL_GAPS_ONLY", minuteBasis: "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME",
  fairness: { windowWeeks: 8, employeesWithKnownWeekends: 4, employeesWithoutKnownWeekends: 1, basis: "CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION", monetaryCosts: "UNAVAILABLE" },
  partial: false, baseline: measure(480), alternatives: [option()], locations: [{ id: "loc-1", name: "Fictional Bakery", state: "INCLUDED", issues: [] }],
  computation: { elapsedMs: 10, yields: 0, maxSliceMs: 5, limits: { maxNodes: 1, maxEvaluations: 1, maxPeriods: 1, maxAdditions: 1, maxRemovals: 1, totalMs: 1, alternativeMs: 1 }, searches: [] },
  comparisonId: COMPARISON, occurrence: 0, expiresAt: "2026-11-16T12:05:00.000Z", sourceFence: "f".repeat(64), ...extra });
const answer = (extra: Record<string, unknown> = {}, sources: { label: string; href: string }[] = []) => ({
  state: "answered", authority: "owner-authority", observedAt: "2026-11-16T12:00:01.000Z", validForMs: 15000,
  answer: { text: "Fictional answer.", sources: sources.map(s => ({ ...s, observedAt: "2026-11-16T12:00:00.000Z" })), ...extra },
});

describe("Rondo answer citations", () => {
  it("accepts the real weekly review and company-guidance version links", () => {
    expect(() => parseAnswer(answer({}, [{ label: "Weekly draft comparison", href: weeklyHref(REVIEW) }, { label: "Company guidance: Opening", href: knowledgeHref(DOC, OTHER) }]))).not.toThrow();
  });
  it.each([
    ["an extra query field", `${weeklyHref(REVIEW)}&week=2026-11-16`],
    ["a fragment", `${weeklyHref(REVIEW)}#plan`],
    ["another field name", `/app/ai-manager/weekly?id=${REVIEW}`],
    ["a non-UUIDv4 review", "/app/ai-manager/weekly?review=12345"],
    ["an uppercase UUID", weeklyHref(REVIEW.toUpperCase())],
    ["an external weekly link", `https://example.invalid${weeklyHref(REVIEW)}`],
    ["a protocol-relative link", `//example.invalid${weeklyHref(REVIEW)}`],
    ["the weekly page without a review", "/app/ai-manager/weekly"],
    ["a knowledge link with a query", `${knowledgeHref(DOC, OTHER)}?raw=1`],
    ["a knowledge link with a trailing slash", `${knowledgeHref(DOC, OTHER)}/`],
    ["the knowledge list endpoint", "/api/owner/advisor/knowledge"],
    ["an external knowledge link", `https://example.invalid${knowledgeHref(DOC, OTHER)}`],
  ])("rejects %s", (_name, href) => {
    expect(() => parseAnswer(answer({}, [{ label: "Source", href }]))).toThrow();
  });
});

describe("Rondo answer weekly projection", () => {
  it("keeps legacy answers and their context shape unchanged", () => {
    expect(parseAnswer(answer({ context: { notebookRevision: 3, taskId: null } })).answer.weeklyPlans).toBeUndefined();
    expect(() => parseAnswer(answer({ context: { notebookRevision: 3, taskId: null, weeklyPlans: 1 } }))).toThrow();
  });
  it("accepts the real read-only projection, including a 24:00 day-end gap", () => {
    const parsed = parseAnswer(answer({ weeklyPlans: weeklyPlans() }, [{ label: "Weekly draft comparison", href: weeklyHref(REVIEW) }]));
    expect(parsed.answer.weeklyPlans?.alternatives[0].reviewHref).toBe(weeklyHref(REVIEW));
  });
  it.each([
    ["a review link that isn't its own option's", { alternatives: [option(REVIEW, { reviewHref: weeklyHref(OTHER) })] }],
    ["an occurrence past the tool budget", { occurrence: 8 }],
    ["a malformed source fence", { sourceFence: "F".repeat(64) }],
    ["a comparison ID that isn't a UUIDv4", { comparisonId: "comparison-1" }],
    ["a mode the read-only tool can't run", { mode: "BUILD_WEEK" }],
    ["a read handle", { readReceiptId: REVIEW }],
    ["a full change set on an option", { alternatives: [option(REVIEW, { changes: { additions: [], removals: [] } })] }],
    ["a 24:00 start boundary", { alternatives: [option(REVIEW, { remaining: { total: 1, items: [{ date: "2026-11-16", locationId: "loc-1", locationName: "Fictional Bakery", startTime: "24:00", endTime: "24:00", missingStaff: 1, requiresLead: null, positions: [], positionsOmitted: 0 }] } })] }],
  ])("rejects %s", (_name, change) => {
    expect(() => parseAnswer(answer({ weeklyPlans: weeklyPlans(change) }))).toThrow();
  });
  it("never accepts the server's weekly inspection custody", () => {
    expect(() => parseAnswer(answer({ weeklyInspectionRefs: [{ comparisonId: COMPARISON, occurrence: 0 }] }))).toThrow();
    expect(() => parseAnswer(answer({ weeklyPlans: weeklyPlans(), weeklyInspectionRefs: [] }))).toThrow();
  });
});
