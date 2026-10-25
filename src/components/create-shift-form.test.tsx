import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { Employee, Location, Position } from "../lib/domain";

vi.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
import { CreateShiftForm, EditShiftForm, schedulable } from "./create-shift-form";

const person = (id: string, firstName: string, patch: Partial<Employee> = {}): Employee => ({ id, firstName, lastName: "Rivera", phone: "", role: "EMPLOYEE", primaryLocationId: "main", eligibleLocationIds: ["main"], positionIds: ["desk"], active: true, ...patch });
const employees = [person("AVERY", "Avery", { role: "LEAD" }), person("WEST", "Wes", { primaryLocationId: "west", eligibleLocationIds: ["west"] }), person("b fictional", "Lowercase"), person("GONE", "Gone", { active: false })];
const locations = [{ id: "main", shortName: "Main Office" }, { id: "west", shortName: "West Office" }] as Location[];
const positions = [{ id: "desk", name: "Front desk", active: true }] as Position[];
const action = vi.fn(async () => ({}));

it("F16: the person picker lists only people the shift action can schedule, and only those who can work at the chosen location", () => {
  expect(schedulable(employees[2])).toBe(false);
  const html = renderToStaticMarkup(createElement(CreateShiftForm, { action, employees, locations, positions, weekStart: "2026-10-19", weekEnd: "2026-10-25", date: "2026-10-21", locationId: "main" }));
  expect(html).toContain(">Avery Rivera</option>");
  expect(html).not.toContain("Wes Rivera");
  expect(html).not.toContain("Lowercase");
  expect(html).not.toContain("Gone Rivera");
  const any = renderToStaticMarkup(createElement(CreateShiftForm, { action, employees, locations, positions, weekStart: "2026-10-19", weekEnd: "2026-10-25", date: "2026-10-21" }));
  expect(any).toContain("Wes Rivera");
});

it("New shift matches AddShift: Cancel · New shift · Add, a Note row, any date, and the week follows the date (P2-11, UX-O-21)", () => {
  const html = renderToStaticMarkup(createElement(CreateShiftForm, { action, employees, locations, positions, weekStart: "2026-10-19", weekEnd: "2026-10-25", date: "2026-11-03", locationId: "main", cancelHref: "/app/schedule?week=2026-10-19" }));
  expect(html).toContain('href="/app/schedule?week=2026-10-19"');
  expect(html).toContain(">New shift<");
  expect(html).toMatch(/<button type="submit" form="create-shift-form"[^>]*><span class="u2-save__label">Add<\/span>/);
  expect(html).toContain("<b>Note</b>");
  expect(html).toContain('name="notes"');
  expect(html).not.toMatch(/name="date"[^>]*min=/);
  expect(html).toContain('name="weekStart" value="2026-11-02"');
  // Break and Repeat weekly aren't stored by the shift actions, so they aren't offered.
  expect(html).not.toContain("Repeat weekly");
  expect(html).not.toContain("<b>Break</b>");
});

it("T-4: Edit shift starts with Save disabled until something changes, keeps its week and location, and explains who can lead", () => {
  const html = renderToStaticMarkup(createElement(EditShiftForm, { action, shiftId: "s1", employees, positions, weekStart: "2026-10-19", weekEnd: "2026-10-25", date: "2026-10-21",
    employeeId: "WEST", positionId: "desk", locationId: "west", locationName: "West Office", startTime: "16:00", endTime: "24:00", isDesignatedLead: false, notes: "Bring keys" }));
  expect(html).toMatch(/<button type="submit" form="edit-shift-form"[^>]*disabled=""[^>]*><span class="u2-save__label">Save<\/span>/);
  expect(html).toContain('min="2026-10-19" max="2026-10-25"');
  expect(html).toContain("<b>Location</b></span><span class=\"q-rv q-rv--l\">West Office");
  expect(html).toContain("To move a shift to another location, delete it and add a new one.");
  expect(html).toContain("Only an Owner, Manager or Lead can lead a shift.");
  expect(html.match(/<input[^>]*name="isDesignatedLead"[^>]*>/)?.[0]).toContain('disabled=""');
  expect(html).toContain(">midnight<");
  expect(html).toContain("Bring keys</textarea>");
  expect(html).toContain('<span class="q-rv q-rv--l u2-note-value">Bring keys</span>');
});
