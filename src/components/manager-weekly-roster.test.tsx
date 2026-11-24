import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManagerWeeklyRoster } from "./manager-weekly-roster";
import { ROSTER_COPY } from "./manager-weekly-roster-copy";
import { assignedHours, filterRoster, type RosterEmployee } from "../lib/scheduling/manager-roster-presentation";
import { weekDates } from "../lib/date-utils";

rs.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => createElement("a", props, children) }));
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
  // Nov 21, 2026: the day view is a timeline. 8:00 PM to midnight on a 4:00 PM–12:00 AM axis starts halfway and fills the rest; the
  // link keeps its name. The week grid carries no axis. G8 (Nov 23, 2026): a capsule in the later half is placed from the axis
  // end (right:0), so if its time needs more room than its hours it grows toward earlier hours, never out of the card.
  expect(output).toMatch(/<span class="cm-tl"><a class="cm-block draft"[^>]*style="right:0%;width:50%"/);
  expect(output).toContain('<span class="cm-axis" aria-hidden="true"><em style="left:0%">4:00\u00a0PM</em>');
  expect(output).toContain('<em style="right:0">12:00\u00a0AM</em>');
  expect(output).toMatch(/Edit Avery Taylor’s shift, [^<]*Main Office, draft/);
  expect(html()).not.toContain("cm-axis");
  expect(html()).not.toContain("cm-tl");
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
 // Nov 14 inspection (RA-10): an empty day's "+ Add" is a named link a keyboard can reach.
 expect(partial).toMatch(/<a class="cm-add"[^>]*aria-label="Add a shift for [^"]+, (Mon|Tue|Wed|Thu|Fri|Sat|Sun) Oct \d+"[^>]*>\+ Add<\/a>/);
 expect(partial).not.toMatch(/class="cm-add"[^>]*(tabindex|aria-hidden)/);
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
  // Review B8 (NV-274): a phone held sideways has the tablet layout, so only an upright phone hides the desk grid.
  expect(css).toContain("@media (max-width: 760px) { :is(#q-root, html) .q-schedule .cm-sched-desk { display: none; }");
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
  // Gaps G12 (Nov 23, 2026): roster rows are named by what they show; no aria-label words them differently.
  expect(output).toMatch(/<a class="c-row c-sched-row c-sched-row--open" href="\/app\/schedule\/coverage\?repair=x">/);
  expect(output).not.toMatch(/aria-label="(Find cover for the open shift|Edit [^"]*’s shift)/);
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
  // Phase 3 (OW-027, TB-011): the desktop grid's day is one chip that opens its list; closed at first, so the grid itself
  // holds no Find cover link, and the chip says how many are already over.
  expect(out).toContain('<span aria-hidden="true">4 open</span><span class="sr-only">4 open shifts, Tue Oct 6, 1 already over</span>');
  expect(out).toMatch(/<button type="button" class="sb-openchip" id="[^"]+" aria-expanded="false">/);
  expect(out).not.toContain("sb-openlist");
  expect(out).toContain('<span class="cm-person__sub sb-opencount"><b class="c-num">4</b><span> this week</span></span>');
  expect(out).toContain('<a class="c-sched-week__today" href="/app/schedule?week=2026-10-12" aria-label="Today, go to this week">Today</a>');
  // Without the read time, today's open shifts all stay open.
  const unknown = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    absences: { state: "ready", employeeIds: ["fictional", "unassigned"], rows: [] } as never, openShifts,
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05" } }));
  expect(unknown).not.toContain(">Not filled<");
});

// Phase 3 (OW-003, OW-006, TB-018): durations come from the shared formatters, the week's coverage is one line in the grid
// card's head, and the week's state sits inside the week stepper.
it("grid: whole-minute durations, one coverage line and the week's state beside the stepper", () => {
  const roster: RosterEmployee[] = [{ id: "e", name: "Dana Kim", role: "Employee", shifts: [
    { id: "a", date: "2026-10-05", startTime: "09:00", endTime: "16:45", location: "Main Office", status: "PUBLISHED", lead: false },
    { id: "b", date: "2026-10-06", startTime: "09:00", endTime: "17:00", location: "Main Office", status: "PUBLISHED", lead: false },
  ] }];
  const out = renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees: roster, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    openShifts: [{ id: "past", date: "2026-10-05", startTime: "06:00", endTime: "10:00", location: "Main Office", href: "/app/schedule/coverage?shift=past" }],
    corp: { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05", status: createElement("span", { className: "c-meta c-sched-weekstate", "data-tone": "green" }, "Published") },
    b: { sub: "Tuesday", actions: null, location: null, weekState: null, toPlan: [],
      coverage: { state: "ready", staffing: { required: 480, covered: 240, percent: 50 }, positions: { required: 0, covered: 0, percent: null }, lead: { required: 0, covered: 0, percent: null } } } }));
  // 7 h 45 + 8 h: the person's week and the corner total (rounded like Home's), a day's hours as a row figure.
  expect(out).toContain("15 h 45 assigned this week");
  expect(out).toContain("1 person · 16 h");
  expect(out).toContain('<span class="sr-only">, </span>7 h 45</span>');
  expect(out).not.toMatch(/\d\.\d+ h/);
  // One line, no tile and no "aren’t required" sentence in the grid card.
  const bar = out.slice(out.indexOf('class="c-sched-gridbar"'), out.indexOf('class="cm-grid__scroll"'));
  expect(bar).toContain('<div class="sb-cov" role="group" aria-label="Covered this week">');
  expect(bar).toContain('Staffing <b class="c-num">50%</b>');
  expect(bar).toContain('style="inline-size:50%"');
  expect(bar).toMatch(/4\sh of 8\sh/);
  expect(bar).not.toContain("required");
  expect(bar).not.toContain("cm-grid__coverage");
  // The week's state is the stepper's last child.
  expect(bar).toMatch(/aria-label="Next week">.*?<\/a><span class="c-meta c-sched-weekstate" data-tone="green">Published<\/span><\/span>/);
  // A day already over: a grey chip that still opens its list.
  expect(out).toContain('data-over="true" aria-expanded="false"><span aria-hidden="true">1 open</span><span class="sr-only">1 open shift, Mon Oct 5, day already over</span>');
});

// Recheck (Nov 23, 2026), the gate's point 4: each fact once. A page for one location names it on the band, so its open
// shifts don't repeat it; the grid's key shows only when the week mixes published and draft blocks.
it("says one location once and keeps the key for a mixed week", () => {
  const openShifts = [{ id: "gap", date: "2026-10-06", startTime: "13:00", endTime: "15:00", location: "Main Office", href: "/app/schedule/coverage?repair=x" }];
  const corp = { weekLabel: "Oct 5 – 11", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05" };
  const b = { sub: null, actions: null, location: null, weekState: null, toPlan: [] };
  const render = (roster: RosterEmployee[], locationId?: string) => renderToStaticMarkup(createElement(ManagerWeeklyRoster, { employees: roster, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico",
    absences: { state: "ready", employeeIds: ["fictional", "unassigned"], rows: [] } as never, openShifts, locationId, corp, b }));
  const day = (out: string) => { const from = out.indexOf('id="b-schedule-day"'); return out.slice(from, out.indexOf("</section>", from)).replace(/<[^>]+>/g, " "); };
  expect(day(render(employees, "main"))).not.toContain("Main Office");
  expect(day(render(employees))).toContain("Main Office");
  // Avery's week has a published and a draft shift: the key explains the two looks.
  expect(render(employees)).toContain('<span class="cm-legend" aria-hidden="true"><span data-k="published">Published</span><span data-k="draft">Draft</span><span data-k="open">Open</span></span>');
  const published = employees.map(person => ({ ...person, shifts: person.shifts.map(shift => ({ ...shift, status: "PUBLISHED" as const })) }));
  // Gaps G35 (Nov 23, 2026): with no key there is no key element, so the grid card keeps no empty strip.
  expect(render(published)).not.toContain('class="cm-legend"');
  // A row says Draft in a mixed week; in an all-draft week the week's state says it once.
  expect(day(render(employees))).toContain(" Draft ");
  const drafts = employees.map(person => ({ ...person, shifts: person.shifts.map(shift => ({ ...shift, status: "DRAFT" as const })) }));
  expect(day(render(drafts))).not.toContain(" Draft ");
  // The week strip's days are named by what they show, then hidden text (no aria-label that differs from it).
  const strip = render(employees);
  expect(strip).not.toMatch(/class="b-week__d"[^>]*aria-label/);
  expect(strip).toMatch(/<span>Tue<\/span><span class="sr-only"> <\/span><b class="c-num">6<\/b><span class="sr-only">, today, 2 shifts, 1 open shift<\/span>/);
});

// Release sweep (Nov 23, WCAG 2.5.3): both "Today" links name themselves starting with the word they show.
it('names the week Today links starting with their visible word', () => {
  // Signed-in Spanish (integration): the words live in manager-weekly-roster-copy.ts; each language's name starts with
  // the link's visible word (WCAG 2.5.3).
  const src = readFileSync(join(__dirname, 'manager-weekly-roster.tsx'), 'utf8');
  expect(src.match(/aria-label=\{t\.goToThisWeek\}>\{t\.today\}<\/a>/g)).toHaveLength(2);
  for (const lang of ['en', 'es'] as const) expect(ROSTER_COPY[lang].goToThisWeek.startsWith(ROSTER_COPY[lang].today)).toBe(true);
});
