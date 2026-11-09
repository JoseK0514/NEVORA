import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ManagerWeeklyRoster } from "./manager-weekly-roster";
import { assignedHours, filterRoster, type RosterEmployee } from "../lib/scheduling/manager-roster-presentation";
import { weekDates } from "../lib/date-utils";

vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => createElement("a", props, children) }));
const employees: RosterEmployee[] = [{ id: "fictional", name: "Avery Taylor", role: "Lead", shifts: [
  { id: "overnight", date: "2026-10-05", startTime: "22:00", endTime: "06:00", location: "West Office", position: "Captured support", status: "PUBLISHED", lead: true },
  { id: "midnight", date: "2026-10-06", startTime: "20:00", endTime: "24:00", location: "Main Office", status: "DRAFT", lead: false },
] }, { id: "unassigned", name: "Jordan Morgan", role: "Employee", shifts: [] }];
function html(reviewDay?: string, roster = employees) {
  return renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees: roster, dates: weekDates("2026-10-05"), today: "2026-10-06", reviewDay, timeZone: "America/Puerto_Rico" }));
}

it("counts overnight and midnight assignments without double-counting", () => {
  expect(assignedHours(employees[0].shifts)).toBe(12);
  expect(assignedHours([])).toBe(0);
});
it("searches names and roles without changing the underlying roster", () => {
  expect(filterRoster(employees, "  AVERY ")).toEqual([employees[0]]);
  expect(filterRoster(employees, "lead")).toEqual([employees[0]]);
  expect(filterRoster(employees, "missing")).toEqual([]);
  expect(filterRoster(employees, "")).toEqual(employees);
});
it("renders truthful shift status, captured position, lead and next-day ending labels", () => {
  const output = html();
  expect(output).toContain("Ends Oct 6");
  expect(output).toContain("Ends Oct 7");
  expect(output).toContain("Captured support");
  expect(output).toContain("Published");
  expect(output).toContain("Draft");
  expect(output).toContain("12 h assigned this week");
  expect(output).toContain("schedule-employee-fictional");
  expect(output).toContain("No assignments this week");
  expect(output).not.toContain("Off duty");
});
it("respects an Action Center day focus while keeping full-week totals and controls", () => {
  const output = html("2026-10-06");
  expect(output).not.toContain("shiftId=overnight");
  expect(output).toContain("shiftId=midnight");
  expect(output).toContain("12 h assigned this week");
  expect(output).toContain("Full week");
  expect(output).toContain("No assignments on this day");
});
it("offers an actionable empty roster without implying publication", () => {
  const output = html(undefined, []);
  // Quiet (v4): one line and the way to Team.
  expect(output).toContain("Add people to your team to start scheduling.");
  expect(output).toContain('href="/app/employees">Go to Team</a>');
  expect(output).not.toContain("Published");
});

it("tints shifts by position name, stably and within six tints", async () => {
  const { positionTint } = await import("../lib/scheduling/manager-roster-presentation");
  expect(positionTint("Barista")).toBe(positionTint("  barista "));
  for (const name of ["Barista", "Cashier", "Shift lead", "Cook", "Host", "Support"]) expect(positionTint(name)).toBeGreaterThanOrEqual(0), expect(positionTint(name)).toBeLessThan(6);
  expect(positionTint(undefined)).toBe(0);
  // Clean Manager v3: the approved roster draws every shift in one light tint (the mockup), so blocks no longer carry a
  // position tint; the position is read out with the shift instead. Nov 1 upscale: the Lead role is on hold, so a lead
  // shift carries no seal, class or "Lead" (the flag stays in the data).
  expect(html()).not.toMatch(/class="cm-block lead"/);
  expect(html()).not.toContain("cm-block__lead");
  expect(html()).not.toMatch(/[,·] Lead\b/);
  expect(html()).toContain('<span class="sr-only schedule-assigned-position">, Captured support</span>');
});
it("shows weekly hours against target and flags hours over the limit", () => {
  const withHours = (hours: RosterEmployee["hours"]) => html(undefined, [{ ...employees[0], hours }]);
  expect(withHours({ week: 12, target: 30, maximum: 40 })).toContain("12 of 30 h target");
  expect(withHours({ week: 12, target: null, maximum: 40 })).toContain("12 of 40 h limit");
  expect(withHours({ week: 44, target: 30, maximum: 40 })).toContain("4 h over the 40 h limit");
  // MK3 / PD3: the visible label says how far over and which limit, not "over limit".
  expect(withHours({ week: 56, target: null, maximum: 40 })).toContain(" · 16 h over 40 h");
  expect(withHours({ week: 42.5, target: null, maximum: 40 })).toContain("2.5 h over 40 h");
  expect(withHours({ week: 56, target: null, maximum: 40 })).not.toContain("over limit");
  expect(html()).not.toContain("mws-hours");
  expect(withHours({ week: 12, target: 30, maximum: 40 })).toContain("12 h assigned this week");
});

it("keeps people without a shift that day one tap away on a single day too (U2)", () => {
  const output = html("2026-10-06");
  const tucked = output.split('class="mws-unscheduled"')[1] ?? "";
  expect(tucked).toContain("Show 1 not scheduled this day");
  expect(tucked).toContain("Jordan Morgan");
  expect(output.split('class="mws-unscheduled"')[0]).toContain("Avery Taylor");
});

it('shows inclusive full-day and partial leave on both surfaces without offering full-day empty slots', () => {
 const output=renderToStaticMarkup(createElement(ManagerWeeklyRoster,{employees:[employees[1]],dates:weekDates('2026-10-05'),today:'2026-10-06',reviewDay:'2026-10-06',timeZone:'America/Puerto_Rico',absences:{state:'ready',employeeIds:['unassigned'],rows:[{employeeId:'unassigned',startDate:'2026-10-04',endDate:'2026-10-06'}]}}));
 expect(output).toContain('Time off'); expect(output).not.toContain('class="cm-add"');
 const partial=renderToStaticMarkup(createElement(ManagerWeeklyRoster,{employees:[employees[1]],dates:weekDates('2026-10-05'),today:'2026-10-06',reviewDay:'2026-10-06',timeZone:'America/Puerto_Rico',absences:{state:'ready',employeeIds:['unassigned'],rows:[{employeeId:'unassigned',startDate:'2026-10-06',endDate:'2026-10-06',startTime:'09:00',endTime:'12:00'}]}}));
 expect(partial).toContain('Time off');expect(partial).toContain('9:00');expect(partial).toContain('class="cm-add"');
});
it('does not present an unverified empty slot when the absence read fails',()=>{
 const output=renderToStaticMarkup(createElement(ManagerWeeklyRoster,{employees:[employees[1]],dates:weekDates('2026-10-05'),today:'2026-10-06',timeZone:'America/Puerto_Rico',absences:{state:'unavailable',reason:'read_failed'}}));
 expect(output).toContain('Time off unavailable');expect(output).not.toContain('class="cm-add"');
});
it('does not mistake employees outside the authorized absence scope for checked empty slots',()=>{
 const output=renderToStaticMarkup(createElement(ManagerWeeklyRoster,{employees:[employees[1]],dates:weekDates('2026-10-05'),today:'2026-10-06',timeZone:'America/Puerto_Rico',absences:{state:'ready',employeeIds:[],rows:[]}}));
 expect(output).toContain('Time off unavailable');expect(output).not.toContain('class="cm-add"');
});
it('includes each date of partial leave and unions touching periods before offering a slot',async()=>{
 const {absencesOn,fullDayAbsence}=await import('../lib/scheduling/manager-roster-presentation');
 const read={state:'ready' as const,employeeIds:['qa'],rows:[{employeeId:'qa',startDate:'2030-10-06',endDate:'2030-10-08',startTime:'00:00',endTime:'12:00'},{employeeId:'qa',startDate:'2030-10-07',endDate:'2030-10-07',startTime:'12:00',endTime:'24:00'}]};
 expect(absencesOn(read,'qa','2030-10-05')).toEqual([]);
 expect(absencesOn(read,'other','2030-10-07')).toEqual([]);
 expect(fullDayAbsence(absencesOn(read,'qa','2030-10-07'))).toBe(true);
 expect(fullDayAbsence(absencesOn(read,'qa','2030-10-08'))).toBe(false);
});

// Inspection Oct 24: on the Quiet Schedule page the desktop grid showed unstyled under the phone day list, and on
// desktop it lost its styling, because its rules hang off a .cm-schedule wrapper the Quiet page no longer has.
it("keeps the people × days grid desktop-only with its own styling hook, and the day list phone-only", async () => {
  const output = html();
  expect(output).toMatch(/<div class="cm-sched-desk cm-sched-slot"><div class="cm-grid-wrap">/);
  expect(output).toContain('class="cm-sched-phone"');
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("./quiet/quiet.css", import.meta.url), "utf8").replace(/\s+/g, " ");
  expect(css).toContain("@media (max-width: 760px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse) { :is(#q-root, html) .q-schedule .cm-sched-desk { display: none; }");
  expect(css).toMatch(/@media \(min-width: 761px\) \{ :is\(#q-root, html\) \.q-schedule \.cm-sched-phone \{ display: none; \}/);
});

it("corporate (board G-O-Schedule): a week card with the week and its state, then the chosen day as a card", () => {
  const output = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    absences: { state: "ready", employeeIds: ["fictional", "unassigned"], rows: [] } as never,
    openShifts: [{ id: "gap", date: "2026-10-06", startTime: "13:00", endTime: "15:00", location: "Main Office", href: "/app/schedule/coverage?repair=x" }],
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/app/schedule?week=2026-09-28", nextHref: "/app/schedule?week=2026-10-12", status: createElement("span", { className: "c-pill c-pill--amber" }, "Draft"), addShiftHref: "/app/schedule/new?week=2026-10-05" } }));
  expect(output).toContain('aria-label="Previous week"');
  expect(output).toContain('class="c-sched-week__label">Oct 5 – 11<');
  expect(output).toContain(">Draft</span>");
  // Today's card: the shift with its time column, the open shift (the whole row opens Find cover, with a chevron), the
  // count with hours, and Add shift on this day.
  expect(output).toContain("Today · Tue, Oct 6");
  expect(output).toContain("2 shifts · 4 h");
  // Owner premium: one time format; midnight reads 12:00 AM.
  // R2: each end is the kit's time (CorpTime: a quieter AM/PM joined by a narrow no-break space).
  expect(output).toMatch(/c-sched-row__time" aria-hidden="true"><b><span class="c-time">8:00\s<span class="c-ampm">PM<\/span><\/span><\/b><span><span class="c-time">12:00\s<span class="c-ampm">AM<\/span>/);
  expect(output).toMatch(/<a class="c-row c-sched-row c-sched-row--open" href="\/app\/schedule\/coverage\?repair=x" aria-label="Find cover for the open shift, 1:00\sPM to 3:00\sPM, Main Office">/);
  expect(output).not.toContain(">Find cover</a>");
  expect(output).not.toContain("c-sched-row__cover");
  // Nov 1 upscale: "Open shift" in ink when it isn't the day's one problem; the grid's day headers carry the day's hours.
  expect(output).toMatch(/class="cm-grid__dayhours c-num"><span class="sr-only">, <\/span>\d+ h<\/span>/);
  // On the current week there is no Today link.
  expect(output).not.toContain("c-sched-week__today");
  expect(output).toContain('href="/app/schedule/new?week=2026-10-05&amp;date=2026-10-06"');
  // A draft shift says so; the Quiet strip is gone.
  expect(output).toContain('class="c-pill c-pill--amber">Draft</span>');
  expect(output).not.toContain('class="q-week"');
});

it("corporate: a shift edited since the week was published says Changed (Publish changes)", () => {
  const roster: RosterEmployee[] = [{ id: "e", name: "Dana Kim", role: "Employee", shifts: [{ id: "edited", date: "2026-10-06", startTime: "14:00", endTime: "20:00", location: "Main Office", status: "PUBLISHED", lead: false }] }];
  const out = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees: roster, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05", changedShiftIds: ["edited"] } }));
  // Owner premium R3: the row's state is trailing text, amber for Changed (no pill).
  expect(out).toContain('class="c-meta c-sched-state" data-tone="amber">Changed</span>');
  const plain = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees: roster, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05" } }));
  expect(plain).not.toContain(">Changed<");
});

// Nov 1 upscale: an open shift that already ended earlier today (business time zone) reads "Not filled" with no action, as
// a past day's does; one still to come keeps its row link; an overnight one or one that runs to midnight is never over today.
it("corporate: today's open shifts that already ended say Not filled, and another week offers Today", () => {
  const openShifts = [
    { id: "early", date: "2026-10-06", startTime: "06:00", endTime: "10:00", location: "Main Office", href: "/app/schedule/coverage?shift=early" },
    { id: "later", date: "2026-10-06", startTime: "16:00", endTime: "20:00", location: "Main Office", href: "/app/schedule/coverage?shift=later" },
    { id: "late", date: "2026-10-06", startTime: "18:00", endTime: "24:00", location: "Main Office", href: "/app/schedule/coverage?shift=late" },
    { id: "night", date: "2026-10-06", startTime: "22:00", endTime: "06:00", location: "Main Office", href: "/app/schedule/coverage?shift=night" },
  ];
  // 3:13 PM in Puerto Rico (UTC−4).
  const out = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    absences: { state: "ready", employeeIds: ["fictional", "unassigned"], rows: [] } as never, openShifts,
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05", observedAt: "2026-10-06T19:13:00Z", todayHref: "/app/schedule?week=2026-10-12" } }));
  expect(out).not.toContain('href="/app/schedule/coverage?shift=early"');
  expect(out.match(/<span class="c-meta">Not filled<\/span>/g)).toHaveLength(1);
  for (const id of ["later", "late", "night"]) expect(out).toContain(`class="c-row c-sched-row c-sched-row--open" href="/app/schedule/coverage?shift=${id}"`);
  // The desktop grid's today column: the ended one collapses to a grey line with no action.
  expect(out).toContain('<span aria-hidden="true">1 not filled</span>');
  expect(out).toContain('<a class="c-sched-week__today" href="/app/schedule?week=2026-10-12" aria-label="Go to this week">Today</a>');
  // Without the read time, today's open shifts all stay open.
  const unknown = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    absences: { state: "ready", employeeIds: ["fictional", "unassigned"], rows: [] } as never, openShifts,
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05" } }));
  expect(unknown).not.toContain(">Not filled<");
});
