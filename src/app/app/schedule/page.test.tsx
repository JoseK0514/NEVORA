import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import SchedulePage from './page';
const f=vi.hoisted(()=>({locations:[] as {id:string,shortName:string}[],enabled:true,active:true,role:'EMPLOYEE',reads:vi.fn(),before:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}],after:[{sourceShiftId:'self-shift',employeeId:'self',locationId:'2',date:'2026-10-05',startTime:'09:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false}]}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/scheduling/validate-shift',()=>({schedulingIssueMessage:()=>''}));
vi.mock('@/components/schedule-location-control', () => import('../../../components/schedule-location-control'));
vi.mock('@/components/page-header',()=>({PageHeader:()=>null}));
vi.mock('@/components/status-pill',()=>({StatusPill:()=>null}));
vi.mock('@/components/employee-submit-button',()=>({EmployeeSubmitButton:()=>null}));
vi.mock('@/components/schedule-publication-change',()=>import('../../../components/schedule-publication-change'));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'self',role:f.role})}));
vi.mock('@/lib/auth/permissions',()=>({isManagerRole:(role:string)=>['MANAGER','OWNER'].includes(role)}));
vi.mock('@/lib/data/employees',()=>({listEmployees:async()=>[],listLocations:async()=>f.locations}));
vi.mock('@/lib/data/schedules',()=>({listWeekShifts:async()=>[]}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/app/app/schedule/actions',()=>({copyPreviousWeekAction:vi.fn(),setAvailabilityDeadlineAction:vi.fn()}));
vi.mock('@/lib/data/week-settings',()=>({getWeekSettings:async()=>null}));
vi.mock('@/lib/data/acknowledgements',()=>({getEmployeeAcknowledgementState:async()=>({latestRevisionId:'latest',acknowledgedRevisionId:'before',needsAcknowledgement:true,acknowledged:false})}));
vi.mock('@/app/app/schedule/acknowledge-actions',()=>({acknowledgeScheduleAction:vi.fn()}));
vi.mock('@/lib/employee-display',()=>({employeeRoleLabel:()=>''}));
vi.mock('@/lib/notifications/config',()=>({readNotificationConfig:()=>({featureEnabled:f.enabled})}));
vi.mock('@/lib/data/publication-revisions',()=>({listRevisionShifts:async(id:string)=>{f.reads(id);return id==='before'?f.before:f.after;}}));
vi.mock('@/lib/data/notification-state',()=>({sqlNotificationStateRepository:()=>({recipientAccess:async()=>({employeeId:'self',role:f.role,active:f.active,allowedLocationIds:['2']})})}));
vi.mock('@/lib/notifications/device-state',()=>import('../../../lib/notifications/device-state'));
beforeEach(()=>{f.locations=[];f.enabled=true;f.active=true;f.role='EMPLOYEE';f.reads.mockClear();f.after=[{...f.before[0],startTime:'09:00'}];});
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
