import {beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture=vi.hoisted(()=>({role:'MANAGER',denied:false,company:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'actor',role:fixture.role}),requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/auth/permissions',()=>({isManagerRole:(role:string)=>role==='MANAGER'||role==='OWNER',requireRoles:async()=>({id:'actor',role:fixture.role})}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>{fixture.company();return fixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000};},
 withOperationalScope:async(_proof:unknown,load:(ctx:unknown)=>Promise<unknown>)=>{fixture.company();return fixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load({ids:null}),coverage:{kind:'COMPANY',locationIds:[]},authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000};}}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
vi.mock('next/navigation',()=>({redirect:(href:string)=>{throw Error(href);},notFound:()=>{throw Error('NEXT_NOT_FOUND');}}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fixture',timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/communications/service.server',()=>({communicationAuthority:()=> 'fictional-authority'}));
vi.mock('@/components/employee-updates',()=>({EmployeeUpdates:({mode}:{mode:string})=><p>Updates: {mode}</p>}));
vi.mock('@/components/communication-detail',()=>({CommunicationDetail:({mode}:{mode:string})=><p>Detail: {mode}</p>}));
vi.mock('@/components/communication-compose',()=>({CommunicationCompose:({mode}:{mode:string})=><p>Compose: {mode}</p>}));
vi.mock('@/components/timecards',()=>({Timecards:({manager}:{manager:boolean})=><p>{manager?'Team timecards':'Own timecards'}</p>}));
vi.mock('@/components/timecards-heading',()=>({TimecardsHeading:()=>null}));
vi.mock('@/components/reports',()=>({Reports:()=> <p>Protected reports</p>}));
vi.mock('@/components/reports-entrance',()=>({ReportsEntrance:({children}:{children:React.ReactNode})=>children}));
vi.mock('@/components/payroll-export',()=>({PayrollExport:()=> <p>Protected operational export</p>}));
vi.mock('@/components/payroll-export-motion',()=>({PayrollExportMotion:()=>null}));
vi.mock('@/components/account-recovery',()=>({AccountRecovery:()=> <p>Protected assisted recovery</p>}));
vi.mock('@/components/clocker-recovery-review',()=>({ClockerRecoveryReview:()=> <p>Protected device recovery</p>}));
import Updates from './updates/page';import Detail from './updates/[id]/page';import Compose from './updates/compose/page';import Timecards from './timecards/page';import Reports from './reports/page';import Export from './payroll-export/page';import Recovery from './account-recovery/page';import DeviceRecovery from './clocker-recovery/page';
vi.mock('@/lib/workspace-presentation/service', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/workspace-presentation/service')>()), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on
const query={searchParams:Promise.resolve({})};
beforeEach(()=>{fixture.role='MANAGER';fixture.denied=false;fixture.company.mockReset();});
it('current company denial withholds management communication, attendance, export, report and recovery surfaces',async()=>{
 fixture.denied=true;
 for(const read of [()=>Updates(),()=>Detail({params:Promise.resolve({id:'00000000-0000-4000-8000-000000000001'})}),()=>Compose(query),()=>Timecards(query),()=>Reports(query),()=>Export(query),()=>Recovery(),()=>DeviceRecovery()]){const html=renderToStaticMarkup(await read());expect(html).toContain('current company-wide management access');expect(html).not.toMatch(/Protected |Updates:|Detail:|Compose:|Team timecards/);}
 expect(fixture.company).toHaveBeenCalledTimes(8);
});
it.each(['EMPLOYEE','LEAD'])('retains %s self timecards and recipient communications without company management authority',async role=>{
 fixture.role=role;fixture.denied=true;
 expect(renderToStaticMarkup(await Timecards(query))).toContain('Own timecards');
 expect(renderToStaticMarkup(await Updates())).toContain('Updates: employee');
 expect(renderToStaticMarkup(await Detail({params:Promise.resolve({id:'00000000-0000-4000-8000-000000000001'})}))).toContain('Detail: employee');
 expect(renderToStaticMarkup(await Compose(query))).toContain('Compose: employee');
 expect(fixture.company).not.toHaveBeenCalled();
});
it('retains Company management surfaces under the current authorized projection',async()=>{
 expect(renderToStaticMarkup(await Updates())).toContain('Updates: manager');expect(renderToStaticMarkup(await Timecards(query))).toContain('Team timecards');expect(renderToStaticMarkup(await Reports(query))).toContain('Protected reports');expect(renderToStaticMarkup(await Export(query))).toContain('Protected operational export');
});
