import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";

const mocks = rs.hoisted(() => ({
  locked: false,
  requireRoles: rs.fn(async () => ({ id: "owner", role: "OWNER" })),
}));
rs.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.requireRoles }));
rs.mock("@/lib/data/workspaces", () => ({
  getWorkspace: async () => ({ name: "Northside Operations", timeZone: "America/Puerto_Rico" }),
  isWorkspaceTimezoneLocked: async () => mocks.locked,
  WorkspaceTimezoneLockedError: class extends Error {
    constructor() { super("Changing the business timezone requires a separately reviewed conversion because operational records already exist."); }
  },
}));
rs.mock("../actions", () => ({ saveWorkspaceProfileAction: rs.fn() }));

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
  // Settings in Direction B (Nov 23, 2026): the week start is a value row; the band's Save submits the form.
  expect(html).toContain('<span class="c-row__title">Week starts</span></span><span class="c-row__value">Monday</span>');
  expect(html).toContain('class="c-page c-page--narrow c-setb"');
  expect(html).toContain('type="submit" form="company-profile-form"');
  expect(html).toContain(">Save</button>");
  expect(html).toContain('href="/app/settings"');
  // While nothing is locked there is no lock glyph and no note.
  expect(html).not.toContain("c-setb-lock");
  expect(html).not.toContain("Locked while");
});

it("explains a protected timezone without locking the workspace name", async () => {
  mocks.locked = true;
  const html = renderToStaticMarkup(await WorkspacePage());
  // A protected timezone reads in full as text, not as a disabled field (TC-06); it isn't submitted.
  expect(html).not.toContain('name="timeZone"');
  expect(html).toContain('<span class="c-row__value">Puerto Rico</span>');
  expect(html).not.toContain(">America/Puerto_Rico<");
  expect(html).not.toMatch(/<(?:input|textarea)(?=[^>]*name="name")(?=[^>]*disabled="")[^>]*>/);
  // Owner premium R7: the reason in plain words (the server's own error keeps its wording for a rejected save).
  expect(html).toContain("Time zone is locked because you have shifts and timecards. Contact support to change it.");
  expect(html).toContain('id="timezone-help"');
  // One card (the form is the card: name, time zone, week start); the locked values carry a Lock glyph.
  // Jose (Nov 23, 2026: no repeated wording): the reason is said once, as the card's footer note.
  expect(html.match(/<form[^>]*class="c-card c-setb-form"/g)).toHaveLength(1);
  expect(html.match(/class="c-setb-lock"/g)).toHaveLength(2);
  expect(html.match(/Locked while you have shifts/g)).toHaveLength(1);
  expect(html).toContain('<p class="c-note c-setb-cardnote"><span>Locked while you have shifts</span></p>');
  // Save shows only after a change: the form says so, and the name stays the one thing that can change.
  expect(html).toContain('data-save-on-change=""');
  expect(html).not.toContain('data-dirty');
});

it("does not fetch or render workspace details when access is denied", async () => {
  mocks.requireRoles.mockRejectedValueOnce(new Error("Forbidden"));
  await expect(WorkspacePage()).rejects.toThrow("Forbidden");
});
