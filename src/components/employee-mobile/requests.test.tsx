import React from 'react';
import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:vi.fn(),reconcileShiftChangeAction:vi.fn()}));
import {Pickup,ResponsiveEmployeeRequests} from './requests';
import {PickupOperation} from './pickup-operation';
it('keeps the original desktop page as the direct child so inherited layout selectors retain ownership',()=>{
 const html=renderToStaticMarkup(<ResponsiveEmployeeRequests authority={'a'.repeat(64)} mode="hub"><div className="q-page q-reqhub"><h1>Requests</h1></div></ResponsiveEmployeeRequests>);
 expect(html.startsWith('<div class="q-page q-reqhub">')).toBe(true);
});
it('a retired or refused pickup result offers recovery without a fresh submit from stale terms',()=>{
 const operation=new PickupOperation('old-request',1);
 operation.state.result={status:'conflict'};
 const html=renderToStaticMarkup(<Pickup operation={operation} onRefresh={()=>{}} canSubmit={false}/>);
 expect(html).not.toContain('>Pick up shift<');expect(html).toContain('Refresh shift options');
 const eligible=renderToStaticMarkup(<Pickup operation={new PickupOperation('current',2)} onRefresh={()=>{}} canSubmit/>);
 expect(eligible).toContain('>Pick up shift<');
});
