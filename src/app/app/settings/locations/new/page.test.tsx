import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LocationConfigurationFields } from "@/components/location-configuration-fields";

const mocks = vi.hoisted(() => ({ requireRoles: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.requireRoles }));
vi.mock("../../actions", () => ({ createLocationAction: mocks.create }));
import NewLocationPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRoles.mockResolvedValue({ id: "test-owner", role: "OWNER" });
});

it("requires owner access before rendering the creation flow", async () => {
  await NewLocationPage();
  expect(mocks.requireRoles).toHaveBeenCalledWith(["OWNER"]);
  mocks.requireRoles.mockRejectedValueOnce(new Error("denied"));
  await expect(NewLocationPage()).rejects.toThrow("denied");
  expect(mocks.create).not.toHaveBeenCalled();
});

it("retains the creation contract and automatic optional Clocker key", async () => {
  const html = renderToStaticMarkup(await NewLocationPage());
  expect(html).toMatch(/<input(?=[^>]*name="name")(?=[^>]*required="")(?=[^>]*maxLength="160")[^>]*>/);
  expect(html).toMatch(/<input(?=[^>]*name="shortName")(?=[^>]*required="")(?=[^>]*maxLength="48")[^>]*>/);
  expect(html).toMatch(/<input(?=[^>]*name="clockerKey")(?=[^>]*pattern="\[a-z0-9\]\+\(-\[a-z0-9\]\+\)\*")(?=[^>]*maxLength="64")[^>]*>/);
  // Quiet (v4): the key's placeholder says it's created for you; the sheet's Add submits the form.
  expect(html).toContain('placeholder="Created for you"');
  expect(html).toContain("can’t be changed later");
  expect(html).toContain('aria-describedby="location-clocker-help"');
  expect(html).toContain('href="/app/settings/locations"');
  expect(html).toContain('type="submit" form="new-location-form"');
});

it("preserves edit-location controls and its immutable Clocker contract", () => {
  const html = renderToStaticMarkup(createElement(LocationConfigurationFields, {
    location: { id: "existing", workspaceId: "test", name: "Existing office", shortName: "Office", clockerKey: "existing-office", active: true },
  }));
  expect(html).toContain('name="active"');
  expect(html).toContain('name="id"');
  expect(html).not.toContain('name="clockerKey"');
});
