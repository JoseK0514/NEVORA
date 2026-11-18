import * as rstestOriginal0 from "@/lib/data/locations" with { rstest: 'importActual' };
import * as rstestOriginal1 from "@/lib/data/positions" with { rstest: 'importActual' };
import { beforeEach, it, expect, rs } from '@rstest/core';
const mocks = rs.hoisted(() => ({
  role: "OWNER",
  workspace: rs.fn(),
  location: rs.fn(),
  position: rs.fn(),
}));
rs.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => ({employee:{id:"trusted-owner",role:mocks.role},sessionTokenHash:"a".repeat(64)}) }));
rs.mock("next/cache", () => ({ revalidatePath: rs.fn() }));
rs.mock("@/lib/auth/permissions", () => ({
  requireRoles: async (roles: string[]) => {
    if (!roles.includes(mocks.role)) throw Error("denied");
    return { id: "trusted-owner", role: mocks.role };
  },
}));
rs.mock("@/lib/data/workspaces", () => ({
  getWorkspace: async () => ({ timeZone: "America/New_York" }),
  saveWorkspaceProfile: mocks.workspace,
}));
rs.mock("@/lib/data/locations",  () => ({
  ...rstestOriginal0,
  createLocation: mocks.location,
  updateLocation: mocks.location,
}));
rs.mock("@/lib/data/positions",  () => ({
  ...rstestOriginal1,
  createPosition: mocks.position,
  updatePosition: mocks.position,
}));
import {
  saveWorkspaceProfileAction,
  createLocationAction,
  updateLocationAction,
  createPositionAction,
  updatePositionAction,
} from "./actions";
const actions = [
  saveWorkspaceProfileAction,
  createLocationAction,
  updateLocationAction,
  createPositionAction,
  updatePositionAction,
];
beforeEach(() => {
  rs.clearAllMocks();
  mocks.role = "OWNER";
  mocks.location.mockResolvedValue({ updatedAt: 'own.123457' });
  mocks.position.mockResolvedValue({ updatedAt: 'own.123457' });
});
it.each(["MANAGER", "LEAD", "EMPLOYEE"])(
  "%s cannot mutate structure",
  async (role) => {
    mocks.role = role;
    for (const action of actions)
      await expect(action(new FormData())).rejects.toThrow("denied");
    expect(mocks.workspace).not.toHaveBeenCalled();
    expect(mocks.location).not.toHaveBeenCalled();
    expect(mocks.position).not.toHaveBeenCalled();
  },
);
it("disabled timezone permits name-only save with authoritative zone and actor", async () => {
  const data = new FormData();
  data.set("name", "Northside Renamed");
  data.set("workspaceId", "forged");
  data.set("actorEmployeeId", "forged");
  expect(await saveWorkspaceProfileAction(data)).toEqual({
    // B7 wording (glossary: company, not workspace).
    success: "Company profile saved.",
  });
  expect(mocks.workspace).toHaveBeenCalledWith({
    name: "Northside Renamed",
    timeZone: "America/New_York",
    actorEmployeeId: "trusted-owner",
    proof: { employee: {id:"trusted-owner",role:"OWNER"},sessionTokenHash:"a".repeat(64) },
  });
});
it("forged enabled timezone still reaches authoritative repository lock", async () => {
  mocks.workspace.mockRejectedValueOnce(
    new Error(
      "Changing the business timezone requires a separately reviewed conversion because operational records already exist.",
    ),
  );
  const data = new FormData();
  data.set("name", "Northside");
  data.set("timeZone", "America/Chicago");
  expect(await saveWorkspaceProfileAction(data)).toHaveProperty(
    "error",
    "Changing the business timezone requires a separately reviewed conversion because operational records already exist.",
  );
  expect(mocks.workspace.mock.calls[0][0].timeZone).toBe("America/Chicago");
});
it("validation reports useful name and timezone messages without exposing SQL", async () => {
  for (const message of [
    "Enter your business name (1–160 characters).",
    "Choose a valid IANA business timezone.",
  ]) {
    mocks.workspace.mockRejectedValueOnce(Error(message));
    expect(await saveWorkspaceProfileAction(new FormData())).toEqual({
      error: message,
    });
  }
  mocks.position.mockRejectedValueOnce(Error("SQL private detail"));
  expect((await createPositionAction(new FormData())).error).not.toContain(
    "SQL",
  );
});
it("location update never accepts a replacement Clocker key", async () => {
  const data = new FormData();
  data.set("id", "west");
  data.set("name", "Renamed");
  data.set("shortName", "West");
  data.set("clockerKey", "forged");
  data.set("active", "on");
  data.set("expectedUpdatedAt", "reviewed.123456");
  await updateLocationAction(data);
  expect(mocks.location).toHaveBeenCalledWith({
    id: "west",
    name: "Renamed",
    shortName: "West",
    active: true,
    expectedUpdatedAt: "reviewed.123456",
    actorEmployeeId: "trusted-owner",
    proof: { employee: {id:"trusted-owner",role:"OWNER"},sessionTokenHash:"a".repeat(64) },
  });
});
