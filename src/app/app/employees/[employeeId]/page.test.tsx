import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  actorRole: "MANAGER",
  employeeRole: "EMPLOYEE",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async () => ({ id: "actor", role: m.actorRole }),
}));
vi.mock("@/lib/auth/session", () => ({
  requireSessionMutationProof: async () => ({
    employee: { id: "actor", role: m.actorRole },
    sessionTokenHash: "a".repeat(64),
  }),
}));
vi.mock("@/lib/data/employees", () => {
  const employee = () => ({
    id: "worker",
    firstName: "Sam",
    lastName: "Rivera",
    phone: "787-555-0101",
    email: "sam@example.invalid",
    role: m.employeeRole,
    primaryLocationId: "loc",
    eligibleLocationIds: ["loc"],
    positionIds: [],
    active: true,
    updatedAt: "2026-10-05 12:00:00+00",
  });
  return {
    getEmployeeManagementProfile: async () => employee(),
    listEmployees: async () => [employee()],
    listLocations: async () => [
      { id: "loc", workspaceId: "w", clockerKey: "loc", name: "Main Office", shortName: "Main", active: true },
    ],
  };
});
vi.mock("@/lib/data/positions", () => ({ listPositions: async () => [] }));
vi.mock("@/lib/data/shift-change-views", () => ({ readOperationalRuleProfileView: async () => null }));
vi.mock("@/lib/employee-display", () => ({
  employeeInitials: () => "SR",
  employeeRoleLabel: (role: string) => role,
}));
vi.mock("@/lib/phone", () => ({ formatPhoneNumber: (value: string) => value }));
vi.mock("@/components/page-header", () => ({ PageHeader: ({ title }: { title: string }) => createElement("h1", null, title) }));
vi.mock("@/components/employee-core-profile-form", () => ({
  EmployeeCoreProfileForm: () => createElement("div", { "data-testid": "employee-core-form" }, "Employee details"),
}));
vi.mock("@/components/employee-scheduling-fields", () => ({ EmployeeSchedulingFields: () => null }));
vi.mock("@/components/configuration-form", () => ({ ConfigurationForm: ({ children }: { children: React.ReactNode }) => createElement("form", null, children) }));
vi.mock("@/components/operational-rule-fields", () => ({ OperationalRuleFields: () => null }));
vi.mock("../actions", () => ({
  saveEmployeeCoreProfileAction: vi.fn(),
  saveEmployeeSchedulingProfileAction: vi.fn(),
}));

import EmployeeProfilePage from "./page";

beforeEach(() => {
  m.actorRole = "MANAGER";
  m.employeeRole = "EMPLOYEE";
});

it("shows core employee management to a Manager for a non-Owner employee", async () => {
  const html = renderToStaticMarkup(
    await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }),
  );
  expect(html).toContain("Employee details");
  expect(html).toContain("Scheduling profile");
});

it("withholds Owner core-management controls from a Manager", async () => {
  m.employeeRole = "OWNER";
  const html = renderToStaticMarkup(
    await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }),
  );
  expect(html).not.toContain('data-testid="employee-core-form"');
  expect(html).toContain("Only an Owner can change another Owner");
});

it("allows an Owner to manage another Owner", async () => {
  m.actorRole = "OWNER";
  m.employeeRole = "OWNER";
  const html = renderToStaticMarkup(
    await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }),
  );
  expect(html).toContain('data-testid="employee-core-form"');
});

it('links authorized employee management to a separate Clocker PIN screen',async()=>{
 const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}));
 expect(html).toContain('href="/app/employees/worker/clocker-pin"');
 m.employeeRole='OWNER';
 expect(renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}))).not.toContain('/clocker-pin');
});

it('offers account recovery for this employee and links missing hour settings to their row (W2)',async()=>{
 m.employeeRole='EMPLOYEE';
 const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}));
 expect(html).toContain('href="/app/account-recovery?employee=worker"');
 expect(html).toContain('href="/app/schedule/settings#target-worker"');
});
