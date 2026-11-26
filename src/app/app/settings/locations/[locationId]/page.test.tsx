import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";

const mocks = rs.hoisted(() => ({ role: rs.fn(), list: rs.fn(), notFound: rs.fn(() => { throw new Error("not-found"); }) }));
rs.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.role }));
rs.mock("@/lib/data/locations", () => ({ listLocations: mocks.list }));
rs.mock("../../actions", () => ({ updateLocationAction: rs.fn() }));
rs.mock("next/navigation", () => ({ notFound: mocks.notFound }));

import EditLocationPage from "./page";

const location = { id: "east", workspaceId: "w", name: "East office", shortName: "East", clockerKey: "east-office", active: true };
beforeEach(() => { rs.clearAllMocks(); mocks.role.mockResolvedValue({ id: "owner", role: "OWNER" }); mocks.list.mockResolvedValue([location]); });
const render = async (id = "east") => renderToStaticMarkup(await EditLocationPage({ params: Promise.resolve({ locationId: id }) }));

it("preserves editable fields and the stable Clocker link without accepting a replacement key", async () => {
  const html = await render();
  expect(mocks.role).toHaveBeenCalledWith(["OWNER"]);
  expect(mocks.list).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain('name="id" value="east"');
  expect(html).toMatch(/<input(?=[^>]*name="name")(?=[^>]*required="")(?=[^>]*maxLength="160")[^>]*>/);
  expect(html).toMatch(/<input(?=[^>]*name="shortName")(?=[^>]*required="")(?=[^>]*maxLength="48")[^>]*>/);
  expect(html).toContain('href="/clocker/east-office"');
  expect(html).not.toContain('name="clockerKey"');
  // Quiet (v4): Staffing opens Scheduling rules at that section; Back returns to Locations; Save is at the top right.
  expect(html).toContain('href="/app/schedule/settings#coverage-staffing"');
  expect(html).toContain('href="/app/settings/locations"');
  expect(html).toContain('form="edit-location-form"');
});

it("renders an inactive location with its stored names, history guidance and truthful Clocker status", async () => {
  mocks.list.mockResolvedValue([{ ...location, active: false }]);
  const html = await render();
  expect(html).toContain('value="East office"');
  expect(html).toContain("Unavailable while inactive");
  expect(html).not.toContain('href="/clocker/');
  expect(html).toContain("Inactive: new assignments and the Clocker are unavailable.");
  expect(html).not.toMatch(/id="edit-location-active"[^>]*checked/);
});

it("returns not-found only when an authorized catalog has no matching location", async () => {
  await expect(render("missing")).rejects.toThrow("not-found");
  expect(mocks.notFound).toHaveBeenCalledOnce();
});

it("never reads private location data after failed authorization", async () => {
  mocks.role.mockRejectedValueOnce(new Error("denied"));
  await expect(render()).rejects.toThrow("denied");
  expect(mocks.list).not.toHaveBeenCalled();
});

it("keeps a data outage distinct from a missing location", async () => {
  mocks.list.mockRejectedValueOnce(new Error("Location configuration is unavailable."));
  await expect(render()).rejects.toThrow("unavailable");
  expect(mocks.notFound).not.toHaveBeenCalled();
});

it("restricts read-back to the requested Owner catalog record and its current version", async () => {
  const { readEditedLocation } = await import("./read-current");
  const latest = {...location, active: false, updatedAt: "2030-01-02 03:04:05.654321+00"};
  mocks.list.mockResolvedValue([{...location, id: "another"}, latest]);
  expect(await readEditedLocation("east")).toEqual(latest);
  expect(await readEditedLocation("missing")).toBeNull();
  expect(mocks.list).toHaveBeenCalledWith({ includeInactive: true });
  mocks.role.mockRejectedValueOnce(new Error("denied"));
  mocks.list.mockClear();
  await expect(readEditedLocation("east")).rejects.toThrow("denied");
  expect(mocks.list).not.toHaveBeenCalled();
});
