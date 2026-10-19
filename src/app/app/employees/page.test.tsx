import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ inactiveLocation: false, empty: false, denied: false, events: [] as string[] }));
beforeEach(() => { fixture.inactiveLocation = false; fixture.empty = false; fixture.denied = false; fixture.events = []; });

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async () => { fixture.events.push("authorize"); if (fixture.denied) throw new Error("forbidden"); return { id: "manager", role: "MANAGER" }; },
}));
vi.mock("@/components/page-header", () => ({ PageHeader: () => null }));
vi.mock("@/components/status-pill", () => import("../../../components/status-pill"));
vi.mock("@/lib/employee-display", () => ({
  employeeInitials: (firstName: string, lastName: string) => firstName[0] + lastName[0],
  employeeRoleLabel: (role: string) => role,
}));
vi.mock("@/lib/phone", () => ({ formatPhoneNumber: (value: string) => value }));
vi.mock("@/lib/data/employees", () => ({
  listEmployees: async () => { fixture.events.push("employees"); return fixture.empty ? [] : [
    { id:"active",firstName:"Active",lastName:"Person",phone:"7875550101",role:"EMPLOYEE",primaryLocationId:"loc",eligibleLocationIds:["loc"],positionIds:[],active:true },
    { id:"inactive",firstName:"Inactive",lastName:"Person",phone:"7875550102",role:"LEAD",primaryLocationId:"loc",eligibleLocationIds:["loc"],positionIds:[],active:false },
  ]; },
  listLocations: async (options?: { includeInactive?: boolean }) => fixture.inactiveLocation && !options?.includeInactive ? [] : [{ id:"loc",workspaceId:"w",clockerKey:"loc",name:"Main",shortName:"Main",active:!fixture.inactiveLocation }],
}));

import EmployeesPage from "./page";

it("keeps inactive employees discoverable with an explicit status", async () => {
  const html = renderToStaticMarkup(await EmployeesPage());
  // Inactive people keep an explicit condition pill; active is the default and isn't repeated on every row.
  expect(html).toMatch(/class="nv-status" data-tone="neutral">[^]*?Inactive<\/span>/);
  // IS-P4-15: the label also says the phone number shown in the desktop table.
  expect(html).toContain('aria-label="Inactive Person, LEAD, Main, 7875550102, inactive"');
  expect(html).toContain('href="/app/employees/inactive"');
});

it("renders the retained inactive primary location truthfully in the employee directory", async () => {
  fixture.inactiveLocation = true;
  const html = renderToStaticMarkup(await EmployeesPage());
  expect(html).toMatch(/Main[^<]*Inactive/);
  expect(html).not.toContain("Location not assigned");
  expect(html).toContain('href="/app/employees/inactive"');
  expect(html).toMatch(/data-tone="neutral">[^]*?Inactive<\/span>/);
});

it("authorizes before loading any employee data", async () => {
  fixture.denied = true;
  await expect(EmployeesPage()).rejects.toThrow("forbidden");
  expect(fixture.events).toEqual(["authorize"]);
});

it("renders a native URL filter form, both status segments, and existing destinations", async () => {
  const html = renderToStaticMarkup(await EmployeesPage());
  expect(html).toContain('action="/app/employees"');
  expect(html).toContain('name="q"');
  expect(html).toContain('name="role"');
  expect(html).toContain('name="location"');
  expect(html).toMatch(/<button(?=[^>]*name="status")(?=[^>]*value="inactive")[^>]*>/);
  expect(html).toContain('href="/app/employees/new"');
  expect(html).toContain('href="/app/employees/active"');
});

it("shows inactive matches and retains the active state in segment selection", async () => {
  const html = renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve({ status: "inactive", role: "LEAD" }) }));
  expect(html).toContain('href="/app/employees/inactive"');
  expect(html).not.toContain('href="/app/employees/active"');
  expect(html).toContain('value="inactive" aria-pressed="true"');
  expect(html).toContain("1 of 2");
});

it("distinguishes no matches from a genuinely empty workforce", async () => {
  const noMatch = renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve({ q: "nobody" }) }));
  expect(noMatch).toContain("No matching employees");
  expect(noMatch).toContain('<h1 class="nv-masthead__title"');
  expect(noMatch).toContain("Clear filters");
  expect(noMatch).not.toContain("Your team starts here");
  fixture.empty = true;
  const empty = renderToStaticMarkup(await EmployeesPage());
  expect(empty).toContain("Your team starts here");
  expect(empty).toContain('href="/app/employees/new"');
});
