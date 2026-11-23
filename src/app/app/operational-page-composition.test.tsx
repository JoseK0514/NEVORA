import * as rstestOriginal0 from "@/lib/workspace-presentation/service" with { rstest: 'importActual' };
import {beforeEach,expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture=rs.hoisted(()=>({role:'MANAGER',denied:false,company:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'actor',role:fixture.role}),requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/auth/permissions',()=>({isManagerRole:(role:string)=>role==='MANAGER'||role==='OWNER',requireRoles:async()=>({id:'actor',role:fixture.role})}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>{fixture.company();return fixture.denied?{state:'unavailable',reason:'access_denied'}:{state:'ready',data:await load(),authority:'fixture',observedAt:'2026-10-14T12:00:00Z',validForMs:15000};}}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:React.ReactNode;unavailable?:React.ReactNode})=>children??unavailable??null}));
rs.mock('next/navigation',()=>({redirect:(href:string)=>{throw Error(href);},useRouter:()=>({replace:()=>undefined,push:()=>undefined,refresh:()=>undefined})}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fixture',timeZone:'America/Puerto_Rico'})}));
rs.mock('@/lib/communications/service.server',()=>({communicationAuthority:()=> 'fictional-authority'}));
rs.mock('@/components/employee-updates',()=>({EmployeeUpdates:({mode}:{mode:string})=><p>Updates: {mode}</p>}));
rs.mock('@/components/communication-detail',()=>({CommunicationDetail:({mode}:{mode:string})=><p>Detail: {mode}</p>}));
rs.mock('@/components/communication-compose',()=>({CommunicationCompose:({mode}:{mode:string})=><p>Compose: {mode}</p>}));
rs.mock('@/components/timecards',()=>({Timecards:({manager}:{manager:boolean})=><p>{manager?'Team timecards':'Own timecards'}</p>}));
rs.mock('@/components/timecards-heading',()=>({TimecardsHeading:()=>null}));
rs.mock('@/components/reports',()=>({Reports:()=> <p>Protected reports</p>}));
rs.mock('@/components/reports-entrance',()=>({ReportsEntrance:({children}:{children:React.ReactNode})=>children}));
rs.mock('@/components/payroll-export',()=>({PayrollExport:()=> <p>Protected operational export</p>}));
rs.mock('@/components/payroll-export-motion',()=>({PayrollExportMotion:()=>null}));
rs.mock('@/components/account-recovery',()=>({AccountRecovery:()=> <p>Protected assisted recovery</p>}));
rs.mock('@/components/clocker-recovery-review',()=>({ClockerRecoveryReview:()=> <p>Protected device recovery</p>}));
import Updates from './updates/page';import Detail from './updates/[id]/page';import Compose from './updates/compose/page';import Timecards from './timecards/page';import Reports from './reports/page';import Export from './payroll-export/page';import Recovery from './account-recovery/page';import DeviceRecovery from './clocker-recovery/page';
rs.mock('@/lib/workspace-presentation/service',  () => ({ ...(rstestOriginal0), readActivePresentation: async () => ({ style: undefined, tokens: null, logoAssetId: null, revision: 0, words: 'standard' as const, modules: (await import('@/lib/workspace-presentation/modules')).ALL_MODULES_ON }) })); // no saved settings: every module on
const query={searchParams:Promise.resolve({})};
beforeEach(()=>{fixture.role='MANAGER';fixture.denied=false;fixture.company.mockReset();});
it('current company denial withholds management communication, attendance, export, report and recovery surfaces',async()=>{
 fixture.denied=true;
 for(const read of [()=>Updates(),()=>Detail({params:Promise.resolve({id:'fictional'})}),()=>Compose(query),()=>Timecards(query),()=>Reports(query),()=>Export(query),()=>Recovery(),()=>DeviceRecovery()]){const html=renderToStaticMarkup(await read());expect(html).toContain('Company-wide access needed');expect(html).not.toMatch(/Protected |Updates:|Detail:|Compose:|Team timecards/);}
 expect(fixture.company).toHaveBeenCalledTimes(8);
});
it.each(['EMPLOYEE','LEAD'])('retains %s self timecards and recipient communications without company management authority',async role=>{
 fixture.role=role;fixture.denied=true;
 // Release 1: an Employee's timecards open Time's Past timecards; a Lead's too since Direction B (Nov 8, 2026).
 const own=renderToStaticMarkup(await Timecards(query));
 expect(own).toContain('Opening your timecards');expect(own).not.toContain('Team timecards');
 expect(renderToStaticMarkup(await Updates())).toContain('Updates: employee');
 expect(renderToStaticMarkup(await Detail({params:Promise.resolve({id:'fictional'})}))).toContain('Detail: employee');
 expect(renderToStaticMarkup(await Compose(query))).toContain('Compose: employee');
 expect(fixture.company).not.toHaveBeenCalled();
});
it('retains Company management surfaces under the current authorized projection',async()=>{
 expect(renderToStaticMarkup(await Updates())).toContain('Updates: manager');expect(renderToStaticMarkup(await Timecards(query))).toContain('Team timecards');expect(renderToStaticMarkup(await Reports(query))).toContain('Protected reports');expect(renderToStaticMarkup(await Export(query))).toContain('Protected operational export');
});
