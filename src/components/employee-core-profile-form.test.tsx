import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';

const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));



import { EmployeeCoreProfileForm, EmployeeStatusForm } from "./employee-core-profile-form";

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
      actorId="OWNER1" actorRole="OWNER"
      action={rs.fn()}
    />,
  );
  expect(html).toContain('name="employeeId" value="worker"');
  // Version custody now travels in one command JSON field; mounted command tests
  // verify the opened employee/scope revisions through actual submission.
  expect(html).not.toContain('name="id"');
  expect(html).toContain("Edit employee");
  expect(html.match(/maxLength="160"/g)).toHaveLength(2);
  expect(html).toMatch(/type="email"[^>]*maxLength="254"|maxLength="254"[^>]*type="email"/);
  // Release 1 (O-PersonAccess): the account status changes on Access and sign-in; the edit sheet keeps it as it is.
  expect(html).toContain('name="active" value="false"');
  const status = renderToStaticMarkup(<EmployeeStatusForm employee={{ ...employee, active: true }} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()} />);
  expect(status).toContain("Deactivate Sam");
  expect(status).toContain('name="active" value="false"');
  expect(status).toContain("They’re signed out right away");
  expect(status).toContain("Their history stays");
  const reactivate = renderToStaticMarkup(<EmployeeStatusForm employee={employee} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()} />);
  expect(reactivate).toContain("Reactivate Sam");
  expect(reactivate).toContain('name="active" value="true"');
  expect(reactivate).toContain("They sign in again after this");
});

it("keeps the current inactive primary location visible without offering unrelated inactive locations", () => {
  const html = renderToStaticMarkup(
    <EmployeeCoreProfileForm
      employee={employee}
      locations={locations}
      actorId="OWNER1" actorRole="OWNER"
      action={rs.fn()}
    />,
  );
  expect(html).toContain("Old (Inactive — can only be retained while inactive)");
  expect(html).toContain("Active");
  expect(html).not.toContain("Other Old");
  expect(html).toContain('name="active"');
  expect(html).toContain("Choose an active location before reactivating");
});

it("only offers Owner authority to an Owner actor", () => {
  const ownerHtml = renderToStaticMarkup(
    <EmployeeCoreProfileForm employee={employee} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()} />,
  );
  const managerHtml = renderToStaticMarkup(
    <EmployeeCoreProfileForm employee={employee} locations={locations} actorId="OWNER1" actorRole="MANAGER" action={rs.fn()} />,
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

it("shows the optional employment dates only when they were read for this editor, with the termination note", () => {
  const without = renderToStaticMarkup(<EmployeeCoreProfileForm employee={employee} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()} />);
  expect(without).not.toContain('name="hireDate"');
  expect(without).not.toContain('name="birthDate"');
  const html = renderToStaticMarkup(<EmployeeCoreProfileForm employee={employee} locations={locations} actorId="OWNER1" actorRole="MANAGER" action={rs.fn()}
    employmentDates={{ hireDate: "2015-03-02", terminationDate: null, birthDate: "1990-05-01" }} />);
  expect(html).toMatch(/type="date"[^>]*name="hireDate"[^>]*value="2015-03-02"/);
  expect(html).toMatch(/type="date"[^>]*name="terminationDate"[^>]*value=""/);
  expect(html).toMatch(/type="date"[^>]*name="birthDate"[^>]*value="1990-05-01"/);
  expect(html).toContain("It doesn’t deactivate anyone.");
  expect(html).toContain("Only Owners and Managers who can edit this profile see it.");
  // The account status still travels unchanged in the same command.
  expect(html).toContain('name="active" value="false"');
  // Deactivate and Reactivate never carry dates, so they can't clear them.
  const status = renderToStaticMarkup(<EmployeeStatusForm employee={{ ...employee, active: true }} locations={locations} actorId="OWNER1" actorRole="OWNER" action={rs.fn()} />);
  expect(status).not.toMatch(/hireDate|terminationDate|birthDate/);
});
