import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async () => ({ id: "manager", role: "MANAGER" }),
}));
vi.mock("@/components/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/components/status-pill", () => import("../../../components/status-pill"));
vi.mock("@/lib/employee-display", () => ({
  employeeInitials: (firstName: string, lastName: string) => firstName[0] + lastName[0],
  employeeRoleLabel: (role: string) => role,
}));
vi.mock("@/lib/phone", () => ({ formatPhoneNumber: (value: string) => value }));
vi.mock("@/lib/data/employees", () => ({
  listEmployees: async () => [
    { id:"active",firstName:"Active",lastName:"Person",phone:"7875550101",role:"EMPLOYEE",primaryLocationId:"loc",eligibleLocationIds:["loc"],positionIds:[],active:true },
    { id:"inactive",firstName:"Inactive",lastName:"Person",phone:"7875550102",role:"LEAD",primaryLocationId:"loc",eligibleLocationIds:["loc"],positionIds:[],active:false },
  ],
  listLocations: async () => [{ id:"loc",workspaceId:"w",clockerKey:"loc",name:"Main",shortName:"Main",active:true }],
}));

import EmployeesPage from "./page";

it("keeps inactive employees discoverable with an explicit status", async () => {
  const html = renderToStaticMarkup(await EmployeesPage());
  expect(html).toContain('class="status-pill success">Active</span>');
  expect(html).toContain('class="status-pill neutral">Inactive</span>');
  expect(html).toContain('href="/app/employees/inactive"');
});
