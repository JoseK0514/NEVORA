import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import ExchangePage from './page';
import type { ExchangeRecord } from '../../../lib/data/exchanges';
import type { CalloutRecord } from '../../../lib/data/callouts';
const f=vi.hoisted(()=>({activity:[] as ExchangeRecord[],callouts:[] as CalloutRecord[],selected:null as ExchangeRecord|null,selectedCallout:null as CalloutRecord|null,allowed:['2']}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/scheduling/validate-shift',()=>({schedulingIssueMessage:()=>''}));
vi.mock('@/components/manager-shift-requests',()=>({ManagerShiftRequests:()=>null}));
vi.mock('@/components/nav-icon',()=>({NavIcon:()=>null}));
vi.mock('@/components/status-pill',()=>({StatusPill:({children}:{children:React.ReactNode})=>createElement('span',{},children)}));
vi.mock('@/lib/auth/permissions',()=>({isManagerRole:()=>false}));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'self',role:'EMPLOYEE'})}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/lib/exchange-marketplace',()=>import('../../../lib/exchange-marketplace'));
vi.mock('@/lib/notifications/destinations',()=>import('../../../lib/notifications/destinations'));
vi.mock('@/lib/data/notification-state',()=>({sqlNotificationStateRepository:()=>({recipientAccess:async()=>({employeeId:'self',role:'EMPLOYEE',active:true,allowedLocationIds:f.allowed})})}));
vi.mock('@/lib/data/callouts',()=>({listEmployeeCallouts:async()=>f.callouts,getCallout:async()=>f.selectedCallout}));
vi.mock('@/lib/data/exchanges',()=>({listEmployeeExchangeActivity:async()=>f.activity,listEmployeePublishedShifts:async()=>[],listIncomingSwaps:async()=>[],listOpenCoverage:async()=>[],getExchange:async()=>f.selected}));
vi.mock('@/app/app/exchange/actions',()=>({cancelExchangeAction:vi.fn(),claimCoverageAction:vi.fn(),offerCoverageAction:vi.fn(),respondSwapAction:vi.fn()}));
vi.mock('@/app/app/exchange/callout/actions',()=>({cancelCalloutAction:vi.fn()}));
function exchange(id:string,owner='self'):ExchangeRecord{return {id,kind:'SWAP',status:'APPROVED',requestedByEmployeeId:owner,targetEmployeeId:'self',requestedByName:'Fictional',requestedByRole:'EMPLOYEE',sourceShift:{id:'shift',scheduleId:'week',employeeId:owner,employeeName:'Fictional',locationId:'2',locationName:'Drive',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00'},createdAt:'2026-10-03T12:00:00Z'};}
beforeEach(()=>{f.activity=Array.from({length:10},(_,i)=>exchange(`row-${i}`));f.callouts=[];f.selected=null;f.selectedCallout=null;f.allowed=['2'];});
async function html(requestId?:string){return renderToStaticMarkup(await ExchangePage({searchParams:Promise.resolve({tab:'requests',requestId})}));}
it('default retains first eight; an authorized selected later row is included and focusable',async()=>{
 expect(await html()).not.toContain('id="request-row-9"');expect(await html('row-9')).toContain('id="request-row-9" tabindex="-1"');
});
it('selected authorized partner outcome uses existing section without requester actions',async()=>{
 f.activity=[];f.selected=exchange('partner','other');const result=await html('partner');expect(result).toContain('id="request-partner"');expect(result).toContain('Approved');expect(result).not.toContain('<form');
});
it('forged foreign account and access-lost selected rows are excluded',async()=>{
 f.selected={...exchange('foreign','other'),targetEmployeeId:'different'};expect(await html('foreign')).not.toContain('id="request-foreign"');
 f.selected=exchange('lost','other');f.allowed=[];expect(await html('lost')).not.toContain('id="request-lost"');
});
it('selected partner pending row never acquires requester cancel authority',async()=>{
 f.activity=[];f.selected={...exchange('pending','other'),status:'OPEN'};expect(await html('pending')).not.toContain('id="request-pending"');
});
it('selected own callout beyond ordinary six is included without expanding default',async()=>{
 f.callouts=Array.from({length:8},(_,i)=>({id:`callout-${i}`,shiftId:'shift',employeeId:'self',employeeName:'Fictional',locationId:'2',locationName:'Drive',weekStart:'2026-10-05',date:'2026-10-05',startTime:'08:00',endTime:'12:00',reasonCode:'OTHER',status:'APPROVED',createdAt:'2026-10-03T12:00:00Z'}));
 expect(await html()).not.toContain('id="request-callout-7"');expect(await html('callout-7')).toContain('id="request-callout-7"');
});
