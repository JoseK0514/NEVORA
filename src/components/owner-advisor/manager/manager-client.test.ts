import { describe, expect, it } from "@rstest/core";
import { answerText, dayFacts, managerRondoUrl, minutesText, parseManagerRondo, readManagerRondo } from "./manager-client";

// Fictional values (Northside QA Workforce). Shapes follow docs/handoffs/2026-11-18-rondo-manager-ui-contract.md.
const at = "2026-11-18T11:00:00.000Z";
const place = { id: "loc-1", name: "Northside Main Office" };
const day = (date: string, extra: Partial<Record<"draftShifts" | "publishedShifts" | "releasedShifts" | "scheduledMinutes", number>> = {}) =>
  ({ date, draftShifts: 0, publishedShifts: 0, releasedShifts: 0, scheduledMinutes: 0, ...extra });
const week = ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06"].map(date => day(date));
const ok = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const weeklyQuery = { view: "weekly" as const, weekStart: "2026-11-30", locationId: "loc-1" };
const answerQuery = { view: "answer" as const, weekStart: "2026-11-30", locationId: "loc-1", question: "scheduled_minutes" as const };

describe("the Manager Rondo client", () => {
  it("asks for one view at a time, each parameter once", () => {
    expect(managerRondoUrl({ view: "context" })).toBe("/api/manager/advisor");
    expect(managerRondoUrl(weeklyQuery)).toBe("/api/manager/advisor?view=weekly&weekStart=2026-11-30&locationId=loc-1");
    expect(managerRondoUrl(answerQuery)).toBe("/api/manager/advisor?view=answer&weekStart=2026-11-30&locationId=loc-1&question=scheduled_minutes");
  });

  it("sends the contract's header on a same-origin, uncached read", async () => {
    let seen: RequestInit | undefined;
    await readManagerRondo({ view: "context" }, undefined, async (_input, init) => { seen = init; return new Response("{}", { status: 503 }); });
    expect(seen).toMatchObject({ method: "GET", credentials: "same-origin", cache: "no-store" });
    expect((seen?.headers as Record<string, string>)["x-nevora-manager-advisor"]).toBe("1");
  });

  it("maps each refusal to its own state", async () => {
    for (const [status, kind] of [[401, "session"], [403, "forbidden"], [404, "disabled"], [400, "invalid"], [503, "unavailable"], [500, "unavailable"]] as const)
      expect((await readManagerRondo({ view: "context" }, undefined, ok({ state: "error", code: "x" }, status))).kind, String(status)).toBe(kind);
    expect((await readManagerRondo({ view: "context" }, undefined, async () => { throw new TypeError("offline"); })).kind).toBe("unavailable");
    const controller = new AbortController(); controller.abort();
    expect((await readManagerRondo({ view: "context" }, controller.signal, async () => { throw new DOMException("aborted", "AbortError"); })).kind).toBe("aborted");
  });

  it("keeps a ready read with the moment it arrived, for its lease", async () => {
    const result = await readManagerRondo({ view: "context" }, undefined,
      ok({ state: "ready", view: "context", questionMode: "guided", questions: ["draft_shifts", "published_shifts", "released_shifts", "scheduled_minutes"], locations: [place], observedAt: at, validForMs: 14980 }), () => 1000);
    expect(result).toEqual({ kind: "ok", receivedAt: 1000, data: { locations: [place], questions: ["draft_shifts", "published_shifts", "released_shifts", "scheduled_minutes"], observedAt: at, validForMs: 14980 } });
  });

  it("treats a reply that does not match the question asked as unavailable, never as zero", () => {
    const weekly = { state: "ready", view: "weekly", weekStart: "2026-11-30", location: place, days: week, observedAt: at, validForMs: 14980 };
    expect(parseManagerRondo(weeklyQuery, weekly)).not.toBeNull();
    expect(parseManagerRondo(weeklyQuery, { ...weekly, weekStart: "2026-12-07" })).toBeNull();
    expect(parseManagerRondo(weeklyQuery, { ...weekly, location: { id: "loc-2", name: "Northside West Office" } })).toBeNull();
    expect(parseManagerRondo(weeklyQuery, { ...weekly, days: week.slice(1) })).toBeNull();
    expect(parseManagerRondo(weeklyQuery, { ...weekly, days: [...week.slice(1), { ...week[0], scheduledMinutes: -5 }] })).toBeNull();
    expect(parseManagerRondo(answerQuery, { state: "ready", view: "answer", question: "draft_shifts", value: 3, weekStart: "2026-11-30", location: place, observedAt: at, validForMs: 14980 })).toBeNull();
    expect(parseManagerRondo(answerQuery, { state: "ready", view: "answer", question: "scheduled_minutes", value: "480", weekStart: "2026-11-30", location: place, observedAt: at, validForMs: 14980 })).toBeNull();
    expect(parseManagerRondo(answerQuery, { state: "ready", view: "answer", question: "scheduled_minutes", value: 480, weekStart: "2026-11-30", location: place, observedAt: at, validForMs: 14980 }))
      .toMatchObject({ value: 480, question: "scheduled_minutes" });
    expect(parseManagerRondo({ view: "context" }, { state: "error", code: "unavailable" })).toBeNull();
  });
});

describe("the words", () => {
  it("says planned hours to the minute", () => {
    expect(minutesText(0)).toBe("0 h");
    expect(minutesText(45)).toBe("45 min");
    expect(minutesText(480)).toBe("8 h");
    expect(minutesText(450)).toBe("7 h 30 min");
    expect(minutesText(41385)).toBe("689 h 45 min");
  });
  it("says what each figure counts, and that hours are planned time", () => {
    expect(answerText({ question: "scheduled_minutes", value: 480 })).toEqual({ figure: "8 h", line: "Planned time from the schedule. Timecards show hours worked." });
    expect(answerText({ question: "published_shifts", value: 1 }).figure).toBe("1 shift");
    expect(answerText({ question: "draft_shifts", value: 0 })).toEqual({ figure: "0 drafts", line: "No drafts for this week." });
    expect(answerText({ question: "released_shifts", value: 2 }).line).toContain("Can’t work");
  });
  it("lists a day's shifts without zero facts", () => {
    expect(dayFacts(day("2026-11-30"))).toEqual(["No shifts"]);
    expect(dayFacts(day("2026-11-30", { publishedShifts: 3, draftShifts: 1, releasedShifts: 1 }))).toEqual(["3 shifts", "1 draft", "1 released"]);
  });
});
