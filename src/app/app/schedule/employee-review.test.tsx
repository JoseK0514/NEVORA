import {beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('server-only',()=>({}));
vi.mock('@/components/action-menu',()=>({ActionMenu:()=>null}));
vi.mock('@/components/schedule-location-control',()=>({ScheduleLocationControl:()=>null}));
vi.mock('@/components/schedule-generation-controls',()=>({ScheduleGenerationControls:()=>null}));
vi.mock('@/components/schedule-publication-controls',()=>({SchedulePublicationControls:()=>null}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/app/schedule/acknowledge-actions',()=>({acknowledgeScheduleAction:vi.fn()}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fixture-workspace',timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'fixture-employee',role:'EMPLOYEE'}),requireSessionMutationProof:async()=>({employee:{id:'fixture-employee',role:'EMPLOYEE'}})}));
vi.mock('@/app/app/schedule/actions',()=>({copyPreviousWeekAction:vi.fn(),setAvailabilityDeadlineAction:vi.fn()}));
vi.mock('@/lib/data/publication-revisions',()=>({listCapturedShiftPositions:async()=>[{sourceShiftId:'fixture-shift',positionName:'Fixture Barista'}]}));
vi.mock('@/lib/data/schedule-publication-review',()=>({getSchedulePublishReadiness:vi.fn()}));
vi.mock('@/lib/data/positions',()=>({listPositions:async()=>[{id:'fixture-position',name:'Fixture Barista'}]}));
vi.mock('@/lib/data/schedule-generation-review',()=>({getScheduleGenerationReview:vi.fn()}));
vi.mock('@/lib/data/employees',()=>({listEmployees:vi.fn(),listLocations:vi.fn()}));
vi.mock('@/lib/data/schedules',()=>({listWeekShifts:vi.fn(),listScheduleStatuses:vi.fn()}));
vi.mock('@/lib/data/schedule-health',()=>({listEmployeeHourTargets:vi.fn()}));
vi.mock('@/lib/data/exchanges',()=>({listOpenCoverage:async()=>[],listEmployeeExchangeActivity:async()=>[]}));
vi.mock('@/lib/data/week-settings',()=>({getWeekSettings:vi.fn()}));
const fixture=vi.hoisted(()=>({empty:false}));
vi.mock('@/lib/data/employee-weekly-review.server',()=>({readEmployeeWeeklyReview:async()=>({state:'published',locations:[{id:'fixture-location',shortName:'Fixture location'}],shifts:fixture.empty?[]:[{id:'fixture-shift',employeeId:'fixture-employee',date:'2026-10-11',startTime:'22:00',endTime:'06:00',locationId:'fixture-location',positionId:'fixture-position',positionName:'Fixture Barista at publication',isDesignatedLead:false,isCalloutApproved:false}],acknowledgement:{acknowledged:!fixture.empty,latestRevisionId:'fixture-revision',needsAcknowledgement:fixture.empty},displayedRevisionId:'fixture-revision',intent:fixture.empty?{operationId:'11111111-1111-4111-8111-111111111111',authority:'a'.repeat(64)}:null,publicationChanges:fixture.empty?[{type:'REMOVED',affectedEmployeeIds:['fixture-employee'],before:{isDesignatedLead:false,isCalloutApproved:false,sourceShiftId:'fixture-shift',employeeId:'fixture-employee',locationId:'fixture-location',date:'2026-10-11',startTime:'22:00',endTime:'06:00'}}]:[]})}));
import SchedulePage from '@/app/app/schedule/page';
beforeEach(()=>{fixture.empty=false;});
it('employee published shift displays its captured position and explicit overnight end date',async()=>{
 const html=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05'})}));
 expect(html).toContain('10:00\u00a0PM');expect(html).toContain('6:00\u00a0AM');expect(html).toContain('Fixture location');
 expect(html).toContain('Fixture Barista at publication');expect(html).toContain('Ends Mon, Oct 12');
});
it('relevant canceled-to-empty published week exposes its current-version confirmation',async()=>{
 fixture.empty=true;const html=renderToStaticMarkup(await SchedulePage({searchParams:Promise.resolve({week:'2026-10-05'})}));
 expect(html).toContain('Off');expect(html).toContain('Confirm schedule');expect(html).toContain('No assignments remain');
 expect(html).not.toContain('employee-quiet-status success');
});

const operationalPageFixture=vi.hoisted(()=>({denied:false}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',scope:{mode:'COMPANY',locationIds:[]}}),withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>operationalPageFixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000}}));
// Composition only; mounted body lifetime is covered by the browser harness.
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
beforeEach(()=>{operationalPageFixture.denied=false;});
