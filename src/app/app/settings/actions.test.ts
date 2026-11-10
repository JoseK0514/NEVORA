import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  role: "OWNER",
  workspace: vi.fn(),
  location: vi.fn(),
  position: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => ({employee:{id:"trusted-owner",role:mocks.role},sessionTokenHash:"a".repeat(64)}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({
  requireRoles: async (roles: string[]) => {
    if (!roles.includes(mocks.role)) throw Error("denied");
    return { id: "trusted-owner", role: mocks.role };
  },
}));
vi.mock("@/lib/data/workspaces", () => ({
  getWorkspace: async () => ({ timeZone: "America/New_York" }),
  saveWorkspaceProfile: mocks.workspace,
}));
vi.mock("@/lib/data/locations", async original => ({
  ...await original<Record<string, unknown>>(),
  createLocation: mocks.location,
  updateLocation: mocks.location,
}));
vi.mock("@/lib/data/positions", async original => ({
  ...await original<Record<string, unknown>>(),
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
  vi.clearAllMocks();
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
