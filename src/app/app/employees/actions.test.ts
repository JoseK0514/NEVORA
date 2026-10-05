import { beforeEach, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  role: "MANAGER",
  insert: vi.fn(),
  profile: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw Error(path);
  },
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async (roles: string[]) => {
    if (!roles.includes(m.role)) throw Error("denied");
    return { id: "actor", role: m.role };
  },
}));
vi.mock("@/lib/data/employees", () => ({
  insertEmployee: m.insert,
  saveEmployeeSchedulingProfile: m.profile,
}));
vi.mock("@/lib/phone", () => import("../../../lib/phone"));
import {
  createEmployeeFormAction,
  saveEmployeeSchedulingProfileAction,
} from "./actions";
beforeEach(() => {
  vi.clearAllMocks();
  m.role = "MANAGER";
});
it("employee creation sends qualifications in the single employee commit with trusted actor", async () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    id: "sam",
    firstName: "Sam",
    lastName: "Rivera",
    phone: "7875550101",
    role: "EMPLOYEE",
    primaryLocationId: "west",
    positionIds: "cashier",
    actorEmployeeId: "forged",
  }))
    data.set(key, value);
  expect(await createEmployeeFormAction(data)).toHaveProperty("success");
  expect(m.insert).toHaveBeenCalledTimes(1);
  expect(m.insert.mock.calls[0][0]).toMatchObject({
    id: "SAM",
    positionIds: ["cashier"],
    actorEmployeeId: "actor",
  });
  expect(m.profile).not.toHaveBeenCalled();
});
it.each(["EMPLOYEE", "LEAD"])(
  "%s cannot forge own qualifications",
  async (role) => {
    m.role = role;
    await expect(
      saveEmployeeSchedulingProfileAction(new FormData()),
    ).rejects.toThrow("denied");
    expect(m.profile).not.toHaveBeenCalled();
  },
);
it("invalid required inputs returns local feedback with no write", async () => {
  expect(await createEmployeeFormAction(new FormData())).toEqual({
    error: "Complete all required employee fields.",
  });
  expect(m.insert).not.toHaveBeenCalled();
});

vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:vi.fn()}));
vi.mock('@/lib/shift-changes/policy-form',()=>import('../../../lib/shift-changes/policy-form'));
vi.mock('@/lib/data/shift-change-policy',()=>({saveOperationalRuleProfile:vi.fn()}));
vi.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
