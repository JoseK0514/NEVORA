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
  expect(output).toContain("Manage employees");
  expect(output).toContain("Your team schedule starts here");
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
  expect(withHours({ week: 44, target: 30, maximum: 40 })).toContain("Over 40h limit");
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
