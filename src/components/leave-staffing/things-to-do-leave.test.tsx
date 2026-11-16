import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import type {ActionCenter,ActionItem} from '../../lib/action-center/project';
import {staffingRepairActions} from '../../lib/time-off-staffing/actions';

vi.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',props,children)}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh(){}})}));
const {ThingsToDoPage,groupThingsToDo}=await import('../manager-inbox-corp');

const repair=staffingRepairActions([{id:'LEAVE_STAFFING:r1:s1',requestId:'r1',state:'repair_required',employeeId:'e1',employeeName:'Maria Rivera',ownerEmployeeId:null,reviewedAt:null,
 employeeInstruction:'approved_leave',publicationId:'p1',revisionNumber:1,shiftId:'s1',locationId:'loc-1',locationName:'Main Office',date:'2026-10-17',startTime:'07:00',endTime:'15:00',overlapMinutes:480,overlapDates:['2026-10-17']}],'2026-10-12')[0];
const pending={id:'TIME_OFF:r2',type:'TIME_OFF',category:'requests',priority:'REVIEW',title:'Time off',detail:'James Ortiz is waiting for review.',href:'/app/requests?tab=pending&requestId=r2',
 request:{startDate:'2026-10-15',endDate:'2026-10-15',lengthText:'1 day',locationName:'Main Office',reviewHref:'/app/requests?tab=pending&requestId=r2'}} as ActionItem;
const snapshot=(items:ActionItem[]):Extract<ActionCenter,{state:'ready'}>=>({state:'ready',observedAt:'2026-10-16T14:30:00Z',validForMs:30000,weekStart:'2026-10-12',items,limitedAttendance:false,
 counts:{total:items.length,scheduling:items.filter(i=>i.category==='scheduling').length,requests:items.filter(i=>i.category==='requests').length,timekeeping:0}});

it('lists a staffing repair under Shifts to fill, counted, with the schedule link and no decision controls',()=>{
 const grouped=groupThingsToDo(snapshot([repair,pending]),null,'America/Puerto_Rico',true);
 const open=grouped.families.find(f=>f.id==='card-open');
 expect(open?.groups.map(g=>g.id)).toEqual(['repair']);
 // Review B1 (NV-009): a repair nobody has taken reads amber "Not assigned" (waiting), not red.
 expect(open?.groups[0].rows[0]).toMatchObject({title:'Fill Maria Rivera’s shift',value:'Not assigned',valueTone:'amber'});
 expect(grouped.value.count).toBe(2);
 const html=renderToStaticMarkup(createElement(ThingsToDoPage,{snapshot:snapshot([repair,pending]),connection:'ready',onRefresh:()=>{},timeZone:'America/Puerto_Rico',coverageFirst:true}));
 expect(html).toContain('id="todo-repair"');
 expect(html).toContain('leaveRepair=LEAVE_STAFFING%3Ar1%3As1');
 expect(html).not.toMatch(/Approve time off for Maria|Decline time off for Maria|dismiss/i);
});
it('offers a waiting request’s Approve only after its schedule check comes back clear',()=>{
 // No check has come back here (no browser read), so the row sends the manager to the request's page to see the shifts.
 const html=renderToStaticMarkup(createElement(ThingsToDoPage,{snapshot:snapshot([pending]),connection:'ready',onRefresh:()=>{},timeZone:'America/Puerto_Rico'}));
 expect(html).toContain('Review time off for James Ortiz');
 expect(html).toContain('Decline time off for James Ortiz');
 expect(html).not.toContain('Approve time off for James Ortiz');
});
