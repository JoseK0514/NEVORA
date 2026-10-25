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
import { OwnersOnlyState } from "@/components/quiet-system-state";
import { OwnerAdvisor } from "@/components/owner-advisor/advisor";
afterEach(() => {
  vi.unstubAllEnvs();
  auth.role = "OWNER";
  auth.company = true;
});
it("fails closed by default and keeps every non-Owner role out even when enabled", async () => {
  for (const flag of [undefined, "false", "TRUE"]) {
    vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", flag);
    await expect(Page()).rejects.toThrow("not-found");
  }
  vi.stubEnv("NEVORA_OWNER_ADVISOR_ENABLED", "true");
  // UX-E-47: with the feature on, anyone else gets the one "Owners only" state, never the advisor.
  for (const role of ["MANAGER", "EMPLOYEE", "LEAD"]) {
    auth.role = role;
    const page = await Page();
    expect(page.type).toBe(OwnersOnlyState);
    expect(page.type).not.toBe(OwnerAdvisor);
  }
  auth.role = "OWNER";
  auth.company = false;
  await expect(Page()).rejects.toThrow("not-found");
  auth.company = true;
  expect(await Page()).toBeTruthy();
});
