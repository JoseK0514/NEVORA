import { managementProof } from '../../../../test/fixtures/management';
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  role: "MANAGER",
  unconfigured: false,
  recoveryRole: "MANAGER",
  signedOut: false,
  deleteWindow: vi.fn(),
  saveSettings: vi.fn(),
  createWindow: vi.fn(),
  replaceQuotas: vi.fn(),
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async (roles: string[]) => {
    if (mocks.signedOut) throw new Error("redirect:/login");
    if (!roles.includes(mocks.recoveryRole)) throw new Error("redirect:/app");
    return {id:"trusted-manager",role:mocks.recoveryRole};
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
  saveScheduleHealthSettings: mocks.saveSettings,
  createCoverageWindow: mocks.createWindow,
  replaceCoverageWindowPositionRequirements: mocks.replaceQuotas,
  deleteCoverageWindow: mocks.deleteWindow,
}));
import { deleteCoverageWindowAction, saveScheduleHealthSettingsAction } from "./actions";
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
  mocks.recoveryRole = "MANAGER";
  mocks.signedOut = false;
  mocks.deleteWindow.mockReset();
});
it.each(["OWNER", "MANAGER"])(
  "%s can save distinct target and maximum without treating target as a ceiling",
  async (role) => {
    mocks.role = role;
    await expect(
      saveScheduleHealthSettingsAction(form("24", "40")),
    ).rejects.toThrow("saved=1");
    expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ hourTargets: [
      { employeeId: "E", targetWeeklyHours: 24, maximumWeeklyHours: 40 },
    ], proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER") }));
  },
);
it("a blank target retains the independently configured maximum", async () => {
  await expect(
    saveScheduleHealthSettingsAction(form("", "32")),
  ).rejects.toThrow("saved=1");
  expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ hourTargets: [
    { employeeId: "E", targetWeeklyHours: undefined, maximumWeeklyHours: 32 },
  ], proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER") }));
});
it.each(["", "NaN", "-1", "169"])(
  "invalid maximum %s prevents all settings writes",
  async (maximum) => {
    await expect(
      saveScheduleHealthSettingsAction(form("24", maximum)),
    ).rejects.toThrow("invalid_hours");
    expect(mocks.saveSettings).not.toHaveBeenCalled();
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  },
);
it.each(["EMPLOYEE", "LEAD"])(
  "%s cannot write management scheduling inputs",
  async (role) => {
    mocks.role = role;
    await expect(saveScheduleHealthSettingsAction(form())).rejects.toThrow(
      "redirect:/app",
    );
    expect(mocks.saveSettings).not.toHaveBeenCalled();
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  },
);

it('blank Lead choice for unconfigured staffing prevents writes',async()=>{mocks.unconfigured=true;const data=form();data.delete('lead-loc-1');data.delete('lead-configured-loc-1');await expect(saveScheduleHealthSettingsAction(data)).rejects.toThrow('invalid_staffing');expect(mocks.saveSettings).not.toHaveBeenCalled();});
it.each(['true','false'])('explicit %s Lead choice for unconfigured staffing is saved',async choice=>{mocks.unconfigured=true;const data=form();data.delete('lead-loc-1');data.delete('lead-configured-loc-1');data.set('lead-choice-loc-1',choice);await expect(saveScheduleHealthSettingsAction(data)).rejects.toThrow('saved=1');expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ staffingSettings: [{locationId:'loc-1',minimumStaffPerShift:2,requiresDesignatedLead:choice==='true'}], proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER") }));});

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
    proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER"),
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
    proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER"),
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
  expect(mocks.saveSettings).not.toHaveBeenCalled();
});

it.each(["true", "false"])(
  "preserves stale initial explicit Lead choice %s after another manager configures the location",
  async (choice) => {
    mocks.unconfigured = false;
  mocks.recoveryRole = "MANAGER";
  mocks.signedOut = false;
  mocks.deleteWindow.mockReset();
    const data = form();
    data.delete("lead-loc-1");
    data.delete("lead-configured-loc-1");
    data.set("lead-choice-loc-1", choice);
    expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
      "success",
    );
    expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ staffingSettings: [
      {
        locationId: "loc-1",
        minimumStaffPerShift: 2,
        requiresDesignatedLead: choice === "true",
      },
    ], proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER") }));
  },
);
it("rejects a missing Lead form contract even when current configuration is non-null", async () => {
  const data = form();
  data.delete("lead-loc-1");
  data.delete("lead-configured-loc-1");
  expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
    "error",
  );
  expect(mocks.saveSettings).not.toHaveBeenCalled();
});
it("rejects conflicting Lead input shapes instead of choosing one", async () => {
  const data = form();
  data.set("lead-choice-loc-1", "false");
  expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
    "error",
  );
  expect(mocks.saveSettings).not.toHaveBeenCalled();
});
it("configured checkbox explicitly supports false through its form-presence marker", async () => {
  const data = form();
  data.delete("lead-loc-1");
  data.delete("lead-configured-loc-1");
  data.set("lead-configured-loc-1", "true");
  expect(await saveScheduleHealthSettingsFormAction(data)).toHaveProperty(
    "success",
  );
  expect(mocks.saveSettings).toHaveBeenCalledWith(expect.objectContaining({ staffingSettings: [
    {
      locationId: "loc-1",
      minimumStaffPerShift: 2,
      requiresDesignatedLead: false,
    },
  ], proof: managementProof("trusted-manager", mocks.role as "OWNER" | "MANAGER") }));
});

vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>managementProof('trusted-manager', mocks.role as 'OWNER'|'MANAGER'|'EMPLOYEE'|'LEAD')}));
vi.mock('@/lib/shift-changes/policy-form',()=>import('../../../../lib/shift-changes/policy-form'));
vi.mock('@/lib/data/shift-change-policy',()=>({saveShiftChangePolicy:vi.fn()}));
vi.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));

function deleteForm() { const data = new FormData(); data.set('windowId','window'); return data; }
const managementDenied = () => Object.assign(new Error('invalid input syntax for type integer: "management_authorization"'), {code:'22P02'});
it.each(['revoked','demoted','same-manager'])('native Remove recovers expected %s authority denial without reporting success', async kind => {
  mocks.deleteWindow.mockRejectedValue(managementDenied());
  mocks.signedOut = kind==='revoked'; mocks.recoveryRole=kind==='demoted'?'EMPLOYEE':'MANAGER';
  await expect(deleteCoverageWindowAction(deleteForm())).rejects.toThrow(kind==='demoted'?'redirect:/app':'redirect:/login');
});
it.each([
  Object.assign(new Error('database connection unavailable'),{code:'08006'}),
  Object.assign(new Error('invalid input syntax for type integer: "different_guard"'),{code:'22P02'}),
  Object.assign(new Error('invalid input syntax for type integer: "management_authorization"'),{code:'23505'}),
  new Error('invalid input syntax for type integer: "management_authorization"'),
])('native Remove propagates unexpected database/infrastructure failure %# unchanged', async error => {
  mocks.deleteWindow.mockRejectedValue(error);
  await expect(deleteCoverageWindowAction(deleteForm())).rejects.toBe(error);
});

// Unit-only admission I/O; real Company/current-scope behavior and rollback are
// exercised in company-access-configuration.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'w',name:'Fictional',active:true,timeZone:'America/New_York',createdAt:'',updatedAt:'version'}})}));
