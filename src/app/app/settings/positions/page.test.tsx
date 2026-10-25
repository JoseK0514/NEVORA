import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Position } from "@/lib/domain";

const mocks = vi.hoisted(() => ({ requireRoles: vi.fn(), listPositions: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.requireRoles }));
vi.mock("@/lib/data/positions", () => ({ listPositions: mocks.listPositions }));
vi.mock("../actions", () => ({ createPositionAction: vi.fn(), updatePositionAction: vi.fn() }));
import PositionsPage from "./page";

const position: Position = { id: "support", workspaceId: "test", name: "Customer support", active: true, createdAt: "2026-10-12", updatedAt: "2026-10-12" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRoles.mockResolvedValue({ id: "owner", role: "OWNER" });
  mocks.listPositions.mockResolvedValue([position, { ...position, id: "retired", name: "Retired qualification", active: false }]);
});

it("authorizes the Owner before reading the full catalog", async () => {
  const html = renderToStaticMarkup(await PositionsPage());
  expect(mocks.requireRoles).toHaveBeenCalledWith(["OWNER"]);
  expect(mocks.listPositions).toHaveBeenCalledWith({ includeInactive: true });
  expect(html).toContain('name="id" value="support"');
  expect(html).toContain('name="id" value="retired"');
  expect(html).toContain("Retired qualification");
  // Quiet (v4): Active and Archived segments (P2-5); each position is a row that opens its editor.
  expect(html).toContain('aria-label="Edit Retired qualification, archived"');
  expect(html).toContain('aria-label="Archived, 1"');
  expect(html).toContain('maxLength="80"');
  expect(html).toContain('aria-labelledby="position-support-active-label"');
  expect(html).toContain('id="position-support-active-label">Active');
  expect(html).toContain("Archived positions can’t be newly assigned. People keep their history.");
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
  expect(html).not.toContain('name="name"');
  expect(html).not.toContain("No positions configured.");
});
it("explains optional positions and guards forms before hydration", async () => {
  mocks.listPositions.mockResolvedValue([]);
  const html = renderToStaticMarkup(await PositionsPage());
  expect(html).toContain("Shifts can still be added without a position.");
  expect(html).toContain("JavaScript is required to add or edit positions.");
  expect(html).toMatch(/<fieldset(?=[^>]*disabled="")(?=[^>]*class="q-fieldset wc-fieldset")[^>]*>/);
  expect(html).toMatch(/<button type="button" class="q-btn" disabled="">Add position<\/button>/);
  expect(html).not.toContain("Couldn’t load positions.");
});
