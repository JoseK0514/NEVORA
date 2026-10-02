import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  role: "MANAGER",
  saveHours: vi.fn(),
  saveStaff: vi.fn(),
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async (roles: string[]) => {
    if (!roles.includes(mocks.role)) throw new Error("redirect:/app");
  },
}));
vi.mock(
  "@/lib/scheduling/periods",
  () => import("../../../../lib/scheduling/periods"),
);
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/schedule-health", () => ({
  listLocationStaffingSettings: async () => [
    {
      locationId: "loc-1",
      minimumStaffPerShift: 2,
      requiresDesignatedLead: true,
    },
  ],
  listEmployeeHourTargets: async () => [
    { employeeId: "E", targetWeeklyHours: 24, maximumWeeklyHours: 40 },
  ],
  saveEmployeeHourTargets: mocks.saveHours,
  saveLocationStaffingSettings: mocks.saveStaff,
  createCoverageWindow: vi.fn(),
  deleteCoverageWindow: vi.fn(),
}));
import { saveScheduleHealthSettingsAction } from "./actions";
function form(target = "24", maximum = "40") {
  const data = new FormData();
  data.set("staffing-loc-1", "2");
  data.set("lead-loc-1", "on");
  data.set("target-E", target);
  data.set("maximum-E", maximum);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "MANAGER";
});
it.each(["OWNER", "MANAGER"])(
  "%s can save distinct target and maximum without treating target as a ceiling",
  async (role) => {
    mocks.role = role;
    await expect(
      saveScheduleHealthSettingsAction(form("24", "40")),
    ).rejects.toThrow("saved=1");
    expect(mocks.saveHours).toHaveBeenCalledWith([
      { employeeId: "E", targetWeeklyHours: 24, maximumWeeklyHours: 40 },
    ]);
  },
);
it("a blank target retains the independently configured maximum", async () => {
  await expect(
    saveScheduleHealthSettingsAction(form("", "32")),
  ).rejects.toThrow("saved=1");
  expect(mocks.saveHours).toHaveBeenCalledWith([
    { employeeId: "E", targetWeeklyHours: undefined, maximumWeeklyHours: 32 },
  ]);
});
it.each(["", "NaN", "-1", "169"])(
  "invalid maximum %s prevents all settings writes",
  async (maximum) => {
    await expect(
      saveScheduleHealthSettingsAction(form("24", maximum)),
    ).rejects.toThrow("invalid_hours");
    expect(mocks.saveHours).not.toHaveBeenCalled();
    expect(mocks.saveStaff).not.toHaveBeenCalled();
  },
);
it.each(["EMPLOYEE", "LEAD"])(
  "%s cannot write management scheduling inputs",
  async (role) => {
    mocks.role = role;
    await expect(saveScheduleHealthSettingsAction(form())).rejects.toThrow(
      "redirect:/app",
    );
    expect(mocks.saveHours).not.toHaveBeenCalled();
    expect(mocks.saveStaff).not.toHaveBeenCalled();
  },
);
