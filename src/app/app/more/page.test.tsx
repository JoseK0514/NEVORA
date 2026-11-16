import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Fictional reads only: the page's own role, scope, payroll and brand inputs.
const fixture = vi.hoisted(() => ({ role: "OWNER" }));
vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, usePathname: () => "/app/more", useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "fictional", role: fixture.role, firstName: "Ana", lastName: "Colón" }),
  requireSessionMutationProof: async () => ({ employee: { id: "fictional", role: fixture.role }, sessionTokenHash: "a".repeat(64) }) }));
vi.mock("@/lib/payroll/service", () => ({ payrollFeatureEnabled: () => false, readPayrollCapabilities: async () => undefined }));
vi.mock("@/lib/company-access/operational-scope.server", () => ({ readOperationalAuthority: async () => ({ state: "ready", employeeId: "fictional", role: "MANAGER", source: "LEGACY_ADOPTION", scope: { mode: "COMPANY", locationIds: [] }, scopeRevision: 1, authority: "fictional", locations: [], observedAt: "2026-11-14T12:00:00Z", validForMs: 15000 }) }));
vi.mock("@/lib/workspace-presentation/current.server", () => ({ currentBrand: async () => ({ words: "standard", modules: undefined }) }));
vi.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ id: "w", name: "Fictional Workspace", timeZone: "America/Puerto_Rico", active: true }) }));
vi.mock("@/lib/reports/service", () => ({ readReports: async () => ({ state: "unavailable" }) }));
vi.mock("@/components/notification-bell", () => ({ NotificationCount: () => null }));
vi.mock("@/components/portal-signout", () => ({ PortalSignout: ({ children }: { children: ReactNode }) => createElement("form", null, children) }));
vi.mock("@/lib/employee-view-authority.server", () => ({ employeeViewAuthority: () => "fictional" }));
vi.mock("@/lib/data/employee-profile.server", () => ({ readEmployeeProfile: async () => null }));
vi.mock("@/lib/data/availability", () => ({ listAvailability: async () => [] }));
vi.mock("@/components/employee-b/account-b", () => ({ EmployeeMoreB: () => null }));

import MorePage from "./page";

beforeEach(() => { fixture.role = "OWNER"; });
afterEach(() => { vi.unstubAllEnvs(); });

// Review Nov 14 (AR-13, JR-4): an Owner's phone More leads to the subscription, only where this deployment has billing on.
it("lists Plan and billing for an Owner only while billing is on for this deployment", async () => {
  expect(renderToStaticMarkup(await MorePage())).not.toContain('href="/app/billing"');
  vi.stubEnv("NEVORA_COMMERCE_ENABLED", "true");
  const out = renderToStaticMarkup(await MorePage());
  expect(out.match(/<a href="\/app\/billing" class="c-row c-row--one"/g)).toHaveLength(1);
  expect(out).toContain('<span class="c-row__title">Plan and billing</span>');
  // It follows Settings and comes before Help.
  expect(out.indexOf('href="/app/settings"')).toBeLessThan(out.indexOf('href="/app/billing"'));
  expect(out.indexOf('href="/app/billing"')).toBeLessThan(out.indexOf('href="/app/help"'));
});
it("never lists Plan and billing for a Manager", async () => {
  fixture.role = "MANAGER";
  vi.stubEnv("NEVORA_COMMERCE_ENABLED", "true");
  const out = renderToStaticMarkup(await MorePage());
  expect(out).not.toContain('href="/app/billing"');
  expect(out).toContain('href="/app/help"');
});
