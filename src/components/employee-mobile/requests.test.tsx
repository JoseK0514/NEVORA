import React from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:vi.fn(),reconcileShiftChangeAction:vi.fn()}));
import {Pickup,ResponsiveEmployeeRequests,IncomingRequestSection} from './requests';
import {PickupOperation} from './pickup-operation';
import {onlyB,withoutB} from '../owner-b/test-support';
it('incoming failure is distinct from a verified zero and retains retry and a reachable destination',()=>{
 const failed=renderToStaticMarkup(<IncomingRequestSection count={null} onRetry={()=>{}}/>);
 expect(failed).toContain('couldn’t be checked');expect(failed).toContain('Try again');expect(failed).toContain('/app/exchange?tab=foryou');
 expect(renderToStaticMarkup(<IncomingRequestSection count={0} onRetry={()=>{}}/>)).toBe('');
 const one=renderToStaticMarkup(<IncomingRequestSection count={1} onRetry={()=>{}}/>),many=renderToStaticMarkup(<IncomingRequestSection count={2} onRetry={()=>{}}/>);
 expect(one).toContain('A teammate requested a swap');expect(many).toContain('2 swaps need your answer');
 expect(one).not.toContain('couldn’t be checked');
});
it('keeps the original desktop page as the direct child so inherited layout selectors retain ownership',()=>{
 const html=renderToStaticMarkup(<ResponsiveEmployeeRequests authority={'a'.repeat(64)} mode="hub"><div className="q-page q-reqhub"><h1>Requests</h1></div></ResponsiveEmployeeRequests>);
 expect(html.startsWith('<div class="q-page q-reqhub">')).toBe(true);
});
it('a retired or refused pickup result offers recovery without a fresh submit from stale terms',()=>{
 const operation=new PickupOperation('old-request',1);
 operation.state.result={status:'conflict'};
 const html=renderToStaticMarkup(<Pickup operation={operation} onRefresh={()=>{}} canSubmit={false}/>);
 expect(html).not.toContain('>Pick up<');expect(html).toContain('Refresh shift options');
 const eligible=renderToStaticMarkup(<Pickup operation={new PickupOperation('current',2)} onRefresh={()=>{}} canSubmit/>);
 expect(eligible).toContain('>Pick up<');
});
it('draws the phone’s first frame as the page’s Direction B hero, checking, with no private rows',()=>{
 const hub=renderToStaticMarkup(<ResponsiveEmployeeRequests authority={'a'.repeat(64)} mode="hub"><div className="q-page q-reqhub"><h1>Requests</h1></div></ResponsiveEmployeeRequests>);
 expect(onlyB(hub)).toContain('>Requests</h1>');expect(onlyB(hub)).toContain('Checking your current requests…');expect(onlyB(hub)).not.toContain('requestId=');
 expect(withoutB(hub)).toContain('Loading requests…');expect(withoutB(hub).startsWith('<div class="q-page q-reqhub">')).toBe(true);
 const open=onlyB(renderToStaticMarkup(<ResponsiveEmployeeRequests authority={'a'.repeat(64)} mode="open"><div className="q-page q-shiftreq">Desktop</div></ResponsiveEmployeeRequests>));
 expect(open).toContain('>Pick up and swap</h1>');expect(open).toContain('href="/app/schedule"');
 expect(open).toContain('aria-current="page" href="/app/exchange"');expect(open).toContain('href="/app/exchange?tab=foryou"');expect(open).toContain('href="/app/exchange?tab=requests"');
});
it('draws the same pickup operation for the phone screen: a teal Pick up, then its outcome and recovery',()=>{
 const eligible=renderToStaticMarkup(<Pickup look="b" part="action" operation={new PickupOperation('current',2)} onRefresh={()=>{}} canSubmit label="Pick up Fri, Nov 6"/>);
 expect(eligible).toMatch(/class="b-btn b-btn--teal"[^>]*aria-label="Pick up Fri, Nov 6"[^>]*>Pick up</);
 const operation=new PickupOperation('old-request',1);operation.state.result={status:'conflict'};
 const stale=renderToStaticMarkup(<Pickup look="b" effects={false} operation={operation} onRefresh={()=>{}} canSubmit={false}/>);
 expect(stale).not.toContain('>Pick up<');expect(stale).toContain('Refresh shift options');expect(stale).toContain('b-btn--quiet');
});
