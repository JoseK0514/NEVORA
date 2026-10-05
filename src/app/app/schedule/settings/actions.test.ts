import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  role: "MANAGER",
  unconfigured: false,
  saveHours: vi.fn(),
  saveStaff: vi.fn(),
  createWindow: vi.fn(),
  replaceQuotas: vi.fn(),
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async (roles: string[]) => {
    if (!roles.includes(mocks.role)) throw new Error("redirect:/app");
    return {id:"trusted-manager",role:mocks.role};
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
      minimumStaffPerShift: mocks.unconfigured ? null : 2,
      requiresDesignatedLead: mocks.unconfigured ? null : true,
    },
  ],
  listEmployeeHourTargets: async () => [
    { employeeId: "E", targetWeeklyHours: 24, maximumWeeklyHours: 40 },
  ],
  saveEmployeeHourTargets: mocks.saveHours,
  saveLocationStaffingSettings: mocks.saveStaff,
  createCoverageWindow: mocks.createWindow,
  replaceCoverageWindowPositionRequirements: mocks.replaceQuotas,
  deleteCoverageWindow: vi.fn(),
}));
import { saveScheduleHealthSettingsAction } from "./actions";
function form(target = "24", maximum = "40") {
  const data = new FormData();
  data.set("staffing-loc-1", "2");
  data.set("lead-loc-1", "on");
  data.set("lead-configured-loc-1", "true");
  data.set("target-E", target);
  data.set("maximum-E", maximum);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "MANAGER";
  mocks.unconfigured = false;
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

it('blank Lead choice for unconfigured staffing prevents writes',async()=>{mocks.unconfigured=true;const data=form();data.delete('lead-loc-1');data.delete('lead-configured-loc-1');await expect(saveScheduleHealthSettingsAction(data)).rejects.toThrow('invalid_staffing');expect(mocks.saveStaff).not.toHaveBeenCalled();});
it.each(['true','false'])('explicit %s Lead choice for unconfigured staffing is saved',async choice=>{mocks.unconfigured=true;const data=form();data.delete('lead-loc-1');data.delete('lead-configured-loc-1');data.set('lead-choice-loc-1',choice);await expect(saveScheduleHealthSettingsAction(data)).rejects.toThrow('saved=1');expect(mocks.saveStaff).toHaveBeenCalledWith([{locationId:'loc-1',minimumStaffPerShift:2,requiresDesignatedLead:choice==='true'}]);});

import {
  addCoverageWindowFormAction,
  replaceCoverageWindowPositionRequirementsAction,
  saveScheduleHealthSettingsFormAction,
} from "./actions";
it("window add sends explicit quotas and trusted actor in the same repository call", async () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    locationId: "loc-1",
    dayOfWeek: "1",
    startTime: "08:00",
    endTime: "12:00",
    "quota-cashier": "2",
    "quota-barista": "",
  }))
    data.set(key, value);
  data.append("quotaPositionId", "cashier");
  data.append("quotaPositionId", "barista");
  expect(await addCoverageWindowFormAction(data)).toEqual({
    success: "Coverage window added.",
  });
  expect(mocks.createWindow).toHaveBeenCalledWith({
    locationId: "loc-1",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "12:00",
    minimumStaff: undefined,
    positionRequirements: [{ positionId: "cashier", quantity: 2 }],
    actorEmployeeId: "trusted-manager",
  });
});
it("clearing one quota retains the other entered quota", async () => {
  const data = new FormData();
  data.set("windowId", "window");
  data.append("quotaPositionId", "cashier");
  data.append("quotaPositionId", "barista");
  data.set("quota-cashier", "");
  data.set("quota-barista", "3");
  expect(
    await replaceCoverageWindowPositionRequirementsAction(data),
  ).toHaveProperty("success");
  expect(mocks.replaceQuotas).toHaveBeenCalledWith({
    windowId: "window",
    requirements: [{ positionId: "barista", quantity: 3 }],
    actorEmployeeId: "trusted-manager",
  });
});
it("missing Lead choice returns specific local feedback without writes", async () => {
  mocks.unconfigured = true;
  const data = form();
  data.delete("lead-loc-1");
  data.delete("lead-configured-loc-1");
  expect(await saveScheduleHealthSettingsFormAction(data)).toEqual({
    error: expect.stringContaining(
      "Choose whether a designated Lead is required",
    ),
  });
  expect(mocks.saveStaff).not.toHaveBeenCalled();
});

it.each(["true", "false"])(
  "preserves stale initial explicit Lead choice %s after another manager configures the location",
  async (choice) => {
    mocks.unconfigured = false;
    const data = form();
    data.delete("lead-loc-1");
    data.delete("lead-configured-loc-1");
    data.set("lead-choice-loc-1", choice);
    expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
      "success",
    );
    expect(mocks.saveStaff).toHaveBeenCalledWith([
      {
        locationId: "loc-1",
        minimumStaffPerShift: 2,
        requiresDesignatedLead: choice === "true",
      },
    ]);
  },
);
it("rejects a missing Lead form contract even when current configuration is non-null", async () => {
  const data = form();
  data.delete("lead-loc-1");
  data.delete("lead-configured-loc-1");
  expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
    "error",
  );
  expect(mocks.saveStaff).not.toHaveBeenCalled();
});
it("rejects conflicting Lead input shapes instead of choosing one", async () => {
  const data = form();
  data.set("lead-choice-loc-1", "false");
  expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
    "error",
  );
  expect(mocks.saveStaff).not.toHaveBeenCalled();
});
it("configured checkbox explicitly supports false through its form-presence marker", async () => {
  const data = form();
  data.delete("lead-loc-1");
  data.delete("lead-configured-loc-1");
  data.set("lead-configured-loc-1", "true");
  expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
    "success",
  );
  expect(mocks.saveStaff).toHaveBeenCalledWith([
    {
      locationId: "loc-1",
      minimumStaffPerShift: 2,
      requiresDesignatedLead: false,
    },
  ]);
});

vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:vi.fn()}));
vi.mock('@/lib/shift-changes/policy-form',()=>import('../../../../lib/shift-changes/policy-form'));
vi.mock('@/lib/data/shift-change-policy',()=>({saveShiftChangePolicy:vi.fn()}));
vi.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
