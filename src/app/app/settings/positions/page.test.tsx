import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import type { Position } from "@/lib/domain";

const mocks = rs.hoisted(() => ({ requireRoles: rs.fn(), listPositions: rs.fn() }));
rs.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.requireRoles }));
rs.mock("@/lib/data/positions", () => ({ listPositions: mocks.listPositions }));
rs.mock("../actions", () => ({ createPositionAction: rs.fn(), updatePositionAction: rs.fn() }));
import PositionsPage from "./page";

const position: Position = { id: "support", workspaceId: "test", name: "Customer support", active: true, createdAt: "2026-10-12", updatedAt: "2026-10-12" };
beforeEach(() => {
  rs.clearAllMocks();
  mocks.requireRoles.mockResolvedValue({ id: "owner", role: "OWNER" });
  mocks.listPositions.mockResolvedValue([position, { ...position, id: "retired", name: "Retired qualification", active: false }]);
});

it("authorizes the Owner before reading the full catalog", async () => {
  const html = renderToStaticMarkup(await PositionsPage());
  expect(mocks.requireRoles).toHaveBeenCalledWith(["OWNER"]);
  expect(mocks.listPositions).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain("Customer support");
  expect(html).toContain("Retired qualification");
  // J8 in Direction B: the shared Settings frame, an Active card and an Archived card; each position is a row that opens
  // its editor (a dialog), so no edit form is drawn until one is chosen.
  expect(html).toContain('class="c-page c-page--narrow c-setb"');
  expect(html).toMatch(/<h2 class="c-card__label" id="positions-active-label">Active.*1<\/span><\/h2>/);
  expect(html).toMatch(/<h2 class="c-card__label" id="positions-archived-label">Archived.*1<\/span><\/h2>/);
  expect(html).toContain('id="position-row-retired"');
  // Screen-reader names match the visible text: no aria-label on the rows.
  expect(html).not.toMatch(/id="position-row-[^"]+"[^>]*aria-label/);
  expect(html).not.toContain('name="name"');
});
it("does not read or render private configuration when authorization fails", async () => {
  mocks.requireRoles.mockRejectedValue(new Error("Access denied"));
  await expect(PositionsPage()).rejects.toThrow("Access denied");
  expect(mocks.listPositions).not.toHaveBeenCalled();
});
it("keeps an unavailable read distinct from an empty catalog and offers a retry", async () => {
  mocks.listPositions.mockRejectedValue(new Error("Private database details"));
  const html = renderToStaticMarkup(await PositionsPage());
  expect(html).toContain("Couldn’t load positions.");
  expect(html).toContain("Try again");
  expect(html).not.toContain("Private database details");
  expect(html).not.toContain('positions-active');
  expect(html).not.toContain("No positions yet");
});
it("explains optional positions and guards forms before hydration", async () => {
  mocks.listPositions.mockResolvedValue([]);
  const html = renderToStaticMarkup(await PositionsPage());
  expect(html).toContain("Shifts can still be added without a position.");
  expect(html).toContain("JavaScript is required to add or edit positions.");
  expect(html).toContain("No positions yet");
  // Before hydration the Add button is off, so nothing opens an editor that cannot save.
  expect(html).toMatch(/<button id="position-add" type="button" class="c-btn" disabled="">Add position<\/button>/);
  expect(html).not.toContain("Couldn’t load positions.");
});
