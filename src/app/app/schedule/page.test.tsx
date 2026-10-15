import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import SchedulePage from './page';
const f=vi.hoisted(()=>({positions:[] as {id:string,name:string}[], shifts:[] as Record<string,unknown>[], employees:[] as Record<string,unknown>[], history:[] as Record<string,unknown>[], captured:[] as Record<string,unknown>[], managerReads:vi.fn(), locations:[] as {id:string,shortName:string}[],enabled:true,active:true,role:'EMPLOYEE',reads:vi.fn(),before:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}],after:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'09:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}]}));
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
vi.mock('@/lib/data/schedules',()=>({listWeekShifts:async()=>f.shifts}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/app/app/schedule/actions',()=>({copyPreviousWeekAction:vi.fn(),setAvailabilityDeadlineAction:vi.fn(),publishScheduleAction:vi.fn()}));
vi.mock('@/lib/data/schedule-publication-review',()=>({getSchedulePublishReadiness:async()=>({locationName:'West Office',coverageGaps:3,missingLeadBlocks:1,positionNeedsSetup:false,staffingNeedsSetup:false,coverageNeedsSetup:false,underTargetCount:2,overTargetCount:1,unconfiguredTargetCount:1,hasWarnings:true})}));
vi.mock('@/lib/data/week-settings',()=>({getWeekSettings:async()=>null}));
vi.mock('@/lib/data/acknowledgements',()=>({getEmployeeAcknowledgementState:async()=>({latestRevisionId:'latest',acknowledgedRevisionId:'before',needsAcknowledgement:true,acknowledged:false})}));
vi.mock('@/app/app/schedule/acknowledge-actions',()=>({acknowledgeScheduleAction:vi.fn()}));
vi.mock('@/lib/employee-display',()=>({employeeRoleLabel:()=>''}));
vi.mock('@/lib/notifications/config',()=>({readNotificationConfig:()=>({featureEnabled:f.enabled})}));
vi.mock('@/lib/data/publication-revisions',()=>({getLatestPublicationRevision:async()=>({id:'latest'}),listCapturedShiftPositions:async({weekStart,shiftIds}:{weekStart:string;shiftIds:string[]})=>{f.managerReads({weekStart,shiftIds});return f.history.length?f.history:f.captured;},listRevisionShifts:async(id:string)=>{f.reads(id);return f.role==='MANAGER'?f.captured:id==='before'?f.before:f.after;}}));
vi.mock('@/lib/data/notification-state',()=>({sqlNotificationStateRepository:()=>({recipientAccess:async()=>({employeeId:'self',role:f.role,active:f.active,allowedLocationIds:['2']})})}));
vi.mock('@/lib/notifications/device-state',()=>import('../../../lib/notifications/device-state'));
beforeEach(()=>{f.positions=[];f.shifts=[];f.employees=[];f.captured=[];f.history=[];f.managerReads.mockClear();f.locations=[];f.enabled=true;f.active=true;f.role='EMPLOYEE';f.reads.mockClear();f.after=[{...f.before[0],startTime:'09:00'}];});
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
 expect(output.match(/class="employee-schedule-day[\s"]/g)).toHaveLength(7);
 expect(output).toContain('/app/exchange/swap?sourceShiftId=shift%20a%26b');
 expect(output).toContain('/app/exchange/callout?shiftId=shift%20a%26b');
 expect(output).toContain('8:00 AM'); expect(output).toContain('2:00 PM');
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
    const output = await html();
    expect(output).toContain('data-expanded-locations="true"');
    expect(output).toContain(
      `data-dense-locations="${names.length > 8 ? "true" : "false"}"`,
    );
    for (const name of names) expect(output).toContain(name);
  }
});

vi.mock('@/lib/data/positions',()=>({listPositions:async()=>{f.managerReads('positions');return f.positions;}}));
vi.mock('@/lib/data/schedule-generation-review',()=>({getScheduleGenerationReview:async()=>{f.managerReads('review');return {editable:true,exclusions:[],coverage:null,attempted:0,needsSetup:0};}}));
vi.mock('@/components/schedule-generation-controls',()=>import('../../../components/schedule-generation-controls'));
vi.mock('@/app/app/schedule/generation-actions',()=>({generateWeekAction:vi.fn(),clearGenerationExclusionAction:vi.fn()}));
it('Manager Schedule uses the shared viewport-safe action menu instead of a page-local details dropdown',async()=>{f.role='MANAGER';const output=await html();expect(output).toContain('class="nevora-action-menu"');expect(output).toContain('popover="auto"');expect(output).not.toContain('<details class="schedule-more-menu"');});
it('Manager renders actual assigned positions and captured published names without invented labels',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'draft',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'DRAFT'},{id:'published',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'PUBLISHED'},{id:'legacy',employeeId:'worker',locationId:'north',date:'2026-10-07',startTime:'08:00',endTime:'12:00',scheduleStatus:'DRAFT'}];f.captured=[{sourceShiftId:'published',positionName:'Captured Cashier'}];const output=await html();expect(output).toContain('Renamed Cashier');expect(output).toContain('Captured Cashier');expect(output.match(/schedule-assigned-position/g)).toHaveLength(2);expect(output).toContain('Build Week');});
it('Employee/Lead do not load Manager review or position catalogs',async()=>{for(const role of ['EMPLOYEE','LEAD']){f.role=role;expect(await html()).not.toContain('Build Week');}expect(f.managerReads).not.toHaveBeenCalled();});
it('protected generated deletion reports scheduling history truthfully',async()=>{f.role='MANAGER';const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',error:'SHIFT_HAS_EXCHANGE_HISTORY'})}));expect(output).toContain('scheduling history');});
it('archived historical assignments retain their captured position identity',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'archived',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];f.captured=[{sourceShiftId:'archived',positionName:'Original Cashier'}];const output=await html();expect(output).toContain('Original Cashier');expect(output).not.toContain('Renamed Cashier');});

it('archived row omitted from newer publication resolves its older capture in a single batch',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'archived',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];f.captured=[];f.history=[{sourceShiftId:'archived',positionId:'cashier',positionName:'Original Cashier'}];const output=await html();expect(output).toContain('Original Cashier');expect(output).not.toContain('Renamed Cashier');expect(f.managerReads.mock.calls.filter(([arg])=>typeof arg==='object')).toEqual([[{weekStart:'2026-10-05',shiftIds:['archived']}]]);});
it('uncaptured legacy non-Draft assignments keep actual catalog fallback while positionless rows stay unlabeled',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Actual Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'legacy',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'},{id:'positionless',employeeId:'worker',locationId:'north',date:'2026-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];const output=await html();expect(output).toContain('Actual Cashier');expect(output.match(/schedule-assigned-position/g)).toHaveLength(1);});

it.each(['OWNER','MANAGER'])('%s can reach publication for each displayed location',async role=>{
 f.role=role;f.locations=[{id:'loc-1',shortName:'Main Office'},{id:'loc-2',shortName:'West Office'}];
 const output=await html();expect(output).toContain('Publish Main Office');expect(output).toContain('Publish West Office');
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
 const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',location:'loc-2'})}));
 expect(output).toContain('href="/app/schedule/new?week=2026-10-05&amp;locationId=loc-2"');
});

it('forged acknowledged query does not manufacture success without canonical receipt',async()=>{const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',acknowledged:'1'})}));expect(output).not.toContain('Schedule confirmed.');});

const operationalPageFixture=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
// Composition only; mounted body lifetime is covered by the browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
beforeEach(()=>{operationalPageFixture.denied=false;});

it('company denial withholds global schedule rows and all editing controls',async()=>{f.role='MANAGER';operationalPageFixture.denied=true;const output=await html();expect(output).toContain('current company-wide management access');expect(output).not.toContain('Add shift');expect(output).not.toContain('Publish');expect(f.managerReads).not.toHaveBeenCalled();});
it('an operational company denial does not remove the Employee self schedule',async()=>{operationalPageFixture.denied=true;const output=await html();expect(output).toContain('employee-schedule');expect(output).not.toContain('current company-wide management access');});
