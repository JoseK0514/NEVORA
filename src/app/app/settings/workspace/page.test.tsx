import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  locked: false,
  requireRoles: vi.fn(async () => ({ id: "owner", role: "OWNER" })),
}));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.requireRoles }));
vi.mock("@/lib/data/workspaces", () => ({
  getWorkspace: async () => ({ name: "Northside Operations", timeZone: "America/Puerto_Rico" }),
  isWorkspaceTimezoneLocked: async () => mocks.locked,
  WorkspaceTimezoneLockedError: class extends Error {
    constructor() { super("Changing the business timezone requires a separately reviewed conversion because operational records already exist."); }
  },
}));
vi.mock("../actions", () => ({ saveWorkspaceProfileAction: vi.fn() }));

import WorkspacePage from "./page";

beforeEach(() => { mocks.locked = false; mocks.requireRoles.mockClear(); });

it("keeps Owner authorization and both editable fields with clear scheduling context", async () => {
  const html = renderToStaticMarkup(await WorkspacePage());
  expect(mocks.requireRoles).toHaveBeenCalledWith(["OWNER"]);
  expect(html).toContain('for="workspace-name"');
  expect(html).toContain('for="workspace-timezone"');
  expect(html).toMatch(/<input(?=[^>]*name="name")(?=[^>]*maxLength="160")(?=[^>]*required="")[^>]*>/);
  expect(html).toContain('value="Northside Operations"');
  expect(html).toContain('value="America/Puerto_Rico"');
  expect(html).not.toMatch(/<input(?=[^>]*name="timeZone")(?=[^>]*disabled="")[^>]*>/);
  expect(html).toContain("Monday at 12:00\u00a0AM");
  expect(html).toContain('type="submit"');
  expect(html).toContain("Save changes");
  expect(html).toContain('href="/app/settings"');
});

it("explains a protected timezone without locking the workspace name", async () => {
  mocks.locked = true;
  const html = renderToStaticMarkup(await WorkspacePage());
  // A protected timezone reads in full as text, not as a disabled field (TC-06); it isn't submitted.
  expect(html).not.toContain('name="timeZone"');
  expect(html).toContain(">America/Puerto_Rico</p>");
  expect(html).not.toMatch(/<input(?=[^>]*name="name")(?=[^>]*disabled="")[^>]*>/);
  expect(html).toContain("You can still change your business name.");
  expect(html).toContain("Changing the business timezone requires a separately reviewed conversion because operational records already exist.");
  expect(html).toContain("Why is the timezone protected?");
  expect(html).toContain('aria-describedby="timezone-help"');
});

it("does not fetch or render workspace details when access is denied", async () => {
  mocks.requireRoles.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(WorkspacePage()).rejects.toThrow("Forbidden");
});
