import React from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:vi.fn(),reconcileShiftChangeAction:vi.fn()}));
import {EmployeeExchangeView} from './exchange-view';
import {ResponsiveEmployeeExchange} from './exchange';
import {EmployeeRequestOperation} from './request-operation';
import type {EmployeeExchangeSnapshot,EmployeeRequestDetail} from '@/lib/employee-exchange';
import {onlyB,withoutB} from '../owner-b/test-support';
const authority='a'.repeat(64);
const detail:EmployeeRequestDetail={summary:{id:'own-request',kind:'swap',viewer:'recipient',status:'EMPLOYEE_PENDING',date:'2026-11-03',createdAt:'2026-10-27T12:00:00Z',counterparty:'Blair C.',revision:1,releaseApplies:null},offered:{date:'2026-11-03',startTime:'22:00',endTime:'06:00',location:'West',position:'Support',lead:false},requested:{date:'2026-11-04',startTime:'09:00',endTime:'17:00',location:'Main',position:'Support',lead:false},history:null,checks:[{kind:'ACCEPT',allowed:false,notice:'The reviewed shift changed.',outcome:null},{kind:'DECLINE',allowed:true,notice:null,outcome:null}],notice:null,reason:null};
const snapshot=(patch:Partial<Extract<EmployeeExchangeSnapshot,{state:'ready'}>>={}):EmployeeExchangeSnapshot=>({state:'ready',kind:'exchange',authority,observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,selection:'own-request',incoming:null,activity:null,detail,...patch});
const render=(read:EmployeeExchangeSnapshot,selection:string|null='own-request')=>renderToStaticMarkup(<EmployeeExchangeView state={{snapshot:read,refreshing:false,paused:false}} authority={authority} mode="incoming" selection={selection} operation={new EmployeeRequestOperation('own-request',1)} onRefresh={()=>{}} onRespond={()=>{}} onRetry={()=>{}}/>);
it('compares reviewed shifts, names overnight ending and withholds unavailable accept while preserving permitted decline',()=>{
 const html=withoutB(render(snapshot()));
 expect(html).toContain('Your current shift');expect(html).toContain('You would work');expect(html).toContain('Ends Wed, Nov 4');
 expect(html).not.toContain('>Accept swap<');expect(html).toContain('>Decline swap<');expect(html).toContain('Request history couldn’t be checked');
 // Direction B (phones): the same request as a pushed page back to For you, with the same permitted response only.
 const b=onlyB(render(snapshot()));
 expect(b).toContain('>Swap request</h1>');expect(b).toContain('href="/app/exchange?tab=foryou#exchange-request-own-request"');
 expect(b).toContain('Your current shift');expect(b).toContain('You would work');expect(b).toContain('Ends Wed, Nov 4');expect(b).toContain('From Blair C.');
 expect(b).not.toContain('>Accept swap<');expect(b).toMatch(/class="b-btn b-btn--quiet b-btn--full"[^>]*>Decline swap</);expect(b).toContain('Request history couldn’t be checked');
});
it('missing, denied, replaced and module-off reads cannot render private response facts/actions',()=>{
 for(const read of [snapshot({detail:null}),snapshot({authority:'b'.repeat(64)}),snapshot({enabled:false,detail:null}),{state:'unavailable',reason:'access_denied'} as const]){
  const html=render(read);expect(html).not.toContain('Blair');expect(html).not.toContain('West');expect(html).not.toContain('>Decline swap<');
 }
});
it('keeps unknown incoming/activity distinct from verified empty and preserves the desktop direct-child tree',()=>{
 expect(render(snapshot({selection:null,detail:null,incoming:null,activity:[]}),null)).toContain('couldn’t be checked');
 expect(render(snapshot({selection:null,detail:null,incoming:[],activity:[]}),null)).toContain('No swaps need your answer');
 // Direction B (phones): Pick up and swap's For you tab, its empty state and the way to My schedule.
 const forYou=onlyB(render(snapshot({selection:null,detail:null,incoming:[],activity:[]}),null));
 expect(forYou).toContain('>Pick up and swap</h1>');expect(forYou).toContain('aria-current="page" href="/app/exchange?tab=foryou"');expect(forYou).toContain('No swaps need your answer');
 expect(forYou).toContain('A request addressed to you will appear here.');expect(forYou).toContain('href="/app/schedule"');
 expect(onlyB(render(snapshot({selection:null,detail:null,incoming:null,activity:[]}),null))).toContain('Incoming swaps couldn’t be checked');
 const html=renderToStaticMarkup(<ResponsiveEmployeeExchange authority={authority} mode="mine"><div className="q-page q-shiftreq">Existing desktop</div></ResponsiveEmployeeExchange>);
 expect(html.startsWith('<div class="q-page q-shiftreq">')).toBe(true);
});
it('describes swap and pickup withdrawal consequences using their actual request kind',()=>{
 const pending={...detail,summary:{...detail.summary,status:'MANAGER_PENDING'},checks:[{kind:'WITHDRAW' as const,allowed:true,notice:null,outcome:'completed' as const}]};
 const swap=render(snapshot({detail:pending}));expect(swap).toContain('Withdrawing closes this swap request. Both employees keep their currently assigned shifts.');expect(swap).not.toContain('pickup request');
 const pickup=render(snapshot({detail:{...pending,summary:{...pending.summary,kind:'coverage'},requested:null}}));expect(pickup).toContain('Withdrawing closes this pickup request. The shift stays with its currently assigned employee.');
});
it('keeps the confirmation of a settled response after the refresh replaces its operation (M-4)',()=>{
 const withReceipt=(kind:'WITHDRAW'|'DECLINE'|'CANCEL')=>{const operation=new EmployeeRequestOperation('own-request',2);operation.receipt={kind,result:{status:'closed'} as never};
  return renderToStaticMarkup(<EmployeeExchangeView state={{snapshot:snapshot(),refreshing:false,paused:false}} authority={authority} mode="incoming" selection="own-request" operation={operation} onRefresh={()=>{}} onRespond={()=>{}} onRetry={()=>{}}/>);};
 expect(withReceipt('DECLINE')).toMatch(/role="status"[^>]*>You declined this swap\./);
 expect(withReceipt('WITHDRAW')).toContain('Your response was withdrawn. Check your current schedule.');
 expect(withReceipt('CANCEL')).toContain('Your request was cancelled. Check your current schedule.');
 // A fresh operation without a receipt claims nothing.
 expect(render(snapshot())).not.toMatch(/withdrawn|declined this swap|was cancelled/);
});
