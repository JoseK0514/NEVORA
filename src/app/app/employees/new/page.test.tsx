import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ role: "MANAGER" }));

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
    { id:"loc",workspaceId:"w",clockerKey:"loc",name:"Main Office",shortName:"Main",active:true },
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
  expect(manager).toContain("contact, access and scheduling");
  expect(manager).not.toContain("Only scheduling information is collected");

  m.role = "OWNER";
  const owner = renderToStaticMarkup(
    await NewEmployeePage({ searchParams: Promise.resolve({}) }),
  );
  expect(owner.match(/class="nevora-select"/g)).toHaveLength(2);
  expect(owner).toContain('value="OWNER"');
});
