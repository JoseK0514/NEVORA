import { describe, expect, it, rs } from '@rstest/core';
import {
  PENDING_STORAGE_NAME, WEEKLY_HEADER, applyCommand, clearPending, clockText, createWeeklyClient, hours, loadPending, parseWeeklyResult, savePending, weekText, type PendingApply,
} from "./weekly-client";
import { parseWeeklyCommand } from "./weekly-contracts";

// Fictional IDs only.
const REVIEW = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", HANDLE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc", OP = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const DIGEST = "e".repeat(64);
const measure = (covered: number, required = 960) => ({ requiredMinutes: required, coveredMinutes: covered, requiredObligationMinutes: required, fulfilledObligationMinutes: covered, remainingBlocks: covered < required ? 2 : 0 });
const fairness = { windowWeeks: 8, employeesWithKnownWeekends: 5, employeesWithoutKnownWeekends: 1, basis: "CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION", monetaryCosts: "UNAVAILABLE" };
const shift = (name: string, date = "2026-11-16") => ({ employeeId: `emp-${name}`, locationId: "loc-1", date, startTime: "08:00", endTime: "12:00", positionId: null, isDesignatedLead: false,
  employeeName: `${name} Fictional`, locationName: "Fictional Bakery", positionName: null });
const summary = (extra: Record<string, unknown> = {}) => ({ id: REVIEW, termsDigest: DIGEST, search: "STANDARD", status: "COMPLETE", applyEligible: true, inspectionReasons: [],
  added: 2, removed: 0, preservedAssignments: 3, addedMinutes: 480, removedMinutes: 0, coverage: measure(960), remaining: { total: 0, items: [] }, issues: { total: 0, items: [] }, ...extra });
const comparison = (alternatives = [summary()]) => ({ state: "ready", reason: null, weekStart: "2026-11-16", timeZone: "America/Puerto_Rico", observedAt: "2026-11-16T12:00:00.000Z",
  sourceVersion: "v1", locationScope: { kind: "ALL" }, mode: "FILL_GAPS_ONLY", minuteBasis: "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME", fairness, partial: false, baseline: measure(480),
  alternatives, locations: [{ id: "loc-1", name: "Fictional Bakery", state: "INCLUDED", issues: [] }, { id: "loc-2", name: "Fictional Kiosk", state: "PUBLISHED", issues: [] }],
  computation: { elapsedMs: 120, yields: 2, maxSliceMs: 30, limits: { maxNodes: 1, maxEvaluations: 1, maxPeriods: 1, maxAdditions: 1, maxRemovals: 1, totalMs: 1, alternativeMs: 1 }, searches: [] } });
const review = (extra: Record<string, unknown> = {}) => ({ ...summary(), weekStart: "2026-11-16", timeZone: "America/Puerto_Rico", observedAt: "2026-11-16T12:00:00.000Z", expiresAt: "2026-11-16T12:10:00.000Z",
  sourceVersion: "v1", contextDigest: "ctx", locationScope: { kind: "ALL" }, mode: "FILL_GAPS_ONLY", fairness, minuteBasis: "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME",
  changes: { additions: [shift("Ana"), shift("Luis", "2026-11-17")], removals: [] }, ...extra });
const result = (extra: Record<string, unknown> = {}) => ({ state: "ready", comparison: comparison(), review: null, readReceiptId: null, receipt: null, progress: null,
  authority: "owner-authority-1", observedAt: "2026-11-16T12:00:01.000Z", validForMs: 15000, ...extra });

describe("reading weekly answers", () => {
  it("reads a comparison and a complete review with its read handle", () => {
    expect(parseWeeklyResult(result()).comparison?.alternatives[0].id).toBe(REVIEW);
    const full = parseWeeklyResult(result({ review: review(), readReceiptId: HANDLE }));
    expect(full.review?.changes.additions).toHaveLength(2);
    expect(full.readReceiptId).toBe(HANDLE);
  });
  it("refuses a review whose lists don't match its counts, so a shortened set can never be approved", () => {
    expect(() => parseWeeklyResult(result({ review: review({ added: 3 }), readReceiptId: HANDLE }))).toThrow();
    expect(() => parseWeeklyResult(result({ review: review({ removed: 1 }) }))).toThrow();
  });
  it("refuses a review that isn't one of its comparison's options, and a read handle on a look-only plan", () => {
    expect(() => parseWeeklyResult(result({ review: review({ id: OTHER }) }))).toThrow();
    const lookOnly = result({ comparison: comparison([summary({ applyEligible: false, inspectionReasons: ["NO_CHANGE"] })]),
      review: review({ applyEligible: false, inspectionReasons: ["NO_CHANGE"] }), readReceiptId: HANDLE });
    expect(() => parseWeeklyResult(lookOnly)).toThrow();
    expect(parseWeeklyResult({ ...lookOnly, readReceiptId: null }).review?.applyEligible).toBe(false);
  });
  it("holds every private answer to a 1 to 15000 ms lease and a named authority", () => {
    expect(() => parseWeeklyResult(result({ validForMs: 0 }))).toThrow();
    expect(() => parseWeeklyResult(result({ validForMs: 15001 }))).toThrow();
    expect(() => parseWeeklyResult(result({ authority: "" }))).toThrow();
  });
  it("reads saved, stale and unavailable answers, and a historical receipt without progress", () => {
    const receipt = { operationId: OP, reviewId: REVIEW, termsDigest: DIGEST, savedAt: "2026-11-16T12:05:00Z", added: 2, removed: 0, preservedAssignments: 3, createdParentIds: ["sched-1"] };
    expect(parseWeeklyResult(result({ state: "saved", comparison: null, receipt, progress: { state: "mixed", observedAt: "2026-11-16T12:06:00Z", assignmentsPresent: 2, assignmentsTotal: 2, publishedAssignments: 1, coverage: measure(960) } })).progress?.state).toBe("mixed");
    expect(parseWeeklyResult(result({ state: "saved", comparison: null, receipt })).progress).toBeNull();
    expect(() => parseWeeklyResult(result({ state: "saved", comparison: null }))).toThrow();
    expect(parseWeeklyResult(result({ state: "stale", comparison: null })).state).toBe("stale");
    expect(() => parseWeeklyResult(result({ state: "stale", comparison: null, review: review() }))).toThrow();
  });
  it("reads an unavailable comparison (input or result limit) with no options", () => {
    expect(parseWeeklyResult(result({ comparison: { ...comparison([]), state: "unavailable", reason: "RESULT_LIMIT" } })).comparison?.reason).toBe("RESULT_LIMIT");
    expect(() => parseWeeklyResult(result({ comparison: { ...comparison(), state: "unavailable", reason: "INPUT_LIMIT" } }))).toThrow();
  });
  it("never lets a listed gap or issue exceed its total", () => {
    const gap = { date: "2026-11-16", locationId: "loc-1", locationName: "Fictional Bakery", startTime: "12:00", endTime: "16:00", missingStaff: 1, requiresLead: null, positions: [], positionsOmitted: 0 };
    expect(() => parseWeeklyResult(result({ comparison: comparison([summary({ remaining: { total: 0, items: [gap] } })]) }))).toThrow();
    expect(parseWeeklyResult(result({ comparison: comparison([summary({ remaining: { total: 5, items: [gap] } })]) })).comparison?.alternatives[0].remaining.total).toBe(5);
  });
});

describe("saved coverage scope", () => {
  const receipt = { operationId: OP, reviewId: REVIEW, termsDigest: DIGEST, savedAt: "2026-11-16T12:05:00Z", added: 2, removed: 0, preservedAssignments: 3, createdParentIds: ["sched-1"] };
  const saved = (progress: Record<string, unknown>) => result({ state: "saved", comparison: null, receipt,
    progress: { state: "draft", observedAt: "2026-11-16T12:06:00Z", assignmentsPresent: 2, assignmentsTotal: 2, publishedAssignments: 0, coverage: measure(480), ...progress } });
  it("keeps the reviewed locations when the scope is unchanged", () => {
    expect(parseWeeklyResult(saved({ coverageScope: { includedLocationIds: ["loc-1"], changed: false } })).progress?.coverageScope).toEqual({ includedLocationIds: ["loc-1"], changed: false });
  });
  it("reads a changed scope only with the changed state", () => {
    expect(parseWeeklyResult(saved({ state: "changed", coverageScope: { includedLocationIds: ["loc-1"], changed: true } })).progress?.coverageScope?.changed).toBe(true);
    expect(() => parseWeeklyResult(saved({ state: "draft", coverageScope: { includedLocationIds: ["loc-1"], changed: true } }))).toThrow();
  });
  it("reads coverage that can't be measured for the reviewed locations as null", () => {
    expect(parseWeeklyResult(saved({ coverage: null, coverageScope: { includedLocationIds: ["loc-1", "loc-2"], changed: false } })).progress?.coverage).toBeNull();
  });
  it("still reads older answers without a scope, and refuses a malformed one", () => {
    expect(parseWeeklyResult(saved({})).progress?.coverageScope).toBeUndefined();
    expect(() => parseWeeklyResult(saved({ coverageScope: { includedLocationIds: ["loc-1", "loc-1"], changed: false } }))).toThrow();
    expect(() => parseWeeklyResult(saved({ coverageScope: { includedLocationIds: ["loc-1"] } }))).toThrow();
    expect(() => parseWeeklyResult(saved({ coverageScope: { includedLocationIds: "loc-1", changed: false } }))).toThrow();
  });
});

describe("day-end boundaries", () => {
  const gap = (startTime: string, endTime: string) => ({ date: "2026-11-16", locationId: "loc-1", locationName: "Fictional Bakery", startTime, endTime, missingStaff: 1, requiresLead: null, positions: [], positionsOmitted: 0 });
  const withGap = (g: unknown) => result({ comparison: comparison([summary({ coverage: measure(720), remaining: { total: 1, items: [g] } })]) });
  it("accepts 24:00 as the end of a day-end gap and of a planned shift, and keeps overnight ends", () => {
    expect(parseWeeklyResult(withGap(gap("20:00", "24:00"))).comparison?.alternatives[0].remaining.items[0].endTime).toBe("24:00");
    expect(parseWeeklyResult(withGap(gap("22:00", "02:00"))).comparison?.alternatives[0].remaining.items[0].endTime).toBe("02:00");
    const lateShift = { ...shift("Ana"), startTime: "20:00", endTime: "24:00" };
    expect(parseWeeklyResult(result({ review: review({ changes: { additions: [lateShift, shift("Luis", "2026-11-17")], removals: [] } }), readReceiptId: HANDLE })).review?.changes.additions[0].endTime).toBe("24:00");
  });
  it("never accepts 24:00 as a start, or other out-of-day times", () => {
    expect(() => parseWeeklyResult(withGap(gap("24:00", "24:00")))).toThrow();
    expect(() => parseWeeklyResult(withGap(gap("20:00", "24:30")))).toThrow();
    expect(() => parseWeeklyResult(withGap(gap("20:00", "25:00")))).toThrow();
    const bad = { ...shift("Ana"), startTime: "24:00", endTime: "24:00" };
    expect(() => parseWeeklyResult(result({ review: review({ changes: { additions: [bad, shift("Luis", "2026-11-17")], removals: [] } }), readReceiptId: HANDLE }))).toThrow();
  });
  it("says the day's end as midnight", () => expect(clockText("24:00")).toBe("12:00\u202FAM"));
});

describe("a pending approval across a reload", () => {
  const pending: PendingApply = { reviewId: REVIEW, requestId: OP, termsDigest: DIGEST, readReceiptId: HANDLE, acknowledged: true, authority: "owner-authority-1" };
  const memory = () => { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); }, map }; };
  it("keeps only the command metadata, and resends exactly the original approval", () => {
    const store = memory();
    savePending(store, pending);
    expect(Object.keys(JSON.parse(store.map.get(PENDING_STORAGE_NAME)!)).sort()).toEqual(["acknowledged", "authority", "readReceiptId", "requestId", "reviewId", "termsDigest"]);
    expect(loadPending(store)).toEqual(pending);
    // The resent command is the original one, accepted by the backend's own parser.
    expect(parseWeeklyCommand(applyCommand(pending))).toEqual({ op: "apply_week_plan", requestId: OP, reviewId: REVIEW, termsDigest: DIGEST, readReceiptId: HANDLE, acknowledged: true });
    clearPending(store); expect(loadPending(store)).toBeNull();
  });
  it("throws away anything else stored under the key (names, edits, a broken value)", () => {
    const store = memory();
    store.setItem(PENDING_STORAGE_NAME, JSON.stringify({ ...pending, employeeNames: ["Ana"] })); expect(loadPending(store)).toBeNull(); expect(store.map.has(PENDING_STORAGE_NAME)).toBe(false);
    store.setItem(PENDING_STORAGE_NAME, "{not json"); expect(loadPending(store)).toBeNull();
    store.setItem(PENDING_STORAGE_NAME, JSON.stringify({ ...pending, acknowledged: false })); expect(loadPending(store)).toBeNull();
  });
  it("survives a browser that refuses storage", () => {
    const broken = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("blocked"); }, removeItem: () => { throw Error("blocked"); } };
    expect(() => savePending(broken, pending)).not.toThrow();
    expect(loadPending(broken)).toBeNull();
  });
});

describe("transport", () => {
  const command = { op: "check_week_plan" as const, requestId: OP, reviewId: REVIEW };
  it("posts the exact command with the adviser header, same-origin", async () => {
    const fetcher = rs.fn(async () => new Response(JSON.stringify(result()), { status: 200 }));
    const outcome = await createWeeklyClient(fetcher)(command);
    expect(outcome.kind).toBe("result");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/owner/advisor/weekly");
    expect(init.method).toBe("POST"); expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual({ [WEEKLY_HEADER]: "1", "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual(command);
  });
  it.each([[400, "invalid"], [401, "forbidden"], [403, "forbidden"], [409, "conflict"], [429, "limit"]])("maps %i to %s", async (status, kind) => {
    expect((await createWeeklyClient(async () => new Response("{}", { status }))(command)).kind).toBe(kind);
  });
  it("tells a switched-off workflow apart from an answer that may have been lost", async () => {
    const respond = (code: string) => createWeeklyClient(async () => new Response(JSON.stringify({ state: "error", code }), { status: 503 }))(command);
    expect((await respond("disabled")).kind).toBe("disabled");
    for (const code of ["unavailable", "cancelled", "busy", "prior_attempt_failed"]) expect(await respond(code)).toEqual({ kind: "uncertain", code });
    expect((await createWeeklyClient(async () => { throw new TypeError("offline"); })(command)).kind).toBe("uncertain");
    expect((await createWeeklyClient(async () => new Response("<html>", { status: 200 }))(command)).kind).toBe("uncertain");
  });
});

describe("words", () => {
  it("says weeks, times and hours the way the schedule does", () => {
    expect(weekText("2026-11-16")).toBe("Nov 16 – 22");
    expect(weekText("2026-11-30")).toBe("Nov 30 – Dec 6");
    expect(clockText("08:00")).toBe("8:00 AM");
    expect(clockText("16:30")).toBe("4:30 PM");
    expect(clockText("00:15")).toBe("12:15 AM");
    expect(hours(480)).toBe("8 h"); expect(hours(90)).toBe("1.5 h");
  });
});
