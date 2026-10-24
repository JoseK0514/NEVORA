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
  // Quiet (v4): inactive people sit in their own Inactive group at the end, and their rows say so to assistive tech.
  expect(html).toContain('<h2 id="team-inactive-title">Inactive</h2>');
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
  expect(html).toContain('<h2 id="team-inactive-title">Inactive</h2>');
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
  // Quiet (v4): search only; people are grouped by location, then No location and Inactive.
  expect(html).toContain('type="search"');
  expect(html).not.toContain('name="role"');
  expect(html).toContain('href="/app/employees/new"');
  expect(html).toContain('href="/app/employees/active"');
});

it("shows inactive matches and retains the active state in segment selection", async () => {
  const html = renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve({ status: "inactive", role: "LEAD" }) }));
  expect(html).toContain('href="/app/employees/inactive"');
  expect(html).not.toContain('href="/app/employees/active"');
  expect(html).toContain('<input type="hidden" name="role" value="LEAD"/>');
  expect(html).toContain("1 of 2");
});

it("distinguishes no matches from a genuinely empty workforce", async () => {
  const noMatch = renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve({ q: "nobody" }) }));
  expect(noMatch).toContain("No employees match “nobody”.");
  expect(noMatch).toContain("<h1>Team</h1>");
  expect(noMatch).toContain('href="/app/employees" class="q-btn q-btn--sec">Clear search</a>');
  expect(noMatch).not.toContain("No employees yet.");
  fixture.empty = true;
  const empty = renderToStaticMarkup(await EmployeesPage());
  expect(empty).toContain("No employees yet.");
  expect(empty).toContain('href="/app/employees/new"');
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=vi.hoisted(()=>({denied:false,scoped:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;operationalPageFixture.scoped=false;});

vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({}));expect(html).toContain('current company-wide management access');expect(fixture.events).toEqual(['authorize']);expect(html).not.toContain('Active Person');});

it('uses the released minimal directory projection for a location-scoped Manager',async()=>{
 operationalPageFixture.scoped=true;
 const html=renderToStaticMarkup(await EmployeesPage());
 expect(html).toContain('Local Person');expect(html).not.toContain('Active Person');
 expect(html).not.toContain('href="/app/employees/local"');expect(html).not.toContain('href="/app/employees/new"');
 expect(fixture.events).toEqual(['authorize']);
});
vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalDirectory:async()=>{
 if(operationalPageFixture.denied)return {state:'unavailable',reason:'access_denied'};
 if(operationalPageFixture.scoped)return {state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:['loc']},data:{mode:'LOCATIONS',employees:[{id:'local',firstName:'Local',lastName:'Person',role:'EMPLOYEE',locationIds:['loc']}],locations:[{id:'loc',name:'Main',shortName:'Main',active:true}]}};
 const source=await import('@/lib/data/employees');return {state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'COMPANY',locationIds:[]},data:{mode:'COMPANY',employees:await source.listEmployees(),locations:await source.listLocations({includeInactive:true})}};
}}));
