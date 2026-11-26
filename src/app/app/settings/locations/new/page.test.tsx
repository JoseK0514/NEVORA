import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";

const mocks = rs.hoisted(() => ({ requireRoles: rs.fn(), create: rs.fn() }));
rs.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.requireRoles }));
rs.mock("../../actions", () => ({ createLocationAction: mocks.create }));
import NewLocationPage from "./page";

beforeEach(() => {
  rs.clearAllMocks();
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

