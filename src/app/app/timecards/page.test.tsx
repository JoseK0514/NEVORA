import type {ReactElement, ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, expect, it, rs} from '@rstest/core';

const fixture=rs.hoisted(()=>({role:'MANAGER',denied:false,payroll:null as null|{enabled:boolean;canReview:boolean}|'fails',company:rs.fn(),locations:rs.fn(),observation:{state:'ready',data:{private:'never-client'},authority:'fictional-company',observedAt:'2026-10-20T12:00:00Z',validForMs:15000}}));
rs.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'actor',role:fixture.role}),requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>{fixture.company();return fixture.denied?{state:'unavailable',reason:'access_denied'}:{...fixture.observation,data:await load()};}}));
rs.mock('@/lib/data/locations',()=>({listLocations:fixture.locations}));
rs.mock('@/lib/data/employees',()=>({listEmployees:async()=>[{role:'OWNER',firstName:'Jose',lastName:'Natal'},{role:'MANAGER',firstName:'Elena',lastName:'Ruiz'}]}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fictional-workspace',timeZone:'America/Puerto_Rico'})}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:ReactNode;unavailable?:ReactNode})=><section data-company-frame="">{children??unavailable}</section>}));
rs.mock('@/components/timecards',()=>({Timecards:({initialPeriod,manager,today,payrollStep}:{initialPeriod:{startDate:string;endDate:string};manager:boolean;today?:string;payrollStep?:string})=><p data-manager={manager} data-today={today} data-payroll-step={payrollStep??'none'}>{initialPeriod.startDate} / {initialPeriod.endDate}</p>}));
rs.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>fixture.payroll!==null,readPayrollCapabilities:async()=>{if(fixture.payroll==='fails')throw Error('Unavailable');return fixture.payroll;}}));
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import TimecardsPage from './page';

beforeEach(()=>{fixture.role='MANAGER';fixture.denied=false;fixture.payroll=null;fixture.company.mockReset();fixture.locations.mockReset().mockResolvedValue([{id:'site-a',name:'Main Office',address:'private street',clockerKey:'private key'}]);rs.useFakeTimers();rs.setSystemTime(new Date('2026-10-20T12:00:00Z'));});
afterEach(()=>{ rs.useRealTimers(); });

it.each(['MANAGER','OWNER'])('keeps the clean current-week %s view inside the current Company lifetime frame',async role=>{
 fixture.role=role;
 const page=await TimecardsPage({searchParams:Promise.resolve({})});
 expect(page.type).toBe(ScopedReadFrame);
 expect((page as ReactElement<{observation:unknown}>).props.observation).toEqual({authority:fixture.observation.authority,observedAt:fixture.observation.observedAt,validForMs:fixture.observation.validForMs});
 expect(JSON.stringify((page as ReactElement<{observation:unknown}>).props.observation)).not.toContain('never-client');
 const html=renderToStaticMarkup(page);
 expect(html).toContain('class="cm-timecards"');
 expect(html).toContain('2026-10-19 / 2026-10-25');
 expect(html).toContain('data-today="2026-10-20"');
 expect(fixture.company).toHaveBeenCalledOnce();
});
it('honors an explicit timecard period without removing the Company frame',async()=>{
 const page=await TimecardsPage({searchParams:Promise.resolve({start:'2026-09-21',end:'2026-09-27'})});
 expect(page.type).toBe(ScopedReadFrame);
 expect(renderToStaticMarkup(page)).toContain('2026-09-21 / 2026-09-27');
});
it('withholds the clean team view when Company authority is denied',async()=>{
 fixture.denied=true;
 const html=renderToStaticMarkup(await TimecardsPage({searchParams:Promise.resolve({})}));
 expect(html).toContain('<h1>Timecards</h1>');
 expect(html).not.toContain('cm-timecards');
 expect(html).not.toContain('data-manager');
});
// Direction B for Leads (Nov 8, 2026): a Lead's timecards open as Time's Past timecards too, still without Company
// management authority.
it('opens a Lead’s timecards as Time’s Past timecards without requesting Company management authority',async()=>{
 fixture.role='LEAD';
 const page=await TimecardsPage({searchParams:Promise.resolve({})}) as ReactElement<{corporate:boolean;children:unknown}>;
 expect(page.props.corporate).toBe(true);expect(page.props.children).toBeNull();
 expect(fixture.company).not.toHaveBeenCalled();
});
it('opens an Employee’s timecards as Time’s Past timecards on every screen (Release 1)',async()=>{
 fixture.role='EMPLOYEE';
 const page=await TimecardsPage({searchParams:Promise.resolve({})}) as ReactElement<{corporate:boolean;explicit:boolean;children:unknown}>;
 expect(page.props.corporate).toBe(true);expect(page.props.explicit).toBe(false);expect(page.props.children).toBeNull();
 const chosen=await TimecardsPage({searchParams:Promise.resolve({start:'2026-09-21',end:'2026-09-27'})}) as ReactElement<{explicit:boolean;period:{startDate:string}}>;
 expect(chosen.props.explicit).toBe(true);expect(chosen.props.period.startDate).toBe('2026-09-21');
 expect(fixture.company).not.toHaveBeenCalled();
});
// AR-11 (Nov 14, 2026): the page tells the team view what follows a finalized period, from the capability read Payroll uses.
it.each([[{enabled:true,canReview:true},'prepare'],[{enabled:true,canReview:false},'owner'],[{enabled:false,canReview:false},'none'],[null,'none'],['fails','none']] as const)('names the step after finalizing from payroll access %j',async(payroll,step)=>{
 fixture.payroll=payroll;
 expect(renderToStaticMarkup(await TimecardsPage({searchParams:Promise.resolve({})}))).toContain(`data-payroll-step="${step}"`);
});

it('passes only the scoped site ID and name to the reviewer, including retired sites',async()=>{
 const page=await TimecardsPage({searchParams:Promise.resolve({})});
 const body=page.props.children as ReactElement<{children:ReactElement<{locations:unknown}>}>;
 expect(fixture.locations).toHaveBeenCalledWith({includeInactive:true});
 expect(body.props.children.props.locations).toEqual([{id:'site-a',name:'Main Office'}]);
});
it('keeps timecard review available when a site name cannot be read',async()=>{
 fixture.locations.mockRejectedValueOnce(new Error('unavailable'));
 const page=await TimecardsPage({searchParams:Promise.resolve({})});
 const body=page.props.children as ReactElement<{children:ReactElement<{locations:unknown}>}>;
 expect(body.props.children.props.locations).toEqual([]);
});
