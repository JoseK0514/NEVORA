import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';
import type { Today, TodayShift } from "@/lib/today/project";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import { parseActionCenter } from "@/lib/action-center/project";
import { needsYou } from "@/lib/action-center/needs-you";
import { reviewFacts } from "@/lib/action-center/review-facts";
import { requestShift, type ActionRequestFacts } from "@/lib/action-center/request-facts";
import { projectReports } from "@/lib/reports/project";
import type { CoverageMinutes } from "@/lib/scheduling/coverage-minutes";
import { onlyB, withoutB } from "../owner-b/test-support";
import { reviewCopy } from "./copy";
import { Explain } from "./explain";

/* Phase 4 package D (U03, U09): the screens' states on fictional data. Home and Things to do render their Direction B
 * screen and the older corporate cards in one tree, so "every Home shows the same count" is checked on both. */
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app" }));
rs.mock("@/app/app/requests/actions", () => ({ reviewTimeOffAction: async () => {} }));
rs.mock("@/components/leave-staffing/use-leave-staffing", () => ({ useLeaveStaffing: () => ({ state: { status: "loading" } }) }));
const { OwnerHomeCorp } = await import("../owner-home-corp");
const { ThingsToDoPage } = await import("../manager-inbox-corp");
const { CorpReportsView } = await import("../reports");
const { ScheduleCoverageLine } = await import("../schedule-coverage-line");
const { CoverageFigures } = await import("../coverage-minutes/coverage-minutes");

const t = reviewCopy();
// Phase 8: a word joiner keeps a range's dash with its end time; it is not read, so the text drops it.
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/[   ]/g, " ").replace(/\u2060/g, "").replace(/\s+/g, " ").trim();
const zone = "America/Puerto_Rico";
const shift = (id: string, status: TodayShift["status"], extra: Partial<TodayShift> = {}): TodayShift => ({ id, employeeId: id, employeeName: `Person ${id}`, locationId: "main", locationName: "Condado", positionName: "Barista",
  startAt: "2026-10-30T13:00:00Z", endAt: "2026-10-30T21:00:00Z", status, firstClockInAt: null, late: false, ...extra });
const today = (shifts: TodayShift[]): Today => ({ state: "ready", observedAt: "2026-10-30T15:00:00Z", validForMs: 60_000, timeZone: zone, today: "2026-10-30",
  counts: { scheduled: shifts.length, clockedIn: 0, late: 0, notClockedIn: 0 }, shifts, missed: [] });
const unavailable: Today = { state: "unavailable", reason: "read_failed" } as Today;
const card = (id: string, name: string, own = false, period = { startDate: "2026-10-19", endDate: "2026-10-25" }): ActionItem => ({
  id: `TIMECARD:${id}:${period.startDate}:${period.endDate}`, type: "TIMECARD", category: "timekeeping", priority: "REVIEW", title: own ? "Your timecard needs another reviewer" : "Period timecard needs review",
  detail: `${name} · Oct 19 – Oct 25`, href: `/app/timecards?start=${period.startDate}&end=${period.endDate}#timecard-${id}`, review: reviewFacts(own, own, "TIMECARD", period) } as ActionItem);
/** The contract's acceptance case: three closed timecards, two reviewable and one requiring another reviewer. */
const three = [card("a", "Ana Colón"), card("b", "Luis Ortiz"), card("me", "Carmen Ruiz", true)];
const base = {
  greeting: "Welcome back, Carmen", dateLabel: "Friday, October 30", summary: "", today: today([shift("a", "clocked_in")]), monitor: null, monitorPending: false, todayRefreshing: false, offline: false,
  connection: "ready" as const, value: needsYou(three, "2026-10-30", []), timecards: three, timecardsReady: true, businessDay: "2026-10-30",
  nextPay: { payday: "2026-11-03", daysUntil: 4, period: { startDate: "2026-10-26", endDate: "2026-11-01" } },
};
const home = (props: Partial<ComponentProps<typeof OwnerHomeCorp>> = {}) => renderToStaticMarkup(<OwnerHomeCorp {...base} {...props} />);
const week = (coverage?: CoverageMinutes, payrollHref?: string) => ({ firstName: "Carmen", days: [], scheduledHours: 120, people: 6, payrollHref, coverage });

describe("U03: Payday counts the same two timecards on every Home", () => {
  it("Manager frame (Direction B, every width): 2 to approve of 3, and the other card stays visible", () => {
    const out = text(onlyB(home()));
    expect(out).toContain("2 to approve");
    // Core check (Nov 23, 2026), each fact once: the count is the big line; the detail says when.
    expect(out).toContain("Pay period ended");
    expect(out).not.toContain("2 of 3 timecards");
    expect(out).toContain("Another reviewer approves your timecard");
    expect(out).not.toMatch(/3 to approve|3 timecards to review|An Owner approves/);
  });
  it("Owner frame with Payroll (Direction B): 2 timecards to review", () => {
    const out = text(onlyB(home({ week: week(undefined, "/app/payroll") })));
    expect(out).toContain("2 timecards to review");
    expect(out).toContain("Another reviewer approves your timecard");
    expect(out).not.toContain("3 timecards");
  });
  it("the older corporate card: Review 2 timecards, with the other-reviewer row and who can review it", () => {
    const out = text(withoutB(home()));
    expect(out).toContain("Review 2 timecards");
    expect(out).toContain("Another reviewer approves your timecard");
    expect(out).toContain("It needs an Owner or a Manager with company access.");
    expect(out).not.toContain("Review 3 timecards");
  });
  it("is the same count when the server's titles change or are translated", () => {
    const renamed = three.map((item, index) => ({ ...item, title: index === 0 ? "Your timecard needs another reviewer" : "Tarjeta por revisar" }));
    const out = home({ timecards: renamed, value: needsYou(renamed, "2026-10-30", []) });
    expect(text(onlyB(out))).toContain("2 to approve");
    expect(text(withoutB(out))).toContain("Review 2 timecards");
  });
  it("another person's card that needs another reviewer is counted apart, and no name or date is invented", () => {
    const delegated = [card("a", "Ana Colón"), { ...card("x", "Luis Ortiz"), review: reviewFacts(false, false, "TIMECARD", { startDate: "2026-10-19", endDate: "2026-10-25" }) }, card("me", "Carmen Ruiz", true), card("me2", "Elena Ruiz", true)];
    const out = text(onlyB(home({ timecards: delegated, value: needsYou(delegated, "2026-10-30", []) })));
    expect(out).toContain("2 to approve");
    expect(out).toContain("Another reviewer approves 2 timecards");
    expect(out).not.toMatch(/by (Mon|Tue|Wed|Thu|Fri|Sat|Sun)|approves by|due/i);
  });
  it("older payloads without review facts make the count a lower bound, never a complete total or \"none waiting\"", () => {
    const legacy = { ...card("old", "Sofía Méndez") }; delete legacy.review;
    const mixed = text(onlyB(home({ timecards: [...three, legacy] })));
    expect(mixed).toContain("At least 2 to approve");
    expect(mixed).toContain("1 timecard could not be checked");
    const only = text(onlyB(home({ timecards: [legacy] })));
    expect(only).toContain("1 timecard could not be checked");
    expect(only).not.toContain("None waiting");
    expect(text(withoutB(home({ timecards: [...three, legacy] })))).toContain("Review at least 2 timecards");
  });
});

describe("U03: totals say how complete they are", () => {
  const request = (id: string, name: string): ActionItem => ({ id, type: "TIME_OFF", category: "requests", priority: "REVIEW", title: "Time off", detail: `${name} is waiting for review.`, href: "/app/requests?tab=pending&requestId=r1" } as ActionItem);
  it("Home with clock-ins unread: \"At least N\", never \"You're all set\"", () => {
    const items = [request("r1", "Ana Colón"), request("r2", "Luis Ortiz")];
    const out = onlyB(home({ today: unavailable, value: needsYou(items, "2026-10-30", []), timecards: [] }));
    expect(text(out)).toContain("At least 2 things need you");
    // The band's title carries the lower bound; the card repeats no count (Jose, Nov 22, 2026: no fact twice).
    expect(out).not.toContain('<span class="b-pill">At least 2</span>');
    expect(text(out)).toContain(t.clockInsUnchecked);
    expect(text(out)).not.toContain("You’re all set");
  });
  it("Home with nothing observed and clock-ins unread: not all-clear", () => {
    const out = text(onlyB(home({ today: unavailable, value: needsYou([], "2026-10-30", []), timecards: [] })));
    expect(out).toContain("Not everything could be checked");
    expect(out).toContain("Clock-ins can’t be checked right now.");
    expect(out).not.toMatch(/You’re all set|Nothing needs you right now/);
    expect(text(withoutB(home({ today: unavailable, value: needsYou([], "2026-10-30", []), timecards: [] })))).not.toContain("You’re all set");
  });
  it("Home with every source read keeps the exact count and the all-clear", () => {
    expect(text(onlyB(home({ value: needsYou([request("r1", "Ana Colón")], "2026-10-30", []), timecards: [] })))).toContain("1 thing needs you");
    expect(text(onlyB(home({ value: needsYou([], "2026-10-30", []), timecards: [] })))).toContain("You’re all set");
  });
});

const ready = (items: ActionItem[]): Extract<ActionCenter, { state: "ready" }> => {
  const counts = { total: items.length, scheduling: 0, requests: 0, timekeeping: 0 }; for (const item of items) counts[item.category]++;
  return { state: "ready", observedAt: "2026-10-30T15:00:00Z", validForMs: 30000, weekStart: "2026-10-26", items, counts, limitedAttendance: false };
};
const inbox = (items: ActionItem[], props: Partial<ComponentProps<typeof ThingsToDoPage>> = {}) =>
  renderToStaticMarkup(<ThingsToDoPage snapshot={ready(items)} today={today([])} connection="ready" onRefresh={() => {}} timeZone={zone} {...props} />);
const exchange = (id: string, who: string, request: Partial<ActionRequestFacts>): ActionItem => ({ id: `EXCHANGE:${id}`, type: "EXCHANGE", category: "requests", priority: "REVIEW", title: "Shift exchange waiting for review",
  detail: `${who} is waiting for review.`, dateTime: "2026-10-29T15:00:00Z", href: `/app/exchange?tab=pending&requestId=${id}`,
  request: { startDate: "2026-11-02", endDate: "2026-11-02", lengthText: "8 h", locationName: "Condado", reviewHref: `/app/exchange?tab=pending&requestId=${id}`, ...request } } as ActionItem);
const day = (date: string, start: string, end: string, place: string) => requestShift(date, start, end, place, zone);

describe("U09: request details in Things to do", () => {
  const items = [
    exchange("swap-ready", "Ana Colón", { exchangeKind: "SWAP", counterpartName: "James Ortiz", status: "MANAGER_PENDING", shift: day("2026-11-02", "08:00", "16:00", "Condado"), counterpartShift: { state: "ready", ...day("2026-11-04", "22:00", "06:00", "Santurce") } }),
    exchange("swap-withheld", "Luis Ortiz", { exchangeKind: "SWAP", counterpartName: "Gabriela Santos", status: "MANAGER_PENDING", shift: day("2026-11-03", "12:00", "20:00", "Condado"), counterpartShift: { state: "unavailable", reason: "details_unavailable" } }),
    exchange("swap-missing", "Carlos Vega", { exchangeKind: "SWAP", status: "MANAGER_PENDING", shift: day("2026-11-05", "16:00", "24:00", "Condado") }),
    exchange("cover-picked", "Sofía Méndez", { exchangeKind: "COVERAGE", counterpartName: "Daniel Cruz", status: "MANAGER_PENDING", shift: day("2026-11-05", "09:00", "17:00", "Condado") }),
    exchange("cover-nobody", "Valeria Torres", { exchangeKind: "COVERAGE", status: "OPEN", shift: day("2026-11-02", "10:00", "18:00", "Santurce") }),
    exchange("cover-withdrawn", "Miguel Reyes", { exchangeKind: "COVERAGE", status: "CANCELLED", shift: day("2026-11-03", "07:00", "15:00", "Condado") }),
    exchange("cover-expired", "Carmen Díaz", { exchangeKind: "COVERAGE", status: "EXPIRED", shift: day("2026-11-02", "14:00", "22:00", "Condado") }),
    exchange("cover-unknown", "Pedro Rivera", { exchangeKind: "COVERAGE", shift: day("2026-11-05", "06:00", "14:00", "Santurce") }),
  ];
  it("the fixture is a valid action center payload", () => { expect(() => parseActionCenter(ready(items), "2026-10-26")).not.toThrow(); });
  for (const [name, pick] of [["Direction B", onlyB], ["corporate", withoutB]] as const) {
    it(`${name}: a swap shows both shifts, date, time and place, and an overnight end names its day`, () => {
      const out = text(pick(inbox(items)));
      expect(out).toContain("Ana Colón and James Ortiz");
      expect(out).toContain("Ana’s shift: Mon, Nov 2 · 8:00 AM – 4:00 PM · Condado");
      expect(out).toContain("James’ shift: Wed, Nov 4 · 10:00 PM – 6:00 AM, ends Thu, Nov 5 · Santurce");
    });
    it(`${name}: a withheld or missing second shift says so, and is never "no second shift"`, () => {
      const out = text(pick(inbox(items)));
      expect(out).toContain("The other shift’s details are not available");
      expect(out).toContain("The other shift is not shown here. Open the request to see it.");
      expect(out).toContain("Carlos’ shift: Thu, Nov 5 · 4:00 PM – 12:00 AM · Condado");
    });
    it(`${name}: each cover request says its own result, and "not known" is not "nobody"`, () => {
      const out = text(pick(inbox(items)));
      for (const phrase of ["Picked up by Daniel Cruz", "Nobody has picked it up yet", "Withdrawn", "Expired", "Result not known"]) expect(out).toContain(phrase);
      expect(out).toContain("Cover request · Thu, Nov 5 · 9:00 AM – 5:00 PM · Condado");
    });
  }
});

describe("U03: the item another reviewer approves stays visible in Things to do", () => {
  const fix = (id: string, name: string, concerns: boolean, independent: boolean): ActionItem => ({ id: `TIME_CORRECTION:${id}`, type: "TIME_CORRECTION", category: "timekeeping", priority: "REVIEW", title: "Time correction waiting for review",
    detail: `${name} · Recorded time correction.`, dateTime: "2026-10-29T15:00:00Z", href: `/app?view=attendance#correction-${id}`, review: reviewFacts(concerns, independent, "TIME_CORRECTION") } as ActionItem);
  const items = [...three, fix("mine", "Carmen Ruiz", true, true), fix("sent", "James Ortiz", false, true), fix("open", "Ana Colón", false, false)];
  for (const [name, pick] of [["Direction B", onlyB], ["corporate", withoutB]] as const) it(`${name}: counts two timecards and lists the third with who reviews it`, () => {
    const html = pick(inbox(items)), out = text(html);
    expect(out).toContain("2 of 3 timecards · Ana, Luis");
    expect(out).toContain("Your timecard");
    expect(out).toContain("Another reviewer approves this one");
    // The reviewer's own correction and one they sent for someone else: listed, each with whose it is.
    expect(out).toContain("Your time correction");
    expect(out).toContain("James Ortiz");
    // Label in name (Nov 23, 2026): a Direction B row is named by its visible text; the older card keeps its label.
    if (name === "Direction B") {
      expect(html).not.toMatch(/aria-label="Your timecard, /);
      expect(html).toContain('<span class="b-sr"> It needs an Owner or a Manager with company access.</span>');
    }
    else expect(html).toMatch(/aria-label="Your timecard, Oct 19–25\. Another reviewer approves this one\. It needs an Owner or a Manager with company access\."/);
    expect(out).not.toMatch(/approves it by|due /i);
  });
  it("the band counts what this person can decide, and says the timecards apart", () => {
    const out = text(onlyB(inbox(items)));
    expect(out).toContain("1 thing needs you · 2 timecards to approve");
  });
  it("with clock-ins unread the band says \"At least\", and an empty list is not all-clear", () => {
    expect(text(onlyB(inbox(items, { today: unavailable })))).toContain("At least 1 thing needs you");
    const empty = inbox([], { today: unavailable });
    expect(text(onlyB(empty))).toContain("Not everything could be checked");
    expect(text(onlyB(empty))).toContain(t.nothingListedLine);
    expect(text(empty)).not.toContain("You’re all set");
    expect(text(inbox([]))).toContain("You’re all set");
  });
});

describe("U09: lateness on Home's On now", () => {
  it("says the server's minutes when present and the words alone when null or absent", () => {
    const shifts = [shift("a", "clocked_in", { firstClockInAt: "2026-10-30T13:12:20Z", late: true, lateMinutes: 12 }), shift("b", "clocked_in", { firstClockInAt: "2026-10-30T13:09:00Z", late: true }),
      shift("c", "clocked_in", { firstClockInAt: "2026-10-30T13:30:00Z", late: true, lateMinutes: null }), shift("d", "clocked_in", { firstClockInAt: "2026-10-30T12:59:00Z", late: false, lateMinutes: 0 })];
    const out = onlyB(home({ today: today(shifts) }));
    const on = text(out.slice(out.indexOf('id="b-home-on"'), out.indexOf('class="b-home-col b-home-col--b"')));
    expect(on).toContain("Person a 9:00 AM – 5:00 PM Clocked in late · 12 min");
    expect(on).toContain("Person b 9:00 AM – 5:00 PM Clocked in late PC Person c");
    expect(on).toContain("Person c 9:00 AM – 5:00 PM Clocked in late PD Person d");
    expect(on).toContain("Person d 9:00 AM – 5:00 PM Clocked in"); // Phase 8 (a.md #11): Team's live word
    // Nothing is worked out from the clock here: b arrived 9 minutes late, and no "9 min" appears.
    expect(on).not.toContain("9 min");
  });
});

describe("U09: lateness on Team", () => {
  it("the live chip carries the server's minutes, or the words alone when they are null", async () => {
    const { clockedInText } = await import("../team-live");
    const live = { ready: true, working: new Set(["a", "b", "c"]), onBreak: new Set<string>(), late: new Map<string, number>(), clockedInLate: new Map<string, number | null>([["a", 12], ["b", null]]), scheduled: new Set(["a", "b", "c"]) };
    expect(clockedInText(live, "a").replace(/\u00a0/g, " ")).toBe("Clocked in late · 12 min");
    expect(clockedInText(live, "b")).toBe("Clocked in late");
    expect(clockedInText(live, "c")).toBe("Clocked in");
  });
});

describe("U09: coverage figures say what they measure", () => {
  const staffed: CoverageMinutes = { state: "ready", staffing: { required: 20160, covered: 11610, percent: 57.59 }, positions: { required: 0, covered: 0, percent: null }, lead: { required: 0, covered: 0, percent: null } };
  const none: CoverageMinutes = { state: "not_configured", staffing: null, positions: null, lead: null };
  const empty: CoverageMinutes = { state: "ready", staffing: { required: 0, covered: 0, percent: null }, positions: { required: 0, covered: 0, percent: null }, lead: { required: 0, covered: 0, percent: null } };
  const explained = (html: string) => { expect(html).toContain('<details class="b-explain'); expect(html).toContain('role="note"'); expect(text(html)).toContain(t.staffingExplain); };
  it("Home: Staffing with its one-line explanation behind a named control", () => {
    const html = onlyB(home({ week: { ...week(staffed), days: [] } }));
    expect(text(html)).toContain("Staffing 58%");
    expect(html).toMatch(/<summary class="b-btn b-btn--quiet b-explain__b">.*?<span>What this measures<\/span><\/summary>/);
    explained(html);
  });
  it("Home, Schedule header and the Schedule band: no staffing needs is said in words, never 0% or 100%", () => {
    for (const coverage of [none, empty]) {
      expect(text(onlyB(home({ week: week(coverage) })))).toContain("Staffing No staffing needs set");
      const header = renderToStaticMarkup(<ScheduleCoverageLine coverage={coverage} label="Covered this week" />);
      expect(text(header)).toContain("Covered this week No staffing needs set");
      expect(text(header)).not.toMatch(/\d+%/);
    }
    expect(text(renderToStaticMarkup(<CoverageFigures coverage={none} variant="glass" label="Covered this week" />))).toContain("No staffing needs set");
  });
  it("Schedule header: the icon control is named for screen readers and carries the same sentence", () => {
    const html = renderToStaticMarkup(<ScheduleCoverageLine coverage={staffed} label="Covered this week" />);
    expect(html).toContain('<summary class="b-btn b-btn--quiet b-explain__b" aria-label="What this measures">');
    explained(html);
    explained(renderToStaticMarkup(<CoverageFigures coverage={staffed} variant="glass" label="Covered this week" />));
  });
  it("the planner's figure is labelled as fully staffed periods, and its explanation says it is not staff hours or pay", () => {
    expect(t.fullyStaffedValue(25)).toBe("Time fully staffed 25%");
    expect(t.fullyStaffedExplain).toMatch(/every needed position was filled/);
    expect(t.fullyStaffedExplain).toMatch(/not staff hours and not pay/);
    expect(t.fullyStaffedExplain).toMatch(/one person short counts as not staffed/);
  });
  it("the explanation is a native disclosure: keyboard operable, announced collapsed or expanded, no script", () => {
    const html = renderToStaticMarkup(<Explain text="One sentence." label="What this measures" />);
    expect(html).toBe('<details class="b-explain"><summary class="b-btn b-btn--quiet b-explain__b"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">' + html.slice(html.indexOf("<path"), html.indexOf("</svg>")) + '</svg><span>What this measures</span></summary><span class="b-explain__tx" role="note">One sentence.</span></details>');
  });
});

describe("U09: Reports, scheduled against recorded by day", () => {
  const entry = (id: string, date: string) => ({ id, locationId: "L1", locationName: "Condado", positionId: "P1", positionName: "Barista", sourceKind: "RECORDED", adjustmentId: null, recordedVersion: 1,
    startAt: `${date}T12:00:00Z`, endAt: `${date}T20:00:00Z`, rawStartAt: `${date}T12:00:00Z`, rawEndAt: `${date}T20:00:00Z`, breaks: [] });
  const plan = (id: string, date: string, startTime = "08:00", endTime = "16:00") => ({ id, employeeId: "E1", locationId: "L1", locationName: "Condado", positionId: "P1", positionName: "Barista", date, startTime, endTime, revisionId: "R1", revisionNumber: 1, isCalloutApproved: false });
  const change = (id: string, requestId: string, eventKind: string) => ({ id, requestId, requestKind: "EXCHANGE", eventKind, requestRevision: 1, createdAt: "2026-09-22T21:00:00Z", sourceDate: "2026-09-22", employeeId: "E1", outcomeMode: "AUTOMATIC", kind: "COVERAGE" });
  const source = (schedules: unknown[], publishedWeeks = ["2026-09-14", "2026-09-21"], changes: unknown[] = [change("C1", "X1", "COMPLETED"), change("C2", "X2", "CREATED"), change("C3", "X3", "CREATED")]) => {
    const period = { startDate: "2026-09-21", endDate: "2026-09-27" };
    const cards = [{ source: { employeeId: "E1", employeeName: "Ana Colón", timeZone: zone, ...period, pendingCorrections: 0, corrections: [], entries: [entry("T1", "2026-09-21"), entry("T2", "2026-09-22"), entry("T3", "2026-09-24")] }, sourceHash: "a".repeat(32), revision: 0, state: "DRAFT", history: [] }];
    return { workspaceId: "W1", timeZone: zone, observedAt: "2026-10-05T12:00:00Z", period, cards, schedules, requests: [], changes, publications: [], attendanceSources: [], publishedWeeks };
  };
  const view = (report: ReturnType<typeof projectReports>) => renderToStaticMarkup(<CorpReportsView report={report} state="ready" />);
  it("sparse days: a light bar only where the published schedule has time, and the empty days are named", () => {
    // Monday and Tuesday scheduled, an overnight shift from Thursday into Friday; Wednesday, Saturday and Sunday have none.
    const report = projectReports(source([plan("S1", "2026-09-21"), plan("S2", "2026-09-22"), plan("S3", "2026-09-24", "22:00", "06:00")]));
    expect(report.scheduledByDay?.rows.map(row => row.date)).toEqual(["2026-09-21", "2026-09-22", "2026-09-24", "2026-09-25"]);
    const html = view(report), out = text(html);
    expect(html.match(/class="c-ins__plan"/g)).toHaveLength(4);
    expect(html.match(/data-plan="none"/g)).toHaveLength(3);
    expect(out).toContain("Recorded Scheduled");
    expect(out).toContain("No published schedule: Wed, Sep 23, Sat, Sep 26, Sun, Sep 27");
    // Read aloud, each day says both figures; a missing day is not "0 h scheduled".
    expect(out).toContain("Mon, Sep 21: 8 h recorded, 8 h scheduled");
    expect(out).toContain("Thu, Sep 24: 8 h recorded, 2 h scheduled");
    expect(out).toContain("Fri, Sep 25: no hours recorded, 6 h scheduled");
    expect(out).toContain("Wed, Sep 23: no hours recorded, no published schedule");
    expect(out).not.toMatch(/0 min scheduled|0 h scheduled/);
    expect(out).toContain(t.scheduledExplain);
  });
  it("partial: an unpublished week has no scheduled figures, and the card says why", () => {
    const report = projectReports(source([plan("S1", "2026-09-21"), plan("S2", "2026-09-22")], ["2026-09-14"]));
    expect(report.scheduledByDay?.state).toBe("unpublished");
    const html = view(report), out = text(html);
    expect(html).not.toContain('class="c-ins__plan"');
    expect(out).toContain("Scheduled time not available: Mon, Sep 21, Tue, Sep 22");
    expect(out).toContain(t.scheduleIncomplete);
    expect(out).toContain("Mon, Sep 21: 8 h recorded, scheduled time not available");
  });
  it("an older report without the daily schedule draws no light bars and claims nothing about the schedule", () => {
    const report = projectReports(source([plan("S1", "2026-09-21")])); delete report.scheduledByDay;
    const html = view(report);
    expect(html).not.toContain("c-ins__plan"); expect(html).not.toContain("c-ins__legend");
    expect(text(html)).not.toMatch(/published schedule|Scheduled time not available/);
    expect(text(html)).toContain("Mon, Sep 21: 8 h recorded Tue");
  });
  it("cover requests are a history of what was seen, with the empty and the unread cases told apart", () => {
    const seen = text(view(projectReports(source([]))));
    expect(seen).toContain("Cover requests filled 1 of 3 seen");
    expect(seen).toContain(t.coverSeenExplain);
    const noneSeen = text(view(projectReports(source([], undefined, []))));
    expect(noneSeen).toContain("No one asked for cover this period.");
    expect(noneSeen).not.toContain("Cover requests filled 0");
    const unread = text(view(projectReports(source([], undefined, [{ ...change("C9", "X9", "CREATED"), kind: "UNKNOWN" }]))));
    expect(unread).toContain("1 older shift change could not be read, so there may be more.");
  });
});
