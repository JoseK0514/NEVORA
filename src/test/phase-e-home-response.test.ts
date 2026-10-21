import {expect,it,vi} from 'vitest';
import {resolve} from 'node:path';
const {fulfillHeldResponse}=await import(resolve('scripts/phase-e-home-browser-scenarios.mjs'));

it('does not deliver into a request the browser already cancelled after document navigation',async()=>{
 const fulfill=vi.fn(async()=>{});
 const route={request:()=>({failure:()=>({errorText:'net::ERR_ABORTED'})}),fulfill};
 expect(await fulfillHeldResponse(route,{},true)).toBe('document-left');
 expect(fulfill).not.toHaveBeenCalled();
});
it('still delivers a live late response after navigation so the real lifetime guard must reject it',async()=>{
 const response={},fulfill=vi.fn(async()=>{});
 const route={request:()=>({failure:()=>null}),fulfill};
 expect(await fulfillHeldResponse(route,response,true)).toBe('fulfilled');
 expect(fulfill).toHaveBeenCalledExactlyOnceWith({response});
});
it('keeps the same-document held-response exercise even when its client read was aborted',async()=>{
 const fulfill=vi.fn(async()=>{throw Error('Discarded request');});
 const route={request:()=>({failure:()=>({errorText:'net::ERR_ABORTED'})}),fulfill};
 expect(await fulfillHeldResponse(route,{},false)).toBe('request-aborted');
 expect(fulfill).toHaveBeenCalledTimes(1);
});
it.each([false,true])('keeps unknown fulfillment failures fatal after navigation %s without exposing their payload',async documentLeft=>{
 const route={request:()=>({failure:()=>null}),fulfill:async()=>{throw Error('PRIVATE_AUTHORITY');}};
 await expect(fulfillHeldResponse(route,{},documentLeft)).rejects.toThrow('Held response fulfillment failed');
});
