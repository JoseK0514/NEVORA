import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";

// Fictional Today and clock-monitor reads: Ana is clocked in; Ben has nothing today in the reads.
rs.mock("./manager-today", () => ({ useToday: () => ({ snapshot: { state: "ready", observedAt: "2026-11-22T15:00:00Z", timeZone: "America/Puerto_Rico",
  shifts: [{ employeeId: "ana", locationId: "east", status: "clocked_in", startAt: "2026-11-22T13:00:00Z", late: false }] } }) }));
rs.mock("./clean/use-clock-monitor", () => ({ useClockMonitor: () => ({ monitor: { state: "ready", employees: [] } }) }));

import { TeamLiveProvider } from "./team-live";
import { TeamDeskPeople } from "./team-desk-people";

const rows = [{ id: "ana", name: "Ana Rivera", initials: "AR", detail: "Employee" }, { id: "ben", name: "Ben Ortiz", initials: "BO", detail: "Employee", href: "/app/employees/ben" }];

it("says Off today and offers its filter when the reads cover the whole company", () => {
  const html = renderToStaticMarkup(<TeamLiveProvider><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>);
  expect(html).toContain("Clocked in");
  expect(html.match(/Off today/g)).toHaveLength(2); // Ben's row and the filter
});

it("says nothing for someone with nothing here today when the reads cover only a location Manager's places", () => {
  // Phase 2 (Nov 22, 2026): Ben may be working at another place, so "Off today" would not be true.
  const html = renderToStaticMarkup(<TeamLiveProvider partial><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>);
  expect(html).toContain("Clocked in");
  expect(html).not.toContain("Off today");
  // A row without a page isn't a link and has no chevron; a row with one keeps both.
  expect(html).not.toContain('href="/app/employees/ana"');
  expect(html.match(/c-chev/g)).toHaveLength(1);
});

it("reads only the chosen place's shifts when a location Manager filters Team to one place", () => {
  const html = renderToStaticMarkup(<TeamLiveProvider partial locationId="main"><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>);
  // Ana is clocked in at East, not at Main, so Main's list says nothing about her.
  expect(html).toContain("Clocked in<b>0</b>");
  expect(renderToStaticMarkup(<TeamLiveProvider partial locationId="east"><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>)).toContain("Clocked in<b>1</b>");
});
