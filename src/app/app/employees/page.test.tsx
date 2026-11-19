import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

const fixture = rs.hoisted(() => ({ inactiveLocation: false, empty: false, denied: false, positionsFailed:false, owner: false, importOff: false, events: [] as string[] }));
beforeEach(() => { fixture.inactiveLocation = false; fixture.empty = false; fixture.denied = false; fixture.positionsFailed=false; fixture.owner = false; fixture.importOff = false; fixture.events = []; });

rs.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
rs.mock("next/navigation", () => ({ useRouter: () => ({ push: rs.fn() }) }));
// The staff list import works only where company workspaces are routed; Team offers its link on the same condition.
rs.mock('@/lib/workspace-routing/config.server', () => ({ readWorkspaceRoutingConfig: () => { if (fixture.importOff) throw Error('Fictional single-company deployment'); return {}; } }));
rs.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async () => { fixture.events.push("authorize"); if (fixture.denied) throw new Error("forbidden"); return { id: "manager", role: fixture.owner ? "OWNER" : "MANAGER" }; },
}));
rs.mock("@/components/page-header", () => ({ PageHeader: () => null }));

rs.mock("@/lib/employee-display", () => ({
  employeeInitials: (firstName: string, lastName: string) => firstName[0] + lastName[0],
  employeeRoleLabel: (role: string) => role,
}));
rs.mock("@/lib/phone", () => ({ formatPhoneNumber: (value: string) => value }));
rs.mock("@/lib/data/employees", () => ({
  listEmployees: async () => { fixture.events.push("employees"); return fixture.empty ? [] : [
    { id:"active",firstName:"Active",lastName:"Person",phone:"7875550101",role:"EMPLOYEE",primaryLocationId:"loc",eligibleLocationIds:["loc"],positionIds:[],active:true },
    { id:"inactive",firstName:"Inactive",lastName:"Person",phone:"7875550102",role:"LEAD",primaryLocationId:"loc",eligibleLocationIds:["loc"],positionIds:[],active:false },
  ]; },
  listLocations: async (options?: { includeInactive?: boolean }) => fixture.inactiveLocation && !options?.includeInactive ? [] : [{ id:"loc",workspaceId:"w",clockerKey:"loc",name:"Main",shortName:"Main",active:!fixture.inactiveLocation }],
}));

import EmployeesPage from "./page";

it("keeps inactive employees discoverable with an explicit status", async () => {
  // Release 1 (board G-O-Team): the People card lists active people; Team tools keeps "Inactive people" one tap away.
  const first = renderToStaticMarkup(await EmployeesPage());
  expect(first).toContain('href="/app/employees?all=1#team-inactive"');
  expect(first).not.toContain('href="/app/employees/inactive"');
  const html = renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve({ all: "1" }) }));
  // Inactive people keep their own group, labelled above its card (Owner premium R5); the label says it once, so the
  // rows carry no pill (R3) and say so to assistive tech.
  expect(html).toContain('id="team-inactive-label">Inactive<span class="c-count c-num">1</span></h2>');
  expect(html).not.toContain('class="c-pill c-pill--neutral">Inactive</span>');
  // IS-P4-15: the label also says the phone number shown in the desktop table.
  expect(html).toContain('aria-label="Inactive Person, LEAD, Main, 7875550102, inactive"');
  expect(html).toContain('href="/app/employees/inactive"');
});

it("offers Availability in Team tools to every manager and the staff list import to Owners only, and makes the phone search's magnifier a real Apply target", async () => {
  // Nov 14, 2026 inspection (AR-9, BR-11). Both layouts (the phone screen and the desktop card) carry the rows.
  const manager = renderToStaticMarkup(await EmployeesPage());
  expect(manager.match(/href="\/app\/availability"/g)).toHaveLength(2);
  expect(manager).toContain("Who can work and when");
  expect(manager).not.toContain("/app/employees/import");
  expect(manager).toMatch(/<button type="submit"[^>]*class="b-search__go"[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><span class="b-sr">Apply search<\/span><\/button>/);
  fixture.owner = true;
  const owner = renderToStaticMarkup(await EmployeesPage());
  expect(owner.match(/href="\/app\/employees\/import"/g)).toHaveLength(2);
  expect(owner).toContain("Import a staff list");
  // Where the import cannot work (a single-company deployment) the Owner is not sent to a closed page.
  fixture.importOff = true;
  expect(renderToStaticMarkup(await EmployeesPage())).not.toContain("/app/employees/import");
});

it("says Not clocked in for a started shift with no punch, with how long ago it started (Jose's attendance words, Nov 11, 2026)", async () => {
  const { notClockedInText } = await import("@/components/team-live");
  expect(notClockedInText(55)).toBe("Not clocked in · 55 min");
  expect(notClockedInText(125)).toBe("Not clocked in · 2 h 5 min");
  expect(notClockedInText(120)).toBe("Not clocked in · 2 h");
  expect(notClockedInText(0)).toBe("Not clocked in");
});

it("renders the retained inactive primary location truthfully in the employee directory", async () => {
  fixture.inactiveLocation = true;
  const html = renderToStaticMarkup(await EmployeesPage({ searchParams: Promise.resolve({ all: "1" }) }));
  expect(html).toMatch(/Main[^<]*Inactive/);
  expect(html).not.toContain("Location not assigned");
  expect(html).toContain('href="/app/employees/inactive"');
  expect(html).toContain('id="team-inactive-label">Inactive<span class="c-count c-num">1</span></h2>');
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
  expect(noMatch).toContain('<h1 id="team-title">Team</h1>');
  expect(noMatch).toContain('href="/app/employees" class="c-btn c-btn--secondary c-btn--md">Clear search</a>');
  expect(noMatch).not.toContain("No employees yet.");
  fixture.empty = true;
  const empty = renderToStaticMarkup(await EmployeesPage());
  expect(empty).toContain("No employees yet.");
  expect(empty).toContain('href="/app/employees/new"');
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=rs.hoisted(()=>({denied:false,scoped:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;operationalPageFixture.scoped=false;});

rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({}));expect(html).toContain('current company-wide management access');expect(fixture.events).toEqual(['authorize']);expect(html).not.toContain('Active Person');});

it('uses the released minimal directory projection for a location-scoped Manager',async()=>{
 operationalPageFixture.scoped=true;
 const html=renderToStaticMarkup(await EmployeesPage());
 expect(html).toContain('Local Person');expect(html).not.toContain('Active Person');
 expect(html).not.toContain('href="/app/employees/local"');expect(html).not.toContain('href="/app/employees/new"');
 expect(fixture.events).toEqual(['authorize']);
});
rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalDirectory:async()=>{
 if(operationalPageFixture.denied)return {state:'unavailable',reason:'access_denied'};
 if(operationalPageFixture.scoped)return {state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:['loc']},data:{mode:'LOCATIONS',employees:[{id:'local',firstName:'Local',lastName:'Person',role:'EMPLOYEE',locationIds:['loc']}],locations:[{id:'loc',name:'Main',shortName:'Main',active:true}]}};
 const source=await import('@/lib/data/employees');return {state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'COMPANY',locationIds:[]},data:{mode:'COMPANY',employees:await source.listEmployees(),locations:await source.listLocations({includeInactive:true})}};
}}));

rs.mock('@/lib/data/positions',()=>({listPositions:async()=>{if(fixture.positionsFailed)throw Error('Fictional position source unavailable');return [];}}));
it('withholds a directory when the position source fails instead of replacing positions with access roles',async()=>{
 fixture.positionsFailed=true;const html=renderToStaticMarkup(await EmployeesPage());
 expect(html).toContain('Employees unavailable');expect(html).not.toContain('Active Person');
});
