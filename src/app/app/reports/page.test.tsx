import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import ReportsPage from './page';

const fixture=rs.hoisted(()=>({role:'MANAGER',denied:false,reports:rs.fn(),workspace:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({
 requireSession:async()=>({id:'actor',role:fixture.role}),
 requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)}),
}));
// Rondo Spanish (G98): the person's language; a failed read is English.
const language=rs.hoisted(()=>({value:'en' as 'en'|'es',fail:false}));
rs.mock('@/lib/activation/language.server',()=>({readPortalLanguage:async()=>{if(language.fail)throw Error('language_source_unavailable');return {state:'ready',savedLanguage:null,language:language.value};}}));
rs.mock('next/navigation',()=>({redirect:(href:string)=>{throw Error(`redirect:${href}`);}}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({
 withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>fixture.denied
  ?{state:'unavailable',reason:'access_denied'}
  :{state:'ready',data:await load(),authority:'company-fixture',observedAt:'2026-10-20T12:00:00Z',validForMs:15000},
}));
// Verify server composition; the actual frame's mounted lifetime has its own coverage.
rs.mock('@/components/company-access/scoped-read-frame',()=>({
 ScopedReadFrame:({observation,children,unavailable}:{observation?:{authority:string};children?:React.ReactNode;unavailable?:React.ReactNode})=>
  <section data-authority={observation?.authority}>{observation?children:unavailable}</section>,
}));
rs.mock('@/components/reports-entrance',()=>({ReportsEntrance:({children}:{children:React.ReactNode})=><main>{children}</main>}));
rs.mock('@/components/reports',()=>({Reports:(props:unknown)=>{fixture.reports(props);return <div>Protected period reports</div>;}}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>{fixture.workspace();return {timeZone:'America/Puerto_Rico'};}}));

beforeEach(()=>{language.value='en';language.fail=false;fixture.role='MANAGER';fixture.denied=false;fixture.reports.mockClear();fixture.workspace.mockClear();rs.useFakeTimers();rs.setSystemTime(new Date('2026-10-20T12:00:00Z'));});
afterEach(()=>{ rs.useRealTimers(); });

it.each(['MANAGER','OWNER'])('keeps the clean Insights layout and period props inside the current authority frame for %s',async role=>{
 fixture.role=role;
 const output=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(output).toContain('<section data-authority="company-fixture"><main>');
 expect(output).toContain('Protected period reports');
 expect(output).not.toContain('class="nv-content"');
 // MK5 / PD4: Insights opens on this week so far (Monday Oct 19 to today), not last week.
 expect(fixture.reports).toHaveBeenCalledWith({initialPeriod:{startDate:'2026-10-19',endDate:'2026-10-20'},today:'2026-10-20',christmasBonus:true});
});
it('denied company authority withholds the report body and avoids workspace loading',async()=>{
 fixture.denied=true;
 const output=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(output).toContain('Company-wide access needed');
 expect(output).not.toContain('Protected period reports');
 expect(fixture.reports).not.toHaveBeenCalled();
 expect(fixture.workspace).not.toHaveBeenCalled();
});
// Review F2 (NV-136): a closed page explains itself instead of a silent redirect, and still reads nothing.
it.each(['EMPLOYEE','LEAD'])('closes management reports to %s with a notice',async role=>{
 fixture.role=role;
 const output=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(output).toContain('Insights is for Owners and Managers');
 expect(output).toContain('href="/app/my-time"');
 expect(output).not.toContain('Protected period reports');
 expect(fixture.reports).not.toHaveBeenCalled();
 expect(fixture.workspace).not.toHaveBeenCalled();
});
// Rondo Spanish (G98): the page's own words follow the person's language; Reports reads it from the portal itself.
it('writes the closed notice and the access card in Spanish, and is English when the language read fails',async()=>{
 language.value='es';fixture.role='EMPLOYEE';
 const closed=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(closed).toContain('Los informes son para dueños y gerentes');expect(closed).toContain('Tus horas están en Tiempo.');expect(closed).toContain('Abrir Tiempo');
 expect(closed).not.toContain('Insights is for Owners and Managers');
 fixture.role='MANAGER';fixture.denied=true;
 const denied=renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}));
 expect(denied).toContain('Informes');expect(denied).toContain('Necesitas acceso a toda la empresa');expect(denied).not.toContain('Company-wide access needed');expect(fixture.reports).not.toHaveBeenCalled();
 language.fail=true;fixture.denied=false;fixture.role='LEAD';
 expect(renderToStaticMarkup(await ReportsPage({searchParams:Promise.resolve({})}))).toContain('Insights is for Owners and Managers');
});
