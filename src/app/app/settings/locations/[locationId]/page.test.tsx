import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ role: vi.fn(), list: vi.fn(), notFound: vi.fn(() => { throw new Error("not-found"); }) }));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.role }));
vi.mock("@/lib/data/locations", () => ({ listLocations: mocks.list }));
vi.mock("../../actions", () => ({ updateLocationAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/components/edit-location-form", () => import("../../../../../components/edit-location-form"));
import EditLocationPage from "./page";

const location = { id: "east", workspaceId: "w", name: "East office", shortName: "East", clockerKey: "east-office", active: true };
beforeEach(() => { vi.clearAllMocks(); mocks.role.mockResolvedValue({ id: "owner", role: "OWNER" }); mocks.list.mockResolvedValue([location]); });
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
  expect(html).toContain('href="/app/schedule/settings"');
  expect(html).toContain('href="/app/settings/locations"');
  expect(html).toContain("Save changes");
});

it("renders an inactive location with its stored names, history guidance and truthful Clocker status", async () => {
  mocks.list.mockResolvedValue([{ ...location, active: false }]);
  const html = await render();
  expect(html).toContain('value="East office"');
  expect(html).toContain("Unavailable while inactive");
  expect(html).toContain("Inactive locations keep their history and eligibility.");
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
