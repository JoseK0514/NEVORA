import { beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { shiftDurationLabel } from "./shift-edit-timing";

const mocks = vi.hoisted(() => ({
  roles: vi.fn(),
  shift: vi.fn(),
  employees: vi.fn(),
  locations: vi.fn(),
  positions: vi.fn(),
  redirect: vi.fn((href: string) => { throw new Error(href); }),
}));
vi.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.roles, MANAGER_ROLES: ["OWNER", "MANAGER"] }));
vi.mock("@/lib/data/schedules", () => ({ getShiftForManagement: mocks.shift }));
vi.mock("@/lib/data/employees", () => ({ listEmployees: mocks.employees, listLocations: mocks.locations }));
vi.mock("@/lib/data/positions", () => ({ listPositions: mocks.positions }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/app/schedule/actions", () => ({ updateShiftAction: vi.fn(), deleteShiftAction: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.roles.mockResolvedValue({ id: "OWNER", role: "OWNER" });
  mocks.shift.mockResolvedValue({ id: "test-shift", employeeId: "AVERY", employeeName: "Avery Rivera", locationId: "main", weekStart: "2026-10-12", date: "2026-10-14", startTime: "08:00", endTime: "16:00", notes: "Opening team", isDesignatedLead: true, positionId: "support" });
  mocks.employees.mockResolvedValue([{ id: "AVERY", firstName: "Avery", lastName: "Rivera", active: true, role: "LEAD", positionIds: ["support"] }]);
  mocks.locations.mockResolvedValue([{ id: "main", name: "Main Office" }]);
  mocks.positions.mockResolvedValue([{ id: "support", name: "Support", active: true }]);
});

it("retains the editable assignment, notes, lead, and shift identity and restricts date to its existing week", async () => {
  const { default: Page } = await import("./page");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ shiftId: "test-shift" }) }));
  for (const name of ["employeeId", "positionId", "date", "startTime", "endTime", "isDesignatedLead", "notes"]) expect(html).toContain(`name="${name}"`);
  expect(html.match(/name="shiftId" value="test-shift"/g)).toHaveLength(2);
  expect(html).toContain('min="2026-10-12" max="2026-10-18"');
  expect(html).toContain('value="support" selected=""');
  expect(html).toContain("Opening team</textarea>");
  // Delete is its own form, behind a disclosure, after the edit form (never nested in it).
  expect(html.match(/<form/g)).toHaveLength(2);
  expect(html.indexOf('id="edit-shift-delete"')).toBeGreaterThan(html.indexOf('id="edit-shift-form"'));
  expect(html).toContain('/app/schedule?week=2026-10-12');
  // W2: Cancel returns to this shift's location, day and person.
  expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=main&amp;day=2026-10-14#schedule-employee-AVERY"');
  expect(mocks.roles).toHaveBeenCalledWith(["OWNER", "MANAGER"]);
  expect(mocks.roles.mock.invocationCallOrder[0]).toBeLessThan(mocks.shift.mock.invocationCallOrder[0]);
});

it("keeps invalid shift redirects and announced validation errors", async () => {
  const { default: Page } = await import("./page");
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('/app/schedule?error=INVALID_SHIFT');
  expect(mocks.shift).not.toHaveBeenCalled();
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ shiftId: "test-shift", error: "SHIFT_OVERLAP" }) }));
  expect(html).toContain('role="alert"');
  expect(html).toContain("That person already has a shift at this time.");
  mocks.shift.mockResolvedValue(null);
  await expect(Page({ searchParams: Promise.resolve({ shiftId: "missing" }) })).rejects.toThrow('/app/schedule?error=INVALID_SHIFT');
});

it("exposes the complete selected employee name when a native select may truncate it", async () => {
  mocks.employees.mockResolvedValue([{ id: "AVERY", firstName: "Alexandra", lastName: "Montgomery-Williams", active: true, role: "LEAD", positionIds: ["support"] }]);
  const { default: Page } = await import("./page");
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ shiftId: "test-shift" }) }));
  expect(html).toContain("Selected employee: Alexandra Montgomery-Williams");
});

it("uses the canonical nominal shift period for fractional, overnight, midnight, and invalid durations", () => {
  expect(shiftDurationLabel("2026-10-14", "08:00", "16:30")).toBe("8h 30m scheduled");
  expect(shiftDurationLabel("2026-10-14", "08:00", "08:15")).toBe("15m scheduled");
  expect(shiftDurationLabel("2026-10-14", "22:00", "06:00")).toBe("8h scheduled · Ends next day");
  expect(shiftDurationLabel("2026-10-14", "16:00", "24:00")).toBe("8h scheduled");
  for (const end of ["", "08:00", "25:00"]) expect(shiftDurationLabel("2026-10-14", "08:00", end)).toBe("Enter a valid start and end time.");
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=vi.hoisted(()=>({denied:false,scoped:false,saveAvailability:'available'}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,locations:[{id:'main',name:'Managed location',shortName:'Managed'}],scope:{mode:operationalPageFixture.scoped?'LOCATIONS':'COMPANY',locationIds:operationalPageFixture.scoped?['main']:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;operationalPageFixture.scoped=false;operationalPageFixture.saveAvailability='available';});

vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({shiftId:'test-shift'})}));expect(html).toContain('current company-wide management access');expect(mocks.shift).not.toHaveBeenCalled();expect(mocks.employees).not.toHaveBeenCalled();expect(html).not.toContain('name="shiftId"');});

vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:['main']},data:{weekStart:'2026-10-12',locationId:'main',shift:{id:'test-shift',scheduleId:'week',employeeId:'AVERY',employeeName:'Avery Rivera',locationId:'main',weekStart:'2026-10-12',date:'2026-10-14',startTime:'16:00',endTime:'24:00',positionId:'support',notes:'Scoped note',isDesignatedLead:false,isCalloutApproved:false,scheduleStatus:operationalPageFixture.saveAvailability==='requires_company'?'PUBLISHED':'DRAFT'},employeeOptions:[{id:'AVERY',name:'Avery Rivera',positionIds:['support']}],positionOptions:[{id:'support',name:'Support'}],sourceVersion:'fixture',saveAvailability:operationalPageFixture.saveAvailability}})}));
it('uses the actual minimal manual editor for scoped drafts without global employee catalogs',async()=>{
 operationalPageFixture.scoped=true;const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})}));expect(html).toContain('Edit draft shift');expect(html).toContain('name="endTime" value="24:00"');expect(html).toContain('Review deletion');expect(html).not.toContain('Delete this draft shift');expect(mocks.shift).not.toHaveBeenCalled();expect(mocks.employees).not.toHaveBeenCalled();expect(mocks.locations).not.toHaveBeenCalled();
});
it.each(['requires_company','unavailable'])('keeps scoped editor read-only when save hint is %s',async saveAvailability=>{
 operationalPageFixture.scoped=true;operationalPageFixture.saveAvailability=saveAvailability;const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})}));expect(html).toContain('Shift details');expect(html).not.toContain('Save changes');expect(html).not.toContain('Save shift');expect(mocks.shift).not.toHaveBeenCalled();
});
it.each(['available','requires_company','unavailable'])('announces a real scoped edit redirect error in %s while retaining context',async saveAvailability=>{
 operationalPageFixture.scoped=true;operationalPageFixture.saveAvailability=saveAvailability;
 const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift',error:'INVALID_SHIFT'})}));
 expect(html).toContain('role="alert"');expect(html).toContain('The shift could not be updated.');expect(html).toContain('Avery Rivera');
 expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=main"');
 expect(mocks.shift).not.toHaveBeenCalled();expect(mocks.employees).not.toHaveBeenCalled();expect(mocks.locations).not.toHaveBeenCalled();
});
it.each(['UNTRUSTED_QUERY_TEXT','constructor'])('scoped edit uses safe generic feedback for unknown redirect code %s',async error=>{
 operationalPageFixture.scoped=true;const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift',error})}));
 expect(html).toContain('role="alert"');expect(html).toContain('The shift could not be updated.');expect(html).not.toContain(error);
});
