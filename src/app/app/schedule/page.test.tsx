import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import SchedulePage from './page';
const f=vi.hoisted(()=>({positions:[] as {id:string,name:string}[], shifts:[] as Record<string,unknown>[], employees:[] as Record<string,unknown>[], history:[] as Record<string,unknown>[], captured:[] as Record<string,unknown>[], managerReads:vi.fn(), locations:[] as {id:string,shortName:string}[],enabled:true,active:true,role:'EMPLOYEE',reads:vi.fn(),before:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}],after:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'09:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}]}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/scheduling/validate-shift',()=>({schedulingIssueMessage:()=>''}));
vi.mock('@/components/schedule-location-control', () => import('../../../components/schedule-location-control'));
vi.mock('@/components/page-header',()=>({PageHeader:()=>null}));
vi.mock('@/components/status-pill',()=>({StatusPill:()=>null}));
vi.mock('@/components/employee-submit-button',()=>({EmployeeSubmitButton:()=>null}));
vi.mock('@/components/schedule-publication-change',()=>import('../../../components/schedule-publication-change'));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'self',role:f.role})}));
vi.mock('@/lib/auth/permissions',()=>({isManagerRole:(role:string)=>['MANAGER','OWNER'].includes(role)}));
vi.mock('@/lib/data/employees',()=>({listEmployees:async()=>f.employees,listLocations:async()=>f.locations}));
vi.mock('@/lib/data/schedules',()=>({listWeekShifts:async()=>f.shifts}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/app/app/schedule/actions',()=>({copyPreviousWeekAction:vi.fn(),setAvailabilityDeadlineAction:vi.fn()}));
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
 expect(await html()).toContain('What changed in your schedule');expect(await html()).not.toContain('3:00 PM');expect(f.reads.mock.calls.flat()).toContain('before');
});
it('filters revoked location history on both sides and hides unchanged shifts',async()=>{
 f.after=[...f.before];expect(await html()).not.toContain('What changed');
 f.after=[{...f.before[0],locationId:'110'}];const result=await html();expect(result).toContain('Shift removed');expect(result).not.toContain('Location 110');
});
it('feature off and access loss disclose no history',async()=>{
 f.enabled=false;expect(await html()).not.toContain('What changed');expect(f.reads).not.toHaveBeenCalled();
 f.enabled=true;f.active=false;expect(await html()).not.toContain('What changed');
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
    for (const name of names) expect(output).toContain(name);
  }
});

vi.mock('@/lib/data/positions',()=>({listPositions:async()=>{f.managerReads('positions');return f.positions;}}));
vi.mock('@/lib/data/schedule-generation-review',()=>({getScheduleGenerationReview:async()=>{f.managerReads('review');return {editable:true,exclusions:[],coverage:null,attempted:0,needsSetup:0};}}));
vi.mock('@/components/schedule-generation-controls',()=>import('../../../components/schedule-generation-controls'));
vi.mock('@/app/app/schedule/generation-actions',()=>({generateWeekAction:vi.fn(),clearGenerationExclusionAction:vi.fn()}));
it('Manager renders actual assigned positions and captured published names without invented labels',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'draft',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'DRAFT'},{id:'published',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'PUBLISHED'},{id:'legacy',employeeId:'worker',locationId:'north',date:'2026-10-07',startTime:'08:00',endTime:'12:00',scheduleStatus:'DRAFT'}];f.captured=[{sourceShiftId:'published',positionName:'Captured Cashier'}];const output=await html();expect(output).toContain('Renamed Cashier');expect(output).toContain('Captured Cashier');expect(output.match(/schedule-assigned-position/g)).toHaveLength(2);expect(output).toContain('Build Week');});
it('Employee/Lead do not load Manager review or position catalogs',async()=>{for(const role of ['EMPLOYEE','LEAD']){f.role=role;expect(await html()).not.toContain('Build Week');}expect(f.managerReads).not.toHaveBeenCalled();});
it('protected generated deletion reports scheduling history truthfully',async()=>{f.role='MANAGER';const output=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05',error:'SHIFT_HAS_EXCHANGE_HISTORY'})}));expect(output).toContain('scheduling history');});
it('archived historical assignments retain their captured position identity',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'archived',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];f.captured=[{sourceShiftId:'archived',positionName:'Original Cashier'}];const output=await html();expect(output).toContain('Original Cashier');expect(output).not.toContain('Renamed Cashier');});

it('archived row omitted from newer publication resolves its older capture in a single batch',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Renamed Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'archived',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];f.captured=[];f.history=[{sourceShiftId:'archived',positionId:'cashier',positionName:'Original Cashier'}];const output=await html();expect(output).toContain('Original Cashier');expect(output).not.toContain('Renamed Cashier');expect(f.managerReads.mock.calls.filter(([arg])=>typeof arg==='object')).toEqual([[{weekStart:'2026-10-05',shiftIds:['archived']}]]);});
it('uncaptured legacy non-Draft assignments keep actual catalog fallback while positionless rows stay unlabeled',async()=>{f.role='MANAGER';f.positions=[{id:'cashier',name:'Actual Cashier'}];f.employees=[{id:'worker',active:true,firstName:'Fictional',lastName:'Worker',role:'EMPLOYEE'}];f.shifts=[{id:'legacy',employeeId:'worker',locationId:'north',positionId:'cashier',date:'2026-10-05',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'},{id:'positionless',employeeId:'worker',locationId:'north',date:'2026-10-06',startTime:'08:00',endTime:'12:00',scheduleStatus:'ARCHIVED'}];const output=await html();expect(output).toContain('Actual Cashier');expect(output.match(/schedule-assigned-position/g)).toHaveLength(1);});
