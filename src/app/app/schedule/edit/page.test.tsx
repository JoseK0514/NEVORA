import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { shiftDurationLabel } from "./shift-edit-timing";

const mocks = rs.hoisted(() => ({
  roles: rs.fn(),
  shift: rs.fn(),
  employees: rs.fn(),
  locations: rs.fn(),
  positions: rs.fn(),
  redirect: rs.fn((href: string) => { throw new Error(href); }),
}));
rs.mock("@/lib/auth/permissions", () => ({ requireRoles: mocks.roles, MANAGER_ROLES: ["OWNER", "MANAGER"] }));
rs.mock("@/lib/data/schedules", () => ({ getShiftForManagement: mocks.shift }));
rs.mock("@/lib/data/employees", () => ({ listEmployees: mocks.employees, listLocations: mocks.locations }));
rs.mock("@/lib/data/positions", () => ({ listPositions: mocks.positions }));
rs.mock("next/navigation", () => ({ redirect: mocks.redirect }));
rs.mock("@/app/app/schedule/actions", () => ({ updateShiftAction: rs.fn(), deleteShiftAction: rs.fn() }));

rs.mock('@/components/root-chrome',()=>({RootChrome:()=> <span data-test-root-chrome="" />}));
beforeEach(() => {
  rs.clearAllMocks();
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
  // The date is chosen from the shift's own week (seven days, no browser date picker).
  expect(html).toContain('<option value="2026-10-12">Mon, Oct 12</option>');expect(html).toContain('<option value="2026-10-18">Sun, Oct 18</option>');
  expect(html).not.toContain('value="2026-10-19"');expect(html).not.toContain('type="date"');expect(html).not.toContain('type="time"');
  expect(html).toContain('<option value="08:00" selected="">8:00 AM</option>');expect(html).toContain('<option value="16:00" selected="">4:00 PM</option>');
  expect(html).toContain('value="support" selected=""');
  expect(html).toContain("Opening team</textarea>");
  // Board O-EditShift: Cancel · Edit shift · Save; the lead is a switch; the location is shown as it is (it can't change).
  // The title's subtitle is the shift's state only, when the read has it (G28: the Date field holds the day), never a pill.
  expect(html).toContain('>Cancel</a><h1 class="c-shift__title">Edit shift</h1><button type="submit" form="edit-shift-form"');expect(html).not.toContain('class="c-shift__sub"');
  expect(html).not.toContain("c-pill");
  expect(html).toMatch(/<input type="checkbox" role="switch" class="c-switch" name="isDesignatedLead" checked=""/);
  const location=html.match(/<input id="edit-shift-form-location"[^>]*>/)![0];
  expect(location).toContain('class="c-in c-shift__fixed"');expect(location).toContain('value="main"');expect(location).toMatch(/readonly=""/i);expect(location).not.toContain('name=');
  expect(html).not.toContain('name="locationId"');
  // Delete is its own form after the edit form (never nested in it): a red text row in its own card that asks before deleting.
  expect(html.match(/<form/g)).toHaveLength(2);
  expect(html.indexOf('>Delete shift</button>')).toBeGreaterThan(html.indexOf('Save changes'));
  expect(html).toContain('class="c-shift__delete-row" aria-expanded="false">Delete shift</button>');
  // Review MG-017 (Phase 3) and Jose (Nov 15, 2026, item 13): the line under "Shift lead" says who can lead, the same three
  // roles as the server's rule (isLeadCapable) and its INVALID_SHIFT_LEAD message ("Only an Owner, Manager or Lead can lead a shift.").
  expect(html).toContain("Must be an Owner, Manager or Lead.");
  expect(html).not.toContain("can lead a shift");
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
  expect(shiftDurationLabel("2026-10-14", "08:00", "16:30")).toBe("8 h 30 min scheduled");
  expect(shiftDurationLabel("2026-10-14", "08:00", "08:15")).toBe("15 min scheduled");
  expect(shiftDurationLabel("2026-10-14", "22:00", "06:00")).toBe("8 h scheduled · Ends next day");
  expect(shiftDurationLabel("2026-10-14", "16:00", "24:00")).toBe("8 h scheduled");
  for (const end of ["", "08:00", "25:00"]) expect(shiftDurationLabel("2026-10-14", "08:00", end)).toBe("Enter a valid start and end time.");
});

// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=rs.hoisted(()=>({denied:false,scoped:false,saveAvailability:'available'}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,locations:[{id:'main',name:'Managed location',shortName:'Managed'}],scope:{mode:operationalPageFixture.scoped?'LOCATIONS':'COMPANY',locationIds:operationalPageFixture.scoped?['main']:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;operationalPageFixture.scoped=false;operationalPageFixture.saveAvailability='available';});

rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));

it('withholds protected body and commands after current company-scope denial',async()=>{operationalPageFixture.denied=true;const {default:GuardedPage}=await import('./page');const html=renderToStaticMarkup(await GuardedPage({searchParams:Promise.resolve({shiftId:'test-shift'})}));expect(html).toContain('Company-wide access needed');expect(html).toContain('Company-wide access needed');expect(html).toContain('An Owner can give it to you.');expect(html).not.toContain('data-test-root-chrome');expect(mocks.shift).not.toHaveBeenCalled();expect(mocks.employees).not.toHaveBeenCalled();expect(html).not.toContain('name="shiftId"');});

const held=rs.hoisted(()=>({read:rs.fn()}));
rs.mock('@/lib/company-access/operational-read.server',()=>({readSchedulePendingChanges:held.read,readOperationalShiftEditor:async()=>({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:['main']},data:{weekStart:'2026-10-12',locationId:'main',shift:{id:'test-shift',scheduleId:'week',employeeId:'AVERY',employeeName:'Avery Rivera',locationId:'main',weekStart:'2026-10-12',date:'2026-10-14',startTime:'16:00',endTime:'24:00',positionId:'support',notes:'Scoped note',isDesignatedLead:false,isCalloutApproved:false,scheduleStatus:operationalPageFixture.saveAvailability==='requires_company'?'PUBLISHED':'DRAFT'},employeeOptions:[{id:'AVERY',name:'Avery Rivera',positionIds:['support']}],positionOptions:[{id:'support',name:'Support'}],sourceVersion:'fixture',saveAvailability:operationalPageFixture.saveAvailability}})}));
it('uses the actual minimal manual editor for scoped drafts without global employee catalogs',async()=>{
 operationalPageFixture.scoped=true;const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})}));
 // Phase 2 (C4-Ml): the Owner's Edit shift sheet, fed by the scoped editor read.
 expect(html).toContain('<span class="c-shift__titles"><h1 class="c-shift__title">Edit shift</h1><span class="c-shift__sub"><span data-tone="amber">Draft</span></span></span>');expect(html).not.toContain('Wed, Oct 14</span>');
 expect(html).not.toContain('data-test-root-chrome');
 // A stored 24:00 end goes back as 24:00 (End shows midnight).
 expect(html).toContain('<input type="hidden" name="endTime" value="24:00"/>');expect(html).toContain('<option value="00:00" selected="">12:00 AM</option>');
 for(const name of ['employeeId','positionId','date','startTime','isDesignatedLead','notes'])expect(html).toContain(`name="${name}"`);
 expect(html.match(/name="shiftId" value="test-shift"/g)).toHaveLength(2);
 // The scoped form's hidden fields (the unconfirmed-save check opens the shift's day from them).
 expect(html).toContain('<input type="hidden" name="weekStart" value="2026-10-12"/><input type="hidden" name="locationId" value="main"/>');
 // The Manager's one place, fixed, with no reason line.
 expect(html).toMatch(/<input id="edit-shift-form-location" class="c-in c-shift__fixed" readOnly="" tabindex="-1" value="Managed"\/>/);expect(html).not.toContain('A shift keeps its location');
 expect(html).toContain('class="c-shift__delete-row" aria-expanded="false">Delete shift</button>');expect(html).not.toContain('Delete this shift');
 expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=main&amp;day=2026-10-14#schedule-employee-AVERY"');
 expect(mocks.shift).not.toHaveBeenCalled();expect(mocks.employees).not.toHaveBeenCalled();expect(mocks.locations).not.toHaveBeenCalled();
});
it.each([['requires_company','You can’t change a published shift. Ask an Owner.','Published'],['unavailable','Managed is inactive, so this shift can’t be changed.','Draft']])('keeps scoped editor read-only when save hint is %s, with one line that says why',async(saveAvailability,why,state)=>{
 operationalPageFixture.scoped=true;operationalPageFixture.saveAvailability=saveAvailability;const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})}));
 expect(html).toContain('<h1 class="c-shift__title">Shift details</h1>');expect(html).toContain('<span class="c-shift__sub">Wed, Oct 14</span>');expect(html).not.toContain(`>${state}<`);expect(html).toContain(why);
 expect(html).not.toContain('<form');expect(html).not.toContain('Save changes');expect(html).not.toContain('Save shift');expect(html).not.toContain('data-test-root-chrome');
 // The facts, each once: the person, the place, the position, the time and the note.
 for(const fact of ['<dt>Person</dt>','Avery Rivera','<dt>Location</dt><dd>Managed</dd>','<dt>Position</dt><dd>Support</dd>','4:00 PM – midnight','Scoped note'])expect(html).toContain(fact);
 expect(html).not.toContain('<dt>Shift lead</dt>');
 expect(mocks.shift).not.toHaveBeenCalled();
});
it.each(['available','requires_company','unavailable'])('announces a real scoped edit redirect error in %s while retaining context',async saveAvailability=>{
 operationalPageFixture.scoped=true;operationalPageFixture.saveAvailability=saveAvailability;
 const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift',error:'INVALID_SHIFT'})}));
 expect(html).toContain('role="alert"');expect(html).toContain('The shift could not be updated.');expect(html).toContain('Avery Rivera');
 expect(html).toContain('href="/app/schedule?week=2026-10-12&amp;location=main&amp;day=2026-10-14#schedule-employee-AVERY"');
 expect(mocks.shift).not.toHaveBeenCalled();expect(mocks.employees).not.toHaveBeenCalled();expect(mocks.locations).not.toHaveBeenCalled();
});
it.each(['UNTRUSTED_QUERY_TEXT','constructor'])('scoped edit uses safe generic feedback for unknown redirect code %s',async error=>{
 operationalPageFixture.scoped=true;const {default:Page}=await import('./page');const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift',error})}));
 expect(html).toContain('role="alert"');expect(html).toContain('The shift could not be updated.');expect(html).not.toContain(error);
});

it('says a published shift with a held edit is Not published and what it was; a published shift without one says Published',async()=>{
 mocks.shift.mockResolvedValue({id:'test-shift',employeeId:'AVERY',employeeName:'Avery Rivera',locationId:'main',weekStart:'2026-10-12',date:'2026-10-14',startTime:'14:00',endTime:'20:00',isDesignatedLead:false,scheduleStatus:'PUBLISHED'});
 const value=(startTime:string)=>({employeeId:'AVERY',employeeName:'Avery Rivera',locationId:'main',date:'2026-10-14',startTime,endTime:'20:00',positionId:null,positionName:null,isDesignatedLead:false,notes:null});
 held.read.mockResolvedValue({state:'ready',data:{changedShiftIds:['test-shift'],changes:[{shiftId:'test-shift',kind:'CHANGED',before:value('12:00'),after:value('14:00')}]}});
 const {default:Page}=await import('./page');
 const html=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})})).replace(/\u00a0/g,' ');
 expect(held.read).toHaveBeenCalledWith(expect.anything(),{weekStart:'2026-10-12'});
 // Nov 1 upscale: the state is the title's subtitle (amber text, no pill); what it was stays above the fields.
 expect(html).toContain('<span class="c-shift__sub"><span data-tone="amber">Not published</span></span>');
 expect(html).toContain('<p class="c-shift__state"><span class="c-shift__was">Was 12:00 PM – 8:00 PM</span></p>');
 held.read.mockResolvedValue({state:'ready',data:{changedShiftIds:[],changes:[]}});
 expect(renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})}))).toContain('<span class="c-shift__sub"><span>Published</span></span>');
 held.read.mockResolvedValue({state:'unavailable',reason:'read_failed'});
 const failed=renderToStaticMarkup(await Page({searchParams:Promise.resolve({shiftId:'test-shift'})}));
 expect(failed).not.toContain('Not published');expect(failed).not.toContain('c-shift__state');
});
