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
  expect(html).toContain('aria-label="Edit Retired qualification, inactive"');
  expect(html).toContain('maxLength="80"');
  expect(html).toContain('aria-labelledby="position-support-active-label"');
  expect(html).toContain('id="position-support-active-label">Active position');
  expect(html).toContain("They do not grant Owner, Manager, Lead or Employee access.");
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
  expect(html).toContain("Positionless shifts remain available.");
  expect(html).toContain("JavaScript is required to add or edit positions.");
  expect(html).toMatch(/<fieldset(?=[^>]*disabled="")(?=[^>]*class="wc-fieldset")[^>]*>/);
  expect(html).toContain("Add your first position");
  expect(html).not.toContain("Couldn’t load positions.");
});
