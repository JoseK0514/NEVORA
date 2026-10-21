import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import ReportsPage from './page';

const fixture=vi.hoisted(()=>({role:'MANAGER',denied:false,reports:vi.fn(),workspace:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({
 requireSession:async()=>({id:'actor',role:fixture.role}),
 requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)}),
}));
vi.mock('next/navigation',()=>({redirect:(href:string)=>{throw Error(`redirect:${href}`);}}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({
 withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>fixture.denied
  ?{state:'unavailable',reason:'access_denied'}
  :{state:'ready',data:await load(),authority:'company-fixture',observedAt:'2026-10-20T12:00:00Z',validForMs:15000},
}));
// Verify server composition; the actual frame's mounted lifetime has its own coverage.
vi.mock('@/components/company-access/scoped-read-frame',()=>({
 ScopedReadFrame:({observation,children,unavailable}:{observation?:{authority:string};children?:React.ReactNode;unavailable?:React.ReactNode})=>
  <section data-authority={observation?.authority}>{observation?children:unavailable}</section>,
}));
vi.mock('@/components/reports-entrance',()=>({ReportsEntrance:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/reports',()=>({Reports:(props:unknown)=>{fixture.reports(props);return <div>Protected period reports</div>;}}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>{fixture.workspace();return {timeZone:'America/Puerto_Rico'};}}));

beforeEach(()=>{fixture.role='MANAGER';fixture.denied=false;fixture.reports.mockClear();fixture.workspace.mockClear();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));});
afterEach(()=>vi.useRealTimers());

it.each(['MANAGER','OWNER'])('keeps the clean Insights layout and period props inside the current authority frame for %s',async role=>{
 fixture.role=role;
 const output=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(output).toContain('<section data-authority="company-fixture"><main>');
 expect(output).toContain('Recorded hours, time off and approvals for the period');
 expect(output).toContain('Protected period reports');
 expect(output).not.toContain('class="nv-content"');
 // MK5 / PD4: Insights opens on this week so far (Monday Oct 19 to today), not last week.
 expect(fixture.reports).toHaveBeenCalledWith({initialPeriod:{startDate:'2026-10-19',endDate:'2026-10-20'},today:'2026-10-20'});
});
it('denied company authority withholds the report body and avoids workspace loading',async()=>{
 fixture.denied=true;
 const output=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(output).toContain('current company-wide management access');
 expect(output).not.toContain('Protected period reports');
 expect(fixture.reports).not.toHaveBeenCalled();
 expect(fixture.workspace).not.toHaveBeenCalled();
});
it.each(['EMPLOYEE','LEAD'])('redirects %s before rendering management reports',async role=>{
 fixture.role=role;
 await expect(ReportsPage({searchParams:Promise.resolve({})})).rejects.toThrow('redirect:/app');
 expect(fixture.reports).not.toHaveBeenCalled();
 expect(fixture.workspace).not.toHaveBeenCalled();
});
