import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const data = vi.hoisted(() => ({
  requireRoles: vi.fn(async (_roles: string[]) => ({ id: "owner", role: "OWNER" })),
  locations: vi.fn(async () => [
    { id: "east", workspaceId: "w", name: "East Office", shortName: "East", clockerKey: "east-office", active: true },
    { id: "west", workspaceId: "w", name: "West Office", shortName: "Studio", clockerKey: "west-office", active: true },
    { id: "old", workspaceId: "w", name: "Old Office", shortName: "Old", clockerKey: "old-office", active: false },
  ]),
  workspace: vi.fn(async () => ({ id: "w", name: "Test Company", active: true, timeZone: "America/Puerto_Rico" })),
}));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: data.requireRoles }));
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: data.workspace }));
vi.mock("@/lib/data/employees", () => ({ listLocations: data.locations, listEmployees: async () => [{ id: "worker", active: true, eligibleLocationIds: ["west"] }, { id: "retired", active: false, eligibleLocationIds: ["east", "west"] }] }));
vi.mock("@/lib/data/positions", () => ({ listPositions: async () => [] }));
vi.mock("@/lib/data/schedule-health", () => ({
  listLocationStaffingSettings: async () => [{ locationId: "west", minimumStaffPerShift: 1, requiresDesignatedLead: false }],
  listCoverageWindows: async () => [{ id: "west-coverage", locationId: "west", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
}));
vi.mock("@/components/kit/kit", () => import("../../../../components/kit/kit"));
vi.mock("@/lib/scheduling/location-readiness", () => import("../../../../lib/scheduling/location-readiness"));
import LocationsPage from "./page";
import { LocationsSearch } from "./locations-search";
import LocationsError from "./error";
import { createElement } from "react";

beforeEach(() => { vi.clearAllMocks(); });
const render = async (q?: string | string[], status?: string | string[]) => renderToStaticMarkup(await LocationsPage({ searchParams: Promise.resolve({ q, status }) }));

it("retains real ready, setup, inactive, Clocker and management paths", async () => {
  const html = await render();
  expect(data.requireRoles).toHaveBeenCalledWith(["OWNER"]);
  expect(data.locations).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain("Showing 3 of 3 locations");
  expect(html).toContain("3 setup items");
  expect(html).toContain("Scheduling setup is complete.");
  expect(html).toContain("1 eligible employee");
  expect(html).toContain("0 eligible employees");
  expect(html).toContain("Unavailable while inactive");
  for (const path of ["/clocker/east-office", "/clocker/old-office", "/app/settings/locations/east", "/app/settings/locations/new", "/app/schedule/settings", "/app/employees"]) expect(html).toContain(`href="${path}"`);
});
it("matches a short name without case sensitivity and preserves the query in status links", async () => {
  const html = await render("  STUDIO  ");
  expect(html).toContain("West Office"); expect(html).not.toContain("East Office");
  expect(html).toContain("Showing 1 of 3 locations");
  expect(html).toContain('href="/app/settings/locations?q=STUDIO&amp;status=setup"');
});
it.each([["setup", "East Office"], ["ready", "West Office"], ["inactive", "Old Office"]])("filters %s using the existing readiness evaluator", async (status, name) => {
  const html = await render(undefined, status);
  expect(html).toContain(name); expect(html.match(/data-location="/g)).toHaveLength(1);
  expect(html).toContain(`name="status" value="${status}"`);
});
it("combines filters with search and offers a clear reset for no matches", async () => {
  const html = await render("East", "ready");
  expect(html).toContain("No matching locations"); expect(html).toContain("Clear search and filters");
  expect(html).not.toContain('data-location="');
});
it("handles repeated or unknown URL parameters without crashing or hiding the directory", async () => {
  const html = await render(["East", "West"], ["ready", "inactive"]);
  expect(html).toContain("Showing 3 of 3 locations");
  expect(await render(undefined, "unknown")).toContain("Showing 3 of 3 locations");
});
it("distinguishes a true empty directory from a search without matches", async () => {
  data.locations.mockResolvedValueOnce([]);
  const html = await render();
  expect(html).toContain("Your first workplace starts here"); expect(html).not.toContain("No matching locations");
  expect(html).toContain("Add a location, then set up staffing, coverage, and your eligible team.");
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
it("renders a progressive native search form and an unavailable state with recovery controls", () => {
  const search = renderToStaticMarkup(createElement(LocationsSearch, { query: "Office", status: "inactive" }));
  expect(search).toContain('method="get"'); expect(search).toContain('action="/app/settings/locations"');
  expect(search).toContain('value="Office"'); expect(search).toContain('name="status" value="inactive"');
  expect(search).toContain('role="status"'); expect(search).not.toContain('disabled=""');
  const error = renderToStaticMarkup(createElement(LocationsError, { reset: vi.fn() }));
  expect(error).toContain('role="alert"'); expect(error).toContain("Try again"); expect(error).toContain('href="/app/settings"');
});
