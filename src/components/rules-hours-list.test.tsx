import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RulesHoursList } from "./rules-hours-list";

const rows = [
  { employeeId: "A1", employeeName: "Avery Rivera", detail: "A1 · Employee · Main", targetWeeklyHours: null, maximumWeeklyHours: null },
  { employeeId: "B2", employeeName: "Blake Cruz", detail: "B2 · Lead · West", targetWeeklyHours: 32, maximumWeeklyHours: 40 },
];

it("keeps every row's fields and names for the shared save, and offers find and missing-target filters (U3)", () => {
  const html = renderToStaticMarkup(createElement(RulesHoursList, { rows }));
  for (const name of ["target-A1", "maximum-A1", "target-B2", "maximum-B2"]) expect(html).toContain(`name="${name}"`);
  expect(html).toContain('id="target-A1"');
  expect(html).toContain('placeholder="Find a person"');
  expect(html).toMatch(/aria-pressed="false"[^>]*>Missing target<span class="rules-hours-count">1<\/span>/);
  expect(html).not.toMatch(/ hidden=""/);
  expect(html).toContain('value="40"');
});

it("offers no filter for a single person", () => {
  expect(renderToStaticMarkup(createElement(RulesHoursList, { rows: rows.slice(0, 1) }))).not.toContain("Find a person");
});
