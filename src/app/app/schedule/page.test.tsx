import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import SchedulePage from './page';
const f=vi.hoisted(()=>({pending:null as unknown,positions:[] as {id:string,name:string}[], shifts:[] as Record<string,unknown>[], employees:[] as Record<string,unknown>[], history:[] as Record<string,unknown>[], captured:[] as Record<string,unknown>[], managerReads:vi.fn(), dashboard:null as unknown, statuses:[] as {locationId:string,status:string}[], locations:[] as {id:string,shortName:string}[],enabled:true,active:true,role:'EMPLOYEE',reads:vi.fn(),before:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}],after:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'09:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}]}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/scheduling/validate-shift',()=>({schedulingIssueMessage:()=>''}));
vi.mock('@/components/schedule-location-control', () => import('../../../components/schedule-location-control'));
vi.mock('@/components/action-menu', () => import('../../../components/action-menu'));
vi.mock('@/components/page-header',()=>({PageHeader:()=>null}));
vi.mock('@/components/status-pill',()=>({StatusPill:()=>null}));
vi.mock('@/components/employee-weekly-confirmation',()=>({EmployeeWeeklyConfirmation:()=>createElement('button',null,'Confirm schedule')}));
vi.mock('@/components/schedule-publication-change',()=>import('../../../components/schedule-publication-change'));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'self',role:f.role}),requireSessionMutationProof:async()=>({employee:{id:'self',role:f.role},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/data/employee-weekly-review.server',()=>({readEmployeeWeeklyReview:async()=>{const {ownPublicationChanges}=await import('../../../lib/notifications/device-state');f.reads('coherent');return {state:f.active?'unpublished':'unavailable',shifts:f.active?f.shifts:[],locations:f.locations,displayedRevisionId:f.active?'latest':null,acknowledgement:{latestRevisionId:'latest',acknowledgedRevisionId:'before',needsAcknowledgement:true,acknowledged:false},intent:{operationId:'operation',authority:'authority'},publicationChanges:f.active?ownPublicationChanges(f.before.filter(s=>s.locationId==='2'),f.after.filter(s=>s.locationId==='2'),'self'):[]};}}));
vi.mock('@/lib/data/employee-schedule',()=>({readEmployeeSchedule:async()=>({state:'unpublished',shifts:f.shifts,locations:f.locations}),emptyScheduleLabel:(state:string)=>state==='published'?'Off — no assignment':state==='unpublished'?'Schedule not published yet':'Schedule unavailable — try again'}));
vi.mock('@/lib/auth/permissions',()=>({isManagerRole:(role:string)=>['MANAGER','OWNER'].includes(role)}));
vi.mock('@/lib/data/employees',()=>({listEmployees:async()=>f.employees,listLocations:async()=>f.locations}));
vi.mock('@/lib/data/schedules',()=>({listWeekShifts:async()=>f.shifts,listScheduleStatuses:async()=>f.statuses}));
vi.mock('@/lib/data/schedule-health',()=>({listEmployeeHourTargets:async()=>[]}));
vi.mock('@/lib/data/exchanges',()=>({listOpenCoverage:async()=>[],listEmployeeExchangeActivity:async()=>[]}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/app/app/schedule/actions',()=>({copyPreviousWeekAction:vi.fn(),setAvailabilityDeadlineAction:vi.fn(),publishScheduleAction:vi.fn()}));
vi.mock('@/lib/data/schedule-publication-review',()=>({getSchedulePublishReadiness:async()=>({locationName:'West Office',coverageGaps:3,missingLeadBlocks:1,positionNeedsSetup:false,staffingNeedsSetup:false,coverageNeedsSetup:false,underTargetCount:2,overTargetCount:1,unconfiguredTargetCount:1,hasWarnings:true})}));
vi.mock('@/lib/data/week-settings',()=>({getWeekSettings:async()=>null}));
// Clean Manager v3: Schedule shows the week's facts Home used to (availability, open shifts) from the dashboard's read.
vi.mock('@/lib/data/weekly-approved-absences.server',()=>({readWeeklyApprovedAbsences:async()=>({state:'ready',employeeIds:f.employees.map(e=>e.id),rows:[]})}));
vi.mock('@/lib/data/manager-dashboard',()=>({loadManagerDashboardData:async()=>{f.managerReads('dashboard');return f.dashboard;}}));
vi.mock('@/lib/data/acknowledgements',()=>({getEmployeeAcknowledgementState:async()=>({latestRevisionId:'latest',acknowledgedRevisionId:'before',needsAcknowledgement:true,acknowledged:false})}));
vi.mock('@/app/app/schedule/acknowledge-actions',()=>({acknowledgeScheduleAction:vi.fn()}));
vi.mock('@/lib/employee-display',()=>({employeeRoleLabel:()=>''}));
vi.mock('@/lib/notifications/config',()=>({readNotificationConfig:()=>({featureEnabled:f.enabled})}));
vi.mock('@/lib/data/publication-revisions',()=>({getLatestPublicationRevision:async()=>({id:'latest'}),listCapturedShiftPositions:async({weekStart,shiftIds}:{weekStart:string;shiftIds:string[]})=>{f.managerReads({weekStart,shiftIds});return f.history.length?f.history:f.captured;},listRevisionShifts:async(id:string)=>{f.reads(id);return f.role==='MANAGER'?f.captured:id==='before'?f.before:f.after;}}));
vi.mock('@/lib/data/notification-state',()=>({sqlNotificationStateRepository:()=>({recipientAccess:async()=>({employeeId:'self',role:f.role,active:f.active,allowedLocationIds:['2']})})}));
vi.mock('@/lib/notifications/device-state',()=>import('../../../lib/notifications/device-state'));
beforeEach(()=>{f.dashboard=null;f.statuses=[];f.positions=[];f.shifts=[];f.employees=[];f.captured=[];f.history=[];f.managerReads.mockClear();f.locations=[];f.enabled=true;f.active=true;f.role='EMPLOYEE';f.reads.mockClear();f.after=[{...f.before[0],startTime:'09:00'}];});
async function html(){return renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05'})}));}
it('loads actual history and renders own changes behind authenticated access',async()=>{
 f.after.push({...f.after[0],sourceShiftId:'private',employeeId:'coworker',startTime:'15:00'});
 expect(await html()).toContain('What changed in your schedule');expect(await html()).not.toContain('3:00 PM');expect(f.reads.mock.calls.flat()).toContain('coherent');
});
it('filters revoked location history on both sides and hides unchanged shifts',async()=>{
 f.after=[...f.before];expect(await html()).not.toContain('What changed');
 f.after=[{...f.before[0],locationId:'110'}];const result=await html();expect(result).toContain('Shift removed');expect(result).not.toContain('Location 110');
});
it('push feature off retains canonical review while protected access loss discloses no history',async()=>{
 f.enabled=false;expect(await html()).toContain('What changed');
 f.active=false;expect(await html()).not.toContain('What changed');
});

it('a forged success query cannot manufacture a schedule receipt', async () => {
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',acknowledged:'1'})}));
 expect(output).not.toContain('Schedule acknowledged.');
 expect(output).not.toContain('Schedule confirmed.');
});

it('the employee agenda gives overnight assignments an explicit next-day label and a safe location fallback', async () => {
 f.shifts=[{id:'night',employeeId:'self',locationId:'unknown',date:'2026-10-11',startTime:'22:00',endTime:'06:00',scheduleStatus:'PUBLISHED'}];
 const output=await html();
 expect(output).toContain('Ends Mon, Oct 12');
 expect(output).toContain('Location unavailable');
});

it('keeps all seven dates, multiple assignments and directly bound future shift request links',async()=>{
 f.shifts=[{id:'shift a&b',employeeId:'self',locationId:'2',date:'2099-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'PUBLISHED'},
 {id:'second',employeeId:'self',locationId:'2',date:'2099-10-06',startTime:'14:00',endTime:'18:00',scheduleStatus:'PUBLISHED'}];
 f.locations=[{id:'2',shortName:'Main Office'}];
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2099-10-05'})}));
 // v5: the week strip keeps all seven dates as real URLs; the shifts open their sheets with the bound request links.
 expect(output.match(/href="\/app\/schedule\?week=2099-10-05&amp;day=2099-10-\d\d"/g)?.length).toBeGreaterThanOrEqual(7);
 expect(output).toContain('/app/exchange/swap?sourceShiftId=shift%20a%26b');
 expect(output).toContain('/app/exchange/callout?shiftId=shift%20a%26b');
 const text=output.replace(/\u00a0/g,' ');expect(text).toContain('8:00 AM'); expect(text).toContain('2:00 PM');
});

vi.mock("@/lib/data/workspaces",()=>({getWorkspace:async()=>({timeZone:"America/Puerto_Rico"})}));

vi.mock("@/lib/business-time",()=>import("../../../lib/business-time"));

it('renders every location through the measured selector with a safe expanded fallback', async () => {
  f.role = 'MANAGER';
  const catalogs = [
    ['FUEL - 2', 'FUEL - 110'],
    ['Operations North', 'Operations South', 'Customer Service'],
    ['W'.repeat(16)],
    ['W'.repeat(16), 'W'.repeat(16)],
    Array.from({ length: 3 }, () => 'W'.repeat(16)),
    ['Operations Community Service Center Branch Name'],
    Array.from({ length: 20 }, (_, i) => `Branch ${i}`),
  ];
  for (const names of catalogs) {
    f.locations = names.map((shortName, i) => ({ id: String(i), shortName }));
    // Quiet (v4): the location picker is one menu that lists every location.
    const output = await html();
    expect(output).toContain('>All locations</a>');
    for (const name of names) expect(output).toContain(`>${name}</a>`);
  }
});

vi.mock('@/lib/data/positions',()=>({listPositions:async()=>{f.managerReads('positions');return f.positions;}}));
vi.mock('@/lib/data/schedule-generation-review',()=>({getScheduleGenerationReview:async()=>{f.managerReads('review');return {editable:true,exclusions:[],coverage:null,attempted:0,needsSetup:0};}}));
vi.mock('@/components/schedule-generation-controls',()=>import('../../../components/schedule-generation-controls'));
vi.mock('@/app/app/schedule/generation-actions',()=>({generateWeekAction:vi.fn(),clearGenerationExclusionAction:vi.fn()}));
it('Manager Schedule uses the shared viewport-safe action menu instead of a page-local details dropdown',async()=>{f.role='MANAGER';const output=await html();expect(output).toContain('class="nevora-action-menu"');expect(output).toContain('popover="auto"');expect(output).not.toContain('<details class="schedule-more-menu"');});
it('Manager renders actual assigned positions and captured published names without invented labels',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'draft',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'DRAFT'},{id:'published',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'PUBLISHED'},{id:'legacy',employeeId:'worker',locationId:'north',date:'2026-10-07',startTime:'08:00',endTime:'12:00',scheduleStatus:'DRAFT'}];f.captured=[{sourceShiftId:'published',positionName:'Captured Cashier'}];const output=await html();expect(output).toContain('Renamed Cashier');expect(output).toContain('Captured Cashier');expect(output.match(/schedule-assigned-position/g)).toHaveLength(2);expect(output).toContain('href="/app/schedule/publish?week=2026-10-05"');expect(renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',plan:'1'})}))).toContain('Build draft');});
it('Employee/Lead do not load Manager review or position catalogs',async()=>{for(const role of ['EMPLOYEE','LEAD']){f.role=role;expect(await html()).not.toContain('Build draft');}expect(f.managerReads).not.toHaveBeenCalled();});
it('protected generated deletion reports scheduling history truthfully',async()=>{f.role='MANAGER';const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',error:'SHIFT_HAS_EXCHANGE_HISTORY'})}));expect(output).toContain('scheduling history');});
it('archived historical assignments retain their captured position identity',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'archived',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];f.captured=[{sourceShiftId:'archived',positionName:'Original Cashier'}];const output=await html();expect(output).toContain('Original Cashier');expect(output).not.toContain('Renamed Cashier');});

it('archived row omitted from newer publication resolves its older capture in a single batch',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'archived',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];f.captured=[];f.history=[{sourceShiftId:'archived',positionId:'cashier',positionName:'Original Cashier'}];const output=await html();expect(output).toContain('Original Cashier');expect(output).not.toContain('Renamed Cashier');expect(f.managerReads.mock.calls.filter(([arg])=>typeof arg==='object')).toEqual([[{weekStart:'2026-10-05',shiftIds:['archived']}]]);});
it('uncaptured legacy non-Draft assignments keep actual catalog fallback while positionless rows stay unlabeled',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Actual Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'legacy',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'},{id:'positionless',employeeId:'worker',locationId:'north',date:'2026-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];const output=await html();expect(output).toContain('Actual Cashier');expect(output.match(/schedule-assigned-position/g)).toHaveLength(1);});

// Release 1 (board O-BuildPublish): Publish opens Build and publish; the planning panel (?plan=1, from Plan rows) still
// publishes each location.
it.each(['OWNER','MANAGER'])('%s can reach publication for each displayed location',async role=>{
 f.role=role;f.locations=[{id:'loc-1',shortName:'Main Office'},{id:'loc-2',shortName:'West Office'}];
 expect(await html()).toContain('href="/app/schedule/publish?week=2026-10-05"');
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',plan:'1'})}));expect(output).toContain('Publish Main Office');expect(output).toContain('Publish West Office');
});
it('publication review exposes measured warnings before an explicit location-bound confirmation',async()=>{
 f.role='MANAGER';f.locations=[{id:'loc-2',shortName:'West Office'}];
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',location:'loc-2',publishCheck:'loc-2'})}));
 expect(output).toContain('3 uncovered coverage blocks');expect(output).toContain('1 blocks missing a designated lead');
 expect(output).toContain('2 employees below');expect(output).toContain('1 employees above');expect(output).toContain('1 employees without');
 expect(output).toContain('name="confirmWarnings" value="yes"');expect(output).toContain('Publish West Office anyway');
});
it('Add shift preserves the selected second-location destination',async()=>{
 f.role='MANAGER';f.locations=[{id:'loc-1',shortName:'Main Office'},{id:'loc-2',shortName:'West Office'}];
 // The day card (and its Add shift) needs someone on the team; with nobody, the page offers Go to Team instead.
 f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',location:'loc-2'})}));
 // Release 1 (board G-O-Schedule): Add shift sits at the foot of the day card and opens on the chosen day.
 expect(output).toMatch(/href="\/app\/schedule\/new\?week=2026-10-05&amp;locationId=loc-2&amp;date=2026-10-\d\d"/);
});

it('forged acknowledged query does not manufacture success without canonical receipt',async()=>{const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',acknowledged:'1'})}));expect(output).not.toContain('Schedule confirmed.');});

const operationalPageFixture=vi.hoisted(()=>({denied:false,scoped:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,locations:[{id:'main',name:'Managed location',shortName:'Managed'}],scope:{mode:operationalPageFixture.scoped?'LOCATIONS':'COMPANY',locationIds:operationalPageFixture.scoped?['loc']:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
// Composition only; mounted body lifetime is covered by the browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
beforeEach(()=>{operationalPageFixture.denied=false;operationalPageFixture.scoped=false;});

it('company denial withholds global schedule rows and all editing controls',async()=>{f.role='MANAGER';operationalPageFixture.denied=true;const output=await html();expect(output).toContain('current company-wide management access');expect(output).not.toContain('Add shift');expect(output).not.toContain('Publish');expect(f.managerReads).not.toHaveBeenCalled();});
it('an operational company denial does not remove the Employee self schedule',async()=>{operationalPageFixture.denied=true;const output=await html();expect(output).toContain('c-esched');expect(output).toContain('aria-label="Days in this week"');expect(output).not.toContain('current company-wide management access');expect(f.managerReads).not.toHaveBeenCalled();});

vi.mock('@/lib/company-access/operational-read.server',()=>({readSchedulePendingChanges:async()=>f.pending?{state:'ready',data:f.pending}:{state:'unavailable',reason:'read_failed'},readOperationalSchedule:async(_proof:unknown,query:{weekStart:string;locationId?:string})=>({state:'ready',authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000,coverage:{kind:'LOCATIONS',locationIds:['loc']},data:{weekStart:query.weekStart,selectedLocationId:query.locationId??null,locations:[{id:'loc',name:'Managed location',shortName:'Managed',active:true}],shifts:[{id:'local-shift',scheduleId:'local-week',employeeId:'local',employeeName:'Local Shift',locationId:'loc',date:'2026-10-05',startTime:'08:00',endTime:'12:00',positionName:'Recorded position',isDesignatedLead:false,isCalloutApproved:false,scheduleStatus:'PUBLISHED'}],roster:[],companyControls:{state:'requires_company'}}})}));
it('uses the actual scoped schedule DTO without loading the canonical full roster',async()=>{f.role='MANAGER';operationalPageFixture.scoped=true;const output=await html();expect(output).toContain('Local Shift');expect(output).toContain('Recorded position');expect(output).not.toContain('Build and publish');expect(output).not.toContain('Copy previous week');expect(f.managerReads).not.toHaveBeenCalled();});

it.each([
 ['error','INVALID_SHIFT','Couldn’t open that shift. Pick it again from this week.','alert'],
 ['error','SHIFT_HAS_EXCHANGE_HISTORY','This shift has scheduling history and cannot be deleted. Edit it instead.','alert'],
 ['warning','OUTSIDE_AVAILABILITY',"Review this shift: it is outside the employee&#x27;s submitted availability.",'status'],
 ['warning','WEEKLY_HOURS','Review this employee’s scheduled hours; they may exceed 40 hours.','status'],
])('preserves scoped redirect %s=%s and its week/location context',async(field,code,message,role)=>{
 f.role='MANAGER';operationalPageFixture.scoped=true;
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',location:'loc',[field]:code})}));
 expect(output).toContain(`role="${role}"`);expect(output).toContain(message);
 expect(output).toContain('Local Shift');expect(output).toContain('href="/app/schedule/new?week=2026-10-05&amp;locationId=loc"');
 expect(output).toContain('href="/app/schedule?week=2026-09-28&amp;location=loc"');
 expect(output).not.toContain('Shift saved');expect(f.managerReads).not.toHaveBeenCalled();
});
it.each(['updated','deleted'])('a scoped %s route hint prompts inspection without manufacturing a save receipt',async field=>{
 f.role='MANAGER';operationalPageFixture.scoped=true;
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',location:'loc',[field]:'1'})}));
 expect(output).toContain('Review the current schedule to confirm your change.');expect(output).toContain('role="status"');
 expect(output).not.toContain('Shift updated.');expect(output).not.toContain('Shift deleted.');expect(output).not.toContain('form-success');
});
it('unknown scoped route codes stay generic and cannot manufacture success or echo arbitrary text',async()=>{
 f.role='MANAGER';operationalPageFixture.scoped=true;
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',location:'loc',error:'UNTRUSTED_QUERY_TEXT',warning:'constructor',updated:'untrusted',deleted:'untrusted',published:'loc'})}));
 expect(output).toContain('The schedule could not be updated.');expect(output).toContain('Review the current schedule for any scheduling warnings.');
 expect(output).not.toContain('UNTRUSTED_QUERY_TEXT');expect(output).not.toContain('constructor');expect(output).not.toContain('form-success');
 expect(output).not.toContain('Shift saved');expect(output).not.toContain('Shift updated.');expect(output).not.toContain('Shift deleted.');expect(output).not.toContain('Managed published.');
});
it('preserves the existing Company error and warning messages',async()=>{
 f.role='MANAGER';
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',error:'INVALID_SHIFT',warning:'OUTSIDE_AVAILABILITY'})}));
 expect(output).toContain('Couldn’t open that shift. Pick it again from this week.');expect(output).toContain("Shift saved, but it is outside the employee&#x27;s submitted availability.");
 expect(output).toContain('role="alert"');expect(output).toContain('role="status"');
});
it('Corporate: the week card names the week and its state, open shifts offer Find cover, and an unplanned location offers Plan',async()=>{
 f.role='MANAGER';f.locations=[{id:'main',shortName:'Main Office'},{id:'west',shortName:'West Office'}];
 f.statuses=[{locationId:'main',status:'PUBLISHED'}];
 f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];
 f.shifts=[{id:'s1',employeeId:'worker',locationId:'main',date:'2026-10-05',startTime:'06:00',endTime:'14:00',scheduleStatus:'PUBLISHED'}];
 const repair='/app/schedule/coverage?week=2026-10-05&date=2026-10-05&locationId=main&start=17%3A00&end=24%3A00&repair=x';
 f.dashboard={availabilitySubmissionSummary:{submittedEmployees:0,eligibleEmployees:8},latestRevision:{affectedLocationId:'main',createdAt:'2026-10-02T15:00:00Z'},
  managerActions:[{id:'COVERAGE:a',type:'COVERAGE_GAP',priority:'URGENT',title:'Coverage gap at Main Office',detail:'',href:repair,locationId:'main'},
   {id:'COVERAGE:setup',type:'COVERAGE_GAP',priority:'REVIEW',title:'Staffing setup needed at West Office',detail:'',href:'/app/schedule/settings',locationId:'west'}]};
 const output=(await html()).replace(/ /g,' ');
 // Release 1 (board G-O-Schedule): the week card says the week and how much of it the team can see.
 expect(output).toContain('class="c-sched-week__label">Oct 5 – 11<');
 expect(output).toContain('>1 of 2 published</span>');
 expect(output).toContain('West Office isn’t planned');
 expect(output).toContain('aria-label="Plan West Office"');
 expect(output).toContain('href="/app/schedule?week=2026-10-05&amp;location=west&amp;plan=1#schedule-planning"');
 expect(output).toContain(`href="${repair.replaceAll('&','&amp;')}"`);
 expect(output).toContain('>Find cover</a>');
 expect(output).toContain('1 this week');
 // The planning panel (through Build and publish), copy week, templates and add shift stay reachable.
 expect(output).toContain('plan=1#schedule-planning');expect(output).toContain('Copy previous week');
 expect(output).toContain('/app/schedule/templates?week=2026-10-05');expect(output).toMatch(/href="\/app\/schedule\/new\?week=2026-10-05&amp;date=2026-10-\d\d"/);
});
it('v3: a failed dashboard read leaves availability and open shifts out instead of showing zero',async()=>{
 f.role='MANAGER';f.locations=[{id:'main',shortName:'Main Office'}];f.dashboard=null;
 f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];
 f.shifts=[{id:'s1',employeeId:'worker',locationId:'main',date:'2026-10-05',startTime:'06:00',endTime:'14:00',scheduleStatus:'PUBLISHED'}];
 const output=await html();
 expect(output).toContain('Fictional Worker');
 expect(output).not.toContain('availability 0');expect(output).not.toContain('Availability received');expect(output).not.toContain('Open shifts');
});

// Publish changes (Jose, Oct 29): edits to a published week wait; the week card counts them and the edited shift says Changed.
it('Corporate: the week card counts unpublished changes and the edited shift says Changed',async()=>{
 f.role='MANAGER';f.locations=[{id:'main',shortName:'Main Office'}];f.statuses=[{locationId:'main',status:'PUBLISHED'}];
 f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];
 f.shifts=[{id:'s1',employeeId:'worker',locationId:'main',date:'2026-10-05',startTime:'06:00',endTime:'14:00',scheduleStatus:'PUBLISHED'}];
 f.pending={weekStart:'2026-10-05',hasPendingChanges:true,pendingCount:1,neverCaptured:false,latestRevision:null,canPublish:true,truncated:false,
  locations:[{locationId:'main',locationName:'Main Office',pendingCount:1}],
  changes:[{shiftId:'s1',locationId:'main',employeeId:'worker',employeeName:'Fictional Worker',date:'2026-10-05',kind:'CHANGED',fields:['TIME'],before:null,after:null,editCount:1,lastEditedAt:null,lastEditedBy:null}],changedShiftIds:['s1']};
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',day:'2026-10-05'})}));
 expect(output).toContain('>Published · </span>1 change</span>');
 f.pending=null;
 expect(renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05'})}))).toContain('>Published</span>');
});

// Release 1 fixes (review of Oct 31): distinct change counts, every held shift marked, Send an update only with Updates on,
// and the per-location panel never publishes held changes it hasn't listed.
const presentation=vi.hoisted(()=>({updates:true}));
vi.mock('@/lib/workspace-presentation/current.server',()=>({currentPresentation:async()=>({modules:{timeOff:true,marketplace:true,updates:presentation.updates,payStatements:true,breaks:true}})}));
beforeEach(()=>{presentation.updates=true;});
const twoPublished=()=>{
 f.role='OWNER';f.locations=[{id:'main',shortName:'Main Office'},{id:'west',shortName:'West Office'}];
 f.statuses=[{locationId:'main',status:'PUBLISHED'},{locationId:'west',status:'PUBLISHED'}];
 f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];
 f.shifts=Array.from({length:60},(_,i)=>({id:`s${i}`,employeeId:'worker',locationId:i%2?'west':'main',date:'2026-10-05',startTime:'06:00',endTime:'07:00',scheduleStatus:'PUBLISHED'}));
};
// One shift moved from Main Office to West Office: one change, counted under both locations.
const moved=(extra:Record<string,unknown>={})=>({weekStart:'2026-10-05',hasPendingChanges:true,pendingCount:1,neverCaptured:false,latestRevision:null,canPublish:true,truncated:false,
 locations:[{locationId:'main',locationName:'Main Office',pendingCount:1},{locationId:'west',locationName:'West Office',pendingCount:1}],
 changes:[{shiftId:'s1',locationId:'west',employeeId:'worker',employeeName:'Fictional Worker',date:'2026-10-05',kind:'CHANGED',fields:['LOCATION'],before:null,after:null,editCount:1,lastEditedAt:null,lastEditedBy:null}],changedShiftIds:['s1'],...extra});
const page=(params:Record<string,string>)=>SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',...params})}).then(renderToStaticMarkup);

it('7a: All locations counts a change once even when it touches two locations; one location counts its own',async()=>{
 twoPublished();f.pending=moved();
 expect(await page({})).toContain('>Published · </span>1 change</span>');
 expect(await page({location:'west'})).toContain('>Published · </span>1 change</span>');
 f.pending=moved({pendingCount:3,locations:[{locationId:'main',locationName:'Main Office',pendingCount:2},{locationId:'west',locationName:'West Office',pendingCount:2}]});
 expect(await page({})).toContain('>Published · </span>3 changes</span>');
 expect(await page({location:'main'})).toContain('>Published · </span>2 changes</span>');
});
it('7b: every held shift says Changed, past the 50-row change list',async()=>{
 twoPublished();
 const ids=f.shifts.map(shift=>shift.id as string);
 // The short list stops at 50 (here s10–s59); the id list has all 60, so s0–s9 are marked too.
 f.pending=moved({pendingCount:60,truncated:true,changes:ids.slice(10).map(shiftId=>({shiftId,locationId:'main',employeeId:'worker',employeeName:'Fictional Worker',date:'2026-10-05',kind:'CHANGED',fields:['TIME'],before:null,after:null,editCount:1,lastEditedAt:null,lastEditedBy:null})),changedShiftIds:ids});
 const output=await page({day:'2026-10-05'});
 // The day card shows the first five rows (s0–s4), none of them in the short list.
 const rows=output.match(/<li><a class="c-row c-sched-row"[\s\S]*?<\/a><\/li>/g)??[];
 expect(rows).toHaveLength(5);
 for(const row of rows)expect(row).toContain('>Changed</span>');
 f.pending=moved({changedShiftIds:['s2']});
 const one=(await page({day:'2026-10-05'})).match(/<li><a class="c-row c-sched-row"[\s\S]*?<\/a><\/li>/g)!;
 expect(one.filter(row=>row.includes('>Changed</span>'))).toHaveLength(1);
});
it('7c: Send an update shows on the published receipt only while Company updates are on',async()=>{
 twoPublished();
 expect(await page({published:'main'})).toContain('href="/app/updates/compose"');
 presentation.updates=false;
 const held=await page({published:'main'});
 expect(held).toContain('Main Office published.');expect(held).not.toContain('/app/updates/compose');expect(held).not.toContain('Send an update');
});
it('7d: with held changes the per-location panel sends the Owner to Build and publish instead of publishing them unseen',async()=>{
 twoPublished();f.statuses=[{locationId:'main',status:'DRAFT'},{locationId:'west',status:'PUBLISHED'}];f.pending=moved();
 const output=await page({plan:'1'});
 expect(output).toContain('1 change not published');expect(output).toContain('href="/app/schedule/publish?week=2026-10-05">Review changes</a>');
 expect(output).not.toContain('Publish Main Office');expect(output).not.toContain('Publish West Office');
 f.pending=null;
 expect(await page({plan:'1'})).toContain('Publish Main Office');
});
// Owner premium (A12): the action is named by the week's state; publication itself is unchanged.
it('names the title action by state: Publish changes while edits wait, nothing once everything is published',async()=>{
 twoPublished();f.pending={...moved(),hasPendingChanges:false,pendingCount:0,locations:[],changes:[],changedShiftIds:[]};
 // A ready read with nothing held: hasPendingChanges false, so no action (Activity has the publication history).
 const quiet=await page({});
 expect(quiet).not.toMatch(/href="\/app\/schedule\/publish\?week=[^"]*" aria-label=/);expect(quiet).not.toContain('>Publish changes<');
 f.pending=moved();
 expect(await page({})).toMatch(/aria-label="Publish changes, [^"]*" class="c-btn c-btn--sm">Publish changes</);
 f.pending=null; // a failed read: unknown, so Publish stays
 expect(await page({})).toMatch(/aria-label="Publish, [^"]*" class="c-btn c-btn--sm">Publish</);
});
it('the "…" menu opens Schedule activity for the week shown',async()=>{
 f.role='OWNER';f.locations=[{id:'main',shortName:'Main Office'}];
 expect(await html()).toContain('href="/app?week=2026-10-05&amp;view=activity"><strong>Activity</strong>');
});
