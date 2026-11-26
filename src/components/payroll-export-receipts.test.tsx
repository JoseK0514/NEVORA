rs.mock('@/lib/i18n/portal-lang', () => ({ usePortalLang: () => 'en' }));
import * as rstestOriginal0 from "react" with { rstest: 'importActual' };
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';

// Gaps G59 (Nov 23, 2026): readiness-ui-browser waited 20 s for network idle on a paused Time exports page and never got
// it. The one request still open was this card's GET /api/payroll-export/receipts: the server had answered in 0.9 s, but
// the card had left (the page pauses on blur) and returned without reading the reply, and an unread body keeps the
// request open. The card now cancels its read when it leaves and releases any reply it won't read.
const fixture=rs.hoisted(()=>({effects:[] as (()=>void|(()=>void))[],states:[] as unknown[]}));
rs.mock('react',()=>({
 ...rstestOriginal0,
 useState:(initial:unknown)=>{const index=fixture.states.length;fixture.states.push(initial);return [initial,(value:unknown)=>{fixture.states[index]=value;}];},
 useEffect:(effect:()=>void|(()=>void))=>{fixture.effects.push(effect);},
}));
import {PayrollExportReceipts} from './payroll-export-receipts';

type Sent={signal?:AbortSignal};
let sent:Sent[]=[];let answer:(response:Response)=>void=()=>{};let cancelled=0;
const reply=(status:number,body='{"state":"ready","receipts":[]}')=>{
 const response=new Response(body,{status,headers:{'content-type':'application/json'}});
 const original=response.body!.cancel.bind(response.body);
 Object.defineProperty(response.body,'cancel',{value:(reason?:unknown)=>{cancelled++;return original(reason);}});
 return response;
};
function mount(){
 fixture.effects=[];fixture.states=[];
 PayrollExportReceipts({actorId:'QA-FICTIONAL',refreshKey:0});
 const dispose=fixture.effects[0]();
 return typeof dispose==='function'?dispose:()=>{};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
beforeEach(()=>{
 sent=[];cancelled=0;
 rs.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));
 rs.stubGlobal('fetch',(_url:string,init:Sent)=>{sent.push(init);return new Promise<Response>(resolve=>{answer=resolve;});});
});
afterEach(()=>{rs.unstubAllGlobals();});

it('cancels its read when the card leaves (the page paused)',()=>{
 const leave=mount();
 expect(sent).toHaveLength(1);
 expect(sent[0].signal?.aborted).toBe(false);
 leave();
 expect(sent[0].signal?.aborted).toBe(true);
});

it('a reply that arrives after the card left is released, not left unread',async()=>{
 const leave=mount();leave();
 answer(reply(200));await tick();
 expect(cancelled).toBe(1);
});

it('a refused reply is released too, and the card still says it did not load',async()=>{
 mount();
 answer(reply(503,'{"state":"unavailable"}'));await tick();
 expect(cancelled).toBe(1);
 expect(fixture.states[0]).toEqual({state:'unavailable',notAllowed:false});
});

it('a reply it reads is read in full, as before',async()=>{
 mount();
 answer(reply(200));await tick();await tick();
 expect(cancelled).toBe(0);
 expect(fixture.states[0]).toEqual({state:'ready',receipts:[]});
});
