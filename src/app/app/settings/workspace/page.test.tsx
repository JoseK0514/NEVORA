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
  // P9 (F9): the business name is a one-line field; Return moves on and never saves (the top-right Save does).
  expect(html).toMatch(/<input(?=[^>]*name="name")(?=[^>]*maxLength="160")(?=[^>]*required="")(?=[^>]*autoComplete="organization")(?=[^>]*enterKeyHint="next")(?=[^>]*value="Northside Operations")[^>]*\/>/);
  expect(html).not.toContain('<textarea');
  expect(html).toContain('value="America/Puerto_Rico"');
  expect(html).not.toMatch(/<input(?=[^>]*name="timeZone")(?=[^>]*disabled="")[^>]*>/);
  // Quiet (v4): the week start is a row; Save sits at the top right and submits the form.
  expect(html).toContain('<span class="q-rv q-rv--l">Monday</span>');
  expect(html).toContain('type="submit" form="company-profile-form"');
  expect(html).toContain(">Save</button>");
  expect(html).toContain('href="/app/settings"');
  // While nothing is locked there is no lock glyph and no note.
  expect(html).not.toContain("c-coprof__lock");
  expect(html).not.toContain("Locked while");
});

it("explains a protected timezone without locking the workspace name", async () => {
  mocks.locked = true;
  const html = renderToStaticMarkup(await WorkspacePage());
  // A protected timezone reads in full as text, not as a disabled field (TC-06); it isn't submitted.
  expect(html).not.toContain('name="timeZone"');
  expect(html).toContain('<span class="q-rv q-rv--l">Puerto Rico</span>');
  expect(html).not.toContain(">America/Puerto_Rico<");
  expect(html).not.toMatch(/<(?:input|textarea)(?=[^>]*name="name")(?=[^>]*disabled="")[^>]*>/);
  // Owner premium R7: the reason in plain words (the server's own error keeps its wording for a rejected save).
  expect(html).toContain("Time zone is locked because you have shifts and timecards. Contact support to change it.");
  expect(html).toContain('aria-describedby="timezone-help"');
  // Nov 1 upscale: one grouped card (name, time zone, week start); the locked values carry a Lock glyph, and one line
  // under the card says why.
  expect(html.match(/<ul class="q-list c-coprof"/g)).toHaveLength(1);
  expect(html.match(/class="c-coprof__lock"/g)).toHaveLength(2);
  expect(html).toContain('<p class="c-coprof__note" aria-hidden="true">Locked while you have shifts</p>');
});

it("does not fetch or render workspace details when access is denied", async () => {
  mocks.requireRoles.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(WorkspacePage()).rejects.toThrow("Forbidden");
});
