import type {ReactElement, ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';

const fixture=vi.hoisted(()=>({role:'MANAGER',denied:false,company:vi.fn(),observation:{state:'ready',data:null,authority:'fictional-company',observedAt:'2026-10-20T12:00:00Z',validForMs:15000}}));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'actor',role:fixture.role}),requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async()=>{fixture.company();return fixture.denied?{state:'unavailable',reason:'access_denied'}:fixture.observation;}}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
vi.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children,unavailable}:{children?:ReactNode;unavailable?:ReactNode})=><section data-company-frame="">{children??unavailable}</section>}));
vi.mock('@/components/timecards',()=>({Timecards:({initialPeriod,manager,today}:{initialPeriod:{startDate:string;endDate:string};manager:boolean;today?:string})=><p data-manager={manager} data-today={today}>{initialPeriod.startDate} / {initialPeriod.endDate}</p>}));
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import TimecardsPage from './page';

beforeEach(()=>{fixture.role='MANAGER';fixture.denied=false;fixture.company.mockReset();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));});
afterEach(()=>vi.useRealTimers());

it.each(['MANAGER','OWNER'])('keeps the clean current-week %s view inside the current Company lifetime frame',async role=>{
 fixture.role=role;
 const page=await TimecardsPage({searchParams:Promise.resolve({})});
 expect(page.type).toBe(ScopedReadFrame);
 expect((page as ReactElement<{observation:unknown}>).props.observation).toBe(fixture.observation);
 const html=renderToStaticMarkup(page);
 expect(html).toContain('cm-page cm-timecards');
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
 expect(html).toContain('Timecards unavailable');
 expect(html).not.toContain('cm-timecards');
 expect(html).not.toContain('data-manager');
});
// T-17 (final pass): the employee view opens on the same Monday to Sunday week as Pay (This week / Last week).
it('opens the employee current week without requesting Company management authority',async()=>{
 fixture.role='EMPLOYEE';
 const html=renderToStaticMarkup(await TimecardsPage({searchParams:Promise.resolve({})}));
 expect(html).toContain('2026-10-19 / 2026-10-25');
 expect(html).toContain('data-today="2026-10-20"');
 expect(html).toContain('data-manager="false"');
 expect(html).not.toContain('data-company-frame');
 expect(fixture.company).not.toHaveBeenCalled();
});
