import { afterEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ role: "OWNER", company: true }));
vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({ role: auth.role }),
  requireSessionMutationProof: async () => ({}),
}));
vi.mock("@/lib/company-access/operational-scope.server", () => ({
  readOperationalAuthority: async () => ({
    state: "ready",
    role: auth.role,
    scope: { mode: auth.company ? "COMPANY" : "NONE" },
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("not-found");
  },
}));
import Page from "@/app/app/ai-manager/page";
afterEach(() => {
  vi.unstubAllEnvs();
  auth.role = "OWNER";
  auth.company = true;
});
it("fails closed by default and rejects every non-Owner role even when enabled", async () => {
  for (const flag of [undefined, "false", "TRUE"]) {
    vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", flag);
    await expect(Page()).rejects.toThrow("not-found");
  }
  vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "true");
  for (const role of ["MANAGER", "EMPLOYEE", "LEAD"]) {
    auth.role = role;
    await expect(Page()).rejects.toThrow("not-found");
  }
  auth.role = "OWNER";
  auth.company = false;
  await expect(Page()).rejects.toThrow("not-found");
  auth.company = true;
  expect(await Page()).toBeTruthy();
});
