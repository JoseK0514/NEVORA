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
  expect(output).toContain("12h assigned this week");
  expect(output).toContain("schedule-employee-fictional");
  expect(output).toContain("No assignments this week");
  expect(output).not.toContain("Off duty");
});
it("respects an Action Center day focus while keeping full-week totals and controls", () => {
  const output = html("2026-10-06");
  expect(output).not.toContain("shiftId=overnight");
  expect(output).toContain("shiftId=midnight");
  expect(output).toContain("12h assigned this week");
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
  // position tint; the position is read out with the shift instead, and the lead keeps its own marker.
  expect(html()).toMatch(/class="cm-block lead"/);
  expect(html()).toContain('<span class="sr-only schedule-assigned-position">, Captured support</span>');
});
it("shows weekly hours against target and flags hours over the limit", () => {
  const withHours = (hours: RosterEmployee["hours"]) => html(undefined, [{ ...employees[0], hours }]);
  expect(withHours({ week: 12, target: 30, maximum: 40 })).toContain("12 of 30h target");
  expect(withHours({ week: 12, target: null, maximum: 40 })).toContain("12 of 40h limit");
  expect(withHours({ week: 44, target: 30, maximum: 40 })).toContain("4h over the 40h limit");
  // MK3 / PD3: the visible label says how far over and which limit, not "over limit".
  expect(withHours({ week: 56, target: null, maximum: 40 })).toContain(" · 16h over 40h");
  expect(withHours({ week: 42.5, target: null, maximum: 40 })).toContain("2.5h over 40h");
  expect(withHours({ week: 56, target: null, maximum: 40 })).not.toContain("over limit");
  expect(html()).not.toContain("mws-hours");
  expect(withHours({ week: 12, target: 30, maximum: 40 })).toContain("12h assigned this week");
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
