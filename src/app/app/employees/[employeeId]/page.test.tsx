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

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;});

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({params:Promise.resolve({employeeId:'worker'})}));expect(html).toContain('current company-wide management access');expect(html).not.toContain('Sam');expect(html).not.toContain('employee-core-profile-form');});
