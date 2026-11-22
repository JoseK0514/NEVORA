import {afterEach,beforeEach,describe,expect,it,rs} from '@rstest/core';
import {createPrivateSnapshotController,type PrivatePanelState,type PrivateSnapshot} from './private-snapshot-client';

const controllers:ReturnType<typeof createPrivateSnapshotController<PrivateSnapshot>>[]=[];
const ready=(validForMs=15000):PrivateSnapshot=>({state:'ready',observedAt:new Date().toISOString(),validForMs});
const flush=()=>rs.advanceTimersByTimeAsync(0);
function deferred(){let resolve!:(value:PrivateSnapshot)=>void;const promise=new Promise<PrivateSnapshot>(done=>{resolve=done;});return {promise,resolve};}
async function mount(request:(signal:AbortSignal)=>Promise<unknown>,expiryFailure?:(budget:number)=>'read_failed'|'access_denied',renewal?:{safetyMarginMs:number}){
 const states:PrivatePanelState<PrivateSnapshot>[]=[];
 const controller=createPrivateSnapshotController<PrivateSnapshot>(state=>states.push(state),request,value=>value as PrivateSnapshot,reason=>({state:'unavailable',reason}),expiryFailure,renewal);
 controllers.push(controller);controller.start();await flush();return {controller,states};
}
beforeEach(()=>{rs.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});});
afterEach(()=>{for(const controller of controllers.splice(0))controller.stop();rs.useRealTimers();});

describe('protected snapshot refresh budgets',()=>{
 it('keeps healthy short-lived controller snapshots ready across multiple authority lifetimes',async()=>{
  const request=rs.fn(async()=>ready());const {states}=await mount(request);
  await rs.advanceTimersByTimeAsync(46000);
  expect(request.mock.calls.length).toBeGreaterThan(3);
  expect(states.filter(state=>state.snapshot?.state==='unavailable')).toEqual([]);
  expect(states.at(-1)?.snapshot?.state).toBe('ready');
 });

 it('starts renewal before the remaining budget expires after a slow round trip',async()=>{
  const first=deferred();let calls=0;const request=rs.fn(async()=>++calls===1?first.promise:ready());
  const {states}=await mount(request);await rs.advanceTimersByTimeAsync(9000);first.resolve(ready());await flush();
  await rs.advanceTimersByTimeAsync(5999);
  expect(request.mock.calls.length).toBeGreaterThan(1);
  expect(states.filter(state=>state.snapshot?.state==='unavailable')).toEqual([]);
 });

 it('starts slow Notifications renewal before the old 70% point and keeps the list through its original deadline',async()=>{
  const initial=deferred(),renewal=deferred(),next=deferred();let calls=0;
  const request=rs.fn(async()=>{calls++;return calls===1?initial.promise:calls===2?renewal.promise:next.promise;});
  const {states}=await mount(request,()=> 'read_failed',{safetyMarginMs:6000});
  await rs.advanceTimersByTimeAsync(3200);
  const previous=ready(11700);
  initial.resolve(previous);await flush();

  // 8.5 s remain. A 3.3 s read would overrun the 2.55 s the old schedule left.
  await rs.advanceTimersByTimeAsync(2499);
  expect(request).toHaveBeenCalledTimes(1);
  await rs.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledTimes(2);
  expect(states.at(-1)).toMatchObject({snapshot:previous,refreshing:true});
  await rs.advanceTimersByTimeAsync(3300);
  const current=ready(11700);
  renewal.resolve(current);await flush();

  await rs.advanceTimersByTimeAsync(2700);
  expect(states.at(-1)?.snapshot).toEqual(current);
  expect(states.filter(state=>state.snapshot?.state==='unavailable')).toEqual([]);
 });

 it.each(['fresh','older','failed'] as const)('clears an expired Notifications list while its renewal is pending, then handles a %s result',async result=>{
  const late=deferred();const signals:AbortSignal[]=[];
  const previous=ready(8500);
  const request=rs.fn(async(signal:AbortSignal)=>{signals.push(signal);return signals.length===1?previous:late.promise;});
  const {states}=await mount(request,()=> 'read_failed',{safetyMarginMs:6000});
  await rs.advanceTimersByTimeAsync(8499);
  expect(states.at(-1)).toMatchObject({snapshot:previous,refreshing:true});
  await rs.advanceTimersByTimeAsync(1);
  expect(states.at(-1)).toEqual({snapshot:null,refreshing:true,paused:false});
  expect(signals[1].aborted).toBe(false);

  await rs.advanceTimersByTimeAsync(1000);
  const current=ready();
  late.resolve(result==='fresh'?current:result==='older'?{state:'ready',validForMs:15000,observedAt:'2000-01-01T00:00:00Z'}:{state:'unavailable',reason:'read_failed'});
  await flush();
  expect(states.at(-1)).toEqual({snapshot:result==='fresh'?current:{state:'unavailable',reason:'read_failed'},refreshing:false,paused:false});
 });

 it('expires the original snapshot and aborts a hung renewal without admitting its late response',async()=>{
  const late=deferred();const signals:AbortSignal[]=[];
  const request=rs.fn(async(signal:AbortSignal)=>{signals.push(signal);return signals.length===1?ready():late.promise;});
  const {states}=await mount(request);await rs.advanceTimersByTimeAsync(14999);
  expect(request).toHaveBeenCalledTimes(2);expect(signals[1].aborted).toBe(false);
  await rs.advanceTimersByTimeAsync(1);
  expect(signals[1].aborted).toBe(true);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  const publications=states.length;late.resolve(ready());await flush();
  expect(states).toHaveLength(publications);
 });

 it.each(['pause','stop'] as const)('%s cancels renewal and fences its late publication',async method=>{
  const late=deferred();const signals:AbortSignal[]=[];
  const request=rs.fn(async(signal:AbortSignal)=>{signals.push(signal);return signals.length===1?ready():late.promise;});
  const {controller,states}=await mount(request);await rs.advanceTimersByTimeAsync(14000);
  expect(request).toHaveBeenCalledTimes(2);controller[method]();expect(signals[1].aborted).toBe(true);
  const publications=states.length;late.resolve(ready());await rs.advanceTimersByTimeAsync(60000);
  expect(states).toHaveLength(publications);expect(request).toHaveBeenCalledTimes(2);
 });

 it('keeps the existing thirty-second backoff for a failed protected read',async()=>{
  const request=rs.fn(async()=>{throw Error('Fictional transport failure');});const {states}=await mount(request);
  expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'read_failed'});
  await rs.advanceTimersByTimeAsync(29999);expect(request).toHaveBeenCalledTimes(1);
  await rs.advanceTimersByTimeAsync(1);expect(request).toHaveBeenCalledTimes(2);
 });

 it('preserves corrections expiry classification and its thirty-second retry without extending data',async()=>{
  const late=deferred();let calls=0;const request=rs.fn(async()=>++calls===1?ready():late.promise);
  const {states}=await mount(request,()=> 'read_failed');await rs.advanceTimersByTimeAsync(15000);
  expect(request).toHaveBeenCalledTimes(2);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'read_failed'});
  await rs.advanceTimersByTimeAsync(29999);expect(request).toHaveBeenCalledTimes(2);
  await rs.advanceTimersByTimeAsync(1);expect(request).toHaveBeenCalledTimes(3);
 });

 it('stops automatic renewal when the protected reader denies access',async()=>{
  let calls=0;const request=rs.fn(async()=>++calls===1?ready():{state:'unavailable',reason:'access_denied'});
  const {states}=await mount(request);await rs.advanceTimersByTimeAsync(14000);
  expect(request).toHaveBeenCalledTimes(2);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  await rs.advanceTimersByTimeAsync(120000);expect(request).toHaveBeenCalledTimes(2);
 });

 it.each([45000,60000])('keeps the existing thirty-second interval for a %i ms budget',async budget=>{
  const request=rs.fn(async()=>ready(budget));await mount(request);
  await rs.advanceTimersByTimeAsync(29999);expect(request).toHaveBeenCalledTimes(1);
  await rs.advanceTimersByTimeAsync(1);expect(request).toHaveBeenCalledTimes(2);
 });

 it.each([500,1000])('never extends a %i ms lifetime to meet the minimum renewal interval',async budget=>{
  const request=rs.fn(async()=>ready(budget));const {states}=await mount(request);
  await rs.advanceTimersByTimeAsync(budget-1);expect(states.at(-1)?.snapshot?.state).toBe('ready');
  await rs.advanceTimersByTimeAsync(1);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  await rs.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(1);
 });
});

// Review B2 (NV-001; Jose, Nov 10, 2026): offline keeps loaded snapshots read-only only within their original authority lifetime.
describe('offline hold',()=>{
 it('holds read-only only within the original validity, stops reading, and announces the observation',async()=>{
  const request=rs.fn(async()=>ready(15000));const {controller,states}=await mount(request);
  const held:string[]=[];const listener=(event:Event)=>held.push((event as CustomEvent<string>).detail);
  const target=new EventTarget();rs.stubGlobal('window',target);target.addEventListener('nevora:offline-held',listener);
  const calls=request.mock.calls.length;controller.hold();
  expect(states.at(-1)).toMatchObject({paused:false,refreshing:false,snapshot:{state:'ready'}});
  expect(held).toHaveLength(1);
  await rs.advanceTimersByTimeAsync(60000);
  expect(request.mock.calls.length).toBe(calls);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  rs.unstubAllGlobals();
 });
 it('clears like pause when nothing ready is loaded',async()=>{
  const {controller,states}=await mount(async()=>{throw Error('Fictional failure');});
  controller.hold();
  expect(states.at(-1)).toMatchObject({paused:true,snapshot:null});
 });
});
