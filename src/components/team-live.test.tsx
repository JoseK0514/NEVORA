import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";

// Fictional Today and clock-monitor reads: Ana is clocked in; Ben has nothing today in the reads.
rs.mock("./manager-today", () => ({ useToday: () => ({ snapshot: { state: "ready", observedAt: "2026-11-22T15:00:00Z", timeZone: "America/Puerto_Rico",
  shifts: [{ employeeId: "ana", locationId: "east", status: "clocked_in", startAt: "2026-11-22T13:00:00Z", late: false }] } }) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: rs.fn() }) }));
rs.mock("./clean/use-clock-monitor",() => ({ useClockMonitor: () => ({ monitor: { state: "ready", employees: [] } }) }));

import { TeamLiveProvider, TeamWorkingNow } from "./team-live";
import { TeamDeskPeople } from "./team-desk-people";
import { TeamB } from "./owner-b/team-b";

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
  expect(html).toContain("On the clock<b>0</b>");
  expect(renderToStaticMarkup(<TeamLiveProvider partial locationId="east"><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>)).toContain("On the clock<b>1</b>");
});

// Gaps G24 and G13 (Nov 23, 2026): each count once for every role, and Clear search on phones.
const people = rows.map(row => ({ id: row.id, name: row.name, detail: row.detail, active: true }));
const teamB = (over: Partial<Parameters<typeof TeamB>[0]> = {}) => renderToStaticMarkup(<TeamLiveProvider><TeamB people={people} inactive={[]} total={2} query="" filtered={false}
  people_word="People" person_word="person" tools={[]} status="all" {...over} /></TeamLiveProvider>);

it("says the clocked-in count once, in the filter, for every role (band and All carry none)", () => {
  const html = teamB();
  expect(html).toContain('<p class="b-sub">2 people</p>');
  expect(html).not.toMatch(/· \d+ clocked in|No one clocked in/);
  expect(html).toContain("On the clock<b>1</b>");
  expect(html).toMatch(/>All<\/button>/);
  const desk = renderToStaticMarkup(<TeamLiveProvider><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>);
  expect(desk).toMatch(/>All<\/button>/);
  expect(desk).toContain("On the clock<b>1</b>");
  // The company Team title's live part adds nothing now.
  expect(renderToStaticMarkup(<TeamLiveProvider><TeamWorkingNow /></TeamLiveProvider>)).toBe("");
});

it("offers Clear search on phones when a search finds no one, keeping the chosen place", () => {
  const empty = teamB({ people: [], query: "zz", filtered: true });
  expect(empty).toContain("No people match “zz”.");
  expect(empty).toMatch(/<div class="b-state-actions b-team-clear"><a (?=[^>]*href="\/app\/employees")(?=[^>]*class="b-btn b-btn--ghost")[^>]*>Clear search<\/a><\/div>/);
  expect(teamB({ people: [], query: "zz", filtered: true, clearHref: "/app/employees?location=east" })).toMatch(/<a [^>]*href="\/app\/employees\?location=east"[^>]*>Clear search</);
  // No search, no button: an empty team is not a search.
  expect(teamB({ people: [], total: 0 })).not.toContain("Clear search");
});

// DEC3 / G14 (Jose, Nov 23, 2026): the filter names the group ("On the clock") and each row keeps its state, "Clocked in",
// the word Home, Who's working and the Schedule use; the two words no longer sit one above the other.
it("DEC3: the filter reads On the clock on phones and desktop, and never Clocked in", () => {
  expect(teamB()).toMatch(/>On the clock<b>1<\/b><\/button>/);
  expect(teamB()).not.toMatch(/>Clocked in<b>/);
  const desk = renderToStaticMarkup(<TeamLiveProvider><TeamDeskPeople rows={rows} peopleLabel="people" /></TeamLiveProvider>);
  expect(desk).toMatch(/>On the clock<b>1<\/b><\/button>/);
  expect(desk).not.toMatch(/>Clocked in<b>/);
});
