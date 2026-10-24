import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const access=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>access.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'reviewer',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));

const m = vi.hoisted(() => ({ role: "MANAGER", noLocations: false }));
beforeEach(() => { m.role = "MANAGER"; m.noLocations = false; access.denied=false; });

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
vi.mock("@/components/phone-input", () => ({
  PhoneInput: (props: React.ComponentProps<"input">) => createElement("input", props),
}));
vi.mock("@/components/employee-scheduling-fields", () => ({
  EmployeeSchedulingFields: () => null,
}));
vi.mock("@/components/select-field", () => import("../../../../components/select-field"));
vi.mock("@/app/app/employees/actions", () => ({ createEmployeeFormAction: vi.fn() }));

import NewEmployeePage from "./page";

it("keeps native selects and role options (presentation smoke)", async () => {
  m.role = "MANAGER";
  const manager = renderToStaticMarkup(
    await NewEmployeePage({ searchParams: Promise.resolve({}) }),
  );
  // Quiet (v4): Role and Location are picker rows (native selects); the sheet's Save submits the form.
  expect(manager.match(/class="q-select-row__control"/g)).toHaveLength(2);
  expect(manager).not.toContain('value="OWNER"');
  expect(manager).toMatch(/name="id"[^>]*maxLength="128"|maxLength="128"[^>]*name="id"/);
  expect(manager.match(/maxLength="160"/g)).toHaveLength(2);
  expect(manager).toMatch(/type="email"[^>]*maxLength="254"|maxLength="254"[^>]*type="email"/);
  expect(manager).toContain('form="new-employee-form"');

  m.role = "OWNER";
  const owner = renderToStaticMarkup(
    await NewEmployeePage({ searchParams: Promise.resolve({}) }),
  );
  expect(owner.match(/class="q-select-row__control"/g)).toHaveLength(2);
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
  // Quiet (v4): a sheet, so Cancel (to Team) is the one way back.
  expect(html.match(/href="\/app\/employees"/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Email, optional"');
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

it('honors company-read denial before loading employee-creation catalogs (presentation boundary)',async()=>{access.denied=true;const html=renderToStaticMarkup(await NewEmployeePage({searchParams:Promise.resolve({})}));expect(html).toContain('Employee creation unavailable');expect(html).toContain('Return to Home');expect(html).not.toContain('new-employee-form');});

// This suite checks server-page composition. Mounted lifetime behavior has its own browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
