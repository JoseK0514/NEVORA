import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));

vi.mock("@/components/phone-input", () => ({
  PhoneInput: (props: Record<string, unknown>) => createElement("input", props),
}));
vi.mock("@/components/select-field", () => import("./select-field"));

import { EmployeeCoreProfileForm } from "./employee-core-profile-form";

const employee = {
  id: "worker",
  firstName: "Sam",
  lastName: "Rivera",
  phone: "787-555-0101",
  email: "sam@example.invalid",
  role: "EMPLOYEE" as const,
  primaryLocationId: "old",
  eligibleLocationIds: ["old"],
  positionIds: [],
  active: false,
  updatedAt: "2026-10-05 12:00:00+00",
};

const locations = [
  { id: "active", workspaceId: "w", clockerKey: "active", name: "Active Office", shortName: "Active", active: true },
  { id: "old", workspaceId: "w", clockerKey: "old", name: "Old Office", shortName: "Old", active: false },
  { id: "other-old", workspaceId: "w", clockerKey: "other-old", name: "Other Old Office", shortName: "Other Old", active: false },
];

it("renders stable identity and account lifecycle guidance (presentation smoke)", () => {
  const html = renderToStaticMarkup(
    <EmployeeCoreProfileForm
      employee={employee}
      locations={locations}
      actorRole="OWNER"
      action={vi.fn()}
    />,
  );
  expect(html).toContain('name="employeeId" value="worker"');
  // Version custody now travels in one command JSON field; mounted command tests
  // verify the opened employee/scope revisions through actual submission.
  expect(html).not.toContain('name="id"');
  expect(html).toContain("Employee ID");
  expect(html).toContain("worker");
  expect(html.match(/maxLength="160"/g)).toHaveLength(2);
  expect(html).toMatch(/type="email"[^>]*maxLength="254"|maxLength="254"[^>]*type="email"/);
  expect(html).toContain("Deactivation signs this employee out");
  expect(html).toContain("Reactivation requires a fresh sign-in");
  expect(html).toContain("History is preserved");
});

it("keeps the current inactive primary location visible without offering unrelated inactive locations", () => {
  const html = renderToStaticMarkup(
    <EmployeeCoreProfileForm
      employee={employee}
      locations={locations}
      actorRole="OWNER"
      action={vi.fn()}
    />,
  );
  expect(html).toContain("Old (Inactive — can only be retained while inactive)");
  expect(html).toContain("Active");
  expect(html).not.toContain("Other Old");
  expect(html).toContain('name="active"');
  expect(html).toContain('value="true"');
  expect(html).toContain('value="false"');
});

it("only offers Owner authority to an Owner actor", () => {
  const ownerHtml = renderToStaticMarkup(
    <EmployeeCoreProfileForm employee={employee} locations={locations} actorRole="OWNER" action={vi.fn()} />,
  );
  const managerHtml = renderToStaticMarkup(
    <EmployeeCoreProfileForm employee={employee} locations={locations} actorRole="MANAGER" action={vi.fn()} />,
  );
  expect(ownerHtml).toContain('value="OWNER"');
  expect(managerHtml).not.toContain('value="OWNER"');
});

it("uses aligned Apple-mode profile surfaces and a readable full-width commit action", () => {
  const css = readFileSync(cssPath, "utf8");
  expect(css).toMatch(/\.employee-profile-card\s*\{[\s\S]*?width:\s*min\(820px,\s*100%\)/);
  expect(css).toMatch(/\.employee-core-id\s*\{[\s\S]*?display:\s*grid/);
  expect(css).toMatch(/\.employee-core-profile-form\s+\.form-footer\s+\.button\s*\{[\s\S]*?width:\s*100%/);
  expect(css).toMatch(/\.app-shell\s+\.employee-core-profile-form\s+\.form-footer\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  const genericMobileFooter = css.lastIndexOf(
    ".app-shell .employee-form .form-footer:not(.shift-edit-footer)",
  );
  const coreMobileFooter = css.lastIndexOf(
    ".app-shell .employee-core-profile-form .form-footer:not(.shift-edit-footer)",
  );
  expect(coreMobileFooter).toBeGreaterThan(genericMobileFooter);
});
