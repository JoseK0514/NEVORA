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
