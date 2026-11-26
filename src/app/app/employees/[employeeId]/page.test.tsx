import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

const m = rs.hoisted(() => ({
  actorRole: "MANAGER",
  employeeRole: "EMPLOYEE",
  profileUnavailable:false, invitation:rs.fn(), hours:rs.fn(), scoped:rs.fn(), profileOptions:[] as unknown[],
  clockerAccess:rs.fn(), redirected:[] as string[],
  lang: 'en' as 'en' | 'es',
}));
rs.mock('@/lib/i18n/page-lang.server', () => ({ readPageLang: async () => m.lang }));

rs.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));
rs.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
  redirect: (to: string) => { m.redirected.push(to); throw new Error("redirect " + to); },
}));
rs.mock("@/lib/clocker/location-access.server", () => ({ readClockerLocationAccess: m.clockerAccess }));
rs.mock("@/components/team/clocker-location-access", () => ({
  ClockerLocationSheet: ({ employeeId, baseline }: { employeeId: string; baseline: { mode: string } }) => createElement("div", { "data-testid": "clocker-sheet", "data-employee": employeeId, "data-mode": baseline.mode }),
  ClockerLocationReturnFocus: () => null,
}));
rs.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: async () => ({ id: "actor", role: m.actorRole }),
}));
rs.mock("@/lib/auth/session", () => ({
  requireSessionMutationProof: async () => ({
    employee: { id: "actor", role: m.actorRole },
    sessionTokenHash: "a".repeat(64),
  }),
}));
rs.mock("@/lib/data/employees", () => {
  const employee = () => ({
    id: "worker",
    firstName: "Sam",
    lastName: "Rivera",
    phone: "787-555-0101",
    email: "sam@example.invalid",
    role: m.employeeRole,
    primaryLocationId: "loc",
    eligibleLocationIds: ["loc"],
    positionIds: [],
    active: true,
    updatedAt: "2026-10-05 12:00:00+00",
  });
  return {
    getEmployeeManagementProfile: async () => employee(),
    listEmployees: async () => [employee()],
    listLocations: async () => [
      { id: "loc", workspaceId: "w", clockerKey: "loc", name: "Main Office", shortName: "Main", active: true },
    ],
  };
});
rs.mock("@/lib/data/positions", () => ({ listPositions: async () => [] }));
rs.mock("@/lib/data/shift-change-views", () => ({ readOperationalRuleProfileView: async () => null }));
rs.mock("@/lib/employee-display", () => ({
  employeeInitials: () => "SR",
  employeeRoleLabel: (role: string) => role,
}));
rs.mock("@/lib/phone", () => ({ formatPhoneNumber: (value: string) => value, normalizePhoneNumber: (value: string) => value }));
rs.mock("@/components/page-header", () => ({ PageHeader: ({ title }: { title: string }) => createElement("h1", null, title) }));
rs.mock("@/components/employee-core-profile-form", () => ({
  EmployeeCoreProfileForm: ({ownerScope,more,employmentDates}:{ownerScope?:{scopeRevision:number};more?:React.ReactNode;employmentDates?:{hireDate:string|null;birthDate:string|null}}) => createElement("div", { "data-testid": "employee-core-form", "data-scope-revision":ownerScope?.scopeRevision??"none", "data-hire":employmentDates?.hireDate, "data-birth":employmentDates?.birthDate }, "Employee details", more),
  EmployeeStatusForm: ({employee}:{employee:{firstName:string}}) => createElement("button", { "data-testid": "employee-status-form" }, `Deactivate ${employee.firstName}`),
  SheetField: ({label,href}:{label:string;href:string}) => createElement("a", { href }, label),
}));
rs.mock("@/components/employee-scheduling-fields", () => ({ EmployeeSchedulingFields: () => null }));
rs.mock("@/components/configuration-form", () => ({ ConfigurationForm: ({ children }: { children: React.ReactNode }) => createElement("form", null, children) }));
rs.mock("@/components/operational-rule-fields", () => ({ OperationalRuleFields: () => null }));
rs.mock("../actions", () => ({
  saveEmployeeCoreProfileAction: rs.fn(),
  saveEmployeeSchedulingProfileAction: rs.fn(),
}));

import EmployeeProfilePage from "./page";

beforeEach(() => {
  m.profileUnavailable=false;m.invitation.mockReset().mockResolvedValue({state:'ready',employeeId:'worker',employeeVersion:'2026-10-05 12:00:00+00',eligibility:'INVITABLE',registeredEmailMasked:'s***@example.invalid',invitationRevision:0,invitation:null,delivery:'UNAVAILABLE',deliveryAvailable:true,allowedCommands:['ISSUE'],retryAfterMs:null});
  m.actorRole = "MANAGER";
  m.employeeRole = "EMPLOYEE";
  m.redirected = [];
  m.clockerAccess.mockReset().mockResolvedValue({ employeeId: "worker", mode: "ASSIGNED", locationIds: [], updatedAt: "2026-11-24T12:00:00.000000Z" });
  m.lang = 'en';
  m.hours.mockReset().mockResolvedValue({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'COMPANY',locationIds:[]},
    data:{employeeId:'worker',today:'2026-10-14',weekStart:'2026-10-12',timeZone:'America/Puerto_Rico',scheduledTodayMinutes:480,scheduledWeekMinutes:1920,workedWeekMinutes:null,workedBasis:'EFFECTIVE_ELAPSED_INCLUDING_BREAKS'}});
});

it('shows the person’s hours, opens their own availability and their location’s schedule, and says where sign-in stands (Nov 14 inspection, BR-3 and AR-10)', async () => {
  const overview = async () => renderToStaticMarkup(await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }));
  // A Manager's page reads no invitation, so it says nothing about sign-in rather than guess.
  const manager = await overview();
  expect(manager).toMatch(/Scheduled today<\/span><\/span><span class="c-row__value c-row__value--soft">8 h</);
  expect(manager).toMatch(/Scheduled this week<\/span><\/span><span class="c-row__value c-row__value--soft">32 h</);
  // A figure the read couldn't work out is the grey dash, and worked time says it includes breaks.
  expect(manager).toMatch(/Clocked this week<\/span><span class="c-row__detail"><span>Includes breaks<\/span><\/span><\/span><span class="c-row__value c-row__value--soft">—</);
  expect(manager).toContain('href="/app/schedule?location=loc"');
  expect(manager).toContain('href="/app/availability?employeeId=worker"');
  expect(manager).toContain('href="/app/timecards#timecard-worker"');
  expect(manager).not.toContain('c-title__sub');
  expect(m.hours).toHaveBeenCalledOnce();
  // An Owner sees where sign-in stands under the name and on the Access row.
  m.actorRole = "OWNER";
  const notInvited = await overview();
  expect(notInvited).toContain('<span class="c-title__sub">Not invited yet</span>');
  expect(notInvited).toMatch(/Access and sign-in<\/span><span class="c-row__detail"><span>Not invited yet</);
  m.invitation.mockResolvedValue({state:'ready',employeeId:'worker',employeeVersion:'v',eligibility:'INVITABLE',registeredEmailMasked:'s***@example.invalid',invitationRevision:1,
    invitation:{id:'i1',state:'ISSUED',issuedAt:'2026-10-13T02:30:00Z',expiresAt:'2026-10-20T02:30:00Z',issuerName:'Owner'},delivery:'PROVIDER_ACCEPTED',allowedCommands:['ISSUE','REVOKE'],retryAfterMs:null});
  // The invitation's day is the workplace's day (Oct 12 in Puerto Rico, not the UTC Oct 13).
  expect(await overview()).toContain('<span class="c-title__sub">Invited Oct 12, not activated</span>');
  m.invitation.mockResolvedValue({state:'ready',employeeId:'worker',employeeVersion:'v',eligibility:'ALREADY_ACTIVATED',registeredEmailMasked:null,invitationRevision:1,invitation:null,delivery:'UNAVAILABLE',allowedCommands:[],retryAfterMs:null});
  expect(await overview()).toContain('<span class="c-title__sub">Sign-in active</span>');
  m.invitation.mockResolvedValue({state:'ready',employeeId:'worker',employeeVersion:'v',eligibility:'NO_EMAIL',registeredEmailMasked:null,invitationRevision:0,invitation:null,delivery:'UNAVAILABLE',allowedCommands:[],retryAfterMs:null});
  expect(await overview()).toContain('<span class="c-title__sub">No email, can’t sign in</span>');
});

it('draws the person, Access and sign-in and the sheets in Puerto Rico Spanish when the person reads Spanish (es-rest)', async () => {
  m.lang = 'es'; m.actorRole = 'OWNER';
  m.invitation.mockResolvedValue({state:'ready',employeeId:'worker',employeeVersion:'v',eligibility:'INVITABLE',registeredEmailMasked:'s***@example.invalid',invitationRevision:1,
    invitation:{id:'i1',state:'ISSUED',issuedAt:'2026-10-13T02:30:00Z',expiresAt:'2026-10-20T02:30:00Z',issuerName:'Owner'},delivery:'PROVIDER_ACCEPTED',allowedCommands:['ISSUE','REVOKE'],retryAfterMs:null});
  const page = (searchParams?: Record<string, string>) => EmployeeProfilePage({ params: Promise.resolve({ employeeId: 'worker' }), searchParams: searchParams && Promise.resolve(searchParams) }).then(renderToStaticMarkup);
  const overview = await page();
  for (const words of ['Invitado el 12 oct, sin activar', 'Programado hoy', 'Programado esta semana', 'Incluye descansos', 'Turnos', 'Tarjetas de tiempo', 'Disponibilidad', 'Tarifa de pago', 'Balance de días libres', 'Acceso e inicio de sesión', 'Editar', 'Llamar a Sam Rivera'])
    expect(overview).toContain(words);
  for (const english of ['Scheduled today', 'Timecards', 'Pay rate', 'Access and sign-in', '>Edit<', 'Invited']) expect(overview).not.toContain(english);
  const access = await page({ view: 'access' });
  for (const words of ['Rol', 'Cuenta', 'ID de empleado', 'Restablecer contraseña']) expect(access).toContain(words);
  expect(await page({ edit: 'positions' })).toContain('Localidades donde puede trabajar');
  expect(await page({ edit: 'rules' })).toContain('Horas y reglas');
});

it('says a scheduled figure is not available, and why, when the schedule read was incomplete (Phase 8, a.md #31)', async () => {
  m.hours.mockReset().mockResolvedValue({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'COMPANY',locationIds:[]},
    data:{employeeId:'worker',today:'2026-10-14',weekStart:'2026-10-12',timeZone:'America/Puerto_Rico',scheduledTodayMinutes:null,scheduledWeekMinutes:null,workedWeekMinutes:null,workedBasis:'EFFECTIVE_ELAPSED_INCLUDING_BREAKS'}});
  const html = renderToStaticMarkup(await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }));
  expect(html).toMatch(/Scheduled today<\/span><span class="c-row__detail"><span>The whole schedule couldn’t be read<\/span><\/span><\/span><span class="c-row__value c-row__value--soft">Not available</);
  expect(html).toMatch(/Scheduled this week<\/span><span class="c-row__detail"><span>The whole schedule couldn’t be read<\/span><\/span><\/span><span class="c-row__value c-row__value--soft">Not available</);
  // The place is the title's own element, so the phone layer's 13px pull never clips its first letter (a.md #3).
  expect(html).toMatch(/<span class="c-row__title c-row__title--b"><span>[^<]+<\/span><\/span>/);
});

it('keeps the person page when the hours read fails or is refused, and reads hours for the overview only', async () => {
  m.hours.mockRejectedValue(new Error('read failed'));
  const failed = renderToStaticMarkup(await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }));
  expect(failed).toContain('Sam Rivera');
  expect(failed).not.toContain('id="person-hours"');
  m.hours.mockReset().mockResolvedValue({state:'unavailable',reason:'access_denied'});
  expect(renderToStaticMarkup(await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }) }))).not.toContain('id="person-hours"');
  m.hours.mockClear();
  await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }), searchParams: Promise.resolve({ view: "access" }) });
  await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }), searchParams: Promise.resolve({ edit: "1" }) });
  expect(m.hours).not.toHaveBeenCalled();
});

it("shows core employee management to a Manager for a non-Owner employee", async () => {
  const html = renderToStaticMarkup(
    await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }), searchParams: Promise.resolve({ edit: "1" }) }),
  );
  expect(html).toContain("Employee details");
  // Release 1 (O-EditEmployee): positions and the hour rules open their own sheets from the edit sheet.
  expect(html).toContain('href="/app/employees/worker?edit=positions"');
  expect(html).toContain('href="/app/employees/worker?edit=rules"');
  const positions = renderToStaticMarkup(await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }), searchParams: Promise.resolve({ edit: "positions" }) }));
  expect(positions).toContain('No positions yet');
  expect(positions).toContain('name="eligibleLocationIds"');
  expect(positions).toContain('form="employee-scheduling"');
});

it("withholds Owner core-management controls from a Manager", async () => {
  m.employeeRole = "OWNER";
  const html = renderToStaticMarkup(
    await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }), searchParams: Promise.resolve({ edit: "1" }) }),
  );
  expect(html).not.toContain('data-testid="employee-core-form"');
  expect(html).toContain("Only an Owner can change another Owner");
});

it("allows an Owner to manage another Owner", async () => {
  m.actorRole = "OWNER";
  m.employeeRole = "OWNER";
  const html = renderToStaticMarkup(
    await EmployeeProfilePage({ params: Promise.resolve({ employeeId: "worker" }), searchParams: Promise.resolve({ edit: "1" }) }),
  );
  expect(html).toContain('data-testid="employee-core-form"');
});

it('links only an Owner managing a non-Owner employee to the separate Clocker PIN screen',async()=>{
 // Release 1 (O-PersonAccess): the Clocker PIN row lives on Access and sign-in.
 const access={params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})};
 expect(renderToStaticMarkup(await EmployeeProfilePage(access))).not.toContain('/clocker-pin');m.actorRole='OWNER';
 const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})}));
 expect(html).toContain('href="/app/employees/worker/clocker-pin"');
 expect(renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}))).toContain('href="/app/employees/worker?view=access"');
 m.employeeRole='OWNER';
 expect(renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})}))).not.toContain('/clocker-pin');
});

it('offers account recovery for this employee and links missing hour settings to their row (W2)',async()=>{
 m.employeeRole='EMPLOYEE';
 // Release 1: Access and sign-in offers Reset password (account recovery); the hour rules sheet links missing settings.
 const access=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})}));
 expect(access).toContain('href="/app/account-recovery?employee=worker"');
 expect(access).toContain('data-testid="employee-status-form"');
 const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({edit:'rules'})}));
 expect(html).toContain('href="/app/schedule/settings#target-worker"');
});
// Server composition tests; actual mounted finite-body behavior is checked separately.
const operationalPageFixture=rs.hoisted(()=>({denied:false}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));

beforeEach(()=>{operationalPageFixture.denied=false;m.scoped.mockReset();});

it('withholds protected body and commands after current company-scope denial',async()=>{
 // G17: a location Manager's denial asks the scoped read; refused, the page says the person is outside their locations.
 operationalPageFixture.denied=true;m.scoped.mockResolvedValue({state:'unavailable',reason:'access_denied'});const {default:GuardedPage}=await import('./page');
 const html=renderToStaticMarkup(await GuardedPage({params:Promise.resolve({employeeId:'worker'})}));
 expect(html).toContain('Outside the locations you manage');expect(html).not.toContain('Sam');expect(html).not.toContain('employee-core-profile-form');
 expect(m.scoped).toHaveBeenCalledWith(expect.anything(),'worker');expect(m.hours).not.toHaveBeenCalled();
 // An Owner is never location-scoped: a denial stays the company-wide closed state and the scoped read isn't asked.
 m.scoped.mockClear();m.actorRole='OWNER';
 expect(renderToStaticMarkup(await GuardedPage({params:Promise.resolve({employeeId:'worker'})}))).toContain('Company-wide access needed');expect(m.scoped).not.toHaveBeenCalled();
});
const scopedReady={state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:['loc-c']},
 data:{employee:{id:'worker',firstName:'Sam',lastName:'Rivera',role:'EMPLOYEE',locationIds:['loc-c']},locations:[{id:'loc-c',name:'Condado',shortName:'C',active:true}]}};
it('G17: a location Manager opens a person at one of their locations and sees only the scoped facts, hours and Shifts',async()=>{
 operationalPageFixture.denied=true;m.scoped.mockResolvedValue(scopedReady);const {default:GuardedPage}=await import('./page');
 const html=renderToStaticMarkup(await GuardedPage({params:Promise.resolve({employeeId:'worker'})}));
 expect(html).toContain('Sam Rivera');expect(html).toContain('EMPLOYEE');expect(html).toContain('Condado'); // the role label is mocked to the raw role in this file
 expect(html).toMatch(/Scheduled this week<\/span><\/span><span class="c-row__value c-row__value--soft">32 h</);
 expect(html).toContain('href="/app/schedule?location=loc-c"');expect(html).toContain('href="/app/employees"');
 // Nothing the scoped Team list doesn't show, and no action that needs company-wide access.
 for(const hidden of ['787','sam@example.invalid','tel:','sms:','?edit=1','view=access','Access and sign-in','Edit','/pay','/time-off','/restrictions','/app/timecards','/app/availability','employee-core-profile-form','employee-status-form'])expect(html).not.toContain(hidden);
});
it('G17: the edit sheet and Access and sign-in stay closed to a location Manager, with the company-wide closed state',async()=>{
 operationalPageFixture.denied=true;m.scoped.mockResolvedValue(scopedReady);const {default:GuardedPage}=await import('./page');
 for(const searchParams of [{edit:'1'},{edit:'positions'},{edit:'rules'},{view:'access'}]){
  const html=renderToStaticMarkup(await GuardedPage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve(searchParams)}));
  expect(html).toContain('Company-wide access needed');expect(html).not.toContain('Sam');expect(html).not.toContain('employee-core-profile-form');
 }
 expect(m.hours).not.toHaveBeenCalled();
});

rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalEmployeeHours:m.hours,readScopedEmployeeSummary:m.scoped,readOperationalEmployeeProfile:async(_proof:unknown,_id:unknown,_ex:unknown,options?:{employmentDates?:boolean})=>{
 m.profileOptions.push(options);
 if(m.profileUnavailable)return {state:'unavailable',reason:'source_changed'};
 const source=await import('@/lib/data/employees'),profile=await source.getEmployeeManagementProfile('worker'),locations=await source.listLocations();
 return {state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'COMPANY',locationIds:[]},data:{profile,locations,ownerScope:m.actorRole==='OWNER'?{employeeId:'worker',employeeUpdatedAt:'2026-10-05 12:00:00+00',role:m.employeeRole,active:true,roleGeneration:'9',scopeRevision:7,scopeState:'UNASSIGNED',scope:null}:null,
  ...(options?.employmentDates?{employmentDates:{hireDate:'2016-08-01',terminationDate:null,birthDate:'1995-04-12'}}:{})}};
}}));
rs.mock('@/lib/auth/invitations/service.server',()=>({readInvitationStatus:m.invitation}));
it('mounts real Owner invitation and scope controls with the coherent profile context',async()=>{
 m.actorRole='OWNER';m.employeeRole='MANAGER';const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({edit:'1'})}));
 expect(html).toContain('data-scope-revision="7"');expect(m.invitation).toHaveBeenCalledOnce();
 // Release 1 (O-PersonAccess): the invitation and a Manager's management access sit on Access and sign-in.
 const access=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})}));
 expect(access).toContain('Account invitation');expect(access).toContain('Management access');
});
it('does not request or render Owner invitation/scope controls for a Manager',async()=>{
 const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})}));expect(html).not.toContain('Account invitation');expect(html).not.toContain('Management access');expect(m.invitation).not.toHaveBeenCalled();
});
it('withholds the profile and Owner controls when the coherent read changed',async()=>{
 m.actorRole='OWNER';m.profileUnavailable=true;const html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}));expect(html).toContain('Employee profile unavailable');expect(html).not.toContain('Sam');expect(m.invitation).not.toHaveBeenCalled();
});

it('reads employment dates only for the edit sheet and never shows them on the overview or Access pages',async()=>{
 m.actorRole='MANAGER';m.employeeRole='EMPLOYEE';m.profileOptions.length=0;
 const overview=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}));
 const access=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({view:'access'})}));
 const edit=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({edit:'1'})}));
 expect(m.profileOptions).toEqual([{employmentDates:false},{employmentDates:false},{employmentDates:true}]);
 for(const html of [overview,access])expect(html).not.toMatch(/1995-04-12|2016-08-01|data-birth|data-hire/);
 expect(edit).toContain('data-hire="2016-08-01" data-birth="1995-04-12"');
});

/* Clocker UI step 1 (Option A, Jose's pick Nov 25, 2026): the "Clock in at" row and sheet are the Owner's only. */
it('shows the Clock in at row to an Owner for a non-Owner, with the current answer, and nothing to a Manager',async()=>{
 const overview={params:Promise.resolve({employeeId:'worker'})};
 // A Manager: no row, and Codex's read isn't called.
 let html=renderToStaticMarkup(await EmployeeProfilePage(overview));
 expect(html).not.toContain('Clock in at');expect(html).not.toContain('edit=clocker');expect(m.clockerAccess).not.toHaveBeenCalled();
 m.actorRole='OWNER';
 html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}));
 expect(html).toContain('id="clock-in-at"');expect(html).toContain('href="/app/employees/worker?edit=clocker"');
 expect(html).toContain('Where they work · Main');
 expect(m.clockerAccess).toHaveBeenCalledWith({employeeId:'actor',sessionTokenHash:'a'.repeat(64)},'worker');
 // Every location: the row says so, once.
 m.clockerAccess.mockResolvedValue({employeeId:'worker',mode:'ALL',locationIds:[],updatedAt:'2026-11-24T12:00:00.000000Z'});
 expect(renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}))).toContain('Every location · Includes locations added later');
 // A failed read keeps the page and shows the row as unavailable, without a link.
 m.clockerAccess.mockRejectedValue(new Error('unavailable'));
 html=renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}));
 expect(html).toContain('Clock in at');expect(html).toContain('Unavailable');expect(html).not.toContain('edit=clocker');
 // Not for an Owner's own kind of row: another Owner has no Clocker PIN here, so no row either.
 m.clockerAccess.mockClear();m.employeeRole='OWNER';
 expect(renderToStaticMarkup(await EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'})}))).not.toContain('Clock in at');
 expect(m.clockerAccess).not.toHaveBeenCalled();
});

it('opens the Clock in at sheet for an Owner and sends anyone else back to the person page',async()=>{
 const sheet=()=>EmployeeProfilePage({params:Promise.resolve({employeeId:'worker'}),searchParams:Promise.resolve({edit:'clocker'})});
 await expect(sheet()).rejects.toThrow('redirect /app/employees/worker');
 m.actorRole='OWNER';
 const html=renderToStaticMarkup(await sheet());
 expect(html).toContain('data-testid="clocker-sheet"');expect(html).toContain('data-employee="worker"');expect(html).toContain('data-mode="ASSIGNED"');
 // Cancel returns to the row, which takes focus back.
 expect(html).toContain('href="/app/employees/worker#clock-in-at"');
 m.clockerAccess.mockRejectedValue(new Error('unavailable'));
 await expect(sheet()).rejects.toThrow('redirect /app/employees/worker');
});
