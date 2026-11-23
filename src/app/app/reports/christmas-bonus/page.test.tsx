import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {BonusYear} from '@/lib/reports/christmas-bonus';
import ChristmasBonusPage from './page';

const fixture=rs.hoisted(()=>({role:'MANAGER',denied:false,read:rs.fn(),workspace:rs.fn(),unavailable:false,timeZone:'America/Puerto_Rico'}));
rs.mock('@/lib/auth/session',()=>({
 requireSession:async()=>({id:'actor',role:fixture.role}),
 requireSessionMutationProof:async()=>({employee:{id:'actor',role:fixture.role},sessionTokenHash:'a'.repeat(64)}),
}));
rs.mock('next/link',()=>({default:({href,children,prefetch:_prefetch,...props}:React.ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',{href,...props},children)}));
rs.mock('next/navigation',()=>({redirect:(href:string)=>{throw Error(`redirect:${href}`);},usePathname:()=>'/app/reports/christmas-bonus',useRouter:()=>({refresh:()=>undefined,replace:()=>undefined,push:()=>undefined})}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({
 withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>fixture.denied
  ?{state:'unavailable',reason:'access_denied'}
  :{state:'ready',data:await load(),authority:'company-fixture',observedAt:'2026-11-18T16:00:00Z',validForMs:15000},
}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({
 ScopedReadFrame:({observation,children,unavailable}:{observation?:{authority:string};children?:React.ReactNode;unavailable?:React.ReactNode})=>
  createElement('section',{'data-authority':observation?.authority},observation?children:unavailable),
}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>{fixture.workspace();return {timeZone:fixture.timeZone};}}));
rs.mock('@/lib/reports/christmas-bonus.server',()=>({readChristmasBonusReport:async(_proof:unknown,year:BonusYear)=>{
 fixture.read(year);
 if(fixture.unavailable)return {state:'unavailable',reason:'read_failed'};
 const hours=(h:number)=>(BigInt(h)*BigInt(3_600_000_000_000)).toString();
 return {state:'ready',report:{year,timeZone:'America/Puerto_Rico',observedAt:'2026-11-18T16:00:00Z',
  rows:[
   {employeeId:'E1',name:'Ana Rivera',active:true,hireDate:'2016-03-02',thresholdHours:700,recordedNanoseconds:hours(812),breakNanoseconds:hours(20),unfinalizedDays:0,status:'REACHED'},
   {employeeId:'E2',name:'Luis Ortiz',active:true,hireDate:null,thresholdHours:null,recordedNanoseconds:hours(1400),breakNanoseconds:'0',unfinalizedDays:3,status:'NEEDS_HIRE_DATE'},
   {employeeId:'E3',name:'Mia Cruz',active:false,hireDate:'2019-07-15',thresholdHours:1350,recordedNanoseconds:hours(900),breakNanoseconds:'0',unfinalizedDays:0,status:'NOT_REACHED'},
  ],
  summary:{people:3,reached:1,checkBreaks:0,needsHireDate:1,notConfirmed:0,unfinalizedDays:3,peopleWithUnfinalizedDays:1}}};
}}));

beforeEach(()=>{fixture.role='MANAGER';fixture.denied=false;fixture.unavailable=false;fixture.timeZone='America/Puerto_Rico';fixture.read.mockClear();fixture.workspace.mockClear();rs.useFakeTimers();rs.setSystemTime(new Date('2026-11-18T16:00:00Z'));});
afterEach(()=>{rs.useRealTimers();});

it.each(['MANAGER','OWNER'])('shows %s the latest completed bonus year inside the current authority frame, with the disclaimer and key dates',async role=>{
 fixture.role=role;
 // keepWhole joins dates with no-break spaces; compare the words.
 const html=renderToStaticMarkup(await ChristmasBonusPage({searchParams:Promise.resolve({})})).replace(/[\u00a0\u202f]/g,' ');
 // D13: each fact is its own unbreakable span; the words are compared without the markup.
 const text=html.replace(/<[^>]+>/g,'');
 expect(fixture.read).toHaveBeenCalledWith(expect.objectContaining({startDate:'2025-10-01',endDate:'2026-09-30'}));
 expect(html).toContain('<section data-authority="company-fixture">');
 // Final verification F (F18): the disclaimer's first sentence is its note's title; the words are Jose's, unchanged.
 expect(html).toContain('<p class="b-callout__t">Informational only</p><div class="b-callout__b">Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.</div>');
 expect(html).toContain('Nov 15–Dec 15, 2026');
 expect(html).toContain('Dec 1, 2026');
 expect(html).toContain('Exemption filing deadline');
 // Review 30 (D11): the year is the band's pill menu: the five years as links, the shown one marked current.
 expect(html).toMatch(/<a href="\/app\/reports\/christmas-bonus\?year=2026" class="nevora-action-menu-item c-bonus__yearitem" aria-current="true">/);
 expect(html).toContain('href="/app/reports/christmas-bonus?year=2022"');
 // Each person: name, ID, hire date or the prompt, hours, threshold and whether it is reached; never money.
 // F07: the facts are the kit's facts line (the dot is drawn between them and read by screen readers).
 expect(html).toContain('<span class="b-segs c-bonus__facts">');
 expect(text).toContain('812 h of 700 h · Hired Mar 2, 2016 · ID E1');
 expect(html).toContain('Reached');
 expect(text).toContain('900 h of 1,350 h · Hired Jul 15, 2019 · ID E3 · Inactive');expect(html).toContain('Not reached');
 // Review 30 (D21): the row opens the profile on the hire date and comes back to this year; the chip says the state.
 expect(html).toMatch(/<a [^>]*href="\/app\/employees\/E2\?edit=1&amp;from=bonus&amp;year=2026"[^>]*>/);expect(html).toContain('No hire date');expect(text).toContain('1,400 h recorded · ID E2 · 3 days not finalized');
 // D12: the unfinalized days are the People card's amber note, with Open Timecards as its action.
 expect(html).toContain('Hours count finalized timecards only');expect(html).toContain('1 person has recorded time on 3 days that aren’t on a finalized timecard yet.');
 expect(html).toMatch(/<a href="\/app\/timecards" class="b-callout__a">Open Timecards<\/a>/);
 // D16: the counts that ask for a decision.
 for(const label of ['Reached','Check breaks','Not confirmed','No hire date'])expect(html).toContain(`<dt class="c-stat__label">${label}</dt>`);
 expect(html).not.toMatch(/\$\s?\d|USD|bonus amount/i);
});

it('opens an earlier completed year from the selector and ignores years outside it',async()=>{
 await ChristmasBonusPage({searchParams:Promise.resolve({year:'2024'})});
 expect(fixture.read).toHaveBeenLastCalledWith(expect.objectContaining({startDate:'2023-10-01',endDate:'2024-09-30'}));
 await ChristmasBonusPage({searchParams:Promise.resolve({year:'2027'})});
 expect(fixture.read).toHaveBeenLastCalledWith(expect.objectContaining({startDate:'2025-10-01',endDate:'2026-09-30'}));
});

it.each(['EMPLOYEE','LEAD'])('closes the report to %s and reads nothing',async role=>{
 fixture.role=role;
 const html=renderToStaticMarkup(await ChristmasBonusPage({searchParams:Promise.resolve({})}));
 expect(html).toContain('Christmas bonus hours are for Owners and Managers');
 expect(html).not.toContain('Ana Rivera');
 expect(fixture.read).not.toHaveBeenCalled();expect(fixture.workspace).not.toHaveBeenCalled();
});

it('withholds the report without current company-wide access, and says when the read failed',async()=>{
 fixture.denied=true;
 const denied=renderToStaticMarkup(await ChristmasBonusPage({searchParams:Promise.resolve({})}));
 expect(denied).toContain('Company-wide access needed');expect(denied).not.toContain('Ana Rivera');expect(fixture.read).not.toHaveBeenCalled();
 fixture.denied=false;fixture.unavailable=true;
 const failed=renderToStaticMarkup(await ChristmasBonusPage({searchParams:Promise.resolve({})}));
 // Review 30 (D08): a failed read says so in the kit's failed state, with one Try again and the way back to Insights.
 expect(failed).toContain('Couldn’t load Christmas bonus hours');expect(failed).toContain('Nothing was changed.');expect(failed).toContain('Try again');
 expect(failed).toMatch(/href="\/app\/reports"/);expect(failed).not.toContain('Reconnect');expect(failed).not.toContain('Ana Rivera');
});

it.each(['America/New_York','America/Santo_Domingo','UTC'])('closes the report for a %s workspace and reads nothing',async timeZone=>{
 fixture.timeZone=timeZone;
 const html=renderToStaticMarkup(await ChristmasBonusPage({searchParams:Promise.resolve({})}));
 expect(html).toContain('Christmas bonus hours apply to Puerto Rico workspaces');
 expect(html).toMatch(/<a [^>]*href="\/app\/reports"[^>]*>/);
 expect(html).not.toContain('Ana Rivera');
 expect(fixture.workspace).toHaveBeenCalled();expect(fixture.read).not.toHaveBeenCalled();
});
