import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ role: "MANAGER", noLocations: false }));
beforeEach(() => { m.role = "MANAGER"; m.noLocations = false; });

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async () => ({ id: "actor", role: m.role }),
}));
vi.mock("@/lib/data/employees", () => ({
  listLocations: async () => [
    { id:"loc",workspaceId:"w",clockerKey:"loc",name:"Main Office",shortName:"Main",active: !m.noLocations },
  ],
}));
vi.mock("@/lib/data/positions", () => ({ listPositions: async () => [] }));
vi.mock("@/components/page-header", () => ({
  PageHeader: ({ description }: { description?: string }) =>
    createElement("p", null, description),
}));
vi.mock("@/components/configuration-form", () => ({
  ConfigurationForm: ({ children }: { children: React.ReactNode }) =>
    createElement("form", null, children),
}));
vi.mock("@/components/phone-input", () => ({
  PhoneInput: (props: React.ComponentProps<"input">) => createElement("input", props),
}));
vi.mock("@/components/employee-scheduling-fields", () => ({
  EmployeeSchedulingFields: () => null,
}));
vi.mock("@/components/select-field", () => import("../../../../components/select-field"));
vi.mock("@/app/app/employees/actions", () => ({ createEmployeeFormAction: vi.fn() }));

import NewEmployeePage from "./page";

it("uses canonical native-authoritative selects while preserving Owner-only Owner assignment", async () => {
  m.role = "MANAGER";
  const manager = renderToStaticMarkup(
    await NewEmployeePage({ searchParams: Promise.resolve({}) }),
  );
  expect(manager.match(/class="nevora-select"/g)).toHaveLength(2);
  expect(manager).not.toContain('value="OWNER"');
  expect(manager).toMatch(/name="id"[^>]*maxLength="128"|maxLength="128"[^>]*name="id"/);
  expect(manager.match(/maxLength="160"/g)).toHaveLength(2);
  expect(manager).toMatch(/type="email"[^>]*maxLength="254"|maxLength="254"[^>]*type="email"/);
  expect(manager).toContain("contact, access and scheduling");
  expect(manager).not.toContain("Only scheduling information is collected");

  m.role = "OWNER";
  const owner = renderToStaticMarkup(
    await NewEmployeePage({ searchParams: Promise.resolve({}) }),
  );
  expect(owner.match(/class="nevora-select"/g)).toHaveLength(2);
  expect(owner).toContain('value="OWNER"');
});

it("preserves submitted field names, required contact fields and optional email", async () => {
  const html = renderToStaticMarkup(await NewEmployeePage({ searchParams: Promise.resolve({}) }));
  for (const name of ["id", "firstName", "lastName", "phone", "email", "role", "primaryLocationId"]) {
    expect(html).toContain(`name="${name}"`);
  }
  const fields = html.match(/<input[^>]+>/g) ?? [];
  expect(fields.filter(field => /name="(?:id|firstName|lastName|phone)"/.test(field)).every(field => field.includes('required=""'))).toBe(true);
  expect(fields.find(field => field.includes('name="email"'))).not.toContain('required=""');
  expect(html).toContain('value="EMPLOYEE" selected=""');
  expect(html.match(/href="\/app\/employees"/g)).toHaveLength(3);
});

it("blocks creation when no active location exists and supplies the Owner setup route", async () => {
  m.noLocations = true;
  m.role = "OWNER";
  const owner = renderToStaticMarkup(await NewEmployeePage({ searchParams: Promise.resolve({}) }));
  expect(owner).not.toContain('value="loc"');
  expect(owner).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
  expect(owner).toContain('href="/app/settings/locations"');
  m.role = "MANAGER";
  const manager = renderToStaticMarkup(await NewEmployeePage({ searchParams: Promise.resolve({}) }));
  expect(manager).not.toContain('href="/app/settings/locations"');
  expect(manager).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
});

it("announces a server validation error without rendering untrusted error codes", async () => {
  const html = renderToStaticMarkup(await NewEmployeePage({ searchParams: Promise.resolve({ error: '<script>invalid</script>' }) }));
  expect(html).toContain('role="alert"');
  expect(html).not.toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>invalid</script>");
});
