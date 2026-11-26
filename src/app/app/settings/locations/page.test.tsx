import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";

const data = rs.hoisted(() => ({
  lang: "en" as "en" | "es",
  employees: rs.fn(async () => [{ id: "worker", active: true, eligibleLocationIds: ["west"] }, { id: "retired", active: false, eligibleLocationIds: ["east", "west"] }]),
  requireRoles: rs.fn(async (_roles: string[]) => ({ id: "owner", role: "OWNER" })),
  locations: rs.fn(async () => [
    { id: "east", workspaceId: "w", name: "East Office", shortName: "East", clockerKey: "east-office", active: true },
    { id: "west", workspaceId: "w", name: "West Office", shortName: "Studio", clockerKey: "west-office", active: true },
    { id: "old", workspaceId: "w", name: "Old Office", shortName: "Old", clockerKey: "old-office", active: false },
  ]),
  workspace: rs.fn(async () => ({ id: "w", name: "Test Company", active: true, timeZone: "America/Puerto_Rico" })),
}));
rs.mock("@/lib/i18n/page-lang.server", () => ({ readPageLang: async () => data.lang }));
rs.mock("@/lib/auth/permissions", () => ({ requireRoles: data.requireRoles }));
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: data.workspace }));
rs.mock("@/lib/data/employees", () => ({ listLocations: data.locations, listEmployees: data.employees }));
rs.mock("@/lib/data/positions", () => ({ listPositions: async () => [] }));
rs.mock("@/lib/data/schedule-health", () => ({
  listLocationStaffingSettings: async () => [{ locationId: "west", minimumStaffPerShift: 1, requiresDesignatedLead: false }],
  listCoverageWindows: async () => [{ id: "west-coverage", locationId: "west", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
}));


import LocationsPage from "./page";
import LocationsError from "./error";
import { createElement } from "react";

beforeEach(() => { rs.clearAllMocks(); data.lang = "en"; });
const render = async (q?: string | string[], status?: string | string[]) => renderToStaticMarkup(await LocationsPage({ searchParams: Promise.resolve({ q, status }) }));

// Quiet (v4, approved Oct 23): one row per location (short name, people, status). The approved page has no search
// box; ?q= and ?status= links from elsewhere still narrow the list.
it("lists every location with its people and status", async () => {
  const html = await render();
  expect(data.requireRoles).toHaveBeenCalledWith(["OWNER"]);
  expect(data.locations).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain("2 active of 3 locations");
  expect(html.match(/data-location="/g)).toHaveLength(3);
  // Release 1 (board O-Locations): the full name and state under the short name; how many people on the right.
  // Final polish D3 (#30): the line is the kit's facts line (BSegs), each fact whole.
  const facts = html.replace(/<[^>]+>/g, "");
  // Final fixes S2 (G85): a full name that only repeats the short name ("East" / "East Office") is left out; one that
  // says more ("Studio" / "West Office") stays.
  expect(facts).toContain("EastNeeds setup");
  expect(facts).not.toContain("East Office");
  expect(facts).toContain("West Office");
  expect(html).toContain('<span class="c-row__value c-row__value--soft">1 employee</span>');
  expect(facts).toContain("OldInactive");
  // Phase 2 (Nov 23, 2026): Settings' Direction B frame and the kit's card; the band says "Locations" once, so the card
  // has no title repeating it, and the always-true line under the card is gone. Rows have no aria-label of their own.
  expect(html).toContain('class="c-page c-page--narrow c-setb"');
  expect(html.match(/>Locations</g)).toHaveLength(2); // the phone band's title and the wide title, never both shown
  expect(html).not.toContain("Each location keeps its own schedule.");
  expect(html).not.toContain('aria-label="Edit ');
  expect(html).not.toContain("2 locations · 1 employee");
  for (const path of ["/app/settings/locations/east", "/app/settings/locations/west", "/app/settings/locations/old", "/app/settings/locations/new"]) expect(html).toContain(`href="${path}"`);
});
it("shows the eligible headcount in Spanish for zero, one and several people", async () => {
  data.lang = "es";
  data.employees.mockResolvedValueOnce(Array.from({ length: 11 }, (_, index) => ({
    id: String(index), active: true, eligibleLocationIds: index === 0 ? ["west", "east"] : ["west"],
  })));
  const html = await render();
  for (const count of ["0 personas", "1 persona", "11 personas"]) {
    expect(html).toContain(`<span class="c-row__value c-row__value--soft">${count}</span>`);
  }
});
it("matches a short name without case sensitivity", async () => {
  const html = await render("  STUDIO  ");
  expect(html).toContain('data-location="west"'); expect(html).not.toContain('data-location="east"');
  expect(html.match(/data-location="/g)).toHaveLength(1);
});
it.each([["setup", "east"], ["ready", "west"], ["inactive", "old"]])("filters %s using the existing readiness evaluator", async (status, id) => {
  const html = await render(undefined, status);
  expect(html).toContain(`data-location="${id}"`); expect(html.match(/data-location="/g)).toHaveLength(1);
});
it("combines filters with search and offers a way back to every location", async () => {
  const html = await render("East", "ready");
  expect(html).toContain("No matching locations"); expect(html).toContain('<a class="c-btn c-btn--secondary" href="/app/settings/locations">Show all</a>');
  expect(html).not.toContain('data-location="');
});
it("handles repeated or unknown URL parameters without crashing or hiding the directory", async () => {
  const html = await render(["East", "West"], ["ready", "inactive"]);
  expect(html.match(/data-location="/g)).toHaveLength(3);
  expect((await render(undefined, "unknown")).match(/data-location="/g)).toHaveLength(3);
});
it("distinguishes a true empty directory from a search without matches", async () => {
  data.locations.mockResolvedValueOnce([]);
  const html = await render();
  expect(html).toContain("Add the places your team works."); expect(html).not.toContain("No matching locations");
  expect(html).toContain('<a class="c-btn" href="/app/settings/locations/new">Add location</a>');
});
it("fails before data reads when Owner authorization is rejected", async () => {
  data.requireRoles.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(render()).rejects.toThrow("Forbidden");
  expect(data.workspace).not.toHaveBeenCalled(); expect(data.locations).not.toHaveBeenCalled();
});
it("propagates unavailable data rather than claiming there are no locations", async () => {
  data.locations.mockRejectedValueOnce(new Error("Location configuration is unavailable."));
  await expect(render()).rejects.toThrow("Location configuration is unavailable.");
});

it("renders an unavailable state with recovery controls", () => {
  const error = renderToStaticMarkup(createElement(LocationsError, { reset: rs.fn() }));
  expect(error).toContain('role="alert"'); expect(error).toContain("Try again"); expect(error).toContain('href="/app/settings"');
});
