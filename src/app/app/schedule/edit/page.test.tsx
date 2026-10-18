import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { shiftDurationLabel } from "./shift-edit-timing";

const mocks = vi.hoisted(() => ({
  roles: vi.fn(),
  shift: vi.fn(),
  employees: vi.fn(),
  locations: vi.fn(),
  positions: vi.fn(),
  redirect: vi.fn((href: string) => { throw new Error(href); }),
}));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.roles, MANAGER_ROLES: ["OWNER", "MANAGER"] }));
vi.mock("@/lib/data/schedules", () => ({ getShiftForManagement: mocks.shift }));
vi.mock("@/lib/data/employees", () => ({ listEmployees: mocks.employees, listLocations: mocks.locations }));
vi.mock("@/lib/data/positions", () => ({ listPositions: mocks.positions }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/app/schedule/actions", () => ({ updateShiftAction: vi.fn(), deleteShiftAction: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roles.mockResolvedValue({ id: "OWNER", role: "OWNER" });
  mocks.shift.mockResolvedValue({ id: "test-shift", employeeId: "AVERY", employeeName: "Avery Rivera", locationId: "main", weekStart: "2026-10-12", date: "2026-10-14", startTime: "08:00", endTime: "16:00", notes: "Opening team", isDesignatedLead: true, positionId: "support" });
  mocks.employees.mockResolvedValue([{ id: "AVERY", firstName: "Avery", lastName: "Rivera", active: true, role: "LEAD", positionIds: ["support"] }]);
  mocks.locations.mockResolvedValue([{ id: "main", name: "Main Office" }]);
  mocks.positions.mockResolvedValue([{ id: "support", name: "Support", active: true }]);
});

it("retains the editable assignment, notes, lead, and shift identity and restricts date to its existing week", async () => {
  const { default: Page } = await import("./page");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ shiftId: "test-shift" }) }));
  for (const name of ["employeeId", "positionId", "date", "startTime", "endTime", "isDesignatedLead", "notes"]) expect(html).toContain(`name="${name}"`);
  expect(html.match(/name="shiftId" value="test-shift"/g)).toHaveLength(2);
  expect(html).toContain('min="2026-10-12" max="2026-10-18"');
  expect(html).toContain('value="support" selected=""');
  expect(html).toContain("Opening team</textarea>");
  expect(html).toContain('form="delete-shift-form"');
  expect(html).toContain('<details class="edit-shift-delete">');
  expect(html).toContain('/app/schedule?week=2026-10-12');
  // W2: Cancel returns to this shift's location, day and person.
  expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=main&amp;day=2026-10-14#schedule-employee-AVERY"');
  expect(mocks.roles).toHaveBeenCalledWith(["OWNER", "MANAGER"]);
  expect(mocks.roles.mock.invocationCallOrder[0]).toBeLessThan(mocks.shift.mock.invocationCallOrder[0]);
});

it("keeps invalid shift redirects and announced validation errors", async () => {
  const { default: Page } = await import("./page");
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('/app/schedule?error=INVALID_SHIFT');
  expect(mocks.shift).not.toHaveBeenCalled();
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ shiftId: "test-shift", error: "SHIFT_OVERLAP" }) }));
  expect(html).toContain('role="alert"');
  expect(html).toContain("That employee already has an overlapping shift.");
  mocks.shift.mockResolvedValue(null);
  await expect(Page({ searchParams: Promise.resolve({ shiftId: "missing" }) })).rejects.toThrow('/app/schedule?error=INVALID_SHIFT');
});

it("exposes the complete selected employee name when a native select may truncate it", async () => {
  mocks.employees.mockResolvedValue([{ id: "AVERY", firstName: "Alexandra", lastName: "Montgomery-Williams", active: true, role: "LEAD", positionIds: ["support"] }]);
  const { default: Page } = await import("./page");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ shiftId: "test-shift" }) }));
  expect(html).toContain("Selected employee: Alexandra Montgomery-Williams");
});

it("uses the canonical nominal shift period for fractional, overnight, midnight, and invalid durations", () => {
  expect(shiftDurationLabel("2026-10-14", "08:00", "16:30")).toBe("8 hr 30 min scheduled");
  expect(shiftDurationLabel("2026-10-14", "08:00", "08:15")).toBe("15 min scheduled");
  expect(shiftDurationLabel("2026-10-14", "22:00", "06:00")).toBe("8 hr scheduled · Ends next day");
  expect(shiftDurationLabel("2026-10-14", "16:00", "24:00")).toBe("8 hr scheduled");
  for (const end of ["", "08:00", "25:00"]) expect(shiftDurationLabel("2026-10-14", "08:00", end)).toBe("Enter a valid start and end time.");
});
